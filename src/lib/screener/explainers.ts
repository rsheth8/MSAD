import type { ExplainerContent } from "@/lib/explanations";

export const FILTER_EXPLAINERS: Record<string, ExplainerContent> = {
  marketCapMin: {
    title: "Market cap minimum",
    what: "The smallest company size (in dollars) you want to see. Market cap = share price × shares outstanding.",
    meaning: "Higher minimums skip tiny micro-caps; lower minimums include more obscure names.",
    watch: "Very small caps can be illiquid or volatile — check volume too.",
  },
  marketCapMax: {
    title: "Market cap maximum",
    what: "The largest company size you want in results. Caps how “big” a stock can be.",
    meaning: "A low max (e.g. $10B) avoids mega-caps like Apple — great for discovery.",
    watch: "Mid-caps can still be well-known in their niche.",
  },
  priceMax: {
    title: "Max share price",
    what: "Filters out stocks above a certain price per share.",
    meaning: "Useful for small accounts or mental math — but price per share does not mean cheap valuation.",
    watch: "A $20 stock can be more expensive than a $200 stock on P/E or market cap.",
  },
  betaMax: {
    title: "Maximum beta",
    what: "Beta measures how much a stock tends to move vs the overall market (1 = market-like).",
    meaning: "Lower beta caps find steadier names; higher beta allows more volatile movers.",
    watch: "Low beta ≠ safe — it’s about movement, not business quality.",
  },
  peMax: {
    title: "Maximum P/E",
    what: "Price-to-earnings — how much you pay per $1 of yearly profit.",
    meaning: "A lower max finds stocks that look cheaper on earnings.",
    watch: "Low P/E can mean a bargain or a troubled business — read the report.",
  },
  roeMin: {
    title: "Minimum ROE",
    what: "Return on equity — profit generated from shareholder money.",
    meaning: "Higher ROE often signals efficient, profitable businesses.",
    watch: "ROE can be inflated by debt — check the balance sheet on the report.",
  },
  sector: {
    title: "Sector",
    what: "Broad industry group (Technology, Healthcare, etc.).",
    meaning: "Narrows discovery to one part of the economy.",
    watch: "Sector filters still leave many stocks — combine with market cap.",
  },
  industry: {
    title: "Industry",
    what: "A finer slice than sector — e.g. Software within Technology.",
    meaning: "Finds specialists in a niche rather than whole sectors.",
    watch: "Industry names vary by data provider — try sector first if empty.",
  },
  reversePe: {
    title: "Pricier than peers (reverse P/E)",
    what: "Keeps stocks whose P/E is meaningfully above their industry peer average.",
    meaning: "Surfaces names that may be richly valued vs competitors — for watchlists, not buys.",
    watch: "High P/E can be justified by growth — always read the full report.",
  },
  exclude: {
    title: "Exclude tickers",
    what: "Hide symbols you already know (AAPL, MSFT, etc.) so results feel fresh.",
    meaning: "Your personal “I’ve seen this” list — stored only in your browser.",
    watch: "Exclusions apply to every screen until you remove them.",
  },
};
