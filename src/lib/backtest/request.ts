/** Client-safe wrapper around POST /api/backtest. */
import type { BacktestResult, StrategyKind } from "./types";

export interface BacktestParams {
  ticker: string;
  kind: StrategyKind;
  smaWindow?: number;
  costBps?: number;
  years?: number;
}

export async function requestBacktest(params: BacktestParams): Promise<BacktestResult> {
  const res = await fetch("/api/backtest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<BacktestResult> & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as BacktestResult;
}
