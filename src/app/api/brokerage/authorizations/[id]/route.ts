import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasSnaptrade, removeBrokerageConnection } from "@/lib/brokerage/snaptrade";
import { getBrokerageLink } from "@/lib/brokerage/store";

/** Remove one broker connection for the signed-in user. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSnaptrade()) {
    return NextResponse.json({ error: "Brokerage import is not configured" }, { status: 503 });
  }
  const user = await getSession(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to manage connections" }, { status: 401 });
  }
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing connection id" }, { status: 400 });
  }

  const link = await getBrokerageLink(user.sub);
  if (!link) {
    return NextResponse.json({ error: "No brokerage linked yet" }, { status: 409 });
  }

  try {
    await removeBrokerageConnection(user.sub, link, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/brokerage/authorizations/delete]", err);
    const message = err instanceof Error ? err.message : "Couldn't remove connection";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
