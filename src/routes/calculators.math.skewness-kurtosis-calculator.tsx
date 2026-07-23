import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
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
import { SolutionSteps, type Step } from "@/components/SolutionSteps";
import { parseDataset } from "@/lib/math/parse-numbers";

export const Route = createFileRoute("/calculators/math/skewness-kurtosis-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Skewness & Kurtosis Calculator",
      title: "Skewness & Kurtosis Calculator",
      metaDescription:
        "Compute skewness and kurtosis (excess and full) with mean, SD, central moments, and full worked steps.",
      canonicalUrl: "/calculators/math/skewness-kurtosis-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Skewness & Kurtosis Calculator",
          path: "/calculators/math/skewness-kurtosis-calculator",
        },
      ],
      faqs: [
        {
          q: "What does 'excess' kurtosis mean?",
          a: "Kurtosis is often reported relative to the normal distribution, whose kurtosis value is 3. 'Excess kurtosis' subtracts that 3, so a normal distribution has excess kurtosis of 0. Positive excess kurtosis means heavier tails and a sharper peak than normal (leptokurtic); negative means lighter tails and a flatter peak (platykurtic). This calculator reports excess kurtosis.",
        },
        {
          q: "How does skewness relate to outliers?",
          a: "Skewness is very sensitive to outliers because it depends on the cube of each deviation from the mean. A single extreme value on one side can push skewness sharply positive (long right tail) or negative (long left tail). If a dataset has strong skew, check for outliers with the Outlier Detector before drawing conclusions.",
        },
        {
          q: "What sample size do I need?",
          a: "Skewness needs at least 3 values and excess kurtosis needs at least 4, but both estimates are unstable with small samples. With fewer than ~30 values the reported numbers can swing wildly from sample to sample, so treat them as rough shape indicators — not precise population parameters.",
        },
        {
          q: "How do I interpret the skewness value?",
          a: "A rough working guide: |skew| < 0.5 is approximately symmetric, 0.5–1 is moderately skewed, and above 1 is highly skewed. Positive means a long right tail (mean > median); negative means a long left tail (mean < median).",
        },
      ],
    }),
  component: SkewKurtPage,
});

/* ---------------- Math ---------------- */

interface SKResult {
  n: number;
  values: number[];
  mean: number;
  variance: number; // sample
  sd: number; // sample
  skew: number | null; // needs n ≥ 3
  exKurt: number | null; // needs n ≥ 4
  sumCubed: number;
  sumFourth: number;
}

function computeSK(values: number[]): SKResult | { error: string } {
  const n = values.length;
  if (n < 3) return { error: "Enter at least 3 values to compute skewness." };
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const dev = values.map((v) => v - mean);
  const sumSq = dev.reduce((s, d) => s + d * d, 0);
  const variance = sumSq / (n - 1);
  const sd = Math.sqrt(variance);
  if (sd === 0)
    return {
      error: "All values are identical — skewness and kurtosis are undefined (SD = 0).",
    };
  const zCubed = dev.map((d) => (d / sd) ** 3);
  const zFourth = dev.map((d) => (d / sd) ** 4);
  const sumCubed = zCubed.reduce((s, v) => s + v, 0);
  const sumFourth = zFourth.reduce((s, v) => s + v, 0);

  // Fisher-Pearson adjusted sample skewness (G1)
  const skew = (n / ((n - 1) * (n - 2))) * sumCubed;

  // Sample excess kurtosis (G2)
  let exKurt: number | null = null;
  if (n >= 4) {
    const a = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
    const b = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
    exKurt = a * sumFourth - b;
  }

  return { n, values, mean, variance, sd, skew, exKurt, sumCubed, sumFourth };
}

function fmt(n: number, dp = 4): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) return n.toExponential(3);
  return parseFloat(n.toFixed(dp)).toString();
}

function classifySkew(g1: number): string {
  const a = Math.abs(g1);
  if (a < 0.5) return "Approximately symmetric";
  const dir = g1 > 0 ? "right-skewed (positive skew, long right tail)" : "left-skewed (negative skew, long left tail)";
  if (a < 1) return `Moderately ${dir}`;
  return `Highly ${dir}`;
}

function classifyKurt(g2: number): string {
  if (Math.abs(g2) < 0.5) return "Mesokurtic — tails similar to a normal distribution";
  if (g2 > 0) return "Leptokurtic — heavier tails and a sharper peak than normal";
  return "Platykurtic — lighter tails and a flatter peak than normal";
}

/* ---------------- Histogram + shape overlay ---------------- */

