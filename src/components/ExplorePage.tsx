"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SCREENER_SECTORS, formatMarketCap } from "@/lib/screener/presets";
import { industriesForSector } from "@/lib/screener/industries";
import { BRAND } from "@/lib/brand";
import { getExclusions } from "@/components/screener/ExcludePanel";
import type {
  ExploreFilters,
  ExploreResult,
  ExploreRow,
  ExploreSortKey,
} from "@/lib/screener/explore-types";
import { GlassCard } from "./GlassCard";
import { AmbientOrbs } from "./AmbientOrbs";
import { ThemeToggle, SoundToggle } from "./OnboardingModal";
import { TickerSearch } from "./TickerSearch";

const ContourScene = dynamic(() => import("./ContourScene"), { ssr: false });

const EXCHANGES = ["NASDAQ", "NYSE", "AMEX"];

const INPUT =
  "surface w-full rounded-lg px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-accent/40";

type NumKey = {
  [K in keyof ExploreFilters]: ExploreFilters[K] extends number | undefined ? K : never;
}[keyof ExploreFilters];

interface Column {
  key: ExploreSortKey;
  label: string;
  render: (r: ExploreRow) => string;
}

const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
const ratio = (v: number | null, digits = 1) => (v == null ? "—" : v.toFixed(digits));

const COLUMNS: Column[] = [
  { key: "price", label: "Price", render: (r) => `$${r.price.toFixed(2)}` },
  { key: "marketCap", label: "Mkt Cap", render: (r) => formatMarketCap(r.marketCap) },
  { key: "pe", label: "P/E", render: (r) => ratio(r.pe) },
  { key: "roe", label: "ROE", render: (r) => pct(r.roe) },
  { key: "pb", label: "P/B", render: (r) => ratio(r.pb) },
  { key: "ps", label: "P/S", render: (r) => ratio(r.ps) },
  { key: "debtToEquity", label: "D/E", render: (r) => ratio(r.debtToEquity, 2) },
  { key: "netMargin", label: "Margin", render: (r) => pct(r.netMargin) },
  { key: "divYield", label: "Div Yld", render: (r) => pct(r.divYield) },
  { key: "peg", label: "PEG", render: (r) => ratio(r.peg, 2) },
  { key: "evEbitda", label: "EV/EBITDA", render: (r) => ratio(r.evEbitda) },
  { key: "beta", label: "Beta", render: (r) => ratio(r.beta, 2) },
];

