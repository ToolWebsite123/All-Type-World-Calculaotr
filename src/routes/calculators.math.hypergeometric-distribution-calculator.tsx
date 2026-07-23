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
  FormulaBlock,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  type GuideCardItem,
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

export const Route = createFileRoute("/calculators/math/hypergeometric-distribution-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Hypergeometric Distribution Calculator",
      title: "Hypergeometric Distribution Calculator",
      metaDescription:
        "Compute hypergeometric P(X = k) and cumulative probabilities from population, successes, and sample size.",
      canonicalUrl: "/calculators/math/hypergeometric-distribution-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Hypergeometric Distribution Calculator", path: "/calculators/math/hypergeometric-distribution-calculator" },
      ],
      faqs: [
        {
          q: "When should I use the hypergeometric distribution?",
          a: "Whenever you're drawing a sample WITHOUT replacement from a finite population containing a known number of 'successes'. Card hands, lottery matches, MTG opening-hand probabilities, and small-batch quality control are the classic cases.",
        },
        {
          q: "What is the formula for the hypergeometric distribution?",
          a: "P(X = k) = C(K, k) · C(N − K, n − k) / C(N, n), where N is the population size, K is the number of successes in the population, n is the sample size, and k is the number of successes observed in the sample.",
        },
        {
          q: "What is the mean of the hypergeometric distribution?",
          a: "E[X] = n · K / N. If you draw a 5-card hand from a 52-card deck (4 aces), the expected number of aces is 5 · 4 / 52 = 20/52 ≈ 0.385.",
        },
        {
          q: "How is hypergeometric different from binomial?",
          a: "Binomial assumes replacement, so the success probability p stays constant on every trial. Hypergeometric samples WITHOUT replacement, so each draw changes the composition of what's left. The two agree closely when the sample is small relative to the population (n / N < ~5%).",
        },
        {
          q: "Can I use this for Magic: the Gathering opening-hand math?",
          a: "Yes. Set N = 60 (or 40 for Commander), K = number of the card type you're checking (e.g. lands), n = 7 for the opening hand, k = number you want to see. The calculator gives the exact probability.",
        },
        {
          q: "What are the valid values of k?",
          a: "k must satisfy max(0, n − (N − K)) ≤ k ≤ min(n, K). Anything outside that range has probability 0 — for example, you can't draw 3 aces in a 5-card hand from a deck that has 4 aces if k > 4, or fewer than 0.",
        },
      ],
    }),
  component: HypergeometricPage,
});

/* ---------------- Math (reuses nCr pattern from combinations-counter) ---------------- */

function nCrBig(n: number, r: number): bigint {
  if (r < 0 || r > n) return 0n;
  if (r > n - r) r = n - r;
  let num = 1n;
  let den = 1n;
  for (let i = 1; i <= r; i++) {
    num *= BigInt(n - r + i);
    den *= BigInt(i);
  }
  return num / den;
}

/** Exact hypergeometric P(X = k) as a JS number via BigInt intermediates. */
function pmf(N: number, K: number, n: number, k: number): number {
  if (k < 0 || k > n || k > K || n - k > N - K) return 0;
  const num = nCrBig(K, k) * nCrBig(N - K, n - k);
  const den = nCrBig(N, n);
  if (den === 0n) return 0;
  // Convert ratio safely: divide as bigints for magnitude, then a Number remainder.
  // For chart-scale precision, direct Number conversion is fine when both fit;
  // otherwise use ratio via Number(num) / Number(den) which stays accurate up to 2^53.
  return Number(num) / Number(den);
}

