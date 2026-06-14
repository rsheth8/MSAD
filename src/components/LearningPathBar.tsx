"use client";

import { motion } from "framer-motion";
import { LEARNING_STEPS, type LearningStepId } from "@/lib/learning-path";
import { playUiClick } from "@/lib/settings";

export function LearningPathBar({
  activeStep,
  onStep,
  enabled,
  onDismiss,
}: {
  activeStep: LearningStepId;
  onStep: (id: LearningStepId) => void;
  enabled: boolean;
  onDismiss: () => void;
}) {
  if (!enabled) return null;

  const idx = LEARNING_STEPS.findIndex((s) => s.id === activeStep);
  const step = LEARNING_STEPS[idx] ?? LEARNING_STEPS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface mb-6 rounded-2xl p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-accent">
            Guided tour · step {idx + 1}/{LEARNING_STEPS.length}
          </div>
          <p className="mt-1 text-sm text-foreground">{step.hint}</p>
        </div>
        <button type="button" onClick={onDismiss} className="btn-ghost interactive text-[0.65rem]">
          Skip tour
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {LEARNING_STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              playUiClick();
              onStep(s.id);
            }}
            className={`btn-pill text-[0.65rem] ${
              s.id === activeStep ? "btn-pill-active" : i < idx ? "btn-pill-inactive opacity-80" : "btn-pill-inactive"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        {idx > 0 && (
          <button
            type="button"
            className="btn-ghost interactive text-[0.65rem]"
            onClick={() => onStep(LEARNING_STEPS[idx - 1].id)}
          >
            ← Back
          </button>
        )}
        {idx < LEARNING_STEPS.length - 1 && (
          <button
            type="button"
            className="btn-primary text-[0.65rem]"
            onClick={() => onStep(LEARNING_STEPS[idx + 1].id)}
          >
            Next →
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}
