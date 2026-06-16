"use client";

import type { TrendMetrics, TrendSentiment } from "@/lib/types";
import { TREND_EXPLAINER } from "@/lib/explanations";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import { Explainer } from "./Explainer";

const SENTIMENT_STYLE: Record<TrendSentiment, { color: string; label: string }> = {
  bullish: { color: "var(--up)", label: "Uptrend" },
  bearish: { color: "var(--down)", label: "Downtrend" },
  mixed: { color: "var(--neutral)", label: "Mixed" },
};

function crossLabel(trend: TrendMetrics): string {
  if (trend.sma50 === null || trend.sma200 === null) return "Needs 200d history";
  if (trend.sma50 > trend.sma200) return "Golden cross";
  if (trend.sma50 < trend.sma200) return "Death cross";
  return "MAs aligned";
}

/** Compact trend readout — sits inside the chart panel. */
export function TrendStrip({
  trend,
  currency = "USD",
  learnMode = true,
}: {
  trend: TrendMetrics;
  currency?: string;
  learnMode?: boolean;
}) {
  const style = SENTIMENT_STYLE[trend.sentiment];
  const cross = crossLabel(trend);
  const crossUp = trend.sma50 !== null && trend.sma200 !== null && trend.sma50 > trend.sma200;

  return (
    <div
      id="section-trend"
      className="surface mb-3 rounded-xl px-3 py-2.5 sm:px-4"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted">
            Trend
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide"
            style={{
              color: style.color,
              background: `color-mix(in srgb, ${style.color} 12%, transparent)`,
            }}
          >
            {style.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem]">
          <MaInline label="50d" value={trend.sma50} vsPct={trend.priceVsSma50Pct} currency={currency} />
          <span className="hidden text-border sm:inline" aria-hidden>
            |
          </span>
          <MaInline label="200d" value={trend.sma200} vsPct={trend.priceVsSma200Pct} currency={currency} />
          <span className="hidden text-border sm:inline" aria-hidden>
            |
          </span>
          <span className={`font-medium ${crossUp ? "text-up" : cross === "Death cross" ? "text-down" : "text-muted"}`}>
            {cross}
          </span>
        </div>

        {learnMode && (
          <div className="ml-auto">
            <Explainer content={TREND_EXPLAINER} align="right" id="trend-ma" />
          </div>
        )}
      </div>

      {learnMode && (
        <p className="mt-2 text-[0.65rem] leading-relaxed text-muted">{trend.summary}</p>
      )}
    </div>
  );
}

function MaInline({
  label,
  value,
  vsPct,
  currency,
}: {
  label: string;
  value: number | null;
  vsPct: number | null;
  currency: string;
}) {
  if (value === null) {
    return (
      <span className="text-muted">
        <span className="font-medium text-foreground/80">{label}</span> — n/a
      </span>
    );
  }

  const above = vsPct !== null && vsPct >= 0;
  return (
    <span className="tabular-nums">
      <span className="font-medium text-muted">{label}</span>{" "}
      <span className="font-mono font-semibold text-foreground">{formatCurrency(value, currency)}</span>
      {vsPct !== null && (
        <span className={`ml-1 font-mono text-[0.65rem] ${above ? "text-up" : "text-down"}`}>
          {formatSignedPercent(vsPct)}
        </span>
      )}
    </span>
  );
}
