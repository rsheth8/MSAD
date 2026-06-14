const KEY = "amsad-screener-exclusions";

/** Mega-caps & index ETFs most users already know. */
export const DEFAULT_EXCLUSIONS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "GOOG",
  "AMZN",
  "META",
  "NVDA",
  "TSLA",
  "BRK.B",
  "JPM",
  "V",
  "SPY",
  "QQQ",
  "VTI",
];

export function getExclusions(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((t) => t.toUpperCase()).filter(Boolean);
      }
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_EXCLUSIONS];
}

export function setExclusions(tickers: string[]) {
  const next = [...new Set(tickers.map((t) => t.toUpperCase()).filter(Boolean))];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function resetExclusionsToDefault() {
  localStorage.setItem(KEY, JSON.stringify(DEFAULT_EXCLUSIONS));
  return [...DEFAULT_EXCLUSIONS];
}
