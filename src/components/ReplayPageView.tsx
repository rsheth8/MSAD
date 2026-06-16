"use client";

import Link from "next/link";
import { NeutralBackdrop } from "@/components/NeutralBackdrop";
import { AccountButton } from "@/components/auth/AccountButton";
import { MarketReplay } from "@/components/replay/MarketReplay";
import { BRAND } from "@/lib/brand";

export function ReplayPageView() {
  return (
    <>
      <NeutralBackdrop />
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/practice" className="text-xs font-medium text-muted hover:text-foreground">
              ← Hypothesis Lab
            </Link>
            <AccountButton />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="rounded-md px-2 py-0.5 text-xs font-bold tracking-wide text-white"
                style={{ background: "var(--accent)" }}
              >
                {BRAND.id}
              </span>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Market Replay
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              A time machine for your judgment. Trade a real, anonymized stretch of history one day at
              a time — blind to the future — then see how your timing stacked up against simply holding.
              The best cure for hindsight bias there is.
            </p>
          </div>
        </header>

        <MarketReplay />

        <p className="mt-8 text-center text-[0.7rem] text-muted-2">
          Educational only — not financial advice. Charts are on the honor system: no peeking.
        </p>
      </main>
    </>
  );
}
