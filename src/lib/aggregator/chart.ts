import { FmpError, fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";
import { fetchHistoricalBars } from "@/lib/fmp/historical";
import type { FmpPriceBar, FmpProfile } from "@/lib/fmp/types";
import {
  DEFAULT_SCATTER_X,
  DEFAULT_SCATTER_Y,
  getSectorChartDefault,
  SCATTER_METRICS,
  scatterMetricLabel,
} from "@/lib/chart/presets";
import type {
  ChartDefaultPreset,
  ChartMode,
  ChartOptionsMeta,
  ChartRange,
  CompareChartData,
  CompareChartPoint,
  FullChartPayload,
  ScatterChartData,
  ScatterMetricKey,
} from "@/lib/chart/types";
import { getMockChartPayload } from "@/lib/mock-chart";
import type { RawMetricValues } from "./metrics";
import { fetchPeerMetricRows } from "./peers";

function normalizeTicker(raw: string): string {
  return (raw || "").toUpperCase().trim().replace(/^\$/, "");
}

function resolveSymbol(key: string, mainTicker: string): string {
  if (key === "stock") return mainTicker;
  return normalizeTicker(key);
}

function rangeStartDate(range: ChartRange): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  switch (range) {
    case "1W":
      d.setDate(d.getDate() - 10);
      break;
    case "1M":
      d.setMonth(d.getMonth() - 1);
      break;
    case "3M":
      d.setMonth(d.getMonth() - 3);
      break;
    case "6M":
      d.setMonth(d.getMonth() - 6);
      break;
    case "1Y":
      d.setFullYear(d.getFullYear() - 1);
      break;
    case "5Y":
      d.setFullYear(d.getFullYear() - 5);
      break;
    case "MAX":
      d.setFullYear(d.getFullYear() - 10);
      break;
  }
  return d;
}

function historyFrom(range: ChartRange): string {
  const d = rangeStartDate(range);
  d.setMonth(d.getMonth() - 1); // buffer for resampling
  return d.toISOString().slice(0, 10);
}

function sortedAsc(bars: FmpPriceBar[]): FmpPriceBar[] {
  return [...bars].sort((a, b) => a.date.localeCompare(b.date));
}

