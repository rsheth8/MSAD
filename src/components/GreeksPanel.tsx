"use client";

import type { OptionLegQuote } from "@/lib/options/types";
import { formatCurrency, formatPercent } from "@/lib/format";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <div className="text-[0.6rem] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-mono text-sm font-semibold tabular-nums text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[0.6rem] text-muted">{hint}</div>}
    </div>
  );
}

export function GreeksPanel({
  type,
  strike,
  quote,
  expiry,
  underlyingPrice,
}: {
  type: "call" | "put";
  strike: number;
  quote: OptionLegQuote;
  expiry: string;
  underlyingPrice: number;
}) {
  const moveToBE =
    type === "call"
      ? ((quote.breakeven - underlyingPrice) / underlyingPrice) * 100
      : ((underlyingPrice - quote.breakeven) / underlyingPrice) * 100;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase text-white"
          style={{ background: type === "call" ? "var(--up)" : "var(--down)" }}
        >
          {type} · {formatCurrency(strike)} · {expiry}
        </span>
        <MoneynessBadge tag={quote.moneyness} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Premium" value={formatCurrency(quote.premium)} hint="Per share" />
        <Stat label="Contract cost" value={formatCurrency(quote.premium * 100)} hint="×100 shares" />
        <Stat label="Break-even" value={formatCurrency(quote.breakeven)} hint={`${moveToBE.toFixed(1)}% move`} />
        <Stat label="IV" value={formatPercent(quote.iv, 0)} />
        <Stat label="Delta (Δ)" value={quote.delta.toFixed(3)} hint="Price sensitivity" />
        <Stat label="Gamma (Γ)" value={quote.gamma.toFixed(4)} hint="Delta change" />
        <Stat label="Theta (Θ)" value={quote.theta.toFixed(3)} hint="Daily time decay" />
        <Stat label="Vega (ν)" value={quote.vega.toFixed(3)} hint="IV sensitivity" />
        <Stat label="Intrinsic" value={formatCurrency(quote.intrinsic)} />
        <Stat label="Extrinsic" value={formatCurrency(quote.extrinsic)} hint="Time value" />
      </div>
    </div>
  );
}

function MoneynessBadge({ tag }: { tag: string }) {
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-muted">
      {tag}
    </span>
  );
}
