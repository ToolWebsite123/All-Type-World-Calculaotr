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
import { SolutionSteps, type Step } from "@/components/SolutionSteps";
import { parseDataset, cleanedNote } from "@/lib/math/parse-numbers";
import { normalCDF, normalInv, fmt, fmtP } from "@/lib/math/p-value";

export const Route = createFileRoute("/calculators/math/wilcoxon-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Wilcoxon Signed-Rank Test Calculator",
      title: "Wilcoxon Signed-Rank Test Calculator",
      metaDescription:
        "Nonparametric Wilcoxon signed-rank test for paired data with ranks, W statistic, z, and p-value.",
      canonicalUrl: "/calculators/math/wilcoxon-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Wilcoxon Signed-Rank Test Calculator", path: "/calculators/math/wilcoxon-calculator" },
      ],
      faqs: [
        {
          q: "What is the Wilcoxon signed-rank test?",
          a: "A non-parametric test for paired data — before/after measurements on the same subjects, or matched pairs. It's the distribution-free alternative to the paired t-test: instead of averaging the differences, it ranks their absolute sizes and asks whether positive and negative changes are balanced.",
        },
        {
          q: "How is it different from the Mann-Whitney U test?",
          a: "Wilcoxon signed-rank is for PAIRED data (same subject measured twice, or naturally matched pairs). Mann-Whitney is for two INDEPENDENT samples. The two tests share a name (Wilcoxon also authored the rank-sum test) so they're commonly confused — pick by the design of your data.",
        },
        {
          q: "What happens to zero differences?",
          a: "Standard practice (Wilcoxon's original method) is to drop pairs whose difference is exactly 0 and reduce n accordingly. Those pairs give no information about the direction of change. This calculator flags any dropped zeros so you know your effective sample size.",
        },
        {
          q: "How are ties handled?",
          a: "Tied absolute differences share the average of the ranks they'd occupy — same rule as Mann-Whitney. Ties also shrink the variance slightly, so the normal approximation applies a tie-correction term Σ(t³ − t)/48 subtracted from the standard σW² formula.",
        },
        {
          q: "What p-value does this report?",
          a: "The normal approximation with a continuity correction: z = (|W − μW| − 0.5)/σW where μW = n(n+1)/4 and σW² is tie-corrected. Reliable once n (after dropping zeros) is around 10+. For very small n an exact table is more precise, but the approximation almost always agrees on the reject/fail-to-reject decision.",
        },
        {
          q: "Is this a test of median differences?",
          a: "Under the assumption that the differences are symmetric around some center, yes — Wilcoxon tests whether that center (the median difference) is zero. Without symmetry it tests the broader hypothesis that positive and negative differences are equally likely.",
        },
      ],
    }),
  component: WilcoxonPage,
});

/* ---------------- Math ---------------- */

type Tail = "two" | "left" | "right";

interface RankedDiff {
  index: number; // original position in the post-zero list
  before: number;
  after: number;
  diff: number;
  absDiff: number;
  rank: number;
  tieSize: number;
  sign: 1 | -1;
}

interface WilcoxonResult {
  nOriginal: number;
  nZeros: number;
  n: number; // effective n after dropping zeros
  ranked: RankedDiff[];
  tieGroups: number[];
  Wplus: number;
  Wminus: number;
  W: number;
  muW: number;
  sigmaW: number;
  tieAdjustSum: number;
  z: number;
  zCorrected: number;
  p: number;
  alpha: number;
  tail: Tail;
  critical: number;
  reject: boolean;
}

function rankAbsDiffs(rows: { before: number; after: number; diff: number }[]): {
  ranked: RankedDiff[];
  tieGroups: number[];
} {
  const nz = rows
    .map((r, idx) => ({ ...r, index: idx, absDiff: Math.abs(r.diff), sign: (r.diff > 0 ? 1 : -1) as 1 | -1 }));
  // Sort by absolute difference to assign ranks
  const bySize = [...nz].sort((a, b) => a.absDiff - b.absDiff);
  const rankMap = new Array<{ rank: number; tieSize: number }>(bySize.length);
  const tieGroups: number[] = [];
  let i = 0;
  while (i < bySize.length) {
    let j = i;
    while (j + 1 < bySize.length && bySize[j + 1].absDiff === bySize[i].absDiff) j++;
    const size = j - i + 1;
    const avg = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) rankMap[k] = { rank: avg, tieSize: size };
    if (size >= 2) tieGroups.push(size);
    i = j + 1;
  }
  // Attach ranks back in original order
  const rankedBySize: RankedDiff[] = bySize.map((r, k) => ({
    ...r,
    rank: rankMap[k].rank,
    tieSize: rankMap[k].tieSize,
  }));
  const ranked = [...rankedBySize].sort((a, b) => a.index - b.index);
  return { ranked, tieGroups };
}

