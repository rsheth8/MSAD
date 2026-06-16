"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { SymbolHit } from "@/lib/search";

/** Ticker input with name/symbol autocomplete. Submits an uppercased symbol to the parent. */
export function TickerSearch({
  initial = "",
  compact = false,
  onSubmit,
}: {
  initial?: string;
  compact?: boolean;
  onSubmit: (ticker: string) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);
  const [results, setResults] = useState<SymbolHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const pick = useCallback(
    (hit: SymbolHit) => {
      setValue(hit.symbol);
      setOpen(false);
      setActiveIndex(-1);
      onSubmit(hit.symbol);
    },
    [onSubmit],
  );

  const submitQuery = useCallback(
    (raw: string, hints: SymbolHit[]) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      const upper = trimmed.toUpperCase();
      const exact = hints.find((h) => h.symbol === upper);
      if (exact) {
        pick(exact);
        return;
      }

      if (hints.length >= 1) {
        pick(hints[0]);
        return;
      }

      onSubmit(upper);
      setOpen(false);
    },
    [onSubmit, pick],
  );

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const body = (await res.json()) as { results?: SymbolHit[] };
        const next = body.results ?? [];
        if (!controller.signal.aborted) {
          setResults(next);
          setOpen(next.length > 0);
          setActiveIndex(-1);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setResults([]);
          setOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (activeIndex >= 0 && results[activeIndex]) {
            pick(results[activeIndex]);
            return;
          }
          submitQuery(value, results);
        }}
        className="surface flex items-center gap-2 rounded-full py-1 pl-4 pr-1 focus-within:ring-2 focus-within:ring-accent/40"
        role="search"
      >
        <span className="text-muted" aria-hidden>
          ⌕
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (results.length) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!open || !results.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => (i + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder="Name or ticker…"
          aria-label="Search stocks"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && results.length > 0}
          autoComplete="off"
          spellCheck={false}
          maxLength={64}
          className={`bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none ${
            compact ? "w-32 sm:w-36" : "w-40 sm:w-48"
          }`}
        />
        <button
          type="submit"
          className="sheen rounded-full px-4 py-1.5 text-sm font-semibold text-foreground transition-transform hover:scale-[1.03] active:scale-95"
          style={{ background: "var(--accent)" }}
        >
          Go
        </button>
      </form>

      {open && (results.length > 0 || loading) && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Stock suggestions"
          className="surface absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-64 overflow-y-auto rounded-2xl border border-white/10 py-1 shadow-xl"
        >
          {loading && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted">Searching…</li>
          )}
          {results.map((hit, index) => (
            <li key={hit.symbol} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => pick(hit)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  index === activeIndex ? "bg-accent/15" : "hover:bg-foreground/5"
                }`}
              >
                <span className="shrink-0 font-mono text-xs font-bold uppercase tracking-wider text-accent">
                  {hit.symbol}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground">{hit.name}</span>
                {hit.exchange && (
                  <span className="shrink-0 text-[0.65rem] uppercase tracking-wide text-muted">
                    {hit.exchange}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
