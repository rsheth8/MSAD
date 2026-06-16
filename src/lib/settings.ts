import { MSAD_STORAGE } from "@/lib/brand";

export type ThemeMode = "light" | "dark";

const KEYS = {
  theme: MSAD_STORAGE.theme,
  sound: MSAD_STORAGE.sound,
  onboarding: MSAD_STORAGE.onboarding,
  learningPath: MSAD_STORAGE.learningPath,
} as const;

export function getTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(KEYS.theme);
    return v === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function setTheme(theme: ThemeMode) {
  localStorage.setItem(KEYS.theme, theme);
  document.documentElement.dataset.theme = theme;
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
}

export function getSoundEnabled(): boolean {
  try {
    return localStorage.getItem(KEYS.sound) === "1";
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean) {
  localStorage.setItem(KEYS.sound, on ? "1" : "0");
}

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(KEYS.onboarding) === "1";
  } catch {
    return false;
  }
}

export function setOnboardingDone() {
  localStorage.setItem(KEYS.onboarding, "1");
}

export function getLearningPathEnabled(): boolean {
  try {
    return localStorage.getItem(KEYS.learningPath) !== "0";
  } catch {
    return true;
  }
}

export function setLearningPathEnabled(on: boolean) {
  localStorage.setItem(KEYS.learningPath, on ? "1" : "0");
}

/** Subtle UI click — no audio file needed. */
export function playUiClick() {
  if (!getSoundEnabled()) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    /* ignore */
  }
}
