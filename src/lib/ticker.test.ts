import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isValidTicker, normalizeTicker } from "./ticker.ts";

describe("ticker validation", () => {
  it("accepts common symbols", () => {
    assert.equal(isValidTicker("AAPL"), true);
    assert.equal(isValidTicker("BRK.B"), true);
  });

  it("rejects empty and overlong symbols", () => {
    assert.equal(isValidTicker(""), false);
    assert.equal(isValidTicker("WAYTOOLONGX"), false);
  });

  it("rejects invalid characters", () => {
    assert.equal(isValidTicker("AA PL"), false);
    assert.equal(isValidTicker("<script"), false);
  });

  it("normalizes case and whitespace", () => {
    assert.equal(normalizeTicker("  aapl  "), "AAPL");
  });
});
