import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { underweightSectors } from "./gap.ts";

describe("underweightSectors", () => {
  it("flags missing sectors and low weights", () => {
    const gaps = underweightSectors([
      { sector: "Technology", weight: 90 },
      { sector: "Healthcare", weight: 10 },
    ]);
    assert.ok(gaps.includes("Healthcare"));
    assert.ok(gaps.length >= 2);
  });
});
