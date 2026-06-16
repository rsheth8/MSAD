"use client";

import { useState } from "react";
import {
  describeParsedCriteria,
  parseNaturalLanguageCriteria,
} from "@/lib/discovery/parse-criteria";
import { profileToScreenerRequest } from "@/lib/discovery/profile-to-screener";
import { normalizeInvestorProfile } from "@/lib/discovery/investor-profile";
import type { InvestorProfile } from "@/lib/discovery/types";
import type { ScreenerResultRow } from "@/lib/screener/types";
import { getExclusions } from "@/lib/screener/exclusions";
import { ScreenerResults } from "@/components/screener/ScreenerResults";

export function CriteriaSearch({
  investorProfile,
}: {
  investorProfile?: InvestorProfile | null;
}) {
  const [text, setText] = useState(investorProfile?.naturalLanguageCriteria ?? "");
  const [rows, setRows] = useState<ScreenerResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedHint, setParsedHint] = useState<string[]>([]);
  const [isMock, setIsMock] = useState(false);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const parsed = parseNaturalLanguageCriteria(text);
    setParsedHint(describeParsedCriteria(parsed));

    const profile = normalizeInvestorProfile({
      ...investorProfile,
      naturalLanguageCriteria: text,
    });
    const body = profileToScreenerRequest(profile, getExclusions());

    try {
      const res = await fetch("/api/screener", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setRows(data.rows ?? []);
      setIsMock(Boolean(data.isMock));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface rounded-2xl p-5">
      <h2 className="font-display text-sm font-semibold text-foreground">Describe what you want</h2>
      <p className="mt-0.5 text-[0.7rem] text-muted">
        Plain English → screen. Combines with your saved criteria in Settings.
      </p>
      <form onSubmit={(e) => void runSearch(e)} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "mid-cap tech under $80, low volatility"'
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button type="submit" disabled={loading || !text.trim()} className="btn-primary shrink-0 text-sm">
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      {parsedHint.length > 0 && (
        <p className="mt-2 text-[0.65rem] text-muted-2">
          Interpreted as: {parsedHint.join(" · ")}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-down">{error}</p>}
      {rows.length > 0 && (
        <div className="mt-4">
          <ScreenerResults rows={rows} title="Criteria matches" isMock={isMock} />
        </div>
      )}
    </section>
  );
}
