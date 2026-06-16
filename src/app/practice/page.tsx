import type { Metadata } from "next";
import { PracticePage } from "@/components/PracticePage";

export const metadata: Metadata = {
  title: "Hypothesis Lab",
  description: "Backtest a trading rule against real history — with honest caveats.",
};

export default function Page() {
  return <PracticePage />;
}
