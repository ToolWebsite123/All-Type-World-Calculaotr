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
  FormulaBlock,
  FormulaWithLegend,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import type { Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import { lngamma } from "@/lib/math/t-test";
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

export const Route = createFileRoute("/calculators/math/coin-flip-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Coin Flip Probability Calculator",
      title: "Coin Flip Probability Calculator — Heads, Tails & Streaks",
      metaDescription:
        "Probability of k heads in n coin flips — exact, at least, at most — for fair or biased coins, plus streak odds and full binomial chart.",
      canonicalUrl: "/calculators/math/coin-flip-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Coin Flip Probability Calculator", path: "/calculators/math/coin-flip-calculator" },
      ],
      faqs: [
        {
          q: "What is the probability of flipping a coin and getting heads?",
          a: "For a fair coin, P(heads) = 0.5 (50%) on every single flip. Because each flip is independent, that probability never changes based on previous results.",
        },
        {
          q: "What is the probability of getting exactly 5 heads in 10 flips?",
          a: "C(10, 5) × 0.5^10 = 252 / 1024 ≈ 0.2461, or about 24.6%. That's the single most likely outcome for 10 flips of a fair coin.",
        },
        {
          q: "What are the odds of getting 5 heads in a row?",
          a: "In a single sequence of exactly 5 flips: (1/2)^5 = 1/32 ≈ 3.13%. But within a longer sequence of, say, 20 flips, the probability of at least one 5-heads streak somewhere is much higher — about 25%.",
        },
        {
          q: "Does the coin remember its previous flips?",
          a: "No. Each flip is independent — the coin has no memory. Thinking a heads is 'due' after several tails is the gambler's fallacy. The odds are 50/50 on every individual flip.",
        },
        {
          q: "How do I handle a biased (unfair) coin?",
          a: "Toggle to a custom probability and enter p (the chance of heads on a single flip). All formulas still work — the binomial distribution and streak recurrence just use your p instead of 0.5.",
        },
        {
          q: "Why does 'at least' probability grow so fast as n increases?",
          a: "Every extra flip is another chance for the streak or count to happen. The probability of NOT getting the outcome across all n flips shrinks geometrically, so the complement (at least one occurrence) rises quickly.",
        },
      ],
    }),
  component: CoinFlipPage,
});

/* ---------------- Math ---------------- */

function logBinom(n: number, k: number): number {
  return lngamma(n + 1) - lngamma(k + 1) - lngamma(n - k + 1);
}

function pmf(n: number, k: number, p: number): number {
  if (k < 0 || k > n) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return Math.exp(logBinom(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

function pmfAll(n: number, p: number): number[] {
  const out = new Array(n + 1);
  for (let k = 0; k <= n; k++) out[k] = pmf(n, k, p);
  return out;
}

/** Exact C(n, k) as bigint — used for the step-by-step display. */
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

/** P(no run of ≥ k successes in n independent Bernoulli(p) trials).
 *  DP on current run length; O(n·k). */
function probNoRun(n: number, k: number, p: number): number {
  if (k <= 0) return 0;
  if (k > n) return 1;
  // state[s] = probability of being in "current run of s heads, not yet absorbed"
  // s = 0..k-1, plus one absorbing "reached k" state.
  const state = new Array<number>(k).fill(0);
  state[0] = 1;
  let absorbed = 0;
  const q = 1 - p;
  for (let t = 0; t < n; t++) {
    const next = new Array<number>(k).fill(0);
    for (let s = 0; s < k; s++) {
      const v = state[s];
      if (v === 0) continue;
      // Head: extend the run
      if (s + 1 >= k) absorbed += v * p;
      else next[s + 1] += v * p;
      // Tail: reset
      next[0] += v * q;
    }
    for (let s = 0; s < k; s++) state[s] = next[s];
  }
  return 1 - absorbed;
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
  n,
  probs,
  target,
  mode,
}: {
  n: number;
  probs: number[];
  target: number;
  mode: "exact" | "atLeast" | "atMost";
}) {
  const W = 720;
  const H = 260;
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 34;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const maxP = Math.max(...probs, 1e-12);
  const bw = iw / (n + 1);
  const step = Math.max(1, Math.ceil((n + 1) / 18));

  const highlight = (k: number) =>
    mode === "exact" ? k === target : mode === "atLeast" ? k >= target : k <= target;

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label={`Binomial distribution of number of heads in ${n} flips, highlighting X ${mode === "exact" ? "=" : mode === "atLeast" ? "≥" : "≤"} ${target}`}
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
          const h = (p / maxP) * ih;
          const x = padL + i * bw;
          const y = padT + ih - h;
          const hi = highlight(i);
          return (
            <rect
              key={i}
              x={x + Math.min(1, bw * 0.1)}
              y={y}
              width={Math.max(1, bw - Math.min(2, bw * 0.2))}
              height={Math.max(0.5, h)}
              className={hi ? "fill-primary" : "fill-primary/25"}
            >
              <title>
                X = {i}: P = {p.toFixed(6)}
              </title>
            </rect>
          );
        })}
        {Array.from({ length: n + 1 }, (_, i) => i)
          .filter((i) => i % step === 0 || i === n)
          .map((i) => {
            const x = padL + i * bw + bw / 2;
            return (
              <text
                key={i}
                x={x}
                y={padT + ih + 14}
                textAnchor="middle"
                fontSize="10"
                className="fill-muted-foreground"
              >
                {i}
              </text>
            );
          })}
        <text x={(padL + W - padR) / 2} y={H - 4} textAnchor="middle" fontSize="10" className="fill-muted-foreground">
          Number of heads
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Page ---------------- */

