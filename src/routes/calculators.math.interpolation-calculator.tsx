import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
  ResultBox,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  FormulaWithLegend,
  WorkedExample,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

export const Route = createFileRoute("/calculators/math/interpolation-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Interpolation Calculator",
      title:
        "Linear Interpolation Calculator — Estimate y from Two Points",
      metaDescription:
        "Enter two known points and a target x — get the interpolated y with a slope step, formula substitution, and a diagram.",
      canonicalUrl: "/calculators/math/interpolation-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Interpolation Calculator",
          path: "/calculators/math/interpolation-calculator",
        },
      ],
      faqs: [
        {
          q: "When is linear interpolation appropriate?",
          a: "Linear interpolation works well when the underlying relationship is close to a straight line over the small interval you're estimating in — think tabulated data with fine spacing, or physical measurements that change smoothly. It's a poor fit for highly curved data (exponential growth, sine waves) unless your two anchor points are very close together.",
        },
        {
          q: "What are the limitations of linear interpolation?",
          a: "It assumes the y value changes at a constant rate between your two anchor points. Any curvature, noise, or sudden shift between the points is lost. And once the target x moves outside [x₁, x₂] you're extrapolating, not interpolating — the estimate can drift quickly from reality.",
        },
        {
          q: "What's the difference between interpolation and extrapolation?",
          a: "Interpolation estimates a value inside the range of your known data (between x₁ and x₂). Extrapolation estimates outside that range. The same formula produces both, but extrapolation is much less reliable because you're assuming the linear trend continues where you have no evidence.",
        },
      ],
    }),
  component: InterpolationPage,
});

// ---------------- Math ----------------

interface Result {
  y: number;
  slope: number;
  mode: "interpolation" | "extrapolation";
  steps: Step[];
}

function fmt(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e10)) return v.toExponential(6);
  // 6 sig figs, strip trailing zeros
  return Number(v.toPrecision(10)).toString();
}

