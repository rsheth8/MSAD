/**
 * Pure EOD backtest engine. No look-ahead: each day's position is decided from
 * data available *that day* and applied to the *next* day's return. Returns
 * equity curves + stats for the rule, naive buy & hold, and the S&P 500.
 */
import type {
  Bar,
  BacktestPoint,
  BacktestStats,
  StrategyConfig,
  StrategyKind,
} from "./types";

const TRADING_DAYS = 252;

function sortAsc(bars: Bar[]): Bar[] {
  return [...bars].sort((a, b) => a.date.localeCompare(b.date));
}

/** Simple moving average; entries before the window are null. */
function sma(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

function maxDrawdown(curve: number[]): number {
  let peak = -Infinity;
  let mdd = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    if (peak > 0) mdd = Math.max(mdd, (peak - v) / peak);
  }
  return mdd;
}

function annualizedVol(curve: number[]): number {
  const rets: number[] = [];
  for (let i = 1; i < curve.length; i++) rets.push(curve[i] / curve[i - 1] - 1);
  if (rets.length < 2) return 0;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS);
}

function statsFor(
  curve: number[],
  years: number,
  extras: { timeInMarket: number; trades: number },
): BacktestStats {
  const totalReturn = curve.length ? curve[curve.length - 1] / curve[0] - 1 : 0;
  const cagr = years > 0 && curve.length ? (curve[curve.length - 1] / curve[0]) ** (1 / years) - 1 : 0;
  return {
    totalReturn,
    cagr,
    maxDrawdown: maxDrawdown(curve),
    volatility: annualizedVol(curve),
    timeInMarket: extras.timeInMarket,
    trades: extras.trades,
  };
}

/** Align benchmark closes onto the asset's dates (carry-forward last known). */
function alignBenchmark(assetDates: string[], bench: Bar[]): number[] {
  const sorted = sortAsc(bench);
  const out: number[] = [];
  let j = 0;
  let last = sorted[0]?.close ?? 1;
  for (const d of assetDates) {
    while (j < sorted.length && sorted[j].date <= d) {
      last = sorted[j].close;
      j++;
    }
    out.push(last);
  }
  return out;
}

export interface ComputedBacktest {
  points: BacktestPoint[];
  strategy: BacktestStats;
  buyHold: BacktestStats;
  benchmark: BacktestStats;
  years: number;
  warnings: string[];
}

export function computeBacktest(
  assetBars: Bar[],
  benchBars: Bar[],
  config: StrategyConfig,
): ComputedBacktest {
  const asset = sortAsc(assetBars).filter((b) => Number.isFinite(b.close) && b.close > 0);
  const n = asset.length;
  if (n < 2) {
    const empty = statsFor([1], 0, { timeInMarket: 0, trades: 0 });
    return { points: [], strategy: empty, buyHold: empty, benchmark: empty, years: 0, warnings: ["Not enough price history to backtest."] };
  }

  const dates = asset.map((b) => b.date);
  const close = asset.map((b) => b.close);
  const bench = alignBenchmark(dates, benchBars);

  const costBps = Math.max(0, config.smaWindow !== undefined || config.kind === "sma-cross" ? (config.costBps ?? 0) : 0);
  const cost = costBps / 10_000;

  // Reference curves (no costs): naive buy & hold of the stock and of SPY.
  const buyHoldCurve = close.map((c) => c / close[0]);
  const benchCurve = bench.map((c) => c / bench[0]);

  // Strategy curve.
  let stratCurve: number[];
  let trades = 0;
  let inMarketDays = 0;

  if (config.kind === "buy-hold") {
    stratCurve = buyHoldCurve;
    inMarketDays = n - 1;
  } else {
    const window = Math.max(2, Math.floor(config.smaWindow ?? 50));
    const avg = sma(close, window);
    const curve: number[] = new Array(n);
    curve[0] = 1;
    let equity = 1;
    let pos = 0; // 0 = cash, 1 = long
    for (let i = 1; i < n; i++) {
      // Position decided from yesterday's close vs yesterday's SMA (no peeking).
      const ma = avg[i - 1];
      const desired = ma !== null && close[i - 1] > ma ? 1 : 0;
      if (desired !== pos) {
        trades += 1;
        equity *= 1 - cost;
        pos = desired;
      }
      const dayRet = close[i] / close[i - 1] - 1;
      equity *= 1 + pos * dayRet;
      if (pos === 1) inMarketDays += 1;
      curve[i] = equity;
    }
    stratCurve = curve;
  }

  const years = daysBetween(dates[0], dates[n - 1]) / 365.25;

  const points: BacktestPoint[] = dates.map((d, i) => ({
    date: d,
    strategy: round(stratCurve[i]),
    buyHold: round(buyHoldCurve[i]),
    benchmark: round(benchCurve[i]),
  }));

  return {
    points,
    strategy: statsFor(stratCurve, years, { timeInMarket: inMarketDays / (n - 1), trades }),
    buyHold: statsFor(buyHoldCurve, years, { timeInMarket: 1, trades: 0 }),
    benchmark: statsFor(benchCurve, years, { timeInMarket: 1, trades: 0 }),
    years,
    warnings: buildWarnings(config, costBps),
  };
}

/** The honest layer — caveats that stop a backtest from fooling you. */
export function buildWarnings(config: StrategyConfig, costBps: number): string[] {
  const w = [
    "Survivorship bias: you picked a stock that still exists today. A real strategy must also hold the names that failed — testing only survivors flatters every result.",
    "This is an EOD model: it can't capture intraday gaps, bid/ask spreads, or partial fills. Live results will differ.",
    "Past performance does not predict future returns.",
  ];
  if (config.kind === "sma-cross") {
    w.unshift(
      "Overfitting risk: tuning the moving-average window to maximize past return almost never wins out-of-sample. Pick a rule you'd believe in beforehand.",
    );
    if (costBps === 0) {
      w.push("You set trading costs to 0 bps. Add a few basis points to see how much the switching drags on returns.");
    }
  }
  return w;
}

function daysBetween(a: string, b: string): number {
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function round(x: number): number {
  return Math.round(x * 10_000) / 10_000;
}

export function isStrategyKind(v: unknown): v is StrategyKind {
  return v === "buy-hold" || v === "sma-cross";
}
