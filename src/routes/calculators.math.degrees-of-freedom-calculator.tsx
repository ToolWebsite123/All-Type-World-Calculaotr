import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
  ErrorBox,
  ResultBox,
  CalcSection,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  type GuideCardItem,
  FormulaBlock,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import type { ReactNode } from "react";
import { tPDF } from "@/lib/math/t-test";
import { fmt } from "@/lib/math/confidence-interval";

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

export const Route = createFileRoute("/calculators/math/degrees-of-freedom-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Degrees of Freedom Calculator",
      title:
        "Degrees of Freedom Calculator",
      metaDescription:
        "Compute degrees of freedom for one-sample, two-sample (pooled & Welch), paired, chi-square, ANOVA, and regression tests.",
      canonicalUrl: "/calculators/math/degrees-of-freedom-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Degrees of Freedom Calculator",
          path: "/calculators/math/degrees-of-freedom-calculator",
        },
      ],
      faqs: [
        {
          q: "Why is df usually n − 1 instead of n?",
          a: "Because sample-based formulas estimate the population mean from the same data, one 'degree' of the variation is used up satisfying x̄ = mean(sample). Only n − 1 of the deviations from the mean are free to vary; the last one is fixed by the constraint. That's Bessel's correction.",
        },
        {
          q: "Which df do I use for a two-sample t-test?",
          a: "It depends on the version. The pooled (equal-variance) Student's t-test uses df = n₁ + n₂ − 2. Welch's t-test (unequal variances) uses the Welch-Satterthwaite approximation, which is almost always non-integer and usually a bit smaller than the pooled df.",
        },
        {
          q: "Do I round Welch's df to an integer?",
          a: "No — modern software passes the non-integer df straight into the t-distribution. Rounding down is a conservative fallback if your software or reference table only accepts integers.",
        },
        {
          q: "Is df the same for chi-square goodness of fit and independence?",
          a: "No. Goodness of fit uses df = k − 1 where k is the number of categories. A chi-square test of independence on an r × c contingency table uses df = (r − 1)(c − 1).",
        },
        {
          q: "What is df for a simple linear regression?",
          a: "df for the residuals is n − 2, because two parameters (the slope and the intercept) are estimated from the data. For multiple regression with p predictors plus an intercept it becomes n − p − 1.",
        },
        {
          q: "Why does df affect the p-value?",
          a: "The t, chi-square and F distributions are entire families indexed by df. Smaller df means heavier tails, so the same test statistic produces a larger p-value (and a larger critical value) than it would with more data.",
        },
      ],
    }),
  component: DegreesOfFreedomPage,
});

/* ================================================================
   Test types
   ================================================================ */
type TestKey =
  | "one-sample-t"
  | "pooled-t"
  | "welch-t"
  | "paired-t"
  | "chi-gof"
  | "chi-indep"
  | "anova"
  | "linear-regression";

const TESTS: { key: TestKey; label: string; formula: string }[] = [
  { key: "one-sample-t", label: "One-sample t-test", formula: "df = n − 1" },
  {
    key: "pooled-t",
    label: "Two-sample t-test (equal variance / pooled)",
    formula: "df = n₁ + n₂ − 2",
  },
  {
    key: "welch-t",
    label: "Two-sample t-test (Welch's, unequal variance)",
    formula: "Welch-Satterthwaite (see below)",
  },
  { key: "paired-t", label: "Paired t-test", formula: "df = n_pairs − 1" },
  {
    key: "chi-gof",
    label: "Chi-square goodness of fit",
    formula: "df = categories − 1",
  },
  {
    key: "chi-indep",
    label: "Chi-square test of independence",
    formula: "df = (rows − 1)(cols − 1)",
  },
  {
    key: "anova",
    label: "One-way ANOVA",
    formula: "df_between = k − 1, df_within = N − k",
  },
  {
    key: "linear-regression",
    label: "Simple linear regression (residual df)",
    formula: "df = n − 2",
  },
];

/* ================================================================
   t-distribution diagram (illustrates how df shapes the curve)
   ================================================================ */