function fmtBig(b: bigint): string {
  return b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtP(x: number): string {
  if (!Number.isFinite(x)) return "—";
  if (x === 0) return "0";
  if (x === 1) return "1";
  if (x < 1e-4) return x.toExponential(4);
  return x.toFixed(6);
}

function fmtPct(x: number, dp = 4): string {
  if (!Number.isFinite(x)) return "—";
  const v = x * 100;
  if (v === 0) return "0%";
  if (v === 100) return "100%";
  if (v < 1e-3) return `${v.toExponential(2)}%`;
  return `${Number(v.toFixed(dp))}%`;
}

/* ---------------- Distribution chart ---------------- */

function DistributionChart({
  kMin,
  probs,
  target,
}: {
  kMin: number;
  probs: number[];
  target: number;
}) {
  const len = probs.length;
  const kMax = kMin + len - 1;
  const W = 720;
  const H = 260;
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 34;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const maxP = Math.max(...probs, 1e-12);
  const bw = iw / len;
  const step = Math.max(1, Math.ceil(len / 18));

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label={`Hypergeometric distribution — bars for k = ${kMin} to ${kMax}, with k = ${target} highlighted`}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[520px]"
      >
        <line x1={padL} y1={padT} x2={padL} y2={padT + ih} stroke="currentColor" className="text-border" />
        <line x1={padL} y1={padT + ih} x2={padL + iw} y2={padT + ih} stroke="currentColor" className="text-border" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const v = t * maxP;
          const y = padT + ih - t * ih;
          return (
            <g key={t}>
              <line x1={padL - 3} y1={y} x2={padL} y2={y} stroke="currentColor" className="text-muted-foreground/60" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" className="fill-muted-foreground">
                {v < 0.001 ? v.toExponential(1) : v.toFixed(3)}
              </text>
            </g>
          );
        })}
        {probs.map((p, i) => {
          const k = kMin + i;
          const h = (p / maxP) * ih;
          const x = padL + i * bw;
          const y = padT + ih - h;
          const hi = k === target;
          return (
            <rect
              key={k}
              x={x + Math.min(1, bw * 0.1)}
              y={y}
              width={Math.max(1, bw - Math.min(2, bw * 0.2))}
              height={Math.max(0.5, h)}
              className={hi ? "fill-primary" : "fill-primary/25"}
            >
              <title>
                X = {k}: P = {p.toFixed(6)}
              </title>
            </rect>
          );
        })}
        {Array.from({ length: len }, (_, i) => kMin + i)
          .filter((k) => (k - kMin) % step === 0 || k === kMax || k === kMin || k === target)
          .map((k) => {
            const x = padL + (k - kMin) * bw + bw / 2;
            return (
              <text
                key={k}
                x={x}
                y={padT + ih + 14}
                textAnchor="middle"
                fontSize="10"
                className="fill-muted-foreground"
              >
                {k}
              </text>
            );
          })}
        <text x={(padL + W - padR) / 2} y={H - 4} textAnchor="middle" fontSize="10" className="fill-muted-foreground">
          Number of successes in the sample (k)
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Page ---------------- */

/* ---------------- Educational guide cards ---------------- */

function UrnDiagram() {
  return (
    <svg viewBox="0 0 260 110" className="w-full" role="img" aria-label="Population of N with K successes; sample of n drawn without replacement">
      <rect x={10} y={20} width={140} height={75} rx={10} fill="var(--color-primary)" opacity={0.1} stroke="var(--color-primary)" />
      <text x={80} y={15} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">population N</text>
      {Array.from({ length: 20 }, (_, i) => {
        const x = 22 + (i % 7) * 18;
        const y = 34 + Math.floor(i / 7) * 20;
        const success = i < 6;
        return <circle key={i} cx={x} cy={y} r={5} fill="var(--color-primary)" opacity={success ? 0.9 : 0.25} />;
      })}
      <rect x={165} y={30} width={85} height={55} rx={10} fill="var(--color-primary)" opacity={0.15} stroke="var(--color-primary)" />
      <text x={207} y={25} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">sample n</text>
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={180 + i * 15} cy={58} r={5} fill="var(--color-primary)" opacity={i < 2 ? 0.9 : 0.25} />
      ))}
      <text x={207} y={100} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">k successes in sample</text>
    </svg>
  );
}

