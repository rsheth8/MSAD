/** Black-Scholes pricing and greeks (model-based when live chain unavailable). */

const RISK_FREE = 0.045;

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-a * a));
  return sign * y;
}

function normCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function d1d2(S: number, K: number, T: number, sigma: number, r: number) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return { d1, d2 };
}

export function blackScholesPrice(
  type: "call" | "put",
  S: number,
  K: number,
  T: number,
  sigma: number,
  r = RISK_FREE,
): number {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
    const intrinsic =
      type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return intrinsic;
  }
  const { d1, d2 } = d1d2(S, K, T, sigma, r);
  if (type === "call") {
    return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
  }
  return K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export function blackScholesGreeks(
  type: "call" | "put",
  S: number,
  K: number,
  T: number,
  sigma: number,
  r = RISK_FREE,
): Greeks {
  if (T <= 0 || sigma <= 0) {
    return { delta: type === "call" ? (S > K ? 1 : 0) : (S < K ? -1 : 0), gamma: 0, theta: 0, vega: 0 };
  }
  const { d1, d2 } = d1d2(S, K, T, sigma, r);
  const pdf = normPDF(d1);
  const gamma = pdf / (S * sigma * Math.sqrt(T));
  const vega = (S * pdf * Math.sqrt(T)) / 100;
  const thetaCommon = (-(S * pdf * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normCDF(type === "call" ? d2 : -d2)) / 365;

  if (type === "call") {
    return {
      delta: normCDF(d1),
      gamma,
      theta: thetaCommon / 100,
      vega,
    };
  }
  return {
    delta: normCDF(d1) - 1,
    gamma,
    theta: (thetaCommon + r * K * Math.exp(-r * T)) / 100,
    vega,
  };
}

export function quoteLeg(
  type: "call" | "put",
  S: number,
  K: number,
  T: number,
  sigma: number,
): { premium: number; greeks: Greeks; intrinsic: number; extrinsic: number } {
  const intrinsic = type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  const premium = Math.max(0.01, blackScholesPrice(type, S, K, T, sigma));
  const greeks = blackScholesGreeks(type, S, K, T, sigma);
  return { premium, greeks, intrinsic, extrinsic: Math.max(0, premium - intrinsic) };
}

export function moneyness(
  type: "call" | "put",
  S: number,
  K: number,
  tolerance = 0.015,
): "ITM" | "ATM" | "OTM" {
  const pct = Math.abs(S - K) / S;
  if (pct <= tolerance) return "ATM";
  if (type === "call") return S > K ? "ITM" : "OTM";
  return S < K ? "ITM" : "OTM";
}

export function strikeStep(price: number): number {
  if (price < 25) return 2.5;
  if (price < 200) return 5;
  return 10;
}

export function atmStrike(price: number): number {
  const step = strikeStep(price);
  return Math.max(step, Math.round(price / step) * step);
}

export function strikeLadder(price: number, count = 7): number[] {
  const step = strikeStep(price);
  const atm = atmStrike(price);
  const half = Math.floor(count / 2);
  return Array.from({ length: count }, (_, i) =>
    Math.round((atm + (i - half) * step) * 100) / 100,
  ).filter((k) => k > 0);
}

export { RISK_FREE };
