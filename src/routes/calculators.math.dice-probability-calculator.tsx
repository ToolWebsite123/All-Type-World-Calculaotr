import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
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
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import { bigGcd } from "@/lib/math/fraction-big";
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

const DICE_GUIDE: GuideCardItem[] = [
  {
    key: "space",
    title: "1. Sample space — every face is equally likely",
    explain:
      "With one s-sided die each face has probability 1/s. Roll n independent dice and the number of ordered outcomes multiplies to s^n. Two d6 have 6² = 36 ordered outcomes; three d6 have 6³ = 216.",
    formula: <>Total outcomes = s<sup>n</sup></>,
    legend: [
      { sym: "s", def: "sides on each die" },
      { sym: "n", def: "number of dice" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 80" className="w-full max-w-[240px]" aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i}>
              <rect x={20 + i * 34} y={20} width="26" height="26" rx="4" className="fill-primary/30 stroke-primary" />
              <text x={33 + i * 34} y={38} fontSize="12" textAnchor="middle" className="fill-primary">{i + 1}</text>
            </g>
          ))}
          <text x="120" y="70" fontSize="10" textAnchor="middle" className="fill-muted-foreground">1 d6 → 6 equally likely faces</text>
        </svg>
      </div>
    ),
    example: {
      given: "3 dice, 6 sides",
      substitute: "6³",
      answer: "216 outcomes",
    },
  },
  {
    key: "ways",
    title: "2. Count the ways to make a target sum",
    explain:
      "P(sum = T) is (ways to make T) ÷ s^n. The ways come from the coefficient of x^T in (x + x² + … + x^s)^n. The calculator builds these counts with a small dynamic-programming loop — exact even for 6d20.",
    formula: <>P(sum = T) = ways(T) / s<sup>n</sup></>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="90" x2="220" y2="90" className="stroke-border" />
          {[6, 12, 18, 24, 30, 36, 30, 24, 18, 12, 6].map((h, i) => (
            <rect key={i} x={26 + i * 17} y={90 - h} width="12" height={h} className={i === 5 ? "fill-primary" : "fill-primary/40"} />
          ))}
          <text x="120" y="105" fontSize="9" textAnchor="middle" className="fill-muted-foreground">2d6 sum distribution — peak at 7</text>
        </svg>
      </div>
    ),
    example: {
      given: "2d6, T = 7",
      substitute: "6 / 36",
      answer: "P = 1/6 ≈ 16.67%",
    },
  },
  {
    key: "cumulative",
    title: "3. At-least and at-most probabilities",
    explain:
      "P(sum ≥ T) sums ways for every T′ ≥ T; P(sum ≤ T) sums the other tail. Because probabilities on disjoint outcomes add, you never double-count as long as ranges don't overlap.",
    formula: (
      <>
        P(sum ≥ T) = Σ<sub>t ≥ T</sub> ways(t) / s<sup>n</sup>
      </>
    ),
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="90" x2="220" y2="90" className="stroke-border" />
          {[6, 12, 18, 24, 30, 36, 30, 24, 18, 12, 6].map((h, i) => (
            <rect key={i} x={26 + i * 17} y={90 - h} width="12" height={h} className={i >= 6 ? "fill-primary" : "fill-primary/25"} />
          ))}
          <text x="120" y="105" fontSize="9" textAnchor="middle" className="fill-muted-foreground">shaded = sum ≥ 8</text>
        </svg>
      </div>
    ),
    example: {
      given: "2d6, T = 8",
      substitute: "(5+4+3+2+1)/36",
      answer: "P = 5/12 ≈ 41.67%",
    },
  },
  {
    key: "shape",
    title: "4. Why sums look triangular then bell-shaped",
    explain:
      "One die is uniform, two dice give a triangle (many ways to make middle sums, one way for extremes), three or more dice quickly look like a bell — a direct visual of the Central Limit Theorem for independent identical variables.",
    formula: <>1 die → uniform · 2 dice → triangle · ≥3 → ≈ normal</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded bg-primary/10 py-1 text-primary">1 die → flat (uniform)</div>
          <div className="rounded bg-primary/10 py-1 text-primary">2 dice → triangular peak</div>
          <div className="rounded bg-primary/10 py-1 text-primary">≥ 3 dice → bell curve (CLT)</div>
        </div>
      </div>
    ),
    example: {
      given: "3d6",
      substitute: "peak at 10 or 11",
      answer: "≈ Normal shape",
    },
  },
];


