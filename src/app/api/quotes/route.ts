import { NextResponse } from "next/server";
import { allCatalogTickers } from "@/lib/catalog";
import { fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";
import type { FmpQuote } from "@/lib/fmp/types";

const TTL_MS = 5 * 60 * 1000;
let cache: { data: Record<string, { price: number; changePercentage: number }>; expires: number } | null =
  null;

/** Batch live quotes for all catalog tickers (carousel tiles). */
export async function GET() {
  if (cache && Date.now() < cache.expires) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  if (!hasFmpApiKey()) {
    return NextResponse.json({});
  }

  const symbols = allCatalogTickers();
  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const rows = await fmpFetch<FmpQuote[]>("/quote", { symbol });
      const q = rows[0];
      if (!q?.price) return null;
      return {
        symbol,
        price: q.price,
        changePercentage: q.changePercentage ?? 0,
      };
    }),
  );

  const data: Record<string, { price: number; changePercentage: number }> = {};
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      data[r.value.symbol] = {
        price: r.value.price,
        changePercentage: r.value.changePercentage,
      };
    }
  }

  cache = { data, expires: Date.now() + TTL_MS };
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
