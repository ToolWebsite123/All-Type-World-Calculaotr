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
  type GuideCardItem,
  FormulaBlock,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import type { ReactNode } from "react";
import { fCDF, fPDF, fInv, fmt, fmtP } from "@/lib/math/p-value";
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

/* ============================================================
   F-distribution diagram — shaded p-value tail(s) + critical line
   ============================================================ */
function FDistDiagram({
  F,
  df1,
  df2,
  crit,
  twoTailed,
}: {
  F: number;
  df1: number;
  df2: number;
  crit: number;
  twoTailed: boolean;
}) {
  const W = 560;
  const H = 200;
  const pad = 30;
  const xMin = 0;
  const xMax = Math.max(F * 1.25 + 1, crit * 1.3 + 1, 5);

  const N = 260;
  const pts: [number, number][] = [];
  let maxY = 0;
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = fPDF(x, df1, df2);
    if (Number.isFinite(y) && y > maxY) maxY = y;
    pts.push([x, Number.isFinite(y) ? y : 0]);
  }
  if (maxY <= 0) maxY = 1;
  const px = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
  const py = (y: number) => H - pad - (y / maxY) * (H - 2 * pad);
  const curve =
    "M " + pts.map(([x, y]) => `${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" L ");

  // Upper tail shade from F
  const filtUp = pts.filter(([x]) => x >= F);
  const shadeUp =
    filtUp.length >= 2
      ? `M ${px(filtUp[0][0]).toFixed(1)},${py(0).toFixed(1)} ` +
        filtUp.map(([x, y]) => `L ${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" ") +
        ` L ${px(filtUp[filtUp.length - 1][0]).toFixed(1)},${py(0).toFixed(1)} Z`
      : "";

  // For two-tailed, mirror lower tail at 1/F reciprocal (F(df2,df1)) — approximate by shading area to the left of critLower on same curve
  const critLower = twoTailed ? 1 / fInv(1 - (1 - fCDF(F, df1, df2)), df2, df1) : 0;
  const filtLo = twoTailed ? pts.filter(([x]) => x <= critLower && x > 0) : [];
  const shadeLo =
    twoTailed && filtLo.length >= 2
      ? `M ${px(filtLo[0][0]).toFixed(1)},${py(0).toFixed(1)} ` +
        filtLo.map(([x, y]) => `L ${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" ") +
        ` L ${px(filtLo[filtLo.length - 1][0]).toFixed(1)},${py(0).toFixed(1)} Z`
      : "";

  const Fclamp = Math.max(xMin, Math.min(xMax, F));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="F distribution with shaded p-value area and critical value marked"
    >
      <line
        x1={pad}
        y1={H - pad}
        x2={W - pad}
        y2={H - pad}
        className="stroke-muted-foreground/40"
        strokeWidth={1}
      />
      {shadeLo && <path d={shadeLo} className="fill-destructive/30" />}
      {shadeUp && <path d={shadeUp} className="fill-destructive/30" />}
      <path d={curve} className="fill-none stroke-primary" strokeWidth={2} />
      {crit >= xMin && crit <= xMax && (
        <g>
          <line
            x1={px(crit)}
            y1={pad}
            x2={px(crit)}
            y2={H - pad}
            className="stroke-muted-foreground/60"
            strokeDasharray="4 3"
          />
          <text
            x={px(crit)}
            y={H - pad + 14}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            crit {fmt(crit, 3)}
          </text>
        </g>
      )}
      <line
        x1={px(Fclamp)}
        y1={pad - 6}
        x2={px(Fclamp)}
        y2={H - pad}
        className="stroke-foreground"
        strokeWidth={1.5}
      />
      <circle
        cx={px(Fclamp)}
        cy={py(fPDF(Fclamp, df1, df2))}
        r={4}
        className="fill-foreground"
      />
      <text
        x={px(Fclamp)}
        y={pad - 10}
        textAnchor="middle"
        className="fill-foreground text-[11px] font-medium"
      >
        F = {fmt(F, 3)}
      </text>
      <text
        x={W - pad}
        y={H - 4}
        textAnchor="end"
        className="fill-muted-foreground text-[10px]"
      >
        shaded area = p-value · F({df1}, {df2})
      </text>
    </svg>
  );
}

export const Route = createFileRoute("/calculators/math/f-test-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "F-Test Calculator",
      title: "F-Test Calculator — Compare Two Variances",
      metaDescription:
        "Run an F-test for equality of two variances with F-statistic, df, p-value, and critical values.",
      canonicalUrl: "/calculators/math/f-test-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "F-Test Calculator", path: "/calculators/math/f-test-calculator" },
      ],
      faqs: [
        {
          q: "What does the two-sample F-test actually test?",
          a: "Whether two populations have equal variances. The null hypothesis is H₀: σ₁² = σ₂². A large F ratio (far from 1) is evidence against equal variances. It does not test whether the means are equal — for that, use a t-test or ANOVA.",
        },
        {
          q: "Why put the larger variance on top?",
          a: "By convention F is defined as larger sample variance ÷ smaller sample variance so that F is always ≥ 1. This keeps you in the upper tail of the F-distribution, which is where standard F-tables and critical value lookups live. It has no effect on the conclusion.",
        },
        {
          q: "One-tailed or two-tailed for an F-test on variances?",
          a: "Testing equality of variances (H₁: σ₁² ≠ σ₂²) is two-tailed. Use one-tailed only when you have a directional hypothesis before seeing the data — for example, 'the new process has smaller variance than the old one'.",
        },
        {
          q: "How does this differ from the F-test inside ANOVA?",
          a: "The math (F = ratio of variances on the F-distribution) is the same, but the ratio is built differently. ANOVA computes F = MS between groups / MS within groups to test equality of means across 3+ groups. This calculator is the classic two-sample F-test for the variances of two groups.",
        },
        {
          q: "Is the F-test sensitive to non-normality?",
          a: "Yes, quite. Unlike the two-sample t-test (which is fairly robust to modest non-normality), the F-test on variances is notoriously sensitive to departures from normality. If your data are clearly skewed or heavy-tailed, prefer Levene's test or the Brown–Forsythe test.",
        },
        {
          q: "Can I use this before choosing between Student's and Welch's t-test?",
          a: "Historically yes, but modern practice recommends defaulting to Welch's t-test — it does not require equal variances and behaves well when variances are equal too. Formally pre-testing with an F-test can inflate the overall error rate.",
        },
      ],
    }),
  component: FTestPage,
});

interface Sample {
  raw: string;
  variance: string;
  n: string;
}

type Mode = "raw" | "summary";
type Tail = "two" | "one";

interface FResult {
  s1: number;
  s2: number;
  n1: number;
  n2: number;
  label1: string;
  label2: string;
  swapped: boolean; // true if we swapped so that sample "1" ends up as the larger-variance one
  F: number;
  df1: number;
  df2: number;
  p: number;
  crit: number;
  alpha: number;
  tail: Tail;
  cleaned: number;
  invalid: string[];
}

function FTestPage() {
  return (
    <MathCalcPage
      name="F-Test Calculator"
      tagline="Two-sample F-test for equal variances — from raw data or summary stats. Exact p-value from the F-distribution, critical value, shaded F-curve diagram and a plain-language verdict."
      extras={<Extras />}
    >
      <FTestTool />
    </MathCalcPage>
  );
}

function Stat({
  label,
  value,
  big,
  tone,
}: {
  label: string;
  value: string;
  big?: boolean;
  tone?: "good" | "muted";
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={
          (big ? "text-2xl " : "text-lg ") +
          "font-semibold " +
          (tone === "good"
            ? "text-primary"
            : tone === "muted"
              ? "text-muted-foreground"
              : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}

function sampleStats(raw: string) {
  const p = parseDataset(raw);
  if (p.values.length < 2) return { ok: false as const, cleaned: p.cleaned, invalid: p.invalid };
  const n = p.values.length;
  const mean = p.values.reduce((s, x) => s + x, 0) / n;
  const sumSq = p.values.reduce((s, x) => s + (x - mean) ** 2, 0);
  const variance = sumSq / (n - 1);
  return { ok: true as const, n, mean, variance, cleaned: p.cleaned, invalid: p.invalid };
}

function FTestTool() {
  const [mode, setMode] = useState<Mode>("raw");
  const [tail, setTail] = useState<Tail>("two");
  const [alpha, setAlpha] = useState("0.05");
  const [a, setA] = useState<Sample>({
    raw: "4, 6, 8, 10, 12",
    variance: "10",
    n: "5",
  });
  const [b, setB] = useState<Sample>({
    raw: "5, 6, 7, 8, 9",
    variance: "2.5",
    n: "5",
  });
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<FResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  function run() {
    setErr(null);
    setRes(null);
    const al = Number(alpha);
    if (!Number.isFinite(al) || al <= 0 || al >= 1)
      return setErr("Significance level α must be between 0 and 1 (e.g. 0.05).");

    let s1 = 0,
      s2 = 0,
      n1 = 0,
      n2 = 0,
      cleaned = 0;
    const invalid: string[] = [];

    if (mode === "raw") {
      const A = sampleStats(a.raw);
      const B = sampleStats(b.raw);
      if (!A.ok) return setErr("Sample 1 needs at least 2 numeric values.");
      if (!B.ok) return setErr("Sample 2 needs at least 2 numeric values.");
      s1 = A.variance;
      s2 = B.variance;
      n1 = A.n;
      n2 = B.n;
      cleaned = A.cleaned + B.cleaned;
      invalid.push(...A.invalid, ...B.invalid);
    } else {
      s1 = Number(a.variance);
      s2 = Number(b.variance);
      n1 = Math.floor(Number(a.n));
      n2 = Math.floor(Number(b.n));
      if (!Number.isFinite(s1) || s1 <= 0 || !Number.isFinite(s2) || s2 <= 0)
        return setErr("Variances must be positive numbers.");
      if (!Number.isFinite(n1) || n1 < 2 || !Number.isFinite(n2) || n2 < 2)
        return setErr("Sample sizes must be integers ≥ 2.");
    }

    // Convention: put the larger variance on top
    const swap = s2 > s1;
    const V1 = swap ? s2 : s1;
    const V2 = swap ? s1 : s2;
    const N1 = swap ? n2 : n1;
    const N2 = swap ? n1 : n2;

    const F = V1 / V2;
    const df1 = N1 - 1;
    const df2 = N2 - 1;

    const upper = 1 - fCDF(F, df1, df2);
    const p = tail === "two" ? Math.min(1, 2 * upper) : upper;
    const crit =
      tail === "two"
        ? fInv(1 - al / 2, df1, df2)
        : fInv(1 - al, df1, df2);

    setRes({
      s1: V1,
      s2: V2,
      n1: N1,
      n2: N2,
      label1: swap ? "Sample 2" : "Sample 1",
      label2: swap ? "Sample 1" : "Sample 2",
      swapped: swap,
      F,
      df1,
      df2,
      p,
      crit,
      alpha: al,
      tail,
      cleaned,
      invalid,
    });
  }

  const summary = useMemo(() => {
    if (!res) return "";
    return [
      `Two-sample F-test for equal variances (${res.tail === "two" ? "two-tailed" : "one-tailed"})`,
      `Larger  s² = ${fmt(res.s1, 4)} (n = ${res.n1}, df = ${res.df1})  [${res.label1}]`,
      `Smaller s² = ${fmt(res.s2, 4)} (n = ${res.n2}, df = ${res.df2})  [${res.label2}]`,
      `F = ${fmt(res.s1, 4)} / ${fmt(res.s2, 4)} = ${fmt(res.F, 4)}`,
      `p-value = ${fmtP(res.p)}   critical F(α=${res.alpha}) = ${fmt(res.crit, 4)}`,
      res.p <= res.alpha
        ? `Decision: reject H₀ — variances differ significantly at α = ${res.alpha}.`
        : `Decision: fail to reject H₀ at α = ${res.alpha} — no significant evidence variances differ.`,
    ].join("\n");
  }, [res]);

  const steps: Step[] = useMemo(() => (res ? buildSteps(res) : []), [res]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Input mode">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="w-full rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
          >
            <option value="raw">Raw data</option>
            <option value="summary">Summary stats (s², n)</option>
          </select>
        </Field>
        <Field label="Tail">
          <select
            value={tail}
            onChange={(e) => setTail(e.target.value as Tail)}
            className="w-full rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
          >
            <option value="two">Two-tailed (σ₁² ≠ σ₂²)</option>
            <option value="one">One-tailed (larger &gt; smaller)</option>
          </select>
        </Field>
        <Field label="Significance level α">
          <TextInput
            value={alpha}
            onChange={(e) => setAlpha(e.target.value)}
            inputMode="decimal"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { s: a, set: setA, title: "Sample 1" },
          { s: b, set: setB, title: "Sample 2" },
        ].map(({ s, set, title }, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 bg-background/40 p-4 space-y-3"
          >
            <div className="text-sm font-medium">{title}</div>
            {mode === "raw" ? (
              <textarea
                value={s.raw}
                onChange={(e) => set({ ...s, raw: e.target.value })}
                rows={3}
                placeholder="Comma- or space-separated numbers, e.g. 4, 6, 8, 10, 12"
                className="w-full rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Variance s²">
                  <TextInput
                    value={s.variance}
                    onChange={(e) => set({ ...s, variance: e.target.value })}
                    inputMode="decimal"
                  />
                </Field>
                <Field label="Sample size n">
                  <TextInput
                    value={s.n}
                    onChange={(e) => set({ ...s, n: e.target.value })}
                    inputMode="numeric"
                  />
                </Field>
              </div>
            )}
          </div>
        ))}
      </div>

      <PrimaryButton onClick={run}>Run F-test</PrimaryButton>
      {err && <ErrorBox message={err} />}

      {res && (
        <div
          ref={resultRef}
          className="rounded-2xl border border-border/60 bg-secondary/30 p-5"
        >
          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="F statistic" value={fmt(res.F, 4)} big />
            <Stat label="df (num, den)" value={`${res.df1}, ${res.df2}`} />
            <Stat label="p-value" value={fmtP(res.p)} />
            <Stat
              label={`α = ${res.alpha}`}
              value={res.p <= res.alpha ? "Reject H₀" : "Fail to reject H₀"}
              tone={res.p <= res.alpha ? "good" : "muted"}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Critical value F<sub>{res.tail === "two" ? `${res.alpha}/2` : res.alpha}</sub>({res.df1},{" "}
            {res.df2}) = <strong>{fmt(res.crit, 4)}</strong>.{" "}
            {res.F >= res.crit
              ? `F ≥ critical → reject H₀.`
              : `F < critical → fail to reject H₀.`}
          </p>
          {res.swapped && (
            <p className="mt-1 text-sm text-muted-foreground">
              Note: Sample 2 had the larger variance, so it was placed in the numerator
              by convention (F ≥ 1).
            </p>
          )}
          {res.cleaned > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">{cleanedNote(res.cleaned)}</p>
          )}
          {res.invalid.length > 0 && (
            <p className="mt-2 text-sm text-amber-500">
              Ignored {res.invalid.length} value{res.invalid.length === 1 ? "" : "s"} that
              could not be parsed: {res.invalid.slice(0, 5).join(", ")}
              {res.invalid.length > 5 ? "…" : ""}
            </p>
          )}

          <div className="mt-4">
            <FDistDiagram
              F={Number.isFinite(res.F) ? res.F : res.crit * 3}
              df1={res.df1}
              df2={res.df2}
              crit={res.crit}
              twoTailed={res.tail === "two"}
            />
          </div>

          {/* Sample summary */}
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/50">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/40 text-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Sample</th>
                  <th className="px-3 py-2 text-right font-semibold">n</th>
                  <th className="px-3 py-2 text-right font-semibold">df</th>
                  <th className="px-3 py-2 text-right font-semibold">Variance s²</th>
                  <th className="px-3 py-2 text-right font-semibold">Std dev s</th>
                </tr>
              </thead>
              <tbody>
                <tr className="odd:bg-background/40">
                  <td className="px-3 py-2">{res.label1} (numerator, larger)</td>
                  <td className="px-3 py-2 text-right tabular-nums">{res.n1}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{res.df1}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(res.s1, 4)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(Math.sqrt(res.s1), 4)}
                  </td>
                </tr>
                <tr className="odd:bg-background/40">
                  <td className="px-3 py-2">{res.label2} (denominator, smaller)</td>
                  <td className="px-3 py-2 text-right tabular-nums">{res.n2}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{res.df2}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(res.s2, 4)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(Math.sqrt(res.s2), 4)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <StepsToggle steps={steps} />

          <div className="mt-4">
            <ResultActions
              captureRef={resultRef}
              filename="f-test"
              getCopyText={() => summary}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function buildSteps(r: FResult): Step[] {
  return [
    {
      title: "Given — order variances",
      body: (
        <>
          <MathNote>Place the larger sample variance on top so F ≥ 1</MathNote>
          <MathLine>larger s² = {fmt(r.s1, 4)} (n = {r.n1}, df = {r.df1})</MathLine>
          <MathLine>smaller s² = {fmt(r.s2, 4)} (n = {r.n2}, df = {r.df2})</MathLine>
        </>
      ),
    },
    {
      title: "Formula & substitute — F",
      body: (
        <>
          <MathLine>F = s²_large / s²_small</MathLine>
          <MathLine>F = {fmt(r.s1, 4)} / {fmt(r.s2, 4)}</MathLine>
          <MathLine>F = {fmt(r.F, 4)}</MathLine>
        </>
      ),
    },
    {
      title: "Degrees of freedom",
      body: (
        <>
          <MathLine>df_num = n_large − 1 = {r.n1} − 1 = {r.df1}</MathLine>
          <MathLine>df_den = n_small − 1 = {r.n2} − 1 = {r.df2}</MathLine>
        </>
      ),
    },
    {
      title: "Answer — p-value",
      body: (
        <>
          {r.tail === "two" ? (
            <>
              <MathNote>Two-tailed: double the upper-tail probability</MathNote>
              <MathLine>p = 2 · P(F({r.df1}, {r.df2}) ≥ {fmt(r.F, 4)})</MathLine>
            </>
          ) : (
            <>
              <MathNote>One-tailed: use the upper-tail probability directly</MathNote>
              <MathLine>p = P(F({r.df1}, {r.df2}) ≥ {fmt(r.F, 4)})</MathLine>
            </>
          )}
          <MathLine>p = {fmtP(r.p)}</MathLine>
        </>
      ),
    },
    {
      title: "Answer — decision",
      body: (
        <>
          <MathLine>
            F<sub>{r.tail === "two" ? `${r.alpha}/2` : r.alpha}</sub>({r.df1}, {r.df2}) = {fmt(r.crit, 4)}
          </MathLine>
          <MathNote>
            {r.p <= r.alpha
              ? "p ≤ α (and F ≥ critical) → reject H₀. The two population variances differ significantly."
              : "p > α (and F < critical) → fail to reject H₀. No significant evidence the variances differ."}
          </MathNote>
        </>
      ),
    },
  ];
}


/* ============================================================
   Extras — educational content
   ============================================================ */

const FT_GUIDE: GuideCardItem[] = [
  {
    key: "ratio",
    title: "1. The variance ratio — larger over smaller",
    explain:
      "The two-sample F-test asks whether two populations have the same variance. Divide the larger sample variance by the smaller one so F ≥ 1 and you only need upper-tail tables. The further F sits from 1, the stronger the evidence against equal variances.",
    formula: <>F = s²<sub>larger</sub> / s²<sub>smaller</sub></>,
    legend: [
      { sym: "s²", def: "sample variance = Σ(xᵢ − x̄)² / (n − 1)" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="85" x2="220" y2="85" className="stroke-border" />
          <rect x="40" y="25" width="30" height="60" className="fill-primary/70" />
          <rect x="150" y="55" width="30" height="30" className="fill-primary/40" />
          <text x="55" y="100" fontSize="10" textAnchor="middle" className="fill-foreground">s²ₐ = 10</text>
          <text x="165" y="100" fontSize="10" textAnchor="middle" className="fill-foreground">s²ᵦ = 2.5</text>
          <text x="120" y="20" fontSize="11" textAnchor="middle" className="fill-primary">F = 10 / 2.5 = 4</text>
        </svg>
      </div>
    ),
    example: {
      given: "sA² = 10, sB² = 2.5",
      substitute: "F = 10 / 2.5",
      answer: "F = 4.0",
    },
  },
  {
    key: "df",
    title: "2. Degrees of freedom — one per sample",
    explain:
      "Each sample contributes df = n − 1. The numerator df goes with the sample whose variance sits on top; the denominator df with the sample on the bottom. F(dfₙ, dfd) and F(dfd, dfₙ) are different distributions, so keep the order straight.",
    formula: <>df<sub>num</sub> = n<sub>larger</sub> − 1 &nbsp; df<sub>den</sub> = n<sub>smaller</sub> − 1</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M20 90 Q60 20 120 60 T220 90" fill="none" className="stroke-primary" strokeWidth="2" />
          <path d="M20 90 Q60 40 120 75 T220 90" fill="none" className="stroke-primary/40" strokeWidth="2" strokeDasharray="4 3" />
          <text x="80" y="35" fontSize="9" className="fill-primary">F(4, 4)</text>
          <text x="140" y="55" fontSize="9" className="fill-muted-foreground">F(20, 20)</text>
        </svg>
      </div>
    ),
    example: {
      given: "nA = 5, nB = 5",
      substitute: "df = (5 − 1, 5 − 1)",
      answer: "df = (4, 4)",
    },
  },
  {
    key: "tail",
    title: "3. One-tailed vs two-tailed — α or α/2",
    explain:
      "Two-tailed H₁: σ₁² ≠ σ₂² uses the α/2 upper critical value because the smaller-over-larger tail is already folded in by the larger-on-top convention. One-tailed H₁: σ₁² > σ₂² uses α directly. Using α for a two-tailed test doubles your false-positive rate.",
    formula: <>reject if F ≥ F<sub>α/2</sub>(df<sub>num</sub>, df<sub>den</sub>)</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M20 90 Q70 15 120 55 T220 90" fill="none" className="stroke-primary" strokeWidth="2" />
          <path d="M180 90 L180 55 L220 55 L220 90 Z" className="fill-primary/25" />
          <line x1="180" y1="20" x2="180" y2="90" className="stroke-primary" strokeDasharray="3 3" />
          <text x="185" y="30" fontSize="9" className="fill-primary">Fα/2</text>
          <text x="200" y="80" fontSize="9" className="fill-primary">α/2</text>
        </svg>
      </div>
    ),
    example: {
      given: "α = 0.05 two-tailed, df = (4, 4)",
      substitute: "F ≥ F₀.₀₂₅(4, 4)",
      answer: "cutoff ≈ 9.605",
    },
  },
  {
    key: "assum",
    title: "4. When the F-test breaks — normality matters",
    explain:
      "Unlike the two-sample t-test, the variance F-test is very sensitive to non-normality (heavy tails, skew). If the raw data isn't roughly normal, use Levene's or Brown–Forsythe. Also don't confuse this with the ANOVA F-test — same distribution, different hypothesis.",
    formula: <>use Levene's / Brown–Forsythe if not normal</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded-lg bg-primary/10 py-1 text-primary">normal samples → F-test OK</div>
          <div className="rounded-lg bg-destructive/15 py-1 text-destructive">heavy tails / skew → Levene's</div>
          <div className="rounded-lg bg-destructive/15 py-1 text-destructive">comparing 3+ means → ANOVA</div>
        </div>
      </div>
    ),
    example: {
      given: "skewed samples, n = 8 each",
      substitute: "F unreliable",
      answer: "switch to Levene's",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="The F-test explained, step by step">
        <p>
          The two-sample F-test compares two variances by taking their ratio and
          checking it against the F-distribution. Each card below covers one
          piece the calculator uses to reach its verdict.
        </p>
        <GuideCards items={FT_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Raw-data or summary-stats input modes on the same page.",
            "Automatically puts the larger sample variance on top so F ≥ 1 and the test never depends on which sample you enter first.",
            "Exact p-values from the F cumulative distribution — no table interpolation.",
            "One-tailed and two-tailed decision rules with the matching critical value at your chosen α.",
            "F-distribution diagram with the shaded rejection tail(s) and the observed F marked on the axis.",
            "Show / hide step-by-step working covering the variances, the ratio and the p-value lookup.",
          ]}
        />
      </CalcSection>

      <CalcFAQ
        items={[
          {
            q: "What are the assumptions of the two-sample F-test?",
            a: "Independent random samples from each population and approximately normal populations. The normality assumption is important — the F-test is sensitive to violations, unlike the two-sample t-test which is fairly robust.",
          },
          {
            q: "Does swapping which sample is 'first' change my p-value?",
            a: "No. This calculator automatically puts the larger sample variance in the numerator (the standard convention), so which sample you enter as 'Sample 1' vs 'Sample 2' has no effect on the reported F, p-value or decision.",
          },
          {
            q: "When should I use a one-tailed F-test?",
            a: "Only when you have a directional hypothesis specified before collecting data — for example, testing that a new manufacturing process reduces variance. For general 'are these variances equal?' questions, use two-tailed.",
          },
          {
            q: "What if my sample sizes are very different?",
            a: "The F-test still applies (the degrees of freedom differ), but its sensitivity to non-normality gets worse with unequal sample sizes. If in doubt, use Levene's test, which is more robust.",
          },
          {
            q: "How is this different from an ANOVA F-test?",
            a: "The two-sample F-test compares two variances directly. The ANOVA F-test compares means across three or more groups by taking the ratio of between-group to within-group variance. Same distribution, different question — use the ANOVA calculator for the latter.",
          },
          {
            q: "Can I use raw data or just summary stats?",
            a: "Both. Switch the 'Input mode' selector to 'Summary stats' and enter each sample's variance (s²) and sample size (n) directly — useful when you're working from a published table.",
          },
        ]}
      />

      <RelatedLinks
        links={[
          { to: "/calculators/math/anova-calculator", label: "ANOVA Calculator" },
          { to: "/calculators/math/t-test-calculator", label: "T-Test Calculator" },
          { to: "/calculators/math/p-value-calculator", label: "P-Value Calculator" },
          { to: "/calculators/math/chi-square-calculator", label: "Chi-Square Calculator" },
        ]}
      />
    </>
  );
}
