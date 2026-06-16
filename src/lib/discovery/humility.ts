import { summarizeCalibration } from "@/lib/profile/calibration";
import type { JournalEntry, Prediction } from "@/lib/profile/types";

/** Passive humility note from calibration + journal — not a buy/sell signal. */
export function discoveryHumilityNote(
  predictions: Prediction[],
  journal: JournalEntry[],
): string | null {
  const cal = summarizeCalibration(predictions);
  const reviewed = journal.filter((e) => e.reviewedAt);
  const wrong = reviewed.filter((e) => e.outcome === "wrong").length;

  if (cal.resolved >= 5 && cal.readiness.score < 40) {
    return `Your calibration score is ${cal.readiness.score}/100 (${cal.readiness.label.toLowerCase()}). Treat new matches as practice research — not conviction trades.`;
  }

  if (reviewed.length >= 3 && wrong / reviewed.length > 0.5) {
    return `More than half of your reviewed theses didn't hold up. Use the research queue to study names, then log a thesis before acting.`;
  }

  if (cal.overconfidence != null && cal.overconfidence > 0.15 && cal.resolved >= 3) {
    return `Your predictions run hotter than outcomes. Size your curiosity, not your confidence, on new ideas.`;
  }

  return null;
}
