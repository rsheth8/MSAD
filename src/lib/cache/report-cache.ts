import type { ReportCard } from "@/lib/types";

const TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  data: ReportCard;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function getCachedReport(ticker: string): ReportCard | null {
  const entry = store.get(ticker.toUpperCase());
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(ticker.toUpperCase());
    return null;
  }
  return entry.data;
}

export function setCachedReport(ticker: string, data: ReportCard): void {
  store.set(ticker.toUpperCase(), {
    data,
    expiresAt: Date.now() + TTL_MS,
  });
}
