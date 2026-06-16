import { NextResponse } from "next/server";
import { runPool } from "@/lib/async";
import { hasFmpApiKey } from "@/lib/fmp/client";
import { fetchHistoricalBars } from "@/lib/fmp/historical";
import type { FmpPriceBar } from "@/lib/fmp/types";

const TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { spark: number[]; expires: number }>();

function barsToSparkline(bars: FmpPriceBar[], n = 24): number[] {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  const slice = sorted.slice(-n);
  if (!slice.length) return [];
  const first = slice[0].close;
  return slice.map((b) => Math.round((b.close / first) * 1000) / 10);
}

/** Batch sparklines for comma-separated symbols (max 12). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbols = (url.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 12);

  if (!symbols.length) return NextResponse.json({});

  const data: Record<string, number[]> = {};
  const missing: string[] = [];

  for (const s of symbols) {
    const hit = cache.get(s);
    if (hit && Date.now() < hit.expires) data[s] = hit.spark;
    else missing.push(s);
  }

  if (missing.length && hasFmpApiKey()) {
    const from = new Date();
    from.setDate(from.getDate() - 45);
    const fromStr = from.toISOString().slice(0, 10);

    await runPool(
      missing,
      async (symbol) => {
        try {
          const bars = await fetchHistoricalBars(symbol, fromStr);
          const spark = barsToSparkline(bars);
          if (spark.length) {
            cache.set(symbol, { spark, expires: Date.now() + TTL_MS });
            data[symbol] = spark;
          }
        } catch {
          /* skip */
        }
      },
      3,
    );
  } else if (missing.length) {
    for (let i = 0; i < missing.length; i++) {
      const s = missing[i];
      data[s] = Array.from({ length: 20 }, (_, j) => 100 + Math.sin(j / 3 + i) * 4);
    }
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
  });
}
