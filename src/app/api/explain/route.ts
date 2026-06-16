import { NextResponse } from "next/server";
import { getReportCardWithCache } from "@/lib/aggregator/report";
import { FmpError } from "@/lib/fmp/client";
import { AiError } from "@/lib/ai/client";
import { explain } from "@/lib/ai/explain";
import { normalizeDepth } from "@/lib/ai/depth";
import { getCachedExplain, setCachedExplain } from "@/lib/cache/ai-cache";
import type { ExplainKind, ExplainRequest } from "@/lib/ai/types";

const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
const KINDS: ExplainKind[] = [
  "metric",
  "overview",
  "bearcase",
  "bullcase",
  "price",
  "question",
  "journal",
];
// kinds whose output depends only on (ticker, depth) → safe to cache
const CACHEABLE = new Set<ExplainKind>(["metric", "overview", "bearcase", "bullcase", "price"]);

export async function POST(req: Request) {
  let body: Partial<ExplainRequest>;
  try {
    body = (await req.json()) as Partial<ExplainRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ticker = (body.ticker ?? "").toUpperCase().trim();
  const kind = body.kind as ExplainKind;
  const depth = normalizeDepth(body.depth);

  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker symbol" }, { status: 400 });
  }
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "Invalid explain kind" }, { status: 400 });
  }
  if (kind === "question" && !body.question?.trim()) {
    return NextResponse.json({ error: "A question is required" }, { status: 400 });
  }
  if (kind === "journal" && !body.thesis?.trim()) {
    return NextResponse.json({ error: "A thesis is required" }, { status: 400 });
  }

  const cacheKey = `${ticker}|${kind}|${depth}|${body.metricKey ?? ""}`;
  if (CACHEABLE.has(kind)) {
    const hit = getCachedExplain(cacheKey);
    if (hit) return NextResponse.json(hit);
  }

  try {
    const card = await getReportCardWithCache(ticker);
    const result = await explain(card, kind, depth, {
      metricKey: body.metricKey,
      question: body.question,
      thesis: body.thesis,
      horizon: body.horizon,
    });
    if (CACHEABLE.has(kind) && result.source === "ai") setCachedExplain(cacheKey, result);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FmpError) {
      const status = err.code === "NOT_FOUND" ? 404 : err.code === "CONFIG" ? 503 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    if (err instanceof AiError) {
      const status = err.code === "CONFIG" ? 503 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("[api/explain]", err);
    return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 });
  }
}
