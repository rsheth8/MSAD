/**
 * Collect local-only prefs (watchlist, theme, etc.) into the profile shape
 * and apply cloud prefs back to localStorage.
 */
import { MSAD_STORAGE } from "@/lib/brand";
import type { UserPreferences, UserProfile } from "./types";

type SavedScreen = NonNullable<UserProfile["savedScreens"]>[number];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function collectLocalPrefs(): Pick<UserProfile, "watchlist" | "savedScreens" | "preferences"> {
  if (!isBrowser()) return { watchlist: [], savedScreens: [], preferences: {} };

  let watchlist: string[] = [];
  try {
    const raw = localStorage.getItem(MSAD_STORAGE.watchlist);
    watchlist = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    /* ignore */
  }

  let savedScreens: SavedScreen[] = [];
  try {
    const raw = localStorage.getItem(MSAD_STORAGE.savedScreens);
    savedScreens = raw ? (JSON.parse(raw) as SavedScreen[]) : [];
  } catch {
    /* ignore */
  }

  const preferences: UserPreferences = {};
  try {
    const theme = localStorage.getItem(MSAD_STORAGE.theme);
    if (theme === "dark" || theme === "light") preferences.theme = theme;
    const accent = localStorage.getItem(MSAD_STORAGE.accent);
    if (accent) preferences.accent = accent;
    preferences.sound = localStorage.getItem(MSAD_STORAGE.sound) === "1";
    preferences.onboardingDone = localStorage.getItem(MSAD_STORAGE.onboarding) === "1";
    preferences.learningPath = localStorage.getItem(MSAD_STORAGE.learningPath) !== "0";
    const depth = localStorage.getItem(MSAD_STORAGE.depth);
    if (depth) preferences.depth = parseInt(depth, 10);
  } catch {
    /* ignore */
  }

  return {
    watchlist: watchlist.map((t) => t.toUpperCase()).filter(Boolean),
    savedScreens,
    preferences,
  };
}

/** Write cloud-synced prefs into localStorage so existing modules keep working. */
export function applyPrefsToLocal(profile: UserProfile): void {
  if (!isBrowser()) return;

  if (profile.watchlist) {
    localStorage.setItem(MSAD_STORAGE.watchlist, JSON.stringify(profile.watchlist));
    window.dispatchEvent(new Event("msad:watchlist"));
  }
  if (profile.savedScreens) {
    localStorage.setItem(MSAD_STORAGE.savedScreens, JSON.stringify(profile.savedScreens));
  }
  const prefs = profile.preferences;
  if (!prefs) return;
  if (prefs.theme) {
    localStorage.setItem(MSAD_STORAGE.theme, prefs.theme);
    document.documentElement.dataset.theme = prefs.theme;
  }
  if (prefs.accent) {
    localStorage.setItem(MSAD_STORAGE.accent, prefs.accent);
    document.documentElement.style.setProperty("--accent", prefs.accent);
  }
  if (prefs.sound !== undefined) {
    localStorage.setItem(MSAD_STORAGE.sound, prefs.sound ? "1" : "0");
  }
  if (prefs.onboardingDone !== undefined) {
    localStorage.setItem(MSAD_STORAGE.onboarding, prefs.onboardingDone ? "1" : "0");
  }
  if (prefs.learningPath !== undefined) {
    localStorage.setItem(MSAD_STORAGE.learningPath, prefs.learningPath ? "1" : "0");
  }
  if (prefs.depth !== undefined) {
    localStorage.setItem(MSAD_STORAGE.depth, String(prefs.depth));
  }
}

/** Merge local prefs into a profile before pushing to cloud. */
export function enrichProfileWithLocal(profile: UserProfile): UserProfile {
  const local = collectLocalPrefs();
  return {
    ...profile,
    watchlist: local.watchlist,
    savedScreens: local.savedScreens,
    preferences: { ...local.preferences, ...profile.preferences },
  };
}
