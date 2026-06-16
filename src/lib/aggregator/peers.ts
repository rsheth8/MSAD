import { fmpFetch } from "@/lib/fmp/client";
import { runPool } from "@/lib/async";
import type {
  FmpBalanceSheet,
  FmpCashFlow,
  FmpKeyMetricsTtm,
  FmpPeer,
  FmpRatiosTtm,
} from "@/lib/fmp/types";
import { averageRawMetrics, extractRawMetrics, type RawMetricValues } from "./metrics";

const MAX_PEERS = 5;

export interface FundamentalsBundle {
  ratios: FmpRatiosTtm | null;
  keyMetrics: FmpKeyMetricsTtm | null;
  balanceSheet: FmpBalanceSheet | null;
  cashFlows: FmpCashFlow[];
}

async function fetchFundamentals(symbol: string): Promise<FundamentalsBundle> {
  const [ratiosRes, keyRes, bsRes, cfRes] = await Promise.all([
    fmpFetch<FmpRatiosTtm[]>("/ratios-ttm", { symbol }),
    fmpFetch<FmpKeyMetricsTtm[]>("/key-metrics-ttm", { symbol }),
    fmpFetch<FmpBalanceSheet[]>("/balance-sheet-statement", { symbol, period: "annual", limit: 1 }),
    fmpFetch<FmpCashFlow[]>("/cash-flow-statement", { symbol, period: "annual", limit: 2 }),
  ]);

  return {
    ratios: ratiosRes[0] ?? null,
    keyMetrics: keyRes[0] ?? null,
    balanceSheet: bsRes[0] ?? null,
    cashFlows: cfRes ?? [],
  };
}

async function fetchPeerSymbols(ticker: string): Promise<string[]> {
  const peers = await fmpFetch<FmpPeer[]>("/stock-peers", { symbol: ticker });
  if (!Array.isArray(peers)) return [];
  return peers
    .map((p) => p.symbol?.toUpperCase())
    .filter((s): s is string => Boolean(s) && s !== ticker.toUpperCase())
    .slice(0, MAX_PEERS);
}

export interface PeerMetricRow {
  symbol: string;
  name: string;
  raw: RawMetricValues;
}

/** Fundamentals for target + industry peers (scatter charts). */
export async function fetchPeerMetricRows(
  ticker: string,
  companyName: string,
): Promise<PeerMetricRow[]> {
  const targetBundle = await fetchFundamentals(ticker);
  const rows: PeerMetricRow[] = [
    { symbol: ticker, name: companyName, raw: extractRawMetrics(targetBundle) },
  ];

  const peerSymbols = await fetchPeerSymbols(ticker);
  const peerResults = await runPool(
    peerSymbols,
    async (symbol) => {
      try {
        const bundle = await fetchFundamentals(symbol);
        return { symbol, name: symbol, raw: extractRawMetrics(bundle) };
      } catch {
        return null;
      }
    },
    2,
  );

  for (const row of peerResults) {
    if (row) rows.push(row);
  }
  return rows;
}

export { fetchPeerSymbols };

/** Pull fundamentals for industry peers and return averaged raw metric values. */
export async function fetchPeerAverages(ticker: string): Promise<Partial<Record<keyof RawMetricValues, number | null>>> {
  const peerSymbols = await fetchPeerSymbols(ticker);
  if (!peerSymbols.length) return {};

  const bundles = await runPool(
    peerSymbols,
    async (s) => {
      try {
        return await fetchFundamentals(s);
      } catch {
        return null;
      }
    },
    2,
  );
  const rawList: RawMetricValues[] = [];

  for (const bundle of bundles) {
    if (bundle) rawList.push(extractRawMetrics(bundle));
  }

  return averageRawMetrics(rawList);
}

export { fetchFundamentals };
