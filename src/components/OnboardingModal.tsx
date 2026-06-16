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
import { applyStyleDefaults } from "@/lib/discovery/investor-profile";
import { defaultProfileFromOnboarding } from "@/lib/discovery/profile-to-screener";
import type { AccountSize, InvestingHorizon, InvestingStyle, RiskComfort } from "@/lib/discovery/types";
import { STYLE_LABELS } from "@/lib/discovery/investor-profile";
import { setInvestorProfile } from "@/lib/profile/store";

export function OnboardingModal({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [accent, setAccent] = useState<string>(BRAND.accent);
  const [theme, setThemeLocal] = useState<ThemeMode>("light");
  const [sound, setSound] = useState(false);
  const [stars, setStars] = useState<string[]>([]);
  const [style, setStyle] = useState<InvestingStyle>("learning");
  const [horizon, setHorizon] = useState<InvestingHorizon>("medium");
  const [risk, setRisk] = useState<RiskComfort>("moderate");
  const [account, setAccount] = useState<AccountSize>("small");

  const totalSteps = 4;

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
    setInvestorProfile(
      applyStyleDefaults(style, defaultProfileFromOnboarding({
        style,
        horizon,
        riskComfort: risk,
        accountSize: account,
      })),
    );
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
              {step === 2 && "How do you invest?"}
              {step === 3 && "Star a few tickers"}
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
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted">
                  We&apos;ll use this for your research queue — stocks worth studying, not buy tips.
                </p>
                <div>
                  <div className="text-xs font-medium text-foreground">Style</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(["learning", "income", "growth", "value", "balanced"] as InvestingStyle[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStyle(s)}
                        className={`btn-chip text-[0.65rem] ${style === s ? "btn-chip-active" : "btn-chip-inactive"}`}
                      >
                        {STYLE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block text-xs">
                  <span className="font-medium text-foreground">Horizon</span>
                  <select
                    value={horizon}
                    onChange={(e) => setHorizon(e.target.value as InvestingHorizon)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </label>
                <div>
                  <div className="text-xs font-medium text-foreground">Risk comfort</div>
                  <div className="mt-1 flex gap-1">
                    {(["calm", "moderate", "aggressive"] as RiskComfort[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRisk(r)}
                        className={`btn-chip flex-1 capitalize text-[0.65rem] ${risk === r ? "btn-chip-active" : "btn-chip-inactive"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
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
              {step < totalSteps - 1 ? (
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
