"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { OptionContract } from "@/lib/types";
import { optionPayoff, optionRead, optionStats } from "@/lib/analysis";
import { formatCurrency } from "@/lib/format";
import { STRIKE_PREMIUM_EXPLAINER } from "@/lib/explanations";
import { Explainer } from "./Explainer";

function PayoffTooltip({
  active,
  payload,
  label,
  name,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: number;
  name: string;
}) {
  if (!active || !payload?.length) return null;
  const pl = payload[0]?.value ?? 0;
  return (
    <div className="surface rounded-lg px-3 py-2 text-xs">
      <div className="mb-0.5 text-muted">
        If {name} = ${Math.round(Number(label))}
      </div>
      <div className={`font-mono font-semibold ${pl >= 0 ? "text-up" : "text-down"}`}>
        {formatCurrency(pl)} / share
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <div className="text-[0.65rem] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-mono text-sm font-semibold text-foreground tabular-nums">{value}</div>
    </div>
  );
}

/** Interactive long call/put payoff-at-expiration diagram. Educational only. */
export function PayoffExplainer({
  name,
  price,
  call,
  put,
  initialType = "call",
}: {
  name: string;
  price: number;
  call: OptionContract;
  put: OptionContract;
  initialType?: "call" | "put";
}) {
  const [type, setType] = useState<"call" | "put">(initialType);

  useEffect(() => {
    setType(initialType);
  }, [initialType, call.strike, call.premium, put.strike, put.premium]);
  const contract = type === "call" ? call : put;
  const stats = optionStats(contract);

  const data = useMemo(() => {
    const lo = price * 0.5;
    const hi = price * 1.5;
    const steps = 60;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const s = lo + ((hi - lo) * i) / steps;
      return { s: Math.round(s * 100) / 100, pl: Math.round(optionPayoff(contract, s) * 100) / 100 };
    });
  }, [contract, price]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-display text-base font-semibold text-foreground">
          Payoff at expiration
        </h4>
        {/* Call / Put toggle */}
        <div className="surface flex items-center rounded-full p-0.5 text-xs font-medium" role="group">
          <button
            type="button"
            onClick={() => setType("call")}
            aria-pressed={type === "call"}
            className={`rounded-full px-3 py-1 transition-colors ${
              type === "call" ? "text-white" : "text-muted hover:text-foreground"
            }`}
            style={type === "call" ? { background: "var(--accent)" } : undefined}
          >
            Call
          </button>
          <button
            type="button"
            onClick={() => setType("put")}
            aria-pressed={type === "put"}
            className={`rounded-full px-3 py-1 transition-colors ${
              type === "put" ? "text-white" : "text-muted hover:text-foreground"
            }`}
            style={type === "put" ? { background: "var(--accent)" } : undefined}
          >
            Put
          </button>
        </div>
      </div>

      {/* Payoff chart */}
      <div className="mt-3 h-56 w-full">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid vertical={false} stroke="rgba(20,22,26,0.07)" strokeDasharray="3 3" />
              <XAxis
                dataKey="s"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => `$${Math.round(v)}`}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ stroke: "var(--accent)", strokeOpacity: 0.4, strokeDasharray: "4 4" }}
                content={<PayoffTooltip name={name} />}
              />
              {/* zero P/L line */}
              <ReferenceLine y={0} stroke="var(--muted-2)" />
              {/* today's price */}
              <ReferenceLine
                x={Math.round(price * 100) / 100}
                stroke="var(--foreground)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{ value: "Now", position: "top", fill: "var(--muted)", fontSize: 10 }}
              />
              {/* break-even */}
              <ReferenceLine
                x={Math.round(stats.breakeven * 100) / 100}
                stroke="var(--accent)"
                label={{ value: "Break-even", position: "top", fill: "var(--accent)", fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="pl"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={false}
                animationDuration={700}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Key numbers */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Strike" value={formatCurrency(contract.strike)} />
        <Stat label="Premium / sh" value={formatCurrency(contract.premium)} />
        <Stat label="Cost (×100)" value={formatCurrency(stats.contractCost)} />
        <Stat label="Break-even" value={formatCurrency(stats.breakeven)} />
        <Stat label="Max loss" value={`−${formatCurrency(stats.maxLoss)}`} />
        <Stat
          label="Max gain"
          value={stats.maxGain === null ? "Unlimited" : formatCurrency(stats.maxGain)}
        />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        {optionRead(contract, price, name)}
      </p>

      <div className="mt-3">
        <Explainer content={STRIKE_PREMIUM_EXPLAINER} />
      </div>
    </div>
  );
}
