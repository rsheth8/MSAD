const FMP_BASE = "https://financialmodelingprep.com/stable";
const FMP_V4_BASE = "https://financialmodelingprep.com/api/v4";

export { FMP_BASE, FMP_V4_BASE };

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
const MAX_RETRIES = 3;

function retryDelayMs(attempt: number): number {
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

  let res: Response | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    res = await fetch(url.toString(), { cache: "no-store" });
    if (res.ok || !RETRY_STATUSES.has(res.status) || attempt === MAX_RETRIES) break;
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)));
  }

  if (!res!.ok) {
    throw new FmpError(`FMP request failed (${res!.status}) for ${path}`, "HTTP");
  }

  const data = (await res!.json()) as T;
  if (data === null || data === undefined) {
    throw new FmpError(`Empty response for ${path}`, "PARSE");
  }
  return data;
}

export function hasFmpApiKey(): boolean {
  return Boolean(process.env.FMP_API_KEY?.trim());
}
