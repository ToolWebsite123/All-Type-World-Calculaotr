import { createFileRoute } from "@tanstack/react-router";
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
  type GuideCardItem,
  FormulaBlock,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import type { ReactNode } from "react";
import { parseDataset, cleanedNote } from "@/lib/math/parse-numbers";
import { normalCDF, normalInv, fmt, fmtP } from "@/lib/math/p-value";

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

export const Route = createFileRoute("/calculators/math/mann-whitney-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Mann-Whitney U Test Calculator",
      title: "Mann-Whitney U Test Calculator",
      metaDescription:
        "Nonparametric Mann-Whitney U (Wilcoxon rank-sum) test with U, ranks, z, and p-value from two samples.",
      canonicalUrl: "/calculators/math/mann-whitney-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Mann-Whitney U Test Calculator", path: "/calculators/math/mann-whitney-calculator" },
      ],
      faqs: [
        {
          q: "What is the Mann-Whitney U test?",
          a: "A non-parametric test that compares two INDEPENDENT samples to decide whether one tends to have larger values than the other. Instead of comparing means, it pools both samples, ranks all values 1..N, and compares the sum of ranks in each group. It's also known as the Wilcoxon rank-sum test (Mann-Whitney U and Wilcoxon rank-sum are the same test in different notation).",
        },
        {
          q: "When should I use Mann-Whitney instead of a t-test?",
          a: "Use Mann-Whitney when the data are ordinal, clearly non-normal, or the sample is too small to check normality reliably. Because it only uses the ranks, it's robust to outliers and skewed distributions. A t-test is more powerful when the normality assumption really is satisfied — Mann-Whitney is the safer default when it isn't.",
        },
        {
          q: "How is the U statistic calculated?",
          a: "Combine both samples and assign ranks 1..N (using average ranks for tied values). Sum the ranks in each group to get R1 and R2. Then U1 = R1 − n1(n1+1)/2 and U2 = R2 − n2(n2+1)/2. U1 + U2 always equals n1·n2 — a useful sanity check. Some sources report U = min(U1, U2); others report U1.",
        },
        {
          q: "What p-value does this calculator report?",
          a: "The normal approximation with a continuity correction and a tie correction to the variance: z = (|U − μU| − 0.5) / σU where μU = n1·n2/2 and σU² is corrected for ties. This is accurate whenever the smaller group has ~8+ observations; for very small samples without ties, an exact table gives a slightly more conservative answer.",
        },
        {
          q: "How does tie handling work?",
          a: "Tied values share the average of the ranks they'd occupy. If values in positions 4 and 5 are equal, both get rank 4.5. Ties inflate rank-sum variance less than distinct values, so the formula subtracts a tie-correction term Σ(t³ − t) / (N(N−1)) from (N+1), where t is the size of each tie group.",
        },
        {
          q: "Is Mann-Whitney a test of medians?",
          a: "Only under a strict shape assumption (both distributions have the same shape, just shifted). Without that, Mann-Whitney tests the more general 'stochastic dominance' hypothesis — the probability that a random value from group 1 exceeds a random value from group 2 is 1/2. That's still useful, but 'compares medians' is a simplification worth being careful about.",
        },
      ],
    }),
  component: MannWhitneyPage,
});

/* ---------------- Math ---------------- */

interface RankedPoint {
  value: number;
  group: 1 | 2;
  rank: number;
  tieSize: number;
}

interface MannWhitneyResult {
  n1: number;
  n2: number;
  N: number;
  R1: number;
  R2: number;
  U1: number;
  U2: number;
  U: number;
  muU: number;
  sigmaU: number;
  tieAdjust: number;
  tieGroups: number[]; // sizes of tie groups with size ≥ 2
  z: number;
  zCorrected: number;
  p: number;
  ranked: RankedPoint[];
  alpha: number;
  tail: Tail;
  critical: number;
  reject: boolean;
}

type Tail = "two" | "left" | "right";

function rankCombined(g1: number[], g2: number[]): { ranked: RankedPoint[]; tieGroups: number[] } {
  const combined: { value: number; group: 1 | 2 }[] = [
    ...g1.map((v) => ({ value: v, group: 1 as const })),
    ...g2.map((v) => ({ value: v, group: 2 as const })),
  ];
  combined.sort((a, b) => a.value - b.value);

  const ranked: RankedPoint[] = combined.map((c) => ({
    value: c.value,
    group: c.group,
    rank: 0,
    tieSize: 1,
  }));
  const tieGroups: number[] = [];

  let i = 0;
  while (i < ranked.length) {
    let j = i;
    while (j + 1 < ranked.length && ranked[j + 1].value === ranked[i].value) j++;
    const size = j - i + 1;
    // average of ranks (i+1) .. (j+1)
    const avg = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) {
      ranked[k].rank = avg;
      ranked[k].tieSize = size;
    }
    if (size >= 2) tieGroups.push(size);
    i = j + 1;
  }
  return { ranked, tieGroups };
}

