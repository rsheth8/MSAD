import type { HTMLAttributes, ReactNode } from "react";

/**
 * White card surface used for every panel in the dashboard.
 * (Named GlassCard historically; now a clean light surface.)
 */
export function GlassCard({
  children,
  className = "",
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`surface rounded-2xl ${className}`} {...props}>
      {children}
    </div>
  );
}
