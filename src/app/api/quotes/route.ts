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
  if (!symbols.length) return {};

  const data: Record<string, { price: number; changePercentage: number }> = {};
  try {
    const rows = await fmpFetch<FmpQuote[]>("/batch-quote", {
      symbols: symbols.join(","),
    });
    for (const q of rows ?? []) {
      const symbol = q.symbol?.toUpperCase();
      if (!symbol || q.price == null) continue;
      data[symbol] = {
        price: q.price,
        changePercentage: q.changePercentage ?? 0,
      };
    }
  } catch {
    // Fallback for plans without batch-quote — one call per symbol, still throttled globally.
    for (const symbol of symbols) {
      try {
        const rows = await fmpFetch<FmpQuote[]>("/quote", { symbol });
        const q = rows[0];
        if (!q?.price) continue;
        data[symbol] = {
          price: q.price,
          changePercentage: q.changePercentage ?? 0,
        };
      } catch {
        /* skip */
      }
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
