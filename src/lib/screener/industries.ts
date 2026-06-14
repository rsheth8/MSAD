/** Common FMP industry strings — subset for dropdown (sector → industries). */
export const INDUSTRIES_BY_SECTOR: Record<string, string[]> = {
  Technology: [
    "Software—Application",
    "Software—Infrastructure",
    "Semiconductors",
    "Information Technology Services",
    "Computer Hardware",
    "Electronic Components",
  ],
  Healthcare: [
    "Drug Manufacturers—General",
    "Biotechnology",
    "Medical Devices",
    "Healthcare Plans",
    "Diagnostics & Research",
  ],
  "Financial Services": [
    "Banks—Regional",
    "Banks—Diversified",
    "Insurance—Property & Casualty",
    "Asset Management",
    "Credit Services",
  ],
  "Consumer Cyclical": [
    "Auto Manufacturers",
    "Restaurants",
    "Apparel Retail",
    "Internet Retail",
    "Lodging",
  ],
  "Consumer Defensive": [
    "Beverages—Non-Alcoholic",
    "Household & Personal Products",
    "Packaged Foods",
    "Discount Stores",
  ],
  Industrials: [
    "Aerospace & Defense",
    "Railroads",
    "Industrial Distribution",
    "Specialty Industrial Machinery",
  ],
  Energy: ["Oil & Gas E&P", "Oil & Gas Integrated", "Oil & Gas Equipment & Services"],
  Utilities: ["Utilities—Regulated Electric", "Utilities—Renewable"],
  "Real Estate": ["REIT—Residential", "REIT—Retail", "REIT—Industrial"],
  "Basic Materials": ["Specialty Chemicals", "Gold", "Steel"],
  "Communication Services": ["Entertainment", "Internet Content & Information"],
};

export function industriesForSector(sector: string): string[] {
  if (!sector) {
    return Object.values(INDUSTRIES_BY_SECTOR).flat();
  }
  return INDUSTRIES_BY_SECTOR[sector] ?? [];
}
