"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PortfolioImpact } from "@/lib/discovery/types";
import { useProfile } from "@/lib/profile/useProfile";

export function BeforeYouActPanel({ ticker }: { ticker: string }) {
  const profile = useProfile();
  const holdings = profile.mockPortfolio ?? [];
  const [impact, setImpact] = useState<PortfolioImpact | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (holdings.length === 0) {
      setImpact(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/discovery/impact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticker, holdings, addWeight: 0.1 }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data as PortfolioImpact;
      })
      .then((data) => {
        if (!cancelled) setImpact(data);
      })
      .catch(() => {
        if (!cancelled) setImpact(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, holdings]);

  return (
    <section className="surface rounded-2xl p-5" aria-label="Before you act">
      <h2 className="font-display text-sm font-semibold text-foreground">Before you act</h2>
      <p className="mt-0.5 text-[0.7rem] text-muted">
        Checklist — not advice. Log a thesis in the journal before risking real money.
      </p>

      <ul className="mt-3 space-y-2 text-xs text-muted">
        <li className="flex gap-2">
          <span className="text-accent">1.</span>
          <span>
            Read the full report card and ask the Lens to steel-man the bear case.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-accent">2.</span>
          <span>
            <Link href={`/practice?ticker=${ticker}`} className="text-accent hover:underline">
              Backtest a rule
            </Link>{" "}
            in Hypothesis Lab — would your strategy have caught this?
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-accent">3.</span>
          <span>Write your thesis + what would change your mind in the journal below.</span>
        </li>
      </ul>

      {holdings.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-2 text-[0.7rem] text-muted">
          Add a{" "}
          <Link href="/settings" className="text-accent hover:underline">
            mock portfolio
          </Link>{" "}
          or{" "}
          <Link href="/risk" className="text-accent hover:underline">
            import real holdings
          </Link>{" "}
          to see how {ticker} fits your exposure.
        </p>
      ) : loading ? (
        <p className="mt-3 text-[0.7rem] text-muted-2">Checking portfolio fit…</p>
      ) : impact ? (
        <div className="mt-3 space-y-1.5 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 text-[0.7rem] text-muted">
          <div>
            <span className="font-medium text-foreground">Sector:</span> {impact.sector}
            {impact.sectorWeightBefore != null && (
              <>
                {" "}
                — {((impact.sectorWeightBefore ?? 0) * 100).toFixed(0)}% →{" "}
                {((impact.sectorWeightAfter ?? 0) * 100).toFixed(0)}% of mock portfolio
              </>
            )}
          </div>
          {impact.currentPortfolioBeta != null && impact.projectedPortfolioBeta != null && (
            <div>
              <span className="font-medium text-foreground">Portfolio beta:</span>{" "}
              {impact.currentPortfolioBeta.toFixed(2)} → {impact.projectedPortfolioBeta.toFixed(2)}
            </div>
          )}
          {impact.alreadyHeld && (
            <div className="text-neutral">You already hold {ticker} in your mock portfolio.</div>
          )}
          {impact.concentrationWarning && (
            <div className="text-down">{impact.concentrationWarning}</div>
          )}
          <Link href="/risk" className="inline-block text-accent hover:underline">
            Full Risk X-ray →
          </Link>
        </div>
      ) : null}
    </section>
  );
}
