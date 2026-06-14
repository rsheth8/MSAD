import { NextResponse } from "next/server";
import { getReportCard } from "@/lib/aggregator/report";
import { getCachedReport, setCachedReport } from "@/lib/cache/report-cache";
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

  const cached = getCachedReport(ticker);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  }

  try {
    const card: ReportCard = await getReportCard(ticker);
    setCachedReport(ticker, card);
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
