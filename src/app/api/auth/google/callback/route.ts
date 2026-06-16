import { NextResponse } from "next/server";
import { hasGoogleAuth, redirectUri } from "@/lib/auth/config";
import { exchangeCode, fetchUserInfo } from "@/lib/auth/google";
import {
  readCookie,
  sessionCookieOptions,
  signSession,
  SESSION_COOKIE,
  STATE_COOKIE,
} from "@/lib/auth/session";

/** Google redirects back here with ?code & ?state. Verify, mint a session. */
export async function GET(req: Request) {
  const home = (q: string) => NextResponse.redirect(new URL(`/dashboard?auth=${q}`, req.url));
  if (!hasGoogleAuth()) return home("unconfigured");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = readCookie(req, STATE_COOKIE);

  // CSRF protection: the state we set must come back unchanged.
  if (!code || !state || !cookieState || state !== cookieState) return home("error");

  try {
    const accessToken = await exchangeCode(code, redirectUri(req));
    const user = await fetchUserInfo(accessToken);
    const token = await signSession(user);
    const res = home("ok");
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    console.error("[auth/callback]", err);
    return home("error");
  }
}
