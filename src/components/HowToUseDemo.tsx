import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pause, Play, RotateCcw, Signal, Wifi, BatteryFull } from "lucide-react";

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
  /** Title shown at the top of the fake phone screen */
  appTitle?: string;
  /** ms per input character while typing */
  typeSpeed?: number;
  /** ms to hold the click / result frames */
  holdMs?: number;
}

/**
 * Self-contained animated walkthrough rendered inside a mobile phone mockup
 * (looks like a phone even on desktop). Cycles through: type into each field
 * → click Calculate → scroll to result → pause → loop.
 */
export function HowToUseDemo({
  steps,
  buttonLabel = "Calculate",
  result,
  resultCaption = "Read your results",
  clickCaption = "Tap Calculate",
  appTitle = "Isosceles Triangle Calculator",
  typeSpeed = 110,
  holdMs = 1800,
}: Props) {
  const totalPhases = steps.length + 2; // typing phases + click + result
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState<string[]>(() => steps.map(() => ""));
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [pressed, setPressed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

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
    scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reduced motion: freeze on result frame with everything filled in.
  useEffect(() => {
    if (!reduced) return;
    clearTimer();
    setTyped(steps.map((s) => s.value));
    setPressed(false);
    setPhase(steps.length + 1);
  }, [reduced, steps]);

  // Auto-scroll the phone screen to the result once it appears.
  useEffect(() => {
    if (phase >= steps.length + 1 && resultRef.current && scrollerRef.current) {
      const el = resultRef.current;
      scrollerRef.current.scrollTo({ top: el.offsetTop - 8, behavior: reduced ? "auto" : "smooth" });
    }
  }, [phase, reduced, steps.length]);

  // Main animation driver.
  useEffect(() => {
    if (reduced || !playing) return;

    if (phase < steps.length) {
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
        timerRef.current = setTimeout(() => setPhase(phase + 1), 650);
      }
    } else if (phase === steps.length) {
      setPressed(true);
      timerRef.current = setTimeout(() => {
        setPressed(false);
        setPhase(phase + 1);
      }, 650);
    } else {
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

  const now = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }, []);

  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4 sm:p-6">
      {/* Controls */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-destructive/70 animate-pulse" aria-hidden />
          <span>Live demo · mobile view</span>
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
            onClick={() => { resetAll(); setPlaying(true); }}
            aria-label="Restart demo"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/60 text-foreground/80 hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Phone frame */}
      <div className="flex justify-center">
        <div className="relative w-[300px] sm:w-[320px]">
          {/* Side buttons */}
          <span aria-hidden className="absolute -left-[3px] top-24 h-10 w-[3px] rounded-l bg-foreground/30" />
          <span aria-hidden className="absolute -left-[3px] top-40 h-16 w-[3px] rounded-l bg-foreground/30" />
          <span aria-hidden className="absolute -right-[3px] top-32 h-20 w-[3px] rounded-r bg-foreground/30" />

          {/* Bezel */}
          <div className="rounded-[2.75rem] bg-foreground/85 p-[10px] shadow-[0_25px_60px_-20px_rgba(0,0,0,0.5)]">
            {/* Screen */}
            <div className="relative overflow-hidden rounded-[2.15rem] bg-background">
              {/* Status bar */}
              <div className="relative flex h-8 items-center justify-between px-6 pt-1 text-[11px] font-semibold tabular-nums text-foreground/80">
                <span>{now}</span>
                <span aria-hidden className="absolute left-1/2 top-1 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-foreground/85" />
                <span className="flex items-center gap-1">
                  <Signal size={11} />
                  <Wifi size={11} />
                  <BatteryFull size={13} />
                </span>
              </div>

              {/* App header */}
              <div className="border-b border-border/60 px-4 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Calculator</p>
                <h4 className="truncate text-sm font-bold text-foreground">{appTitle}</h4>
              </div>

              {/* Scrollable screen body */}
              <div
                ref={scrollerRef}
                className="h-[440px] overflow-y-auto scroll-smooth px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="space-y-3">
                  {steps.map((step, i) => {
                    const isActive = i === activeFieldIndex;
                    return (
                      <div
                        key={step.field}
                        className={
                          "rounded-lg border p-2.5 transition-all duration-300 " +
                          (isActive
                            ? "border-primary/60 bg-primary/[0.07]"
                            : "border-border/50 bg-background/40")
                        }
                      >
                        <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                          {step.field}
                        </div>
                        <div className="flex h-10 items-center rounded-md border border-border bg-background px-3 font-mono text-sm tabular-nums text-foreground">
                          <span>{typed[i] ?? ""}</span>
                          {isActive && !reduced && (
                            <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-foreground/70" aria-hidden />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden
                    className={
                      "pointer-events-none flex w-full items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 " +
                      (pressed
                        ? "scale-[0.97] brightness-110"
                        : phase === steps.length
                          ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
                          : "opacity-90")
                    }
                  >
                    {buttonLabel}
                  </button>
                </div>

                <div
                  ref={resultRef}
                  className={
                    "mt-4 overflow-hidden rounded-xl border transition-all duration-500 " +
                    (showResult
                      ? "max-h-[700px] border-primary/40 bg-primary/[0.05] p-3 opacity-100 translate-y-0"
                      : "max-h-0 border-transparent p-0 opacity-0 -translate-y-1")
                  }
                  aria-hidden={!showResult}
                >
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-primary">Results</p>
                  {result}
                </div>

                {/* Bottom breathing room so scroll can settle */}
                <div className="h-6" />
              </div>

              {/* Home indicator */}
              <div className="flex h-6 items-center justify-center">
                <span aria-hidden className="h-1 w-24 rounded-full bg-foreground/70" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caption + progress */}
      <div className="mt-4 flex items-center justify-between gap-3">
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
