/** Client-safe wrapper around POST /api/risk. */
import type { Holding, RiskResult } from "./types";

export async function requestRisk(holdings: Holding[]): Promise<RiskResult> {
  const res = await fetch("/api/risk", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ holdings }),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<RiskResult> & { error?: string };
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as RiskResult;
}
