"use client";

import { Line, LineChart } from "recharts";

// Fixed pixel size (matches h-8 w-16). Rendering the chart at an explicit size
// avoids ResponsiveContainer's first-paint measure, which logs a width(-1)/
// height(-1) warning for every instance — and tiles render dozens of these.
const WIDTH = 64;
const HEIGHT = 32;

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
      <LineChart data={chartData} width={WIDTH} height={HEIGHT}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}
