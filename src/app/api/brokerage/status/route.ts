import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasSnaptrade } from "@/lib/brokerage/snaptrade";
import { getBrokerageLink } from "@/lib/brokerage/store";

/** Whether brokerage import is available, the user is signed in, and linked. */
export async function GET(req: Request) {
  const configured = hasSnaptrade();
  const user = await getSession(req);
  const connected = configured && user ? Boolean(await getBrokerageLink(user.sub)) : false;
  return NextResponse.json(
    { configured, authed: Boolean(user), connected },
    { headers: { "Cache-Control": "no-store" } },
  );
}
