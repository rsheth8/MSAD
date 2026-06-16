"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { requestExplain } from "@/lib/ai/request";
import type { ExplainKind, ExplainResponse } from "@/lib/ai/types";
import { DEPTH_META } from "@/lib/ai/depth";
import { useDepth } from "./DepthProvider";
import { DepthSlider } from "./DepthSlider";
import { Markish } from "./Markish";

const QUICK: { kind: ExplainKind; label: string; hint: string }[] = [
  { kind: "overview", label: "Plain-English read", hint: "Strengths & watch-outs" },
  { kind: "bearcase", label: "Make the bear case", hint: "Fight your own bias" },
  { kind: "bullcase", label: "Make the bull case", hint: "The other side" },
  { kind: "price", label: "What's the price saying?", hint: "Signal vs noise" },
];

/**
 * The Lens on a stock page: grounded AI tutor. Quick actions + free-form Q&A,
 * all re-answered at the user's chosen depth. Never gives buy/sell advice.
 */
export function AskPanel({ ticker }: { ticker: string }) {
  const { depth } = useDepth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [active, setActive] = useState<ExplainKind | null>(null);
  const [q, setQ] = useState("");

  async function run(kind: ExplainKind, question?: string) {
    setBusy(true);
    setError(null);
    setActive(kind);
    try {
      const res = await requestExplain({ ticker, depth, kind, question });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  function onAsk(e: React.FormEvent) {
    e.preventDefault();
    const question = q.trim();
    if (!question || busy) return;
    run("question", question);
  }

  return (
    <section className="surface rounded-2xl p-5" aria-label="AI tutor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-lg text-sm font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            ✦
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold text-foreground">Ask the Lens</h2>
            <p className="text-[0.7rem] text-muted">
              Grounded in {ticker}&apos;s real numbers · {DEPTH_META[depth].label} depth
            </p>
          </div>
        </div>
        <DepthSlider compact />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK.map((a) => (
          <button
            key={a.kind}
            type="button"
            disabled={busy}
            onClick={() => run(a.kind)}
            title={a.hint}
            className={`btn-chip interactive ${
              active === a.kind ? "btn-chip-active" : "btn-chip-inactive"
            } disabled:opacity-50`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <form onSubmit={onAsk} className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Ask anything about ${ticker}…`}
          className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent"
          aria-label={`Ask anything about ${ticker}`}
        />
        <button type="submit" disabled={busy || !q.trim()} className="btn-primary disabled:opacity-50">
          Ask
        </button>
      </form>

      <AnimatePresence initial={false}>
        {(busy || result || error) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-xl border border-border bg-background p-4 text-sm leading-relaxed">
              {busy && <p className="animate-pulse text-muted">Thinking about {ticker}…</p>}
              {error && !busy && <p className="text-down">{error}</p>}
              {result && !busy && (
                <>
                  <Markish text={result.answer} className="text-foreground/90" />
                  <p className="mt-3 flex items-center gap-2 text-[0.65rem] text-muted-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-medium ${
                        result.source === "ai"
                          ? "bg-accent/15 text-accent"
                          : "bg-foreground/8 text-muted"
                      }`}
                    >
                      {result.source === "ai" ? "AI · grounded" : "offline · curated"}
                    </span>
                    {result.disclaimer}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
