import { NextResponse } from "next/server";
import { hasGoogleAuth } from "@/lib/auth/config";
import { getSession, maybeRefreshSession, attachRefreshedSession } from "@/lib/auth/session";
import { hasDurableStore } from "@/lib/profile/server-store";

/** Current signed-in user (or null), plus whether auth is even available. */
export async function GET(req: Request) {
  const user = await getSession(req);
  const refreshed = await maybeRefreshSession(req);
  const res = NextResponse.json(
    {
      user,
      authEnabled: hasGoogleAuth(),
      durableStore: hasDurableStore(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
  return attachRefreshedSession(res, refreshed);
}
