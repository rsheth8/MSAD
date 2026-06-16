import {
  getCachedHistorical,
  historicalCacheKey,
  setCachedHistorical,
} from "@/lib/cache/historical-cache";
import { fmpFetch } from "@/lib/fmp/client";
import type { FmpPriceBar } from "@/lib/fmp/types";

const inflight = new Map<string, Promise<FmpPriceBar[]>>();

/** Cached + deduped fetch for /historical-price-eod/full. */
export async function fetchHistoricalBars(symbol: string, from: string): Promise<FmpPriceBar[]> {
  const key = historicalCacheKey(symbol, from);
  const cached = getCachedHistorical(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = fmpFetch<FmpPriceBar[]>("/historical-price-eod/full", { symbol, from })
    .then((rows) => {
      const bars = rows ?? [];
      setCachedHistorical(key, bars);
      return bars;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
