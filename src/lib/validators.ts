import type { NewsDigest } from "@/lib/news/types";
import type { ReportCard } from "@/lib/types";

export function isReportCard(value: unknown): value is ReportCard {
  if (typeof value !== "object" || value === null) return false;
  const v = value as ReportCard;
  return typeof v.ticker === "string" && Array.isArray(v.metrics);
}

export function isNewsDigest(value: unknown): value is NewsDigest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as NewsDigest;
  return typeof v.ticker === "string" && Array.isArray(v.articles);
}
