"use client";

import { motion } from "framer-motion";
import type { Metric } from "@/lib/types";
import { formatMetricDisplay, formatSignedPercent } from "@/lib/format";
import { metricRead } from "@/lib/analysis";
import { METRIC_EXPLAINERS } from "@/lib/explanations";
import { AnimatedNumber } from "./AnimatedNumber";
import { Explainer } from "./Explainer";
import { GlassCard } from "./GlassCard";

/**
 * One metric tile: label, value, a "vs industry" pill, and — for beginners —
 * a plain-English read plus an expandable "What is this?" explainer.
 *
 * Sentiment: a metric is favorable when the direction of its difference from
 * the industry average matches `higherIsBetter` (e.g. a P/E *below* industry
 * is good because higher P/E is not better).
 */
export function MetricCard({
  metric,
  learnMode = true,
}: {
  metric: Metric;
  learnMode?: boolean;
}) {
  const { label, display, vsIndustryPct, higherIsBetter, value } = metric;
  const unavailable = value === null || vsIndustryPct === null;

  const favorable =
    vsIndustryPct === null ? null : vsIndustryPct > 0 === higherIsBetter;

  const pillClass =
    favorable === null
      ? "text-muted border-border"
      : favorable
        ? "text-up border-up/30 bg-up/10"
        : "text-down border-down/30 bg-down/10";

  const read = metricRead(metric);
  const explainer = METRIC_EXPLAINERS[metric.key];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="h-full"
    >
      <GlassCard className="flex h-full flex-col p-4 transition-shadow duration-300 hover:[box-shadow:var(--shadow-card-hover)]">
        <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted">
          {label}
        </div>
        <div className="mt-1 font-mono text-2xl font-semibold text-foreground tabular-nums">
          {value === null ? (
            display
          ) : (
            <AnimatedNumber
              value={value}
              format={(n) => formatMetricDisplay(metric.key, n)}
            />
          )}
        </div>
        <div
          className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${pillClass}`}
        >
          {unavailable ? (
            <span>vs industry — N/A</span>
          ) : (
            <>
              <span aria-hidden>{favorable ? "▲" : "▼"}</span>
              <span>{formatSignedPercent(vsIndustryPct)} vs industry</span>
            </>
          )}
        </div>

        {learnMode && read && (
          <p className="mt-3 text-xs leading-relaxed text-muted">{read}</p>
        )}

        {explainer && (
          <div className="mt-auto pt-3">
            <Explainer content={explainer} />
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
