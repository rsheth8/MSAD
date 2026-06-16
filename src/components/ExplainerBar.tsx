"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ExplainerContent } from "@/lib/explanations";
import { Chevron } from "./Chevron";

const ease = [0.22, 1, 0.36, 1] as const;

export function ExplainerBar({
  items,
  align = "right",
}: {
  items: readonly { id: string; label: string; content: ExplainerContent }[];
  align?: "left" | "right";
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = items.find((item) => item.id === openId);

  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <AnimatePresence mode="wait" initial={false}>
        {active ? (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.26, ease }}
            className="text-left"
          >
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="btn-ghost interactive mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.65rem]"
            >
              <Chevron open={false} size={12} className="-scale-x-100" />
              Back
            </button>

            <div className="space-y-2 rounded-xl border border-border bg-background p-3 text-xs leading-relaxed">
              <p className="font-semibold text-foreground">{active.content.title}</p>
              <div>
                <p className="font-semibold text-foreground">What it is</p>
                <p className="text-muted">{active.content.what}</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">What it means</p>
                <p className="text-muted">{active.content.meaning}</p>
              </div>
              <div>
                <p className="font-semibold text-accent">Watch out</p>
                <p className="text-muted">{active.content.watch}</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="triggers"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease }}
            className={`flex flex-wrap gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenId(item.id)}
                className="btn-ghost interactive inline-flex items-center gap-1 px-2.5 py-1 text-[0.65rem]"
              >
                <span aria-hidden className="text-accent">
                  ⓘ
                </span>
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
