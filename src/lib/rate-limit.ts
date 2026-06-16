/**
 * Per-IP and per-user rate limiting. Uses Upstash Redis when configured;
 * in-memory fallback for local dev. Returns a 429 Response when exceeded.
 */
import { NextResponse } from "next/server";
import { kvIncr, kvConfigured } from "@/lib/kv/client";
import { getSession } from "@/lib/auth/session";

export interface RateLimitConfig {
  /** Route identifier, e.g. "explain" */
  route: string;
  /** Max requests per window for anonymous IPs */
  ipLimit: number;
  /** Max requests per window for signed-in users (higher) */
  userLimit?: number;
  /** Window length in seconds */
  windowSec: number;
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Check rate limit. Returns null if allowed, or a 429 Response if exceeded.
 */
export async function checkRateLimit(
  req: Request,
  config: RateLimitConfig,
): Promise<NextResponse | null> {
  const user = await getSession(req);
  const ip = clientIp(req);
  const limit = user ? (config.userLimit ?? config.ipLimit * 2) : config.ipLimit;
  const bucket = user ? `user:${user.sub}` : `ip:${ip}`;
  const key = `msad:rl:${config.route}:${bucket}`;

  const count = await kvIncr(key, config.windowSec);
  if (count > limit) {
    return NextResponse.json(
      {
        error: "Too many requests. Please wait a moment and try again.",
        retryAfterSec: config.windowSec,
        durable: kvConfigured(),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(config.windowSec),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }
  return null;
}

/** Preset configs for expensive routes */
export const RATE_LIMITS = {
  explain: { route: "explain", ipLimit: 15, userLimit: 40, windowSec: 60 },
  backtest: { route: "backtest", ipLimit: 10, userLimit: 30, windowSec: 60 },
  screener: { route: "screener", ipLimit: 10, userLimit: 25, windowSec: 60 },
  replay: { route: "replay", ipLimit: 15, userLimit: 40, windowSec: 60 },
  risk: { route: "risk", ipLimit: 15, userLimit: 40, windowSec: 60 },
  explore: { route: "explore", ipLimit: 20, userLimit: 50, windowSec: 60 },
} as const satisfies Record<string, RateLimitConfig>;
