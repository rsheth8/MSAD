import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasSnaptrade, listHoldings, snaptradeUserId } from "@/lib/brokerage/snaptrade";
import { getBrokerageLink } from "@/lib/brokerage/store";

/** Fetch the signed-in user's real holdings from their linked brokerage. */
export async function GET(req: Request) {
  if (!hasSnaptrade()) {
    return NextResponse.json({ error: "Brokerage import is not configured" }, { status: 503 });
  }
  const user = await getSession(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to import holdings" }, { status: 401 });
  }
  const link = await getBrokerageLink(user.sub);
  if (!link) {
    return NextResponse.json({ error: "No brokerage connected yet" }, { status: 409 });
  }

  try {
    const data = await listHoldings(snaptradeUserId(user.sub), link.userSecret);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/brokerage/holdings]", err);
    return NextResponse.json({ error: "Couldn't load your holdings" }, { status: 502 });
  }
}