function bucketKey(date: string, range: ChartRange): string {
  const d = new Date(date);
  if (range === "1W" || range === "1M" || range === "3M") return date;
  if (range === "6M" || range === "1Y") {
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.floor((d.getTime() - jan1.getTime()) / 604_800_000);
    return `${d.getFullYear()}-W${week}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function resampleBars(bars: FmpPriceBar[], range: ChartRange): FmpPriceBar[] {
  const start = rangeStartDate(range);
  const filtered = sortedAsc(bars).filter((b) => new Date(b.date) >= start);
  const buckets = new Map<string, FmpPriceBar>();
  for (const bar of filtered) {
    buckets.set(bucketKey(bar.date, range), bar);
  }
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function formatLabel(date: string, range: ChartRange): string {
  const d = new Date(date);
  if (range === "1W" || range === "1M") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (range === "3M" || range === "6M") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function pctChange(from: number, to: number): number {
  if (!from) return 0;
  return Math.round(((to - from) / from) * 1000) / 10;
}

function buildComparePoints(
  barsA: FmpPriceBar[],
  barsB: FmpPriceBar[],
  range: ChartRange,
  dailyBarsA?: FmpPriceBar[],
): CompareChartPoint[] {
  const a = resampleBars(barsA, range);
  const bMap = new Map(resampleBars(barsB, range).map((x) => [x.date, x]));

  const aligned: { date: string; a: FmpPriceBar; b: FmpPriceBar }[] = [];
  for (const bar of a) {
    const match = bMap.get(bar.date) ?? closestBar([...bMap.values()], bar.date);
    if (match) aligned.push({ date: bar.date, a: bar, b: match });
  }

  if (!aligned.length) return [];

  const baseA = aligned[0].a.close;
  const baseB = aligned[0].b.close;
  let peakA = 100;
  let maxDrawdown = 0;

  return aligned.map(({ date, a: ba, b: bb }) => {
    const aIndexed = Math.round((ba.close / baseA) * 10000) / 100;
    const bIndexed = Math.round((bb.close / baseB) * 10000) / 100;
    peakA = Math.max(peakA, aIndexed);
    const drawdown = Math.round(((aIndexed - peakA) / peakA) * 1000) / 10;
    maxDrawdown = Math.min(maxDrawdown, drawdown);

    const point: CompareChartPoint = {
      date,
      label: formatLabel(date, range),
      aIndexed,
      bIndexed,
      aRaw: ba.close,
      bRaw: bb.close,
      volume: ba.volume ?? 0,
      drawdown,
    };

    if (dailyBarsA?.length) {
      point.sma50Indexed = smaIndexedAtDate(dailyBarsA, date, 50, baseA);
      point.sma200Indexed = smaIndexedAtDate(dailyBarsA, date, 200, baseA);
    }

    return point;
  });
}

function smaIndexedAtDate(
  dailyBars: FmpPriceBar[],
  date: string,
  window: number,
  baseClose: number,
): number | null {
  const closes: number[] = [];
  for (const bar of sortedAsc(dailyBars)) {
    if (bar.date > date) break;
    closes.push(bar.close);
  }
  if (closes.length < window || !baseClose) return null;
  const slice = closes.slice(-window);
  const sma = slice.reduce((sum, c) => sum + c, 0) / window;
  return Math.round((sma / baseClose) * 10000) / 100;
}

function smaHistoryFrom(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 18);
  return d.toISOString().slice(0, 10);
}

function closestBar(bars: FmpPriceBar[], iso: string): FmpPriceBar | null {
  if (!bars.length) return null;
  const target = new Date(iso).getTime();
  let best = bars[0];
  let diff = Math.abs(new Date(best.date).getTime() - target);
  for (const b of bars) {
    const d = Math.abs(new Date(b.date).getTime() - target);
    if (d < diff) {
      best = b;
      diff = d;
    }
  }
  return best;
}

async function fetchBars(symbol: string, range: ChartRange): Promise<FmpPriceBar[]> {
  return fetchHistoricalBars(symbol, historyFrom(range));
}

function buildMeta(
  ticker: string,
  industry: string,
  companyName: string,
  peerSymbols: string[],
): ChartOptionsMeta {
  const defaultPreset = getSectorChartDefault(industry, ticker, companyName);
  const compareOptions = [
    { key: "stock", label: "This stock" },
    { key: "SPY", label: "S&P 500 (SPY)" },
    { key: defaultPreset.seriesB, label: defaultPreset.seriesBLabel },
    ...peerSymbols.slice(0, 4).map((s) => ({ key: s, label: s })),
  ];

  const seen = new Set<string>();
  const uniqueCompare = compareOptions.filter((o) => {
    if (seen.has(o.key)) return false;
    seen.add(o.key);
    return true;
  });

  return {
    defaultPreset,
    compareOptions: uniqueCompare,
    scatterMetrics: SCATTER_METRICS,
  };
}

function metricValue(raw: RawMetricValues, key: ScatterMetricKey): number | null {
  const v = raw[key];
  return v !== null && Number.isFinite(v) ? v : null;
}

export interface ChartRequest {
  ticker: string;
  range?: ChartRange;
  mode?: ChartMode;
  seriesA?: string;
  seriesB?: string;
  scatterX?: ScatterMetricKey;
  scatterY?: ScatterMetricKey;
  useDefault?: boolean;
}

export async function getChartPayload(req: ChartRequest): Promise<FullChartPayload> {
  const ticker = normalizeTicker(req.ticker);
  if (!ticker) throw new FmpError("Ticker is required", "NOT_FOUND");

  if (!hasFmpApiKey()) {
    return getMockChartPayload(req);
  }

  const profileRes = await fmpFetch<FmpProfile[]>("/profile", { symbol: ticker });
  const profile = profileRes[0];
  if (!profile?.companyName) throw new FmpError(`No profile found for ${ticker}`, "NOT_FOUND");

  const industry = profile.industry ?? "";
  const companyName = profile.companyName;
  const peerRows = await fetchPeerMetricRows(ticker, companyName);
  const peerSymbols = peerRows.filter((p) => p.symbol !== ticker).map((p) => p.symbol);
  const meta = buildMeta(ticker, industry, companyName, peerSymbols);

  const preset = meta.defaultPreset;
  const range = req.range ?? preset.range;
  const mode = req.mode ?? "compare";
  const useDefault = req.useDefault !== false && !req.seriesA && !req.seriesB;

  if (mode === "scatter") {
    const xKey = req.scatterX ?? DEFAULT_SCATTER_X;
    const yKey = req.scatterY ?? DEFAULT_SCATTER_Y;
    const points = peerRows
      .map((row) => {
        const x = metricValue(row.raw, xKey);
        const y = metricValue(row.raw, yKey);
        if (x === null || y === null) return null;
        return {
          ticker: row.symbol,
          name: row.name,
          x,
          y,
          isTarget: row.symbol === ticker,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const scatter: ScatterChartData = {
      mode: "scatter",
      seriesX: { key: xKey, label: scatterMetricLabel(xKey) },
      seriesY: { key: yKey, label: scatterMetricLabel(yKey) },
      points,
      targetTicker: ticker,
    };
    return { chart: scatter, meta };
  }

  const symA = resolveSymbol(useDefault ? preset.seriesA : (req.seriesA ?? "stock"), ticker);
  const symB = resolveSymbol(useDefault ? preset.seriesB : (req.seriesB ?? "SPY"), ticker);

  const labelA = symA === ticker ? "This stock" : symA;
  const labelB =
    symB === preset.seriesB && useDefault
      ? preset.seriesBLabel
      : symB === "SPY"
        ? "S&P 500 (SPY)"
        : symB;

  const [barsA, barsB] = await Promise.all([fetchBars(symA, range), fetchBars(symB, range)]);
  const dailyBarsA =
    symA === ticker ? await fetchHistoricalBars(symA, smaHistoryFrom()) : undefined;
  const points = buildComparePoints(barsA, barsB, range, dailyBarsA);

  if (!points.length) throw new FmpError("Insufficient chart data", "PARSE");

  const first = points[0];
  const last = points[points.length - 1];
  const maxDrawdown = Math.min(...points.map((p) => p.drawdown));

  const compare: CompareChartData = {
    mode: "compare",
    range,
    seriesA: { key: symA === ticker ? "stock" : symA, label: labelA },
    seriesB: { key: symB, label: labelB },
    periodChangeA: pctChange(first.aRaw, last.aRaw),
    periodChangeB: pctChange(first.bRaw, last.bRaw),
    maxDrawdown,
    points,
    isSectorDefault: useDefault,
    presetDescription: useDefault ? preset.description : "",
  };

  return { chart: compare, meta };
}
