/**
 * Calibration — the visible "you're getting better" number that a tip-service
 * can't fake. Pure functions over resolved predictions so they're easy to test.
 *
 * Brier score = mean((p_yes - outcome)^2). 0 = perfect, 0.25 = a coin flip
 * answered at 50%, 1 = confidently wrong every time. We turn it into a friendly
 * 0–100 readiness signal that also respects sample size (you can't be "ready"
 * off three lucky calls).
 */
import type { Prediction } from "./types";

export interface CalibrationSummary {
  resolved: number;
  /** fraction of calls where the leaned-to side matched the outcome */
  accuracy: number | null;
  brier: number | null;
  /** avg(confidence) − accuracy; >0 means overconfident, <0 underconfident */
  overconfidence: number | null;
  readiness: { score: number; label: string; blurb: string };
}

const MIN_SAMPLE = 10; // below this, readiness is capped — not enough evidence

export function summarizeCalibration(predictions: Prediction[]): CalibrationSummary {
  const done = predictions.filter((p) => p.resolved && typeof p.outcome === "boolean");
  const n = done.length;

  if (n === 0) {
    return {
      resolved: 0,
      accuracy: null,
      brier: null,
      overconfidence: null,
      readiness: { score: 0, label: "Not started", blurb: "Log a few predictions to start your track record." },
    };
  }

  let hits = 0;
  let brierSum = 0;
  let confSum = 0;
  for (const p of done) {
    const yes = p.outcome === true;
    const pYes = clamp01(p.confidence);
    brierSum += (pYes - (yes ? 1 : 0)) ** 2;
    confSum += pYes;
    const leanedYes = pYes >= 0.5;
    if (leanedYes === yes) hits += 1;
  }
  const accuracy = hits / n;
  const brier = brierSum / n;
  const overconfidence = confSum / n - accuracy;

  return { resolved: n, accuracy, brier, overconfidence, readiness: readinessFrom(n, brier) };
}

function readinessFrom(n: number, brier: number): CalibrationSummary["readiness"] {
  // Skill from Brier: 0.25 (random) → 0, 0.0 (perfect) → 100.
  const skill = clamp01((0.25 - brier) / 0.25) * 100;
  // Confidence in that estimate grows with sample size, capped at MIN_SAMPLE.
  const evidence = Math.min(n, MIN_SAMPLE) / MIN_SAMPLE;
  const score = Math.round(skill * evidence);

  if (n < MIN_SAMPLE) {
    return {
      score,
      label: "Warming up",
      blurb: `${n}/${MIN_SAMPLE} calls resolved. Keep going — readiness needs a real sample to mean anything.`,
    };
  }
  if (score >= 75) {
    return { score, label: "Well-calibrated", blurb: "Your confidence tracks reality. A green light to test small, real positions — your rules, your risk." };
  }
  if (score >= 50) {
    return { score, label: "Finding your footing", blurb: "Decent calibration. Tighten the calls you get wrong before sizing up." };
  }
  if (score >= 25) {
    return { score, label: "Miscalibrated", blurb: "Your confidence and outcomes don't line up yet. Practice is exactly the place to fix that — for free." };
  }
  return { score, label: "Overconfident", blurb: "The calls are confident but often wrong. This is the cheapest possible place to learn that lesson." };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Convenience: predictions whose resolveOn has passed but aren't resolved. */
export function dueForResolution(predictions: Prediction[], now: Date = new Date()): Prediction[] {
  return predictions.filter((p) => !p.resolved && new Date(p.resolveOn).getTime() <= now.getTime());
}
