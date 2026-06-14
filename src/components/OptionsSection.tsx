"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { ReportCard } from "@/lib/types";
import type { ChainRow, OptionsChainPayload } from "@/lib/options/types";
import { toOptionContract } from "@/lib/options/utils";
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
import { GreeksPanel } from "./GreeksPanel";
import { OptionsChainTable } from "./OptionsChainTable";
import { PayoffExplainer } from "./PayoffExplainer";
import { StrategyExplorer } from "./StrategyExplorer";
import { OptionsScenarioLab } from "./OptionsScenarioLab";
import { CustomStrategyBuilder } from "./CustomStrategyBuilder";
import { CollapsibleSection } from "./CollapsibleSection";
import { ExplainerGroup } from "./ExplainerGroup";

type Tab = "chain" | "strategies" | "whatif" | "builder" | "learn";

const TAB_IDS: Tab[] = ["chain", "strategies", "whatif", "builder", "learn"];

function readOptionsUrl(): { tab?: Tab; expiry?: string } {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const tab = p.get("ot");
  const expiry = p.get("oe") ?? undefined;
  return {
    tab: tab && TAB_IDS.includes(tab as Tab) ? (tab as Tab) : undefined,
    expiry,
  };
}

function syncOptionsUrl(tab: Tab, expiry: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("ot", tab);
  if (expiry) url.searchParams.set("oe", expiry);
  window.history.replaceState({}, "", url.toString());
}

function PreviewChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <div className="text-[0.6rem] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-mono text-xs font-semibold text-foreground tabular-nums">{value}</div>
    </div>
  );
}

function Concept({ content, id }: { content: ExplainerContent; id: string }) {
  return (
    <GlassCard className="surface-interactive flex h-full flex-col p-4">
      <div className="text-sm font-semibold text-foreground">{content.title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{content.what}</p>
      <div className="mt-auto pt-3">
        <Explainer content={content} id={id} />
      </div>
    </GlassCard>
  );
}

function VolSummary({ chain, learnMode, name }: { chain: OptionsChainPayload; learnMode: boolean; name: string }) {
  const ivPct = Math.round(chain.atmImpliedVolatility * 100);
  const hvPct = Math.round(chain.historicalVolatility * 100);
  const spread = chain.ivVsHvSpread;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <GlassCard className="p-3">
        <div className="text-[0.6rem] uppercase tracking-wider text-muted">Spot</div>
        <div className="font-mono text-lg font-semibold">{formatCurrency(chain.underlyingPrice)}</div>
      </GlassCard>
      <GlassCard className="p-3">
        <div className="text-[0.6rem] uppercase tracking-wider text-muted">Hist. vol (30d)</div>
        <div className="font-mono text-lg font-semibold">{hvPct}%</div>
        <div className="text-[0.6rem] text-muted">From recent daily moves</div>
      </GlassCard>
      <GlassCard className="p-3">
        <div className="text-[0.6rem] uppercase tracking-wider text-muted">Model IV (ATM)</div>
        <div className="font-mono text-lg font-semibold">{ivPct}%</div>
        {learnMode && (
          <p className="mt-1 text-[0.6rem] leading-relaxed text-muted">{ivRead(chain.atmImpliedVolatility, name)}</p>
        )}
      </GlassCard>
      <GlassCard className="p-3">
        <div className="text-[0.6rem] uppercase tracking-wider text-muted">IV vs HV</div>
        <div className={`font-mono text-lg font-semibold ${spread > 0 ? "text-neutral" : "text-up"}`}>
          {spread > 0 ? "+" : ""}
          {spread.toFixed(1)} pts
        </div>
        <div className="text-[0.6rem] text-muted">
          {spread > 3 ? "Options priced rich vs history" : spread < -3 ? "Options relatively cheap" : "Roughly in line"}
        </div>
      </GlassCard>
    </div>
  );
}

