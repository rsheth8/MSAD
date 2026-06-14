import type { ProFilterState } from "./types";

const KEY = "amsad-saved-screens";

export interface SavedScreen {
  id: string;
  name: string;
  createdAt: string;
  filters: ProFilterState;
}

export function getSavedScreens(): SavedScreen[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedScreen[]) : [];
  } catch {
    return [];
  }
}

export function saveScreen(name: string, filters: ProFilterState): SavedScreen[] {
  const list = getSavedScreens();
  const entry: SavedScreen = {
    id: `${Date.now()}`,
    name: name.trim() || "My screen",
    createdAt: new Date().toISOString(),
    filters,
  };
  const next = [entry, ...list].slice(0, 12);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function deleteSavedScreen(id: string): SavedScreen[] {
  const next = getSavedScreens().filter((s) => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
