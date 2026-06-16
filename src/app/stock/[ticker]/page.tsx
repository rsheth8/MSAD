"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReportCard } from "@/lib/types";
import { LEARNING_STEPS, type LearningStepId } from "@/lib/learning-path";
import {
  getLearningPathEnabled,
  setLearningPathEnabled,
} from "@/lib/settings";
import { ReportCardView } from "@/components/ReportCardView";
import { OptionsSection } from "@/components/OptionsSection";
import { TickerSearch } from "@/components/TickerSearch";
import { AccentPicker } from "@/components/AccentPicker";
import { ExportButton } from "@/components/ExportButton";
import { ModelingHub } from "@/components/ModelingHub";
import { WatchlistButton } from "@/components/WatchlistButton";
import { AmbientOrbs } from "@/components/AmbientOrbs";
import { BackdropShell } from "@/components/BackdropShell";
import { EarningsStrip } from "@/components/EarningsStrip";
import { NewsStrip } from "@/components/NewsStrip";
import { LearningPathBar, scrollToSection } from "@/components/LearningPathBar";
import { ShareButton, StoryExportButton } from "@/components/ShareExport";
import { SoundToggle, ThemeToggle } from "@/components/OnboardingModal";
import { DepthSlider } from "@/components/ai/DepthSlider";
import { AskPanel } from "@/components/ai/AskPanel";
import { JournalPanel } from "@/components/journal/JournalPanel";
import { AccountButton } from "@/components/auth/AccountButton";
import { useDepth } from "@/components/ai/DepthProvider";
import { learnModeFromDepth } from "@/lib/ai/depth";
import { BRAND, MSAD_DOM, MSAD_STORAGE } from "@/lib/brand";

const ContourScene = dynamic(() => import("@/components/ContourScene"), {
  ssr: false,
});

const EXPORT_ROOT_ID = MSAD_DOM.exportRoot;

export default function StockReportPage() {
  const params = useParams<{ ticker: string }>();
  const router = useRouter();
  const ticker = (params.ticker ?? "AAPL").toUpperCase();

  const { depth } = useDepth();
  const learnMode = learnModeFromDepth(depth);
  const [accent, setAccent] = useState<string>(BRAND.accent);
  const [data, setData] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pathEnabled, setPathEnabled] = useState(true);
  const [pathStep, setPathStep] = useState<LearningStepId>("price");

  useEffect(() => {
    const saved = localStorage.getItem(MSAD_STORAGE.accent);
    if (saved) setAccent(saved);
    setPathEnabled(getLearningPathEnabled());
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    localStorage.setItem(MSAD_STORAGE.accent, accent);
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

  function goToStep(id: LearningStepId) {
    setPathStep(id);
    const section = LEARNING_STEPS.find((s) => s.id === id);
    if (section) scrollToSection(section.sectionId);
  }

  function dismissPath() {
    setPathEnabled(false);
    setLearningPathEnabled(false);
  }

  return (
    <>
      <BackdropShell />
      <ContourScene
        accent={accent}
        ticker={ticker}
        series={data?.series.map((p) => p.stock)}
        colorChange={data?.changes.day}
      />
      <AmbientOrbs />

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-12">
        <header className="mb-6 flex flex-col items-start gap-4 sm:mb-8">
          <div className="w-full min-w-0">
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              ← Back to dashboard
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="sheen rounded-md px-2 py-0.5 text-xs font-bold tracking-wide text-white"
                style={{ background: "var(--accent)" }}
              >
                {BRAND.id}
              </span>
              <h1 className="truncate font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {data?.name ?? ticker}
              </h1>
            </div>
            <p className="mt-1 text-xs text-muted">
              Understand any stock — and learn the &quot;why&quot; behind every number.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2">
          <ThemeToggle />
          <SoundToggle />
          <AccentPicker value={accent} onChange={setAccent} />

          <DepthSlider />

          <Link href={`/practice?ticker=${ticker}`} className="btn-ghost interactive">
            Test a hypothesis
          </Link>
          <Link href="/dashboard" className="btn-ghost interactive">
            My dashboard
          </Link>
          <AccountButton />

          {data && <ShareButton />}
          {data && <StoryExportButton data={data} />}
          <ExportButton targetId={EXPORT_ROOT_ID} ticker={ticker} disabled={!data || loading} />
          <WatchlistButton ticker={ticker} />
          <TickerSearch key={ticker} initial={ticker} onSubmit={(t) => router.push(`/stock/${t}`)} />
        </div>
      </header>

      {data && !loading && learnMode && (
        <LearningPathBar
          activeStep={pathStep}
          onStep={goToStep}
          enabled={pathEnabled}
          onDismiss={dismissPath}
        />
      )}

      {data && !loading && <EarningsStrip ticker={ticker} />}
      {data && !loading && <NewsStrip ticker={ticker} />}

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
        <>
          <div id={EXPORT_ROOT_ID} className="space-y-8">
            <ReportCardView data={data} learnMode={learnMode} />
            <div id="section-modeling">
              <ModelingHub data={data} />
            </div>
            <div id="section-options">
              <OptionsSection data={data} learnMode={learnMode} />
            </div>
          </div>

          {/* The Lens + the Journal — kept out of the PNG export root */}
          <div id="section-lens" className="mt-8 space-y-6">
            <AskPanel ticker={ticker} />
            <JournalPanel ticker={ticker} price={data.price} />
          </div>
        </>
      )}
      </main>
    </>
  );
}
