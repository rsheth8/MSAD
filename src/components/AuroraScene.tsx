"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { seedFromTicker } from "@/components/prototypes/types";
import { BRAND } from "@/lib/brand";

const AuroraBg = dynamic(
  () => import("@/components/prototypes/AuroraBg").then((m) => m.AuroraBg),
  { ssr: false },
);

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
 * Full-viewport sentiment aurora backdrop. Drop one per page. Pass `series`
 * (indexed price points) on a stock page to tint the aurora; on neutral pages
 * it leans to a calm, brand-positive tone.
 */
export default function AuroraScene({
  accent = BRAND.accent,
  series,
  trend,
  volatility,
  ticker,
}: {
  accent?: string;
  series?: number[];
  trend?: number;
  volatility?: number;
  /** Optional ticker for a stable per-stock aurora phase */
  ticker?: string;
}) {
  const isDark = useThemeDark();
  const derived = useMemo(() => deriveFromSeries(series), [series]);
  const t = trend ?? derived.trend ?? 0.16;
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

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      style={{ width: "100vw", height: "100vh" }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <AuroraBg
          seed={seed}
          trend={t}
          volatility={v}
          isDark={isDark}
          accent={accent}
          mouseRef={mouseRef}
        />
      </Suspense>
    </div>
  );
}
