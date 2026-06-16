import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dueForResolution, summarizeCalibration } from "./calibration.ts";
import type { Prediction } from "./types.ts";

function pred(confidence: number, outcome: boolean, resolved = true): Prediction {
  return {
    id: Math.random().toString(36).slice(2),
    ticker: "AAPL",
    createdAt: new Date().toISOString(),
    question: "Will AAPL be higher in 30 days?",
    kind: "direction",
    horizonDays: 30,
    resolveOn: new Date().toISOString(),
    confidence,
    resolved,
    outcome: resolved ? outcome : undefined,
  };
}

describe("summarizeCalibration", () => {
  it("handles no resolved predictions", () => {
    const s = summarizeCalibration([]);
    assert.equal(s.resolved, 0);
    assert.equal(s.accuracy, null);
    assert.equal(s.readiness.label, "Not started");
    assert.equal(s.readiness.score, 0);
  });

  it("scores a well-calibrated forecaster high", () => {
    // 12 confident, correct calls
    const preds = Array.from({ length: 12 }, () => pred(0.9, true));
    const s = summarizeCalibration(preds);
    assert.equal(s.resolved, 12);
    assert.equal(s.accuracy, 1);
    assert.ok(s.brier !== null && s.brier < 0.02);
    assert.ok(s.readiness.score >= 75);
    assert.equal(s.readiness.label, "Well-calibrated");
  });

  it("caps readiness until there is a real sample", () => {
    const preds = Array.from({ length: 3 }, () => pred(0.9, true));
    const s = summarizeCalibration(preds);
    assert.equal(s.resolved, 3);
    assert.equal(s.readiness.label, "Warming up");
    // even perfect calls can't max out with only 3 resolved
    assert.ok(s.readiness.score < 50);
  });

  it("detects overconfidence", () => {
    // confident (0.9) but wrong half the time
    const preds = [
      ...Array.from({ length: 6 }, () => pred(0.9, true)),
      ...Array.from({ length: 6 }, () => pred(0.9, false)),
    ];
    const s = summarizeCalibration(preds);
    assert.ok(s.overconfidence !== null && s.overconfidence > 0.2);
  });

  it("ignores unresolved predictions in the math", () => {
    const s = summarizeCalibration([pred(0.8, true), pred(0.8, false, false)]);
    assert.equal(s.resolved, 1);
  });
});

describe("dueForResolution", () => {
  it("returns only past-due, unresolved predictions", () => {
    const past = { ...pred(0.7, false, false), resolveOn: new Date(Date.now() - 1000).toISOString() };
    const future = { ...pred(0.7, false, false), resolveOn: new Date(Date.now() + 1e9).toISOString() };
    const resolved = pred(0.7, true, true);
    const due = dueForResolution([past, future, resolved]);
    assert.equal(due.length, 1);
    assert.equal(due[0], past);
  });
});
