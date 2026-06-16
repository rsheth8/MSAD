/**
 * Pure portfolio-risk math. Aligns holdings on common dates, blends returns by
 * weight, and surfaces concentration, sector tilt, volatility, drawdown,
 * correlation, and beta-implied crash scenarios — plus honest caveats.
 */
import type { CrashScenario, RiskAsset, RiskResult, SectorSlice } from "./types";

const TRADING_DAYS = 252;
const CRASHES: { label: string; drop: number }[] = [
  { label: "Correction (−10%)", drop: -0.1 },
  { label: "Bear market (−20%)", drop: -0.2 },
  { label: "2008 / 2020-style (−34%)", drop: -0.34 },
];

function normalizeWeights(assets: RiskAsset[]): RiskAsset[] {
  const total = assets.reduce((s, a) => s + Math.max(0, a.weight), 0);
  if (total <= 0) return assets.map((a) => ({ ...a, weight: 1 / assets.length }));
  return assets.map((a) => ({ ...a, weight: Math.max(0, a.weight) / total }));
}

/** Daily returns keyed by date for one asset. */
function returnsByDate(dates: string[], closes: number[]): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) m.set(dates[i], closes[i] / closes[i - 1] - 1);
  }
  return m;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

function maxDrawdown(curve: number[]): number {
  let peak = -Infinity;
  let mdd = 0;
  for (const v of curve) {
    if (v > peak) peak = v;
    if (peak > 0) mdd = Math.max(mdd, (peak - v) / peak);
  }
  return mdd;
}

export function computeRisk(rawAssets: RiskAsset[], isMock: boolean): RiskResult {
  const assets = normalizeWeights(rawAssets.filter((a) => a.closes.length > 1));
  const holdings = assets.map((a) => ({ ticker: a.ticker, weight: a.weight, sector: a.sector, beta: a.beta }));

  // ---- concentration ----
  const sortedByW = [...assets].sort((a, b) => b.weight - a.weight);
  const hhi = assets.reduce((s, a) => s + a.weight ** 2, 0);
  const concentration = {
    topTicker: sortedByW[0]?.ticker ?? "—",
    topWeight: sortedByW[0]?.weight ?? 0,
    hhi,
    effectiveHoldings: hhi > 0 ? 1 / hhi : 0,
  };

  // ---- sector exposure ----
  const sectorMap = new Map<string, number>();
  for (const a of assets) sectorMap.set(a.sector, (sectorMap.get(a.sector) ?? 0) + a.weight);
  const sectors: SectorSlice[] = [...sectorMap.entries()]
    .map(([sector, weight]) => ({ sector, weight }))
    .sort((x, y) => y.weight - x.weight);

  // ---- beta ----
  const portfolioBeta = assets.reduce((s, a) => s + a.weight * a.beta, 0);

  // ---- align returns on common dates ----
  const perAsset = assets.map((a) => returnsByDate(a.dates, a.closes));
  let commonDates: string[] = [];
  if (perAsset.length > 0) {
    commonDates = [...perAsset[0].keys()].filter((d) => perAsset.every((m) => m.has(d))).sort();
  }
  const assetReturnSeries = perAsset.map((m) => commonDates.map((d) => m.get(d) ?? 0));

  // portfolio daily returns + equity curve
  const portReturns = commonDates.map((_, i) =>
    assets.reduce((s, a, ai) => s + a.weight * assetReturnSeries[ai][i], 0),
  );
  const curve = [1];
  for (const r of portReturns) curve.push(curve[curve.length - 1] * (1 + r));
  const volatility = stdev(portReturns) * Math.sqrt(TRADING_DAYS);
  const mdd = maxDrawdown(curve);

  // ---- average pairwise correlation ----
  let avgCorrelation: number | null = null;
  if (assets.length >= 2 && commonDates.length >= 2) {
    let sum = 0;
    let pairs = 0;
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        sum += pearson(assetReturnSeries[i], assetReturnSeries[j]);
        pairs += 1;
      }
    }
    avgCorrelation = pairs > 0 ? sum / pairs : null;
  }

  // ---- crash scenarios (linear beta approximation) ----
  const scenarios: CrashScenario[] = CRASHES.map((c) => ({
    label: c.label,
    marketDrop: c.drop,
    estDrop: Math.max(-0.95, portfolioBeta * c.drop),
  }));

  return {
    holdings,
    concentration,
    sectors,
    portfolioBeta,
    volatility,
    maxDrawdown: mdd,
    avgCorrelation,
    scenarios,
    warnings: buildWarnings(concentration, sectors, avgCorrelation, commonDates.length),
    isMock,
  };
}

export function buildWarnings(
  concentration: RiskResult["concentration"],
  sectors: SectorSlice[],
  avgCorrelation: number | null,
  sampleDays: number,
): string[] {
  const w: string[] = [];
  if (concentration.topWeight >= 0.4) {
    w.push(
      `Concentrated: ${(concentration.topWeight * 100).toFixed(0)}% sits in one name (${concentration.topTicker}). A single bad day there moves your whole portfolio.`,
    );
  }
  if (concentration.effectiveHoldings < 3 && concentration.effectiveHoldings > 0) {
    w.push(
      `You hold positions in several names but, by weight, you're effectively diversified across only ~${concentration.effectiveHoldings.toFixed(1)} of them.`,
    );
  }
  const topSector = sectors[0];
  if (topSector && topSector.weight >= 0.5) {
    w.push(
      `${(topSector.weight * 100).toFixed(0)}% is in ${topSector.sector}. Sector shocks would hit most of the book at once.`,
    );
  }
  if (avgCorrelation !== null && avgCorrelation >= 0.7) {
    w.push(
      `Your holdings move together (avg correlation ${avgCorrelation.toFixed(2)}). That's less diversification than the number of tickers suggests.`,
    );
  }
  w.push("Beta and volatility are backward-looking estimates; the next crash won't match the last one. Treat the scenarios as rough, not precise.");
  if (sampleDays < 60) {
    w.push("Short price history here — the risk estimates are rough. More history makes them steadier.");
  }
  return w;
}
