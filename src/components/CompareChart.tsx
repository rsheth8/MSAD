"use client";

import { useEffect, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CompareChartData } from "@/lib/chart/types";
import { formatCurrency, formatSignedPercent } from "@/lib/format";

function CompareTooltip({
  active,
  payload,
  label,
  seriesA,
  seriesB,
}: {
  active?: boolean;
  payload?: { payload?: Record<string, unknown> }[];
  label?: string;
  seriesA: string;
  seriesB: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as {
    aIndexed?: number;
    bIndexed?: number;
    aRaw?: number;
    drawdown?: number;
    volume?: number;
  };
  return (
    <div className="surface rounded-lg px-3 py-2 text-xs">
      <div className="mb-1 font-medium text-muted">{label}</div>
      <div className="font-mono text-foreground">
        {seriesA}: {p.aIndexed?.toFixed(1)} ({formatCurrency(p.aRaw ?? 0)})
      </div>
      <div className="font-mono text-muted">
        {seriesB}: {p.bIndexed?.toFixed(1)}
      </div>
      {(p.drawdown ?? 0) < -0.5 && (
        <div className="mt-0.5 font-mono text-down">Drawdown: {formatSignedPercent(p.drawdown ?? 0)}</div>
      )}
      {!!p.volume && (
        <div className="mt-0.5 font-mono text-muted">Vol: {(p.volume / 1e6).toFixed(1)}M</div>
      )}
    </div>
  );
}

export function CompareChart({
  data,
  showVolume,
}: {
  data: CompareChartData;
  showVolume: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-full w-full" aria-hidden />;

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data.points} margin={{ top: 8, right: showVolume ? 36 : 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="stockFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(20,22,26,0.07)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            yAxisId="price"
            domain={["dataMin - 5", "dataMax + 5"]}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          {showVolume && (
            <YAxis
              yAxisId="volume"
              orientation="right"
              tick={{ fill: "var(--muted-2)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={32}
              tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
            />
          )}
          <Tooltip
            content={
              <CompareTooltip seriesA={data.seriesA.label} seriesB={data.seriesB.label} />
            }
            cursor={{ stroke: "var(--accent)", strokeOpacity: 0.4, strokeDasharray: "4 4" }}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="bIndexed"
            stroke="var(--muted-2)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            animationDuration={900}
          />
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="aIndexed"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill="url(#stockFill)"
            dot={false}
            activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--card)", strokeWidth: 2 }}
            animationDuration={1000}
          />
          {showVolume && (
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill="var(--muted-2)"
              fillOpacity={0.22}
              barSize={4}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
