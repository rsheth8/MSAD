import { FmpError, fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";
import { fetchHistoricalBars } from "@/lib/fmp/historical";
import type { FmpProfile, FmpQuote } from "@/lib/fmp/types";
import { buildOptionsChain, mockPriceBars } from "@/lib/options/chain-builder";
import type { OptionsChainPayload } from "@/lib/options/types";
import { getMockReportCard } from "@/lib/mock";

function normalizeTicker(raw: string): string {
  return (raw || "").toUpperCase().trim().replace(/^\$/, "");
}

export async function getOptionsChain(rawTicker: string): Promise<OptionsChainPayload> {
  const ticker = normalizeTicker(rawTicker);
  if (!ticker) throw new FmpError("Ticker is required", "NOT_FOUND");

  if (!hasFmpApiKey()) {
    const mock = getMockReportCard(ticker);
    const bars = mockPriceBars(ticker, mock.price);
    return buildOptionsChain(ticker, mock.price, bars, mock.beta);
  }

  const from = new Date();
  from.setDate(from.getDate() - 90);

  const [profileRes, quoteRes, bars] = await Promise.all([
    fmpFetch<FmpProfile[]>("/profile", { symbol: ticker }),
    fmpFetch<FmpQuote[]>("/quote", { symbol: ticker }),
    fetchHistoricalBars(ticker, from.toISOString().slice(0, 10)),
  ]);

  const profile = profileRes[0];
  if (!profile?.companyName) throw new FmpError(`No profile found for ${ticker}`, "NOT_FOUND");

  const price = quoteRes[0]?.price ?? profile.price;
  const beta = profile.beta ?? 1;

  return buildOptionsChain(ticker, price, bars ?? [], beta);
}
