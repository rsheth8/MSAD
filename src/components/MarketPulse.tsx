"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MarketPulsePayload } from "@/lib/news/types";
import { CATEGORY_LABELS } from "@/lib/news/categorize";
import { HorizontalScrollLane } from "./HorizontalScrollLane";

const SCROLL_SPEED = 0.5;

export function MarketPulse({ className = "" }: { className?: string }) {
  const [pulse, setPulse] = useState<MarketPulsePayload | null>(null);

  useEffect(() => {
    fetch("/api/news/market")
      .then((r) => r.json())
      .then((d: MarketPulsePayload) => setPulse(d))
      .catch(() => setPulse(null));
  }, []);

  if (!pulse?.headlines.length) return null;

  const items = [...pulse.headlines, ...pulse.headlines];

  return (
    <section className={`overflow-hidden ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
          Market pulse
        </div>
        <div className="flex items-center gap-3">
          {pulse.isMock && <span className="text-[0.6rem] text-muted">Sample headlines</span>}
          <Link href="/news" className="text-[0.65rem] font-semibold text-accent hover:underline">
            See all →
          </Link>
        </div>
      </div>
      <div className="surface rounded-2xl border border-border px-4 pb-2 pt-3">
        <HorizontalScrollLane
          autoSpeed={SCROLL_SPEED}
          loop
          pauseOnHover
          draggable
          contentClassName="flex gap-8 pb-3"
        >
          {items.map((h, i) => (
            <div
              key={`${h.url}-${i}`}
              className="flex max-w-md shrink-0 items-center gap-3 py-0.5 text-xs"
            >
              <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-muted">
                {CATEGORY_LABELS[h.category]}
              </span>
              <a
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
                className="truncate font-medium text-foreground transition-colors hover:text-accent"
              >
                {h.title}
              </a>
              {h.tickers[0] && (
                <Link
                  href={`/stock/${h.tickers[0]}`}
                  draggable={false}
                  className="shrink-0 font-mono text-[0.65rem] text-accent hover:underline"
                >
                  {h.tickers[0]}
                </Link>
              )}
            </div>
          ))}
        </HorizontalScrollLane>
      </div>
    </section>
  );
}
