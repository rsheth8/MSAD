/** Personalized discovery — criteria fit, not buy/sell advice. */

export type InvestingStyle = "learning" | "income" | "growth" | "value" | "balanced";
export type InvestingHorizon = "short" | "medium" | "long";
export type RiskComfort = "calm" | "moderate" | "aggressive";
export type AccountSize = "small" | "medium" | "large";

/** How the user invests — powers screener defaults and match scoring. */
export interface InvestorProfile {
  style: InvestingStyle;
  horizon: InvestingHorizon;
  riskComfort: RiskComfort;
  accountSize: AccountSize;
  marketCapMinB: number;
  marketCapMaxB: number;
  priceMax: number;
  betaMax: number;
  peMax: number;
  roeMinPct: number;
  /** Minimum dividend yield (decimal, e.g. 0.015 = 1.5%). */
  dividendMin: number;
  sectorsInclude: string[];
  sectorsExclude: string[];
  /** Free-text criteria the user typed — parsed alongside sliders. */
  naturalLanguageCriteria?: string;
  profileComplete?: boolean;
  updatedAt?: string;
}

export interface MockHolding {
  ticker: string;
  weight: number;
}

export type QueueSource = "profile" | "screen" | "gap" | "peer" | "manual";

export interface ResearchQueueItem {
  symbol: string;
  name: string;
  addedAt: string;
  source: QueueSource;
  matchScore: number;
  matchReasons: string[];
  sector?: string;
  screenName?: string;
}

export interface PortfolioImpact {
  ticker: string;
  sector: string;
  beta: number;
  currentPortfolioBeta: number | null;
  projectedPortfolioBeta: number | null;
  sectorWeightBefore: number | null;
  sectorWeightAfter: number | null;
  alreadyHeld: boolean;
  concentrationWarning: string | null;
  isMock: boolean;
}

export interface DiscoveryRefreshResult {
  queue: ResearchQueueItem[];
  humilityNote: string | null;
  gapSectors: string[];
  isMock: boolean;
  asOf: string;
}
