"use client";

import Link from "next/link";
import type { ScreenerResultRow } from "@/lib/screener/types";
import { formatMarketCap } from "@/lib/screener/presets";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import { getWatchlist, setWatchlist } from "@/lib/watchlist";
import { playUiClick } from "@/lib/settings";

export function ScreenerResults({
  rows,
  title,
  isMock,
  onWatchlisted,
}: {
  rows: ScreenerResultRow[];
  title: string;
  isMock?: boolean;
  onWatchlisted?: () => void;
}) {
  const offCatalog = rows.filter((r) => !r.inCatalog).length;

  function addAllToWatchlist() {
    const symbols = rows.map((r) => r.symbol);
    setWatchlist([...getWatchlist(), ...symbols]);
    playUiClick();
    onWatchlisted?.();
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">
            {title} · {rows.length} stocks
          </h2>
          {offCatalog > 0 && (
            <p className="mt-0.5 text-[0.65rem] text-accent">
              {offCatalog} not on the home dashboard — fresh discovery
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isMock && (
            <span className="text-[0.65rem] text-muted">Sample data — add FMP_API_KEY for live</span>
          )}
          <button type="button" onClick={addAllToWatchlist} className="btn-ghost interactive text-xs">
            ★ Add all to watchlist
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[0.65rem] uppercase tracking-wider text-muted">
              <th className="pb-2 pr-3">Ticker</th>
              <th className="pb-2 pr-3">Price</th>
              <th className="pb-2 pr-3">Mkt cap</th>
              <th className="pb-2 pr-3">P/E</th>
              <th className="pb-2 pr-3">vs peers</th>
              <th className="pb-2 pr-3">ROE</th>
              <th className="pb-2 pr-3">β</th>
              <th className="pb-2">Sector</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.symbol}
                className="border-b border-border/60 transition-colors hover:bg-accent/5"
              >
                <td className="py-2.5 pr-3">
                  <Link
                    href={`/stock/${r.symbol}`}
                    className="font-mono font-bold text-accent hover:underline"
                  >
                    {r.symbol}
                  </Link>
                  <div className="max-w-[160px] truncate text-[0.65rem] text-muted">{r.name}</div>
                  {!r.inCatalog && (
                    <span className="mt-1 inline-block rounded-full bg-accent/10 px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide text-accent">
                      New to AMSAD
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-3 font-mono">{formatCurrency(r.price)}</td>
                <td className="py-2.5 pr-3 font-mono">{formatMarketCap(r.marketCap)}</td>
                <td className="py-2.5 pr-3 font-mono">{r.pe != null ? r.pe.toFixed(1) : "—"}</td>
                <td className="py-2.5 pr-3 font-mono">
                  {r.peVsIndustryPct != null ? (
                    <span className={r.peVsIndustryPct > 0 ? "text-down" : "text-up"}>
                      {formatSignedPercent(r.peVsIndustryPct)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2.5 pr-3 font-mono">
                  {r.roe != null ? `${(r.roe * 100).toFixed(0)}%` : "—"}
                </td>
                <td className="py-2.5 pr-3 font-mono">{r.beta.toFixed(2)}</td>
                <td className="py-2.5">
                  <div className="text-muted">{r.sector}</div>
                  {r.industry !== "—" && (
                    <div className="max-w-[120px] truncate text-[0.6rem] text-muted-2">{r.industry}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-center text-[0.65rem] text-muted">
        Educational discovery only — not a recommendation to buy or sell.
      </p>
    </section>
  );
}
