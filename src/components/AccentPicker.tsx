"use client";

import { useEffect, useRef, useState } from "react";

const PRESETS: { name: string; hex: string }[] = [
  { name: "Tiffany", hex: "#45ded6" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Amber", hex: "#d97706" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Slate", hex: "#475569" },
];

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;

function normalize(raw: string): string | null {
  const v = raw.trim();
  if (!HEX_RE.test(v)) return null;
  return (v.startsWith("#") ? v : `#${v}`).toLowerCase();
}

/** Lets the user pick or type a hex accent color. */
export function AccentPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setText(value), [value]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const apply = (raw: string) => {
    const hex = normalize(raw);
    if (hex) {
      setInvalid(false);
      onChange(hex);
    } else {
      setInvalid(true);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="surface flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-foreground transition-shadow hover:[box-shadow:var(--shadow-card-hover)]"
      >
        <span
          className="h-4 w-4 rounded-full ring-1 ring-black/10"
          style={{ background: value }}
          aria-hidden
        />
        Accent
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose accent color"
          className="surface absolute right-0 z-20 mt-2 w-64 rounded-2xl p-4"
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted">
            Accent color
          </p>

          <div className="mt-3 grid grid-cols-8 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.hex}
                type="button"
                title={p.name}
                onClick={() => apply(p.hex)}
                className="h-6 w-6 rounded-full ring-1 ring-black/10 transition-transform hover:scale-110"
                style={{ background: p.hex }}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              type="color"
              aria-label="Pick accent color"
              value={value}
              onChange={(e) => apply(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
            />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply(text)}
              placeholder="#45ded6"
              aria-label="Hex color code"
              spellCheck={false}
              className={`min-w-0 flex-1 rounded-lg border bg-background px-3 py-1.5 font-mono text-sm text-foreground focus:outline-none focus:ring-2 ${
                invalid ? "border-down focus:ring-down/30" : "border-border focus:ring-accent/40"
              }`}
            />
            <button
              type="button"
              onClick={() => apply(text)}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              Set
            </button>
          </div>
          {invalid && (
            <p className="mt-2 text-xs text-down">Enter a 6-digit hex code, e.g. #45ded6.</p>
          )}
        </div>
      )}
    </div>
  );
}
