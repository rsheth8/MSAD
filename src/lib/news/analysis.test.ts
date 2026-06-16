import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareSentimentVerdict } from "./analysis.ts";
import type { NewsDigest } from "./types.ts";

function digest(ticker: string, mood: "bullish" | "neutral" | "bearish"): NewsDigest {
  return {
    ticker,
    articles: [{ title: "x", snippet: "", url: "https://x", source: "s", publishedAt: "2026-06-15", tickers: [ticker], category: "other", whyItMatters: "" }],
    analyst: { strongBuy: 0, buy: mood === "bullish" ? 5 : 0, hold: mood === "neutral" ? 5 : 0, sell: mood === "bearish" ? 5 : 0, strongSell: 0, consensus: "Hold", mood },
    recentGrades: [],
    social: null,
    summary: "",
    asOf: "2026-06-15T00:00:00Z",
    isMock: false,
  };
}

describe("compareSentimentVerdict", () => {
  it("returns null when either digest is missing", () => {
    assert.equal(compareSentimentVerdict(null, digest("MSFT", "neutral")), null);
    assert.equal(compareSentimentVerdict(digest("AAPL", "bullish"), null), null);
  });

  it("picks warmer sentiment when moods differ", () => {
    const result = compareSentimentVerdict(digest("AAPL", "bullish"), digest("MSFT", "bearish"));
    assert.ok(result);
    assert.match(result!.headline, /AAPL/i);
  });
});
