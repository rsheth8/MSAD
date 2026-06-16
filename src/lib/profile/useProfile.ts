"use client";

import { useEffect, useState } from "react";
import { getProfile, subscribeProfile } from "./store";
import { emptyProfile, type UserProfile } from "./types";

/** Reactive view of the current user profile (re-renders on any mutation).
 *  Starts empty so SSR/hydration match, then loads from storage on mount. */
export function useProfile(): UserProfile {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);

  useEffect(() => {
    setProfile(getProfile());
    return subscribeProfile(() => setProfile({ ...getProfile() }));
  }, []);

  return profile;
}
