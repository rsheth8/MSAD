/**
 * Shared data model for a stock "report card".
 *
 * This is the single contract between the UI and the data layer. The mock data
 * (Phases 2–5) and the live FMP-backed aggregator (Phases 6–9) both produce a
 * `ReportCard`, so the UI never needs to change when we swap mock → live.
 */

/** A single metric shown around the chart, with its industry comparison. */
export interface Metric {
  /** stable identifier, e.g. "pe", "roe" */
  key: string;
  /** human label, e.g. "Return on Equity (ROE)" */
  label: string;
  /** raw numeric value, or null when not applicable (e.g. no dividend) */
  value: number | null;
  /** preformatted display string, e.g. "32.4×", "147.2%", "1.8" */
  display: string;
  /** percent difference vs the industry peer average; null if unavailable */
  vsIndustryPct: number | null;
  /** whether a higher value is generally favorable (drives color/sentiment) */
  higherIsBetter: boolean;
}

/** One point on the 12-month chart. Values are normalized to 100 at the start. */
export interface SeriesPoint {
  /** ISO date (yyyy-mm-dd) */
  date: string;
  /** stock price, indexed to 100 at the first point */
  stock: number;
  /** S&P 500, indexed to 100 at the first point */
  sp500: number;
}

/** Trailing price changes, as percentages. */
export interface PriceChanges {
  week: number;
  month: number;
  year: number;
}

/** A single (representative) option contract. */
export interface OptionContract {
  type: "call" | "put";
  /** strike price */
  strike: number;
  /** premium per share (a contract covers 100 shares) */
  premium: number;
  /** ISO expiration date */
  expiry: string;
  /** rough delta (≈ +0.5 ATM call, −0.5 ATM put) */
  delta: number;
}

/** Factual options data for the educational options section. */
export interface OptionsData {
  /** annualized implied volatility, as a ratio (0.28 = 28%) */
  impliedVolatility: number;
  /** upcoming expiration dates with days-to-expiry */
  expirations: { date: string; days: number }[];
  /** a near-the-money call + put for the nearest standard expiry */
  call: OptionContract;
  put: OptionContract;
}

/** Everything needed to render one report card. */
export interface ReportCard {
  name: string;
  ticker: string;
  industry: string;
  exchange: string;
  currency: string;
  price: number;
  /** stock's volatility relative to the market (1 = moves with the market) */
  beta: number;
  changes: PriceChanges;
  /** 13 monthly points (start + 12 months) for the 12M graph */
  series: SeriesPoint[];
  /** exactly the 8 metrics from the template, in display order */
  metrics: Metric[];
  /** factual options data for the education section */
  options: OptionsData;
  /** ISO timestamp the data was assembled */
  asOf: string;
  /** true when values are placeholder/mock rather than live */
  isMock?: boolean;
}
