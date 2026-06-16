"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { allCatalogTickers, CATALOG_ROWS } from "@/lib/catalog";
import { formatSignedPercent } from "@/lib/format";
import { AccentPicker } from "./AccentPicker";
import { NeutralBackdrop } from "./NeutralBackdrop";
import { SectorHeatmap } from "./SectorHeatmap";
import { MarketPulse } from "./MarketPulse";
import { SoundToggle, ThemeToggle } from "./OnboardingModal";
import { AccountButton } from "./auth/AccountButton";
import { WatchlistRow } from "./WatchlistRow";
import { TickerSearch } from "./TickerSearch";
import type { TileQuote } from "./StockTile";
import { BRAND, MSAD_EVENTS, MSAD_STORAGE } from "@/lib/brand";

const MARKET_PULSE_EVENT = MSAD_EVENTS.marketPulse;

const StockCarousel = dynamic(
  () => import("./StockCarousel").then((m) => ({ default: m.StockCarousel })),
  { ssr: false },
);

export function HomeDashboard() {
  const router = useRouter();
  const [accent, setAccent] = useState<string>(BRAND.accent);
  const [quotes, setQuotes] = useState<Record<string, TileQuote>>({});
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [pulseTickers, setPulseTickers] = useState<Record<string, boolean>>({});
  const prevPrices = useRef<Record<string, number>>({});

  useEffect(() => {
    const saved = localStorage.getItem(MSAD_STORAGE.accent);
    if (saved) setAccent(saved);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    localStorage.setItem(MSAD_STORAGE.accent, accent);
  }, [accent]);

  useEffect(() => {
    const loadQuotes = () =>
      fetch("/api/quotes")
        .then((r) => r.json())
        .then((data: Record<string, TileQuote>) => {
          setQuotes((prev) => {
            const pulse: Record<string, boolean> = {};
            for (const t of Object.keys(data)) {
              const old = prevPrices.current[t] ?? prev[t]?.price;
              const nw = data[t]?.price;
              if (old != null && nw != null && old !== nw) pulse[t] = true;
              if (nw != null) prevPrices.current[t] = nw;
            }
            if (Object.keys(pulse).length) {
              setPulseTickers((p) => ({ ...p, ...pulse }));
              window.dispatchEvent(new CustomEvent(MARKET_PULSE_EVENT));
            }
            return data;
          });
        })
        .catch(() => {});

    loadQuotes();
    const id = setInterval(loadQuotes, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch(`/api/sparklines?symbols=${allCatalogTickers().slice(0, 12).join(",")}`)
      .then((r) => r.json())
      .then(setSparklines)
      .catch(() => {});
  }, []);

  const featured = CATALOG_ROWS[0];

  const avgDayChange = useMemo(() => {
    const vals = Object.values(quotes)
      .map((q) => q.changePercentage)
      .filter((v) => Number.isFinite(v));
    if (!vals.length) return undefined;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [quotes]);

  const catalogAvg = avgDayChange != null && (
    <div className="text-right">
      <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
        Catalog avg
      </div>
      <div
        className={`font-mono text-sm font-semibold tabular-nums ${
          avgDayChange >= 0 ? "text-up" : "text-down"
        }`}
      >
        {formatSignedPercent(avgDayChange)}
      </div>
    </div>
  );

  return (
    <>
      <NeutralBackdrop accent={accent} />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className="sheen rounded-md px-2 py-0.5 text-xs font-bold tracking-wide text-foreground"
                style={{ background: "var(--accent)" }}
              >
                {BRAND.id}
              </span>
              <h1 className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {BRAND.name}
              </h1>
              <span className="hidden text-xs text-muted-2 sm:inline">·</span>
              <span className="hidden text-xs text-muted-2 sm:inline">{BRAND.authors}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/discover" className="btn-primary text-xs">
                Discover stocks
              </Link>
              <Link href="/explore" className="btn-ghost interactive text-xs">
                Explore
              </Link>
              <Link href="/news" className="btn-ghost interactive text-xs">
                Market news
              </Link>
              <Link href="/practice" className="btn-ghost interactive text-xs">
                Hypothesis Lab
              </Link>
              <Link href="/dashboard" className="btn-ghost interactive text-xs">
                My dashboard
              </Link>
              <ThemeToggle />
              <SoundToggle />
              <AccentPicker value={accent} onChange={setAccent} />
              <AccountButton />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="min-w-0 text-xs text-muted sm:text-sm lg:max-w-3xl">{BRAND.tagline}</p>
            <div className="shrink-0 self-start sm:self-center">
              <TickerSearch compact onSubmit={(t) => router.push(`/stock/${t}`)} />
            </div>
          </div>
        </header>

        <div className="hero-hint surface mx-auto mb-10 max-w-2xl rounded-2xl px-6 py-4 text-center lg:mb-12">
          <p className="text-sm leading-relaxed text-muted">
            Pick a tile for a full stock report, use{" "}
            <Link href="/discover" className="font-medium text-accent hover:underline">
              Discover
            </Link>{" "}
            to screen by fundamentals,{" "}
            <Link href="/explore" className="font-medium text-accent hover:underline">
              Explore
            </Link>{" "}
            to filter the universe, or{" "}
            <Link href="/news" className="font-medium text-accent hover:underline">
              Market news
            </Link>{" "}
            for headlines. Educational only — not financial advice.
          </p>
        </div>

        <SectorHeatmap quotes={quotes} trailing={catalogAvg} className="mb-10" />
        <MarketPulse className="mb-10" />
        <WatchlistRow quotes={quotes} className="mb-12" />

        <div className="mb-12">
          <StockCarousel
            row={featured}
            quotes={quotes}
            sparklines={sparklines}
            pulseTickers={pulseTickers}
            large
          />
        </div>

        <div className="space-y-16 pb-8">
          {CATALOG_ROWS.slice(1).map((row) => (
            <StockCarousel
              key={row.id}
              row={row}
              quotes={quotes}
              sparklines={sparklines}
              pulseTickers={pulseTickers}
            />
          ))}
        </div>

        <footer className="mt-4 border-t border-border/60 pt-6 text-center text-[0.65rem] leading-relaxed text-muted-2 sm:text-xs">
          Educational only — not financial advice. Use{" "}
          <Link href="/discover" className="text-accent hover:underline">
            Discover
          </Link>
          ,{" "}
          <Link href="/explore" className="text-accent hover:underline">
            Explore
          </Link>
          , or{" "}
          <Link href="/news" className="text-accent hover:underline">
            Market news
          </Link>{" "}
          to dig deeper.
        </footer>
      </main>
    </>
  );
}