/* ---------------- Educational guide cards ---------------- */

function CoinFacesDiagram() {
  return (
    <svg viewBox="0 0 260 100" className="w-full" role="img" aria-label="Two equally-likely coin outcomes">
      <circle cx={90} cy={50} r={30} fill="var(--color-primary)" opacity={0.25} stroke="var(--color-primary)" strokeWidth={2} />
      <text x={90} y={54} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--color-foreground)">H</text>
      <text x={90} y={92} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">P = p</text>
      <circle cx={170} cy={50} r={30} fill="var(--color-primary)" opacity={0.15} stroke="var(--color-primary)" strokeWidth={2} />
      <text x={170} y={54} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--color-foreground)">T</text>
      <text x={170} y={92} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">P = 1 − p</text>
    </svg>
  );
}

function BinomialBarsDiagram() {
  const bars = [1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1];
  const maxV = Math.max(...bars);
  const W = 260, H = 100;
  const bw = (W - 20) / bars.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Binomial distribution bars for n = 10, p = 0.5">
      {bars.map((v, i) => {
        const h = (v / maxV) * 70;
        return <rect key={i} x={10 + i * bw + 1} y={H - 15 - h} width={bw - 2} height={h} fill="var(--color-primary)" opacity={i === 5 ? 1 : 0.35} />;
      })}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">n = 10 flips, k = 0 … 10 heads</text>
    </svg>
  );
}

function StreakDiagram() {
  return (
    <svg viewBox="0 0 260 90" className="w-full" role="img" aria-label="Streak of consecutive heads within a sequence of flips">
      {"THHHTHTHHT".split("").map((c, i) => {
        const isRun = i >= 1 && i <= 3;
        return (
          <g key={i}>
            <rect x={10 + i * 24} y={30} width={20} height={30} fill={isRun ? "var(--color-primary)" : "var(--color-primary)"} opacity={isRun ? 1 : 0.2} />
            <text x={20 + i * 24} y={50} textAnchor="middle" fontSize={12} fontWeight={700} fill={isRun ? "var(--color-primary-foreground)" : "var(--color-foreground)"}>{c}</text>
          </g>
        );
      })}
      <text x={130} y={80} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">looking for a run of 3+ heads</text>
    </svg>
  );
}

