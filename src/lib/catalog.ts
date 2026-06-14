export type CatalogKind = "stock" | "etf";

export interface CatalogItem {
  ticker: string;
  name: string;
  kind: CatalogKind;
}

export interface CatalogRow {
  id: string;
  title: string;
  subtitle: string;
  /** Seconds for one full auto-scroll loop */
  durationSec: number;
  items: CatalogItem[];
}

/** Curated rows for the Netflix-style home dashboard. */
export const CATALOG_ROWS: CatalogRow[] = [
  {
    id: "mega-tech",
    title: "Mega Cap Tech",
    subtitle: "Household names driving the market",
    durationSec: 85,
    items: [
      { ticker: "AAPL", name: "Apple", kind: "stock" },
      { ticker: "MSFT", name: "Microsoft", kind: "stock" },
      { ticker: "GOOGL", name: "Alphabet", kind: "stock" },
      { ticker: "AMZN", name: "Amazon", kind: "stock" },
      { ticker: "META", name: "Meta", kind: "stock" },
      { ticker: "NVDA", name: "NVIDIA", kind: "stock" },
      { ticker: "TSLA", name: "Tesla", kind: "stock" },
      { ticker: "AVGO", name: "Broadcom", kind: "stock" },
    ],
  },
  {
    id: "index-etfs",
    title: "Index ETFs",
    subtitle: "Own the whole market in one ticker",
    durationSec: 95,
    items: [
      { ticker: "SPY", name: "S&P 500", kind: "etf" },
      { ticker: "QQQ", name: "Nasdaq 100", kind: "etf" },
      { ticker: "VTI", name: "Total US Market", kind: "etf" },
      { ticker: "VOO", name: "Vanguard S&P 500", kind: "etf" },
      { ticker: "IVV", name: "iShares S&P 500", kind: "etf" },
      { ticker: "DIA", name: "Dow Jones", kind: "etf" },
      { ticker: "IWM", name: "Russell 2000", kind: "etf" },
      { ticker: "RSP", name: "Equal Weight S&P", kind: "etf" },
    ],
  },
  {
    id: "sector-etfs",
    title: "Sector ETFs",
    subtitle: "Zoom in on one slice of the economy",
    durationSec: 78,
    items: [
      { ticker: "XLK", name: "Technology", kind: "etf" },
      { ticker: "XLF", name: "Financials", kind: "etf" },
      { ticker: "XLE", name: "Energy", kind: "etf" },
      { ticker: "XLV", name: "Health Care", kind: "etf" },
      { ticker: "XLY", name: "Consumer Disc.", kind: "etf" },
      { ticker: "XLI", name: "Industrials", kind: "etf" },
      { ticker: "XLU", name: "Utilities", kind: "etf" },
      { ticker: "XLRE", name: "Real Estate", kind: "etf" },
    ],
  },
  {
    id: "dividend",
    title: "Dividend & Value",
    subtitle: "Income-oriented names and funds",
    durationSec: 102,
    items: [
      { ticker: "JNJ", name: "Johnson & Johnson", kind: "stock" },
      { ticker: "PG", name: "Procter & Gamble", kind: "stock" },
      { ticker: "KO", name: "Coca-Cola", kind: "stock" },
      { ticker: "PEP", name: "PepsiCo", kind: "stock" },
      { ticker: "VZ", name: "Verizon", kind: "stock" },
      { ticker: "SCHD", name: "Schwab US Dividend", kind: "etf" },
      { ticker: "VYM", name: "High Dividend Yield", kind: "etf" },
      { ticker: "DVY", name: "iShares Select Dividend", kind: "etf" },
    ],
  },
  {
    id: "growth",
    title: "Growth & Innovation",
    subtitle: "Higher beta, faster-moving stories",
    durationSec: 72,
    items: [
      { ticker: "AMD", name: "AMD", kind: "stock" },
      { ticker: "CRM", name: "Salesforce", kind: "stock" },
      { ticker: "NFLX", name: "Netflix", kind: "stock" },
      { ticker: "SHOP", name: "Shopify", kind: "stock" },
      { ticker: "PLTR", name: "Palantir", kind: "stock" },
      { ticker: "ARKK", name: "ARK Innovation", kind: "etf" },
      { ticker: "SOXX", name: "Semiconductor", kind: "etf" },
      { ticker: "BOTZ", name: "Robotics & AI", kind: "etf" },
    ],
  },
  {
    id: "international",
    title: "International & Bonds",
    subtitle: "Global exposure and fixed income ETFs",
    durationSec: 110,
    items: [
      { ticker: "VXUS", name: "Total Intl Stock", kind: "etf" },
      { ticker: "EFA", name: "Developed Markets", kind: "etf" },
      { ticker: "EEM", name: "Emerging Markets", kind: "etf" },
      { ticker: "IEFA", name: "Core Intl Developed", kind: "etf" },
      { ticker: "BND", name: "Total Bond Market", kind: "etf" },
      { ticker: "AGG", name: "US Aggregate Bond", kind: "etf" },
      { ticker: "TLT", name: "Long-Term Treasury", kind: "etf" },
      { ticker: "HYG", name: "High Yield Corporate", kind: "etf" },
    ],
  },
  {
    id: "consumer",
    title: "Consumer & Retail",
    subtitle: "Brands you see every day",
    durationSec: 88,
    items: [
      { ticker: "WMT", name: "Walmart", kind: "stock" },
      { ticker: "COST", name: "Costco", kind: "stock" },
      { ticker: "HD", name: "Home Depot", kind: "stock" },
      { ticker: "MCD", name: "McDonald's", kind: "stock" },
      { ticker: "NKE", name: "Nike", kind: "stock" },
      { ticker: "SBUX", name: "Starbucks", kind: "stock" },
      { ticker: "DIS", name: "Disney", kind: "stock" },
      { ticker: "XRT", name: "Retail ETF", kind: "etf" },
    ],
  },
];

export function allCatalogTickers(): string[] {
  const set = new Set<string>();
  for (const row of CATALOG_ROWS) {
    for (const item of row.items) set.add(item.ticker);
  }
  return [...set];
}

/** Stable hue from ticker for tile gradients. */
export function tickerHue(ticker: string): number {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) % 360;
  return h;
}
