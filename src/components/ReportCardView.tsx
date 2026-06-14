"use client";

import { motion } from "framer-motion";
import type { Metric, ReportCard } from "@/lib/types";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import { CHART_EXPLAINER, PRICE_EXPLAINER } from "@/lib/explanations";
import { AnimatedNumber } from "./AnimatedNumber";
import { Explainer } from "./Explainer";
import { GlassCard } from "./GlassCard";
import { GradePanel } from "./GradePanel";
import { MetricCard } from "./MetricCard";
import { StockChart } from "./StockChart";

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
  learnMode,
  span = "",
}: {
  metric: Metric;
  learnMode: boolean;
  span?: string;
}) {
  return (
    <div className={`h-full ${span}`}>
      <MetricCard metric={metric} learnMode={learnMode} />
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

  return (
    <motion.div key={data.ticker} initial="hidden" animate="show" className="w-full">
      <GlassCard className="overflow-hidden p-6 sm:p-8">
        {/* Header */}
        <motion.div variants={fadeUp} custom={0} className="text-center">
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
        <motion.div variants={fadeUp} custom={2} className="mt-6">
          <GradePanel data={data} />
        </motion.div>

        {/* Chart hero */}
        <motion.div variants={fadeUp} custom={3} className="mt-4">
          <GlassCard className="flex h-72 flex-col p-4 sm:h-80">
            <div className="mb-2 text-center text-xs uppercase tracking-wider text-muted">
              12-Month Performance · Stock vs S&amp;P 500
            </div>
            <div className="min-h-0 flex-1">
              <StockChart series={data.series} />
            </div>
          </GlassCard>
          <div className="mt-2 text-center">
            <Explainer content={CHART_EXPLAINER} />
          </div>
        </motion.div>

        {/* Bento metrics — varied sizes */}
        <motion.div
          variants={fadeUp}
          custom={4}
          className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <Cell metric={m.roe} learnMode={learnMode} />
          <Cell metric={m.pe} learnMode={learnMode} />
          <Cell metric={m.evEbitda} learnMode={learnMode} />
          <Cell metric={m.divYield} learnMode={learnMode} />
          <Cell metric={m.opRevenue} learnMode={learnMode} span="col-span-2" />
          <Cell metric={m.cashFlowChange} learnMode={learnMode} />
          <Cell metric={m.assetLiability} learnMode={learnMode} />
        </motion.div>

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
