"use client";

import type { ReactNode } from "react";
import { FILTER_EXPLAINERS } from "@/lib/screener/explainers";
import { Explainer } from "@/components/Explainer";
import { ExplainerGroup } from "@/components/ExplainerGroup";

export function FilterLabel({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  const content = FILTER_EXPLAINERS[id];
  return (
    <label className="block text-xs">
      <span className="mb-1 flex flex-wrap items-center gap-1 text-muted">
        {label}
        {content && <Explainer content={content} id={`filter-${id}`} />}
      </span>
      {children}
    </label>
  );
}

export function ProFilterExplainerGroup({ children }: { children: ReactNode }) {
  return <ExplainerGroup>{children}</ExplainerGroup>;
}
