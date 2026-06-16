import { NextResponse } from "next/server";
import { buildResearchQueue } from "@/lib/discovery/refresh";
import type { InvestorProfile, MockHolding } from "@/lib/discovery/types";
import { fmpFetch, hasFmpApiKey, FmpError } from "@/lib/fmp/client";
import type { FmpProfile } from "@/lib/fmp/types";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";
import { DEFAULT_EXCLUSIONS } from "@/lib/screener/exclusions";
import type { JournalEntry, Prediction } from "@/lib/profile/types";

async function sectorsForHoldings(
  holdings: MockHolding[],
  isMock: boolean,
): Promise<{ ticker: string; sector: string; weight: number }[]> {
  const out: { ticker: string; sector: string; weight: number }[] = [];
  for (const h of holdings.slice(0, 10)) {
    if (isMock) {
      out.push({ ticker: h.ticker, sector: "Technology", weight: h.weight });
      continue;
    }
    try {
      const profile = await fmpFetch<FmpProfile[]>("/profile", { symbol: h.ticker });
      out.push({
        ticker: h.ticker,
        sector: profile[0]?.industry || "Unknown",
        weight: h.weight,
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, RATE_LIMITS.screener);
  if (limited) return limited;

  try {
    const body = (await req.json()) as {
      investorProfile?: Partial<InvestorProfile> | null;
      mockPortfolio?: MockHolding[];
      watchlist?: string[];
      journalTickers?: string[];
      predictions?: Prediction[];
      journal?: JournalEntry[];
      excludeSymbols?: string[];
    };

    const isMock = !hasFmpApiKey();
    const holdingSectors = await sectorsForHoldings(body.mockPortfolio ?? [], isMock);

    const result = await buildResearchQueue({
      investorProfile: body.investorProfile,
      mockPortfolio: body.mockPortfolio,
      watchlist: body.watchlist,
      journalTickers: body.journalTickers,
      predictions: body.predictions,
      journal: body.journal,
      excludeSymbols: body.excludeSymbols ?? DEFAULT_EXCLUSIONS,
      holdingSectors,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    if (err instanceof FmpError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    void captureError(err, { route: "api/discovery/refresh" });
    return NextResponse.json({ error: "Discovery refresh failed" }, { status: 500 });
  }
}
