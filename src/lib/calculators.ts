/** Pure calculator functions for the modeling toolbox. */

export function positionSize(params: {
  portfolio: number;
  riskPct: number;
  entry: number;
  stop: number;
}): { shares: number; dollarRisk: number; positionValue: number } {
  const { portfolio, riskPct, entry, stop } = params;
  const dollarRisk = portfolio * (riskPct / 100);
  const riskPerShare = Math.abs(entry - stop);
  if (riskPerShare <= 0) return { shares: 0, dollarRisk, positionValue: 0 };
  const shares = Math.floor(dollarRisk / riskPerShare);
  return { shares, dollarRisk, positionValue: shares * entry };
}

export function breakevenCompare(params: {
  stockPrice: number;
  callPremium: number;
  strike: number;
}): {
  sharesCost: number;
  callCost: number;
  stockBreakeven: number;
  callBreakeven: number;
  sharesForSameExposure: number;
} {
  const { stockPrice, callPremium, strike } = params;
  const callCost = callPremium * 100;
  const sharesForSameExposure = Math.max(1, Math.floor(callCost / stockPrice));
  return {
    sharesCost: stockPrice * 100,
    callCost,
    stockBreakeven: stockPrice,
    callBreakeven: strike + callPremium,
    sharesForSameExposure,
  };
}

export function coveredCallYield(params: {
  stockPrice: number;
  callPremium: number;
  strike: number;
  daysToExpiry: number;
}): {
  premiumYield: number;
  annualizedYield: number;
  maxGainIfCalled: number;
  effectiveSalePrice: number;
} {
  const { stockPrice, callPremium, strike, daysToExpiry } = params;
  const premiumYield = (callPremium / stockPrice) * 100;
  const periods = Math.max(1, 365 / Math.max(daysToExpiry, 1));
  const annualizedYield = premiumYield * periods;
  const maxGainIfCalled = ((strike - stockPrice + callPremium) / stockPrice) * 100;
  return {
    premiumYield,
    annualizedYield,
    maxGainIfCalled,
    effectiveSalePrice: strike + callPremium,
  };
}

export function dcaProjection(params: {
  monthly: number;
  years: number;
  annualReturn: number;
}): { totalContributed: number; finalValue: number; gain: number } {
  const { monthly, years, annualReturn } = params;
  const months = years * 12;
  const r = annualReturn / 100 / 12;
  let finalValue = 0;
  for (let i = 0; i < months; i++) {
    finalValue = (finalValue + monthly) * (1 + r);
  }
  const totalContributed = monthly * months;
  return { totalContributed, finalValue, gain: finalValue - totalContributed };
}

export function benchmarkMoveNeeded(currentIndexed: number, targetIndexed: number): number {
  if (!currentIndexed) return 0;
  return ((targetIndexed / currentIndexed - 1) * 100);
}
