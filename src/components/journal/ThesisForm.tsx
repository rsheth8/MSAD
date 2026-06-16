"use client";

import { useState } from "react";
import { addJournalEntry } from "@/lib/profile/store";
import type { Conviction } from "@/lib/profile/types";
import { playUiClick } from "@/lib/settings";

const CONVICTIONS: { v: Conviction; label: string }[] = [
  { v: 1, label: "Hunch" },
  { v: 2, label: "Leaning" },
  { v: 3, label: "Solid" },
  { v: 4, label: "Strong" },
  { v: 5, label: "High" },
];

/**
 * Capture a thesis BEFORE acting — including "what would change my mind". That
 * pre-commitment is what later makes an honest, hindsight-proof review possible.
 */
export function ThesisForm({
  ticker,
  priceAtEntry,
  onSaved,
}: {
  ticker: string;
  priceAtEntry?: number;
  onSaved?: () => void;
}) {
  const [thesis, setThesis] = useState("");
  const [conviction, setConviction] = useState<Conviction>(3);
  const [horizon, setHorizon] = useState("3 months");
  const [changeMyMind, setChangeMyMind] = useState("");
  const [saved, setSaved] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!thesis.trim()) return;
    addJournalEntry({ ticker, thesis, conviction, horizon, changeMyMind, priceAtEntry });
    playUiClick();
    setThesis("");
    setChangeMyMind("");
    setConviction(3);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-xs font-medium text-foreground">
          Your thesis for {ticker}
        </label>
        <textarea
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          rows={3}
          placeholder="Why might this be a good (or bad) investment? What's the story?"
          className="mt-1 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-foreground">Conviction</label>
          <div className="mt-1 flex gap-1" role="group" aria-label="Conviction">
            {CONVICTIONS.map((c) => (
              <button
                key={c.v}
                type="button"
                onClick={() => setConviction(c.v)}
                aria-pressed={conviction === c.v}
                title={c.label}
                className={`btn-chip ${conviction === c.v ? "btn-chip-active" : "btn-chip-inactive"}`}
              >
                {c.v}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-[8rem] flex-1">
          <label className="text-xs font-medium text-foreground">Horizon</label>
          <input
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            placeholder="e.g. 3 months"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-accent">What would change my mind?</label>
        <input
          value={changeMyMind}
          onChange={(e) => setChangeMyMind(e.target.value)}
          placeholder="The disconfirming evidence you'll watch for"
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={!thesis.trim()} className="btn-primary disabled:opacity-50">
          Log thesis
        </button>
        {saved && <span className="text-xs font-medium text-up">Saved to your journal ✓</span>}
      </div>
    </form>
  );
}
