import type { ScreenerResultRow } from "@/lib/screener/types";
import type { InvestorProfile } from "./types";

export interface MatchReason {
  text: string;
  pass: boolean;
}

export interface MatchResult {
  score: number;
  reasons: MatchReason[];
}

function check(
  pass: boolean,
  passText: string,
  failText: string,
): MatchReason {
  return { pass, text: pass ? passText : failText };
}

/** Transparent fit score — how well a screener row matches stated criteria. */
export function scoreMatch(row: ScreenerResultRow, profile: InvestorProfile): MatchResult {
  const reasons: MatchReason[] = [];
  let earned = 0;
  let total = 0;

  function weigh(weight: number, pass: boolean, passText: string, failText: string) {
    total += weight;
    if (pass) earned += weight;
    reasons.push(check(pass, passText, failText));
  }

  const capB = row.marketCap / 1e9;
  weigh(
    2,
    capB >= profile.marketCapMinB && capB <= profile.marketCapMaxB,
    `Market cap $${capB.toFixed(1)}B in your range`,
    `Market cap $${capB.toFixed(1)}B outside $${profile.marketCapMinB}–$${profile.marketCapMaxB}B`,
  );

  weigh(
    1.5,
    row.price <= profile.priceMax,
    `Share price $${row.price.toFixed(0)} under your $${profile.priceMax} max`,
    `Share price $${row.price.toFixed(0)} above your $${profile.priceMax} max`,
  );

  weigh(
    1.5,
    row.beta <= profile.betaMax,
    `Beta ${row.beta.toFixed(2)} within your ${profile.betaMax} cap`,
    `Beta ${row.beta.toFixed(2)} above your ${profile.betaMax} cap`,
  );

  if (profile.peMax > 0) {
    weigh(
      1.5,
      row.pe !== null && row.pe <= profile.peMax,
      row.pe !== null ? `P/E ${row.pe.toFixed(1)} under your ${profile.peMax} max` : "P/E not available",
      row.pe !== null ? `P/E ${row.pe.toFixed(1)} above your ${profile.peMax} max` : "P/E not available",
    );
  }

  if (profile.roeMinPct > 0) {
    const min = profile.roeMinPct / 100;
    weigh(
      1,
      row.roe !== null && row.roe >= min,
      row.roe !== null ? `ROE ${(row.roe * 100).toFixed(0)}% meets your ${profile.roeMinPct}% floor` : "ROE not available",
      row.roe !== null ? `ROE ${(row.roe * 100).toFixed(0)}% below your ${profile.roeMinPct}% floor` : "ROE not available",
    );
  }

  if (profile.dividendMin > 0) {
    weigh(
      1.5,
      row.dividend >= profile.dividendMin,
      `Dividend yield ${(row.dividend * 100).toFixed(1)}% meets your income filter`,
      `Dividend yield ${(row.dividend * 100).toFixed(1)}% below your minimum`,
    );
  }

  if (profile.sectorsInclude.length > 0) {
    weigh(
      1,
      profile.sectorsInclude.includes(row.sector),
      `In your preferred sector (${row.sector})`,
      `Sector ${row.sector} not in your include list`,
    );
  }

  if (profile.sectorsExclude.length > 0) {
    weigh(
      1,
      !profile.sectorsExclude.includes(row.sector),
      `Not in an excluded sector`,
      `Sector ${row.sector} is on your exclude list`,
    );
  }

  const score = total > 0 ? Math.round((earned / total) * 100) : 50;
  return { score, reasons };
}

export function topMatchReasons(result: MatchResult, limit = 3): string[] {
  const passed = result.reasons.filter((r) => r.pass).map((r) => r.text);
  if (passed.length >= limit) return passed.slice(0, limit);
  return [
    ...passed,
    ...result.reasons.filter((r) => !r.pass).map((r) => r.text),
  ].slice(0, limit);
}
