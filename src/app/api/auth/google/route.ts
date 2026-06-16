import { NextResponse } from "next/server";
import { hasGoogleAuth, redirectUri } from "@/lib/auth/config";
import { buildAuthUrl } from "@/lib/auth/google";
import { STATE_COOKIE } from "@/lib/auth/session";

/** Start the Google OAuth flow. No-op redirect when auth isn't configured. */
export async function GET(req: Request) {
  if (!hasGoogleAuth()) {
    return NextResponse.redirect(new URL("/dashboard?auth=unconfigured", req.url));
  }
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(buildAuthUrl(state, redirectUri(req)));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
