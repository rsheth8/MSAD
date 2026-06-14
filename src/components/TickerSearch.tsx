"use client";

import { useState } from "react";

/** Controlled ticker input. Submits an uppercased symbol to the parent. */
export function TickerSearch({
  initial = "",
  onSubmit,
}: {
  initial?: string;
  onSubmit: (ticker: string) => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = value.trim().toUpperCase();
        if (t) onSubmit(t);
      }}
      className="surface flex items-center gap-2 rounded-full py-1 pl-4 pr-1 focus-within:ring-2 focus-within:ring-accent/40"
    >
      <span className="text-muted" aria-hidden>
        ⌕
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        placeholder="Search any ticker…"
        aria-label="Stock ticker"
        maxLength={8}
        className="w-36 bg-transparent text-sm font-mono uppercase tracking-wider text-foreground placeholder:text-muted-2 focus:outline-none sm:w-44"
      />
      <button
        type="submit"
        className="sheen rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
        style={{ background: "var(--accent)" }}
      >
        Go
      </button>
    </form>
  );
}