function wilcoxon(before: number[], after: number[], alpha: number, tail: Tail): WilcoxonResult {
  const nOriginal = before.length;
  const rowsAll = before.map((b, i) => ({ before: b, after: after[i], diff: after[i] - b }));
  const nonZero = rowsAll.filter((r) => r.diff !== 0);
  const nZeros = nOriginal - nonZero.length;
  const n = nonZero.length;
  const { ranked, tieGroups } = rankAbsDiffs(nonZero);

  const Wplus = ranked.filter((r) => r.sign === 1).reduce((s, r) => s + r.rank, 0);
  const Wminus = ranked.filter((r) => r.sign === -1).reduce((s, r) => s + r.rank, 0);
  const W = Math.min(Wplus, Wminus);
  const muW = (n * (n + 1)) / 4;
  const sigmaW2Base = (n * (n + 1) * (2 * n + 1)) / 24;
  const tieAdjustSum = tieGroups.reduce((s, t) => s + (t ** 3 - t), 0);
  const sigmaW2 = Math.max(sigmaW2Base - tieAdjustSum / 48, 0);
  const sigmaW = Math.sqrt(sigmaW2);

  // Signed z using W+ so tails have direction (W+ high ⇒ after > before)
  const zRaw = sigmaW > 0 ? (Wplus - muW) / sigmaW : 0;
  const corrected =
    Math.sign(Wplus - muW) * Math.max(0, Math.abs(Wplus - muW) - 0.5);
  const zCorrected = sigmaW > 0 ? corrected / sigmaW : 0;

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
    nOriginal,
    nZeros,
    n,
    ranked,
    tieGroups,
    Wplus,
    Wminus,
    W,
    muW,
    sigmaW,
    tieAdjustSum,
    z: zRaw,
    zCorrected,
    p,
    alpha,
    tail,
    critical,
    reject,
  };
}

/* ---------------- Lollipop diagram ---------------- */

