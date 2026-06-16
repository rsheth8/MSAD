import { NextResponse } from "next/server";
import { getNewsDigest } from "@/lib/aggregator/news";
import { isValidTicker, normalizeTicker } from "@/lib/ticker";

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();

export async function GET(_req: Request, ctx: { params: Promise<{ ticker: string }> }) {
  const { ticker: raw } = await ctx.params;
  const ticker = normalizeTicker(raw);

  if (!isValidTicker(ticker)) {
    return NextResponse.json({ error: "Invalid ticker symbol" }, { status: 400 });
  }
  const hit = cache.get(ticker);
  if (hit && Date.now() < hit.expires) {
    return NextResponse.json(hit.data, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" },
    });
  }

  try {
    const payload = await getNewsDigest(ticker);
    cache.set(ticker, { data: payload, expires: Date.now() + TTL_MS });
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load news";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
