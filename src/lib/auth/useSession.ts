"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "./config";

export interface SessionState {
  user: AuthUser | null;
  authEnabled: boolean;
  durableStore: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

/** Client view of the auth session. authEnabled=false → guest-only build. */
export function useSession(): SessionState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [durableStore, setDurableStore] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = (await res.json()) as {
        user: AuthUser | null;
        authEnabled: boolean;
        durableStore?: boolean;
      };
      setUser(data.user);
      setAuthEnabled(data.authEnabled);
      setDurableStore(data.durableStore ?? false);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { user, authEnabled, durableStore, loading, refresh };
}