export const Route = createFileRoute("/calculators/math/dice-probability-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Dice Probability Calculator",
      title: "Dice Probability Calculator — Rolls & Sums",
      metaDescription:
        "Probability of any sum with 1–6 dice (4, 6, 8, 10, 12 or 20 sides). Exact, at-least, at-most as fraction, decimal and percent.",
      canonicalUrl: "/calculators/math/dice-probability-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Dice Probability Calculator", path: "/calculators/math/dice-probability-calculator" },
      ],
      faqs: [
        {
          q: "What is the probability of rolling a 7 with two six-sided dice?",
          a: "There are 6 ways to make 7 (1+6, 2+5, 3+4, 4+3, 5+2, 6+1) out of 36 equally likely outcomes, so P(sum = 7) = 6/36 = 1/6 ≈ 16.67%. It's the single most likely sum with 2d6.",
        },
        {
          q: "Why isn't every sum equally likely?",
          a: "Only the individual faces of one die are equally likely. When you add dice, the middle sums can be made in many different ways while the extreme sums (like 2 or 12 with two dice) can only be made one way. That's why the distribution of the sum is a triangle for 2 dice and a bell shape for 3 or more.",
        },
        {
          q: "How does this calculator handle polyhedral dice like d20?",
          a: "It builds the exact probability distribution for any combination of 1–6 dice with 4, 6, 8, 10, 12 or 20 sides using dynamic programming — the same method behind tabletop probability tools like AnyDice. Every count is exact (no simulation).",
        },
        {
          q: "What's the difference between 'exactly', 'at least' and 'at most'?",
          a: "P(sum = T) counts only outcomes whose total equals T. P(sum ≥ T) adds up every outcome from T to the maximum possible sum. P(sum ≤ T) adds up every outcome from the minimum sum up to T. The three always sum to 1 + P(sum = T) because the exact case is counted in both the ≥ and ≤ totals.",
        },
        {
          q: "How many outcomes are there when I roll n dice with s sides?",
          a: "s^n — each die is independent, so the total number of equally likely ordered outcomes is sides raised to the power of the number of dice. For 3d6 that's 6³ = 216 outcomes.",
        },
        {
          q: "Why do fair dice still produce streaks?",
          a: "Independence doesn't mean 'evenly spread out'. Any specific short streak has a small probability but there are so many possible short streaks that at least one of them almost always shows up in a long session. The calculator reports the probability of a single roll — not the probability that a streak never happens.",
        },
      ],
    }),
  component: DiceProbabilityPage,
});

/* ---------------- Math ---------------- */

/** dist[k - numDice] = number of ways to roll sum = k with numDice dice of sides sides.
 *  Length = numDice*(sides-1) + 1. Uses BigInt for exact counts. */
function rollDistribution(numDice: number, sides: number): bigint[] {
  // dp[s] = number of ways to reach sum s after i dice
  let dp: bigint[] = [1n]; // 0 dice, sum = 0
  for (let i = 0; i < numDice; i++) {
    const next = new Array<bigint>(dp.length + sides).fill(0n);
    for (let j = 0; j < dp.length; j++) {
      const v = dp[j];
      if (v === 0n) continue;
      for (let f = 1; f <= sides; f++) next[j + f] += v;
    }
    dp = next;
  }
  // Trim leading zeros (sums below numDice are impossible)
  return dp.slice(numDice);
}

function bigPow(base: bigint, exp: number): bigint {
  let r = 1n;
  let b = base;
  let e = exp;
  while (e > 0) {
    if (e & 1) r *= b;
    b *= b;
    e >>= 1;
  }
  return r;
}

function fmtFraction(num: bigint, den: bigint): string {
  if (num === 0n) return "0";
  const g = bigGcd(num, den);
  const n = num / g;
  const d = den / g;
  return d === 1n ? n.toString() : `${n.toString()}/${d.toString()}`;
}

function fmtDecimal(num: bigint, den: bigint, dp = 6): string {
  if (num === 0n) return "0";
  if (num === den) return "1";
  const scale = 10n ** BigInt(dp);
  const scaled = (num * scale) / den;
  const s = scaled.toString().padStart(dp + 1, "0");
  const whole = s.slice(0, s.length - dp);
  const frac = s.slice(s.length - dp).replace(/0+$/, "");
  return frac.length ? `${whole}.${frac}` : whole;
}

