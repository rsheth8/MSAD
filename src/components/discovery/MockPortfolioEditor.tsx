"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrokerageConnect } from "@/components/brokerage/BrokerageConnect";
import type { MockHolding } from "@/lib/discovery/types";
import { setMockPortfolio } from "@/lib/profile/store";
import { playUiClick } from "@/lib/settings";

interface Row {
  ticker: string;
  weight: string;
}

const STARTER: Row[] = [
  { ticker: "AAPL", weight: "40" },
  { ticker: "MSFT", weight: "35" },
  { ticker: "NVDA", weight: "25" },
];

export function MockPortfolioEditor({
  initial,
  onChange,
}: {
  initial?: MockHolding[];
  onChange?: (holdings: MockHolding[]) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial?.length
      ? initial.map((h) => ({ ticker: h.ticker, weight: String(h.weight) }))
      : STARTER,
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initial?.length) {
      setRows(initial.map((h) => ({ ticker: h.ticker, weight: String(h.weight) })));
    }
  }, [initial]);

  function update(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function toHoldings(): MockHolding[] {
    return rows
      .map((r) => ({ ticker: r.ticker.toUpperCase().trim(), weight: Number(r.weight) || 0 }))
      .filter((h) => h.ticker && h.weight > 0);
  }

  function save() {
    const holdings = toHoldings();
    setMockPortfolio(holdings);
    playUiClick();
    onChange?.(holdings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleImport(holdings: { ticker: string; weight: number }[]) {
    setRows(holdings.map((h) => ({ ticker: h.ticker, weight: String(Math.round(h.weight * 10) / 10) })));
    setMockPortfolio(holdings);
    onChange?.(holdings);
    playUiClick();
  }

  return (
    <div className="space-y-3">
      <p className="text-[0.7rem] text-muted">
        Build a practice portfolio here, or{" "}
        <Link href="/risk" className="text-accent hover:underline">
          import real holdings
        </Link>{" "}
        from a linked brokerage for better gap-filling. We never place trades.
      </p>

      <BrokerageConnect onImport={handleImport} />

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={row.ticker}
              onChange={(e) => update(i, { ticker: e.target.value.toUpperCase() })}
              placeholder="TICKER"
              className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 text-sm uppercase outline-none focus:border-accent"
            />
            <input
              value={row.weight}
              onChange={(e) => update(i, { weight: e.target.value.replace(/[^0-9.]/g, "") })}
              placeholder="weight"
              className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className="text-xs text-muted hover:text-down">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setRows((r) => [...r, { ticker: "", weight: "10" }])} className="btn-ghost interactive text-xs">
          + Add holding
        </button>
        <button type="button" onClick={save} className="btn-primary text-xs">
          Save portfolio
        </button>
        {saved && <span className="text-xs text-up">Saved</span>}
      </div>
    </div>
  );
}
