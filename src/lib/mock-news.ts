import { buildDigestSummary } from "@/lib/news/analysis";
import { categorizeNews } from "@/lib/news/categorize";
import type {
  AnalystConsensus,
  MarketPulsePayload,
  NewsDigest,
  SocialSentiment,
} from "@/lib/news/types";

function seeded(ticker: string): () => number {
  let h = 1779033703 ^ ticker.length;
  for (let i = 0; i < ticker.length; i++) {
    h = Math.imul(h ^ ticker.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOCK_HEADLINES = [
  {
    title: "{name} reports quarterly earnings beat",
    snippet: "Revenue topped analyst estimates as services growth accelerated.",
    category: "earnings" as const,
  },
  {
    title: "{name} unveils next-generation product lineup",
    snippet: "Management highlighted AI features and a broader enterprise push.",
    category: "product" as const,
  },
  {
    title: "Analysts lift price targets on {ticker} after investor day",
    snippet: "Several firms cited improving margins and capital return plans.",
    category: "leadership" as const,
  },
  {
    title: "{ticker} faces regulatory review in key market",
    snippet: "Shares moved on headlines; outcome and timing remain uncertain.",
    category: "legal" as const,
  },
  {
    title: "Macro headwinds weigh on {sector} names including {ticker}",
    snippet: "Rate expectations shifted after the latest jobs and inflation data.",
    category: "macro" as const,
  },
];

const NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corporation",
  NVDA: "NVIDIA Corporation",
  TSLA: "Tesla, Inc.",
  AVGO: "Broadcom Inc.",
};

export function getMockNewsDigest(ticker: string): NewsDigest {
  const rand = seeded(ticker);
  const name = NAMES[ticker] ?? `${ticker} Corp.`;
  const count = 2 + Math.floor(rand() * 3);
  const picked = [...MOCK_HEADLINES].sort(() => rand() - 0.5).slice(0, count);

  const articles = picked.map((h, i) => {
    const title = h.title.replace("{name}", name).replace("{ticker}", ticker).replace("{sector}", "tech");
    const snippet = h.snippet;
    const { category, whyItMatters } = categorizeNews(title, snippet);
    const d = new Date();
    d.setDate(d.getDate() - i * 2);
    return {
      title,
      snippet,
      url: `https://example.com/news/${ticker.toLowerCase()}-${i}`,
      source: i % 2 === 0 ? "Sample Wire" : "Demo Journal",
      publishedAt: d.toISOString(),
      tickers: [ticker],
      category,
      whyItMatters,
    };
  });

  const bullish = rand() > 0.35;
  const analyst: AnalystConsensus = {
    strongBuy: bullish ? 8 : 2,
    buy: bullish ? 14 : 6,
    hold: 9,
    sell: bullish ? 2 : 5,
    strongSell: bullish ? 0 : 2,
    consensus: bullish ? "Buy" : "Hold",
    mood: bullish ? "bullish" : "neutral",
  };

  const social: SocialSentiment = {
    score: bullish ? 0.35 + rand() * 0.3 : -0.1 + rand() * 0.2,
    mood: bullish ? "bullish" : "neutral",
    stocktwitsPosts: Math.floor(40 + rand() * 200),
    twitterPosts: Math.floor(20 + rand() * 120),
    changePct: Math.round((rand() - 0.4) * 30 * 10) / 10,
    source: "stocktwits",
  };
  if (social.score < 0.2 && social.score > -0.2) social.mood = "neutral";

  const digest: NewsDigest = {
    ticker,
    articles,
    analyst,
    recentGrades: [
      {
        date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
        firm: "Demo Securities",
        previousGrade: "Hold",
        newGrade: bullish ? "Buy" : "Hold",
        action: bullish ? "upgrade" : "maintain",
      },
    ],
    social,
    summary: "",
    asOf: new Date().toISOString(),
    isMock: true,
  };
  digest.summary = buildDigestSummary(digest);
  return digest;
}

export function getMockMarketPulse(): MarketPulsePayload {
  const tickers = ["AAPL", "NVDA", "MSFT", "TSLA", "KO", "JPM"];
  const headlines = tickers.map((ticker, i) => {
    const name = NAMES[ticker] ?? ticker;
    const h = MOCK_HEADLINES[i % MOCK_HEADLINES.length];
    const title = h.title.replace("{name}", name).replace("{ticker}", ticker).replace("{sector}", "markets");
    const d = new Date();
    d.setHours(d.getHours() - i * 3);
    const { category } = categorizeNews(title, h.snippet);
    return {
      title,
      url: `https://example.com/market/${ticker.toLowerCase()}`,
      source: "Sample Wire",
      publishedAt: d.toISOString(),
      tickers: [ticker],
      category,
    };
  });

  return {
    headlines,
    asOf: new Date().toISOString(),
    isMock: true,
  };
}
