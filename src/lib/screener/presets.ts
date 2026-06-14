import type { ScreenerPreset } from "./types";

/** Curated screens — plain language for beginners, precise params under the hood. */
export const SCREENER_PRESETS: ScreenerPreset[] = [
  {
    id: "hidden-gems",
    title: "Hidden gems",
    subtitle: "Mid-sized US companies — not mega-cap household names",
    learnBlurb:
      "Finds stocks between roughly $500M and $10B in market cap with decent trading volume. Big enough to be real businesses, small enough you may not know them yet.",
    query: {
      marketCapMoreThan: 500_000_000,
      marketCapLowerThan: 10_000_000_000,
      volumeMoreThan: 150_000,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      limit: 40,
    },
    sortBy: "marketCapAsc",
  },
  {
    id: "micro-cap",
    title: "Micro-cap explorers",
    subtitle: "Very small public companies — higher risk, higher discovery potential",
    learnBlurb:
      "Market cap under ~$500M. These names are often under-followed. Treat as a research starting list, not a buy list.",
    query: {
      marketCapMoreThan: 50_000_000,
      marketCapLowerThan: 500_000_000,
      volumeMoreThan: 50_000,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      limit: 35,
    },
    sortBy: "marketCapAsc",
  },
  {
    id: "value-hunters",
    title: "Value hunters",
    subtitle: "Lower P/E names among small & mid caps",
    learnBlurb:
      "Starts with sub-$10B companies, then keeps only those with P/E below 18. Cheap on paper — check why before getting excited.",
    query: {
      marketCapMoreThan: 300_000_000,
      marketCapLowerThan: 10_000_000_000,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      limit: 50,
    },
    ratioFilters: { peMax: 18, peMin: 3 },
    sortBy: "peAsc",
  },
  {
    id: "quality-compounders",
    title: "Quality compounders",
    subtitle: "Strong ROE among mid caps",
    learnBlurb:
      "Mid-sized companies with return on equity above 15%. Often signals efficient use of shareholder money — still verify the business story.",
    query: {
      marketCapMoreThan: 500_000_000,
      marketCapLowerThan: 25_000_000_000,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      limit: 45,
    },
    ratioFilters: { roeMin: 0.15 },
    sortBy: "marketCapAsc",
  },
  {
    id: "dividend-quiet",
    title: "Dividend quiet names",
    subtitle: "Yield-focused, not the usual mega-cap payers",
    learnBlurb:
      "Pays a dividend, market cap under $50B — skips the obvious AAPL/JNJ tier. Income-oriented discovery, not advice.",
    query: {
      dividendMoreThan: 0.015,
      marketCapMoreThan: 500_000_000,
      marketCapLowerThan: 50_000_000_000,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      limit: 40,
    },
    sortBy: "marketCapAsc",
  },
  {
    id: "under-50",
    title: "Under $50/share",
    subtitle: "Affordable share price — good for learning position sizing",
    learnBlurb:
      "Share price below $50 with at least ~$300M market cap. Price per share ≠ cheap valuation, but it's a practical filter for small accounts.",
    query: {
      priceLowerThan: 50,
      marketCapMoreThan: 300_000_000,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      limit: 40,
    },
    sortBy: "marketCapAsc",
  },
  {
    id: "low-volatility",
    title: "Steadier movers",
    subtitle: "Beta below 1 — tends to move less than the market",
    learnBlurb:
      "Beta under 1 often means the stock swings less than the S&P 500. Useful if you want calmer names to study first.",
    query: {
      betaLowerThan: 1,
      marketCapMoreThan: 1_000_000_000,
      marketCapLowerThan: 100_000_000_000,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      limit: 35,
    },
    sortBy: "marketCapDesc",
  },
  {
    id: "tech-mid",
    title: "Mid-cap tech",
    subtitle: "Technology sector, not the Magnificent Seven",
    learnBlurb:
      "US technology stocks between ~$1B and $30B market cap — where innovation stories often hide below NVDA/MSFT headlines.",
    query: {
      sector: "Technology",
      marketCapMoreThan: 1_000_000_000,
      marketCapLowerThan: 30_000_000_000,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      limit: 40,
    },
    sortBy: "marketCapAsc",
  },
  {
    id: "pricier-than-peers",
    title: "Pricier than peers",
    subtitle: "Reverse screen — P/E above industry median (watch list, not buys)",
    learnBlurb:
      "Mid-cap names trading at a higher P/E than their peer group. Useful for spotting crowded or richly valued stories — then dig into why on the full report.",
    query: {
      marketCapMoreThan: 500_000_000,
      marketCapLowerThan: 25_000_000_000,
      volumeMoreThan: 100_000,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      limit: 35,
    },
    reverseMetric: "pe",
    reverseMinPct: 10,
    sortBy: "marketCapAsc",
  },
  {
    id: "weaker-roe-peers",
    title: "Weaker ROE vs peers",
    subtitle: "Reverse screen — return on equity below industry median",
    learnBlurb:
      "Companies earning less profit on shareholder money than their peers. A starting point for turnaround research — not a sell signal by itself.",
    query: {
      marketCapMoreThan: 500_000_000,
      marketCapLowerThan: 20_000_000_000,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      limit: 35,
    },
    reverseMetric: "roe",
    reverseMinPct: 8,
    sortBy: "marketCapAsc",
  },
];

export const SCREENER_SECTORS = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Consumer Cyclical",
  "Consumer Defensive",
  "Industrials",
  "Energy",
  "Utilities",
  "Real Estate",
  "Basic Materials",
  "Communication Services",
] as const;

export function getPreset(id: string): ScreenerPreset | undefined {
  return SCREENER_PRESETS.find((p) => p.id === id);
}

export function formatMarketCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}
