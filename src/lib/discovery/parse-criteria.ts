import { SCREENER_SECTORS } from "@/lib/screener/presets";

export interface ParsedCriteria {
  marketCapMinB?: number;
  marketCapMaxB?: number;
  priceMax?: number;
  betaMax?: number;
  peMax?: number;
  roeMinPct?: number;
  dividendMin?: number;
  sector?: string;
}

const SECTOR_ALIASES: Record<string, string> = {
  tech: "Technology",
  technology: "Technology",
  healthcare: "Healthcare",
  health: "Healthcare",
  finance: "Financial Services",
  financial: "Financial Services",
  bank: "Financial Services",
  energy: "Energy",
  industrial: "Industrials",
  industrials: "Industrials",
  utility: "Utilities",
  utilities: "Utilities",
  reit: "Real Estate",
  "real estate": "Real Estate",
  consumer: "Consumer Cyclical",
  defensive: "Consumer Defensive",
  materials: "Basic Materials",
  communication: "Communication Services",
};

/** Rule-based NL → screener hints. No AI required. */
export function parseNaturalLanguageCriteria(text: string): ParsedCriteria {
  const t = text.toLowerCase();
  const out: ParsedCriteria = {};

  if (/\b(micro[\s-]?cap|very small)\b/.test(t)) {
    out.marketCapMinB = 0.05;
    out.marketCapMaxB = 0.5;
  } else if (/\b(small[\s-]?cap|small cap)\b/.test(t)) {
    out.marketCapMinB = 0.3;
    out.marketCapMaxB = 2;
  } else if (/\b(mid[\s-]?cap|mid cap)\b/.test(t)) {
    out.marketCapMinB = 1;
    out.marketCapMaxB = 10;
  } else if (/\b(large[\s-]?cap|large cap|mega[\s-]?cap)\b/.test(t)) {
    out.marketCapMinB = 10;
    out.marketCapMaxB = 500;
  }

  const underPrice = t.match(/under\s*\$?\s*(\d+)/);
  if (underPrice) out.priceMax = Number(underPrice[1]);

  const belowPrice = t.match(/below\s*\$?\s*(\d+)\s*(?:per share|\/share|a share)?/);
  if (belowPrice) out.priceMax = Number(belowPrice[1]);

  if (/\b(low vol|low volatility|steady|calm|defensive)\b/.test(t)) out.betaMax = 1;
  if (/\b(aggressive|high growth|volatile)\b/.test(t)) out.betaMax = 2;

  if (/\b(dividend|income|yield)\b/.test(t)) out.dividendMin = 0.01;
  if (/\b(high yield)\b/.test(t)) out.dividendMin = 0.03;

  if (/\b(value|cheap|undervalued)\b/.test(t)) out.peMax = 18;
  if (/\b(growth|compound)\b/.test(t)) out.roeMinPct = 12;

  const peUnder = t.match(/p\/e\s*(?:under|below|<)\s*(\d+)/);
  if (peUnder) out.peMax = Number(peUnder[1]);

  for (const [alias, sector] of Object.entries(SECTOR_ALIASES)) {
    if (t.includes(alias)) {
      out.sector = sector;
      break;
    }
  }

  for (const sector of SCREENER_SECTORS) {
    if (t.includes(sector.toLowerCase())) {
      out.sector = sector;
      break;
    }
  }

  return out;
}

export function describeParsedCriteria(parsed: ParsedCriteria): string[] {
  const parts: string[] = [];
  if (parsed.marketCapMinB != null && parsed.marketCapMaxB != null) {
    parts.push(`Market cap $${parsed.marketCapMinB}B–$${parsed.marketCapMaxB}B`);
  }
  if (parsed.priceMax != null) parts.push(`Share price under $${parsed.priceMax}`);
  if (parsed.betaMax != null) parts.push(`Beta under ${parsed.betaMax}`);
  if (parsed.dividendMin != null) parts.push(`Dividend yield above ${(parsed.dividendMin * 100).toFixed(1)}%`);
  if (parsed.peMax != null) parts.push(`P/E under ${parsed.peMax}`);
  if (parsed.roeMinPct != null) parts.push(`ROE above ${parsed.roeMinPct}%`);
  if (parsed.sector) parts.push(`Sector: ${parsed.sector}`);
  return parts;
}
