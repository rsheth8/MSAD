import { allCatalogTickers } from "@/lib/catalog";
import { runPool } from "@/lib/async";
import { fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";
import type { FmpKeyMetricsTtm, FmpRatiosTtm } from "@/lib/fmp/types";
import { getMockScreenerResults } from "@/lib/screener/mock";
import {
  needsEnrichment,
  type ExploreFilters,
  type ExploreRequest,
  type ExploreResult,
  type ExploreRow,
  type ExploreSortKey,
} from "@/lib/screener/explore-types";

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

/** Candidates pulled from the native screener before enrichment. */
const CANDIDATE_LIMIT = 250;
/** Max symbols we fetch ratios for — caps per-query FMP call volume (2 calls each). */
const ENRICH_CAP = 40;
const ENRICH_CONCURRENCY = 3;
/** Rows returned to the client. */
const RESULT_LIMIT = 60;

function num(v: number | undefined | null): number | null {
  return v != null && Number.isFinite(v) ? v : null;
}

function baseRow(raw: FmpScreenerRow): ExploreRow | null {
  if (!raw.symbol || raw.price == null) return null;
  return {
    symbol: raw.symbol.toUpperCase(),
    name: raw.companyName ?? raw.symbol,
    price: raw.price,
    marketCap: raw.marketCap ?? 0,
    sector: raw.sector ?? "—",
    industry: raw.industry ?? "—",
    beta: raw.beta ?? 1,
    volume: raw.volume ?? 0,
    exchange: raw.exchangeShortName ?? "—",
    pe: null,
    roe: null,
    evEbitda: null,
    pb: null,
    ps: null,
    debtToEquity: null,
    netMargin: null,
    divYield: null,
    peg: null,
  };
}

async function enrichRow(row: ExploreRow): Promise<ExploreRow> {
  try {
    const [ratios, metrics] = await Promise.all([
      fmpFetch<FmpRatiosTtm[]>("/ratios-ttm", { symbol: row.symbol }),
      fmpFetch<FmpKeyMetricsTtm[]>("/key-metrics-ttm", { symbol: row.symbol }),
    ]);
    const r = ratios[0];
    const m = metrics[0];
    return {
      ...row,
      pe: num(r?.priceToEarningsRatioTTM),
      roe: num(m?.returnOnEquityTTM),
      evEbitda: num(m?.evToEBITDATTM),
      pb: num(r?.priceToBookRatioTTM),
      ps: num(r?.priceToSalesRatioTTM),
      debtToEquity: num(r?.debtToEquityRatioTTM),
      netMargin: num(r?.netProfitMarginTTM),
      divYield: num(r?.dividendYieldTTM),
      peg: num(r?.priceToEarningsGrowthRatioTTM),
    };
  } catch {
    return row;
  }
}

function passesEnrichedFilters(row: ExploreRow, f: ExploreFilters): boolean {
  const reqd = (value: number | null, ok: (v: number) => boolean) => value !== null && ok(value);
  if (f.peMax != null && !reqd(row.pe, (v) => v <= f.peMax!)) return false;
  if (f.peMin != null && !reqd(row.pe, (v) => v >= f.peMin!)) return false;
  if (f.roeMinPct != null && !reqd(row.roe, (v) => v * 100 >= f.roeMinPct!)) return false;
  if (f.evEbitdaMax != null && !reqd(row.evEbitda, (v) => v <= f.evEbitdaMax!)) return false;
  if (f.pbMax != null && !reqd(row.pb, (v) => v <= f.pbMax!)) return false;
  if (f.psMax != null && !reqd(row.ps, (v) => v <= f.psMax!)) return false;
  if (f.debtToEquityMax != null && !reqd(row.debtToEquity, (v) => v <= f.debtToEquityMax!))
    return false;
  if (f.netMarginMinPct != null && !reqd(row.netMargin, (v) => v * 100 >= f.netMarginMinPct!))
    return false;
  if (f.divYieldMinPct != null && !reqd(row.divYield, (v) => v * 100 >= f.divYieldMinPct!))
    return false;
  if (f.pegMax != null && !reqd(row.peg, (v) => v <= f.pegMax!)) return false;
  return true;
}

function sortRows(rows: ExploreRow[], key: ExploreSortKey, dir: "asc" | "desc"): ExploreRow[] {
  const factor = dir === "asc" ? 1 : -1;
  // Nulls always sort last regardless of direction.
  const big = Number.POSITIVE_INFINITY;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    const an = av == null ? big : av;
    const bn = bv == null ? big : bv;
    if (an === bn) return 0;
    return (an - bn) * factor;
  });
}

