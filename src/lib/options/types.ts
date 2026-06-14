/** Options chain & analytics types. */

export interface OptionLegQuote {
  premium: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  intrinsic: number;
  extrinsic: number;
  breakeven: number;
  moneyness: "ITM" | "ATM" | "OTM";
}

export interface ChainRow {
  strike: number;
  call: OptionLegQuote;
  put: OptionLegQuote;
}

export interface ExpirationEntry {
  date: string;
  days: number;
  label: string;
}

export interface OptionsChainPayload {
  ticker: string;
  underlyingPrice: number;
  asOf: string;
  /** Annualized historical vol from recent daily returns */
  historicalVolatility: number;
  /** ATM implied vol used in the model */
  atmImpliedVolatility: number;
  /** IV minus HV in percentage points */
  ivVsHvSpread: number;
  expirations: ExpirationEntry[];
  chains: Record<string, ChainRow[]>;
  isModelBased: boolean;
}

export type StrategyId =
  | "long-call"
  | "long-put"
  | "covered-call"
  | "protective-put"
  | "straddle"
  | "collar";

export interface StrategyLeg {
  kind: "call" | "put" | "stock";
  side: "long" | "short";
  strike?: number;
  premium?: number;
}

export interface StrategyDefinition {
  id: StrategyId;
  name: string;
  summary: string;
  legs: (ctx: StrategyContext) => StrategyLeg[];
}

export interface StrategyContext {
  price: number;
  atmStrike: number;
  atmCall: OptionLegQuote;
  atmPut: OptionLegQuote;
  otmCallStrike: number;
  otmCall: OptionLegQuote;
  otmPutStrike: number;
  otmPut: OptionLegQuote;
}

export interface StrategyPreset {
  id: StrategyId;
  name: string;
  summary: string;
}