function LollipopDiffs({ ranked }: { ranked: RankedDiff[] }) {
  if (ranked.length === 0) return null;
  const maxAbs = Math.max(...ranked.map((r) => Math.abs(r.diff)), 1e-9);
  const W = 720;
  const rowH = 22;
  const padL = 60;
  const padR = 20;
  const padT = 24;
  const padB = 30;
  const H = padT + padB + ranked.length * rowH;
  const iw = W - padL - padR;
  const cx0 = padL + iw / 2;
  const sx = (v: number) => cx0 + (v / maxAbs) * (iw / 2 - 6);

  const nPos = ranked.filter((r) => r.sign === 1).length;
  const nNeg = ranked.filter((r) => r.sign === -1).length;

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Signed differences per pair as a lollipop chart"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[520px]"
      >
        {/* Zero line */}
        <line x1={cx0} y1={padT - 6} x2={cx0} y2={H - padB + 4} stroke="currentColor" className="text-border" />
        <text x={cx0} y={padT - 10} textAnchor="middle" fontSize="10" className="fill-muted-foreground">
          0
        </text>

        {/* Axis endpoints */}
        <text x={padL} y={padT - 10} fontSize="10" className="fill-muted-foreground">
          −{fmt(maxAbs)}
        </text>
        <text x={padL + iw} y={padT - 10} textAnchor="end" fontSize="10" className="fill-muted-foreground">
          +{fmt(maxAbs)}
        </text>

        {ranked.map((r, i) => {
          const y = padT + i * rowH + rowH / 2;
          const x = sx(r.diff);
          const positive = r.sign === 1;
          const color = positive ? "text-primary" : "text-destructive";
          return (
            <g key={i}>
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="10" className="fill-muted-foreground">
                pair {r.index + 1}
              </text>
              <line
                x1={cx0}
                y1={y}
                x2={x}
                y2={y}
                stroke="currentColor"
                strokeWidth={2}
                className={color}
              />
              <circle cx={x} cy={y} r={4.5} className={`${color} fill-current`}>
                <title>
                  pair {r.index + 1}: {r.before} → {r.after} · diff = {r.diff} · rank {r.rank}
                </title>
              </circle>
              <text
                x={x + (positive ? 8 : -8)}
                y={y + 3}
                textAnchor={positive ? "start" : "end"}
                fontSize="10"
                className="fill-muted-foreground tabular-nums"
              >
                {r.diff > 0 ? `+${r.diff}` : r.diff} (r={r.rank})
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${padL},${H - 8})`}>
          <circle cx={4} cy={-2} r={4} className="fill-primary" />
          <text x={12} y={2} fontSize="10" className="fill-muted-foreground">
            increased ({nPos})
          </text>
          <circle cx={130} cy={-2} r={4} className="fill-destructive" />
          <text x={138} y={2} fontSize="10" className="fill-muted-foreground">
            decreased ({nNeg})
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ---------------- Page ---------------- */

/* ---------------- Educational guide cards ---------------- */

function DiffsMini() {
  const diffs = [3, 2, 2, 0, 2, 6, -1, 3];
  return (
    <svg viewBox="0 0 260 100" className="w-full" role="img" aria-label="Bar chart of paired differences with the zero difference dropped">
      <line x1={10} y1={55} x2={250} y2={55} stroke="var(--color-border)" />
      {diffs.map((d, i) => {
        const x = 20 + i * 28;
        const h = d === 0 ? 0 : Math.abs(d) * 6;
        const y = d >= 0 ? 55 - h : 55;
        const color = d === 0 ? "var(--color-muted-foreground)" : d > 0 ? "var(--color-primary)" : "var(--color-destructive)";
        const opacity = d === 0 ? 0.35 : 0.85;
        return (
          <g key={i}>
            <rect x={x} y={y} width={18} height={h || 2} rx={2} fill={color} opacity={opacity} />
            <text x={x + 9} y={90} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">{d}</text>
          </g>
        );
      })}
      <text x={130} y={16} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">drop the zero → n = 7</text>
    </svg>
  );
}

function AbsRankMini() {
  const rows = [
    { d: "|−1|", r: "1" },
    { d: "|2|", r: "3 (avg 2–4)" },
    { d: "|2|", r: "3" },
    { d: "|2|", r: "3" },
    { d: "|3|", r: "5.5 (avg 5–6)" },
    { d: "|3|", r: "5.5" },
    { d: "|6|", r: "7" },
  ];
  return (
    <svg viewBox="0 0 260 150" className="w-full" role="img" aria-label="Absolute differences sorted and ranked, with tied values sharing averaged ranks">
      {rows.map((row, i) => (
        <g key={i}>
          <rect x={20} y={10 + i * 18} width={70} height={14} rx={3} fill="var(--color-primary)" opacity={0.6} />
          <text x={55} y={21 + i * 18} textAnchor="middle" fontSize={10} fill="white">{row.d}</text>
          <text x={100} y={21 + i * 18} fontSize={10} fill="var(--color-foreground)">rank {row.r}</text>
        </g>
      ))}
    </svg>
  );
}

function SignedRankMini() {
  return (
    <svg viewBox="0 0 260 110" className="w-full" role="img" aria-label="Positive and negative signed-rank sums as opposing bars">
      <line x1={20} y1={55} x2={240} y2={55} stroke="var(--color-border)" strokeWidth={2} />
      <rect x={130} y={30} width={100} height={22} fill="var(--color-primary)" opacity={0.8} />
      <text x={180} y={45} textAnchor="middle" fontSize={11} fill="white">W⁺ = 27</text>
      <rect x={120} y={58} width={10} height={22} fill="var(--color-destructive)" opacity={0.85} />
      <text x={90} y={73} textAnchor="end" fontSize={11} fill="var(--color-foreground)">W⁻ = 1</text>
      <text x={130} y={100} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">W = min(W⁺, W⁻) = 1 · W⁺ + W⁻ = n(n+1)/2</text>
    </svg>
  );
}

function ZApproxMini() {
  const xs = Array.from({ length: 41 }, (_, i) => -3 + i * 0.15);
  const path = xs
    .map((x, i) => {
      const y = Math.exp(-(x * x) / 2);
      const px = 20 + ((x + 3) / 6) * 220;
      const py = 82 - y * 55;
      return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
  const zx = 20 + ((2.132 + 3) / 6) * 220;
  return (
    <svg viewBox="0 0 260 105" className="w-full" role="img" aria-label="Standard normal curve with observed z shown in the tail">
      <path d={path} stroke="var(--color-primary)" strokeWidth={2} fill="none" />
      <line x1={20} y1={82} x2={240} y2={82} stroke="var(--color-border)" />
      <line x1={zx} y1={25} x2={zx} y2={84} stroke="var(--color-destructive)" strokeDasharray="3 3" />
      <text x={zx} y={20} textAnchor="middle" fontSize={10} fill="var(--color-destructive)">z ≈ 2.13</text>
    </svg>
  );
}

const WIL_GUIDE: GuideCardItem[] = [
  {
    key: "diffs",
    title: "Given — paired differences",
    explain:
      "The test works on the differences within each pair (Afterᵢ − Beforeᵢ). Any pair whose difference is exactly zero carries no information about direction, so it's excluded before ranking; the sample size n is what remains.",
    formula: <>dᵢ = Afterᵢ − Beforeᵢ · discard dᵢ = 0 · n = pairs remaining</>,
    legend: [
      { sym: "dᵢ", def: "signed difference of pair i" },
      { sym: "n", def: "non-zero differences" },
    ],
    diagram: <DiffsMini />,
    example: {
      given: "d = 3, 2, 2, 0, 2, 6, −1, 3",
      substitute: "drop the 0 → 7 non-zero differences",
      answer: "n = 7",
    },
  },
  {
    key: "abs-rank",
    title: "Formula — rank absolute differences",
    explain:
      "Ignore signs and rank the |dᵢ| from smallest to largest. Ties share the average of the ranks they would have occupied — the same rule as in every rank-based test. The signs come back in Step 3.",
    formula: <>Rank(|dᵢ|) with tied values sharing the average rank</>,
    legend: [
      { sym: "|dᵢ|", def: "magnitude, sign temporarily ignored" },
      { sym: "ties", def: "share average of their positions" },
    ],
    diagram: <AbsRankMini />,
    example: {
      given: "sorted |d| = 1, 2, 2, 2, 3, 3, 6",
      substitute: "three 2s → rank (2+3+4)/3 = 3, two 3s → 5.5",
      answer: "ranks 1, 3, 3, 3, 5.5, 5.5, 7",
    },
  },
  {
    key: "signed",
    title: "Substitute — signed rank sums",
    explain:
      "Re-attach the original signs and total the ranks separately for the positive and negative differences. W⁺ + W⁻ = n(n+1)/2 acts as an arithmetic check; the reported statistic W is the smaller of the two.",
    formula: (
      <>
        W⁺ = Σ ranks of positive dᵢ · W⁻ = Σ ranks of negative dᵢ
        <br />
        W = min(W⁺, W⁻)
      </>
    ),
    legend: [
      { sym: "W⁺", def: "total rank of positive differences" },
      { sym: "W⁻", def: "total rank of negative differences" },
    ],
    diagram: <SignedRankMini />,
    example: {
      given: "positives contribute 5.5+3+3+3+7+5.5, negative contributes 1",
      substitute: "W⁺ = 27, W⁻ = 1",
      answer: "W = 1 · check 27 + 1 = 7·8/2 ✓",
    },
  },
  {
    key: "normal",
    title: "Answer — z and p-value",
    explain:
      "Once n ≳ 10, W is approximately normal with mean n(n+1)/4. Ties shrink the variance a little, and a 0.5 continuity correction sharpens the tail-probability estimate before you turn |z| into a p-value.",
    formula: (
      <>
        μW = n(n + 1)/4 · σW² = n(n + 1)(2n + 1)/24 − Σ(t³ − t)/48
        <br />
        z = (|W⁺ − μW| − 0.5) / σW
      </>
    ),
    legend: [
      { sym: "Σ(t³ − t)", def: "sum over tie groups of size t ≥ 2" },
      { sym: "z", def: "compared to standard normal for p-value" },
    ],
    diagram: <ZApproxMini />,
    example: {
      given: "n = 7, W⁺ = 27, μW = 14, σW ≈ 5.863",
      substitute: "(|27 − 14| − 0.5)/5.863 = 12.5/5.863",
      answer: "z ≈ 2.13 · two-sided p ≈ 0.033",
    },
  },
];

function WilcoxonPage() {
  const [beforeRaw, setBeforeRaw] = useState("85, 90, 78, 92, 88, 76, 95, 82");
  const [afterRaw, setAfterRaw] = useState("88, 92, 80, 92, 90, 82, 94, 85");
  const [alpha, setAlpha] = useState<number>(0.05);
  const [tail, setTail] = useState<Tail>("two");

  const [result, setResult] = useState<WilcoxonResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    setNotes([]);
    const pb = parseDataset(beforeRaw);
    const pa = parseDataset(afterRaw);
    if (pb.invalid.length || pa.invalid.length) {
      setErr(
        `Couldn't read: ${[...pb.invalid, ...pa.invalid].slice(0, 5).join(", ")}. Enter numbers separated by commas, spaces or new lines.`,
      );
      return;
    }
    if (pb.values.length !== pa.values.length) {
      setErr(
        `Before (${pb.values.length}) and After (${pa.values.length}) must have the same number of values — this is a paired test.`,
      );
      return;
    }
    if (pb.values.length < 2) {
      setErr("Need at least 2 paired observations.");
      return;
    }
    if (pb.values.length > 5000) {
      setErr("Please keep the sample at 5,000 pairs or fewer.");
      return;
    }
    const nb = cleanedNote(pb.cleaned);
    const na = cleanedNote(pa.cleaned);
    const notesList = [nb, na].filter(Boolean) as string[];
    const res = wilcoxon(pb.values, pa.values, alpha, tail);
    if (res.nZeros > 0) {
      notesList.push(
        `Dropped ${res.nZeros} pair${res.nZeros === 1 ? "" : "s"} with a zero difference. Effective n = ${res.n}.`,
      );
    }
    if (res.n < 2) {
      setErr("After dropping zero differences, fewer than 2 pairs remain — the test can't be run.");
      return;
    }
    setNotes(notesList);
    setResult(res);
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const {
      ranked,
      n,
      nZeros,
      Wplus,
      Wminus,
      W,
      muW,
      sigmaW,
      tieGroups,
      tieAdjustSum,
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
    return [
      {
        title: "1. Compute the paired differences",
        body: (
          <div>
            <p className="mb-2">
              For each pair, difference d = After − Before.{" "}
              {nZeros > 0 ? (
                <>
                  Drop the <strong>{nZeros}</strong> pair{nZeros === 1 ? "" : "s"} with d = 0 — a zero
                  difference gives no information about direction. Effective sample size n ={" "}
                  <strong>{n}</strong>.
                </>
              ) : (
                <>No zero differences to drop. Effective sample size n = <strong>{n}</strong>.</>
              )}
            </p>
          </div>
        ),
      },
      {
        title: "2. Rank the absolute differences (average ranks for ties)",
        body: (
          <div>
            <p className="mb-2">
              Sort |d| from smallest to largest and assign ranks 1..{n}. Tied |d| values share the
              average of the ranks they would have occupied.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="py-1 pr-3">Pair</th>
                    <th className="py-1 pr-3">Before</th>
                    <th className="py-1 pr-3">After</th>
                    <th className="py-1 pr-3">d</th>
                    <th className="py-1 pr-3">|d|</th>
                    <th className="py-1 pr-3">Rank</th>
                    <th className="py-1 pr-3">Sign</th>
                    <th className="py-1">Tie</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRanks.map((r, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-1 pr-3 text-muted-foreground">{r.index + 1}</td>
                      <td className="py-1 pr-3">{r.before}</td>
                      <td className="py-1 pr-3">{r.after}</td>
                      <td className="py-1 pr-3">{r.diff}</td>
                      <td className="py-1 pr-3">{r.absDiff}</td>
                      <td className="py-1 pr-3">{r.rank}</td>
                      <td className="py-1 pr-3">{r.sign === 1 ? "+" : "−"}</td>
                      <td className="py-1">{r.tieSize > 1 ? r.tieSize : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {truncated && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Showing the first 20 of {ranked.length} ranked pairs.
                </p>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Tie groups (size ≥ 2): {tieGroups.length === 0 ? "none" : tieGroups.join(", ")}.
            </p>
          </div>
        ),
      },
      {
        title: "3. Sum the signed ranks",
        body: (
          <div>
            W⁺ = sum of ranks where d &gt; 0 = <strong>{fmt(Wplus)}</strong>. W⁻ = sum of ranks where d
            &lt; 0 = <strong>{fmt(Wminus)}</strong>. Sanity check: W⁺ + W⁻ = {fmt(Wplus + Wminus)} and
            n(n+1)/2 = {fmt((n * (n + 1)) / 2)} — these must match.
            <br />
            Test statistic W = min(W⁺, W⁻) = <strong>{fmt(W)}</strong>.
          </div>
        ),
      },
      {
        title: "4. Normal approximation with tie correction",
        body: (
          <div>
            <code>μW = n(n+1)/4 = {n}·{n + 1}/4 = {fmt(muW)}</code>
            <br />
            <code>σW²(base) = n(n+1)(2n+1)/24 = {fmt((n * (n + 1) * (2 * n + 1)) / 24)}</code>
            <br />
            Tie correction Σ(t³ − t)/48 ={" "}
            {tieGroups.length === 0
              ? "0 (no ties)"
              : `(${tieGroups.map((t) => `${t}³ − ${t}`).join(" + ")}) / 48 = ${fmt(tieAdjustSum)}/48 = ${fmt(
                  tieAdjustSum / 48,
                )}`}
            <br />
            <code>σW² = {fmt((n * (n + 1) * (2 * n + 1)) / 24)} − {fmt(tieAdjustSum / 48)} = {fmt(sigmaW ** 2)}</code>
            <br />
            σW = <strong>{fmt(sigmaW)}</strong>.
          </div>
        ),
      },
      {
        title: "5. z-score and p-value",
        body: (
          <div>
            Uncorrected: <code>z = (W⁺ − μW)/σW = ({fmt(Wplus)} − {fmt(muW)}) / {fmt(sigmaW)} = {fmt(z)}</code>.
            <br />
            With continuity correction (subtract 0.5 from |W⁺ − μW|):{" "}
            <strong>z = {fmt(zCorrected)}</strong>.
            <br />
            {tail === "two" && (
              <>Two-sided p = 2·(1 − Φ(|z|)) = <strong>{fmtP(p)}</strong>.</>
            )}
            {tail === "right" && <>Right-tailed p = 1 − Φ(z) = <strong>{fmtP(p)}</strong>.</>}
            {tail === "left" && <>Left-tailed p = Φ(z) = <strong>{fmtP(p)}</strong>.</>}
          </div>
        ),
      },
      {
        title: "6. Decision",
        body: (
          <div>
            Critical z at α = {alpha} ({tail === "two" ? "two-sided" : `${tail}-tailed`}):{" "}
            <strong>±{fmt(critical)}</strong>. Because {tail === "two" ? "|z|" : "z"} ={" "}
            {fmt(tail === "two" ? Math.abs(zCorrected) : zCorrected)}{" "}
            {reject ? "exceeds" : "does not exceed"} the critical value, we{" "}
            <strong>{reject ? "reject" : "fail to reject"}</strong> H₀. The median paired difference{" "}
            {reject
              ? "is significantly different from zero — there is a real shift between the two conditions."
              : "is not significantly different from zero at this α."}
          </div>
        ),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    return [
      `Wilcoxon signed-rank test — n (after dropping zeros) = ${result.n}${result.nZeros ? ` (dropped ${result.nZeros})` : ""}`,
      `W+ = ${fmt(result.Wplus)}, W− = ${fmt(result.Wminus)}, W = ${fmt(result.W)}`,
      `μW = ${fmt(result.muW)}, σW = ${fmt(result.sigmaW)}`,
      `z (continuity-corrected) = ${fmt(result.zCorrected)}`,
      `p-value (${result.tail}-tailed) = ${fmtP(result.p)}`,
      `Verdict at α = ${result.alpha}: ${result.reject ? "reject H0" : "fail to reject H0"}`,
    ].join("\n");
  }, [result]);

  return (
    <MathCalcPage
      name="Wilcoxon Signed-Rank Test Calculator"
      tagline="Paired non-parametric test. Ranks absolute differences with tie correction, reports W+, W−, W, normal-approximation z and p-value, plain-language verdict, lollipop diagram and show/hide step-by-step working."
      extras={
        <>
          <CalcSection title="What is the Wilcoxon signed-rank test?">
            <p>
              The <strong>Wilcoxon signed-rank test</strong> is the non-parametric alternative to the
              paired t-test. It answers the same question — "did the values change between the two
              measurements?" — but without assuming the differences follow a normal distribution.
              Rather than averaging the differences, it looks at the <em>sizes</em> of the changes
              (as ranks) and their <em>signs</em>, and checks whether increases and decreases balance
              out.
            </p>
            <p>
              Because the test uses ranks, outliers, skewed differences and ordinal data (Likert
              ratings, pain scores) don't break it. If nearly every pair moves in the same
              direction — or the biggest changes all share one sign — W⁺ and W⁻ become unbalanced and
              the test flags a significant effect.
            </p>
          </CalcSection>

<CalcSection title="The Wilcoxon signed-rank test, piece by piece">
            <GuideCards items={WIL_GUIDE} />
          </CalcSection>



          <CalcSection title="Assumptions and interpretation">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Paired observations.</strong> Each Before value must correspond to a specific
                After value on the same unit. Independent groups need Mann-Whitney instead.
              </li>
              <li>
                <strong>Differences are at least ordinal and continuous-ish.</strong> The absolute
                differences need to be rank-able. Heavily discrete data (0/1 outcomes) fit McNemar's
                test better.
              </li>
              <li>
                <strong>What it tests:</strong> whether P(d &gt; 0) = P(d &lt; 0). Under the extra
                assumption that d is symmetric around its center, this is a test that the median
                difference is zero.
              </li>
              <li>
                <strong>Effect size:</strong> the matched-pairs rank-biserial r = (W⁺ − W⁻)/(n(n+1)/2)
                gives a magnitude between −1 and +1 to go with the p-value.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Mixing it up with Mann-Whitney.</strong> Same author, similar name, different
                designs. Paired → signed-rank. Independent → rank-sum.
              </li>
              <li>
                <strong>Keeping zero differences.</strong> Some older software counts zeros as
                "half" pairs; the standard modern practice is to drop them and reduce n.
              </li>
              <li>
                <strong>Forgetting the tie correction.</strong> With repeated |d| values, using the
                uncorrected σW² inflates the standard error and makes p-values conservative.
              </li>
              <li>
                <strong>Reading W's sign.</strong> W = min(W⁺, W⁻) is always the smaller sum — its
                magnitude tells you nothing about direction. Compare W⁺ vs W⁻ (or look at the sign of
                z) to see which way the pairs moved.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Two paired dataset boxes — accepts commas, spaces, tabs, new lines and values pasted from a spreadsheet.",
                "Automatic length check — Before and After must have the same number of values.",
                "Zero differences dropped with a clear note showing effective n.",
                "Ranking of absolute differences with tie handling (average ranks) shown in a table.",
                "W⁺, W⁻ and W = min(W⁺, W⁻) — plus the W⁺ + W⁻ = n(n+1)/2 sanity check.",
                "Normal-approximation z with a continuity correction AND a tie correction to σW².",
                "One-sided or two-sided p-value with a plain-language verdict at your chosen α (0.10, 0.05, 0.01).",
                "Lollipop chart — one bar per pair, coloured by sign — so you can see at a glance how many pairs went up vs down and by how much.",
                "Show/hide step-by-step working with your own numbers substituted into every formula.",
                "Copy the summary as text or download the result panel as a PNG.",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Do I need normally distributed differences?",
                  a: <p>No — that's the whole point of using this test instead of the paired t-test. All it needs is that the differences are at least ordinal and (for a test of medians specifically) roughly symmetric.</p>,
                },
                {
                  q: "How small a sample can I use?",
                  a: <p>Technically n ≥ 6 gives enough distinct rank arrangements to reach p ≈ 0.05 two-sided. The normal approximation on this page is reliable once effective n is around 10; for smaller samples it's still directionally right but exact tables are more precise.</p>,
                },
                {
                  q: "Can I use one-sided?",
                  a: <p>Yes, when you have a directional hypothesis fixed <em>before</em> looking at the data (e.g. "the intervention should reduce scores"). Picking the direction after peeking is p-hacking.</p>,
                },
                {
                  q: "What if all my differences are positive?",
                  a: <p>W⁻ will be 0 and W = 0. The test will give a very small p-value — which is correct: every pair moved the same way, that's a strong signal. Just note that the normal approximation is at its worst when W is at an extreme with tiny n; a small-sample exact table is even more decisive.</p>,
                },
                {
                  q: "Is this the same as the sign test?",
                  a: <p>No. The sign test uses only the direction of each difference (how many + vs −), ignoring magnitude. Wilcoxon uses both direction AND rank of magnitude, so it's more powerful whenever the sizes of the changes carry information.</p>,
                },
                {
                  q: "Can I run it on ordinal (Likert) data?",
                  a: <p>Yes — that's a common use. Rank differences between two ratings on the same subject. Just be aware that Likert differences aren't always symmetric, so interpret as a shift in P(d &gt; 0) rather than strictly a median difference.</p>,
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/t-test-calculator", label: "T-Test Calculator (paired mode)" },
                { to: "/calculators/math/mann-whitney-calculator", label: "Mann-Whitney U Test Calculator" },
                { to: "/calculators/math/p-value-calculator", label: "P-Value Calculator" },
                { to: "/calculators/math/z-score-calculator", label: "Z-Score Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Before values" hint="Numbers separated by commas, spaces or new lines.">
          <textarea
            value={beforeRaw}
            onChange={(e) => setBeforeRaw(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
        <Field label="After values" hint="Must have the same count as Before — this is a paired test.">
          <textarea
            value={afterRaw}
            onChange={(e) => setAfterRaw(e.target.value)}
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
            <option value="two">Two-sided: paired values changed</option>
            <option value="right">Right-tailed: After &gt; Before</option>
            <option value="left">Left-tailed: After &lt; Before</option>
          </select>
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <PrimaryButton onClick={compute}>Run Wilcoxon signed-rank test</PrimaryButton>
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
              Wilcoxon signed-rank — n = {result.n}
              {result.nZeros > 0 && ` (dropped ${result.nZeros} zero${result.nZeros === 1 ? "" : "s"})`},
              α = {result.alpha} ({result.tail === "two" ? "two-sided" : `${result.tail}-tailed`})
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Tile label="W" value={fmt(result.W)} sub={`W⁺=${fmt(result.Wplus)}, W⁻=${fmt(result.Wminus)}`} />
              <Tile label="z (corrected)" value={fmt(result.zCorrected)} sub={`raw z=${fmt(result.z)}`} />
              <Tile label="p-value" value={fmtP(result.p)} sub={result.tail === "two" ? "two-sided" : `${result.tail}-tailed`} />
              <Tile
                label="Verdict"
                value={result.reject ? "Reject H₀" : "Fail to reject H₀"}
                sub={result.reject ? "Statistically significant" : "Not statistically significant"}
              />
            </div>
            <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div>
                μW = <span className="tabular-nums text-foreground">{fmt(result.muW)}</span>, σW ={" "}
                <span className="tabular-nums text-foreground">{fmt(result.sigmaW)}</span>
              </div>
              <div>
                Ties: <span className="tabular-nums text-foreground">{result.tieGroups.length}</span>{" "}
                group{result.tieGroups.length === 1 ? "" : "s"}
                {result.tieGroups.length > 0 && ` (sizes ${result.tieGroups.join(", ")})`}
              </div>
              <div>
                Direction:{" "}
                <span className="text-foreground">
                  {result.Wplus > result.Wminus
                    ? "increases dominate"
                    : result.Wplus < result.Wminus
                      ? "decreases dominate"
                      : "balanced"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Paired differences — one lollipop per pair, coloured by sign
            </div>
            <LollipopDiffs ranked={result.ranked} />
            <p className="mt-2 text-xs text-muted-foreground">
              Bars pointing right mean After &gt; Before; bars pointing left mean the opposite. The
              longer the bar and the more its sign dominates, the smaller the p-value.
            </p>
          </div>

          <SolutionSteps steps={steps} />

          <ResultActions
            getCopyText={() => summary}
            captureRef={resultRef}
            filename={`wilcoxon-n${result.n}`}
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
