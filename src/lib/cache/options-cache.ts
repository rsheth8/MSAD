import type { OptionsChainPayload } from "@/lib/options/types";

const TTL_MS = 15 * 60 * 1000;

interface CacheEntry {
  data: OptionsChainPayload;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function getCachedOptions(ticker: string): OptionsChainPayload | null {
  const entry = store.get(ticker.toUpperCase());
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(ticker.toUpperCase());
    return null;
  }
  return entry.data;
}

export function setCachedOptions(ticker: string, data: OptionsChainPayload): void {
  store.set(ticker.toUpperCase(), { data, expiresAt: Date.now() + TTL_MS });
}
