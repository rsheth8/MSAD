"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

export function MiniSparkline({
  data,
  up,
  stroke,
  className = "",
}: {
  data: number[];
  up?: boolean;
  stroke?: string;
  className?: string;
}) {
  if (!data.length) return null;
  const chartData = data.map((v, i) => ({ i, v }));
  const color =
    stroke ?? (up === false ? "var(--down)" : up === true ? "var(--up)" : "var(--accent)");

  return (
    <div className={`h-8 w-16 opacity-80 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
