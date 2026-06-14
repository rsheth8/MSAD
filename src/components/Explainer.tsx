"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ExplainerContent } from "@/lib/explanations";

/**
 * A small "What is this?" disclosure. Collapsed by default so the dashboard
 * stays clean; a confused user clicks to reveal a plain-English explanation.
 */
export function Explainer({
  content,
  align = "left",
}: {
  content: ExplainerContent;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[0.65rem] font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
      >
        <span aria-hidden className="text-accent">
          ⓘ
        </span>
        {open ? "Hide" : "What is this?"}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 rounded-xl border border-border bg-background p-3 text-left text-xs leading-relaxed">
              <div>
                <p className="font-semibold text-foreground">What it is</p>
                <p className="text-muted">{content.what}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">What it means</p>
                <p className="text-muted">{content.meaning}</p>
              </div>
              <div>
                <p className="font-semibold text-accent">Watch out</p>
                <p className="text-muted">{content.watch}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
