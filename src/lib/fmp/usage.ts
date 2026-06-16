import { kvConfigured, kvGet, kvIncr } from "@/lib/kv/client";

const DAY_SEC = 86_400;

export type FmpBudgetTier = "ok" | "warn" | "critical" | "exhausted";

export interface FmpUsageSnapshot {
  configured: boolean;
  used: number;
  limit: number;
  pct: number;
  tier: FmpBudgetTier;
  /** ISO timestamp — next midnight UTC when the counter resets. */
  resetsAt: string;
  /** True when KV is configured (counter survives server restarts). */
  durable: boolean;
}

function dayKey(): string {
  const day = new Date().toISOString().slice(0, 10);
  return `msad:fmp:calls:${day}`;
}

/** Daily call budget. Set FMP_DAILY_LIMIT=0 to hide the budget indicator. */
export function getFmpDailyLimit(): number {
  const raw = process.env.FMP_DAILY_LIMIT?.trim();
  if (raw === "0") return 0;
  const n = Number(raw ?? 250);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 250;
}

function tierFor(used: number, limit: number): FmpBudgetTier {
  if (used >= limit) return "exhausted";
  const pct = used / limit;
  if (pct >= 0.9) return "critical";
  if (pct >= 0.7) return "warn";
  return "ok";
}

function nextMidnightUtc(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

/** Increment today's FMP call counter (one per logical fmpFetch). */
export async function recordFmpCall(): Promise<void> {
  if (!process.env.FMP_API_KEY?.trim()) return;
  await kvIncr(dayKey(), DAY_SEC);
}

/** Read today's FMP usage without incrementing. */
export async function getFmpUsage(): Promise<FmpUsageSnapshot> {
  const configured = Boolean(process.env.FMP_API_KEY?.trim());
  const limit = getFmpDailyLimit();

  if (!configured || limit === 0) {
    return {
      configured,
      used: 0,
      limit,
      pct: 0,
      tier: "ok",
      resetsAt: nextMidnightUtc(),
      durable: kvConfigured(),
    };
  }

  const raw = await kvGet(dayKey());
  const used = raw ? parseInt(raw, 10) : 0;
  const safeUsed = Number.isFinite(used) && used > 0 ? used : 0;
  const pct = limit > 0 ? Math.min(100, Math.round((safeUsed / limit) * 1000) / 10) : 0;

  return {
    configured: true,
    used: safeUsed,
    limit,
    pct,
    tier: tierFor(safeUsed, limit),
    resetsAt: nextMidnightUtc(),
    durable: kvConfigured(),
  };
}
