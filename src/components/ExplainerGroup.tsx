"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ExplainerGroupContextValue {
  openId: string | null;
  setOpenId: (id: string | null) => void;
}

const ExplainerGroupContext = createContext<ExplainerGroupContextValue | null>(null);

/** Only one nested Explainer can be open at a time within this group. */
export function ExplainerGroup({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ExplainerGroupContext.Provider value={{ openId, setOpenId }}>
      {children}
    </ExplainerGroupContext.Provider>
  );
}

export function useExplainerGroup() {
  return useContext(ExplainerGroupContext);
}
