import { fmpFetch, FMP_V4_BASE, hasFmpApiKey } from "@/lib/fmp/client";
import { hasMassiveApiKey, massiveFetch } from "@/lib/massive/client";
import type {
  FmpGradeRow,
  FmpGradesConsensusRow,
  FmpSocialSentimentRow,
  FmpStockNewsRow,
} from "@/lib/fmp/news-types";
import type { MassiveNewsResponse, MassiveNewsRow } from "@/lib/massive/news-types";
import { buildDigestSummary, moodFromScore } from "@/lib/news/analysis";
import { categorizeNews } from "@/lib/news/categorize";
import type {
  AnalystConsensus,
  AnalystConsensusLabel,
  AnalystGrade,
  MarketNewsItem,
  MarketPulsePayload,
  MoodLabel,
  NewsArticle,
  NewsDigest,
  NewsFeedQuery,
  NewsFeedResult,
  SocialSentiment,
} from "@/lib/news/types";
import { getMockNewsDigest, getMockMarketPulse } from "@/lib/mock-news";

const MAX_ARTICLES = 10;
const MAX_GRADES = 6;

function normalizeTicker(raw: string): string {
  return raw.toUpperCase().trim();
}

function parseTickers(symbol?: string): string[] {
  if (!symbol) return [];
  return symbol
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

function normalizeAction(raw?: string): AnalystGrade["action"] {
  const a = (raw ?? "").toLowerCase();
  if (a.includes("upgrade")) return "upgrade";
  if (a.includes("downgrade")) return "downgrade";
  if (a.includes("init")) return "initiate";
  if (a.includes("maintain") || a.includes("reiterat")) return "maintain";
  return "other";
}

function consensusLabel(raw?: string): AnalystConsensusLabel {
  const c = (raw ?? "").trim();
  const allowed: AnalystConsensusLabel[] = [
    "Strong Buy",
    "Buy",
    "Hold",
    "Sell",
    "Strong Sell",
  ];
  const hit = allowed.find((x) => x.toLowerCase() === c.toLowerCase());
  return hit ?? "No coverage";
}

function consensusMood(row: FmpGradesConsensusRow): MoodLabel {
  const strongBuy = row.strongBuy ?? 0;
  const buy = row.buy ?? 0;
  const hold = row.hold ?? 0;
  const sell = row.sell ?? 0;
  const strongSell = row.strongSell ?? 0;
  const total = strongBuy + buy + hold + sell + strongSell;
  if (total === 0) return "neutral";
  const bullish = (strongBuy * 2 + buy) / total;
  const bearish = (strongSell * 2 + sell) / total;
  if (bullish >= 0.55) return "bullish";
  if (bearish >= 0.45) return "bearish";
  return "neutral";
}

function mapArticle(row: FmpStockNewsRow, fallbackTicker: string): NewsArticle | null {
  if (!row.title || !row.url) return null;
  const snippet = (row.text ?? "").slice(0, 280);
  const { category, whyItMatters } = categorizeNews(row.title, snippet);
  return {
    title: row.title,
    snippet,
    url: row.url,
    source: row.site ?? "News",
    publishedAt: row.publishedDate ?? new Date().toISOString(),
    tickers: parseTickers(row.symbol).length ? parseTickers(row.symbol) : [fallbackTicker],
    category,
    whyItMatters,
  };
}

function dedupeArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  const out: NewsArticle[] = [];
  for (const a of articles) {
    const key = a.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out.sort((x, y) => y.publishedAt.localeCompare(x.publishedAt));
}

function mapConsensus(rows: FmpGradesConsensusRow[]): AnalystConsensus | null {
  const row = rows[0];
  if (!row) return null;
  const strongBuy = row.strongBuy ?? 0;
  const buy = row.buy ?? 0;
  const hold = row.hold ?? 0;
  const sell = row.sell ?? 0;
  const strongSell = row.strongSell ?? 0;
  if (strongBuy + buy + hold + sell + strongSell === 0) return null;
  return {
    strongBuy,
    buy,
    hold,
    sell,
    strongSell,
    consensus: consensusLabel(row.consensus),
    mood: consensusMood(row),
  };
}

function mapGrades(rows: FmpGradeRow[]): AnalystGrade[] {
  return (rows ?? [])
    .filter((r) => r.newGrade && r.date)
    .map((r) => ({
      date: r.date!,
      firm: r.gradingCompany ?? "Analyst",
      previousGrade: r.previousGrade ?? null,
      newGrade: r.newGrade!,
      action: normalizeAction(r.action),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_GRADES);
}

function mapSocial(rows: FmpSocialSentimentRow[]): SocialSentiment | null {
  const latest = rows[0];
  const prev = rows[1];
  if (!latest) return null;

  const st = latest.stocktwitsSentiment;
  const tw = latest.twitterSentiment;
  let score = 0;
  let count = 0;
  if (st != null) {
    score += st;
    count++;
  }
  if (tw != null) {
    score += tw;
    count++;
  }
  if (count === 0) return null;
  score /= count;

  let changePct: number | null = null;
  if (prev) {
    const prevSt = prev.stocktwitsSentiment;
    const prevTw = prev.twitterSentiment;
    let prevScore = 0;
    let prevCount = 0;
    if (prevSt != null) {
      prevScore += prevSt;
      prevCount++;
    }
    if (prevTw != null) {
      prevScore += prevTw;
      prevCount++;
    }
    if (prevCount > 0) {
      changePct = Math.round((score - prevScore / prevCount) * 1000) / 10;
    }
  }

  return {
    score,
    mood: moodFromScore(score),
    stocktwitsPosts: latest.stocktwitsPosts ?? null,
    twitterPosts: latest.twitterPosts ?? null,
    changePct,
    source: "mixed",
  };
}

export async function getNewsDigest(rawTicker: string): Promise<NewsDigest> {
  const ticker = normalizeTicker(rawTicker);
  if (!ticker) throw new Error("Ticker is required");
  if (!hasFmpApiKey()) return getMockNewsDigest(ticker);

  const [newsRows, consensusRows, gradeRows, socialRows] = await Promise.all([
    fmpFetch<FmpStockNewsRow[]>("/news/stock", { symbols: ticker, limit: MAX_ARTICLES }).catch(
      () => [] as FmpStockNewsRow[],
    ),
    fmpFetch<FmpGradesConsensusRow[]>("/grades-consensus", { symbol: ticker }).catch(
      () => [] as FmpGradesConsensusRow[],
    ),
    fmpFetch<FmpGradeRow[]>("/grades", { symbol: ticker }).catch(() => [] as FmpGradeRow[]),
    fmpFetch<FmpSocialSentimentRow[]>(
      "/historical/social-sentiment",
      { symbol: ticker, page: 0 },
      FMP_V4_BASE,
    ).catch(() => [] as FmpSocialSentimentRow[]),
  ]);

  const articles = dedupeArticles(
    (newsRows ?? [])
      .map((r) => mapArticle(r, ticker))
      .filter((a): a is NewsArticle => a !== null),
  ).slice(0, MAX_ARTICLES);

  const analyst = mapConsensus(consensusRows ?? []);
  const recentGrades = mapGrades(gradeRows ?? []);
  const social = mapSocial(socialRows ?? []);

  const digest: NewsDigest = {
    ticker,
    articles,
    analyst,
    recentGrades,
    social,
    summary: "",
    asOf: new Date().toISOString(),
    isMock: false,
  };
  digest.summary = buildDigestSummary(digest);
  return digest;
}

// ── Multi-asset feed (Massive → FMP → mock) ────────────────────────────────

const FEED_DEFAULT_LIMIT = 24;
const FEED_MAX_LIMIT = 50;
/** Over-fetch when filtering client-side so a page still fills after filters. */
const FEED_FETCH_LIMIT = 100;

function moodFromInsight(sentiment?: string): MoodLabel {
  if (sentiment === "positive") return "bullish";
  if (sentiment === "negative") return "bearish";
  return "neutral";
}

function mapMassiveArticle(row: MassiveNewsRow, focusTicker?: string): NewsArticle | null {
  if (!row.title || !row.article_url) return null;
  const snippet = (row.description ?? "").slice(0, 280);
  const keywords = (row.keywords ?? []).join(" ");
  const { category, whyItMatters } = categorizeNews(row.title, `${snippet} ${keywords}`);
  const tickers = (row.tickers ?? []).map((t) => t.toUpperCase());
  const insights = row.insights ?? [];
  const focusInsight = focusTicker
    ? insights.find((i) => i.ticker.toUpperCase() === focusTicker)
    : undefined;
  const insight = focusInsight ?? insights[0];
  return {
    title: row.title,
    snippet,
    url: row.article_url,
    source: row.publisher?.name ?? "News",
    publishedAt: row.published_utc ?? new Date().toISOString(),
    tickers: tickers.length ? tickers : focusTicker ? [focusTicker] : [],
    category,
    whyItMatters,
    sentiment: insight ? moodFromInsight(insight.sentiment) : null,
    imageUrl: row.image_url ?? null,
  };
}

function extractCursor(nextUrl?: string): string | null {
  if (!nextUrl) return null;
  try {
    return new URL(nextUrl).searchParams.get("cursor");
  } catch {
    return null;
  }
}

/** Post-fetch filtering shared across providers (Massive has no keyword search). */
function applyFeedFilters(articles: NewsArticle[], query: NewsFeedQuery): NewsArticle[] {
  let out = articles;
  if (query.category) out = out.filter((a) => a.category === query.category);
  if (query.sentiment) out = out.filter((a) => a.sentiment === query.sentiment);
  if (query.ticker) {
    const t = query.ticker.toUpperCase();
    out = out.filter((a) => a.tickers.includes(t));
  }
  if (query.q) {
    const needle = query.q.toLowerCase();
    out = out.filter((a) => `${a.title} ${a.snippet}`.toLowerCase().includes(needle));
  }
  return out;
}

export async function getNewsFeed(query: NewsFeedQuery): Promise<NewsFeedResult> {
  const limit = Math.min(Math.max(query.limit ?? FEED_DEFAULT_LIMIT, 1), FEED_MAX_LIMIT);
  const ticker = query.ticker ? normalizeTicker(query.ticker) : undefined;
  const needsClientFilter = Boolean(query.q || query.category || query.sentiment);
  const asOf = () => new Date().toISOString();

  if (hasMassiveApiKey()) {
    try {
      const resp = await massiveFetch<MassiveNewsResponse>("/v2/reference/news", {
        order: "desc",
        sort: "published_utc",
        limit: needsClientFilter ? FEED_FETCH_LIMIT : limit,
        ticker,
        cursor: query.cursor,
      });
      const mapped = (resp.results ?? [])
        .map((r) => mapMassiveArticle(r, ticker))
        .filter((a): a is NewsArticle => a !== null);
      const filtered = applyFeedFilters(mapped, query);
      return {
        articles: filtered.slice(0, limit),
        // Only paginate when the server already returned the full set (no client filter).
        nextCursor: needsClientFilter ? null : extractCursor(resp.next_url),
        provider: "massive",
        asOf: asOf(),
        isMock: false,
      };
    } catch {
      // fall through to FMP / mock
    }
  }

  if (hasFmpApiKey()) {
    const rows = ticker
      ? await fmpFetch<FmpStockNewsRow[]>("/news/stock", { symbols: ticker, limit: 50 }).catch(
          () => [] as FmpStockNewsRow[],
        )
      : await fmpFetch<FmpStockNewsRow[]>("/news/stock-latest", { page: 0, limit: 50 }).catch(
          () => [] as FmpStockNewsRow[],
        );
    const mapped = dedupeArticles(
      (rows ?? [])
        .map((r) => mapArticle(r, ticker ?? ""))
        .filter((a): a is NewsArticle => a !== null),
    );
    return {
      articles: applyFeedFilters(mapped, query).slice(0, limit),
      nextCursor: null,
      provider: "fmp",
      asOf: asOf(),
      isMock: false,
    };
  }

  const mock = getMockMarketPulse();
  const mapped: NewsArticle[] = mock.headlines.map((h) => ({
    title: h.title,
    snippet: "",
    url: h.url,
    source: h.source,
    publishedAt: h.publishedAt,
    tickers: h.tickers,
    category: h.category,
    whyItMatters: categorizeNews(h.title, "").whyItMatters,
    sentiment: null,
    imageUrl: null,
  }));
  return {
    articles: applyFeedFilters(mapped, query).slice(0, limit),
    nextCursor: null,
    provider: "mock",
    asOf: asOf(),
    isMock: true,
  };
}

export async function getMarketPulse(): Promise<MarketPulsePayload> {
  if (!hasFmpApiKey()) return getMockMarketPulse();

  const rows = await fmpFetch<FmpStockNewsRow[]>("/news/stock-latest", {
    page: 0,
    limit: 20,
  }).catch(() => [] as FmpStockNewsRow[]);

  const headlines: MarketNewsItem[] = dedupeArticles(
    (rows ?? [])
      .map((r) => mapArticle(r, ""))
      .filter((a): a is NewsArticle => a !== null),
  )
    .slice(0, 12)
    .map((a) => ({
      title: a.title,
      url: a.url,
      source: a.source,
      publishedAt: a.publishedAt,
      tickers: a.tickers,
      category: a.category,
    }));

  return {
    headlines,
    asOf: new Date().toISOString(),
    isMock: false,
  };
}
