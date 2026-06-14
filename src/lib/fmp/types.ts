/** Partial shapes for FMP /stable/ JSON — only fields we read. */

export interface FmpProfile {
  symbol: string;
  companyName: string;
  price: number;
  beta: number;
  currency: string;
  exchange: string;
  industry: string;
  lastDividend?: number;
}

export interface FmpQuote {
  symbol: string;
  price: number;
  changePercentage: number;
  timestamp?: number;
}

export interface FmpPeer {
  symbol: string;
  companyName?: string;
}

export interface FmpRatiosTtm {
  symbol: string;
  operatingProfitMarginTTM?: number;
  priceToEarningsRatioTTM?: number;
  dividendYieldTTM?: number;
}

export interface FmpKeyMetricsTtm {
  symbol: string;
  returnOnEquityTTM?: number;
  evToEBITDATTM?: number;
}

export interface FmpBalanceSheet {
  symbol: string;
  totalAssets?: number;
  totalLiabilities?: number;
}

export interface FmpCashFlow {
  symbol: string;
  date: string;
  operatingCashFlow?: number;
}

export interface FmpPriceBar {
  date: string;
  close: number;
  volume?: number;
}
