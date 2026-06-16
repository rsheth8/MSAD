"use client";

import { motion, type MotionProps } from "framer-motion";

/** Animated chevron for expand/collapse — points right when closed, down when open. */
export function Chevron({
  open,
  className = "",
  size = 16,
  ...motionProps
}: {
  open: boolean;
  className?: string;
  size?: number;
} & Omit<MotionProps, "animate" | "children">) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      animate={{ rotate: open ? 90 : 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`shrink-0 text-muted ${className}`}
      {...motionProps}
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}