function mannWhitney(g1: number[], g2: number[], alpha: number, tail: Tail): MannWhitneyResult {
  const n1 = g1.length;
  const n2 = g2.length;
  const N = n1 + n2;
  const { ranked, tieGroups } = rankCombined(g1, g2);
  const R1 = ranked.filter((r) => r.group === 1).reduce((s, r) => s + r.rank, 0);
  const R2 = ranked.filter((r) => r.group === 2).reduce((s, r) => s + r.rank, 0);
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = R2 - (n2 * (n2 + 1)) / 2;
  const U = Math.min(U1, U2);
  const muU = (n1 * n2) / 2;
  // Tie-corrected variance
  const tieSum = tieGroups.reduce((s, t) => s + (t ** 3 - t), 0);
  const tieAdjust = N > 1 ? tieSum / (N * (N - 1)) : 0;
  const sigmaU2 = ((n1 * n2) / 12) * (N + 1 - tieAdjust);
  const sigmaU = Math.sqrt(Math.max(sigmaU2, 0));

  // Use U1 for signed z (so left/right tails have a direction).
  const zRaw = sigmaU > 0 ? (U1 - muU) / sigmaU : 0;
  // Continuity correction: shrink |U1 − μU| by 0.5 toward the mean.
  const corrected = Math.sign(U1 - muU) * Math.max(0, Math.abs(U1 - muU) - 0.5);
  const zCorrected = sigmaU > 0 ? corrected / sigmaU : 0;

  let p: number;
  if (tail === "two") p = 2 * (1 - normalCDF(Math.abs(zCorrected)));
  else if (tail === "right") p = 1 - normalCDF(zCorrected);
  else p = normalCDF(zCorrected);
  p = Math.min(1, Math.max(0, p));

  const critical =
    tail === "two" ? normalInv(1 - alpha / 2) : tail === "right" ? normalInv(1 - alpha) : normalInv(alpha);
  const reject =
    tail === "two"
      ? Math.abs(zCorrected) > critical
      : tail === "right"
        ? zCorrected > critical
        : zCorrected < critical;

  return {
    n1,
    n2,
    N,
    R1,
    R2,
    U1,
    U2,
    U,
    muU,
    sigmaU,
    tieAdjust,
    tieGroups,
    z: zRaw,
    zCorrected,
    p,
    ranked,
    alpha,
    tail,
    critical,
    reject,
  };
}

/* ---------------- Dot-plot diagram ---------------- */