function HyperMeanDiagram() {
  return (
    <svg viewBox="0 0 260 90" className="w-full" role="img" aria-label="Mean n K / N marked on a number line">
      <line x1={20} y1={55} x2={240} y2={55} stroke="var(--color-border)" />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <g key={k}>
          <line x1={20 + k * 44} y1={50} x2={20 + k * 44} y2={60} stroke="var(--color-muted-foreground)" />
          <text x={20 + k * 44} y={72} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">{k}</text>
        </g>
      ))}
      <line x1={20 + 0.385 * 44} y1={25} x2={20 + 0.385 * 44} y2={62} stroke="var(--color-primary)" strokeDasharray="4 3" strokeWidth={2} />
      <text x={20 + 0.385 * 44} y={20} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-primary)">μ = nK/N ≈ 0.385</text>
    </svg>
  );
}

function HyperVarDiagram() {
  return (
    <svg viewBox="0 0 260 100" className="w-full" role="img" aria-label="Variance shrinks with the finite population correction">
      {[0, 1, 2].map((i) => {
        const width = [90, 60, 30][i];
        const label = ["binomial", "n/N = 0.3", "n/N = 0.9"][i];
        return (
          <g key={i}>
            <rect x={130 - width / 2} y={20 + i * 25} width={width} height={16} rx={4} fill="var(--color-primary)" opacity={0.75 - i * 0.2} />
            <text x={130 + width / 2 + 6} y={32 + i * 25} fontSize={10} fill="var(--color-muted-foreground)">{label}</text>
          </g>
        );
      })}
      <text x={130} y={95} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">FPC (N − n)/(N − 1) shrinks Var toward 0 as n → N</text>
    </svg>
  );
}

function RangeDiagram() {
  return (
    <svg viewBox="0 0 260 90" className="w-full" role="img" aria-label="Valid k range shown on a number line">
      <line x1={20} y1={50} x2={240} y2={50} stroke="var(--color-border)" strokeWidth={2} />
      <line x1={80} y1={50} x2={200} y2={50} stroke="var(--color-primary)" strokeWidth={4} />
      <circle cx={80} cy={50} r={5} fill="var(--color-primary)" />
      <circle cx={200} cy={50} r={5} fill="var(--color-primary)" />
      <text x={80} y={38} textAnchor="middle" fontSize={10} fill="var(--color-primary)">max(0, n − (N−K))</text>
      <text x={200} y={38} textAnchor="middle" fontSize={10} fill="var(--color-primary)">min(n, K)</text>
      <text x={130} y={78} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">outside this range, P(X = k) = 0</text>
    </svg>
  );
}