const COIN_GUIDE: GuideCardItem[] = [
  {
    key: "pmf",
    title: "Exact probability of k heads",
    explain:
      "Coin flips are independent Bernoulli trials with a fixed probability p of heads. The number of heads in n flips follows a Binomial(n, p) distribution, whose PMF combines the binomial coefficient with the probabilities of the required heads and tails.",
    formula: <>P(X = k) = C(n, k) · p<sup>k</sup> · (1 − p)<sup>n − k</sup></>,
    legend: [
      { sym: "n", def: "number of flips" },
      { sym: "k", def: "number of heads you want" },
      { sym: "p", def: "probability of heads on any single flip" },
      { sym: "C(n, k)", def: "number of ways to arrange k heads among n flips" },
    ],
    diagram: <CoinFacesDiagram />,
    example: {
      given: "n = 10, k = 5, p = 0.5",
      substitute: "C(10,5) · 0.5⁵ · 0.5⁵ = 252 / 1024",
      answer: "0.2461 (≈ 24.6%)",
    },
  },
  {
    key: "cumulative",
    title: "At least / at most k heads",
    explain:
      "Real questions usually ask 'k or more' or 'k or fewer' heads, which sums point probabilities across a range. The bar chart to the right shows every P(X = i) for n = 10 flips — adding up the bars from k to n gives P(X ≥ k), and from 0 to k gives P(X ≤ k).",
    formula: <>P(X ≥ k) = Σ<sub>i=k..n</sub> P(X = i)</>,
    legend: [
      { sym: "P(X ≥ k)", def: "at least k heads" },
      { sym: "P(X ≤ k)", def: "at most k heads (0 through k)" },
    ],
    diagram: <BinomialBarsDiagram />,
    example: {
      given: "n = 10, k = 7, p = 0.5",
      substitute: "(120 + 45 + 10 + 1) / 1024",
      answer: "P(X ≥ 7) ≈ 0.1719",
    },
  },
  {
    key: "moments",
    title: "Mean and variance",
    explain:
      "The expected number of heads is simply n·p, and the variance is n·p·(1 − p). For a fair coin this simplifies to n/2 and n/4 — so the standard deviation grows only as √n, which is why long runs of flips still cluster tightly around 50% heads.",
    formula: <>μ = n · p &nbsp;·&nbsp; σ² = n · p · (1 − p)</>,
    legend: [
      { sym: "μ", def: "expected number of heads" },
      { sym: "σ²", def: "variance of the head count" },
    ],
    diagram: <BinomialBarsDiagram />,
    example: {
      given: "n = 100, p = 0.5",
      substitute: "μ = 100·0.5, σ² = 100·0.5·0.5",
      answer: "μ = 50, σ = 5",
    },
  },
  {
    key: "streak",
    title: "Probability of a streak",
    explain:
      "The chance of seeing a run of k or more consecutive heads (or tails) somewhere inside n flips is not just k · pᵏ — the possible starting positions overlap. This calculator uses the exact recurrence, so short runs in long sequences come out visibly more common than most people guess.",
    formula: <>P(streak ≥ k in n flips) = 1 − Q<sub>n</sub>&nbsp;&nbsp;(no-run recurrence)</>,
    legend: [
      { sym: "Q_n", def: "probability of no run of length k in n flips" },
      { sym: "k", def: "target streak length" },
      { sym: "n", def: "number of flips" },
    ],
    diagram: <StreakDiagram />,
    example: {
      given: "n = 20 fair flips, k = 5",
      substitute: "1 − Q₂₀ (recurrence)",
      answer: "≈ 0.25 (much higher than 5·0.5⁵ = 0.156)",
    },
  },
];

