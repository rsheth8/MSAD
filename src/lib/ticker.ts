/** US equity ticker validation shared by API routes and client forms. */
export const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

export function normalizeTicker(raw: string): string {
  return (raw ?? "").toUpperCase().trim();
}

export function isValidTicker(ticker: string): boolean {
  return TICKER_RE.test(normalizeTicker(ticker));
}
