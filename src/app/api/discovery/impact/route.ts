import { NextResponse } from "next/server";
import { computePortfolioImpact } from "@/lib/discovery/impact";
import type { MockHolding } from "@/lib/discovery/types";
import { FmpError } from "@/lib/fmp/client";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";

const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, RATE_LIMITS.risk);
  if (limited) return limited;

  try {
    const body = (await req.json()) as {
      ticker?: string;
      holdings?: MockHolding[];
      addWeight?: number;
    };

    const ticker = (body.ticker ?? "").toUpperCase().trim();
    if (!TICKER_RE.test(ticker)) {
      return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
    }

    const holdings = (body.holdings ?? [])
      .filter((h) => h?.ticker)
      .slice(0, 15)
      .map((h) => ({
        ticker: h.ticker.toUpperCase(),
        weight: Number(h.weight) > 0 ? Number(h.weight) : 1,
      }));

    const impact = await computePortfolioImpact(
      ticker,
      holdings,
      body.addWeight ?? 0.1,
    );

    if (!impact) {
      return NextResponse.json({ error: "Couldn't load ticker data" }, { status: 404 });
    }

    return NextResponse.json(impact);
  } catch (err) {
    if (err instanceof FmpError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    void captureError(err, { route: "api/discovery/impact" });
    return NextResponse.json({ error: "Impact preview failed" }, { status: 500 });
  }
}
