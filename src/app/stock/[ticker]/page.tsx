"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReportCard } from "@/lib/types";
import { ReportCardView } from "@/components/ReportCardView";
import { OptionsSection } from "@/components/OptionsSection";
import { TickerSearch } from "@/components/TickerSearch";
import { AccentPicker } from "@/components/AccentPicker";
import { ExportButton } from "@/components/ExportButton";

const SceneBackground = dynamic(() => import("@/components/SceneBackground"), {
  ssr: false,
});

const DEFAULT_ACCENT = "#16a34a";
const EXPORT_ROOT_ID = "amsad-export-root";

export default function StockReportPage() {
  const params = useParams<{ ticker: string }>();
  const router = useRouter();
  const ticker = (params.ticker ?? "AAPL").toUpperCase();

  const [learnMode, setLearnMode] = useState(true);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [data, setData] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("amsad-accent");
    if (saved) setAccent(saved);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    localStorage.setItem("amsad-accent", accent);
  }, [accent]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/report/${encodeURIComponent(ticker)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
        return body as ReportCard;
      })
      .then((card) => {
        if (!cancelled) setData(card);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <SceneBackground accent={accent} />
      <div className="texture-grid pointer-events-none fixed inset-0 -z-[5]" aria-hidden />

      <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            ← Back to dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span
              className="sheen rounded-md px-2 py-0.5 text-xs font-bold tracking-wide text-white"
              style={{ background: "var(--accent)" }}
            >
              AMSAD
            </span>
            <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">
              {data?.name ?? ticker}
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted">
            Understand any stock — and learn the &quot;why&quot; behind every number.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AccentPicker value={accent} onChange={setAccent} />

          <div
            className="surface flex items-center rounded-full p-0.5 text-xs font-medium"
            role="group"
            aria-label="Detail level"
          >
            <button
              type="button"
              onClick={() => setLearnMode(true)}
              aria-pressed={learnMode}
              className={`rounded-full px-3 py-1 transition-colors ${
                learnMode ? "text-white" : "text-muted hover:text-foreground"
              }`}
              style={learnMode ? { background: "var(--accent)" } : undefined}
            >
              Learn
            </button>
            <button
              type="button"
              onClick={() => setLearnMode(false)}
              aria-pressed={!learnMode}
              className={`rounded-full px-3 py-1 transition-colors ${
                !learnMode ? "bg-foreground/90 text-white" : "text-muted hover:text-foreground"
              }`}
            >
              Pro
            </button>
          </div>

          <ExportButton targetId={EXPORT_ROOT_ID} ticker={ticker} disabled={!data || loading} />
          <TickerSearch
            key={ticker}
            initial={ticker}
            onSubmit={(t) => router.push(`/stock/${t}`)}
          />
        </div>
      </header>

      {loading && (
        <div className="surface animate-pulse rounded-2xl p-12 text-center text-sm text-muted">
          Loading {ticker}…
        </div>
      )}

      {error && !loading && (
        <div className="surface rounded-2xl border border-down/30 p-8 text-center">
          <p className="text-sm font-semibold text-down">Couldn&apos;t load {ticker}</p>
          <p className="mt-1 text-xs text-muted">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div id={EXPORT_ROOT_ID} className="space-y-6">
          <ReportCardView data={data} learnMode={learnMode} />
          <OptionsSection data={data} learnMode={learnMode} />
        </div>
      )}
    </main>
  );
}
