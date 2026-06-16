"use client";

import { DEPTHS, DEPTH_META } from "@/lib/ai/depth";
import { playUiClick } from "@/lib/settings";
import { useDepth } from "./DepthProvider";

/**
 * The one control that serves a beginner and a quant. Three stops; everything
 * grounded-AI re-renders at the chosen level. Replaces the old Learn/Pro pair.
 */
export function DepthSlider({ compact = false }: { compact?: boolean }) {
  const { depth, setDepth } = useDepth();

  return (
    <div
      className="surface flex items-center rounded-full p-0.5 text-xs font-medium"
      role="group"
      aria-label="Explanation depth"
      title={DEPTH_META[depth].blurb}
    >
      {DEPTHS.map((d) => {
        const active = depth === d;
        return (
          <button
            key={d}
            type="button"
            onClick={() => {
              setDepth(d);
              playUiClick();
            }}
            aria-pressed={active}
            className={`btn-pill rounded-full px-3 py-1 ${
              active ? "btn-pill-active" : "btn-pill-inactive"
            }`}
          >
            {DEPTH_META[d].label}
            {!compact && active && (
              <span className="ml-1 hidden text-[0.6rem] font-normal opacity-70 sm:inline">
                · {DEPTH_META[d].blurb}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
