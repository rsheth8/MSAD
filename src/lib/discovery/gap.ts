/** Sector gaps in a portfolio — for diversification-aware discovery. */

export interface SectorWeight {
  sector: string;
  weight: number;
}

export function sectorWeights(
  holdings: { sector: string; weight: number }[],
): SectorWeight[] {
  const map = new Map<string, number>();
  const total = holdings.reduce((s, h) => s + Math.max(0, h.weight), 0) || 1;
  for (const h of holdings) {
    const sector = h.sector || "Unknown";
    map.set(sector, (map.get(sector) ?? 0) + Math.max(0, h.weight) / total);
  }
  return [...map.entries()]
    .map(([sector, weight]) => ({ sector, weight }))
    .sort((a, b) => b.weight - a.weight);
}

/** Sectors under ~15% weight — candidates for gap-filling screens. */
export function underweightSectors(
  holdings: { sector: string; weight: number }[],
  threshold = 0.15,
): string[] {
  const weights = sectorWeights(holdings);
  const present = new Set(weights.map((w) => w.sector));
  const under = weights.filter((w) => w.weight < threshold).map((w) => w.sector);

  const ALL = [
    "Technology",
    "Healthcare",
    "Financial Services",
    "Consumer Cyclical",
    "Consumer Defensive",
    "Industrials",
    "Energy",
    "Utilities",
    "Real Estate",
    "Basic Materials",
    "Communication Services",
  ];

  for (const s of ALL) {
    if (!present.has(s)) under.push(s);
  }

  return [...new Set(under)].slice(0, 4);
}

export function concentrationWarning(
  holdings: { ticker: string; weight: number }[],
  newTicker: string,
  addWeight = 0.1,
): string | null {
  const total = holdings.reduce((s, h) => s + Math.max(0, h.weight), 0) || 1;
  const normalized = holdings.map((h) => ({
    ticker: h.ticker.toUpperCase(),
    weight: Math.max(0, h.weight) / total,
  }));

  const existing = normalized.find((h) => h.ticker === newTicker.toUpperCase());
  if (existing && existing.weight + addWeight > 0.35) {
    return `You already hold ~${(existing.weight * 100).toFixed(0)}% in ${newTicker}. Adding more concentrates risk.`;
  }

  const projected = [...normalized];
  if (existing) {
    existing.weight += addWeight;
  } else {
    projected.push({ ticker: newTicker.toUpperCase(), weight: addWeight });
  }
  const reTotal = projected.reduce((s, h) => s + h.weight, 0);
  const top = [...projected].sort((a, b) => b.weight - a.weight)[0];
  if (top && top.weight / reTotal > 0.4) {
    return `${top.ticker} would be ~${((top.weight / reTotal) * 100).toFixed(0)}% of your mock portfolio — high concentration.`;
  }

  return null;
}