function compute(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
): Result {
  const slope = (y2 - y1) / (x2 - x1);
  const y = y1 + slope * (x - x1);
  const inside =
    (x >= Math.min(x1, x2) && x <= Math.max(x1, x2)) ? "interpolation" : "extrapolation";

  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <FormulaBlock>
          (x₁, y₁) = ({fmt(x1)}, {fmt(y1)}), (x₂, y₂) = ({fmt(x2)}, {fmt(y2)}), target x = {fmt(x)}
        </FormulaBlock>
      ),
    },
    {
      title: "Formula — linear interpolation",
      body: (
        <FormulaWithLegend
          formula={<>y = y₁ + ((y₂ − y₁) / (x₂ − x₁)) · (x − x₁)</>}
          legend={[
            { sym: "(x₁, y₁), (x₂, y₂)", def: "the two known points" },
            { sym: "m = (y₂ − y₁)/(x₂ − x₁)", def: "slope between them" },
            { sym: "x", def: "the target x you want y at" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — compute the slope m",
      body: (
        <FormulaBlock>
          m = ({fmt(y2)} − {fmt(y1)}) / ({fmt(x2)} − {fmt(x1)}) = {fmt(slope)}
        </FormulaBlock>
      ),
    },
    {
      title: "Substitute — apply the formula",
      body: (
        <FormulaBlock>
          y = {fmt(y1)} + {fmt(slope)} · ({fmt(x)} − {fmt(x1)}) = {fmt(y1)} + {fmt(slope * (x - x1))}
        </FormulaBlock>
      ),
    },
    {
      title: "Answer",
      body: <FormulaBlock>y = {fmt(y)}</FormulaBlock>,
    },
  ];

  if (inside === "extrapolation") {
    steps.push({
      title: "Note: this is extrapolation",
      body: (
        <p>
          Your target x = {fmt(x)} lies outside the known interval [
          {fmt(Math.min(x1, x2))}, {fmt(Math.max(x1, x2))}]. The formula still
          produces a value, but you're assuming the straight-line trend
          continues past the data you have — treat the answer as an estimate,
          not a measurement.
        </p>
      ),
    });
  }

  return { y, slope, mode: inside, steps };
}

// ---------------- Diagram ----------------

function InterpolationDiagram({
  x1,
  y1,
  x2,
  y2,
  x,
  y,
  mode,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x: number;
  y: number;
  mode: "interpolation" | "extrapolation";
}) {
  const W = 480;
  const H = 260;
  const PAD = 40;

  // Include target in the visible range so the point is on-screen
  const xs = [x1, x2, x];
  const ys = [y1, y2, y];
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xR = xMax - xMin || 1;
  const yR = yMax - yMin || 1;
  const xPad = xR * 0.15;
  const yPad = yR * 0.15;
  const xLo = xMin - xPad;
  const xHi = xMax + xPad;
  const yLo = yMin - yPad;
  const yHi = yMax + yPad;

  const px = (v: number) => PAD + ((v - xLo) / (xHi - xLo)) * (W - 2 * PAD);
  const py = (v: number) => H - PAD - ((v - yLo) / (yHi - yLo)) * (H - 2 * PAD);

  const p1 = { x: px(x1), y: py(y1) };
  const p2 = { x: px(x2), y: py(y2) };
  const pt = { x: px(x), y: py(y) };

  // Extend the line across the full plot area for extrapolation feel
  const slope = (y2 - y1) / (x2 - x1);
  const lineY = (xv: number) => y1 + slope * (xv - x1);
  const lineStart = { x: px(xLo), y: py(lineY(xLo)) };
  const lineEnd = { x: px(xHi), y: py(lineY(xHi)) };

  // Segment between anchor points (solid), rest of the line dashed
  const knownStart = px(Math.min(x1, x2));
  const knownEnd = px(Math.max(x1, x2));

  const axisColor = "var(--color-border)";
  const solidColor = "var(--color-primary)";
  const dashColor = "var(--color-muted-foreground)";
  const pointColor = mode === "interpolation" ? "var(--color-primary)" : "#f59e0b";

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">
        Line through the two known points
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Diagram showing the linear interpolation line between two points and the target x"
      >
        {/* axes */}
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          stroke={axisColor}
          strokeWidth={1}
        />
        <line
          x1={PAD}
          y1={PAD}
          x2={PAD}
          y2={H - PAD}
          stroke={axisColor}
          strokeWidth={1}
        />

        {/* full extrapolation line (dashed) */}
        <line
          x1={lineStart.x}
          y1={lineStart.y}
          x2={lineEnd.x}
          y2={lineEnd.y}
          stroke={dashColor}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />

        {/* known segment (solid) */}
        <line
          x1={knownStart}
          y1={py(lineY(xLo + (knownStart - PAD) / ((W - 2 * PAD) / (xHi - xLo))))}
          x2={knownEnd}
          y2={py(lineY(xLo + (knownEnd - PAD) / ((W - 2 * PAD) / (xHi - xLo))))}
          stroke={solidColor}
          strokeWidth={2.5}
        />

        {/* guide lines from target to axes */}
        <line
          x1={pt.x}
          y1={H - PAD}
          x2={pt.x}
          y2={pt.y}
          stroke={pointColor}
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.7}
        />
        <line
          x1={PAD}
          y1={pt.y}
          x2={pt.x}
          y2={pt.y}
          stroke={pointColor}
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.7}
        />

        {/* anchor points */}
        <circle cx={p1.x} cy={p1.y} r={5} fill={solidColor} />
        <circle cx={p2.x} cy={p2.y} r={5} fill={solidColor} />
        {/* target point */}
        <circle
          cx={pt.x}
          cy={pt.y}
          r={6}
          fill={pointColor}
          stroke="var(--color-background)"
          strokeWidth={2}
        />

        {/* labels */}
        <text
          x={p1.x + 8}
          y={p1.y - 8}
          fill="var(--color-foreground)"
          fontSize={11}
          fontFamily="monospace"
        >
          ({fmt(x1)}, {fmt(y1)})
        </text>
        <text
          x={p2.x + 8}
          y={p2.y - 8}
          fill="var(--color-foreground)"
          fontSize={11}
          fontFamily="monospace"
        >
          ({fmt(x2)}, {fmt(y2)})
        </text>
        <text
          x={pt.x + 10}
          y={pt.y + 4}
          fill={pointColor}
          fontSize={11}
          fontFamily="monospace"
          fontWeight="bold"
        >
          ({fmt(x)}, {fmt(y)})
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="inline-block h-0.5 w-4 align-middle bg-[var(--color-primary)]" />{" "}
          known segment
        </span>
        <span>
          <span className="inline-block h-0.5 w-4 align-middle border-t border-dashed border-muted-foreground" />{" "}
          line extended
        </span>
        <span>
          <span
            className="inline-block h-2 w-2 rounded-full align-middle"
            style={{ background: pointColor }}
          />{" "}
          target point ({mode})
        </span>
      </div>
    </div>
  );
}

// ---------------- Page ----------------

