import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { appOrigin } from "@/lib/auth/config";
import { hasSnaptrade, startBrokerageLink, deleteSnapTradeUser, snaptradeUserId } from "@/lib/brokerage/snaptrade";
import { isPersonalSnaptradeKey } from "@/lib/brokerage/mode";
import {
  buildAuthorizeUrl,
  SNAPTRADE_OAUTH_STATE_COOKIE,
  SNAPTRADE_OAUTH_VERIFIER_COOKIE,
} from "@/lib/brokerage/personal-oauth";
import { getBrokerageLink, setBrokerageLink, deleteBrokerageLink } from "@/lib/brokerage/store";

/** Start (or restart) a brokerage connection; returns the SnapTrade portal URL. */
export async function POST(req: Request) {
  if (!hasSnaptrade()) {
    return NextResponse.json({ error: "Brokerage import is not configured" }, { status: 503 });
  }
  const user = await getSession(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to connect a brokerage" }, { status: 401 });
  }

  try {
    const link = await getBrokerageLink(user.sub);
    let returnPath = "/risk";
    try {
      const body = (await req.json()) as { returnTo?: string };
      if (body.returnTo === "/settings") returnPath = "/settings";
    } catch {
      /* no body — default return path */
    }
    const redirect = `${appOrigin(req)}${returnPath}?brokerage=connected`;

    // Personal keys need a SnapTrade OAuth session before the connection portal.
    if (isPersonalSnaptradeKey() && (!link || link.mode !== "personal")) {
      const state = crypto.randomUUID();
      const { url, verifier } = await buildAuthorizeUrl(req, state);
      const res = NextResponse.json({ redirectURI: url, step: "snaptrade-oauth" });
      const secure = process.env.NODE_ENV === "production";
      res.cookies.set(SNAPTRADE_OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });
      res.cookies.set(SNAPTRADE_OAUTH_VERIFIER_COOKIE, verifier, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });
      return res;
    }

    const result = await startBrokerageLink(user.sub, link, redirect);
    if (result.link) await setBrokerageLink(user.sub, result.link);
    return NextResponse.json({ redirectURI: result.redirectURI, step: "brokerage-portal" });
  } catch (err) {
    console.error("[api/brokerage/link]", err);
    const message = err instanceof Error ? err.message : "Couldn't start the brokerage connection";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Clear stored SnapTrade credentials and delete the SnapTrade user when possible. */
export async function DELETE(req: Request) {
  if (!hasSnaptrade()) {
    return NextResponse.json({ error: "Brokerage import is not configured" }, { status: 503 });
  }
  const user = await getSession(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to manage brokerage settings" }, { status: 401 });
  }
  const link = await getBrokerageLink(user.sub);
  if (link?.mode === "commercial") {
    try {
      await deleteSnapTradeUser(snaptradeUserId(user.sub));
    } catch (err) {
      console.error("[api/brokerage/link] deleteSnapTradeUser", err);
    }
  }
  await deleteBrokerageLink(user.sub);
  return NextResponse.json({ ok: true });
}
