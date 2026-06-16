"use client";

import { useEffect, useState } from "react";
import type { NewsDigest } from "@/lib/news/types";
import { compareSentimentVerdict } from "@/lib/news/analysis";
import { fetchJson } from "@/lib/fetch-client";
import { isNewsDigest } from "@/lib/validators";
import { GlassCard } from "./GlassCard";

export function CompareSentiment({ tickerA, tickerB }: { tickerA: string; tickerB: string }) {
  const [digestA, setDigestA] = useState<NewsDigest | null>(null);
  const [digestB, setDigestB] = useState<NewsDigest | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDigestA(null);
    setDigestB(null);

    async function load(ticker: string): Promise<NewsDigest | null> {
      try {
        return await fetchJson(`/api/news/${encodeURIComponent(ticker)}`, isNewsDigest);
      } catch {
        return null;
      }
    }

    Promise.all([load(tickerA), load(tickerB)]).then(([a, b]) => {
      if (cancelled) return;
      setDigestA(a);
      setDigestB(b);
    });

    return () => {
      cancelled = true;
    };
  }, [tickerA, tickerB]);

  const verdict = compareSentimentVerdict(digestA, digestB);
  if (!verdict) return null;

  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
        News &amp; sentiment
      </div>
      <h3 className="mt-1 font-display text-lg font-bold">{verdict.headline}</h3>
      <p className="mt-2 text-sm text-muted">{verdict.detail}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[digestA, digestB].map(
          (d) =>
            d && (
              <div key={d.ticker} className="rounded-xl bg-foreground/[0.03] px-3 py-2 text-xs">
                <div className="font-mono font-semibold text-foreground">{d.ticker}</div>
                <div className="mt-1 text-muted">{d.summary}</div>
              </div>
            ),
        )}
      </div>
    </GlassCard>
  );
}
