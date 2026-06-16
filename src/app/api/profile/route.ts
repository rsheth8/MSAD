import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getServerProfile, setServerProfile } from "@/lib/profile/server-store";
import { PROFILE_VERSION, type UserProfile } from "@/lib/profile/types";

/** Cloud copy of the signed-in user's progress. 401 for guests (use local). */
export async function GET(req: Request) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const profile = await getServerProfile(user.sub);
  return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: UserProfile;
  try {
    body = (await req.json()) as UserProfile;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Minimal shape validation — never trust the client blindly.
  if (
    !body ||
    body.version !== PROFILE_VERSION ||
    !Array.isArray(body.journal) ||
    !Array.isArray(body.predictions)
  ) {
    return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  }
  await setServerProfile(user.sub, body);
  return NextResponse.json({ ok: true });
}
