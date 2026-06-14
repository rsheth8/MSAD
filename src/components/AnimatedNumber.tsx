"use client";

import { useEffect, useState } from "react";
import { animate } from "framer-motion";

/**
 * Counts a number up to `value` on mount and whenever `value` changes, then
 * renders it through `format`. Animating the raw number (not the string) keeps
 * intermediate frames correctly formatted (%, ×, currency, …).
 */
export function AnimatedNumber({
  value,
  format,
  duration = 1.1,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(() => format(value));

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(format(latest)),
    });
    return () => controls.stop();
    // re-run when the target value changes (e.g. new ticker)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