function Histogram({ values, mean, sd }: { values: number[]; mean: number; sd: number }) {
  const width = 640;
  const height = 260;
  const padL = 40;
  const padR = 20;
  const padT = 16;
  const padB = 32;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  // Freedman–Diaconis-ish: fall back to sqrt rule for small n.
  const binCount = Math.max(5, Math.min(20, Math.round(Math.sqrt(values.length))));
  const binW = span / binCount;
  const bins = new Array(binCount).fill(0) as number[];
  for (const v of values) {
    let i = Math.floor((v - min) / binW);
    if (i >= binCount) i = binCount - 1;
    if (i < 0) i = 0;
    bins[i]++;
  }
  const maxCount = Math.max(...bins, 1);
  const iw = width - padL - padR;
  const ih = height - padT - padB;

  const xTo = (v: number) => padL + ((v - min) / span) * iw;
  const yTo = (c: number) => padT + ih - (c / maxCount) * ih;

  // Smooth density-ish overlay using a Gaussian kernel over the bin midpoints,
  // scaled to peak at the tallest bar. Purely a shape hint, not a formal KDE.
  const steps = 120;
  const bandwidth = Math.max(binW, sd / 2);
  const midpoints = bins.map((_, i) => min + (i + 0.5) * binW);
  const kernel = (x: number) => {
    let s = 0;
    for (let j = 0; j < midpoints.length; j++) {
      const u = (x - midpoints[j]) / bandwidth;
      s += bins[j] * Math.exp(-0.5 * u * u);
    }
    return s;
  };
  const kernelVals: { x: number; y: number }[] = [];
  let peak = 0;
  for (let s = 0; s <= steps; s++) {
    const xVal = min + (s / steps) * span;
    const yVal = kernel(xVal);
    if (yVal > peak) peak = yVal;
    kernelVals.push({ x: xVal, y: yVal });
  }
  const path = kernelVals
    .map((p, i) => {
      const cx = xTo(p.x);
      const cy = padT + ih - (peak > 0 ? (p.y / peak) * ih * 0.95 : 0);
      return `${i === 0 ? "M" : "L"}${cx.toFixed(2)},${cy.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Histogram of the dataset with a smooth distribution-shape overlay"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
      >
        {/* Axes */}
        <line
          x1={padL}
          x2={width - padR}
          y1={height - padB}
          y2={height - padB}
          stroke="var(--color-foreground)"
          opacity={0.6}
        />
        <line
          x1={padL}
          x2={padL}
          y1={padT}
          y2={height - padB}
          stroke="var(--color-foreground)"
          opacity={0.6}
        />

        {/* Bars */}
        {bins.map((c, i) => {
          const x0 = xTo(min + i * binW);
          const x1 = xTo(min + (i + 1) * binW);
          const y = yTo(c);
          const h = height - padB - y;
          if (c === 0) return null;
          return (
            <rect
              key={i}
              x={x0 + 1}
              y={y}
              width={Math.max(1, x1 - x0 - 2)}
              height={h}
              fill="var(--color-primary)"
              opacity={0.55}
              rx={2}
            />
          );
        })}

        {/* Shape overlay */}
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} opacity={0.95} />

        {/* Mean marker */}
        <line
          x1={xTo(mean)}
          x2={xTo(mean)}
          y1={padT}
          y2={height - padB}
          stroke="var(--color-foreground)"
          strokeDasharray="4 4"
          opacity={0.75}
        />
        <text
          x={xTo(mean)}
          y={padT - 4}
          textAnchor="middle"
          fontSize={11}
          fill="var(--color-foreground)"
        >
          mean {fmt(mean, 3)}
        </text>

        {/* Axis labels */}
        {[0, 0.5, 1].map((f, i) => {
          const v = min + f * span;
          return (
            <text
              key={i}
              x={xTo(v)}
              y={height - padB + 16}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-muted-foreground)"
            >
              {fmt(v, 3)}
            </text>
          );
        })}
        <text
          x={padL - 6}
          y={padT + 4}
          textAnchor="end"
          fontSize={10}
          fill="var(--color-muted-foreground)"
        >
          {maxCount}
        </text>
        <text
          x={padL - 6}
          y={height - padB}
          textAnchor="end"
          fontSize={10}
          fill="var(--color-muted-foreground)"
        >
          0
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Guide cards ---------------- */

const SK_GUIDE: GuideCardItem[] = [
  {
    key: "skew",
    title: "1. Skewness — asymmetry of the distribution",
    explain:
      "Skewness measures how lopsided a distribution is. Symmetric data (like a normal curve) has skewness near 0. A long right tail gives positive skew; a long left tail gives negative skew. The tail pulls the mean toward itself, so mean vs median already hints at direction.",
    formula: <>G₁ = n / ((n−1)(n−2)) · Σ((xᵢ − x̄)/s)³</>,
    legend: [
      { sym: "n", def: "sample size" },
      { sym: "x̄", def: "mean" },
      { sym: "s", def: "sample standard deviation" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M10 90 Q 40 30 70 60 T 150 85 T 230 90" className="fill-none stroke-primary" strokeWidth="1.5" />
          <line x1="10" y1="90" x2="230" y2="90" className="stroke-border" />
          <text x="30" y="105" fontSize="9" className="fill-muted-foreground">left tail</text>
          <text x="170" y="105" fontSize="9" className="fill-primary">long right tail → +skew</text>
        </svg>
      </div>
    ),
    example: {
      given: "2, 4, 4, 5, 5, 5, 6, 6, 7, 9, 12, 18",
      substitute: "mean ≈ 6.92, median = 5.5",
      answer: "G₁ ≈ +1.55 (right-skewed)",
    },
  },
  {
    key: "kurt",
    title: "2. Kurtosis — tail heaviness vs a normal curve",
    explain:
      "Kurtosis is about the tails, not the peak's height. Excess kurtosis subtracts 3 so a normal distribution reads 0. Positive (leptokurtic) means fat tails and frequent extreme values; negative (platykurtic) means light tails and values cluster more evenly.",
    formula: <>G₂ = (n(n+1)) / ((n−1)(n−2)(n−3)) · Σ((xᵢ − x̄)/s)⁴ − 3(n−1)² / ((n−2)(n−3))</>,
    legend: [
      { sym: "G₂", def: "sample excess kurtosis" },
      { sym: "s", def: "sample SD" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M10 95 Q 120 5 230 95" className="fill-none stroke-primary" strokeWidth="1.8" />
          <path d="M10 95 Q 120 55 230 95" className="fill-none stroke-muted-foreground" strokeWidth="1.2" strokeDasharray="3 3" />
          <text x="120" y="20" fontSize="9" textAnchor="middle" className="fill-primary">leptokurtic (fat tails)</text>
          <text x="120" y="75" fontSize="9" textAnchor="middle" className="fill-muted-foreground">normal</text>
        </svg>
      </div>
    ),
    example: {
      given: "n = 30, Σz⁴ ≈ 180",
      substitute: "G₂ = (30·31)/(29·28·27)·180 − 3·29²/(28·27)",
      answer: "G₂ ≈ 0.8 (mildly leptokurtic)",
    },
  },
  {
    key: "classify",
    title: "3. Plain-language classification",
    explain:
      "The calculator turns the raw numbers into a label so results are easier to read. Skew is grouped as approximately symmetric, moderately skewed, or highly skewed; kurtosis is grouped as platykurtic, mesokurtic, or leptokurtic.",
    formula: <>|G₁| &lt; 0.5 symmetric · 0.5–1 moderate · &gt; 1 high</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded-lg bg-primary/10 py-1 text-primary">|G₁| &lt; 0.5 → approximately symmetric</div>
          <div className="rounded-lg bg-primary/10 py-1 text-primary">0.5 ≤ |G₁| ≤ 1 → moderately skewed</div>
          <div className="rounded-lg bg-primary/10 py-1 text-primary">|G₁| &gt; 1 → highly skewed</div>
          <div className="rounded-lg bg-secondary/40 py-1 text-foreground">G₂ &gt; 0 leptokurtic · G₂ ≈ 0 mesokurtic · G₂ &lt; 0 platykurtic</div>
        </div>
      </div>
    ),
    example: {
      given: "G₁ = +1.55, G₂ = +2.1",
      substitute: "|1.55| > 1 and G₂ > 0",
      answer: "highly right-skewed, leptokurtic",
    },
  },
  {
    key: "caution",
    title: "4. Sample-size caveats and outlier sensitivity",
    explain:
      "Deviations are cubed for skewness and raised to the fourth power for kurtosis, so a single outlier can dominate the result. With fewer than ~30 values the estimates are noisy — treat them as rough shape indicators, and always cross-check with the Outlier Detector when values look extreme.",
    formula: <>need n ≥ 3 for G₁, n ≥ 4 for G₂ · trust weakens below n ≈ 30</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="90" x2="220" y2="90" className="stroke-border" />
          {[30, 60, 90, 120, 150].map((x, i) => (
            <rect key={i} x={x} y={70} width="8" height="20" className="fill-primary/70" />
          ))}
          <circle cx="205" cy="85" r="4" className="fill-destructive" />
          <text x="205" y="72" fontSize="9" textAnchor="middle" className="fill-destructive">outlier</text>
          <text x="120" y="105" fontSize="9" textAnchor="middle" className="fill-muted-foreground">one extreme value dominates G₁, G₂</text>
        </svg>
      </div>
    ),
    example: {
      given: "9 typical values + 1 outlier",
      substitute: "outlier contributes ≈ 80% of Σ deviation⁴",
      answer: "kurtosis inflated by outlier",
    },
  },
];

/* ---------------- Page ---------------- */


function SkewKurtPage() {
  const [input, setInput] = useState("2, 4, 4, 5, 5, 5, 6, 6, 7, 9, 12, 18");
  const [res, setRes] = useState<SKResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setRes(null);
    setNotice(null);
    const p = parseDataset(input);
    if (p.invalid.length) return setErr(`"${p.invalid[0]}" is not a valid number.`);
    if (p.values.length === 0) return setErr("Enter at least 3 numbers, separated by commas or spaces.");
    const r = computeSK(p.values);
    if ("error" in r) return setErr(r.error);
    setRes(r);
    if (p.cleaned > 0) {
      setNotice(
        `Cleaned ${p.cleaned} value${p.cleaned === 1 ? "" : "s"} — stripped currency symbols, thousand separators or stray punctuation.`,
      );
    }
  };

  const clear = () => {
    setInput("");
    setRes(null);
    setErr(null);
    setNotice(null);
  };

  const steps: Step[] = useMemo(() => {
    if (!res) return [];
    const legend = [
      { sym: "x̄", def: "sample mean" },
      { sym: "s", def: "sample standard deviation" },
      { sym: "G₁", def: "sample skewness (Fisher–Pearson adjusted)" },
      { sym: "G₂", def: "sample excess kurtosis (0 for normal)" },
    ];
    const s: Step[] = [
      {
        title: "Given",
        body: <FormulaBlock>n = {res.n}, data provided</FormulaBlock>,
      },
      {
        title: "Formula",
        body: <FormulaWithLegend formula={<>G₁ = n / ((n−1)(n−2)) · Σ ((xᵢ−x̄)/s)³ &nbsp;·&nbsp; G₂ = n(n+1) / ((n−1)(n−2)(n−3)) · Σ ((xᵢ−x̄)/s)⁴ − 3(n−1)² / ((n−2)(n−3))</>} legend={legend} />,
      },
      {
        title: "Substitute",
        body: (
          <FormulaBlock>
            x̄ = {fmt(res.mean)}<br />
            s² = {fmt(res.variance)}, &nbsp; s = {fmt(res.sd)}<br />
            Σ zᵢ³ = {fmt(res.sumCubed)}, &nbsp; Σ zᵢ⁴ = {fmt(res.sumFourth)}
          </FormulaBlock>
        ),
      },
      {
        title: "Answer",
        body: (
          <FormulaBlock>
            {res.skew !== null ? <>G₁ = {fmt(res.skew)} — {classifySkew(res.skew)}<br /></> : <>G₁: need n ≥ 3<br /></>}
            {res.exKurt !== null ? <>G₂ = {fmt(res.exKurt)} — {classifyKurt(res.exKurt)}</> : <>G₂: need n ≥ 4</>}
          </FormulaBlock>
        ),
      },
    ];
    return s;
  }, [res]);


  const summary = useMemo(() => {
    if (!res) return "";
    const lines: string[] = [];
    lines.push(`n = ${res.n}`);
    lines.push(`mean = ${fmt(res.mean)}`);
    lines.push(`sample SD = ${fmt(res.sd)}`);
    if (res.skew !== null) lines.push(`skewness (G₁) = ${fmt(res.skew)} — ${classifySkew(res.skew)}`);
    if (res.exKurt !== null) lines.push(`excess kurtosis (G₂) = ${fmt(res.exKurt)} — ${classifyKurt(res.exKurt)}`);
    return lines.join("\n");
  }, [res]);

  return (
    <MathCalcPage
      name="Skewness & Kurtosis Calculator"
      tagline="Measure the asymmetry (skewness) and tail heaviness (excess kurtosis) of any dataset — with a histogram and a smooth shape overlay so the numbers have a visual anchor."
      extras={
        <>
          <CalcSection title="Shape statistics explained, step by step">
            <p>
              This tool reports two sample moments — Fisher–Pearson adjusted
              skewness (G₁) and excess kurtosis (G₂). Each card below covers one
              piece of what the calculator actually computes.
            </p>
            <GuideCards items={SK_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Sample skewness using the Fisher–Pearson adjusted G₁ formula",
                "Sample excess kurtosis (G₂) — normal distribution = 0",
                "Automatic plain-language classification (symmetric, right/left-skewed, leptokurtic, platykurtic)",
                "Histogram of your data with a smooth distribution-shape overlay",
                "Full step-by-step working: mean, standard deviation, and formula substitution",
                "Robust input parser — commas, spaces, tabs, currency symbols and thousand separators",
                "Copy the summary or download the whole result panel as an image",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What does 'excess' kurtosis mean?",
                  a: (
                    <p>
                      Kurtosis is often reported relative to the normal
                      distribution, whose kurtosis value is 3. <em>Excess kurtosis</em>{" "}
                      subtracts that 3, so a normal distribution has excess
                      kurtosis of 0. Positive means heavier tails and a sharper
                      peak than normal (leptokurtic); negative means lighter
                      tails and a flatter peak (platykurtic). This calculator
                      reports excess kurtosis.
                    </p>
                  ),
                },
                {
                  q: "How does skewness relate to outliers?",
                  a: (
                    <p>
                      Skewness depends on the cube of each deviation, so a
                      single extreme value on one side can push skewness
                      sharply positive or negative. If a dataset has strong
                      skew, check for outliers with the Outlier Detector
                      before drawing conclusions.
                    </p>
                  ),
                },
                {
                  q: "What sample size do I need?",
                  a: (
                    <p>
                      Skewness needs at least 3 values and excess kurtosis
                      needs at least 4, but both estimates are unstable with
                      small samples. With fewer than ~30 values the numbers
                      swing wildly from sample to sample — treat them as
                      rough shape indicators, not precise population
                      parameters.
                    </p>
                  ),
                },
                {
                  q: "How do I interpret the skewness value?",
                  a: (
                    <p>
                      Rough guide: <span className="font-serif italic">|skew| &lt; 0.5</span>{" "}
                      is approximately symmetric,{" "}
                      <span className="font-serif italic">0.5–1</span> is moderately
                      skewed, and above 1 is highly skewed. Positive = long
                      right tail (mean &gt; median); negative = long left
                      tail.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/mean-median-mode-calculator", label: "Mean, Median, Mode & Range" },
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation" },
                { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
                { to: "/calculators/math/outliers-calculator", label: "Outlier Detector" },
              ]}
            />
          </CalcSection>

        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Dataset"
          htmlFor="sk-input"
          hint="Numbers separated by commas, spaces, tabs or new lines. At least 3 values (4 for kurtosis)."
        >
          <textarea
            id="sk-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 font-serif italic text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="e.g. 2, 4, 4, 5, 5, 5, 6, 6, 7, 9, 12, 18"
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
          <button
            type="button"
            onClick={clear}
            className="rounded-full border border-border/60 bg-secondary/40 px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            Clear
          </button>
        </div>

        {err && <ErrorBox message={err} />}

        {res && (
          <div ref={resultRef} className="mt-5 space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Results (n = {res.n})
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">Mean</div>
                  <div className="font-display text-lg font-semibold tabular-nums">{fmt(res.mean)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Sample SD</div>
                  <div className="font-display text-lg font-semibold tabular-nums">{fmt(res.sd)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Skewness (G₁)</div>
                  <div className="font-display text-lg font-semibold tabular-nums">
                    {res.skew !== null ? fmt(res.skew) : "—"}
                  </div>
                  {res.skew !== null && (
                    <div className="text-xs text-muted-foreground">{classifySkew(res.skew)}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Excess kurtosis (G₂)</div>
                  <div className="font-display text-lg font-semibold tabular-nums">
                    {res.exKurt !== null ? fmt(res.exKurt) : "—"}
                  </div>
                  {res.exKurt !== null && (
                    <div className="text-xs text-muted-foreground">{classifyKurt(res.exKurt)}</div>
                  )}
                </div>
              </div>
            </div>

            {notice && (
              <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-xs text-muted-foreground">
                {notice}
              </div>
            )}

            <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
              <Histogram values={res.values} mean={res.mean} sd={res.sd} />
            </div>

            <SolutionSteps steps={steps} />

            <ResultActions
              getCopyText={() => summary}
              captureRef={resultRef}
              filename="skewness-kurtosis-result"
            />
          </div>
        )}
      </div>
    </MathCalcPage>
  );
}
