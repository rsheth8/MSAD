"use client";

import { useEffect, useState } from "react";
import { applyTheme, getTheme, isOnboardingDone } from "@/lib/settings";
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
    // If the user is signed in, pull their cloud profile and merge with local.
    void syncWithAccount();
  }, []);

  return (
    <DepthProvider>
      <KeyboardShortcuts />
      {showOnboarding && <OnboardingModal onDone={() => setShowOnboarding(false)} />}
      {children}
    </DepthProvider>
  );
}
