"use client";

import { useEffect, useState } from "react";
import { applyTheme, getTheme, isOnboardingDone } from "@/lib/settings";
import { preloadContourScene } from "@/lib/preload-contour";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { OnboardingModal } from "./OnboardingModal";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    applyTheme(getTheme());
    if (!isOnboardingDone()) setShowOnboarding(true);
    preloadContourScene();
  }, []);

  return (
    <>
      <KeyboardShortcuts />
      {showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
      {children}
    </>
  );
}
