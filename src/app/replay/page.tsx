import type { Metadata } from "next";
import { ReplayPageView } from "@/components/ReplayPageView";

export const metadata: Metadata = {
  title: "Market Replay",
  description: "Trade a mystery chart bar-by-bar, blind to the future — beat hindsight bias.",
};

export default function Page() {
  return <ReplayPageView />;
}
