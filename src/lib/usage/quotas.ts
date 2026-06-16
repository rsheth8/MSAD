/**
 * Per-user daily quotas for expensive features (AI explanations, backtests).
 * Signed-in users get higher limits; guests are limited by IP rate limiting only.
 */
import { NextResponse } from "next/server";
import { kvIncr, kvConfigured } from "@/lib/kv/client";
import type { AuthUser } from "@/lib/auth/config";

const DAY_SEC = 86_400;

export interface QuotaConfig {
  feature: string;
  dailyLimit: number;
}

export const QUOTAS = {
  explain: { feature: "explain", dailyLimit: 100 },
  backtest: { feature: "backtest", dailyLimit: 50 },
} as const satisfies Record<string, QuotaConfig>;

function dayKey(feature: string, sub: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `msad:quota:${feature}:${sub}:${day}`;
}

/**
 * Check and increment daily usage for a signed-in user.
 * Returns null if allowed, or a 429 Response if quota exceeded.
 * Guests skip quota checks (rely on IP rate limiting).
 */
export async function checkQuota(
  user: AuthUser | null,
  config: QuotaConfig,
): Promise<NextResponse | null> {
  if (!user) return null;

  const key = dayKey(config.feature, user.sub);
  const count = await kvIncr(key, DAY_SEC);

  if (count > config.dailyLimit) {
    return NextResponse.json(
      {
        error: `Daily ${config.feature} limit reached (${config.dailyLimit}/day). Resets at midnight UTC.`,
        quota: { feature: config.feature, limit: config.dailyLimit, used: count - 1 },
        durable: kvConfigured(),
      },
      { status: 429 },
    );
  }
  return null;
}

/** Read current usage without incrementing. */
export async function getUsage(
  sub: string,
  feature: string,
): Promise<{ used: number; limit: number; feature: string }> {
  const config = Object.values(QUOTAS).find((q) => q.feature === feature);
  const limit = config?.dailyLimit ?? 0;
  const key = dayKey(feature, sub);
  const { kvGet } = await import("@/lib/kv/client");
  const raw = await kvGet(key);
  const used = raw ? parseInt(raw, 10) : 0;
  return { feature, used: Number.isFinite(used) ? used : 0, limit };
}
