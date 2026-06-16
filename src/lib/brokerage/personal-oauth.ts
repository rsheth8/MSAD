/**
 * SnapTrade Personal OAuth (PKCE) — required for PERS-* client IDs. Commercial
 * keys use registerUser + userSecret instead. Server-only.
 */
import { appOrigin } from "@/lib/auth/config";
import type { BrokerageHoldings } from "./holdings";
import { normalizePositions } from "./holdings";

const AUTHORIZE_URL = "https://dashboard.snaptrade.com/oauth/authorize";
const TOKEN_URL = "https://api.snaptrade.com/oauth/token/";
const API_BASE = "https://api.snaptrade.com/api/v1";

export const SNAPTRADE_OAUTH_STATE_COOKIE = "msad_snaptrade_oauth_state";
export const SNAPTRADE_OAUTH_VERIFIER_COOKIE = "msad_snaptrade_oauth_verifier";

export interface PersonalTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix time in ms when the access token expires. */
  expiresAt: number;
}

function snaptradeClientId(): string {
  return process.env.SNAPTRADE_CLIENT_ID!.trim();
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function oauthRedirectUri(req: Request): string {
  return `${appOrigin(req)}/api/brokerage/oauth/callback`;
}

export async function buildAuthorizeUrl(req: Request, state: string): Promise<{ url: string; verifier: string }> {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = b64url(new Uint8Array(digest));
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", snaptradeClientId());
  url.searchParams.set("redirect_uri", oauthRedirectUri(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "read");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return { url: url.toString(), verifier };
}

async function exchangeToken(body: URLSearchParams): Promise<PersonalTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token || !data.refresh_token) {
    throw new Error(data.error_description ?? data.error ?? `Token exchange failed (${res.status})`);
  }
  const expiresIn = data.expires_in ?? 3600;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + expiresIn * 1000 - 60_000,
  };
}

export async function exchangeCode(req: Request, code: string, verifier: string): Promise<PersonalTokens> {
  return exchangeToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: oauthRedirectUri(req),
      client_id: snaptradeClientId(),
      code_verifier: verifier,
    }),
  );
}

export async function refreshTokens(refreshToken: string): Promise<PersonalTokens> {
  return exchangeToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: snaptradeClientId(),
    }),
  );
}

/** Ensure a valid access token, refreshing when close to expiry. */
export async function validAccessToken(tokens: PersonalTokens): Promise<PersonalTokens> {
  if (Date.now() < tokens.expiresAt) return tokens;
  return refreshTokens(tokens.refreshToken);
}

async function bearerFetch(path: string, accessToken: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

/** Connection portal for a Personal OAuth user — no userId/userSecret. */
export async function personalLoginPortalUrl(accessToken: string, redirect: string): Promise<string> {
  const res = await bearerFetch("/snapTrade/login", accessToken, {
    method: "POST",
    body: JSON.stringify({ customRedirect: redirect, connectionPortalVersion: "v4" }),
  });
  const data = (await res.json()) as { redirectURI?: string; detail?: string };
  if (!res.ok || !data.redirectURI) {
    throw new Error(data.detail ?? "SnapTrade did not return a portal URL");
  }
  return data.redirectURI;
}

export async function personalListAuthorizations(accessToken: string): Promise<Array<Record<string, unknown>>> {
  const res = await bearerFetch("/authorizations", accessToken);
  const data = await res.json();
  if (!res.ok) return [];
  return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
}

export async function personalRemoveAuthorization(accessToken: string, authorizationId: string): Promise<void> {
  const res = await bearerFetch(`/authorizations/${encodeURIComponent(authorizationId)}`, accessToken, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(data.detail ?? `Couldn't remove connection (${res.status})`);
  }
}

export async function personalListHoldings(accessToken: string): Promise<BrokerageHoldings> {
  const accountsRes = await bearerFetch("/accounts", accessToken);
  const accountsData = await accountsRes.json();
  if (!accountsRes.ok) {
    const detail = (accountsData as { detail?: string }).detail;
    throw new Error(detail ?? "Couldn't list accounts");
  }
  const accounts = (Array.isArray(accountsData) ? accountsData : []) as Array<{ id?: string }>;
  const positions: Array<Record<string, unknown>> = [];

  for (const acct of accounts) {
    if (!acct.id) continue;
    const posRes = await bearerFetch(`/accounts/${encodeURIComponent(acct.id)}/positions/all`, accessToken);
    const posData = await posRes.json();
    if (!posRes.ok) {
      const detail = (posData as { detail?: string }).detail;
      throw new Error(detail ?? "Couldn't load positions");
    }
    const rows = Array.isArray(posData)
      ? posData
      : ((posData as { results?: Array<Record<string, unknown>> }).results ?? []);
    positions.push(...rows);
  }

  return normalizePositions(positions);
}
