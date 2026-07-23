import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { SolutionSteps, type Step } from "@/components/SolutionSteps";
import { fmt } from "@/lib/math/confidence-interval";
import { normalPDF } from "@/lib/math/p-value";

export const Route = createFileRoute("/calculators/math/standard-error-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Standard Error Calculator",
      title:
        "Standard Error Calculator — Mean & Proportion",
      metaDescription:
        "Compute the standard error of a mean or proportion with worked steps, SE formula, and clear interpretation.",
      canonicalUrl: "/calculators/math/standard-error-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Standard Error Calculator",
          path: "/calculators/math/standard-error-calculator",
        },
      ],
      faqs: [
        {
          q: "Is standard error the same as standard deviation?",
          a: "No. Standard deviation describes how spread out individual data points are around the sample mean. Standard error describes how much the sample mean itself would jump around if you repeated the sampling — it is the standard deviation of the sampling distribution, and it shrinks as n grows.",
        },
        {
          q: "Why does standard error get smaller when n increases?",
          a: "Because SE = s/√n. Larger samples estimate the population mean more precisely, so the sampling distribution of the mean tightens around the true value. Standard deviation, in contrast, is a property of the underlying data and does not systematically shrink with n.",
        },
        {
          q: "Which SE formula do I need for a survey percentage?",
          a: "The proportion formula: SE = √(p(1 − p)/n), where p is the observed sample proportion (e.g. 0.60 for 60%) and n is the sample size.",
        },
        {
          q: "How do standard error, margin of error and confidence interval relate?",
          a: "Margin of error = critical value × standard error, and the confidence interval is the point estimate ± margin of error. So standard error is the core building block — the Margin of Error and Confidence Interval calculators just wrap it with a critical value (Z or t).",
        },
        {
          q: "When should I report SE vs SD?",
          a: "Report the standard deviation to describe variability in the data itself (e.g. patients differed a lot in blood pressure). Report the standard error, or better a confidence interval, when talking about the precision of an estimate such as the sample mean or a treatment effect.",
        },
        {
          q: "Why do the two-sample formulas use s²/n and not just s?",
          a: "Because variances of independent samples add, but standard deviations do not. SE(x̄₁ − x̄₂) = √(Var(x̄₁) + Var(x̄₂)) = √(s₁²/n₁ + s₂²/n₂).",
        },
      ],
    }),
  component: StandardErrorPage,
});

function StandardErrorPage() {
  return (
    <MathCalcPage
      name="Standard Error Calculator"
      tagline="Standard error of the mean, of a proportion, and of the difference between two independent means — with a sampling-distribution diagram and step-by-step working."
      extras={<Extras />}
    >
      <div className="space-y-8">
        <MeanTool />
        <div className="h-px bg-border/60" />
        <ProportionTool />
        <div className="h-px bg-border/60" />
        <DifferenceTool />
      </div>
    </MathCalcPage>
  );
}

/* ================================================================
   Shared visual — sampling distribution with ±1 SE shaded
   ================================================================ */
