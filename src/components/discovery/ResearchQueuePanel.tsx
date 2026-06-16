"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { getExclusions } from "@/lib/screener/exclusions";
import { investorProfileSummary, normalizeInvestorProfile } from "@/lib/discovery/investor-profile";
import type { DiscoveryRefreshResult } from "@/lib/discovery/types";
import {
  addToResearchShortlist,
  setResearchQueue,
} from "@/lib/profile/store";
import type { UserProfile } from "@/lib/profile/types";
import { getWatchlist } from "@/lib/watchlist";
import { playUiClick } from "@/lib/settings";
import { notifyFmpUsageChanged } from "@/components/dashboard/FmpApiBudget";

const SOURCE_LABELS: Record<string, string> = {
  profile: "Your criteria",
  screen: "Style screen",
  gap: "Portfolio gap",
  peer: "Similar name",
  manual: "Saved by you",
};

export function ResearchQueuePanel({ profile }: { profile: UserProfile }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    humilityNote?: string | null;
    gapSectors?: string[];
    isMock?: boolean;
  }>({});

  const investor = normalizeInvestorProfile(profile.investorProfile);
  const queue = profile.researchQueue ?? [];
  const shortlist = profile.researchShortlist ?? [];

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/discovery/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          investorProfile: investor,
          mockPortfolio: profile.mockPortfolio ?? [],
          watchlist: getWatchlist(),
          journalTickers: [...new Set(profile.journal.map((e) => e.ticker))],
          predictions: profile.predictions,
          journal: profile.journal,
          excludeSymbols: getExclusions(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      setResearchQueue(data.queue ?? []);
      setMeta({
        humilityNote: data.humilityNote,
        gapSectors: data.gapSectors,
        isMock: data.isMock,
      });
      playUiClick();
      notifyFmpUsageChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }, [investor, profile]);

  const stale =
    !profile.queueRefreshedAt ||
    Date.now() - new Date(profile.queueRefreshedAt).getTime() > 24 * 60 * 60 * 1000;

  return (
    <section className="surface rounded-2xl p-5" aria-label="Research queue">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">Research queue</h2>
          <p className="mt-0.5 max-w-lg text-[0.7rem] text-muted">
            Stocks that match your criteria — a passive starting list to study, not buy advice.
            {profile.investorProfile?.profileComplete
              ? ` ${investorProfileSummary(investor)}.`
              : " Set your criteria in Settings first."}
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={busy} className="btn-primary text-xs">
          {busy ? "Scanning…" : stale ? "Refresh queue" : "Refresh again"}
        </button>
      </div>

      {meta.humilityNote && (
        <div className="mt-3 rounded-xl border border-neutral/20 bg-neutral/5 px-3 py-2 text-[0.7rem] text-muted">
          {meta.humilityNote}
        </div>
      )}

      {meta.gapSectors && meta.gapSectors.length > 0 && (profile.mockPortfolio?.length ?? 0) > 0 && (
        <p className="mt-2 text-[0.65rem] text-muted-2">
          Gap-fill sectors considered: {meta.gapSectors.slice(0, 3).join(", ")}
        </p>
      )}

      {error && (
        <div className="mt-3 text-xs text-down">{error}</div>
      )}

      {queue.length === 0 && !busy && (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
          No matches yet.{" "}
          <Link href="/settings" className="text-accent hover:underline">
            Set your investor criteria
          </Link>{" "}
          and tap Refresh — or build a{" "}
          <Link href="/settings" className="text-accent hover:underline">
            mock portfolio
          </Link>{" "}
          for smarter gap-filling.
        </div>
      )}

      {queue.length > 0 && (
        <ul className="mt-4 space-y-2">
          {queue.map((item) => (
            <li
              key={item.symbol}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/stock/${item.symbol}`} className="font-mono text-sm font-semibold text-accent hover:underline">
                    {item.symbol}
                  </Link>
                  <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[0.6rem] font-semibold text-accent">
                    {item.matchScore}% fit
                  </span>
                  <span className="text-[0.6rem] text-muted-2">
                    {SOURCE_LABELS[item.source] ?? item.source}
                    {item.screenName ? ` · ${item.screenName}` : ""}
                  </span>
                </div>
                <div className="text-[0.65rem] text-muted">{item.name}</div>
                <ul className="mt-1 space-y-0.5 text-[0.6rem] text-muted-2">
                  {item.matchReasons.slice(0, 2).map((r) => (
                    <li key={r}>✓ {r}</li>
                  ))}
                </ul>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    addToResearchShortlist(item.symbol);
                    playUiClick();
                  }}
                  className={`btn-chip text-[0.6rem] ${shortlist.includes(item.symbol) ? "btn-chip-active" : "btn-chip-inactive"}`}
                  disabled={shortlist.includes(item.symbol)}
                >
                  {shortlist.includes(item.symbol) ? "Shortlisted" : "Shortlist"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {shortlist.length >= 2 && (
        <div className="mt-4">
          <Link
            href={`/compare?a=${shortlist[0]}&b=${shortlist[1]}`}
            className="btn-ghost interactive text-xs"
          >
            Compare shortlist ({shortlist.length}) →
          </Link>
        </div>
      )}

      {meta.isMock && queue.length > 0 && (
        <p className="mt-3 text-[0.6rem] text-muted-2">Sample data — add FMP_API_KEY for live screens.</p>
      )}

      <p className="mt-3 text-[0.6rem] text-muted-2">
        Educational discovery only — not a recommendation to buy or sell.
      </p>
    </section>
  );
}
