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

export const Route = createFileRoute("/calculators/math/exponential-distribution-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Exponential Distribution Calculator",
      title:
        "Exponential Distribution Calculator",
      metaDescription:
        "Compute exponential PDF, CDF, and interval probabilities from rate λ with mean, variance, and density plot.",
      canonicalUrl: "/calculators/math/exponential-distribution-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Exponential Distribution Calculator",
          path: "/calculators/math/exponential-distribution-calculator",
        },
      ],
      faqs: [
        {
          q: "Should I enter the rate λ or the mean?",
          a: "Either works — they're reciprocals. If events happen on average once every 10 minutes, the mean is 10 and the rate λ = 1/10 = 0.1 per minute. Fill in whichever number you have and this calculator derives the other.",
        },
        {
          q: "What units should λ and x use?",
          a: "Whatever units are consistent with each other. If λ is per minute, x must also be in minutes. Mixing units (λ per hour with x in minutes) is a very common source of wrong answers.",
        },
        {
          q: "What is the memoryless property?",
          a: "For an exponential random variable, the probability of waiting an additional t units is the same regardless of how long you've already waited: P(X > s + t | X > s) = P(X > t). A component whose lifetime is exponential has no 'memory' of how old it already is.",
        },
        {
          q: "How is exponential related to Poisson?",
          a: "They describe the same process from two angles. If events occur as a Poisson process with rate λ (counting how many events happen in an interval), the waiting time between consecutive events is exponentially distributed with the same rate λ.",
        },
        {
          q: "When is the exponential distribution the wrong model?",
          a: "Whenever the failure or arrival rate isn't constant over time. Equipment that wears out fails more often as it ages — that needs a distribution like Weibull. Human behaviour with strong daily cycles also violates the constant-rate assumption.",
        },
        {
          q: "Can x be 0 or negative?",
          a: "x must be non-negative — the exponential distribution is defined only for x ≥ 0. P(X ≤ 0) = 0 and P(X > 0) = 1.",
        },
      ],
    }),
  component: ExponentialPage,
});

/* ================================================================
   Math
   ================================================================ */

/** CDF: P(X ≤ x) for Exp(λ). */
function cdf(lam: number, x: number): number {
  if (x <= 0) return 0;
  return 1 - Math.exp(-lam * x);
}

function fmt(x: number, digits = 6): string {
  if (!Number.isFinite(x)) return "—";
  if (x === 0) return "0";
  const abs = Math.abs(x);
  if (abs < 1e-4 || abs >= 1e6) return x.toExponential(4);
  return Number(x.toFixed(digits)).toString();
}

function fmtP(x: number): string {
  if (!Number.isFinite(x)) return "—";
  if (x === 0) return "0";
  if (x === 1) return "1";
  if (x < 1e-4) return x.toExponential(4);
  return x.toFixed(6);
}

/* ================================================================
   SVG — exponential PDF with shaded region
   ================================================================ */

