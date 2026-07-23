import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
  ErrorBox,
  CalcSection,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  FormulaBlock,
  FormulaWithLegend,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { ReferenceTable } from "@/components/ReferenceTable";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import { computeCI, fmt, type CIResult } from "@/lib/math/confidence-interval";
import type { ReactNode } from "react";

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

export const Route = createFileRoute("/calculators/math/confidence-interval-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Confidence Interval Calculator",
      title:
        "Confidence Interval Calculator — Mean & Proportion",
      metaDescription:
        "Compute confidence intervals for a mean or proportion at any level with z or t, standard error, and worked steps.",
      canonicalUrl: "/calculators/math/confidence-interval-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Confidence Interval Calculator",
          path: "/calculators/math/confidence-interval-calculator",
        },
      ],
      faqs: [
        {
          q: "What does a 95% confidence interval actually mean?",
          a: "It means that if we repeated the sampling procedure many times and built a 95% confidence interval from each sample, about 95% of those intervals would contain the true population mean. It is a statement about the long-run procedure, not about the specific interval you just computed.",
        },
        {
          q: "When should I use the t-distribution instead of Z?",
          a: "Use the t-distribution whenever you estimate the standard deviation from a sample and the sample size is small (typically n < 30). The t-distribution has heavier tails to account for the extra uncertainty in the estimated standard deviation. This calculator switches automatically.",
        },
        {
          q: "How is the margin of error computed?",
          a: "Margin of error = critical value × standard error, where standard error = s / √n. The critical value is z_(α/2) for the Z method or t_(α/2, n−1) for the t method.",
        },
        {
          q: "Why does a higher confidence level give a wider interval?",
          a: "To be more confident the true mean falls inside the interval, you must cover a wider range of plausible values. The trade-off is precision — narrower intervals need either a larger sample or a lower confidence level.",
        },
        {
          q: "Can I use this for proportions?",
          a: "This tool is for the mean of a continuous variable. For a proportion, use the Sample Size Calculator's margin-of-error mode, which uses p(1−p) as the variance term.",
        },
      ],
    }),
  component: ConfidenceIntervalPage,
});

/* ================= UI ================= */

const PRESET_LEVELS = [80, 85, 90, 95, 98, 99, 99.5, 99.9] as const;

