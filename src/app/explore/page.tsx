import { ExplorePage } from "@/components/ExplorePage";

export const metadata = {
  title: "Stock explorer",
  description:
    "Advanced multi-factor stock screener — filter US stocks by valuation, quality, income, and size with a sortable, exportable results table.",
};

export default function ExploreRoute() {
  return <ExplorePage />;
}
