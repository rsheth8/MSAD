import type { NewsCategory } from "./types";

const RULES: { category: NewsCategory; keywords: string[]; why: string }[] = [
  {
    category: "earnings",
    keywords: ["earnings", "eps", "revenue beat", "revenue miss", "quarterly results", "guidance"],
    why: "Earnings reports show how the business performed — they often move the stock short-term.",
  },
  {
    category: "merger",
    keywords: ["merger", "acquisition", "acquires", "takeover", "buyout", "deal"],
    why: "M&A news can reshape a company's size, debt, and competitive position.",
  },
  {
    category: "legal",
    keywords: ["lawsuit", "sec ", "fda", "antitrust", "investigation", "fine", "regulator"],
    why: "Legal or regulatory headlines can add risk until the outcome is clear.",
  },
  {
    category: "product",
    keywords: ["launch", "unveil", "product", "chip", "iphone", "feature", "partnership"],
    why: "Product and partnership news hints at future revenue — but hype doesn't always equal profit.",
  },
  {
    category: "leadership",
    keywords: ["ceo", "cfo", "executive", "resign", "appoints", "board"],
    why: "Leadership changes can signal a new strategy — or uncertainty during a transition.",
  },
  {
    category: "macro",
    keywords: ["fed", "inflation", "rates", "tariff", "recession", "jobs report", "gdp"],
    why: "Macro news affects the whole market; your stock may move even without company-specific news.",
  },
];

const DEFAULT_WHY =
  "Headlines capture market attention — always cross-check with the fundamentals below.";

export function categorizeNews(title: string, snippet: string): { category: NewsCategory; whyItMatters: string } {
  const text = `${title} ${snippet}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return { category: rule.category, whyItMatters: rule.why };
    }
  }
  return { category: "other", whyItMatters: DEFAULT_WHY };
}

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  earnings: "Earnings",
  product: "Product",
  legal: "Legal",
  macro: "Macro",
  merger: "M&A",
  leadership: "Leadership",
  other: "News",
};
