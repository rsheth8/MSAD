import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { revokeAllSessions } from "@/lib/auth/revocation";

/** Sign out on all devices by invalidating all sessions for this user. */
export async function POST(req: Request) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  await revokeAllSessions(user.sub);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return res;
}
