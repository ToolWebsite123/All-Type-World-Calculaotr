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
import { SolutionSteps, type Step } from "@/components/SolutionSteps";
import { lngamma } from "@/lib/math/t-test";

export const Route = createFileRoute("/calculators/math/poisson-distribution-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Poisson Distribution Calculator",
      title:
        "Poisson Distribution Calculator",
      metaDescription:
        "Compute Poisson P(X = k) and cumulative probabilities from a rate λ with mean, variance, and bar chart.",
      canonicalUrl: "/calculators/math/poisson-distribution-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Poisson Distribution Calculator",
          path: "/calculators/math/poisson-distribution-calculator",
        },
      ],
      faqs: [
        {
          q: "What does λ (lambda) actually mean?",
          a: "λ is the average number of events you expect in the interval you're studying. If cars pass a checkpoint at an average rate of 12 per hour and you're looking at a one-hour window, λ = 12. Change the window to 30 minutes and λ becomes 6. It's a rate, not a probability.",
        },
        {
          q: "When is Poisson the right distribution?",
          a: "Use Poisson when you're counting how many times an event happens in a fixed interval of time, area or volume; events occur independently; and the average rate is (approximately) constant. Classic examples: customer arrivals per hour, typos per page, radioactive decays per second, defects per square metre.",
        },
        {
          q: "How is Poisson different from binomial?",
          a: "Binomial has a fixed number of trials n with a per-trial success probability p. Poisson has no fixed n — just an average rate over a continuous interval. When n is large and p is small, Binomial(n, p) is very well approximated by Poisson(λ = n · p).",
        },
        {
          q: "Why is mean = variance = λ?",
          a: "It's a defining property of the Poisson distribution and a useful diagnostic. If your real-world data has variance much larger than its mean (over-dispersion) or much smaller (under-dispersion), Poisson is probably the wrong model.",
        },
        {
          q: "Can k or λ be fractional?",
          a: "λ can be any positive real number — 3.7 events per hour is fine. But k is a count, so it must be a non-negative integer.",
        },
        {
          q: "Is there an upper limit on k?",
          a: "Mathematically no — k can be any non-negative integer. In practice P(X = k) becomes negligibly small once k is several standard deviations above λ, and the chart focuses on that meaningful range.",
        },
      ],
    }),
  component: PoissonPage,
});

/* ================================================================
   Math
   ================================================================ */

/** log(k!) via log-gamma — stable for large k. */
function logFact(k: number): number {
  return lngamma(k + 1);
}

