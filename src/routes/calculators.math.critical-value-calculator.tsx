import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
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
import {
  normalInv,
  normalPDF,
  chiSquareInv,
  chiSquarePDF,
  fInv,
  fPDF,
  fmt,
} from "@/lib/math/p-value";
import { tInv, tPDF } from "@/lib/math/t-test";

type Dist = "z" | "t" | "chi" | "f";
type Tail = "left" | "right" | "two";

/* ============================================================
   Generic distribution diagram — shaded rejection region(s)
   ============================================================ */
function DistDiagram({
  pdf,
  xMin,
  xMax,
  markers,
  shade,
  label,
}: {
  pdf: (x: number) => number;
  xMin: number;
  xMax: number;
  markers: { x: number; label: string }[];
  shade: Array<{ from: number; to: number }>;
  label: string;
}) {
  const W = 560;
  const H = 200;
  const pad = 30;
  const N = 320;
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

  const shadePaths = shade.map(({ from, to }) => {
    const seg = pts.filter(([x]) => x >= from && x <= to);
    if (seg.length < 2) return "";
    return (
      `M ${px(seg[0][0]).toFixed(1)},${py(0).toFixed(1)} ` +
      seg.map(([x, y]) => `L ${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" ") +
      ` L ${px(seg[seg.length - 1][0]).toFixed(1)},${py(0).toFixed(1)} Z`
    );
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      <line
        x1={pad}
        y1={H - pad}
        x2={W - pad}
        y2={H - pad}
        className="stroke-muted-foreground/40"
        strokeWidth={1}
      />
      {shadePaths.map((d, i) => (
        <path key={i} d={d} className="fill-destructive/30" />
      ))}
      <path d={curve} className="fill-none stroke-primary" strokeWidth={2} />
      {markers.map((m, i) => {
        if (m.x < xMin || m.x > xMax) return null;
        return (
          <g key={i}>
            <line
              x1={px(m.x)}
              y1={pad}
              x2={px(m.x)}
              y2={H - pad}
              className="stroke-foreground"
              strokeDasharray="4 3"
            />
            <text
              x={px(m.x)}
              y={pad - 6}
              textAnchor="middle"
              className="fill-foreground text-[11px] font-medium"
            >
              {m.label}
            </text>
          </g>
        );
      })}
      <text
        x={W - pad}
        y={H - 4}
        textAnchor="end"
        className="fill-muted-foreground text-[10px]"
      >
        shaded area = rejection region
      </text>
    </svg>
  );
}

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

export const Route = createFileRoute("/calculators/math/critical-value-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Critical Value Calculator",
      title: "Critical Value Calculator — z, t, χ² and F",
      metaDescription:
        "Look up critical values for z, t, chi-square, and F distributions at any α with one- or two-tailed tests.",
      canonicalUrl: "/calculators/math/critical-value-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Critical Value Calculator", path: "/calculators/math/critical-value-calculator" },
      ],
      faqs: [
        {
          q: "What is a critical value?",
          a: "The cutoff a test statistic must exceed (or fall below) in order to reject the null hypothesis at your chosen significance level α. It is the 'threshold' companion to the p-value approach — if the observed test statistic lies in the shaded rejection region, you reject H₀.",
        },
        {
          q: "How do I choose between one-tailed and two-tailed?",
          a: "Two-tailed tests any difference (H₁: parameter ≠ value) and splits α between both tails. One-tailed tests a specific direction (H₁: parameter > or < value) and puts all of α in one tail. Decide before seeing the data.",
        },
        {
          q: "Which distribution should I use?",
          a: "Z for large-sample means or proportions with known σ, t for small-sample means with unknown σ (needs df = n − 1), chi-square for variance and goodness-of-fit / independence tests (needs df), and F for variance ratios and ANOVA (needs two df values, numerator and denominator).",
        },
        {
          q: "Are critical value and p-value approaches equivalent?",
          a: "Yes. 'Reject if the test statistic is in the rejection region' and 'reject if p ≤ α' always give the same decision when applied to the same data and same test. Some fields lean on tabled critical values (older textbooks); modern software leans on exact p-values.",
        },
        {
          q: "Why does my chi-square or F critical value only appear in the right tail?",
          a: "Because χ² and F are non-negative and right-skewed, the classic goodness-of-fit, independence and variance tests are naturally one-tailed on the upper side. Two-tailed χ² / F tests exist but are uncommon and require using both α/2 tails.",
        },
        {
          q: "What if I get 0 or infinity as a critical value?",
          a: "That usually means α is at or beyond a boundary (e.g. α = 0 or α = 1), or the degrees of freedom are too small to be meaningful. Check your inputs — typical α values are 0.10, 0.05 and 0.01.",
        },
      ],
    }),
  component: CriticalValuePage,
});

function CriticalValuePage() {
  return (
    <MathCalcPage
      name="Critical Value Calculator"
      tagline="Exact critical values for the Z, t, χ² and F distributions — with left, right and two-tailed support, a shaded rejection-region diagram and step-by-step working."
      extras={<Extras />}
    >
      <CriticalValueTool />
    </MathCalcPage>
  );
}

function Stat({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={
          (big ? "text-2xl " : "text-lg ") + "font-semibold text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}

interface Result {
  dist: Dist;
  tail: Tail;
  alpha: number;
  df1?: number;
  df2?: number;
  lower?: number;
  upper?: number;
  // for diagram
  pdf: (x: number) => number;
  xMin: number;
  xMax: number;
  markers: { x: number; label: string }[];
  shade: { from: number; to: number }[];
  distName: string;
  steps: Step[];
}


function CriticalValueTool() {
  const [dist, setDist] = useState<Dist>("z");
  const [tail, setTail] = useState<Tail>("two");
  const [alpha, setAlpha] = useState("0.05");
  const [df1, setDf1] = useState("15");
  const [df2, setDf2] = useState("10");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const needsDf1 = dist === "t" || dist === "chi" || dist === "f";
  const needsDf2 = dist === "f";
  const allowTwoTailed = dist === "z" || dist === "t" || dist === "chi" || dist === "f";
  const allowLeftTail = dist === "z" || dist === "t"; // symmetric only

  function run() {
    setErr(null);
    setRes(null);
    const a = Number(alpha);
    if (!Number.isFinite(a) || a <= 0 || a >= 1)
      return setErr("Significance level α must be strictly between 0 and 1.");

    let v1 = 0,
      v2 = 0;
    if (needsDf1) {
      v1 = Math.floor(Number(df1));
      if (!Number.isFinite(v1) || v1 < 1)
        return setErr("Degrees of freedom must be an integer ≥ 1.");
    }
    if (needsDf2) {
      v2 = Math.floor(Number(df2));
      if (!Number.isFinite(v2) || v2 < 1)
        return setErr("Second degrees of freedom must be an integer ≥ 1.");
    }
    if (!allowLeftTail && tail === "left") {
      return setErr(
        `${dist === "chi" ? "χ²" : "F"} is defined on [0, ∞) and right-skewed; left-tail critical values are not standard. Use two-tailed if you need both cutoffs.`,
      );
    }

    let lower: number | undefined;
    let upper: number | undefined;
    let pdf: (x: number) => number = normalPDF;
    let xMin = -4,
      xMax = 4;
    const markers: { x: number; label: string }[] = [];
    const shade: { from: number; to: number }[] = [];
    let distName = "";
    const steps: Step[] = [];

    const tailText =
      tail === "two"
        ? "two-tailed"
        : tail === "right"
          ? "right-tailed"
          : "left-tailed";
    const areaExpr =
      tail === "two"
        ? `α/2 = ${a}/2 = ${fmt(a / 2, 6)}`
        : `α = ${fmt(a, 6)}`;


    if (dist === "z") {
      distName = "Standard normal (Z)";
      pdf = normalPDF;
      xMin = -4;
      xMax = 4;
      if (tail === "two") {
        lower = normalInv(a / 2);
        upper = normalInv(1 - a / 2);
        markers.push({ x: lower, label: `−z = ${fmt(lower, 4)}` });
        markers.push({ x: upper, label: `+z = ${fmt(upper, 4)}` });
        shade.push({ from: xMin, to: lower });
        shade.push({ from: upper, to: xMax });
      } else if (tail === "right") {
        upper = normalInv(1 - a);
        markers.push({ x: upper, label: `z = ${fmt(upper, 4)}` });
        shade.push({ from: upper, to: xMax });
      } else {
        lower = normalInv(a);
        markers.push({ x: lower, label: `z = ${fmt(lower, 4)}` });
        shade.push({ from: xMin, to: lower });
      }
    } else if (dist === "t") {
      distName = `Student's t (df = ${v1})`;
      pdf = (x: number) => tPDF(x, v1);
      xMin = -5;
      xMax = 5;
      if (tail === "two") {
        upper = tInv(1 - a / 2, v1);
        lower = -upper;
        markers.push({ x: lower, label: `−t = ${fmt(lower, 4)}` });
        markers.push({ x: upper, label: `+t = ${fmt(upper, 4)}` });
        shade.push({ from: xMin, to: lower });
        shade.push({ from: upper, to: xMax });
      } else if (tail === "right") {
        upper = tInv(1 - a, v1);
        markers.push({ x: upper, label: `t = ${fmt(upper, 4)}` });
        shade.push({ from: upper, to: xMax });
      } else {
        lower = tInv(a, v1);
        markers.push({ x: lower, label: `t = ${fmt(lower, 4)}` });
        shade.push({ from: xMin, to: lower });
      }
    } else if (dist === "chi") {
      distName = `Chi-square (df = ${v1})`;
      pdf = (x: number) => chiSquarePDF(x, v1);
      // A reasonable window: 0 to mean + 4·sqrt(var) = df + 4·sqrt(2df)
      xMin = 0;
      xMax = Math.max(v1 + 4 * Math.sqrt(2 * v1), 10);
      if (tail === "two") {
        lower = chiSquareInv(a / 2, v1);
        upper = chiSquareInv(1 - a / 2, v1);
        xMax = Math.max(xMax, upper * 1.1);
        markers.push({ x: lower, label: `χ²ᴸ = ${fmt(lower, 4)}` });
        markers.push({ x: upper, label: `χ²ᵁ = ${fmt(upper, 4)}` });
        shade.push({ from: xMin, to: lower });
        shade.push({ from: upper, to: xMax });
      } else {
        // right (standard)
        upper = chiSquareInv(1 - a, v1);
        xMax = Math.max(xMax, upper * 1.1);
        markers.push({ x: upper, label: `χ² = ${fmt(upper, 4)}` });
        shade.push({ from: upper, to: xMax });
      }
    } else {
      distName = `F (df₁ = ${v1}, df₂ = ${v2})`;
      pdf = (x: number) => fPDF(x, v1, v2);
      xMin = 0;
      const rightCrit = fInv(1 - (tail === "two" ? a / 2 : a), v1, v2);
      xMax = Math.max(rightCrit * 1.3 + 1, 5);
      if (tail === "two") {
        lower = fInv(a / 2, v1, v2);
        upper = rightCrit;
        markers.push({ x: lower, label: `Fᴸ = ${fmt(lower, 4)}` });
        markers.push({ x: upper, label: `Fᵁ = ${fmt(upper, 4)}` });
        shade.push({ from: xMin, to: lower });
        shade.push({ from: upper, to: xMax });
      } else {
        upper = rightCrit;
        markers.push({ x: upper, label: `F = ${fmt(upper, 4)}` });
        shade.push({ from: upper, to: xMax });
      }
    }

    // ---- Build step-by-step working ----
    steps.push({
      title: "Given",
      body: (
        <>
          <MathNote>
            Distribution: {distName}. Tail type: {tailText}.
          </MathNote>
          <MathLine>α = {fmt(a, 6)}</MathLine>
        </>
      ),
    });

    steps.push({
      title: "Split α by tail type",
      body:
        tail === "two" ? (
          <>
            <MathNote>
              A two-tailed test splits α equally between both tails, so each tail holds α/2.
            </MathNote>
            <MathLine>tail area = α/2 = {a}/2 = {fmt(a / 2, 6)}</MathLine>
          </>
        ) : (
          <>
            <MathNote>
              A {tailText} test places the entire α in one tail.
            </MathNote>
            <MathLine>tail area = α = {fmt(a, 6)}</MathLine>
          </>
        ),
    });

    if (dist === "z") {
      steps.push({
        title: "Invert the standard normal CDF",
        body:
          tail === "two" ? (
            <>
              <MathNote>Solve Φ(z) = 1 − α/2 for the upper cutoff, then mirror it (Z is symmetric)</MathNote>
              <MathLine>Φ(z) = 1 − α/2 = {fmt(1 - a / 2, 6)}</MathLine>
              <MathLine>+z = Φ⁻¹({fmt(1 - a / 2, 6)}) = {fmt(upper!, 4)}</MathLine>
              <MathLine>−z = {fmt(lower!, 4)}</MathLine>
            </>
          ) : tail === "right" ? (
            <>
              <MathNote>Solve Φ(z) = 1 − α for the right-tail cutoff</MathNote>
              <MathLine>Φ(z) = 1 − α = {fmt(1 - a, 6)}</MathLine>
              <MathLine>z = Φ⁻¹({fmt(1 - a, 6)}) = {fmt(upper!, 4)}</MathLine>
            </>
          ) : (
            <>
              <MathNote>Solve Φ(z) = α for the left-tail cutoff</MathNote>
              <MathLine>Φ(z) = α = {fmt(a, 6)}</MathLine>
              <MathLine>z = Φ⁻¹({fmt(a, 6)}) = {fmt(lower!, 4)}</MathLine>
            </>
          ),
      });
    } else if (dist === "t") {
      steps.push({
        title: `Invert the t distribution at df = ${v1}`,
        body:
          tail === "two" ? (
            <>
              <MathNote>Solve P(T ≤ t) = 1 − α/2 with df = {v1}, then mirror it (t is symmetric)</MathNote>
              <MathLine>P(T ≤ t) = 1 − α/2 = {fmt(1 - a / 2, 6)}</MathLine>
              <MathLine>+t = t(α/2, {v1}) = {fmt(upper!, 4)}</MathLine>
              <MathLine>−t = {fmt(lower!, 4)}</MathLine>
            </>
          ) : tail === "right" ? (
            <>
              <MathNote>Right-tailed cutoff at df = {v1}</MathNote>
              <MathLine>t = t(α, {v1}) = t({fmt(a, 4)}, {v1}) = {fmt(upper!, 4)}</MathLine>
            </>
          ) : (
            <>
              <MathNote>Left-tailed cutoff at df = {v1}</MathNote>
              <MathLine>t = −t(α, {v1}) = −t({fmt(a, 4)}, {v1}) = {fmt(lower!, 4)}</MathLine>
            </>
          ),
      });
    } else if (dist === "chi") {
      steps.push({
        title: `Invert the χ² distribution at df = ${v1}`,
        body:
          tail === "two" ? (
            <>
              <MathNote>Two-tailed χ² uses both α/2 quantiles at df = {v1}</MathNote>
              <MathLine>χ²ᴸ = χ²(α/2, {v1}) = χ²({fmt(a / 2, 4)}, {v1}) = {fmt(lower!, 4)}</MathLine>
              <MathLine>χ²ᵁ = χ²(1 − α/2, {v1}) = χ²({fmt(1 - a / 2, 4)}, {v1}) = {fmt(upper!, 4)}</MathLine>
            </>
          ) : (
            <>
              <MathNote>Standard right-tailed χ² cutoff at df = {v1}</MathNote>
              <MathLine>χ² = χ²(1 − α, {v1}) = χ²({fmt(1 - a, 4)}, {v1}) = {fmt(upper!, 4)}</MathLine>
            </>
          ),
      });
    } else {
      steps.push({
        title: `Invert the F distribution at df₁ = ${v1}, df₂ = ${v2}`,
        body:
          tail === "two" ? (
            <>
              <MathNote>Two-tailed F uses both α/2 quantiles at df₁ = {v1}, df₂ = {v2}</MathNote>
              <MathLine>Fᴸ = F(α/2, {v1}, {v2}) = F({fmt(a / 2, 4)}, {v1}, {v2}) = {fmt(lower!, 4)}</MathLine>
              <MathLine>Fᵁ = F(1 − α/2, {v1}, {v2}) = F({fmt(1 - a / 2, 4)}, {v1}, {v2}) = {fmt(upper!, 4)}</MathLine>
            </>
          ) : (
            <>
              <MathNote>Standard right-tailed F cutoff at df₁ = {v1}, df₂ = {v2}</MathNote>
              <MathLine>F = F(1 − α, {v1}, {v2}) = F({fmt(1 - a, 4)}, {v1}, {v2}) = {fmt(upper!, 4)}</MathLine>
            </>
          ),
      });
    }

    steps.push({
      title: "Answer — rejection rule",
      body:
        tail === "two" ? (
          <>
            <MathNote>Reject H₀ whenever the test statistic falls outside the two cutoffs</MathNote>
            <MathLine>reject H₀ if statistic &lt; {fmt(lower!, 4)} or statistic &gt; {fmt(upper!, 4)}</MathLine>
          </>
        ) : tail === "right" ? (
          <>
            <MathNote>Reject H₀ whenever the test statistic exceeds the cutoff</MathNote>
            <MathLine>reject H₀ if statistic &gt; {fmt(upper!, 4)}</MathLine>
          </>
        ) : (
          <>
            <MathNote>Reject H₀ whenever the test statistic falls below the cutoff</MathNote>
            <MathLine>reject H₀ if statistic &lt; {fmt(lower!, 4)}</MathLine>
          </>
        ),
    });

    setRes({
      dist,
      tail,
      alpha: a,
      df1: needsDf1 ? v1 : undefined,
      df2: needsDf2 ? v2 : undefined,
      lower,
      upper,
      pdf,
      xMin,
      xMax,
      markers,
      shade,
      distName,
      steps,
    });

  }

  const summary = useMemo(() => {
    if (!res) return "";
    const lines: string[] = [
      `Critical value(s) — ${res.distName}`,
      `α = ${res.alpha}, tail = ${res.tail}`,
    ];
    if (res.lower !== undefined) lines.push(`Lower critical = ${fmt(res.lower, 6)}`);
    if (res.upper !== undefined) lines.push(`Upper critical = ${fmt(res.upper, 6)}`);
    lines.push(
      `Reject H₀ if test statistic falls in the shaded rejection region shown.`,
    );
    return lines.join("\n");
  }, [res]);

  return (
    <div className="space-y-5">
      {/* Distribution tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "z", label: "Z (normal)" },
            { id: "t", label: "t" },
            { id: "chi", label: "χ²" },
            { id: "f", label: "F" },
          ] as { id: Dist; label: string }[]
        ).map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              setDist(d.id);
              setRes(null);
              if ((d.id === "chi" || d.id === "f") && tail === "left") setTail("right");
            }}
            className={
              "rounded-full border px-3 py-1.5 text-sm transition " +
              (dist === d.id
                ? "border-primary/60 bg-primary/15 text-foreground"
                : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground")
            }
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Significance level α">
          <TextInput
            value={alpha}
            onChange={(e) => setAlpha(e.target.value)}
            inputMode="decimal"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["0.01", "0.05", "0.10"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAlpha(v)}
                className="rounded-full border border-border/60 bg-secondary/40 px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                α = {v}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Tail">
          <select
            value={tail}
            onChange={(e) => setTail(e.target.value as Tail)}
            className="w-full rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
          >
            {allowLeftTail && <option value="left">Left-tailed</option>}
            <option value="right">Right-tailed</option>
            {allowTwoTailed && <option value="two">Two-tailed</option>}
          </select>
        </Field>
        {needsDf1 && (
          <Field label={needsDf2 ? "Numerator df (df₁)" : "Degrees of freedom (df)"}>
            <TextInput
              value={df1}
              onChange={(e) => setDf1(e.target.value)}
              inputMode="numeric"
            />
          </Field>
        )}
        {needsDf2 && (
          <Field label="Denominator df (df₂)">
            <TextInput
              value={df2}
              onChange={(e) => setDf2(e.target.value)}
              inputMode="numeric"
            />
          </Field>
        )}
      </div>

      <PrimaryButton onClick={run}>Compute critical value</PrimaryButton>
      {err && <ErrorBox message={err} />}

      {res && (
        <div
          ref={resultRef}
          className="rounded-2xl border border-border/60 bg-secondary/30 p-5"
        >
          <div className="grid gap-3 md:grid-cols-3">
            {res.lower !== undefined && (
              <Stat
                label={res.tail === "two" ? "Lower critical" : "Critical value"}
                value={fmt(res.lower, 4)}
                big
              />
            )}
            {res.upper !== undefined && (
              <Stat
                label={
                  res.tail === "two"
                    ? "Upper critical"
                    : res.tail === "right"
                      ? "Critical value"
                      : "Upper"
                }
                value={fmt(res.upper, 4)}
                big
              />
            )}
            <Stat
              label="Distribution"
              value={res.distName}
            />
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            At α = <strong>{res.alpha}</strong> ({res.tail}-tailed), reject H₀ whenever
            the test statistic falls in the shaded region below.
          </p>

          <div className="mt-4">
            <DistDiagram
              pdf={res.pdf}
              xMin={res.xMin}
              xMax={res.xMax}
              markers={res.markers}
              shade={res.shade}
              label={`${res.distName} with ${res.tail}-tailed rejection region shaded at alpha = ${res.alpha}`}
            />
          </div>

          <StepsToggle steps={res.steps} />

          <div className="mt-4">

            <ResultActions
              captureRef={resultRef}
              filename="critical-value"
              getCopyText={() => summary}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Extras
   ============================================================ */

const CV_GUIDE: GuideCardItem[] = [
  {
    key: "region",
    title: "1. The rejection region — cutoff at α",
    explain:
      "The critical value is the boundary of the rejection region on the test-statistic axis. If your observed statistic lands past it, you reject H₀ at level α. It's the mirror image of the p-value approach — same decision, expressed as a cutoff instead of a probability.",
    formula: <>reject H₀ if |stat| ≥ critical value</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M20 90 Q70 15 120 55 T220 90" fill="none" className="stroke-primary" strokeWidth="2" />
          <path d="M180 90 L180 55 L220 55 L220 90 Z" className="fill-primary/25" />
          <line x1="180" y1="20" x2="180" y2="90" className="stroke-primary" strokeDasharray="3 3" />
          <text x="180" y="15" fontSize="9" textAnchor="middle" className="fill-primary">critical</text>
          <text x="200" y="80" fontSize="9" className="fill-primary">α</text>
        </svg>
      </div>
    ),
    example: {
      given: "one-tailed α = 0.05, Z",
      substitute: "z₀.₀₅",
      answer: "cutoff = 1.645",
    },
  },
  {
    key: "zt",
    title: "2. Symmetric distributions — Z and t use α/2",
    explain:
      "Z (standard normal) and t (Student) are symmetric around 0. A two-tailed test splits α between the two tails, so each tail gets α/2. Z has no df; t needs one df value (n − 1 for a one-sample mean) and its tails are heavier for small df.",
    formula: <>two-tailed: ±z<sub>α/2</sub> or ±t<sub>α/2, df</sub></>,
    legend: [{ sym: "df", def: "degrees of freedom (t only)" }],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M20 90 Q70 15 120 55 T220 90" fill="none" className="stroke-primary" strokeWidth="2" />
          <path d="M20 90 L20 78 L60 78 L60 90 Z" className="fill-primary/25" />
          <path d="M180 90 L180 78 L220 78 L220 90 Z" className="fill-primary/25" />
          <line x1="60" y1="30" x2="60" y2="90" className="stroke-primary" strokeDasharray="3 3" />
          <line x1="180" y1="30" x2="180" y2="90" className="stroke-primary" strokeDasharray="3 3" />
          <text x="40" y="75" fontSize="9" textAnchor="middle" className="fill-primary">α/2</text>
          <text x="200" y="75" fontSize="9" textAnchor="middle" className="fill-primary">α/2</text>
        </svg>
      </div>
    ),
    example: {
      given: "two-tailed α = 0.05, df = 15",
      substitute: "t₀.₀₂₅, ₁₅",
      answer: "±2.131",
    },
  },
  {
    key: "chif",
    title: "3. Right-skewed distributions — χ² and F",
    explain:
      "Chi-square and F live on [0, ∞) and are right-skewed, so the standard test is right-tailed with cutoff at 1 − α. Two-tailed forms exist for variance tests but are rare. Chi-square needs one df (k − 1 or (r − 1)(c − 1)); F needs two (numerator and denominator).",
    formula: <>χ²<sub>1−α</sub>(df) &nbsp; F<sub>1−α</sub>(df<sub>1</sub>, df<sub>2</sub>)</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M20 90 Q40 30 90 45 T220 90" fill="none" className="stroke-primary" strokeWidth="2" />
          <path d="M170 90 L170 68 L220 68 L220 90 Z" className="fill-primary/25" />
          <line x1="170" y1="35" x2="170" y2="90" className="stroke-primary" strokeDasharray="3 3" />
          <text x="170" y="30" fontSize="9" textAnchor="middle" className="fill-primary">χ²₁₋α</text>
          <text x="195" y="82" fontSize="9" className="fill-primary">α</text>
        </svg>
      </div>
    ),
    example: {
      given: "χ² independence, α = 0.05, df = 4",
      substitute: "χ²₀.₉₅(4)",
      answer: "cutoff = 9.488",
    },
  },
  {
    key: "vsp",
    title: "4. Critical value vs p-value — same decision",
    explain:
      "The critical-value approach fixes α and compares statistics; the p-value approach fixes the statistic and compares probabilities. Given the same test they always agree. Modern reports usually quote both because the p-value also conveys how extreme the result was.",
    formula: <>|stat| ≥ crit &nbsp;⇔&nbsp; p ≤ α</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded-lg bg-primary/10 py-1 text-primary">crit approach: compare stat to cutoff</div>
          <div className="rounded-lg bg-primary/10 py-1 text-primary">p approach: compare p to α</div>
          <div className="rounded-lg bg-primary/15 py-1 text-primary">both agree on the same data</div>
        </div>
      </div>
    ),
    example: {
      given: "z = 2.10 vs z₀.₀₂₅ = 1.96",
      substitute: "2.10 > 1.96 → reject",
      answer: "p ≈ 0.036 → same call",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="Critical values explained, step by step">
        <p>
          A critical value is just the cutoff a test statistic must cross to
          reject H₀ at level α. Each card below covers one distribution family
          the calculator supports.
        </p>
        <GuideCards items={CV_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Z, t, χ² and F critical values from a single form.",
            "One-tailed and two-tailed cutoffs — α is split into α/2 automatically for symmetric two-tailed tests.",
            "Requires only α and the relevant df; the tool picks the correct inverse-CDF for each distribution.",
            "Continuous inverse-CDF routines instead of table lookups, so values are accurate to full display precision.",
            "Shaded distribution diagram of the rejection region matching your inputs.",
            "Show / hide step-by-step working with the exact quantile expression.",
          ]}
        />
      </CalcSection>

      <CalcFAQ
        items={[
          {
            q: "Do I always need to know the degrees of freedom?",
            a: "For Z, no — the standard normal has no df parameter. For t and chi-square you need one df value, and for F you need two (numerator and denominator).",
          },
          {
            q: "Why is the two-tailed cutoff based on α/2?",
            a: "You split the total error budget α across both tails equally so that the combined false-positive rate stays at α. Each tail gets α/2.",
          },
          {
            q: "How large should df be to just use Z instead of t?",
            a: "Purists still prefer t whenever σ is estimated. As a practical rule of thumb, once df ≥ 30 the t and Z critical values agree to within about 5% for common α values, so many textbooks treat 'large' samples with Z.",
          },
          {
            q: "Can chi-square or F be two-tailed?",
            a: "Yes but it is rare. Testing a specific variance value H₀: σ² = σ₀² is one situation where a two-tailed chi-square with cutoffs χ²(α/2) and χ²(1 − α/2) is used. Goodness-of-fit and independence tests are always right-tailed.",
          },
          {
            q: "Why does my critical value not match the table exactly?",
            a: "Tables usually round to 2–3 decimals. This calculator uses continuous inverse-CDF routines, so small rounding differences are normal. The values agree to well within tabled precision.",
          },
          {
            q: "How is this different from a p-value calculator?",
            a: "A p-value calculator takes a test statistic and returns the tail probability. This calculator takes α and returns the cutoff on the test-statistic axis — the two are inverse operations.",
          },
        ]}
      />

      <RelatedLinks
        links={[
          { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
          { to: "/calculators/math/t-test-calculator", label: "T-Test Calculator" },
          { to: "/calculators/math/chi-square-calculator", label: "Chi-Square Calculator" },
          { to: "/calculators/math/f-test-calculator", label: "F-Test Calculator" },
          { to: "/calculators/math/anova-calculator", label: "ANOVA Calculator" },
          { to: "/calculators/math/p-value-calculator", label: "P-Value Calculator" },
        ]}
      />
    </>
  );
}