function TDistDiagram({ df }: { df: number }) {
  const W = 560;
  const H = 200;
  const pad = 30;
  const xMin = -4;
  const xMax = 4;
  const N = 320;

  // clamp df for drawing so extremely huge df still renders (approaches normal)
  const dfDraw = Math.min(Math.max(df, 1), 5000);

  const pts: [number, number][] = [];
  let maxY = 0;
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = tPDF(x, dfDraw);
    if (y > maxY) maxY = y;
    pts.push([x, y]);
  }
  const px = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
  const py = (y: number) => H - pad - (y / maxY) * (H - 2 * pad);
  const curve =
    "M " +
    pts.map(([x, y]) => `${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" L ");
  const axisY = py(0);
  const tick = (x: number, txt: string) => (
    <g key={txt}>
      <line
        x1={px(x)}
        x2={px(x)}
        y1={axisY}
        y2={axisY + 5}
        stroke="currentColor"
        strokeWidth="1"
        className="text-muted-foreground/60"
      />
      <text
        x={px(x)}
        y={axisY + 18}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px]"
      >
        {txt}
      </text>
    </g>
  );

  return (
    <figure className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-background/40 p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Student's t-distribution shape at df = ${fmt(df, 2)}`}
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
        <path d={curve} fill="currentColor" fillOpacity={0.14} />
        <path d={curve} fill="none" stroke="currentColor" strokeWidth="1.6" />
        {tick(-3, "-3")}
        {tick(-2, "-2")}
        {tick(-1, "-1")}
        {tick(0, "0")}
        {tick(1, "1")}
        {tick(2, "2")}
        {tick(3, "3")}
        <text
          x={px(0)}
          y={py(tPDF(0, dfDraw)) - 6}
          textAnchor="middle"
          className="fill-foreground text-[11px] font-medium"
        >
          df = {fmt(df, 2)}
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        Shape of the reference distribution at df = {fmt(df, 2)}. Smaller df ⇒
        heavier tails ⇒ larger p-values for the same test statistic.
      </figcaption>
    </figure>
  );
}

/* ================================================================
   Page
   ================================================================ */
function DegreesOfFreedomPage() {
  return (
    <MathCalcPage
      name="Degrees of Freedom Calculator"
      tagline="Compute df for the specific test you're running — one-sample, pooled and Welch's t-tests, paired t-test, chi-square goodness-of-fit and independence, one-way ANOVA and simple linear regression."
      extras={<Extras />}
    >
      <Tool />
    </MathCalcPage>
  );
}

/* ================================================================
   Single tool with a test-type selector
   ================================================================ */
interface ToolResult {
  df: number;
  dfLabel: string;
  extraLines: string[];
  steps: Step[];
  formulaText: string;
  showDiagram: boolean;
}

