import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatShortDate } from "./format.ts";

describe("formatShortDate", () => {
  it("formats YYYY-MM-DD", () => {
    assert.equal(formatShortDate("2026-06-15"), "Jun 15");
  });

  it("formats ISO datetime via prefix", () => {
    assert.equal(formatShortDate("2026-01-03T14:22:00Z"), "Jan 3");
  });

  it("falls back for garbage input", () => {
    const out = formatShortDate("not-a-date");
    assert.ok(out.length > 0);
    assert.doesNotMatch(out, /undefined|NaN/);
  });

  it("returns em dash for empty input", () => {
    assert.equal(formatShortDate(""), "—");
  });
});
