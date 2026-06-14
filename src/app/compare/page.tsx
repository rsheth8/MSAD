"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReportCard } from "@/lib/types";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import { GlassCard } from "@/components/GlassCard";

export default function ComparePage() {
  const [a, setA] = useState("AAPL");
  const [b, setB] = useState("MSFT");
  const [cardA, setCardA] = useState<ReportCard | null>(null);
  const [cardB, setCardB] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const pa = p.get("a");
    const pb = p.get("b");
    if (pa) setA(pa.toUpperCase());
    if (pb) setB(pb.toUpperCase());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/report/${a}`).then((r) => r.json()),
      fetch(`/api/report/${b}`).then((r) => r.json()),
    ])
      .then(([ra, rb]) => {
        setCardA(ra);
        setCardB(rb);
      })
      .finally(() => setLoading(false));
  }, [a, b]);

  function runCompare() {
    const url = new URL(window.location.href);
    url.searchParams.set("a", a);
    url.searchParams.set("b", b);
    window.history.replaceState({}, "", url.toString());
  }

  return (
    <main className="mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="text-xs text-muted hover:text-foreground">
        ← Dashboard
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold">Compare tickers</h1>
      <p className="mt-1 text-xs text-muted">Side-by-side snapshot — click through for full reports.</p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <input value={a} onChange={(e) => setA(e.target.value.toUpperCase())} className="surface w-24 rounded-lg px-3 py-2 font-mono text-sm" />
        <span className="text-muted">vs</span>
        <input value={b} onChange={(e) => setB(e.target.value.toUpperCase())} className="surface w-24 rounded-lg px-3 py-2 font-mono text-sm" />
        <button type="button" onClick={runCompare} className="btn-primary">
          Compare
        </button>
      </div>

      {loading && <div className="mt-8 animate-pulse text-sm text-muted">Loading…</div>}

      {!loading && cardA && cardB && (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[cardA, cardB].map((card) => (
            <GlassCard key={card.ticker} className="p-5">
              <Link href={`/stock/${card.ticker}`} className="font-display text-lg font-bold hover:text-accent">
                {card.name}
              </Link>
              <div className="font-mono text-xs text-muted">{card.ticker} · {card.industry}</div>
              <div className="mt-4 font-mono text-2xl font-semibold">{formatCurrency(card.price)}</div>
              <div className="mt-2 flex gap-3 text-xs">
                <span>1Y {formatSignedPercent(card.changes.year)}</span>
                <span>β {card.beta}</span>
              </div>
              <ul className="mt-4 space-y-1 text-xs">
                {card.metrics.slice(0, 4).map((m) => (
                  <li key={m.key} className="flex justify-between gap-2">
                    <span className="text-muted">{m.label}</span>
                    <span className="font-mono">{m.display}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}
        </div>
      )}
    </main>
  );
}
