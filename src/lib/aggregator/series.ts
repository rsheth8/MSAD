import type { FmpPriceBar } from "@/lib/fmp/types";
import type { PriceChanges, SeriesPoint } from "@/lib/types";

function sortedAsc(bars: FmpPriceBar[]): FmpPriceBar[] {
  return [...bars].sort((a, b) => a.date.localeCompare(b.date));
}

function closestBar(bars: FmpPriceBar[], target: Date): FmpPriceBar | null {
  if (!bars.length) return null;
  const targetMs = target.getTime();
  let best = bars[0];
  let bestDiff = Math.abs(new Date(best.date).getTime() - targetMs);
  for (const bar of bars) {
    const diff = Math.abs(new Date(bar.date).getTime() - targetMs);
    if (diff < bestDiff) {
      best = bar;
      bestDiff = diff;
    }
  }
  return best;
}

function pctChange(from: number, to: number): number {
  if (!from) return 0;
  return Math.round(((to - from) / from) * 1000) / 10;
}

function monthEndDates(count: number): Date[] {
  const out: Date[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    // last day of that month
    out.push(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  }
  return out;
}

/** Build indexed 12M series and trailing price changes from EOD bars. */
export function buildSeriesAndChanges(
  stockBars: FmpPriceBar[],
  benchBars: FmpPriceBar[],
  latestPrice: number,
): { series: SeriesPoint[]; changes: PriceChanges } {
  const stock = sortedAsc(stockBars);
  const bench = sortedAsc(benchBars);
  const monthEnds = monthEndDates(13);

  const stockCloses = monthEnds
    .map((d) => closestBar(stock, d)?.close)
    .filter((v): v is number => v !== undefined && Number.isFinite(v));

  const benchCloses = monthEnds
    .map((d) => closestBar(bench, d)?.close)
    .filter((v): v is number => v !== undefined && Number.isFinite(v));

  const baseStock = stockCloses[0] ?? latestPrice;
  const baseBench = benchCloses[0] ?? bench[bench.length - 1]?.close ?? 100;

  const series: SeriesPoint[] = monthEnds.map((d, i) => ({
    date: d.toISOString().slice(0, 10),
    stock:
      stockCloses[i] !== undefined
        ? Math.round((stockCloses[i] / baseStock) * 10000) / 100
        : 100,
    sp500:
      benchCloses[i] !== undefined
        ? Math.round((benchCloses[i] / baseBench) * 10000) / 100
        : 100,
  }));

  const latest = stock[stock.length - 1];
  const weekBar = closestBar(stock, new Date(Date.now() - 7 * 86_400_000));
  const monthBar = closestBar(stock, new Date(Date.now() - 30 * 86_400_000));
  const yearBar = closestBar(stock, new Date(Date.now() - 365 * 86_400_000));

  const price = latestPrice || latest?.close || 0;

  return {
    series,
    changes: {
      week: weekBar ? pctChange(weekBar.close, price) : 0,
      month: monthBar ? pctChange(monthBar.close, price) : 0,
      year: yearBar ? pctChange(yearBar.close, price) : 0,
    },
  };
}

/** Fetch ~15 months of daily closes for chart + change calculations. */
export function historyFromDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 15);
  return d.toISOString().slice(0, 10);
}
