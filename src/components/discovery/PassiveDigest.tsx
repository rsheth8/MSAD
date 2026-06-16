"use client";

import Link from "next/link";
import { dueForResolution } from "@/lib/profile/calibration";
import type { UserProfile } from "@/lib/profile/types";

/** Passive in-dashboard digest — no push notifications. */
export function PassiveDigest({ profile }: { profile: UserProfile }) {
  const due = dueForResolution(profile.predictions);
  const unreviewed = profile.journal.filter((e) => !e.reviewedAt);
  const queueCount = profile.researchQueue?.length ?? 0;
  const lastVisit = profile.lastDashboardVisit
    ? new Date(profile.lastDashboardVisit)
    : null;
  const refreshed = profile.queueRefreshedAt
    ? new Date(profile.queueRefreshedAt)
    : null;
  const newSinceVisit =
    refreshed && lastVisit && refreshed > lastVisit ? queueCount : 0;

  const items: { label: string; href?: string; tone?: "accent" | "neutral" }[] = [];

  if (newSinceVisit > 0) {
    items.push({
      label: `${newSinceVisit} research queue ${newSinceVisit === 1 ? "match" : "matches"} since your last visit`,
      tone: "accent",
    });
  } else if (queueCount > 0 && !profile.queueRefreshedAt) {
    items.push({ label: `${queueCount} names in your research queue — tap Refresh when ready` });
  }

  if (due.length > 0) {
    items.push({
      label: `${due.length} prediction${due.length === 1 ? "" : "s"} ready to score`,
      href: "/dashboard",
    });
  }

  if (unreviewed.length > 0) {
    items.push({
      label: `${unreviewed.length} journal ${unreviewed.length === 1 ? "thesis" : "theses"} awaiting review`,
      href: "/dashboard",
    });
  }

  if (!profile.investorProfile?.profileComplete) {
    items.push({
      label: "Set your investor criteria for personalized discovery",
      href: "/settings",
      tone: "accent",
    });
  }

  if ((profile.mockPortfolio?.length ?? 0) === 0) {
    items.push({
      label: "Add a mock portfolio for gap-aware suggestions",
      href: "/settings",
    });
  }

  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border border-border/60 bg-background/30 px-4 py-3">
      <h2 className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-2">
        Since you were here
      </h2>
      <ul className="mt-2 space-y-1.5">
        {items.slice(0, 4).map((item) => (
          <li key={item.label} className="text-xs text-muted">
            {item.href ? (
              <Link
                href={item.href}
                className={item.tone === "accent" ? "text-accent hover:underline" : "hover:text-foreground"}
              >
                {item.label}
              </Link>
            ) : (
              <span className={item.tone === "accent" ? "text-accent" : undefined}>{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
