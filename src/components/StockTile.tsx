"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CatalogItem } from "@/lib/catalog";
import { tickerHue } from "@/lib/catalog";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import { MiniSparkline } from "./MiniSparkline";

export interface TileQuote {
  price: number;
  changePercentage: number;
}

export function StockTile({
  item,
  quote,
  sparkline,
  pulse = false,
  large = false,
}: {
  item: CatalogItem;
  quote?: TileQuote;
  sparkline?: number[];
  pulse?: boolean;
  large?: boolean;
}) {
  const hue = tickerHue(item.ticker);
  const up = (quote?.changePercentage ?? 0) >= 0;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const shellClass = `group carousel-tile relative flex shrink-0 flex-col justify-end overflow-hidden rounded-2xl border border-white/15 backdrop-blur-xl backdrop-saturate-150 interactive hover:scale-[1.04] hover:z-10 ${
    pulse ? "ring-2 ring-white/50" : ""
  } ${large ? "h-44 w-64 sm:h-52 sm:w-72" : "h-36 w-44 sm:h-40 sm:w-52"}`;
  const shellStyle = {
    background: `linear-gradient(145deg, hsl(${hue} 60% 46% / 0.62) 0%, hsl(${(hue + 40) % 360} 50% 24% / 0.7) 100%)`,
    boxShadow: "0 12px 32px -12px rgba(17,19,23,0.35)",
  };

  if (!mounted) {
    return <div className={shellClass} style={shellStyle} aria-hidden />;
  }

  return (
    <Link
      href={`/stock/${item.ticker}`}
      className={shellClass}
      style={shellStyle}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.35), transparent 55%)",
        }}
      />
      {/* bottom scrim keeps white text legible over the translucent glass */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.40), transparent)",
        }}
      />

      {sparkline && sparkline.length > 0 && (
        <div className="absolute right-2 top-2 opacity-70">
          <MiniSparkline data={sparkline} up={up} stroke="rgba(255,255,255,0.85)" />
        </div>
      )}

      <div className="relative p-4 text-white">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${
            item.kind === "etf" ? "bg-white/25" : "bg-black/20"
          }`}
        >
          {item.kind === "etf" ? "ETF" : "Stock"}
        </span>
        <div className={`mt-2 font-mono font-bold tracking-tight ${large ? "text-2xl" : "text-xl"}`}>
          {item.ticker}
        </div>
        <div className={`truncate text-white/85 ${large ? "text-sm" : "text-xs"}`}>{item.name}</div>
        {quote && (
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-sm font-semibold tabular-nums">
              {formatCurrency(quote.price)}
            </span>
            <span
              className={`font-mono text-xs font-medium tabular-nums ${
                up ? "text-emerald-200" : "text-red-200"
              }`}
            >
              {formatSignedPercent(quote.changePercentage)}
            </span>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-white/70 transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  );
}
