"use client";

import { useEffect, useState } from "react";
import type { ReportCard } from "@/lib/types";
import type { NewsDigest } from "@/lib/news/types";
import { computeNewsTension } from "@/lib/news/analysis";
import { overallGrade } from "@/lib/analysis";
import { CATEGORY_LABELS } from "@/lib/news/categorize";
import { NEWS_EXPLAINER } from "@/lib/explanations";
import { formatShortDate } from "@/lib/format";
import { GlassCard } from "./GlassCard";
import { Explainer } from "./Explainer";
import { AnalystSentimentCard } from "./AnalystSentimentCard";
import { NewsFundamentalsTension } from "./NewsFundamentalsTension";

const MOOD_COLOR = {
  bullish: "var(--up)",
  neutral: "var(--neutral)",
  bearish: "var(--down)",
} as const;

const ACTION_COLOR = {
  upgrade: "var(--up)",
  downgrade: "var(--down)",
  maintain: "var(--neutral)",
  initiate: "var(--accent)",
  other: "var(--muted)",
} as const;

function SocialCard({ digest }: { digest: NewsDigest }) {
  const s = digest.social;
  if (!s) return null;
  return (
    <div className="rounded-xl border border-border bg-foreground/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
          Social buzz · StockTwits
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide"
          style={{
            color: MOOD_COLOR[s.mood],
            background: `color-mix(in srgb, ${MOOD_COLOR[s.mood]} 14%, transparent)`,
          }}
        >
          {s.mood}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        {s.stocktwitsPosts != null && (
          <span className="text-muted">
            StockTwits posts{" "}
            <span className="font-mono font-semibold text-foreground">{s.stocktwitsPosts}</span>
          </span>
        )}
        {s.twitterPosts != null && (
          <span className="text-muted">
            Twitter posts{" "}
            <span className="font-mono font-semibold text-foreground">{s.twitterPosts}</span>
          </span>
        )}
        {s.changePct != null && (
          <span className="text-muted">
            Sentiment shift{" "}
            <span className="font-mono font-semibold text-foreground">
              {s.changePct > 0 ? "+" : ""}
              {s.changePct}%
            </span>
          </span>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Crowd mood is noisy — useful context, not a trading signal.
      </p>
    </div>
  );
}

function ArticleRow({
  article,
  learnMode,
  compact,
}: {
  article: NewsDigest["articles"][0];
  learnMode: boolean;
  compact?: boolean;
}) {
  return (
    <li className="border-b border-border/60 py-3 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-foreground transition-colors hover:text-accent"
        >
          {article.title}
        </a>
        <span className="shrink-0 rounded-full bg-foreground/5 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-muted">
          {CATEGORY_LABELS[article.category]}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 text-[0.65rem] text-muted">
        <span>{article.source}</span>
        <span>·</span>
        <span>{formatShortDate(article.publishedAt.slice(0, 10))}</span>
      </div>
      {!compact && article.snippet && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{article.snippet}</p>
      )}
      {learnMode && !compact && (
        <p className="mt-1.5 text-xs text-muted/90">
          <span className="font-medium text-muted">Why it might matter: </span>
          {article.whyItMatters}
        </p>
      )}
    </li>
  );
}

export function NewsSection({
  ticker,
  data,
  learnMode = true,
}: {
  ticker: string;
  data: ReportCard;
  learnMode?: boolean;
}) {
  const [digest, setDigest] = useState<NewsDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!learnMode);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/news/${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((d: NewsDigest) => setDigest(d))
      .catch(() => setDigest(null))
      .finally(() => setLoading(false));
  }, [ticker]);

  const grade = overallGrade(data);
  const tension = digest ? computeNewsTension(grade.sentiment, digest) : null;
  const visibleArticles = learnMode && !expanded ? digest?.articles.slice(0, 3) : digest?.articles;

  return (
    <GlassCard className="p-5 sm:p-6" id="section-context">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
            News &amp; sentiment
          </div>
          <p className="mt-1 text-sm text-muted">
            What&apos;s being said — and how it compares to the numbers below.
          </p>
        </div>
        {learnMode && digest && digest.articles.length > 3 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="btn-ghost interactive text-xs"
          >
            {expanded ? "Show fewer" : `Show all ${digest.articles.length}`}
          </button>
        )}
      </div>

      {loading && (
        <div className="mt-4 animate-pulse text-xs text-muted">Loading headlines…</div>
      )}

      {!loading && digest && (
        <div className="mt-4 space-y-4">
          {tension && <NewsFundamentalsTension tension={tension} />}

          <div className="grid gap-4 lg:grid-cols-2">
            {digest.analyst && (
              <AnalystSentimentCard analyst={digest.analyst} learnMode={learnMode} />
            )}
            <SocialCard digest={digest} />
          </div>

          {digest.recentGrades.length > 0 && (
            <div>
              <div className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
                Recent rating changes
              </div>
              <ul className="space-y-2">
                {digest.recentGrades.map((g) => (
                  <li
                    key={`${g.date}-${g.firm}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-foreground/[0.03] px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-medium text-foreground">{g.firm}</span>
                      <span className="text-muted"> · {formatShortDate(g.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      {g.previousGrade && (
                        <span className="text-muted">{g.previousGrade}</span>
                      )}
                      {g.previousGrade && <span className="text-muted">→</span>}
                      <span className="font-semibold text-foreground">{g.newGrade}</span>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[0.6rem] uppercase"
                        style={{
                          color: ACTION_COLOR[g.action],
                          background: `color-mix(in srgb, ${ACTION_COLOR[g.action]} 12%, transparent)`,
                        }}
                      >
                        {g.action}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {visibleArticles && visibleArticles.length > 0 ? (
            <div>
              <div className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
                Headlines
              </div>
              <ul>
                {visibleArticles.map((a) => (
                  <ArticleRow key={a.url} article={a} learnMode={learnMode} compact={learnMode && !expanded} />
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted">No recent headlines found for {ticker}.</p>
          )}

          {digest.isMock && (
            <p className="text-[0.65rem] text-muted">Showing sample news data for demo purposes.</p>
          )}
        </div>
      )}

      <div className="mt-4">
        <Explainer content={NEWS_EXPLAINER} />
      </div>
    </GlassCard>
  );
}
