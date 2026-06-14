import { metricTrend, trendLabel, type MetricTrend } from "@/lib/metric-trends";

export function MetricTrendBadge({ ticker, metricKey }: { ticker: string; metricKey: string }) {
  const trend = metricTrend(ticker, metricKey);
  const color =
    trend === "improving" ? "text-up bg-up/10" : trend === "declining" ? "text-down bg-down/10" : "text-muted bg-background";

  return (
    <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[0.6rem] font-medium ${color}`}>
      {trend === "improving" ? "↑" : trend === "declining" ? "↓" : "→"} {trendLabel(trend)}
    </span>
  );
}

export type { MetricTrend };
