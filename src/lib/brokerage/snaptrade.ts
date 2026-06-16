/**
 * SnapTrade brokerage link (read-only holdings) — server-only. Entirely
 * optional: with no env it's disabled and the UI falls back to manual entry.
 *
 * Commercial keys: registerUser + userSecret per MSAD user (multi-tenant app).
 * Personal keys (PERS-*): OAuth bearer flow — see personal-oauth.ts.
 */
import type { BrokerageHoldings } from "./holdings";
import { normalizePositions } from "./holdings";
import { Snaptrade } from "snaptrade-typescript-sdk";
import { isPersonalSnaptradeKey, snaptradeMode, type SnaptradeMode } from "./mode";
import {
  personalListHoldings,
  personalListAuthorizations,
  personalLoginPortalUrl,
  personalRemoveAuthorization,
  validAccessToken,
  type PersonalTokens,
} from "./personal-oauth";
import type { BrokerageLink } from "./store";
import { personalLinkFromTokens, personalTokensFromLink } from "./store";

export { isPersonalSnaptradeKey, snaptradeMode, type SnaptradeMode };

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
  if (isPersonalSnaptradeKey()) {
    throw new Error("Personal SnapTrade keys cannot register users — use OAuth instead");
  }
  const res = await client().authentication.registerSnapTradeUser({ userId });
  const secret = res.data?.userSecret;
  if (!secret) throw new Error("SnapTrade did not return a user secret");
  return secret;
}

/** Permanently delete a SnapTrade user (commercial mode). */
export async function deleteSnapTradeUser(userId: string): Promise<void> {
  await client().authentication.deleteSnapTradeUser({ userId });
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

export type { BrokerageHoldings } from "./holdings";

export interface BrokerageConnectionSummary {
  id: string;
  name: string;
  brokerageName: string;
  disabled: boolean;
  type: string;
  createdDate?: string;
}

function summarizeAuthorization(raw: Record<string, unknown>): BrokerageConnectionSummary | null {
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!id) return null;
  const brokerage = raw.brokerage as { display_name?: string; name?: string } | undefined;
  return {
    id,
    name: typeof raw.name === "string" ? raw.name : "Connection",
    brokerageName: brokerage?.display_name ?? brokerage?.name ?? "Brokerage",
    disabled: Boolean(raw.disabled),
    type: typeof raw.type === "string" ? raw.type : "read",
    createdDate: typeof raw.created_date === "string" ? raw.created_date : undefined,
  };
}

