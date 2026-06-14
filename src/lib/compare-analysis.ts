import { overallGrade } from "./analysis";
import type { Metric, ReportCard } from "./types";

export interface MetricComparison {
  key: string;
  label: string;
  aDisplay: string;
  bDisplay: string;
  winner: "a" | "b" | "tie";
  aVsIndustry: number | null;
  bVsIndustry: number | null;
}

function metricScore(m: Metric): number | null {
  if (m.vsIndustryPct === null) return null;
  const favorable = m.vsIndustryPct > 0 === m.higherIsBetter;
  return favorable ? Math.abs(m.vsIndustryPct) : -Math.abs(m.vsIndustryPct);
}

export function compareMetrics(a: ReportCard, b: ReportCard): MetricComparison[] {
  const bMap = new Map(b.metrics.map((m) => [m.key, m]));
  return a.metrics.map((ma) => {
    const mb = bMap.get(ma.key);
    if (!mb) {
      return {
        key: ma.key,
        label: ma.label,
        aDisplay: ma.display,
        bDisplay: "—",
        winner: "a" as const,
        aVsIndustry: ma.vsIndustryPct,
        bVsIndustry: null,
      };
    }
    const sa = metricScore(ma);
    const sb = metricScore(mb);
    let winner: "a" | "b" | "tie" = "tie";
    if (sa !== null && sb !== null) {
      if (sa > sb + 2) winner = "a";
      else if (sb > sa + 2) winner = "b";
    }
    return {
      key: ma.key,
      label: ma.label,
      aDisplay: ma.display,
      bDisplay: mb.display,
      winner,
      aVsIndustry: ma.vsIndustryPct,
      bVsIndustry: mb.vsIndustryPct,
    };
  });
}

export function compareVerdict(a: ReportCard, b: ReportCard): {
  headline: string;
  detail: string;
  aWins: number;
  bWins: number;
} {
  const gradeA = overallGrade(a);
  const gradeB = overallGrade(b);
  const comps = compareMetrics(a, b);
  const aWins = comps.filter((c) => c.winner === "a").length;
  const bWins = comps.filter((c) => c.winner === "b").length;

  let headline: string;
  if (gradeA.score > gradeB.score + 8) headline = `${a.ticker} leads on overall quality`;
  else if (gradeB.score > gradeA.score + 8) headline = `${b.ticker} leads on overall quality`;
  else if (aWins > bWins + 2) headline = `${a.ticker} wins more fundamental matchups`;
  else if (bWins > aWins + 2) headline = `${b.ticker} wins more fundamental matchups`;
  else headline = "Close call — different strengths";

  const aStrength = gradeA.strengths[0] ?? "fundamentals";
  const bStrength = gradeB.strengths[0] ?? "fundamentals";
  const detail = `${a.ticker} (${gradeA.letter}, ${aWins} metric wins) leans on ${aStrength.toLowerCase()}; ${b.ticker} (${gradeB.letter}, ${bWins} metric wins) on ${bStrength.toLowerCase()}.`;

  return { headline, detail, aWins, bWins };
}
