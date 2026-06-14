"use client";

import { useState } from "react";
import type { ProFilterState } from "@/lib/screener/types";
import type { SavedScreen } from "@/lib/screener/saved-screens";
import { deleteSavedScreen, saveScreen } from "@/lib/screener/saved-screens";
import { GlassCard } from "@/components/GlassCard";

export function SavedScreensBar({
  screens,
  currentFilters,
  onChange,
  onLoad,
}: {
  screens: SavedScreen[];
  currentFilters: ProFilterState;
  onChange: (next: SavedScreen[]) => void;
  onLoad: (filters: ProFilterState) => void;
}) {
  const [name, setName] = useState("");

  function handleSave() {
    if (!name.trim()) return;
    onChange(saveScreen(name, currentFilters));
    setName("");
  }

  return (
    <GlassCard className="mb-4 p-4">
      <div className="text-sm font-semibold">Saved screens</div>
      <p className="mt-0.5 text-[0.65rem] text-muted">Store custom filter combos in your browser.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Screen name"
          className="surface min-w-[140px] flex-1 rounded-lg px-3 py-1.5 text-xs"
        />
        <button type="button" onClick={handleSave} className="btn-primary text-xs">
          Save current
        </button>
      </div>

      {screens.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {screens.map((s) => (
            <div key={s.id} className="flex items-center gap-1 rounded-full border border-border bg-background pl-3 pr-1 py-0.5 text-xs">
              <button type="button" onClick={() => onLoad(s.filters)} className="font-medium hover:text-accent">
                {s.name}
              </button>
              <button
                type="button"
                onClick={() => onChange(deleteSavedScreen(s.id))}
                className="rounded-full px-1.5 text-muted hover:text-down"
                aria-label={`Delete ${s.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
