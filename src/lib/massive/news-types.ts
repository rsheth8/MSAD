/** Partial Massive (Polygon) `/v2/reference/news` shapes. */

export interface MassiveInsight {
  ticker: string;
  /** Benzinga-derived per-ticker sentiment. */
  sentiment: "positive" | "neutral" | "negative";
  sentiment_reasoning: string;
}

export interface MassivePublisher {
  name: string;
  homepage_url?: string;
  logo_url?: string;
  favicon_url?: string;
}

export interface MassiveNewsRow {
  id: string;
  publisher?: MassivePublisher;
  title?: string;
  author?: string;
  published_utc?: string;
  article_url?: string;
  tickers?: string[];
  image_url?: string;
  description?: string;
  keywords?: string[];
  insights?: MassiveInsight[];
}

export interface MassiveNewsResponse {
  results?: MassiveNewsRow[];
  status?: string;
  /** Absolute URL (carries an opaque `cursor`) for the next page. */
  next_url?: string;
  count?: number;
}
