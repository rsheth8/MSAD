import type {
  FmpBalanceSheet,
  FmpCashFlow,
  FmpKeyMetricsTtm,
  FmpRatiosTtm,
} from "@/lib/fmp/types";
import type { Metric } from "@/lib/types";
import { formatMetricDisplay } from "@/lib/format";

export interface RawMetricValues {
  roe: number | null;
  opRevenue: number | null;
  cashFlowChange: number | null;
  pe: number | null;
  evEbitda: number | null;
  divYield: number | null;
  assetLiability: number | null;
}

export interface MetricInputs {
  ratios: FmpRatiosTtm | null;
  keyMetrics: FmpKeyMetricsTtm | null;
  balanceSheet: FmpBalanceSheet | null;
  cashFlows: FmpCashFlow[];
}

export function extractRawMetrics(input: MetricInputs): RawMetricValues {
  const { ratios, keyMetrics, balanceSheet, cashFlows } = input;

  let cashFlowChange: number | null = null;
  if (cashFlows.length >= 2) {
    const latest = cashFlows[0]?.operatingCashFlow;
    const prior = cashFlows[1]?.operatingCashFlow;
    if (
      latest !== undefined &&
      prior !== undefined &&
      prior !== 0 &&
      Number.isFinite(latest) &&
      Number.isFinite(prior)
    ) {
      cashFlowChange = (latest - prior) / Math.abs(prior);
    }
  }

  let assetLiability: number | null = null;
  const assets = balanceSheet?.totalAssets;
  const liabilities = balanceSheet?.totalLiabilities;
  if (
    assets !== undefined &&
    liabilities !== undefined &&
    liabilities > 0 &&
    Number.isFinite(assets) &&
    Number.isFinite(liabilities)
  ) {
    assetLiability = assets / liabilities;
  }

  return {
    roe: keyMetrics?.returnOnEquityTTM ?? null,
    opRevenue: ratios?.operatingProfitMarginTTM ?? null,
    cashFlowChange,
    pe: ratios?.priceToEarningsRatioTTM ?? null,
    evEbitda: keyMetrics?.evToEBITDATTM ?? null,
    divYield: ratios?.dividendYieldTTM ?? null,
    assetLiability,
  };
}

function vsIndustryPct(value: number | null, avg: number | null): number | null {
  if (value === null || avg === null || avg === 0 || !Number.isFinite(value) || !Number.isFinite(avg)) {
    return null;
  }
  return Math.round(((value - avg) / Math.abs(avg)) * 1000) / 10;
}

const METRIC_DEFS: {
  key: keyof RawMetricValues;
  label: string;
  higherIsBetter: boolean;
}[] = [
  { key: "roe", label: "Return on Equity (ROE)", higherIsBetter: true },
  { key: "opRevenue", label: "Operating / Revenue Ratio", higherIsBetter: true },
  { key: "cashFlowChange", label: "Change in Cash Flow", higherIsBetter: true },
  { key: "pe", label: "P / E Ratio", higherIsBetter: false },
  { key: "evEbitda", label: "EV / EBITDA", higherIsBetter: false },
  { key: "divYield", label: "Dividend Yield", higherIsBetter: true },
  { key: "assetLiability", label: "Asset / Liability Ratio", higherIsBetter: true },
];

export function buildMetrics(
  raw: RawMetricValues,
  peerAvgs: Partial<Record<keyof RawMetricValues, number | null>>,
): Metric[] {
  return METRIC_DEFS.map(({ key, label, higherIsBetter }) => {
    const value = raw[key];
    return {
      key,
      label,
      value,
      display: formatMetricDisplay(key, value),
      vsIndustryPct: vsIndustryPct(value, peerAvgs[key] ?? null),
      higherIsBetter,
    };
  });
}

export function averageRawMetrics(all: RawMetricValues[]): Partial<Record<keyof RawMetricValues, number | null>> {
  const keys = METRIC_DEFS.map((d) => d.key);
  const out: Partial<Record<keyof RawMetricValues, number | null>> = {};

  for (const key of keys) {
    const nums = all.map((m) => m[key]).filter((v): v is number => v !== null && Number.isFinite(v));
    out[key] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  }
  return out;
}
