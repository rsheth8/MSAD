import {
  DEFAULT_SCATTER_X,
  DEFAULT_SCATTER_Y,
  getSectorChartDefault,
  SCATTER_METRICS,
  scatterMetricLabel,
} from "@/lib/chart/presets";
import type {
  ChartOptionsMeta,
  ChartRange,
  CompareChartData,
  CompareChartPoint,
  FullChartPayload,
  ScatterChartData,
  ScatterMetricKey,
} from "@/lib/chart/types";
import type { ChartRequest } from "@/lib/aggregator/chart";
import type { RawMetricValues } from "@/lib/aggregator/metrics";

function seeded(ticker: string): () => number {
  let h = 1779033703 ^ ticker.length;
  for (let i = 0; i < ticker.length; i++) {
    h = Math.imul(h ^ ticker.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pointCount(range: ChartRange): number {
  switch (range) {
    case "1W":
      return 7;
    case "1M":
      return 22;
    case "3M":
      return 45;
    case "6M":
      return 26;
    case "1Y":
      return 52;
    case "5Y":
      return 60;
    case "MAX":
      return 120;
  }
}

function mockComparePoints(ticker: string, range: ChartRange): CompareChartPoint[] {
  const rand = seeded(`${ticker}-${range}`);
  const n = pointCount(range);
  const now = Date.now();
  const msPerPoint =
    range === "1W"
      ? 86_400_000
      : range === "1M" || range === "3M"
        ? 86_400_000
        : range === "6M" || range === "1Y"
          ? 7 * 86_400_000
          : 30 * 86_400_000;

  let a = 100;
  let b = 100;
  let peak = 100;
  const aDrift = (rand() - 0.4) * 0.03;
  const bDrift = 0.006;

  const points: CompareChartPoint[] = [];
  const aHistory: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      a *= 1 + aDrift + (rand() - 0.5) * 0.04;
      b *= 1 + bDrift + (rand() - 0.5) * 0.02;
    }
    aHistory.push(a);
    const date = new Date(now - (n - 1 - i) * msPerPoint);
    peak = Math.max(peak, a);
    const drawdown = Math.round(((a - peak) / peak) * 1000) / 10;
    const sma = (window: number) => {
      if (aHistory.length < window) return null;
      const slice = aHistory.slice(-window);
      return Math.round((slice.reduce((s, v) => s + v, 0) / window) * 100) / 100;
    };
    points.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      aIndexed: Math.round(a * 100) / 100,
      bIndexed: Math.round(b * 100) / 100,
      aRaw: Math.round(a * 2.5 * 100) / 100,
      bRaw: Math.round(b * 4.2 * 100) / 100,
      volume: Math.round(rand() * 50_000_000),
      drawdown,
      sma50Indexed: sma(50),
      sma200Indexed: sma(200),
    });
  }
  return points;
}

function mockScatter(ticker: string, xKey: ScatterMetricKey, yKey: ScatterMetricKey): ScatterChartData {
  const rand = seeded(`${ticker}-scatter`);
  const peers = ["MSFT", "GOOGL", "META", "NVDA", "AMZN"];
  const mockRaw = (): RawMetricValues => ({
    roe: 0.08 + rand() * 0.35,
    opRevenue: 0.65 + rand() * 0.25,
    cashFlowChange: (rand() - 0.4) * 0.4,
    pe: 12 + rand() * 35,
    evEbitda: 8 + rand() * 22,
    divYield: rand() < 0.3 ? null : rand() * 0.04,
    assetLiability: 1.1 + rand() * 1.5,
  });

  const rows = [{ symbol: ticker, name: `${ticker} Co.`, raw: mockRaw() }, ...peers.map((s) => ({ symbol: s, name: s, raw: mockRaw() }))];

  return {
    mode: "scatter",
    seriesX: { key: xKey, label: scatterMetricLabel(xKey) },
    seriesY: { key: yKey, label: scatterMetricLabel(yKey) },
    targetTicker: ticker,
    points: rows
      .map((row) => {
        const x = row.raw[xKey];
        const y = row.raw[yKey];
        if (x === null || y === null) return null;
        return { ticker: row.symbol, name: row.name, x, y, isTarget: row.symbol === ticker };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null),
  };
}

export function getMockChartPayload(req: ChartRequest): FullChartPayload {
  const ticker = (req.ticker || "AAPL").toUpperCase();
  const industry = "Diversified";
  const preset = getSectorChartDefault(industry, ticker, `${ticker} Holdings`);
  const range = req.range ?? preset.range;
  const mode = req.mode ?? "compare";
  const useDefault = req.useDefault !== false && !req.seriesA && !req.seriesB;

  const meta: ChartOptionsMeta = {
    defaultPreset: preset,
    compareOptions: [
      { key: "stock", label: "This stock" },
      { key: "SPY", label: "S&P 500 (SPY)" },
      { key: preset.seriesB, label: preset.seriesBLabel },
      { key: "MSFT", label: "MSFT" },
      { key: "NVDA", label: "NVDA" },
    ],
    scatterMetrics: SCATTER_METRICS,
  };

  if (mode === "scatter") {
    return {
      chart: mockScatter(ticker, req.scatterX ?? DEFAULT_SCATTER_X, req.scatterY ?? DEFAULT_SCATTER_Y),
      meta,
    };
  }

  const points = mockComparePoints(ticker, range);
  const first = points[0];
  const last = points[points.length - 1];

  const compare: CompareChartData = {
    mode: "compare",
    range,
    seriesA: { key: "stock", label: "This stock" },
    seriesB: { key: useDefault ? preset.seriesB : (req.seriesB ?? "SPY"), label: useDefault ? preset.seriesBLabel : "S&P 500 (SPY)" },
    periodChangeA: Math.round(((last.aRaw - first.aRaw) / first.aRaw) * 1000) / 10,
    periodChangeB: Math.round(((last.bRaw - first.bRaw) / first.bRaw) * 1000) / 10,
    maxDrawdown: Math.min(...points.map((p) => p.drawdown)),
    points,
    isSectorDefault: useDefault,
    presetDescription: useDefault ? preset.description : "",
  };

  return { chart: compare, meta };
}
