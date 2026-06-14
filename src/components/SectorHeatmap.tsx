"use client";

import Link from "next/link";
import { formatSignedPercent } from "@/lib/format";
import { SECTOR_ETFS } from "@/lib/sectors";
import type { TileQuote } from "./StockTile";

export function SectorHeatmap({ quotes }: { quotes: Record<string, TileQuote> }) {
  return (
    <section className="mb-10">
      <div className="mb-3">
        <h2 className="font-display text-lg font-bold tracking-tight">Sector pulse</h2>
        <p className="text-xs text-muted">Today&apos;s move by sector ETF — a quick read on market mood</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {SECTOR_ETFS.map(({ ticker, label }) => {
          const q = quotes[ticker];
          const pct = q?.changePercentage ?? 0;
          const up = pct >= 0;
          const intensity = Math.min(Math.abs(pct) / 3, 1);
          return (
            <Link
              key={ticker}
              href={`/stock/${ticker}`}
              className="surface-interactive rounded-xl px-3 py-2.5"
              style={{
                background: up
                  ? `color-mix(in srgb, var(--up) ${8 + intensity * 14}%, var(--card))`
                  : `color-mix(in srgb, var(--down) ${8 + intensity * 14}%, var(--card))`,
              }}
            >
              <div className="font-mono text-[0.65rem] font-bold text-muted">{ticker}</div>
              <div className="truncate text-[0.65rem] text-foreground">{label}</div>
              <div
                className={`mt-1 font-mono text-sm font-semibold tabular-nums ${up ? "text-up" : "text-down"}`}
              >
                {q ? formatSignedPercent(pct) : "—"}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