function fmtPercent(num: bigint, den: bigint, dp = 4): string {
  if (num === 0n) return "0%";
  if (num === den) return "100%";
  const scale = 10n ** BigInt(dp + 2);
  const scaled = (num * scale) / den;
  const s = scaled.toString().padStart(dp + 1, "0");
  const whole = s.slice(0, s.length - dp);
  const frac = s.slice(s.length - dp).replace(/0+$/, "");
  return frac.length ? `${whole}.${frac}%` : `${whole}%`;
}

/* ---------------- Distribution chart ---------------- */

function DistributionChart({
  dist,
  numDice,
  target,
  mode,
}: {
  dist: bigint[];
  numDice: number;
  target: number;
  mode: "exact" | "atLeast" | "atMost";
}) {
  const width = 720;
  const height = 260;
  const padL = 40;
  const padR = 16;
  const padT = 20;
  const padB = 34;
  const iw = width - padL - padR;
  const ih = height - padT - padB;
  const n = dist.length;
  const maxCount = dist.reduce((m, v) => (v > m ? v : m), 0n);
  const maxNum = Number(maxCount);
  const barW = iw / n;

  const isHighlighted = (sum: number): boolean => {
    if (mode === "exact") return sum === target;
    if (mode === "atLeast") return sum >= target;
    return sum <= target;
  };

  // y ticks: 4 lines
  const yTicks = 4;

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label={`Probability distribution of the sum of ${numDice} dice`}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
      >
        {/* Axes */}
        <line
          x1={padL}
          x2={width - padR}
          y1={height - padB}
          y2={height - padB}
          stroke="var(--color-foreground)"
          strokeWidth={1}
          opacity={0.6}
        />
        {/* Y grid */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const y = padT + (ih * i) / yTicks;
          const val = maxNum * (1 - i / yTicks);
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={width - padR}
                y1={y}
                y2={y}
                stroke="var(--color-foreground)"
                opacity={0.08}
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                fill="var(--color-muted-foreground)"
              >
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {dist.map((c, i) => {
          const sum = i + numDice;
          const num = Number(c);
          const h = maxNum > 0 ? (num / maxNum) * ih : 0;
          const x = padL + i * barW + 1;
          const y = padT + (ih - h);
          const hi = isHighlighted(sum);
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={Math.max(barW - 2, 1)}
                height={Math.max(h, 0.5)}
                fill={hi ? "var(--color-primary)" : "var(--color-muted-foreground)"}
                fillOpacity={hi ? 0.9 : 0.28}
              >
                <title>
                  sum = {sum}: {num} way{num === 1 ? "" : "s"}
                </title>
              </rect>
            </g>
          );
        })}

        {/* X-axis labels — every kth to avoid crowding */}
        {(() => {
          const stride = Math.max(1, Math.ceil(n / 16));
          return dist.map((_, i) => {
            if (i % stride !== 0 && i !== n - 1) return null;
            const sum = i + numDice;
            const x = padL + i * barW + barW / 2;
            return (
              <text
                key={`x-${i}`}
                x={x}
                y={height - padB + 14}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-muted-foreground)"
              >
                {sum}
              </text>
            );
          });
        })()}
        <text
          x={(padL + width - padR) / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize={10}
          fill="var(--color-muted-foreground)"
        >
          Sum of dice
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Page ---------------- */

const SIDES_OPTIONS = [4, 6, 8, 10, 12, 20];

function DiceProbabilityPage() {
  const [numDice, setNumDice] = useState(2);
  const [sides, setSides] = useState(6);
  const [target, setTarget] = useState("7");
  const [result, setResult] = useState<{
    numDice: number;
    sides: number;
    target: number;
    dist: bigint[];
    total: bigint;
    minSum: number;
    maxSum: number;
    exactCount: bigint;
    atLeastCount: bigint;
    atMostCount: bigint;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setResult(null);
    setErr(null);
    const t = Number(target);
    if (!Number.isInteger(t)) {
      setErr("Target sum must be a whole number.");
      return;
    }
    const minSum = numDice;
    const maxSum = numDice * sides;
    if (t < minSum || t > maxSum) {
      setErr(
        `Target sum must be between ${minSum} and ${maxSum} for ${numDice} d${sides} dice.`,
      );
      return;
    }
    const dist = rollDistribution(numDice, sides);
    const total = bigPow(BigInt(sides), numDice);
    const idx = t - numDice;
    const exactCount = dist[idx];
    let atLeastCount = 0n;
    for (let i = idx; i < dist.length; i++) atLeastCount += dist[i];
    let atMostCount = 0n;
    for (let i = 0; i <= idx; i++) atMostCount += dist[i];
    setResult({
      numDice,
      sides,
      target: t,
      dist,
      total,
      minSum,
      maxSum,
      exactCount,
      atLeastCount,
      atMostCount,
    });
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { numDice: n, sides: s, target: t, total, dist, exactCount, atLeastCount, atMostCount } =
      result;
    const combos: string[] = [];
    if (n === 2 && Number(exactCount) <= 24) {
      for (let a = 1; a <= s; a++) {
        const b = t - a;
        if (b >= 1 && b <= s) combos.push(`(${a}, ${b})`);
      }
    }
    return [
      {
        title: "Given",
        body: (
          <MathLine>
            n = {n} dice, sides = {s}, target sum t = {t}
          </MathLine>
        ),
      },
      {
        title: "Total outcomes = sides^dice",
        body: (
          <>
            <MathNote>Each die is independent, so the sample space multiplies</MathNote>
            <MathLine>total = sⁿ</MathLine>
            <MathLine>total = {s}^{n}</MathLine>
            <MathLine>total = {total.toString()}</MathLine>
          </>
        ),
      },
      {
        title: `Favorable outcomes for sum = ${t}`,
        body: (
          <>
            <MathNote>
              N(t) is the number of ordered outcomes whose faces add to t (coefficient of xᵗ in (x+…+xˢ)ⁿ)
            </MathNote>
            <MathLine>N({t}) = {exactCount.toString()}</MathLine>
            {combos.length > 0 && <MathLine>pairs: {combos.join(", ")}</MathLine>}
          </>
        ),
      },
      {
        title: "Favorable outcomes for at-least and at-most",
        body: (
          <>
            <MathNote>Sum the counts for every qualifying total (disjoint outcomes add)</MathNote>
            <MathLine>N(sum ≥ {t}) = {atLeastCount.toString()}</MathLine>
            <MathLine>N(sum ≤ {t}) = {atMostCount.toString()}</MathLine>
          </>
        ),
      },
      {
        title: "P = favorable / total",
        body: (
          <>
            <MathNote>Divide favorable outcomes by the total outcomes for each query</MathNote>
            <MathLine>
              P(sum = {t}) = {exactCount.toString()} / {total.toString()} = {fmtFraction(exactCount, total)} ≈ {fmtDecimal(exactCount, total)} ({fmtPercent(exactCount, total)})
            </MathLine>
            <MathLine>
              P(sum ≥ {t}) = {atLeastCount.toString()} / {total.toString()} = {fmtFraction(atLeastCount, total)} ≈ {fmtDecimal(atLeastCount, total)} ({fmtPercent(atLeastCount, total)})
            </MathLine>
            <MathLine>
              P(sum ≤ {t}) = {atMostCount.toString()} / {total.toString()} = {fmtFraction(atMostCount, total)} ≈ {fmtDecimal(atMostCount, total)} ({fmtPercent(atMostCount, total)})
            </MathLine>
          </>
        ),
      },
      {
        title: "Full distribution — counts by sum",
        body: (
          <MathNote>
            {dist.map((c, i) => `sum ${i + n}: ${c.toString()} way${c === 1n ? "" : "s"}`).join(" · ")}
          </MathNote>
        ),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    return [
      `Dice probability — ${result.numDice}d${result.sides}, target sum = ${result.target}`,
      `Total outcomes: ${result.total.toString()}`,
      `P(sum = ${result.target}) = ${fmtFraction(result.exactCount, result.total)} ≈ ${fmtDecimal(result.exactCount, result.total)} (${fmtPercent(result.exactCount, result.total)})`,
      `P(sum ≥ ${result.target}) = ${fmtFraction(result.atLeastCount, result.total)} ≈ ${fmtDecimal(result.atLeastCount, result.total)} (${fmtPercent(result.atLeastCount, result.total)})`,
      `P(sum ≤ ${result.target}) = ${fmtFraction(result.atMostCount, result.total)} ≈ ${fmtDecimal(result.atMostCount, result.total)} (${fmtPercent(result.atMostCount, result.total)})`,
    ].join("\n");
  }, [result]);

  const minSum = numDice;
  const maxSum = numDice * sides;

  return (
    <MathCalcPage
      name="Dice Probability Calculator"
      tagline="Pick your dice and a target sum to get the exact, at-least and at-most probabilities — as a fraction, decimal and percent — plus the full sum-distribution chart and step-by-step working."
      extras={
        <>
          <CalcSection title="Dice probability explained, step by step">
            <p>
              Every face of a fair die is equally likely, so probability comes
              down to counting favorable outcomes and dividing by the total.
              Each card below covers one piece of the counting logic this
              calculator uses.
            </p>
            <GuideCards items={DICE_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Supports 1–6 dice with any of the six standard polyhedral shapes: d4, d6, d8, d10, d12 and d20.",
                "Computes exact, at-least and at-most probabilities in one click — no rounding, no simulation.",
                "Shows every probability three ways: reduced fraction, decimal and percent.",
                "Draws the full probability distribution of the sum with the target range highlighted.",
                "Show/hide step-by-step working — including how many face-combinations make each sum.",
                "Copy the summary as text or download the result panel and chart as a PNG.",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is the most probable sum with 2d6?",
                  a: <p><strong>7</strong>, with probability 6/36 = 1/6 ≈ 16.67%. It's the only sum every face of one die can pair with a valid face on the other die.</p>,
                },
                {
                  q: "What are the odds of rolling snake eyes (two 1s)?",
                  a: <p>Exactly one favorable outcome out of 36 — P = 1/36 ≈ 2.78%. Same as rolling boxcars (two 6s).</p>,
                },
                {
                  q: "How is this different from a dice roller?",
                  a: <p>A dice roller simulates individual rolls at random. This calculator returns the <em>true</em> probability, computed exactly from the underlying combinatorics — no sampling error, no simulation runs needed.</p>,
                },
                {
                  q: "Does this handle unusual dice like d3 or d100?",
                  a: <p>Not yet — the dropdowns cover the six standard polyhedral shapes (d4, d6, d8, d10, d12, d20) that account for almost every real-world use. The underlying algorithm supports arbitrary sides; ping us if you need d100 support and we'll add it.</p>,
                },
                {
                  q: "Are the probabilities exact or approximate?",
                  a: <p>Exact. The calculator uses BigInt arithmetic to count outcomes and only rounds when presenting the decimal and percent form. The fraction is always fully reduced.</p>,
                },
                {
                  q: "How do I read the distribution chart?",
                  a: <p>Each bar is a possible sum. Bar height is the number of ways to roll that sum (equivalently, the probability, since every ordered outcome is equally likely). Bars matching your query (exact, ≥ target, ≤ target) are highlighted in the accent color.</p>,
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/probability-calculator", label: "Probability Calculator" },
                { to: "/calculators/math/combinations-counter-calculator", label: "Combinations Counter" },
                { to: "/calculators/math/binomial-distribution-calculator", label: "Binomial Distribution Calculator" },
                { to: "/calculators/math/permutation-combination-calculator", label: "Permutation & Combination Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Number of dice">
          <select
            value={numDice}
            onChange={(e) => setNumDice(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sides per die">
          <select
            value={sides}
            onChange={(e) => setSides(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {SIDES_OPTIONS.map((s) => (
              <option key={s} value={s}>
                d{s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Target sum" hint={`Between ${minSum} and ${maxSum}.`}>
          <input
            type="number"
            value={target}
            min={minSum}
            max={maxSum}
            step={1}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              Probabilities for {result.numDice}d{result.sides}, target sum = {result.target}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(
                [
                  { label: `P(sum = ${result.target})`, count: result.exactCount, mode: "exact" },
                  { label: `P(sum ≥ ${result.target})`, count: result.atLeastCount, mode: "atLeast" },
                  { label: `P(sum ≤ ${result.target})`, count: result.atMostCount, mode: "atMost" },
                ] as const
              ).map((it) => (
                <div
                  key={it.label}
                  className="rounded-xl border border-border/60 bg-background/60 p-3"
                >
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {it.label}
                  </div>
                  <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                    {fmtPercent(it.count, result.total)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {fmtFraction(it.count, result.total)} ≈ {fmtDecimal(it.count, result.total)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              Total outcomes = {result.sides}
              <sup>{result.numDice}</sup> ={" "}
              <span className="tabular-nums text-foreground">{result.total.toString()}</span> · sum
              range <span className="tabular-nums text-foreground">{result.minSum}</span> to{" "}
              <span className="tabular-nums text-foreground">{result.maxSum}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Sum distribution — bars highlighted: sum = {result.target}
            </div>
            <DistributionChart
              dist={result.dist}
              numDice={result.numDice}
              target={result.target}
              mode="exact"
            />
          </div>

          <StepsToggle steps={steps} />

          <ResultActions
            getCopyText={() => summary}
            captureRef={resultRef}
            filename={`dice-probability-${result.numDice}d${result.sides}-sum-${result.target}`}
          />
        </div>
      )}
    </MathCalcPage>
  );
}
