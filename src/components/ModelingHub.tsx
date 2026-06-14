"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReportCard } from "@/lib/types";
import { CalculatorsPanel } from "./CalculatorsPanel";
import { CollapsibleSection } from "./CollapsibleSection";
import { MonteCarloForecast } from "./MonteCarloForecast";
import { PeerFairValue } from "./PeerFairValue";

type Tab = "calc" | "forecast" | "fairvalue";

export function ModelingHub({ data }: { data: ReportCard }) {
  const [tab, setTab] = useState<Tab>("calc");

  const tabs: { id: Tab; label: string }[] = [
    { id: "calc", label: "Calculators" },
    { id: "forecast", label: "Forecast" },
    { id: "fairvalue", label: "Fair value" },
  ];

  return (
    <CollapsibleSection
      title="Modeling & Calculators"
      subtitle="Forecast scenarios, run the numbers, and explore peer-implied valuations."
      defaultOpen={false}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="surface flex rounded-full p-0.5 text-xs font-medium">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`btn-pill ${tab === t.id ? "btn-pill-active" : "btn-pill-inactive"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link href={`/compare?a=${data.ticker}&b=SPY`} className="btn-ghost interactive">
          Compare tickers →
        </Link>
      </div>

      {tab === "calc" && <CalculatorsPanel data={data} />}
      {tab === "forecast" && <MonteCarloForecast data={data} />}
      {tab === "fairvalue" && <PeerFairValue data={data} />}
    </CollapsibleSection>
  );
}
