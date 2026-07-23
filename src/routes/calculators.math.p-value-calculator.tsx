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
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  type GuideCardItem,
  FormulaBlock,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { SolutionSteps, type Step } from "@/components/SolutionSteps";
import {
  normalCDF,
  normalPDF,
  tCDF,
  tPDF,
  chiSquareCDF,
  chiSquarePDF,
  fCDF,
  fPDF,
  pValueFor,
  criticalFor,
  fmt,
  fmtP,
  type DistSpec,
  type Tail,
} from "@/lib/math/p-value";

export const Route = createFileRoute("/calculators/math/p-value-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "P-Value Calculator",
      title:
        "P-Value Calculator — z, t, χ² and F",
      metaDescription:
        "Compute p-values from a z, t, chi-square, or F test statistic with one- or two-tailed tests and full working.",
      canonicalUrl: "/calculators/math/p-value-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "P-Value Calculator", path: "/calculators/math/p-value-calculator" },
      ],
      faqs: [
        {
          q: "What does a p-value actually mean?",
          a: "A p-value is the probability of observing a test statistic at least as extreme as the one you got, assuming the null hypothesis is true. It measures how surprising your data would be in a world where nothing interesting is going on — nothing more.",
        },
        {
          q: "Is a p-value the probability that the null hypothesis is true?",
          a: "No. This is the single most common misconception. The p-value is a conditional probability of the data given the null, not a probability of the null given the data. Assigning a probability to a hypothesis itself requires a Bayesian framework, not a p-value.",
        },
        {
          q: "Does a small p-value mean the effect is important?",
          a: "No. A small p-value only means the observed result is unlikely under the null. With a very large sample, tiny and practically meaningless differences can produce p-values under 0.001. Always report an effect size alongside the p-value.",
        },
        {
          q: "Should I always use α = 0.05?",
          a: "0.05 is a widely used convention, not a law. In physics 5-sigma (p ≈ 3×10⁻⁷) is standard; in exploratory work 0.10 may be reasonable; in high-stakes medical trials people often prefer 0.01 or lower. Pick a threshold that matches the cost of a false alarm in your field, and set it before looking at the data.",
        },
        {
          q: "Why is my two-tailed p-value double the one-tailed one?",
          a: "For symmetric distributions (normal, t) the two-tailed p-value is exactly twice the one-tailed p-value in the direction of the observed statistic. That is because a two-tailed test counts extreme results on both sides as evidence against the null.",
        },
        {
          q: "Can a p-value be exactly zero?",
          a: "Mathematically, no — for any observed statistic the p-value is a positive real number. In practice calculators may report 0 when the true value is smaller than the machine's floating-point precision (roughly 10⁻¹⁶). This calculator falls back to scientific notation for very small p.",
        },
      ],
    }),
  component: PValuePage,
});

type Kind = "z" | "t" | "chi2" | "f";
const TAILS: { v: Tail; label: string }[] = [
  { v: "two", label: "Two-tailed (≠)" },
  { v: "left", label: "Left-tailed (<)" },
  { v: "right", label: "Right-tailed (>)" },
];

