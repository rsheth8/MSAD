"use client";

import { useState } from "react";
import Link from "next/link";
import { requestExplain } from "@/lib/ai/request";
import { useDepth } from "@/components/ai/DepthProvider";
import { Markish } from "@/components/ai/Markish";
import {
  deleteJournalEntry,
  reviewJournalEntry,
  setJournalCritique,
} from "@/lib/profile/store";
import type { JournalEntry, JournalOutcome } from "@/lib/profile/types";

const OUTCOMES: { v: JournalOutcome; label: string; tone: string }[] = [
  { v: "right", label: "Reasoning held up", tone: "text-up" },
  { v: "wrong", label: "I was wrong", tone: "text-down" },
  { v: "mixed", label: "Mixed", tone: "text-neutral" },
  { v: "too-early", label: "Too early", tone: "text-muted" },
];

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function JournalFeed({
  entries,
  showTicker = true,
  emptyHint = "No entries yet. Log a thesis on any stock to start building your track record.",
}: {
  entries: JournalEntry[];
  showTicker?: boolean;
  emptyHint?: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-background/50 p-6 text-center text-sm text-muted">
        {emptyHint}
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {entries.map((e) => (
        <JournalItem key={e.id} entry={e} showTicker={showTicker} />
      ))}
    </ul>
  );
}

function JournalItem({ entry, showTicker }: { entry: JournalEntry; showTicker: boolean }) {
  const { depth } = useDepth();
  const [critique, setCritique] = useState<string | undefined>(entry.aiCritique);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [note, setNote] = useState("");

  async function coach() {
    setBusy(true);
    try {
      const res = await requestExplain({
        ticker: entry.ticker,
        depth,
        kind: "journal",
        thesis: entry.thesis,
        horizon: entry.horizon,
      });
      setCritique(res.answer);
      setJournalCritique(entry.id, res.answer);
    } catch {
      setCritique("Couldn't reach the coach right now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function review(outcome: JournalOutcome) {
    reviewJournalEntry(entry.id, { outcome, reviewNote: note });
    setReviewing(false);
    setNote("");
  }

  const age = daysSince(entry.createdAt);

  return (
    <li className="surface rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {showTicker && (
              <Link
                href={`/stock/${entry.ticker}`}
                className="rounded-md bg-accent/15 px-1.5 py-0.5 font-mono font-bold text-accent hover:underline"
              >
                {entry.ticker}
              </Link>
            )}
            <span className="text-muted-2">
              {age === 0 ? "today" : `${age}d ago`} · conviction {entry.conviction}/5 · {entry.horizon}
            </span>
            {entry.outcome && (
              <span className="rounded-md bg-foreground/8 px-1.5 py-0.5 font-medium text-muted">
                reviewed: {entry.outcome.replace("-", " ")}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-foreground/90">{entry.thesis}</p>
          {entry.changeMyMind && (
            <p className="mt-1 text-xs text-muted">
              <span className="font-medium text-accent">Would change my mind:</span> {entry.changeMyMind}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => deleteJournalEntry(entry.id)}
          aria-label="Delete entry"
          className="shrink-0 rounded-md px-1.5 text-muted-2 hover:text-down"
        >
          ✕
        </button>
      </div>

      {critique && (
        <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs leading-relaxed">
          <p className="mb-1 font-semibold text-accent">Coach&apos;s read on your reasoning</p>
          <Markish text={critique} className="text-foreground/90" />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={coach}
          disabled={busy}
          className="btn-chip btn-chip-inactive disabled:opacity-50"
        >
          {busy ? "Coaching…" : critique ? "Re-coach" : "Coach my reasoning"}
        </button>
        {!entry.outcome && !reviewing && (
          <button
            type="button"
            onClick={() => setReviewing(true)}
            className="btn-chip btn-chip-inactive"
            title="Honest look-back, hindsight-proof because you wrote the thesis up front"
          >
            Look back
          </button>
        )}
      </div>

      {reviewing && (
        <div className="mt-3 rounded-xl border border-border bg-background p-3">
          <p className="text-xs text-muted">
            Reminder of what you said would change your mind:{" "}
            <span className="text-foreground">{entry.changeMyMind || "— (none set)"}</span>
          </p>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What actually happened? (optional)"
            className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => review(o.v)}
                className={`btn-chip btn-chip-inactive ${o.tone}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}
