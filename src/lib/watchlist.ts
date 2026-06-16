import { MSAD_EVENTS, MSAD_STORAGE } from "@/lib/brand";

const WATCHLIST_KEY = MSAD_STORAGE.watchlist;

export function getWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return list.map((t) => t.toUpperCase()).filter(Boolean);
  } catch {
    return [];
  }
}

export function toggleWatchlist(ticker: string): string[] {
  const t = ticker.toUpperCase();
  const list = getWatchlist();
  const next = list.includes(t) ? list.filter((x) => x !== t) : [...list, t];
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(MSAD_EVENTS.watchlist));
  return next;
}

export function isWatchlisted(ticker: string): boolean {
  return getWatchlist().includes(ticker.toUpperCase());
}

export function setWatchlist(tickers: string[]) {
  const next = [...new Set(tickers.map((t) => t.toUpperCase()).filter(Boolean))];
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(MSAD_EVENTS.watchlist));
  return next;
}
