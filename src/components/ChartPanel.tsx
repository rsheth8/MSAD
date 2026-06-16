"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { ReportCard } from "@/lib/types";
import type {
  ChartMode,
  ChartRange,
  CompareChartData,
  FullChartPayload,
  ScatterMetricKey,
} from "@/lib/chart/types";
import { CHART_RANGES, isChartRange, isScatterMetricKey } from "@/lib/chart/presets";
import { formatSignedPercent } from "@/lib/format";
import { CHART_EXPLAINER, SCATTER_EXPLAINER } from "@/lib/explanations";
import { CompareChart } from "./CompareChart";
import { Explainer } from "./Explainer";
import { GlassCard } from "./GlassCard";
import { ScatterChartView } from "./ScatterChartView";

import { MSAD_STORAGE } from "@/lib/brand";

const PREFS_KEY = MSAD_STORAGE.chartPrefs;

interface ChartPrefs {
  range: ChartRange;
  mode: ChartMode;
  seriesA: string;
  seriesB: string;
  scatterX: ScatterMetricKey;
  scatterY: ScatterMetricKey;
  showVolume: boolean;
}

function loadPrefs(): Partial<ChartPrefs> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Partial<ChartPrefs>) : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs: ChartPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function readChartUrl(): Partial<ChartPrefs & { useDefault: boolean }> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const range = p.get("cr");
  const mode = p.get("cm");
  const seriesB = p.get("cb") ?? undefined;
  const scatterX = p.get("cx");
  const scatterY = p.get("cy");
  const useDefault = p.get("cd") !== "0";
  return {
    range: range && isChartRange(range) ? range : undefined,
    mode: mode === "compare" || mode === "scatter" ? mode : undefined,
    seriesB,
    scatterX: scatterX && isScatterMetricKey(scatterX) ? scatterX : undefined,
    scatterY: scatterY && isScatterMetricKey(scatterY) ? scatterY : undefined,
    useDefault,
  };
}

function syncChartUrl(prefs: ChartPrefs & { useDefault: boolean }) {
  const url = new URL(window.location.href);
  url.searchParams.set("cr", prefs.range);
  url.searchParams.set("cm", prefs.mode);
  url.searchParams.set("cd", prefs.useDefault ? "1" : "0");
  if (!prefs.useDefault) {
    url.searchParams.set("cb", prefs.seriesB || "SPY");
  } else {
    url.searchParams.delete("cb");
  }
  if (prefs.mode === "scatter") {
    url.searchParams.set("cx", prefs.scatterX);
    url.searchParams.set("cy", prefs.scatterY);
  } else {
    url.searchParams.delete("cx");
    url.searchParams.delete("cy");
  }
  window.history.replaceState({}, "", url.toString());
}

