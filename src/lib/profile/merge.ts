/**
 * Smart merge for multi-device profile sync. Per-item conflict resolution
 * instead of whole-profile last-write-wins.
 */
import type { JournalEntry, Prediction, UserProfile } from "./types";

type SavedScreen = NonNullable<UserProfile["savedScreens"]>[number];

function entryTimestamp(e: JournalEntry): number {
  const dates = [e.createdAt, e.reviewedAt].filter(Boolean) as string[];
  return Math.max(...dates.map((d) => new Date(d).getTime()), 0);
}

function predictionTimestamp(p: Prediction): number {
  const dates = [p.createdAt, p.resolvedAt].filter(Boolean) as string[];
  return Math.max(...dates.map((d) => new Date(d).getTime()), 0);
}

function mergeJournal(a: JournalEntry[], b: JournalEntry[]): JournalEntry[] {
  const map = new Map<string, JournalEntry>();
  for (const e of [...a, ...b]) {
    const existing = map.get(e.id);
    if (!existing || entryTimestamp(e) >= entryTimestamp(existing)) {
      map.set(e.id, e);
    }
  }
  return [...map.values()].sort(
    (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime(),
  );
}

function mergePredictions(a: Prediction[], b: Prediction[]): Prediction[] {
  const map = new Map<string, Prediction>();
  for (const p of [...a, ...b]) {
    const existing = map.get(p.id);
    if (!existing || predictionTimestamp(p) >= predictionTimestamp(existing)) {
      map.set(p.id, p);
    }
  }
  return [...map.values()].sort(
    (x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime(),
  );
}

function mergeWatchlist(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b].map((t) => t.toUpperCase()).filter(Boolean))];
}

function mergeSavedScreens(a: SavedScreen[], b: SavedScreen[]): SavedScreen[] {
  const map = new Map<string, SavedScreen>();
  for (const s of [...a, ...b]) {
    const existing = map.get(s.id);
    if (!existing || new Date(s.createdAt).getTime() >= new Date(existing.createdAt).getTime()) {
      map.set(s.id, s);
    }
  }
  return [...map.values()]
    .sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())
    .slice(0, 12);
}

function mergePreferences(
  a: UserProfile["preferences"],
  b: UserProfile["preferences"],
  aUpdated: string,
  bUpdated: string,
): UserProfile["preferences"] {
  // Prefer the profile with the newer updatedAt for preferences
  const newer = new Date(aUpdated).getTime() >= new Date(bUpdated).getTime() ? a : b;
  const older = newer === a ? b : a;
  return { ...older, ...newer };
}

/** Merge two profiles field-by-field, keeping the newest version of each item. */
export function mergeProfiles(local: UserProfile, remote: UserProfile): UserProfile {
  const updatedAt =
    new Date(local.updatedAt).getTime() >= new Date(remote.updatedAt).getTime()
      ? local.updatedAt
      : remote.updatedAt;

  return {
    version: local.version,
    journal: mergeJournal(local.journal, remote.journal),
    predictions: mergePredictions(local.predictions, remote.predictions),
    watchlist: mergeWatchlist(local.watchlist ?? [], remote.watchlist ?? []),
    savedScreens: mergeSavedScreens(local.savedScreens ?? [], remote.savedScreens ?? []),
    preferences: mergePreferences(
      local.preferences,
      remote.preferences,
      local.updatedAt,
      remote.updatedAt,
    ),
    createdAt:
      new Date(local.createdAt).getTime() <= new Date(remote.createdAt).getTime()
        ? local.createdAt
        : remote.createdAt,
    updatedAt,
  };
}
