/**
 * The Lens — grounded explanations. Builds a prompt anchored in a stock's real
 * ReportCard so Claude never hallucinates the numbers, then answers at the
 * chosen depth. Falls back to curated static copy when no API key is set.
 */

import type { ReportCard } from "@/lib/types";
import {
  METRIC_EXPLAINERS,
  PRICE_EXPLAINER,
  type ExplainerContent,
} from "@/lib/explanations";
import { DEPTH_META, tierForDepth, type Depth } from "./depth";
import { aiMessage, hasAnthropicKey } from "./client";
import type { ExplainKind, ExplainResponse } from "./types";

export const DISCLAIMER = "Educational only — not financial advice.";

const SYSTEM_RULES = `You are the Lens, the in-app tutor for MSAD (Mishra & Sheth Analysis Dashboard), a tool that teaches people to analyze stocks for themselves.

Hard rules — never break these:
- You are educational ONLY. NEVER tell the user to buy, sell, hold, or which options to trade. Never predict a price target.
- Teach the user to read the signal and decide for themselves. Explain trade-offs, not verdicts.
- Use ONLY the numbers in the provided stock data. Do not invent figures. If something isn't in the data, say it's not shown here.
- Be specific to THIS stock and its actual numbers — never generic boilerplate.
- No preamble ("Sure!", "Great question"). Answer directly. Plain Markdown only, no headings.`;

/** Compact, model-friendly serialization of the facts we can ground on. */
export function groundingFacts(card: ReportCard): string {
  const c = card.changes;
  const metrics = card.metrics
    .map((m) => {
      const vs =
        m.vsIndustryPct === null
          ? "n/a vs peers"
          : `${m.vsIndustryPct >= 0 ? "+" : ""}${m.vsIndustryPct.toFixed(0)}% vs industry avg`;
      return `- ${m.label}: ${m.display} (${vs}; higher is ${m.higherIsBetter ? "better" : "worse"})`;
    })
    .join("\n");
  const first = card.series[0]?.stock ?? 100;
  const last = card.series[card.series.length - 1]?.stock ?? 100;
  const stockYr = ((last - first) / first) * 100;
  const sp0 = card.series[0]?.sp500 ?? 100;
  const spL = card.series[card.series.length - 1]?.sp500 ?? 100;
  const spYr = ((spL - sp0) / sp0) * 100;

  return `STOCK DATA (the only facts you may use):
Company: ${card.name} (${card.ticker}) — ${card.industry}, listed on ${card.exchange}, ${card.currency}.
Price: ${card.price} ${card.currency}. Beta: ${card.beta.toFixed(2)} (1.0 = moves with the market).
Recent change: today ${fmtPct(c.day)}, 1W ${fmtPct(c.week)}, 1M ${fmtPct(c.month)}, 1Y ${fmtPct(c.year)}.
12-month performance (indexed): stock ${fmtPct(stockYr)} vs S&P 500 ${fmtPct(spYr)}.
Implied volatility: ${(card.options.impliedVolatility * 100).toFixed(0)}%.
Metrics vs industry peers:
${metrics}${card.isMock ? "\n(NOTE: these are sample/placeholder values, not live market data.)" : ""}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function userTurn(
  card: ReportCard,
  kind: ExplainKind,
  depth: Depth,
  opts: { metricKey?: string; question?: string; thesis?: string; horizon?: string },
): string {
  const level = DEPTH_META[depth].instruction;
  const t = card.ticker;
  switch (kind) {
    case "metric": {
      const label =
        card.metrics.find((m) => m.key === opts.metricKey)?.label ?? opts.metricKey ?? "this metric";
      return `Explain what ${label} tells us about ${t} specifically, using its actual value and how it compares to peers.\n\n${level}`;
    }
    case "overview":
      return `Give a balanced read of ${t}: its 2-3 biggest strengths and 2-3 things to watch, grounded in the numbers. End with one question the user should ask themselves before deciding anything.\n\n${level}`;
    case "bearcase":
      return `Steel-man the BEAR case for ${t} — the most credible reasons a thoughtful skeptic would be cautious here, drawn from the numbers. This is to fight confirmation bias, not a recommendation.\n\n${level}`;
    case "bullcase":
      return `Steel-man the BULL case for ${t} — the most credible reasons an optimist would be constructive here, drawn from the numbers. This is to balance the bear case, not a recommendation.\n\n${level}`;
    case "price":
      return `Explain what ${t}'s recent price action and volatility (beta) mean, and what they do and don't tell the user. Separate noise from signal.\n\n${level}`;
    case "question":
      return `The user asks about ${t}: "${(opts.question ?? "").slice(0, 500)}"\n\nAnswer using the stock data. If it can't be answered from the data, say so and explain what the user would need to look at.\n\n${level}`;
    case "journal":
      return `The user wrote this investment thesis for ${t}${opts.horizon ? ` (horizon: ${opts.horizon})` : ""}:\n"""${(opts.thesis ?? "").slice(0, 1200)}"""\n\nCritique the QUALITY OF THE REASONING, not whether it will be right. Point out: which claims are supported by the numbers, which are assumptions, what disconfirming evidence they should watch, and one blind spot. Be a supportive coach, not a judge.\n\n${level}`;
    default:
      return `Explain ${t} to the user.\n\n${level}`;
  }
}

