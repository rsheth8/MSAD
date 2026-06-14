import type { OptionsData } from "@/lib/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Next N weekly option expirations (Fridays), like real US equity chains. */
function upcomingFridayExpirations(count: number): { date: string; days: number }[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const cursor = new Date(start);
  while (cursor.getDay() !== 5) cursor.setDate(cursor.getDate() + 1);
  if (cursor.getTime() <= start.getTime()) cursor.setDate(cursor.getDate() + 7);

  const out: { date: string; days: number }[] = [];
  for (let i = 0; i < count; i++) {
    const days = Math.max(1, Math.round((cursor.getTime() - start.getTime()) / 86_400_000));
    out.push({ date: cursor.toISOString().slice(0, 10), days });
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

/**
 * Build educational options data from price + beta.
 * Used by mock data and as a fallback when FMP's chain endpoint is empty.
 */
export function buildOptionsData(price: number, beta: number, rand = Math.random): OptionsData {
  const iv = Math.min(0.9, 0.16 + beta * 0.12 + rand() * 0.12);
  const expirations = upcomingFridayExpirations(4);

  const step = price < 25 ? 2.5 : price < 200 ? 5 : 10;
  const strike = Math.max(step, Math.round(price / step) * step);
  const nearest = expirations[2];
  const t = nearest.days / 365;
  const base = price * iv * Math.sqrt(t) * 0.4;

  return {
    impliedVolatility: round2(iv),
    expirations,
    call: {
      type: "call",
      strike,
      premium: round2(base * (1 + (rand() - 0.5) * 0.1)),
      expiry: nearest.date,
      delta: 0.5,
    },
    put: {
      type: "put",
      strike,
      premium: round2(base * (1 + (rand() - 0.5) * 0.1)),
      expiry: nearest.date,
      delta: -0.5,
    },
  };
}