function Tool() {
  const [test, setTest] = useState<TestKey>("one-sample-t");

  // shared inputs — we simply read whichever ones the selected test needs
  const [n, setN] = useState("30");
  const [n1, setN1] = useState("15");
  const [n2, setN2] = useState("20");
  const [s1, setS1] = useState("10");
  const [s2, setS2] = useState("15");
  const [pairs, setPairs] = useState("25");
  const [k, setK] = useState("5");
  const [rows, setRows] = useState("3");
  const [cols, setCols] = useState("4");
  const [groups, setGroups] = useState("3");
  const [Ntot, setNtot] = useState("30");
  const [nReg, setNReg] = useState("50");

  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<ToolResult | null>(null);

  const intAtLeast = (v: string, min: number, name: string) => {
    const x = Number(v);
    if (!Number.isInteger(x) || x < min)
      throw new Error(`${name} must be an integer ≥ ${min}.`);
    return x;
  };
  const posFinite = (v: string, name: string) => {
    const x = Number(v);
    if (!Number.isFinite(x) || x < 0)
      throw new Error(`${name} must be a non-negative number.`);
    return x;
  };

  const run = () => {
    setErr(null);
    setRes(null);
    try {
      switch (test) {
case "one-sample-t": {
          const nv = intAtLeast(n, 2, "Sample size n");
          setRes({
            df: nv - 1,
            dfLabel: "df",
            extraLines: [`n = ${nv}`],
            formulaText: "df = n − 1",
            showDiagram: true,
            steps: [
              {
                title: "Formula",
                body: (
                  <>
                    <MathNote>One-sample t-test estimates the population mean from the sample, costing one degree of freedom.</MathNote>
                    <MathLine>df = n − 1</MathLine>
                  </>
                ),
              },
              {
                title: "Substitute",
                body: (
                  <>
                    <MathLine>df = {nv} − 1</MathLine>
                    <MathLine>df = <strong>{nv - 1}</strong></MathLine>
                  </>
                ),
              },
            ],
          });
          break;
        }
        case "pooled-t": {
          const a = intAtLeast(n1, 2, "n₁");
          const b = intAtLeast(n2, 2, "n₂");
          setRes({
            df: a + b - 2,
            dfLabel: "df",
            extraLines: [`n₁ = ${a}, n₂ = ${b}`],
            formulaText: "df = n₁ + n₂ − 2",
            showDiagram: true,
            steps: [
              {
                title: "Formula",
                body: (
                  <>
                    <MathNote>Pooled two-sample t-test estimates one mean per sample, costing two degrees of freedom in total.</MathNote>
                    <MathLine>df = n₁ + n₂ − 2</MathLine>
                  </>
                ),
              },
              {
                title: "Substitute",
                body: (
                  <>
                    <MathLine>df = {a} + {b} − 2</MathLine>
                    <MathLine>df = <strong>{a + b - 2}</strong></MathLine>
                  </>
                ),
              },
            ],
          });
          break;
        }
        case "welch-t": {
          const a = intAtLeast(n1, 2, "n₁");
          const b = intAtLeast(n2, 2, "n₂");
          const sa = posFinite(s1, "s₁");
          const sb = posFinite(s2, "s₂");
          const v1 = (sa * sa) / a;
          const v2 = (sb * sb) / b;
          const num = (v1 + v2) * (v1 + v2);
          const den = (v1 * v1) / (a - 1) + (v2 * v2) / (b - 1);
          if (!Number.isFinite(den) || den === 0)
            throw new Error("Denominator is zero — check inputs.");
          const df = num / den;
          setRes({
            df,
            dfLabel: "df (Welch)",
            extraLines: [
              `s₁²/n₁ = ${fmt(v1, 6)}, s₂²/n₂ = ${fmt(v2, 6)}`,
              `Numerator (s₁²/n₁ + s₂²/n₂)² = ${fmt(num, 6)}`,
              `Denominator = ${fmt(den, 6)}`,
            ],
            formulaText:
              "df = (s₁²/n₁ + s₂²/n₂)² / ( (s₁²/n₁)²/(n₁−1) + (s₂²/n₂)²/(n₂−1) )",
            showDiagram: true,
            steps: [
              {
                title: "Formula — Welch–Satterthwaite",
                body: (
                  <>
                    <MathNote>When variances aren't assumed equal, the Welch-Satterthwaite equation approximates a (usually non-integer) df.</MathNote>
                    <MathLine>df = (s₁²/n₁ + s₂²/n₂)² / ( (s₁²/n₁)²/(n₁−1) + (s₂²/n₂)²/(n₂−1) )</MathLine>
                  </>
                ),
              },
              {
                title: "Substitute — variance terms",
                body: (
                  <>
                    <MathLine>s₁²/n₁ = {fmt(sa, 4)}² / {a} = {fmt(v1, 6)}</MathLine>
                    <MathLine>s₂²/n₂ = {fmt(sb, 4)}² / {b} = {fmt(v2, 6)}</MathLine>
                  </>
                ),
              },
              {
                title: "Substitute — numerator",
                body: (
                  <>
                    <MathLine>({fmt(v1, 6)} + {fmt(v2, 6)})² = {fmt(v1 + v2, 6)}²</MathLine>
                    <MathLine>numerator = {fmt(num, 6)}</MathLine>
                  </>
                ),
              },
              {
                title: "Substitute — denominator",
                body: (
                  <>
                    <MathLine>({fmt(v1, 6)})² / ({a} − 1) + ({fmt(v2, 6)})² / ({b} − 1)</MathLine>
                    <MathLine>= {fmt((v1 * v1) / (a - 1), 6)} + {fmt((v2 * v2) / (b - 1), 6)}</MathLine>
                    <MathLine>denominator = {fmt(den, 6)}</MathLine>
                  </>
                ),
              },
              {
                title: "Answer",
                body: (
                  <>
                    <MathLine>df = {fmt(num, 6)} / {fmt(den, 6)}</MathLine>
                    <MathLine>df ≈ <strong>{fmt(df, 4)}</strong></MathLine>
                  </>
                ),
              },
            ],
          });
          break;
        }
        case "paired-t": {
          const p = intAtLeast(pairs, 2, "Number of pairs");
          setRes({
            df: p - 1,
            dfLabel: "df",
            extraLines: [`pairs = ${p}`],
            formulaText: "df = n_pairs − 1",
            showDiagram: true,
            steps: [
              {
                title: "Formula",
                body: (
                  <>
                    <MathNote>A paired t-test reduces each pair to one difference, so it behaves like a one-sample test on n_pairs differences.</MathNote>
                    <MathLine>df = n_pairs − 1</MathLine>
                  </>
                ),
              },
              {
                title: "Substitute",
                body: (
                  <>
                    <MathLine>df = {p} − 1</MathLine>
                    <MathLine>df = <strong>{p - 1}</strong></MathLine>
                  </>
                ),
              },
            ],
          });
          break;
        }
        case "chi-gof": {
          const kv = intAtLeast(k, 2, "Number of categories");
          setRes({
            df: kv - 1,
            dfLabel: "df",
            extraLines: [`categories = ${kv}`],
            formulaText: "df = categories − 1",
            showDiagram: false,
            steps: [
              {
                title: "Formula",
                body: (
                  <>
                    <MathNote>Goodness-of-fit compares observed counts across k categories against expected proportions.</MathNote>
                    <MathLine>df = k − 1</MathLine>
                  </>
                ),
              },
              {
                title: "Substitute",
                body: (
                  <>
                    <MathLine>df = {kv} − 1</MathLine>
                    <MathLine>df = <strong>{kv - 1}</strong></MathLine>
                  </>
                ),
              },
            ],
          });
          break;
        }
        case "chi-indep": {
          const r = intAtLeast(rows, 2, "Rows");
          const c = intAtLeast(cols, 2, "Columns");
          setRes({
            df: (r - 1) * (c - 1),
            dfLabel: "df",
            extraLines: [`rows = ${r}, cols = ${c}`],
            formulaText: "df = (rows − 1) × (cols − 1)",
            showDiagram: false,
            steps: [
              {
                title: "Formula",
                body: (
                  <>
                    <MathNote>An r × c contingency table's row and column totals are fixed, leaving (r − 1)(c − 1) free cells.</MathNote>
                    <MathLine>df = (rows − 1) × (cols − 1)</MathLine>
                  </>
                ),
              },
              {
                title: "Substitute",
                body: (
                  <>
                    <MathLine>df = ({r} − 1) × ({c} − 1)</MathLine>
                    <MathLine>df = {r - 1} × {c - 1}</MathLine>
                    <MathLine>df = <strong>{(r - 1) * (c - 1)}</strong></MathLine>
                  </>
                ),
              },
            ],
          });
          break;
        }
        case "anova": {
          const g = intAtLeast(groups, 2, "Number of groups k");
          const N = intAtLeast(Ntot, g + 1, "Total sample size N");
          const dfB = g - 1;
          const dfW = N - g;
          setRes({
            df: dfB, // primary display
            dfLabel: "df_between",
            extraLines: [
              `k = ${g}, N = ${N}`,
              `df_between = k − 1 = ${dfB}`,
              `df_within  = N − k = ${dfW}`,
              `df_total   = N − 1 = ${N - 1}`,
            ],
            formulaText:
              "df_between = k − 1, df_within = N − k, df_total = N − 1",
            showDiagram: false,
            steps: [
              {
                title: "Between-groups df",
                body: (
                  <>
                    <MathNote>One degree is used estimating each group's contribution relative to the grand mean.</MathNote>
                    <MathLine>df_between = k − 1</MathLine>
                    <MathLine>df_between = {g} − 1 = <strong>{dfB}</strong></MathLine>
                  </>
                ),
              },
              {
                title: "Within-groups df",
                body: (
                  <>
                    <MathNote>Each of the k group means is estimated from its own group, costing k degrees total.</MathNote>
                    <MathLine>df_within = N − k</MathLine>
                    <MathLine>df_within = {N} − {g} = <strong>{dfW}</strong></MathLine>
                  </>
                ),
              },
              {
                title: "Total df (check)",
                body: (
                  <>
                    <MathLine>df_between + df_within = {dfB} + {dfW}</MathLine>
                    <MathLine>= {dfB + dfW} = N − 1 ✓</MathLine>
                  </>
                ),
              },
            ],
          });
          break;
        }
        case "linear-regression": {
          const nv = intAtLeast(nReg, 3, "n");
          setRes({
            df: nv - 2,
            dfLabel: "residual df",
            extraLines: [`n = ${nv}`],
            formulaText: "df = n − 2",
            showDiagram: true,
            steps: [
              {
                title: "Formula",
                body: (
                  <>
                    <MathNote>Simple linear regression estimates 2 parameters — the slope and the intercept — from the data.</MathNote>
                    <MathLine>df = n − 2</MathLine>
                  </>
                ),
              },
              {
                title: "Substitute",
                body: (
                  <>
                    <MathLine>df = {nv} − 2</MathLine>
                    <MathLine>df = <strong>{nv - 2}</strong></MathLine>
                  </>
                ),
              },
            ],
          });
          break;
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input.");
    }
  };

  const inputs = useMemo(() => renderInputs(test), [test]);

  function renderInputs(t: TestKey) {
    switch (t) {
      case "one-sample-t":
        return (
          <Field label="Sample size (n)" htmlFor="df-n">
            <TextInput
              id="df-n"
              value={n}
              onChange={(e) => setN(e.target.value)}
              inputMode="numeric"
            />
          </Field>
        );
      case "pooled-t":
        return (
          <>
            <Field label="Sample 1 size (n₁)" htmlFor="df-n1">
              <TextInput
                id="df-n1"
                value={n1}
                onChange={(e) => setN1(e.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="Sample 2 size (n₂)" htmlFor="df-n2">
              <TextInput
                id="df-n2"
                value={n2}
                onChange={(e) => setN2(e.target.value)}
                inputMode="numeric"
              />
            </Field>
          </>
        );
      case "welch-t":
        return (
          <>
            <Field label="Sample 1 std dev (s₁)" htmlFor="df-s1">
              <TextInput
                id="df-s1"
                value={s1}
                onChange={(e) => setS1(e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Field label="Sample 1 size (n₁)" htmlFor="df-wn1">
              <TextInput
                id="df-wn1"
                value={n1}
                onChange={(e) => setN1(e.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="Sample 2 std dev (s₂)" htmlFor="df-s2">
              <TextInput
                id="df-s2"
                value={s2}
                onChange={(e) => setS2(e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Field label="Sample 2 size (n₂)" htmlFor="df-wn2">
              <TextInput
                id="df-wn2"
                value={n2}
                onChange={(e) => setN2(e.target.value)}
                inputMode="numeric"
              />
            </Field>
          </>
        );
      case "paired-t":
        return (
          <Field label="Number of matched pairs" htmlFor="df-pairs">
            <TextInput
              id="df-pairs"
              value={pairs}
              onChange={(e) => setPairs(e.target.value)}
              inputMode="numeric"
            />
          </Field>
        );
      case "chi-gof":
        return (
          <Field label="Number of categories (k)" htmlFor="df-k">
            <TextInput
              id="df-k"
              value={k}
              onChange={(e) => setK(e.target.value)}
              inputMode="numeric"
            />
          </Field>
        );
      case "chi-indep":
        return (
          <>
            <Field label="Rows" htmlFor="df-r">
              <TextInput
                id="df-r"
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="Columns" htmlFor="df-c">
              <TextInput
                id="df-c"
                value={cols}
                onChange={(e) => setCols(e.target.value)}
                inputMode="numeric"
              />
            </Field>
          </>
        );
      case "anova":
        return (
          <>
            <Field label="Number of groups (k)" htmlFor="df-groups">
              <TextInput
                id="df-groups"
                value={groups}
                onChange={(e) => setGroups(e.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field
              label="Total sample size (N = sum of all group sizes)"
              htmlFor="df-Ntot"
            >
              <TextInput
                id="df-Ntot"
                value={Ntot}
                onChange={(e) => setNtot(e.target.value)}
                inputMode="numeric"
              />
            </Field>
          </>
        );
      case "linear-regression":
        return (
          <Field label="Sample size (n)" htmlFor="df-nreg">
            <TextInput
              id="df-nreg"
              value={nReg}
              onChange={(e) => setNReg(e.target.value)}
              inputMode="numeric"
            />
          </Field>
        );
    }
  }

  const activeTest = TESTS.find((t) => t.key === test)!;

  return (
    <section>
      <Field label="Test type" htmlFor="df-test">
        <select
          id="df-test"
          value={test}
          onChange={(e) => {
            setTest(e.target.value as TestKey);
            setRes(null);
            setErr(null);
          }}
          className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {TESTS.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>

      <p className="mt-2 text-sm text-muted-foreground">
        Formula: <code className="text-foreground">{activeTest.formula}</code>
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">{inputs}</div>

      <div className="mt-4">
        <PrimaryButton onClick={run}>Calculate df</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {res && (
        <>
          <ResultBox
            label={`Degrees of freedom (${activeTest.label})`}
            value={
              test === "anova" ? (
                <>
                  df<sub>between</sub> = {res.df} · df<sub>within</sub> ={" "}
                  {(() => {
                    const g = Number(groups);
                    const N = Number(Ntot);
                    return N - g;
                  })()}
                </>
              ) : (
                <>{fmt(res.df, test === "welch-t" ? 4 : 0)}</>
              )
            }
            note={
              <div className="space-y-1">
                <div>
                  Formula: <code>{res.formulaText}</code>
                </div>
                {res.extraLines.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            }
          />

          {res.showDiagram && <TDistDiagram df={res.df} />}

          <StepsToggle steps={res.steps} />
        </>
      )}
    </section>
  );
}

/* ================================================================
   Educational content
   ================================================================ */
const DOF_GUIDE: GuideCardItem[] = [
  {
    key: "concept",
    title: "1. Degrees of freedom — what stays free after constraints",
    explain:
      "Degrees of freedom is the count of values that are still free to vary after every constraint your calculation imposes is fixed. Every parameter you estimate from the data burns one degree. That's why the sample standard deviation divides by n − 1: once the mean is fixed, only n − 1 residuals are free.",
    formula: <>df = n − (parameters estimated)</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="grid w-full grid-cols-4 gap-1 text-center font-serif italic">
          <div className="rounded bg-primary/15 py-1 text-primary">5</div>
          <div className="rounded bg-primary/15 py-1 text-primary">12</div>
          <div className="rounded bg-primary/15 py-1 text-primary">9</div>
          <div className="rounded bg-destructive/15 py-1 text-destructive">14?</div>
          <div className="col-span-4 pt-1 text-muted-foreground">mean = 10 fixes the 4th value</div>
        </div>
      </div>
    ),
    example: {
      given: "n = 4, mean fixed",
      substitute: "df = 4 − 1",
      answer: "df = 3",
    },
  },
  {
    key: "tests",
    title: "2. df by test — the standard formulas",
    explain:
      "Most tests have a plug-in formula: one-sample t uses n − 1, pooled two-sample t uses n₁ + n₂ − 2, paired t uses n_pairs − 1, chi-square goodness of fit uses k − 1, chi-square independence uses (r − 1)(c − 1), one-way ANOVA reports (k − 1, N − k), and simple linear regression residuals use n − 2.",
    formula: <>t: n − 1 &nbsp;·&nbsp; χ² ind: (r − 1)(c − 1) &nbsp;·&nbsp; ANOVA: (k − 1, N − k)</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-[11px]">
        <div className="w-full space-y-1 text-center font-serif italic">
          <div className="rounded bg-primary/10 py-1 text-primary">one-sample t: n − 1</div>
          <div className="rounded bg-primary/10 py-1 text-primary">pooled t: n₁ + n₂ − 2</div>
          <div className="rounded bg-primary/10 py-1 text-primary">χ² ind: (r − 1)(c − 1)</div>
          <div className="rounded bg-primary/10 py-1 text-primary">ANOVA: k − 1 &amp; N − k</div>
        </div>
      </div>
    ),
    example: {
      given: "3×4 contingency table",
      substitute: "df = (3 − 1)(4 − 1)",
      answer: "df = 6",
    },
  },
  {
    key: "welch",
    title: "3. Welch–Satterthwaite — the non-integer df",
    explain:
      "Welch's two-sample t-test uses a moment-matched df that depends on both sample sizes and both variances. It's usually non-integer and never exceeds the pooled df. Round down (never up) if you must consult a printed table.",
    formula: <>df = (s₁²/n₁ + s₂²/n₂)² / ((s₁²/n₁)²/(n₁ − 1) + (s₂²/n₂)²/(n₂ − 1))</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <rect x="30" y="70" width="60" height="20" className="fill-primary/60" />
          <rect x="150" y="55" width="60" height="35" className="fill-primary/40" />
          <text x="60" y="65" fontSize="9" textAnchor="middle" className="fill-foreground">n₁=15 s₁=10</text>
          <text x="180" y="50" fontSize="9" textAnchor="middle" className="fill-foreground">n₂=20 s₂=15</text>
          <text x="120" y="20" fontSize="11" textAnchor="middle" className="fill-primary">Welch df ≈ 32.6</text>
        </svg>
      </div>
    ),
    example: {
      given: "s₁=10, n₁=15, s₂=15, n₂=20",
      substitute: "17.917² / 9.836",
      answer: "df ≈ 32.64",
    },
  },
  {
    key: "why",
    title: "4. Why it matters — a family of curves",
    explain:
      "The t, χ² and F distributions are indexed by df — small df means heavier tails and larger critical values. Plugging the wrong df into the same statistic can push a p-value from 0.03 to 0.10 with no other change. Feed the df from this calculator directly into the matching test tool.",
    formula: <>small df ⇒ heavier tails ⇒ wider critical value</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M20 90 Q70 30 120 55 T220 90" fill="none" className="stroke-primary" strokeWidth="2" />
          <path d="M20 90 Q70 55 120 72 T220 90" fill="none" className="stroke-primary/40" strokeWidth="2" strokeDasharray="4 3" />
          <text x="60" y="45" fontSize="9" className="fill-primary">df = 3</text>
          <text x="150" y="75" fontSize="9" className="fill-muted-foreground">df = 30</text>
        </svg>
      </div>
    ),
    example: {
      given: "t = 2.05, α = 0.05 two-tailed",
      substitute: "df = 5 vs df = 50",
      answer: "p ≈ 0.096 vs 0.045",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="Degrees of freedom explained, step by step">
        <p>
          Every parameter you estimate from data costs one degree of freedom.
          Each card below covers one place df shows up in the tests this
          calculator supports.
        </p>
        <GuideCards items={DOF_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Eight test types on one page — no more guessing which df formula applies.",
            "Live shape of the reference t-distribution rendered from the computed df.",
            "Show / hide step-by-step working, including the full Welch-Satterthwaite expansion.",
            "Handles the two most-confused cases explicitly: pooled vs Welch's t-test and chi-square GoF vs independence.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            {
              q: "Does df depend on the data or just the sample size?",
              a: "For t-tests, chi-square, ANOVA and simple linear regression, df depends only on counts (n, categories, rows × columns, number of groups). Welch's df is the exception: it also depends on the sample variances, which is why it's usually non-integer.",
            },
            {
              q: "Why does Welch's df come out non-integer?",
              a: "Because it's an approximation (the Welch-Satterthwaite equation) that matches the moments of a t-distribution to the actual sampling distribution of Welch's statistic — it isn't derived from a simple counting argument.",
            },
            {
              q: "What's df for a two-way ANOVA?",
              a: "For factors A (a levels), B (b levels) and n replicates per cell: df_A = a − 1, df_B = b − 1, df_AB = (a − 1)(b − 1), df_error = ab(n − 1). This page focuses on the eight most-used forms — two-way ANOVA is on the roadmap.",
            },
            {
              q: "Is df ever infinite?",
              a: "Effectively yes — as df → ∞ the t-distribution becomes the standard normal and the χ²/df ratio becomes a constant. In practice, for n ≥ ~30 the t and Z answers already agree to 2–3 decimals.",
            },
            {
              q: "Do I need df if I'm just computing a confidence interval?",
              a: "Yes — the critical multiplier (Student t) depends on df. For a one-sample mean CI you'd use n − 1; for regression coefficients you'd use residual df.",
            },
            {
              q: "Why is df for regression n − 2 and not n − 1?",
              a: "Because two parameters are estimated from the same data — the intercept and the slope. Each estimated parameter costs one degree. Multiple regression with p predictors plus intercept costs p + 1 degrees, so residual df = n − p − 1.",
            },
          ]}
        />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/t-test-calculator", label: "T-Test Calculator" },
            { to: "/calculators/math/chi-square-calculator", label: "Chi-Square Calculator" },
            { to: "/calculators/math/anova-calculator", label: "ANOVA Calculator" },
            { to: "/calculators/math/f-test-calculator", label: "F-Test Calculator" },
            { to: "/calculators/math/critical-value-calculator", label: "Critical Value Calculator" },
            { to: "/calculators/math/p-value-calculator", label: "P-Value Calculator" },
          ]}
        />
      </CalcSection>
    </>
  );
}
