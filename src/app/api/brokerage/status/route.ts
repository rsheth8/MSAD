import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { brokerConnectionStatus, hasSnaptrade } from "@/lib/brokerage/snaptrade";
import { snaptradeMode } from "@/lib/brokerage/mode";
import { getBrokerageLink } from "@/lib/brokerage/store";

/** Whether brokerage import is available, the user is signed in, and linked. */
export async function GET(req: Request) {
  const configured = hasSnaptrade();
  const mode = configured ? snaptradeMode() : null;
  const user = await getSession(req);
  const link = configured && user ? await getBrokerageLink(user.sub) : null;
  const registered = Boolean(link);
  let brokerLinked = false;
  let connectionDisabled = false;
  if (link && user) {
    try {
      const counts = await brokerConnectionStatus(user.sub, link);
      brokerLinked = counts.active > 0;
      connectionDisabled = counts.total > 0 && counts.active === 0;
    } catch (err) {
      console.error("[api/brokerage/status]", err);
    }
  }
  return NextResponse.json(
    {
      configured,
      mode,
      authed: Boolean(user),
      /** SnapTrade credentials stored for this MSAD user. */
      connected: registered,
      /** At least one active (non-disabled) broker connection. */
      brokerLinked,
      /** Had a connection, but SnapTrade marked it disabled (re-auth needed). */
      connectionDisabled,
      snaptradeAuthed: registered && link?.mode === "personal",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
