import { fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";
import type { FmpProfile } from "@/lib/fmp/types";
import { concentrationWarning, sectorWeights } from "./gap";
import type { MockHolding, PortfolioImpact } from "./types";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function loadTickerMeta(
  ticker: string,
  isMock: boolean,
): Promise<{ sector: string; beta: number } | null> {
  const sym = ticker.toUpperCase();
  if (isMock) {
    const sectors = ["Technology", "Healthcare", "Financial Services", "Energy", "Industrials"];
    return { sector: sectors[hash(sym) % sectors.length], beta: 0.7 + (hash(sym) % 80) / 100 };
  }
  try {
    const profile = await fmpFetch<FmpProfile[]>("/profile", { symbol: sym });
    const p = profile[0];
    if (!p) return null;
    return { sector: p.industry || "Unknown", beta: p.beta ?? 1 };
  } catch {
    return null;
  }
}

/** Preview how adding a ticker affects a mock/real-weighted portfolio. */
export async function computePortfolioImpact(
  ticker: string,
  holdings: MockHolding[],
  addWeight = 0.1,
): Promise<PortfolioImpact | null> {
  const sym = ticker.toUpperCase();
  const isMock = !hasFmpApiKey();
  const newMeta = await loadTickerMeta(sym, isMock);
  if (!newMeta) return null;

  const loaded = await Promise.all(
    holdings.map(async (h) => {
      const meta = await loadTickerMeta(h.ticker, isMock);
      return meta ? { ...h, ...meta, ticker: h.ticker.toUpperCase() } : null;
    }),
  );
  const valid = loaded.filter((h): h is MockHolding & { sector: string; beta: number; ticker: string } => h !== null);
  if (valid.length === 0) {
    return {
      ticker: sym,
      sector: newMeta.sector,
      beta: newMeta.beta,
      currentPortfolioBeta: null,
      projectedPortfolioBeta: newMeta.beta,
      sectorWeightBefore: null,
      sectorWeightAfter: 1,
      alreadyHeld: false,
      concentrationWarning: null,
      isMock,
    };
  }

  const total = valid.reduce((s, h) => s + Math.max(0, h.weight), 0) || 1;
  const currentBeta =
    valid.reduce((s, h) => s + (h.beta * Math.max(0, h.weight)) / total, 0) || null;

  const projected = [...valid];
  const existing = projected.find((h) => h.ticker === sym);
  if (existing) {
    existing.weight += addWeight;
  } else {
    projected.push({ ticker: sym, weight: addWeight, sector: newMeta.sector, beta: newMeta.beta });
  }
  const projTotal = projected.reduce((s, h) => s + Math.max(0, h.weight), 0) || 1;
  const projectedBeta = projected.reduce(
    (s, h) => s + (h.beta * Math.max(0, h.weight)) / projTotal,
    0,
  );

  const beforeSectors = sectorWeights(valid.map((h) => ({ sector: h.sector, weight: h.weight })));
  const afterSectors = sectorWeights(projected.map((h) => ({ sector: h.sector, weight: h.weight })));
  const sectorBefore = beforeSectors.find((s) => s.sector === newMeta.sector)?.weight ?? 0;
  const sectorAfter = afterSectors.find((s) => s.sector === newMeta.sector)?.weight ?? 0;

  return {
    ticker: sym,
    sector: newMeta.sector,
    beta: newMeta.beta,
    currentPortfolioBeta: currentBeta,
    projectedPortfolioBeta: projectedBeta,
    sectorWeightBefore: sectorBefore,
    sectorWeightAfter: sectorAfter,
    alreadyHeld: Boolean(existing),
    concentrationWarning: concentrationWarning(valid, sym, addWeight),
    isMock,
  };
}
