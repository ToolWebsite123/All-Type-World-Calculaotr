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

export const Route = createFileRoute("/calculators/math/geometric-distribution-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Geometric Distribution Calculator",
      title: "Geometric Distribution Calculator",
      metaDescription:
        "Compute geometric P(X = k) and cumulative probabilities from success probability p with mean, variance, and chart.",
      canonicalUrl: "/calculators/math/geometric-distribution-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Geometric Distribution Calculator", path: "/calculators/math/geometric-distribution-calculator" },
      ],
      faqs: [
        {
          q: "What is the geometric distribution used for?",
          a: "It models the number of independent Bernoulli trials needed to get the first success — flipping a coin until the first heads, rolling a die until the first 6, or dialling until someone finally picks up. Each trial has the same success probability p and is independent of the others.",
        },
        {
          q: "What is the formula for the geometric distribution?",
          a: "P(X = k) = (1 − p)^(k − 1) · p, where k = 1, 2, 3, … is the trial on which the first success occurs and p is the success probability on any single trial. The cumulative form is P(X ≤ k) = 1 − (1 − p)^k.",
        },
        {
          q: "What is the mean of a geometric distribution?",
          a: "E[X] = 1/p. If p = 0.25 you expect the first success on the 4th trial on average. Variance is (1 − p)/p², so with p = 0.25 the variance is 12 and the standard deviation is ≈ 3.46.",
        },
        {
          q: "Is the geometric distribution the same as the binomial?",
          a: "No. Binomial counts SUCCESSES in a FIXED number of trials n. Geometric counts TRIALS UNTIL the first success — the number of trials is the random variable, and there's always exactly one success (the last trial).",
        },
        {
          q: "Which convention does this calculator use — 'trials until first success' or 'failures before first success'?",
          a: "Trials until the first success (k starts at 1). That matches most textbooks and Excel's GEOM.DIST(k−1, p, FALSE) / TRUE and R's dgeom(k−1, p). If you want the failures-before-success form (k starts at 0), just use k' = k + 1.",
        },
        {
          q: "Why is the geometric distribution 'memoryless'?",
          a: "P(X > s + t | X > s) = P(X > t). Given that no success has happened yet, the probability of waiting t more trials is exactly what it was at the start. The trials have no memory — a long run of failures does not make the next success 'due'.",
        },
      ],
    }),
  component: GeometricDistributionPage,
});

/* ---------------- Math ---------------- */

function pmf(k: number, p: number): number {
  if (k < 1) return 0;
  return Math.pow(1 - p, k - 1) * p;
}

