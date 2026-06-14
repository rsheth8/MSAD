import { allCatalogTickers } from "@/lib/catalog";
import type { ScreenerResultRow } from "./types";

/** Deterministic mock results when no API key — still useful for UI dev. */
export function getMockScreenerResults(
  presetId: string,
  catalog: Set<string> = new Set(allCatalogTickers()),
): ScreenerResultRow[] {
  const base: ScreenerResultRow[] = [
    {
      symbol: "DT",
      name: "Dynatrace",
      price: 52.4,
      marketCap: 15_200_000_000,
      sector: "Technology",
      industry: "Software",
      beta: 1.1,
      dividend: 0,
      volume: 1_200_000,
      exchange: "NYSE",
      pe: 42,
      roe: 0.08,
      evEbitda: 28,
      peVsIndustryPct: 25,
      roeVsIndustryPct: -12,
      inCatalog: catalog.has("DT"),
    },
    {
      symbol: "PAYC",
      name: "Paycom Software",
      price: 198,
      marketCap: 11_400_000_000,
      sector: "Technology",
      industry: "Software",
      beta: 1.05,
      dividend: 0,
      volume: 450_000,
      exchange: "NYSE",
      pe: 22,
      roe: 0.18,
      evEbitda: 15,
      peVsIndustryPct: -5,
      roeVsIndustryPct: 8,
      inCatalog: catalog.has("PAYC"),
    },
    {
      symbol: "OLED",
      name: "Universal Display",
      price: 178,
      marketCap: 8_400_000_000,
      sector: "Technology",
      industry: "Semiconductors",
      beta: 1.3,
      dividend: 0.04,
      volume: 380_000,
      exchange: "NASDAQ",
      pe: 35,
      roe: 0.22,
      evEbitda: 24,
      peVsIndustryPct: 18,
      roeVsIndustryPct: 15,
      inCatalog: catalog.has("OLED"),
    },
    {
      symbol: "GNTX",
      name: "Gentex",
      price: 32.5,
      marketCap: 7_100_000_000,
      sector: "Consumer Cyclical",
      industry: "Auto Parts",
      beta: 0.95,
      dividend: 0.06,
      volume: 1_800_000,
      exchange: "NASDAQ",
      pe: 14,
      roe: 0.17,
      evEbitda: 9,
      peVsIndustryPct: -15,
      roeVsIndustryPct: 6,
      inCatalog: catalog.has("GNTX"),
    },
    {
      symbol: "MGRC",
      name: "McGrath RentCorp",
      price: 118,
      marketCap: 2_900_000_000,
      sector: "Industrials",
      industry: "Rental",
      beta: 0.88,
      dividend: 0.025,
      volume: 120_000,
      exchange: "NASDAQ",
      pe: 16,
      roe: 0.14,
      evEbitda: 11,
      peVsIndustryPct: -8,
      roeVsIndustryPct: 2,
      inCatalog: false,
    },
    {
      symbol: "IOSP",
      name: "Innospec",
      price: 102,
      marketCap: 2_400_000_000,
      sector: "Basic Materials",
      industry: "Specialty Chemicals",
      beta: 0.75,
      dividend: 0.02,
      volume: 95_000,
      exchange: "NASDAQ",
      pe: 17,
      roe: 0.12,
      evEbitda: 10,
      peVsIndustryPct: -3,
      roeVsIndustryPct: -5,
      inCatalog: false,
    },
  ];

  if (presetId === "dividend-quiet") {
    return base.map((r) => ({ ...r, dividend: Math.max(r.dividend, 0.03) }));
  }
  if (presetId === "micro-cap") {
    return base.map((r) => ({ ...r, marketCap: r.marketCap / 8, inCatalog: false }));
  }
  if (presetId === "pricier-than-peers") {
    return base.filter((r) => (r.peVsIndustryPct ?? 0) >= 10);
  }
  if (presetId === "weaker-roe-peers") {
    return base.filter((r) => (r.roeVsIndustryPct ?? 0) <= -5);
  }
  return base;
}