function InterpolationPage() {
  const [x1s, setX1s] = useState("10");
  const [y1s, setY1s] = useState("20");
  const [x2s, setX2s] = useState("30");
  const [y2s, setY2s] = useState("80");
  const [xs, setXs] = useState("18");
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const parsed = (): {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x: number;
  } | null => {
    const vs = [x1s, y1s, x2s, y2s, xs].map(Number);
    if (vs.some((v) => !Number.isFinite(v))) return null;
    return { x1: vs[0], y1: vs[1], x2: vs[2], y2: vs[3], x: vs[4] };
  };

  const onCalc = () => {
    setErr(null);
    setResult(null);
    const p = parsed();
    if (!p) {
      setErr("Please enter valid numeric values for all five inputs.");
      return;
    }
    if (p.x1 === p.x2) {
      setErr(
        "x₁ and x₂ must be different — with x₁ = x₂ the slope is undefined (a vertical line has no unique y for a given x).",
      );
      return;
    }
    setResult(compute(p.x1, p.y1, p.x2, p.y2, p.x));
  };

  const resultDisplay: ReactNode = result ? (
    <span className="font-mono">y = {fmt(result.y)}</span>
  ) : null;

  return (
    <MathCalcPage
      name="Interpolation Calculator"
      tagline="Estimate an unknown y value between (or just outside) two known points using linear interpolation. Enter both points and a target x — the calculator returns y along with the slope, the full formula substitution, and a diagram of the line."
      extras={
        <>
          <CalcSection title="What is interpolation?">
            <p>
              Interpolation is estimating a value <em>between</em> data points
              you already know. Suppose a thermometer logs 20 °C at 10:00 and
              80 °C at 30:00 (some odd chemistry experiment) — what was the
              temperature at 18:00? You don't have a reading at 18:00, but if
              you assume the temperature climbed at a steady rate over those
              twenty minutes, you can draw a straight line between the two
              known times and read off the value at 18:00. That's{" "}
              <strong>linear interpolation</strong>.
            </p>
            <p>
              The same idea shows up whenever you look something up in a table
              that doesn't list your exact value — steam tables, tax brackets,
              tabulated log values, currency conversions between two dated
              rates. If the underlying quantity changes smoothly across the
              gap, a straight-line estimate is usually good enough.
            </p>
          </CalcSection>

<CalcSection title="Linear interpolation, piece by piece">
            <p>
              Two known points anchor a straight line; the calculator walks
              through the slope, applies the interpolation formula, and flags
              whether your target x falls inside or outside the anchor range.
            </p>
            <GuideCards items={INTERP_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Accepts any two distinct anchor points — positive, negative, decimal, in any order",
                "Handles both interpolation (x inside [x₁, x₂]) and extrapolation (x outside), flagging the difference",
                "Shows the slope calculation before the interpolation formula so you can see where the number comes from",
                "SVG plot of the line with anchor points and target labelled — see whether your query point is a safe interpolation",
                "Guards against the x₁ = x₂ case where the slope is undefined",
                "Clean handling of very small and very large numbers via scientific notation when it helps",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "When is linear interpolation a good approximation?",
                  a: (
                    <p>
                      When the underlying function is smooth and your two
                      anchor points are close enough together that curvature
                      is negligible across the gap. Fine-grained tables (log
                      tables, steam tables), measurements at short intervals,
                      and locally linear physical processes all qualify. For
                      highly non-linear data, either shrink the interval or
                      switch to a higher-order method like polynomial or
                      spline interpolation.
                    </p>
                  ),
                },
                {
                  q: "What if my target x equals x₁ or x₂?",
                  a: (
                    <p>
                      Then the formula simply returns y₁ or y₂ respectively —
                      no interpolation is needed because you already have the
                      answer. The calculator handles both cases naturally.
                    </p>
                  ),
                },
                {
                  q: "Why can't x₁ equal x₂?",
                  a: (
                    <p>
                      Two points with the same x value describe a vertical
                      line, which has no unique y for a given x. The slope
                      formula divides by (x₂ − x₁), so the denominator would
                      be zero. Change one of the x values to get a well-defined
                      line.
                    </p>
                  ),
                },
                {
                  q: "How is this different from a regression line?",
                  a: (
                    <p>
                      Linear interpolation passes exactly through your two
                      given points. Linear regression fits a best-fit line
                      through many data points, minimising overall error but
                      generally missing each individual point. Use
                      interpolation when your two anchors are known exactly;
                      use regression when you have noisy data spread across
                      several observations.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                {
                  to: "/calculators/math/slope",
                  label: "Slope Calculator (coming soon)",
                },
                {
                  to: "/calculators/math/ratio-calculator",
                  label: "Ratio Calculator",
                },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-sm text-muted-foreground">
            First known point (x₁, y₁)
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="x₁" htmlFor="x1">
              <TextInput
                id="x1"
                value={x1s}
                onChange={(e) => setX1s(e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Field label="y₁" htmlFor="y1">
              <TextInput
                id="y1"
                value={y1s}
                onChange={(e) => setY1s(e.target.value)}
                inputMode="decimal"
              />
            </Field>
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm text-muted-foreground">
            Second known point (x₂, y₂)
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="x₂" htmlFor="x2">
              <TextInput
                id="x2"
                value={x2s}
                onChange={(e) => setX2s(e.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Field label="y₂" htmlFor="y2">
              <TextInput
                id="y2"
                value={y2s}
                onChange={(e) => setY2s(e.target.value)}
                inputMode="decimal"
              />
            </Field>
          </div>
        </div>

        <Field label="Target x — the value you want y at" htmlFor="xt">
          <TextInput
            id="xt"
            value={xs}
            onChange={(e) => setXs(e.target.value)}
            inputMode="decimal"
          />
        </Field>

        <PrimaryButton onClick={onCalc}>Interpolate</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <>
          <ResultBox
            label={
              result.mode === "interpolation"
                ? "Interpolated value"
                : "Extrapolated value (outside known range)"
            }
            value={resultDisplay}
            note={
              result.mode === "interpolation"
                ? `Slope between the two points: m = ${fmt(result.slope)}.`
                : `Slope m = ${fmt(result.slope)}. Target x is outside [x₁, x₂] — this is extrapolation and carries more uncertainty.`
            }
          />
          <InterpolationDiagram
            x1={Number(x1s)}
            y1={Number(y1s)}
            x2={Number(x2s)}
            y2={Number(y2s)}
            x={Number(xs)}
            y={result.y}
            mode={result.mode}
          />
          <StepsToggle steps={result.steps} />
        </>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function InterpMini() {
  return (
    <svg viewBox="0 0 220 110" className="w-full">
      <rect x="1" y="1" width="218" height="108" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <line x1="20" y1="90" x2="200" y2="90" stroke="var(--color-border)" />
      <line x1="20" y1="20" x2="20" y2="90" stroke="var(--color-border)" />
      <line x1="40" y1="80" x2="180" y2="30" stroke="var(--color-primary)" strokeWidth="2" />
      <circle cx="40" cy="80" r="4" fill="var(--color-primary)" />
      <circle cx="180" cy="30" r="4" fill="var(--color-primary)" />
      <circle cx="110" cy="55" r="4" fill="var(--color-foreground)" />
      <line x1="110" y1="55" x2="110" y2="90" stroke="var(--color-foreground)" strokeDasharray="3 3" />
      <text x="40" y="102" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">x₁</text>
      <text x="110" y="102" textAnchor="middle" fontSize="9" fill="var(--color-foreground)">x</text>
      <text x="180" y="102" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">x₂</text>
    </svg>
  );
}

function ExtrapMini() {
  return (
    <svg viewBox="0 0 220 110" className="w-full">
      <rect x="1" y="1" width="218" height="108" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <line x1="20" y1="90" x2="200" y2="90" stroke="var(--color-border)" />
      <line x1="60" y1="70" x2="150" y2="35" stroke="var(--color-primary)" strokeWidth="2" />
      <line x1="150" y1="35" x2="195" y2="17" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="4 3" opacity="0.7" />
      <circle cx="60" cy="70" r="4" fill="var(--color-primary)" />
      <circle cx="150" cy="35" r="4" fill="var(--color-primary)" />
      <circle cx="190" cy="19" r="4" fill="var(--color-destructive)" />
      <text x="105" y="100" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">safe: inside [x₁, x₂]</text>
      <text x="190" y="12" textAnchor="middle" fontSize="9" fill="var(--color-destructive)">risky</text>
    </svg>
  );
}

const INTERP_GUIDE: GuideCardItem[] = [
  {
    key: "formula",
    title: "The linear interpolation formula",
    explain: <>Two known points define a slope m = (y₂ − y₁)/(x₂ − x₁). Starting from (x₁, y₁), adding m·(x − x₁) lands on the y for any new x on that same straight line.</>,
    formula: <>y = y₁ + (y₂ − y₁) · (x − x₁) / (x₂ − x₁)</>,
    diagram: <InterpMini />,
    example: {
      given: <span className="font-mono">(10, 20), (30, 80), x = 18</span>,
      substitute: <>20 + (80 − 20)·(18 − 10)/(30 − 10)</>,
      answer: <span className="font-mono">y = 44</span>,
    },
  },
  {
    key: "extrap",
    title: "Interpolation vs extrapolation",
    explain: <>The same formula works for any x, but you only <em>trust</em> it inside [x₁, x₂]. Outside, you're assuming the straight line keeps going — errors grow the further you push past the data.</>,
    formula: <>trust when x ∈ [x₁, x₂] · caution otherwise</>,
    diagram: <ExtrapMini />,
    example: {
      given: <span className="font-mono">anchors at x=10, x=30 · query x=45</span>,
      substitute: <>x lies outside the sampled range</>,
      answer: <span className="font-mono">extrapolation — flagged</span>,
    },
  },
];
