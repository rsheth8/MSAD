"use client";

import { type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

export function TabPills<T extends string>({
  tabs,
  value,
  onChange,
  layoutId,
  className = "",
  size = "md",
}: {
  tabs: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  /** Unique per tab bar on the page (for sliding indicator) */
  layoutId: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 py-1 text-[0.65rem]" : "px-3 py-1.5 text-xs";

  return (
    <LayoutGroup id={layoutId}>
      <div
        className={`tab-pills surface inline-flex max-w-full flex-wrap gap-0.5 rounded-full p-0.5 font-medium ${className}`}
        role="tablist"
      >
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={`tab-pill-btn relative ${pad} ${active ? "text-foreground" : "text-muted"}`}
            >
              {active && (
                <motion.span
                  layoutId={`${layoutId}-indicator`}
                  className="tab-pill-indicator"
                  transition={{ type: "spring", stiffness: 440, damping: 36 }}
                />
              )}
              <span className="relative z-[1] whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

export function TabPanels({
  activeKey,
  children,
}: {
  activeKey: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
