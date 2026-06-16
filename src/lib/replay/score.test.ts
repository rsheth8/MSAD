import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreReplay, stepReturn } from "./score.ts";
import type { Stance } from "./types.ts";

describe("stepReturn", () => {
  it("computes simple returns and guards bounds", () => {
    assert.ok(Math.abs(stepReturn([100, 110], 0) - 0.1) < 1e-9);
    assert.equal(stepReturn([100, 110], 1), 0); // out of range
    assert.equal(stepReturn([0, 110], 0), 0); // non-positive base
  });
});

describe("scoreReplay", () => {
  const series = [100, 110, 99, 108.9]; // +10%, -10%, +10%
  it("staying in always equals buy & hold", () => {
    const stances: Stance[] = ["in", "in", "in"];
    const r = scoreReplay(series, 0, stances);
    assert.ok(Math.abs(r.you - r.buyHold) < 1e-9);
    assert.equal(r.timeInMarket, 1);
    assert.equal(r.steps, 3);
  });

  it("sitting out a down day beats buy & hold", () => {
    const stances: Stance[] = ["in", "out", "in"]; // dodge the -10%
    const r = scoreReplay(series, 0, stances);
    assert.ok(r.you > r.buyHold, `you ${r.you} should beat buyHold ${r.buyHold}`);
    assert.ok(Math.abs(r.timeInMarket - 2 / 3) < 1e-9);
  });

  it("all cash leaves equity flat at 1", () => {
    const r = scoreReplay(series, 0, ["out", "out", "out"]);
    assert.equal(r.you, 1);
  });

  it("never runs past the available bars", () => {
    const r = scoreReplay(series, 2, ["in", "in", "in", "in"]);
    assert.equal(r.steps, 1); // only one move left from index 2
  });
});
