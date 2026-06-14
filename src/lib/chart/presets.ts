import type { ChartDefaultPreset, ChartRange, ScatterMetricKey } from "./types";

export const CHART_RANGES: { value: ChartRange; label: string }[] = [
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "5Y", label: "5Y" },
  { value: "MAX", label: "MAX" },
];

export const SCATTER_METRICS: { key: ScatterMetricKey; label: string }[] = [
  { key: "pe", label: "P / E Ratio" },
  { key: "roe", label: "Return on Equity" },
  { key: "evEbitda", label: "EV / EBITDA" },
  { key: "opRevenue", label: "Operating / Revenue" },
  { key: "divYield", label: "Dividend Yield" },
  { key: "assetLiability", label: "Asset / Liability" },
  { key: "cashFlowChange", label: "Cash Flow Change" },
];

interface SectorRule {
  match: RegExp;
  benchmark: string;
  benchmarkLabel: string;
  description: string;
}

const SECTOR_RULES: SectorRule[] = [
  {
    match: /semiconductor|software|technology|internet|electronic|computer|cloud/i,
    benchmark: "XLK",
    benchmarkLabel: "Technology (XLK)",
    description: "Tech stocks are usually compared to the tech sector, not just the broad market.",
  },
  {
    match: /bank|financial|insurance|capital market|credit/i,
    benchmark: "XLF",
    benchmarkLabel: "Financials (XLF)",
    description: "Banks and insurers are typically judged against the financial sector.",
  },
  {
    match: /energy|oil|gas|petroleum|coal/i,
    benchmark: "XLE",
    benchmarkLabel: "Energy (XLE)",
    description: "Energy companies move with commodity cycles — XLE is the usual benchmark.",
  },
  {
    match: /health|pharma|biotech|medical|drug/i,
    benchmark: "XLV",
    benchmarkLabel: "Health Care (XLV)",
    description: "Health care has its own sector ETF (XLV) as the standard comparison.",
  },
  {
    match: /retail|consumer|restaurant|apparel|leisure|hotel/i,
    benchmark: "XLY",
    benchmarkLabel: "Consumer Disc. (XLY)",
    description: "Consumer-facing companies are often compared to XLY.",
  },
  {
    match: /industrial|machinery|aerospace|defense|transport/i,
    benchmark: "XLI",
    benchmarkLabel: "Industrials (XLI)",
    description: "Industrial companies typically benchmark against XLI.",
  },
  {
    match: /utility|electric|water/i,
    benchmark: "XLU",
    benchmarkLabel: "Utilities (XLU)",
    description: "Utilities are slow, income-oriented — XLU is the sector standard.",
  },
  {
    match: /real estate|reit/i,
    benchmark: "XLRE",
    benchmarkLabel: "Real Estate (XLRE)",
    description: "REITs and property companies compare to XLRE.",
  },
  {
    match: /material|mining|metal|chemical/i,
    benchmark: "XLB",
    benchmarkLabel: "Materials (XLB)",
    description: "Basic materials names are usually tracked against XLB.",
  },
  {
    match: /communication|telecom|media|entertainment/i,
    benchmark: "XLC",
    benchmarkLabel: "Communication (XLC)",
    description: "Media and telecom names often compare to XLC.",
  },
];

const ETF_DEFAULT: ChartDefaultPreset = {
  range: "1Y",
  seriesA: "stock",
  seriesB: "SPY",
  seriesALabel: "This fund",
  seriesBLabel: "S&P 500 (SPY)",
  description: "Broad ETFs are usually compared to the S&P 500 as the market baseline.",
};

const FALLBACK: ChartDefaultPreset = {
  range: "1Y",
  seriesA: "stock",
  seriesB: "SPY",
  seriesALabel: "This stock",
  seriesBLabel: "S&P 500 (SPY)",
  description: "The S&P 500 (via SPY) is the standard benchmark for most US stocks.",
};

/** Sector-aware default compare chart for a given industry string. */
export function getSectorChartDefault(
  industry: string,
  ticker: string,
  companyName: string,
): ChartDefaultPreset {
  const isEtf =
    /etf|fund|index|trust/i.test(industry) ||
    /etf|fund|trust/i.test(companyName) ||
    ["SPY", "QQQ", "VTI", "VOO", "IVV", "DIA", "IWM"].includes(ticker);

  if (isEtf) return { ...ETF_DEFAULT, seriesALabel: ticker };

  for (const rule of SECTOR_RULES) {
    if (rule.match.test(industry)) {
      return {
        range: "1Y",
        seriesA: "stock",
        seriesB: rule.benchmark,
        seriesALabel: "This stock",
        seriesBLabel: rule.benchmarkLabel,
        description: rule.description,
      };
    }
  }

  return { ...FALLBACK, seriesALabel: "This stock" };
}

export function scatterMetricLabel(key: ScatterMetricKey): string {
  return SCATTER_METRICS.find((m) => m.key === key)?.label ?? key;
}

export function isScatterMetricKey(v: string): v is ScatterMetricKey {
  return SCATTER_METRICS.some((m) => m.key === v);
}

export function isChartRange(v: string): v is ChartRange {
  return CHART_RANGES.some((r) => r.value === v);
}

/** Default scatter: P/E vs ROE — classic valuation vs quality view. */
export const DEFAULT_SCATTER_X: ScatterMetricKey = "pe";
export const DEFAULT_SCATTER_Y: ScatterMetricKey = "roe";
