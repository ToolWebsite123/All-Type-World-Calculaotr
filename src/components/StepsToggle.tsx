import { useState, type ReactNode } from "react";
import { CalcSection } from "@/components/MathCalcPage";
import type { Step } from "@/components/SolutionSteps";

/**
 * Pill-button "Show / Hide calculation steps" toggle that renders each step
 * as a named CalcSection block. Matches the derivation UX used by the Slope
 * and Triangle calculators so every math calculator has one consistent
 * step-by-step surface.
 */
export function StepsToggle({
  steps,
  children,
  showLabel = "Show calculation steps",
  hideLabel = "Hide calculation steps",
}: {
  steps?: Step[];
  children?: ReactNode;
  showLabel?: string;
  hideLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        {open ? hideLabel : showLabel}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2 4l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="space-y-6">
          {steps?.map((s, i) => (
            <CalcSection key={i} title={s.title}>
              <div className="text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </div>
            </CalcSection>
          ))}
          {children}
        </div>
      )}
    </div>
  );
}
