import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasSnaptrade, listBrokerageConnections } from "@/lib/brokerage/snaptrade";
import { getBrokerageLink } from "@/lib/brokerage/store";

/** List the signed-in user's linked broker connections. */
export async function GET(req: Request) {
  if (!hasSnaptrade()) {
    return NextResponse.json({ error: "Brokerage import is not configured" }, { status: 503 });
  }
  const user = await getSession(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to view connections" }, { status: 401 });
  }
  const link = await getBrokerageLink(user.sub);
  if (!link) {
    return NextResponse.json({ connections: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const connections = await listBrokerageConnections(user.sub, link);
    return NextResponse.json({ connections }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/brokerage/authorizations]", err);
    return NextResponse.json({ error: "Couldn't load broker connections" }, { status: 502 });
  }
}
