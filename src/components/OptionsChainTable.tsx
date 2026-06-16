"use client";

import type { ChainRow, OptionsChainPayload } from "@/lib/options/types";
import { formatCurrency, formatPercent } from "@/lib/format";

function MoneynessBadge({ tag }: { tag: string }) {
  const cls =
    tag === "ATM"
      ? "bg-accent/15 text-foreground"
      : tag === "ITM"
        ? "bg-up/10 text-up"
        : "bg-muted/10 text-muted";
  return (
    <span className={`rounded px-1 py-0.5 text-[0.55rem] font-bold uppercase ${cls}`}>
      {tag}
    </span>
  );
}

function LegCell({
  quote,
  selected,
  onClick,
}: {
  quote: ChainRow["call"];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-2 py-2 text-left transition-colors ${
        selected ? "bg-accent/15 ring-1 ring-accent/40" : "hover:bg-background"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm font-semibold tabular-nums">{formatCurrency(quote.premium)}</span>
        <MoneynessBadge tag={quote.moneyness} />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 text-[0.6rem] text-muted">
        <span>
          Δ {quote.delta > 0 ? "+" : ""}
          {quote.delta.toFixed(2)}
        </span>
        <span>IV {formatPercent(quote.iv, 0)}</span>
      </div>
      <div className="mt-0.5 font-mono text-[0.55rem] tabular-nums text-muted/90">
        Γ {quote.gamma.toFixed(3)} · Θ {quote.theta.toFixed(2)} · ν {quote.vega.toFixed(2)}
      </div>
    </button>
  );
}

export function OptionsChainTable({
  chain,
  expiry,
  selected,
  onSelect,
}: {
  chain: OptionsChainPayload;
  expiry: string;
  selected: { type: "call" | "put"; strike: number } | null;
  onSelect: (type: "call" | "put", row: ChainRow) => void;
}) {
  const rows = chain.chains[expiry] ?? [];
  const price = chain.underlyingPrice;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-xs">
        <thead>
          <tr className="border-b border-border text-[0.65rem] uppercase tracking-wider text-muted">
            <th className="pb-2 pr-2 text-left font-medium">Strike</th>
            <th className="pb-2 px-2 text-left font-medium">Calls</th>
            <th className="pb-2 pl-2 text-left font-medium">Puts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isATM = Math.abs(row.strike - price) / price < 0.02;
            return (
              <tr
                key={row.strike}
                className={`border-b border-border/60 ${isATM ? "bg-accent/5" : ""}`}
              >
                <td className="py-2 pr-2 align-middle">
                  <div className="font-mono font-semibold tabular-nums">{formatCurrency(row.strike)}</div>
                  {isATM && <div className="text-[0.6rem] text-accent">Near spot</div>}
                </td>
                <td className="py-1 px-1 align-middle">
                  <LegCell
                    quote={row.call}
                    selected={selected?.type === "call" && selected.strike === row.strike}
                    onClick={() => onSelect("call", row)}
                  />
                </td>
                <td className="py-1 pl-1 align-middle">
                  <LegCell
                    quote={row.put}
                    selected={selected?.type === "put" && selected.strike === row.strike}
                    onClick={() => onSelect("put", row)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
