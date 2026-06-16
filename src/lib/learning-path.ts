export type LearningStepId =
  | "price"
  | "grade"
  | "context"
  | "chart"
  | "metrics"
  | "modeling"
  | "options";

export interface LearningStep {
  id: LearningStepId;
  label: string;
  hint: string;
  sectionId: string;
}

export const LEARNING_STEPS: LearningStep[] = [
  { id: "price", label: "Price", hint: "Start with where the stock trades today.", sectionId: "section-price" },
  { id: "grade", label: "Grade", hint: "Get the 5-second summary vs peers.", sectionId: "section-grade" },
  {
    id: "context",
    label: "Context",
    hint: "See headlines and sentiment — then compare to the numbers.",
    sectionId: "section-context",
  },
  { id: "chart", label: "Chart", hint: "See performance vs a benchmark.", sectionId: "section-chart" },
  { id: "metrics", label: "Metrics", hint: "Tap any card — one expands at a time.", sectionId: "section-metrics" },
  { id: "modeling", label: "Tools", hint: "Calculators, forecast, fair value.", sectionId: "section-modeling" },
  { id: "options", label: "Options", hint: "Chain, greeks, and what-if scenarios.", sectionId: "section-options" },
];

export const OPTIONS_LEARNING_STEPS: LearningStep[] = [
  { id: "price", label: "Basics", hint: "Calls, puts, and how options work.", sectionId: "section-options-learn" },
  { id: "grade", label: "Chain", hint: "Pick an expiry and explore strikes.", sectionId: "section-options-chain" },
  { id: "chart", label: "What-if", hint: "Move price and IV to see greeks change.", sectionId: "section-options-whatif" },
];
