"use client";

import { useEffect, useState } from "react";
import { formatShortDate } from "@/lib/format";

interface EarningsPayload {
  nextDate: string | null;
  daysUntil: number | null;
  epsEstimated?: number | null;
  isMock?: boolean;
}

export function EarningsStrip({ ticker }: { ticker: string }) {
  const [data, setData] = useState<EarningsPayload | null>(null);

  useEffect(() => {
    fetch(`/api/earnings/${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [ticker]);

  if (!data?.nextDate || data.daysUntil === null) return null;

  return (
    <div className="surface mb-4 flex flex-wrap items-center gap-2 rounded-xl px-4 py-2.5 text-xs">
      <span className="rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent">Events</span>
      <span className="text-foreground">
        Next earnings in{" "}
        <span className="font-mono font-semibold">{data.daysUntil}d</span>
        <span className="text-muted"> · {formatShortDate(data.nextDate)}</span>
      </span>
      {data.epsEstimated != null && (
        <span className="text-muted">Est. EPS {data.epsEstimated.toFixed(2)}</span>
      )}
      <span className="text-[0.6rem] text-muted">Volatility often rises into earnings</span>
    </div>
  );
}
