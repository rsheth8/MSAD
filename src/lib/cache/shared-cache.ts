/**
 * Shared cache backed by Upstash Redis when configured, with in-memory fallback.
 * Replaces per-instance Map caches so serverless instances share hot data.
 */
import { kvGet, kvSet, kvConfigured } from "@/lib/kv/client";

const TTL_SEC = 30 * 60; // 30 minutes

interface MemEntry {
  data: string;
  expiresAt: number;
}

const memory = new Map<string, MemEntry>();

function memGet(key: string): string | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.data;
}

function memSet(key: string, data: string): void {
  memory.set(key, { data, expiresAt: Date.now() + TTL_SEC * 1000 });
}

const PREFIX = "msad:cache:";

export async function cacheGet<T>(key: string): Promise<T | null> {
  const fullKey = PREFIX + key;
  const raw = kvConfigured() ? await kvGet(fullKey) : memGet(fullKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, data: T): Promise<void> {
  const fullKey = PREFIX + key;
  const serialized = JSON.stringify(data);
  if (kvConfigured()) {
    await kvSet(fullKey, serialized, TTL_SEC);
  } else {
    memSet(fullKey, serialized);
  }
}

/** Whether the shared Redis cache is active (vs in-memory fallback). */
export function hasSharedCache(): boolean {
  return kvConfigured();
}
