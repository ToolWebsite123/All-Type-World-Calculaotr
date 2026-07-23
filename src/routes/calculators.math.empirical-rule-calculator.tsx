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
  FormulaBlock,
  FormulaWithLegend,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import type { Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import { normalCDF } from "@/lib/math/p-value";
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

export const Route = createFileRoute("/calculators/math/empirical-rule-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Empirical Rule Calculator (68-95-99.7)",
      title: "Empirical Rule Calculator — 68-95-99.7 Rule",
      metaDescription:
        "Apply the 68-95-99.7 rule to any normal distribution. Enter mean, SD, and a range to get probability and visual.",
      canonicalUrl: "/calculators/math/empirical-rule-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Empirical Rule Calculator",
          path: "/calculators/math/empirical-rule-calculator",
        },
      ],
      faqs: [
        {
          q: "What is the 68-95-99.7 rule?",
          a: "For a distribution that is approximately normal (bell-shaped and symmetric), about 68% of values lie within one standard deviation of the mean, about 95% within two, and about 99.7% within three. The three numbers are conventional approximations of exact normal probabilities (68.27%, 95.45%, 99.73%).",
        },
        {
          q: "Does the empirical rule work for any data?",
          a: "No. It only applies to distributions that are approximately normal. Skewed data, bimodal data or heavy-tailed data won't follow these percentages. If you're unsure, check a histogram first, or use Chebyshev's inequality for a distribution-free bound.",
        },
        {
          q: "How exact are the percentages?",
          a: "The rule uses rounded numbers. The exact areas under a normal curve are 68.27%, 95.45% and 99.73%. For anything more precise — like the probability of falling below or above a specific value — use the Z-score Calculator, which reports exact normal probabilities.",
        },
        {
          q: "What does 'within 2 standard deviations' actually mean?",
          a: "It means between μ − 2σ and μ + 2σ. If μ = 100 and σ = 15, that's the interval 70 to 130. About 95% of the distribution's values sit inside that interval; roughly 2.5% are below 70 and 2.5% are above 130.",
        },
        {
          q: "What percentage lies beyond 3 standard deviations?",
          a: "Only about 0.3% — roughly 0.15% below μ − 3σ and 0.15% above μ + 3σ. Data points that far from the mean are often flagged as outliers in normal populations.",
        },
        {
          q: "Is this the same as Chebyshev's rule?",
          a: "No. Chebyshev's inequality applies to any distribution and only guarantees a minimum share (e.g. at least 75% within 2 SD). The empirical rule is stronger but only valid for approximately normal data.",
        },
      ],
    }),
  component: EmpiricalRulePage,
});

/* ================================================================
   Bell curve with three shaded ±σ bands
   ================================================================ */

