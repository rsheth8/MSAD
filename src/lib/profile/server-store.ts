/**
 * Server-side profile persistence, keyed by Google account id (sub).
 * Uses shared Upstash Redis when configured; in-memory fallback for local dev.
 */
import { kvGetJson, kvSetJson } from "@/lib/kv/client";
import { kvConfigured } from "@/lib/kv/client";
import { PROFILE_VERSION, type UserProfile } from "./types";

const KEY_PREFIX = "msad:profile:";

const memory = new Map<string, UserProfile>();

/** Migrate v1 profiles to v2 shape. */
function migrateProfile(raw: UserProfile): UserProfile {
  if (raw.version >= PROFILE_VERSION) return raw;
  return {
    ...raw,
    version: PROFILE_VERSION,
    watchlist: raw.watchlist ?? [],
    savedScreens: raw.savedScreens ?? [],
    preferences: raw.preferences ?? {},
  };
}

export async function getServerProfile(sub: string): Promise<UserProfile | null> {
  const key = KEY_PREFIX + sub;
  if (kvConfigured()) {
    const profile = await kvGetJson<UserProfile>(key);
    return profile ? migrateProfile(profile) : null;
  }
  const profile = memory.get(key) ?? null;
  return profile ? migrateProfile(profile) : null;
}

export async function setServerProfile(sub: string, profile: UserProfile): Promise<void> {
  const key = KEY_PREFIX + sub;
  const migrated = migrateProfile(profile);
  if (kvConfigured()) {
    await kvSetJson(key, migrated);
    return;
  }
  memory.set(key, migrated);
}

export async function deleteServerProfile(sub: string): Promise<void> {
  const key = KEY_PREFIX + sub;
  if (kvConfigured()) {
    const { kvDel } = await import("@/lib/kv/client");
    await kvDel(key);
    return;
  }
  memory.delete(key);
}

/** True when durable cross-device storage is configured. */
export function hasDurableStore(): boolean {
  return kvConfigured();
}
