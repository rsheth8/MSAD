import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEPTHS,
  DEPTH_META,
  isDepth,
  learnModeFromDepth,
  normalizeDepth,
  tierForDepth,
} from "./depth.ts";

describe("depth model", () => {
  it("recognizes valid depths", () => {
    assert.ok(isDepth("learn"));
    assert.ok(isDepth("analyst"));
    assert.ok(isDepth("quant"));
    assert.ok(!isDepth("expert"));
    assert.ok(!isDepth(undefined));
  });

  it("normalizes unknown values to learn", () => {
    assert.equal(normalizeDepth("nonsense"), "learn");
    assert.equal(normalizeDepth(null), "learn");
    assert.equal(normalizeDepth("quant"), "quant");
  });

  it("keeps guided mode on until quant", () => {
    assert.equal(learnModeFromDepth("learn"), true);
    assert.equal(learnModeFromDepth("analyst"), true);
    assert.equal(learnModeFromDepth("quant"), false);
  });

  it("uses the fast model only for learn", () => {
    assert.equal(tierForDepth("learn"), "fast");
    assert.equal(tierForDepth("analyst"), "smart");
    assert.equal(tierForDepth("quant"), "smart");
  });

  it("has metadata + instructions for every depth", () => {
    for (const d of DEPTHS) {
      assert.ok(DEPTH_META[d].label.length > 0);
      assert.ok(DEPTH_META[d].instruction.length > 20);
    }
  });
});
