"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlassCard } from "./GlassCard";

export function CollapsibleSection({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  preview,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  preview?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;

  function setOpen(next: boolean) {
    onOpenChange?.(next);
    if (controlledOpen === undefined) setInternalOpen(next);
  }

  return (
    <GlassCard className={`overflow-hidden p-6 sm:p-8 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="btn-section group -mx-1 rounded-xl px-1 py-1"
      >
        <div className="flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-bold tracking-tight text-foreground">{title}</h3>
            {badge}
          </div>
          {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="ml-3 shrink-0 text-muted transition-colors group-hover:text-foreground"
          aria-hidden
        >
          ▼
        </motion.span>
      </button>

      {!open && preview && (
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          className="mt-4 border-t border-border pt-4"
        >
          {preview}
        </motion.div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-6 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
