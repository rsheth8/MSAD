"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { requestBacktest } from "@/lib/backtest/request";
import type { BacktestResult, BacktestStats, StrategyKind } from "@/lib/backtest/types";

const PRESETS: { kind: StrategyKind; label: string; desc: string }[] = [
  { kind: "buy-hold", label: "Buy & hold", desc: "Own it the whole time — the honest baseline." },
  { kind: "sma-cross", label: "Trend (moving average)", desc: "Hold only while price is above its N-day average; else sit in cash." },
];

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
}

export function HypothesisLab({ initialTicker = "AAPL" }: { initialTicker?: string }) {
  const [ticker, setTicker] = useState(initialTicker);
  const [kind, setKind] = useState<StrategyKind>("sma-cross");
  const [smaWindow, setSmaWindow] = useState(50);
  const [costBps, setCostBps] = useState(10);
  const [years, setYears] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    const t = ticker.toUpperCase().trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await requestBacktest({ ticker: t, kind, smaWindow, costBps, years }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest failed");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* controls */}
      <form onSubmit={run} className="surface rounded-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-foreground">Stock</span>
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm uppercase outline-none focus:border-accent"
              aria-label="Ticker"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-foreground">History</span>
            <select
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {[3, 5, 10, 15].map((y) => (
                <option key={y} value={y}>
                  {y} years
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <span className="text-xs font-medium text-foreground">Hypothesis</span>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {PRESETS.map((p) => (
              <button
                key={p.kind}
                type="button"
                onClick={() => setKind(p.kind)}
                aria-pressed={kind === p.kind}
                className={`rounded-xl border p-3 text-left text-xs transition ${
                  kind === p.kind
                    ? "border-accent bg-accent/8"
                    : "border-border bg-background hover:border-accent/40"
                }`}
              >
                <span className="block font-semibold text-foreground">{p.label}</span>
                <span className="mt-0.5 block text-muted">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {kind === "sma-cross" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="flex justify-between text-xs font-medium text-foreground">
                Moving-average window <span className="font-mono text-accent">{smaWindow}d</span>
              </span>
              <input
                type="range"
                min={5}
                max={200}
                step={5}
                value={smaWindow}
                onChange={(e) => setSmaWindow(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="flex justify-between text-xs font-medium text-foreground">
                Trading cost <span className="font-mono text-accent">{costBps} bps/trade</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={costBps}
                onChange={(e) => setCostBps(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--accent)]"
              />
            </label>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? "Running…" : "Run backtest"}
          </button>
          {error && <span className="text-xs text-down">{error}</span>}
        </div>
      </form>

      {result && result.points.length > 0 && <Results result={result} />}
    </div>
  );
}

function Results({ result }: { result: BacktestResult }) {
  const beat = result.strategy.totalReturn - result.buyHold.totalReturn;
  return (
    <>
      {result.isMock && (
        <div className="rounded-xl border border-neutral/40 bg-neutral/5 px-4 py-2 text-xs text-foreground">
          <strong>Demo data.</strong> No market-data key is set, so this runs on synthetic prices.
          Add <code className="font-mono">FMP_API_KEY</code> for real history.
        </div>
      )}

      <div className="surface rounded-2xl p-5">
        <h3 className="font-display text-sm font-semibold text-foreground">
          Growth of $1 · {result.ticker} over {result.years.toFixed(1)} years
        </h3>
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.points} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--muted-2)" }}
                minTickGap={48}
                tickFormatter={(d: string) => d.slice(0, 7)}
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-2)" }} width={48} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(value, name) => [`$${Number(value).toFixed(2)}`, String(name)]}
              />
              <Line type="monotone" dataKey="strategy" name="Strategy" stroke="var(--accent)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="buyHold" name="Buy & hold" stroke="var(--muted)" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="benchmark" name="S&P 500" stroke="var(--muted-2)" strokeWidth={1} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted">
          Your rule {beat >= 0 ? "beat" : "trailed"} simply buying and holding by{" "}
          <span className={beat >= 0 ? "font-semibold text-up" : "font-semibold text-down"}>
            {pct(Math.abs(beat)).replace("+", "")}
          </span>{" "}
          over this window — before taxes, and on one hand-picked stock. Read the caveats below
          before believing it.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Your strategy" stats={result.strategy} accent />
        <StatCard title="Buy & hold" stats={result.buyHold} />
        <StatCard title="S&P 500" stats={result.benchmark} />
      </div>

      <div className="surface rounded-2xl p-5">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
          <span aria-hidden>⚠︎</span> Before you trust this backtest
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

function StatCard({ title, stats, accent }: { title: string; stats: BacktestStats; accent?: boolean }) {
  return (
    <div className={`surface rounded-2xl p-4 ${accent ? "ring-1 ring-accent/40" : ""}`}>
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <dl className="mt-2 space-y-1 text-xs">
        <Row k="Total return" v={pct(stats.totalReturn)} tone={stats.totalReturn} />
        <Row k="Annualized (CAGR)" v={pct(stats.cagr)} tone={stats.cagr} />
        <Row k="Worst drawdown" v={`−${(stats.maxDrawdown * 100).toFixed(1)}%`} tone={-1} />
        <Row k="Volatility" v={`${(stats.volatility * 100).toFixed(1)}%`} />
        <Row k="Time invested" v={`${Math.round(stats.timeInMarket * 100)}%`} />
        <Row k="Trades" v={String(stats.trades)} />
      </dl>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: number }) {
  const color = tone === undefined ? "text-foreground" : tone >= 0 ? "text-up" : "text-down";
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{k}</dt>
      <dd className={`font-mono font-medium ${color}`}>{v}</dd>
    </div>
  );
}
