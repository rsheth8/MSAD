import { NextResponse } from "next/server";
import { getMarketPulse } from "@/lib/aggregator/news";

const TTL_MS = 5 * 60 * 1000;
let cache: { data: unknown; expires: number } | null = null;

export async function GET() {
  if (cache && Date.now() < cache.expires) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  try {
    const payload = await getMarketPulse();
    cache = { data: payload, expires: Date.now() + TTL_MS };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load market news";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
