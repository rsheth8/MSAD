import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { deleteServerProfile, getServerProfile } from "@/lib/profile/server-store";
import { deleteBrokerageLink, getBrokerageLink } from "@/lib/brokerage/store";
import { deleteSnapTradeUser, hasSnaptrade, snaptradeUserId } from "@/lib/brokerage/snaptrade";
import { revokeAllSessions } from "@/lib/auth/revocation";
import { captureError } from "@/lib/observability";

/** Export all user data as JSON (GDPR-style data portability). */
export async function GET(req: Request) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const profile = await getServerProfile(user.sub);
  const brokerageLinked = Boolean(await getBrokerageLink(user.sub));

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: { sub: user.sub, email: user.email, name: user.name },
    profile,
    brokerageLinked,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="msad-export-${user.sub.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Permanently delete account and all server-side data. */
export async function DELETE(req: Request) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const link = await getBrokerageLink(user.sub);
    if (link && hasSnaptrade() && link.mode === "commercial") {
      try {
        await deleteSnapTradeUser(snaptradeUserId(user.sub));
      } catch (err) {
        void captureError(err, { route: "api/account", action: "deleteSnapTradeUser" });
      }
    }
    await deleteBrokerageLink(user.sub);
    await deleteServerProfile(user.sub);
    await revokeAllSessions(user.sub);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
    return res;
  } catch (err) {
    void captureError(err, { route: "api/account", action: "delete" });
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
