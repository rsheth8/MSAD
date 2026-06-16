import { NewsHub } from "@/components/NewsHub";

export const metadata = {
  title: "Market news",
  description:
    "Search and filter market news across stocks, indices, currencies, and more — with plain-English context and sentiment for beginners.",
};

export default function NewsRoute() {
  return <NewsHub />;
}
