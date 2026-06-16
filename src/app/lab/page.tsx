"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { BRAND } from "@/lib/brand";
import { pctToColorTrend } from "@/components/ContourScene";
import { seedFromTicker, type BgProps, type LiquidMaterial } from "@/components/prototypes/types";

const ContourBg = dynamic(
  () => import("@/components/prototypes/ContourBg").then((m) => m.ContourBg),
  { ssr: false },
);
const AuroraBg = dynamic(
  () => import("@/components/prototypes/AuroraBg").then((m) => m.AuroraBg),
  { ssr: false },
);
const FingerprintBg = dynamic(
  () => import("@/components/prototypes/FingerprintBg").then((m) => m.FingerprintBg),
  { ssr: false },
);
const WeatherBg = dynamic(
  () => import("@/components/prototypes/WeatherBg").then((m) => m.WeatherBg),
  { ssr: false },
);
const LiquidBg = dynamic(
  () => import("@/components/prototypes/LiquidBg").then((m) => m.LiquidBg),
  { ssr: false },
);

type Concept = "contour" | "aurora" | "fingerprint" | "weather" | "liquid";

const CONCEPTS: { id: Concept; label: string }[] = [
  { id: "contour", label: "Contour" },
  { id: "aurora", label: "Aurora" },
  { id: "fingerprint", label: "Fingerprint" },
  { id: "weather", label: "Weather" },
  { id: "liquid", label: "Liquid" },
];

const MATERIALS: { id: LiquidMaterial; label: string }[] = [
  { id: "jelly", label: "Jelly" },
  { id: "matte", label: "Matte" },
  { id: "glass", label: "Glass" },
  { id: "metal", label: "Liquid metal" },
  { id: "iridescent", label: "Iridescent" },
  { id: "space", label: "Space windows" },
];

const SAMPLES = [
  { ticker: "AAPL", name: "Apple Inc.", price: "$291.13", change: "+46.7%", dayChange: 1.8, trend: 0.47, volatility: 0.22 },
  { ticker: "RIVN", name: "Rivian Auto.", price: "$11.40", change: "-38.2%", dayChange: -2.4, trend: -0.38, volatility: 0.68 },
  { ticker: "KO", name: "Coca-Cola Co.", price: "$71.05", change: "+4.1%", dayChange: 0.2, trend: 0.05, volatility: 0.11 },
];

