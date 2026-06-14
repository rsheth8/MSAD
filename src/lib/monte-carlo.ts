/** Monte Carlo price path simulation (educational scenarios). */

export interface MonteCarloPoint {
  day: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface MonteCarloResult {
  horizonDays: number;
  paths: number;
  fan: MonteCarloPoint[];
  probAboveSpot: number;
  medianReturn: number;
}

function seededRand(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Geometric Brownian Motion fan chart from annualized vol. */
export function runMonteCarlo(
  spot: number,
  annualVol: number,
  horizonDays: number,
  paths = 400,
  seed = "mc",
): MonteCarloResult {
  const rand = seededRand(`${seed}-${spot}-${horizonDays}`);
  const dt = 1 / 252;
  const sigma = annualVol;
  const mu = 0.05;

  const finals: number[] = [];
  const byDay: number[][] = Array.from({ length: horizonDays + 1 }, () => []);

  for (let p = 0; p < paths; p++) {
    let s = spot;
    byDay[0].push(s);
    for (let d = 1; d <= horizonDays; d++) {
      const z = Math.sqrt(-2 * Math.log(rand())) * Math.cos(2 * Math.PI * rand());
      s *= Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
      byDay[d].push(s);
    }
    finals.push(s);
  }

  finals.sort((a, b) => a - b);
  const fan: MonteCarloPoint[] = byDay.map((arr, day) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return {
      day,
      p10: Math.round(percentile(sorted, 0.1) * 100) / 100,
      p25: Math.round(percentile(sorted, 0.25) * 100) / 100,
      p50: Math.round(percentile(sorted, 0.5) * 100) / 100,
      p75: Math.round(percentile(sorted, 0.75) * 100) / 100,
      p90: Math.round(percentile(sorted, 0.9) * 100) / 100,
    };
  });

  const probAboveSpot = finals.filter((f) => f > spot).length / paths;
  const medianReturn = ((percentile(finals, 0.5) - spot) / spot) * 100;

  return {
    horizonDays,
    paths,
    fan,
    probAboveSpot,
    medianReturn: Math.round(medianReturn * 10) / 10,
  };
}