export function ChartPanel({
  data,
  learnMode = true,
}: {
  data: ReportCard;
  learnMode?: boolean;
}) {
  const chartExportId = useId().replace(/:/g, "");
  const exportRef = useRef<HTMLDivElement>(null);
  const saved = { ...loadPrefs(), ...readChartUrl() };

  const [range, setRange] = useState<ChartRange>(saved.range ?? "1Y");
  const [mode, setMode] = useState<ChartMode>(saved.mode ?? "compare");
  const [seriesA, setSeriesA] = useState(saved.seriesA ?? "stock");
  const [seriesB, setSeriesB] = useState(saved.seriesB ?? "");
  const [scatterX, setScatterX] = useState<ScatterMetricKey>(saved.scatterX ?? "pe");
  const [scatterY, setScatterY] = useState<ScatterMetricKey>(saved.scatterY ?? "roe");
  const [showVolume, setShowVolume] = useState(saved.showVolume ?? false);
  const [useDefault, setUseDefault] = useState(saved.useDefault ?? !saved.seriesB);
  const [payload, setPayload] = useState<FullChartPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchChart = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      range,
      mode,
      default: useDefault ? "1" : "0",
    });
    if (!useDefault) {
      params.set("a", seriesA);
      params.set("b", seriesB || "SPY");
    }
    if (mode === "scatter") {
      params.set("x", scatterX);
      params.set("y", scatterY);
    }

    fetch(`/api/chart/${encodeURIComponent(data.ticker)}?${params}`)
      .then(async (r) => {
        const p = await r.json().catch(() => null);
        if (!r.ok || !p || !p.chart) {
          throw new Error(p?.error ?? `Chart request failed (${r.status})`);
        }
        return p as FullChartPayload;
      })
      .then((p) => {
        setPayload(p);
        setError(null);
        if (useDefault && p.meta?.defaultPreset) {
          setSeriesB(p.meta.defaultPreset.seriesB);
        }
      })
      .catch((err: Error) => {
        setPayload(null);
        setError(err.message || "Failed to load chart");
      })
      .finally(() => setLoading(false));
  }, [data.ticker, range, mode, seriesA, seriesB, scatterX, scatterY, useDefault]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  useEffect(() => {
    savePrefs({ range, mode, seriesA, seriesB, scatterX, scatterY, showVolume });
    syncChartUrl({ range, mode, seriesA, seriesB, scatterX, scatterY, showVolume, useDefault });
  }, [range, mode, seriesA, seriesB, scatterX, scatterY, showVolume, useDefault]);

  function resetToDefault() {
    const preset = payload?.meta.defaultPreset;
    if (!preset) return;
    setUseDefault(true);
    setRange(preset.range);
    setSeriesA(preset.seriesA);
    setSeriesB(preset.seriesB);
    setMode("compare");
  }

  async function exportChart() {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const url = await toPng(exportRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `msad-${data.ticker.toLowerCase()}-chart.png`;
      link.href = url;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  const compare = payload?.chart?.mode === "compare" ? (payload.chart as CompareChartData) : null;
  const compareOptions = payload?.meta?.compareOptions ?? [];
  const scatterMetrics = payload?.meta?.scatterMetrics ?? [];

  return (
    <div>
      <GlassCard className="flex flex-col p-4 sm:p-5">
        {/* Controls */}
        <div className="mb-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-wider text-muted">Performance</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={resetToDefault}
                className="btn-ghost interactive px-2.5 py-1 text-[0.65rem]"
              >
                Reset to sector default
              </button>
              <button
                type="button"
                onClick={exportChart}
                disabled={exporting || loading}
                className="btn-ghost interactive px-2.5 py-1 text-[0.65rem] disabled:opacity-50"
              >
                {exporting ? "Exporting…" : "Export chart PNG"}
              </button>
            </div>
          </div>

          {/* Time range */}
          <div className="surface flex flex-wrap gap-1 rounded-full p-0.5" role="group" aria-label="Time range">
            {CHART_RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                aria-pressed={range === r.value}
                className={`btn-pill font-mono text-[0.65rem] ${
                  range === r.value ? "btn-pill-active" : "btn-pill-inactive"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Mode toggle */}
          <div className="surface flex w-fit rounded-full p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode("compare")}
              aria-pressed={mode === "compare"}
              className={`btn-pill ${mode === "compare" ? "btn-pill-active" : "btn-pill-inactive"}`}
            >
              Compare over time
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("scatter");
                setUseDefault(false);
              }}
              aria-pressed={mode === "scatter"}
              className={`btn-pill ${mode === "scatter" ? "btn-pill-active" : "btn-pill-inactive"}`}
            >
              Scatter (fundamentals)
            </button>
          </div>

          {mode === "compare" ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted">Compare</span>
              <select
                value={seriesA}
                onChange={(e) => {
                  setSeriesA(e.target.value);
                  setUseDefault(false);
                }}
                className="surface rounded-lg px-2 py-1 font-mono text-foreground"
              >
                {compareOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="text-muted">vs</span>
              <select
                value={useDefault ? (payload?.meta?.defaultPreset?.seriesB ?? seriesB) : seriesB}
                onChange={(e) => {
                  setSeriesB(e.target.value);
                  setUseDefault(false);
                }}
                className="surface rounded-lg px-2 py-1 font-mono text-foreground"
              >
                {compareOptions
                  .filter((o) => o.key !== "stock")
                  .map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
              </select>
              <label className="ml-auto flex items-center gap-1.5 text-muted">
                <input
                  type="checkbox"
                  checked={showVolume}
                  onChange={(e) => setShowVolume(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Volume
              </label>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted">X axis</span>
              <select
                value={scatterX}
                onChange={(e) => setScatterX(e.target.value as ScatterMetricKey)}
                className="surface rounded-lg px-2 py-1 text-foreground"
              >
                {scatterMetrics.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="text-muted">Y axis</span>
              <select
                value={scatterY}
                onChange={(e) => setScatterY(e.target.value as ScatterMetricKey)}
                className="surface rounded-lg px-2 py-1 text-foreground"
              >
                {scatterMetrics.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Stats + chart */}
        {compare && mode === "compare" && (
          <div className="mb-2 flex flex-wrap gap-3 text-[0.65rem]">
            <span className="rounded-full bg-background px-2 py-0.5 font-mono text-foreground">
              {compare.seriesA.label}: {formatSignedPercent(compare.periodChangeA)}
            </span>
            <span className="rounded-full bg-background px-2 py-0.5 font-mono text-muted">
              {compare.seriesB.label}: {formatSignedPercent(compare.periodChangeB)}
            </span>
            <span className="rounded-full bg-background px-2 py-0.5 font-mono text-down">
              Max drawdown: {formatSignedPercent(compare.maxDrawdown)}
            </span>
          </div>
        )}

        {compare?.isSectorDefault && compare.presetDescription && learnMode && (
          <p className="mb-2 text-[0.65rem] leading-relaxed text-muted">
            <span className="font-semibold text-foreground">Sector default · </span>
            {compare.presetDescription}
          </p>
        )}

        <div ref={exportRef} id={`chart-export-${chartExportId}`} className="min-h-0 flex-1">
          <div className="mb-1 text-center text-[0.65rem] uppercase tracking-wider text-muted">
            {mode === "compare" && compare
              ? `${compare.seriesA.label} vs ${compare.seriesB.label} · ${range}`
              : payload?.chart?.mode === "scatter"
                ? `${payload.chart.seriesX.label} vs ${payload.chart.seriesY.label} · peers`
                : "Loading…"}
          </div>
          <div className="h-64 sm:h-72">
            {loading && (
              <div className="flex h-full items-center justify-center text-xs text-muted">Loading chart…</div>
            )}
            {!loading && error && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-xs font-medium text-muted">Chart data is unavailable right now.</p>
                <p className="max-w-xs text-[0.65rem] text-muted/80">{error}</p>
                <button
                  type="button"
                  onClick={fetchChart}
                  className="btn-ghost interactive px-2.5 py-1 text-[0.65rem]"
                >
                  Retry
                </button>
              </div>
            )}
            {!loading && !error && compare && mode === "compare" && (
              <CompareChart data={compare} showVolume={showVolume} />
            )}
            {!loading && !error && payload?.chart?.mode === "scatter" && mode === "scatter" && (
              <ScatterChartView data={payload.chart} />
            )}
          </div>
        </div>
      </GlassCard>

      <div className="mt-2 text-center">
        <Explainer content={mode === "scatter" ? SCATTER_EXPLAINER : CHART_EXPLAINER} />
      </div>
    </div>
  );
}
