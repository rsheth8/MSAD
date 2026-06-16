import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("getFmpDailyLimit", () => {
  it("defaults to 250 when unset", async () => {
    const prev = process.env.FMP_DAILY_LIMIT;
    delete process.env.FMP_DAILY_LIMIT;
    const { getFmpDailyLimit } = await import("@/lib/fmp/usage");
    assert.equal(getFmpDailyLimit(), 250);
    if (prev !== undefined) process.env.FMP_DAILY_LIMIT = prev;
  });

  it("returns 0 when explicitly disabled", async () => {
    const prev = process.env.FMP_DAILY_LIMIT;
    process.env.FMP_DAILY_LIMIT = "0";
    const { getFmpDailyLimit } = await import("@/lib/fmp/usage");
    assert.equal(getFmpDailyLimit(), 0);
    if (prev !== undefined) process.env.FMP_DAILY_LIMIT = prev;
    else delete process.env.FMP_DAILY_LIMIT;
  });
});

describe("getFmpUsage tier", () => {
  it("classifies usage into warn and critical bands", async () => {
    const prevKey = process.env.FMP_API_KEY;
    const prevLimit = process.env.FMP_DAILY_LIMIT;
    process.env.FMP_API_KEY = "test-key";
    process.env.FMP_DAILY_LIMIT = "100";

    const { recordFmpCall, getFmpUsage } = await import("@/lib/fmp/usage");

    for (let i = 0; i < 75; i++) await recordFmpCall();
    const warn = await getFmpUsage();
    assert.equal(warn.tier, "warn");

    for (let i = 0; i < 20; i++) await recordFmpCall();
    const critical = await getFmpUsage();
    assert.equal(critical.tier, "critical");

    if (prevKey !== undefined) process.env.FMP_API_KEY = prevKey;
    else delete process.env.FMP_API_KEY;
    if (prevLimit !== undefined) process.env.FMP_DAILY_LIMIT = prevLimit;
    else delete process.env.FMP_DAILY_LIMIT;
  });
});
