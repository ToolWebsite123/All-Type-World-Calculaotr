import { createFileRoute, Link } from "@tanstack/react-router";
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
  FormulaBlock,
  WorkedExample,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  type GuideCardItem,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { SolutionSteps, type Step } from "@/components/SolutionSteps";

import { parseDataset } from "@/lib/math/parse-numbers";
import {
  summarize,
  oneSampleTTest,
  twoSampleTTest,
  pairedTTest,
  tPDF,
  fmt,
  fmtP,
  type Tail,
  type TTestResult,
  type SampleStats,
} from "@/lib/math/t-test";

export const Route = createFileRoute("/calculators/math/t-test-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "T-Test Calculator",
      title:
        "T-Test Calculator — One, Two-Sample & Paired",
      metaDescription:
        "Run one-sample, two-sample (pooled & Welch), or paired t-tests with t-statistic, df, p-value, and CI.",
      canonicalUrl: "/calculators/math/t-test-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "T-Test Calculator", path: "/calculators/math/t-test-calculator" },
      ],
      faqs: [
        {
          q: "When should I use a t-test instead of a z-test?",
          a: "Use a t-test whenever the population standard deviation is unknown and you are estimating it from the sample — which is almost always the case in practice. A z-test assumes the population standard deviation is known. For small samples the t-distribution has heavier tails to account for that extra uncertainty.",
        },
        {
          q: "What is the difference between Student's t-test and Welch's t-test?",
          a: "Student's t-test assumes the two groups have equal population variances and pools them into one estimate. Welch's t-test does not — it uses each group's variance separately and estimates a fractional degrees of freedom. Welch's is more robust when variances or sample sizes differ, and most modern statistics guidance recommends it as the default for two independent samples.",
        },
        {
          q: "What does a p-value of 0.03 actually mean?",
          a: "It means that if the null hypothesis were true (no real difference), you would see a test statistic at least as extreme as the one you got in about 3% of samples of this size. A small p-value is evidence against the null — it is not the probability that the null is true.",
        },
        {
          q: "Does 'fail to reject the null' mean the two means are equal?",
          a: "No. It means you did not find enough evidence to conclude they differ at the chosen significance level. The true means could still be different — you just could not detect it with this sample. Absence of evidence is not evidence of absence.",
        },
        {
          q: "When should I use a paired t-test?",
          a: "Use a paired t-test when each observation in one group is naturally matched to one in the other — before-and-after measurements on the same subjects, twin studies, or matched pairs. It removes between-subject variability by working on the within-pair differences and is usually more powerful than an independent t-test on the same data.",
        },
        {
          q: "Can I use a t-test with only 3 or 4 data points?",
          a: "Technically yes, and the calculator will compute a result. But with so few observations the test has very low statistical power and requires the data to be roughly normally distributed. Interpret the result with caution and prefer collecting more data when you can.",
        },
      ],
    }),
  component: TTestPage,
});

type Mode = "one" | "two" | "paired";
const TAILS: { v: Tail; label: string }[] = [
  { v: "two", label: "Two-tailed (≠)" },
  { v: "left", label: "Left-tailed (<)" },
  { v: "right", label: "Right-tailed (>)" },
];

/* ============================================================
   Page
   ============================================================ */

function TTestPage() {
  const [mode, setMode] = useState<Mode>("two");
  return (
    <MathCalcPage
      name="T-Test Calculator"
      tagline="Run a one-sample, two-sample independent or paired t-test — from raw data or summary stats — and get the t-statistic, degrees of freedom, p-value, critical value and a plain-language conclusion, with a shaded t-distribution diagram."
      extras={<Extras />}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["one", "One-Sample"],
            ["two", "Two-Sample (Independent)"],
            ["paired", "Paired"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
              (mode === m
                ? "border-primary/60 bg-primary/15 text-foreground"
                : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "one" && <OneSampleTool />}
      {mode === "two" && <TwoSampleTool />}
      {mode === "paired" && <PairedTool />}
    </MathCalcPage>
  );
}

/* ============================================================
   Shared: sample-input block (raw or summary)
   ============================================================ */

interface SampleInputProps {
  label: string;
  raw: string;
  setRaw: (s: string) => void;
  summary: { mean: string; sd: string; n: string };
  setSummary: (s: { mean: string; sd: string; n: string }) => void;
  useSummary: boolean;
  setUseSummary: (b: boolean) => void;
}

function SampleInput({
  label,
  raw,
  setRaw,
  summary,
  setSummary,
  useSummary,
  setUseSummary,
}: SampleInputProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-base font-semibold text-foreground">
          {label}
        </div>
        <div className="flex gap-1 rounded-full border border-border/60 bg-secondary/30 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setUseSummary(false)}
            className={
              "rounded-full px-2.5 py-1 " +
              (!useSummary
                ? "bg-primary/20 text-foreground"
                : "text-muted-foreground")
            }
          >
            Raw data
          </button>
          <button
            type="button"
            onClick={() => setUseSummary(true)}
            className={
              "rounded-full px-2.5 py-1 " +
              (useSummary
                ? "bg-primary/20 text-foreground"
                : "text-muted-foreground")
            }
          >
            Summary stats
          </button>
        </div>
      </div>
      {useSummary ? (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Mean (x̄)">
            <TextInput
              value={summary.mean}
              onChange={(e) => setSummary({ ...summary, mean: e.target.value })}
              inputMode="decimal"
            />
          </Field>
          <Field label="Std. dev (s)">
            <TextInput
              value={summary.sd}
              onChange={(e) => setSummary({ ...summary, sd: e.target.value })}
              inputMode="decimal"
            />
          </Field>
          <Field label="Sample size (n)">
            <TextInput
              value={summary.n}
              onChange={(e) => setSummary({ ...summary, n: e.target.value })}
              inputMode="numeric"
            />
          </Field>
        </div>
      ) : (
        <Field label="Values (comma, space or newline separated)">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
      )}
    </div>
  );
}

