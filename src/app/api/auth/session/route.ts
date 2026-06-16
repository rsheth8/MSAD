import { NextResponse } from "next/server";
import { hasGoogleAuth } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";

/** Current signed-in user (or null), plus whether auth is even available. */
export async function GET(req: Request) {
  const user = await getSession(req);
  return NextResponse.json(
    { user, authEnabled: hasGoogleAuth() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
