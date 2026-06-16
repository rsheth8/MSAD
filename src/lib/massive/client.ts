/**
 * Massive (formerly Polygon.io) REST client. Powers the multi-asset news feed.
 * Key stays server-side only — same posture as the FMP client.
 *
 * Swap target: this whole file + the mapper in `aggregator/news.ts` is the only
 * place that knows about Massive. To move to Benzinga/Alpha Vantage later, add a
 * sibling client and point `getNewsFeed` at it.
 */
const MASSIVE_BASE = process.env.MASSIVE_API_BASE?.trim() || "https://api.polygon.io";

export { MASSIVE_BASE };

export class MassiveError extends Error {
  constructor(
    message: string,
    readonly code: "CONFIG" | "HTTP" | "PARSE" = "HTTP",
  ) {
    super(message);
    this.name = "MassiveError";
  }
}

function getApiKey(): string {
  const key = process.env.MASSIVE_API_KEY?.trim();
  if (!key) throw new MassiveError("MASSIVE_API_KEY is not configured", "CONFIG");
  return key;
}

export function hasMassiveApiKey(): boolean {
  return Boolean(process.env.MASSIVE_API_KEY?.trim());
}

/** Typed fetch against Massive endpoints. Accepts absolute `next_url`s for pagination. */
export async function massiveFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${MASSIVE_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${getApiKey()}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new MassiveError(`Massive request failed (${res.status}) for ${path}`, "HTTP");
  }

  const data = (await res.json()) as T;
  if (data === null || data === undefined) {
    throw new MassiveError(`Empty response for ${path}`, "PARSE");
  }
  return data;
}