function CoinFlipPage() {
  // Binomial tool state
  const [nFlips, setNFlips] = useState("10");
  const [kHeads, setKHeads] = useState("5");
  const [fair, setFair] = useState(true);
  const [pHeads, setPHeads] = useState("0.5");

  // Streak tool state
  const [nStreak, setNStreak] = useState("20");
  const [kStreak, setKStreak] = useState("5");
  const [streakSide, setStreakSide] = useState<"heads" | "tails">("heads");
  const [streakFair, setStreakFair] = useState(true);
  const [pStreak, setPStreak] = useState("0.5");

  const [result, setResult] = useState<{
    n: number;
    k: number;
    p: number;
    probs: number[];
    pExact: number;
    pAtLeast: number;
    pAtMost: number;
    mean: number;
    variance: number;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const [streak, setStreak] = useState<{
    n: number;
    k: number;
    p: number;
    side: "heads" | "tails";
    pSingle: number;
    pAny: number;
  } | null>(null);
  const [streakErr, setStreakErr] = useState<string | null>(null);
  const streakRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    const n = Number(nFlips);
    const k = Number(kHeads);
    const p = fair ? 0.5 : Number(pHeads);
    if (!Number.isInteger(n) || n < 1 || n > 2000) {
      setErr("Number of flips must be a whole number between 1 and 2000.");
      return;
    }
    if (!Number.isInteger(k) || k < 0 || k > n) {
      setErr(`Target number of heads must be a whole number between 0 and ${n}.`);
      return;
    }
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      setErr("Probability of heads must be between 0 and 1.");
      return;
    }
    const probs = pmfAll(n, p);
    let pAtLeast = 0;
    let pAtMost = 0;
    for (let i = 0; i <= n; i++) {
      if (i >= k) pAtLeast += probs[i];
      if (i <= k) pAtMost += probs[i];
    }
    setResult({
      n,
      k,
      p,
      probs,
      pExact: probs[k],
      pAtLeast,
      pAtMost,
      mean: n * p,
      variance: n * p * (1 - p),
    });
  };

  const computeStreak = () => {
    setStreakErr(null);
    setStreak(null);
    const n = Number(nStreak);
    const k = Number(kStreak);
    const p = streakFair ? 0.5 : Number(pStreak);
    if (!Number.isInteger(n) || n < 1 || n > 2000) {
      setStreakErr("Number of flips must be a whole number between 1 and 2000.");
      return;
    }
    if (!Number.isInteger(k) || k < 1 || k > n) {
      setStreakErr(`Streak length must be a whole number between 1 and ${n}.`);
      return;
    }
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      setStreakErr("Probability must be between 0 and 1.");
      return;
    }
    // For "tails" streak with heads-probability p, target-side probability is 1 - p.
    const pSide = streakSide === "heads" ? p : 1 - p;
    const pSingle = Math.pow(pSide, k);
    const pAny = 1 - probNoRun(n, k, pSide);
    setStreak({ n, k, p, side: streakSide, pSingle, pAny });
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { n, k, p, pExact, pAtLeast, pAtMost } = result;
    const c = combBig(n, k);
    const q = (1 - p).toFixed(4).replace(/\.?0+$/, "");
    return [
      {
        title: "Given",
        body: (
          <>
            <MathNote>Number of flips, target heads and probability of heads</MathNote>
            <MathLine>n = {n}, k = {k}, p = {p}</MathLine>
          </>
        ),
      },
      {
        title: "Formula — binomial probability",
        body: (
          <>
            <MathNote>
              The number of heads in n independent flips follows a Binomial(n, p) distribution
            </MathNote>
            <MathLine>P(X = k) = C(n, k) · pᵏ · (1 − p)ⁿ⁻ᵏ</MathLine>
          </>
        ),
      },
      {
        title: `Evaluate C(${n}, ${k})`,
        body: (
          <>
            <MathNote>Number of ways to choose which k flips come up heads</MathNote>
            <MathLine>C({n}, {k}) = {n}! / ({k}! · {n - k}!)</MathLine>
            <MathLine>C({n}, {k}) = {c.toString()}</MathLine>
          </>
        ),
      },
      {
        title: `Substitute — P(X = ${k})`,
        body: (
          <>
            <MathNote>Multiply the count of arrangements by the probability of each one</MathNote>
            <MathLine>P(X = {k}) = {c.toString()} · {p}^{k} · {q}^{n - k}</MathLine>
            <MathLine>P(X = {k}) = {fmtP(pExact)} ({fmtPct(pExact)})</MathLine>
          </>
        ),
      },
      {
        title: "Cumulative probabilities",
        body: (
          <>
            <MathNote>Sum the exact-k probabilities over the relevant range of k</MathNote>
            <MathLine>P(X ≥ {k}) = Σ P(X = i), i = {k}..{n}</MathLine>
            <MathLine>P(X ≥ {k}) = {fmtP(pAtLeast)} ({fmtPct(pAtLeast)})</MathLine>
            <MathLine>P(X ≤ {k}) = Σ P(X = i), i = 0..{k}</MathLine>
            <MathLine>P(X ≤ {k}) = {fmtP(pAtMost)} ({fmtPct(pAtMost)})</MathLine>
          </>
        ),
      },
      {
        title: "Mean and variance",
        body: (
          <>
            <MathNote>Expected value and spread of the head count</MathNote>
            <MathLine>μ = n · p = {n} × {p} = {result.mean.toFixed(4).replace(/\.?0+$/, "")}</MathLine>
            <MathLine>σ² = n · p · (1 − p) = {result.variance.toFixed(4).replace(/\.?0+$/, "")}</MathLine>
            <MathLine>σ = √σ² = {Math.sqrt(result.variance).toFixed(4).replace(/\.?0+$/, "")}</MathLine>
          </>
        ),
      },
    ];
  }, [result]);

  const streakSteps: Step[] = useMemo(() => {
    if (!streak) return [];
    const { n, k, side, pSingle, pAny } = streak;
    const pSide = side === "heads" ? streak.p : 1 - streak.p;
    return [
      {
        title: "Given",
        body: (
          <>
            <MathNote>Number of flips, streak length, side and its probability</MathNote>
            <MathLine>n = {n}, k = {k}, side = {side}, p({side}) = {pSide}</MathLine>
          </>
        ),
      },
      {
        title: "Formula — streak probability",
        body: (
          <>
            <MathNote>
              A fixed window has probability p^k; overlapping windows across n flips are handled
              with a run-length recurrence (DP)
            </MathNote>
            <MathLine>P(fixed run of k) = p^k</MathLine>
            <MathLine>P(≥1 streak in n) = 1 − P(no run of k in n)</MathLine>
          </>
        ),
      },
      {
        title: `Substitute — fixed spot of ${k} ${side}`,
        body: (
          <>
            <MathNote>Probability that one specific window of k flips is all {side}</MathNote>
            <MathLine>{pSide}^{k} = {fmtP(pSingle)} ({fmtPct(pSingle)})</MathLine>
          </>
        ),
      },
      {
        title: `Answer — at least one ${k}-${side} streak in ${n} flips`,
        body: (
          <>
            <MathNote>Result of the run-length recurrence over all n flips</MathNote>
            <MathLine>P(≥1 streak) = {fmtP(pAny)} ({fmtPct(pAny)})</MathLine>
          </>
        ),
      },
    ];
  }, [streak]);

  const summary = useMemo(() => {
    if (!result) return "";
    return [
      `Coin flip probability — ${result.n} flips, p(heads) = ${result.p}, target k = ${result.k}`,
      `P(X = ${result.k}) = ${fmtP(result.pExact)} (${fmtPct(result.pExact)})`,
      `P(X ≥ ${result.k}) = ${fmtP(result.pAtLeast)} (${fmtPct(result.pAtLeast)})`,
      `P(X ≤ ${result.k}) = ${fmtP(result.pAtMost)} (${fmtPct(result.pAtMost)})`,
      `Mean = ${result.mean}, Variance = ${result.variance}, SD = ${Math.sqrt(result.variance)}`,
    ].join("\n");
  }, [result]);

  const streakSummary = useMemo(() => {
    if (!streak) return "";
    return [
      `Coin streak probability — ${streak.n} flips, p(heads) = ${streak.p}, run of ${streak.k} ${streak.side}`,
      `P(specific fixed ${streak.k}-run) = ${fmtP(streak.pSingle)} (${fmtPct(streak.pSingle)})`,
      `P(at least one ${streak.k}-run somewhere) = ${fmtP(streak.pAny)} (${fmtPct(streak.pAny)})`,
    ].join("\n");
  }, [streak]);

  return (
    <MathCalcPage
      name="Coin Flip Probability Calculator"
      tagline="Exact probability of getting a given number of heads in n flips — for a fair or biased coin — plus the odds of a streak of k in a row. Full distribution chart and show/hide step-by-step working."
      extras={
        <>
          <CalcSection title="What is coin flip probability?">
            <p>
              A coin flip is the simplest possible random experiment: two outcomes (heads or tails),
              equally likely on a fair coin, and every flip independent of every other flip. That
              independence is what makes it the textbook example for the <strong>binomial distribution</strong> —
              the exact probability model for the number of "successes" in a fixed number of
              independent yes/no trials with a constant success probability.
            </p>
          </CalcSection>

          <CalcSection title="Coin-flip probability, piece by piece">
            <GuideCards items={COIN_GUIDE} />
          </CalcSection>

<CalcSection title="Why streaks are more common than people expect">
            <p>
              A single 5-heads-in-a-row block has probability (1/2)<sup>5</sup> = 1/32 ≈{" "}
              <strong>3.13%</strong>. So people intuitively expect a 5-heads streak to be rare — and
              in a specific 5-flip window it is. But if you flip a fair coin 20 times, you get{" "}
              <strong>16 overlapping windows</strong> where a length-5 streak could start (flips 1–5,
              2–6, 3–7, …, 16–20). Those windows overlap, so we can't just multiply 16 × 3.13% — but
              the actual probability that <em>at least one</em> streak of 5 heads appears somewhere
              in those 20 flips is about <strong>25%</strong>, roughly one in four.
            </p>
            <p>
              That's the gambler's-fallacy trap in reverse: people expect streaks to be rare because
              a single specific streak is rare, but in a long enough sequence <em>some</em> streak is
              almost inevitable. The coin is not "on a hot streak" and it is not "due" for tails — it
              simply has no memory. Independence means each flip has probability p regardless of
              history, and streaks fall out as a mathematical consequence.
            </p>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>The gambler's fallacy.</strong> A run of tails does not make heads more
                likely on the next flip. The coin has no memory; each flip is independent.
              </li>
              <li>
                <strong>Confusing P(exactly k) with P(at least k).</strong> They are very different
                once k moves away from n/2. Always match the question to the right one.
              </li>
              <li>
                <strong>Assuming the "average" is the most likely single value.</strong> The mean of
                10 fair flips is 5 heads, and 5 <em>is</em> the most likely value here — but its
                probability is still only ~24.6%. In most flips you'll see something other than the
                mean.
              </li>
              <li>
                <strong>Multiplying overlapping streak windows.</strong> The chance of at least one
                length-5 streak in 20 flips is NOT 16 × (1/32). Overlaps make the true probability
                harder — use the streak tool above (or the DP behind it).
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Exact probability of exactly, at least, and at most k heads in n flips.",
                "Fair coin (p = 0.5) by default, with a toggle for any biased probability between 0 and 1.",
                "Streak sub-tool: probability of a run of k consecutive heads (or tails) somewhere within n flips — computed exactly, not simulated.",
                "Full binomial distribution bar chart from 0 to n heads with your target highlighted.",
                "Mean μ = n·p, variance σ² = n·p·(1 − p) and standard deviation printed alongside.",
                "Show/hide step-by-step working — including the binomial coefficient and the formula substituted.",
                "Copy the summary as text or download the result panel as a PNG.",
              ]}
            />
          </CalcSection>



          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is the probability of getting 3 heads in 5 flips?",
                  a: <p>C(5, 3) / 2<sup>5</sup> = 10 / 32 = <strong>5/16 ≈ 31.25%</strong>.</p>,
                },
                {
                  q: "What is the probability of 10 heads in a row?",
                  a: <p>(1/2)<sup>10</sup> = 1/1024 ≈ <strong>0.098%</strong>, or roughly one in a thousand for that exact 10-flip sequence.</p>,
                },
                {
                  q: "How does this differ from a coin flip simulator?",
                  a: <p>A simulator generates random flips — you'll see sampling variation. This calculator returns the <em>true</em> probability computed from the binomial formula (or the run-length DP for streaks). No sampling error.</p>,
                },
                {
                  q: "Can I model an unfair coin?",
                  a: <p>Yes — untick the fair-coin toggle and enter any p between 0 and 1. Every probability, mean and streak result adjusts automatically.</p>,
                },
                {
                  q: "What if I want probability of tails instead?",
                  a: <p>For the binomial tool, use k = n − (target tails) and p = 0.5 (or 1 − p for a biased coin). For the streak tool, switch the toggle to tails.</p>,
                },
                {
                  q: "How large an n does the calculator handle?",
                  a: <p>Up to n = 2000. The formula uses log-gamma so probabilities stay numerically stable even for large n and extreme k.</p>,
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/binomial-distribution-calculator", label: "Binomial Distribution Calculator" },
                { to: "/calculators/math/dice-probability-calculator", label: "Dice Probability Calculator" },
                { to: "/calculators/math/probability-calculator", label: "Probability Calculator" },
                { to: "/calculators/math/permutation-combination-calculator", label: "Permutation & Combination Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      {/* ---- Binomial coin tool ---- */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Number of flips (n)">
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            max={2000}
            value={nFlips}
            onChange={(e) => setNFlips(e.target.value)}
          />
        </Field>
        <Field label="Target heads (k)">
          <TextInput
            type="number"
            inputMode="numeric"
            min={0}
            value={kHeads}
            onChange={(e) => setKHeads(e.target.value)}
          />
        </Field>
        <Field label="Coin" hint={fair ? "Fair coin — p = 0.5." : "Enter any p between 0 and 1."}>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={fair} onChange={(e) => setFair(e.target.checked)} />
              Fair
            </label>
            <TextInput
              type="number"
              inputMode="decimal"
              min={0}
              max={1}
              step="0.01"
              value={fair ? "0.5" : pHeads}
              disabled={fair}
              onChange={(e) => setPHeads(e.target.value)}
              className="flex-1"
            />
          </div>
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
              Probabilities for n = {result.n}, p = {result.p}, target k = {result.k}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(
                [
                  { label: `P(X = ${result.k})`, v: result.pExact },
                  { label: `P(X ≥ ${result.k})`, v: result.pAtLeast },
                  { label: `P(X ≤ ${result.k})`, v: result.pAtMost },
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
              Mean μ = <span className="tabular-nums text-foreground">{result.mean}</span> · Variance
              σ² ={" "}
              <span className="tabular-nums text-foreground">
                {Number(result.variance.toFixed(6))}
              </span>{" "}
              · SD σ ={" "}
              <span className="tabular-nums text-foreground">
                {Number(Math.sqrt(result.variance).toFixed(6))}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Binomial distribution — bar highlighted at k = {result.k}
            </div>
            <DistributionChart n={result.n} probs={result.probs} target={result.k} mode="exact" />
          </div>

          <StepsToggle steps={steps} />

          <ResultActions
            getCopyText={() => summary}
            captureRef={resultRef}
            filename={`coin-flip-n${result.n}-k${result.k}`}
          />
        </div>
      )}

      {/* ---- Streak sub-tool ---- */}
      <div className="mt-10 rounded-3xl border border-border/60 bg-secondary/10 p-5">
        <h2 className="mb-1 font-display text-lg font-semibold text-foreground">
          Streak probability
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Probability of getting a run of <strong>k consecutive</strong> heads (or tails) somewhere
          within <strong>n</strong> flips.
        </p>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Number of flips (n)">
            <TextInput
              type="number"
              inputMode="numeric"
              min={1}
              max={2000}
              value={nStreak}
              onChange={(e) => setNStreak(e.target.value)}
            />
          </Field>
          <Field label="Streak length (k)">
            <TextInput
              type="number"
              inputMode="numeric"
              min={1}
              value={kStreak}
              onChange={(e) => setKStreak(e.target.value)}
            />
          </Field>
          <Field label="Streak side">
            <select
              value={streakSide}
              onChange={(e) => setStreakSide(e.target.value as "heads" | "tails")}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="heads">Heads</option>
              <option value="tails">Tails</option>
            </select>
          </Field>
          <Field label="Coin" hint={streakFair ? "Fair coin — p = 0.5." : "Any p in [0, 1]."}>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={streakFair}
                  onChange={(e) => setStreakFair(e.target.checked)}
                />
                Fair
              </label>
              <TextInput
                type="number"
                inputMode="decimal"
                min={0}
                max={1}
                step="0.01"
                value={streakFair ? "0.5" : pStreak}
                disabled={streakFair}
                onChange={(e) => setPStreak(e.target.value)}
                className="flex-1"
              />
            </div>
          </Field>
        </div>

        <div className="mt-4">
          <PrimaryButton onClick={computeStreak}>Compute streak probability</PrimaryButton>
        </div>

        {streakErr && <ErrorBox message={streakErr} />}

        {streak && (
          <div ref={streakRef} className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  P(specific fixed run of {streak.k} {streak.side})
                </div>
                <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                  {fmtPct(streak.pSingle)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {fmtP(streak.pSingle)}
                </div>
              </div>
              <div className="rounded-xl border border-primary/40 bg-primary/[0.08] p-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  P(at least one {streak.k}-{streak.side} run in {streak.n} flips)
                </div>
                <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                  {fmtPct(streak.pAny)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {fmtP(streak.pAny)}
                </div>
              </div>
            </div>

            <StepsToggle steps={streakSteps} />

            <ResultActions
              getCopyText={() => streakSummary}
              captureRef={streakRef}
              filename={`coin-streak-n${streak.n}-k${streak.k}-${streak.side}`}
            />
          </div>
        )}
      </div>
    </MathCalcPage>
  );
}
