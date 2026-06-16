import { NextResponse } from "next/server";
import { kvSetJson } from "@/lib/kv/client";
import { captureMessage } from "@/lib/observability";

const WEBHOOK_SECRET = process.env.SNAPTRADE_WEBHOOK_SECRET?.trim();

interface WebhookPayload {
  eventType?: string;
  userId?: string;
  brokerageAuthorizationId?: string;
  detail?: string;
}

/**
 * SnapTrade webhook receiver for connection health events.
 * Set SNAPTRADE_WEBHOOK_SECRET and register this URL in the SnapTrade dashboard.
 */
export async function POST(req: Request) {
  if (WEBHOOK_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: WebhookPayload;
  try {
    body = (await req.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.eventType ?? "unknown";
  void captureMessage(`SnapTrade webhook: ${eventType}`, {
    route: "api/brokerage/webhook",
    userId: body.userId,
    authorizationId: body.brokerageAuthorizationId,
    detail: body.detail,
  });

  // Store connection health flags for UI polling (keyed by SnapTrade user id).
  if (body.userId && (eventType.includes("DISABLED") || eventType.includes("BROKEN"))) {
    await kvSetJson(`msad:broker-health:${body.userId}`, {
      status: "needs_reconnect",
      eventType,
      at: new Date().toISOString(),
      authorizationId: body.brokerageAuthorizationId,
    }, 86_400 * 7);
  }

  if (body.userId && (eventType.includes("FIXED") || eventType.includes("ENABLED"))) {
    await kvSetJson(`msad:broker-health:${body.userId}`, {
      status: "active",
      eventType,
      at: new Date().toISOString(),
    }, 86_400);
  }

  return NextResponse.json({ ok: true });
}
