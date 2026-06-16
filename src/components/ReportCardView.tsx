"use client";

import { useState, useEffect } from "react";
import { MSAD_EVENTS } from "@/lib/brand";
import { LayoutGroup, motion } from "framer-motion";
import type { Metric, ReportCard } from "@/lib/types";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import { PRICE_EXPLAINER } from "@/lib/explanations";
import { AnimatedNumber } from "./AnimatedNumber";
import { Explainer } from "./Explainer";
import { GlassCard } from "./GlassCard";
import { GradePanel } from "./GradePanel";
import { MetricCard } from "./MetricCard";
import { ChartPanel } from "./ChartPanel";
import { NewsSection } from "./NewsSection";

function ChangeStat({ label, pct }: { label: string; pct: number }) {
  const up = pct >= 0;
  return (
    <div className="text-right">
      <div className="text-[0.7rem] uppercase tracking-wider text-muted">{label}</div>
      <div
        className={`font-mono text-sm font-semibold tabular-nums ${
          up ? "text-up" : "text-down"
        }`}
      >
        {formatSignedPercent(pct)}
      </div>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/** Bento cell: a metric with an optional column span. */
function Cell({
  metric,
  ticker,
  learnMode,
  span = "",
  expanded,
  onToggle,
}: {
  metric: Metric;
  ticker: string;
  learnMode: boolean;
  span?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={span}>
      <MetricCard
        metric={metric}
        ticker={ticker}
        learnMode={learnMode}
        expanded={expanded}
        onToggle={onToggle}
      />
    </div>
  );
}

export function ReportCardView({
  data,
  learnMode = true,
}: {
  data: ReportCard;
  learnMode?: boolean;
}) {
  const m = Object.fromEntries(data.metrics.map((x) => [x.key, x])) as Record<string, Metric>;
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  function toggleMetric(key: string) {
    setExpandedMetric((current) => (current === key ? null : key));
  }

  useEffect(() => {
    if (!learnMode) setExpandedMetric(null);
  }, [learnMode]);

  useEffect(() => {
    function onExpand(e: Event) {
      const key = (e as CustomEvent<string>).detail;
      if (key) setExpandedMetric((c) => (c === key ? null : key));
    }
    window.addEventListener(MSAD_EVENTS.expandMetric, onExpand);
    return () => window.removeEventListener(MSAD_EVENTS.expandMetric, onExpand);
  }, []);

  return (
    <motion.div key={data.ticker} initial="hidden" animate="show" className="w-full">
      <GlassCard className="overflow-hidden p-6 sm:p-8">
        {/* Header */}
        <motion.div variants={fadeUp} custom={0} className="text-center" id="section-price">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {data.name}
          </h2>
          <p className="mt-1 font-mono text-sm text-muted">
            {data.ticker} · {data.exchange} · {data.industry}
          </p>
        </motion.div>

        {/* Price + changes */}
        <motion.div
          variants={fadeUp}
          custom={1}
          className="mt-6 flex items-end justify-between gap-4"
        >
          <div>
            <div className="text-[0.7rem] uppercase tracking-wider text-muted">
              Stock Price
            </div>
            <div className="font-mono text-3xl font-semibold tabular-nums sm:text-4xl">
              <AnimatedNumber
                value={data.price}
                format={(n) => formatCurrency(n, data.currency)}
              />
            </div>
          </div>
          <div className="flex gap-4 sm:gap-6">
            <ChangeStat label="1 Week" pct={data.changes.week} />
            <ChangeStat label="1 Month" pct={data.changes.month} />
            <ChangeStat label="1 Year" pct={data.changes.year} />
          </div>
        </motion.div>
        <motion.div variants={fadeUp} custom={1} className="mt-2">
          <Explainer content={PRICE_EXPLAINER} />
        </motion.div>

        {/* Overall grade — the beginner's 5-second gist */}
        <motion.div variants={fadeUp} custom={2} className="mt-6" id="section-grade">
          <GradePanel data={data} learnMode={learnMode} />
        </motion.div>

        {/* News, analyst sentiment, and social context */}
        <motion.div variants={fadeUp} custom={2.5} className="mt-4">
          <NewsSection ticker={data.ticker} data={data} learnMode={learnMode} />
        </motion.div>

        {/* Interactive chart */}
        <motion.div variants={fadeUp} custom={3} className="mt-4" id="section-chart">
          <ChartPanel data={data} learnMode={learnMode} />
        </motion.div>

        {/* Bento metrics — only one card expands at a time */}
        <LayoutGroup>
          <motion.div
            variants={fadeUp}
            custom={4}
            className="mt-4 grid grid-cols-2 items-start gap-4 lg:grid-cols-4"
            layout
            id="section-metrics"
          >
          <Cell
            metric={m.roe}
            ticker={data.ticker}
            learnMode={learnMode}
            expanded={expandedMetric === "roe"}
            onToggle={() => toggleMetric("roe")}
          />
          <Cell
            metric={m.pe}
            ticker={data.ticker}
            learnMode={learnMode}
            expanded={expandedMetric === "pe"}
            onToggle={() => toggleMetric("pe")}
          />
          <Cell
            metric={m.evEbitda}
            ticker={data.ticker}
            learnMode={learnMode}
            expanded={expandedMetric === "evEbitda"}
            onToggle={() => toggleMetric("evEbitda")}
          />
          <Cell
            metric={m.divYield}
            ticker={data.ticker}
            learnMode={learnMode}
            expanded={expandedMetric === "divYield"}
            onToggle={() => toggleMetric("divYield")}
          />
          <Cell
            metric={m.opRevenue}
            ticker={data.ticker}
            learnMode={learnMode}
            span="col-span-2"
            expanded={expandedMetric === "opRevenue"}
            onToggle={() => toggleMetric("opRevenue")}
          />
          <Cell
            metric={m.cashFlowChange}
            ticker={data.ticker}
            learnMode={learnMode}
            expanded={expandedMetric === "cashFlowChange"}
            onToggle={() => toggleMetric("cashFlowChange")}
          />
          <Cell
            metric={m.assetLiability}
            ticker={data.ticker}
            learnMode={learnMode}
            expanded={expandedMetric === "assetLiability"}
            onToggle={() => toggleMetric("assetLiability")}
          />
        </motion.div>
        </LayoutGroup>

        {/* Disclaimer + data source */}
        <div className="mt-8 border-t border-border pt-4 text-center text-[0.7rem] leading-relaxed text-muted">
          <p>
            <span className="font-semibold text-muted">Educational only — not financial advice.</span>{" "}
            This dashboard explains the numbers so you can make your own informed
            decisions. It does not tell you what to buy or sell.
          </p>
          {data.isMock ? (
            <p className="mt-1">Showing sample data — live market data arrives in a later build phase.</p>
          ) : (
            <p className="mt-1">
              Live data via Financial Modeling Prep · as of{" "}
              {new Date(data.asOf).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
