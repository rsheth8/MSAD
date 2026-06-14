"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getWatchlist } from "@/lib/watchlist";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import type { TileQuote } from "./StockTile";

export function WatchlistRow({ quotes }: { quotes: Record<string, TileQuote> }) {
  const [tickers, setTickers] = useState<string[]>([]);

  useEffect(() => {
    const refresh = () => setTickers(getWatchlist());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("amsad-watchlist", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("amsad-watchlist", refresh);
    };
  }, []);

  if (!tickers.length) return null;

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Your watchlist</h2>
        <Link href={`/stock/${tickers[0]}`} className="text-xs text-muted hover:text-foreground">
          Open first →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {tickers.map((t) => {
          const q = quotes[t];
          return (
            <Link
              key={t}
              href={`/stock/${t}`}
              className="surface-interactive shrink-0 rounded-2xl px-4 py-3"
            >
              <div className="font-mono font-bold">{t}</div>
              {q && (
                <div className="mt-1 font-mono text-sm">
                  {formatCurrency(q.price)}{" "}
                  <span className={q.changePercentage >= 0 ? "text-up" : "text-down"}>
                    {formatSignedPercent(q.changePercentage)}
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
