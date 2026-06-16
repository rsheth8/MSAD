import type { ExplainResponse } from "@/lib/ai/types";
import { cacheGet, cacheSet } from "@/lib/cache/shared-cache";

const TTL_MS = 30 * 60 * 1000;

interface MemEntry {
  data: ExplainResponse;
  expiresAt: number;
}

const memory = new Map<string, MemEntry>();

export async function getCachedExplain(key: string): Promise<ExplainResponse | null> {
  const shared = await cacheGet<ExplainResponse>(key);
  if (shared) return shared;

  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.data;
}

export async function setCachedExplain(key: string, data: ExplainResponse): Promise<void> {
  await cacheSet(key, data);
  memory.set(key, { data, expiresAt: Date.now() + TTL_MS });
}
