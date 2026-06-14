import type { FullChartPayload } from "@/lib/chart/types";

const TTL_MS = 15 * 60 * 1000;

interface CacheEntry {
  data: FullChartPayload;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function getCachedChart(key: string): FullChartPayload | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedChart(key: string, data: FullChartPayload): void {
  store.set(key, { data, expiresAt: Date.now() + TTL_MS });
}
