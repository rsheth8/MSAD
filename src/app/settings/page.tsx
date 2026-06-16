import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/SettingsPage";

export const metadata: Metadata = {
  title: "Settings",
  description: "Account, appearance, and brokerage connection settings.",
};

export default function Page() {
  return <SettingsPage />;
}
