"use client";

/**
 * Local-first profile store. Everything works offline as a guest (localStorage);
 * when the user signs in, changes also sync to their account so they can keep
 * building their dashboard across devices. Last-write-wins by `updatedAt`.
 */
import { MSAD_EVENTS, MSAD_STORAGE } from "@/lib/brand";
import {
  emptyProfile,
  PROFILE_VERSION,
  type Conviction,
  type JournalEntry,
  type JournalOutcome,
  type Prediction,
  type PredictionKind,
  type UserProfile,
} from "./types";

let current: UserProfile | null = null;
let cloudEnabled = false; // flipped on once we confirm an authenticated session

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function loadLocal(): UserProfile {
  if (!isBrowser()) return emptyProfile();
  try {
    const raw = localStorage.getItem(MSAD_STORAGE.profile);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed || parsed.version !== PROFILE_VERSION || !Array.isArray(parsed.journal)) {
      return emptyProfile();
    }
    return parsed;
  } catch {
    return emptyProfile();
  }
}

function saveLocal(p: UserProfile) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(MSAD_STORAGE.profile, JSON.stringify(p));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function getProfile(): UserProfile {
  if (!current) current = loadLocal();
  return current;
}

function notify() {
  if (isBrowser()) window.dispatchEvent(new CustomEvent(MSAD_EVENTS.profile));
}

function commit(next: UserProfile, { push = true } = {}) {
  next.updatedAt = new Date().toISOString();
  current = next;
  saveLocal(next);
  notify();
  if (push && cloudEnabled) void pushCloud(next);
}

// ---- mutators -------------------------------------------------------------

export function addJournalEntry(input: {
  ticker: string;
  thesis: string;
  conviction: Conviction;
  horizon: string;
  changeMyMind: string;
  priceAtEntry?: number;
}): JournalEntry {
  const entry: JournalEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ticker: input.ticker.toUpperCase(),
    thesis: input.thesis.trim(),
    conviction: input.conviction,
    horizon: input.horizon.trim() || "no horizon set",
    changeMyMind: input.changeMyMind.trim(),
    priceAtEntry: input.priceAtEntry,
  };
  const p = getProfile();
  commit({ ...p, journal: [entry, ...p.journal] });
  return entry;
}

export function reviewJournalEntry(
  id: string,
  review: { outcome: JournalOutcome; reviewNote?: string },
) {
  const p = getProfile();
  commit({
    ...p,
    journal: p.journal.map((e) =>
      e.id === id
        ? { ...e, outcome: review.outcome, reviewNote: review.reviewNote?.trim(), reviewedAt: new Date().toISOString() }
        : e,
    ),
  });
}

export function setJournalCritique(id: string, aiCritique: string) {
  const p = getProfile();
  commit(
    { ...p, journal: p.journal.map((e) => (e.id === id ? { ...e, aiCritique } : e)) },
    { push: false }, // critique is derivable; no need to round-trip to cloud
  );
}

export function deleteJournalEntry(id: string) {
  const p = getProfile();
  commit({ ...p, journal: p.journal.filter((e) => e.id !== id) });
}

export function addPrediction(input: {
  ticker: string;
  question: string;
  kind: PredictionKind;
  horizonDays: number;
  confidence: number;
}): Prediction {
  const resolveOn = new Date(Date.now() + input.horizonDays * 86_400_000).toISOString();
  const pred: Prediction = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ticker: input.ticker.toUpperCase(),
    question: input.question.trim(),
    kind: input.kind,
    horizonDays: input.horizonDays,
    resolveOn,
    confidence: Math.max(0.5, Math.min(1, input.confidence)),
    resolved: false,
  };
  const p = getProfile();
  commit({ ...p, predictions: [pred, ...p.predictions] });
  return pred;
}

export function resolvePrediction(id: string, outcome: boolean) {
  const p = getProfile();
  commit({
    ...p,
    predictions: p.predictions.map((pr) =>
      pr.id === id ? { ...pr, resolved: true, outcome, resolvedAt: new Date().toISOString() } : pr,
    ),
  });
}

export function deletePrediction(id: string) {
  const p = getProfile();
  commit({ ...p, predictions: p.predictions.filter((pr) => pr.id !== id) });
}

// ---- cloud sync -----------------------------------------------------------

async function pushCloud(p: UserProfile) {
  try {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(p),
    });
  } catch {
    /* offline — local copy is the source of truth until next sync */
  }
}

function mergeNewer(a: UserProfile, b: UserProfile): UserProfile {
  return new Date(a.updatedAt).getTime() >= new Date(b.updatedAt).getTime() ? a : b;
}

/**
 * Called once on app load. Detects an authenticated session, pulls the cloud
 * profile, merges last-write-wins with local, and enables push-on-change.
 */
export async function syncWithAccount(): Promise<boolean> {
  if (!isBrowser()) return false;
  try {
    const res = await fetch("/api/profile", { method: "GET" });
    if (res.status === 401) {
      cloudEnabled = false;
      return false;
    }
    if (!res.ok) return false;
    cloudEnabled = true;
    const remote = (await res.json()) as { profile: UserProfile | null };
    const local = getProfile();
    if (remote.profile) {
      const merged = mergeNewer(local, remote.profile);
      current = merged;
      saveLocal(merged);
      notify();
      if (merged === local) void pushCloud(merged); // local was newer → upload
    } else {
      void pushCloud(local); // first sign-in: seed the account with local progress
    }
    return true;
  } catch {
    return false;
  }
}

export function subscribeProfile(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(MSAD_EVENTS.profile, cb);
  return () => window.removeEventListener(MSAD_EVENTS.profile, cb);
}
