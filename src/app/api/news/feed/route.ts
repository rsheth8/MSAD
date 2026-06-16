import { NextResponse } from "next/server";
import { getNewsFeed } from "@/lib/aggregator/news";
import type { MoodLabel, NewsCategory, NewsFeedQuery } from "@/lib/news/types";

const TTL_MS = 3 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();

const CATEGORIES: NewsCategory[] = [
  "earnings",
  "product",
  "legal",
  "macro",
  "merger",
  "leadership",
  "other",
];
const MOODS: MoodLabel[] = ["bullish", "neutral", "bearish"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const sentiment = searchParams.get("sentiment");
  const limitRaw = Number(searchParams.get("limit"));

  const query: NewsFeedQuery = {
    q: searchParams.get("q")?.trim() || undefined,
    ticker: searchParams.get("ticker")?.trim().toUpperCase() || undefined,
    category:
      category && CATEGORIES.includes(category as NewsCategory)
        ? (category as NewsCategory)
        : undefined,
    sentiment:
      sentiment && MOODS.includes(sentiment as MoodLabel) ? (sentiment as MoodLabel) : undefined,
    cursor: searchParams.get("cursor")?.trim() || undefined,
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
  };

  const key = JSON.stringify(query);
  const hit = cache.get(key);
  if (hit && Date.now() < hit.expires) {
    return NextResponse.json(hit.data, {
      headers: { "Cache-Control": "public, s-maxage=180, stale-while-revalidate=600" },
    });
  }

  try {
    const payload = await getNewsFeed(query);
    cache.set(key, { data: payload, expires: Date.now() + TTL_MS });
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=180, stale-while-revalidate=600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load news feed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