function ConfidenceIntervalPage() {
  const [n, setN] = useState("50");
  const [mean, setMean] = useState("20.6");
  const [sd, setSd] = useState("3.2");
  const [level, setLevel] = useState("95");
  const [methodMode, setMethodMode] = useState<"auto" | "z" | "t">("auto");
  const [result, setResult] = useState<CIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [inputsUsed, setInputsUsed] = useState<{
    n: number;

    mean: number;
    sd: number;
    cl: number;
  } | null>(null);

  function handleCalculate() {
    setError(null);
    setResult(null);
    const nn = Number(n);
    const m = Number(mean);
    const s = Number(sd);
    const clPct = Number(level);
    if (!Number.isFinite(nn) || nn < 2 || !Number.isInteger(nn)) {
      setError("Sample size n must be an integer ≥ 2.");
      return;
    }
    if (!Number.isFinite(m)) {
      setError("Sample mean must be a number.");
      return;
    }
    if (!Number.isFinite(s) || s <= 0) {
      setError("Standard deviation must be a positive number.");
      return;
    }
    if (!Number.isFinite(clPct) || clPct <= 0 || clPct >= 100) {
      setError("Confidence level must be between 0 and 100 (exclusive).");
      return;
    }
    const cl = clPct / 100;
    const override = methodMode === "auto" ? undefined : methodMode;
    const r = computeCI(m, s, nn, cl, override);
    setResult(r);
    setInputsUsed({ n: nn, mean: m, sd: s, cl });
  }

  function handleClear() {
    setResult(null);
    setError(null);
    setInputsUsed(null);
  }

  const steps: Step[] = useMemo(() => {
    if (!result || !inputsUsed) return [];
    const critSymbol = result.method === "z" ? "Z" : "t";
    const distLabel = result.method === "z" ? "standard normal" : `Student t (df = ${result.df})`;
    return [
      {
        title: "Sample mean and standard deviation",
        body: (
          <>
            <MathNote>The sample statistics given/computed for this data set</MathNote>
            <MathLine>n = {inputsUsed.n}</MathLine>
            <MathLine>x̄ = {fmt(inputsUsed.mean)}</MathLine>
            <MathLine>s = {fmt(inputsUsed.sd)}</MathLine>
          </>
        ),
      },
      {
        title: "Degrees of freedom",
        body:
          result.method === "t" ? (
            <>
              <MathNote>The t-distribution needs degrees of freedom, one less than the sample size</MathNote>
              <MathLine>df = n − 1</MathLine>
              <MathLine>df = {inputsUsed.n} − 1</MathLine>
              <MathLine>df = {result.df}</MathLine>
            </>
          ) : (
            <>
              <MathNote>Using the normal (Z) distribution — degrees of freedom are not needed</MathNote>
              <MathLine>method = Z (normal)</MathLine>
            </>
          ),
      },
      {
        title: "Critical value",
        body: (
          <>
            <MathNote>
              Look up the critical value for {inputsUsed.cl * 100}% confidence from the {distLabel} distribution
            </MathNote>
            <MathLine>{critSymbol} = {fmt(result.critical, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "Standard error",
        body: (
          <>
            <MathNote>Standard error measures the spread of the sample mean</MathNote>
            <MathLine>SE = s / √n</MathLine>
            <MathLine>SE = {fmt(inputsUsed.sd)} / √{inputsUsed.n}</MathLine>
            <MathLine>SE = {fmt(result.se, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "Margin of error",
        body: (
          <>
            <MathNote>Margin of error scales the standard error by the critical value</MathNote>
            <MathLine>MoE = {critSymbol} · SE</MathLine>
            <MathLine>MoE = {fmt(result.critical, 4)} × {fmt(result.se, 4)}</MathLine>
            <MathLine>MoE = {fmt(result.moe, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "Confidence interval",
        body: (
          <>
            <MathNote>The interval is the sample mean plus or minus the margin of error</MathNote>
            <MathLine>CI = x̄ ± MoE</MathLine>
            <MathLine>CI = {fmt(inputsUsed.mean)} ± {fmt(result.moe, 4)}</MathLine>
            <MathLine>lower = {fmt(inputsUsed.mean)} − {fmt(result.moe, 4)} = {fmt(result.lower, 4)}</MathLine>
            <MathLine>upper = {fmt(inputsUsed.mean)} + {fmt(result.moe, 4)} = {fmt(result.upper, 4)}</MathLine>
            <MathLine>CI = [{fmt(result.lower, 4)}, {fmt(result.upper, 4)}]</MathLine>
          </>
        ),
      },
    ];
  }, [result, inputsUsed]);


  return (
    <MathCalcPage
      name="Confidence Interval Calculator"
      tagline="Estimate the range in which the population mean is likely to fall from a sample — automatically uses the t-distribution for small samples."
      extras={<Content />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sample size (n)" htmlFor="ci-n">
          <TextInput
            id="ci-n"
            inputMode="numeric"
            value={n}
            onChange={(e) => setN(e.target.value)}
          />
        </Field>
        <Field label="Sample mean (x̄)" htmlFor="ci-mean">
          <TextInput
            id="ci-mean"
            inputMode="decimal"
            value={mean}
            onChange={(e) => setMean(e.target.value)}
          />
        </Field>
        <Field label="Standard deviation (σ or s)" htmlFor="ci-sd">
          <TextInput
            id="ci-sd"
            inputMode="decimal"
            value={sd}
            onChange={(e) => setSd(e.target.value)}
          />
        </Field>
        <Field label="Confidence level (%)" htmlFor="ci-level">
          <div className="flex gap-2">
            <select
              value={PRESET_LEVELS.includes(Number(level) as never) ? level : "custom"}
              onChange={(e) => {
                if (e.target.value !== "custom") setLevel(e.target.value);
              }}
              className="rounded-xl border border-border bg-background/60 px-2 py-2.5 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {PRESET_LEVELS.map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
            <TextInput
              id="ci-level"
              inputMode="decimal"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            />
          </div>
        </Field>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-sm font-medium text-foreground">
          Method
        </legend>
        <div className="flex flex-wrap gap-3 text-sm text-foreground">
          {(
            [
              ["auto", "Auto (t if n < 30)"],
              ["z", "Force Z (normal)"],
              ["t", "Force t (Student)"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="ci-method"
                value={v}
                checked={methodMode === v}
                onChange={() => setMethodMode(v)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 flex gap-2">
        <PrimaryButton onClick={handleCalculate}>Calculate</PrimaryButton>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-full border border-border px-4 py-2.5 text-sm text-foreground hover:bg-secondary/50"
        >
          Clear
        </button>
      </div>

      {error && <ErrorBox message={error} />}

      {result && inputsUsed && (
        <>
          <ResultActions
            className="mt-4"
            filename="confidence-interval-result"
            captureRef={resultRef}
            getCopyText={() =>
              [
                `Confidence Interval Calculator`,
                `n=${inputsUsed.n} | mean=${fmt(inputsUsed.mean)} | sd=${fmt(inputsUsed.sd)} | CL=${(inputsUsed.cl * 100).toFixed(2)}%`,
                `Method: ${result.method === "z" ? "Z (normal)" : `t (df=${result.df})`}`,
                `Critical value: ${fmt(result.critical, 4)}`,
                `Margin of error = ±${fmt(result.moe, 4)}`,
                `Interval: [${fmt(result.lower, 4)}, ${fmt(result.upper, 4)}]`,
              ].join("\n")
            }
          />
          <div ref={resultRef}>
            <ResultBlock result={result} inputs={inputsUsed} />
          </div>
        </>
      )}


      {steps.length > 0 && <StepsToggle steps={steps} />}
    </MathCalcPage>
  );
}

function ResultBlock({
  result,
  inputs,
}: {
  result: CIResult;
  inputs: { n: number; mean: number; sd: number; cl: number };
}) {
  const methodLabel =
    result.method === "z"
      ? "using normal (Z) distribution"
      : `using Student t-distribution, df = ${result.df}`;

  return (
    <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 sm:p-5">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Confidence Interval ({(inputs.cl * 100).toFixed(inputs.cl * 100 % 1 ? 2 : 0)}%)
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display text-2xl font-semibold tabular-nums text-foreground">
        <span>
          {fmt(inputs.mean)} <span className="text-primary">±{fmt(result.moe, 4)}</span>
        </span>
        {Number.isFinite(result.moePct) && (
          <span className="text-base text-muted-foreground">
            (±{fmt(result.moePct, 2)}%)
          </span>
        )}
        <span className="text-base text-muted-foreground">
          [{fmt(result.lower, 4)} – {fmt(result.upper, 4)}]
        </span>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{methodLabel}</div>

      <ErrorBar
        lower={result.lower}
        upper={result.upper}
        mean={inputs.mean}
      />
    </div>
  );
}

/* ---------- Error bar visual ---------- */
function ErrorBar({
  lower,
  upper,
  mean,
}: {
  lower: number;
  upper: number;
  mean: number;
}) {
  // Pad the visual range 20% on each side.
  const span = upper - lower;
  const pad = span * 0.25 || 1;
  const vMin = lower - pad;
  const vMax = upper + pad;
  const w = 100; // percent-based coordinates
  const scale = (v: number) => ((v - vMin) / (vMax - vMin)) * w;
  const xL = scale(lower);
  const xU = scale(upper);
  const xM = scale(mean);

  return (
    <div className="mt-4">
      <div className="mb-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Error bar
      </div>
      <svg
        viewBox="0 0 100 22"
        role="img"
        aria-label="Confidence interval error bar"
        className="w-full"
        preserveAspectRatio="none"
      >
        {/* baseline */}
        <line
          x1="0"
          x2="100"
          y1="12"
          y2="12"
          stroke="var(--color-border)"
          strokeWidth="0.4"
        />
        {/* interval bar */}
        <line
          x1={xL}
          x2={xU}
          y1="12"
          y2="12"
          stroke="var(--color-primary)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* end caps */}
        <line x1={xL} x2={xL} y1="8" y2="16" stroke="var(--color-primary)" strokeWidth="0.9" />
        <line x1={xU} x2={xU} y1="8" y2="16" stroke="var(--color-primary)" strokeWidth="0.9" />
        {/* mean marker */}
        <circle cx={xM} cy="12" r="1.4" fill="var(--color-primary)" />
      </svg>
      <div className="relative mt-1 h-4 text-[10px] text-muted-foreground">
        <span
          className="absolute -translate-x-1/2 tabular-nums"
          style={{ left: `${xL}%` }}
        >
          {fmt(lower, 3)}
        </span>
        <span
          className="absolute -translate-x-1/2 tabular-nums text-foreground"
          style={{ left: `${xM}%` }}
        >
          x̄ = {fmt(mean, 3)}
        </span>
        <span
          className="absolute -translate-x-1/2 tabular-nums"
          style={{ left: `${xU}%` }}
        >
          {fmt(upper, 3)}
        </span>
      </div>
    </div>
  );
}

/* ================= Guide diagrams ================= */

function CIBellPath({ cx, cy, w, h }: { cx: number; cy: number; w: number; h: number }) {
  const pts: string[] = [];
  const xmin = cx - w / 2;
  for (let i = 0; i <= 40; i++) {
    const t = -3 + (6 * i) / 40;
    const px = xmin + ((t + 3) / 6) * w;
    const py = cy - Math.exp(-0.5 * t * t) * h;
    pts.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return <path d={pts.join(" ")} className="stroke-primary" strokeWidth={1.6} fill="none" />;
}

function CIWhatDiagram() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 260 130" className="w-full max-w-[260px]" aria-hidden>
        <line x1="20" y1="80" x2="240" y2="80" className="stroke-border" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1={40 + i * 40} y1={60 + i * 4} x2={100 + i * 40} y2={60 + i * 4} className="stroke-primary" strokeWidth={2} />
            <line x1={40 + i * 40} y1={56 + i * 4} x2={40 + i * 40} y2={64 + i * 4} className="stroke-primary" />
            <line x1={100 + i * 40} y1={56 + i * 4} x2={100 + i * 40} y2={64 + i * 4} className="stroke-primary" />
            <circle cx={70 + i * 40} cy={60 + i * 4} r={2} className="fill-primary" />
          </g>
        ))}
        <line x1="130" y1="20" x2="130" y2="100" className="stroke-foreground" strokeDasharray="3 3" />
        <text x="130" y="14" fontSize="10" textAnchor="middle" className="fill-foreground">true μ</text>
        <text x="130" y="118" fontSize="9" textAnchor="middle" className="fill-muted-foreground">most intervals cover μ</text>
      </svg>
    </div>
  );
}

function CIZvsTDiagram() {
  const cx = 130, cy = 90, w = 220, h = 60;
  const xmin = cx - w / 2;
  const tPts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = -3 + (6 * i) / 40;
    const df = 4;
    // t pdf shape (approx via heavier tails)
    const y = Math.pow(1 + (t * t) / df, -(df + 1) / 2);
    const px = xmin + ((t + 3) / 6) * w;
    const py = cy - y * h;
    tPts.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 260 130" className="w-full max-w-[260px]" aria-hidden>
        <line x1={xmin} y1={cy} x2={xmin + w} y2={cy} className="stroke-border" />
        <path d={tPts.join(" ")} className="stroke-muted-foreground" strokeWidth={1.4} strokeDasharray="4 3" fill="none" />
        <CIBellPath cx={cx} cy={cy} w={w} h={h} />
        <text x="30" y="24" fontSize="10" className="fill-primary">— normal (Z)</text>
        <text x="30" y="38" fontSize="10" className="fill-muted-foreground">-- Student t (heavier tails)</text>
      </svg>
    </div>
  );
}

function CIMoEDiagram() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 260 110" className="w-full max-w-[260px]" aria-hidden>
        <line x1="20" y1="60" x2="240" y2="60" className="stroke-border" />
        <line x1="70" y1="60" x2="190" y2="60" className="stroke-primary" strokeWidth={3} strokeLinecap="round" />
        <line x1="70" y1="50" x2="70" y2="70" className="stroke-primary" strokeWidth={2} />
        <line x1="190" y1="50" x2="190" y2="70" className="stroke-primary" strokeWidth={2} />
        <circle cx="130" cy="60" r="4" className="fill-primary" />
        <text x="130" y="46" fontSize="11" textAnchor="middle" className="fill-foreground font-serif italic">x̄</text>
        <line x1="70" y1="82" x2="130" y2="82" className="stroke-muted-foreground" />
        <line x1="130" y1="82" x2="190" y2="82" className="stroke-muted-foreground" />
        <text x="100" y="98" fontSize="10" textAnchor="middle" className="fill-muted-foreground">MoE</text>
        <text x="160" y="98" fontSize="10" textAnchor="middle" className="fill-muted-foreground">MoE</text>
        <text x="130" y="20" fontSize="11" textAnchor="middle" className="fill-foreground font-serif italic">CI = x̄ ± critical · s/√n</text>
      </svg>
    </div>
  );
}

function CILevelDiagram() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 260 130" className="w-full max-w-[260px]" aria-hidden>
        <line x1="20" y1="100" x2="240" y2="100" className="stroke-border" />
        {[
          { y: 40, w: 40, lbl: "80%" },
          { y: 60, w: 70, lbl: "90%" },
          { y: 80, w: 100, lbl: "95%" },
          { y: 100, w: 140, lbl: "99%" },
        ].map((r, i) => (
          <g key={i}>
            <line x1={130 - r.w / 2} y1={r.y} x2={130 + r.w / 2} y2={r.y} className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" />
            <text x={130 + r.w / 2 + 8} y={r.y + 3} fontSize="10" className="fill-muted-foreground">{r.lbl}</text>
          </g>
        ))}
        <line x1="130" y1="30" x2="130" y2="110" className="stroke-foreground" strokeDasharray="3 3" />
        <text x="130" y="24" fontSize="10" textAnchor="middle" className="fill-foreground">x̄</text>
      </svg>
    </div>
  );
}

const CI_GUIDE: GuideCardItem[] = [
  {
    key: "what",
    title: "1. What a confidence interval is",
    explain:
      "A confidence interval is a range of plausible values for a population parameter built from sample data. A 95% CI means the procedure — over many repeated samples — would trap the true mean about 95% of the time.",
    formula: <>CI = point estimate ± margin of error</>,
    diagram: <CIWhatDiagram />,
    example: {
      given: "100 samples, 95% CI each",
      substitute: "long-run coverage",
      answer: "≈ 95 of 100 intervals contain μ",
    },
  },
  {
    key: "moe",
    title: "2. The margin of error formula",
    explain:
      "Margin of error is the critical value times the standard error. The standard error shrinks with the square root of the sample size, so quadrupling n only halves the width of the interval.",
    formula: <>MoE = critical × s / √n</>,
    legend: [
      { sym: "critical", def: "z_(α/2) or t_(α/2, n−1)" },
      { sym: "s", def: "sample standard deviation" },
      { sym: "n", def: "sample size" },
    ],
    diagram: <CIMoEDiagram />,
    example: {
      given: "s = 2.7, n = 100, 95% CI",
      substitute: "1.96 × 2.7 / √100",
      answer: "MoE ≈ 0.53",
    },
  },
  {
    key: "zt",
    title: "3. Z vs Student t",
    explain:
      "Use Z when σ is known or n is large (≥ 30). Use t when you estimate σ from a small sample — the heavier t-tails widen the interval to account for the extra uncertainty. As df grows, t converges to Z.",
    formula: <>n ≥ 30 → Z ; n &lt; 30 → t with df = n − 1</>,
    diagram: <CIZvsTDiagram />,
    example: {
      given: "n = 12, 95% CI, df = 11",
      substitute: "t = 2.201 (vs Z = 1.960)",
      answer: "t interval is wider — correct",
    },
  },
  {
    key: "level",
    title: "4. Choosing a confidence level",
    explain:
      "Higher confidence means a wider interval — more certainty about coverage comes at the cost of precision. 95% is the default in most sciences; use 90% for exploratory work, 99% for high-stakes decisions.",
    formula: <>higher CL ⇒ larger critical ⇒ wider CI</>,
    diagram: <CILevelDiagram />,
    example: {
      given: "same sample, three levels",
      substitute: "z₉₀ = 1.645, z₉₅ = 1.960, z₉₉ = 2.576",
      answer: "widths in ratio 1 : 1.19 : 1.57",
    },
  },
];

/* ================= Content ================= */

function Content() {
  return (
    <>
      <CalcSection title="Confidence intervals explained, step by step">
        <p className="text-sm text-muted-foreground">
          Each concept below has a plain-English definition, its formula, a small diagram and a worked example — all in one card so you never have to jump between sections to piece it together.
        </p>
        <GuideCards items={CI_GUIDE} />
      </CalcSection>

      <CalcSection title="Z-values for common confidence levels">
        <ReferenceTable
          headers={["Confidence level", "Z-value (two-tailed)"]}
          numericColumns={[1]}
          rows={[
            ["70%", "1.036"],
            ["75%", "1.150"],
            ["80%", "1.282"],
            ["85%", "1.440"],
            ["90%", "1.645"],
            ["95%", "1.960"],
            ["98%", "2.326"],
            ["99%", "2.576"],
            ["99.5%", "2.807"],
            ["99.9%", "3.291"],
          ]}
        />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Auto-switches to the Student t-distribution when n < 30 — a genuine correctness upgrade over Z-only tools.",
            "Explicitly labels which method was used and, for t, the degrees of freedom.",
            "Interval shown in all three common formats at once: x̄ ± MoE, ±%, and [lower – upper].",
            "Compact error-bar visual with the mean marker and both bounds labeled.",
            "Live-computed Z and t critical values for any confidence level between 80% and 99.9%.",
            "Step-by-step working shows the critical value, standard error, margin of error and final interval.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            {
              q: "What is the difference between confidence level and confidence interval?",
              a: (
                <p>
                  The <em>confidence level</em> is a number you choose (e.g. 95%) that controls the procedure's long-run coverage. The <em>confidence interval</em> is the range of values you get from a specific sample using that procedure.
                </p>
              ),
            },
            {
              q: "How do I make my confidence interval narrower?",
              a: (
                <p>
                  Collect more data (MoE shrinks with √n), reduce variability in the measurement, or lower the confidence level — but a lower confidence level means the procedure covers the true mean less often over many repeats.
                </p>
              ),
            },
            {
              q: "Why does the tool sometimes show a t critical value bigger than the Z value?",
              a: (
                <p>
                  Because the t-distribution has heavier tails. For df = 10 at 95%, t = 2.228 vs Z = 1.960 — the wider interval correctly reflects the extra uncertainty in estimating σ from a small sample.
                </p>
              ),
            },
            {
              q: "Does this assume the data is normally distributed?",
              a: (
                <p>
                  The interval for the mean is exact if the underlying data is normal. For non-normal data with a reasonably large sample (n ≥ 30), the Central Limit Theorem makes the Z interval a good approximation for the mean.
                </p>
              ),
            },
            {
              q: "Can I use this for proportions?",
              a: (
                <p>
                  This tool is for the mean of a continuous variable. For a proportion, use the Sample Size Calculator's margin-of-error mode, which uses p(1−p) as the variance term.
                </p>
              ),
            },
          ]}
        />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
            { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
            { to: "/calculators/math/sample-size-calculator", label: "Sample Size Calculator" },
            { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
          ]}
        />
      </CalcSection>
    </>
  );
}

