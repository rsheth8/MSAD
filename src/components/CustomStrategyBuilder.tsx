"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChainRow, OptionsChainPayload } from "@/lib/options/types";
import { strategyPayoff } from "@/lib/options/strategies";
import type { StrategyLeg } from "@/lib/options/types";
import { formatCurrency } from "@/lib/format";
import { GlassCard } from "./GlassCard";

type LegKind = "call" | "put" | "stock";

interface BuilderLeg {
  id: string;
  kind: LegKind;
  side: "long" | "short";
  strike: number;
  premium: number;
}

export function CustomStrategyBuilder({
  chain,
  expiry,
  price,
  name,
}: {
  chain: OptionsChainPayload;
  expiry: string;
  price: number;
  name: string;
}) {
  const rows = chain.chains[expiry] ?? [];
  const atm = rows.reduce((best, r) =>
    Math.abs(r.strike - price) < Math.abs(best.strike - price) ? r : best,
  rows[0]);

  const [legs, setLegs] = useState<BuilderLeg[]>([
    {
      id: "1",
      kind: "call",
      side: "long",
      strike: atm?.strike ?? price,
      premium: atm?.call.premium ?? 1,
    },
  ]);

  function addLeg() {
    setLegs((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        kind: "put",
        side: "long",
        strike: atm?.strike ?? price,
        premium: atm?.put.premium ?? 1,
      },
    ]);
  }

  function updateLeg(id: string, patch: Partial<BuilderLeg>) {
    setLegs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLeg(id: string) {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  }

  const chartData = useMemo(() => {
    const strategyLegs: StrategyLeg[] = legs.map((l) => ({
      kind: l.kind,
      side: l.side,
      strike: l.kind === "stock" ? undefined : l.strike,
      premium: l.kind === "stock" ? undefined : l.premium,
    }));
    const lo = price * 0.7;
    const hi = price * 1.3;
    const steps = 50;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const s = lo + ((hi - lo) * i) / steps;
      return { s: Math.round(s * 100) / 100, pl: Math.round(strategyPayoff(strategyLegs, s, price) * 100) / 100 };
    });
  }, [legs, price]);

  const netDebit = legs.reduce((sum, l) => {
    if (l.kind === "stock") return sum + (l.side === "long" ? 1 : -1) * price * 100;
    return sum + (l.side === "long" ? 1 : -1) * l.premium * 100;
  }, 0);

  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="font-display text-base font-semibold">Custom strategy builder</h4>
          <p className="text-xs text-muted">Add legs and see combined payoff at expiration.</p>
        </div>
        <button type="button" onClick={addLeg} className="btn-ghost interactive">
          + Add leg
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {legs.map((leg) => (
          <div key={leg.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-2 text-xs">
            <select value={leg.kind} onChange={(e) => updateLeg(leg.id, { kind: e.target.value as LegKind })} className="rounded border border-border px-2 py-1">
              <option value="call">Call</option>
              <option value="put">Put</option>
              <option value="stock">Stock</option>
            </select>
            <select value={leg.side} onChange={(e) => updateLeg(leg.id, { side: e.target.value as "long" | "short" })} className="rounded border border-border px-2 py-1">
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
            {leg.kind !== "stock" && (
              <>
                <input
                  type="number"
                  value={leg.strike}
                  onChange={(e) => updateLeg(leg.id, { strike: Number(e.target.value) })}
                  className="w-20 rounded border border-border px-2 py-1 font-mono"
                />
                <input
                  type="number"
                  step={0.01}
                  value={leg.premium}
                  onChange={(e) => updateLeg(leg.id, { premium: Number(e.target.value) })}
                  className="w-20 rounded border border-border px-2 py-1 font-mono"
                />
              </>
            )}
            <button type="button" onClick={() => removeLeg(leg.id)} className="ml-auto text-muted hover:text-down">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 font-mono text-xs text-muted">
        Net {netDebit >= 0 ? "debit" : "credit"}: {formatCurrency(Math.abs(netDebit))}
      </div>

      <div className="mt-4 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} stroke="rgba(20,22,26,0.07)" strokeDasharray="3 3" />
            <XAxis dataKey="s" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => `$${Math.round(v)}`} tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => `${name} @ $${Math.round(Number(l))}`} />
            <ReferenceLine y={0} stroke="var(--muted-2)" />
            <ReferenceLine x={price} stroke="var(--foreground)" strokeDasharray="4 4" strokeOpacity={0.4} />
            <Line type="monotone" dataKey="pl" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
