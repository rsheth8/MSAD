"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NeutralBackdrop } from "@/components/NeutralBackdrop";
import { AccountButton } from "@/components/auth/AccountButton";
import { DepthSlider } from "@/components/ai/DepthSlider";
import { CalibrationCard } from "@/components/journal/CalibrationCard";
import { PredictionsPanel } from "@/components/journal/PredictionsPanel";
import { JournalFeed } from "@/components/journal/JournalFeed";
import { useProfile } from "@/lib/profile/useProfile";
import { useSession } from "@/lib/auth/useSession";
import { getWatchlist } from "@/lib/watchlist";
import { PassiveDigest } from "@/components/discovery/PassiveDigest";
import { ResearchQueuePanel } from "@/components/discovery/ResearchQueuePanel";
import { FmpApiBudget } from "@/components/dashboard/FmpApiBudget";
import { markDashboardVisit } from "@/lib/profile/store";
import { MSAD_EVENTS, BRAND } from "@/lib/brand";

export function DashboardPage() {
  const profile = useProfile();
  const { user, authEnabled } = useSession();
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setWatchlist(getWatchlist());
    sync();
    window.addEventListener(MSAD_EVENTS.watchlist, sync);
    const q = new URLSearchParams(window.location.search).get("auth");
    if (q === "ok") setAuthNotice("Signed in — your progress now syncs to your account.");
    else if (q === "error") setAuthNotice("Sign-in didn't complete. Please try again.");
    else if (q === "unconfigured")
      setAuthNotice("Accounts aren't configured on this deployment yet — you're in local mode.");
    markDashboardVisit();
    return () => window.removeEventListener(MSAD_EVENTS.watchlist, sync);
  }, []);

  const hasData = profile.journal.length > 0 || profile.predictions.length > 0;

  return (
    <>
      <NeutralBackdrop />
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="text-xs font-medium text-muted hover:text-foreground">
              ← {BRAND.id} home
            </Link>
            <div className="flex items-center gap-2">
              <DepthSlider compact />
              <AccountButton />
            </div>
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Your trading gym
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Everything you learn and test, in one place. Log theses before you act, score your own
              predictions, and watch your calibration improve — the honest signal that you&apos;re
              ready to risk real money.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/practice" className="btn-primary text-xs">
                Test a hypothesis →
              </Link>
              <Link href="/replay" className="btn-ghost interactive text-xs">
                Market Replay
              </Link>
              <Link href="/risk" className="btn-ghost interactive text-xs">
                Risk X-ray
              </Link>
              <Link href="/settings" className="btn-ghost interactive text-xs">
                Settings
              </Link>
              <Link href="/discover" className="btn-ghost interactive text-xs">
                Find a stock
              </Link>
            </div>
          </div>
        </header>

        {authNotice && (
          <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2 text-xs text-foreground">
            {authNotice}
          </div>
        )}

        {/* account state */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted">
          {user ? (
            <span className="rounded-full bg-up/10 px-2.5 py-1 font-medium text-up">
              ● Synced to {user.email || user.name}
            </span>
          ) : authEnabled ? (
            <>
              <span className="rounded-full bg-foreground/8 px-2.5 py-1 font-medium">
                ● Local mode — saved on this device
              </span>
              <a href="/api/auth/google" className="font-medium text-accent hover:underline">
                Sign in to sync across devices →
              </a>
            </>
          ) : (
            <span className="rounded-full bg-foreground/8 px-2.5 py-1 font-medium">
              ● Local mode — your progress is saved in this browser
            </span>
          )}
        </div>

        <PassiveDigest profile={profile} />

        <FmpApiBudget />

        <ResearchQueuePanel profile={profile} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* left rail */}
          <div className="space-y-6">
            <CalibrationCard predictions={profile.predictions} />

            <section>
              <h2 className="mb-2 font-display text-sm font-semibold text-foreground">
                Predictions
              </h2>
              <PredictionsPanel predictions={profile.predictions} />
            </section>

            {watchlist.length > 0 && (
              <section>
                <h2 className="mb-2 font-display text-sm font-semibold text-foreground">Watchlist</h2>
                <div className="flex flex-wrap gap-2">
                  {watchlist.map((t) => (
                    <Link key={t} href={`/stock/${t}`} className="btn-chip btn-chip-inactive">
                      {t}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* main column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-foreground">
                Conviction journal
              </h2>
              <span className="text-xs text-muted-2">{profile.journal.length} entries</span>
            </div>
            <JournalFeed
              entries={profile.journal}
              emptyHint="No theses yet. Open any stock, scroll to “Your conviction journal,” and write down why — before you act."
            />
          </div>
        </div>

        {!hasData && (
          <section className="mt-8 rounded-2xl border border-dashed border-border bg-background/40 p-6">
            <h3 className="font-display text-sm font-semibold text-foreground">
              How the gym works
            </h3>
            <ol className="mt-3 space-y-2 text-sm text-muted">
              <li>
                <span className="font-medium text-foreground">1. Learn</span> — open any stock and ask
                the Lens to explain it at your level.
              </li>
              <li>
                <span className="font-medium text-foreground">2. Commit</span> — log a thesis with what
                would change your mind, or make a probability prediction.
              </li>
              <li>
                <span className="font-medium text-foreground">3. Score</span> — we resurface each call
                on its due date. Your calibration score grows here.
              </li>
              <li>
                <span className="font-medium text-foreground">4. Graduate</span> — when your
                predictions are well-calibrated, that&apos;s your honest green light to test small,
                real positions.
              </li>
            </ol>
            <Link href="/discover" className="btn-primary mt-4 inline-block">
              Find a stock to start →
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
