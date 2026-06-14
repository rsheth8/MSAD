"use client";

import { useState } from "react";
import type { ReportCard } from "@/lib/types";
import {
  breakevenCompare,
  coveredCallYield,
  dcaProjection,
  positionSize,
} from "@/lib/calculators";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import { GlassCard } from "./GlassCard";
import { SliderControl } from "./SliderControl";

type CalcTab = "position" | "breakeven" | "covered" | "dca";

export function CalculatorsPanel({ data }: { data: ReportCard }) {
  const [tab, setTab] = useState<CalcTab>("position");
  const { price, options } = data;

  const [portfolio, setPortfolio] = useState(10000);
  const [riskPct, setRiskPct] = useState(2);
  const [stop, setStop] = useState(Math.round(price * 0.92 * 100) / 100);

  const [monthly, setMonthly] = useState(200);
  const [years, setYears] = useState(10);
  const [annualReturn, setAnnualReturn] = useState(8);

  const pos = positionSize({ portfolio, riskPct, entry: price, stop });
  const be = breakevenCompare({
    stockPrice: price,
    callPremium: options.call.premium,
    strike: options.call.strike,
  });
  const cc = coveredCallYield({
    stockPrice: price,
    callPremium: options.call.premium,
    strike: options.call.strike,
    daysToExpiry: options.expirations.find((e) => e.date === options.call.expiry)?.days ?? 30,
  });
  const dca = dcaProjection({ monthly, years, annualReturn });

  const tabs: { id: CalcTab; label: string }[] = [
    { id: "position", label: "Position size" },
    { id: "breakeven", label: "Stock vs call" },
    { id: "covered", label: "Covered call" },
    { id: "dca", label: "DCA" },
  ];

  return (
    <GlassCard className="p-4 sm:p-5">
      <h4 className="font-display text-base font-semibold text-foreground">Calculators</h4>
      <p className="mt-0.5 text-xs text-muted">Interactive math — adjust inputs and see results instantly.</p>

      <div className="mt-3 flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`btn-pill ${tab === t.id ? "btn-pill-active" : "btn-pill-inactive"} text-[0.65rem]`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {tab === "position" && (
          <>
            <SliderControl label="Portfolio" value={portfolio} min={1000} max={100000} step={500} format={(v) => formatCurrency(v)} onChange={setPortfolio} />
            <SliderControl label="Risk per trade" value={riskPct} min={0.5} max={10} step={0.5} format={(v) => `${v}%`} onChange={setRiskPct} />
            <SliderControl label="Stop loss price" value={stop} min={price * 0.7} max={price * 0.99} step={0.5} format={(v) => formatCurrency(v)} onChange={setStop} />
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-background p-2">
                <div className="text-muted">Shares</div>
                <div className="font-mono text-lg font-semibold">{pos.shares}</div>
              </div>
              <div className="rounded-xl bg-background p-2">
                <div className="text-muted">At risk</div>
                <div className="font-mono text-lg font-semibold">{formatCurrency(pos.dollarRisk)}</div>
              </div>
              <div className="rounded-xl bg-background p-2">
                <div className="text-muted">Position</div>
                <div className="font-mono text-lg font-semibold">{formatCurrency(pos.positionValue)}</div>
              </div>
            </div>
          </>
        )}

        {tab === "breakeven" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border border-border p-3">
              <div className="font-semibold">Buy 100 shares</div>
              <div className="mt-2 font-mono">Cost: {formatCurrency(be.sharesCost)}</div>
              <div className="font-mono">Break-even: {formatCurrency(be.stockBreakeven)}</div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="font-semibold">Buy 1 ATM call</div>
              <div className="mt-2 font-mono">Cost: {formatCurrency(be.callCost)}</div>
              <div className="font-mono">Break-even: {formatCurrency(be.callBreakeven)}</div>
            </div>
            <p className="sm:col-span-2 text-muted">
              {formatCurrency(be.callCost)} in calls ≈ exposure of ~{be.sharesForSameExposure} shares — different risk/reward shape.
            </p>
          </div>
        )}

        {tab === "covered" && (
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-xl bg-background p-2 text-center">
              <div className="text-muted">Premium yield</div>
              <div className="font-mono text-lg font-semibold">{cc.premiumYield.toFixed(2)}%</div>
            </div>
            <div className="rounded-xl bg-background p-2 text-center">
              <div className="text-muted">Annualized</div>
              <div className="font-mono text-lg font-semibold">{cc.annualizedYield.toFixed(1)}%</div>
            </div>
            <div className="rounded-xl bg-background p-2 text-center">
              <div className="text-muted">If called</div>
              <div className="font-mono text-lg font-semibold">{formatSignedPercent(cc.maxGainIfCalled)}</div>
            </div>
            <div className="rounded-xl bg-background p-2 text-center">
              <div className="text-muted">Effective sale</div>
              <div className="font-mono text-lg font-semibold">{formatCurrency(cc.effectiveSalePrice)}</div>
            </div>
          </div>
        )}

        {tab === "dca" && (
          <>
            <SliderControl label="Monthly" value={monthly} min={50} max={2000} step={50} format={(v) => formatCurrency(v)} onChange={setMonthly} />
            <SliderControl label="Years" value={years} min={1} max={40} step={1} format={(v) => `${v}y`} onChange={setYears} />
            <SliderControl label="Return (assumed)" value={annualReturn} min={0} max={15} step={0.5} format={(v) => `${v}%`} onChange={setAnnualReturn} />
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-background p-2">
                <div className="text-muted">Contributed</div>
                <div className="font-mono font-semibold">{formatCurrency(dca.totalContributed)}</div>
              </div>
              <div className="rounded-xl bg-background p-2">
                <div className="text-muted">Final (model)</div>
                <div className="font-mono font-semibold">{formatCurrency(dca.finalValue)}</div>
              </div>
              <div className="rounded-xl bg-background p-2">
                <div className="text-muted">Gain</div>
                <div className="font-mono font-semibold text-up">{formatCurrency(dca.gain)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </GlassCard>
  );
}