function DotPlot({ g1, g2 }: { g1: number[]; g2: number[] }) {
  const all = [...g1, ...g2];
  if (all.length === 0) return null;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(max - min, 1e-9);
  const pad = span * 0.06;
  const W = 720;
  const H = 200;
  const padL = 40;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const sx = (v: number) => padL + ((v - (min - pad)) / (span + 2 * pad)) * iw;

  const y1 = padT + ih * 0.32;
  const y2 = padT + ih * 0.72;

  // Simple jitter to reduce overlap (based on index in sorted order within group)
  const jitter = (arr: number[], y: number, r: number) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const positions: { cx: number; cy: number; v: number }[] = [];
    // Count occurrences at (nearly) same x to stack vertically
    const buckets = new Map<number, number>();
    for (const v of sorted) {
      const cx = Math.round(sx(v));
      const c = (buckets.get(cx) ?? 0) + 1;
      buckets.set(cx, c);
      positions.push({ cx, cy: y - (c - 1) * (r * 2 + 1), v });
    }
    return positions;
  };

  const dots1 = jitter(g1, y1, 5);
  const dots2 = jitter(g2, y2, 5);

  // Axis ticks
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => min + (i / tickCount) * span);

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Strip plot of both groups on a shared number line"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[520px]"
      >
        {/* Axis */}
        <line
          x1={padL}
          y1={padT + ih}
          x2={padL + iw}
          y2={padT + ih}
          stroke="currentColor"
          className="text-border"
        />
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={sx(t)}
              y1={padT + ih}
              x2={sx(t)}
              y2={padT + ih + 4}
              stroke="currentColor"
              className="text-muted-foreground/60"
            />
            <text
              x={sx(t)}
              y={padT + ih + 16}
              textAnchor="middle"
              fontSize="10"
              className="fill-muted-foreground tabular-nums"
            >
              {Number(t.toFixed(2))}
            </text>
          </g>
        ))}

        {/* Group labels */}
        <text x={padL - 4} y={y1 + 4} textAnchor="end" fontSize="11" className="fill-muted-foreground">
          Group 1
        </text>
        <text x={padL - 4} y={y2 + 4} textAnchor="end" fontSize="11" className="fill-muted-foreground">
          Group 2
        </text>

        {/* Dots */}
        {dots1.map((d, i) => (
          <circle key={`a${i}`} cx={d.cx} cy={d.cy} r={5} className="fill-primary/80 stroke-primary" strokeWidth={1}>
            <title>Group 1: {d.v}</title>
          </circle>
        ))}
        {dots2.map((d, i) => (
          <circle
            key={`b${i}`}
            cx={d.cx}
            cy={d.cy}
            r={5}
            className="fill-accent/70 stroke-accent"
            strokeWidth={1}
          >
            <title>Group 2: {d.v}</title>
          </circle>
        ))}

        {/* Legend */}
        <g transform={`translate(${padL},${H - 8})`}>
          <circle cx={4} cy={-2} r={4} className="fill-primary/80 stroke-primary" strokeWidth={1} />
          <text x={12} y={2} fontSize="10" className="fill-muted-foreground">
            Group 1 (n = {g1.length})
          </text>
          <circle cx={140} cy={-2} r={4} className="fill-accent/70 stroke-accent" strokeWidth={1} />
          <text x={148} y={2} fontSize="10" className="fill-muted-foreground">
            Group 2 (n = {g2.length})
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ---------------- Page ---------------- */

/* ---------------- Educational guide cards ---------------- */

function RankingMini() {
  const rows = [
    { v: 2, g: 2, r: "1" },
    { v: 3, g: 1, r: "2" },
    { v: 4, g: 2, r: "3" },
    { v: 5, g: 1, r: "4.5" },
    { v: 5, g: 2, r: "4.5" },
    { v: 6, g: 2, r: "6" },
  ];
  return (
    <svg viewBox="0 0 260 130" className="w-full" role="img" aria-label="Combined values sorted with tied values sharing an averaged rank">
      {rows.map((row, i) => (
        <g key={i}>
          <rect x={20} y={10 + i * 18} width={40} height={14} rx={3} fill={row.g === 1 ? "var(--color-primary)" : "var(--color-muted-foreground)"} opacity={0.6} />
          <text x={40} y={21 + i * 18} textAnchor="middle" fontSize={10} fill="white">{row.v}</text>
          <text x={72} y={21 + i * 18} fontSize={10} fill="var(--color-muted-foreground)">group {row.g}</text>
          <text x={200} y={21 + i * 18} fontSize={10} fill="var(--color-foreground)">rank {row.r}</text>
        </g>
      ))}
    </svg>
  );
}

function UDiffMini() {
  return (
    <svg viewBox="0 0 260 100" className="w-full" role="img" aria-label="Two U values on a number line, with U as the minimum">
      <line x1={20} y1={60} x2={240} y2={60} stroke="var(--color-border)" strokeWidth={2} />
      <circle cx={70} cy={60} r={7} fill="var(--color-primary)" />
      <text x={70} y={48} textAnchor="middle" fontSize={11} fill="var(--color-primary)">U₂ = 4.5</text>
      <circle cx={190} cy={60} r={7} fill="var(--color-muted-foreground)" opacity={0.7} />
      <text x={190} y={48} textAnchor="middle" fontSize={11} fill="var(--color-foreground)">U₁ = 11.5</text>
      <text x={130} y={90} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">U = min(U₁, U₂) = 4.5 · U₁ + U₂ = n₁·n₂</text>
    </svg>
  );
}

