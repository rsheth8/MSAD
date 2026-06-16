import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUsage, QUOTAS } from "@/lib/usage/quotas";
import { hasDurableStore } from "@/lib/profile/server-store";

/** Daily usage stats for the signed-in user. */
export async function GET(req: Request) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [explain, backtest] = await Promise.all([
    getUsage(user.sub, QUOTAS.explain.feature),
    getUsage(user.sub, QUOTAS.backtest.feature),
  ]);

  return NextResponse.json(
    {
      usage: { explain, backtest },
      durableStore: hasDurableStore(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
