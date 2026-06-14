"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ReportCard } from "@/lib/types";
import { ivRead } from "@/lib/analysis";
import {
  CALL_EXPLAINER,
  DELTA_EXPLAINER,
  IV_EXPLAINER,
  OPTION_EXPLAINER,
  PUT_EXPLAINER,
  type ExplainerContent,
} from "@/lib/explanations";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { GlassCard } from "./GlassCard";
import { Explainer } from "./Explainer";
import { OptionContractCard } from "./OptionContractCard";
import { PayoffExplainer } from "./PayoffExplainer";

function PreviewChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <div className="text-[0.6rem] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-mono text-xs font-semibold text-foreground tabular-nums">{value}</div>
    </div>
  );
}

/** A concept tile: a plain-English line + an expandable deeper explainer. */
function Concept({ content }: { content: ExplainerContent }) {
  return (
    <GlassCard className="flex h-full flex-col p-4">
      <div className="text-sm font-semibold text-foreground">{content.title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{content.what}</p>
      <div className="mt-auto pt-3">
        <Explainer content={content} />
      </div>
    </GlassCard>
  );
}

/** Collapsible options education: calls/puts, IV, expirations, and payoff on mock data. */
export function OptionsSection({
  data,
  learnMode = true,
}: {
  data: ReportCard;
  learnMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { options, name, price, isMock } = data;
  const ivPct = Math.round(options.impliedVolatility * 100);
  const exampleExpiry = options.call.expiry;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6"
    >
      <GlassCard className="overflow-hidden p-6 sm:p-8">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
              Options — Learn the Basics
            </h3>
            <p className="mt-1 text-xs text-muted">
              What calls &amp; puts are, using {name} as the example
              {isMock ? " — with sample options data for now" : ""}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="hidden rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide sm:inline"
              style={{
                color: "var(--neutral)",
                background: "color-mix(in srgb, var(--neutral) 12%, transparent)",
              }}
            >
              Education · no recommendations
            </span>
            <span className="text-muted" aria-hidden>
              {open ? "▲" : "▼"}
            </span>
          </div>
        </button>

        {/* Collapsed preview — key facts without expanding */}
        {!open && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <PreviewChip label="Implied Volatility" value={`${ivPct}%`} />
            <PreviewChip label="Example Strike" value={formatCurrency(options.call.strike)} />
            <PreviewChip label="Example Expiry" value={formatShortDate(exampleExpiry)} />
            <PreviewChip label="Call Premium" value={formatCurrency(options.call.premium)} />
            <PreviewChip label="Put Premium" value={formatCurrency(options.put.premium)} />
          </div>
        )}

        {open && (
          <div className="mt-6 space-y-6">
            {/* What is an option? */}
            <GlassCard className="p-4">
              <div className="text-sm font-semibold text-foreground">{OPTION_EXPLAINER.title}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{OPTION_EXPLAINER.what}</p>
              <div className="mt-3">
                <Explainer content={OPTION_EXPLAINER} />
              </div>
            </GlassCard>

            {/* Call vs Put concepts */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Concept content={CALL_EXPLAINER} />
              <Concept content={PUT_EXPLAINER} />
            </div>

            {/* Example contracts — factual numbers from mock/live data */}
            <div>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h4 className="font-display text-base font-semibold text-foreground">
                    Example contracts for {data.ticker}
                  </h4>
                  <p className="mt-0.5 text-xs text-muted">
                    Near-the-money {formatCurrency(options.call.strike)} strike, expiring{" "}
                    {formatShortDate(exampleExpiry)} — same numbers used in the payoff chart below.
                  </p>
                </div>
                <Explainer content={DELTA_EXPLAINER} align="right" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <OptionContractCard
                  contract={options.call}
                  price={price}
                  name={name}
                  learnMode={learnMode}
                />
                <OptionContractCard
                  contract={options.put}
                  price={price}
                  name={name}
                  learnMode={learnMode}
                />
              </div>
            </div>

            {/* IV + expiration calendar */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <GlassCard className="p-4">
                <div className="text-[0.7rem] uppercase tracking-wider text-muted">
                  Implied Volatility
                </div>
                <div className="mt-1 font-mono text-2xl font-semibold text-foreground tabular-nums">
                  {ivPct}%
                </div>
                {learnMode && (
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {ivRead(options.impliedVolatility, name)}
                  </p>
                )}
                <div className="mt-3">
                  <Explainer content={IV_EXPLAINER} />
                </div>
              </GlassCard>

              <GlassCard className="p-4 lg:col-span-2">
                <div className="text-[0.7rem] uppercase tracking-wider text-muted">
                  Upcoming Expirations
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {options.expirations.map((e) => {
                    const isExample = e.date === exampleExpiry;
                    return (
                      <span
                        key={e.date}
                        className={`rounded-full border px-3 py-1 font-mono text-xs ${
                          isExample
                            ? "border-accent bg-accent/10 font-semibold text-foreground"
                            : "border-border bg-background text-foreground"
                        }`}
                      >
                        {formatShortDate(e.date)} · {e.days}d
                        {isExample ? " · example" : ""}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  US equity options typically expire on{" "}
                  <span className="font-semibold text-foreground">Fridays</span>. Each date is a
                  deadline — exercise or the contract expires worthless. The highlighted date is
                  the one used for the example call and put above.
                </p>
              </GlassCard>
            </div>

            {/* Interactive payoff diagram */}
            <GlassCard className="p-4 sm:p-6">
              <PayoffExplainer name={name} price={price} call={options.call} put={options.put} />
            </GlassCard>

            <p className="border-t border-border pt-4 text-center text-[0.7rem] leading-relaxed text-muted">
              <span className="font-semibold">Educational only — not financial advice.</span> These
              are sample contracts to illustrate how options work, not suggestions to trade. Options
              are risky and can expire worthless.
              {isMock ? (
                <span className="mt-1 block">
                  IV, expirations, and premiums are generated sample data — live chain data arrives
                  in a later build phase.
                </span>
              ) : (
                <span className="mt-1 block">
                  IV and contract premiums are estimated from live price and beta for education —
                  not live chain quotes.
                </span>
              )}
            </p>
          </div>
        )}
      </GlassCard>
    </motion.section>
  );
}
