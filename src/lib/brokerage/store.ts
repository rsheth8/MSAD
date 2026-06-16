/**
 * Stores each user's SnapTrade credentials, keyed by MSAD account id (sub).
 * Uses shared Upstash Redis when configured; in-memory fallback for local dev.
 */
import { kvGetJson, kvSetJson, kvDel, kvConfigured } from "@/lib/kv/client";
import type { PersonalTokens } from "./personal-oauth";

const KEY_PREFIX = "msad:snaptrade:";

export interface CommercialLink {
  mode: "commercial";
  userSecret: string;
}

export interface PersonalLink {
  mode: "personal";
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export type BrokerageLink = CommercialLink | PersonalLink;

type StoredLink = BrokerageLink | { userSecret: string };

function normalizeLink(raw: StoredLink): BrokerageLink | null {
  if ("mode" in raw && raw.mode === "personal") return raw;
  if ("mode" in raw && raw.mode === "commercial") return raw;
  if ("userSecret" in raw && raw.userSecret) return { mode: "commercial", userSecret: raw.userSecret };
  return null;
}

const memory = new Map<string, BrokerageLink>();

export async function getBrokerageLink(sub: string): Promise<BrokerageLink | null> {
  const key = KEY_PREFIX + sub;
  if (kvConfigured()) {
    const raw = await kvGetJson<StoredLink>(key);
    return raw ? normalizeLink(raw) : null;
  }
  return memory.get(key) ?? null;
}

export async function setBrokerageLink(sub: string, link: BrokerageLink): Promise<void> {
  const key = KEY_PREFIX + sub;
  if (kvConfigured()) {
    await kvSetJson(key, link);
    return;
  }
  memory.set(key, link);
}

export async function deleteBrokerageLink(sub: string): Promise<void> {
  const key = KEY_PREFIX + sub;
  if (kvConfigured()) {
    await kvDel(key);
    return;
  }
  memory.delete(key);
}

export function personalTokensFromLink(link: PersonalLink): PersonalTokens {
  return {
    accessToken: link.accessToken,
    refreshToken: link.refreshToken,
    expiresAt: link.expiresAt,
  };
}

export function personalLinkFromTokens(tokens: PersonalTokens): PersonalLink {
  return {
    mode: "personal",
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  };
}
