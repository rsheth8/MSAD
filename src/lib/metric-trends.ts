export type MetricTrend = "improving" | "declining" | "stable";

/** Deterministic pseudo-trend from ticker + metric — placeholder until historical ratios API. */
export function metricTrend(ticker: string, metricKey: string): MetricTrend {
  let h = 0;
  const s = `${ticker}:${metricKey}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const bucket = h % 10;
  if (bucket <= 3) return "improving";
  if (bucket >= 7) return "declining";
  return "stable";
}

export function trendLabel(t: MetricTrend): string {
  if (t === "improving") return "Trending better vs peers";
  if (t === "declining") return "Trending softer vs peers";
  return "Stable vs peers";
}
