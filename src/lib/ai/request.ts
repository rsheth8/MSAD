/** Client-safe wrapper around POST /api/explain (no server-only imports). */
import type { ExplainRequest, ExplainResponse } from "./types";

export async function requestExplain(req: ExplainRequest): Promise<ExplainResponse> {
  const res = await fetch("/api/explain", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<ExplainResponse> & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as ExplainResponse;
}
