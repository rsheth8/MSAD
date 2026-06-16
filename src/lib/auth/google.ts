/** Minimal Google OAuth 2.0 (Authorization Code) helpers. Server-only. */
import { googleClientId, googleClientSecret, type AuthUser } from "./config";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export function buildAuthUrl(state: string, redirectUri: string): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", googleClientId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("No access token returned");
  return data.access_token;
}

export async function fetchUserInfo(accessToken: string): Promise<AuthUser> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Userinfo failed (${res.status})`);
  const data = (await res.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
  if (!data.sub) throw new Error("No subject in userinfo");
  return {
    sub: data.sub,
    email: data.email ?? "",
    name: data.name ?? data.email ?? "MSAD user",
    picture: data.picture,
  };
}
