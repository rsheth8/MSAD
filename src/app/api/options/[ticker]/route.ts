import { NextResponse } from "next/server";
import { getOptionsChain } from "@/lib/aggregator/options-chain";
import { getCachedOptions, setCachedOptions } from "@/lib/cache/options-cache";
import { FmpError } from "@/lib/fmp/client";

const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ ticker: string }> },
) {
  const { ticker: raw } = await context.params;
  const ticker = (raw ?? "").toUpperCase().trim();

  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker symbol" }, { status: 400 });
  }

  const cached = getCachedOptions(ticker);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  }

  try {
    const chain = await getOptionsChain(ticker);
    setCachedOptions(ticker, chain);
    return NextResponse.json(chain, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (err) {
    if (err instanceof FmpError) {
      const status = err.code === "NOT_FOUND" ? 404 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("[api/options]", err);
    return NextResponse.json({ error: "Failed to load options chain" }, { status: 500 });
  }
}
