import type { Sentiment } from "@/lib/analysis";
import type { AnalystConsensus, MoodLabel, NewsDigest, NewsTension } from "./types";

export function moodFromScore(score: number): MoodLabel {
  if (score >= 0.2) return "bullish";
  if (score <= -0.2) return "bearish";
  return "neutral";
}

export function analystMood(consensus: AnalystConsensus | null): MoodLabel {
  return consensus?.mood ?? "neutral";
}

const MOOD_RANK: Record<MoodLabel, number> = { bearish: 0, neutral: 1, bullish: 2 };

export function compareSentimentVerdict(a: NewsDigest | null, b: NewsDigest | null): {
  headline: string;
  detail: string;
} | null {
  if (!a || !b) return null;

  const moodA = a.analyst?.mood ?? a.social?.mood ?? "neutral";
  const moodB = b.analyst?.mood ?? b.social?.mood ?? "neutral";
  const rankA = MOOD_RANK[moodA];
  const rankB = MOOD_RANK[moodB];

  const countA = a.articles.length;
  const countB = b.articles.length;

  if (rankA > rankB + 0) {
    return {
      headline: `${a.ticker} has warmer analyst/social sentiment`,
      detail: `${a.ticker} leans ${moodA} vs ${b.ticker}'s ${moodB} tone. News volume: ${countA} vs ${countB} recent headlines.`,
    };
  }
  if (rankB > rankA + 0) {
    return {
      headline: `${b.ticker} has warmer analyst/social sentiment`,
      detail: `${b.ticker} leans ${moodB} vs ${a.ticker}'s ${moodA} tone. News volume: ${countB} vs ${countA} recent headlines.`,
    };
  }
  if (countA > countB + 2) {
    return {
      headline: `${a.ticker} is in the news more often`,
      detail: `Similar sentiment tone, but ${a.ticker} has ${countA} recent headlines vs ${countB} for ${b.ticker}.`,
    };
  }
  if (countB > countA + 2) {
    return {
      headline: `${b.ticker} is in the news more often`,
      detail: `Similar sentiment tone, but ${b.ticker} has ${countB} recent headlines vs ${countA} for ${a.ticker}.`,
    };
  }
  return {
    headline: "Similar news & sentiment tone",
    detail: `Both names show ${moodA} coverage with comparable headline volume.`,
  };
}

export function computeNewsTension(
  gradeSentiment: Sentiment,
  digest: NewsDigest | null,
): NewsTension | null {
  if (!digest) return null;

  const analyst = digest.analyst?.mood ?? "neutral";
  const social = digest.social?.mood ?? "neutral";
  const headlineMood: MoodLabel =
    MOOD_RANK[analyst] >= MOOD_RANK[social] ? analyst : social;

  const gradeMood: MoodLabel =
    gradeSentiment === "good" ? "bullish" : gradeSentiment === "bad" ? "bearish" : "neutral";

  const quiet = digest.articles.length === 0 && !digest.analyst && !digest.social;
  if (quiet) {
    return {
      kind: "quiet",
      headline: "Quiet news cycle",
      detail:
        "Not much recent headline noise — your grade below is driven mostly by fundamentals, not buzz.",
    };
  }

  if (gradeMood === headlineMood || (gradeMood === "neutral" && headlineMood === "neutral")) {
    return {
      kind: "aligned",
      headline: "News tone aligns with fundamentals",
      detail:
        gradeMood === "bullish"
          ? "Analysts/social mood looks positive and your peer-based grade is strong — story and numbers agree."
          : gradeMood === "bearish"
            ? "Coverage looks cautious and fundamentals trail peers — worth digging into the watch-outs."
            : "Mixed but not extreme — use metrics and charts to decide what matters most.",
    };
  }

  if (headlineMood === "bullish" && gradeMood !== "bullish") {
    return {
      kind: "divergent",
      headline: "Wall Street sounds optimistic — fundamentals less so",
      detail:
        "Headlines and analyst tone are upbeat, but this stock still trails peers on key metrics. Hype can run ahead of results.",
    };
  }

  if (headlineMood === "bearish" && gradeMood === "bullish") {
    return {
      kind: "divergent",
      headline: "Negative headlines — but solid fundamentals",
      detail:
        "Recent news is cautious, yet the peer-based grade is strong. Short-term fear doesn't always match long-term quality.",
    };
  }

  return {
    kind: "divergent",
    headline: "News and fundamentals tell different stories",
    detail: "Cross-check headlines with the grade and metrics — one may be leading the other.",
  };
}

export function buildDigestSummary(digest: NewsDigest): string {
  const parts: string[] = [];
  if (digest.articles.length > 0) {
    parts.push(
      `${digest.articles.length} headline${digest.articles.length === 1 ? "" : "s"} this week`,
    );
  }
  if (digest.analyst) {
    parts.push(`analysts lean ${digest.analyst.consensus}`);
  }
  if (digest.social) {
    parts.push(`social mood ${digest.social.mood}`);
  }
  if (parts.length === 0) return "No recent news or sentiment data";
  return parts.join(" · ");
}
