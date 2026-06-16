/** Hypothesis Lab — test a rule against real EOD history, honestly. */

export type StrategyKind = "buy-hold" | "sma-cross";

export interface StrategyConfig {
  kind: StrategyKind;
  /** moving-average window (trading days) for sma-cross */
  smaWindow?: number;
  /** round-trip-ish trading friction per position change, in basis points */
  costBps?: number;
}

/** A single price bar (close-only is enough for an EOD backtest). */
export interface Bar {
  date: string;
  close: number;
}

export interface BacktestPoint {
  date: string;
  /** equity of the rule, indexed to 1.0 at the start */
  strategy: number;
  /** equity of naive buy & hold of the same stock */
  buyHold: number;
  /** equity of buy & hold of the S&P 500 (SPY) */
  benchmark: number;
}

export interface BacktestStats {
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
  /** annualized volatility of daily returns */
  volatility: number;
  /** fraction of days the rule was invested (1 for buy & hold) */
  timeInMarket: number;
  trades: number;
}

export interface BacktestResult {
  ticker: string;
  kind: StrategyKind;
  smaWindow?: number;
  costBps: number;
  years: number;
  points: BacktestPoint[];
  strategy: BacktestStats;
  buyHold: BacktestStats;
  benchmark: BacktestStats;
  /** the honest caveats — always shown, so the user never fools themselves */
  warnings: string[];
  /** true when computed from synthetic data (no FMP key) */
  isMock: boolean;
}
