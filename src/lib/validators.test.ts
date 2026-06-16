import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isNewsDigest, isReportCard } from "./validators.ts";

describe("validators", () => {
  it("isReportCard accepts a minimal report card", () => {
    assert.equal(
      isReportCard({ ticker: "AAPL", metrics: [] }),
      true,
    );
  });

  it("isReportCard rejects API error payloads", () => {
    assert.equal(isReportCard({ error: "Invalid ticker symbol" }), false);
  });

  it("isNewsDigest accepts a minimal digest", () => {
    assert.equal(
      isNewsDigest({ ticker: "MSFT", articles: [] }),
      true,
    );
  });

  it("isNewsDigest rejects error payloads", () => {
    assert.equal(isNewsDigest({ error: "Failed to load news" }), false);
  });
});
