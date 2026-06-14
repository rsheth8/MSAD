import {
  atmStrike,
  moneyness,
  quoteLeg,
  strikeLadder,
} from "./black-scholes";
import { historicalVolatility } from "./historical-vol";
import type { ChainRow, ExpirationEntry, OptionsChainPayload } from "./types";
import type { FmpPriceBar } from "@/lib/fmp/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

function upcomingFridayExpirations(count: number): ExpirationEntry[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const cursor = new Date(start);
  while (cursor.getDay() !== 5) cursor.setDate(cursor.getDate() + 1);
  if (cursor.getTime() <= start.getTime()) cursor.setDate(cursor.getDate() + 7);

  const out: ExpirationEntry[] = [];
  for (let i = 0; i < count; i++) {
    const days = Math.max(1, Math.round((cursor.getTime() - start.getTime()) / 86_400_000));
    out.push({
      date: cursor.toISOString().slice(0, 10),
      days,
      label: cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

function ivSkew(type: "call" | "put", S: number, K: number, baseIv: number): number {
  const m = (K - S) / S;
  if (type === "put" && m < 0) return baseIv * (1 + Math.min(0.25, Math.abs(m) * 1.5));
  if (type === "call" && m > 0) return baseIv * (1 + Math.min(0.2, m * 1.2));
  return baseIv;
}

function buildChainForExpiry(
  price: number,
  expiry: ExpirationEntry,
  baseIv: number,
): ChainRow[] {
  const T = expiry.days / 365;
  const strikes = strikeLadder(price, 9);

  return strikes.map((strike) => {
    const callIv = ivSkew("call", price, strike, baseIv);
    const putIv = ivSkew("put", price, strike, baseIv);
    const callQ = quoteLeg("call", price, strike, T, callIv);
    const putQ = quoteLeg("put", price, strike, T, putIv);

    const call: ChainRow["call"] = {
      premium: round2(callQ.premium),
      delta: round2(callQ.greeks.delta),
      gamma: round2(callQ.greeks.gamma),
      theta: round2(callQ.greeks.theta),
      vega: round2(callQ.greeks.vega),
      iv: round2(callIv),
      intrinsic: round2(callQ.intrinsic),
      extrinsic: round2(callQ.extrinsic),
      breakeven: round2(strike + callQ.premium),
      moneyness: moneyness("call", price, strike),
    };
    const put: ChainRow["put"] = {
      premium: round2(putQ.premium),
      delta: round2(putQ.greeks.delta),
      gamma: round2(putQ.greeks.gamma),
      theta: round2(putQ.greeks.theta),
      vega: round2(putQ.greeks.vega),
      iv: round2(putIv),
      intrinsic: round2(putQ.intrinsic),
      extrinsic: round2(putQ.extrinsic),
      breakeven: round2(strike - putQ.premium),
      moneyness: moneyness("put", price, strike),
    };
    return { strike, call, put };
  });
}

/** Build a full model-based options chain from price history. */
export function buildOptionsChain(
  ticker: string,
  price: number,
  bars: FmpPriceBar[],
  beta = 1,
): OptionsChainPayload {
  const hv = historicalVolatility(bars);
  const atmIv = Math.min(0.95, Math.max(0.12, hv * (0.95 + beta * 0.08)));
  const expirations = upcomingFridayExpirations(5);
  const chains: Record<string, ChainRow[]> = {};

  for (const exp of expirations) {
    chains[exp.date] = buildChainForExpiry(price, exp, atmIv);
  }

  return {
    ticker,
    underlyingPrice: price,
    asOf: new Date().toISOString(),
    historicalVolatility: round2(hv),
    atmImpliedVolatility: round2(atmIv),
    ivVsHvSpread: round2((atmIv - hv) * 100),
    expirations,
    chains,
    isModelBased: true,
  };
}

/** Seeded mock bars for chain when no live history. */
export function mockPriceBars(ticker: string, price: number, days = 45): FmpPriceBar[] {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) % 997;
  const bars: FmpPriceBar[] = [];
  let p = price * 0.92;
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    h = (h * 16807 + 7) % 2147483647;
    p *= 1 + ((h / 2147483647) - 0.48) * 0.03;
    bars.push({ date: d.toISOString().slice(0, 10), close: Math.round(p * 100) / 100 });
  }
  bars[bars.length - 1].close = price;
  return bars;
}

export { atmStrike };
