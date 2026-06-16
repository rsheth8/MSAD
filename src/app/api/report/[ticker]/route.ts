import { NextResponse } from "next/server";
import { getReportCardWithCache } from "@/lib/aggregator/report";
import { FmpError } from "@/lib/fmp/client";
import type { ReportCard } from "@/lib/types";

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

  try {
    const card: ReportCard = await getReportCardWithCache(ticker);
    return NextResponse.json(card, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (err) {
    if (err instanceof FmpError) {
      const status = err.code === "NOT_FOUND" ? 404 : err.code === "CONFIG" ? 503 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("[api/report]", err);
    return NextResponse.json({ error: "Failed to load report card" }, { status: 500 });
  }
}