function NormalApproxMini() {
  const xs = Array.from({ length: 41 }, (_, i) => -3 + i * 0.15);
  const path = xs
    .map((x, i) => {
      const y = Math.exp(-(x * x) / 2);
      const px = 20 + ((x + 3) / 6) * 220;
      const py = 80 - y * 55;
      return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 260 100" className="w-full" role="img" aria-label="Standard normal curve used to approximate the sampling distribution of U">
      <path d={path} stroke="var(--color-primary)" strokeWidth={2} fill="none" />
      <line x1={20} y1={80} x2={240} y2={80} stroke="var(--color-border)" />
      <line x1={130} y1={20} x2={130} y2={82} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" />
      <text x={130} y={95} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">z = (|U₁ − μU| − 0.5) / σU</text>
    </svg>
  );
}

function EffectSizeMini() {
  return (
    <svg viewBox="0 0 260 90" className="w-full" role="img" aria-label="Effect size scale from 0 to 1 with rank-biserial correlation shown">
      <rect x={20} y={35} width={220} height={14} rx={7} fill="var(--color-primary)" opacity={0.18} />
      <rect x={20} y={35} width={0.72 * 220} height={14} rx={7} fill="var(--color-primary)" opacity={0.85} />
      <text x={20} y={30} fontSize={10} fill="var(--color-muted-foreground)">0</text>
      <text x={240} y={30} textAnchor="end" fontSize={10} fill="var(--color-muted-foreground)">1</text>
      <text x={130} y={72} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-primary)">r = 1 − 2U/(n₁·n₂)</text>
    </svg>
  );
}

const MW_GUIDE: GuideCardItem[] = [
  {
    key: "ranks",
    title: "Given — combine, sort, rank",
    explain:
      "Merge both groups, sort ascending, and assign ranks 1, 2, 3… Whenever several values are tied, give each of them the average of the ranks they would have taken. Ties preserve the total rank sum R₁ + R₂ = N(N + 1)/2.",
    formula: <>Rank(x) = average of positions in the sorted list</>,
    legend: [
      { sym: "R₁, R₂", def: "sum of ranks in each group" },
      { sym: "N", def: "n₁ + n₂ — total observations" },
    ],
    diagram: <RankingMini />,
    example: {
      given: "5 appears in both groups → both get rank (4+5)/2 = 4.5",
      substitute: "R₁ = 2+4.5+7+8 = 21.5",
      answer: "21.5 + 14.5 = 36 = 8·9/2 ✓",
    },
  },
  {
    key: "u-stat",
    title: "Formula & Substitute — U from rank sums",
    explain:
      "Subtract each group's minimum possible rank sum from its actual rank sum to get U₁ and U₂. The reported U is always the smaller of the two; the identity U₁ + U₂ = n₁·n₂ is a useful arithmetic check.",
    formula: (
      <>
        U₁ = R₁ − n₁(n₁ + 1)/2
        <br />
        U₂ = R₂ − n₂(n₂ + 1)/2 · U = min(U₁, U₂)
      </>
    ),
    legend: [
      { sym: "n₁, n₂", def: "sample sizes" },
      { sym: "U", def: "reported statistic (smaller of the two)" },
    ],
    diagram: <UDiffMini />,
    example: {
      given: "R₁ = 21.5, R₂ = 14.5, n₁ = n₂ = 4",
      substitute: "U₁ = 21.5 − 10 = 11.5, U₂ = 14.5 − 10 = 4.5",
      answer: "U = 4.5",
    },
  },
  {
    key: "normal",
    title: "Substitute — normal approximation",
    explain:
      "For all but the smallest samples, U is approximately normal with mean n₁n₂/2 and a variance that gets pulled down whenever there are ties. Add a 0.5 continuity correction before dividing to get a z-score you can look up.",
    formula: (
      <>
        μU = n₁·n₂/2 · σU² = (n₁·n₂/12)·[(N + 1) − Σ(t³ − t)/(N(N − 1))]
        <br />
        z = (|U₁ − μU| − 0.5) / σU
      </>
    ),
    legend: [
      { sym: "Σ(t³ − t)", def: "tie correction summed over tie-group sizes t ≥ 2" },
      { sym: "z", def: "compared to standard normal for a p-value" },
    ],
    diagram: <NormalApproxMini />,
    example: {
      given: "μU = 8, σU ≈ 3.443, U₁ = 11.5",
      substitute: "(|11.5 − 8| − 0.5)/3.443 = 3.0/3.443",
      answer: "z ≈ 0.871 · two-sided p ≈ 0.384",
    },
  },
  {
    key: "effect",
    title: "Answer — z, p, effect size",
    explain:
      "The rank-biserial correlation converts U into a directional effect size on the −1…+1 scale. Equivalently, U₁/(n₁·n₂) is the common-language effect size — the probability that a random value from group 1 exceeds one from group 2.",
    formula: (
      <>
        r = 1 − 2U/(n₁·n₂)
        <br />
        P(X &gt; Y) ≈ U₁/(n₁·n₂)
      </>
    ),
    legend: [
      { sym: "r", def: "rank-biserial effect size" },
      { sym: "P(X > Y)", def: "common-language interpretation" },
    ],
    diagram: <EffectSizeMini />,
    example: {
      given: "U = 4.5, n₁·n₂ = 16",
      substitute: "r = 1 − 2·4.5/16 = 1 − 0.5625",
      answer: "r ≈ 0.4375 (moderate)",
    },
  },
];

