"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { NeutralBackdrop } from "@/components/NeutralBackdrop";
import { GlassCard } from "@/components/GlassCard";
import { AccentPicker } from "@/components/AccentPicker";
import { SoundToggle, ThemeToggle } from "@/components/OnboardingModal";
import { AccountButton } from "@/components/auth/AccountButton";
import { useSession } from "@/lib/auth/useSession";
import { useProfile } from "@/lib/profile/useProfile";
import { BRAND, MSAD_STORAGE } from "@/lib/brand";
import {
  getLearningPathEnabled,
  setLearningPathEnabled,
} from "@/lib/settings";
import { InvestorProfileForm } from "@/components/discovery/InvestorProfileForm";
import { MockPortfolioEditor } from "@/components/discovery/MockPortfolioEditor";
import { syncPrefsToCloud } from "@/lib/profile/store";

interface BrokerageStatus {
  configured: boolean;
  mode?: "personal" | "commercial";
  authed: boolean;
  connected: boolean;
  brokerLinked?: boolean;
  connectionDisabled?: boolean;
}

interface BrokerageConnection {
  id: string;
  name: string;
  brokerageName: string;
  disabled: boolean;
  type: string;
  createdDate?: string;
}

export function SettingsPage() {
  const { user, authEnabled, durableStore, refresh } = useSession();
  const profile = useProfile();
  const [accent, setAccent] = useState<string>(BRAND.accent);
  const [learningPath, setLearningPath] = useState(true);
  const [brokerStatus, setBrokerStatus] = useState<BrokerageStatus | null>(null);
  const [connections, setConnections] = useState<BrokerageConnection[]>([]);
  const [brokerBusy, setBrokerBusy] = useState(false);
  const [brokerError, setBrokerError] = useState<string | null>(null);
  const [brokerNotice, setBrokerNotice] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    explain: { used: number; limit: number };
    backtest: { used: number; limit: number };
  } | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(MSAD_STORAGE.accent);
    if (saved) setAccent(saved);
    setLearningPath(getLearningPathEnabled());
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
    localStorage.setItem(MSAD_STORAGE.accent, accent);
    import("@/lib/profile/store").then(({ syncPrefsToCloud }) => syncPrefsToCloud());
  }, [accent]);

  const loadBrokerage = useCallback(async () => {
    if (!user) {
      setBrokerStatus(null);
      setConnections([]);
      return;
    }
    try {
      const [statusRes, listRes] = await Promise.all([
        fetch("/api/brokerage/status", { cache: "no-store" }),
        fetch("/api/brokerage/authorizations", { cache: "no-store" }),
      ]);
      if (statusRes.ok) setBrokerStatus((await statusRes.json()) as BrokerageStatus);
      if (listRes.ok) {
        const data = (await listRes.json()) as { connections?: BrokerageConnection[] };
        setConnections(data.connections ?? []);
      }
    } catch {
      setBrokerError("Couldn't load brokerage settings.");
    }
  }, [user]);

  useEffect(() => {
    void loadBrokerage();
    const params = new URLSearchParams(window.location.search);
    if (params.get("brokerage") === "connected") {
      setBrokerNotice("Broker connection updated.");
      window.history.replaceState({}, "", "/settings");
    }
  }, [loadBrokerage]);

  useEffect(() => {
    if (!user) {
      setUsage(null);
      return;
    }
    void fetch("/api/account/usage", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.usage) setUsage(data.usage);
      })
      .catch(() => {});
  }, [user]);

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    await refresh();
  }

  async function signOutEverywhere() {
    if (!window.confirm("Sign out on all devices? You'll need to sign in again everywhere.")) return;
    setAccountBusy(true);
    try {
      await fetch("/api/auth/signout-all", { method: "POST" });
      await refresh();
    } finally {
      setAccountBusy(false);
    }
  }

  async function exportData() {
    setAccountBusy(true);
    try {
      const res = await fetch("/api/account");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `msad-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setBrokerError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setAccountBusy(false);
    }
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        "Permanently delete your account and all cloud data? This cannot be undone. Local browser data will remain until you clear it.",
      )
    ) {
      return;
    }
    setAccountBusy(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await refresh();
      setBrokerNotice("Account deleted.");
    } catch (e) {
      setBrokerError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setAccountBusy(false);
    }
  }

  function toggleLearningPath() {
    const next = !learningPath;
    setLearningPath(next);
    setLearningPathEnabled(next);
    syncPrefsToCloud();
  }

  async function openBrokerPortal() {
    setBrokerBusy(true);
    setBrokerError(null);
    try {
      const res = await fetch("/api/brokerage/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ returnTo: "/settings" }),
      });
      const data = (await res.json()) as { redirectURI?: string; error?: string };
      if (!res.ok || !data.redirectURI) throw new Error(data.error ?? "Couldn't open broker portal");
      window.location.href = data.redirectURI;
    } catch (e) {
      setBrokerError(e instanceof Error ? e.message : "Couldn't open broker portal");
      setBrokerBusy(false);
    }
  }

  async function removeConnection(id: string, name: string) {
    if (!window.confirm(`Remove ${name}? Holdings from this broker will no longer be imported.`)) return;
    setBrokerBusy(true);
    setBrokerError(null);
    setBrokerNotice(null);
    try {
      const res = await fetch(`/api/brokerage/authorizations/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't remove connection");
      setBrokerNotice("Connection removed.");
      await loadBrokerage();
    } catch (e) {
      setBrokerError(e instanceof Error ? e.message : "Couldn't remove connection");
    } finally {
      setBrokerBusy(false);
    }
  }

  async function disconnectSnaptrade() {
    if (
      !window.confirm(
        "Disconnect SnapTrade from your MSAD account? You'll need to reconnect before importing holdings again.",
      )
    ) {
      return;
    }
    setBrokerBusy(true);
    setBrokerError(null);
    setBrokerNotice(null);
    try {
      const res = await fetch("/api/brokerage/link", { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't disconnect");
      setBrokerNotice("SnapTrade disconnected from MSAD.");
      await loadBrokerage();
    } catch (e) {
      setBrokerError(e instanceof Error ? e.message : "Couldn't disconnect");
    } finally {
      setBrokerBusy(false);
    }
  }

  const connectLabel =
    brokerStatus?.connectionDisabled
      ? "Reconnect brokerage"
      : connections.length > 0
        ? "Add or manage connections"
        : "Connect a brokerage";

  return (
    <>
      <NeutralBackdrop accent={accent} />
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="text-xs font-medium text-muted hover:text-foreground">
              ← Your dashboard
            </Link>
            <AccountButton />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="rounded-md px-2 py-0.5 text-xs font-bold tracking-wide text-white"
                style={{ background: "var(--accent)" }}
              >
                {BRAND.id}
              </span>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Account, appearance, and brokerage connections — everything in one place.
            </p>
          </div>
        </header>

        <div className="space-y-4">
          <GlassCard className="p-4 sm:p-5">
            <h2 className="font-display text-sm font-semibold text-foreground">Account</h2>
            <p className="mt-1 text-xs text-muted">Sign in to sync journal and predictions across devices.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {user ? (
                <>
                  {user.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.picture} alt="" className="h-10 w-10 rounded-full" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <button type="button" onClick={signOut} className="btn-ghost interactive text-xs text-down">
                    Sign out
                  </button>
                </>
              ) : authEnabled ? (
                <a href="/api/auth/google" className="btn-primary text-xs">
                  Sign in with Google
                </a>
              ) : (
                <p className="text-xs text-muted">Accounts aren&apos;t configured on this deployment.</p>
              )}
            </div>
            {user && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-foreground/8 px-2.5 py-1 font-medium text-foreground">
                  {profile.journal.length} journal {profile.journal.length === 1 ? "entry" : "entries"}
                </span>
                <span className="rounded-full bg-foreground/8 px-2.5 py-1 font-medium text-foreground">
                  {profile.predictions.length} predictions
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 font-medium ${
                    durableStore ? "bg-up/10 text-up" : "bg-down/10 text-down"
                  }`}
                >
                  {durableStore ? "Cloud sync active" : "Cloud sync unavailable"}
                </span>
              </div>
            )}
            {user && !durableStore && (
              <p className="mt-3 rounded-lg border border-down/30 bg-down/5 px-3 py-2 text-xs text-down">
                Durable storage (KV) isn&apos;t configured on this deployment. Your data is saved
                locally in this browser only and may not persist across server restarts.
              </p>
            )}
            {user && usage && (
              <div className="mt-4 space-y-1 text-xs text-muted">
                <p>
                  AI explanations today: {usage.explain.used}/{usage.explain.limit}
                </p>
                <p>
                  Backtests today: {usage.backtest.used}/{usage.backtest.limit}
                </p>
              </div>
            )}
            {user && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={accountBusy}
                  onClick={() => void exportData()}
                  className="btn-ghost interactive text-xs disabled:opacity-50"
                >
                  Export my data
                </button>
                <button
                  type="button"
                  disabled={accountBusy}
                  onClick={() => void signOutEverywhere()}
                  className="btn-ghost interactive text-xs disabled:opacity-50"
                >
                  Sign out everywhere
                </button>
                <button
                  type="button"
                  disabled={accountBusy}
                  onClick={() => void deleteAccount()}
                  className="btn-ghost interactive text-xs text-down disabled:opacity-50"
                >
                  Delete account
                </button>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-4 sm:p-5">
            <h2 className="font-display text-sm font-semibold text-foreground">Appearance</h2>
            <p className="mt-1 text-xs text-muted">
              {user ? "Synced to your account when signed in." : "Saved on this device."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ThemeToggle />
              <SoundToggle />
              <AccentPicker value={accent} onChange={setAccent} />
            </div>
            <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">Guided learning path</p>
                <p className="text-xs text-muted">Show onboarding hints while you explore.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={learningPath}
                onClick={toggleLearningPath}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  learningPath ? "bg-accent" : "bg-foreground/15"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    learningPath ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </label>
          </GlassCard>

          <GlassCard className="p-4 sm:p-5">
            <h2 className="font-display text-sm font-semibold text-foreground">Your investor criteria</h2>
            <p className="mt-1 text-xs text-muted">
              Powers your passive research queue on the dashboard — fit scores, not buy advice.
            </p>
            <div className="mt-4">
              <InvestorProfileForm initial={profile.investorProfile} />
            </div>
          </GlassCard>

          <GlassCard className="p-4 sm:p-5">
            <h2 className="font-display text-sm font-semibold text-foreground">Mock portfolio</h2>
            <p className="mt-1 text-xs text-muted">
              Optional practice holdings for gap-filling and &quot;before you act&quot; previews. Real
              brokerage import works too — and gives better results.
            </p>
            <div className="mt-4">
              <MockPortfolioEditor initial={profile.mockPortfolio} />
            </div>
          </GlassCard>

          {brokerStatus?.configured && (
            <GlassCard className="p-4 sm:p-5">
              <h2 className="font-display text-sm font-semibold text-foreground">Brokerage connections</h2>
              <p className="mt-1 text-xs text-muted">
                Read-only via SnapTrade. Import holdings on the{" "}
                <Link href="/risk" className="text-accent hover:underline">
                  Risk X-ray
                </Link>
                .
              </p>

              {!user ? (
                <p className="mt-4 text-xs text-muted">
                  <a href="/api/auth/google" className="font-medium text-accent hover:underline">
                    Sign in
                  </a>{" "}
                  to connect a brokerage.
                </p>
              ) : (
                <>
                  {brokerNotice && (
                    <p className="mt-3 rounded-lg border border-up/30 bg-up/5 px-3 py-2 text-xs text-up">
                      {brokerNotice}
                    </p>
                  )}
                  {brokerError && <p className="mt-3 text-xs text-down">{brokerError}</p>}

                  {connections.length === 0 ? (
                    <p className="mt-4 text-xs text-muted">No brokers connected yet.</p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {connections.map((c) => (
                        <li
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{c.brokerageName}</p>
                            <p className="text-xs text-muted">
                              {c.name} · {c.type === "read" ? "Read-only" : c.type}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                                c.disabled
                                  ? "bg-down/10 text-down"
                                  : "bg-up/10 text-up"
                              }`}
                            >
                              {c.disabled ? "Needs reconnect" : "Active"}
                            </span>
                            <button
                              type="button"
                              disabled={brokerBusy}
                              onClick={() => void removeConnection(c.id, c.brokerageName)}
                              className="btn-ghost interactive text-xs text-down disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void openBrokerPortal()}
                      disabled={brokerBusy}
                      className="btn-primary text-xs disabled:opacity-50"
                    >
                      {brokerBusy ? "Opening…" : connectLabel}
                    </button>
                    {brokerStatus.connected && (
                      <button
                        type="button"
                        onClick={() => void disconnectSnaptrade()}
                        disabled={brokerBusy}
                        className="btn-ghost interactive text-xs text-down disabled:opacity-50"
                      >
                        Disconnect SnapTrade
                      </button>
                    )}
                  </div>

                  {brokerStatus.connectionDisabled && (
                    <p className="mt-3 text-xs text-down">
                      A broker session expired. Open the portal and sign in again at your brokerage.
                    </p>
                  )}
                </>
              )}
            </GlassCard>
          )}
        </div>
      </main>
    </>
  );
}
