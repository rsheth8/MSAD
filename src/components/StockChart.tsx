"use client";

import { useEffect, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesPoint } from "@/lib/types";

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(iso: string): string {
  const m = Number(iso.slice(5, 7)) - 1;
  return MONTH[m] ?? "";
}

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="surface rounded-lg px-3 py-2 text-xs">
      <div className="mb-1 font-medium text-muted">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 font-mono">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-foreground">
            {p.name === "stock" ? "Stock" : "S&P 500"}
          </span>
          <span className="ml-auto text-foreground">
            {p.value?.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 12-month price line (indexed to 100) for the stock vs the S&P 500. */
export function StockChart({ series }: { series: SeriesPoint[] }) {
  const data = series.map((p) => ({ ...p, month: monthLabel(p.date) }));

  // ResponsiveContainer can't measure a zero-size box during SSR; only render
  // the chart once mounted in the browser so it has real dimensions.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-full w-full" aria-hidden />;

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="stockFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="rgba(20,22,26,0.07)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            domain={["dataMin - 5", "dataMax + 5"]}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "var(--accent)", strokeOpacity: 0.5, strokeDasharray: "4 4" }}
          />
          {/* S&P 500 benchmark (neutral grey), drawn under the stock */}
          <Line
            type="monotone"
            dataKey="sp500"
            stroke="var(--muted-2)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            animationDuration={1400}
          />
          {/* Stock: single Area draws both the accent line and its gradient fill */}
          <Area
            type="monotone"
            dataKey="stock"
            stroke="var(--accent)"
            strokeWidth={2.5}
            fill="url(#stockFill)"
            dot={false}
            activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--card)", strokeWidth: 2 }}
            animationDuration={1600}
            animationEasing="ease-in-out"
            isAnimationActive
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
