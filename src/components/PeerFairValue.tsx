"use client";

import { useMemo } from "react";
import type { ReportCard } from "@/lib/types";
import { compositeFairValue, peerImpliedFairValues } from "@/lib/peer-valuation";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import { GlassCard } from "./GlassCard";

export function PeerFairValue({ data }: { data: ReportCard }) {
  const scenarios = useMemo(() => peerImpliedFairValues(data), [data]);
  const composite = compositeFairValue(scenarios);

  return (
    <GlassCard className="p-4 sm:p-5">
      <h4 className="font-display text-base font-semibold text-foreground">Peer-implied fair value</h4>
      <p className="mt-0.5 text-xs text-muted">
        If {data.ticker} traded at peer-median fundamentals, implied prices would be…
      </p>

      {composite !== null && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4 text-center">
          <div className="text-[0.65rem] uppercase tracking-wider text-muted">Composite (avg of metrics)</div>
          <div className="font-mono text-2xl font-semibold">{formatCurrency(composite)}</div>
          <div className="mt-1 font-mono text-sm text-muted">
            vs spot {formatCurrency(data.price)} ·{" "}
            <span className={composite >= data.price ? "text-up" : "text-down"}>
              {formatSignedPercent(((composite - data.price) / data.price) * 100)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[400px] text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[0.65rem] uppercase text-muted">
              <th className="pb-2">Metric</th>
              <th className="pb-2">Implied price</th>
              <th className="pb-2">Upside</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.slice(0, 6).map((s) => (
              <tr key={s.metricKey} className="border-b border-border/50">
                <td className="py-2 pr-2">{s.metricLabel}</td>
                <td className="py-2 font-mono">{formatCurrency(s.impliedPrice)}</td>
                <td className={`py-2 font-mono ${s.upsidePct >= 0 ? "text-up" : "text-down"}`}>
                  {formatSignedPercent(s.upsidePct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