function NumField({
  label,
  value,
  onChange,
  placeholder,
  step,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className={INPUT}
      />
    </label>
  );
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function exportCsv(rows: ExploreRow[]) {
  const headers = [
    "Symbol",
    "Name",
    "Price",
    "Market Cap",
    "Sector",
    "Industry",
    "Exchange",
    "P/E",
    "ROE",
    "P/B",
    "P/S",
    "Debt/Equity",
    "Net Margin",
    "Div Yield",
    "PEG",
    "EV/EBITDA",
    "Beta",
  ];
  const body = rows.map((r) =>
    [
      r.symbol,
      escapeCsv(r.name),
      r.price,
      r.marketCap,
      escapeCsv(r.sector),
      escapeCsv(r.industry),
      r.exchange,
      r.pe ?? "",
      r.roe ?? "",
      r.pb ?? "",
      r.ps ?? "",
      r.debtToEquity ?? "",
      r.netMargin ?? "",
      r.divYield ?? "",
      r.peg ?? "",
      r.evEbitda ?? "",
      r.beta,
    ].join(","),
  );
  const csv = [headers.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `explore-screen-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExplorePage() {
  const router = useRouter();
  const [filters, setFilters] = useState<ExploreFilters>({});
  const [sortKey, setSortKey] = useState<ExploreSortKey>("marketCap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [result, setResult] = useState<ExploreResult | null>(null);
  const [loading, setLoading] = useState(false);

  const setNum = useCallback(
    (key: NumKey) => (v: number | undefined) =>
      setFilters((f) => ({ ...f, [key as string]: v })),
    [],
  );

  const toggleInList = useCallback((key: "sectors" | "exchanges", value: string) => {
    setFilters((f) => {
      const list = f[key] ?? [];
      const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
      return { ...f, [key]: next.length ? next : undefined };
    });
  }, []);

  const run = useCallback(
    (key: ExploreSortKey, dir: "asc" | "desc") => {
      setLoading(true);
      fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters,
          sortKey: key,
          sortDir: dir,
          excludeSymbols: getExclusions(),
        }),
      })
        .then((r) => r.json())
        .then((d: ExploreResult) => setResult(d))
        .catch(() => setResult(null))
        .finally(() => setLoading(false));
    },
    [filters],
  );

  // Initial population with defaults.
  useEffect(() => {
    run("marketCap", "desc");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSort = (key: ExploreSortKey) => {
    const dir = key === sortKey && sortDir === "desc" ? "asc" : "desc";
    setSortKey(key);
    setSortDir(dir);
    run(key, dir);
  };

  const rows = result?.rows ?? [];

  return (
    <>
      <ContourScene accent={BRAND.accent} />
      <AmbientOrbs />
      <main className="relative mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/" className="text-xs text-muted hover:text-foreground">
              ← Dashboard
            </Link>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Stock explorer</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Build a precise screen across valuation, quality, income, and size. For a guided,
              beginner-friendly version, try{" "}
              <Link href="/discover" className="text-accent hover:underline">
                Discover
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <SoundToggle />
            <TickerSearch onSubmit={(t) => router.push(`/stock/${t}`)} />
          </div>
        </header>

        <GlassCard className="p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-4">
            {/* Size & price */}
            <div>
              <div className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
                Size &amp; price
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumField label="Mkt cap min ($B)" value={filters.marketCapMinB} onChange={setNum("marketCapMinB")} placeholder="0" />
                <NumField label="Mkt cap max ($B)" value={filters.marketCapMaxB} onChange={setNum("marketCapMaxB")} placeholder="∞" />
                <NumField label="Price min" value={filters.priceMin} onChange={setNum("priceMin")} placeholder="0" />
                <NumField label="Price max" value={filters.priceMax} onChange={setNum("priceMax")} placeholder="∞" />
                <NumField label="Beta max" value={filters.betaMax} onChange={setNum("betaMax")} placeholder="∞" step={0.1} />
                <NumField label="Volume min" value={filters.volumeMin} onChange={setNum("volumeMin")} placeholder="0" />
              </div>
            </div>

            {/* Valuation */}
            <div>
              <div className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
                Valuation
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumField label="P/E min" value={filters.peMin} onChange={setNum("peMin")} placeholder="0" />
                <NumField label="P/E max" value={filters.peMax} onChange={setNum("peMax")} placeholder="∞" />
                <NumField label="P/B max" value={filters.pbMax} onChange={setNum("pbMax")} placeholder="∞" step={0.1} />
                <NumField label="P/S max" value={filters.psMax} onChange={setNum("psMax")} placeholder="∞" step={0.1} />
                <NumField label="PEG max" value={filters.pegMax} onChange={setNum("pegMax")} placeholder="∞" step={0.1} />
                <NumField label="EV/EBITDA max" value={filters.evEbitdaMax} onChange={setNum("evEbitdaMax")} placeholder="∞" />
              </div>
            </div>

            {/* Quality & income */}
            <div>
              <div className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
                Quality &amp; income
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumField label="ROE min (%)" value={filters.roeMinPct} onChange={setNum("roeMinPct")} placeholder="0" />
                <NumField label="Net margin min (%)" value={filters.netMarginMinPct} onChange={setNum("netMarginMinPct")} placeholder="0" />
                <NumField label="Debt/Equity max" value={filters.debtToEquityMax} onChange={setNum("debtToEquityMax")} placeholder="∞" step={0.1} />
                <NumField label="Div yield min (%)" value={filters.divYieldMinPct} onChange={setNum("divYieldMinPct")} placeholder="0" step={0.1} />
                <NumField label="Min annual div ($)" value={filters.dividendMin} onChange={setNum("dividendMin")} placeholder="0" step={0.1} />
              </div>
            </div>

            {/* Universe */}
            <div>
              <div className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
                Universe
              </div>
              <div className="text-[0.6rem] font-medium uppercase tracking-wide text-muted">Sectors</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {SCREENER_SECTORS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleInList("sectors", s)}
                    className={`btn-pill ${filters.sectors?.includes(s) ? "btn-pill-active" : "btn-pill-inactive"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[0.6rem] font-medium uppercase tracking-wide text-muted">Exchanges</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {EXCHANGES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => toggleInList("exchanges", e)}
                    className={`btn-pill ${filters.exchanges?.includes(e) ? "btn-pill-active" : "btn-pill-inactive"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              {filters.sectors?.length === 1 && (
                <label className="mt-3 flex flex-col gap-1">
                  <span className="text-[0.6rem] font-medium uppercase tracking-wide text-muted">Industry</span>
                  <select
                    value={filters.industry ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, industry: e.target.value || undefined }))}
                    className={INPUT}
                  >
                    <option value="">Any industry</option>
                    {industriesForSector(filters.sectors[0]).map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="mt-3 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={Boolean(filters.includeEtfs)}
                  onChange={(e) => setFilters((f) => ({ ...f, includeEtfs: e.target.checked || undefined }))}
                  className="accent-[var(--accent)]"
                />
                Include ETFs
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => run(sortKey, sortDir)} disabled={loading} className="btn-primary text-xs">
              {loading ? "Running…" : "Run screen"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters({});
                setSortKey("marketCap");
                setSortDir("desc");
                run("marketCap", "desc");
              }}
              className="btn-ghost interactive text-xs"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => exportCsv(rows)}
              disabled={!rows.length}
              className="btn-ghost interactive text-xs"
            >
              Export CSV
            </button>
          </div>
        </GlassCard>

        {/* Meta */}
        {result && (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted">
            <span>
              Showing <span className="font-mono text-foreground">{rows.length}</span> of{" "}
              <span className="font-mono text-foreground">{result.scanned}</span> candidates
            </span>
            {result.enriched > 0 && <span>· {result.enriched} enriched with ratios</span>}
            {result.truncated && (
              <span className="text-neutral">
                · more matches exist — narrow the native filters (size, sector, price) to scan deeper
              </span>
            )}
            {result.isMock && <span>· sample data (add FMP_API_KEY for live)</span>}
          </div>
        )}

        {/* Results table */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[0.65rem] uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-medium">Symbol</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="py-2 pr-3 text-right font-medium">
                    <button
                      type="button"
                      onClick={() => onSort(c.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {c.label}
                      {sortKey === c.key && <span className="text-accent">{sortDir === "desc" ? "↓" : "↑"}</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol} className="border-b border-border/50 hover:bg-foreground/[0.03]">
                  <td className="py-2 pr-3">
                    <Link href={`/stock/${r.symbol}`} className="font-mono font-semibold text-accent hover:underline">
                      {r.symbol}
                    </Link>
                  </td>
                  <td className="max-w-[200px] truncate py-2 pr-3 text-muted">{r.name}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="py-2 pr-3 text-right font-mono text-foreground">
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && rows.length === 0 && (
            <p className="mt-6 text-sm text-muted">No matches — try loosening the filters, then Run screen.</p>
          )}
          {loading && rows.length === 0 && (
            <p className="mt-6 animate-pulse text-sm text-muted">Running screen…</p>
          )}
        </div>
      </main>
    </>
  );
}
