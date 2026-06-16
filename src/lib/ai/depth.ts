/**
 * Depth — the one control that serves a total beginner and a quant from the
 * same UI. It re-renders every explanation, AI answer, and metric "read" at the
 * chosen level. Replaces the old binary Learn/Pro toggle.
 */

export type Depth = "learn" | "analyst" | "quant";

export const DEPTHS: Depth[] = ["learn", "analyst", "quant"];

export const DEPTH_META: Record<
  Depth,
  { label: string; blurb: string; /** prompt instruction injected into the AI */ instruction: string }
> = {
  learn: {
    label: "Learn",
    blurb: "Plain English, zero jargon",
    instruction:
      "Audience: a complete beginner who has never invested. Use plain, friendly language and short sentences. Define any unavoidable term in-line. Use a concrete everyday analogy where it helps. Never use formulas or Greek letters. Keep it to ~3 short sentences.",
  },
  analyst: {
    label: "Analyst",
    blurb: "Standard finance terms",
    instruction:
      "Audience: a self-directed retail investor comfortable with standard finance vocabulary (P/E, margins, cash flow). Be precise and reference the specific numbers for this stock. You may name comparisons to peers and history. ~3-4 sentences, no hand-holding but no heavy math.",
  },
  quant: {
    label: "Quant",
    blurb: "Rigorous, with the math",
    instruction:
      "Audience: an experienced analyst. Be rigorous and quantitative. Decompose drivers (e.g. DuPont for ROE), cite the exact figures, note quality/limitations of the metric, and reference what the market is implying. You may use formulas and ratios. Dense but accurate; ~4-5 sentences.",
  },
};

/** The model tier each depth uses — deeper answers get a stronger model. */
export function tierForDepth(depth: Depth): "fast" | "smart" {
  return depth === "learn" ? "fast" : "smart";
}

export function isDepth(v: unknown): v is Depth {
  return v === "learn" || v === "analyst" || v === "quant";
}

export function normalizeDepth(v: unknown): Depth {
  return isDepth(v) ? v : "learn";
}

/**
 * Back-compat bridge: existing components take a boolean `learnMode`. Treat
 * anything below Quant as "still in guided/learn mode" so the curated copy and
 * learning-path keep showing until the user opts into the densest level.
 */
export function learnModeFromDepth(depth: Depth): boolean {
  return depth !== "quant";
}
