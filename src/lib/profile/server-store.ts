/**
 * Server-side profile persistence, keyed by Google account id (sub).
 *
 * Adapter pattern so durability is a config choice, not a code change:
 *  - If KV_REST_API_URL + KV_REST_API_TOKEN are set (Vercel KV / Upstash Redis),
 *    profiles persist durably across serverless invocations and devices.
 *  - Otherwise an in-memory Map is used — fine for local dev / a single Node
 *    process, but NOT durable on serverless. The client always keeps a
 *    localStorage copy, so a guest never loses progress regardless.
 */
import type { UserProfile } from "./types";

const KEY_PREFIX = "msad:profile:";

function kvConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim());
}

const memory = new Map<string, UserProfile>();

async function kvGet(key: string): Promise<UserProfile | null> {
  const url = process.env.KV_REST_API_URL!.trim();
  const token = process.env.KV_REST_API_TOKEN!.trim();
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result: string | null };
  if (!data.result) return null;
  try {
    return JSON.parse(data.result) as UserProfile;
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: UserProfile): Promise<void> {
  const url = process.env.KV_REST_API_URL!.trim();
  const token = process.env.KV_REST_API_TOKEN!.trim();
  await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(value),
    cache: "no-store",
  });
}

export async function getServerProfile(sub: string): Promise<UserProfile | null> {
  const key = KEY_PREFIX + sub;
  if (kvConfigured()) return kvGet(key);
  return memory.get(key) ?? null;
}

export async function setServerProfile(sub: string, profile: UserProfile): Promise<void> {
  const key = KEY_PREFIX + sub;
  if (kvConfigured()) {
    await kvSet(key, profile);
    return;
  }
  memory.set(key, profile);
}

/** True when durable cross-device storage is configured. */
export function hasDurableStore(): boolean {
  return kvConfigured();
}
