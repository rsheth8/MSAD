"use client";

import { type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Metric } from "@/lib/types";
import { formatMetricDisplay, formatSignedPercent } from "@/lib/format";
import { metricRead } from "@/lib/analysis";
import { METRIC_EXPLAINERS } from "@/lib/explanations";
import { AnimatedNumber } from "./AnimatedNumber";
import { GlassCard } from "./GlassCard";
import { MetricTrendBadge } from "./MetricTrendBadge";

/**
 * One metric tile: label, value, a "vs industry" pill, and — for beginners —
 * a plain-English read plus an expandable "What is this?" explainer.
 *
 * When `expanded` / `onToggle` are provided, only one card should be expanded
 * at a time (controlled by the parent accordion).
 */
export function MetricCard({
  metric,
  ticker,
  learnMode = true,
  expanded = false,
  onToggle,
}: {
  metric: Metric;
  ticker: string;
  learnMode?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
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
  const expandable = learnMode && !!onToggle && !!explainer;

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="w-full"
    >
      <GlassCard
        className={`surface-interactive flex w-full flex-col p-4 ${
          expandable ? "cursor-pointer" : ""
        } ${expanded ? "ring-2 ring-accent/25" : ""}`}
        {...(expandable
          ? {
              onClick: onToggle,
              onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggle?.();
                }
              },
              role: "button" as const,
              tabIndex: 0,
              "aria-expanded": expanded,
            }
          : {})}
      >
        <div className="text-[0.7rem] font-medium uppercase tracking-wider text-muted">{label}</div>
        <div className="mt-1 font-mono text-2xl font-semibold text-foreground tabular-nums">
          {value === null ? (
            display
          ) : (
            <AnimatedNumber value={value} format={(n) => formatMetricDisplay(metric.key, n)} />
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

        {learnMode && read && !expandable && (
          <p className="mt-3 text-xs leading-relaxed text-muted">{read}</p>
        )}

        {expandable && !expanded && (
          <div className="mt-3 flex items-center justify-between text-[0.65rem] font-medium text-muted">
            <span>Tap to learn more</span>
            <motion.span animate={{ rotate: 0 }} className="text-accent">
              ↓
            </motion.span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {expandable && expanded && explainer && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                {read && <p className="text-xs leading-relaxed text-muted">{read}</p>}
                <MetricTrendBadge ticker={ticker} metricKey={metric.key} />
                <div className="space-y-2 rounded-xl border border-border bg-background p-3 text-xs leading-relaxed">
                  <div>
                    <p className="font-semibold text-foreground">What it is</p>
                    <p className="text-muted">{explainer.what}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">What it means</p>
                    <p className="text-muted">{explainer.meaning}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-accent">Watch out</p>
                    <p className="text-muted">{explainer.watch}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle?.();
                  }}
                  className="btn-ghost interactive text-[0.65rem]"
                >
                  Collapse ↑
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}