function PValuePage() {
  const [kind, setKind] = useState<Kind>("z");
  return (
    <MathCalcPage
      name="P-Value Calculator"
      tagline="Turn any Z, T, Chi-Square or F test statistic into an exact p-value — with a shaded distribution diagram, a plain-language interpretation, and a significance verdict at your chosen α."
      extras={<Extras />}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["z", "Z-score"],
            ["t", "T-score"],
            ["chi2", "Chi-Square (χ²)"],
            ["f", "F-statistic"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
              (kind === k
                ? "border-primary/60 bg-primary/15 text-foreground"
                : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>
      <PValueTool kind={kind} />
    </MathCalcPage>
  );
}

/* ============================================================
   Tool
   ============================================================ */

interface ToolResult {
  stat: number;
  spec: DistSpec;
  tail: Tail;
  alpha: number;
  p: number;
  crit: number | [number, number];
}

function PValueTool({ kind }: { kind: Kind }) {
  // Defaults tuned to each distribution so the initial view looks reasonable.
  const defaults: Record<Kind, { stat: string; df1: string; df2: string; tail: Tail }> = {
    z: { stat: "1.96", df1: "", df2: "", tail: "two" },
    t: { stat: "2.5", df1: "20", df2: "", tail: "two" },
    chi2: { stat: "7.815", df1: "3", df2: "", tail: "right" },
    f: { stat: "3.10", df1: "3", df2: "20", tail: "right" },
  };
  const d = defaults[kind];
  const [stat, setStat] = useState(d.stat);
  const [df1, setDf1] = useState(d.df1);
  const [df2, setDf2] = useState(d.df2);
  const [alpha, setAlpha] = useState("0.05");
  const [tail, setTail] = useState<Tail>(d.tail);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<ToolResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Reset when switching kinds.
  useMemo(() => {
    const nd = defaults[kind];
    setStat(nd.stat);
    setDf1(nd.df1);
    setDf2(nd.df2);
    setTail(nd.tail);
    setErr(null);
    setRes(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  function run() {
    setErr(null);
    const s = Number(stat);
    const a = Number(alpha);
    if (!Number.isFinite(s)) return setErr("Enter a valid test statistic.");
    if (!Number.isFinite(a) || a <= 0 || a >= 1)
      return setErr("Significance level α must be between 0 and 1 (e.g. 0.05).");
    let spec: DistSpec;
    if (kind === "z") spec = { kind: "z" };
    else if (kind === "t") {
      const v = Number(df1);
      if (!Number.isFinite(v) || v <= 0) return setErr("Enter degrees of freedom > 0.");
      spec = { kind: "t", df1: v };
    } else if (kind === "chi2") {
      const v = Number(df1);
      if (!Number.isFinite(v) || v <= 0) return setErr("Enter degrees of freedom > 0.");
      if (s < 0) return setErr("Chi-square statistic cannot be negative.");
      spec = { kind: "chi2", df1: v };
    } else {
      const v1 = Number(df1),
        v2 = Number(df2);
      if (!Number.isFinite(v1) || v1 <= 0 || !Number.isFinite(v2) || v2 <= 0)
        return setErr("Enter both degrees of freedom > 0.");
      if (s < 0) return setErr("F statistic cannot be negative.");
      spec = { kind: "f", df1: v1, df2: v2 };
    }
    const p = pValueFor(s, spec, tail);
    const crit = criticalFor(a, spec, tail);
    setRes({ stat: s, spec, tail, alpha: a, p, crit });
  }

  const statLabel =
    kind === "z"
      ? "Z-score"
      : kind === "t"
        ? "T-score (t)"
        : kind === "chi2"
          ? "Chi-square (χ²)"
          : "F statistic";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={statLabel}>
          <TextInput value={stat} onChange={(e) => setStat(e.target.value)} inputMode="decimal" />
        </Field>
        <Field label="Significance level α">
          <TextInput value={alpha} onChange={(e) => setAlpha(e.target.value)} inputMode="decimal" />
        </Field>
        {kind === "t" && (
          <Field label="Degrees of freedom (df)">
            <TextInput value={df1} onChange={(e) => setDf1(e.target.value)} inputMode="decimal" />
          </Field>
        )}
        {kind === "chi2" && (
          <Field label="Degrees of freedom (df)">
            <TextInput value={df1} onChange={(e) => setDf1(e.target.value)} inputMode="decimal" />
          </Field>
        )}
        {kind === "f" && (
          <>
            <Field label="Numerator df (df₁)">
              <TextInput value={df1} onChange={(e) => setDf1(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Denominator df (df₂)">
              <TextInput value={df2} onChange={(e) => setDf2(e.target.value)} inputMode="decimal" />
            </Field>
          </>
        )}
      </div>

      <Field label="Tail">
        <div className="flex flex-wrap gap-2">
          {TAILS.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setTail(t.v)}
              className={
                "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                (tail === t.v
                  ? "border-primary/60 bg-primary/15 text-foreground"
                  : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        {(kind === "chi2" || kind === "f") && tail === "left" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Note: chi-square and F tests are almost always right-tailed. Left-tailed p-values are computed for completeness but rarely reported.
          </p>
        )}
      </Field>

      <PrimaryButton onClick={run}>Calculate p-value</PrimaryButton>
      {err && <ErrorBox message={err} />}

      {res && (
        <div ref={resultRef} className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="p-value" value={fmtP(res.p)} big />
            <Stat
              label={`Significant at α = ${res.alpha}?`}
              value={res.p <= res.alpha ? "Yes — reject H₀" : "No — fail to reject H₀"}
              tone={res.p <= res.alpha ? "good" : "muted"}
            />
            <Stat
              label="Critical value"
              value={Array.isArray(res.crit) ? `±${fmt(res.crit[1], 4)}` : fmt(res.crit, 4)}
            />
          </div>

          <p className="mt-4 text-sm text-foreground">
            A p-value of <strong>{fmtP(res.p)}</strong> means there is roughly a{" "}
            <strong>{formatPercent(res.p)}</strong> probability of observing a test statistic at least
            as extreme as <strong>{fmt(res.stat, 4)}</strong>{" "}
            {res.tail === "two"
              ? "(in either direction) "
              : res.tail === "right"
                ? "(in the upper tail) "
                : "(in the lower tail) "}
            if the null hypothesis were true.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {res.p <= res.alpha
              ? `Because p ≤ α (${fmtP(res.p)} ≤ ${res.alpha}), the result is statistically significant at the ${res.alpha} level — reject H₀.`
              : `Because p > α (${fmtP(res.p)} > ${res.alpha}), the result is not statistically significant at the ${res.alpha} level — fail to reject H₀.`}
          </p>

          <div className="mt-5">
            <DistDiagram res={res} />
          </div>

          <SolutionSteps steps={buildSteps(res)} />

          <div className="mt-4">
            <ResultActions
              captureRef={resultRef}
              filename={`p-value-${res.spec.kind}`}
              getCopyText={() => summaryText(res)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function formatPercent(p: number): string {
  if (!Number.isFinite(p)) return "—";
  if (p < 0.0001) return (p * 100).toExponential(2) + "%";
  return (p * 100).toFixed(2) + "%";
}

function summaryText(res: ToolResult): string {
  const distLabel =
    res.spec.kind === "z"
      ? "Z"
      : res.spec.kind === "t"
        ? `T(df=${res.spec.df1})`
        : res.spec.kind === "chi2"
          ? `χ²(df=${res.spec.df1})`
          : `F(df₁=${res.spec.df1}, df₂=${res.spec.df2})`;
  const crit = Array.isArray(res.crit) ? `±${fmt(res.crit[1], 4)}` : fmt(res.crit, 4);
  return [
    `P-Value Calculator`,
    `Distribution: ${distLabel}`,
    `Statistic: ${fmt(res.stat, 4)}   Tail: ${res.tail}   α: ${res.alpha}`,
    `p-value: ${fmtP(res.p)}`,
    `Critical value: ${crit}`,
    `Decision: ${res.p <= res.alpha ? "Reject H₀" : "Fail to reject H₀"}`,
  ].join("\n");
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
          (tone === "good" ? "text-primary" : tone === "muted" ? "text-muted-foreground" : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   Steps
   ============================================================ */

function buildSteps(res: ToolResult): Step[] {
  const { spec, stat, tail, p } = res;
  const distName =
    spec.kind === "z"
      ? "standard normal"
      : spec.kind === "t"
        ? `Student t with df = ${spec.df1}`
        : spec.kind === "chi2"
          ? `chi-square with df = ${spec.df1}`
          : `F with df₁ = ${spec.df1}, df₂ = ${spec.df2}`;
  const cdfAt =
    spec.kind === "z"
      ? normalCDF(stat)
      : spec.kind === "t"
        ? tCDF(stat, spec.df1!)
        : spec.kind === "chi2"
          ? chiSquareCDF(stat, spec.df1!)
          : fCDF(stat, spec.df1!, spec.df2!);

  const tailExplain =
    tail === "left"
      ? `p = P(X ≤ ${fmt(stat, 4)}) = CDF(${fmt(stat, 4)}) = ${fmtP(cdfAt)}`
      : tail === "right"
        ? `p = P(X ≥ ${fmt(stat, 4)}) = 1 − CDF(${fmt(stat, 4)}) = 1 − ${fmtP(cdfAt)} = ${fmtP(1 - cdfAt)}`
        : spec.kind === "z" || spec.kind === "t"
          ? `p = 2 · P(X ≥ |${fmt(stat, 4)}|) = 2 · (1 − CDF(${fmt(Math.abs(stat), 4)})) = ${fmtP(p)}`
          : `p = 2 · min(CDF, 1 − CDF) = ${fmtP(p)}`;

  return [
    {
      title: "Given",
      body: (<FormulaBlock><>
          The test statistic is compared against the <strong>{distName}</strong> distribution.
        </></FormulaBlock>),
    },
    {
      title: "Formula",
      body: (<FormulaBlock><>
          CDF({fmt(stat, 4)}) = <strong>{fmtP(cdfAt)}</strong> — the probability of getting a value ≤{" "}
          {fmt(stat, 4)} under the null hypothesis.
        </></FormulaBlock>),
    },
    {
      title: "Substitute",
      body: <FormulaBlock><span className="font-serif italic text-xs">{tailExplain}</span></FormulaBlock>,
    },
    {
      title: "Answer",
      body: (<FormulaBlock><>
          {res.p <= res.alpha
            ? `p = ${fmtP(res.p)} is ≤ α = ${res.alpha}. Reject H₀ — the result is statistically significant.`
            : `p = ${fmtP(res.p)} is > α = ${res.alpha}. Fail to reject H₀ — insufficient evidence at this significance level.`}
        </></FormulaBlock>),
    },
  ];
}

/* ============================================================
   Diagram — shaded p-value area on the reference distribution
   ============================================================ */

function DistDiagram({ res }: { res: ToolResult }) {
  const { spec, stat, tail, crit } = res;
  const W = 560;
  const H = 200;
  const pad = 30;

  // Choose an x-window that comfortably contains statistic and critical value(s).
  let xMin: number, xMax: number;
  if (spec.kind === "z" || spec.kind === "t") {
    const maxAbs = Math.max(4, Math.abs(stat) + 1, Array.isArray(crit) ? crit[1] + 1 : Math.abs(crit) + 1);
    xMin = -maxAbs;
    xMax = maxAbs;
  } else {
    xMin = 0;
    const critMax = Array.isArray(crit) ? crit[1] : crit;
    const df = spec.df1!;
    const modeGuess = spec.kind === "chi2" ? df + 5 : Math.max(3, df / (df + 2) + 2);
    xMax = Math.max(stat * 1.3 + 1, critMax * 1.3 + 1, modeGuess * 2);
  }

  const pdf = (x: number): number => {
    if (spec.kind === "z") return normalPDF(x);
    if (spec.kind === "t") return tPDF(x, spec.df1!);
    if (spec.kind === "chi2") return chiSquarePDF(x, spec.df1!);
    return fPDF(x, spec.df1!, spec.df2!);
  };

  const N = 220;
  const pts: [number, number][] = [];
  let maxY = 0;
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = pdf(x);
    if (Number.isFinite(y) && y > maxY) maxY = y;
    pts.push([x, Number.isFinite(y) ? y : 0]);
  }
  if (maxY <= 0) maxY = 1;
  const px = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
  const py = (y: number) => H - pad - (y / maxY) * (H - 2 * pad);

  const curve =
    "M " + pts.map(([x, y]) => `${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" L ");

  const shadePath = (from: number, to: number) => {
    const filt = pts.filter(([x]) => x >= from && x <= to);
    if (filt.length < 2) return "";
    const f = filt[0],
      l = filt[filt.length - 1];
    return (
      `M ${px(f[0]).toFixed(1)},${py(0).toFixed(1)} ` +
      filt.map(([x, y]) => `L ${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" ") +
      ` L ${px(l[0]).toFixed(1)},${py(0).toFixed(1)} Z`
    );
  };

  // Shaded p-value region(s): the area(s) at least as extreme as the observed stat.
  const shades: string[] = [];
  if (tail === "right") shades.push(shadePath(stat, xMax));
  else if (tail === "left") shades.push(shadePath(xMin, stat));
  else if (spec.kind === "z" || spec.kind === "t") {
    const a = Math.abs(stat);
    shades.push(shadePath(xMin, -a));
    shades.push(shadePath(a, xMax));
  } else {
    // asymmetric two-tailed on chi²/F — shade whichever tail is smaller × 2 visually
    const cdf =
      spec.kind === "chi2"
        ? chiSquareCDF(stat, spec.df1!)
        : fCDF(stat, spec.df1!, spec.df2!);
    if (cdf > 0.5) shades.push(shadePath(stat, xMax));
    else shades.push(shadePath(xMin, stat));
  }

  const critLines: number[] = Array.isArray(crit) ? [crit[0], crit[1]] : [crit as number];
  const statClamped = Math.max(xMin, Math.min(xMax, stat));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Reference distribution with the shaded p-value area and the observed test statistic marked"
    >
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className="stroke-muted-foreground/40" strokeWidth={1} />
      {shades.map((d, i) => (
        <path key={i} d={d} className="fill-destructive/30" />
      ))}
      <path d={curve} className="fill-none stroke-primary" strokeWidth={2} />
      {critLines.map((c, i) => {
        if (c < xMin || c > xMax) return null;
        return (
          <g key={i}>
            <line x1={px(c)} y1={pad} x2={px(c)} y2={H - pad} className="stroke-muted-foreground/60" strokeDasharray="4 3" />
            <text x={px(c)} y={H - pad + 14} textAnchor="middle" className="fill-muted-foreground text-[11px]">
              {fmt(c, 3)}
            </text>
          </g>
        );
      })}
      <line
        x1={px(statClamped)}
        y1={pad - 6}
        x2={px(statClamped)}
        y2={H - pad}
        className="stroke-foreground"
        strokeWidth={1.5}
      />
      <circle cx={px(statClamped)} cy={py(pdf(statClamped))} r={4} className="fill-foreground" />
      <text x={px(statClamped)} y={pad - 10} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
        stat = {fmt(stat, 3)}
      </text>
      <text x={W - pad} y={H - 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
        shaded area = p-value
      </text>
    </svg>
  );
}

/* ============================================================
   Extras — educational content
   ============================================================ */

const PV_GUIDE: GuideCardItem[] = [
  {
    key: "def",
    title: "1. What a p-value actually is",
    explain:
      "The p-value is the probability of a test statistic at least as extreme as the observed one, given H₀ is true. It is P(data | H₀), not P(H₀ | data). Small p ⇒ the data would be surprising under H₀ — evidence against H₀.",
    formula: <>p = P(|T| ≥ |t_obs| | H₀)</>,
    legend: [
      { sym: "T", def: "reference distribution (Z, t, χ², F)" },
      { sym: "t_obs", def: "observed test statistic" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M10 95 Q 120 5 230 95" className="fill-none stroke-primary" strokeWidth="1.5" />
          <path d="M180 95 L 230 95 Q 205 55 195 95 Z" className="fill-destructive/30 stroke-destructive" />
          <line x1="180" y1="20" x2="180" y2="95" strokeDasharray="3 3" className="stroke-destructive" />
          <text x="180" y="16" fontSize="9" textAnchor="middle" className="fill-destructive">t_obs</text>
          <text x="210" y="108" fontSize="9" textAnchor="middle" className="fill-destructive">tail area = p</text>
        </svg>
      </div>
    ),
    example: {
      given: "Z = 1.96, two-tailed",
      substitute: "p = 2·(1 − Φ(1.96)) = 2·0.025",
      answer: "p ≈ 0.050",
    },
  },
  {
    key: "tails",
    title: "2. One-tailed vs two-tailed",
    explain:
      "Two-tailed asks 'different from H₀' in either direction. One-tailed asks a strictly directional question. For symmetric Z and t distributions, two-tailed p = 2 × one-tailed p. Choose one-tailed only when the direction is fixed before seeing the data.",
    formula: <>two-tailed p = 2 · min(F(t), 1 − F(t))</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M10 95 Q 120 5 230 95" className="fill-none stroke-primary" strokeWidth="1.5" />
          <path d="M10 95 L 55 95 Q 40 65 30 95 Z" className="fill-destructive/30 stroke-destructive" />
          <path d="M230 95 L 185 95 Q 200 65 210 95 Z" className="fill-destructive/30 stroke-destructive" />
          <text x="30" y="108" fontSize="9" textAnchor="middle" className="fill-destructive">α/2</text>
          <text x="210" y="108" fontSize="9" textAnchor="middle" className="fill-destructive">α/2</text>
          <text x="120" y="30" fontSize="9" textAnchor="middle" className="fill-muted-foreground">two-tailed</text>
        </svg>
      </div>
    ),
    example: {
      given: "t = 2.5, df = 20, right-tail P = 0.0106",
      substitute: "two-tailed = 2 × 0.0106",
      answer: "p ≈ 0.0212",
    },
  },
  {
    key: "dist",
    title: "3. Four distributions in one place",
    explain:
      "The page computes exact CDFs for Z (via erf), t and F (regularised incomplete beta), and χ² (regularised lower incomplete gamma). χ² and F tests are naturally right-tailed because both statistics are always non-negative — larger values mean more disagreement with H₀.",
    formula: <>Z · t(df) · χ²(df) · F(df₁, df₂)</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-primary/50 bg-primary/10 p-2 text-primary">Z — normal, symmetric</div>
          <div className="rounded-lg border border-primary/50 bg-primary/10 p-2 text-primary">t(df) — heavier tails</div>
          <div className="rounded-lg border border-primary/50 bg-primary/10 p-2 text-primary">χ²(df) — right-tailed</div>
          <div className="rounded-lg border border-primary/50 bg-primary/10 p-2 text-primary">F(df₁, df₂) — right-tailed</div>
        </div>
      </div>
    ),
    example: {
      given: "χ² = 7.815, df = 3",
      substitute: "p = 1 − F_χ²(7.815; 3)",
      answer: "p ≈ 0.050",
    },
  },
  {
    key: "decide",
    title: "4. Comparing p to α — decision rule",
    explain:
      "Fix α in advance based on the cost of a false positive. If p ≤ α, reject H₀; otherwise fail to reject. 'Fail to reject' is not proof of H₀ — it means this sample lacked evidence to rule it out. Always report an effect size alongside p.",
    formula: <>reject H₀ if p ≤ α · else fail to reject</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded-lg bg-primary/10 py-1 text-primary">p &lt; 0.001 → very strong evidence</div>
          <div className="rounded-lg bg-primary/10 py-1 text-primary">p &lt; 0.01 → strong evidence</div>
          <div className="rounded-lg bg-primary/10 py-1 text-primary">p &lt; 0.05 → conventional threshold</div>
          <div className="rounded-lg bg-secondary/40 py-1 text-foreground">p ≥ 0.10 → insufficient evidence</div>
        </div>
      </div>
    ),
    example: {
      given: "p = 0.0212, α = 0.05",
      substitute: "0.0212 ≤ 0.05",
      answer: "reject H₀",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="P-value explained, step by step">
        <p>
          A p-value is the probability of a test statistic at least as extreme
          as the one observed, assuming H₀ is true. Each card walks through one
          piece of what this calculator computes.
        </p>
        <GuideCards items={PV_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Four distributions on one page — Z, T, χ², F — with the same clean UI.",
            "Exact p-values from the CDFs (normal via erf, t and F via the regularised incomplete beta, χ² via the regularised lower incomplete gamma). No table lookups.",
            "One-, two- and left-tailed p-values all supported.",
            "A shaded distribution diagram showing exactly which area equals your p-value.",
            "Automatic significance verdict at your chosen α, with a plain-language interpretation sentence.",
            "Full step-by-step working — CDF, tail conversion and α comparison — visible with one click.",
            "Copy the result panel as text or download it as a PNG.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            {
              q: "Is p = 0.05 a magic number?",
              a: "No. It's a convention traceable to Fisher's early-20th-century writings. Many statisticians today argue it is too lax (see Benjamin et al. 2018 proposing p < 0.005 for new claims) or that fixed thresholds should be abandoned in favour of reporting the actual p-value plus an effect size.",
            },
            {
              q: "Can I say H₀ is 'accepted' when p > 0.05?",
              a: "No. The correct language is 'fail to reject H₀'. Failing to reject is not the same as proving true — the true parameter may differ from the null; you just do not have enough evidence to detect it with this sample.",
            },
            {
              q: "Why do chi-square and F tests only use the right tail?",
              a: "Both χ² and F are ratios of variances / squared deviations, which are always non-negative. Larger values mean bigger disagreement with the null, so the 'extreme' evidence lives entirely in the right tail.",
            },
            {
              q: "How do I choose the significance level α?",
              a: "It depends on the cost of a false positive in your field. Rough guide: α = 0.10 for exploratory work, 0.05 for standard reporting, 0.01 for confirmatory studies, and much smaller (10⁻⁶ or below) for particle physics or genome-wide studies.",
            },
            {
              q: "What is a critical value and how does it relate to the p-value?",
              a: "The critical value is the threshold on the test statistic beyond which you would reject H₀ at level α. If |statistic| > critical value (two-tailed), then p < α — the two decisions always agree.",
            },
            {
              q: "Can I compute a p-value without knowing the exact distribution?",
              a: "Yes, via resampling techniques like permutation tests and the bootstrap. Those build an empirical null distribution from the data itself. This calculator handles the four classical parametric distributions.",
            },
          ]}
        />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/t-test-calculator", label: "T-Test Calculator" },
            { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
            { to: "/calculators/math/confidence-interval-calculator", label: "Confidence Interval Calculator" },
            { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
          ]}
        />
        <p className="text-sm">
          Need to compute a specific test statistic first?{" "}
          <Link to="/calculators/math/t-test-calculator" className="text-primary hover:underline">
            Run a t-test
          </Link>{" "}
          or{" "}
          <Link to="/calculators/math/z-score-calculator" className="text-primary hover:underline">
            look up a Z-score
          </Link>{" "}
          and paste the resulting statistic here.
        </p>
      </CalcSection>
    </>
  );
}

