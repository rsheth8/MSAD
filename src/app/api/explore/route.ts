import { NextResponse } from "next/server";
import { runExplore } from "@/lib/screener/explore";
import type { ExploreRequest } from "@/lib/screener/explore-types";

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ExploreRequest;
    const key = JSON.stringify(body);
    const hit = cache.get(key);
    if (hit && Date.now() < hit.expires) {
      return NextResponse.json(hit.data, {
        headers: { "Cache-Control": "private, max-age=600" },
      });
    }

    const payload = await runExplore({
      filters: body.filters ?? {},
      sortKey: body.sortKey,
      sortDir: body.sortDir,
      excludeSymbols: body.excludeSymbols,
    });
    cache.set(key, { data: payload, expires: Date.now() + TTL_MS });
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Explore screen failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
