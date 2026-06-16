import { NextResponse } from "next/server";
import { fmpFetch, hasFmpApiKey, FmpError } from "@/lib/fmp/client";
import { fetchHistoricalBars } from "@/lib/fmp/historical";
import { syntheticBars } from "@/lib/backtest/mock";
import { computeRisk } from "@/lib/risk/engine";
import type { FmpProfile } from "@/lib/fmp/types";
import type { Holding, RiskAsset } from "@/lib/risk/types";

const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
const MAX_HOLDINGS = 15;
const SYNTH_SECTORS = ["Technology", "Financials", "Healthcare", "Energy", "Consumer", "Industrials"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function loadAsset(h: Holding, isMock: boolean): Promise<RiskAsset | null> {
  const ticker = h.ticker.toUpperCase().trim();
  if (!TICKER_RE.test(ticker)) return null;

  if (isMock) {
    const bars = syntheticBars(ticker, 504, 0.08); // ~2y
    return {
      ticker,
      weight: h.weight,
      dates: bars.map((b) => b.date),
      closes: bars.map((b) => b.close),
      sector: SYNTH_SECTORS[hash(ticker) % SYNTH_SECTORS.length],
      beta: 0.7 + (hash(ticker) % 80) / 100, // 0.70–1.49
    };
  }

  const from = new Date(Date.now() - 2 * 365.25 * 86_400_000).toISOString().slice(0, 10);
  const [profileRes, bars] = await Promise.all([
    fmpFetch<FmpProfile[]>("/profile", { symbol: ticker }).catch(() => [] as FmpProfile[]),
    fetchHistoricalBars(ticker, from).catch(() => []),
  ]);
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date)).filter((b) => b.close > 0);
  if (sorted.length < 2) return null;
  const profile = profileRes[0];
  return {
    ticker,
    weight: h.weight,
    dates: sorted.map((b) => b.date),
    closes: sorted.map((b) => b.close),
    sector: profile?.industry || "Unknown",
    beta: profile?.beta ?? 1,
  };
}

export async function POST(req: Request) {
  let body: { holdings?: Holding[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = Array.isArray(body.holdings) ? body.holdings : [];
  const holdings = raw
    .filter((h) => h && typeof h.ticker === "string")
    .slice(0, MAX_HOLDINGS)
    .map((h) => ({ ticker: h.ticker, weight: Number(h.weight) > 0 ? Number(h.weight) : 1 }));

  if (holdings.length === 0) {
    return NextResponse.json({ error: "Add at least one holding" }, { status: 400 });
  }

  try {
    const isMock = !hasFmpApiKey();
    const loaded = (await Promise.all(holdings.map((h) => loadAsset(h, isMock)))).filter(
      (a): a is RiskAsset => a !== null,
    );
    if (loaded.length === 0) {
      return NextResponse.json({ error: "Couldn't load any of those tickers" }, { status: 404 });
    }
    return NextResponse.json(computeRisk(loaded, isMock));
  } catch (err) {
    if (err instanceof FmpError) {
      const status = err.code === "CONFIG" ? 503 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("[api/risk]", err);
    return NextResponse.json({ error: "Failed to analyze portfolio" }, { status: 500 });
  }
}
