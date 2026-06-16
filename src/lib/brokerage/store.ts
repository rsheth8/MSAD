/**
 * Stores each user's SnapTrade userSecret, keyed by MSAD account id (sub).
 * In-memory by default; durable via Vercel KV (same adapter pattern as the
 * profile store). The secret is a credential — it never leaves the server.
 */
const KEY_PREFIX = "msad:snaptrade:";

interface Link {
  userSecret: string;
}

function kvConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim());
}

const memory = new Map<string, Link>();

async function kvGet(key: string): Promise<Link | null> {
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
    return JSON.parse(data.result) as Link;
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: Link): Promise<void> {
  const url = process.env.KV_REST_API_URL!.trim();
  const token = process.env.KV_REST_API_TOKEN!.trim();
  await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(value),
    cache: "no-store",
  });
}

export async function getBrokerageLink(sub: string): Promise<Link | null> {
  const key = KEY_PREFIX + sub;
  if (kvConfigured()) return kvGet(key);
  return memory.get(key) ?? null;
}

export async function setBrokerageLink(sub: string, link: Link): Promise<void> {
  const key = KEY_PREFIX + sub;
  if (kvConfigured()) {
    await kvSet(key, link);
    return;
  }
  memory.set(key, link);
}
