"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChainRow, OptionsChainPayload } from "@/lib/options/types";
import { blackScholesPrice, quoteLeg } from "@/lib/options/black-scholes";
import { optionPayoff } from "@/lib/analysis";
import { formatCurrency, formatPercent, formatSignedPercent } from "@/lib/format";
import { GlassCard } from "./GlassCard";
import { SliderControl } from "./SliderControl";

export function OptionsScenarioLab({
  chain,
  expiry,
  selected,
  name,
}: {
  chain: OptionsChainPayload;
  expiry: string;
  selected: { type: "call" | "put"; row: ChainRow } | null;
  name: string;
}) {
  const spot = chain.underlyingPrice;
  const days = chain.expirations.find((e) => e.date === expiry)?.days ?? 30;

  const [scenarioPrice, setScenarioPrice] = useState(spot);
  const [ivShock, setIvShock] = useState(0);
  const [dte, setDte] = useState(days);

  const base = selected
    ? selected.type === "call"
      ? selected.row.call
      : selected.row.put
    : null;

  const scenario = useMemo(() => {
    if (!selected || !base) return null;
    const T = Math.max(1 / 365, dte / 365);
    const sigma = Math.min(1.5, Math.max(0.05, base.iv + ivShock));
    const q = quoteLeg(selected.type, scenarioPrice, selected.row.strike, T, sigma);
    const pl = optionPayoff(
      { type: selected.type, strike: selected.row.strike, premium: base.premium, expiry, delta: base.delta },
      scenarioPrice,
    );
    return { ...q, pl, sigma };
  }, [selected, base, scenarioPrice, ivShock, dte, expiry]);

  const thetaCurve = useMemo(() => {
    if (!selected || !base) return [];
    const sigma = Math.min(1.5, Math.max(0.05, base.iv + ivShock));
    return Array.from({ length: Math.max(2, dte) }, (_, i) => {
      const d = dte - i;
      const T = Math.max(1 / 365, d / 365);
      const prem = blackScholesPrice(selected.type, spot, selected.row.strike, T, sigma);
      return { day: i, premium: Math.round(prem * 100) / 100 };
    });
  }, [selected, base, spot, ivShock, dte]);

  if (!selected) {
    return (
      <GlassCard className="p-4 text-center text-xs text-muted">
        Select a contract from the chain to run what-if scenarios.
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 sm:p-5">
        <h4 className="font-display text-base font-semibold">What-if scenario</h4>
        <p className="mt-0.5 text-xs text-muted">
          Move price, IV, and time — see how your {selected.type} at {formatCurrency(selected.row.strike)} responds.
        </p>

        <div className="mt-4 space-y-4">
          <SliderControl
            label={`${name} price at expiry`}
            value={scenarioPrice}
            min={spot * 0.7}
            max={spot * 1.3}
            step={0.5}
            format={(v) => formatCurrency(v)}
            onChange={setScenarioPrice}
          />
          <SliderControl
            label="IV shock"
            value={ivShock}
            min={-0.15}
            max={0.25}
            step={0.01}
            format={(v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)} pts`}
            onChange={setIvShock}
          />
          <SliderControl
            label="Days to expiry"
            value={dte}
            min={1}
            max={Math.max(days, 90)}
            step={1}
            format={(v) => `${v}d`}
            onChange={setDte}
          />
        </div>

        {scenario && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-xl bg-background p-2 text-center">
              <div className="text-muted">Model premium</div>
              <div className="font-mono font-semibold">{formatCurrency(scenario.premium)}</div>
            </div>
            <div className="rounded-xl bg-background p-2 text-center">
              <div className="text-muted">P/L at scenario</div>
              <div className={`font-mono font-semibold ${scenario.pl >= 0 ? "text-up" : "text-down"}`}>
                {formatCurrency(scenario.pl)}/sh
              </div>
            </div>
            <div className="rounded-xl bg-background p-2 text-center">
              <div className="text-muted">Delta</div>
              <div className="font-mono font-semibold">{scenario.greeks.delta.toFixed(3)}</div>
            </div>
            <div className="rounded-xl bg-background p-2 text-center">
              <div className="text-muted">IV used</div>
              <div className="font-mono font-semibold">{formatPercent(scenario.sigma, 0)}</div>
            </div>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-4">
        <div className="mb-2 text-xs font-semibold text-foreground">Time decay (theta path)</div>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={thetaCurve}>
              <CartesianGrid vertical={false} stroke="rgba(20,22,26,0.07)" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(d) => `Day ${d}`} />
              <Line type="monotone" dataKey="premium" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[0.65rem] text-muted">
          Premium path if spot stays at {formatCurrency(spot)} and IV holds — illustrates time decay.
        </p>
      </GlassCard>
    </div>
  );
}
