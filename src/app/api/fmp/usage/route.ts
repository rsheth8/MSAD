import { NextResponse } from "next/server";
import { getFmpUsage } from "@/lib/fmp/usage";

/** Today's FMP API call budget for this deployment's API key. */
export async function GET() {
  const usage = await getFmpUsage();
  if (!usage.configured || usage.limit === 0) {
    return NextResponse.json({ usage: null }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ usage }, { headers: { "Cache-Control": "no-store" } });
}
