import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchCatalog } from "./search.ts";

describe("searchCatalog", () => {
  it("matches ticker prefix", () => {
    const hits = searchCatalog("AAP");
    assert.ok(hits.some((h) => h.symbol === "AAPL"));
  });

  it("matches company name", () => {
    const hits = searchCatalog("palantir");
    assert.equal(hits[0]?.symbol, "PLTR");
  });

  it("returns empty for blank query", () => {
    assert.deepEqual(searchCatalog(""), []);
    assert.deepEqual(searchCatalog("   "), []);
  });
});
