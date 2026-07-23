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
import type { Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import type { ReactNode } from "react";
import { lngamma } from "@/lib/math/t-test";


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

export const Route = createFileRoute("/calculators/math/binomial-distribution-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Binomial Distribution Calculator",
      title:
        "Binomial Distribution Calculator",
      metaDescription:
        "Compute P(X = k), P(X ≤ k), and P(X ≥ k) for a binomial distribution with mean, variance, and bar chart.",
      canonicalUrl: "/calculators/math/binomial-distribution-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Binomial Distribution Calculator",
          path: "/calculators/math/binomial-distribution-calculator",
        },
      ],
      faqs: [
        {
          q: "What is the difference between P(X = k) and P(X ≤ k)?",
          a: "P(X = k) is the probability of getting exactly k successes. P(X ≤ k) is the cumulative probability of getting k or fewer successes — it's the sum of P(X = 0) + P(X = 1) + … + P(X = k).",
        },
        {
          q: "When can I use the binomial distribution?",
          a: "You need four conditions: a fixed number of trials n, only two possible outcomes per trial (success/failure), a constant success probability p, and independent trials. If any condition fails, use a different distribution.",
        },
        {
          q: "What is n × p used for?",
          a: "n × p is the mean (expected value) of the distribution — the average number of successes you would expect over many repetitions of the experiment. Variance is n × p × (1 − p) and standard deviation is its square root.",
        },
        {
          q: "How is binomial different from Poisson?",
          a: "Binomial has a fixed number of trials n with success probability p per trial. Poisson models the count of events in a fixed interval when the rate λ is known and events are rare and independent. When n is large and p is small, binomial ≈ Poisson with λ = n × p.",
        },
        {
          q: "Can p be exactly 0 or 1?",
          a: "Mathematically yes, but the distribution becomes degenerate — every trial is guaranteed to fail or succeed, so all probability mass sits at X = 0 or X = n. This calculator accepts 0 ≤ p ≤ 1.",
        },
        {
          q: "Why does the bar chart look symmetric sometimes and skewed other times?",
          a: "The shape depends on p. When p = 0.5 the distribution is perfectly symmetric around n/2. When p < 0.5 it's right-skewed (tail to the right); when p > 0.5 it's left-skewed. As n grows the shape approaches a normal curve — that's the normal approximation.",
        },
      ],
    }),
  component: BinomialPage,
});

/* ================================================================
   Math
   ================================================================ */

/** log(C(n, k)) via log-gamma — stable for large n. */
function logBinom(n: number, k: number): number {
  return lngamma(n + 1) - lngamma(k + 1) - lngamma(n - k + 1);
}

/** P(X = k) for Binomial(n, p). */
function pmf(n: number, k: number, p: number): number {
  if (k < 0 || k > n) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  const logP =
    logBinom(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p);
  return Math.exp(logP);
}

/** All PMF values 0..n. Returned array has length n+1. */
function pmfAll(n: number, p: number): number[] {
  const out = new Array(n + 1);
  for (let k = 0; k <= n; k++) out[k] = pmf(n, k, p);
  return out;
}

