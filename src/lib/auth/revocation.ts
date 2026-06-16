/**
 * Session revocation — "sign out everywhere" support. Stores a timestamp per
 * user; any session issued before that timestamp is rejected.
 */
import { kvGet, kvSet, kvDel } from "@/lib/kv/client";

const PREFIX = "msad:revoke:";

export async function getRevocationTime(sub: string): Promise<number> {
  const raw = await kvGet(PREFIX + sub);
  if (!raw) return 0;
  const ts = parseInt(raw, 10);
  return Number.isFinite(ts) ? ts : 0;
}

/** Invalidate all sessions issued before now. */
export async function revokeAllSessions(sub: string): Promise<void> {
  await kvSet(PREFIX + sub, String(Math.floor(Date.now() / 1000)));
}

export async function clearRevocation(sub: string): Promise<void> {
  await kvDel(PREFIX + sub);
}