/** P(X = k) for Poisson(λ). */
function pmf(lam: number, k: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (lam === 0) return k === 0 ? 1 : 0;
  const logP = k * Math.log(lam) - lam - logFact(k);
  return Math.exp(logP);
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

function factorialStr(k: number): string {
  if (k <= 20) {
    let f = 1n;
    for (let i = 2; i <= k; i++) f *= BigInt(i);
    return f.toString();
  }
  // Large k: report via log-gamma in scientific form.
  const logv = logFact(k) / Math.LN10;
  const mant = Math.pow(10, logv - Math.floor(logv));
  return `${mant.toFixed(4)} × 10^${Math.floor(logv)}`;
}

/* ================================================================
   Bar chart of the Poisson PMF
   ================================================================ */

function PoissonChart({
  lam,
  kMax,
  probs,
  k,
}: {
  lam: number;
  kMax: number;
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
  const n = probs.length; // covers k = 0..kMax
  const maxTicks = Math.min(kMax, 20);
  const step = Math.max(1, Math.ceil(n / maxTicks));
  const bw = plotW / n;

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Poisson distribution with λ = ${lam}, highlighting X = ${k}`}
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
              className={highlight ? "fill-primary" : "fill-primary/25"}
            />
          );
        })}

        {Array.from({ length: n }, (_, i) => i)
          .filter((i) => i % step === 0 || i === n - 1)
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
          Number of events X
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
        {kMax < Infinity && (
          <span>Chart truncated at k = {kMax} (tail probability negligible).</span>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Page
   ================================================================ */

function PoissonPage() {
  const [lamStr, setLamStr] = useState("5");
  const [kStr, setKStr] = useState("3");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    lam: number;
    k: number;
    kMax: number;
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
    const lam = Number(lamStr);
    const k = Number(kStr);

    if (!Number.isFinite(lam) || lam < 0) {
      setResult(null);
      setError("The rate λ must be a non-negative number.");
      return;
    }
    if (lam > 1000) {
      setResult(null);
      setError("For chart readability, λ is capped at 1000. Use a normal approximation for very large rates.");
      return;
    }
    if (!Number.isInteger(k) || k < 0) {
      setResult(null);
      setError("Number of events k must be a non-negative integer.");
      return;
    }

    const sd = Math.sqrt(lam);
    const upper = Math.max(k + 2, Math.ceil(lam + 4 * sd + 4));
    const kMax = Math.max(10, upper);

    const probs: number[] = new Array(kMax + 1);
    for (let i = 0; i <= kMax; i++) probs[i] = pmf(lam, i);

    let pLe = 0;
    for (let i = 0; i <= k; i++) pLe += probs[i];
    let pLt = 0;
    for (let i = 0; i < k; i++) pLt += probs[i];
    const pEq = probs[k] ?? 0;
    const pGe = Math.max(0, 1 - pLt);
    const pGt = Math.max(0, 1 - pLe);

    setResult({
      lam,
      k,
      kMax,
      probs,
      pEq,
      pLe,
      pLt,
      pGe,
      pGt,
      mean: lam,
      variance: lam,
      sd,
    });
  }

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { lam, k, pEq, pLe, pGe, mean, variance, sd } = result;
    const lamK = Math.pow(lam, k);
    const eNegLam = Math.exp(-lam);
    const kFact = factorialStr(k);
    return [
      {
        title: "Formula",
        body: (<FormulaBlock><div>
            <div>
              P(X = k) = (λ<sup>k</sup> · e<sup>−λ</sup>) / k!
            </div>
            <div className="mt-1 text-foreground">
              with λ = {fmt(lam)} and k = {k}.
            </div>
          </div></FormulaBlock>),
      },
      {
        title: "Substitute — λ^k",
        body: (<FormulaBlock><div>
            λ<sup>k</sup> = {fmt(lam)}<sup>{k}</sup> ={" "}
            <span className="text-foreground">{fmt(lamK, 8)}</span>
          </div></FormulaBlock>),
      },
      {
        title: "Substitute — e^(−λ)",
        body: (<FormulaBlock><div>
            e<sup>−{fmt(lam)}</sup> ={" "}
            <span className="text-foreground">{fmt(eNegLam, 8)}</span>
          </div></FormulaBlock>),
      },
      {
        title: "Substitute — k!",
        body: (<FormulaBlock><div>
            {k}! = <span className="text-foreground">{kFact}</span>
          </div></FormulaBlock>),
      },
      {
        title: "Answer — PMF value",
        body: (<FormulaBlock><div>
            P(X = {k}) = ({fmt(lamK, 6)} × {fmt(eNegLam, 6)}) / {kFact} ={" "}
            <span className="text-foreground">{fmtP(pEq)}</span>
          </div></FormulaBlock>),
      },
      {
        title: "Answer — cumulative probabilities",
        body: (<FormulaBlock><div className="space-y-1">
            <div>
              P(X ≤ {k}) = Σ<sub>i=0..{k}</sub> P(X = i) ={" "}
              <span className="text-foreground">{fmtP(pLe)}</span>
            </div>
            <div>
              P(X ≥ {k}) = 1 − P(X ≤ {k - 1}) ={" "}
              <span className="text-foreground">{fmtP(pGe)}</span>
            </div>
          </div></FormulaBlock>),
      },
      {
        title: "Answer — mean, variance, SD",
        body: (<FormulaBlock><div className="space-y-1">
            <div>
              μ = λ = <span className="text-foreground">{fmt(mean)}</span>
            </div>
            <div>
              σ² = λ = <span className="text-foreground">{fmt(variance)}</span>
            </div>
            <div>
              σ = √λ = <span className="text-foreground">{fmt(sd)}</span>
            </div>
          </div></FormulaBlock>),
      },
    ];
  }, [result]);

  return (
    <MathCalcPage
      name="Poisson Distribution Calculator"
      tagline="Exact Poisson probabilities P(X = k), cumulative P(X ≤ k), P(X ≥ k), plus mean, variance and standard deviation — with a full distribution chart and step-by-step working."
      extras={<Extras />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Average rate (λ)" htmlFor="po-lam" hint="Events per interval — any positive number">
          <TextInput
            id="po-lam"
            inputMode="decimal"
            value={lamStr}
            onChange={(e) => setLamStr(e.target.value)}
            placeholder="5"
          />
        </Field>
        <Field label="Number of events (k)" htmlFor="po-k" hint="Non-negative integer">
          <TextInput
            id="po-k"
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
              note="Exact probability of exactly k events."
            />
            <ResultBox
              label={`P(X ≤ ${result.k})`}
              value={fmtP(result.pLe)}
              note="Cumulative probability of k or fewer events."
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
              note="μ = λ, σ² = λ, σ = √λ."
            />
          </div>

          <PoissonChart
            lam={result.lam}
            kMax={result.kMax}
            probs={result.probs}
            k={result.k}
          />

          <SolutionSteps steps={steps} />
        </>
      )}
    </MathCalcPage>
  );
}

/* ================================================================
   Extras (educational content)
   ================================================================ */

const POISSON_GUIDE: GuideCardItem[] = [
  {
    key: "rate",
    title: "1. λ is a rate — a count per interval, not a probability",
    explain:
      "λ (lambda) is the average number of events you expect over a fixed window of time, area or volume. It can be any positive real number — not bounded by 1 — and it scales with the window: doubling the interval doubles λ.",
    formula: <>X ~ Poisson(λ)</>,
    legend: [
      { sym: "λ", def: "average events per interval" },
      { sym: "X", def: "actual count observed" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 90" className="w-full max-w-[240px]" aria-hidden>
          <line x1="10" y1="60" x2="230" y2="60" className="stroke-border" />
          {[25, 55, 90, 120, 150, 180, 205].map((x, i) => (
            <circle key={i} cx={x} cy={60} r="4" className="fill-primary" />
          ))}
          <text x="120" y="80" fontSize="10" textAnchor="middle" className="fill-muted-foreground">
            7 events in this 1-hour window → λ ≈ 7 / hr
          </text>
        </svg>
      </div>
    ),
    example: {
      given: "12 customers/hr, 30-min window",
      substitute: "λ = 12 · 0.5",
      answer: "λ = 6",
    },
  },
  {
    key: "pmf",
    title: "2. The PMF — probability of exactly k events",
    explain:
      "λ^k weighs scenarios producing k events, e^(−λ) normalises the distribution so probabilities sum to 1, and dividing by k! removes the double-count from arrival orders. The calculator uses log-gamma so k! stays stable even for large k.",
    formula: <>P(X = k) = (λ<sup>k</sup> · e<sup>−λ</sup>) / k!</>,
    legend: [
      { sym: "e", def: "Euler's number ≈ 2.71828" },
      { sym: "k!", def: "k factorial" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="90" x2="220" y2="90" className="stroke-border" />
          {[4, 15, 30, 45, 50, 42, 30, 18, 9, 4].map((h, i) => (
            <rect key={i} x={26 + i * 19} y={90 - h} width="14" height={h} className={i === 4 ? "fill-primary" : "fill-primary/40"} />
          ))}
          <text x="120" y="105" fontSize="9" textAnchor="middle" className="fill-muted-foreground">Poisson(5) — peak near λ</text>
        </svg>
      </div>
    ),
    example: {
      given: "λ = 5, k = 3",
      substitute: "125 · 0.006738 / 6",
      answer: "P ≈ 0.1404",
    },
  },
  {
    key: "moments",
    title: "3. Mean = variance = λ (signature property)",
    explain:
      "For any Poisson variable the mean and variance are both λ, so σ = √λ. If real data has variance much larger than its mean (over-dispersion) or much smaller, Poisson is the wrong model — that is the standard diagnostic.",
    formula: <>μ = λ &nbsp; σ² = λ &nbsp; σ = √λ</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 90" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="70" x2="220" y2="70" className="stroke-border" />
          <line x1="120" y1="20" x2="120" y2="70" className="stroke-primary" strokeDasharray="3 3" />
          <line x1="90" y1="70" x2="150" y2="70" className="stroke-primary" strokeWidth="3" />
          <text x="120" y="15" fontSize="10" textAnchor="middle" className="fill-primary">μ = λ</text>
          <text x="120" y="85" fontSize="10" textAnchor="middle" className="fill-muted-foreground">± σ = ± √λ</text>
        </svg>
      </div>
    ),
    example: {
      given: "λ = 9",
      substitute: "μ = 9, σ² = 9",
      answer: "σ = 3",
    },
  },
  {
    key: "switch",
    title: "4. When to switch models — binomial, exponential, normal",
    explain:
      "Fixed number of trials → binomial (Poisson is the limit as n → ∞, p → 0 with np = λ). Waiting time between events → exponential with rate λ — same process, different question. Once λ ≥ 20, Poisson(λ) is well approximated by Normal(λ, λ) with a continuity correction.",
    formula: <>large n, small p → Poisson(np) · large λ → Normal(λ, λ)</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded bg-primary/10 py-1 text-primary">counts / interval → Poisson</div>
          <div className="rounded bg-primary/10 py-1 text-primary">gaps between events → Exponential(λ)</div>
          <div className="rounded bg-primary/10 py-1 text-primary">λ ≥ 20 → Normal(λ, λ)</div>
        </div>
      </div>
    ),
    example: {
      given: "n = 1000, p = 0.003",
      substitute: "λ = np = 3",
      answer: "≈ Poisson(3)",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="The Poisson distribution explained, step by step">
        <p>
          The Poisson distribution models the number of independent events that
          occur in a fixed interval when the average rate λ is constant. Each
          card below covers one piece of the formula this calculator uses.
        </p>
        <GuideCards items={POISSON_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Exact Poisson probabilities: P(X = k), P(X ≤ k), P(X < k), P(X ≥ k), P(X > k) — all in one calculation.",
            "Uses log-gamma internally, so probabilities stay accurate even when k! is astronomically large.",
            "Probability bar chart automatically spans a meaningful range of k values (roughly λ ± 4·√λ), with the bar for your chosen k highlighted.",
            "Mean, variance and standard deviation reported alongside the probabilities — with the useful reminder that mean = variance = λ.",
            "Show/hide step-by-step working with the formula, λ^k, e^(−λ) and k! all laid out.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            {
              q: "What if I don't know λ?",
              a: (
                <p>
                  Estimate it from data as the sample mean (total events ÷
                  number of intervals). If a call centre received 1,200 calls
                  over 100 hours, an estimate of λ per hour is 12.
                </p>
              ),
            },
            {
              q: "How large can k be in practice?",
              a: (
                <p>
                  Mathematically k has no upper limit. In practice P(X = k)
                  becomes negligibly small once k is several standard deviations
                  above λ. This calculator draws the chart out to about λ +
                  4·√λ, which covers essentially all the probability mass for
                  reasonable λ.
                </p>
              ),
            },
            {
              q: "Can λ be 0?",
              a: (
                <p>
                  Yes, but the distribution collapses: P(X = 0) = 1 and P(X = k)
                  = 0 for any k ≥ 1. Not very useful in modeling terms.
                </p>
              ),
            },
            {
              q: "When can I use a normal approximation?",
              a: (
                <p>
                  Once λ is large (a common threshold is λ ≥ 20), Poisson(λ) is
                  well approximated by Normal(μ = λ, σ² = λ). Use a continuity
                  correction if you approximate discrete probabilities from a
                  continuous distribution.
                </p>
              ),
            },
            {
              q: "How is Poisson related to the exponential distribution?",
              a: (
                <p>
                  If events happen according to a Poisson process with rate λ,
                  the time between consecutive events follows an{" "}
                  <em>exponential distribution</em> with rate λ. They're two
                  views of the same underlying process.
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
              to: "/calculators/math/binomial-distribution-calculator",
              label: "Binomial Distribution Calculator",
            },
            {
              to: "/calculators/math/exponential-distribution-calculator",
              label: "Exponential Distribution Calculator",
            },
            {
              to: "/calculators/math/probability-calculator",
              label: "Probability Calculator",
            },
            { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
            {
              to: "/calculators/math/standard-deviation-calculator",
              label: "Standard Deviation Calculator",
            },
          ]}
        />
      </CalcSection>
    </>
  );
}
