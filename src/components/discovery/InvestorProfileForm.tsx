"use client";

import { useState } from "react";
import { SCREENER_SECTORS } from "@/lib/screener/presets";
import {
  ACCOUNT_DEFAULTS,
  DEFAULT_INVESTOR_PROFILE,
  RISK_DEFAULTS,
  STYLE_LABELS,
  applyStyleDefaults,
  normalizeInvestorProfile,
} from "@/lib/discovery/investor-profile";
import type {
  AccountSize,
  InvestingHorizon,
  InvestingStyle,
  InvestorProfile,
  RiskComfort,
} from "@/lib/discovery/types";
import { setInvestorProfile } from "@/lib/profile/store";
import { playUiClick } from "@/lib/settings";

const STYLES: InvestingStyle[] = ["learning", "income", "growth", "value", "balanced"];
const HORIZONS: InvestingHorizon[] = ["short", "medium", "long"];
const RISKS: RiskComfort[] = ["calm", "moderate", "aggressive"];
const ACCOUNTS: AccountSize[] = ["small", "medium", "large"];

export function InvestorProfileForm({
  initial,
  onSaved,
  compact,
}: {
  initial?: InvestorProfile | null;
  onSaved?: () => void;
  compact?: boolean;
}) {
  const [profile, setProfile] = useState<InvestorProfile>(() =>
    normalizeInvestorProfile(initial),
  );
  const [saved, setSaved] = useState(false);

  function update(patch: Partial<InvestorProfile>) {
    setProfile((p) => ({ ...p, ...patch }));
  }

  function selectStyle(style: InvestingStyle) {
    setProfile(applyStyleDefaults(style, { ...profile, style }));
  }

  function selectRisk(riskComfort: RiskComfort) {
    update({ riskComfort, betaMax: RISK_DEFAULTS[riskComfort].betaMax });
  }

  function selectAccount(accountSize: AccountSize) {
    update({
      accountSize,
      ...ACCOUNT_DEFAULTS[accountSize],
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setInvestorProfile(profile);
    playUiClick();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-foreground">Investing style</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => selectStyle(s)}
              className={`btn-chip ${profile.style === s ? "btn-chip-active" : "btn-chip-inactive"}`}
            >
              {STYLE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-foreground">Horizon</label>
          <select
            value={profile.horizon}
            onChange={(e) => update({ horizon: e.target.value as InvestingHorizon })}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="short">Short (weeks–months)</option>
            <option value="medium">Medium (months–years)</option>
            <option value="long">Long (years+)</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Risk comfort</label>
          <div className="mt-1 flex gap-1">
            {RISKS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => selectRisk(r)}
                className={`btn-chip flex-1 capitalize ${profile.riskComfort === r ? "btn-chip-active" : "btn-chip-inactive"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground">Account size</label>
          <div className="mt-1 flex gap-1">
            {ACCOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => selectAccount(a)}
                className={`btn-chip flex-1 capitalize ${profile.accountSize === a ? "btn-chip-active" : "btn-chip-inactive"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!compact && (
        <>
          <div>
            <label className="text-xs font-medium text-foreground">
              Describe what you&apos;re looking for (optional)
            </label>
            <textarea
              value={profile.naturalLanguageCriteria ?? ""}
              onChange={(e) => update({ naturalLanguageCriteria: e.target.value })}
              rows={2}
              placeholder='e.g. "steady dividend payers under $50, mid-cap tech"'
              className="mt-1 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs">
              <span className="font-medium text-foreground">Market cap min ($B)</span>
              <input
                type="number"
                step={0.1}
                value={profile.marketCapMinB}
                onChange={(e) => update({ marketCapMinB: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="font-medium text-foreground">Market cap max ($B)</span>
              <input
                type="number"
                step={0.5}
                value={profile.marketCapMaxB}
                onChange={(e) => update({ marketCapMaxB: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="font-medium text-foreground">Max share price ($)</span>
              <input
                type="number"
                value={profile.priceMax}
                onChange={(e) => update({ priceMax: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="font-medium text-foreground">Max beta</span>
              <input
                type="number"
                step={0.1}
                value={profile.betaMax}
                onChange={(e) => update({ betaMax: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-sm"
              />
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Preferred sectors (optional)</label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {SCREENER_SECTORS.map((s) => {
                const on = profile.sectorsInclude.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      update({
                        sectorsInclude: on
                          ? profile.sectorsInclude.filter((x) => x !== s)
                          : [...profile.sectorsInclude, s],
                      })
                    }
                    className={`btn-chip text-[0.65rem] ${on ? "btn-chip-active" : "btn-chip-inactive"}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary text-sm">
          Save criteria
        </button>
        {saved && <span className="text-xs text-up">Saved — refresh your research queue on the dashboard.</span>}
        {!initial?.profileComplete && (
          <button
            type="button"
            className="text-xs text-muted hover:text-foreground"
            onClick={() => setProfile({ ...DEFAULT_INVESTOR_PROFILE })}
          >
            Reset defaults
          </button>
        )}
      </div>
    </form>
  );
}
