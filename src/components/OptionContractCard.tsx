import type { OptionContract } from "@/lib/types";
import { optionRead, optionStats } from "@/lib/analysis";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { GlassCard } from "./GlassCard";

/** One call or put contract with its factual numbers from the data layer. */
export function OptionContractCard({
  contract,
  price,
  name,
  learnMode = true,
}: {
  contract: OptionContract;
  price: number;
  name: string;
  learnMode?: boolean;
}) {
  const stats = optionStats(contract);
  const isCall = contract.type === "call";
  const accent = isCall ? "var(--up)" : "var(--down)";

  return (
    <GlassCard className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white"
          style={{ background: accent }}
        >
          {isCall ? "Call" : "Put"}
        </span>
        <span className="font-mono text-[0.65rem] text-muted">
          Δ {contract.delta > 0 ? "+" : ""}
          {contract.delta.toFixed(2)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted">Strike</div>
          <div className="font-mono font-semibold text-foreground tabular-nums">
            {formatCurrency(contract.strike)}
          </div>
        </div>
        <div>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted">Premium / sh</div>
          <div className="font-mono font-semibold text-foreground tabular-nums">
            {formatCurrency(contract.premium)}
          </div>
        </div>
        <div>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted">Expires</div>
          <div className="font-mono font-semibold text-foreground tabular-nums">
            {formatShortDate(contract.expiry)}
          </div>
        </div>
        <div>
          <div className="text-[0.65rem] uppercase tracking-wider text-muted">Break-even</div>
          <div className="font-mono font-semibold text-foreground tabular-nums">
            {formatCurrency(stats.breakeven)}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[0.65rem] leading-relaxed text-muted">
        One contract controls <span className="font-semibold text-foreground">100 shares</span>{" "}
        for a total cost of{" "}
        <span className="font-mono font-semibold text-foreground">
          {formatCurrency(stats.contractCost)}
        </span>
        .
      </p>

      {learnMode && (
        <p className="mt-2 text-xs leading-relaxed text-muted">{optionRead(contract, price, name)}</p>
      )}
    </GlassCard>
  );
}
