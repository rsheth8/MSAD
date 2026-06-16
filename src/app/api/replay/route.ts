import { NextResponse } from "next/server";
import { hasFmpApiKey, FmpError } from "@/lib/fmp/client";
import { fetchHistoricalBars } from "@/lib/fmp/historical";
import { syntheticBars } from "@/lib/backtest/mock";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";
import { CATALOG_ROWS } from "@/lib/catalog";
import type { Bar } from "@/lib/backtest/types";
import type { ReplayGame } from "@/lib/replay/types";

const WINDOW = 120; // trading days in a round
const START_INDEX = 40; // bars revealed before decisions begin

/** ticker -> friendly name, from the curated catalog (stocks only). */
const STOCKS: { ticker: string; name: string }[] = CATALOG_ROWS.flatMap((r) =>
  r.items.filter((i) => i.kind === "stock").map((i) => ({ ticker: i.ticker, name: i.name })),
);

function pickStock() {
  return STOCKS[Math.floor(Math.random() * STOCKS.length)] ?? { ticker: "AAPL", name: "Apple" };
}

function sortAsc(bars: Bar[]): Bar[] {
  return [...bars].sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(req: Request) {
  const limited = await checkRateLimit(req, RATE_LIMITS.replay);
  if (limited) return limited;

  const choice = pickStock();
  try {
    const isMock = !hasFmpApiKey();
    let bars: Bar[];
    if (isMock) {
      bars = syntheticBars(`${choice.ticker}-${Math.floor(Math.random() * 1000)}`, WINDOW + 20, 0.1);
    } else {
      const from = new Date(Date.now() - 5 * 365.25 * 86_400_000).toISOString().slice(0, 10);
      bars = sortAsc(await fetchHistoricalBars(choice.ticker, from)).filter((b) => b.close > 0);
    }

    if (bars.length < WINDOW) {
      // not enough history — fall back to a synthetic window so the game still runs
      bars = syntheticBars(`${choice.ticker}-fallback`, WINDOW + 20, 0.1);
    }

    const maxStart = bars.length - WINDOW;
    const start = Math.floor(Math.random() * Math.max(1, maxStart));
    const window = bars.slice(start, start + WINDOW);
    const base = window[0].close;
    const series = window.map((b) => Math.round((b.close / base) * 1000) / 10); // indexed to 100

    const game: ReplayGame = {
      series,
      startIndex: START_INDEX,
      reveal: {
        ticker: choice.ticker,
        name: choice.name,
        fromDate: window[0].date,
        toDate: window[window.length - 1].date,
      },
      isMock,
    };
    return NextResponse.json(game, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof FmpError) {
      const status = err.code === "CONFIG" ? 503 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    void captureError(err, { route: "api/replay" });
    return NextResponse.json({ error: "Failed to start a replay" }, { status: 500 });
  }
}
