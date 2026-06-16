"use client";

import { useCallback, useEffect, useState } from "react";

interface Status {
  configured: boolean;
  authed: boolean;
  connected: boolean;
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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/brokerage/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: Status) => {
        if (cancelled) return;
        setStatus(s);
        // Returning from the SnapTrade portal — auto-import.
        const justConnected = new URLSearchParams(window.location.search).get("brokerage") === "connected";
        if (s.configured && s.authed && s.connected && justConnected) void importHoldings();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [importHoldings]);

  if (!status || !status.configured) return null;

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/brokerage/link", { method: "POST" });
      const data = (await res.json()) as { redirectURI?: string; error?: string };
      if (!res.ok || !data.redirectURI) throw new Error(data.error ?? "Couldn't start connection");
      window.location.href = data.redirectURI;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setBusy(false);
    }
  }

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
        ) : status.connected ? (
          <button type="button" onClick={importHoldings} disabled={busy} className="btn-primary text-xs disabled:opacity-50">
            {busy ? "Importing…" : "Import my holdings"}
          </button>
        ) : (
          <button type="button" onClick={connect} disabled={busy} className="btn-primary text-xs disabled:opacity-50">
            {busy ? "Opening…" : "Connect a brokerage"}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-down">{error}</p>}
      <p className="mt-1 text-[0.65rem] text-muted-2">Read-only via SnapTrade. We never place trades.</p>
    </div>
  );
}
