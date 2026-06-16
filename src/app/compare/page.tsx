"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReportCard } from "@/lib/types";
import { overallGrade } from "@/lib/analysis";
import { compareMetrics, compareVerdict } from "@/lib/compare-analysis";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import type { CompareChartData } from "@/lib/chart/types";
import { CompareChart } from "@/components/CompareChart";
import { GlassCard } from "@/components/GlassCard";
import { NeutralBackdrop } from "@/components/NeutralBackdrop";
import { CompareSentiment } from "@/components/CompareSentiment";
import { fetchJson } from "@/lib/fetch-client";
import { isReportCard } from "@/lib/validators";

const SENTIMENT_COLOR = {
  good: "var(--up)",
  neutral: "var(--neutral)",
  bad: "var(--down)",
} as const;

function tickerFromUrl(param: "a" | "b", fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = new URLSearchParams(window.location.search).get(param);
  return (value ?? fallback).toUpperCase();
}

export default function CompareView() {
  const [a, setA] = useState(() => tickerFromUrl("a", "AAPL"));
  const [b, setB] = useState(() => tickerFromUrl("b", "MSFT"));
  const [cardA, setCardA] = useState<ReportCard | null>(null);
  const [cardB, setCardB] = useState<ReportCard | null>(null);
  const [chart, setChart] = useState<CompareChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCardA(null);
    setCardB(null);
    setChart(null);

    async function loadReport(ticker: string): Promise<ReportCard> {
      return fetchJson(`/api/report/${encodeURIComponent(ticker)}`, isReportCard);
    }

    async function load() {
      const [resultA, resultB] = await Promise.allSettled([
        loadReport(a),
        loadReport(b),
      ]);

      if (cancelled) return;

      const errors: string[] = [];
      if (resultA.status === "fulfilled") setCardA(resultA.value);
      else errors.push(`${a}: ${resultA.reason instanceof Error ? resultA.reason.message : "Failed to load"}`);

      if (resultB.status === "fulfilled") setCardB(resultB.value);
      else errors.push(`${b}: ${resultB.reason instanceof Error ? resultB.reason.message : "Failed to load"}`);

      if (errors.length) {
        setError(errors.join(" · "));
        setLoading(false);
        return;
      }

      try {
        const chartPayload = await fetchJson<{ chart?: CompareChartData }>(
          `/api/chart/${encodeURIComponent(a)}?range=1Y&mode=compare&default=0&a=stock&b=${encodeURIComponent(b)}`,
        );
        if (!cancelled) {
          if (chartPayload?.chart?.mode === "compare") setChart(chartPayload.chart);
        }
      } catch {
        if (!cancelled) setChart(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [a, b]);

  function runCompare() {
    const url = new URL(window.location.href);
    url.searchParams.set("a", a);
    url.searchParams.set("b", b);
    window.history.replaceState({}, "", url.toString());
  }

  const verdict = cardA && cardB ? compareVerdict(cardA, cardB) : null;
  const metrics = cardA && cardB ? compareMetrics(cardA, cardB) : [];
  const gradeA = cardA ? overallGrade(cardA) : null;
  const gradeB = cardB ? overallGrade(cardB) : null;

  return (
    <>
      <NeutralBackdrop />
      <main className="relative z-10 mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="text-xs text-muted hover:text-foreground">
          ← Dashboard
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Compare tickers</h1>
        <p className="mt-1 text-xs text-muted sm:text-sm">
          Side-by-side grades, metric matchups, and performance overlay.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <input
            value={a}
            onChange={(e) => setA(e.target.value.toUpperCase())}
            className="surface w-24 rounded-lg px-3 py-2 font-mono text-sm"
            aria-label="Ticker A"
          />
          <span className="text-muted">vs</span>
          <input
            value={b}
            onChange={(e) => setB(e.target.value.toUpperCase())}
            className="surface w-24 rounded-lg px-3 py-2 font-mono text-sm"
            aria-label="Ticker B"
          />
          <button type="button" onClick={runCompare} className="btn-primary">
            Compare
          </button>
        </div>

        {loading && <div className="mt-8 animate-pulse text-sm text-muted">Loading comparison…</div>}

        {!loading && error && (
          <div className="mt-8 rounded-xl border border-down/30 bg-down/5 px-4 py-3 text-sm text-down">
            {error}
          </div>
        )}

        {!loading && !error && verdict && cardA && cardB && gradeA && gradeB && (
          <div className="mt-8 space-y-6">
            <GlassCard className="p-5 sm:p-6">
              <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-accent">Verdict</div>
              <h2 className="mt-1 font-display text-xl font-bold">{verdict.headline}</h2>
              <p className="mt-2 text-sm text-muted">{verdict.detail}</p>
            </GlassCard>

            <CompareSentiment tickerA={a} tickerB={b} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[cardA, cardB].map((card, i) => {
                const g = i === 0 ? gradeA : gradeB;
                return (
                  <GlassCard key={card.ticker} className="surface-interactive p-5">
                    <Link href={`/stock/${card.ticker}`} className="font-display text-lg font-bold hover:text-accent">
                      {card.name}
                    </Link>
                    <div className="font-mono text-xs text-muted">{card.ticker} · {card.industry}</div>
                    <div className="mt-4 flex items-center gap-4">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-xl border-2 font-display text-2xl font-bold"
                        style={{
                          color: SENTIMENT_COLOR[g.sentiment],
                          borderColor: SENTIMENT_COLOR[g.sentiment],
                        }}
                      >
                        {g.letter}
                      </div>
                      <div>
                        <div className="font-mono text-2xl font-semibold">{formatCurrency(card.price)}</div>
                        <div className="mt-1 flex gap-3 text-xs">
                          <span>1Y {formatSignedPercent(card.changes.year)}</span>
                          <span>β {card.beta.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted">{g.summary}</p>
                  </GlassCard>
                );
              })}
            </div>

            {chart && (
              <GlassCard className="p-4 sm:p-5">
                <div className="mb-2 text-sm font-semibold">
                  {chart.seriesA.label} vs {chart.seriesB.label} · 1Y
                </div>
                <div className="h-56 sm:h-64">
                  <CompareChart data={chart} showVolume={false} />
                </div>
              </GlassCard>
            )}

            <GlassCard className="overflow-x-auto p-4 sm:p-5">
              <div className="mb-3 text-sm font-semibold">Metric matchups</div>
              <table className="w-full min-w-[480px] text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="pb-2 pr-4">Metric</th>
                    <th className="pb-2 pr-4 font-mono">{a}</th>
                    <th className="pb-2 pr-4 font-mono">{b}</th>
                    <th className="pb-2">Edge</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.key} className="border-b border-border/60">
                      <td className="py-2 pr-4 text-muted">{m.label}</td>
                      <td
                        className={`py-2 pr-4 font-mono ${m.winner === "a" ? "font-semibold text-up" : ""}`}
                      >
                        {m.aDisplay}
                      </td>
                      <td
                        className={`py-2 pr-4 font-mono ${m.winner === "b" ? "font-semibold text-up" : ""}`}
                      >
                        {m.bDisplay}
                      </td>
                      <td className="py-2 font-mono text-muted">
                        {m.winner === "tie" ? "—" : m.winner === "a" ? a : b}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          </div>
        )}
      </main>
    </>
  );
}
