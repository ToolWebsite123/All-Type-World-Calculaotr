import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  FormulaBlock,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import { parseDataset } from "@/lib/math/parse-numbers";
import { fmt } from "@/lib/math/p-value";

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

const FAQS = [
  {
    q: "What is Cohen's d?",
    a: "Cohen's d is a standardized measure of the difference between two group means, expressed in pooled standard-deviation units. It answers 'how many standard deviations apart are these means?' independently of the raw scale of the data.",
  },
  {
    q: "How do I interpret d?",
    a: "Cohen's rough guide: |d| ≈ 0.2 is small, 0.5 medium, 0.8 large, and 1.2+ very large. But context matters — in some fields a d of 0.1 is meaningful, in others 0.8 is expected. Always report the confidence interval and the effect size, not just p.",
  },
  {
    q: "What's the difference between Cohen's d and Hedges' g?",
    a: "Cohen's d is slightly biased upward in small samples. Hedges' g applies a small-sample correction factor J = 1 − 3/(4(n₁+n₂) − 9). For n₁ + n₂ ≥ 50 the two are numerically almost identical.",
  },
  {
    q: "When should I use Glass's Δ instead?",
    a: "When the two groups have very different variances (for example an intervention that changes spread as well as mean), Glass's Δ divides by the control group's SD alone instead of the pooled SD. That keeps the metric anchored to the untreated variability.",
  },
  {
    q: "Do I need equal group sizes?",
    a: "No. The pooled-SD formula weights each group's variance by its degrees of freedom, so unequal n₁ and n₂ are handled automatically.",
  },
];

export const Route = createFileRoute("/calculators/math/effect-size-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Cohen's d / Effect Size Calculator",
      title: "Cohen's d Effect Size Calculator",
      metaDescription:
        "Compute Cohen's d, Hedges' g and Glass's Δ from raw data or summary stats — with interpretation and step-by-step working.",
      canonicalUrl: "/calculators/math/effect-size-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Cohen's d / Effect Size Calculator", path: "/calculators/math/effect-size-calculator" },
      ],
      faqs: FAQS,
    }),
  component: EffectSizePage,
});

interface EffectSizeResult {
  m1: number;
  m2: number;
  s1: number;
  s2: number;
  n1: number;
  n2: number;
  sPooled: number;
  d: number;
  g: number;
  glassDelta: number;
  seD: number;
  ciLow: number;
  ciHigh: number;
}

function mean(xs: number[]) {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function sampleSD(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const ss = xs.reduce((s, x) => s + (x - m) * (x - m), 0);
  return Math.sqrt(ss / (xs.length - 1));
}

function cohensD(m1: number, m2: number, s1: number, s2: number, n1: number, n2: number): EffectSizeResult {
  const df = n1 + n2 - 2;
  const sPooled = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / Math.max(df, 1));
  const d = sPooled > 0 ? (m1 - m2) / sPooled : 0;
  // Hedges' correction (approximation)
  const J = 1 - 3 / (4 * (n1 + n2) - 9);
  const g = d * J;
  const glassDelta = s2 > 0 ? (m1 - m2) / s2 : 0;
  // SE(d) — Hedges & Olkin
  const seD = Math.sqrt((n1 + n2) / (n1 * n2) + (d * d) / (2 * (n1 + n2)));
  const ciLow = d - 1.96 * seD;
  const ciHigh = d + 1.96 * seD;
  return { m1, m2, s1, s2, n1, n2, sPooled, d, g, glassDelta, seD, ciLow, ciHigh };
}

function interpret(d: number): { label: string; tone: "muted" | "primary" } {
  const a = Math.abs(d);
  if (a < 0.2) return { label: "Negligible effect", tone: "muted" };
  if (a < 0.5) return { label: "Small effect", tone: "muted" };
  if (a < 0.8) return { label: "Medium effect", tone: "primary" };
  if (a < 1.2) return { label: "Large effect", tone: "primary" };
  return { label: "Very large effect", tone: "primary" };
}

