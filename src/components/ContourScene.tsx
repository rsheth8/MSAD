"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { seedFromTicker } from "@/components/prototypes/types";
import { ContourBg } from "@/components/prototypes/ContourBg";
import { BRAND } from "@/lib/brand";
import { useIsMobile } from "@/lib/useIsMobile";

function useThemeDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.dataset.theme === "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

/** Map a percent change (e.g. +1.8) to -1..1 for shader sentiment. */
export function pctToColorTrend(pct: number): number {
  return Math.max(-1, Math.min(1, pct / 4));
}

/** Derive a -1..1 trend and 0..1 volatility from an indexed price series. */
function deriveFromSeries(series?: number[]): { trend?: number; volatility?: number } {
  if (!series || series.length < 2) return {};
  const first = series[0];
  const last = series[series.length - 1];
  const trend = Math.max(-1, Math.min(1, (last - first) / (Math.abs(first) || 1)));
  const rets: number[] = [];
  let mean = 0;
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1] || 1;
    const r = (series[i] - series[i - 1]) / Math.abs(prev);
    rets.push(r);
    mean += r;
  }
  mean /= rets.length;
  let variance = 0;
  for (const r of rets) variance += (r - mean) ** 2;
  variance /= Math.max(rets.length, 1);
  const sd = Math.sqrt(variance);
  const volatility = Math.max(0, Math.min(1, sd * 26));
  return { trend, volatility };
}

/**
 * Full-viewport topographic contour backdrop. Pass `series` on a stock page to
 * shape the elevation ridge from real price data. `colorChange` (percent, e.g.
 * today's move) tints lines and shading; terrain elevation still follows the
 * longer `series` when present.
 */
export default function ContourScene({
  accent = BRAND.accent,
  series,
  trend,
  volatility,
  colorChange,
  ticker,
  /** Fixed accent-leaning tint — no live sentiment or price-path coloring. */
  neutral = false,
}: {
  accent?: string;
  series?: number[];
  trend?: number;
  volatility?: number;
  /** Shortest-span percent change — drives line/fill color (e.g. today's move). */
  colorChange?: number;
  ticker?: string;
  neutral?: boolean;
}) {
  const isDark = useThemeDark();
  const isMobile = useIsMobile();
  const derived = useMemo(() => deriveFromSeries(series), [series]);
  const terrainTrend = trend ?? derived.trend ?? 0.16;
  const colorTrend = neutral
    ? 0.68
    : colorChange !== undefined
      ? pctToColorTrend(colorChange)
      : terrainTrend;
  const v = volatility ?? derived.volatility ?? 0.22;
  const seed = useMemo(() => (ticker ? seedFromTicker(ticker) : 0.42), [ticker]);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouseRef.current.x = e.clientX / window.innerWidth;
      mouseRef.current.y = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // On phones the always-on full-screen shader saturates the GPU and makes the
  // whole page (carousels especially) stutter. Skip WebGL entirely there — the
  // static CSS BackdropShell (rendered separately) stands in.
  if (isMobile) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      style={{ width: "100vw", height: "100vh" }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <ContourBg
          seed={seed}
          trend={terrainTrend}
          colorTrend={colorTrend}
          volatility={v}
          isDark={isDark}
          accent={accent}
          mouseRef={mouseRef}
          series={series}
          neutral={neutral}
        />
      </Suspense>
    </div>
  );
}
