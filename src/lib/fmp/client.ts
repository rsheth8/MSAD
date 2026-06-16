const FMP_BASE = "https://financialmodelingprep.com/stable";
const FMP_V4_BASE = "https://financialmodelingprep.com/api/v4";

export { FMP_BASE, FMP_V4_BASE };

import { recordFmpCall } from "@/lib/fmp/usage";

export class FmpError extends Error {
  constructor(
    message: string,
    readonly code: "CONFIG" | "HTTP" | "NOT_FOUND" | "PARSE" = "HTTP",
  ) {
    super(message);
    this.name = "FmpError";
  }
}

function getApiKey(): string {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) throw new FmpError("FMP_API_KEY is not configured", "CONFIG");
  return key;
}

const RETRY_STATUSES = new Set([429, 503]);
const MAX_RETRIES = 4;

/** Max in-flight FMP requests — keeps bursts under provider rate limits. */
const MAX_CONCURRENT = Number(process.env.FMP_MAX_CONCURRENT ?? 3);
/** Minimum spacing between request starts (~4 req/s ≈ 240/min on Starter). */
const MIN_INTERVAL_MS = Number(process.env.FMP_MIN_INTERVAL_MS ?? 250);

let active = 0;
let lastStartAt = 0;
const waiters: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  while (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  const gap = MIN_INTERVAL_MS - (Date.now() - lastStartAt);
  if (gap > 0) await new Promise((resolve) => setTimeout(resolve, gap));
  lastStartAt = Date.now();
  active++;
}

function releaseSlot(): void {
  active--;
  const next = waiters.shift();
  if (next) next();
}

function retryDelayMs(attempt: number, res?: Response | null): number {
  const retryAfter = res?.headers.get("retry-after");
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs) && secs > 0) return secs * 1000;
  }
  return 1000 * 2 ** attempt;
}

/** Typed fetch against FMP endpoints. Key stays server-side only. */
export async function fmpFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  base: string = FMP_BASE,
): Promise<T> {
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  url.searchParams.set("apikey", getApiKey());

  void recordFmpCall();

  await acquireSlot();
  try {
    let res: Response | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      res = await fetch(url.toString(), { cache: "no-store" });
      if (res.ok || !RETRY_STATUSES.has(res.status) || attempt === MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt, res)));
    }

    if (!res!.ok) {
      throw new FmpError(`FMP request failed (${res!.status}) for ${path}`, "HTTP");
    }

    const data = (await res!.json()) as T;
    if (data === null || data === undefined) {
      throw new FmpError(`Empty response for ${path}`, "PARSE");
    }
    return data;
  } finally {
    releaseSlot();
  }
}

export function hasFmpApiKey(): boolean {
  return Boolean(process.env.FMP_API_KEY?.trim());
}
