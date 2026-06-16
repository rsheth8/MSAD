"use client";

import { useState } from "react";
import { useProfile } from "@/lib/profile/useProfile";
import { ThesisForm } from "./ThesisForm";
import { PredictionForm } from "./PredictionForm";
import { JournalFeed } from "./JournalFeed";

type Tab = "thesis" | "predict";

/**
 * The Journal on a stock page — the connective tissue. Capture a thesis or a
 * falsifiable prediction for THIS stock; it flows to your dashboard and your
 * calibration score.
 */
export function JournalPanel({ ticker, price }: { ticker: string; price?: number }) {
  const [tab, setTab] = useState<Tab>("thesis");
  const profile = useProfile();
  const mine = profile.journal.filter((e) => e.ticker === ticker.toUpperCase());

  return (
    <section className="surface rounded-2xl p-5" aria-label="Your journal">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">
            Your conviction journal
          </h2>
          <p className="text-[0.7rem] text-muted">
            Write it down before you act — then prove yourself right or wrong, honestly.
          </p>
        </div>
        <div className="surface flex items-center rounded-full p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab("thesis")}
            aria-pressed={tab === "thesis"}
            className={`btn-pill rounded-full px-3 py-1 ${tab === "thesis" ? "btn-pill-active" : "btn-pill-inactive"}`}
          >
            Log thesis
          </button>
          <button
            type="button"
            onClick={() => setTab("predict")}
            aria-pressed={tab === "predict"}
            className={`btn-pill rounded-full px-3 py-1 ${tab === "predict" ? "btn-pill-active" : "btn-pill-inactive"}`}
          >
            Predict
          </button>
        </div>
      </div>

      <div className="mt-4">
        {tab === "thesis" ? (
          <ThesisForm ticker={ticker.toUpperCase()} priceAtEntry={price} />
        ) : (
          <PredictionForm ticker={ticker.toUpperCase()} />
        )}
      </div>

      {mine.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium text-muted">
            Your {ticker} entries ({mine.length})
          </p>
          <JournalFeed entries={mine} showTicker={false} />
        </div>
      )}
    </section>
  );
}