function SamplingCurve({
  center,
  se,
  label,
  unit,
}: {
  center: number;
  se: number;
  label: string;
  unit?: string;
}) {
  const W = 560;
  const H = 200;
  const pad = 34;
  const xMin = -4;
  const xMax = 4;
  const N = 320;
  const pts: [number, number][] = [];
  let maxY = 0;
  for (let i = 0; i <= N; i++) {
    const z = xMin + ((xMax - xMin) * i) / N;
    const y = normalPDF(z);
    if (y > maxY) maxY = y;
    pts.push([z, y]);
  }
  const px = (z: number) => pad + ((z - xMin) / (xMax - xMin)) * (W - 2 * pad);
  const py = (y: number) => H - pad - (y / maxY) * (H - 2 * pad);
  const curve =
    "M " +
    pts.map(([z, y]) => `${px(z).toFixed(1)},${py(y).toFixed(1)}`).join(" L ");

  const shadePts = pts.filter(([z]) => z >= -1 && z <= 1);
  const shade =
    `M ${px(-1).toFixed(1)},${py(0).toFixed(1)} ` +
    "L " +
    shadePts
      .map(([z, y]) => `${px(z).toFixed(1)},${py(y).toFixed(1)}`)
      .join(" L ") +
    ` L ${px(1).toFixed(1)},${py(0).toFixed(1)} Z`;

  const axisY = py(0);
  const tick = (z: number, txt: string) => (
    <g key={txt}>
      <line
        x1={px(z)}
        x2={px(z)}
        y1={axisY}
        y2={axisY + 5}
        stroke="currentColor"
        strokeWidth="1"
        className="text-muted-foreground/60"
      />
      <text
        x={px(z)}
        y={axisY + 18}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px]"
      >
        {txt}
      </text>
    </g>
  );

  const val = (z: number) =>
    `${fmt(center + z * se, 4)}${unit ?? ""}`;

  return (
    <figure className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-background/40 p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
        className="mx-auto block w-full max-w-[560px] text-primary"
      >
        <line
          x1={pad}
          x2={W - pad}
          y1={axisY}
          y2={axisY}
          stroke="currentColor"
          strokeWidth="1"
          className="text-muted-foreground/40"
        />
        <path
          d={shade}
          fill="currentColor"
          fillOpacity={0.18}
        />
        <path d={curve} fill="none" stroke="currentColor" strokeWidth="1.6" />
        <line
          x1={px(0)}
          x2={px(0)}
          y1={py(0)}
          y2={py(normalPDF(0))}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        {tick(-3, val(-3))}
        {tick(-2, val(-2))}
        {tick(-1, val(-1))}
        {tick(0, val(0))}
        {tick(1, val(1))}
        {tick(2, val(2))}
        {tick(3, val(3))}
        <text
          x={px(0)}
          y={py(normalPDF(0)) - 6}
          textAnchor="middle"
          className="fill-foreground text-[11px] font-medium"
        >
          estimate
        </text>
        <text
          x={(px(-1) + px(1)) / 2}
          y={axisY - 6}
          textAnchor="middle"
          className="fill-foreground text-[10px]"
        >
          ±1 SE ≈ 68%
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        {label}
      </figcaption>
    </figure>
  );
}

/* ================================================================
   TOOL 1 — Standard Error of the Mean
   ================================================================ */
