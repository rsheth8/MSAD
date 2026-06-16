"use client";

import type { CatalogRow } from "@/lib/catalog";
import type { TileQuote } from "./StockTile";
import { StockTile } from "./StockTile";
import { HorizontalScrollLane } from "./HorizontalScrollLane";

export function StockCarousel({
  row,
  quotes,
  sparklines = {},
  pulseTickers = {},
  large = false,
}: {
  row: CatalogRow;
  quotes: Record<string, TileQuote>;
  sparklines?: Record<string, number[]>;
  pulseTickers?: Record<string, boolean>;
  large?: boolean;
}) {
  const loop = [...row.items, ...row.items];

  return (
    <section className="carousel-row space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {row.title}
        </h2>
        <p className="text-xs text-muted">{row.subtitle}</p>
      </div>

      <div className="relative -mx-4 sm:-mx-6">
        <div className="pointer-events-none absolute top-0 bottom-5 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent sm:w-20" />
        <div className="pointer-events-none absolute top-0 bottom-5 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent sm:w-20" />

        <HorizontalScrollLane
          durationSec={row.durationSec}
          loop
          pauseOnHover
          draggable
          contentClassName="flex gap-4 px-4 pt-1 pb-4 sm:px-6"
        >
          {loop.map((item, i) => (
            <StockTile
              key={`${item.ticker}-${i}`}
              item={item}
              quote={quotes[item.ticker]}
              sparkline={sparklines[item.ticker]}
              pulse={pulseTickers[item.ticker]}
              large={large}
            />
          ))}
        </HorizontalScrollLane>
      </div>
    </section>
  );
}
