"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ReportCard } from "@/lib/types";
import { overallGrade, riskRead, type Sentiment } from "@/lib/analysis";
import { gradeMetricBreakdown } from "@/lib/peer-valuation";
import { GRADE_EXPLAINER } from "@/lib/explanations";
import { formatSignedPercent } from "@/lib/format";
import { GlassCard } from "./GlassCard";
import { Explainer } from "./Explainer";

const SENTIMENT_COLOR: Record<Sentiment, string> = {
  good: "var(--up)",
  neutral: "var(--neutral)",
  bad: "var(--down)",
};

const RISK_COLOR = {
  low: "var(--up)",
  medium: "var(--neutral)",
  high: "var(--down)",
} as const;

export function GradePanel({ data, learnMode = true }: { data: ReportCard; learnMode?: boolean }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const grade = overallGrade(data);
  const risk = riskRead(data.beta);
  const breakdown = gradeMetricBreakdown(data);
  const color = SENTIMENT_COLOR[grade.sentiment];

  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setShowBreakdown((o) => !o)}
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 font-display text-4xl font-bold transition-all duration-300 hover:scale-105 hover:brightness-105"
            style={{
              color,
              borderColor: color,
              boxShadow: `0 0 1.5rem -0.3rem ${color}`,
              background: `color-mix(in srgb, ${color} 10%, transparent)`,
            }}
            title="Click to see why"
          >
            {grade.letter}
          </button>
          <div className="sm:hidden">
            <div className="text-[0.7rem] uppercase tracking-wider text-muted">Overall Grade</div>
            <div className="text-sm text-foreground">{grade.summary}</div>
          </div>
        </div>

        <div className="flex-1">
          <div className="hidden sm:block">
            <div className="text-[0.7rem] uppercase tracking-wider text-muted">
              Overall Grade · score {grade.score}/100
              {learnMode && (
                <button type="button" onClick={() => setShowBreakdown((o) => !o)} className="btn-ghost interactive ml-2 px-2 py-0.5 text-[0.65rem]">
                  {showBreakdown ? "Hide why" : "Why this grade?"}
                </button>
              )}
            </div>
            <p className="mt-0.5 text-base text-foreground">{grade.summary}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs">
            {grade.strengths.length > 0 && (
              <div>
                <span className="font-semibold text-up">Strengths: </span>
                <span className="text-muted">{grade.strengths.join(", ")}</span>
              </div>
            )}
            {grade.watchOuts.length > 0 && (
              <div>
                <span className="font-semibold text-down">Watch-outs: </span>
                <span className="text-muted">{grade.watchOuts.join(", ")}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed">
            <span
              className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide"
              style={{
                color: RISK_COLOR[risk.level],
                background: `color-mix(in srgb, ${RISK_COLOR[risk.level]} 12%, transparent)`,
              }}
            >
              {risk.level} risk
            </span>
            <span className="text-muted">{risk.text}</span>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showBreakdown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              <div className="text-[0.65rem] uppercase tracking-wider text-muted">Metric contributions</div>
              {breakdown.map((b) => (
                <div
                  key={b.metric.key}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs ${
                    b.favorable ? "bg-up/5" : "bg-down/5"
                  }`}
                >
                  <span className="font-medium text-foreground">{b.metric.label}</span>
                  <span className="font-mono text-muted">{formatSignedPercent(b.vsIndustryPct)} vs industry</span>
                  {learnMode && <span className="w-full text-muted">{b.read}</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4">
        <Explainer content={GRADE_EXPLAINER} />
      </div>
    </GlassCard>
  );
}