function ExpChart({
  lam,
  a,
  b,
  mode,
}: {
  lam: number;
  a: number;
  b: number;
  mode: "le" | "gt" | "between";
}) {
  const W = 640;
  const H = 260;
  const padL = 42;
  const padR = 14;
  const padT = 14;
  const padB = 32;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // x-range: out to where PDF is negligible (~ 6 / λ) or covers the queried region.
  const xMax = Math.max(6 / lam, (mode === "between" ? b : a) * 1.2, 1e-6);
  const yMax = lam; // PDF max at x=0 is λ

  const N = 240;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * xMax;
    const y = lam * Math.exp(-lam * x);
    const px = padL + (x / xMax) * plotW;
    const py = padT + plotH - (y / yMax) * plotH;
    pts.push(`${px.toFixed(2)},${py.toFixed(2)}`);
  }

  // Shaded region polygon
  const shadeStart = mode === "le" ? 0 : mode === "gt" ? a : a;
  const shadeEnd = mode === "le" ? a : mode === "gt" ? xMax : b;
  const shadePts: string[] = [];
  const x0 = Math.max(0, Math.min(shadeStart, xMax));
  const x1 = Math.max(0, Math.min(shadeEnd, xMax));
  const sN = 120;
  shadePts.push(
    `${(padL + (x0 / xMax) * plotW).toFixed(2)},${(padT + plotH).toFixed(2)}`,
  );
  for (let i = 0; i <= sN; i++) {
    const x = x0 + (i / sN) * (x1 - x0);
    const y = lam * Math.exp(-lam * x);
    const px = padL + (x / xMax) * plotW;
    const py = padT + plotH - (y / yMax) * plotH;
    shadePts.push(`${px.toFixed(2)},${py.toFixed(2)}`);
  }
  shadePts.push(
    `${(padL + (x1 / xMax) * plotW).toFixed(2)},${(padT + plotH).toFixed(2)}`,
  );

  // x-axis ticks
  const nTicks = 6;
  const ticks: number[] = [];
  for (let i = 0; i <= nTicks; i++) ticks.push((i / nTicks) * xMax);

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Exponential PDF with rate λ = ${lam}`}
        className="block w-full min-w-[420px]"
      >
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + plotH}
          stroke="currentColor"
          className="text-border"
        />
        <line
          x1={padL}
          y1={padT + plotH}
          x2={padL + plotW}
          y2={padT + plotH}
          stroke="currentColor"
          className="text-border"
        />

        <polygon points={shadePts.join(" ")} className="fill-primary/30" />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
        />

        {ticks.map((t, i) => {
          const px = padL + (t / xMax) * plotW;
          return (
            <g key={i}>
              <line
                x1={px}
                y1={padT + plotH}
                x2={px}
                y2={padT + plotH + 3}
                stroke="currentColor"
                className="text-muted-foreground/60"
              />
              <text
                x={px}
                y={padT + plotH + 14}
                textAnchor="middle"
                fontSize="10"
                className="fill-muted-foreground"
              >
                {t < 10 ? t.toFixed(2) : t.toFixed(1)}
              </text>
            </g>
          );
        })}

        <text
          x={padL - 6}
          y={padT + 8}
          textAnchor="end"
          fontSize="10"
          className="fill-muted-foreground"
        >
          {yMax.toFixed(3)}
        </text>
        <text
          x={padL - 6}
          y={padT + plotH}
          textAnchor="end"
          fontSize="10"
          className="fill-muted-foreground"
        >
          0
        </text>

        <text
          x={padL + plotW / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize="11"
          className="fill-muted-foreground"
        >
          x
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-4 px-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-primary/30" />
          Shaded probability region
        </span>
        <span>
          Curve: f(x) = λ·e<sup>−λx</sup> with λ = {fmt(lam)}
        </span>
      </div>
    </div>
  );
}

/* ================================================================
   Page
   ================================================================ */

type Mode = "le" | "gt" | "between";

function ExponentialPage() {
  const [paramMode, setParamMode] = useState<"lambda" | "mean">("lambda");
  const [lamStr, setLamStr] = useState("0.1");
  const [meanStr, setMeanStr] = useState("10");
  const [mode, setMode] = useState<Mode>("le");
  const [aStr, setAStr] = useState("5");
  const [bStr, setBStr] = useState("15");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    lam: number;
    mean: number;
    variance: number;
    sd: number;
    a: number;
    b: number;
    mode: Mode;
    pLe: number;
    pGt: number;
    pBetween: number;
  } | null>(null);

  function compute() {
    setError(null);
    let lam: number;
    if (paramMode === "lambda") {
      lam = Number(lamStr);
      if (!Number.isFinite(lam) || lam <= 0) {
        setResult(null);
        setError("The rate λ must be a positive number.");
        return;
      }
    } else {
      const m = Number(meanStr);
      if (!Number.isFinite(m) || m <= 0) {
        setResult(null);
        setError("The mean must be a positive number.");
        return;
      }
      lam = 1 / m;
    }

    const a = Number(aStr);
    if (!Number.isFinite(a) || a < 0) {
      setResult(null);
      setError("x (or a) must be a non-negative number.");
      return;
    }
    let b = 0;
    if (mode === "between") {
      b = Number(bStr);
      if (!Number.isFinite(b) || b <= a) {
        setResult(null);
        setError("For P(a < X ≤ b), b must be greater than a.");
        return;
      }
    }

    const mean = 1 / lam;
    const variance = 1 / (lam * lam);
    const sd = 1 / lam;
    const pLe = cdf(lam, a);
    const pGt = 1 - pLe;
    const pBetween = mode === "between" ? cdf(lam, b) - cdf(lam, a) : 0;

    setResult({ lam, mean, variance, sd, a, b, mode, pLe, pGt, pBetween });
    // keep the other parameter box in sync visually
    if (paramMode === "lambda") setMeanStr(String(Number(mean.toFixed(6))));
    else setLamStr(String(Number(lam.toFixed(6))));
  }

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { lam, mean, variance, sd, a, b, mode, pLe, pGt, pBetween } = result;
    const base: Step[] = [
      {
        title: "Given",
        body: (
          <>
            <MathNote>
              Rate λ = {fmt(lam)}, mean 1/λ = {fmt(mean)}.
            </MathNote>
            <MathLine>f(x) = λ·e^(−λx)</MathLine>
            <MathLine>F(x) = 1 − e^(−λx)</MathLine>
          </>
        ),
      },
    ];

    if (mode === "le") {
      base.push({
        title: "Substitute — P(X ≤ x)",
        body: (
          <>
            <MathNote>Plug x = {fmt(a)} and λ = {fmt(lam)} into the CDF.</MathNote>
            <MathLine>
              P(X ≤ {fmt(a)}) = 1 − e^(−{fmt(lam)}·{fmt(a)})
            </MathLine>
            <MathLine>
              P(X ≤ {fmt(a)}) = 1 − {fmt(Math.exp(-lam * a), 8)} = {fmtP(pLe)}
            </MathLine>
          </>
        ),
      });
    } else if (mode === "gt") {
      base.push({
        title: "Substitute — survival P(X > x)",
        body: (
          <>
            <MathNote>The survival function is the complement of the CDF.</MathNote>
            <MathLine>
              P(X &gt; {fmt(a)}) = e^(−{fmt(lam)}·{fmt(a)})
            </MathLine>
            <MathLine>
              P(X &gt; {fmt(a)}) = {fmtP(pGt)}
            </MathLine>
          </>
        ),
      });
    } else {
      base.push({
        title: "Substitute — interval probability",
        body: (
          <>
            <MathNote>Evaluate the CDF at both endpoints, then subtract.</MathNote>
            <MathLine>
              F({fmt(a)}) = 1 − e^(−{fmt(lam)}·{fmt(a)}) = {fmt(cdf(lam, a), 8)}
            </MathLine>
            <MathLine>
              F({fmt(b)}) = 1 − e^(−{fmt(lam)}·{fmt(b)}) = {fmt(cdf(lam, b), 8)}
            </MathLine>
            <MathLine>
              P({fmt(a)} &lt; X ≤ {fmt(b)}) = F({fmt(b)}) − F({fmt(a)}) = {fmtP(pBetween)}
            </MathLine>
          </>
        ),
      });
    }

    base.push({
      title: "Answer — mean, variance, SD",
      body: (
        <>
          <MathNote>Both mean and standard deviation equal 1/λ for the exponential distribution.</MathNote>
          <MathLine>μ = 1/λ = {fmt(mean)}</MathLine>
          <MathLine>σ² = 1/λ² = {fmt(variance)}</MathLine>
          <MathLine>σ = 1/λ = {fmt(sd)}</MathLine>
        </>
      ),
    });
    return base;
  }, [result]);

  return (
    <MathCalcPage
      name="Exponential Distribution Calculator"
      tagline="Compute P(X ≤ x), P(X > x) and P(a < X ≤ b) from either the rate λ or the mean 1/λ — with a shaded PDF diagram and full step-by-step working."
      extras={<Extras />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Parameter" htmlFor="ex-pm" hint="Enter either λ or the mean; the other is derived.">
          <select
            id="ex-pm"
            value={paramMode}
            onChange={(e) => setParamMode(e.target.value as "lambda" | "mean")}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="lambda">Rate λ (events per unit)</option>
            <option value="mean">Mean 1/λ (average wait time)</option>
          </select>
        </Field>
        {paramMode === "lambda" ? (
          <Field label="Rate λ" htmlFor="ex-lam" hint="Positive real number">
            <TextInput
              id="ex-lam"
              inputMode="decimal"
              value={lamStr}
              onChange={(e) => setLamStr(e.target.value)}
              placeholder="0.1"
            />
          </Field>
        ) : (
          <Field label="Mean (1/λ)" htmlFor="ex-mean" hint="Positive real number">
            <TextInput
              id="ex-mean"
              inputMode="decimal"
              value={meanStr}
              onChange={(e) => setMeanStr(e.target.value)}
              placeholder="10"
            />
          </Field>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Query" htmlFor="ex-mode" hint="Choose which probability to compute.">
          <select
            id="ex-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="le">P(X ≤ x)</option>
            <option value="gt">P(X &gt; x)</option>
            <option value="between">P(a &lt; X ≤ b)</option>
          </select>
        </Field>
        <Field
          label={mode === "between" ? "Lower bound a" : "Value x"}
          htmlFor="ex-a"
          hint="Non-negative"
        >
          <TextInput
            id="ex-a"
            inputMode="decimal"
            value={aStr}
            onChange={(e) => setAStr(e.target.value)}
            placeholder="5"
          />
        </Field>
        {mode === "between" && (
          <Field label="Upper bound b" htmlFor="ex-b" hint="Must be greater than a">
            <TextInput
              id="ex-b"
              inputMode="decimal"
              value={bStr}
              onChange={(e) => setBStr(e.target.value)}
              placeholder="15"
            />
          </Field>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
      </div>

      {error && <ErrorBox message={error} />}

      {result && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {result.mode === "le" && (
              <ResultBox
                label={`P(X ≤ ${fmt(result.a)})`}
                value={fmtP(result.pLe)}
                note="Cumulative distribution function F(x) = 1 − e^(−λx)."
              />
            )}
            {result.mode === "gt" && (
              <ResultBox
                label={`P(X > ${fmt(result.a)})`}
                value={fmtP(result.pGt)}
                note="Survival function S(x) = e^(−λx)."
              />
            )}
            {result.mode === "between" && (
              <ResultBox
                label={`P(${fmt(result.a)} < X ≤ ${fmt(result.b)})`}
                value={fmtP(result.pBetween)}
                note="F(b) − F(a)."
              />
            )}
            <ResultBox
              label="Complement"
              value={
                result.mode === "le"
                  ? fmtP(result.pGt)
                  : result.mode === "gt"
                    ? fmtP(result.pLe)
                    : fmtP(1 - result.pBetween)
              }
              note={
                result.mode === "le"
                  ? `P(X > ${fmt(result.a)}) = 1 − F(x).`
                  : result.mode === "gt"
                    ? `P(X ≤ ${fmt(result.a)}) = F(x).`
                    : "Probability outside the interval."
              }
            />
            <ResultBox
              label="Mean · SD"
              value={
                <span>
                  μ = {fmt(result.mean)} · σ = {fmt(result.sd)}
                </span>
              }
              note="μ = σ = 1/λ."
            />
            <ResultBox
              label="Variance"
              value={fmt(result.variance)}
              note="σ² = 1/λ²."
            />
          </div>

          <ExpChart
            lam={result.lam}
            a={result.a}
            b={result.b}
            mode={result.mode}
          />

          <StepsToggle steps={steps} />
        </>
      )}
    </MathCalcPage>
  );
}

/* ================================================================
   Extras (educational content)
   ================================================================ */

const EXP_GUIDE: GuideCardItem[] = [
  {
    key: "pdf",
    title: "1. PDF and CDF — the shape and the cumulative area",
    explain:
      "The exponential PDF starts at height λ at x = 0 and decays exponentially. The CDF integrates that curve to give the probability of waiting at most x units of time — it climbs quickly at first and asymptotes to 1.",
    formula: (
      <>
        f(x) = λ · e<sup>−λx</sup> &nbsp;·&nbsp; P(X ≤ x) = 1 − e<sup>−λx</sup>
      </>
    ),
    legend: [
      { sym: "λ", def: "rate — events per unit time" },
      { sym: "x", def: "waiting time, x ≥ 0" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 100" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="80" x2="220" y2="80" className="stroke-border" />
          <path d="M20 20 Q60 75 220 78" fill="none" className="stroke-primary" strokeWidth="2" />
          <path d="M20 80 L20 20 Q60 75 90 78 L90 80 Z" className="fill-primary/25" />
          <text x="55" y="15" fontSize="10" className="fill-primary">λ e^(−λx)</text>
        </svg>
      </div>
    ),
    example: {
      given: "λ = 0.1/min, x = 5",
      substitute: "1 − e^(−0.5)",
      answer: "P ≈ 0.3935",
    },
  },
  {
    key: "survival",
    title: "2. Survival and interval probabilities",
    explain:
      "The survival function is the complement of the CDF — the chance you wait longer than x. Any interval probability is the difference of two survivals (or two CDFs), which is why the shaded area between a and b uses e^(−λa) − e^(−λb).",
    formula: (
      <>
        P(X &gt; x) = e<sup>−λx</sup> &nbsp;·&nbsp; P(a &lt; X ≤ b) = e<sup>−λa</sup> − e<sup>−λb</sup>
      </>
    ),
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 100" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="80" x2="220" y2="80" className="stroke-border" />
          <path d="M20 20 Q60 75 220 78" fill="none" className="stroke-primary" strokeWidth="2" />
          <path d="M70 80 L70 55 Q100 72 140 76 L140 80 Z" className="fill-primary/40" />
          <text x="105" y="50" fontSize="9" textAnchor="middle" className="fill-primary">a &lt; X ≤ b</text>
        </svg>
      </div>
    ),
    example: {
      given: "λ = 0.1, a = 5, b = 15",
      substitute: "e^(−0.5) − e^(−1.5)",
      answer: "P ≈ 0.3834",
    },
  },
  {
    key: "moments",
    title: "3. Mean = SD = 1/λ (signature property)",
    explain:
      "Both the mean and the standard deviation equal 1/λ, and the variance is 1/λ². The median is smaller — ln(2)/λ — because the distribution is heavily right-skewed and the long tail pulls the mean above the median.",
    formula: <>μ = 1/λ &nbsp; σ² = 1/λ² &nbsp; σ = 1/λ &nbsp; median = ln 2 / λ</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 90" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="70" x2="220" y2="70" className="stroke-border" />
          <path d="M20 15 Q60 65 220 68" fill="none" className="stroke-primary" strokeWidth="2" />
          <line x1="75" y1="70" x2="75" y2="35" className="stroke-primary" strokeDasharray="3 3" />
          <line x1="105" y1="70" x2="105" y2="45" className="stroke-primary" strokeDasharray="3 3" />
          <text x="75" y="30" fontSize="9" textAnchor="middle" className="fill-primary">median</text>
          <text x="115" y="40" fontSize="9" className="fill-primary">mean</text>
        </svg>
      </div>
    ),
    example: {
      given: "λ = 0.1/min",
      substitute: "μ = 1/0.1",
      answer: "μ = σ = 10 min",
    },
  },
  {
    key: "memoryless",
    title: "4. Memoryless — no aging in the distribution",
    explain:
      "Exponential is the only continuous distribution with the memoryless property: given you've already waited s units, the chance of waiting at least t more is the same as if you'd just started. This is why exponential fits Poisson-process waits (calls, decays) but not wear-out lifetimes — for those use a Weibull.",
    formula: <>P(X &gt; s + t | X &gt; s) = P(X &gt; t)</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded bg-primary/10 py-1 text-primary">Poisson-process gaps → memoryless fits</div>
          <div className="rounded bg-primary/10 py-1 text-primary">wear-out lifetimes → use Weibull</div>
          <div className="rounded bg-primary/10 py-1 text-primary">discrete analogue → Geometric</div>
        </div>
      </div>
    ),
    example: {
      given: "λ = 0.2/yr, waited 3 yr",
      substitute: "P(X > 2) = e^(−0.4)",
      answer: "≈ 0.6703",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="The exponential distribution explained, step by step">
        <p>
          The exponential distribution models waiting time between events in a
          Poisson process — same rate λ as the{" "}
          <a className="text-primary underline underline-offset-4" href="/calculators/math/poisson-distribution-calculator">
            Poisson Distribution Calculator
          </a>
          , different question ("how long between events?" instead of "how many
          in an interval?"). Each card below covers one piece the calculator
          uses.
        </p>
        <GuideCards items={EXP_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Enter either the rate λ or the mean 1/λ — the other value is derived automatically so you don't have to convert by hand.",
            "Supports three probability queries: P(X ≤ x), P(X > x), and P(a < X ≤ b) between two values.",
            "Reports mean, variance and standard deviation with a reminder that mean = SD = 1/λ.",
            "Shaded PDF curve shows exactly which region of the exponential distribution is being computed.",
            "Show/hide step-by-step working writes out F(x) = 1 − e^(−λx) with your numbers substituted in.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            {
              q: "How do I estimate λ from data?",
              a: (
                <p>
                  The maximum-likelihood estimate of λ is 1 divided by the
                  sample mean of the observed waiting times. So if the average
                  time between calls in your data is 7 minutes, an estimate of
                  λ is 1/7 ≈ 0.143 per minute.
                </p>
              ),
            },
            {
              q: "Why isn't the mean the same as the median?",
              a: (
                <p>
                  The exponential distribution is heavily right-skewed. The
                  median is ln(2)/λ ≈ 0.693/λ, always noticeably less than the
                  mean 1/λ. Half of the wait times fall below the median, but
                  the long tail on the right pulls the mean up.
                </p>
              ),
            },
            {
              q: "Is exponential the same as exponential decay in physics?",
              a: (
                <p>
                  Very closely related. Radioactive decay is a canonical
                  Poisson process, and the waiting time until any single atom
                  decays is exponentially distributed. The macroscopic decay
                  law N(t) = N₀·e^(−λt) is the survival function of a huge
                  number of independent exponential lifetimes.
                </p>
              ),
            },
            {
              q: "How is exponential related to the geometric distribution?",
              a: (
                <p>
                  The geometric distribution is the discrete analogue —
                  waiting time (in whole trials) for the first success in a
                  sequence of Bernoulli trials. Exponential is its continuous
                  counterpart, and it inherits the memoryless property from
                  geometric.
                </p>
              ),
            },
            {
              q: "What if my data has an obviously increasing failure rate?",
              a: (
                <p>
                  Then exponential is the wrong model. Look at the{" "}
                  <strong>Weibull distribution</strong>, which generalises
                  exponential with a shape parameter that lets the hazard rate
                  increase (wear-out), decrease (infant mortality) or stay
                  constant (exponential is Weibull with shape = 1).
                </p>
              ),
            },
            {
              q: "Can I use this for the time between website visits?",
              a: (
                <p>
                  As a first approximation during a stable traffic window, yes.
                  Beware daily and weekly cycles — visits between 3am and 4am
                  aren't drawn from the same distribution as visits between 2pm
                  and 3pm, so fit exponential inside a homogeneous window rather
                  than across a full day.
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
              to: "/calculators/math/poisson-distribution-calculator",
              label: "Poisson Distribution Calculator",
            },
            {
              to: "/calculators/math/probability-calculator",
              label: "Probability Calculator",
            },
            {
              to: "/calculators/math/empirical-rule-calculator",
              label: "Empirical Rule Calculator",
            },
            {
              to: "/calculators/math/binomial-distribution-calculator",
              label: "Binomial Distribution Calculator",
            },
          ]}
        />
      </CalcSection>
    </>
  );
}