/** Aggregate positions across all linked accounts into weights by ticker. */
export async function listHoldings(userId: string, userSecret: string): Promise<BrokerageHoldings> {
  const api = client();
  const accountsRes = await api.accountInformation.listUserAccounts({ userId, userSecret });
  const accounts = (accountsRes.data ?? []) as Array<{ id?: string }>;
  const positions: Array<Record<string, unknown>> = [];

  for (const acct of accounts) {
    if (!acct.id) continue;
    const posRes = await api.accountInformation.getAllAccountPositions({
      userId,
      userSecret,
      accountId: acct.id,
    });
    const data = posRes.data as { results?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> | null;
    const rows = Array.isArray(data) ? data : (data?.results ?? []);
    positions.push(...rows);
  }

  return normalizePositions(positions);
}

export async function personalPortalUrl(tokens: PersonalTokens, redirect: string): Promise<string> {
  const fresh = await validAccessToken(tokens);
  return personalLoginPortalUrl(fresh.accessToken, redirect);
}

export async function listPersonalHoldings(tokens: PersonalTokens): Promise<BrokerageHoldings> {
  const fresh = await validAccessToken(tokens);
  return personalListHoldings(fresh.accessToken);
}

/** Start a brokerage connection for whichever key type is configured. */
export async function startBrokerageLink(
  sub: string,
  link: BrokerageLink | null,
  redirect: string,
): Promise<{ redirectURI: string; link?: BrokerageLink }> {
  if (isPersonalSnaptradeKey()) {
    if (!link || link.mode !== "personal") {
      throw new Error("SnapTrade sign-in required");
    }
    const tokens = await validAccessToken(personalTokensFromLink(link));
    const updated = personalLinkFromTokens(tokens);
    return {
      redirectURI: await personalPortalUrl(tokens, redirect),
      link: updated.expiresAt !== link.expiresAt ? updated : undefined,
    };
  }

  const userId = snaptradeUserId(sub);
  let commercial = link?.mode === "commercial" ? link : null;
  if (!commercial) {
    const userSecret = await registerUser(userId);
    commercial = { mode: "commercial", userSecret };
  }
  return {
    redirectURI: await loginPortalUrl(userId, commercial.userSecret, redirect),
    link: commercial,
  };
}

/** How many broker connections exist for this user (active vs disabled). */
export async function brokerConnectionStatus(
  sub: string,
  link: BrokerageLink,
): Promise<{ active: number; disabled: number; total: number }> {
  if (link.mode === "personal") {
    const tokens = await validAccessToken(personalTokensFromLink(link));
    const auths = await personalListAuthorizations(tokens.accessToken);
    let active = 0;
    let disabled = 0;
    for (const a of auths) {
      if (a.disabled) disabled++;
      else active++;
    }
    return { active, disabled, total: auths.length };
  }

  const res = await client().connections.listBrokerageAuthorizations({
    userId: snaptradeUserId(sub),
    userSecret: link.userSecret,
  });
  const auths = (res.data ?? []) as Array<{ disabled?: boolean }>;
  let active = 0;
  let disabled = 0;
  for (const a of auths) {
    if (a.disabled) disabled++;
    else active++;
  }
  return { active, disabled, total: auths.length };
}

/** List broker connections for the settings UI. */
export async function listBrokerageConnections(
  sub: string,
  link: BrokerageLink,
): Promise<BrokerageConnectionSummary[]> {
  if (link.mode === "personal") {
    const tokens = await validAccessToken(personalTokensFromLink(link));
    const auths = await personalListAuthorizations(tokens.accessToken);
    return auths
      .map((a) => summarizeAuthorization(a as Record<string, unknown>))
      .filter((a): a is BrokerageConnectionSummary => a !== null);
  }

  const res = await client().connections.listBrokerageAuthorizations({
    userId: snaptradeUserId(sub),
    userSecret: link.userSecret,
  });
  return ((res.data ?? []) as Array<Record<string, unknown>>)
    .map(summarizeAuthorization)
    .filter((a): a is BrokerageConnectionSummary => a !== null);
}

/** Remove one broker connection from a SnapTrade user. */
export async function removeBrokerageConnection(
  sub: string,
  link: BrokerageLink,
  authorizationId: string,
): Promise<void> {
  if (link.mode === "personal") {
    const tokens = await validAccessToken(personalTokensFromLink(link));
    await personalRemoveAuthorization(tokens.accessToken, authorizationId);
    return;
  }

  await client().connections.removeBrokerageAuthorization({
    authorizationId,
    userId: snaptradeUserId(sub),
    userSecret: link.userSecret,
  });
}

/** Fetch holdings for whichever key type is configured. */
export async function fetchBrokerageHoldings(
  sub: string,
  link: BrokerageLink,
): Promise<{ holdings: BrokerageHoldings; link?: BrokerageLink }> {
  if (link.mode === "personal") {
    const tokens = await validAccessToken(personalTokensFromLink(link));
    const holdings = await listPersonalHoldings(tokens);
    const updated = personalLinkFromTokens(tokens);
    return {
      holdings,
      link: updated.expiresAt !== link.expiresAt ? updated : undefined,
    };
  }
  return {
    holdings: await listHoldings(snaptradeUserId(sub), link.userSecret),
  };
}
