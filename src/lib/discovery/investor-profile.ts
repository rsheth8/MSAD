import type { InvestorProfile } from "./types";
import type { AccountSize, InvestingHorizon, InvestingStyle, RiskComfort } from "./types";

export const DEFAULT_INVESTOR_PROFILE: InvestorProfile = {
  style: "learning",
  horizon: "medium",
  riskComfort: "moderate",
  accountSize: "small",
  marketCapMinB: 0.3,
  marketCapMaxB: 10,
  priceMax: 100,
  betaMax: 1.5,
  peMax: 25,
  roeMinPct: 0,
  dividendMin: 0,
  sectorsInclude: [],
  sectorsExclude: [],
  profileComplete: false,
};

const STYLE_DEFAULTS: Record<
  InvestingStyle,
  Partial<Pick<InvestorProfile, "peMax" | "roeMinPct" | "dividendMin" | "betaMax" | "marketCapMaxB">>
> = {
  learning: { marketCapMaxB: 50, betaMax: 1.2, peMax: 30 },
  income: { dividendMin: 0.015, betaMax: 1, peMax: 22, roeMinPct: 8 },
  growth: { roeMinPct: 12, peMax: 40, dividendMin: 0 },
  value: { peMax: 18, roeMinPct: 10, dividendMin: 0 },
  balanced: { peMax: 25, betaMax: 1.3, roeMinPct: 8 },
};

const RISK_DEFAULTS: Record<RiskComfort, Pick<InvestorProfile, "betaMax">> = {
  calm: { betaMax: 1 },
  moderate: { betaMax: 1.5 },
  aggressive: { betaMax: 2.5 },
};

const ACCOUNT_DEFAULTS: Record<AccountSize, Pick<InvestorProfile, "priceMax" | "marketCapMinB">> = {
  small: { priceMax: 50, marketCapMinB: 0.3 },
  medium: { priceMax: 200, marketCapMinB: 0.5 },
  large: { priceMax: 500, marketCapMinB: 1 },
};

const HORIZON_LABELS: Record<InvestingHorizon, string> = {
  short: "weeks to months",
  medium: "months to a few years",
  long: "years+",
};

const STYLE_LABELS: Record<InvestingStyle, string> = {
  learning: "Learning the basics",
  income: "Income & dividends",
  growth: "Growth",
  value: "Value",
  balanced: "Balanced mix",
};

export function applyStyleDefaults(
  style: InvestingStyle,
  base: InvestorProfile = DEFAULT_INVESTOR_PROFILE,
): InvestorProfile {
  return {
    ...base,
    style,
    ...STYLE_DEFAULTS[style],
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeInvestorProfile(raw?: Partial<InvestorProfile> | null): InvestorProfile {
  if (!raw) return { ...DEFAULT_INVESTOR_PROFILE };
  return {
    ...DEFAULT_INVESTOR_PROFILE,
    ...raw,
    sectorsInclude: raw.sectorsInclude ?? [],
    sectorsExclude: raw.sectorsExclude ?? [],
  };
}

export function investorProfileSummary(p: InvestorProfile): string {
  const parts = [STYLE_LABELS[p.style], HORIZON_LABELS[p.horizon]];
  if (p.riskComfort === "calm") parts.push("prefers steadier names");
  if (p.dividendMin > 0) parts.push("dividend-focused");
  if (p.accountSize === "small") parts.push(`under $${p.priceMax}/share`);
  return parts.join(" · ");
}

export { STYLE_LABELS, HORIZON_LABELS, RISK_DEFAULTS, ACCOUNT_DEFAULTS };
