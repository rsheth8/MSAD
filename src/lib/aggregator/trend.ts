import type { FmpPriceBar } from "@/lib/fmp/types";
import type { TrendMetrics, TrendSentiment } from "@/lib/types";

function sortedAsc(bars: FmpPriceBar[]): FmpPriceBar[] {
  return [...bars].sort((a, b) => a.date.localeCompare(b.date));
}

/** Simple moving average of the last `window` closes. */
export function computeSma(closes: number[], window: number): number | null {
  if (closes.length < window) return null;
  const slice = closes.slice(-window);
  const avg = slice.reduce((sum, c) => sum + c, 0) / window;
  return Math.round(avg * 100) / 100;
}

function pctAbove(price: number, ma: number | null): number | null {
  if (ma === null || ma <= 0) return null;
  return Math.round(((price - ma) / ma) * 1000) / 10;
}

function classifySentiment(
  price: number,
  sma50: number | null,
  sma200: number | null,
): TrendSentiment {
  if (sma50 === null && sma200 === null) return "mixed";
  if (sma50 !== null && sma200 === null) {
    return price > sma50 ? "bullish" : "bearish";
  }
  if (sma50 === null || sma200 === null) return "mixed";

  const above50 = price > sma50;
  const above200 = price > sma200;
  const goldenCross = sma50 > sma200;

  if (above50 && above200 && goldenCross) return "bullish";
  if (!above50 && !above200 && !goldenCross) return "bearish";
  return "mixed";
}

function trendSummary(
  sentiment: TrendSentiment,
  price: number,
  sma50: number | null,
  sma200: number | null,
): string {
  if (sma50 === null && sma200 === null) {
    return "Not enough trading history yet to compute moving averages.";
  }

  const parts: string[] = [];
  if (sma50 !== null) {
    parts.push(
      price > sma50
        ? "price is above the 50-day average"
        : "price is below the 50-day average",
    );
  }
  if (sma200 !== null) {
    parts.push(
      price > sma200
        ? "above the 200-day average"
        : "below the 200-day average",
    );
  }
  if (sma50 !== null && sma200 !== null) {
    parts.push(
      sma50 > sma200
        ? "the 50-day line is above the 200-day (golden cross territory)"
        : "the 50-day line is below the 200-day (death cross territory)",
    );
  }

  const headline =
    sentiment === "bullish"
      ? "Uptrend signals dominate"
      : sentiment === "bearish"
        ? "Downtrend signals dominate"
        : "Mixed trend signals";

  return `${headline} — ${parts.join(", ")}.`;
}

/** Build 50/200-day SMA trend metrics from daily EOD bars. */
export function buildTrendMetrics(bars: FmpPriceBar[], latestPrice: number): TrendMetrics {
  const closes = sortedAsc(bars).map((b) => b.close);
  const sma50 = computeSma(closes, 50);
  const sma200 = computeSma(closes, 200);
  const sentiment = classifySentiment(latestPrice, sma50, sma200);

  return {
    sma50,
    sma200,
    priceVsSma50Pct: pctAbove(latestPrice, sma50),
    priceVsSma200Pct: pctAbove(latestPrice, sma200),
    sentiment,
    summary: trendSummary(sentiment, latestPrice, sma50, sma200),
  };
}

/** Plausible trend metrics for mock data when no bar history is available. */
export function mockTrendMetrics(price: number, rand: () => number): TrendMetrics {
  const sma50 = Math.round(price * (0.94 + rand() * 0.1) * 100) / 100;
  const sma200 = Math.round(price * (0.86 + rand() * 0.14) * 100) / 100;
  const sentiment = classifySentiment(price, sma50, sma200);

  return {
    sma50,
    sma200,
    priceVsSma50Pct: pctAbove(price, sma50),
    priceVsSma200Pct: pctAbove(price, sma200),
    sentiment,
    summary: trendSummary(sentiment, price, sma50, sma200),
  };
}