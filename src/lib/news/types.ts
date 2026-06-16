/** Shared news & sentiment contracts for the UI and API layer. */

export type NewsCategory =
  | "earnings"
  | "product"
  | "legal"
  | "macro"
  | "merger"
  | "leadership"
  | "other";

export type AnalystConsensusLabel =
  | "Strong Buy"
  | "Buy"
  | "Hold"
  | "Sell"
  | "Strong Sell"
  | "No coverage";

export type MoodLabel = "bullish" | "neutral" | "bearish";

export interface NewsArticle {
  title: string;
  snippet: string;
  url: string;
  source: string;
  publishedAt: string;
  tickers: string[];
  category: NewsCategory;
  /** Plain-English hint for beginners (Learn mode). */
  whyItMatters: string;
  /** Per-article mood when the provider supplies it (Massive insights). */
  sentiment?: MoodLabel | null;
  /** Lead image when available. */
  imageUrl?: string | null;
}

export interface AnalystGrade {
  date: string;
  firm: string;
  previousGrade: string | null;
  newGrade: string;
  action: "upgrade" | "downgrade" | "maintain" | "initiate" | "other";
}

export interface AnalystConsensus {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  consensus: AnalystConsensusLabel;
  mood: MoodLabel;
}

export interface SocialSentiment {
  /** -1..1 composite from StockTwits + Twitter when available */
  score: number;
  mood: MoodLabel;
  stocktwitsPosts: number | null;
  twitterPosts: number | null;
  /** week-over-week change in bullish share, when available */
  changePct: number | null;
  source: "stocktwits" | "mixed";
}

export interface NewsDigest {
  ticker: string;
  articles: NewsArticle[];
  analyst: AnalystConsensus | null;
  recentGrades: AnalystGrade[];
  social: SocialSentiment | null;
  /** One-line summary for strips and Learn mode. */
  summary: string;
  asOf: string;
  isMock: boolean;
}

export interface MarketNewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  tickers: string[];
  category: NewsCategory;
}

export interface MarketPulsePayload {
  headlines: MarketNewsItem[];
  asOf: string;
  isMock: boolean;
}

export interface NewsTension {
  headline: string;
  detail: string;
  kind: "aligned" | "divergent" | "quiet";
}

/** Which upstream actually served a feed response. */
export type NewsProvider = "massive" | "fmp" | "mock";

/** Filters the `/news` hub can send to `/api/news/feed`. */
export interface NewsFeedQuery {
  /** Free-text keyword match (applied client-side over the fetched page). */
  q?: string;
  ticker?: string;
  category?: NewsCategory;
  sentiment?: MoodLabel;
  limit?: number;
  /** Opaque pagination cursor (Massive `next_url`). */
  cursor?: string;
}

export interface NewsFeedResult {
  articles: NewsArticle[];
  nextCursor: string | null;
  provider: NewsProvider;
  asOf: string;
  isMock: boolean;
}
