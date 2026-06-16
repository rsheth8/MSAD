import type { FmpPriceBar } from "@/lib/fmp/types";

const TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  data: FmpPriceBar[];
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function historicalCacheKey(symbol: string, from: string): string {
  return `${symbol.toUpperCase()}|${from}`;
}

export function getCachedHistorical(key: string): FmpPriceBar[] | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedHistorical(key: string, data: FmpPriceBar[]): void {
  store.set(key, { data, expiresAt: Date.now() + TTL_MS });
}
