"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReportCard } from "@/lib/types";
import { CalculatorsPanel } from "./CalculatorsPanel";
import { CollapsibleSection } from "./CollapsibleSection";
import { MonteCarloForecast } from "./MonteCarloForecast";
import { PeerFairValue } from "./PeerFairValue";
import { TabPanels, TabPills } from "./TabPills";

type Tab = "calc" | "forecast" | "fairvalue";

const MODELING_TABS = [
  { id: "calc" as const, label: "Calculators" },
  { id: "forecast" as const, label: "Forecast" },
  { id: "fairvalue" as const, label: "Fair value" },
];

export function ModelingHub({ data }: { data: ReportCard }) {
  const [tab, setTab] = useState<Tab>("calc");

  return (
    <CollapsibleSection
      title="Modeling & Calculators"
      subtitle="Forecast scenarios, run the numbers, and explore peer-implied valuations."
      defaultOpen={false}
    >
      <div className="flex flex-wrap items-center gap-3">
        <TabPills tabs={MODELING_TABS} value={tab} onChange={setTab} layoutId="modeling-hub-tabs" />
        <Link href={`/compare?a=${data.ticker}&b=SPY`} className="btn-ghost interactive text-xs">
          Compare tickers →
        </Link>
      </div>

      <TabPanels activeKey={tab}>
        {tab === "calc" && <CalculatorsPanel data={data} />}
        {tab === "forecast" && <MonteCarloForecast data={data} />}
        {tab === "fairvalue" && <PeerFairValue data={data} />}
      </TabPanels>
    </CollapsibleSection>
  );
}
