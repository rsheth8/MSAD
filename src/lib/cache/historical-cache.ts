import type { FmpPriceBar } from "@/lib/fmp/types";
import { cacheGet, cacheSet } from "@/lib/cache/shared-cache";

const TTL_MS = 30 * 60 * 1000;

interface MemEntry {
  data: FmpPriceBar[];
  expiresAt: number;
}

const memory = new Map<string, MemEntry>();

export function historicalCacheKey(symbol: string, from: string): string {
  return `hist:${symbol.toUpperCase()}|${from}`;
}

export async function getCachedHistorical(key: string): Promise<FmpPriceBar[] | null> {
  const shared = await cacheGet<FmpPriceBar[]>(key);
  if (shared) return shared;

  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.data;
}

export async function setCachedHistorical(key: string, data: FmpPriceBar[]): Promise<void> {
  await cacheSet(key, data);
  memory.set(key, { data, expiresAt: Date.now() + TTL_MS });
}
