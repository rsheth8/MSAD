/**
 * The user's progress — the "spine" that connects learning to real decisions.
 * Stored locally first (works for guests); synced to their account when signed
 * in. This is what makes MSAD a place you *build* something over time, not just
 * another read-only quote screen.
 */

import type {
  InvestorProfile,
  MockHolding,
  ResearchQueueItem,
} from "@/lib/discovery/types";

export type Conviction = 1 | 2 | 3 | 4 | 5;
export type JournalOutcome = "right" | "wrong" | "mixed" | "too-early";

/** A logged investment thesis — captured BEFORE acting, reviewed later. */
export interface JournalEntry {
  id: string;
  ticker: string;
  createdAt: string; // ISO
  thesis: string;
  /** 1 = hunch, 5 = high conviction */
  conviction: Conviction;
  /** free text, e.g. "3 months", "next earnings" */
  horizon: string;
  /** the pre-commitment that fights hindsight bias */
  changeMyMind: string;
  priceAtEntry?: number;
  /** optional AI critique of the reasoning quality, cached from the Lens */
  aiCritique?: string;
  // --- review (filled at look-back time) ---
  reviewedAt?: string;
  outcome?: JournalOutcome;
  reviewNote?: string;
}

export type PredictionKind = "direction" | "earnings" | "custom";

/** A falsifiable forecast the user scores themselves on — builds calibration. */
export interface Prediction {
  id: string;
  ticker: string;
  createdAt: string;
  question: string;
  kind: PredictionKind;
  horizonDays: number;
  resolveOn: string; // ISO date
  /** probability (0.5–1.0) assigned to the "yes" outcome */
  confidence: number;
  // --- resolution ---
  resolved: boolean;
  /** true if "yes" happened */
  outcome?: boolean;
  resolvedAt?: string;
}

export interface UserPreferences {
  theme?: "light" | "dark";
  accent?: string;
  sound?: boolean;
  onboardingDone?: boolean;
  learningPath?: boolean;
  depth?: number;
}

export interface UserProfile {
  version: number;
  journal: JournalEntry[];
  predictions: Prediction[];
  watchlist?: string[];
  savedScreens?: Array<{
    id: string;
    name: string;
    createdAt: string;
    filters: Record<string, unknown>;
  }>;
  preferences?: UserPreferences;
  /** Personalized discovery criteria — not buy/sell advice. */
  investorProfile?: InvestorProfile;
  /** Practice portfolio for gap-filling and impact previews. */
  mockPortfolio?: MockHolding[];
  /** Passive research queue — names worth a closer look for this user. */
  researchQueue?: ResearchQueueItem[];
  /** Shortlist for side-by-side compare. */
  researchShortlist?: string[];
  /** Last time the user opened their dashboard (passive digest). */
  lastDashboardVisit?: string;
  /** Last time the research queue was refreshed. */
  queueRefreshedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const PROFILE_VERSION = 3;

export function emptyProfile(): UserProfile {
  const now = new Date().toISOString();
  return {
    version: PROFILE_VERSION,
    journal: [],
    predictions: [],
    watchlist: [],
    savedScreens: [],
    preferences: {},
    mockPortfolio: [],
    researchQueue: [],
    researchShortlist: [],
    createdAt: now,
    updatedAt: now,
  };
}

export type { InvestorProfile, MockHolding, ResearchQueueItem };
