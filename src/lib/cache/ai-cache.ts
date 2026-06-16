import type { ExplainResponse } from "@/lib/ai/types";

/**
 * In-memory cache for deterministic Lens explanations (metric/overview/price/
 * bear/bull). User-specific kinds (free questions, journal critiques) are never
 * cached. Keeps repeat pageviews of the same stock free.
 */
const TTL_MS = 30 * 60 * 1000;

interface Entry {
  data: ExplainResponse;
  expiresAt: number;
}

const store = new Map<string, Entry>();

export function getCachedExplain(key: string): ExplainResponse | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedExplain(key: string, data: ExplainResponse): void {
  store.set(key, { data, expiresAt: Date.now() + TTL_MS });
}
