"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MoodLabel, NewsArticle, NewsCategory, NewsFeedResult } from "@/lib/news/types";
import { CATEGORY_LABELS } from "@/lib/news/categorize";
import { BRAND } from "@/lib/brand";
import { formatShortDate } from "@/lib/format";
import { GlassCard } from "./GlassCard";
import { NeutralBackdrop } from "./NeutralBackdrop";
import { ThemeToggle, SoundToggle } from "./OnboardingModal";

const INPUT_CLASS =
  "surface w-full rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-accent/40";

const MOOD_COLOR: Record<MoodLabel, string> = {
  bullish: "var(--up)",
  neutral: "var(--neutral)",
  bearish: "var(--down)",
};

const CATEGORY_OPTIONS: { id: NewsCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "earnings", label: CATEGORY_LABELS.earnings },
  { id: "product", label: CATEGORY_LABELS.product },
  { id: "merger", label: CATEGORY_LABELS.merger },
  { id: "legal", label: CATEGORY_LABELS.legal },
  { id: "leadership", label: CATEGORY_LABELS.leadership },
  { id: "macro", label: CATEGORY_LABELS.macro },
  { id: "other", label: CATEGORY_LABELS.other },
];

const MOOD_OPTIONS: { id: MoodLabel | "all"; label: string }[] = [
  { id: "all", label: "Any mood" },
  { id: "bullish", label: "Bullish" },
  { id: "neutral", label: "Neutral" },
  { id: "bearish", label: "Bearish" },
];

function MoodBadge({ mood }: { mood: MoodLabel }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide"
      style={{
        color: MOOD_COLOR[mood],
        background: `color-mix(in srgb, ${MOOD_COLOR[mood]} 14%, transparent)`,
      }}
    >
      {mood}
    </span>
  );
}

function ArticleCard({ article, learnMode }: { article: NewsArticle; learnMode: boolean }) {
  return (
    <GlassCard className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-muted">
          {CATEGORY_LABELS[article.category]}
        </span>
        {article.sentiment && <MoodBadge mood={article.sentiment} />}
      </div>

      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-accent"
      >
        {article.title}
      </a>

      {article.snippet && (
        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted">{article.snippet}</p>
      )}

      {learnMode && (
        <p className="mt-2 text-[0.7rem] leading-relaxed text-muted/90">
          <span className="font-medium text-muted">Why it might matter: </span>
          {article.whyItMatters}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-[0.65rem] text-muted">
        <span>{article.source}</span>
        <span>·</span>
        <span>{formatShortDate(article.publishedAt.slice(0, 10))}</span>
        {article.tickers.slice(0, 3).map((t) => (
          <Link key={t} href={`/stock/${t}`} className="font-mono text-accent hover:underline">
            {t}
          </Link>
        ))}
      </div>
    </GlassCard>
  );
}

export function NewsHub() {
  const [q, setQ] = useState("");
  const [ticker, setTicker] = useState("");
  const [category, setCategory] = useState<NewsCategory | "all">("all");
  const [mood, setMood] = useState<MoodLabel | "all">("all");
  const [learnMode, setLearnMode] = useState(true);

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const reqId = useRef(0);

  const buildParams = useCallback(
    (nextCursor?: string) => {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (ticker.trim()) p.set("ticker", ticker.trim().toUpperCase());
      if (category !== "all") p.set("category", category);
      if (mood !== "all") p.set("sentiment", mood);
      if (nextCursor) p.set("cursor", nextCursor);
      return p.toString();
    },
    [q, ticker, category, mood],
  );

  // Fetch first page whenever filters change (debounced for the text inputs).
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/news/feed?${buildParams()}`)
        .then((r) => r.json())
        .then((d: NewsFeedResult) => {
          if (id !== reqId.current) return;
          setArticles(d.articles ?? []);
          setCursor(d.nextCursor ?? null);
          setIsMock(Boolean(d.isMock));
        })
        .catch(() => {
          if (id !== reqId.current) return;
          setArticles([]);
          setCursor(null);
        })
        .finally(() => {
          if (id === reqId.current) setLoading(false);
        });
    }, 250);
    return () => clearTimeout(t);
  }, [buildParams]);

  const loadMore = useCallback(() => {
    if (!cursor) return;
    setLoading(true);
    fetch(`/api/news/feed?${buildParams(cursor)}`)
      .then((r) => r.json())
      .then((d: NewsFeedResult) => {
        setArticles((prev) => [...prev, ...(d.articles ?? [])]);
        setCursor(d.nextCursor ?? null);
      })
      .catch(() => setCursor(null))
      .finally(() => setLoading(false));
  }, [cursor, buildParams]);

  const hasFilters = q.trim() || ticker.trim() || category !== "all" || mood !== "all";

  return (
    <>
      <NeutralBackdrop />
      <main className="relative z-10 mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/" className="text-xs text-muted hover:text-foreground">
              ← Dashboard
            </Link>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Market news</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Search across the market, filter by ticker, topic, and mood — every headline tagged
              with what it might mean for the numbers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <SoundToggle />
          </div>
        </header>

        {/* Search + ticker */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search headlines — earnings, AI, rate cut, oil…"
            className={`${INPUT_CLASS} flex-1`}
            aria-label="Search news"
          />
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Ticker (e.g. AAPL)"
            className={`${INPUT_CLASS} font-mono uppercase sm:w-44`}
            aria-label="Filter by ticker"
          />
        </div>

        {/* Category chips */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`btn-pill ${category === c.id ? "btn-pill-active" : "btn-pill-inactive"}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Mood + learn toggle */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMood(m.id)}
                className={`btn-pill ${mood === m.id ? "btn-pill-active" : "btn-pill-inactive"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={learnMode}
              onChange={(e) => setLearnMode(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Learn mode
          </label>
        </div>

        {isMock && (
          <p className="mt-4 rounded-lg border border-border bg-foreground/[0.03] px-3 py-2 text-[0.7rem] text-muted">
            Showing sample headlines — add a <span className="font-mono">MASSIVE_API_KEY</span> (or{" "}
            <span className="font-mono">FMP_API_KEY</span>) to load live multi-asset news.
          </p>
        )}

        {/* Results */}
        {loading && articles.length === 0 ? (
          <div className="mt-8 animate-pulse text-sm text-muted">Loading headlines…</div>
        ) : articles.length === 0 ? (
          <div className="mt-8 text-sm text-muted">
            No headlines match these filters{hasFilters ? " — try widening them." : "."}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <ArticleCard key={a.url} article={a} learnMode={learnMode} />
              ))}
            </div>
            {cursor && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-ghost interactive text-xs"
                >
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
