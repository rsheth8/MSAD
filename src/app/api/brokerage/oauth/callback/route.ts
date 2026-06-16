import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readCookie } from "@/lib/auth/session";
import { hasSnaptrade } from "@/lib/brokerage/snaptrade";
import { isPersonalSnaptradeKey } from "@/lib/brokerage/mode";
import {
  exchangeCode,
  SNAPTRADE_OAUTH_STATE_COOKIE,
  SNAPTRADE_OAUTH_VERIFIER_COOKIE,
} from "@/lib/brokerage/personal-oauth";
import { personalLinkFromTokens, setBrokerageLink } from "@/lib/brokerage/store";

/** SnapTrade Personal OAuth callback — stores tokens, then sends user back to /risk. */
export async function GET(req: Request) {
  const home = (q: string) => NextResponse.redirect(new URL(`/risk?brokerage=${q}`, req.url));
  if (!hasSnaptrade() || !isPersonalSnaptradeKey()) return home("unconfigured");

  const user = await getSession(req);
  if (!user) return home("signin");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = readCookie(req, SNAPTRADE_OAUTH_STATE_COOKIE);
  const verifier = readCookie(req, SNAPTRADE_OAUTH_VERIFIER_COOKIE);

  if (!code || !state || !cookieState || state !== cookieState || !verifier) {
    return home("error");
  }

  try {
    const tokens = await exchangeCode(req, code, verifier);
    await setBrokerageLink(user.sub, personalLinkFromTokens(tokens));
    const res = home("snaptrade-ok");
    res.cookies.delete(SNAPTRADE_OAUTH_STATE_COOKIE);
    res.cookies.delete(SNAPTRADE_OAUTH_VERIFIER_COOKIE);
    return res;
  } catch (err) {
    console.error("[api/brokerage/oauth/callback]", err);
    return home("error");
  }
}