/** Curated fallback used when the AI is offline (no ANTHROPIC_API_KEY). */
function staticFallback(
  card: ReportCard,
  kind: ExplainKind,
  metricKey?: string,
): string {
  const fmt = (e: ExplainerContent) => `**${e.title}.** ${e.what} ${e.meaning} *Watch out:* ${e.watch}`;
  if (kind === "metric" && metricKey && METRIC_EXPLAINERS[metricKey]) {
    return fmt(METRIC_EXPLAINERS[metricKey]);
  }
  if (kind === "price") return fmt(PRICE_EXPLAINER);
  if (kind === "overview") {
    const good = card.metrics.filter(
      (m) => m.vsIndustryPct !== null && (m.higherIsBetter ? m.vsIndustryPct! > 0 : m.vsIndustryPct! < 0),
    );
    const watch = card.metrics.filter(
      (m) => m.vsIndustryPct !== null && (m.higherIsBetter ? m.vsIndustryPct! < 0 : m.vsIndustryPct! > 0),
    );
    const list = (ms: typeof card.metrics) => ms.slice(0, 3).map((m) => m.label).join(", ") || "—";
    return `Versus its industry, **${card.name}** looks relatively strong on: ${list(good)}. Keep an eye on: ${list(watch)}. This is a starting point for questions, not a verdict — turn on the AI tutor (add an API key) for a tailored read.`;
  }
  return `The AI tutor is offline right now. Add an ANTHROPIC_API_KEY to enable tailored, grounded explanations of ${card.ticker} at your chosen depth.`;
}

export async function explain(
  card: ReportCard,
  kind: ExplainKind,
  depth: Depth,
  opts: { metricKey?: string; question?: string; thesis?: string; horizon?: string } = {},
): Promise<ExplainResponse> {
  if (!hasAnthropicKey()) {
    return {
      answer: staticFallback(card, kind, opts.metricKey),
      source: "static",
      depth,
      kind,
      disclaimer: DISCLAIMER,
    };
  }

  const answer = await aiMessage({
    tier: tierForDepth(depth),
    system: [
      { type: "text", text: SYSTEM_RULES },
      // The grounded facts are reused across every metric/ask/bear-case in a
      // session — cache them so repeat calls for the same stock are cheap.
      { type: "text", text: groundingFacts(card), cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userTurn(card, kind, depth, opts) }],
    maxTokens: depth === "quant" ? 900 : 600,
  });

  return { answer, source: "ai", depth, kind, disclaimer: DISCLAIMER };
}
