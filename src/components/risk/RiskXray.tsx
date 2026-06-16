"use client";

import { useEffect, useState } from "react";
import { requestRisk } from "@/lib/risk/request";
import type { Holding, RiskResult } from "@/lib/risk/types";
import { BrokerageConnect } from "@/components/brokerage/BrokerageConnect";
import { MSAD_STORAGE } from "@/lib/brand";

interface Row {
  ticker: string;
  weight: string;
}

const DEFAULT_ROWS: Row[] = [
  { ticker: "AAPL", weight: "40" },
  { ticker: "MSFT", weight: "35" },
  { ticker: "NVDA", weight: "25" },
];

function loadRows(): Row[] {
  try {
    const raw = localStorage.getItem(MSAD_STORAGE.holdings);
    if (raw) {
      const parsed = JSON.parse(raw) as Holding[];
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((h) => ({ ticker: h.ticker, weight: String(h.weight) }));
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_ROWS;
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function RiskXray() {
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [value, setValue] = useState(10_000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RiskResult | null>(null);

  useEffect(() => setRows(loadRows()), []);

  function update(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }
  function addRow() {
    setRows((r) => [...r, { ticker: "", weight: "10" }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, j) => j !== i));
  }

  async function runAnalysis(holdings: Holding[]) {
    if (holdings.length === 0) {
      setError("Add at least one holding with a weight.");
      return;
    }
    try {
      localStorage.setItem(MSAD_STORAGE.holdings, JSON.stringify(holdings));
    } catch {
      /* ignore */
    }
    setBusy(true);
    setError(null);
    try {
      setResult(await requestRisk(holdings));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  function analyze(e?: React.FormEvent) {
    e?.preventDefault();
    const holdings: Holding[] = rows
      .map((r) => ({ ticker: r.ticker.toUpperCase().trim(), weight: Number(r.weight) || 0 }))
      .filter((h) => h.ticker && h.weight > 0);
    void runAnalysis(holdings);
  }

  /** Real holdings imported from a linked brokerage — fill the editor and run. */
  function handleImport(holdings: { ticker: string; weight: number }[]) {
    setRows(holdings.map((h) => ({ ticker: h.ticker, weight: String(Math.round(h.weight * 10) / 10) })));
    void runAnalysis(holdings);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={analyze} className="surface rounded-2xl p-5">
        <h2 className="font-display text-sm font-semibold text-foreground">Your holdings</h2>
        <p className="text-[0.7rem] text-muted">Weights are relative — they don&apos;t need to add to 100.</p>
        <div className="mt-3">
          <BrokerageConnect onImport={handleImport} />
        </div>
        <div className="mt-3 space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={row.ticker}
                onChange={(e) => update(i, { ticker: e.target.value.toUpperCase() })}
                placeholder="TICKER"
                className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 text-sm uppercase outline-none focus:border-accent"
                aria-label={`Holding ${i + 1} ticker`}
              />
              <input
                value={row.weight}
                onChange={(e) => update(i, { weight: e.target.value.replace(/[^0-9.]/g, "") })}
                inputMode="decimal"
                placeholder="weight"
                className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
                aria-label={`Holding ${i + 1} weight`}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Remove holding"
                className="rounded-md px-2 text-muted-2 hover:text-down"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={addRow} className="btn-chip btn-chip-inactive">
            + Add holding
          </button>
          <label className="flex items-center gap-2 text-xs text-muted">
            Portfolio value $
            <input
              value={value}
              onChange={(e) => setValue(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
              inputMode="numeric"
              className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent"
              aria-label="Portfolio value"
            />
          </label>
          <button type="submit" disabled={busy} className="btn-primary ml-auto disabled:opacity-50">
            {busy ? "Analyzing…" : "X-ray my portfolio"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-down">{error}</p>}
      </form>

      {result && <Results result={result} value={value} />}
    </div>
  );
}

function Results({ result, value }: { result: RiskResult; value: number }) {
  const maxSector = result.sectors[0]?.weight ?? 1;
  return (
    <>
      {result.isMock && (
        <div className="rounded-xl border border-neutral/40 bg-neutral/5 px-4 py-2 text-xs text-foreground">
          <strong>Demo data.</strong> No market-data key is set — risk is computed on synthetic prices
          and sectors. Add <code className="font-mono">FMP_API_KEY</code> for your real exposures.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Truly diversified across"
          value={`${result.concentration.effectiveHoldings.toFixed(1)}`}
          sub={`names · top is ${fmtPct(result.concentration.topWeight)} ${result.concentration.topTicker}`}
        />
        <Metric label="Portfolio beta" value={result.portfolioBeta.toFixed(2)} sub="vs the market (1.0)" />
        <Metric label="Volatility" value={fmtPct(result.volatility)} sub="annualized swings" />
      </div>

      <div className="surface rounded-2xl p-5">
        <h3 className="font-display text-sm font-semibold text-foreground">Sector exposure</h3>
        <ul className="mt-3 space-y-2">
          {result.sectors.map((s) => (
            <li key={s.sector} className="text-xs">
              <div className="flex justify-between">
                <span className="text-foreground">{s.sector}</span>
                <span className="font-mono text-muted">{fmtPct(s.weight)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(s.weight / maxSector) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        {result.avgCorrelation !== null && (
          <p className="mt-3 text-xs text-muted">
            Average correlation between your holdings:{" "}
            <span className="font-mono font-semibold text-foreground">
              {result.avgCorrelation.toFixed(2)}
            </span>{" "}
            {result.avgCorrelation >= 0.7
              ? "— they tend to move together, so you're less diversified than the ticker count implies."
              : result.avgCorrelation <= 0.3
                ? "— nicely independent, which softens the bumps."
                : "— moderately linked."}
          </p>
        )}
      </div>

      <div className="surface rounded-2xl p-5">
        <h3 className="font-display text-sm font-semibold text-foreground">
          How much could you lose?
        </h3>
        <p className="text-[0.7rem] text-muted">
          Rough, beta-based estimates of a one-shot market drop on your ${value.toLocaleString()}.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {result.scenarios.map((s) => (
            <div key={s.label} className="rounded-xl border border-down/30 bg-down/5 p-3 text-center">
              <p className="text-[0.65rem] text-muted">{s.label}</p>
              <p className="mt-1 font-mono text-lg font-bold text-down">{fmtPct(s.estDrop)}</p>
              <p className="text-[0.65rem] text-muted-2">
                ≈ −${Math.round(Math.abs(s.estDrop) * value).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="surface rounded-2xl p-5">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
          <span aria-hidden>⚠︎</span> Read this before you trust the numbers
        </h3>
        <ul className="mt-2 space-y-2 text-xs leading-relaxed text-muted">
          {result.warnings.map((w, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-neutral">
                •
              </span>
              {w}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="surface rounded-2xl p-4 text-center">
      <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-foreground">{label}</p>
      <p className="text-[0.65rem] text-muted">{sub}</p>
    </div>
  );
}
