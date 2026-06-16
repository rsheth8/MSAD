"use client";

import { useCallback, useEffect, useState } from "react";
import type { FmpUsageSnapshot } from "@/lib/fmp/usage";

const POLL_MS = 20_000;

const TIER_STYLES: Record<FmpUsageSnapshot["tier"], { bar: string; text: string }> = {
  ok: { bar: "bg-up", text: "text-muted" },
  warn: { bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" },
  critical: { bar: "bg-down", text: "text-down" },
  exhausted: { bar: "bg-down", text: "text-down" },
};

function formatReset(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

export function FmpApiBudget() {
  const [usage, setUsage] = useState<FmpUsageSnapshot | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/fmp/usage", { cache: "no-store" });
      const data = await res.json();
      setUsage(data.usage ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("msad:fmp-usage", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("msad:fmp-usage", onFocus);
    };
  }, [refresh]);

  if (!usage) return null;

  const styles = TIER_STYLES[usage.tier];
  const remaining = Math.max(0, usage.limit - usage.used);

  return (
    <section
      className="mb-6 rounded-xl border border-border/60 bg-background/30 px-4 py-3"
      aria-label="FMP API budget"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-2">
            Market data API budget
          </h2>
          <p className={`mt-0.5 text-xs font-medium ${styles.text}`}>
            {usage.tier === "exhausted"
              ? `Daily limit reached (${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()} calls)`
              : `${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()} calls today`}
            {usage.tier !== "exhausted" && remaining > 0 && (
              <span className="font-normal text-muted"> · {remaining.toLocaleString()} left</span>
            )}
          </p>
        </div>
        <span className="text-[0.65rem] text-muted-2">
          Resets {formatReset(usage.resetsAt)}
        </span>
      </div>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/8"
        role="progressbar"
        aria-valuenow={usage.used}
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-label={`${usage.pct}% of daily FMP API budget used`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
          style={{ width: `${Math.min(100, usage.pct)}%` }}
        />
      </div>

      {usage.tier === "warn" && (
        <p className="mt-2 text-[0.65rem] text-amber-600 dark:text-amber-400">
          Approaching your daily FMP limit — heavy actions like refreshing the research queue use many
          calls. Lighter browsing is fine.
        </p>
      )}
      {usage.tier === "critical" && (
        <p className="mt-2 text-[0.65rem] text-down">
          Almost out of API calls for today. A research queue refresh may fail — wait for the reset or
          upgrade your FMP plan.
        </p>
      )}
      {usage.tier === "exhausted" && (
        <p className="mt-2 text-[0.65rem] text-down">
          No FMP calls left today. Live quotes, screeners, and discovery will fall back or error until
          the counter resets. Set a higher <span className="font-mono">FMP_DAILY_LIMIT</span> in{" "}
          <span className="font-mono">.env.local</span> if you&apos;re on a paid plan.
        </p>
      )}
      {!usage.durable && usage.tier !== "exhausted" && (
        <p className="mt-2 text-[0.65rem] text-muted-2">
          Counter is in-memory only (dev mode) — restarts the dev server reset this tally.
        </p>
      )}
    </section>
  );
}

/** Notify budget banner to refresh after FMP-heavy actions. */
export function notifyFmpUsageChanged(): void {
  window.dispatchEvent(new Event("msad:fmp-usage"));
}
