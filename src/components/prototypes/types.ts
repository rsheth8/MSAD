export interface BgProps {
  /** 0..1 stable hash of the ticker — makes each stock's render unique */
  seed: number;
  /** -1..1 period performance (drives warm/cool, green/red) */
  trend: number;
  /** 0..1 volatility (drives turbulence / storminess / churn) */
  volatility: number;
  isDark: boolean;
  accent: string;
  /** live-updated normalized cursor position (0..1), for reactive concepts */
  mouseRef?: React.RefObject<{ x: number; y: number }>;
  /** liquid surface material */
  material?: LiquidMaterial;
  /** iridescent only: 0..1 strength of the rainbow oil-slick overlay (default 0.62) */
  iridStrength?: number;
  /** iridescent only: 0..1.5 how much the body brightness swings with the shimmer (default 1.18) */
  iridShimmer?: number;
}

export type LiquidMaterial = "jelly" | "matte" | "glass" | "metal" | "iridescent" | "space";

/** Cheap stable string hash → 0..1 */
export function seedFromTicker(ticker: string): number {
  let h = 2166136261;
  for (let i = 0; i < ticker.length; i++) {
    h ^= ticker.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
