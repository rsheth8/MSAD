/** Advanced stock explorer (/explore) — richer than the curated /discover screen. */

export interface ExploreFilters {
  // ── Native (FMP company-screener, applied server-side) ──
  marketCapMinB?: number;
  marketCapMaxB?: number;
  priceMin?: number;
  priceMax?: number;
  betaMax?: number;
  volumeMin?: number;
  /** Last annual dividend in $ (a quick "pays a dividend" gate). */
  dividendMin?: number;
  sectors?: string[];
  industry?: string;
  exchanges?: string[];
  includeEtfs?: boolean;

  // ── Enriched (post-filter from ratios-ttm + key-metrics-ttm) ──
  peMin?: number;
  peMax?: number;
  roeMinPct?: number;
  evEbitdaMax?: number;
  pbMax?: number;
  psMax?: number;
  debtToEquityMax?: number;
  netMarginMinPct?: number;
  divYieldMinPct?: number;
  pegMax?: number;
}

export type ExploreSortKey =
  | "marketCap"
  | "price"
  | "pe"
  | "roe"
  | "pb"
  | "ps"
  | "debtToEquity"
  | "netMargin"
  | "divYield"
  | "peg"
  | "evEbitda"
  | "beta";

export interface ExploreRequest {
  filters: ExploreFilters;
  sortKey?: ExploreSortKey;
  sortDir?: "asc" | "desc";
  excludeSymbols?: string[];
}

export interface ExploreRow {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  sector: string;
  industry: string;
  beta: number;
  volume: number;
  exchange: string;
  pe: number | null;
  roe: number | null; // ratio (0.21 = 21%)
  evEbitda: number | null;
  pb: number | null;
  ps: number | null;
  debtToEquity: number | null;
  netMargin: number | null; // ratio
  divYield: number | null; // ratio
  peg: number | null;
}

export interface ExploreResult {
  rows: ExploreRow[];
  /** Candidates returned by the native screener before enrichment. */
  scanned: number;
  /** How many candidates we pulled ratios for (capped for cost). */
  enriched: number;
  /** True when more candidates existed than we could enrich — results are a top slice. */
  truncated: boolean;
  isMock: boolean;
  asOf: string;
}

/** Did the user ask for anything that requires per-symbol ratio enrichment? */
export function needsEnrichment(f: ExploreFilters, sortKey?: ExploreSortKey): boolean {
  const enrichedSort: ExploreSortKey[] = [
    "pe",
    "roe",
    "pb",
    "ps",
    "debtToEquity",
    "netMargin",
    "divYield",
    "peg",
    "evEbitda",
  ];
  return (
    f.peMin != null ||
    f.peMax != null ||
    f.roeMinPct != null ||
    f.evEbitdaMax != null ||
    f.pbMax != null ||
    f.psMax != null ||
    f.debtToEquityMax != null ||
    f.netMarginMinPct != null ||
    f.divYieldMinPct != null ||
    f.pegMax != null ||
    (sortKey != null && enrichedSort.includes(sortKey))
  );
}
