"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { allCatalogTickers, CATALOG_ROWS } from "@/lib/catalog";
import { AccentPicker } from "./AccentPicker";
import { AmbientOrbs } from "./AmbientOrbs";
import { SectorHeatmap } from "./SectorHeatmap";
import { SoundToggle, ThemeToggle } from "./OnboardingModal";
import { StockCarousel } from "./StockCarousel";
import { WatchlistRow } from "./WatchlistRow";
import { TickerSearch } from "./TickerSearch";
import type { TileQuote } from "./StockTile";

const SceneBackground = dynamic(() => import("./SceneBackground"), { ssr: false });

const DEFAULT_ACCENT = "#16a34a";

export function HomeDashboard() {
  const router = useRouter();
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [quotes, setQuotes] = useState<Record<string, TileQuote>>({});
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [pulseTickers, setPulseTickers] = useState<Record<string, boolean>>({});
  const prevPrices = useRef<Record<string, number>>({});

  useEffect(() => {
    const saved = localStorage.getItem("amsad-accent");
    if (saved) setAccent(saved);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    localStorage.setItem("amsad-accent", accent);
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
            if (Object.keys(pulse).length) setPulseTickers((p) => ({ ...p, ...pulse }));
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

  return (
    <>
      <SceneBackground accent={accent} />
      <AmbientOrbs />
      <div className="texture-grid pointer-events-none fixed inset-0 -z-[5]" aria-hidden />

      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 flex flex-col items-start justify-between gap-6 sm:mb-10 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="sheen rounded-md px-2 py-0.5 text-xs font-bold tracking-wide text-white"
                style={{ background: "var(--accent)" }}
              >
                AMSAD
              </span>
              <h1 className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Stock &amp; ETF Dashboard
              </h1>
            </div>
            <p className="mt-1 max-w-md text-xs text-muted sm:text-sm">
              Browse stocks and ETFs Netflix-style — click any tile for a full beginner-friendly
              report card.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link href="/discover" className="btn-primary text-xs">
              Discover stocks
            </Link>
            <ThemeToggle />
            <SoundToggle />
            <AccentPicker value={accent} onChange={setAccent} />
            <TickerSearch onSubmit={(t) => router.push(`/stock/${t}`)} />
          </div>
        </header>

        <div className="hero-hint surface mx-auto mb-10 hidden max-w-xl rounded-2xl px-6 py-4 text-center lg:block">
          <p className="text-sm leading-relaxed text-muted">
            Pick a tile below to open a full report — or use{" "}
            <Link href="/discover" className="font-medium text-accent hover:underline">
              Discover
            </Link>{" "}
            to filter by market cap, P/E, and more.
          </p>
        </div>

        <SectorHeatmap quotes={quotes} />
        <WatchlistRow quotes={quotes} />

        <div className="mb-14">
          <StockCarousel
            row={featured}
            quotes={quotes}
            sparklines={sparklines}
            pulseTickers={pulseTickers}
            large
          />
        </div>

        <div className="space-y-12 pb-10">
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
      </main>
    </>
  );
}
