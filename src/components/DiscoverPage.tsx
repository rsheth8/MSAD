"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProFilterState, ScreenerPreset, ScreenerResultRow } from "@/lib/screener/types";
import { DEFAULT_PRO_FILTERS } from "@/lib/screener/types";
import { SCREENER_PRESETS, SCREENER_SECTORS } from "@/lib/screener/presets";
import { industriesForSector } from "@/lib/screener/industries";
import { getSavedScreens, type SavedScreen } from "@/lib/screener/saved-screens";
import { BRAND } from "@/lib/brand";
import { ExcludePanel, getExclusions } from "@/components/screener/ExcludePanel";
import { DEFAULT_EXCLUSIONS } from "@/lib/screener/exclusions";
import { FilterLabel, ProFilterExplainerGroup } from "@/components/screener/FilterLabel";
import { SavedScreensBar } from "@/components/screener/SavedScreensBar";
import { ScreenerResults } from "@/components/screener/ScreenerResults";
import { GlassCard } from "./GlassCard";
import { ThemeToggle, SoundToggle } from "./OnboardingModal";
import { TickerSearch } from "./TickerSearch";
import { NeutralBackdrop } from "./NeutralBackdrop";
import { CriteriaSearch } from "@/components/discovery/CriteriaSearch";
import { useProfile } from "@/lib/profile/useProfile";

type Mode = "learn" | "pro";

function buildProRequest(pro: ProFilterState, excludeSymbols: string[]) {
  return {
    query: {
      marketCapMoreThan: Math.round(pro.marketCapMinB * 1e9),
      marketCapLowerThan: Math.round(pro.marketCapMaxB * 1e9),
      priceLowerThan: pro.priceMax,
      betaLowerThan: pro.betaMax,
      volumeMoreThan: 100_000,
      country: "US",
      isEtf: false,
      isActivelyTrading: true,
      sector: pro.sector || undefined,
      industry: pro.industry || undefined,
      limit: 45,
    },
    ratioFilters: {
      peMax: pro.reversePeVsIndustry ? undefined : pro.peMax || undefined,
      roeMin: pro.roeMinPct ? pro.roeMinPct / 100 : undefined,
    },
    sortBy: "marketCapAsc" as const,
    excludeSymbols,
    reverseMetric: pro.reversePeVsIndustry ? ("pe" as const) : undefined,
    reverseMinPct: 10,
  };
}

