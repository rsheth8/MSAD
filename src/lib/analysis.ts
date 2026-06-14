import type { Metric, OptionContract, ReportCard } from "./types";
import { formatCurrency } from "./format";

/**
 * Turns numbers into plain-English understanding for a beginner. Pure functions
 * so they work identically on mock and live data.
 *
 * Nothing here is advice — it describes what the numbers say, never what to do.
 */

/** One-sentence "what this means for this stock" read for a single metric. */
export function metricRead(metric: Metric): string | null {
  const { label, vsIndustryPct, higherIsBetter } = metric;
  if (vsIndustryPct === null) return null;

  const abs = Math.abs(vsIndustryPct);
  const favorable = vsIndustryPct > 0 === higherIsBetter;
  const dir = vsIndustryPct >= 0 ? "above" : "below";

  const comparison =
    abs < 8
      ? "roughly in line with its industry"
      : `about ${abs.toFixed(0)}% ${dir} its industry`;

  const verdict = favorable
    ? "generally a positive sign"
    : "a point worth watching";

  return `${label} is ${comparison} — ${verdict}.`;
}

export type GradeLetter = "A" | "B" | "C" | "D" | "F";
export type Sentiment = "good" | "neutral" | "bad";

export interface OverallGrade {
  letter: GradeLetter;
  /** 0–100, for a ring/score display */
  score: number;
  sentiment: Sentiment;
  /** short plain-English headline */
  summary: string;
  /** metric labels that look strong vs. industry */
  strengths: string[];
  /** metric labels worth watching */
  watchOuts: string[];
}

/** Synthesize the metrics into a single beginner-friendly grade. */
export function overallGrade(data: ReportCard): OverallGrade {
  const scored = data.metrics
    .filter((m) => m.vsIndustryPct !== null)
    .map((m) => {
      const pct = m.vsIndustryPct as number;
      const favorable = pct > 0 === m.higherIsBetter;
      const weight = Math.min(Math.abs(pct) / 25, 1); // cap each metric's pull
      return { label: m.label, signed: (favorable ? 1 : -1) * weight, favorable, pct };
    });

  const avg =
    scored.length === 0
      ? 0
      : scored.reduce((s, m) => s + m.signed, 0) / scored.length; // -1..1

  const score = Math.round(((avg + 1) / 2) * 100); // 0..100

  let letter: GradeLetter;
  let sentiment: Sentiment;
  if (avg >= 0.45) [letter, sentiment] = ["A", "good"];
  else if (avg >= 0.2) [letter, sentiment] = ["B", "good"];
  else if (avg >= -0.1) [letter, sentiment] = ["C", "neutral"];
  else if (avg >= -0.35) [letter, sentiment] = ["D", "bad"];
  else [letter, sentiment] = ["F", "bad"];

  const strengths = scored
    .filter((m) => m.favorable && Math.abs(m.pct) >= 8)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 3)
    .map((m) => m.label);

  const watchOuts = scored
    .filter((m) => !m.favorable && Math.abs(m.pct) >= 8)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 3)
    .map((m) => m.label);

  const headline: Record<GradeLetter, string> = {
    A: `${data.name} looks strong versus its industry on most measures.`,
    B: `${data.name} looks solid versus its industry, with a few soft spots.`,
    C: `${data.name} is a mixed bag — some bright spots, some concerns.`,
    D: `${data.name} trails its industry on several key measures.`,
    F: `${data.name} looks weak versus its industry on most measures.`,
  };

  return { letter, score, sentiment, summary: headline[letter], strengths, watchOuts };
}

export interface RiskRead {
  level: "low" | "medium" | "high";
  text: string;
}

/** Translate beta into everyday language. */
export function riskRead(beta: number): RiskRead {
  const pct = Math.round(Math.abs(beta - 1) * 100);
  if (beta >= 1.15) {
    return {
      level: "high",
      text: `This stock tends to swing about ${pct}% more than the market — bigger ups and downs, meaning higher risk and higher potential reward.`,
    };
  }
  if (beta <= 0.85) {
    return {
      level: "low",
      text: `This stock tends to move about ${pct}% less than the market — steadier, with smaller swings.`,
    };
  }
  return {
    level: "medium",
    text: "This stock moves roughly in line with the market — about average risk.",
  };
}

/* ---------------------------------------------------------------------------
   Options education helpers — all factual/descriptive, never advice.
--------------------------------------------------------------------------- */

/** Profit/loss per share at expiration for a long option, given underlying S. */
export function optionPayoff(contract: OptionContract, S: number): number {
  const intrinsic =
    contract.type === "call"
      ? Math.max(S - contract.strike, 0)
      : Math.max(contract.strike - S, 0);
  return intrinsic - contract.premium;
}

export interface OptionStats {
  breakeven: number;
  /** total premium paid for one contract (100 shares) */
  contractCost: number;
  /** most you can lose (the premium), per contract */
  maxLoss: number;
  /** most you can gain per contract, or null when unlimited (long call) */
  maxGain: number | null;
}

export function optionStats(contract: OptionContract): OptionStats {
  const contractCost = contract.premium * 100;
  if (contract.type === "call") {
    return {
      breakeven: contract.strike + contract.premium,
      contractCost,
      maxLoss: contractCost,
      maxGain: null, // unlimited
    };
  }
  return {
    breakeven: contract.strike - contract.premium,
    contractCost,
    maxLoss: contractCost,
    maxGain: (contract.strike - contract.premium) * 100, // stock can only fall to 0
  };
}

/** Plain-English description of one contract relative to today's price. */
export function optionRead(
  contract: OptionContract,
  price: number,
  name: string,
): string {
  const { breakeven, contractCost } = optionStats(contract);
  const movePct = Math.abs(((breakeven - price) / price) * 100).toFixed(1);
  const cost = formatCurrency(contractCost);
  const strike = formatCurrency(contract.strike);
  const be = formatCurrency(breakeven);

  if (contract.type === "call") {
    return `You pay ${cost} for the right to buy 100 shares of ${name} at ${strike} until ${contract.expiry}. You'd start profiting if ${name} climbs above ${be} — about ${movePct}% above today's price. The most you can lose is the ${cost} you paid.`;
  }
  return `You pay ${cost} for the right to sell 100 shares of ${name} at ${strike} until ${contract.expiry}. You'd start profiting if ${name} falls below ${be} — about ${movePct}% below today's price. The most you can lose is the ${cost} you paid.`;
}

/** Plain-English read of implied volatility. */
export function ivRead(iv: number, name: string): string {
  const pct = Math.round(iv * 100);
  const tone =
    iv >= 0.4
      ? "That's relatively high — options here are pricier and the market expects big swings."
      : iv <= 0.2
        ? "That's relatively low — options here are cheaper and the market expects calmer moves."
        : "That's around average — moderate expected movement.";
  return `Implied volatility of ${pct}% means the market expects ${name} to move roughly ±${pct}% over the next year. ${tone}`;
}
