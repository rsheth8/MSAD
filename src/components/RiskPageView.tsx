"use client";

import Link from "next/link";
import { NeutralBackdrop } from "@/components/NeutralBackdrop";
import { AccountButton } from "@/components/auth/AccountButton";
import { RiskXray } from "@/components/risk/RiskXray";
import { BRAND } from "@/lib/brand";

export function RiskPageView() {
  return (
    <>
      <NeutralBackdrop />
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="text-xs font-medium text-muted hover:text-foreground">
              ← Your dashboard
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/settings" className="text-xs font-medium text-muted hover:text-foreground">
                Settings
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
                Portfolio Risk X-ray
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              You make money by not blowing up. Enter what you own and see the hidden risks — how
              concentrated you really are, which sectors you&apos;re betting on, and roughly how much a
              market crash could cost you.
            </p>
          </div>
        </header>

        <RiskXray />

        <p className="mt-8 text-center text-[0.7rem] text-muted-2">
          Educational only — not financial advice. Estimates are rough and backward-looking.
        </p>
      </main>
    </>
  );
}