function nativeParams(f: ExploreFilters): Record<string, string | number | undefined> {
  const oneSector = f.sectors?.length === 1 ? f.sectors[0] : undefined;
  const oneExchange = f.exchanges?.length === 1 ? f.exchanges[0] : undefined;
  return {
    marketCapMoreThan: f.marketCapMinB != null ? Math.round(f.marketCapMinB * 1e9) : undefined,
    marketCapLowerThan: f.marketCapMaxB != null ? Math.round(f.marketCapMaxB * 1e9) : undefined,
    priceMoreThan: f.priceMin,
    priceLowerThan: f.priceMax,
    betaLowerThan: f.betaMax,
    volumeMoreThan: f.volumeMin,
    dividendMoreThan: f.dividendMin,
    sector: oneSector,
    industry: f.industry || undefined,
    exchange: oneExchange,
    country: "US",
    isEtf: f.includeEtfs ? undefined : "false",
    isActivelyTrading: "true",
    limit: CANDIDATE_LIMIT,
  };
}

function applyNativePostFilters(rows: ExploreRow[], f: ExploreFilters): ExploreRow[] {
  let out = rows;
  if (f.sectors && f.sectors.length > 1) {
    const set = new Set(f.sectors);
    out = out.filter((r) => set.has(r.sector));
  }
  if (f.exchanges && f.exchanges.length > 1) {
    const set = new Set(f.exchanges.map((e) => e.toUpperCase()));
    out = out.filter((r) => set.has(r.exchange.toUpperCase()));
  }
  return out;
}

function applyExclusions(rows: ExploreRow[], exclude?: string[]): ExploreRow[] {
  if (!exclude?.length) return rows;
  const block = new Set(exclude.map((s) => s.toUpperCase()));
  return rows.filter((r) => !block.has(r.symbol));
}

export async function runExplore(req: ExploreRequest): Promise<ExploreResult> {
  const f = req.filters ?? {};
  const sortKey: ExploreSortKey = req.sortKey ?? "marketCap";
  const sortDir: "asc" | "desc" = req.sortDir ?? "desc";
  const asOf = new Date().toISOString();

  if (!hasFmpApiKey()) {
    const mock = getMockScreenerResults("hidden-gems", new Set(allCatalogTickers()));
    const rows: ExploreRow[] = mock.map((m) => ({
      symbol: m.symbol,
      name: m.name,
      price: m.price,
      marketCap: m.marketCap,
      sector: m.sector,
      industry: m.industry,
      beta: m.beta,
      volume: m.volume,
      exchange: m.exchange,
      pe: m.pe,
      roe: m.roe,
      evEbitda: m.evEbitda,
      pb: null,
      ps: null,
      debtToEquity: null,
      netMargin: null,
      divYield: null,
      peg: null,
    }));
    return {
      rows: sortRows(applyExclusions(rows, req.excludeSymbols), sortKey, sortDir).slice(0, RESULT_LIMIT),
      scanned: rows.length,
      enriched: 0,
      truncated: false,
      isMock: true,
      asOf,
    };
  }

  const raw = await fmpFetch<FmpScreenerRow[]>("/company-screener", nativeParams(f));
  let candidates = applyExclusions(
    applyNativePostFilters(
      (raw ?? []).map(baseRow).filter((r): r is ExploreRow => r !== null),
      f,
    ),
    req.excludeSymbols,
  );
  const scanned = candidates.length;

  let enriched = 0;
  let truncated = false;

  if (needsEnrichment(f, sortKey)) {
    // Enrich the largest candidates first; cap to control call volume.
    const ordered = [...candidates].sort((a, b) => b.marketCap - a.marketCap);
    truncated = ordered.length > ENRICH_CAP;
    const slice = ordered.slice(0, ENRICH_CAP);
    enriched = slice.length;
    const withRatios = await runPool(slice, enrichRow, ENRICH_CONCURRENCY);
    candidates = withRatios.filter((r) => passesEnrichedFilters(r, f));
  }

  return {
    rows: sortRows(candidates, sortKey, sortDir).slice(0, RESULT_LIMIT),
    scanned,
    enriched,
    truncated,
    isMock: false,
    asOf,
  };
}
