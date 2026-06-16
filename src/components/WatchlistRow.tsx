"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getWatchlist } from "@/lib/watchlist";
import { MSAD_EVENTS } from "@/lib/brand";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import { MiniSparkline } from "./MiniSparkline";
import type { TileQuote } from "./StockTile";

type SortMode = "custom" | "change" | "alpha";

export function WatchlistRow({
  quotes: catalogQuotes,
  className = "",
}: {
  quotes: Record<string, TileQuote>;
  className?: string;
}) {
  const [tickers, setTickers] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, TileQuote>>({});
  const [sort, setSort] = useState<SortMode>("custom");
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [pulse, setPulse] = useState<Record<string, boolean>>({});
  const prevPrices = useRef<Record<string, number>>({});

  const refresh = useCallback(() => setTickers(getWatchlist()), []);

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(MSAD_EVENTS.watchlist, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(MSAD_EVENTS.watchlist, refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!tickers.length) return;
    const load = () =>
      fetch(`/api/quotes?symbols=${tickers.join(",")}`)
        .then((r) => r.json())
        .then((next: Record<string, TileQuote>) => {
          setQuotes((prev) => {
            const p: Record<string, boolean> = {};
            for (const t of tickers) {
              const old = prevPrices.current[t] ?? prev[t]?.price;
              const nw = next[t]?.price;
              if (old != null && nw != null && old !== nw) p[t] = true;
              if (nw != null) prevPrices.current[t] = nw;
            }
            if (Object.keys(p).length) setPulse((x) => ({ ...x, ...p }));
            return { ...catalogQuotes, ...next };
          });
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [tickers, catalogQuotes]);

  useEffect(() => {
    if (!tickers.length) return;
    fetch(`/api/sparklines?symbols=${tickers.join(",")}`)
      .then((r) => r.json())
      .then(setSparklines)
      .catch(() => {});
  }, [tickers]);

  if (!tickers.length) return null;

  const sorted = [...tickers].sort((x, y) => {
    if (sort === "alpha") return x.localeCompare(y);
    if (sort === "change") {
      return (quotes[y]?.changePercentage ?? 0) - (quotes[x]?.changePercentage ?? 0);
    }
    return 0;
  });

  return (
    <section className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Your watchlist</h2>
        <div className="flex gap-1">
          {(
            [
              ["custom", "Order"],
              ["change", "% change"],
              ["alpha", "A–Z"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSort(id)}
              className={`btn-pill text-[0.6rem] ${sort === id ? "btn-pill-active" : "btn-pill-inactive"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {sorted.map((t) => {
          const q = quotes[t];
          const up = (q?.changePercentage ?? 0) >= 0;
          return (
            <Link
              key={t}
              href={`/stock/${t}`}
              className={`surface surface-interactive shrink-0 rounded-2xl px-4 py-3 ${
                pulse[t] ? "animate-pulse ring-2 ring-accent/30" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono font-bold">{t}</div>
                  {q && (
                    <div className="mt-1 font-mono text-sm">
                      {formatCurrency(q.price)}{" "}
                      <span className={up ? "text-up" : "text-down"}>
                        {formatSignedPercent(q.changePercentage)}
                      </span>
                    </div>
                  )}
                </div>
                {sparklines[t] && <MiniSparkline data={sparklines[t]} up={up} />}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
