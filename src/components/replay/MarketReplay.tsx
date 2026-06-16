"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { scoreReplay } from "@/lib/replay/score";
import type { ReplayGame, Stance } from "@/lib/replay/types";
import { MSAD_STORAGE } from "@/lib/brand";
import { playUiClick } from "@/lib/settings";

interface Stats {
  games: number;
  wins: number;
}

function readStats(): Stats {
  try {
    const raw = localStorage.getItem(MSAD_STORAGE.replayStats);
    if (raw) return JSON.parse(raw) as Stats;
  } catch {
    /* ignore */
  }
  return { games: 0, wins: 0 };
}

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
}

export function MarketReplay() {
  const [game, setGame] = useState<ReplayGame | null>(null);
  const [cursor, setCursor] = useState(0);
  const [stances, setStances] = useState<Stance[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ games: 0, wins: 0 });
  const [recorded, setRecorded] = useState(false);

  const newGame = useCallback(async () => {
    setBusy(true);
    setError(null);
    setRecorded(false);
    try {
      const res = await fetch("/api/replay", { cache: "no-store" });
      const data = (await res.json()) as ReplayGame & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setGame(data);
      setCursor(data.startIndex);
      setStances([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setGame(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    setStats(readStats());
    void newGame();
  }, [newGame]);

  const finished = game ? cursor >= game.series.length : false;
  const result = useMemo(
    () => (game ? scoreReplay(game.series, game.startIndex, stances) : null),
    [game, stances],
  );

  // Record a win/loss once, when a game ends.
  useEffect(() => {
    if (!game || !finished || recorded || !result) return;
    const won = result.you > result.buyHold;
    const next = { games: stats.games + 1, wins: stats.wins + (won ? 1 : 0) };
    setStats(next);
    setRecorded(true);
    try {
      localStorage.setItem(MSAD_STORAGE.replayStats, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [finished, game, recorded, result, stats]);

  function decide(stance: Stance) {
    if (!game || finished) return;
    setStances((s) => [...s, stance]);
    setCursor((c) => c + 1);
    playUiClick();
  }

  const revealed = useMemo(
    () => (game ? game.series.slice(0, cursor).map((p, i) => ({ day: i, price: p })) : []),
    [game, cursor],
  );

  const totalSteps = game ? game.series.length - 1 - game.startIndex : 0;
  const doneSteps = stances.length;

  return (
    <div className="space-y-5">
      <div className="surface rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-foreground">
              {finished ? "Round over" : "Mystery chart"}
            </h2>
            <p className="text-[0.7rem] text-muted">
              {finished
                ? "Here's what you were trading."
                : "You don't know the stock or the dates. Decide one day at a time — no peeking at the future."}
            </p>
          </div>
          <div className="text-right text-xs text-muted-2">
            <p>
              Day {Math.min(doneSteps, totalSteps)} / {totalSteps}
            </p>
            {stats.games > 0 && (
              <p>
                Beat buy &amp; hold {stats.wins}/{stats.games}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 h-56 w-full">
          {busy ? (
            <div className="grid h-full place-items-center text-sm text-muted">Dealing a chart…</div>
          ) : error ? (
            <div className="grid h-full place-items-center text-sm text-down">{error}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revealed} margin={{ top: 6, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <YAxis
                  domain={["dataMin - 5", "dataMax + 5"]}
                  tick={{ fontSize: 10, fill: "var(--muted-2)" }}
                  width={42}
                />
                {game && (
                  <ReferenceLine x={game.startIndex - 1} stroke="var(--muted-2)" strokeDasharray="3 3" />
                )}
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {result && (
          <p className="mt-2 text-center text-xs text-muted">
            Your return so far:{" "}
            <span className={result.you >= 1 ? "font-mono font-semibold text-up" : "font-mono font-semibold text-down"}>
              {pct(result.you - 1)}
            </span>{" "}
            · invested {Math.round(result.timeInMarket * 100)}% of days
          </p>
        )}
      </div>

      {/* controls / result */}
      {!finished ? (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy || !game}
            onClick={() => decide("in")}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            ▶ Stay invested (next day)
          </button>
          <button
            type="button"
            disabled={busy || !game}
            onClick={() => decide("out")}
            className="btn-ghost interactive flex-1 disabled:opacity-50"
          >
            ✋ Step aside (cash)
          </button>
        </div>
      ) : (
        game &&
        result && (
          <div className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.7rem] uppercase tracking-wide text-muted-2">It was</p>
                <Link
                  href={`/stock/${game.reveal.ticker}`}
                  className="font-display text-lg font-semibold text-accent hover:underline"
                >
                  {game.reveal.name} ({game.reveal.ticker})
                </Link>
                <p className="text-xs text-muted">
                  {game.reveal.fromDate} → {game.reveal.toDate}
                  {game.isMock && " · demo data"}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-display text-xl font-bold ${
                    result.you > result.buyHold ? "text-up" : result.you < result.buyHold ? "text-down" : "text-foreground"
                  }`}
                >
                  {result.you > result.buyHold ? "You won" : result.you < result.buyHold ? "Buy & hold won" : "Tie"}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl border border-accent/40 bg-accent/5 p-3">
                <p className="font-mono text-lg font-bold text-foreground">{pct(result.you - 1)}</p>
                <p className="text-[0.65rem] text-muted">Your timing</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="font-mono text-lg font-bold text-foreground">{pct(result.buyHold - 1)}</p>
                <p className="text-[0.65rem] text-muted">Just holding</p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted">
              The lesson isn&apos;t whether you won this round — it&apos;s that timing in and out is
              hard, and luck looks like skill over a single chart. Play a few and watch your{" "}
              <span className="text-foreground">beat-rate</span> regress toward how good your process
              really is.
            </p>

            <button type="button" onClick={newGame} className="btn-primary mt-4 w-full">
              Deal a new chart →
            </button>
          </div>
        )
      )}
    </div>
  );
}
