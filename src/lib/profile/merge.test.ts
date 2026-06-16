import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeProfiles } from "./merge.ts";
import { emptyProfile, type JournalEntry, type Prediction } from "./types.ts";

function entry(id: string, createdAt: string, reviewedAt?: string): JournalEntry {
  return {
    id,
    ticker: "AAPL",
    createdAt,
    thesis: "test",
    conviction: 3,
    horizon: "1y",
    changeMyMind: "x",
    reviewedAt,
  };
}

function pred(id: string, createdAt: string, resolvedAt?: string): Prediction {
  return {
    id,
    ticker: "AAPL",
    createdAt,
    question: "up?",
    kind: "direction",
    horizonDays: 30,
    resolveOn: createdAt,
    confidence: 0.6,
    resolved: Boolean(resolvedAt),
    resolvedAt,
  };
}

describe("mergeProfiles", () => {
  it("keeps both journal entries from different devices", () => {
    const local = { ...emptyProfile(), journal: [entry("a", "2025-01-01T00:00:00Z")] };
    const remote = { ...emptyProfile(), journal: [entry("b", "2025-01-02T00:00:00Z")] };
    const merged = mergeProfiles(local, remote);
    assert.equal(merged.journal.length, 2);
    assert.ok(merged.journal.some((e) => e.id === "a"));
    assert.ok(merged.journal.some((e) => e.id === "b"));
  });

  it("resolves journal conflicts by latest timestamp", () => {
    const local = {
      ...emptyProfile(),
      journal: [entry("a", "2025-01-01T00:00:00Z", "2025-01-03T00:00:00Z")],
    };
    const remote = {
      ...emptyProfile(),
      journal: [entry("a", "2025-01-01T00:00:00Z", "2025-01-05T00:00:00Z")],
    };
    remote.journal[0]!.outcome = "right";
    const merged = mergeProfiles(local, remote);
    assert.equal(merged.journal.length, 1);
    assert.equal(merged.journal[0]!.outcome, "right");
  });

  it("unions watchlists", () => {
    const local = { ...emptyProfile(), watchlist: ["AAPL", "MSFT"] };
    const remote = { ...emptyProfile(), watchlist: ["GOOG", "aapl"] };
    const merged = mergeProfiles(local, remote);
    assert.deepEqual(merged.watchlist, ["AAPL", "MSFT", "GOOG"]);
  });

  it("merges predictions by id with latest timestamp", () => {
    const local = { ...emptyProfile(), predictions: [pred("p1", "2025-01-01T00:00:00Z")] };
    const remote = {
      ...emptyProfile(),
      predictions: [pred("p1", "2025-01-01T00:00:00Z", "2025-01-10T00:00:00Z")],
    };
    const merged = mergeProfiles(local, remote);
    assert.equal(merged.predictions.length, 1);
    assert.equal(merged.predictions[0]!.resolvedAt, "2025-01-10T00:00:00Z");
  });
});
