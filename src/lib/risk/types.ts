/** Portfolio Risk X-ray — what you're really exposed to, in plain words. */

/** User input: a ticker and a weight (any positive numbers; normalized later). */
export interface Holding {
  ticker: string;
  weight: number;
}

/** What the engine needs per holding (prices + a little metadata). */
export interface RiskAsset {
  ticker: string;
  weight: number;
  dates: string[];
  closes: number[];
  sector: string;
  beta: number;
}

export interface SectorSlice {
  sector: string;
  weight: number;
}

export interface CrashScenario {
  label: string;
  marketDrop: number; // e.g. -0.34
  estDrop: number; // beta-implied portfolio move
}

export interface RiskResult {
  holdings: { ticker: string; weight: number; sector: string; beta: number }[];
  concentration: {
    topTicker: string;
    topWeight: number;
    /** Herfindahl index of weights (1 = everything in one name) */
    hhi: number;
    /** 1/HHI — how many names you're *really* diversified across */
    effectiveHoldings: number;
  };
  sectors: SectorSlice[];
  portfolioBeta: number;
  /** annualized volatility of the blended portfolio */
  volatility: number;
  maxDrawdown: number;
  /** average pairwise correlation of holdings' returns (null if <2 holdings) */
  avgCorrelation: number | null;
  scenarios: CrashScenario[];
  warnings: string[];
  isMock: boolean;
}