function MannWhitneyPage() {
  const [g1Raw, setG1Raw] = useState("7, 3, 5, 8");
  const [g2Raw, setG2Raw] = useState("6, 2, 4, 5");
  const [alpha, setAlpha] = useState<number>(0.05);
  const [tail, setTail] = useState<Tail>("two");

  const [result, setResult] = useState<MannWhitneyResult | null>(null);
  const [g1Values, setG1Values] = useState<number[]>([]);
  const [g2Values, setG2Values] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    setNotes([]);
    const p1 = parseDataset(g1Raw);
    const p2 = parseDataset(g2Raw);
    if (p1.invalid.length || p2.invalid.length) {
      setErr(
        `Couldn't read: ${[...p1.invalid, ...p2.invalid].slice(0, 5).join(", ")}. Enter numbers separated by commas, spaces or new lines.`,
      );
      return;
    }
    if (p1.values.length < 2 || p2.values.length < 2) {
      setErr("Each group needs at least 2 numeric values.");
      return;
    }
    if (p1.values.length + p2.values.length > 5000) {
      setErr("Please keep the combined sample size at 5,000 or fewer values.");
      return;
    }
    const n1 = cleanedNote(p1.cleaned);
    const n2 = cleanedNote(p2.cleaned);
    const notesList = [n1, n2].filter(Boolean) as string[];
    setNotes(notesList);
    setG1Values(p1.values);
    setG2Values(p2.values);
    setResult(mannWhitney(p1.values, p2.values, alpha, tail));
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const {
      ranked,
      n1,
      n2,
      N,
      R1,
      R2,
      U1,
      U2,
      U,
      muU,
      sigmaU,
      tieAdjust,
      tieGroups,
      z,
      zCorrected,
      p,
      tail,
      alpha,
      critical,
      reject,
    } = result;
    const previewRanks = ranked.slice(0, 20);
    const truncated = ranked.length > previewRanks.length;
    const tieSum = tieGroups.reduce((s, t) => s + t ** 3 - t, 0);
    return [
      {
        title: "1. Combine both groups and rank the values",
        body: (
          <div>
            <MathNote>
              Merge Group 1 (n₁ = {n1}) and Group 2 (n₂ = {n2}) into one sorted list of N = {N}{" "}
              values, then assign ranks 1..{N}. Tied values share the average of the ranks they
              would have occupied (so two values tied for positions 4 and 5 both get rank 4.5).
            </MathNote>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="py-1 pr-3">#</th>
                    <th className="py-1 pr-3">Value</th>
                    <th className="py-1 pr-3">Group</th>
                    <th className="py-1 pr-3">Rank</th>
                    <th className="py-1">Tie size</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRanks.map((r, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-1 pr-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-1 pr-3">{r.value}</td>
                      <td className="py-1 pr-3">{r.group}</td>
                      <td className="py-1 pr-3">{r.rank}</td>
                      <td className="py-1">{r.tieSize > 1 ? r.tieSize : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {truncated && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Showing the first 20 of {ranked.length} ranked values.
                </p>
              )}
            </div>
            <MathNote>
              Tie groups (size ≥ 2): {tieGroups.length === 0 ? "none" : tieGroups.join(", ")}.
            </MathNote>
          </div>
        ),
      },
      {
        title: "2. Sum the ranks in each group",
        body: (
          <>
            <MathNote>Add up the ranks belonging to each group.</MathNote>
            <MathLine>R₁ = {fmt(R1)}</MathLine>
            <MathLine>R₂ = {fmt(R2)}</MathLine>
            <MathNote>
              Sanity check: R₁ + R₂ should equal N(N+1)/2.
            </MathNote>
            <MathLine>R₁ + R₂ = {fmt(R1 + R2)}</MathLine>
            <MathLine>N(N + 1)/2 = {fmt((N * (N + 1)) / 2)}</MathLine>
          </>
        ),
      },
      {
        title: "3. Compute U₁ and U₂",
        body: (
          <>
            <MathLine>U₁ = R₁ − n₁(n₁ + 1)/2</MathLine>
            <MathLine>
              U₁ = {fmt(R1)} − {n1}·{n1 + 1}/2 = {fmt(R1)} − {fmt((n1 * (n1 + 1)) / 2)}
            </MathLine>
            <MathLine>U₁ = {fmt(U1)}</MathLine>
            <MathLine>U₂ = R₂ − n₂(n₂ + 1)/2</MathLine>
            <MathLine>
              U₂ = {fmt(R2)} − {n2}·{n2 + 1}/2 = {fmt(R2)} − {fmt((n2 * (n2 + 1)) / 2)}
            </MathLine>
            <MathLine>U₂ = {fmt(U2)}</MathLine>
            <MathNote>
              Cross-check: U₁ + U₂ = {fmt(U1 + U2)} and n₁·n₂ = {fmt(n1 * n2)}.
            </MathNote>
            <MathLine>U = min(U₁, U₂) = {fmt(U)}</MathLine>
          </>
        ),
      },
      {
        title: "4. Normal approximation with tie correction",
        body: (
          <>
            <MathLine>μU = n₁·n₂/2 = {fmt(n1 * n2)}/2 = {fmt(muU)}</MathLine>
            <MathNote>
              Tie correction Σ(t³ − t)/(N(N−1)):{" "}
              {tieGroups.length === 0
                ? "0 (no ties)"
                : `${tieGroups.map((t) => `${t}³ − ${t}`).join(" + ")} = ${fmt(tieSum)} / ${fmt(
                    N * (N - 1),
                  )} = ${fmt(tieAdjust)}`}
            </MathNote>
            <MathLine>
              σU² = (n₁·n₂/12)·[(N + 1) − tie correction] = ({fmt(n1 * n2)}/12)·({N + 1} −{" "}
              {fmt(tieAdjust)}) = {fmt(sigmaU ** 2)}
            </MathLine>
            <MathLine>σU = {fmt(sigmaU)}</MathLine>
          </>
        ),
      },
      {
        title: "5. z-score and p-value",
        body: (
          <>
            <MathNote>Uncorrected z-score:</MathNote>
            <MathLine>
              z = (U₁ − μU)/σU = ({fmt(U1)} − {fmt(muU)}) / {fmt(sigmaU)} = {fmt(z)}
            </MathLine>
            <MathNote>With continuity correction (subtract 0.5 from |U₁ − μU|):</MathNote>
            <MathLine>z = {fmt(zCorrected)}</MathLine>
            {tail === "two" && (
              <MathLine>two-sided p = 2·(1 − Φ(|z|)) = {fmtP(p)}</MathLine>
            )}
            {tail === "right" && <MathLine>right-tailed p = 1 − Φ(z) = {fmtP(p)}</MathLine>}
            {tail === "left" && <MathLine>left-tailed p = Φ(z) = {fmtP(p)}</MathLine>}
          </>
        ),
      },
      {
        title: "6. Decision",
        body: (
          <>
            <MathNote>
              Critical z at α = {alpha} ({tail === "two" ? "two-sided" : `${tail}-tailed`}): ±
              {fmt(critical)}.
            </MathNote>
            <MathLine>
              {tail === "two" ? "|z|" : "z"} = {fmt(tail === "two" ? Math.abs(zCorrected) : zCorrected)}
            </MathLine>
            <MathNote>
              Because this {reject ? "exceeds" : "does not exceed"} the critical value, we{" "}
              <strong>{reject ? "reject" : "fail to reject"}</strong> H₀. The two groups{" "}
              {reject
                ? "differ significantly — one tends to produce larger values than the other."
                : "do not show a statistically significant difference in stochastic ordering at this α."}
            </MathNote>
          </>
        ),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    return [
      `Mann-Whitney U test — n1 = ${result.n1}, n2 = ${result.n2}`,
      `R1 = ${fmt(result.R1)}, R2 = ${fmt(result.R2)}`,
      `U1 = ${fmt(result.U1)}, U2 = ${fmt(result.U2)}, U = ${fmt(result.U)}`,
      `μU = ${fmt(result.muU)}, σU = ${fmt(result.sigmaU)}`,
      `z (continuity-corrected) = ${fmt(result.zCorrected)}`,
      `p-value (${result.tail}-tailed) = ${fmtP(result.p)}`,
      `Verdict at α = ${result.alpha}: ${result.reject ? "reject H0" : "fail to reject H0"}`,
    ].join("\n");
  }, [result]);

  return (
    <MathCalcPage
      name="Mann-Whitney U Test Calculator"
      tagline="Non-parametric two-sample test (aka Wilcoxon rank-sum). Full ranks with tie correction, z / p-value, plain-language verdict, dot-plot diagram and show/hide step-by-step working."
      extras={
        <>
          <CalcSection title="What is the Mann-Whitney U test?">
            <p>
              The <strong>Mann-Whitney U test</strong> — also called the{" "}
              <strong>Wilcoxon rank-sum test</strong> — is the non-parametric alternative to the
              independent-samples t-test. It asks the same broad question ("are these two groups
              really different?") but without assuming the values follow a normal distribution.
              Instead of comparing means, it pools the two groups, ranks every observation from
              smallest to largest, and checks whether the ranks are systematically higher in one
              group than the other.
            </p>
            <p>
              Because the test only cares about the ranks, extreme outliers, heavy skew and ordinal
              (rating-scale) data don't break it. If the two rank sums are very unbalanced, one
              group tends to produce larger values than the other and the test flags a significant
              difference.
            </p>
          </CalcSection>

<CalcSection title="The Mann-Whitney U test, piece by piece">
            <GuideCards items={MW_GUIDE} />
          </CalcSection>



          <CalcSection title="Assumptions and interpretation">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Independent observations,</strong> within and between groups. For paired
                data, use the Wilcoxon <em>signed-rank</em> test instead — different test, similar
                name.
              </li>
              <li>
                <strong>Values must be at least ordinal</strong> (i.e. they can be ranked). Nominal
                categories like colour or country don't qualify.
              </li>
              <li>
                <strong>What Mann-Whitney tests:</strong> whether P(X &gt; Y) ≠ 1/2 — i.e. whether a
                random draw from group 1 is more likely to exceed a random draw from group 2 than
                vice versa. That translates to "medians differ" only if both distributions have the
                same shape (same spread, same skew).
              </li>
              <li>
                <strong>Effect size:</strong> the rank-biserial correlation r = 1 − 2U/(n₁·n₂) or the
                common-language effect size P(X &gt; Y) ≈ U₁/(n₁·n₂) give a plain magnitude to go
                with the p-value.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Reading U instead of U₁ for direction.</strong> min(U₁, U₂) is always the
                smaller one — its sign doesn't tell you which group is larger. Look at R₁ vs R₂ or
                the medians for that.
              </li>
              <li>
                <strong>Ignoring ties.</strong> If several values are equal, they must share the
                average rank AND the variance must be tie-corrected. Forgetting the tie correction
                inflates σU and makes p-values too conservative.
              </li>
              <li>
                <strong>Using it on paired data.</strong> Mann-Whitney assumes independent samples.
                For before/after or matched-pair designs, use the Wilcoxon signed-rank test.
              </li>
              <li>
                <strong>Calling it a test of medians without checking shape.</strong> If the two
                distributions have different shapes, a significant U can reflect a spread difference
                as much as a location difference.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Two flexible dataset boxes — accepts commas, spaces, tabs, new lines and even values pasted from a spreadsheet.",
                "Combined ranking table with tie handling (average ranks) shown explicitly.",
                "U₁, U₂ and U = min(U₁, U₂) — plus the R₁ + R₂ = N(N+1)/2 sanity check.",
                "Normal-approximation z with a continuity correction AND a tie correction to σU² — accurate whenever the smaller sample has around 8+ observations.",
                "One-sided or two-sided p-value with a plain-language verdict at your chosen α (0.10, 0.05, 0.01).",
                "Dot-plot / strip diagram overlaying both groups on one number line so you can eyeball the overlap that the test measures.",
                "Show/hide step-by-step working with your own numbers substituted into every formula.",
                "Copy the summary as text or download the result panel as a PNG.",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Is Mann-Whitney U the same as the Wilcoxon rank-sum test?",
                  a: <p>Yes — they're mathematically equivalent, just parameterised differently. Wilcoxon reports R (a rank sum); Mann-Whitney reports U = R − n(n+1)/2. Any software that gives one can convert to the other.</p>,
                },
                {
                  q: "Do I need equal sample sizes?",
                  a: <p>No. The test works with any n₁ and n₂ (both ≥ 2). The normal approximation gets more accurate as the smaller sample grows.</p>,
                },
                {
                  q: "Should I use one-sided or two-sided?",
                  a: <p>Two-sided if you're just asking whether the groups differ. One-sided only if you have a directional hypothesis fixed before looking at the data (e.g. "the treatment group has larger values"). Never pick the direction after peeking — that's p-hacking.</p>,
                },
                {
                  q: "How small can the samples be before the normal approximation breaks?",
                  a: <p>It's usually fine once min(n₁, n₂) is around 8 with a tie-corrected variance. For very small samples with no ties, an exact table gives a slightly more conservative p — but the difference is small and the approximation almost always agrees on the reject/fail-to-reject decision.</p>,
                },
                {
                  q: "What does 'stochastic dominance' mean here?",
                  a: <p>P(X &gt; Y) &gt; 1/2 — a random value from group X is more likely to be larger than a random value from group Y. That's what Mann-Whitney really tests. If you additionally assume identical distributional shapes, this reduces to "the medians differ".</p>,
                },
                {
                  q: "Can I use this for ordinal (Likert) data?",
                  a: <p>Yes — that's one of its main use cases. Ranks require only an ordering, which Likert scales provide. Just be aware of the shape assumption if you want to talk about medians rather than dominance.</p>,
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/t-test-calculator", label: "T-Test Calculator" },
                { to: "/calculators/math/wilcoxon-calculator", label: "Wilcoxon Signed-Rank Test Calculator" },
                { to: "/calculators/math/p-value-calculator", label: "P-Value Calculator" },
                { to: "/calculators/math/z-score-calculator", label: "Z-Score Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Group 1 values" hint="Numbers separated by commas, spaces or new lines. n ≥ 2.">
          <textarea
            value={g1Raw}
            onChange={(e) => setG1Raw(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
        <Field label="Group 2 values" hint="Independent sample. Can be a different size from group 1.">
          <textarea
            value={g2Raw}
            onChange={(e) => setG2Raw(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Significance level α">
          <select
            value={alpha}
            onChange={(e) => setAlpha(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value={0.1}>0.10 (90% confidence)</option>
            <option value={0.05}>0.05 (95% confidence)</option>
            <option value={0.01}>0.01 (99% confidence)</option>
          </select>
        </Field>
        <Field label="Alternative hypothesis">
          <select
            value={tail}
            onChange={(e) => setTail(e.target.value as Tail)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="two">Two-sided: groups differ</option>
            <option value="right">Right-tailed: Group 1 &gt; Group 2</option>
            <option value="left">Left-tailed: Group 1 &lt; Group 2</option>
          </select>
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <PrimaryButton onClick={compute}>Run Mann-Whitney U test</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}
      {notes.length > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          {notes.map((n, i) => (
            <div key={i}>{n}</div>
          ))}
        </div>
      )}

      {result && (
        <div ref={resultRef} className="mt-5 space-y-4">
          <div
            className={
              "rounded-2xl border p-4 " +
              (result.reject
                ? "border-primary/40 bg-primary/[0.08]"
                : "border-border/60 bg-secondary/30")
            }
          >
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Mann-Whitney U — n₁ = {result.n1}, n₂ = {result.n2}, α = {result.alpha} (
              {result.tail === "two" ? "two-sided" : `${result.tail}-tailed`})
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Tile label="U" value={fmt(result.U)} sub={`U₁=${fmt(result.U1)}, U₂=${fmt(result.U2)}`} />
              <Tile label="z (corrected)" value={fmt(result.zCorrected)} sub={`raw z=${fmt(result.z)}`} />
              <Tile label="p-value" value={fmtP(result.p)} sub={result.tail === "two" ? "two-sided" : `${result.tail}-tailed`} />
              <Tile
                label="Verdict"
                value={result.reject ? "Reject H₀" : "Fail to reject H₀"}
                sub={
                  result.reject
                    ? "Statistically significant"
                    : "Not statistically significant"
                }
              />
            </div>
            <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div>
                R₁ = <span className="tabular-nums text-foreground">{fmt(result.R1)}</span>, R₂ ={" "}
                <span className="tabular-nums text-foreground">{fmt(result.R2)}</span>
              </div>
              <div>
                μU = <span className="tabular-nums text-foreground">{fmt(result.muU)}</span>, σU ={" "}
                <span className="tabular-nums text-foreground">{fmt(result.sigmaU)}</span>
              </div>
              <div>
                Ties: <span className="tabular-nums text-foreground">{result.tieGroups.length}</span>{" "}
                group{result.tieGroups.length === 1 ? "" : "s"}
                {result.tieGroups.length > 0 && ` (sizes ${result.tieGroups.join(", ")})`}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Strip plot — both groups on one number line
            </div>
            <DotPlot g1={g1Values} g2={g2Values} />
            <p className="mt-2 text-xs text-muted-foreground">
              The more the two colours overlap, the closer U₁ and U₂ will be — and the less likely
              the test will be significant.
            </p>
          </div>

          <StepsToggle steps={steps} />

          <ResultActions
            getCopyText={() => summary}
            captureRef={resultRef}
            filename={`mann-whitney-n${result.n1}-n${result.n2}`}
          />
        </div>
      )}
    </MathCalcPage>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground tabular-nums">{sub}</div>}
    </div>
  );
}