function MeanTool() {
  const [s, setS] = useState("15");
  const [n, setN] = useState("25");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{ s: number; n: number; se: number } | null>(
    null,
  );

  const run = () => {
    setErr(null);
    const sv = Number(s);
    const nv = Number(n);
    if (!Number.isFinite(sv) || sv < 0)
      return setErr("Enter a non-negative standard deviation s.");
    if (!Number.isInteger(nv) || nv < 2)
      return setErr("Sample size n must be an integer ≥ 2.");
    setRes({ s: sv, n: nv, se: sv / Math.sqrt(nv) });
  };

  const steps: Step[] = useMemo(() => {
    if (!res) return [];
    const legend = [
      { sym: "s", def: "sample standard deviation" },
      { sym: "n", def: "sample size" },
      { sym: "SE(x̄)", def: "standard error of the mean" },
    ];
    return [
      {
        title: "Given",
        body: <FormulaBlock>s = {fmt(res.s, 6)}, &nbsp; n = {res.n}</FormulaBlock>,
      },
      { title: "Formula", body: <FormulaWithLegend formula={<>SE(x̄) = s / √n</>} legend={legend} /> },
      {
        title: "Substitute",
        body: <FormulaBlock>SE = {fmt(res.s, 6)} / √{res.n} = {fmt(res.s, 6)} / {fmt(Math.sqrt(res.n), 6)}</FormulaBlock>,
      },
      {
        title: "Answer",
        body: <FormulaBlock>SE ≈ {fmt(res.se, 6)}</FormulaBlock>,
      },
    ];
  }, [res]);

  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-foreground">
        1 · Standard Error of the Mean
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Given a sample standard deviation <em>s</em> and sample size{" "}
        <em>n</em>, computes SE(x̄) = s / √n.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Sample standard deviation (s)" htmlFor="se-mean-s">
          <TextInput
            id="se-mean-s"
            value={s}
            onChange={(e) => setS(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Sample size (n)" htmlFor="se-mean-n">
          <TextInput
            id="se-mean-n"
            value={n}
            onChange={(e) => setN(e.target.value)}
            inputMode="numeric"
          />
        </Field>
      </div>

      <div className="mt-4">
        <PrimaryButton onClick={run}>Calculate SE</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {res && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <div className="text-sm text-muted-foreground">
            Standard error of the mean
          </div>
          <div className="mt-1 font-display text-2xl font-semibold text-foreground">
            SE ≈ {fmt(res.se, 6)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            s = {fmt(res.s, 4)}, n = {res.n}, √n = {fmt(Math.sqrt(res.n), 4)}
          </div>

          <SamplingCurve
            center={0}
            se={res.se}
            label={`Sampling distribution of the sample mean (centred at 0 for illustration) with ±1 SE ≈ ±${fmt(res.se, 4)} shaded`}
          />

          <SolutionSteps steps={steps} />
        </div>
      )}
    </section>
  );
}

/* ================================================================
   TOOL 2 — Standard Error of a Proportion
   ================================================================ */
function ProportionTool() {
  const [p, setP] = useState("0.6");
  const [n, setN] = useState("1000");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{ p: number; n: number; se: number } | null>(
    null,
  );

  const run = () => {
    setErr(null);
    const pv = Number(p);
    const nv = Number(n);
    if (!Number.isFinite(pv) || pv < 0 || pv > 1)
      return setErr("Proportion p must be between 0 and 1.");
    if (!Number.isInteger(nv) || nv < 2)
      return setErr("Sample size n must be an integer ≥ 2.");
    setRes({ p: pv, n: nv, se: Math.sqrt((pv * (1 - pv)) / nv) });
  };

  const steps: Step[] = useMemo(() => {
    if (!res) return [];
    const inner = (res.p * (1 - res.p)) / res.n;
    const legend = [
      { sym: "p", def: "sample proportion (0–1)" },
      { sym: "n", def: "sample size" },
      { sym: "SE(p̂)", def: "standard error of the proportion" },
    ];
    return [
      {
        title: "Given",
        body: <FormulaBlock>p = {fmt(res.p, 4)}, &nbsp; n = {res.n}</FormulaBlock>,
      },
      { title: "Formula", body: <FormulaWithLegend formula={<>SE(p̂) = √( p(1 − p) / n )</>} legend={legend} /> },
      {
        title: "Substitute",
        body: (
          <FormulaBlock>
            p(1 − p) = {fmt(res.p, 4)} × {fmt(1 - res.p, 4)} = {fmt(res.p * (1 - res.p), 6)}<br />
            p(1 − p) / n = {fmt(res.p * (1 - res.p), 6)} / {res.n} = {fmt(inner, 8)}
          </FormulaBlock>
        ),
      },
      {
        title: "Answer",
        body: <FormulaBlock>SE = √{fmt(inner, 8)} ≈ {fmt(res.se, 6)} &nbsp; (±{fmt(res.se * 100, 3)}%)</FormulaBlock>,
      },
    ];
  }, [res]);

  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-foreground">
        2 · Standard Error of a Proportion
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        For a survey proportion p̂ (between 0 and 1) with sample size n, SE(p̂)
        = √(p(1 − p) / n).
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Sample proportion (p, 0–1)"
          htmlFor="se-prop-p"
          hint="Enter 0.6 for 60%."
        >
          <TextInput
            id="se-prop-p"
            value={p}
            onChange={(e) => setP(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Sample size (n)" htmlFor="se-prop-n">
          <TextInput
            id="se-prop-n"
            value={n}
            onChange={(e) => setN(e.target.value)}
            inputMode="numeric"
          />
        </Field>
      </div>

      <div className="mt-4">
        <PrimaryButton onClick={run}>Calculate SE</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {res && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <div className="text-sm text-muted-foreground">
            Standard error of the proportion
          </div>
          <div className="mt-1 font-display text-2xl font-semibold text-foreground">
            SE ≈ {fmt(res.se, 6)} &nbsp;
            <span className="text-base text-muted-foreground">
              (±{fmt(res.se * 100, 3)}%)
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            p = {fmt(res.p, 4)}, 1 − p = {fmt(1 - res.p, 4)}, n = {res.n}
          </div>

          <SamplingCurve
            center={res.p * 100}
            se={res.se * 100}
            unit="%"
            label={`Sampling distribution of p̂ centred at ${fmt(res.p * 100, 2)}% with ±1 SE ≈ ±${fmt(res.se * 100, 3)}% shaded`}
          />

          <SolutionSteps steps={steps} />
        </div>
      )}
    </section>
  );
}

/* ================================================================
   TOOL 3 — SE of Difference Between Two Independent Means
   ================================================================ */
function DifferenceTool() {
  const [s1, setS1] = useState("10");
  const [n1, setN1] = useState("50");
  const [s2, setS2] = useState("12");
  const [n2, setN2] = useState("60");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{
    s1: number;
    n1: number;
    s2: number;
    n2: number;
    v1: number;
    v2: number;
    se: number;
  } | null>(null);

  const run = () => {
    setErr(null);
    const a = Number(s1);
    const b = Number(s2);
    const na = Number(n1);
    const nb = Number(n2);
    if (!Number.isFinite(a) || a < 0 || !Number.isFinite(b) || b < 0)
      return setErr("Standard deviations must be non-negative.");
    if (!Number.isInteger(na) || na < 2 || !Number.isInteger(nb) || nb < 2)
      return setErr("Both sample sizes must be integers ≥ 2.");
    const v1 = (a * a) / na;
    const v2 = (b * b) / nb;
    setRes({ s1: a, s2: b, n1: na, n2: nb, v1, v2, se: Math.sqrt(v1 + v2) });
  };

  const steps: Step[] = useMemo(() => {
    if (!res) return [];
    const legend = [
      { sym: "s₁, s₂", def: "sample standard deviations" },
      { sym: "n₁, n₂", def: "sample sizes" },
      { sym: "SE(x̄₁ − x̄₂)", def: "SE of the difference" },
    ];
    return [
      {
        title: "Given",
        body: <FormulaBlock>s₁ = {fmt(res.s1, 4)}, n₁ = {res.n1}; &nbsp; s₂ = {fmt(res.s2, 4)}, n₂ = {res.n2}</FormulaBlock>,
      },
      { title: "Formula", body: <FormulaWithLegend formula={<>SE(x̄₁ − x̄₂) = √( s₁²/n₁ + s₂²/n₂ )</>} legend={legend} /> },
      {
        title: "Substitute",
        body: (
          <FormulaBlock>
            s₁²/n₁ = {fmt(res.s1 * res.s1, 4)} / {res.n1} = {fmt(res.v1, 6)}<br />
            s₂²/n₂ = {fmt(res.s2 * res.s2, 4)} / {res.n2} = {fmt(res.v2, 6)}
          </FormulaBlock>
        ),
      },
      {
        title: "Answer",
        body: <FormulaBlock>SE = √({fmt(res.v1, 6)} + {fmt(res.v2, 6)}) = √{fmt(res.v1 + res.v2, 6)} ≈ {fmt(res.se, 6)}</FormulaBlock>,
      },
    ];
  }, [res]);

  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-foreground">
        3 · Standard Error of the Difference Between Two Means
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        For two independent samples, SE(x̄₁ − x̄₂) = √(s₁²/n₁ + s₂²/n₂). This is
        the SE used in a two-sample (Welch's) t-test.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Sample 1 — standard deviation (s₁)" htmlFor="se-d-s1">
          <TextInput
            id="se-d-s1"
            value={s1}
            onChange={(e) => setS1(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Sample 1 — size (n₁)" htmlFor="se-d-n1">
          <TextInput
            id="se-d-n1"
            value={n1}
            onChange={(e) => setN1(e.target.value)}
            inputMode="numeric"
          />
        </Field>
        <Field label="Sample 2 — standard deviation (s₂)" htmlFor="se-d-s2">
          <TextInput
            id="se-d-s2"
            value={s2}
            onChange={(e) => setS2(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Sample 2 — size (n₂)" htmlFor="se-d-n2">
          <TextInput
            id="se-d-n2"
            value={n2}
            onChange={(e) => setN2(e.target.value)}
            inputMode="numeric"
          />
        </Field>
      </div>

      <div className="mt-4">
        <PrimaryButton onClick={run}>Calculate SE</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {res && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <div className="text-sm text-muted-foreground">
            Standard error of (x̄₁ − x̄₂)
          </div>
          <div className="mt-1 font-display text-2xl font-semibold text-foreground">
            SE ≈ {fmt(res.se, 6)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            s₁²/n₁ = {fmt(res.v1, 4)}, s₂²/n₂ = {fmt(res.v2, 4)}, sum ={" "}
            {fmt(res.v1 + res.v2, 4)}
          </div>

          <SamplingCurve
            center={0}
            se={res.se}
            label={`Sampling distribution of the difference in sample means (centred at 0 under H₀) with ±1 SE ≈ ±${fmt(res.se, 4)} shaded`}
          />

          <SolutionSteps steps={steps} />
        </div>
      )}
    </section>
  );
}

/* ================================================================
   Educational content
   ================================================================ */
const SE_GUIDE: GuideCardItem[] = [
  {
    key: "def",
    title: "1. SE vs SD — precision of the estimate vs spread of the data",
    explain:
      "Standard deviation describes how spread out individual data points are around the mean. Standard error describes how spread out the estimate itself would be across repeated samples. SD does not shrink with n; SE shrinks as 1 / √n. Report SE (or a CI) when you're talking about how precise the mean is.",
    formula: <>SE = s / √n &nbsp;·&nbsp; s = √(Σ(xᵢ − x̄)² / (n − 1))</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M20 90 Q70 20 120 55 T220 90" fill="none" className="stroke-primary/40" strokeWidth="2" strokeDasharray="4 3" />
          <path d="M60 90 Q95 30 120 60 T180 90" fill="none" className="stroke-primary" strokeWidth="2" />
          <text x="35" y="35" fontSize="9" className="fill-muted-foreground">SD: data</text>
          <text x="130" y="30" fontSize="9" className="fill-primary">SE: mean</text>
        </svg>
      </div>
    ),
    example: {
      given: "s = 3.16, n = 5",
      substitute: "SE = 3.16 / √5",
      answer: "SE ≈ 1.414",
    },
  },
  {
    key: "mean",
    title: "2. SE of a mean — s / √n",
    explain:
      "For a single quantitative variable, plug the sample standard deviation and sample size into s / √n. Quadrupling n halves SE, matching the √n rule you see everywhere in sampling theory.",
    formula: <>SE(x̄) = s / √n</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="80" x2="220" y2="80" className="stroke-border" />
          {[[40, 40], [90, 25], [150, 15], [210, 10]].map(([x, h], i) => (
            <g key={i}>
              <rect x={x - 10} y={80 - h} width="20" height={h} className="fill-primary/70" />
              <text x={x} y={95} fontSize="8" textAnchor="middle" className="fill-muted-foreground">{[25, 100, 400, 1600][i]}</text>
            </g>
          ))}
          <text x="120" y="108" fontSize="9" textAnchor="middle" className="fill-foreground">SE shrinks as 1/√n</text>
        </svg>
      </div>
    ),
    example: {
      given: "s = 15, n = 25",
      substitute: "SE = 15 / √25",
      answer: "SE = 3.0",
    },
  },
  {
    key: "prop",
    title: "3. SE of a proportion — √(p(1 − p) / n)",
    explain:
      "For a yes/no outcome the SE uses the sample proportion, not a separate s. The variance p(1 − p) peaks at p = 0.5, so the widest SE for a given n occurs when the outcome is a coin-flip.",
    formula: <>SE(p̂) = √( p(1 − p) / n )</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M30 90 Q120 -10 210 90" fill="none" className="stroke-primary" strokeWidth="2" />
          <line x1="120" y1="30" x2="120" y2="90" className="stroke-primary" strokeDasharray="3 3" />
          <text x="120" y="105" fontSize="10" textAnchor="middle" className="fill-foreground">p = 0.5 → widest SE</text>
        </svg>
      </div>
    ),
    example: {
      given: "p = 0.60, n = 1000",
      substitute: "√(0.24 / 1000)",
      answer: "SE ≈ 0.01549",
    },
  },
  {
    key: "diff",
    title: "4. SE of a difference — variances add, not SEs",
    explain:
      "For two independent means, the sampling variances add. That's why you square each SE, sum, then take the square root. This is the Welch (unequal-variance) form and is the safer default. It's exactly what a two-sample t-test uses in the denominator.",
    formula: <>SE(x̄₁ − x̄₂) = √( s₁²/n₁ + s₂²/n₂ )</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 90" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="50" x2="220" y2="50" className="stroke-border" />
          <rect x="70" y="45" width="30" height="10" className="fill-primary/70" />
          <rect x="140" y="45" width="30" height="10" className="fill-primary/40" />
          <text x="85" y="40" fontSize="9" textAnchor="middle" className="fill-foreground">SE₁</text>
          <text x="155" y="40" fontSize="9" textAnchor="middle" className="fill-foreground">SE₂</text>
          <text x="120" y="80" fontSize="10" textAnchor="middle" className="fill-primary">√(SE₁² + SE₂²)</text>
        </svg>
      </div>
    ),
    example: {
      given: "s₁=10, n₁=50; s₂=12, n₂=60",
      substitute: "√(2.000 + 2.400)",
      answer: "SE ≈ 2.098",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="Standard error explained, step by step">
        <p>
          Standard error measures the precision of an <em>estimate</em>, not
          the spread of the raw data. Each card below covers one of the three
          SE forms this calculator supports.
        </p>
        <GuideCards items={SE_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Three SE tools in one page — mean, proportion, and difference of two means.",
            "Sampling-distribution diagram with the ±1 SE region shaded for every result.",
            "Show / hide step-by-step working powered by the site's shared solution component.",
            "Uses exact formulas — no rounding until the final display.",
            "Direct links to the Margin of Error and Confidence Interval calculators to turn SE into a full interval.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            {
              q: "Does standard error assume the data is normal?",
              a: "No — the formulas above only need the sample statistic to have an approximately normal sampling distribution, which is guaranteed for large enough n by the Central Limit Theorem even when the raw data is skewed. For small n with strongly non-normal data, prefer a bootstrap SE or a distribution-specific method.",
            },
            {
              q: "Is the '±1 SE' band on the diagram a confidence interval?",
              a: "It covers roughly 68% of the sampling distribution — useful as a visual scale, but you'd normally report a 95% interval, which is roughly ±2 SE (±1.96 SE, exactly).",
            },
            {
              q: "What if my two samples have very different sizes or variances?",
              a: "The two-sample formula √(s₁²/n₁ + s₂²/n₂) already accounts for that — it does NOT assume equal variances. That's the Welch (unequal-variance) form and is the safer default.",
            },
            {
              q: "Can I use this for the difference of two proportions?",
              a: "The general principle is the same — SE(p̂₁ − p̂₂) = √(p̂₁(1 − p̂₁)/n₁ + p̂₂(1 − p̂₂)/n₂) — but this page focuses on the three most-used forms. Support for the difference-of-proportions form can be added on request.",
            },
            {
              q: "Why divide by n − 1 for s but by n for SE?",
              a: "You don't divide SE by n on its own — SE = s / √n, and s itself already uses n − 1 in its variance formula. The n − 1 is Bessel's correction inside the standard-deviation step; it doesn't reappear when you form the standard error.",
            },
          ]}
        />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
            { to: "/calculators/math/confidence-interval-calculator", label: "Confidence Interval Calculator" },
            { to: "/calculators/math/margin-of-error-calculator", label: "Margin of Error Calculator" },
            { to: "/calculators/math/sample-size-calculator", label: "Sample Size Calculator" },
          ]}
        />
      </CalcSection>
    </>
  );
}
