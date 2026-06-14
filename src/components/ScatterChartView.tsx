"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart as RechartsScatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { ScatterChartData } from "@/lib/chart/types";
import { formatMetricDisplay } from "@/lib/format";

function ScatterTooltip({
  active,
  payload,
  xKey,
  yKey,
}: {
  active?: boolean;
  payload?: { payload?: { ticker: string; name: string; x: number; y: number; isTarget: boolean } }[];
  xKey: string;
  yKey: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload!;
  return (
    <div className="surface rounded-lg px-3 py-2 text-xs">
      <div className="font-semibold text-foreground">
        {p.ticker} {p.isTarget && <span className="text-accent">· you are here</span>}
      </div>
      <div className="font-mono text-muted">
        {formatMetricDisplay(xKey, p.x)} vs {formatMetricDisplay(yKey, p.y)}
      </div>
    </div>
  );
}

function TargetDot(props: { cx?: number; cy?: number }) {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill="var(--accent)" opacity={0.15} />
      <circle cx={cx} cy={cy} r={8} fill="var(--accent)" stroke="var(--card)" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3} fill="var(--card)" />
    </g>
  );
}

export function ScatterChartView({ data }: { data: ScatterChartData }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const peers = data.points.filter((p) => !p.isTarget);
  const target = data.points.filter((p) => p.isTarget);

  if (!mounted) return <div className="h-full w-full" aria-hidden />;

  return (
    <div className="h-full w-full">
      <div className="mb-1 text-center text-[0.6rem] text-muted">
        Highlighted dot = this stock · peers in grey
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsScatter margin={{ top: 12, right: 12, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="rgba(20,22,26,0.07)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name={data.seriesX.label}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatMetricDisplay(data.seriesX.key, v)}
            label={{
              value: data.seriesX.label,
              position: "insideBottom",
              offset: -4,
              fill: "var(--muted)",
              fontSize: 10,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={data.seriesY.label}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => formatMetricDisplay(data.seriesY.key, v)}
            label={{
              value: data.seriesY.label,
              angle: -90,
              position: "insideLeft",
              fill: "var(--muted)",
              fontSize: 10,
            }}
          />
          <ZAxis range={[40, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: "4 4" }}
            content={<ScatterTooltip xKey={data.seriesX.key} yKey={data.seriesY.key} />}
          />
          <Scatter name="Peers" data={peers} fill="var(--muted-2)" fillOpacity={0.7} />
          <Scatter name="This stock" data={target} fill="var(--accent)" shape={TargetDot} />
        </RechartsScatter>
      </ResponsiveContainer>
    </div>
  );
}
