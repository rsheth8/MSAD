/**
 * Deterministic synthetic price history for when there's no FMP key. Seeded by
 * ticker so the same symbol always produces the same curve — demoable and
 * testable offline, clearly flagged as not-real in the UI.
 */
import type { Bar } from "./types";

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Approx standard normal via two uniforms (Box–Muller). */
function randn(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Geometric random walk with a mild upward drift and occasional volatility
 * regimes, so SMA-cross strategies have something interesting to react to.
 */
export function syntheticBars(symbol: string, days: number, annualDrift = 0.08): Bar[] {
  const rng = mulberry32(hashSeed(symbol));
  const dailyDrift = annualDrift / 252;
  let vol = 0.012 + rng() * 0.01;
  let price = 50 + rng() * 150;
  const out: Bar[] = [];
  const startMs = Date.now() - days * 86_400_000;
  for (let i = 0; i < days; i++) {
    // shift volatility regime occasionally
    if (rng() < 0.01) vol = 0.008 + rng() * 0.03;
    const ret = dailyDrift + vol * randn(rng);
    price = Math.max(1, price * (1 + ret));
    out.push({
      date: new Date(startMs + i * 86_400_000).toISOString().slice(0, 10),
      close: Math.round(price * 100) / 100,
    });
  }
  return out;
}
