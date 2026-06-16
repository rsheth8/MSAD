import type { Metadata } from "next";
import { getReportCardWithCache } from "@/lib/aggregator/report";
import { overallGrade } from "@/lib/analysis";
import { formatCurrency } from "@/lib/format";

type Props = { params: Promise<{ ticker: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker: raw } = await params;
  const ticker = raw.toUpperCase();
  try {
    const card = await getReportCardWithCache(ticker);
    const grade = overallGrade(card);
    const title = `${card.name} (${ticker})`;
    const description = `${formatCurrency(card.price)} · Grade ${grade.letter} · ${grade.summary.slice(0, 120)}`;
    return {
      title,
      description,
      openGraph: { title, description },
      twitter: { title, description },
    };
  } catch {
    return { title: `${ticker} Stock Report` };
  }
}

export default function StockLayout({ children }: { children: React.ReactNode }) {
  return children;
}
