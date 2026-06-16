"use client";

import type { AnalystConsensus } from "@/lib/news/types";

const MOOD_COLOR = {
  bullish: "var(--up)",
  neutral: "var(--neutral)",
  bearish: "var(--down)",
} as const;

export function AnalystSentimentCard({
  analyst,
  learnMode = true,
}: {
  analyst: AnalystConsensus;
  learnMode?: boolean;
}) {
  const total =
    analyst.strongBuy + analyst.buy + analyst.hold + analyst.sell + analyst.strongSell;
  const segments = [
    { key: "strongBuy", label: "Strong buy", count: analyst.strongBuy, color: "var(--up)" },
    { key: "buy", label: "Buy", count: analyst.buy, color: "color-mix(in srgb, var(--up) 70%, var(--neutral))" },
    { key: "hold", label: "Hold", count: analyst.hold, color: "var(--neutral)" },
    { key: "sell", label: "Sell", count: analyst.sell, color: "color-mix(in srgb, var(--down) 70%, var(--neutral))" },
    { key: "strongSell", label: "Strong sell", count: analyst.strongSell, color: "var(--down)" },
  ].filter((s) => s.count > 0);

  return (
    <div className="rounded-xl border border-border bg-foreground/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">
          Analyst consensus
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide"
          style={{
            color: MOOD_COLOR[analyst.mood],
            background: `color-mix(in srgb, ${MOOD_COLOR[analyst.mood]} 14%, transparent)`,
          }}
        >
          {analyst.consensus}
        </span>
      </div>

      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-border/60">
        {segments.map((s) => (
          <div
            key={s.key}
            title={`${s.label}: ${s.count}`}
            style={{
              width: `${(s.count / total) * 100}%`,
              background: s.color,
            }}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] text-muted">
        {segments.map((s) => (
          <span key={s.key}>
            {s.label} <span className="font-mono text-foreground">{s.count}</span>
          </span>
        ))}
      </div>

      {learnMode && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Wall Street ratings summarize what analysts think — they can lag reality and
          don&apos;t replace your own research.
        </p>
      )}
    </div>
  );
}
