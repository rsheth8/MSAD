import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizePositions } from "./holdings.ts";

describe("normalizePositions", () => {
  it("aggregates v2 positions with instrument.symbol", () => {
    const out = normalizePositions([
      { instrument: { kind: "stock", symbol: "AAPL" }, units: 10, price: 200 },
      { instrument: { kind: "stock", symbol: "MSFT" }, units: 5, price: 400 },
      { instrument: { kind: "stock", symbol: "AAPL" }, units: 2, price: 210 },
    ]);
    assert.equal(out.positions.length, 2);
    assert.equal(out.positions[0]!.ticker, "AAPL");
    assert.equal(out.positions[0]!.value, 10 * 200 + 2 * 210);
    assert.equal(out.holdings[0]!.ticker, "AAPL");
  });

  it("skips options and empty tickers", () => {
    const out = normalizePositions([
      { instrument: { kind: "option", symbol: "AAPL240119C00150000" }, units: 1, price: 5 },
      { instrument: { kind: "stock", symbol: "" }, units: 1, price: 1 },
    ]);
    assert.equal(out.positions.length, 0);
  });
});
