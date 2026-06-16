import type { Metadata } from "next";
import { RiskPageView } from "@/components/RiskPageView";

export const metadata: Metadata = {
  title: "Portfolio Risk X-ray",
  description: "See your portfolio's hidden concentration, sector tilt, and crash exposure.",
};

export default function Page() {
  return <RiskPageView />;
}
