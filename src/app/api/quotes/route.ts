import { NextResponse } from "next/server";
import { allCatalogTickers } from "@/lib/catalog";
import { fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";
import type { FmpQuote } from "@/lib/fmp/types";

const TTL_MS = 5 * 60 * 1000;
let catalogCache: {
  data: Record<string, { price: number; changePercentage: number }>;
  expires: number;
} | null = null;

async function fetchQuotes(symbols: string[]) {
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
  return data;
}

/** Batch live quotes — catalog by default, or ?symbols=AAPL,MSFT for watchlist. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const custom = url.searchParams.get("symbols");
  const symbols = custom
    ? custom
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 20)
    : allCatalogTickers();

  if (!custom && catalogCache && Date.now() < catalogCache.expires) {
    return NextResponse.json(catalogCache.data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  if (!hasFmpApiKey()) {
    return NextResponse.json({});
  }

  const data = await fetchQuotes(symbols);
  if (!custom) catalogCache = { data, expires: Date.now() + TTL_MS };

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
