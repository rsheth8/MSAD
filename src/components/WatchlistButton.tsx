"use client";

import { useEffect, useState } from "react";
import { getWatchlist, toggleWatchlist } from "@/lib/watchlist";

export function WatchlistButton({ ticker }: { ticker: string }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(getWatchlist().includes(ticker.toUpperCase()));
  }, [ticker]);

  return (
    <button
      type="button"
      onClick={() => {
        const next = toggleWatchlist(ticker);
        setOn(next.includes(ticker.toUpperCase()));
      }}
      className={`surface-interactive rounded-full px-3 py-1.5 text-xs font-medium ${
        on ? "text-accent ring-1 ring-accent/25" : "text-muted"
      }`}
      aria-pressed={on}
    >
      {on ? "★ Watchlisted" : "☆ Add to watchlist"}
    </button>
  );
}
