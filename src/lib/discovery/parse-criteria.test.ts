import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describeParsedCriteria, parseNaturalLanguageCriteria } from "./parse-criteria.ts";

describe("parseNaturalLanguageCriteria", () => {
  it("parses mid-cap tech under price", () => {
    const parsed = parseNaturalLanguageCriteria("mid-cap tech under $80, low volatility");
    assert.equal(parsed.marketCapMinB, 1);
    assert.equal(parsed.marketCapMaxB, 10);
    assert.equal(parsed.priceMax, 80);
    assert.equal(parsed.betaMax, 1);
    assert.equal(parsed.sector, "Technology");
  });

  it("parses dividend income language", () => {
    const parsed = parseNaturalLanguageCriteria("steady dividend payers in utilities");
    assert.ok(parsed.dividendMin != null && parsed.dividendMin >= 0.01);
    assert.equal(parsed.sector, "Utilities");
  });

  it("describes parsed filters", () => {
    const parsed = parseNaturalLanguageCriteria("small cap value under $30");
    const desc = describeParsedCriteria(parsed);
    assert.ok(desc.length >= 2);
  });
});
