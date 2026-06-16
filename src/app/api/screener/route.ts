import { NextResponse } from "next/server";
import { runScreener } from "@/lib/screener/run";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { RatioFilters, ScreenerQuery } from "@/lib/screener/types";

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, RATE_LIMITS.screener);
  if (limited) return limited;

  try {
    const body = (await req.json()) as {
      presetId?: string;
      query?: ScreenerQuery;
      ratioFilters?: RatioFilters;
      sortBy?: string;
      excludeSymbols?: string[];
      reverseMetric?: "pe" | "roe";
      reverseMinPct?: number;
    };

    const key = JSON.stringify(body);
    const hit = cache.get(key);
    if (hit && Date.now() < hit.expires) {
      return NextResponse.json(hit.data, {
        headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" },
      });
    }

    const result = await runScreener({
      presetId: body.presetId,
      query: body.query,
      ratioFilters: body.ratioFilters,
      sortBy: body.sortBy as "marketCapAsc" | "marketCapDesc" | "peAsc" | undefined,
      excludeSymbols: body.excludeSymbols,
      reverseMetric: body.reverseMetric,
      reverseMinPct: body.reverseMinPct,
    });

    const payload = { ...result, asOf: new Date().toISOString() };
    cache.set(key, { data: payload, expires: Date.now() + TTL_MS });
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Screener failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
