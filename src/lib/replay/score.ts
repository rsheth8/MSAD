/** Pure scoring for Market Replay. No look-ahead: a stance set on bar i applies
 *  to the return from bar i to i+1. */
import type { ReplayResult, Stance } from "./types";

/** Simple return of the move from bar i to i+1. */
export function stepReturn(series: number[], i: number): number {
  if (i < 0 || i + 1 >= series.length) return 0;
  const a = series[i];
  const b = series[i + 1];
  if (!(a > 0)) return 0;
  return b / a - 1;
}

/**
 * Compute the user's equity vs buy & hold over the decided portion of a game.
 * `stances[k]` is the stance held during the k-th decided step, i.e. the move
 * from bar (startIndex + k) to (startIndex + k + 1).
 */
export function scoreReplay(series: number[], startIndex: number, stances: Stance[]): ReplayResult {
  let you = 1;
  let buyHold = 1;
  let inDays = 0;
  const maxSteps = Math.max(0, series.length - 1 - startIndex);
  const steps = Math.min(stances.length, maxSteps);

  for (let k = 0; k < steps; k++) {
    const r = stepReturn(series, startIndex + k);
    buyHold *= 1 + r;
    if (stances[k] === "in") {
      you *= 1 + r;
      inDays += 1;
    }
  }

  return {
    you,
    buyHold,
    timeInMarket: steps > 0 ? inDays / steps : 0,
    steps,
  };
}
