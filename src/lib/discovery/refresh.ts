import { runScreener } from "@/lib/screener/run";
import type { RatioSnapshot, ScreenerResultRow } from "@/lib/screener/types";
import { fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";
import type { FmpProfile } from "@/lib/fmp/types";
import { underweightSectors } from "./gap";
import { discoveryHumilityNote } from "./humility";
import { normalizeInvestorProfile } from "./investor-profile";
import { scoreMatch, topMatchReasons } from "./match";
import { presetIdForStyle, profileToScreenerRequest } from "./profile-to-screener";
import type { DiscoveryRefreshResult, InvestorProfile, MockHolding, ResearchQueueItem } from "./types";
import type { JournalEntry, Prediction } from "@/lib/profile/types";

const MAX_QUEUE = 20;
/** Lower enrichment cap for discovery — multiple screeners run per refresh. */
const DISCOVERY_ENRICH_CAP = 10;

function toQueueItem(
  row: ScreenerResultRow,
  profile: InvestorProfile,
  source: ResearchQueueItem["source"],
  screenName?: string,
): ResearchQueueItem {
  const match = scoreMatch(row, profile);
  return {
    symbol: row.symbol,
    name: row.name,
    addedAt: new Date().toISOString(),
    source,
    matchScore: match.score,
    matchReasons: topMatchReasons(match),
    sector: row.sector,
    screenName,
  };
}

function mergeQueue(items: ResearchQueueItem[]): ResearchQueueItem[] {
  const map = new Map<string, ResearchQueueItem>();
  for (const item of items) {
    const existing = map.get(item.symbol);
    if (!existing || item.matchScore > existing.matchScore) {
      map.set(item.symbol, item);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, MAX_QUEUE);
}

async function sectorForTicker(ticker: string, isMock: boolean): Promise<string | null> {
  if (isMock) return "Technology";
  try {
    const profile = await fmpFetch<FmpProfile[]>("/profile", { symbol: ticker });
    return profile[0]?.industry ?? null;
  } catch {
    return null;
  }
}

async function peerScreen(
  anchor: string,
  profile: InvestorProfile,
  excludeSymbols: string[],
  isMock: boolean,
  ratioCache: Map<string, RatioSnapshot>,
): Promise<ResearchQueueItem[]> {
  const sector = await sectorForTicker(anchor, isMock);
  if (!sector) return [];

  const result = await runScreener({
    query: {
      sector,
      marketCapMoreThan: Math.round(profile.marketCapMinB * 1e9),
      marketCapLowerThan: Math.round(profile.marketCapMaxB * 1e9),
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      limit: 15,
    },
    excludeSymbols: [...excludeSymbols, anchor],
    sortBy: "marketCapAsc",
    enrichCap: DISCOVERY_ENRICH_CAP,
    ratioCache,
  });

  return result.rows
    .filter((r) => r.symbol !== anchor.toUpperCase())
    .slice(0, 4)
    .map((r) => toQueueItem(r, profile, "peer", `Similar to ${anchor}`));
}

async function gapScreen(
  sector: string,
  profile: InvestorProfile,
  excludeSymbols: string[],
  ratioCache: Map<string, RatioSnapshot>,
): Promise<ResearchQueueItem[]> {
  const result = await runScreener({
    query: {
      sector,
      marketCapMoreThan: Math.round(profile.marketCapMinB * 1e9),
      marketCapLowerThan: Math.round(profile.marketCapMaxB * 1e9),
      betaLowerThan: profile.betaMax,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      limit: 8,
    },
    ratioFilters: profile.peMax > 0 ? { peMax: profile.peMax } : undefined,
    excludeSymbols,
    sortBy: "marketCapAsc",
    enrichCap: DISCOVERY_ENRICH_CAP,
    ratioCache,
  });

  return result.rows
    .slice(0, 3)
    .map((r) => toQueueItem(r, profile, "gap", `Diversify into ${sector}`));
}

export interface RefreshInput {
  investorProfile?: Partial<InvestorProfile> | null;
  mockPortfolio?: MockHolding[];
  watchlist?: string[];
  journalTickers?: string[];
  predictions?: Prediction[];
  journal?: JournalEntry[];
  excludeSymbols?: string[];
  holdingSectors?: { ticker: string; sector: string; weight: number }[];
}

export async function buildResearchQueue(input: RefreshInput): Promise<DiscoveryRefreshResult> {
  const profile = normalizeInvestorProfile(input.investorProfile);
  const exclude = new Set(
    (input.excludeSymbols ?? []).map((s) => s.toUpperCase()),
  );
  for (const h of input.mockPortfolio ?? []) exclude.add(h.ticker.toUpperCase());

  const excludeList = [...exclude];
  const items: ResearchQueueItem[] = [];
  const isMock = !hasFmpApiKey();
  const ratioCache = new Map<string, RatioSnapshot>();
  const screenerOpts = { enrichCap: DISCOVERY_ENRICH_CAP, ratioCache };

  const profileScreen = await runScreener({
    ...profileToScreenerRequest(profile, excludeList),
    ...screenerOpts,
  });
  items.push(
    ...profileScreen.rows
      .slice(0, 12)
      .map((r) => toQueueItem(r, profile, "profile", "Your criteria")),
  );

  const presetId = presetIdForStyle(profile.style);
  if (presetId) {
    const presetScreen = await runScreener({ presetId, excludeSymbols: excludeList, ...screenerOpts });
    items.push(
      ...presetScreen.rows
        .slice(0, 6)
        .map((r) => toQueueItem(r, profile, "screen", presetScreen.presetTitle)),
    );
  }

  const holdingSectors = input.holdingSectors ?? [];
  const gaps = underweightSectors(holdingSectors);
  for (const sector of gaps.slice(0, 2)) {
    items.push(...(await gapScreen(sector, profile, excludeList, ratioCache)));
  }

  const anchors = [
    ...(input.watchlist ?? []).slice(0, 2),
    ...(input.journalTickers ?? []).slice(0, 2),
  ];
  const uniqueAnchors = [...new Set(anchors.map((t) => t.toUpperCase()))].slice(0, 2);
  for (const anchor of uniqueAnchors) {
    items.push(...(await peerScreen(anchor, profile, excludeList, isMock, ratioCache)));
  }

  const queue = mergeQueue(items);
  const humilityNote = discoveryHumilityNote(
    input.predictions ?? [],
    input.journal ?? [],
  );

  return {
    queue,
    humilityNote,
    gapSectors: gaps,
    isMock: isMock || profileScreen.isMock,
    asOf: new Date().toISOString(),
  };
}