/** Exact C(n, k) as bigint (safe for display of small n). */
function combBig(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  if (k > n - k) k = n - k;
  let num = 1n;
  let den = 1n;
  for (let i = 1; i <= k; i++) {
    num *= BigInt(n - k + i);
    den *= BigInt(i);
  }
  return num / den;
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
   Bar chart of the full distribution
   ================================================================ */

function DistributionChart({
  n,
  probs,
  k,
}: {
  n: number;
  probs: number[];
  k: number;
}) {
  const W = 640;
  const H = 260;
  const padL = 40;
  const padR = 12;
  const padT = 14;
  const padB = 32;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxP = Math.max(...probs, 1e-12);
  // Determine tick step for x-axis so labels don't overlap.
  const maxTicks = Math.min(n, 20);
  const step = Math.max(1, Math.ceil((n + 1) / maxTicks));

  // Bar width — leave a tiny 1px gap.
  const bw = plotW / (n + 1);

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Binomial distribution with n = ${n}, highlighting X = ${k}`}
        className="block w-full min-w-[420px]"
      >
        {/* y-axis */}
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + plotH}
          stroke="currentColor"
          className="text-border"
        />
        {/* baseline */}
        <line
          x1={padL}
          y1={padT + plotH}
          x2={padL + plotW}
          y2={padT + plotH}
          stroke="currentColor"
          className="text-border"
        />
        {/* y ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const v = t * maxP;
          const y = padT + plotH - t * plotH;
          return (
            <g key={t}>
              <line
                x1={padL - 3}
                y1={y}
                x2={padL}
                y2={y}
                stroke="currentColor"
                className="text-muted-foreground/60"
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                className="fill-muted-foreground"
              >
                {v < 0.001 ? v.toExponential(1) : v.toFixed(3)}
              </text>
            </g>
          );
        })}

        {/* bars */}
        {probs.map((p, i) => {
          const h = (p / maxP) * plotH;
          const x = padL + i * bw;
          const y = padT + plotH - h;
          const highlight = i === k;
          return (
            <rect
              key={i}
              x={x + Math.min(1, bw * 0.1)}
              y={y}
              width={Math.max(1, bw - Math.min(2, bw * 0.2))}
              height={Math.max(0.5, h)}
              className={
                highlight
                  ? "fill-primary"
                  : "fill-primary/25"
              }
            />
          );
        })}

        {/* x ticks */}
        {Array.from({ length: n + 1 }, (_, i) => i)
          .filter((i) => i % step === 0 || i === n)
          .map((i) => {
            const x = padL + i * bw + bw / 2;
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={padT + plotH}
                  x2={x}
                  y2={padT + plotH + 3}
                  stroke="currentColor"
                  className="text-muted-foreground/60"
                />
                <text
                  x={x}
                  y={padT + plotH + 14}
                  textAnchor="middle"
                  fontSize="10"
                  className="fill-muted-foreground"
                >
                  {i}
                </text>
              </g>
            );
          })}

        <text
          x={padL + plotW / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize="11"
          className="fill-muted-foreground"
        >
          Number of successes X
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-4 px-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-primary" />
          Selected X = {k}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-primary/25" />
          Other outcomes
        </span>
      </div>
    </div>
  );
}

/* ================================================================
   Page
   ================================================================ */

function BinomialPage() {
  const [nStr, setNStr] = useState("10");
  const [pStr, setPStr] = useState("0.5");
  const [kStr, setKStr] = useState("3");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    n: number;
    p: number;
    k: number;
    probs: number[];
    pEq: number;
    pLe: number;
    pLt: number;
    pGe: number;
    pGt: number;
    mean: number;
    variance: number;
    sd: number;
  } | null>(null);

  function compute() {
    setError(null);
    const n = Number(nStr);
    const p = Number(pStr);
    const k = Number(kStr);

    if (!Number.isInteger(n) || n <= 0) {
      setResult(null);
      setError("Number of trials n must be a positive integer.");
      return;
    }
    if (n > 5000) {
      setResult(null);
      setError("For performance and chart readability, n is capped at 5000.");
      return;
    }
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      setResult(null);
      setError("Probability p must be a number between 0 and 1.");
      return;
    }
    if (!Number.isInteger(k) || k < 0 || k > n) {
      setResult(null);
      setError("Number of successes k must be an integer with 0 ≤ k ≤ n.");
      return;
    }

    const probs = pmfAll(n, p);
    let pLe = 0;
    for (let i = 0; i <= k; i++) pLe += probs[i];
    let pLt = 0;
    for (let i = 0; i < k; i++) pLt += probs[i];
    const pEq = probs[k];
    // Compute upper tail from the other side to avoid floating drift.
    let pGt = 0;
    for (let i = k + 1; i <= n; i++) pGt += probs[i];
    const pGe = pGt + pEq;

    const mean = n * p;
    const variance = n * p * (1 - p);
    const sd = Math.sqrt(variance);

    setResult({ n, p, k, probs, pEq, pLe, pLt, pGe, pGt, mean, variance, sd });
  }

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { n, p, k, pEq, mean, variance, sd } = result;
    const q = 1 - p;
    const c = combBig(n, k).toString();
    const pk = Math.pow(p, k);
    const qnk = Math.pow(q, n - k);
    return [
      {
        title: "Set up n, p, q",
        body: (
          <>
            <MathNote>Number of trials, success probability, and its complement</MathNote>
            <MathLine>n = {n}</MathLine>
            <MathLine>p = {fmt(p)}</MathLine>
            <MathLine>q = 1 − p = 1 − {fmt(p)} = {fmt(q)}</MathLine>
          </>
        ),
      },
      {
        title: "PMF formula",
        body: (
          <>
            <MathNote>Probability of exactly k successes in n trials</MathNote>
            <MathLine>P(X = k) = C(n, k) · pᵏ · qⁿ⁻ᵏ</MathLine>
          </>
        ),
      },
      {
        title: "Substitute the binomial coefficient",
        body: (
          <>
            <MathNote>C(n, k) counts the orderings of k successes among n trials</MathNote>
            <MathLine>C({n}, {k}) = {n}! / ({k}! · {n - k}!)</MathLine>
            <MathLine>C({n}, {k}) = {c}</MathLine>
          </>
        ),
      },
      {
        title: "Substitute the powers of p and q",
        body: (
          <>
            <MathNote>Probability of one specific sequence with k successes</MathNote>
            <MathLine>pᵏ = {fmt(p)}^{k} = {fmt(pk, 8)}</MathLine>
            <MathLine>qⁿ⁻ᵏ = {fmt(q)}^{n - k} = {fmt(qnk, 8)}</MathLine>
          </>
        ),
      },
      {
        title: "Compute P(X = k)",
        body: (
          <>
            <MathNote>Multiply the coefficient by both powers</MathNote>
            <MathLine>P(X = {k}) = {c} × {fmt(pk, 6)} × {fmt(qnk, 6)}</MathLine>
            <MathLine>P(X = {k}) = {fmtP(pEq)}</MathLine>
          </>
        ),
      },
      {
        title: "Cumulative probability P(X ≤ k)",
        body: (
          <>
            <MathNote>Sum the PMF from 0 up to k</MathNote>
            <MathLine>P(X ≤ {k}) = Σᵢ₌₀ᵏ P(X = i)</MathLine>
            <MathLine>P(X ≤ {k}) = P(X = 0) + P(X = 1) + … + P(X = {k})</MathLine>
            <MathLine>P(X ≤ {k}) = {fmtP(result.pLe)}</MathLine>
          </>
        ),
      },
      {
        title: "Mean, variance, and standard deviation",
        body: (
          <>
            <MathNote>Moments of the binomial distribution</MathNote>
            <MathLine>μ = n · p = {n} × {fmt(p)} = {fmt(mean)}</MathLine>
            <MathLine>σ² = n · p · q = {n} × {fmt(p)} × {fmt(q)} = {fmt(variance)}</MathLine>
            <MathLine>σ = √(n · p · q) = √{fmt(variance)} = {fmt(sd)}</MathLine>
          </>
        ),
      },
    ];
  }, [result]);

  return (
    <MathCalcPage
      name="Binomial Distribution Calculator"
      tagline="Exact binomial probabilities P(X = k), cumulative P(X ≤ k), P(X ≥ k), plus mean, variance and standard deviation — with a full distribution chart and step-by-step working."
      extras={<Extras />}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Trials (n)" htmlFor="bd-n" hint="Positive integer, up to 5000">
          <TextInput
            id="bd-n"
            inputMode="numeric"
            value={nStr}
            onChange={(e) => setNStr(e.target.value)}
            placeholder="10"
          />
        </Field>
        <Field label="Success probability (p)" htmlFor="bd-p" hint="Between 0 and 1">
          <TextInput
            id="bd-p"
            inputMode="decimal"
            value={pStr}
            onChange={(e) => setPStr(e.target.value)}
            placeholder="0.5"
          />
        </Field>
        <Field label="Successes (k)" htmlFor="bd-k" hint="Integer, 0 ≤ k ≤ n">
          <TextInput
            id="bd-k"
            inputMode="numeric"
            value={kStr}
            onChange={(e) => setKStr(e.target.value)}
            placeholder="3"
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
      </div>

      {error && <ErrorBox message={error} />}

      {result && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ResultBox
              label={`P(X = ${result.k})`}
              value={fmtP(result.pEq)}
              note="Exact probability of exactly k successes."
            />
            <ResultBox
              label={`P(X ≤ ${result.k})`}
              value={fmtP(result.pLe)}
              note="Cumulative probability of k or fewer successes."
            />
            <ResultBox
              label={`P(X < ${result.k})`}
              value={fmtP(result.pLt)}
              note={`= P(X ≤ ${result.k - 1}).`}
            />
            <ResultBox
              label={`P(X ≥ ${result.k})`}
              value={fmtP(result.pGe)}
              note={`= 1 − P(X ≤ ${result.k - 1}).`}
            />
            <ResultBox
              label={`P(X > ${result.k})`}
              value={fmtP(result.pGt)}
              note={`= 1 − P(X ≤ ${result.k}).`}
            />
            <ResultBox
              label="Mean · Variance · SD"
              value={
                <span>
                  μ = {fmt(result.mean)} · σ² = {fmt(result.variance)} · σ ={" "}
                  {fmt(result.sd)}
                </span>
              }
              note="μ = n·p, σ² = n·p·(1 − p), σ = √σ²."
            />
          </div>

          <DistributionChart n={result.n} probs={result.probs} k={result.k} />

          <StepsToggle steps={steps} />
        </>
      )}
    </MathCalcPage>
  );
}

/* ================================================================
   Extras (educational content)
   ================================================================ */

const BINOM_GUIDE: GuideCardItem[] = [
  {
    key: "setup",
    title: "1. The four binomial conditions",
    explain:
      "A binomial random variable counts successes across a fixed number of independent trials where each trial has the same success probability p and only two outcomes (success or failure). If any condition breaks, the binomial model no longer fits.",
    formula: <>X ~ Binomial(n, p)</>,
    legend: [
      { sym: "n", def: "fixed number of trials" },
      { sym: "p", def: "success probability, same on every trial" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded bg-primary/10 py-1 text-primary">fixed n</div>
          <div className="rounded bg-primary/10 py-1 text-primary">two outcomes (S / F)</div>
          <div className="rounded bg-primary/10 py-1 text-primary">constant p</div>
          <div className="rounded bg-primary/10 py-1 text-primary">independent trials</div>
        </div>
      </div>
    ),
    example: {
      given: "10 fair coin flips",
      substitute: "n = 10, p = 0.5",
      answer: "X ~ Bin(10, 0.5)",
    },
  },
  {
    key: "pmf",
    title: "2. The PMF — count arrangements × per-sequence probability",
    explain:
      "P(X = k) has two parts. C(n, k) counts how many orderings of k successes and n − k failures exist. Multiplied by p^k · (1 − p)^(n − k) — the probability of any one such sequence — you get the probability of exactly k successes.",
    formula: <>P(X = k) = C(n, k) · p<sup>k</sup> · (1 − p)<sup>n − k</sup></>,
    legend: [
      { sym: "C(n, k)", def: "n! / (k! (n − k)!)" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="90" x2="220" y2="90" className="stroke-border" />
          {[6, 20, 40, 55, 40, 20, 6].map((h, i) => (
            <rect key={i} x={30 + i * 26} y={90 - h} width="20" height={h} className={i === 3 ? "fill-primary" : "fill-primary/40"} />
          ))}
          <text x="120" y="105" fontSize="9" textAnchor="middle" className="fill-muted-foreground">P(X = k) across k = 0…n</text>
        </svg>
      </div>
    ),
    example: {
      given: "n = 10, p = 0.5, k = 3",
      substitute: "120 · 0.5³ · 0.5⁷",
      answer: "P = 0.1172",
    },
  },
  {
    key: "moments",
    title: "3. Mean, variance and standard deviation",
    explain:
      "Because a binomial is a sum of n independent Bernoulli trials, its mean and variance are the per-trial values scaled by n. Variance peaks at p = 0.5 (maximum uncertainty per trial) and vanishes as p → 0 or 1.",
    formula: <>μ = np &nbsp; σ² = np(1 − p) &nbsp; σ = √(np(1 − p))</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="90" x2="220" y2="90" className="stroke-border" />
          <path d="M30 90 Q120 10 210 90" fill="none" className="stroke-primary" strokeWidth="2" />
          <line x1="120" y1="25" x2="120" y2="90" className="stroke-primary" strokeDasharray="3 3" />
          <text x="120" y="20" fontSize="10" textAnchor="middle" className="fill-primary">σ² max at p = 0.5</text>
        </svg>
      </div>
    ),
    example: {
      given: "n = 20, p = 0.3",
      substitute: "μ = 6, σ² = 4.2",
      answer: "σ ≈ 2.049",
    },
  },
  {
    key: "switch",
    title: "4. When to switch models — hypergeometric, Poisson, normal",
    explain:
      "Sampling without replacement from a small population breaks independence — use hypergeometric. Very large n with tiny p is well-approximated by Poisson (λ = np). Very large n with p away from 0 and 1 is well-approximated by Normal(np, np(1 − p)).",
    formula: <>large n, small p → Poisson · large n, moderate p → Normal</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded bg-primary/10 py-1 text-primary">without replacement → hypergeometric</div>
          <div className="rounded bg-primary/10 py-1 text-primary">n large, p small → Poisson(np)</div>
          <div className="rounded bg-primary/10 py-1 text-primary">np &amp; n(1−p) ≥ 10 → Normal</div>
        </div>
      </div>
    ),
    example: {
      given: "n = 1000, p = 0.002",
      substitute: "λ = np = 2",
      answer: "≈ Poisson(2)",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="The binomial distribution explained, step by step">
        <p>
          The binomial distribution models successes in a fixed number of
          independent yes/no trials with a constant success probability. Each
          card below covers one piece of the formula this calculator uses.
        </p>
        <GuideCards items={BINOM_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Exact probabilities: P(X = k), P(X ≤ k), P(X < k), P(X ≥ k), P(X > k) — all in one calculation.",
            "Uses log-gamma internally, so it stays numerically stable for large n (up to n = 5000).",
            "Full probability bar chart across every possible value of X from 0 to n, with the bar for your chosen k highlighted.",
            "Mean, variance and standard deviation reported alongside the probability results.",
            "Show/hide step-by-step working with the binomial coefficient, the p^k and (1 − p)^(n−k) terms and the multiplication laid out.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            {
              q: "Can I use this for very large n?",
              a: (
                <p>
                  Yes — the calculator uses log-gamma internally, so probabilities
                  stay stable up to n = 5000. For larger n you can safely use the
                  normal approximation with μ = n·p and σ = √(n·p·(1 − p)).
                </p>
              ),
            },
            {
              q: "What if p is unknown?",
              a: (
                <p>
                  Estimate p from data as the sample proportion (successes ÷
                  trials), then use it here. If you're testing a hypothesised p,
                  see the P-Value Calculator or a proportion Z-test.
                </p>
              ),
            },
            {
              q: "How is P(X ≥ k) different from P(X > k)?",
              a: (
                <p>
                  P(X ≥ k) includes X = k itself, so it equals P(X = k) + P(X {'>'} k).
                  If you want strictly more than k successes, use P(X {'>'} k).
                </p>
              ),
            },
            {
              q: "What's the connection to the Bernoulli distribution?",
              a: (
                <p>
                  A single trial (n = 1) is a Bernoulli trial. Adding up n
                  independent Bernoulli(p) trials gives Binomial(n, p).
                </p>
              ),
            },
            {
              q: "When should I use Poisson instead?",
              a: (
                <p>
                  Use Poisson when you count events over a fixed interval and the
                  event rate is known, but there is no natural fixed n. If n is
                  large and p is small, Binomial(n, p) is very well approximated by
                  Poisson with λ = n·p.
                </p>
              ),
            },
          ]}
        />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/probability-calculator", label: "Probability Calculator" },
            { to: "/calculators/math/permutation-combination-calculator", label: "Permutation and Combination Calculator" },
            { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
            { to: "/calculators/math/p-value-calculator", label: "P-Value Calculator" },
            { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
          ]}
        />
      </CalcSection>
    </>
  );
}
