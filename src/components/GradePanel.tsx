import type { ReportCard } from "@/lib/types";
import { overallGrade, riskRead, type Sentiment } from "@/lib/analysis";
import { GRADE_EXPLAINER } from "@/lib/explanations";
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

/** Beginner's 5-second gist: an A–F grade, a summary, strengths/watch-outs, risk. */
export function GradePanel({ data }: { data: ReportCard }) {
  const grade = overallGrade(data);
  const risk = riskRead(data.beta);
  const color = SENTIMENT_COLOR[grade.sentiment];

  return (
    <GlassCard className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* Grade badge */}
        <div className="flex items-center gap-4">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 font-display text-4xl font-bold"
            style={{
              color,
              borderColor: color,
              boxShadow: `0 0 1.5rem -0.3rem ${color}`,
              background: `color-mix(in srgb, ${color} 10%, transparent)`,
            }}
          >
            {grade.letter}
          </div>
          <div className="sm:hidden">
            <div className="text-[0.7rem] uppercase tracking-wider text-muted">
              Overall Grade
            </div>
            <div className="text-sm text-foreground">{grade.summary}</div>
          </div>
        </div>

        <div className="flex-1">
          <div className="hidden sm:block">
            <div className="text-[0.7rem] uppercase tracking-wider text-muted">
              Overall Grade · score {grade.score}/100
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

          {/* Risk in plain words */}
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

      <div className="mt-4">
        <Explainer content={GRADE_EXPLAINER} />
      </div>
    </GlassCard>
  );
}