export default function LabPage() {
  const [concept, setConcept] = useState<Concept>("contour");
  const [sampleIdx, setSampleIdx] = useState(0);
  const [isDark, setIsDark] = useState(true);
  const [liquidMat, setLiquidMat] = useState<LiquidMaterial>("jelly");
  const [iridStrength, setIridStrength] = useState(0.62);
  const [iridShimmer, setIridShimmer] = useState(1.18);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  const sample = SAMPLES[sampleIdx];
  const accent = BRAND.accent;
  const bgProps: BgProps = {
    seed: seedFromTicker(sample.ticker),
    trend: sample.trend,
    volatility: sample.volatility,
    isDark,
    accent,
    mouseRef,
    material: liquidMat,
    iridStrength,
    iridShimmer,
  };

  const up = sample.trend >= 0;

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: isDark ? "#0f1114" : "#f4f5f7" }}
      onPointerMove={(e) => {
        mouseRef.current.x = e.clientX / window.innerWidth;
        mouseRef.current.y = 1 - e.clientY / window.innerHeight;
      }}
    >
      <div className="pointer-events-none fixed inset-0 z-0">
        {concept === "contour" && (
          <ContourBg {...bgProps} colorTrend={pctToColorTrend(sample.dayChange)} />
        )}
        {concept === "aurora" && <AuroraBg {...bgProps} />}
        {concept === "fingerprint" && <FingerprintBg {...bgProps} />}
        {concept === "weather" && <WeatherBg {...bgProps} />}
        {concept === "liquid" && <LiquidBg {...bgProps} />}
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
        {/* Control bar */}
        <div
          className="flex flex-wrap items-center gap-2 rounded-2xl border p-2 backdrop-blur-xl"
          style={{
            background: isDark ? "rgba(20,22,27,0.55)" : "rgba(255,255,255,0.55)",
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            color: isDark ? "#eef0f3" : "#14161a",
          }}
        >
          <span className="px-2 text-xs font-semibold uppercase tracking-wider opacity-60">Concept</span>
          {CONCEPTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setConcept(c.id)}
              className="rounded-full px-3 py-1.5 text-sm font-medium transition"
              style={{
                background: concept === c.id ? accent : "transparent",
                color: concept === c.id ? "#fff" : "inherit",
              }}
            >
              {c.label}
            </button>
          ))}
          <div className="mx-2 h-5 w-px opacity-20" style={{ background: "currentColor" }} />
          <span className="px-2 text-xs font-semibold uppercase tracking-wider opacity-60">Stock</span>
          {SAMPLES.map((s, i) => (
            <button
              key={s.ticker}
              onClick={() => setSampleIdx(i)}
              className="rounded-full px-3 py-1.5 text-sm font-medium transition"
              style={{
                background: sampleIdx === i ? (isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)") : "transparent",
                color: "inherit",
              }}
            >
              {s.ticker}
            </button>
          ))}
          <button
            onClick={() => setIsDark((d) => !d)}
            className="ml-auto rounded-full px-3 py-1.5 text-sm font-medium transition"
            style={{ background: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.08)", color: "inherit" }}
          >
            {isDark ? "☾ Dark" : "☀ Light"}
          </button>
        </div>

        {/* Material switcher — only for Liquid */}
        {concept === "liquid" && (
          <div
            className="-mt-4 flex flex-wrap items-center gap-2 rounded-2xl border p-2 backdrop-blur-xl"
            style={{
              background: isDark ? "rgba(20,22,27,0.55)" : "rgba(255,255,255,0.55)",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              color: isDark ? "#eef0f3" : "#14161a",
            }}
          >
            <span className="px-2 text-xs font-semibold uppercase tracking-wider opacity-60">Material</span>
            {MATERIALS.map((m) => (
              <button
                key={m.id}
                onClick={() => setLiquidMat(m.id)}
                className="rounded-full px-3 py-1.5 text-sm font-medium transition"
                style={{
                  background: liquidMat === m.id ? accent : "transparent",
                  color: liquidMat === m.id ? "#fff" : "inherit",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Iridescent tuning — only when Iridescent material is active */}
        {concept === "liquid" && liquidMat === "iridescent" && (
          <div
            className="-mt-4 flex flex-col gap-3 rounded-2xl border p-4 backdrop-blur-xl"
            style={{
              background: isDark ? "rgba(20,22,27,0.55)" : "rgba(255,255,255,0.55)",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              color: isDark ? "#eef0f3" : "#14161a",
            }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
              Iridescent tuning
            </span>
            <label className="flex items-center gap-3 text-sm">
              <span className="w-36 shrink-0 opacity-80">Rainbow strength</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={iridStrength}
                onChange={(e) => setIridStrength(parseFloat(e.target.value))}
                className="flex-1 accent-current"
                style={{ accentColor: accent }}
              />
              <span className="w-10 text-right font-mono text-xs opacity-70">
                {iridStrength.toFixed(2)}
              </span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <span className="w-36 shrink-0 opacity-80">Shimmer swing</span>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.01}
                value={iridShimmer}
                onChange={(e) => setIridShimmer(parseFloat(e.target.value))}
                className="flex-1"
                style={{ accentColor: accent }}
              />
              <span className="w-10 text-right font-mono text-xs opacity-70">
                {iridShimmer.toFixed(2)}
              </span>
            </label>
            <div className="text-xs opacity-55">
              Rainbow strength = how much oil-slick color shows over the sentiment cast.
              Shimmer swing = how much the body brightens/darkens as the slick moves.
            </div>
          </div>
        )}

        {/* Sample content card to judge readability over the bg */}
        <div className="mt-6 max-w-md">
          <div
            className="rounded-3xl border p-8 backdrop-blur-2xl"
            style={{
              background: isDark ? "rgba(26,29,35,0.55)" : "rgba(255,255,255,0.65)",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
              color: isDark ? "#eef0f3" : "#14161a",
              boxShadow: "0 30px 80px -40px rgba(0,0,0,0.5)",
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider opacity-50">{sample.ticker} · NASDAQ</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight">{sample.name}</div>
            <div className="mt-6 flex items-end gap-3">
              <div className="font-mono text-5xl font-bold tracking-tight">{sample.price}</div>
              <div
                className="mb-1.5 text-lg font-semibold"
                style={{ color: up ? "#15803d" : "#dc2626" }}
              >
                {sample.change}
              </div>
            </div>
            <div className="mt-1 text-sm opacity-50">Past 12 months</div>
          </div>
        </div>

        <div
          className="max-w-md rounded-2xl border p-5 backdrop-blur-xl"
          style={{
            background: isDark ? "rgba(20,22,27,0.55)" : "rgba(255,255,255,0.6)",
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
            color: isDark ? "#eef0f3" : "#14161a",
          }}
        >
          {concept === "weather" ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Weather = market mood
              </div>
              <ul className="mt-3 space-y-1.5 text-sm opacity-80">
                <li>☀ Clear / sunny — rising &amp; calm</li>
                <li>☁ Overcast grey — flat / uncertain</li>
                <li>🌧 Rain — falling</li>
                <li>⚡ Storm &amp; lightning — falling &amp; volatile</li>
                <li>✦ Starry night — calm (dark mode)</li>
              </ul>
              <div className="mt-3 text-xs opacity-60">
                The sun rises higher the more bullish; clouds thicken and darken with volatility.
              </div>
            </>
          ) : concept === "contour" ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Contour = market landscape
              </div>
              <ul className="mt-3 space-y-1.5 text-sm opacity-80">
                <li>Topographic lines — elevation map of sentiment</li>
                <li>Line &amp; surface color — today&apos;s move (shortest span)</li>
                <li>Terrain ridge — longer price path on stock pages</li>
                <li>Oblique hillshade + depth fog for 3D relief</li>
              </ul>
              <div className="mt-3 text-xs opacity-60">
                Color reacts to the daily change; the landscape shape still follows
                the longer trend. Move your cursor for subtle parallax.
              </div>
            </>
          ) : concept === "aurora" ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Aurora = sentiment field
              </div>
              <ul className="mt-3 space-y-1.5 text-sm opacity-80">
                <li>Green / accent ribbons — rising trend</li>
                <li>Gold bands — flat / uncertain</li>
                <li>Red glow — falling</li>
                <li>Faster shimmer &amp; warp — higher volatility</li>
              </ul>
              <div className="mt-3 text-xs opacity-60">
                Slow curtains drift behind the glass. Move your cursor for subtle parallax.
                Each ticker gets a unique phase from its symbol.
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Color = 12-month trend
              </div>
              <div
                className="mt-3 h-3 w-full rounded-full"
                style={{ background: "linear-gradient(90deg,#d63b3b,#e0a32e,#45ded6)" }}
              />
              <div className="mt-1.5 flex justify-between text-xs opacity-70">
                <span>Falling</span>
                <span>Flat</span>
                <span>Rising</span>
              </div>
              <div className="mt-3 text-xs opacity-60">
                {concept === "fingerprint"
                  ? "More tangled, turbulent ridges = higher volatility. Every ticker draws a unique pattern from its own data."
                  : "Shapes morph and merge; move your cursor to add a blob. Higher volatility = faster churn."}
              </div>
            </>
          )}
        </div>

        <p className="mt-auto max-w-md text-sm opacity-60" style={{ color: isDark ? "#eef0f3" : "#14161a" }}>
          Prototype playground. Flip concepts, stocks, and theme. Contour and Aurora
          react to trend &amp; volatility; move your cursor for parallax.
        </p>
      </div>
    </div>
  );
}
