import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { appOrigin } from "@/lib/auth/config";
import { hasSnaptrade, loginPortalUrl, registerUser, snaptradeUserId } from "@/lib/brokerage/snaptrade";
import { getBrokerageLink, setBrokerageLink } from "@/lib/brokerage/store";

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
    const userId = snaptradeUserId(user.sub);
    let link = await getBrokerageLink(user.sub);
    if (!link) {
      const userSecret = await registerUser(userId);
      link = { userSecret };
      await setBrokerageLink(user.sub, link);
    }
    const redirect = `${appOrigin(req)}/risk?brokerage=connected`;
    const redirectURI = await loginPortalUrl(userId, link.userSecret, redirect);
    return NextResponse.json({ redirectURI });
  } catch (err) {
    console.error("[api/brokerage/link]", err);
    return NextResponse.json({ error: "Couldn't start the brokerage connection" }, { status: 502 });
  }
}
