const FMP_BASE = "https://financialmodelingprep.com/stable";

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

/** Typed fetch against FMP /stable/ endpoints. Key stays server-side only. */
export async function fmpFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(`${FMP_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  url.searchParams.set("apikey", getApiKey());

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new FmpError(`FMP request failed (${res.status}) for ${path}`, "HTTP");
  }

  const data = (await res.json()) as T;
  if (data === null || data === undefined) {
    throw new FmpError(`Empty response for ${path}`, "PARSE");
  }
  return data;
}

export function hasFmpApiKey(): boolean {
  return Boolean(process.env.FMP_API_KEY?.trim());
}