function resolveSample(
  raw: string,
  summary: { mean: string; sd: string; n: string },
  useSummary: boolean,
): { stats: SampleStats; values?: number[] } | { error: string } {
  if (useSummary) {
    const mean = Number(summary.mean);
    const sd = Number(summary.sd);
    const n = Number(summary.n);
    if (!Number.isFinite(mean) || !Number.isFinite(sd) || !Number.isFinite(n))
      return { error: "Enter a numeric mean, standard deviation and n." };
    if (n < 2) return { error: "Sample size n must be at least 2." };
    if (sd <= 0) return { error: "Standard deviation must be greater than 0." };
    return { stats: { mean, sd, variance: sd * sd, n } };
  }
  const p = parseDataset(raw);
  if (p.values.length < 2)
    return { error: "Enter at least 2 numeric values." };
  return { stats: summarize(p.values), values: p.values };
}

/* ============================================================
   Conclusion sentence
   ============================================================ */

function conclusion(res: TTestResult, name: string): string {
  const cmp =
    res.tail === "two"
      ? "differs from"
      : res.tail === "right"
        ? "is greater than"
        : "is less than";
  if (res.reject)
    return `Reject the null hypothesis at α = ${res.alpha}. The evidence suggests ${name} ${cmp} the reference (p = ${fmtP(res.pValue)}).`;
  return `Fail to reject the null hypothesis at α = ${res.alpha}. There is not enough evidence to conclude ${name} ${cmp} the reference (p = ${fmtP(res.pValue)}).`;
}

/* ============================================================
   Result panel with t-distribution diagram
   ============================================================ */

