import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

export interface DemoStep {
  /** Field label to display above the input */
  field: string;
  /** Value that will be "typed" into the field */
  value: string;
  /** Caption shown under the animation for this step */
  caption: string;
}

interface Props {
  steps: DemoStep[];
  /** Text shown on the simulated Calculate button */
  buttonLabel?: string;
  /** Rendered inside the fake "result" panel on the final step */
  result: ReactNode;
  /** Caption shown while the result panel is visible */
  resultCaption?: string;
  /** Caption shown for the "click calculate" step */
  clickCaption?: string;
  /** ms per input character while typing */
  typeSpeed?: number;
  /** ms to hold the click / result frames */
  holdMs?: number;
}

/**
 * Self-contained animated walkthrough that mimics a short screen recording of
 * a calculator being used. Cycles through: type into each field → click
 * Calculate → reveal result → pause → loop. No video assets involved.
 */
export function HowToUseDemo({
  steps,
  buttonLabel = "Calculate",
  result,
  resultCaption = "Read your results",
  clickCaption = "Click Calculate",
  typeSpeed = 110,
  holdMs = 1400,
}: Props) {
  const totalPhases = steps.length + 2; // typing phases + click + result
  const [phase, setPhase] = useState(0); // 0..steps.length-1 = typing, steps.length = click, +1 = result
  const [typed, setTyped] = useState<string[]>(() => steps.map(() => ""));
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [pressed, setPressed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetAll = () => {
    clearTimer();
    setTyped(steps.map(() => ""));
    setPressed(false);
    setPhase(0);
  };

  // Reduced motion: freeze on result frame with everything filled in.
  useEffect(() => {
    if (!reduced) return;
    clearTimer();
    setTyped(steps.map((s) => s.value));
    setPressed(false);
    setPhase(steps.length + 1);
  }, [reduced, steps]);

  // Main animation driver.
  useEffect(() => {
    if (reduced || !playing) return;

    if (phase < steps.length) {
      // Typing phase for steps[phase]
      const target = steps[phase].value;
      const current = typed[phase] ?? "";
      if (current.length < target.length) {
        timerRef.current = setTimeout(() => {
          setTyped((prev) => {
            const next = [...prev];
            next[phase] = target.slice(0, (prev[phase]?.length ?? 0) + 1);
            return next;
          });
        }, typeSpeed);
      } else {
        timerRef.current = setTimeout(() => setPhase(phase + 1), 600);
      }
    } else if (phase === steps.length) {
      // Click phase
      setPressed(true);
      timerRef.current = setTimeout(() => {
        setPressed(false);
        setPhase(phase + 1);
      }, 550);
    } else {
      // Result phase — hold then loop
      timerRef.current = setTimeout(() => {
        resetAll();
      }, holdMs);
    }

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, typed, playing, reduced, steps, typeSpeed, holdMs]);

  const totalDots = totalPhases;
  const activeDot = Math.min(phase, totalPhases - 1);

  const caption = useMemo(() => {
    if (phase < steps.length) return steps[phase].caption;
    if (phase === steps.length) return clickCaption;
    return resultCaption;
  }, [phase, steps, clickCaption, resultCaption]);

  const showResult = phase >= steps.length + 1;
  const activeFieldIndex = phase < steps.length ? phase : -1;

  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-destructive/70" aria-hidden />
          <span>Live demo</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause demo" : "Play demo"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/60 text-foreground/80 hover:text-foreground hover:border-primary/50 transition-colors"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            onClick={() => {
              resetAll();
              setPlaying(true);
            }}
            aria-label="Restart demo"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/60 text-foreground/80 hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/70 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((step, i) => {
            const isActive = i === activeFieldIndex;
            return (
              <div
                key={step.field}
                className={
                  "rounded-lg border p-2 transition-all duration-300 " +
                  (isActive
                    ? "border-primary/60 bg-primary/[0.06] shadow-[0_0_0_3px_var(--color-primary)]/10"
                    : "border-border/50 bg-background/40")
                }
              >
                <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                  {step.field}
                </div>
                <div className="flex h-9 items-center rounded-md border border-border bg-background px-2.5 font-mono text-sm tabular-nums text-foreground">
                  <span>{typed[i] ?? ""}</span>
                  {isActive && !reduced && (
                    <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-foreground/70" aria-hidden />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className={
              "pointer-events-none inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 " +
              (pressed
                ? "scale-95 shadow-[0_0_0_6px_var(--color-primary)]/25 brightness-110"
                : phase === steps.length
                  ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
                  : "opacity-90")
            }
          >
            {buttonLabel}
          </button>
        </div>

        <div
          className={
            "mt-4 overflow-hidden rounded-xl border transition-all duration-500 " +
            (showResult
              ? "max-h-[600px] border-primary/40 bg-primary/[0.05] p-4 opacity-100 translate-y-0"
              : "max-h-0 border-transparent p-0 opacity-0 -translate-y-1")
          }
          aria-hidden={!showResult}
        >
          {result}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-foreground/80">{caption}</p>
        <div className="flex items-center gap-1.5" aria-label={`Step ${activeDot + 1} of ${totalDots}`}>
          {Array.from({ length: totalDots }).map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 rounded-full transition-all duration-300 " +
                (i === activeDot ? "w-5 bg-primary" : "w-1.5 bg-border")
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