/** P(X ≤ k) = 1 − (1 − p)^k */
function cdf(k: number, p: number): number {
  if (k < 1) return 0;
  return 1 - Math.pow(1 - p, k);
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

/** Reasonable upper cutoff for the chart: the higher of k+5 and where CDF ≈ 0.995,
 *  bounded so it stays legible. */
function chartUpperBound(p: number, k: number): number {
  const target = Math.ceil(Math.log(0.005) / Math.log(1 - p)); // P(X > n) ≤ 0.005
  return Math.max(10, Math.min(60, Math.max(k + 5, target)));
}

/* ---------------- Distribution chart ---------------- */

function DistributionChart({
  probs,
  target,
}: {
  probs: number[]; // index 0 unused; probs[k] is P(X=k)
  target: number;
}) {
  const n = probs.length - 1;
  const W = 720;
  const H = 260;
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 34;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const maxP = Math.max(...probs.slice(1), 1e-12);
  const bw = iw / n;
  const step = Math.max(1, Math.ceil(n / 18));

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label={`Geometric distribution — bars for trials 1 to ${n}, with trial ${target} highlighted`}
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
        {probs.slice(1).map((p, i) => {
          const k = i + 1;
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
        {Array.from({ length: n }, (_, i) => i + 1)
          .filter((k) => k % step === 0 || k === n || k === 1 || k === target)
          .map((k) => {
            const x = padL + (k - 1) * bw + bw / 2;
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
          Trial number of first success (k)
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Page ---------------- */

/* ---------------- Educational guide cards ---------------- */

function GeoBarsDiagram({ p = 0.4 }: { p?: number }) {
  const W = 260, H = 100;
  const bars = Array.from({ length: 8 }, (_, i) => Math.pow(1 - p, i) * p);
  const maxV = bars[0];
  const bw = (W - 20) / bars.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Geometric distribution PMF bars, decreasing geometrically">
      {bars.map((v, i) => {
        const h = (v / maxV) * 70;
        return (
          <g key={i}>
            <rect x={10 + i * bw + 1} y={H - 15 - h} width={bw - 2} height={h} fill="var(--color-primary)" opacity={0.8} />
            <text x={10 + i * bw + bw / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

function GeoCdfDiagram({ p = 0.4 }: { p?: number }) {
  const W = 260, H = 100;
  const pts: string[] = [];
  for (let k = 0; k <= 10; k++) {
    const y = H - 15 - (1 - Math.pow(1 - p, k)) * 70;
    const x = 15 + k * 22;
    pts.push(`${x},${y}`);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Geometric CDF rising from 0 toward 1">
      <line x1={15} y1={H - 15} x2={W - 10} y2={H - 15} stroke="var(--color-border)" />
      <line x1={15} y1={10} x2={15} y2={H - 15} stroke="var(--color-border)" />
      <polyline points={pts.join(" ")} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">k = 0, 1, 2, …</text>
      <text x={8} y={16} textAnchor="end" fontSize={9} fill="var(--color-muted-foreground)">1.0</text>
    </svg>
  );
}

function GeoTailDiagram({ p = 0.4 }: { p?: number }) {
  const W = 260, H = 100;
  const bars = Array.from({ length: 8 }, (_, i) => Math.pow(1 - p, i) * p);
  const maxV = bars[0];
  const bw = (W - 20) / bars.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Tail probability P(X > k) shaded">
      {bars.map((v, i) => {
        const h = (v / maxV) * 70;
        return (
          <rect
            key={i}
            x={10 + i * bw + 1}
            y={H - 15 - h}
            width={bw - 2}
            height={h}
            fill="var(--color-primary)"
            opacity={i > 3 ? 0.85 : 0.2}
          />
        );
      })}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">shaded: P(X &gt; 4) = (1 − p)⁴</text>
    </svg>
  );
}

function GeoMeanDiagram() {
  return (
    <svg viewBox="0 0 260 90" className="w-full" role="img" aria-label="Mean 1 over p marked on the x-axis">
      <line x1={20} y1={60} x2={240} y2={60} stroke="var(--color-border)" />
      {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
        <line key={k} x1={20 + (k - 1) * 30} y1={55} x2={20 + (k - 1) * 30} y2={65} stroke="var(--color-muted-foreground)" />
      ))}
      <line x1={20 + 4 * 30} y1={25} x2={20 + 4 * 30} y2={70} stroke="var(--color-primary)" strokeDasharray="4 3" strokeWidth={2} />
      <text x={20 + 4 * 30} y={20} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-primary)">μ = 1/p = 5</text>
      <text x={130} y={82} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">expected trial of first success</text>
    </svg>
  );
}

const GEO_GUIDE: GuideCardItem[] = [
  {
    key: "pmf",
    title: "PMF — the trial of the first success",
    explain:
      "Each trial is independent with success probability p. The first success lands on trial k precisely when the first k − 1 trials fail and the k-th succeeds — an event with probability (1 − p)^(k − 1) · p.",
    formula: <>P(X = k) = (1 − p)<sup>k − 1</sup> · p &nbsp;(k = 1, 2, 3, …)</>,
    legend: [
      { sym: "p", def: "success probability per trial (constant)" },
      { sym: "k", def: "trial on which the first success occurs" },
    ],
    diagram: <GeoBarsDiagram />,
    example: {
      given: "p = 1/6, k = 3",
      substitute: "(5/6)² · (1/6) = 25/216",
      answer: "≈ 0.1157 (11.6%)",
    },
  },
  {
    key: "cdf",
    title: "CDF — success by trial k",
    explain:
      "The CDF collapses to a simple closed form: the only way to have no success by trial k is for all k trials to fail, so P(X ≤ k) = 1 − (1 − p)^k.",
    formula: <>P(X ≤ k) = 1 − (1 − p)<sup>k</sup></>,
    legend: [
      { sym: "1 − p", def: "failure probability per trial" },
      { sym: "(1 − p)^k", def: "probability of all k failures" },
    ],
    diagram: <GeoCdfDiagram />,
    example: {
      given: "p = 1/6, k = 6",
      substitute: "1 − (5/6)⁶ = 1 − 15625/46656",
      answer: "≈ 0.6651 (66.5%)",
    },
  },
  {
    key: "tail",
    title: "Tail — still waiting after k",
    explain:
      "The complement of the CDF: the probability that the first success has not yet arrived after k trials. This is the same as the probability of k straight failures, and it makes the memoryless property visible.",
    formula: <>P(X &gt; k) = (1 − p)<sup>k</sup></>,
    legend: [
      { sym: "P(X > k)", def: "no success in the first k trials" },
    ],
    diagram: <GeoTailDiagram />,
    example: {
      given: "p = 1/6, k = 6",
      substitute: "(5/6)⁶ = 15625/46656",
      answer: "≈ 0.3349 (33.5%)",
    },
  },
  {
    key: "moments",
    title: "Answer — mean, variance, SD",
    explain:
      "The expected number of trials is simply 1/p — a small p means a long wait. Variance is (1 − p)/p², and the standard deviation is close to the mean for small p, which is why the geometric distribution has such a long right tail.",
    formula: <>μ = 1/p &nbsp;·&nbsp; σ² = (1 − p)/p² &nbsp;·&nbsp; σ = √σ²</>,
    legend: [
      { sym: "μ", def: "expected trial of first success" },
      { sym: "σ²", def: "variance of X" },
    ],
    diagram: <GeoMeanDiagram />,
    example: {
      given: "p = 1/6",
      substitute: "μ = 6, σ² = (5/6)/(1/36) = 30",
      answer: "μ = 6, σ ≈ 5.48",
    },
  },
];

function GeometricDistributionPage() {
  const [pStr, setPStr] = useState("0.5");
  const [kStr, setKStr] = useState("3");

  const [result, setResult] = useState<{
    p: number;
    k: number;
    pExact: number;
    pAtMost: number;
    pGreater: number;
    mean: number;
    variance: number;
    sd: number;
    probs: number[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    const p = Number(pStr);
    const k = Number(kStr);
    if (!Number.isFinite(p) || p <= 0 || p > 1) {
      setErr("Probability of success p must be greater than 0 and no more than 1.");
      return;
    }
    if (!Number.isInteger(k) || k < 1 || k > 100000) {
      setErr("Trial number k must be a whole number ≥ 1 (and ≤ 100000).");
      return;
    }
    const pExact = pmf(k, p);
    const pAtMost = cdf(k, p);
    const pGreater = 1 - pAtMost;
    const mean = 1 / p;
    const variance = (1 - p) / (p * p);
    const upper = chartUpperBound(p, k);
    const probs: number[] = new Array(upper + 1);
    probs[0] = 0;
    for (let i = 1; i <= upper; i++) probs[i] = pmf(i, p);
    setResult({
      p,
      k,
      pExact,
      pAtMost,
      pGreater,
      mean,
      variance,
      sd: Math.sqrt(variance),
      probs,
    });
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { p, k, pExact, pAtMost, pGreater, mean, variance, sd } = result;
    const q = 1 - p;
    const qStr = q.toFixed(6).replace(/\.?0+$/, "");
    return [
      {
        title: "Given — geometric model",
        body: (
          <>
            <MathNote>
              Each trial is independent with success probability p = {p}. Let X be the trial on which
              the first success occurs.
            </MathNote>
            <MathLine>X ~ Geometric(p = {p})</MathLine>
            <MathLine>P(X = k) = (1 − p)^(k − 1) · p</MathLine>
          </>
        ),
      },
      {
        title: `P(X = ${k})`,
        body: (
          <>
            <MathNote>Substitute k = {k} into the PMF</MathNote>
            <MathLine>P(X = {k}) = ({qStr})^{k - 1} · {p}</MathLine>
            <MathLine>P(X = {k}) = {fmtP(pExact)} ({fmtPct(pExact)})</MathLine>
          </>
        ),
      },
      {
        title: `P(X ≤ ${k}) — the CDF`,
        body: (
          <>
            <MathNote>Use the closed form for the cumulative probability</MathNote>
            <MathLine>P(X ≤ k) = 1 − (1 − p)^k</MathLine>
            <MathLine>P(X ≤ {k}) = 1 − ({qStr})^{k}</MathLine>
            <MathLine>P(X ≤ {k}) = {fmtP(pAtMost)} ({fmtPct(pAtMost)})</MathLine>
          </>
        ),
      },
      {
        title: `P(X > ${k})`,
        body: (
          <>
            <MathNote>The complement of the CDF — the first success takes more than {k} trials</MathNote>
            <MathLine>P(X &gt; k) = (1 − p)^k</MathLine>
            <MathLine>P(X &gt; {k}) = ({qStr})^{k}</MathLine>
            <MathLine>P(X &gt; {k}) = {fmtP(pGreater)} ({fmtPct(pGreater)})</MathLine>
          </>
        ),
      },
      {
        title: "Answer — mean, variance, SD",
        body: (
          <>
            <MathNote>Compute the moments of the geometric distribution</MathNote>
            <MathLine>μ = 1/p = 1/{p} = {Number(mean.toFixed(6))}</MathLine>
            <MathLine>
              σ² = (1 − p)/p² = {qStr}/{(p * p).toFixed(6).replace(/\.?0+$/, "")} = {Number(variance.toFixed(6))}
            </MathLine>
            <MathLine>σ = {Number(sd.toFixed(6))}</MathLine>
          </>
        ),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    return [
      `Geometric distribution — p = ${result.p}, k = ${result.k}`,
      `P(X = ${result.k}) = ${fmtP(result.pExact)} (${fmtPct(result.pExact)})`,
      `P(X ≤ ${result.k}) = ${fmtP(result.pAtMost)} (${fmtPct(result.pAtMost)})`,
      `P(X > ${result.k}) = ${fmtP(result.pGreater)} (${fmtPct(result.pGreater)})`,
      `Mean = ${result.mean}, Variance = ${result.variance}, SD = ${result.sd}`,
    ].join("\n");
  }, [result]);

  return (
    <MathCalcPage
      name="Geometric Distribution Calculator"
      tagline="Probability the first success happens on trial k — plus the CDF, the tail, and the mean 1/p. Full distribution chart and show/hide step-by-step working."
      extras={
        <>
          <CalcSection title="What is the geometric distribution?">
            <p>
              The <strong>geometric distribution</strong> answers the question: &quot;How many
              independent trials do I need until the first success?&quot; Each trial has the same
              success probability p, and X — the trial number on which the first success occurs —
              is the random variable. It can take any whole value 1, 2, 3, … with no upper bound.
            </p>
            <p>
              A classic example: flip a fair coin (p = 0.5) until the first heads appears. Then P(X =
              1) = 0.5 (heads on the first flip), P(X = 2) = 0.5 · 0.5 = 0.25 (a tail then a head), P(X
              = 3) = 0.5² · 0.5 = 0.125, and so on — the probabilities halve every trial. On average
              you'll wait 1/0.5 = <strong>2 flips</strong> for the first heads.
            </p>
          </CalcSection>

          <CalcSection title="The geometric distribution, piece by piece">
            <GuideCards items={GEO_GUIDE} />
            <p className="mt-3 text-sm text-muted-foreground">
              This calculator uses the &quot;trials until first success&quot; convention (k = 1, 2, 3, …).
              For the &quot;failures before first success&quot; form (k' = 0, 1, 2, …), just use k' = k − 1.
            </p>
          </CalcSection>

<CalcSection title="Geometric vs binomial distribution">
            <p>
              These get mixed up constantly because both live on the same Bernoulli-trial setup, but
              they answer different questions:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="py-2 pr-3"></th>
                    <th className="py-2 pr-3">Binomial(n, p)</th>
                    <th className="py-2">Geometric(p)</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:border-b [&_td]:border-border/40 [&_td]:py-2 [&_td]:pr-3">
                  <tr>
                    <td className="text-muted-foreground">Random variable</td>
                    <td>Number of successes</td>
                    <td>Trial of the first success</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Number of trials</td>
                    <td>Fixed (n)</td>
                    <td>Random — keep going until success</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Range</td>
                    <td>0, 1, 2, …, n</td>
                    <td>1, 2, 3, … (no upper limit)</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Mean</td>
                    <td>n · p</td>
                    <td>1/p</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Typical question</td>
                    <td>&quot;In 10 flips, what's P(exactly 3 heads)?&quot;</td>
                    <td>&quot;How many flips until the first heads?&quot;</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              Rule of thumb: if the problem gives you a fixed n and asks about the count of
              successes, it's binomial. If the problem stops as soon as the first success happens and
              asks about the trial number, it's geometric.
            </p>
          </CalcSection>



          <CalcSection title="The memoryless property">
            <p>
              The geometric distribution is the only discrete distribution that is{" "}
              <strong>memoryless</strong>: <code>P(X &gt; s + t | X &gt; s) = P(X &gt; t)</code>. If
              you've already made s trials without a success, the probability of needing more than t
              additional trials is exactly what it was at the start.
            </p>
            <p>
              In plain terms: past failures do not make future success &quot;due&quot;. If you've
              rolled the die 10 times without a 6, your expected wait for the first 6 is still 6 more
              rolls, not fewer. This is the gambler's-fallacy trap dressed in slightly different
              clothes.
            </p>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Confusing the two conventions.</strong> Some textbooks use X = failures
                before the first success (starts at 0), others use X = trial of the first success
                (starts at 1). This calculator uses the latter — subtract 1 from k if you need the
                other form.
              </li>
              <li>
                <strong>Using the geometric formula when trials are fixed.</strong> If the problem
                fixes n and asks about the number of successes, that's binomial — not geometric.
              </li>
              <li>
                <strong>Thinking the mean is 1 − p or p.</strong> Neither. The mean is <code>1/p</code>{" "}
                — the smaller p is, the longer you wait, and the wait grows fast (p = 0.1 → mean 10,
                p = 0.01 → mean 100).
              </li>
              <li>
                <strong>Believing past failures shorten the future wait.</strong> They don't. The
                memoryless property is real — the process resets its expectation on every trial.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Exact P(X = k), P(X ≤ k) and P(X > k) using the closed-form (1 − p)^(k−1) · p and 1 − (1 − p)^k.",
                "Mean 1/p, variance (1 − p)/p² and standard deviation printed alongside every result.",
                "Full geometric-distribution bar chart with your target k highlighted, auto-scaled to cover ≥ 99.5% of the mass.",
                "Handles any p in (0, 1] and any k up to 100,000.",
                "Show/hide step-by-step working with the formulas substituted using your own numbers.",
                "Copy the summary as text or download the result panel as a PNG.",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is P(X = 1) for a geometric distribution?",
                  a: <p>Just p. The first trial is either a success (probability p) or a failure — no earlier trials to condition on.</p>,
                },
                {
                  q: "Why does P(X = k) shrink geometrically?",
                  a: <p>Each additional trial requires one more failure with probability (1 − p), so each step multiplies the probability by (1 − p). That's the &quot;geometric&quot; in the name — successive probabilities form a geometric sequence.</p>,
                },
                {
                  q: "Can k be 0?",
                  a: <p>Not in this convention. The first success has to happen on some trial, so k = 1, 2, 3, … If you're using the &quot;failures before first success&quot; version, k = 0 is allowed and corresponds to a success on trial 1 here.</p>,
                },
                {
                  q: "What happens if p = 1?",
                  a: <p>Every trial is a guaranteed success, so P(X = 1) = 1 and P(X = k) = 0 for k &gt; 1. Mean = 1, variance = 0.</p>,
                },
                {
                  q: "How does this relate to the negative binomial distribution?",
                  a: <p>The geometric is the special case of the negative binomial where you're waiting for exactly r = 1 success. For r &gt; 1 successes, use the negative binomial formula instead.</p>,
                },
                {
                  q: "Where does the geometric distribution show up in real problems?",
                  a: <p>Anywhere you retry until success: cold-calling until someone answers, quality-testing units off a line until a defect, spawning enemies in a game until the first rare drop, retrying a flaky API call until it succeeds. Also the discrete counterpart of the exponential distribution in reliability.</p>,
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/binomial-distribution-calculator", label: "Binomial Distribution Calculator" },
                { to: "/calculators/math/probability-calculator", label: "Probability Calculator" },
                { to: "/calculators/math/poisson-distribution-calculator", label: "Poisson Distribution Calculator" },
                { to: "/calculators/math/exponential-distribution-calculator", label: "Exponential Distribution Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Probability of success per trial (p)" hint="Any value in (0, 1]. E.g. 0.5 for a coin, 0.1667 for rolling a 6.">
          <TextInput
            type="number"
            inputMode="decimal"
            min={0}
            max={1}
            step="0.01"
            value={pStr}
            onChange={(e) => setPStr(e.target.value)}
          />
        </Field>
        <Field label="Trial of first success (k)" hint="Whole number ≥ 1 — the trial where the first success occurs.">
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            value={kStr}
            onChange={(e) => setKStr(e.target.value)}
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
              Geometric(p = {result.p}) — target k = {result.k}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(
                [
                  { label: `P(X = ${result.k})`, v: result.pExact },
                  { label: `P(X ≤ ${result.k})`, v: result.pAtMost },
                  { label: `P(X > ${result.k})`, v: result.pGreater },
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
              Mean μ = 1/p ={" "}
              <span className="tabular-nums text-foreground">{Number(result.mean.toFixed(6))}</span>{" "}
              · Variance σ² = (1 − p)/p² ={" "}
              <span className="tabular-nums text-foreground">
                {Number(result.variance.toFixed(6))}
              </span>{" "}
              · SD σ ={" "}
              <span className="tabular-nums text-foreground">{Number(result.sd.toFixed(6))}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Geometric distribution — bar highlighted at k = {result.k}
            </div>
            <DistributionChart probs={result.probs} target={result.k} />
          </div>

          <StepsToggle steps={steps} />

          <ResultActions
            getCopyText={() => summary}
            captureRef={resultRef}
            filename={`geometric-distribution-p${result.p}-k${result.k}`}
          />
        </div>
      )}
    </MathCalcPage>
  );
}
