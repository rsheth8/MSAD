"use client";

import Link from "next/link";
import type { CatalogItem } from "@/lib/catalog";
import { tickerHue } from "@/lib/catalog";
import { formatCurrency, formatSignedPercent } from "@/lib/format";

export interface TileQuote {
  price: number;
  changePercentage: number;
}

export function StockTile({
  item,
  quote,
  large = false,
}: {
  item: CatalogItem;
  quote?: TileQuote;
  large?: boolean;
}) {
  const hue = tickerHue(item.ticker);
  const up = (quote?.changePercentage ?? 0) >= 0;

  return (
    <Link
      href={`/stock/${item.ticker}`}
      className={`group relative flex shrink-0 flex-col justify-end overflow-hidden rounded-2xl border border-white/10 interactive hover:scale-[1.04] hover:z-10 ${
        large ? "h-44 w-64 sm:h-52 sm:w-72" : "h-36 w-44 sm:h-40 sm:w-52"
      }`}
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 55% 42%) 0%, hsl(${(hue + 40) % 360} 45% 22%) 100%)`,
        boxShadow: "0 12px 32px -12px rgba(17,19,23,0.35)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.35), transparent 55%)",
        }}
      />

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
