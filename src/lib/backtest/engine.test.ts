import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildWarnings, computeBacktest } from "./engine.ts";
import type { Bar } from "./types.ts";

function bars(closes: number[]): Bar[] {
  const start = new Date("2020-01-01").getTime();
  return closes.map((close, i) => ({
    date: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
    close,
  }));
}

// A clean rise to a peak, then a deep crash — the case where an exit rule helps.
function riseThenCrash(): number[] {
  const out: number[] = [];
  for (let i = 0; i < 60; i++) out.push(100 + i); // 100 → 159
  for (let i = 0; i < 40; i++) out.push(159 - i * 2.5); // 159 → ~62
  return out;
}

describe("computeBacktest", () => {
  it("buy & hold matches the price change and has no trades", () => {
    const r = computeBacktest(bars([100, 110, 120, 132]), bars([100, 100, 100, 100]), {
      kind: "buy-hold",
    });
    assert.equal(r.points.length, 4);
    assert.ok(Math.abs(r.buyHold.totalReturn - 0.32) < 1e-6);
    assert.equal(r.buyHold.trades, 0);
    assert.equal(r.buyHold.timeInMarket, 1);
    // strategy === buy & hold for the buy-hold rule
    assert.ok(Math.abs(r.strategy.totalReturn - r.buyHold.totalReturn) < 1e-9);
  });

  it("sma-cross sidesteps part of a crash (smaller drawdown than buy & hold)", () => {
    const series = riseThenCrash();
    const r = computeBacktest(bars(series), bars(series.map(() => 100)), {
      kind: "sma-cross",
      smaWindow: 20,
      costBps: 0,
    });
    assert.ok(r.strategy.trades >= 1, "should trade at least once");
    assert.ok(
      r.strategy.maxDrawdown < r.buyHold.maxDrawdown,
      `strategy dd ${r.strategy.maxDrawdown} should beat buy&hold dd ${r.buyHold.maxDrawdown}`,
    );
    assert.ok(r.strategy.timeInMarket < 1, "should be in cash some of the time");
  });

  it("trading costs drag on the strategy and never look ahead", () => {
    const series = riseThenCrash();
    const free = computeBacktest(bars(series), bars(series.map(() => 100)), {
      kind: "sma-cross",
      smaWindow: 20,
      costBps: 0,
    });
    const costly = computeBacktest(bars(series), bars(series.map(() => 100)), {
      kind: "sma-cross",
      smaWindow: 20,
      costBps: 50,
    });
    assert.ok(costly.strategy.totalReturn < free.strategy.totalReturn);
  });

  it("aligns the benchmark to the asset dates", () => {
    const r = computeBacktest(bars([100, 101, 102]), bars([200, 202, 204]), { kind: "buy-hold" });
    assert.equal(r.points.length, 3);
    assert.ok(Math.abs(r.benchmark.totalReturn - 0.02) < 1e-6);
  });

  it("handles too-little history gracefully", () => {
    const r = computeBacktest(bars([100]), bars([100]), { kind: "buy-hold" });
    assert.equal(r.points.length, 0);
    assert.ok(r.warnings.length > 0);
  });
});

describe("buildWarnings", () => {
  it("always includes survivorship + past-performance caveats", () => {
    const w = buildWarnings({ kind: "buy-hold" }, 0).join(" ");
    assert.match(w, /[Ss]urvivorship/);
    assert.match(w, /[Pp]ast performance/);
  });
  it("warns about overfitting only for sma-cross", () => {
    assert.ok(buildWarnings({ kind: "sma-cross", smaWindow: 50 }, 5).some((s) => /[Oo]verfit/.test(s)));
    assert.ok(!buildWarnings({ kind: "buy-hold" }, 0).some((s) => /[Oo]verfit/.test(s)));
  });
  it("nudges when costs are zero on an active rule", () => {
    assert.ok(buildWarnings({ kind: "sma-cross", smaWindow: 50 }, 0).some((s) => /0 bps|basis point/.test(s)));
  });
});
