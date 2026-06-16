import { FmpError, fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";
import { fetchHistoricalBars } from "@/lib/fmp/historical";
import type { FmpProfile, FmpQuote } from "@/lib/fmp/types";
import { getCachedReport, setCachedReport } from "@/lib/cache/report-cache";
import { getMockReportCard } from "@/lib/mock";
import type { ReportCard } from "@/lib/types";
import { buildOptionsData } from "./options";
import { buildMetrics, extractRawMetrics } from "./metrics";
import { fetchFundamentals, fetchPeerAverages } from "./peers";
import { buildSeriesAndChanges, historyFromDate } from "./series";

function normalizeTicker(raw: string): string {
  return (raw || "").toUpperCase().trim().replace(/^\$/, "");
}

/** Aggregate FMP data into the shared ReportCard contract. Falls back to mock when no API key. */
export async function getReportCard(rawTicker: string): Promise<ReportCard> {
  const ticker = normalizeTicker(rawTicker);
  if (!ticker) throw new FmpError("Ticker is required", "NOT_FOUND");

  if (!hasFmpApiKey()) {
    return getMockReportCard(ticker);
  }

  const from = historyFromDate();

  const [profileRes, quoteRes, fundamentals, peerAvgs, stockHist, benchHist] = await Promise.all([
    fmpFetch<FmpProfile[]>("/profile", { symbol: ticker }),
    fmpFetch<FmpQuote[]>("/quote", { symbol: ticker }),
    fetchFundamentals(ticker),
    fetchPeerAverages(ticker),
    fetchHistoricalBars(ticker, from),
    fetchHistoricalBars("SPY", from),
  ]);

  const profile = profileRes[0];
  const quote = quoteRes[0];
  if (!profile?.companyName) {
    throw new FmpError(`No profile found for ${ticker}`, "NOT_FOUND");
  }

  const price = quote?.price ?? profile.price;
  const beta = profile.beta ?? 1;
  const raw = extractRawMetrics(fundamentals);
  const metrics = buildMetrics(raw, peerAvgs);
  const { series, changes } = buildSeriesAndChanges(stockHist ?? [], benchHist ?? [], price);

  // FMP options-chain is often empty on lower tiers — derive educational contracts from live price/beta.
  const options = buildOptionsData(price, beta);

  return {
    name: profile.companyName,
    ticker: profile.symbol ?? ticker,
    industry: profile.industry ?? "—",
    exchange: profile.exchange ?? "—",
    currency: profile.currency ?? "USD",
    price,
    beta,
    changes: {
      ...changes,
      day: quote?.changePercentage ?? changes.week,
    },
    series,
    metrics,
    options,
    asOf: new Date().toISOString(),
    isMock: false,
  };
}

/** Report card with in-memory cache — shared by API route and metadata. */
export async function getReportCardWithCache(rawTicker: string): Promise<ReportCard> {
  const ticker = normalizeTicker(rawTicker);
  const cached = getCachedReport(ticker);
  if (cached) return cached;

  const card = await getReportCard(ticker);
  if (!card.isMock) setCachedReport(ticker, card);
  return card;
}
