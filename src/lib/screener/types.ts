/** FMP /stable/company-screener query params we send server-side. */
export interface ScreenerQuery {
  marketCapMoreThan?: number;
  marketCapLowerThan?: number;
  priceMoreThan?: number;
  priceLowerThan?: number;
  betaMoreThan?: number;
  betaLowerThan?: number;
  dividendMoreThan?: number;
  volumeMoreThan?: number;
  sector?: string;
  industry?: string;
  country?: string;
  exchange?: string;
  isEtf?: boolean;
  isActivelyTrading?: boolean;
  limit?: number;
}

/** Post-filters applied after we enrich rows with TTM ratios (not in FMP screener). */
export interface RatioFilters {
  peMax?: number;
  peMin?: number;
  roeMin?: number;
  roeMax?: number;
  evEbitdaMax?: number;
}

export interface ScreenerResultRow {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  sector: string;
  industry: string;
  beta: number;
  dividend: number;
  volume: number;
  exchange: string;
  pe: number | null;
  roe: number | null;
  evEbitda: number | null;
  /** % above/below peer median P/E (positive = pricier than peers). */
  peVsIndustryPct?: number | null;
  /** % above/below peer median ROE. */
  roeVsIndustryPct?: number | null;
  /** Present on curated home dashboard carousels. */
  inCatalog?: boolean;
}

export interface ScreenerPreset {
  id: string;
  title: string;
  subtitle: string;
  learnBlurb: string;
  query: ScreenerQuery;
  ratioFilters?: RatioFilters;
  sortBy?: "marketCapAsc" | "marketCapDesc" | "peAsc";
  /** After ratio enrich, keep names unfavorable vs peers on this metric. */
  reverseMetric?: "pe" | "roe";
  reverseMinPct?: number;
}

export interface ProFilterState {
  marketCapMinB: number;
  marketCapMaxB: number;
  priceMax: number;
  betaMax: number;
  peMax: number;
  roeMinPct: number;
  sector: string;
  industry: string;
  reversePeVsIndustry: boolean;
}

export interface RatioSnapshot {
  pe: number | null;
  roe: number | null;
  evEbitda: number | null;
}

export interface ScreenerRequest {
  presetId?: string;
  query?: ScreenerQuery;
  ratioFilters?: RatioFilters;
  sortBy?: ScreenerPreset["sortBy"];
  excludeSymbols?: string[];
  reverseMetric?: "pe" | "roe";
  reverseMinPct?: number;
  /** Cap ratio enrichment calls (default 28). Discovery uses a lower cap. */
  enrichCap?: number;
  /** Dedupe ratio fetches across multiple screeners in one request. */
  ratioCache?: Map<string, RatioSnapshot>;
}

export const DEFAULT_PRO_FILTERS: ProFilterState = {
  marketCapMinB: 0.3,
  marketCapMaxB: 10,
  priceMax: 100,
  betaMax: 2,
  peMax: 25,
  roeMinPct: 0,
  sector: "",
  industry: "",
  reversePeVsIndustry: false,
};
