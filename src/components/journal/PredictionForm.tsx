"use client";

import { useState } from "react";
import { addPrediction } from "@/lib/profile/store";
import type { PredictionKind } from "@/lib/profile/types";
import { playUiClick } from "@/lib/settings";

const PRESETS: { kind: PredictionKind; label: string; question: (t: string) => string; days: number }[] = [
  { kind: "direction", label: "Up in 30 days?", question: (t) => `Will ${t} be higher 30 days from now?`, days: 30 },
  { kind: "direction", label: "Up in 90 days?", question: (t) => `Will ${t} be higher 90 days from now?`, days: 90 },
  { kind: "earnings", label: "Beats next earnings?", question: (t) => `Will ${t} beat EPS estimates at its next report?`, days: 45 },
];

/**
 * A falsifiable, self-scored forecast. Confidence is a probability — that's what
 * makes the calibration score meaningful (not just "right/wrong").
 */
export function PredictionForm({ ticker, onSaved }: { ticker: string; onSaved?: () => void }) {
  const [idx, setIdx] = useState(0);
  const [confidence, setConfidence] = useState(0.65);
  const [saved, setSaved] = useState(false);
  const preset = PRESETS[idx];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    addPrediction({
      ticker,
      question: preset.question(ticker.toUpperCase()),
      kind: preset.kind,
      horizonDays: preset.days,
      confidence,
    });
    playUiClick();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setIdx(i)}
            aria-pressed={idx === i}
            className={`btn-chip ${idx === i ? "btn-chip-active" : "btn-chip-inactive"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-foreground">{preset.question(ticker.toUpperCase())}</p>

      <div>
        <div className="flex items-center justify-between text-xs">
          <label className="font-medium text-foreground">How sure are you? (probability of yes)</label>
          <span className="font-mono font-semibold text-accent">{Math.round(confidence * 100)}%</span>
        </div>
        <input
          type="range"
          min={50}
          max={99}
          value={Math.round(confidence * 100)}
          onChange={(e) => setConfidence(Number(e.target.value) / 100)}
          className="mt-2 w-full accent-[var(--accent)]"
          aria-label="Confidence"
        />
        <div className="flex justify-between text-[0.65rem] text-muted-2">
          <span>50% · coin flip</span>
          <span>99% · near certain</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary">
          Log prediction
        </button>
        {saved && <span className="text-xs font-medium text-up">Logged — we&apos;ll resurface it to score ✓</span>}
      </div>
    </form>
  );
}
