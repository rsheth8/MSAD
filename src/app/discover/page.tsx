import { DiscoverPage } from "@/components/DiscoverPage";

export const metadata = {
  title: "Discover stocks",
  description:
    "Screen US stocks by market cap, price, P/E, ROE, sector, and more — find lesser-known names worth researching.",
};

export default function DiscoverRoute() {
  return <DiscoverPage />;
}