function BellCurve({
  mean,
  sd,
  x,
}: {
  mean: number;
  sd: number;
  x?: number;
}) {
  const W = 640;
  const H = 260;
  const padL = 20;
  const padR = 20;
  const padT = 14;
  const padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const zMin = -3.5;
  const zMax = 3.5;
  const N = 240;

  // Standard normal PDF used only for shape.
  const pdf = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const peak = pdf(0);

  const zToX = (z: number) =>
    padL + ((z - zMin) / (zMax - zMin)) * plotW;
  const pToY = (p: number) => padT + plotH - (p / peak) * plotH;

  // Build the smooth curve path.
  const path: string[] = [];
  for (let i = 0; i <= N; i++) {
    const z = zMin + (i / N) * (zMax - zMin);
    const y = pToY(pdf(z));
    path.push(`${i === 0 ? "M" : "L"} ${zToX(z).toFixed(2)} ${y.toFixed(2)}`);
  }
  const curvePath = path.join(" ");

  // Shaded band area between z=a and z=b down to baseline.
  const bandPath = (a: number, b: number) => {
    const parts: string[] = [`M ${zToX(a).toFixed(2)} ${(padT + plotH).toFixed(2)}`];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const z = a + (i / steps) * (b - a);
      parts.push(`L ${zToX(z).toFixed(2)} ${pToY(pdf(z)).toFixed(2)}`);
    }
    parts.push(`L ${zToX(b).toFixed(2)} ${(padT + plotH).toFixed(2)} Z`);
    return parts.join(" ");
  };

  const baselineY = padT + plotH;

  // Label formatter: keep integers as integers, otherwise up to 3 decimals.
  const fmtBound = (v: number) =>
    Number.isInteger(v) ? v.toString() : Number(v.toFixed(3)).toString();

  const bounds = [-3, -2, -1, 0, 1, 2, 3].map((k) => ({
    z: k,
    value: mean + k * sd,
  }));

  const xZ =
    x !== undefined && Number.isFinite(x) && sd > 0
      ? (x - mean) / sd
      : undefined;
  const xClamped =
    xZ !== undefined ? Math.max(zMin, Math.min(zMax, xZ)) : undefined;

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Bell curve with 68-95-99.7 bands for mean ${mean} and standard deviation ${sd}`}
        className="block w-full min-w-[420px]"
      >
        {/* baseline */}
        <line
          x1={padL}
          y1={baselineY}
          x2={padL + plotW}
          y2={baselineY}
          stroke="currentColor"
          className="text-border"
        />

        {/* Bands — draw widest first so darker inner ones sit on top. */}
        <path d={bandPath(-3, 3)} className="fill-primary/15" />
        <path d={bandPath(-2, 2)} className="fill-primary/30" />
        <path d={bandPath(-1, 1)} className="fill-primary/55" />

        {/* Curve outline */}
        <path
          d={curvePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="text-primary"
        />

        {/* Vertical rules at each ±kσ */}
        {bounds.map((b) => (
          <line
            key={b.z}
            x1={zToX(b.z)}
            y1={pToY(pdf(b.z))}
            x2={zToX(b.z)}
            y2={baselineY}
            stroke="currentColor"
            strokeDasharray={b.z === 0 ? "0" : "3 3"}
            className={b.z === 0 ? "text-primary" : "text-muted-foreground/60"}
          />
        ))}

        {/* Percentage labels in each band */}
        <text
          x={zToX(0)}
          y={pToY(pdf(0)) + 16}
          textAnchor="middle"
          fontSize="11"
          className="fill-foreground font-semibold"
        >
          ~68%
        </text>
        <text
          x={zToX(-1.5)}
          y={pToY(pdf(1.5)) - 6}
          textAnchor="middle"
          fontSize="10"
          className="fill-foreground"
        >
          ~13.5%
        </text>
        <text
          x={zToX(1.5)}
          y={pToY(pdf(1.5)) - 6}
          textAnchor="middle"
          fontSize="10"
          className="fill-foreground"
        >
          ~13.5%
        </text>
        <text
          x={zToX(-2.5)}
          y={pToY(pdf(2.5)) - 6}
          textAnchor="middle"
          fontSize="10"
          className="fill-muted-foreground"
        >
          ~2.35%
        </text>
        <text
          x={zToX(2.5)}
          y={pToY(pdf(2.5)) - 6}
          textAnchor="middle"
          fontSize="10"
          className="fill-muted-foreground"
        >
          ~2.35%
        </text>

        {/* x-axis boundary labels */}
        {bounds.map((b) => (
          <g key={`lbl-${b.z}`}>
            <text
              x={zToX(b.z)}
              y={baselineY + 14}
              textAnchor="middle"
              fontSize="10"
              className="fill-muted-foreground"
            >
              {b.z === 0 ? "μ" : b.z > 0 ? `μ+${b.z}σ` : `μ${b.z}σ`}
            </text>
            <text
              x={zToX(b.z)}
              y={baselineY + 26}
              textAnchor="middle"
              fontSize="10"
              className="fill-foreground"
            >
              {fmtBound(b.value)}
            </text>
          </g>
        ))}

        {/* Optional user X marker */}
        {xClamped !== undefined && (
          <>
            <line
              x1={zToX(xClamped)}
              y1={padT}
              x2={zToX(xClamped)}
              y2={baselineY}
              stroke="currentColor"
              strokeWidth={1.5}
              className="text-destructive"
            />
            <text
              x={zToX(xClamped)}
              y={padT - 2}
              textAnchor="middle"
              fontSize="10"
              className="fill-destructive font-semibold"
            >
              X = {fmtBound(x!)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

/* ================================================================
   Page
   ================================================================ */

function fmt(x: number, digits = 4): string {
  if (!Number.isFinite(x)) return "—";
  if (x === 0) return "0";
  return Number(x.toFixed(digits)).toString();
}

function EmpiricalRulePage() {
  const [meanStr, setMeanStr] = useState("75");
  const [sdStr, setSdStr] = useState("8");
  const [xStr, setXStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    mean: number;
    sd: number;
    bounds: { k: number; low: number; high: number; pct: number }[];
    x?: number;
    z?: number;
    band?: string;
    percentile?: number;
  } | null>(null);

  function compute() {
    setError(null);
    const mean = Number(meanStr);
    const sd = Number(sdStr);
    if (!Number.isFinite(mean)) {
      setResult(null);
      setError("Mean must be a number.");
      return;
    }
    if (!Number.isFinite(sd) || sd <= 0) {
      setResult(null);
      setError("Standard deviation must be a positive number.");
      return;
    }

    const bounds = [
      { k: 1, low: mean - sd, high: mean + sd, pct: 68 },
      { k: 2, low: mean - 2 * sd, high: mean + 2 * sd, pct: 95 },
      { k: 3, low: mean - 3 * sd, high: mean + 3 * sd, pct: 99.7 },
    ];

    let x: number | undefined;
    let z: number | undefined;
    let band: string | undefined;
    let percentile: number | undefined;
    if (xStr.trim() !== "") {
      const xv = Number(xStr);
      if (!Number.isFinite(xv)) {
        setResult(null);
        setError("X must be a number, or leave it blank.");
        return;
      }
      x = xv;
      z = (xv - mean) / sd;
      const az = Math.abs(z);
      if (az <= 1) band = "Within μ ± 1σ (central ~68%)";
      else if (az <= 2) band = "Between 1σ and 2σ from the mean (~13.5% band)";
      else if (az <= 3) band = "Between 2σ and 3σ from the mean (~2.35% band)";
      else band = "Beyond μ ± 3σ (~0.15% tail — often treated as an outlier)";
      percentile = normalCDF(z) * 100;
    }

    setResult({ mean, sd, bounds, x, z, band, percentile });
  }

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { mean, sd, bounds, x, z, band, percentile } = result;
    const base: Step[] = [
      {
        title: "Identify μ and σ",
        body: (
          <>
            <MathNote>The empirical rule needs the mean and standard deviation of an approximately normal distribution</MathNote>
            <MathLine>μ = {fmt(mean)}</MathLine>
            <MathLine>σ = {fmt(sd)}</MathLine>
            {x !== undefined && <MathLine>X = {fmt(x)}</MathLine>}
          </>
        ),
      },
      {
        title: "Apply the rule",
        body: (
          <>
            <MathNote>About 68% of values fall within 1σ, 95% within 2σ, and 99.7% within 3σ of the mean</MathNote>
            <MathLine>interval = μ ± kσ</MathLine>
            <MathLine>k = 1 → ~68%, &nbsp; k = 2 → ~95%, &nbsp; k = 3 → ~99.7%</MathLine>
          </>
        ),
      },
      {
        title: "Substitute and compute each bound",
        body: (
          <>
            <MathNote>Plug μ and σ into μ ± kσ for k = 1, 2, 3</MathNote>
            {bounds.map((b) => (
              <MathLine key={b.k}>
                μ ± {b.k}σ = {fmt(mean)} ± {b.k}·{fmt(sd)} = [{fmt(b.low)}, {fmt(b.high)}] → ~{b.pct}%
              </MathLine>
            ))}
          </>
        ),
      },
      {
        title: "Interpret the result",
        body: (
          <>
            <MathNote>Each interval captures the stated percentage of the distribution's values</MathNote>
            <MathLine>~68% lie in [{fmt(bounds[0].low)}, {fmt(bounds[0].high)}]</MathLine>
            <MathLine>~95% lie in [{fmt(bounds[1].low)}, {fmt(bounds[1].high)}]</MathLine>
            <MathLine>~99.7% lie in [{fmt(bounds[2].low)}, {fmt(bounds[2].high)}]</MathLine>
            {x !== undefined && z !== undefined && band && percentile !== undefined && (
              <>
                <MathNote>Locating X uses the z-score, the number of standard deviations from the mean</MathNote>
                <MathLine>z = (X − μ) / σ = ({fmt(x)} − {fmt(mean)}) / {fmt(sd)} = {fmt(z)}</MathLine>
                <MathLine>{band}</MathLine>
                <MathLine>percentile ≈ {fmt(percentile, 2)}%</MathLine>
              </>
            )}
          </>
        ),
      },
    ];
    return base;
  }, [result]);


  return (
    <MathCalcPage
      name="Empirical Rule Calculator"
      tagline="Apply the 68-95-99.7 rule to any normal distribution — enter mean and standard deviation to get the three ±σ ranges with a shaded bell-curve diagram."
      extras={<Extras />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Mean (μ)" htmlFor="er-mean">
          <TextInput
            id="er-mean"
            inputMode="decimal"
            value={meanStr}
            onChange={(e) => setMeanStr(e.target.value)}
            placeholder="75"
          />
        </Field>
        <Field label="Standard deviation (σ)" htmlFor="er-sd" hint="Positive number">
          <TextInput
            id="er-sd"
            inputMode="decimal"
            value={sdStr}
            onChange={(e) => setSdStr(e.target.value)}
            placeholder="8"
          />
        </Field>
        <Field
          label="Value X (optional)"
          htmlFor="er-x"
          hint="Check which band a value falls into"
        >
          <TextInput
            id="er-x"
            inputMode="decimal"
            value={xStr}
            onChange={(e) => setXStr(e.target.value)}
            placeholder="e.g. 90"
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
      </div>

      {error && <ErrorBox message={error} />}

      {result && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {result.bounds.map((b) => (
              <ResultBox
                key={b.k}
                label={`μ ± ${b.k}σ  →  ~${b.pct}%`}
                value={
                  <span>
                    [{fmt(b.low)}, {fmt(b.high)}]
                  </span>
                }
                note={`Range width = ${fmt(b.high - b.low)}.`}
              />
            ))}
          </div>

          {result.x !== undefined && (
            <div className="mt-3">
              <ResultBox
                label={`Where does X = ${fmt(result.x)} fall?`}
                value={
                  <span>
                    z = {fmt(result.z!)} · {result.band}
                  </span>
                }
                note={
                  <>
                    Approximate percentile from the standard normal ≈{" "}
                    <strong>{fmt(result.percentile!, 2)}%</strong>. For an exact
                    probability at any value, see the{" "}
                    <a
                      className="text-primary underline underline-offset-4"
                      href="/calculators/math/z-score-calculator"
                    >
                      Z-score Calculator
                    </a>
                    .
                  </>
                }
              />
            </div>
          )}

          <BellCurve mean={result.mean} sd={result.sd} x={result.x} />

          <StepsToggle steps={steps} />
        </>
      )}
    </MathCalcPage>
  );
}

/* ================================================================
   Extras (educational content)
   ================================================================ */

const ER_GUIDE: GuideCardItem[] = [
  {
    key: "68",
    title: "1. ~68% within ±1σ — the middle of the bell",
    explain:
      "About 68% of values in a roughly normal distribution sit within one standard deviation of the mean. Shift the mean and the band moves with it; change σ and the band widens or narrows.",
    formula: <>P(μ − σ ≤ X ≤ μ + σ) ≈ 0.6827</>,
    legend: [
      { sym: "μ", def: "mean" },
      { sym: "σ", def: "standard deviation" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 100" className="w-full max-w-[240px]" aria-hidden>
          <path d="M20 90 Q120 -10 220 90" fill="none" className="stroke-border" strokeWidth="1.5" />
          <path d="M90 90 Q120 15 150 90 Z" className="fill-primary/40" />
          <line x1="120" y1="90" x2="120" y2="15" className="stroke-primary" strokeDasharray="3 3" />
          <text x="120" y="85" fontSize="10" textAnchor="middle" className="fill-primary">68%</text>
        </svg>
      </div>
    ),
    example: {
      given: "μ = 75, σ = 8",
      substitute: "75 ± 8",
      answer: "[67, 83]",
    },
  },
  {
    key: "95",
    title: "2. ~95% within ±2σ — the working confidence band",
    explain:
      "Adding a second σ on each side captures about 95% of the distribution. This is why 2σ appears everywhere in applied statistics — from control-chart limits to the informal '95% confidence' shortcut.",
    formula: <>P(μ − 2σ ≤ X ≤ μ + 2σ) ≈ 0.9545</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 100" className="w-full max-w-[240px]" aria-hidden>
          <path d="M20 90 Q120 -10 220 90" fill="none" className="stroke-border" strokeWidth="1.5" />
          <path d="M60 90 Q120 5 180 90 Z" className="fill-primary/30" />
          <path d="M90 90 Q120 15 150 90 Z" className="fill-primary/50" />
          <text x="120" y="60" fontSize="10" textAnchor="middle" className="fill-primary">95%</text>
        </svg>
      </div>
    ),
    example: {
      given: "μ = 75, σ = 8",
      substitute: "75 ± 16",
      answer: "[59, 91]",
    },
  },
  {
    key: "997",
    title: "3. ~99.7% within ±3σ — 'almost everything'",
    explain:
      "Three sigmas on each side cover roughly 99.7% of the distribution — only about 0.3% of values fall outside. This is where the 'three-sigma rule' in quality control comes from, and why 3σ is a common outlier flag for normal data.",
    formula: <>P(μ − 3σ ≤ X ≤ μ + 3σ) ≈ 0.9973</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 100" className="w-full max-w-[240px]" aria-hidden>
          <path d="M20 90 Q120 -10 220 90" fill="none" className="stroke-border" strokeWidth="1.5" />
          <path d="M30 90 Q120 0 210 90 Z" className="fill-primary/20" />
          <path d="M60 90 Q120 5 180 90 Z" className="fill-primary/35" />
          <path d="M90 90 Q120 15 150 90 Z" className="fill-primary/55" />
          <text x="120" y="55" fontSize="10" textAnchor="middle" className="fill-primary">99.7%</text>
        </svg>
      </div>
    ),
    example: {
      given: "μ = 75, σ = 8",
      substitute: "75 ± 24",
      answer: "[51, 99]",
    },
  },
  {
    key: "shape",
    title: "4. When the rule breaks — skew, bimodality, heavy tails",
    explain:
      "The 68-95-99.7 percentages come from a normal curve. If the data is skewed, bimodal, heavy-tailed or discrete with few values, the σ-bands stop matching those percentages. When you can't assume normality, Chebyshev's inequality (at least 1 − 1/k² inside k σ) still holds for any distribution.",
    formula: <>Chebyshev: P(|X − μ| ≤ kσ) ≥ 1 − 1/k²</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded bg-primary/10 py-1 text-primary">skewed → percentages shift</div>
          <div className="rounded bg-primary/10 py-1 text-primary">bimodal → no single bell fits</div>
          <div className="rounded bg-primary/10 py-1 text-primary">heavy tails → 3σ too optimistic</div>
        </div>
      </div>
    ),
    example: {
      given: "k = 2 (any distribution)",
      substitute: "1 − 1/4",
      answer: "≥ 75%",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="The empirical rule explained, step by step">
        <p>
          The empirical rule — also called the 68-95-99.7 rule — is a
          quick approximation for how values spread in an approximately normal
          (bell-shaped, symmetric) distribution. Each card below covers one of
          the three σ-bands the calculator reports, plus the assumption that
          makes the rule work.
        </p>
        <GuideCards items={ER_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Instant μ ± 1σ, μ ± 2σ and μ ± 3σ bounds with their approximate ~68% / ~95% / ~99.7% shares.",
            "Shaded bell-curve diagram with the three bands in progressively lighter shades, labeled with the actual numeric boundaries from your inputs.",
            "Optional X input: enter a specific value to see which band it falls into and its approximate percentile from the normal CDF.",
            "Show/hide step-by-step working laying out μ ± kσ arithmetically for k = 1, 2, 3.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            {
              q: "Why the specific numbers 68, 95 and 99.7?",
              a: (
                <p>
                  They're the actual areas under a standard normal curve between
                  ±1, ±2 and ±3 standard deviations, rounded to convenient
                  values. The exact percentages are 68.27%, 95.45% and 99.73%.
                </p>
              ),
            },
            {
              q: "How do I know if my data is 'normal enough' for the rule?",
              a: (
                <p>
                  Plot a histogram and look for a roughly symmetric bell shape.
                  For a more formal check, a Q-Q plot or a normality test
                  (Shapiro-Wilk, Anderson-Darling) is standard. Mild deviations
                  are usually fine for a quick empirical-rule estimate.
                </p>
              ),
            },
            {
              q: "What's outside ±3σ called?",
              a: (
                <p>
                  Values beyond ±3σ are commonly flagged as outliers in normal
                  populations because only about 0.3% of the distribution sits
                  out there. In quality control this is the origin of the
                  "three-sigma control limit".
                </p>
              ),
            },
            {
              q: "Can I use the rule on sample data?",
              a: (
                <p>
                  Yes, using the sample mean x̄ and sample standard deviation s
                  as estimates of μ and σ. Just remember the rule is an
                  approximation and small samples produce noisy s values, so the
                  bands may shift as you collect more data.
                </p>
              ),
            },
            {
              q: "What percentage is between 1σ and 2σ?",
              a: (
                <p>
                  About (95% − 68%) / 2 ≈ <strong>13.5%</strong> on each side of
                  the mean. So roughly 13.5% of values lie between μ + 1σ and μ +
                  2σ, and another 13.5% between μ − 2σ and μ − 1σ.
                </p>
              ),
            },
          ]}
        />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
            {
              to: "/calculators/math/standard-deviation-calculator",
              label: "Standard Deviation Calculator",
            },
            {
              to: "/calculators/math/confidence-interval-calculator",
              label: "Confidence Interval Calculator",
            },
            {
              to: "/calculators/math/probability-calculator",
              label: "Probability Calculator",
            },
            {
              to: "/calculators/math/mean-median-mode-calculator",
              label: "Mean, Median, Mode Calculator",
            },
          ]}
        />
      </CalcSection>
    </>
  );
}
