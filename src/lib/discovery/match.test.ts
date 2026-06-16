import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreMatch } from "./match.ts";
import { DEFAULT_INVESTOR_PROFILE } from "./investor-profile.ts";
import type { ScreenerResultRow } from "@/lib/screener/types";

function row(overrides: Partial<ScreenerResultRow> = {}): ScreenerResultRow {
  return {
    symbol: "TEST",
    name: "Test Co",
    price: 40,
    marketCap: 2e9,
    sector: "Technology",
    industry: "Software",
    beta: 0.9,
    dividend: 0,
    volume: 500_000,
    exchange: "NASDAQ",
    pe: 15,
    roe: 0.18,
    evEbitda: null,
    ...overrides,
  };
}

describe("scoreMatch", () => {
  it("scores high when row fits default learning profile", () => {
    const result = scoreMatch(row(), DEFAULT_INVESTOR_PROFILE);
    assert.ok(result.score >= 80);
    assert.ok(result.reasons.some((r) => r.pass));
  });

  it("penalizes high beta vs calm profile", () => {
    const profile = { ...DEFAULT_INVESTOR_PROFILE, betaMax: 1 };
    const result = scoreMatch(row({ beta: 1.8 }), profile);
    assert.ok(result.score < 80);
    assert.ok(result.reasons.some((r) => !r.pass && r.text.includes("Beta")));
  });

  it("respects sector include list", () => {
    const profile = {
      ...DEFAULT_INVESTOR_PROFILE,
      sectorsInclude: ["Healthcare"],
    };
    const result = scoreMatch(row({ sector: "Technology" }), profile);
    assert.ok(result.reasons.some((r) => !r.pass && r.text.includes("include list")));
  });
});
