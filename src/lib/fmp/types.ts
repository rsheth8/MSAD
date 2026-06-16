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
  netProfitMarginTTM?: number;
  grossProfitMarginTTM?: number;
  priceToEarningsRatioTTM?: number;
  priceToBookRatioTTM?: number;
  priceToSalesRatioTTM?: number;
  priceToFreeCashFlowRatioTTM?: number;
  priceToEarningsGrowthRatioTTM?: number;
  debtToEquityRatioTTM?: number;
  currentRatioTTM?: number;
  dividendYieldTTM?: number;
}

export interface FmpKeyMetricsTtm {
  symbol: string;
  returnOnEquityTTM?: number;
  returnOnInvestedCapitalTTM?: number;
  evToEBITDATTM?: number;
  freeCashFlowYieldTTM?: number;
  netDebtToEBITDATTM?: number;
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
