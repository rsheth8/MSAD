"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ExplainerContent } from "@/lib/explanations";
import { useExplainerGroup } from "./ExplainerGroup";

/**
 * A small "What is this?" disclosure. Collapsed by default so the dashboard
 * stays clean; a confused user clicks to reveal a plain-English explanation.
 * Pass `id` inside an ExplainerGroup to accordion with sibling explainers.
 */
export function Explainer({
  content,
  align = "left",
  id,
  open: controlledOpen,
  onOpenChange,
}: {
  content: ExplainerContent;
  align?: "left" | "right";
  id?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const group = useExplainerGroup();
  const [localOpen, setLocalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const groupOpen = group && id ? group.openId === id : false;
  const open = isControlled ? controlledOpen : group && id ? groupOpen : localOpen;

  function toggle() {
    if (isControlled) {
      onOpenChange?.(!controlledOpen);
      return;
    }
    if (group && id) {
      group.setOpenId(groupOpen ? null : id);
      return;
    }
    setLocalOpen((o) => !o);
  }

  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="btn-ghost interactive inline-flex items-center gap-1 px-2.5 py-1 text-[0.65rem]"
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
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