/** Full options lab: chain table, greeks, strategies, and learn content. */
export function OptionsSection({
  data,
  learnMode = true,
}: {
  data: ReportCard;
  learnMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(() => readOptionsUrl().tab ?? "chain");
  const [chain, setChain] = useState<OptionsChainPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiry, setExpiry] = useState("");
  const [selected, setSelected] = useState<{ type: "call" | "put"; row: ChainRow } | null>(null);

  const { name, ticker } = data;

  useEffect(() => {
    syncOptionsUrl(tab, expiry);
  }, [tab, expiry]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const urlExpiry = readOptionsUrl().expiry;
    fetch(`/api/options/${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((payload: OptionsChainPayload) => {
        setChain(payload);
        const defaultExpiry =
          (urlExpiry && payload.expirations.some((e) => e.date === urlExpiry)
            ? urlExpiry
            : payload.expirations[2]?.date) ?? payload.expirations[0]?.date ?? "";
        setExpiry(defaultExpiry);
        const rows = payload.chains[defaultExpiry] ?? [];
        const atm = rows.reduce((best, r) =>
          Math.abs(r.strike - payload.underlyingPrice) < Math.abs(best.strike - payload.underlyingPrice)
            ? r
            : best,
        rows[0]);
        if (atm) setSelected({ type: "call", row: atm });
      })
      .catch(() => setChain(null))
      .finally(() => setLoading(false));
  }, [open, ticker]);

  const selectedContract = useMemo(() => {
    if (!selected || !expiry) return null;
    const quote = selected.type === "call" ? selected.row.call : selected.row.put;
    return toOptionContract(selected.type, selected.row.strike, quote, expiry);
  }, [selected, expiry]);

  const previewIv = chain?.atmImpliedVolatility ?? data.options.impliedVolatility;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mt-6"
    >
      <CollapsibleSection
        title="Options Lab"
        subtitle={`Chain, greeks, and strategy payoff tools for ${name} — model-based quotes using live price & historical volatility.`}
        open={open}
        onOpenChange={setOpen}
        defaultOpen={false}
        badge={
          <span
            className="hidden rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide sm:inline"
            style={{
              color: "var(--neutral)",
              background: "color-mix(in srgb, var(--neutral) 12%, transparent)",
            }}
          >
            Tools · not recommendations
          </span>
        }
        preview={
          <div className="flex flex-wrap gap-2">
            <PreviewChip label="Model IV" value={`${Math.round(previewIv * 100)}%`} />
            <PreviewChip label="Expirations" value={`${chain?.expirations.length ?? data.options.expirations.length} dates`} />
            <PreviewChip label="Chain strikes" value="9 per expiry" />
            <PreviewChip label="Strategies" value="6 presets" />
          </div>
        }
      >
        {loading && (
          <div className="surface animate-pulse rounded-xl p-8 text-center text-sm text-muted">
            Building options chain for {ticker}…
          </div>
        )}

        {chain && !loading && (
          <>
            <VolSummary chain={chain} learnMode={learnMode} name={name} />

            <div className="surface flex w-fit flex-wrap rounded-full p-0.5 text-xs font-medium">
              {(
                [
                  ["chain", "Chain & Greeks"],
                  ["strategies", "Strategies"],
                  ["whatif", "What-if"],
                  ["builder", "Builder"],
                  ["learn", "Learn"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`btn-pill ${tab === id ? "btn-pill-active" : "btn-pill-inactive"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "chain" && (
              <div className="space-y-4" id="section-options-chain">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${
                      chain.isModelBased
                        ? "bg-neutral/10 text-neutral"
                        : "bg-up/10 text-up"
                    }`}
                  >
                    {chain.isModelBased ? "Model chain · Black-Scholes" : "Live exchange chain"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {chain.expirations.map((e) => (
                    <button
                      key={e.date}
                      type="button"
                      onClick={() => {
                        setExpiry(e.date);
                        setSelected(null);
                      }}
                      className={`btn-chip font-mono ${
                        expiry === e.date ? "btn-chip-active" : "btn-chip-inactive"
                      }`}
                    >
                      {e.label} · {e.days}d
                    </button>
                  ))}
                </div>

                <GlassCard className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground">Options chain</h4>
                    <Explainer content={DELTA_EXPLAINER} align="right" id="delta" />
                  </div>
                  <OptionsChainTable
                    chain={chain}
                    expiry={expiry}
                    selected={selected ? { type: selected.type, strike: selected.row.strike } : null}
                    onSelect={(type, row) => setSelected({ type, row })}
                  />
                  <p className="mt-3 text-[0.65rem] text-muted">
                    Click a call or put cell to inspect greeks and payoff. Quotes are{" "}
                    <span className="font-semibold">Black-Scholes model estimates</span> calibrated
                    to historical volatility{chain.isModelBased ? "" : " and live price"}.
                  </p>
                </GlassCard>

                {selected && (
                  <>
                    <GlassCard className="p-4 sm:p-5">
                      <GreeksPanel
                        type={selected.type}
                        strike={selected.row.strike}
                        quote={selected.type === "call" ? selected.row.call : selected.row.put}
                        expiry={formatShortDate(expiry)}
                        underlyingPrice={chain.underlyingPrice}
                      />
                    </GlassCard>

                    {selectedContract && (
                      <GlassCard className="p-4 sm:p-6">
                        <PayoffExplainer
                          name={name}
                          price={chain.underlyingPrice}
                          call={
                            selected.type === "call"
                              ? selectedContract
                              : toOptionContract("call", selected.row.strike, selected.row.call, expiry)
                          }
                          put={
                            selected.type === "put"
                              ? selectedContract
                              : toOptionContract("put", selected.row.strike, selected.row.put, expiry)
                          }
                          initialType={selected.type}
                        />
                      </GlassCard>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === "strategies" && (
              <GlassCard className="p-4 sm:p-6">
                <StrategyExplorer chain={chain} expiry={expiry} name={name} />
              </GlassCard>
            )}

            {tab === "whatif" && (
              <div id="section-options-whatif">
                <OptionsScenarioLab chain={chain} expiry={expiry} selected={selected} name={name} />
              </div>
            )}

            {tab === "builder" && (
              <CustomStrategyBuilder
                chain={chain}
                expiry={expiry}
                price={chain.underlyingPrice}
                name={name}
              />
            )}

            {tab === "learn" && (
              <ExplainerGroup>
                <div className="space-y-4" id="section-options-learn">
                  <GlassCard className="p-4">
                    <div className="text-sm font-semibold">{OPTION_EXPLAINER.title}</div>
                    <p className="mt-1 text-xs text-muted">{OPTION_EXPLAINER.what}</p>
                    <div className="mt-3">
                      <Explainer content={OPTION_EXPLAINER} id="options-intro" />
                    </div>
                  </GlassCard>
                  <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                    <Concept content={CALL_EXPLAINER} id="call" />
                    <Concept content={PUT_EXPLAINER} id="put" />
                  </div>
                  <GlassCard className="p-4">
                    <Explainer content={IV_EXPLAINER} id="iv" />
                  </GlassCard>
                </div>
              </ExplainerGroup>
            )}
          </>
        )}

        <p className="border-t border-border pt-4 text-center text-[0.7rem] leading-relaxed text-muted">
          <span className="font-semibold">Educational only — not financial advice.</span> Chain
          prices are model-generated (not live exchange quotes). Greeks and payoffs are estimates
          for learning — verify with a broker before trading.
        </p>
      </CollapsibleSection>
    </motion.section>
  );
}