function ResultPanel({
  res,
  conclusionText,
  captureRef,
  copyText,
  filename,
  steps,
}: {
  res: TTestResult;
  conclusionText: string;
  captureRef: React.RefObject<HTMLDivElement | null>;
  copyText: string;
  filename: string;
  steps: Step[];
}) {
  return (
    <>
      <div
        ref={captureRef}
        className="mt-5 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="t-statistic" value={fmt(res.t)} />
          <Stat label="Degrees of freedom" value={fmt(res.df, 3)} />
          <Stat label="p-value" value={fmtP(res.pValue)} />
          <Stat label="Critical value" value={"±" + fmt(res.critical, 4)} />
        </div>
        <div className="mt-4">
          <TDistDiagram res={res} />
        </div>
        <div
          className={
            "mt-4 rounded-xl border p-3 text-sm " +
            (res.reject
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "border-border/60 bg-secondary/30 text-foreground")
          }
        >
          <span className="font-semibold">
            {res.reject ? "Reject H₀." : "Fail to reject H₀."}
          </span>{" "}
          {conclusionText}
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <ResultActions
          captureRef={captureRef}
          filename={filename}
          getCopyText={() => copyText}
        />
      </div>
      <SolutionSteps steps={steps} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="font-display text-lg font-semibold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   T-distribution SVG (shaded rejection region + observed t)
   ============================================================ */

function TDistDiagram({ res }: { res: TTestResult }) {
  const { t, df, critical, tail } = res;
  const W = 560;
  const H = 200;
  const pad = 30;
  const range = Math.max(4, Math.abs(t) + 1, critical + 1);
  const xMin = -range;
  const xMax = range;
  const N = 200;

  const points: [number, number][] = [];
  let maxY = 0;
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = tPDF(x, Math.max(df, 1));
    points.push([x, y]);
    if (y > maxY) maxY = y;
  }
  const px = (x: number) =>
    pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
  const py = (y: number) => H - pad - (y / maxY) * (H - 2 * pad);

  const curve =
    "M " + points.map(([x, y]) => `${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" L ");

  const rejectPath = (from: number, to: number) => {
    const pts = points.filter(([x]) => x >= from && x <= to);
    if (pts.length < 2) return "";
    const first = pts[0];
    const last = pts[pts.length - 1];
    return (
      `M ${px(first[0]).toFixed(1)},${py(0).toFixed(1)} ` +
      pts
        .map(([x, y]) => `L ${px(x).toFixed(1)},${py(y).toFixed(1)}`)
        .join(" ") +
      ` L ${px(last[0]).toFixed(1)},${py(0).toFixed(1)} Z`
    );
  };

  const shades: string[] = [];
  if (tail === "two") {
    shades.push(rejectPath(xMin, -critical));
    shades.push(rejectPath(critical, xMax));
  } else if (tail === "right") {
    shades.push(rejectPath(critical, xMax));
  } else {
    shades.push(rejectPath(xMin, -critical));
  }

  const tClamped = Math.max(xMin, Math.min(xMax, t));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="t-distribution with shaded rejection region and observed t-statistic"
    >
      {/* baseline */}
      <line
        x1={pad}
        y1={H - pad}
        x2={W - pad}
        y2={H - pad}
        className="stroke-muted-foreground/40"
        strokeWidth={1}
      />
      {/* shaded rejection region */}
      {shades.map((d, i) => (
        <path key={i} d={d} className="fill-destructive/30" />
      ))}
      {/* curve */}
      <path d={curve} className="fill-none stroke-primary" strokeWidth={2} />
      {/* critical value markers */}
      {(tail === "two" || tail === "left") && (
        <line
          x1={px(-critical)}
          y1={pad}
          x2={px(-critical)}
          y2={H - pad}
          className="stroke-muted-foreground/60"
          strokeDasharray="4 3"
        />
      )}
      {(tail === "two" || tail === "right") && (
        <line
          x1={px(critical)}
          y1={pad}
          x2={px(critical)}
          y2={H - pad}
          className="stroke-muted-foreground/60"
          strokeDasharray="4 3"
        />
      )}
      {/* observed t */}
      <line
        x1={px(tClamped)}
        y1={pad - 6}
        x2={px(tClamped)}
        y2={H - pad}
        className="stroke-foreground"
        strokeWidth={1.5}
      />
      <circle
        cx={px(tClamped)}
        cy={py(tPDF(tClamped, Math.max(df, 1)))}
        r={4}
        className="fill-foreground"
      />
      {/* labels */}
      <text
        x={px(tClamped)}
        y={pad - 10}
        textAnchor="middle"
        className="fill-foreground text-[11px] font-medium"
      >
        t = {fmt(t, 3)}
      </text>
      {(tail === "two" || tail === "right") && (
        <text
          x={px(critical)}
          y={H - pad + 14}
          textAnchor="middle"
          className="fill-muted-foreground text-[11px]"
        >
          +{fmt(critical, 3)}
        </text>
      )}
      {(tail === "two" || tail === "left") && (
        <text
          x={px(-critical)}
          y={H - pad + 14}
          textAnchor="middle"
          className="fill-muted-foreground text-[11px]"
        >
          −{fmt(critical, 3)}
        </text>
      )}
      <text
        x={px(0)}
        y={H - pad + 14}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px]"
      >
        0
      </text>
    </svg>
  );
}

/* ============================================================
   Tool: One-Sample
   ============================================================ */

function OneSampleTool() {
  const [raw, setRaw] = useState("5.1, 4.9, 5.0, 5.2, 4.8, 5.1, 5.0, 4.95");
  const [summary, setSummary] = useState({ mean: "", sd: "", n: "" });
  const [useSummary, setUseSummary] = useState(false);
  const [mu0, setMu0] = useState("5");
  const [alpha, setAlpha] = useState("0.05");
  const [tail, setTail] = useState<Tail>("two");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<null | {
    r: TTestResult;
    s: SampleStats;
  }>(null);
  const cap = useRef<HTMLDivElement>(null);

  function run() {
    setErr(null);
    setRes(null);
    const s = resolveSample(raw, summary, useSummary);
    if ("error" in s) return setErr(s.error);
    const m = Number(mu0);
    const a = Number(alpha);
    if (!Number.isFinite(m)) return setErr("Enter a numeric μ₀.");
    if (!(a > 0 && a < 1))
      return setErr("Significance level α must be between 0 and 1.");
    const r = oneSampleTTest(s.stats, m, a, tail);
    setRes({ r, s: s.stats });
  }

  const steps: Step[] = useMemo(() => {
    if (!res) return [];
    const { r, s } = res;
    return [
      {
        title: "Given",
        body: (
          <FormulaBlock>
            n = {s.n}, x̄ = {fmt(s.mean)}, s = {fmt(s.sd)}
          </FormulaBlock>
        ),
      },
      {
        title: "Formula & Substitute — SE",
        body: (
          <FormulaBlock>
            SE = s / √n = {fmt(s.sd)} / √{s.n} = {fmt(r.se)}
          </FormulaBlock>
        ),
      },
      {
        title: "Substitute — t",
        body: (
          <FormulaBlock>
            t = (x̄ − μ₀) / SE = ({fmt(s.mean)} − {mu0}) / {fmt(r.se)} ={" "}
            {fmt(r.t)}
          </FormulaBlock>
        ),
      },
      {
        title: "Answer",
        body: (
          <FormulaBlock>
            df = n − 1 = {r.df}
            <br />
            p-value ({r.tail}-tailed) = {fmtP(r.pValue)}
            <br />
            Critical value at α = {r.alpha}: ±{fmt(r.critical)}
          </FormulaBlock>
        ),
      },
    ];
  }, [res, mu0]);

  return (
    <>
      <SampleInput
        label="Sample"
        raw={raw}
        setRaw={setRaw}
        summary={summary}
        setSummary={setSummary}
        useSummary={useSummary}
        setUseSummary={setUseSummary}
      />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Hypothesized mean (μ₀)">
          <TextInput
            value={mu0}
            onChange={(e) => setMu0(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Significance level (α)">
          <TextInput
            value={alpha}
            onChange={(e) => setAlpha(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Alternative hypothesis">
          <select
            value={tail}
            onChange={(e) => setTail(e.target.value as Tail)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {TAILS.map((t) => (
              <option key={t.v} value={t.v}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-4">
        <PrimaryButton onClick={run}>Run one-sample t-test</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {res && (
        <ResultPanel
          res={res.r}
          conclusionText={conclusion(res.r, "the sample mean")}
          captureRef={cap}
          filename="one-sample-t-test"
          copyText={`One-sample t-test\nn=${res.s.n}, x̄=${fmt(res.s.mean)}, s=${fmt(res.s.sd)}\nμ₀=${mu0}, α=${alpha}, ${res.r.tail}-tailed\nt=${fmt(res.r.t)}, df=${res.r.df}, p=${fmtP(res.r.pValue)}, critical=±${fmt(res.r.critical)}\n${conclusion(res.r, "the sample mean")}`}
          steps={steps}
        />
      )}
    </>
  );
}

/* ============================================================
   Tool: Two-Sample Independent (Student / Welch)
   ============================================================ */

function TwoSampleTool() {
  const [rawA, setRawA] = useState("78, 82, 85, 88, 90");
  const [rawB, setRawB] = useState("72, 75, 78, 80, 82");
  const [sumA, setSumA] = useState({ mean: "", sd: "", n: "" });
  const [sumB, setSumB] = useState({ mean: "", sd: "", n: "" });
  const [useSumA, setUseSumA] = useState(false);
  const [useSumB, setUseSumB] = useState(false);
  const [alpha, setAlpha] = useState("0.05");
  const [tail, setTail] = useState<Tail>("two");
  const [equalVar, setEqualVar] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<null | {
    r: TTestResult;
    a: SampleStats;
    b: SampleStats;
  }>(null);
  const cap = useRef<HTMLDivElement>(null);

  function run() {
    setErr(null);
    setRes(null);
    const A = resolveSample(rawA, sumA, useSumA);
    if ("error" in A) return setErr("Sample A: " + A.error);
    const B = resolveSample(rawB, sumB, useSumB);
    if ("error" in B) return setErr("Sample B: " + B.error);
    const a = Number(alpha);
    if (!(a > 0 && a < 1))
      return setErr("Significance level α must be between 0 and 1.");
    const r = twoSampleTTest(A.stats, B.stats, a, tail, equalVar);
    setRes({ r, a: A.stats, b: B.stats });
  }

  const steps: Step[] = useMemo(() => {
    if (!res) return [];
    const { r, a, b } = res;
    const out: Step[] = [
      {
        title: "Given",
        body: (
          <FormulaBlock>
            Sample A: n₁ = {a.n}, x̄₁ = {fmt(a.mean)}, s₁ = {fmt(a.sd)}, s₁² ={" "}
            {fmt(a.variance)}
            <br />
            Sample B: n₂ = {b.n}, x̄₂ = {fmt(b.mean)}, s₂ = {fmt(b.sd)}, s₂² ={" "}
            {fmt(b.variance)}
          </FormulaBlock>
        ),
      },
    ];
    if (equalVar) {
      const sp2 = r.extras?.pooledVar ?? 0;
      out.push({
        title: "Formula — pooled variance",
        body: (
          <FormulaBlock>
            sₚ² = ((n₁−1)·s₁² + (n₂−1)·s₂²) / (n₁+n₂−2)
            <br />= (({a.n - 1})·{fmt(a.variance)} + ({b.n - 1})·
            {fmt(b.variance)}) / {a.n + b.n - 2} = {fmt(sp2)}
          </FormulaBlock>
        ),
      });
      out.push({
        title: "Substitute — SE & t",
        body: (
          <FormulaBlock>
            SE = √(sₚ²·(1/n₁ + 1/n₂)) = {fmt(r.se)}
            <br />t = (x̄₁ − x̄₂) / SE = ({fmt(a.mean)} − {fmt(b.mean)}) /{" "}
            {fmt(r.se)} = {fmt(r.t)}
          </FormulaBlock>
        ),
      });
      out.push({
        title: "Answer",
        body: (
          <FormulaBlock>
            df = n₁ + n₂ − 2 = {r.df}
            <br />
            p-value ({r.tail}-tailed) = {fmtP(r.pValue)}
            <br />
            Critical value at α = {r.alpha}: ±{fmt(r.critical)}
          </FormulaBlock>
        ),
      });
    } else {
      const vA = r.extras?.vA ?? 0;
      const vB = r.extras?.vB ?? 0;
      out.push({
        title: "Formula — Welch SE",
        body: (
          <FormulaBlock>
            s₁²/n₁ = {fmt(a.variance)}/{a.n} = {fmt(vA)}
            <br />
            s₂²/n₂ = {fmt(b.variance)}/{b.n} = {fmt(vB)}
            <br />
            SE = √(s₁²/n₁ + s₂²/n₂) = √({fmt(vA + vB)}) = {fmt(r.se)}
          </FormulaBlock>
        ),
      });
      out.push({
        title: "Substitute — t",
        body: (
          <FormulaBlock>
            t = (x̄₁ − x̄₂) / SE = ({fmt(a.mean)} − {fmt(b.mean)}) /{" "}
            {fmt(r.se)} = {fmt(r.t)}
          </FormulaBlock>
        ),
      });
      out.push({
        title: "Substitute — Welch df",
        body: (
          <FormulaBlock>
            df = (s₁²/n₁ + s₂²/n₂)² / [ (s₁²/n₁)²/(n₁−1) + (s₂²/n₂)²/(n₂−1) ]
            <br />= {fmt(r.extras?.welchNum ?? 0)} /{" "}
            {fmt(r.extras?.welchDen ?? 0)} = {fmt(r.df, 3)}
          </FormulaBlock>
        ),
      });
      out.push({
        title: "Answer",
        body: (
          <FormulaBlock>
            p-value ({r.tail}-tailed) = {fmtP(r.pValue)}
            <br />
            Critical value at α = {r.alpha}: ±{fmt(r.critical)}
          </FormulaBlock>
        ),
      });
    }
    return out;
  }, [res, equalVar]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <SampleInput
          label="Sample A"
          raw={rawA}
          setRaw={setRawA}
          summary={sumA}
          setSummary={setSumA}
          useSummary={useSumA}
          setUseSummary={setUseSumA}
        />
        <SampleInput
          label="Sample B"
          raw={rawB}
          setRaw={setRawB}
          summary={sumB}
          setSummary={setSumB}
          useSummary={useSumB}
          setUseSummary={setUseSumB}
        />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Significance level (α)">
          <TextInput
            value={alpha}
            onChange={(e) => setAlpha(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Alternative hypothesis">
          <select
            value={tail}
            onChange={(e) => setTail(e.target.value as Tail)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {TAILS.map((t) => (
              <option key={t.v} value={t.v}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Variance assumption">
          <select
            value={equalVar ? "eq" : "welch"}
            onChange={(e) => setEqualVar(e.target.value === "eq")}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="welch">Unequal (Welch's t-test) — default</option>
            <option value="eq">Equal (Student's pooled t-test)</option>
          </select>
        </Field>
      </div>
      <div className="mt-4">
        <PrimaryButton onClick={run}>Run two-sample t-test</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {res && (
        <ResultPanel
          res={res.r}
          conclusionText={conclusion(res.r, "the difference of means (A − B)")}
          captureRef={cap}
          filename="two-sample-t-test"
          copyText={`Two-sample ${equalVar ? "Student's" : "Welch's"} t-test\nA: n=${res.a.n}, x̄=${fmt(res.a.mean)}, s=${fmt(res.a.sd)}\nB: n=${res.b.n}, x̄=${fmt(res.b.mean)}, s=${fmt(res.b.sd)}\nα=${alpha}, ${res.r.tail}-tailed\nt=${fmt(res.r.t)}, df=${fmt(res.r.df, 3)}, p=${fmtP(res.r.pValue)}, critical=±${fmt(res.r.critical)}\n${conclusion(res.r, "the difference of means (A − B)")}`}
          steps={steps}
        />
      )}
    </>
  );
}

/* ============================================================
   Tool: Paired
   ============================================================ */

function PairedTool() {
  const [rawA, setRawA] = useState("120, 132, 128, 145, 138, 141, 129, 136");
  const [rawB, setRawB] = useState("115, 130, 122, 140, 133, 138, 125, 130");
  const [alpha, setAlpha] = useState("0.05");
  const [tail, setTail] = useState<Tail>("two");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<null | {
    r: TTestResult;
    a: number[];
    b: number[];
    diffs: number[];
  }>(null);
  const cap = useRef<HTMLDivElement>(null);

  function run() {
    setErr(null);
    setRes(null);
    const A = parseDataset(rawA).values;
    const B = parseDataset(rawB).values;
    const a = Number(alpha);
    if (!(a > 0 && a < 1))
      return setErr("Significance level α must be between 0 and 1.");
    const r = pairedTTest(A, B, a, tail);
    if ("error" in r) return setErr(r.error);
    setRes({
      r,
      a: A,
      b: B,
      diffs: A.map((v, i) => v - B[i]),
    });
  }

  const steps: Step[] = useMemo(() => {
    if (!res) return [];
    const { r, diffs } = res;
    const s = summarize(diffs);
    return [
      {
        title: "Given — differences",
        body: (
          <FormulaBlock>
            [{diffs.map((d) => fmt(d)).join(", ")}]
          </FormulaBlock>
        ),
      },
      {
        title: "Summary of differences",
        body: (
          <FormulaBlock>
            n = {s.n}, d̄ = {fmt(s.mean)}, s_d = {fmt(s.sd)}
          </FormulaBlock>
        ),
      },
      {
        title: "Formula & Substitute — SE and t",
        body: (
          <FormulaBlock>
            SE = s_d / √n = {fmt(s.sd)} / √{s.n} = {fmt(r.se)}
            <br />t = d̄ / SE = {fmt(s.mean)} / {fmt(r.se)} = {fmt(r.t)}
          </FormulaBlock>
        ),
      },
      {
        title: "Answer",
        body: (
          <FormulaBlock>
            df = n − 1 = {r.df}
            <br />
            p-value ({r.tail}-tailed) = {fmtP(r.pValue)}
            <br />
            Critical value at α = {r.alpha}: ±{fmt(r.critical)}
          </FormulaBlock>
        ),
      },
    ];
  }, [res]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sample 1 (before / group 1)">
          <textarea
            value={rawA}
            onChange={(e) => setRawA(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
        <Field label="Sample 2 (after / group 2)">
          <textarea
            value={rawB}
            onChange={(e) => setRawB(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Both lists must be the same length — each value in Sample 1 is paired
        with the value in the same position in Sample 2.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Significance level (α)">
          <TextInput
            value={alpha}
            onChange={(e) => setAlpha(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Alternative hypothesis">
          <select
            value={tail}
            onChange={(e) => setTail(e.target.value as Tail)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {TAILS.map((t) => (
              <option key={t.v} value={t.v}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-4">
        <PrimaryButton onClick={run}>Run paired t-test</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {res && (
        <ResultPanel
          res={res.r}
          conclusionText={conclusion(res.r, "the mean paired difference")}
          captureRef={cap}
          filename="paired-t-test"
          copyText={`Paired t-test\nn=${res.a.length}, d̄=${fmt(res.r.meanDiff ?? 0)}\nα=${alpha}, ${res.r.tail}-tailed\nt=${fmt(res.r.t)}, df=${res.r.df}, p=${fmtP(res.r.pValue)}, critical=±${fmt(res.r.critical)}\n${conclusion(res.r, "the mean paired difference")}`}
          steps={steps}
        />
      )}
    </>
  );
}

/* ============================================================
   Educational content
   ============================================================ */

const TT_GUIDE: GuideCardItem[] = [
  {
    key: "one",
    title: "1. One-sample t-test — mean vs a reference",
    explain:
      "Use this when you have one sample and want to test whether its mean differs from a specific reference value μ₀. The calculator estimates the standard error from the sample SD and divides the observed gap by it.",
    formula: <>t = (x̄ − μ₀) / (s / √n) &nbsp; df = n − 1</>,
    legend: [
      { sym: "x̄", def: "sample mean" },
      { sym: "s", def: "sample SD" },
      { sym: "n", def: "sample size" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 100" className="w-full max-w-[220px]" aria-hidden>
          <line x1="20" y1="70" x2="200" y2="70" className="stroke-border" />
          <line x1="80" y1="30" x2="80" y2="80" strokeDasharray="3 3" className="stroke-muted-foreground" />
          <text x="80" y="24" fontSize="9" textAnchor="middle" className="fill-muted-foreground">μ₀</text>
          <circle cx="130" cy="70" r="4" className="fill-primary" />
          <text x="130" y="60" fontSize="9" textAnchor="middle" className="fill-primary">x̄</text>
          <line x1="80" y1="88" x2="130" y2="88" className="stroke-primary" />
          <text x="105" y="98" fontSize="9" textAnchor="middle" className="fill-primary">gap ÷ SE = t</text>
        </svg>
      </div>
    ),
    example: {
      given: "x̄ = 52, s = 6, n = 25, μ₀ = 50",
      substitute: "t = (52 − 50) / (6/√25) = 2 / 1.2",
      answer: "t ≈ 1.67, df = 24",
    },
  },
  {
    key: "two",
    title: "2. Two-sample — Welch's (default) vs Student's pooled",
    explain:
      "Two independent groups: is one mean bigger than the other? Welch's does not assume equal variances and is the safer default. Student's pools the two SDs into one and needs the equal-variance assumption to hold.",
    formula: (
      <>
        Welch: t = (x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂){"\n"}
        Pooled: t = (x̄₁ − x̄₂) / √(sₚ² · (1/n₁ + 1/n₂))
      </>
    ),
    legend: [
      { sym: "sₚ²", def: "pooled variance" },
      { sym: "df", def: "Welch–Satterthwaite (fractional) or n₁+n₂−2" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 110" className="w-full max-w-[220px]" aria-hidden>
          <line x1="20" y1="90" x2="200" y2="90" className="stroke-border" />
          <path d="M30 90 Q 70 20 110 90" className="fill-none stroke-primary" />
          <path d="M110 90 Q 155 40 200 90" className="fill-none stroke-primary" strokeDasharray="3 3" />
          <text x="70" y="30" fontSize="9" textAnchor="middle" className="fill-primary">group 1</text>
          <text x="160" y="45" fontSize="9" textAnchor="middle" className="fill-primary">group 2</text>
          <text x="115" y="105" fontSize="9" textAnchor="middle" className="fill-muted-foreground">difference of means / SE</text>
        </svg>
      </div>
    ),
    example: {
      given: "x̄₁=84.6, s₁=4.77, n₁=5 · x̄₂=77.4, s₂=3.97, n₂=5",
      substitute: "SE = √(22.8/5 + 15.8/5) = √7.72",
      answer: "t ≈ 2.59, df ≈ 7.75",
    },
  },
  {
    key: "paired",
    title: "3. Paired t-test — matched pairs",
    explain:
      "For before/after on the same subjects, twin studies or any matched design, compute the per-pair difference d = x₁ − x₂ and run a one-sample test on those differences against 0. Removing between-subject noise gives extra power.",
    formula: <>t = d̄ / (s_d / √n) &nbsp; df = n − 1</>,
    legend: [
      { sym: "d̄", def: "mean of the pairwise differences" },
      { sym: "s_d", def: "SD of the differences" },
      { sym: "n", def: "number of pairs" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 110" className="w-full max-w-[220px]" aria-hidden>
          {[15, 45, 75, 105, 135, 165].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy="35" r="4" className="fill-primary" />
              <circle cx={x} cy="80" r="4" className="fill-primary/60" />
              <line x1={x} y1="39" x2={x} y2="76" className="stroke-primary" strokeDasharray="2 2" />
            </g>
          ))}
          <text x="190" y="38" fontSize="9" className="fill-primary">before</text>
          <text x="190" y="83" fontSize="9" className="fill-primary/70">after</text>
          <text x="90" y="105" fontSize="9" textAnchor="middle" className="fill-muted-foreground">test mean of Δ against 0</text>
        </svg>
      </div>
    ),
    example: {
      given: "5 pairs, d̄ = 3.2, s_d = 1.8",
      substitute: "t = 3.2 / (1.8/√5) = 3.2 / 0.805",
      answer: "t ≈ 3.98, df = 4",
    },
  },
  {
    key: "pval",
    title: "4. From t to p-value and decision",
    explain:
      "The p-value comes from the Student t-distribution with the reported df. Compare p to α (usually 0.05): p ≤ α rejects the null. A large p only means the current sample lacks evidence — it never proves the null.",
    formula: <>p = 2·(1 − F_t(|t|, df)) for two-tailed · reject if p ≤ α</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M10 95 Q 120 5 230 95" className="fill-none stroke-primary" strokeWidth="1.5" />
          <path d="M10 95 L 40 95 Q 55 75 60 95 Z" className="fill-destructive/30 stroke-destructive" />
          <path d="M230 95 L 200 95 Q 185 75 180 95 Z" className="fill-destructive/30 stroke-destructive" />
          <line x1="120" y1="20" x2="120" y2="95" strokeDasharray="3 3" className="stroke-muted-foreground" />
          <text x="35" y="108" fontSize="9" textAnchor="middle" className="fill-destructive">α/2</text>
          <text x="205" y="108" fontSize="9" textAnchor="middle" className="fill-destructive">α/2</text>
          <text x="120" y="15" fontSize="9" textAnchor="middle" className="fill-muted-foreground">0</text>
        </svg>
      </div>
    ),
    example: {
      given: "t ≈ 2.59, df ≈ 7.75, α = 0.05",
      substitute: "two-tailed p from t CDF",
      answer: "p ≈ 0.033 → reject H₀",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="T-test explained, step by step">
        <p>
          A t-test asks whether an observed difference in means is bigger than
          random sampling would produce. Each card below covers one variant this
          calculator runs and shows the formula that drives it.
        </p>
        <GuideCards items={TT_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Three tests on one page — one-sample, two-sample independent, and paired — with the same clean output structure.",
            "Accept either raw data (paste from a spreadsheet — supports commas, spaces, tabs, semicolons and mixed line endings) or already-computed summary statistics (mean, SD, n).",
            "Welch's t-test is the default for two-sample tests, with an explicit toggle for Student's pooled (equal-variance) t-test when you need it.",
            "Exact p-values from the Student t-distribution CDF via the regularised incomplete beta function — no crude table lookups.",
            "Shaded t-distribution diagram showing the rejection region and where your observed t falls.",
            "Full step-by-step working — pooled or Welch–Satterthwaite degrees of freedom, standard error, t and p — visible with one click.",
            "Copy the result panel as text or download it as a PNG.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            {
              q: "One-tailed or two-tailed — which should I choose?",
              a: "Two-tailed by default. Use one-tailed only when you have a genuine directional hypothesis specified before collecting the data (for example, 'the new drug can only help, not hurt'). Switching to one-tailed after seeing the data inflates the false-positive rate.",
            },
            {
              q: "What sample size do I need?",
              a: "There is no universal minimum. With well-behaved (roughly normal) data, n ≥ 10 per group already works reasonably. For small samples the results are more sensitive to non-normality, so consider checking the data visually first — or use a non-parametric alternative.",
            },
            {
              q: "Can I use the t-test if my data are not exactly normal?",
              a: "The t-test is fairly robust to mild non-normality, especially when both groups have similar sample sizes and the samples are not tiny. It is less robust with small, heavily skewed samples — where a permutation test or a Mann–Whitney U test is safer.",
            },
            {
              q: "What does 'degrees of freedom' really mean?",
              a: "Loosely, df is the number of independent pieces of information you have left after estimating the parameters you need for the test. For one sample of size n we estimate the mean, leaving n − 1 free deviations. Welch's t-test uses a fractional df because it combines two variance estimates rather than pooling them.",
            },
            {
              q: "Should I report effect size along with the t-test?",
              a: "Yes — a p-value tells you whether an effect is detectable, not how big it is. Cohen's d is the standard companion effect size for a two-sample t-test: (x̄₁ − x̄₂) divided by the pooled standard deviation.",
            },
          ]}
        />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/confidence-interval-calculator", label: "Confidence Interval Calculator" },
            { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
            { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
            { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
          ]}
        />
        <p className="text-sm">
          Not sure which test you need?{" "}
          <Link to="/calculators/math" className="text-primary hover:underline">
            Browse all math calculators
          </Link>{" "}
          to find a related tool.
        </p>
      </CalcSection>
    </>
  );
}

