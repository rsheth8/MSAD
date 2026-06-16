"use client";

import type { NewsTension } from "@/lib/news/types";

const KIND_STYLE = {
  aligned: { color: "var(--up)", label: "Aligned" },
  divergent: { color: "var(--neutral)", label: "Tension" },
  quiet: { color: "var(--muted)", label: "Quiet" },
} as const;

export function NewsFundamentalsTension({ tension }: { tension: NewsTension }) {
  const style = KIND_STYLE[tension.kind];
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{
        borderColor: `color-mix(in srgb, ${style.color} 35%, transparent)`,
        background: `color-mix(in srgb, ${style.color} 8%, transparent)`,
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider"
          style={{ color: style.color }}
        >
          {style.label}
        </span>
        <span className="text-sm font-medium text-foreground">{tension.headline}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{tension.detail}</p>
    </div>
  );
}
