import type {
  ChainRow,
  OptionLegQuote,
  StrategyContext,
  StrategyDefinition,
  StrategyId,
  StrategyLeg,
  StrategyPreset,
} from "./types";
import { atmStrike, strikeStep } from "./black-scholes";

function findRow(chain: ChainRow[], strike: number): ChainRow {
  return (
    chain.find((r) => r.strike === strike) ??
    chain.reduce((best, r) =>
      Math.abs(r.strike - strike) < Math.abs(best.strike - strike) ? r : best,
    )
  );
}

export function buildStrategyContext(price: number, chain: ChainRow[]): StrategyContext {
  const atm = atmStrike(price);
  const step = strikeStep(price);
  const atmRow = findRow(chain, atm);
  const otmCallRow = findRow(chain, atm + step);
  const otmPutRow = findRow(chain, Math.max(step, atm - step));
  return {
    price,
    atmStrike: atm,
    atmCall: atmRow.call,
    atmPut: atmRow.put,
    otmCallStrike: otmCallRow.strike,
    otmCall: otmCallRow.call,
    otmPutStrike: otmPutRow.strike,
    otmPut: otmPutRow.put,
  };
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  { id: "long-call", name: "Long Call", summary: "Bullish bet with limited risk (premium paid)." },
  { id: "long-put", name: "Long Put", summary: "Bearish bet or portfolio hedge — max loss is premium." },
  { id: "covered-call", name: "Covered Call", summary: "Own shares + sell a call for income; caps upside." },
  { id: "protective-put", name: "Protective Put", summary: "Own shares + buy a put — insurance against a drop." },
  { id: "straddle", name: "Long Straddle", summary: "Buy ATM call + put — profits from a big move either way." },
  { id: "collar", name: "Collar", summary: "Own shares, sell OTM call, buy OTM put — defined range." },
];

const STRATEGIES: StrategyDefinition[] = [
  {
    id: "long-call",
    name: "Long Call",
    summary: STRATEGY_PRESETS[0].summary,
    legs: (ctx) => [
      { kind: "call", side: "long", strike: ctx.atmStrike, premium: ctx.atmCall.premium },
    ],
  },
  {
    id: "long-put",
    name: "Long Put",
    summary: STRATEGY_PRESETS[1].summary,
    legs: (ctx) => [
      { kind: "put", side: "long", strike: ctx.atmStrike, premium: ctx.atmPut.premium },
    ],
  },
  {
    id: "covered-call",
    name: "Covered Call",
    summary: STRATEGY_PRESETS[2].summary,
    legs: (ctx) => [
      { kind: "stock", side: "long" },
      {
        kind: "call",
        side: "short",
        strike: ctx.otmCallStrike,
        premium: ctx.otmCall.premium,
      },
    ],
  },
  {
    id: "protective-put",
    name: "Protective Put",
    summary: STRATEGY_PRESETS[3].summary,
    legs: (ctx) => [
      { kind: "stock", side: "long" },
      { kind: "put", side: "long", strike: ctx.atmStrike, premium: ctx.atmPut.premium },
    ],
  },
  {
    id: "straddle",
    name: "Long Straddle",
    summary: STRATEGY_PRESETS[4].summary,
    legs: (ctx) => [
      { kind: "call", side: "long", strike: ctx.atmStrike, premium: ctx.atmCall.premium },
      { kind: "put", side: "long", strike: ctx.atmStrike, premium: ctx.atmPut.premium },
    ],
  },
  {
    id: "collar",
    name: "Collar",
    summary: STRATEGY_PRESETS[5].summary,
    legs: (ctx) => [
      { kind: "stock", side: "long" },
      { kind: "call", side: "short", strike: ctx.otmCallStrike, premium: ctx.otmCall.premium },
      { kind: "put", side: "long", strike: ctx.otmPutStrike, premium: ctx.otmPut.premium },
    ],
  },
];

export function getStrategy(id: StrategyId): StrategyDefinition {
  return STRATEGIES.find((s) => s.id === id) ?? STRATEGIES[0];
}

export function strategyPayoff(legs: StrategyLeg[], S: number, entryPrice: number): number {
  let pl = 0;
  for (const leg of legs) {
    const mult = leg.side === "long" ? 1 : -1;
    if (leg.kind === "stock") {
      pl += mult * (S - entryPrice);
      continue;
    }
    const K = leg.strike ?? entryPrice;
    const prem = leg.premium ?? 0;
    const intrinsic =
      leg.kind === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
    pl += mult * (intrinsic - prem);
  }
  return pl;
}

export function strategyMaxRisk(legs: StrategyLeg[], entryPrice: number): number | null {
  let risk = 0;
  for (const leg of legs) {
    if (leg.kind === "stock" && leg.side === "long") continue;
    if (leg.side === "long") risk += (leg.premium ?? 0) * 100;
    if (leg.kind === "call" && leg.side === "short") return null;
  }
  void entryPrice;
  return risk;
}

export function legFromChain(
  type: "call" | "put",
  row: ChainRow,
): { strike: number; premium: number; quote: OptionLegQuote } {
  const quote = type === "call" ? row.call : row.put;
  return { strike: row.strike, premium: quote.premium, quote };
}
