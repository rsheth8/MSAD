"use client";

import { useEffect, useState } from "react";
import { applyTheme, getTheme, isOnboardingDone } from "@/lib/settings";
import { MSAD_STORAGE } from "@/lib/brand";
import { preloadContourScene } from "@/lib/preload-contour";
import { syncWithAccount } from "@/lib/profile/store";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { OnboardingModal } from "./OnboardingModal";
import { DepthProvider } from "./ai/DepthProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    applyTheme(getTheme());
    if (!isOnboardingDone()) setShowOnboarding(true);
    preloadContourScene();
    void syncWithAccount();

    const onStorage = (e: StorageEvent) => {
      if (e.key === MSAD_STORAGE.theme && (e.newValue === "dark" || e.newValue === "light")) {
        applyTheme(e.newValue);
      }
      if (e.key === MSAD_STORAGE.accent && e.newValue) {
        document.documentElement.style.setProperty("--accent", e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <DepthProvider>
      <KeyboardShortcuts />
      {showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
      {children}
    </DepthProvider>
  );
}