const HYPER_GUIDE: GuideCardItem[] = [
  {
    key: "pmf",
    title: "PMF — sampling without replacement",
    explain:
      "Pick k successes out of the K available, then fill the remaining n − k spots from the N − K failures, and divide by all equally-likely samples of size n. That ratio is the exact probability of observing k successes.",
    formula: <>P(X = k) = C(K, k) · C(N − K, n − k) / C(N, n)</>,
    legend: [
      { sym: "N", def: "population size" },
      { sym: "K", def: "successes in the population" },
      { sym: "n", def: "sample size" },
      { sym: "k", def: "observed successes in the sample" },
    ],
    diagram: <UrnDiagram />,
    example: {
      given: "N=52, K=4 aces, n=5, k=2",
      substitute: "C(4,2)·C(48,3)/C(52,5) = 6·17,296/2,598,960",
      answer: "≈ 0.03993 (≈ 4.0%)",
    },
  },
  {
    key: "mean",
    title: "Expected number of successes",
    explain:
      "The mean is the fraction of the population that is a success, scaled up by the sample size. It matches the intuition: sampling 10% of a population is expected to give you 10% of the successes.",
    formula: <>E[X] = n · K / N</>,
    legend: [
      { sym: "n", def: "sample size" },
      { sym: "K / N", def: "share of successes in the population" },
    ],
    diagram: <HyperMeanDiagram />,
    example: {
      given: "N=52, K=4, n=5",
      substitute: "5 · 4 / 52 = 20/52",
      answer: "≈ 0.385 aces per hand",
    },
  },
  {
    key: "var",
    title: "Variance and the finite-population correction",
    explain:
      "Hypergeometric variance is the binomial variance n·p·(1 − p) multiplied by the finite-population correction (N − n)/(N − 1). Every draw without replacement removes uncertainty, so the sampling distribution is tighter than the with-replacement (binomial) counterpart.",
    formula: <>Var(X) = n · K/N · (N − K)/N · (N − n)/(N − 1)</>,
    legend: [
      { sym: "(N − n)/(N − 1)", def: "finite-population correction (FPC)" },
      { sym: "n · K/N · (N − K)/N", def: "the corresponding binomial variance" },
    ],
    diagram: <HyperVarDiagram />,
    example: {
      given: "N=52, K=4, n=5",
      substitute: "5·(4/52)·(48/52)·(47/51)",
      answer: "Var ≈ 0.3273",
    },
  },
  {
    key: "range",
    title: "Valid range of k",
    explain:
      "k can't exceed either the sample size n or the number of successes K, and it can't be so small that the remaining n − k failures exceed the N − K available failures. Anything outside that range has probability exactly 0.",
    formula: <>max(0, n − (N − K)) ≤ k ≤ min(n, K)</>,
    legend: [
      { sym: "min(n, K)", def: "upper bound — can't observe more successes than exist" },
      { sym: "max(0, n − (N − K))", def: "lower bound — some successes are forced when failures run out" },
    ],
    diagram: <RangeDiagram />,
    example: {
      given: "N=10, K=8, n=5",
      substitute: "max(0, 5 − 2) = 3 ≤ k ≤ min(5, 8) = 5",
      answer: "k ∈ {3, 4, 5}",
    },
  },
];

