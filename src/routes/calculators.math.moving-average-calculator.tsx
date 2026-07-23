import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  PrimaryButton,
  Field,
  TextInput,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  type GuideCardItem,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import type { ReactNode } from "react";
import { parseDataset, cleanedNote } from "@/lib/math/parse-numbers";

/** Centered display-math line used inside solution steps. */
function MathLine({ children }: { children: ReactNode }) {
  return (
    <div className="my-1 flex items-center justify-center text-center font-serif text-[15px] italic text-foreground">
      <span className="inline-flex items-center gap-1">{children}</span>
    </div>
  );
}

/** Small left-aligned note between math lines. */
function MathNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 mb-1 text-sm not-italic text-muted-foreground">
      {children}
    </div>
  );
}

export const Route = createFileRoute("/calculators/math/moving-average-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Moving Average Calculator",
      title: "Moving Average Calculator — SMA & EMA",
      metaDescription:
        "Compute simple and exponential moving averages over a series with per-period table and line chart.",
      canonicalUrl: "/calculators/math/moving-average-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Moving Average Calculator", path: "/calculators/math/moving-average-calculator" },
      ],
      faqs: [
        {
          q: "What is a moving average?",
          a: "A moving average smooths a time series by replacing each point with an average of the surrounding values in a fixed window. It removes short-term noise so the underlying trend is easier to see.",
        },
        {
          q: "What's the difference between SMA and EMA?",
          a: "A Simple Moving Average (SMA) gives every point in the window equal weight. An Exponential Moving Average (EMA) puts more weight on the most recent points, so it reacts faster to changes in the trend but is a little noisier.",
        },
        {
          q: "How do I choose a window size?",
          a: "Bigger windows = smoother curve but slower to react. A common convention is to match the window to the natural cycle in your data — 7 for daily data with a weekly pattern, 12 for monthly data with a yearly pattern, or 20/50/200 for typical short/medium/long-term stock trends.",
        },
        {
          q: "How is the EMA smoothing factor calculated?",
          a: "By default we use α = 2 / (n + 1), the standard convention in finance and signal processing. You can override it with any value between 0 and 1 — higher α means the EMA follows the raw data more closely, lower α means more smoothing.",
        },
        {
          q: "Why does the moving average start partway through the data?",
          a: "An n-point SMA needs n values to compute its first point, so the smoothed series is shorter than the raw series by n − 1 points. The EMA is seeded from the first SMA value for the same reason.",
        },
      ],
    }),
  component: MovingAveragePage,
});

/* ---------------- Math ---------------- */

type Mode = "sma" | "ema";

interface MASeries {
  /** Aligned to the input: values[i] === null while the window isn't full yet. */
  values: (number | null)[];
  /** Index of the first non-null value. */
  firstIndex: number;
}

function computeSMA(data: number[], n: number): MASeries {
  const out: (number | null)[] = data.map(() => null);
  if (n <= 0 || n > data.length) return { values: out, firstIndex: -1 };
  let sum = 0;
  for (let i = 0; i < n; i++) sum += data[i];
  out[n - 1] = sum / n;
  for (let i = n; i < data.length; i++) {
    sum += data[i] - data[i - n];
    out[i] = sum / n;
  }
  return { values: out, firstIndex: n - 1 };
}

function computeEMA(data: number[], n: number, alpha: number): MASeries {
  const out: (number | null)[] = data.map(() => null);
  if (n <= 0 || n > data.length) return { values: out, firstIndex: -1 };
  // Seed with the SMA of the first n points (standard convention).
  let seed = 0;
  for (let i = 0; i < n; i++) seed += data[i];
  seed /= n;
  out[n - 1] = seed;
  let prev = seed;
  for (let i = n; i < data.length; i++) {
    const v = alpha * data[i] + (1 - alpha) * prev;
    out[i] = v;
    prev = v;
  }
  return { values: out, firstIndex: n - 1 };
}

function fmt(x: number, dp = 4): string {
  if (!Number.isFinite(x)) return "—";
  const s = x.toFixed(dp);
  // strip trailing zeros
  return s.replace(/\.?0+$/, "");
}

