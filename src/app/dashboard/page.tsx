import type { Metadata } from "next";
import { DashboardPage } from "@/components/DashboardPage";

export const metadata: Metadata = {
  title: "Your dashboard",
  description: "Your conviction journal, predictions, and calibration score.",
};

export default function Page() {
  return <DashboardPage />;
}