function HypergeometricPage() {
  const [NStr, setNStr] = useState("52");
  const [KStr, setKStr] = useState("4");
  const [nStr, setNSampleStr] = useState("5");
  const [kStr, setKStr2] = useState("2");

  const [result, setResult] = useState<{
    N: number;
    K: number;
    n: number;
    k: number;
    kMin: number;
    kMax: number;
    probs: number[];
    pExact: number;
    pAtMost: number;
    pAtLeast: number;
    mean: number;
    variance: number;
    sd: number;
    binomialApprox: number;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    const N = Number(NStr);
    const K = Number(KStr);
    const n = Number(nStr);
    const k = Number(kStr);
    if (!Number.isInteger(N) || N < 1 || N > 100000) {
      setErr("Population size N must be a whole number between 1 and 100,000.");
      return;
    }
    if (!Number.isInteger(K) || K < 0 || K > N) {
      setErr(`Successes in the population K must be a whole number between 0 and ${N}.`);
      return;
    }
    if (!Number.isInteger(n) || n < 1 || n > N) {
      setErr(`Sample size n must be a whole number between 1 and ${N}.`);
      return;
    }
    if (!Number.isInteger(k) || k < 0 || k > n) {
      setErr(`Observed successes k must be a whole number between 0 and ${n}.`);
      return;
    }
    const kMin = Math.max(0, n - (N - K));
    const kMax = Math.min(n, K);
    const probs: number[] = [];
    for (let i = kMin; i <= kMax; i++) probs.push(pmf(N, K, n, i));
    let pAtMost = 0;
    let pAtLeast = 0;
    const pExact = pmf(N, K, n, k);
    for (let i = kMin; i <= kMax; i++) {
      if (i <= k) pAtMost += pmf(N, K, n, i);
      if (i >= k) pAtLeast += pmf(N, K, n, i);
    }
    const mean = (n * K) / N;
    const variance =
      N > 1 ? (n * K * (N - K) * (N - n)) / (N * N * (N - 1)) : 0;
    // Binomial-with-replacement approximation for the comparison box
    const p = K / N;
    // P(X = k) under Binomial(n, p) using log-gamma for stability
    const lg = (x: number) => {
      // Lanczos approx sufficient for small n; small-n loop is fine here.
      let sum = 0;
      for (let i = 2; i < x; i++) sum += Math.log(i);
      return sum;
    };
    const logC = lg(n + 1) - lg(k + 1) - lg(n - k + 1);
    const binomialApprox =
      p === 0 || p === 1
        ? p === 1
          ? k === n
            ? 1
            : 0
          : k === 0
            ? 1
            : 0
        : Math.exp(logC + k * Math.log(p) + (n - k) * Math.log(1 - p));

    setResult({
      N,
      K,
      n,
      k,
      kMin,
      kMax,
      probs,
      pExact,
      pAtMost,
      pAtLeast,
      mean,
      variance,
      sd: Math.sqrt(variance),
      binomialApprox,
    });
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { N, K, n, k, pExact, pAtMost, pAtLeast, mean, variance, sd } = result;
    const CKk = nCrBig(K, k);
    const CNKnk = nCrBig(N - K, n - k);
    const CNn = nCrBig(N, n);
    return [
      {
        title: "Given — hypergeometric model",
        body: (
          <div>
            <MathNote>
              Population N = {N} with K = {K} "successes" and N − K = {N - K} "failures". Draw
              n = {n} items without replacement. X = number of successes in the sample.
            </MathNote>
            <MathLine>P(X = k) = C(K, k) · C(N − K, n − k) / C(N, n)</MathLine>
          </div>
        ),
      },
      {
        title: `Count favourable draws for k = ${k}`,
        body: (
          <div>
            <MathNote>Choose which {k} of the {K} successes are in the sample:</MathNote>
            <MathLine>C({K}, {k}) = {fmtBig(CKk)}</MathLine>
            <MathNote>Fill the remaining {n - k} spots from the {N - K} failures:</MathNote>
            <MathLine>C({N - K}, {n - k}) = {fmtBig(CNKnk)}</MathLine>
            <MathNote>Multiply for favourable samples:</MathNote>
            <MathLine>{fmtBig(CKk)} · {fmtBig(CNKnk)} = {fmtBig(CKk * CNKnk)}</MathLine>
          </div>
        ),
      },
      {
        title: "Substitute — equally-likely samples",
        body: (
          <div>
            <MathNote>All ways to draw n = {n} items from N = {N}:</MathNote>
            <MathLine>C({N}, {n}) = {fmtBig(CNn)}</MathLine>
          </div>
        ),
      },
      {
        title: `P(X = ${k})`,
        body: (
          <div>
            <MathLine>P(X = {k}) = {fmtBig(CKk * CNKnk)} / {fmtBig(CNn)}</MathLine>
            <MathLine>P(X = {k}) = {fmtP(pExact)} ({fmtPct(pExact)})</MathLine>
          </div>
        ),
      },
      {
        title: `P(X ≤ ${k}) and P(X ≥ ${k})`,
        body: (
          <div>
            <MathNote>Cumulative sums across the valid range k = {result.kMin} … {result.kMax}:</MathNote>
            <MathLine>P(X ≤ {k}) = {fmtP(pAtMost)} ({fmtPct(pAtMost)})</MathLine>
            <MathLine>P(X ≥ {k}) = {fmtP(pAtLeast)} ({fmtPct(pAtLeast)})</MathLine>
          </div>
        ),
      },
      {
        title: "Answer — mean, variance, SD",
        body: (
          <div>
            <MathLine>E[X] = n · K / N = {n} · {K} / {N} = {Number(mean.toFixed(6))}</MathLine>
            <MathLine>
              Var(X) = n · K · (N − K) · (N − n) / (N² · (N − 1)) = {Number(variance.toFixed(6))}
            </MathLine>
            <MathLine>SD = √Var(X) = {Number(sd.toFixed(6))}</MathLine>
            <MathNote>
              The (N − n)/(N − 1) "finite population correction" shrinks the variance versus the
              binomial, since sampling without replacement gives more information per draw.
            </MathNote>
          </div>
        ),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    return [
      `Hypergeometric — N = ${result.N}, K = ${result.K}, n = ${result.n}, k = ${result.k}`,
      `P(X = ${result.k}) = ${fmtP(result.pExact)} (${fmtPct(result.pExact)})`,
      `P(X ≤ ${result.k}) = ${fmtP(result.pAtMost)} (${fmtPct(result.pAtMost)})`,
      `P(X ≥ ${result.k}) = ${fmtP(result.pAtLeast)} (${fmtPct(result.pAtLeast)})`,
      `Mean = ${result.mean}, Variance = ${result.variance}, SD = ${result.sd}`,
    ].join("\n");
  }, [result]);

  return (
    <MathCalcPage
      name="Hypergeometric Distribution Calculator"
      tagline="Sampling without replacement — probability of exactly, at most or at least k successes in a sample of n from a finite population of N with K successes. Full distribution chart and show/hide step-by-step working."
      extras={
        <>
          <CalcSection title="What is the hypergeometric distribution?">
            <p>
              The <strong>hypergeometric distribution</strong> is the probability model for sampling{" "}
              <strong>without replacement</strong> from a finite population. Picture an urn with N
              balls, K of them red and N − K blue. You reach in and grab n balls (without putting
              any back). Let X be the number of red balls you pulled out. Then X follows a
              hypergeometric distribution, and the probability of getting exactly k red is{" "}
              <code>C(K, k) · C(N − K, n − k) / C(N, n)</code>.
            </p>
            <p>
              The classic example is a card deck: N = 52 cards, K = 4 aces. If you deal a five-card
              hand, the number of aces in that hand is hypergeometric. Same idea applies to lottery
              matches (K winning numbers in the pool), quality control (K defective units in a batch),
              and card-game deckbuilding (K copies of a specific card in a shuffled deck).
            </p>
          </CalcSection>

          <CalcSection title="The hypergeometric distribution, piece by piece">
            <GuideCards items={HYPER_GUIDE} />
          </CalcSection>

<CalcSection title="Hypergeometric vs binomial — when does 'without replacement' matter?">
            <p>
              Binomial assumes every trial has the same success probability p — i.e. you're replacing
              each item before drawing the next, or the population is effectively infinite.
              Hypergeometric samples without replacement, so p changes after each draw.
            </p>
            <p>
              For the 5-card / 2-aces example above, the binomial approximation with p = 4/52 = 1/13
              gives:
            </p>
            <FormulaBlock>
              C(5, 2) · (1/13)² · (12/13)³ = 10 · (1/169) · (1728/2197) ≈ <strong>0.04655</strong> (≈ 4.66%)
            </FormulaBlock>
            <p>
              vs the true hypergeometric answer of <strong>3.99%</strong>. The binomial is off by
              about 17% relative — noticeable, because the sample (5) is a meaningful fraction of the
              population (52). If you were drawing 5 cards from a shoe of 5,000 shuffled cards
              instead, the two answers would be nearly identical.
            </p>
            <p>
              <strong>Rule of thumb:</strong> if <code>n / N &lt; 0.05</code> the binomial
              approximation is usually fine. Above that, use the hypergeometric formula.
            </p>
          </CalcSection>

          <CalcSection title="Real-world uses">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Card games.</strong> Poker odds, bridge hand distributions, and MTG
                opening-hand probabilities (e.g. &quot;chance of at least 3 lands in a 7-card opening
                hand of a 60-card deck with 24 lands&quot; = hypergeometric with N = 60, K = 24, n =
                7, k ≥ 3).
              </li>
              <li>
                <strong>Lottery matches.</strong> How many of your r picked numbers match the r
                drawn numbers, out of a pool of N.
              </li>
              <li>
                <strong>Quality control on small batches.</strong> A batch of N units contains K
                defective items. You test n units. What is the probability of finding k defects?
              </li>
              <li>
                <strong>Ecology — capture-recapture.</strong> Given K tagged animals in a population
                of N, the number tagged in a recapture sample of n is hypergeometric.
              </li>
              <li>
                <strong>A/B sampling from a finite audience.</strong> When your test population is
                small enough that draws aren't independent, the hypergeometric is the correct model.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Using the binomial when the sample is large relative to the population.</strong>{" "}
                For n/N &gt; 5% you'll systematically over- or underestimate — use hypergeometric.
              </li>
              <li>
                <strong>Forgetting the k range.</strong> If N − K &lt; n − k the probability is 0
                (you can't have that many failures) even though the formula &quot;looks&quot; like it
                should produce a number. This calculator handles it automatically.
              </li>
              <li>
                <strong>Confusing K (successes in the population) with k (successes in the sample).</strong>{" "}
                Different letters, different roles — K is a fixed population parameter, k is the
                observed count in your draw.
              </li>
              <li>
                <strong>Mixing up P(X = k) with P(X ≥ k).</strong> For &quot;at least&quot; questions
                (like MTG mulligans — &quot;probability of at least 3 lands&quot;), you need the
                cumulative sum, not the point probability.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Exact P(X = k) via combinations — uses BigInt so the numbers stay exact for large N.",
                "Cumulative P(X ≤ k) and P(X ≥ k) computed across the full valid k range.",
                "Mean nK/N and variance with the finite-population correction (N − n)/(N − 1) printed alongside.",
                "Full probability bar chart across max(0, n − (N − K)) … min(n, K) with your target k highlighted.",
                "Side-by-side binomial comparison so you can see when 'with vs without replacement' makes a real difference.",
                "Works for card hands, lottery matches, quality-control batches, and card-game (MTG/deckbuilding) hand probabilities.",
                "Show/hide step-by-step working with each combination and the final division.",
                "Copy the summary as text or download the result panel as a PNG.",
              ]}
            />
          </CalcSection>



          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is C(n, r) — the combinations formula?",
                  a: <p><code>C(n, r) = n! / (r! · (n − r)!)</code>. It counts the number of ways to choose r items from n where order doesn't matter. See the <a className="underline" href="/calculators/math/combinations-counter-calculator">Combinations Counter</a>.</p>,
                },
                {
                  q: "Does the order of the sample matter?",
                  a: <p>No. Hypergeometric treats the sample as a set — {'{'}A, K, Q{'}'} is the same as {'{'}Q, K, A{'}'}. If order matters you'd use permutations instead.</p>,
                },
                {
                  q: "Can I use this for MTG or Yu-Gi-Oh deck probabilities?",
                  a: <p>Yes. Set N to your deck size (60 for standard MTG, 40 for Commander opening, etc.), K to the number of the target card in the deck, n to the hand size and k to how many copies you want to see.</p>,
                },
                {
                  q: "What if K = 0 or K = N?",
                  a: <p>If K = 0 there are no successes to draw, so P(X = 0) = 1. If K = N every item is a success, so P(X = n) = 1. The calculator handles both.</p>,
                },
                {
                  q: "How large an N does this handle?",
                  a: <p>Up to 100,000. Combinations use BigInt intermediates so the ratio stays accurate; final probabilities are converted to standard doubles.</p>,
                },
                {
                  q: "Why does the variance use (N − n)/(N − 1)?",
                  a: <p>That's the finite-population correction. It shrinks the variance below the binomial value n·p·(1−p) because sampling without replacement removes uncertainty faster — every draw actually tells you more.</p>,
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/combinations-counter-calculator", label: "Combinations Counter" },
                { to: "/calculators/math/binomial-distribution-calculator", label: "Binomial Distribution Calculator" },
                { to: "/calculators/math/probability-calculator", label: "Probability Calculator" },
                { to: "/calculators/math/geometric-distribution-calculator", label: "Geometric Distribution Calculator" },
                { to: "/calculators/math/lottery-odds-calculator", label: "Lottery Odds Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Population size (N)" hint="Total items in the population. E.g. 52 for a deck of cards.">
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            value={NStr}
            onChange={(e) => setNStr(e.target.value)}
          />
        </Field>
        <Field label="Successes in the population (K)" hint="How many items are the 'success' type. E.g. 4 aces.">
          <TextInput
            type="number"
            inputMode="numeric"
            min={0}
            value={KStr}
            onChange={(e) => setKStr(e.target.value)}
          />
        </Field>
        <Field label="Sample size (n)" hint="Number drawn without replacement. E.g. 5 for a poker hand.">
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            value={nStr}
            onChange={(e) => setNSampleStr(e.target.value)}
          />
        </Field>
        <Field label="Observed successes (k)" hint="How many successes in the sample you're computing the probability for.">
          <TextInput
            type="number"
            inputMode="numeric"
            min={0}
            value={kStr}
            onChange={(e) => setKStr2(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <PrimaryButton onClick={compute}>Compute probability</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <div ref={resultRef} className="mt-5 space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Hypergeometric(N = {result.N}, K = {result.K}, n = {result.n}) — target k = {result.k}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(
                [
                  { label: `P(X = ${result.k})`, v: result.pExact },
                  { label: `P(X ≤ ${result.k})`, v: result.pAtMost },
                  { label: `P(X ≥ ${result.k})`, v: result.pAtLeast },
                ] as const
              ).map((it) => (
                <div key={it.label} className="rounded-xl border border-border/60 bg-background/60 p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {it.label}
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                    {fmtPct(it.v)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground tabular-nums">{fmtP(it.v)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              Mean μ = nK/N ={" "}
              <span className="tabular-nums text-foreground">{Number(result.mean.toFixed(6))}</span>{" "}
              · Variance σ² ={" "}
              <span className="tabular-nums text-foreground">
                {Number(result.variance.toFixed(6))}
              </span>{" "}
              · SD σ ={" "}
              <span className="tabular-nums text-foreground">{Number(result.sd.toFixed(6))}</span>
            </div>
            <div className="mt-3 rounded-xl border border-border/50 bg-background/50 p-3 text-xs text-muted-foreground">
              <span className="text-foreground">Binomial approximation (with replacement, p = K/N = {(result.K / result.N).toFixed(4)}):</span>{" "}
              P(X = {result.k}) ≈{" "}
              <span className="tabular-nums text-foreground">{fmtPct(result.binomialApprox)}</span>.{" "}
              {Math.abs(result.binomialApprox - result.pExact) / Math.max(result.pExact, 1e-12) > 0.05
                ? "The two differ — your sample is a meaningful fraction of the population, so the hypergeometric answer above is the correct one to use."
                : "The two agree closely — the sample is small relative to N, so the binomial approximation is fine here."}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Hypergeometric distribution — bar highlighted at k = {result.k}
            </div>
            <DistributionChart kMin={result.kMin} probs={result.probs} target={result.k} />
          </div>

          <StepsToggle steps={steps} />

          <ResultActions
            getCopyText={() => summary}
            captureRef={resultRef}
            filename={`hypergeometric-N${result.N}-K${result.K}-n${result.n}-k${result.k}`}
          />
        </div>
      )}
    </MathCalcPage>
  );
}
