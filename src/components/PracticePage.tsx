"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NeutralBackdrop } from "@/components/NeutralBackdrop";
import { AccountButton } from "@/components/auth/AccountButton";
import { HypothesisLab } from "@/components/backtest/HypothesisLab";
import { BRAND } from "@/lib/brand";

export function PracticePage() {
  const [initialTicker, setInitialTicker] = useState("AAPL");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("ticker");
    if (t) setInitialTicker(t.toUpperCase());
    setReady(true);
  }, []);

  return (
    <>
      <NeutralBackdrop />
      <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="text-xs font-medium text-muted hover:text-foreground">
              ← Your dashboard
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/replay" className="btn-ghost interactive text-xs">
                Market Replay
              </Link>
              <AccountButton />
            </div>
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
                Hypothesis Lab
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Have a theory? Test it against real history before you risk a cent. Compare your rule to
              simply buying and holding — and to the S&amp;P 500 — then read the honest caveats about
              what a backtest can and can&apos;t tell you.
            </p>
          </div>
        </header>

        {ready && <HypothesisLab key={initialTicker} initialTicker={initialTicker} />}

        <p className="mt-8 text-center text-[0.7rem] text-muted-2">
          Educational only — not financial advice. Backtests describe the past, not the future.
        </p>
      </main>
    </>
  );
}
