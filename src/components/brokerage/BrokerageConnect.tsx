"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Status {
  configured: boolean;
  mode?: "personal" | "commercial";
  authed: boolean;
  connected: boolean;
  brokerLinked?: boolean;
  connectionDisabled?: boolean;
  snaptradeAuthed?: boolean;
}

/**
 * Optional "connect your brokerage" control. Renders nothing unless SnapTrade
 * is configured server-side, so guest/un-configured builds simply use manual
 * entry. On success it hands real, weighted holdings up to the Risk X-ray.
 */
export function BrokerageConnect({
  onImport,
}: {
  onImport: (holdings: { ticker: string; weight: number }[]) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importHoldings = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/brokerage/holdings", { cache: "no-store" });
      const data = (await res.json()) as {
        holdings?: { ticker: string; weight: number }[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Couldn't load holdings");
      if (!data.holdings?.length) throw new Error("No holdings found in the linked account.");
      onImport(data.holdings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }, [onImport]);

  const connect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/brokerage/link", { method: "POST" });
      const data = (await res.json()) as { redirectURI?: string; error?: string; step?: string };
      if (!res.ok || !data.redirectURI) throw new Error(data.error ?? "Couldn't start connection");
      window.location.href = data.redirectURI;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/brokerage/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: Status) => {
        if (cancelled) return;
        setStatus(s);
        const params = new URLSearchParams(window.location.search);
        const flag = params.get("brokerage");
        if (!s.configured || !s.authed) return;
        // Personal keys: after SnapTrade OAuth, open the brokerage portal next.
        if (flag === "snaptrade-ok" && s.mode === "personal") {
          void connect();
          return;
        }
        // Returning from the SnapTrade connection portal — auto-import.
        if (s.brokerLinked && flag === "connected") void importHoldings();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [connect, importHoldings]);

  if (!status || !status.configured) return null;

  const connectLabel =
    status.mode === "personal" && !status.snaptradeAuthed
      ? "Sign in with SnapTrade"
      : status.connectionDisabled
        ? "Reconnect brokerage"
        : "Connect a brokerage";

  const showImport = status.brokerLinked;
  const showConnect = !showImport;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-foreground">
          <span className="font-semibold">Skip the typing.</span> Import your real holdings from a
          linked brokerage.
        </p>
        {!status.authed ? (
          <a href="/api/auth/google" className="btn-ghost interactive text-xs">
            Sign in to connect
          </a>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {showConnect && (
              <button type="button" onClick={connect} disabled={busy} className="btn-primary text-xs disabled:opacity-50">
                {busy ? "Opening…" : connectLabel}
              </button>
            )}
            {showImport && (
              <button type="button" onClick={importHoldings} disabled={busy} className="btn-primary text-xs disabled:opacity-50">
                {busy ? "Importing…" : "Import my holdings"}
              </button>
            )}
          </div>
        )}
      </div>
      {status.connectionDisabled && (
        <p className="mt-1 text-xs text-down">
          Your brokerage link needs to be refreshed — click Reconnect brokerage to sign in again at your broker.
        </p>
      )}
      {error && <p className="mt-1 text-xs text-down">{error}</p>}
      {status.authed && (
        <p className="mt-1 text-[0.65rem] text-muted-2">
          <Link href="/settings" className="text-accent hover:underline">
            Manage connections in Settings
          </Link>
          {" · "}Read-only via SnapTrade. We never place trades.
        </p>
      )}
      {!status.authed && (
        <p className="mt-1 text-[0.65rem] text-muted-2">Read-only via SnapTrade. We never place trades.</p>
      )}
    </div>
  );
}
