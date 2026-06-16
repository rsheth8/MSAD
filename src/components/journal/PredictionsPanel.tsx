"use client";

import Link from "next/link";
import { dueForResolution } from "@/lib/profile/calibration";
import { deletePrediction, resolvePrediction } from "@/lib/profile/store";
import type { Prediction } from "@/lib/profile/types";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function PredictionsPanel({ predictions }: { predictions: Prediction[] }) {
  const due = dueForResolution(predictions);
  const open = predictions.filter((p) => !p.resolved && !due.includes(p));
  const resolved = predictions.filter((p) => p.resolved);

  return (
    <div className="space-y-4">
      {due.length > 0 && (
        <div className="surface rounded-2xl p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
            Ready to score ({due.length})
          </p>
          <ul className="space-y-2">
            {due.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-background p-3">
                <p className="text-sm text-foreground">{p.question}</p>
                <p className="mt-0.5 text-[0.7rem] text-muted-2">
                  You said {Math.round(p.confidence * 100)}% likely · due {fmtDate(p.resolveOn)}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => resolvePrediction(p.id, true)}
                    className="btn-chip btn-chip-inactive text-up"
                  >
                    Yes, it happened
                  </button>
                  <button
                    type="button"
                    onClick={() => resolvePrediction(p.id, false)}
                    className="btn-chip btn-chip-inactive text-down"
                  >
                    No, it didn&apos;t
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Open predictions ({open.length})</p>
          <ul className="space-y-2">
            {open.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs"
              >
                <span className="min-w-0 truncate text-foreground">
                  <Link href={`/stock/${p.ticker}`} className="font-mono font-bold text-accent">
                    {p.ticker}
                  </Link>{" "}
                  {p.question}
                </span>
                <span className="shrink-0 text-muted-2">
                  {Math.round(p.confidence * 100)}% · {fmtDate(p.resolveOn)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {resolved.length > 0 && (
        <details className="text-xs text-muted">
          <summary className="cursor-pointer">Resolved ({resolved.length})</summary>
          <ul className="mt-2 space-y-1">
            {resolved.map((p) => {
              const leanedYes = p.confidence >= 0.5;
              const correct = leanedYes === p.outcome;
              return (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {p.ticker} · {p.question}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={correct ? "text-up" : "text-down"}>
                      {correct ? "✓" : "✗"}
                    </span>
                    <button
                      type="button"
                      onClick={() => deletePrediction(p.id)}
                      aria-label="Delete prediction"
                      className="text-muted-2 hover:text-down"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {predictions.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-background/50 p-6 text-center text-sm text-muted">
          No predictions yet. Make a call on any stock — we&apos;ll resurface it on its due date so you
          can score yourself and build a calibration track record.
        </p>
      )}
    </div>
  );
}
