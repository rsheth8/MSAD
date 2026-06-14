import type { FmpPriceBar } from "@/lib/fmp/types";

/** Annualized historical volatility from daily log returns. */
export function historicalVolatility(bars: FmpPriceBar[], window = 30): number {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted.map((b) => b.close).filter((c) => c > 0);
  if (closes.length < 5) return 0.25;

  const slice = closes.slice(-Math.min(window + 1, closes.length));
  const returns: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    returns.push(Math.log(slice[i] / slice[i - 1]));
  }
  if (returns.length < 2) return 0.25;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.min(1.2, Math.max(0.08, Math.sqrt(variance) * Math.sqrt(252)));
}
