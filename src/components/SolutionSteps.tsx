import { useState, type ReactNode } from "react";

export interface Step {
  title: string;
  body: ReactNode;
}

/**
 * Shared collapsible step-by-step working panel used across calculator pages.
 * Extracted so new calculators can reuse the exact same UX without copying the
 * component. (Fraction and Percentage pages still have local copies from an
 * earlier phase; new pages import this one.)
 */
export function SolutionSteps({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary/30"
        aria-expanded={open}
      >
        <span>Calculation steps</span>
        <span className="text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ol className="space-y-3 border-t border-border/60 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
          {steps.map((s, i) => (
            <li key={i}>
              <div className="font-medium text-foreground">
                Step {i + 1}: {s.title}
              </div>
              <div className="mt-1">{s.body}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
