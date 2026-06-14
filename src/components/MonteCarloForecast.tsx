"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportCard } from "@/lib/types";
import { runMonteCarlo } from "@/lib/monte-carlo";
import { formatCurrency, formatPercent } from "@/lib/format";
import { GlassCard } from "./GlassCard";
import { SliderControl } from "./SliderControl";

export function MonteCarloForecast({ data }: { data: ReportCard }) {
  const [horizon, setHorizon] = useState(60);
  const [vol, setVol] = useState(Math.max(0.15, data.beta * 0.2));

  const result = useMemo(
    () => runMonteCarlo(data.price, vol, horizon, 350, data.ticker),
    [data.price, data.ticker, horizon, vol],
  );

  const chartData = result.fan.map((p) => ({
    day: p.day,
    p10: p.p10,
    p50: p.p50,
    p90: p.p90,
  }));

  return (
    <GlassCard className="p-4 sm:p-5">
      <h4 className="font-display text-base font-semibold text-foreground">Scenario forecast</h4>
      <p className="mt-0.5 text-xs text-muted">
        Monte Carlo fan chart — not a prediction. Shows a range of paths if volatility stays near your setting.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <SliderControl label="Horizon (trading days)" value={horizon} min={10} max={252} step={5} format={(v) => `${v}d`} onChange={setHorizon} />
        <SliderControl label="Volatility (annual)" value={vol} min={0.1} max={0.8} step={0.01} format={(v) => formatPercent(v, 0)} onChange={setVol} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem]">
        <span className="rounded-full bg-background px-2 py-0.5 font-mono">
          P(above spot): {(result.probAboveSpot * 100).toFixed(0)}%
        </span>
        <span className="rounded-full bg-background px-2 py-0.5 font-mono">
          Median return: {result.medianReturn >= 0 ? "+" : ""}
          {result.medianReturn}%
        </span>
        <span className="rounded-full bg-background px-2 py-0.5 text-muted">
          {result.paths} simulated paths
        </span>
      </div>

      <div className="mt-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(20,22,26,0.07)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => `$${Math.round(v)}`} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(d) => `Day ${d}`} />
            <ReferenceLine y={data.price} stroke="var(--foreground)" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Line type="monotone" dataKey="p10" stroke="var(--accent)" strokeWidth={1} strokeOpacity={0.35} dot={false} />
            <Line type="monotone" dataKey="p90" stroke="var(--accent)" strokeWidth={1} strokeOpacity={0.35} dot={false} />
            <Line type="monotone" dataKey="p50" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
