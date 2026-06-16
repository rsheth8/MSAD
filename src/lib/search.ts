import { CATALOG_ROWS, type CatalogItem } from "@/lib/catalog";
import { fmpFetch, hasFmpApiKey } from "@/lib/fmp/client";

export interface SymbolHit {
  symbol: string;
  name: string;
  exchange?: string;
  source: "fmp" | "catalog";
}

interface FmpSearchRow {
  symbol?: string;
  name?: string;
  exchange?: string;
  exchangeShortName?: string;
}

const US_EXCHANGES = new Set(["NASDAQ", "NYSE", "AMEX", "NYSEARCA", "BATS"]);

function catalogItems(): CatalogItem[] {
  const items: CatalogItem[] = [];
  for (const row of CATALOG_ROWS) {
    for (const item of row.items) items.push(item);
  }
  return items;
}

function scoreCatalogHit(item: CatalogItem, needle: string): number | null {
  const sym = item.ticker.toLowerCase();
  const name = item.name.toLowerCase();
  if (sym === needle) return 100;
  if (sym.startsWith(needle)) return 80;
  if (name.startsWith(needle)) return 70;
  if (sym.includes(needle) || name.includes(needle)) return 40;
  return null;
}

/** Local catalog matches — works without an API key. */
export function searchCatalog(query: string, limit = 8): SymbolHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 1) return [];

  return catalogItems()
    .map((item) => {
      const score = scoreCatalogHit(item, needle);
      if (score == null) return null;
      const hit: SymbolHit = {
        symbol: item.ticker,
        name: item.name,
        source: "catalog",
        ...(item.kind === "etf" ? { exchange: "ETF" } : {}),
      };
      return { hit, score };
    })
    .filter((row): row is { hit: SymbolHit; score: number } => row !== null)
    .sort((a, b) => b.score - a.score || a.hit.symbol.localeCompare(b.hit.symbol))
    .slice(0, limit)
    .map((row) => row.hit);
}

function mapFmpRow(row: FmpSearchRow): SymbolHit | null {
  const symbol = row.symbol?.trim().toUpperCase();
  const name = row.name?.trim();
  if (!symbol || !name) return null;
  const exchange = row.exchangeShortName ?? row.exchange;
  return {
    symbol,
    name,
    source: "fmp",
    ...(exchange ? { exchange } : {}),
  };
}

function mergeHits(primary: SymbolHit[], secondary: SymbolHit[], limit: number): SymbolHit[] {
  const seen = new Set<string>();
  const out: SymbolHit[] = [];
  for (const hit of [...primary, ...secondary]) {
    if (seen.has(hit.symbol)) continue;
    seen.add(hit.symbol);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}

function preferUsHits(hits: SymbolHit[]): SymbolHit[] {
  const us = hits.filter((h) => h.exchange && US_EXCHANGES.has(h.exchange.toUpperCase()));
  return us.length ? us : hits;
}

async function searchFmp(query: string, limit: number): Promise<SymbolHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const [bySymbol, byName] = await Promise.all([
    fmpFetch<FmpSearchRow[]>("/search-symbol", { query: q, limit }).catch(() => [] as FmpSearchRow[]),
    fmpFetch<FmpSearchRow[]>("/search-name", { query: q, limit }).catch(() => [] as FmpSearchRow[]),
  ]);

  const mapped = preferUsHits(
    mergeHits(
      (bySymbol ?? []).map(mapFmpRow).filter((h): h is SymbolHit => h !== null),
      (byName ?? []).map(mapFmpRow).filter((h): h is SymbolHit => h !== null),
      limit,
    ),
  );

  return mapped.slice(0, limit);
}

/** Symbol + company name search. FMP when configured, catalog fallback otherwise. */
export async function searchSymbols(query: string, limit = 8): Promise<SymbolHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const catalog = searchCatalog(q, limit);

  if (!hasFmpApiKey()) {
    return catalog;
  }

  try {
    const remote = await searchFmp(q, limit);
    if (!remote.length) return catalog;
    return mergeHits(remote, catalog, limit);
  } catch {
    return catalog;
  }
}
