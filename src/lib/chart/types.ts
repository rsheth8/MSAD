export type ChartRange = "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "MAX";
export type ChartMode = "compare" | "scatter";
export type ScatterMetricKey =
  | "roe"
  | "opRevenue"
  | "cashFlowChange"
  | "pe"
  | "evEbitda"
  | "divYield"
  | "assetLiability";

export interface ChartSeriesMeta {
  key: string;
  label: string;
}

export interface CompareChartPoint {
  date: string;
  label: string;
  aIndexed: number;
  bIndexed: number;
  aRaw: number;
  bRaw: number;
  volume: number;
  /** % below running peak on series A (≤ 0) */
  drawdown: number;
}

export interface CompareChartData {
  mode: "compare";
  range: ChartRange;
  seriesA: ChartSeriesMeta;
  seriesB: ChartSeriesMeta;
  periodChangeA: number;
  periodChangeB: number;
  maxDrawdown: number;
  points: CompareChartPoint[];
  isSectorDefault: boolean;
  presetDescription: string;
}

export interface ScatterChartPoint {
  ticker: string;
  name: string;
  x: number;
  y: number;
  isTarget: boolean;
}

export interface ScatterChartData {
  mode: "scatter";
  seriesX: ChartSeriesMeta;
  seriesY: ChartSeriesMeta;
  points: ScatterChartPoint[];
  targetTicker: string;
}

export type ChartResponse = CompareChartData | ScatterChartData;

export interface ChartDefaultPreset {
  range: ChartRange;
  seriesA: string;
  seriesB: string;
  seriesALabel: string;
  seriesBLabel: string;
  description: string;
}

export interface ChartOptionsMeta {
  defaultPreset: ChartDefaultPreset;
  compareOptions: ChartSeriesMeta[];
  scatterMetrics: { key: ScatterMetricKey; label: string }[];
}

export interface FullChartPayload {
  chart: ChartResponse;
  meta: ChartOptionsMeta;
}
