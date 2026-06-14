import type { Metric, ReportCard } from "./types";

export interface FairValueScenario {
  metricKey: string;
  metricLabel: string;
  peerMedian: number;
  currentValue: number;
  impliedPrice: number;
  upsidePct: number;
}

/** Implied price if this stock traded at peer-median multiples/ratios. */
export function peerImpliedFairValues(data: ReportCard): FairValueScenario[] {
  const price = data.price;
  const scenarios: FairValueScenario[] = [];

  for (const m of data.metrics) {
    if (m.value === null || m.vsIndustryPct === null) continue;

    const peerMedian = m.value / (1 + m.vsIndustryPct / 100);
    if (!Number.isFinite(peerMedian) || peerMedian <= 0) continue;

    let impliedPrice = price;

    switch (m.key) {
      case "pe":
      case "evEbitda":
        impliedPrice = price * (peerMedian / m.value);
        break;
      case "roe":
      case "opRevenue":
      case "divYield":
      case "cashFlowChange":
        impliedPrice = price * (1 + (peerMedian - m.value) * 0.5);
        break;
      case "assetLiability":
        impliedPrice = price * (0.85 + 0.15 * (peerMedian / m.value));
        break;
      default:
        continue;
    }

    impliedPrice = Math.round(impliedPrice * 100) / 100;
    scenarios.push({
      metricKey: m.key,
      metricLabel: m.label,
      peerMedian: Math.round(peerMedian * 1000) / 1000,
      currentValue: m.value,
      impliedPrice,
      upsidePct: Math.round(((impliedPrice - price) / price) * 1000) / 10,
    });
  }

  return scenarios.sort((a, b) => Math.abs(b.upsidePct) - Math.abs(a.upsidePct));
}

export function compositeFairValue(scenarios: FairValueScenario[]): number | null {
  if (!scenarios.length) return null;
  const avg = scenarios.reduce((s, x) => s + x.impliedPrice, 0) / scenarios.length;
  return Math.round(avg * 100) / 100;
}

export interface GradeMetricContribution {
  metric: Metric;
  favorable: boolean;
  weight: number;
  vsIndustryPct: number;
  read: string;
}

export function gradeMetricBreakdown(data: ReportCard): GradeMetricContribution[] {
  return data.metrics
    .filter((m) => m.vsIndustryPct !== null)
    .map((m) => {
      const pct = m.vsIndustryPct as number;
      const favorable = pct > 0 === m.higherIsBetter;
      const weight = Math.min(Math.abs(pct) / 25, 1);
      const read = favorable
        ? `Helped the grade — ${Math.abs(pct).toFixed(0)}% ${pct > 0 ? "above" : "below"} peers in a good direction.`
        : `Hurt the grade — ${Math.abs(pct).toFixed(0)}% off peers in the wrong direction.`;
      return { metric: m, favorable, weight, vsIndustryPct: pct, read };
    })
    .sort((a, b) => b.weight - a.weight);
}
