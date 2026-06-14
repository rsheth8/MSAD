import { NextResponse } from "next/server";
import { getChartPayload } from "@/lib/aggregator/chart";
import { getCachedChart, setCachedChart } from "@/lib/cache/chart-cache";
import {
  DEFAULT_SCATTER_X,
  DEFAULT_SCATTER_Y,
  isChartRange,
  isScatterMetricKey,
} from "@/lib/chart/presets";
import type { ChartMode, ChartRange } from "@/lib/chart/types";
import { FmpError } from "@/lib/fmp/client";

const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

export async function GET(
  request: Request,
  context: { params: Promise<{ ticker: string }> },
) {
  const { ticker: raw } = await context.params;
  const ticker = (raw ?? "").toUpperCase().trim();

  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker symbol" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range") ?? "1Y";
  const range: ChartRange = isChartRange(rangeParam) ? rangeParam : "1Y";
  const mode = (searchParams.get("mode") ?? "compare") as ChartMode;
  const seriesA = searchParams.get("a") ?? undefined;
  const seriesB = searchParams.get("b") ?? undefined;
  const scatterX = isScatterMetricKey(searchParams.get("x") ?? "")
    ? (searchParams.get("x") as typeof DEFAULT_SCATTER_X)
    : DEFAULT_SCATTER_X;
  const scatterY = isScatterMetricKey(searchParams.get("y") ?? "")
    ? (searchParams.get("y") as typeof DEFAULT_SCATTER_Y)
    : DEFAULT_SCATTER_Y;
  const useDefault = searchParams.get("default") !== "0";

  const cacheKey = `${ticker}|${range}|${mode}|${seriesA}|${seriesB}|${scatterX}|${scatterY}|${useDefault}`;
  const cached = getCachedChart(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  }

  try {
    const payload = await getChartPayload({
      ticker,
      range,
      mode,
      seriesA,
      seriesB,
      scatterX,
      scatterY,
      useDefault,
    });
    setCachedChart(cacheKey, payload);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (err) {
    if (err instanceof FmpError) {
      const status = err.code === "NOT_FOUND" ? 404 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("[api/chart]", err);
    return NextResponse.json({ error: "Failed to load chart" }, { status: 500 });
  }
}
