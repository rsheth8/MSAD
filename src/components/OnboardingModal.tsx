"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CATALOG_ROWS } from "@/lib/catalog";
import { getWatchlist, setWatchlist } from "@/lib/watchlist";
import {
  applyTheme,
  getLearningPathEnabled,
  getTheme,
  playUiClick,
  setLearningPathEnabled,
  setOnboardingDone,
  setSoundEnabled,
  setTheme,
  type ThemeMode,
} from "@/lib/settings";
import { BRAND, MSAD_STORAGE } from "@/lib/brand";

export function OnboardingModal({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [accent, setAccent] = useState<string>(BRAND.accent);
  const [theme, setThemeLocal] = useState<ThemeMode>("light");
  const [sound, setSound] = useState(false);
  const [stars, setStars] = useState<string[]>([]);

  useEffect(() => {
    setThemeLocal(getTheme());
  }, []);

  function finish() {
    setOnboardingDone();
    setTheme(theme);
    applyTheme(theme);
    setSoundEnabled(sound);
    setLearningPathEnabled(true);
    document.documentElement.style.setProperty("--accent", accent);
    localStorage.setItem(MSAD_STORAGE.accent, accent);
    setWatchlist([...getWatchlist(), ...stars]);
    setOpen(false);
    onDone();
    playUiClick();
  }

  const picks = CATALOG_ROWS[0].items.slice(0, 6);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            className="surface max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl p-6 sm:p-8"
          >
            <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
              Welcome to {BRAND.id}
            </div>
            <h2 className="mt-1 font-display text-xl font-bold">
              {step === 0 && "Learn stocks the friendly way"}
              {step === 1 && "Pick your accent"}
              {step === 2 && "Star a few tickers"}
            </h2>

            {step === 0 && (
              <p className="mt-3 text-sm text-muted">
                {BRAND.name} — by {BRAND.authors}. Browse live quotes, open report cards, and
                follow the guided tour. Everything is educational — never buy/sell advice.
              </p>
            )}

            {step === 1 && (
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-8 w-12 cursor-pointer rounded border border-border"
                  />
                  Accent color
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={theme === "light"}
                    onChange={() => setThemeLocal("light")}
                  />
                  Light mode
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={theme === "dark"}
                    onChange={() => setThemeLocal("dark")}
                  />
                  Dark mode
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
                  UI sounds (subtle clicks)
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {picks.map((p) => {
                  const on = stars.includes(p.ticker);
                  return (
                    <button
                      key={p.ticker}
                      type="button"
                      onClick={() =>
                        setStars((s) =>
                          on ? s.filter((x) => x !== p.ticker) : [...s, p.ticker],
                        )
                      }
                      className={`btn-chip ${on ? "btn-chip-active" : "btn-chip-inactive"}`}
                    >
                      {on ? "★" : "☆"} {p.ticker}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex justify-between gap-2">
              {step > 0 ? (
                <button type="button" className="btn-ghost interactive" onClick={() => setStep((s) => s - 1)}>
                  Back
                </button>
              ) : (
                <button type="button" className="btn-ghost interactive" onClick={finish}>
                  Skip
                </button>
              )}
              {step < 2 ? (
                <button type="button" className="btn-primary" onClick={() => setStep((s) => s + 1)}>
                  Next
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={finish}>
                  Start exploring
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const t = getTheme();
    setThemeState(t);
    applyTheme(t);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setThemeState(next);
    setTheme(next);
    playUiClick();
  }

  return (
    <button type="button" onClick={toggle} className="btn-ghost interactive text-xs" aria-label="Toggle theme">
      {theme === "light" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}

export function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(localStorage.getItem(MSAD_STORAGE.sound) === "1");
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    setSoundEnabled(next);
    if (next) playUiClick();
  }

  return (
    <button type="button" onClick={toggle} className="btn-ghost interactive text-xs" aria-pressed={on}>
      {on ? "🔊 Sound on" : "🔇 Sound off"}
    </button>
  );
}
