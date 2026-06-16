"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { MSAD_STORAGE } from "@/lib/brand";
import { normalizeDepth, type Depth } from "@/lib/ai/depth";

interface DepthCtx {
  depth: Depth;
  setDepth: (d: Depth) => void;
}

const Ctx = createContext<DepthCtx>({ depth: "learn", setDepth: () => {} });

export function DepthProvider({ children }: { children: React.ReactNode }) {
  const [depth, setDepthState] = useState<Depth>("learn");

  useEffect(() => {
    try {
      setDepthState(normalizeDepth(localStorage.getItem(MSAD_STORAGE.depth)));
    } catch {
      /* ignore */
    }
    // Sync across tabs / other components that change depth.
    const onStorage = (e: StorageEvent) => {
      if (e.key === MSAD_STORAGE.depth) setDepthState(normalizeDepth(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setDepth = useCallback((d: Depth) => {
    setDepthState(d);
    try {
      localStorage.setItem(MSAD_STORAGE.depth, d);
    } catch {
      /* ignore */
    }
  }, []);

  return <Ctx.Provider value={{ depth, setDepth }}>{children}</Ctx.Provider>;
}

export function useDepth(): DepthCtx {
  return useContext(Ctx);
}
