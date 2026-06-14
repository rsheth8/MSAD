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
import type { OptionsChainPayload } from "@/lib/options/types";
import type { StrategyId } from "@/lib/options/types";
import {
  buildStrategyContext,
  getStrategy,
  STRATEGY_PRESETS,
  strategyMaxRisk,
  strategyPayoff,
} from "@/lib/options/strategies";
import { formatCurrency } from "@/lib/format";

export function StrategyExplorer({
  chain,
  expiry,
  name,
}: {
  chain: OptionsChainPayload;
  expiry: string;
  name: string;
}) {
  const [strategyId, setStrategyId] = useState<StrategyId>("long-call");
  const rows = chain.chains[expiry] ?? [];
  const ctx = useMemo(() => buildStrategyContext(chain.underlyingPrice, rows), [chain.underlyingPrice, rows]);
  const strategy = getStrategy(strategyId);
  const legs = useMemo(() => strategy.legs(ctx), [strategy, ctx]);

  const chartData = useMemo(() => {
    const price = chain.underlyingPrice;
    const lo = price * 0.7;
    const hi = price * 1.3;
    const steps = 50;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const s = lo + ((hi - lo) * i) / steps;
      return {
        s: Math.round(s * 100) / 100,
        pl: Math.round(strategyPayoff(legs, s, price) * 100) / 100,
      };
    });
  }, [chain.underlyingPrice, legs]);

  const plNow = strategyPayoff(legs, chain.underlyingPrice, chain.underlyingPrice);
  const maxRisk = strategyMaxRisk(legs, chain.underlyingPrice);

  const netPremium = legs.reduce((sum, leg) => {
    if (leg.kind === "stock") return sum;
    const mult = leg.side === "long" ? 1 : -1;
    return sum + mult * (leg.premium ?? 0) * 100;
  }, 0);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-display text-base font-semibold text-foreground">Strategy analyzer</h4>
        <p className="mt-0.5 text-xs text-muted">
          Model how common strategies pay off at expiration for {name}. Educational only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STRATEGY_PRESETS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStrategyId(s.id)}
            className={`rounded-full border px-3 py-1 text-[0.65rem] font-medium transition-colors ${
              strategyId === s.id
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-muted">{strategy.summary}</p>

      <div className="flex flex-wrap gap-2 text-[0.65rem]">
        <span className="rounded-full bg-background px-2 py-0.5 font-mono">
          Net premium: {formatCurrency(Math.abs(netPremium))} {netPremium >= 0 ? "debit" : "credit"}
        </span>
        <span className="rounded-full bg-background px-2 py-0.5 font-mono">
          P/L at current price: {formatCurrency(plNow)} / sh
        </span>
        {maxRisk !== null && (
          <span className="rounded-full bg-background px-2 py-0.5 font-mono text-down">
            Max risk (est.): {formatCurrency(maxRisk)}
          </span>
        )}
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid vertical={false} stroke="rgba(20,22,26,0.07)" strokeDasharray="3 3" />
            <XAxis
              dataKey="s"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => `$${Math.round(v)}`}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${v}`}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const pl = Number(payload[0]?.value ?? 0);
                return (
                  <div className="surface rounded-lg px-3 py-2 text-xs">
                    <div className="text-muted">{name} @ ${Math.round(Number(label))}</div>
                    <div className="font-mono font-semibold">{formatCurrency(pl)} P/L</div>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="var(--muted-2)" />
            <ReferenceLine
              x={chain.underlyingPrice}
              stroke="var(--foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
            <Line type="monotone" dataKey="pl" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-border bg-background p-3">
        <div className="text-[0.65rem] uppercase tracking-wider text-muted">Legs at expiration</div>
        <ul className="mt-2 space-y-1 text-xs text-muted">
          {legs.map((leg, i) => (
            <li key={i} className="font-mono">
              {leg.side === "long" ? "+" : "−"}{" "}
              {leg.kind === "stock"
                ? "100 shares"
                : `${leg.kind.toUpperCase()} ${formatCurrency(leg.strike ?? 0)} @ ${formatCurrency(leg.premium ?? 0)}`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
