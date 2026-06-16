import { NextResponse } from "next/server";
import { hasFmpApiKey, FmpError } from "@/lib/fmp/client";
import { fetchHistoricalBars } from "@/lib/fmp/historical";
import { computeBacktest, isStrategyKind } from "@/lib/backtest/engine";
import { syntheticBars } from "@/lib/backtest/mock";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { checkQuota, QUOTAS } from "@/lib/usage/quotas";
import { getSession } from "@/lib/auth/session";
import { captureError } from "@/lib/observability";
import type { Bar, BacktestResult, StrategyKind } from "@/lib/backtest/types";

const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
const BENCHMARK = "SPY";

const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { data: BacktestResult; expires: number }>();

function clamp(n: number, lo: number, hi: number, fallback: number): number {
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
}

function fromDate(years: number): string {
  return new Date(Date.now() - years * 365.25 * 86_400_000).toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, RATE_LIMITS.backtest);
  if (limited) return limited;

  const user = await getSession(req);
  const quotaHit = await checkQuota(user, QUOTAS.backtest);
  if (quotaHit) return quotaHit;

  let body: {
    ticker?: string;
    kind?: StrategyKind;
    smaWindow?: number;
    costBps?: number;
    years?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ticker = (body.ticker ?? "").toUpperCase().trim();
  if (!TICKER_RE.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker symbol" }, { status: 400 });
  }
  if (!isStrategyKind(body.kind)) {
    return NextResponse.json({ error: "Invalid strategy" }, { status: 400 });
  }
  const kind = body.kind;
  const years = clamp(Number(body.years), 1, 15, 5);
  const smaWindow = clamp(Number(body.smaWindow), 5, 200, 50);
  const costBps = clamp(Number(body.costBps), 0, 200, 10);

  const cacheKey = `${ticker}|${kind}|${smaWindow}|${costBps}|${years}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() < hit.expires) return NextResponse.json(hit.data);

  try {
    const isMock = !hasFmpApiKey();
    let asset: Bar[];
    let bench: Bar[];
    if (isMock) {
      const days = Math.round(years * 252);
      asset = syntheticBars(ticker, days);
      bench = syntheticBars(BENCHMARK, days, 0.07);
    } else {
      const from = fromDate(years);
      [asset, bench] = await Promise.all([
        fetchHistoricalBars(ticker, from),
        fetchHistoricalBars(BENCHMARK, from),
      ]);
    }

    const computed = computeBacktest(asset, bench, { kind, smaWindow, costBps });
    const result: BacktestResult = {
      ticker,
      kind,
      smaWindow: kind === "sma-cross" ? smaWindow : undefined,
      costBps,
      isMock,
      ...computed,
    };
    if (computed.points.length > 0) cache.set(cacheKey, { data: result, expires: Date.now() + TTL_MS });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FmpError) {
      const status = err.code === "NOT_FOUND" ? 404 : err.code === "CONFIG" ? 503 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    void captureError(err, { route: "api/backtest" });
    return NextResponse.json({ error: "Failed to run backtest" }, { status: 500 });
  }
}
