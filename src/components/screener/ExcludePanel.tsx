"use client";

import { useState } from "react";
import {
  DEFAULT_EXCLUSIONS,
  getExclusions,
  resetExclusionsToDefault,
  setExclusions,
} from "@/lib/screener/exclusions";
import { FILTER_EXPLAINERS } from "@/lib/screener/explainers";
import { Explainer } from "@/components/Explainer";
import { GlassCard } from "@/components/GlassCard";

export function ExcludePanel({
  exclusions,
  onChange,
}: {
  exclusions: string[];
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  function add() {
    const t = input.trim().toUpperCase();
    if (!t || exclusions.includes(t)) return;
    const next = setExclusions([...exclusions, t]);
    onChange(next);
    setInput("");
  }

  function remove(t: string) {
    const next = setExclusions(exclusions.filter((x) => x !== t));
    onChange(next);
  }

  function reset() {
    const next = resetExclusionsToDefault();
    onChange(next);
  }

  return (
    <GlassCard className="mb-6 p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold"
      >
        <span className="flex items-center gap-2">
          Exclude tickers
          <span className="rounded-full bg-background px-2 py-0.5 text-[0.65rem] font-mono text-muted">
            {exclusions.length} hidden
          </span>
          <Explainer content={FILTER_EXPLAINERS.exclude} id="filter-exclude" />
        </span>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <p className="text-[0.65rem] text-muted">
            These symbols won&apos;t appear in any screen results. Defaults include mega-caps like
            AAPL and MSFT.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {exclusions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => remove(t)}
                className="btn-chip btn-chip-active font-mono"
                title="Click to remove from exclude list"
              >
                {t} ×
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="Add ticker"
              className="surface w-24 rounded-lg px-2 py-1.5 font-mono text-xs"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <button type="button" onClick={add} className="btn-ghost interactive text-xs">
              Add
            </button>
            <button type="button" onClick={reset} className="btn-ghost interactive text-xs">
              Reset defaults
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

export { DEFAULT_EXCLUSIONS, getExclusions };
