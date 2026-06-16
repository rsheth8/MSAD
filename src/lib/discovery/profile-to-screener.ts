import { SCREENER_SECTORS } from "@/lib/screener/presets";
import type { ScreenerRequest } from "@/lib/screener/types";
import { DEFAULT_INVESTOR_PROFILE } from "./investor-profile";
import { parseNaturalLanguageCriteria } from "./parse-criteria";
import type { InvestorProfile } from "./types";

/** Map investor profile (+ optional NL text) to a screener request. */
export function profileToScreenerRequest(
  profile: InvestorProfile,
  excludeSymbols: string[] = [],
): ScreenerRequest {
  const nl = profile.naturalLanguageCriteria
    ? parseNaturalLanguageCriteria(profile.naturalLanguageCriteria)
    : {};

  const sector =
    profile.sectorsInclude.length === 1
      ? profile.sectorsInclude[0]
      : nl.sector ?? undefined;

  return {
    query: {
      marketCapMoreThan: Math.round(
        (nl.marketCapMinB ?? profile.marketCapMinB) * 1e9,
      ),
      marketCapLowerThan: Math.round(
        (nl.marketCapMaxB ?? profile.marketCapMaxB) * 1e9,
      ),
      priceLowerThan: nl.priceMax ?? profile.priceMax,
      betaLowerThan: nl.betaMax ?? profile.betaMax,
      dividendMoreThan:
        nl.dividendMin ?? (profile.dividendMin > 0 ? profile.dividendMin : undefined),
      volumeMoreThan: 100_000,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      sector,
      limit: 40,
    },
    ratioFilters: {
      peMax: nl.peMax ?? (profile.peMax > 0 ? profile.peMax : undefined),
      roeMin: nl.roeMinPct
        ? nl.roeMinPct / 100
        : profile.roeMinPct > 0
          ? profile.roeMinPct / 100
          : undefined,
    },
    sortBy: profile.style === "value" ? "peAsc" : "marketCapAsc",
    excludeSymbols,
  };
}

export function presetIdForStyle(style: InvestorProfile["style"]): string | undefined {
  switch (style) {
    case "income":
      return "dividend-quiet";
    case "value":
      return "value-hunters";
    case "growth":
      return "quality-compounders";
    case "learning":
      return "hidden-gems";
    default:
      return undefined;
  }
}

export function defaultProfileFromOnboarding(input: {
  style: InvestorProfile["style"];
  horizon: InvestorProfile["horizon"];
  riskComfort: InvestorProfile["riskComfort"];
  accountSize: InvestorProfile["accountSize"];
}): InvestorProfile {
  return {
    ...DEFAULT_INVESTOR_PROFILE,
    ...input,
    profileComplete: true,
    updatedAt: new Date().toISOString(),
  };
}

export { SCREENER_SECTORS };
