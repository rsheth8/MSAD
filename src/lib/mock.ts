import type { ReportCard, SeriesPoint, Metric } from "./types";
import { formatMetricDisplay } from "./format";
import { buildOptionsData } from "./aggregator/options";

/**
 * Deterministic mock report card generator.
 *
 * Produces stable, plausible-looking data seeded by the ticker symbol so the
 * UI feels "live" while we build the design (Phases 2–5). Replaced by the
 * real FMP aggregator in Phase 9 — the returned shape is identical.
 */

// tiny seeded PRNG (mulberry32) so a given ticker always renders the same
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

function buildSeries(rand: () => number): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  let stock = 100;
  let sp500 = 100;
  // mostly upward, but some tickers trend down (drives the red background)
  const stockDrift = (rand() - 0.42) * 0.05; // ~[-0.021, +0.029] / month
  const now = new Date();
  for (let i = 12; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    if (i < 12) {
      stock *= 1 + stockDrift + (rand() - 0.5) * 0.12;
      sp500 *= 1 + 0.008 + (rand() - 0.5) * 0.05;
    }
    points.push({
      date: d.toISOString().slice(0, 10),
      stock: Math.round(stock * 100) / 100,
      sp500: Math.round(sp500 * 100) / 100,
    });
  }
  return points;
}

function buildMetrics(rand: () => number): Metric[] {
  // helper to make a vs-industry figure in [-45, +45]%
  const vs = () => Math.round((rand() - 0.5) * 90 * 10) / 10;

  const pe = 12 + rand() * 30;
  const evEbitda = 8 + rand() * 22;
  const roe = 0.08 + rand() * 0.4;
  const divYield = rand() < 0.25 ? null : rand() * 0.04;
  const assetLiability = 1.2 + rand() * 1.8;
  const opRevenue = 0.7 + rand() * 0.28;
  const cashFlowChange = (rand() - 0.35) * 0.5;

  const make = (
    key: string,
    label: string,
    value: number | null,
    higherIsBetter: boolean,
  ): Metric => ({
    key,
    label,
    value,
    display: formatMetricDisplay(key, value),
    vsIndustryPct: value === null ? null : vs(),
    higherIsBetter,
  });

  return [
    make("roe", "Return on Equity (ROE)", roe, true),
    make("opRevenue", "Operating / Revenue Ratio", opRevenue, true),
    make("cashFlowChange", "Change in Cash Flow", cashFlowChange, true),
    make("pe", "P / E Ratio", pe, false),
    make("evEbitda", "EV / EBITDA", evEbitda, false),
    make("divYield", "Dividend Yield", divYield, true),
    make("assetLiability", "Asset / Liability Ratio", assetLiability, true),
  ];
}

const SAMPLE_NAMES: Record<string, { name: string; industry: string; exchange: string }> = {
  AAPL: { name: "Apple Inc.", industry: "Consumer Electronics", exchange: "NASDAQ" },
  MSFT: { name: "Microsoft Corporation", industry: "Software—Infrastructure", exchange: "NASDAQ" },
  NVDA: { name: "NVIDIA Corporation", industry: "Semiconductors", exchange: "NASDAQ" },
  TSLA: { name: "Tesla, Inc.", industry: "Auto Manufacturers", exchange: "NASDAQ" },
};

export function getMockReportCard(rawTicker = "AAPL"): ReportCard {
  const ticker = (rawTicker || "AAPL").toUpperCase().trim();
  const rand = seeded(ticker);
  const meta =
    SAMPLE_NAMES[ticker] ?? {
      name: `${ticker} Holdings`,
      industry: "Diversified",
      exchange: "NYSE",
    };

  const series = buildSeries(rand);
  const last = series[series.length - 1].stock;
  const price = Math.round((40 + rand() * 360) * 100) / 100;

  // derive trailing changes from the synthetic series
  const yearChange = ((last - series[0].stock) / series[0].stock) * 100;
  const monthChange = ((last - series[series.length - 2].stock) / series[series.length - 2].stock) * 100;
  const weekChange = (rand() - 0.45) * 6;
  const dayChange = ((last - series[series.length - 1].stock) / series[series.length - 1].stock) * 100
    || (rand() - 0.48) * 3;
  const beta = Math.round((0.6 + rand() * 1.3) * 100) / 100;

  return {
    name: meta.name,
    ticker,
    industry: meta.industry,
    exchange: meta.exchange,
    currency: "USD",
    price,
    beta,
    changes: {
      day: Math.round(dayChange * 10) / 10,
      week: Math.round(weekChange * 10) / 10,
      month: Math.round(monthChange * 10) / 10,
      year: Math.round(yearChange * 10) / 10,
    },
    series,
    metrics: buildMetrics(rand),
    options: buildOptionsData(price, beta, rand),
    asOf: new Date().toISOString(),
    isMock: true,
  };
}
