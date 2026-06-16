/**
 * SnapTrade brokerage link (read-only holdings) — server-only. Entirely
 * optional: with no env it's disabled and the UI falls back to manual entry,
 * same graceful-degradation pattern as the rest of the app. Uses SnapTrade's
 * official SDK so request signing is handled correctly.
 *
 * Requires the user to be signed in (Google) so the per-user SnapTrade secret
 * can be stored against a stable key.
 */
import { Snaptrade } from "snaptrade-typescript-sdk";

export function hasSnaptrade(): boolean {
  return Boolean(
    process.env.SNAPTRADE_CLIENT_ID?.trim() && process.env.SNAPTRADE_CONSUMER_KEY?.trim(),
  );
}

function client(): Snaptrade {
  return new Snaptrade({
    clientId: process.env.SNAPTRADE_CLIENT_ID!.trim(),
    consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!.trim(),
  });
}

/** SnapTrade user id namespaced to our app, derived from the MSAD account id. */
export function snaptradeUserId(sub: string): string {
  return `msad:${sub}`;
}

export async function registerUser(userId: string): Promise<string> {
  const res = await client().authentication.registerSnapTradeUser({ userId });
  const secret = res.data?.userSecret;
  if (!secret) throw new Error("SnapTrade did not return a user secret");
  return secret;
}

/** A one-time SnapTrade Connection Portal URL the user visits to link a broker. */
export async function loginPortalUrl(
  userId: string,
  userSecret: string,
  redirect: string,
): Promise<string> {
  const res = await client().authentication.loginSnapTradeUser({
    userId,
    userSecret,
    customRedirect: redirect,
  });
  const data = res.data as { redirectURI?: string };
  if (!data?.redirectURI) throw new Error("SnapTrade did not return a portal URL");
  return data.redirectURI;
}

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

/** Aggregate positions across all linked accounts into weights by ticker. */
export async function listHoldings(userId: string, userSecret: string): Promise<BrokerageHoldings> {
  const res = await client().accountInformation.getAllUserHoldings({ userId, userSecret });
  const accounts = (res.data ?? []) as Array<{ positions?: Array<Record<string, unknown>> | null }>;

  const byTicker = new Map<string, NormalizedHolding>();
  for (const acct of accounts) {
    for (const pos of acct.positions ?? []) {
      const symbol = pos.symbol as { symbol?: { symbol?: string } } | undefined;
      const ticker = (symbol?.symbol?.symbol ?? "").toString().toUpperCase().trim();
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
  }

  const positions = [...byTicker.values()].sort((a, b) => b.value - a.value);
  const totalValue = positions.reduce((s, h) => s + h.value, 0);
  const holdings =
    totalValue > 0
      ? positions.map((h) => ({ ticker: h.ticker, weight: Math.round((h.value / totalValue) * 1000) / 10 }))
      : [];
  return { holdings, totalValue, positions };
}
