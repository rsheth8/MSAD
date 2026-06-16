"use client";

import { useMemo } from "react";
import { summarizeCalibration } from "@/lib/profile/calibration";
import type { Prediction } from "@/lib/profile/types";

/**
 * The readiness ring — your honest "am I getting better?" number. Built from
 * self-scored predictions, capped until there's a real sample. The thing no
 * tip-service can fake, and the bridge from practice to real money.
 */
export function CalibrationCard({ predictions }: { predictions: Prediction[] }) {
  const s = useMemo(() => summarizeCalibration(predictions), [predictions]);
  const { score, label, blurb } = s.readiness;
  const circ = 2 * Math.PI * 34;

  return (
    <div className="surface rounded-2xl p-5">
      <div className="flex items-center gap-4">
        <div className="relative h-[84px] w-[84px] shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="7" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - score / 100)}
              style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-mono text-xl font-bold text-foreground">{score}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-2">
            Readiness score
          </p>
          <p className="font-display text-base font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{blurb}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Resolved" value={String(s.resolved)} />
        <Stat label="Accuracy" value={s.accuracy === null ? "—" : `${Math.round(s.accuracy * 100)}%`} />
        <Stat
          label="Bias"
          value={
            s.overconfidence === null
              ? "—"
              : s.overconfidence > 0.05
                ? "Overconf."
                : s.overconfidence < -0.05
                  ? "Underconf."
                  : "Balanced"
          }
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-2 py-2">
      <p className="font-mono text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[0.6rem] uppercase tracking-wide text-muted-2">{label}</p>
    </div>
  );
}
