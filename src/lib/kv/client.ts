/**
 * Shared Upstash Redis REST client. Used for durable storage, rate limiting,
 * shared caches, session revocation, and usage quotas. Falls back to in-memory
 * Maps when KV is not configured (local dev).
 */

export function kvConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim());
}

function kvUrl(): string {
  return process.env.KV_REST_API_URL!.trim();
}

function kvToken(): string {
  return process.env.KV_REST_API_TOKEN!.trim();
}

async function kvCommand(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(kvUrl(), {
    method: "POST",
    headers: { authorization: `Bearer ${kvToken()}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV command failed: ${res.status}`);
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

// ---- in-memory fallback -----------------------------------------------------

const memStrings = new Map<string, string>();
const memCounters = new Map<string, { count: number; expiresAt: number }>();

function memGet(key: string): string | null {
  return memStrings.get(key) ?? null;
}

function memSet(key: string, value: string): void {
  memStrings.set(key, value);
}

function memDel(key: string): void {
  memStrings.delete(key);
  memCounters.delete(key);
}

function memIncr(key: string, ttlSec: number): number {
  const now = Date.now();
  const entry = memCounters.get(key);
  if (!entry || now > entry.expiresAt) {
    memCounters.set(key, { count: 1, expiresAt: now + ttlSec * 1000 });
    return 1;
  }
  entry.count++;
  return entry.count;
}

// ---- public API -------------------------------------------------------------

export async function kvGet(key: string): Promise<string | null> {
  if (!kvConfigured()) return memGet(key);
  const result = await kvCommand(["GET", key]);
  return typeof result === "string" ? result : null;
}

export async function kvSet(key: string, value: string, ttlSec?: number): Promise<void> {
  if (!kvConfigured()) {
    memSet(key, value);
    return;
  }
  if (ttlSec) {
    await kvCommand(["SET", key, value, "EX", ttlSec]);
  } else {
    await kvCommand(["SET", key, value]);
  }
}

export async function kvDel(key: string): Promise<void> {
  if (!kvConfigured()) {
    memDel(key);
    return;
  }
  await kvCommand(["DEL", key]);
}

/** Atomic increment with TTL — used for rate limiting and usage quotas. */
export async function kvIncr(key: string, ttlSec: number): Promise<number> {
  if (!kvConfigured()) return memIncr(key, ttlSec);
  const count = (await kvCommand(["INCR", key])) as number;
  if (count === 1) await kvCommand(["EXPIRE", key, ttlSec]);
  return count;
}

export async function kvGetJson<T>(key: string): Promise<T | null> {
  const raw = await kvGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSetJson(key: string, value: unknown, ttlSec?: number): Promise<void> {
  await kvSet(key, JSON.stringify(value), ttlSec);
}
