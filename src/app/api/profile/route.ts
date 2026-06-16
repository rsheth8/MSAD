import { NextResponse } from "next/server";
import { getSession, maybeRefreshSession, attachRefreshedSession } from "@/lib/auth/session";
import { getServerProfile, setServerProfile, hasDurableStore } from "@/lib/profile/server-store";
import { PROFILE_VERSION, type UserProfile } from "@/lib/profile/types";

const MAX_PROFILE_BYTES = 512_000; // 500 KB

function validateProfile(body: unknown): body is UserProfile {
  if (!body || typeof body !== "object") return false;
  const p = body as UserProfile;
  return (
    p.version === PROFILE_VERSION &&
    Array.isArray(p.journal) &&
    Array.isArray(p.predictions) &&
    p.journal.length <= 500 &&
    p.predictions.length <= 500 &&
    (p.watchlist === undefined || (Array.isArray(p.watchlist) && p.watchlist.length <= 200))
  );
}

/** Cloud copy of the signed-in user's progress. 401 for guests (use local). */
export async function GET(req: Request) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const profile = await getServerProfile(user.sub);
  const refreshed = await maybeRefreshSession(req);
  const res = NextResponse.json(
    { profile, durableStore: hasDurableStore() },
    { headers: { "Cache-Control": "no-store" } },
  );
  return attachRefreshedSession(res, refreshed);
}

export async function PUT(req: Request) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const raw = await req.text();
  if (raw.length > MAX_PROFILE_BYTES) {
    return NextResponse.json({ error: "Profile too large" }, { status: 413 });
  }

  let body: UserProfile;
  try {
    body = JSON.parse(raw) as UserProfile;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!validateProfile(body)) {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }

  await setServerProfile(user.sub, body);
  const refreshed = await maybeRefreshSession(req);
  const res = NextResponse.json({ ok: true, durableStore: hasDurableStore() });
  return attachRefreshedSession(res, refreshed);
}