function EffectSizePage() {
  const [mode, setMode] = useState<"raw" | "summary">("raw");

  // Raw mode
  const [g1, setG1] = useState("22, 25, 24, 28, 26, 30, 27, 24");
  const [g2, setG2] = useState("18, 20, 19, 21, 22, 19, 20, 23");

  // Summary mode
  const [m1, setM1] = useState("25.75");
  const [m2, setM2] = useState("20.25");
  const [s1, setS1] = useState("2.55");
  const [s2, setS2] = useState("1.67");
  const [n1, setN1] = useState("8");
  const [n2, setN2] = useState("8");

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EffectSizeResult | null>(null);

  const onCompute = () => {
    setError(null);
    setResult(null);
    if (mode === "raw") {
      const a = parseDataset(g1);
      const b = parseDataset(g2);
      if (!a.values || a.values.length < 2 || !b.values || b.values.length < 2) {
        setError("Each group needs at least 2 numeric values.");
        return;
      }
      const res = cohensD(mean(a.values), mean(b.values), sampleSD(a.values), sampleSD(b.values), a.values.length, b.values.length);
      setResult(res);
    } else {
      const p = [m1, m2, s1, s2, n1, n2].map(Number);
      if (p.some((v) => !Number.isFinite(v))) {
        setError("All summary inputs must be numbers.");
        return;
      }
      const [M1, M2, S1, S2, N1, N2] = p;
      if (S1 <= 0 || S2 <= 0) {
        setError("Standard deviations must be positive.");
        return;
      }
      if (N1 < 2 || N2 < 2) {
        setError("Each sample size must be at least 2.");
        return;
      }
      setResult(cohensD(M1, M2, S1, S2, Math.round(N1), Math.round(N2)));
    }
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { m1: M1, m2: M2, s1: S1, s2: S2, n1: N1, n2: N2, sPooled, d, g, glassDelta, seD, ciLow, ciHigh } = result;
    const df = N1 + N2 - 2;
    return [
      {
        title: "Given — group summaries",
        body: (
          <>
            <MathNote>Two independent groups, each summarized by mean, standard deviation and sample size</MathNote>
            <MathLine>Group 1: m₁ = {fmt(M1)}, s₁ = {fmt(S1)}, n₁ = {N1}</MathLine>
            <MathLine>Group 2: m₂ = {fmt(M2)}, s₂ = {fmt(S2)}, n₂ = {N2}</MathLine>
          </>
        ),
      },
      {
        title: "Pooled standard deviation",
        body: (
          <>
            <MathNote>Weight each group's variance by its degrees of freedom, then combine</MathNote>
            <MathLine>sₚ = √[((n₁−1)·s₁² + (n₂−1)·s₂²) / (n₁ + n₂ − 2)]</MathLine>
            <MathLine>sₚ = √[({N1 - 1}·{fmt(S1 * S1)} + {N2 - 1}·{fmt(S2 * S2)}) / {df}]</MathLine>
            <MathLine>sₚ = {fmt(sPooled)}</MathLine>
          </>
        ),
      },
      {
        title: "Cohen's d",
        body: (
          <>
            <MathNote>Divide the mean difference by the pooled SD</MathNote>
            <MathLine>d = (m₁ − m₂) / sₚ</MathLine>
            <MathLine>d = ({fmt(M1)} − {fmt(M2)}) / {fmt(sPooled)}</MathLine>
            <MathLine>d = {fmt(d)}</MathLine>
          </>
        ),
      },
      {
        title: "Hedges' g — small-sample correction",
        body: (
          <>
            <MathNote>Cohen's d is slightly biased upward for small n; multiply by correction factor J</MathNote>
            <MathLine>J = 1 − 3 / (4(n₁ + n₂) − 9)</MathLine>
            <MathLine>J = 1 − 3 / (4·{N1 + N2} − 9) = {fmt(1 - 3 / (4 * (N1 + N2) - 9))}</MathLine>
            <MathLine>g = d · J = {fmt(d)} · {fmt(1 - 3 / (4 * (N1 + N2) - 9))} = {fmt(g)}</MathLine>
          </>
        ),
      },
      {
        title: "Glass's Δ — using control-group SD alone",
        body: (
          <>
            <MathNote>When variances differ across groups, divide by the control group's SD (s₂) instead of the pooled SD</MathNote>
            <MathLine>Δ = (m₁ − m₂) / s₂</MathLine>
            <MathLine>Δ = ({fmt(M1)} − {fmt(M2)}) / {fmt(S2)}</MathLine>
            <MathLine>Δ = {fmt(glassDelta)}</MathLine>
          </>
        ),
      },
      {
        title: "Standard error and 95% confidence interval",
        body: (
          <>
            <MathNote>Hedges & Olkin's approximate SE for d, used to build a 95% CI</MathNote>
            <MathLine>SE(d) = √[(n₁+n₂)/(n₁·n₂) + d²/(2(n₁+n₂))]</MathLine>
            <MathLine>SE(d) = {fmt(seD)}</MathLine>
            <MathLine>95% CI = d ± 1.96·SE(d) = [{fmt(ciLow)}, {fmt(ciHigh)}]</MathLine>
          </>
        ),
      },
      {
        title: "Interpretation thresholds",
        body: (
          <>
            <MathNote>Compare |d| against Cohen's conventional benchmarks</MathNote>
            <MathLine>|d| &lt; 0.2 → negligible</MathLine>
            <MathLine>0.2 ≤ |d| &lt; 0.5 → small</MathLine>
            <MathLine>0.5 ≤ |d| &lt; 0.8 → medium</MathLine>
            <MathLine>0.8 ≤ |d| &lt; 1.2 → large</MathLine>
            <MathLine>|d| ≥ 1.2 → very large</MathLine>
            <MathLine>|d| = {fmt(Math.abs(d))} → {interpret(d).label}</MathLine>
          </>
        ),
      },
    ];
  }, [result]);

  const verdict = result ? interpret(result.d) : null;

  return (
    <MathCalcPage
      name="Cohen's d / Effect Size Calculator"
      tagline="Standardized effect size between two groups. Get Cohen's d, Hedges' g and Glass's Δ from raw data or summary statistics."
      extras={
        <>
          <CalcSection title="What is an effect size?">
            <p>
              A p-value only tells you whether a difference is likely due to chance. An <strong>effect size</strong>{" "}
              tells you how <em>big</em> the difference is — and it's what you compare across studies, contexts and
              measurement scales. Cohen's d is the standard effect size for comparing two means.
            </p>
            <FormulaBlock>
              d = (m₁ − m₂) / sₚ,   sₚ = √[((n₁ − 1)s₁² + (n₂ − 1)s₂²) / (n₁ + n₂ − 2)]
            </FormulaBlock>
            <p>
              Interpret d against Cohen's benchmarks (0.2 small, 0.5 medium, 0.8 large) but always in context —
              in a highly-controlled lab study d = 0.3 can be big; in a noisy field study it may be trivial.
            </p>
          </CalcSection>

          <CalcSection title="Features of this calculator"><FeatureList items={[
              "Two input modes — raw values or summary stats (means, SDs, sample sizes)",
              "Cohen's d, Hedges' g (small-sample corrected) and Glass's Δ side by side",
              "Approximate 95% confidence interval for d",
              "Plain-language interpretation (negligible → very large)",
              "Full step-by-step working (Given → Formula → Substitute → Answer)",
              "Handles unequal group sizes automatically",
            ]} /></CalcSection>

          <CalcFAQ items={FAQS} />
          <CalcSection title="Related statistics calculators"><RelatedLinks links={[
              { label: "T-Test Calculator", to: "/calculators/math/t-test-calculator" },
              { label: "P-Value Calculator", to: "/calculators/math/p-value-calculator" },
              { label: "Confidence Interval", to: "/calculators/math/confidence-interval-calculator" },
              { label: "Sample Size Calculator", to: "/calculators/math/sample-size-calculator" },
              { label: "Kruskal-Wallis Test", to: "/calculators/math/kruskal-wallis-calculator" },
            ]} /></CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="inline-flex rounded-full border border-border bg-secondary/40 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("raw")}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${mode === "raw" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Raw data
          </button>
          <button
            type="button"
            onClick={() => setMode("summary")}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${mode === "summary" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Summary stats
          </button>
        </div>

        {mode === "raw" ? (
          <>
            <Field label="Group 1">
              <input
                value={g1}
                onChange={(e) => setG1(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
            <Field label="Group 2">
              <input
                value={g2}
                onChange={(e) => setG2(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Mean 1"><NumInput v={m1} set={setM1} /></Field>
            <Field label="SD 1"><NumInput v={s1} set={setS1} /></Field>
            <Field label="n₁"><NumInput v={n1} set={setN1} /></Field>
            <Field label="Mean 2"><NumInput v={m2} set={setM2} /></Field>
            <Field label="SD 2"><NumInput v={s2} set={setS2} /></Field>
            <Field label="n₂"><NumInput v={n2} set={setN2} /></Field>
          </div>
        )}

        <PrimaryButton onClick={onCompute}>Compute effect size</PrimaryButton>
        {error && <ErrorBox message={error} />}

        {result && verdict && (
          <div className="mt-4 space-y-4 rounded-2xl border border-border bg-secondary/20 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Cohen's d" value={fmt(result.d)} />
              <Stat label="Hedges' g" value={fmt(result.g)} />
              <Stat label="Glass's Δ" value={fmt(result.glassDelta)} />
              <Stat label="Pooled SD" value={fmt(result.sPooled)} />
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-3 text-sm">
              <div className="text-muted-foreground">
                Mean difference: <span className="font-serif italic text-foreground">{fmt(result.m1 - result.m2)}</span>{" "}
                — 95% CI for d: <span className="font-serif italic text-foreground">[{fmt(result.ciLow)}, {fmt(result.ciHigh)}]</span>
              </div>
            </div>
            <div
              className={`rounded-xl border p-3 text-sm ${
                verdict.tone === "primary"
                  ? "border-primary/40 bg-primary/[0.08] text-primary"
                  : "border-border bg-background/40 text-muted-foreground"
              }`}
            >
              {verdict.label} — |d| = {fmt(Math.abs(result.d))} on the Cohen scale
              (0.2 small · 0.5 medium · 0.8 large · 1.2+ very large).
            </div>
            <StepsToggle steps={steps} />
          </div>
        )}
      </div>
    </MathCalcPage>
  );
}

function NumInput({ v, set }: { v: string; set: (v: string) => void }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={v}
      onChange={(e) => set(e.target.value)}
      className="h-10 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif italic text-lg tabular-nums text-foreground">{value}</div>
    </div>
  );
}
