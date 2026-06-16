import { NextResponse } from "next/server";
import { searchSymbols } from "@/lib/search";

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limitRaw = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 12) : 8;

  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const key = `${q.toLowerCase()}::${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expires) {
    return NextResponse.json(hit.data, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" },
    });
  }

  const results = await searchSymbols(q, limit);
  const payload = { results, q };
  cache.set(key, { data: payload, expires: Date.now() + TTL_MS });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" },
  });
}
