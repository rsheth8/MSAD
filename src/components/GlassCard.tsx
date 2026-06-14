import type { ReactNode } from "react";

/**
 * White card surface used for every panel in the dashboard.
 * (Named GlassCard historically; now a clean light surface.)
 */
export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`surface rounded-2xl ${className}`}>{children}</div>;
}
