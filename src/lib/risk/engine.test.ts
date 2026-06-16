import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildWarnings, computeRisk } from "./engine.ts";
import type { RiskAsset } from "./types.ts";

function fromReturns(rets: number[], start = 100): { dates: string[]; closes: number[] } {
  const closes = [start];
  for (const r of rets) closes.push(closes[closes.length - 1] * (1 + r));
  const base = new Date("2021-01-01").getTime();
  const dates = closes.map((_, i) => new Date(base + i * 86_400_000).toISOString().slice(0, 10));
  return { dates, closes };
}

const A_RETS = [0.01, -0.02, 0.03, -0.01, 0.02, 0.01];

function asset(ticker: string, weight: number, rets: number[], sector: string, beta: number): RiskAsset {
  const { dates, closes } = fromReturns(rets);
  return { ticker, weight, dates, closes, sector, beta };
}

describe("computeRisk", () => {
  it("normalizes weights and computes weighted beta", () => {
    const r = computeRisk(
      [asset("A", 60, A_RETS, "Tech", 1.2), asset("B", 40, A_RETS, "Tech", 0.8)],
      false,
    );
    assert.ok(Math.abs(r.holdings[0].weight - 0.6) < 1e-9);
    assert.ok(Math.abs(r.portfolioBeta - 1.04) < 1e-9);
    assert.equal(r.concentration.topTicker, "A");
    assert.ok(Math.abs(r.concentration.topWeight - 0.6) < 1e-9);
  });

  it("aggregates sector exposure", () => {
    const r = computeRisk(
      [asset("A", 50, A_RETS, "Tech", 1), asset("B", 50, A_RETS, "Energy", 1)],
      false,
    );
    assert.equal(r.sectors.length, 2);
    assert.ok(Math.abs(r.sectors[0].weight - 0.5) < 1e-9);
  });

  it("detects highly correlated holdings (~1)", () => {
    const r = computeRisk(
      [asset("A", 50, A_RETS, "Tech", 1), asset("B", 50, A_RETS, "Tech", 1)],
      false,
    );
    assert.ok(r.avgCorrelation !== null && r.avgCorrelation > 0.99);
  });

  it("blending uncorrelated/opposite returns lowers volatility", () => {
    const opposite = A_RETS.map((x) => -x);
    const r = computeRisk(
      [asset("A", 50, A_RETS, "Tech", 1), asset("B", 50, opposite, "Energy", 1)],
      false,
    );
    assert.ok(r.avgCorrelation !== null && r.avgCorrelation < 0);
    assert.ok(r.volatility < 0.02, `blended vol ${r.volatility} should be tiny`);
  });

  it("scales crash scenarios by portfolio beta", () => {
    const r = computeRisk([asset("A", 100, A_RETS, "Tech", 1.5)], false);
    const deep = r.scenarios.find((s) => s.marketDrop === -0.34)!;
    assert.ok(Math.abs(deep.estDrop - 1.5 * -0.34) < 1e-9);
  });
});

describe("buildWarnings", () => {
  it("flags single-name and single-sector concentration", () => {
    const w = buildWarnings(
      { topTicker: "A", topWeight: 1, hhi: 1, effectiveHoldings: 1 },
      [{ sector: "Tech", weight: 1 }],
      null,
      300,
    );
    assert.ok(w.some((s) => /Concentrated/.test(s)));
    assert.ok(w.some((s) => /Tech/.test(s)));
  });

  it("always warns that risk estimates are backward-looking", () => {
    const w = buildWarnings({ topTicker: "A", topWeight: 0.2, hhi: 0.2, effectiveHoldings: 5 }, [], null, 300);
    assert.ok(w.some((s) => /backward-looking/.test(s)));
  });
});
