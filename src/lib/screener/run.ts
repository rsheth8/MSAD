import { allCatalogTickers } from "@/lib/catalog";
import { fetchPeerAverages } from "@/lib/aggregator/peers";
import { fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";
import type { FmpKeyMetricsTtm, FmpRatiosTtm } from "@/lib/fmp/types";
import { getMockScreenerResults } from "@/lib/screener/mock";
import { getPreset } from "@/lib/screener/presets";
import type {
  RatioFilters,
  ScreenerQuery,
  ScreenerRequest,
  ScreenerResultRow,
} from "@/lib/screener/types";

interface FmpScreenerRow {
  symbol?: string;
  companyName?: string;
  marketCap?: number;
  sector?: string;
  industry?: string;
  beta?: number;
  price?: number;
  lastAnnualDividend?: number;
  volume?: number;
  exchangeShortName?: string;
}

const ENRICH_CAP = 28;
const REVERSE_CAP = 18;
const catalogSet = () => new Set(allCatalogTickers());

function vsIndustryPct(value: number | null, peerAvg: number | null | undefined): number | null {
  if (value === null || peerAvg == null || peerAvg === 0 || !Number.isFinite(value)) return null;
  return Math.round(((value - peerAvg) / Math.abs(peerAvg)) * 1000) / 10;
}

function passesRatioFilters(row: ScreenerResultRow, f?: RatioFilters): boolean {
  if (!f) return true;
  if (f.peMax != null && (row.pe === null || row.pe > f.peMax)) return false;
  if (f.peMin != null && (row.pe === null || row.pe < f.peMin)) return false;
  if (f.roeMin != null && (row.roe === null || row.roe < f.roeMin)) return false;
  if (f.roeMax != null && (row.roe === null || row.roe > f.roeMax)) return false;
  if (f.evEbitdaMax != null && (row.evEbitda === null || row.evEbitda > f.evEbitdaMax)) return false;
  return true;
}

function passesReverse(
  row: ScreenerResultRow,
  metric: "pe" | "roe",
  minPct: number,
): boolean {
  if (metric === "pe") {
    return row.peVsIndustryPct != null && row.peVsIndustryPct >= minPct;
  }
  return row.roeVsIndustryPct != null && row.roeVsIndustryPct <= -minPct;
}

function sortRows(rows: ScreenerResultRow[], sortBy?: ScreenerRequest["sortBy"]) {
  const copy = [...rows];
  switch (sortBy) {
    case "marketCapDesc":
      return copy.sort((a, b) => b.marketCap - a.marketCap);
    case "peAsc":
      return copy.sort((a, b) => (a.pe ?? 999) - (b.pe ?? 999));
    case "marketCapAsc":
    default:
      return copy.sort((a, b) => a.marketCap - b.marketCap);
  }
}

async function enrichRatios(symbol: string): Promise<{
  pe: number | null;
  roe: number | null;
  evEbitda: number | null;
}> {
  try {
    const [ratios, metrics] = await Promise.all([
      fmpFetch<FmpRatiosTtm[]>("/ratios-ttm", { symbol }),
      fmpFetch<FmpKeyMetricsTtm[]>("/key-metrics-ttm", { symbol }),
    ]);
    return {
      pe: ratios[0]?.priceToEarningsRatioTTM ?? null,
      roe: metrics[0]?.returnOnEquityTTM ?? null,
      evEbitda: metrics[0]?.evToEBITDATTM ?? null,
    };
  } catch {
    return { pe: null, roe: null, evEbitda: null };
  }
}

async function enrichVsPeers(row: ScreenerResultRow): Promise<ScreenerResultRow> {
  const ratios = await enrichRatios(row.symbol);
  const peerAvgs = await fetchPeerAverages(row.symbol);
  return {
    ...row,
    ...ratios,
    peVsIndustryPct: vsIndustryPct(ratios.pe, peerAvgs.pe),
    roeVsIndustryPct: vsIndustryPct(ratios.roe, peerAvgs.roe),
  };
}

function toRow(raw: FmpScreenerRow, catalog: Set<string>): ScreenerResultRow | null {
  if (!raw.symbol || raw.price == null) return null;
  const symbol = raw.symbol.toUpperCase();
  return {
    symbol,
    name: raw.companyName ?? raw.symbol,
    price: raw.price,
    marketCap: raw.marketCap ?? 0,
    sector: raw.sector ?? "—",
    industry: raw.industry ?? "—",
    beta: raw.beta ?? 1,
    dividend: raw.lastAnnualDividend ?? 0,
    volume: raw.volume ?? 0,
    exchange: raw.exchangeShortName ?? "—",
    pe: null,
    roe: null,
    evEbitda: null,
    inCatalog: catalog.has(symbol),
  };
}

function applyExclusions(rows: ScreenerResultRow[], exclude?: string[]): ScreenerResultRow[] {
  if (!exclude?.length) return rows;
  const block = new Set(exclude.map((s) => s.toUpperCase()));
  return rows.filter((r) => !block.has(r.symbol));
}

export async function runScreener(req: ScreenerRequest): Promise<{
  rows: ScreenerResultRow[];
  presetTitle?: string;
  isMock: boolean;
}> {
  const preset = req.presetId ? getPreset(req.presetId) : undefined;
  const query: ScreenerQuery = { ...preset?.query, ...req.query };
  const ratioFilters = { ...preset?.ratioFilters, ...req.ratioFilters };
  const sortBy = req.sortBy ?? preset?.sortBy ?? "marketCapAsc";
  const reverseMetric = req.reverseMetric ?? preset?.reverseMetric;
  const reverseMinPct = req.reverseMinPct ?? preset?.reverseMinPct ?? 8;
  const catalog = catalogSet();

  if (!hasFmpApiKey()) {
    const mock = getMockScreenerResults(preset?.id ?? "hidden-gems", catalog);
    return {
      rows: applyExclusions(mock, req.excludeSymbols),
      presetTitle: preset?.title,
      isMock: true,
    };
  }

  const params: Record<string, string | number | undefined> = {
    ...query,
    isEtf: query.isEtf === false ? "false" : query.isEtf ? "true" : undefined,
    isActivelyTrading: query.isActivelyTrading !== false ? "true" : "false",
    limit: query.limit ?? 40,
  };

  const raw = await fmpFetch<FmpScreenerRow[]>("/company-screener", params);
  let rows = applyExclusions(
    (raw ?? []).map((r) => toRow(r, catalog)).filter((r): r is ScreenerResultRow => r !== null),
    req.excludeSymbols,
  );

  const needsRatios =
    ratioFilters.peMax != null ||
    ratioFilters.peMin != null ||
    ratioFilters.roeMin != null ||
    ratioFilters.roeMax != null ||
    ratioFilters.evEbitdaMax != null ||
    sortBy === "peAsc" ||
    Boolean(reverseMetric);

  if (needsRatios && rows.length) {
    const cap = reverseMetric ? REVERSE_CAP : ENRICH_CAP;
    const slice = rows.slice(0, cap);
    const enriched = await Promise.all(
      slice.map(async (row) => {
        if (reverseMetric) return enrichVsPeers(row);
        const ratios = await enrichRatios(row.symbol);
        return { ...row, ...ratios };
      }),
    );
    rows = enriched.filter((r) => passesRatioFilters(r, ratioFilters));
    if (reverseMetric) {
      rows = rows.filter((r) => passesReverse(r, reverseMetric, reverseMinPct));
    }
  } else {
    rows = rows.filter((r) => passesRatioFilters(r, ratioFilters));
  }

  return {
    rows: sortRows(rows, sortBy).slice(0, 30),
    presetTitle: preset?.title,
    isMock: false,
  };
}