export function DiscoverPage() {
  const router = useRouter();
  const userProfile = useProfile();
  const [mode, setMode] = useState<Mode>("learn");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [pro, setPro] = useState<ProFilterState>(DEFAULT_PRO_FILTERS);
  const [exclusions, setExclusions] = useState<string[]>(() => DEFAULT_EXCLUSIONS);
  const [savedScreens, setSavedScreens] = useState<SavedScreen[]>([]);
  const [rows, setRows] = useState<ScreenerResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ isMock?: boolean; presetTitle?: string }>({});
  const [watchMsg, setWatchMsg] = useState<string | null>(null);

  const industryOptions = useMemo(() => industriesForSector(pro.sector), [pro.sector]);

  useEffect(() => {
    setExclusions(getExclusions());
    setSavedScreens(getSavedScreens());
  }, []);

  const runSearch = useCallback(async (body: object, title: string, presetId?: string) => {
    setActivePreset(presetId ?? null);
    setLoading(true);
    setError(null);
    setWatchMsg(null);
    try {
      const res = await fetch("/api/screener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, excludeSymbols: exclusions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Screen failed");
      setRows(data.rows ?? []);
      setMeta({ isMock: data.isMock, presetTitle: title });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Screen failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [exclusions]);

  const runPreset = useCallback(
    (preset: ScreenerPreset) => {
      runSearch({ presetId: preset.id }, preset.title, preset.id);
    },
    [runSearch],
  );

  function runPro() {
    runSearch(buildProRequest(pro, exclusions), "Custom screen");
  }

  function loadSaved(filters: ProFilterState) {
    setPro(filters);
    setMode("pro");
    runSearch(buildProRequest(filters, exclusions), filters.reversePeVsIndustry ? "Reverse P/E screen" : "Saved screen");
  }

  return (
    <>
      <NeutralBackdrop />
      <main className="relative z-10 mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/" className="text-xs text-muted hover:text-foreground">
              ← Dashboard
            </Link>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Discover stocks</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Filter by size, ratios, sector, and industry — with presets for beginners and custom
              screens for pros. Excluded tickers stay hidden across every run.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <SoundToggle />
            <TickerSearch onSubmit={(t) => router.push(`/stock/${t}`)} />
          </div>
        </header>

        <ExcludePanel exclusions={exclusions} onChange={setExclusions} />

        <div className="mb-6">
          <CriteriaSearch investorProfile={userProfile.investorProfile} />
        </div>

        <div className="mb-6 flex w-fit rounded-full p-0.5 surface text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode("learn")}
            className={`btn-pill ${mode === "learn" ? "btn-pill-active" : "btn-pill-inactive"}`}
          >
            Guided presets
          </button>
          <button
            type="button"
            onClick={() => setMode("pro")}
            className={`btn-pill ${mode === "pro" ? "btn-pill-active" : "btn-pill-inactive"}`}
          >
            Custom filters
          </button>
        </div>

        {mode === "learn" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCREENER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => runPreset(preset)}
                className={`surface-interactive rounded-2xl p-4 text-left ${
                  activePreset === preset.id ? "ring-2 ring-accent/40" : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-semibold text-foreground">{preset.title}</span>
                  {preset.reverseMetric && (
                    <span className="rounded-full bg-neutral/10 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase text-neutral">
                      Reverse
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted">{preset.subtitle}</div>
                <p className="mt-2 text-[0.7rem] leading-relaxed text-muted">{preset.learnBlurb}</p>
              </button>
            ))}
          </div>
        )}

        {mode === "pro" && (
          <>
            <SavedScreensBar
              screens={savedScreens}
              currentFilters={pro}
              onChange={setSavedScreens}
              onLoad={loadSaved}
            />
            <GlassCard className="p-5 sm:p-6">
              <ProFilterExplainerGroup>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FilterLabel id="marketCapMin" label="Market cap min ($B)">
                    <input
                      type="number"
                      step={0.1}
                      value={pro.marketCapMinB}
                      onChange={(e) => setPro((p) => ({ ...p, marketCapMinB: Number(e.target.value) }))}
                      className="surface w-full rounded-lg px-3 py-2 font-mono text-sm"
                    />
                  </FilterLabel>
                  <FilterLabel id="marketCapMax" label="Market cap max ($B)">
                    <input
                      type="number"
                      step={0.5}
                      value={pro.marketCapMaxB}
                      onChange={(e) => setPro((p) => ({ ...p, marketCapMaxB: Number(e.target.value) }))}
                      className="surface w-full rounded-lg px-3 py-2 font-mono text-sm"
                    />
                  </FilterLabel>
                  <FilterLabel id="priceMax" label="Max share price ($)">
                    <input
                      type="number"
                      value={pro.priceMax}
                      onChange={(e) => setPro((p) => ({ ...p, priceMax: Number(e.target.value) }))}
                      className="surface w-full rounded-lg px-3 py-2 font-mono text-sm"
                    />
                  </FilterLabel>
                  <FilterLabel id="betaMax" label="Max beta">
                    <input
                      type="number"
                      step={0.1}
                      value={pro.betaMax}
                      onChange={(e) => setPro((p) => ({ ...p, betaMax: Number(e.target.value) }))}
                      className="surface w-full rounded-lg px-3 py-2 font-mono text-sm"
                    />
                  </FilterLabel>
                  <FilterLabel id="peMax" label="Max P/E">
                    <input
                      type="number"
                      value={pro.peMax}
                      disabled={pro.reversePeVsIndustry}
                      onChange={(e) => setPro((p) => ({ ...p, peMax: Number(e.target.value) }))}
                      className="surface w-full rounded-lg px-3 py-2 font-mono text-sm disabled:opacity-50"
                    />
                  </FilterLabel>
                  <FilterLabel id="roeMin" label="Min ROE (%)">
                    <input
                      type="number"
                      value={pro.roeMinPct}
                      onChange={(e) => setPro((p) => ({ ...p, roeMinPct: Number(e.target.value) }))}
                      className="surface w-full rounded-lg px-3 py-2 font-mono text-sm"
                    />
                  </FilterLabel>
                  <FilterLabel id="sector" label="Sector">
                    <select
                      value={pro.sector}
                      onChange={(e) =>
                        setPro((p) => ({ ...p, sector: e.target.value, industry: "" }))
                      }
                      className="surface w-full rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Any sector</option>
                      {SCREENER_SECTORS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </FilterLabel>
                  <FilterLabel id="industry" label="Industry">
                    <select
                      value={pro.industry}
                      onChange={(e) => setPro((p) => ({ ...p, industry: e.target.value }))}
                      className="surface w-full rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Any industry</option>
                      {industryOptions.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </FilterLabel>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <FilterLabel id="reversePe" label="Reverse screen">
                      <label className="mt-1 flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={pro.reversePeVsIndustry}
                          onChange={(e) =>
                            setPro((p) => ({ ...p, reversePeVsIndustry: e.target.checked }))
                          }
                          className="accent-[var(--accent)]"
                        />
                        <span>Pricier than peers (P/E above industry median)</span>
                      </label>
                    </FilterLabel>
                  </div>
                </div>
              </ProFilterExplainerGroup>
              <button type="button" onClick={runPro} className="btn-primary mt-4">
                Run screen
              </button>
            </GlassCard>
          </>
        )}

        {loading && (
          <div className="mt-8 animate-pulse text-center text-sm text-muted">Scanning the market…</div>
        )}

        {error && (
          <div className="mt-8 rounded-xl border border-down/30 bg-down/5 p-4 text-sm text-down">
            {error}
          </div>
        )}

        {watchMsg && (
          <div className="mt-4 text-center text-xs text-up">{watchMsg}</div>
        )}

        {!loading && rows.length > 0 && (
          <ScreenerResults
            rows={rows}
            title={meta.presetTitle ?? "Results"}
            isMock={meta.isMock}
            onWatchlisted={() => setWatchMsg(`Added ${rows.length} tickers to your watchlist`)}
          />
        )}

        {!loading && !rows.length && !error && (
          <div className="mt-12 text-center text-sm text-muted">
            Pick a preset or build a custom screen — exclusions apply automatically.
          </div>
        )}
      </main>
    </>
  );
}