/* ---------------- Educational guide cards ---------------- */

function SmaWindowMini() {
  const data = [10, 12, 14, 13, 15, 17, 16, 18, 20, 19];
  const smas = data.map((_, i) => (i < 2 ? null : (data[i - 2] + data[i - 1] + data[i]) / 3));
  const scale = (v: number) => 95 - ((v - 8) / 14) * 70;
  const raw = data.map((v, i) => `${25 + i * 20},${scale(v)}`).join(" ");
  const smaPts = smas
    .map((v, i) => (v == null ? null : `${25 + i * 20},${scale(v)}`))
    .filter(Boolean)
    .join(" ");
  return (
    <svg viewBox="0 0 230 110" className="w-full" role="img" aria-label="Raw series and SMA overlay with the window highlighted">
      <rect x={25} y={5} width={40} height={100} fill="var(--color-primary)" opacity={0.08} />
      <polyline points={raw} fill="none" stroke="var(--color-muted-foreground)" strokeWidth={1.5} />
      <polyline points={smaPts} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      <text x={45} y={16} textAnchor="middle" fontSize={9} fill="var(--color-primary)">window n = 3</text>
    </svg>
  );
}

function EmaWeightsMini() {
  const alpha = 0.5;
  const bars = Array.from({ length: 6 }, (_, i) => alpha * (1 - alpha) ** i);
  return (
    <svg viewBox="0 0 230 110" className="w-full" role="img" aria-label="Geometrically decaying weights the EMA gives to recent points">
      <line x1={15} y1={95} x2={220} y2={95} stroke="var(--color-border)" />
      {bars.map((w, i) => {
        const x = 25 + i * 32;
        const h = w * 140;
        return (
          <g key={i}>
            <rect x={x} y={95 - h} width={22} height={h} rx={2} fill="var(--color-primary)" opacity={0.8 - i * 0.1} />
            <text x={x + 11} y={107} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">t−{i}</text>
          </g>
        );
      })}
      <text x={120} y={16} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">α = 0.5</text>
    </svg>
  );
}

function AlphaMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full" role="img" aria-label="Smoothing factor alpha as a function of window length n">
      <line x1={20} y1={80} x2={210} y2={80} stroke="var(--color-border)" />
      {[3, 5, 10, 20, 50].map((n, i) => {
        const a = 2 / (n + 1);
        const x = 30 + i * 40;
        const y = 80 - a * 120;
        return (
          <g key={n}>
            <circle cx={x} cy={y} r={4} fill="var(--color-primary)" />
            <text x={x} y={94} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">n={n}</text>
            <text x={x} y={y - 6} textAnchor="middle" fontSize={9} fill="var(--color-foreground)">{a.toFixed(2)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LagMini() {
  const xs = Array.from({ length: 40 }, (_, i) => i);
  const trend = xs.map((x) => 30 + x * 1.5);
  const smaLag = xs.map((x) => 30 + Math.max(0, x - 5) * 1.5);
  const emaLag = xs.map((x) => 30 + Math.max(0, x - 2) * 1.5);
  const toPath = (arr: number[]) => arr.map((y, i) => `${10 + i * 5},${100 - y * 0.6}`).join(" ");
  return (
    <svg viewBox="0 0 220 90" className="w-full" role="img" aria-label="Trend line with SMA lagging and EMA catching up faster">
      <polyline points={toPath(trend)} fill="none" stroke="var(--color-muted-foreground)" strokeWidth={1.5} strokeDasharray="3 3" />
      <polyline points={toPath(smaLag)} fill="none" stroke="var(--color-destructive)" strokeWidth={1.5} />
      <polyline points={toPath(emaLag)} fill="none" stroke="var(--color-primary)" strokeWidth={1.5} />
      <text x={155} y={20} fontSize={9} fill="var(--color-muted-foreground)">trend</text>
      <text x={155} y={32} fontSize={9} fill="var(--color-destructive)">SMA (slow)</text>
      <text x={155} y={44} fontSize={9} fill="var(--color-primary)">EMA (fast)</text>
    </svg>
  );
}

const MA_GUIDE: GuideCardItem[] = [
  {
    key: "sma",
    title: "Simple Moving Average — average the last n points",
    explain:
      "An SMA slides a fixed-length window across the series and reports the arithmetic mean of the points inside it. Every value in the window carries equal weight, so a spike stays in the average for exactly n steps before it drops out.",
    formula: <>SMAₜ = (xₜ + xₜ₋₁ + … + xₜ₋ₙ₊₁) / n</>,
    legend: [
      { sym: "xₜ", def: "value at time t" },
      { sym: "n", def: "window length" },
    ],
    diagram: <SmaWindowMini />,
    example: {
      given: "series 10, 12, 14, 13, 15, … with n = 3",
      substitute: "SMA₃ = (10 + 12 + 14)/3, SMA₄ = (12 + 14 + 13)/3",
      answer: "SMA = 12, 13, 14, …",
    },
  },
  {
    key: "ema",
    title: "Exponential Moving Average — geometrically decaying weights",
    explain:
      "The EMA is a recursive weighted average: the newest point gets weight α, the previous EMA carries the rest. Weights on older points shrink geometrically, so the recent past dominates without any point ever being fully forgotten.",
    formula: <>EMAₜ = α · xₜ + (1 − α) · EMAₜ₋₁</>,
    legend: [
      { sym: "α", def: "smoothing factor in (0, 1)" },
      { sym: "EMAₜ₋₁", def: "previous EMA value" },
    ],
    diagram: <EmaWeightsMini />,
    example: {
      given: "seed EMA₃ = 12, α = 0.5, next x = 13",
      substitute: "EMA₄ = 0.5·13 + 0.5·12",
      answer: "EMA₄ = 12.5",
    },
  },
  {
    key: "alpha",
    title: "Choosing α from the window size",
    explain:
      "The convention α = 2 / (n + 1) makes an EMA behave like an n-period SMA in the sense that both have the same centre-of-mass. Larger n means smaller α, which means more smoothing and slower response to new data.",
    formula: <>α = 2 / (n + 1) · smaller α ⇒ smoother, slower EMA</>,
    legend: [
      { sym: "n", def: "equivalent window length" },
    ],
    diagram: <AlphaMini />,
    example: {
      given: "n = 3",
      substitute: "α = 2 / (3 + 1)",
      answer: "α = 0.5",
    },
  },
  {
    key: "lag",
    title: "Lag: why the EMA catches turning points sooner",
    explain:
      "Both averages lag the underlying series, but the SMA lags by about (n − 1) / 2 periods because every point in the window is weighted equally. The EMA's front-loaded weights cut that lag roughly in half, at the cost of slightly noisier output.",
    formula: <>SMA lag ≈ (n − 1) / 2 · EMA lag ≈ (1 − α) / α</>,
    legend: [
      { sym: "lag", def: "periods behind a rising trend" },
    ],
    diagram: <LagMini />,
    example: {
      given: "n = 3, α = 0.5",
      substitute: "SMA lag ≈ 1.0, EMA lag ≈ 1.0 — EMA reacts faster on real turning points",
      answer: "EMA turns before SMA when trend flips",
    },
  },
];

/* ---------------- Component ---------------- */

const DEFAULT_DATA = "10, 12, 14, 13, 15, 17, 16, 18, 20, 19";

function MovingAveragePage() {
  const [raw, setRaw] = useState(DEFAULT_DATA);
  const [windowStr, setWindowStr] = useState("3");
  const [mode, setMode] = useState<Mode>("sma");
  const [alphaStr, setAlphaStr] = useState(""); // empty → auto = 2/(n+1)
  const [submitted, setSubmitted] = useState(0);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const parsed = useMemo(() => parseDataset(raw), [raw]);
  const n = Math.max(1, Math.floor(Number(windowStr) || 0));
  const autoAlpha = 2 / (n + 1);
  const alpha = alphaStr.trim() === "" ? autoAlpha : Number(alphaStr);

  const result = useMemo(() => {
    if (submitted === 0) return null;
    if (parsed.values.length < 2) return { error: "Enter at least 2 data points." as string };
    if (n < 1) return { error: "Window size must be at least 1." };
    if (n > parsed.values.length) return { error: `Window size (${n}) can't exceed the number of data points (${parsed.values.length}).` };
    if (mode === "ema") {
      if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
        return { error: "Smoothing factor α must be a number strictly between 0 and 1." };
      }
    }
    const series =
      mode === "sma"
        ? computeSMA(parsed.values, n)
        : computeEMA(parsed.values, n, alpha);
    return { series };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  const activeSeries = result && "series" in result ? result.series : null;

  const steps: Step[] = useMemo(() => {
    if (!activeSeries) return [];
    return buildSteps({ data: parsed.values, smoothed: activeSeries.values, n, mode, alpha });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSeries]);

  return (
    <MathCalcPage
      name="Moving Average Calculator"
      tagline="Smooth any time series with a Simple or Exponential Moving Average. Enter your values, pick a window, and get the full smoothed series plus an overlaid chart."
      extras={
        <>
          <CalcSection title="What is a moving average?">
            <p>
              A <strong>moving average</strong> replaces each point in a time series with an average of
              nearby values, computed inside a fixed-length <em>window</em> that slides across the data.
              It filters out short-term wiggles so the underlying trend becomes easier to see, which is why
              it's the default smoother in finance, sales forecasting, sports analytics, and anywhere a
              noisy sensor stream needs to be readable.
            </p>
            <p>
              The two workhorse variants are the <strong>Simple Moving Average (SMA)</strong>, which
              averages the last <em>n</em> points with equal weight, and the{" "}
              <strong>Exponential Moving Average (EMA)</strong>, which weights recent points more heavily
              so the smoothed line reacts faster to real changes in the trend.
            </p>
          </CalcSection>

          <CalcSection title="Moving averages, piece by piece">
            <GuideCards items={MA_GUIDE} />
          </CalcSection>

          <CalcSection title="Common uses">
            <FeatureList
              items={[
                "Stock and crypto trend analysis — 20-day, 50-day and 200-day moving averages are standard chart overlays.",
                "Sales and demand forecasting — smoothing weekly or monthly sales to see the real trend under seasonal noise.",
                "Sensor smoothing — cleaning up temperature, GPS or accelerometer signals before feeding them to control logic.",
                "Sports analytics — rolling averages for player performance across a season.",
                "Website analytics — 7-day rolling active users to remove the weekday/weekend cycle.",
              ]}
            />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "SMA and EMA in one tool — switch modes without re-entering your data.",
                "Handles messy pasted input: commas, spaces, tabs, newlines, currency symbols and thousand separators are all cleaned automatically.",
                "Full smoothed series shown alongside your raw values in an easy-to-scan table.",
                "Overlaid SVG line chart: raw series and moving average on the same axes.",
                "Auto or custom EMA smoothing factor — defaults to the standard α = 2 / (n + 1).",
                "Show/hide step-by-step working with the exact averages for the first few points.",
                "Copy the whole result summary or download the panel as a PNG.",
              ]}
            />
          </CalcSection>

          <CalcSection title="FAQs">
            <CalcFAQ
              items={[
                {
                  q: "What is a moving average?",
                  a: "A smoothed version of a time series where each point is replaced by an average of the surrounding values inside a fixed window. It hides short-term noise so the underlying trend is easier to see.",
                },
                {
                  q: "SMA or EMA — which should I use?",
                  a: "Use SMA when you want equal weight for every point in the window and a smoother, slower line. Use EMA when you want the smoothed curve to react quickly to recent changes, as in most short-term trading indicators.",
                },
                {
                  q: "How do I pick the window size?",
                  a: "Match it to the cycle you want to hide. 7 for daily data with a weekly pattern, 12 for monthly data with a yearly pattern. In finance, 20, 50 and 200 are the go-to short, medium and long-term windows.",
                },
                {
                  q: "Why does the smoothed series start after the raw one?",
                  a: "An n-point moving average needs n values before it can produce its first output, so the smoothed series is n − 1 points shorter than the raw one at the start.",
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/mean-median-mode-calculator", label: "Mean, Median, Mode & Range Calculator" },
                { to: "/calculators/math/sequence-calculator", label: "Sequence & Series Calculator" },
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Time-series data" htmlFor="ma-data" hint="Ordered oldest → newest. Commas, spaces, tabs and newlines all work.">
          <textarea
            id="ma-data"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="e.g. 10, 12, 14, 13, 15, 17, 16, 18, 20, 19"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Window size (n)" htmlFor="ma-n">
            <TextInput
              id="ma-n"
              inputMode="numeric"
              value={windowStr}
              onChange={(e) => setWindowStr(e.target.value)}
            />
          </Field>

          <Field label="Mode" htmlFor="ma-mode">
            <div className="flex rounded-xl border border-border bg-background/60 p-1">
              <button
                type="button"
                onClick={() => setMode("sma")}
                className={
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                  (mode === "sma"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                SMA
              </button>
              <button
                type="button"
                onClick={() => setMode("ema")}
                className={
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                  (mode === "ema"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                EMA
              </button>
            </div>
          </Field>

          <Field
            label="Smoothing α (EMA only)"
            htmlFor="ma-alpha"
            hint={mode === "ema" ? `Leave blank for auto = 2/(n+1) ≈ ${autoAlpha.toFixed(4)}` : "Disabled for SMA"}
          >
            <TextInput
              id="ma-alpha"
              inputMode="decimal"
              value={alphaStr}
              onChange={(e) => setAlphaStr(e.target.value)}
              placeholder="auto"
              disabled={mode === "sma"}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={() => setSubmitted((v) => v + 1)}>Calculate</PrimaryButton>
          <button
            type="button"
            onClick={() => {
              setRaw(DEFAULT_DATA);
              setWindowStr("3");
              setMode("sma");
              setAlphaStr("");
              setSubmitted(0);
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        </div>

        {result && "error" in result && result.error && <ErrorBox message={result.error} />}

        {activeSeries && (
          <div ref={captureRef} className="mt-5 space-y-5 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div>
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {mode === "sma" ? `${n}-point Simple Moving Average` : `${n}-point Exponential Moving Average (α = ${fmt(alpha, 4)})`}
              </div>
              <div className="mt-1 font-display text-lg text-foreground">
                {parsed.values.length} data points • {activeSeries.values.filter((v) => v !== null).length} smoothed points
              </div>
              {cleanedNote(parsed.cleaned) && (
                <div className="mt-1 text-xs text-muted-foreground">{cleanedNote(parsed.cleaned)}</div>
              )}
            </div>

            <LineChart data={parsed.values} smoothed={activeSeries.values} />

            <SeriesTable data={parsed.values} smoothed={activeSeries.values} label={mode.toUpperCase()} />

            <StepsToggle steps={steps} />

            <ResultActions
              getCopyText={() =>
                buildCopyText({
                  data: parsed.values,
                  smoothed: activeSeries.values,
                  n,
                  mode,
                  alpha,
                })
              }
              captureRef={captureRef}
              filename={`moving-average-${mode}-n${n}`}
            />
          </div>
        )}
      </div>
    </MathCalcPage>
  );
}

/* ---------------- Steps & copy ---------------- */

function buildSteps(args: {
  data: number[];
  smoothed: (number | null)[];
  n: number;
  mode: Mode;
  alpha: number;
}): Step[] {
  const { data, n, mode, alpha } = args;
  const steps: Step[] = [];
  const firstIndex = n - 1;

  if (mode === "sma") {
    const firstWindow = data.slice(0, n);
    const firstSum = firstWindow.reduce((a, b) => a + b, 0);
    steps.push({
      title: `Window mean = sum of window / window size`,
      body: (
        <>
          <MathNote>
            The SMA at position t is the mean of the last {n} values: SMAₜ = (sum of window) / n. The
            first output needs {n} points, so it lands at position {firstIndex + 1}:
          </MathNote>
          <MathLine>SMA<sub>{firstIndex + 1}</sub> = (x₁ + x₂ + … + x<sub>{n}</sub>) / {n}</MathLine>
          <MathLine>sum = {firstWindow.join(" + ")} = {fmt(firstSum, 4)}</MathLine>
          <MathLine>SMA<sub>{firstIndex + 1}</sub> = {fmt(firstSum, 4)} / {n} = {fmt(firstSum / n, 4)}</MathLine>
        </>
      ),
    });

    // Show up to 2 more sliding-window steps.
    const extra = Math.min(2, data.length - n);
    for (let k = 1; k <= extra; k++) {
      const win = data.slice(k, k + n);
      const sum = win.reduce((a, b) => a + b, 0);
      steps.push({
        title: `Slide the window one point forward`,
        body: (
          <>
            <MathNote>Drop {data[k - 1]}, add {data[k + n - 1]}, then take the mean of the new window:</MathNote>
            <MathLine>SMA<sub>{firstIndex + 1 + k}</sub> = ({win.join(" + ")}) / {n}</MathLine>
            <MathLine>SMA<sub>{firstIndex + 1 + k}</sub> = {fmt(sum, 4)} / {n} = {fmt(sum / n, 4)}</MathLine>
          </>
        ),
      });
    }

    steps.push({
      title: "Resulting series",
      body: (
        <MathNote>
          Repeat the sliding-window mean for every remaining position. The full smoothed series is
          shown in the table above.
        </MathNote>
      ),
    });
  } else {
    const seedWindow = data.slice(0, n);
    const seedSum = seedWindow.reduce((a, b) => a + b, 0);
    const seed = seedSum / n;
    steps.push({
      title: `Seed the EMA with the first ${n}-point window mean`,
      body: (
        <>
          <MathNote>
            The EMA is recursive, so it needs a starting value — the mean of the first {n} points
            (same window-mean formula as the SMA):
          </MathNote>
          <MathLine>EMA<sub>{firstIndex + 1}</sub> = (sum of window) / {n}</MathLine>
          <MathLine>EMA<sub>{firstIndex + 1}</sub> = ({seedWindow.join(" + ")}) / {n}</MathLine>
          <MathLine>EMA<sub>{firstIndex + 1}</sub> = {fmt(seedSum, 4)} / {n} = {fmt(seed, 4)}</MathLine>
        </>
      ),
    });

    steps.push({
      title: "Given — smoothing factor α",
      body: (
        <>
          <MathNote>α controls how much weight the newest point gets. The default is α = 2 / (n + 1):</MathNote>
          <MathLine>α = 2 / ({n} + 1)</MathLine>
          <MathLine>α = {fmt(alpha, 4)}</MathLine>
        </>
      ),
    });

    const extra = Math.min(2, data.length - n);
    let prev = seed;
    for (let k = 1; k <= extra; k++) {
      const x = data[firstIndex + k];
      const next = alpha * x + (1 - alpha) * prev;
      steps.push({
        title: `Apply the EMA update at position ${firstIndex + 1 + k}`,
        body: (
          <>
            <MathNote>EMAₜ = α · xₜ + (1 − α) · EMAₜ₋₁</MathNote>
            <MathLine>
              EMA<sub>{firstIndex + 1 + k}</sub> = α·x<sub>{firstIndex + 1 + k}</sub> + (1 − α)·EMA<sub>{firstIndex + k}</sub>
            </MathLine>
            <MathLine>
              EMA<sub>{firstIndex + 1 + k}</sub> = {fmt(alpha, 4)}·{x} + {fmt(1 - alpha, 4)}·{fmt(prev, 4)} = {fmt(next, 4)}
            </MathLine>
          </>
        ),
      });
      prev = next;
    }

    steps.push({
      title: "Resulting series",
      body: (
        <MathNote>
          Repeat the update rule for every remaining point. Each new EMA blends the latest raw value
          with the previous EMA using the same α. The full smoothed series is shown in the table above.
        </MathNote>
      ),
    });
  }

  return steps;
}

function buildCopyText(args: {
  data: number[];
  smoothed: (number | null)[];
  n: number;
  mode: Mode;
  alpha: number;
}): string {
  const { data, smoothed, n, mode, alpha } = args;
  const header =
    mode === "sma"
      ? `Simple Moving Average (n = ${n})`
      : `Exponential Moving Average (n = ${n}, α = ${fmt(alpha, 4)})`;
  const rows = data.map((v, i) => {
    const s = smoothed[i];
    return `${i + 1}\t${v}\t${s === null ? "" : fmt(s, 4)}`;
  });
  return `${header}\n\n#\tValue\t${mode.toUpperCase()}\n${rows.join("\n")}`;
}

/* ---------------- Table ---------------- */

function SeriesTable({
  data,
  smoothed,
  label,
}: {
  data: number[];
  smoothed: (number | null)[];
  label: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-secondary/40 text-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="px-3 py-2 text-right font-semibold tabular-nums">Value</th>
            <th className="px-3 py-2 text-right font-semibold tabular-nums">{label}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((v, i) => (
            <tr key={i} className="odd:bg-background/40">
              <td className="px-3 py-2">{i + 1}</td>
              <td className="px-3 py-2 text-right tabular-nums">{v}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {smoothed[i] === null ? (
                  <span className="text-muted-foreground/60">—</span>
                ) : (
                  fmt(smoothed[i] as number, 4)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Chart ---------------- */

function LineChart({
  data,
  smoothed,
}: {
  data: number[];
  smoothed: (number | null)[];
}) {
  const width = 640;
  const height = 260;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  const xs = data.map((_, i) => i);
  const allValues = [
    ...data,
    ...(smoothed.filter((v) => v !== null) as number[]),
  ];
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const yPad = (yMax - yMin) * 0.1 || 1;
  const yLo = yMin - yPad;
  const yHi = yMax + yPad;

  const xScale = (i: number) =>
    padL + (i / Math.max(1, xs.length - 1)) * (width - padL - padR);
  const yScale = (v: number) =>
    padT + (1 - (v - yLo) / (yHi - yLo)) * (height - padT - padB);

  const rawPath = data.map((v, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(v)}`).join(" ");
  const smoothPath = smoothed
    .map((v, i) => (v === null ? null : { x: xScale(i), y: yScale(v) }))
    .filter(Boolean) as { x: number; y: number }[];
  const smoothD = smoothPath.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  // Y-axis ticks (4 evenly spaced).
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => yLo + (i * (yHi - yLo)) / ticks);

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-background/40 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block h-auto w-full max-w-[640px] text-foreground"
        role="img"
        aria-label="Line chart of the raw series and its moving average"
      >
        {/* Y grid + labels */}
        {tickVals.map((tv, i) => {
          const y = yScale(tv);
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={width - padR}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.12}
              />
              <text
                x={padL - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="10"
                fill="currentColor"
                fillOpacity={0.6}
              >
                {fmt(tv, 2)}
              </text>
            </g>
          );
        })}

        {/* X axis labels — thin them out to avoid overlap */}
        {data.map((_, i) => {
          const step = Math.max(1, Math.ceil(data.length / 10));
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={i}
              x={xScale(i)}
              y={height - padB + 14}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              fillOpacity={0.6}
            >
              {i + 1}
            </text>
          );
        })}

        {/* Raw series */}
        <path d={rawPath} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.5} />
        {data.map((v, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(v)} r={2.5} fill="currentColor" fillOpacity={0.5} />
        ))}

        {/* Smoothed series (primary color) */}
        {smoothD && (
          <path
            d={smoothD}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {smoothPath.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--color-primary)" />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-foreground/40" />
          Raw series
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: "var(--color-primary)" }} />
          Moving average
        </span>
      </div>
    </div>
  );
}
