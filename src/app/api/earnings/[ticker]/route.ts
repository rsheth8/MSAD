import { NextResponse } from "next/server";
import { fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";

interface EarningsRow {
  date: string;
  symbol?: string;
  epsEstimated?: number;
  revenueEstimated?: number;
}

const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();

export async function GET(_req: Request, ctx: { params: Promise<{ ticker: string }> }) {
  const { ticker: raw } = await ctx.params;
  const ticker = raw.toUpperCase();
  const hit = cache.get(ticker);
  if (hit && Date.now() < hit.expires) {
    return NextResponse.json(hit.data);
  }

  if (!hasFmpApiKey()) {
    const mock = {
      nextDate: null as string | null,
      daysUntil: null as number | null,
      isMock: true,
    };
    return NextResponse.json(mock);
  }

  try {
    const rows = await fmpFetch<EarningsRow[]>("/earnings-calendar", { symbol: ticker });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = (rows ?? [])
      .filter((r) => r.date && new Date(r.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    const next = upcoming[0];
    const payload = next
      ? {
          nextDate: next.date,
          daysUntil: Math.ceil(
            (new Date(next.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          ),
          epsEstimated: next.epsEstimated ?? null,
          isMock: false,
        }
      : { nextDate: null, daysUntil: null, isMock: false };

    cache.set(ticker, { data: payload, expires: Date.now() + TTL_MS });
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch {
    return NextResponse.json({ nextDate: null, daysUntil: null, isMock: false });
  }
}
