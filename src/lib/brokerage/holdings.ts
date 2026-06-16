/** Normalize SnapTrade position payloads into portfolio weights for the Risk X-ray. */

export interface NormalizedHolding {
  ticker: string;
  units: number;
  value: number;
}

export interface BrokerageHoldings {
  holdings: { ticker: string; weight: number }[];
  totalValue: number;
  positions: NormalizedHolding[];
}

function tickerFromPosition(pos: Record<string, unknown>): string {
  const instrument = pos.instrument as { symbol?: string; raw_symbol?: string; kind?: string } | undefined;
  if (instrument?.kind === "option") return "";
  const fromInstrument = (instrument?.symbol ?? instrument?.raw_symbol ?? "").toString().toUpperCase().trim();
  if (fromInstrument) return fromInstrument;

  const legacy = pos.symbol as { symbol?: { symbol?: string } } | undefined;
  return (legacy?.symbol?.symbol ?? "").toString().toUpperCase().trim();
}

/** Turn raw SnapTrade positions (v1 or v2) into ticker weights. */
export function normalizePositions(positions: Array<Record<string, unknown>>): BrokerageHoldings {
  const byTicker = new Map<string, NormalizedHolding>();
  for (const pos of positions) {
    const ticker = tickerFromPosition(pos);
    const units = Number(pos.units ?? 0);
    const price = Number(pos.price ?? 0);
    if (!ticker || !(units > 0) || !(price > 0)) continue;
    const value = units * price;
    const existing = byTicker.get(ticker);
    if (existing) {
      existing.units += units;
      existing.value += value;
    } else {
      byTicker.set(ticker, { ticker, units, value });
    }
  }

  const sorted = [...byTicker.values()].sort((a, b) => b.value - a.value);
  const totalValue = sorted.reduce((s, h) => s + h.value, 0);
  const holdings =
    totalValue > 0
      ? sorted.map((h) => ({ ticker: h.ticker, weight: Math.round((h.value / totalValue) * 1000) / 10 }))
      : [];
  return { holdings, totalValue, positions: sorted };
}
