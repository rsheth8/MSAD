"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const METRIC_KEYS = ["roe", "pe", "evEbitda", "divYield", "opRevenue", "cashFlowChange", "assetLiability"];

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "/" && !typing) {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search"], input[aria-label*="Search"], input[type="text"]');
        input?.focus();
      }

      if (e.key === "Escape") {
        (document.activeElement as HTMLElement)?.blur();
        window.dispatchEvent(new CustomEvent("amsad-close-panels"));
      }

      if (!typing && e.key >= "1" && e.key <= "7") {
        const idx = Number(e.key) - 1;
        const key = METRIC_KEYS[idx];
        if (key) {
          window.dispatchEvent(new CustomEvent("amsad-expand-metric", { detail: key }));
        }
      }

      if (e.key === "h" && !typing && !e.metaKey && !e.ctrlKey) {
        alert(
          "Shortcuts:\n/ — focus search\n1–7 — expand metric cards (on report)\nEsc — blur\nh — this help",
        );
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
