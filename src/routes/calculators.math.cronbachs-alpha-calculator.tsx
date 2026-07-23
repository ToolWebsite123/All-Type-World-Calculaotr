import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Plus, Minus } from "lucide-react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
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
import type { Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import type { ReactNode } from "react";
import { fmt } from "@/lib/math/p-value";

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

export const Route = createFileRoute("/calculators/math/cronbachs-alpha-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Cronbach's Alpha Calculator",
      title: "Cronbach's Alpha Calculator — Scale Reliability",
      metaDescription:
        "Compute Cronbach's α for a set of survey items with item-total table, variances, and reliability interpretation.",
      canonicalUrl: "/calculators/math/cronbachs-alpha-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Cronbach's Alpha Calculator", path: "/calculators/math/cronbachs-alpha-calculator" },
      ],
      faqs: [
        {
          q: "What is Cronbach's alpha?",
          a: "A number between 0 and 1 (occasionally negative for very bad scales) that estimates how consistently a set of survey or test items measure the same underlying construct. If everyone who scores high on item 1 also scores high on items 2, 3 and 4, alpha is high — the items are 'pulling together'.",
        },
        {
          q: "What alpha values count as 'good'?",
          a: "A common convention (Nunnally, 1978; George & Mallery, 2003): α ≥ 0.9 excellent, 0.8–0.9 good, 0.7–0.8 acceptable, 0.6–0.7 questionable, 0.5–0.6 poor, < 0.5 unacceptable. These thresholds vary by field — early-stage exploratory research often accepts 0.60+, whereas high-stakes clinical or educational assessment usually demands 0.90+.",
        },
        {
          q: "Can alpha be too high?",
          a: "Yes. Alpha rises with more items and with more redundant items. Values above ~0.95 often signal that several items are near-duplicates of each other — informative for reliability, wasteful for respondents, and a sign that the scale could be shortened without losing precision.",
        },
        {
          q: "How does the number of items affect alpha?",
          a: "Alpha increases as you add items measuring the same construct, all else equal (Spearman-Brown prediction). That's why very short scales (2–3 items) often report low alpha even when the items correlate well — it's the length penalty, not necessarily a bad scale.",
        },
        {
          q: "Does alpha assume anything about the data?",
          a: "Yes: items should be tau-equivalent (measuring the same construct on the same scale), continuous or continuous-like, and — for the classical formula — unidimensional. For strongly non-normal or dichotomous items, McDonald's ω or KR-20 can be better choices.",
        },
        {
          q: "What if alpha comes out negative?",
          a: "That means the sum of item variances exceeds the total-score variance, which happens when at least one item correlates negatively with the rest of the scale — usually a reverse-coded item that wasn't recoded before analysis. Fix the coding and recompute.",
        },
      ],
    }),
  component: CronbachsAlphaPage,
});

/* ---------------- Math ---------------- */

interface AlphaResult {
  k: number;
  n: number;
  itemMeans: number[];
  itemVariances: number[];
  totalScores: number[];
  totalMean: number;
  totalVariance: number;
  sumItemVariances: number;
  alpha: number;
  reliability: {
    band: string;
    tone: "excellent" | "good" | "acceptable" | "questionable" | "poor" | "unacceptable" | "redundant";
    description: string;
  };
}

function sampleVariance(xs: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mean = xs.reduce((s, v) => s + v, 0) / n;
  const ssq = xs.reduce((s, v) => s + (v - mean) ** 2, 0);
  return ssq / (n - 1);
}

function classifyAlpha(a: number): AlphaResult["reliability"] {
  if (a >= 0.95)
    return {
      band: "Excellent — but check for item redundancy",
      tone: "redundant",
      description:
        "Very high alpha. The items are highly consistent, but α ≥ 0.95 often means several items are near-duplicates — consider whether the scale could be shortened.",
    };
  if (a >= 0.9)
    return {
      band: "Excellent",
      tone: "excellent",
      description: "The items measure the underlying construct with high internal consistency.",
    };
  if (a >= 0.8)
    return {
      band: "Good",
      tone: "good",
      description: "Solid reliability — suitable for most research and applied uses.",
    };
  if (a >= 0.7)
    return {
      band: "Acceptable",
      tone: "acceptable",
      description: "Meets the common minimum for research use; borderline for high-stakes decisions.",
    };
  if (a >= 0.6)
    return {
      band: "Questionable",
      tone: "questionable",
      description: "Acceptable in early exploratory work only; revise items before wider use.",
    };
  if (a >= 0.5)
    return {
      band: "Poor",
      tone: "poor",
      description: "The items don't hang together well — inspect item-total correlations.",
    };
  return {
    band: "Unacceptable",
    tone: "unacceptable",
    description:
      "Items don't consistently measure the same thing. Common causes: reverse-coded items not recoded, mixing constructs, or too few items.",
  };
}

function computeAlpha(grid: number[][]): AlphaResult {
  const n = grid.length; // respondents
  const k = grid[0].length; // items
  const itemColumns: number[][] = Array.from({ length: k }, (_, j) => grid.map((row) => row[j]));
  const itemMeans = itemColumns.map((col) => col.reduce((s, v) => s + v, 0) / col.length);
  const itemVariances = itemColumns.map(sampleVariance);
  const totalScores = grid.map((row) => row.reduce((s, v) => s + v, 0));
  const totalMean = totalScores.reduce((s, v) => s + v, 0) / totalScores.length;
  const totalVariance = sampleVariance(totalScores);
  const sumItemVariances = itemVariances.reduce((s, v) => s + v, 0);
  const alpha =
    totalVariance > 0 ? (k / (k - 1)) * (1 - sumItemVariances / totalVariance) : 0;
  return {
    k,
    n,
    itemMeans,
    itemVariances,
    totalScores,
    totalMean,
    totalVariance,
    sumItemVariances,
    alpha,
    reliability: classifyAlpha(alpha),
  };
}

/* ---------------- Variance-contribution diagram ---------------- */

function VarianceChart({
  itemVariances,
  totalVariance,
}: {
  itemVariances: number[];
  totalVariance: number;
}) {
  const maxV = Math.max(totalVariance, ...itemVariances, 1e-9);
  const bars = [
    ...itemVariances.map((v, i) => ({ label: `Item ${i + 1}`, value: v, kind: "item" as const })),
    { label: "Total score", value: totalVariance, kind: "total" as const },
  ];
  const W = 720;
  const barH = 26;
  const gap = 10;
  const padL = 90;
  const padR = 60;
  const padT = 14;
  const padB = 14;
  const H = padT + padB + bars.length * (barH + gap);
  const iw = W - padL - padR;

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Per-item variance vs total-score variance"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[520px]"
      >
        {bars.map((b, i) => {
          const y = padT + i * (barH + gap);
          const w = Math.max(2, (b.value / maxV) * iw);
          const color = b.kind === "total" ? "text-accent" : "text-primary";
          return (
            <g key={i}>
              <text x={padL - 8} y={y + barH / 2 + 4} textAnchor="end" fontSize="11" className="fill-muted-foreground">
                {b.label}
              </text>
              <rect
                x={padL}
                y={y}
                width={w}
                height={barH}
                rx={4}
                className={`${color} fill-current`}
                opacity={b.kind === "total" ? 0.85 : 0.7}
              />
              <text
                x={padL + w + 6}
                y={y + barH / 2 + 4}
                fontSize="11"
                className="fill-foreground tabular-nums"
              >
                {fmt(b.value, 3)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------------- Page ---------------- */

const DEFAULT_GRID: number[][] = [
  [4, 5, 4, 5],
  [3, 4, 3, 4],
  [5, 5, 5, 4],
  [2, 3, 2, 3],
  [4, 4, 3, 4],
];

/* ---------------- Educational guide cards ---------------- */

function ItemVarMini() {
  const bars = [1.3, 0.7, 1.3, 0.5];
  return (
    <svg viewBox="0 0 220 100" className="w-full" role="img" aria-label="Per-item variances shown as bars, summed on the right">
      <line x1={10} y1={80} x2={210} y2={80} stroke="var(--color-border)" />
      {bars.map((v, i) => {
        const x = 20 + i * 30;
        const h = v * 40;
        return (
          <g key={i}>
            <rect x={x} y={80 - h} width={20} height={h} rx={2} fill="var(--color-primary)" opacity={0.75} />
            <text x={x + 10} y={94} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">I{i + 1}</text>
            <text x={x + 10} y={78 - h} textAnchor="middle" fontSize={9} fill="var(--color-foreground)">{v.toFixed(1)}</text>
          </g>
        );
      })}
      <text x={165} y={40} fontSize={10} fill="var(--color-muted-foreground)">Σσᵢ² = 3.80</text>
    </svg>
  );
}

function TotalVarMini() {
  const totals = [18, 14, 19, 10, 15];
  const mean = 15.2;
  return (
    <svg viewBox="0 0 220 100" className="w-full" role="img" aria-label="Total scores per respondent with the mean line and shared spread">
      <line x1={10} y1={70} x2={210} y2={70} stroke="var(--color-border)" />
      <line x1={10} y1={70 - (mean - 10) * 4} x2={210} y2={70 - (mean - 10) * 4} stroke="var(--color-primary)" strokeDasharray="3 3" />
      {totals.map((t, i) => {
        const x = 25 + i * 35;
        const y = 70 - (t - 10) * 4;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill="var(--color-primary)" />
            <text x={x} y={92} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">{t}</text>
          </g>
        );
      })}
      <text x={170} y={20} fontSize={10} fill="var(--color-primary)">mean 15.2</text>
      <text x={20} y={20} fontSize={10} fill="var(--color-muted-foreground)">σ²ₜ = 12.70</text>
    </svg>
  );
}

function AlphaGaugeMini() {
  const alpha = 0.9344;
  const cx = 110, cy = 90, r = 70;
  const angle = Math.PI * (1 - Math.max(0, Math.min(1, alpha)));
  const x2 = cx + r * Math.cos(angle);
  const y2 = cy - r * Math.sin(angle);
  const bands = [
    { from: 0, to: 0.5, color: "var(--color-destructive)" },
    { from: 0.5, to: 0.7, color: "#f59e0b" },
    { from: 0.7, to: 0.9, color: "#10b981" },
    { from: 0.9, to: 1, color: "var(--color-primary)" },
  ];
  return (
    <svg viewBox="0 0 220 110" className="w-full" role="img" aria-label="Semi-circle gauge showing alpha value against reliability bands">
      {bands.map((b, i) => {
        const a1 = Math.PI * (1 - b.from);
        const a2 = Math.PI * (1 - b.to);
        const p1 = `${cx + r * Math.cos(a1)},${cy - r * Math.sin(a1)}`;
        const p2 = `${cx + r * Math.cos(a2)},${cy - r * Math.sin(a2)}`;
        return <path key={i} d={`M ${p1} A ${r} ${r} 0 0 1 ${p2}`} stroke={b.color} strokeWidth={10} fill="none" opacity={0.75} />;
      })}
      <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="var(--color-foreground)" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3} fill="var(--color-foreground)" />
      <text x={cx} y={cy + 15} textAnchor="middle" fontSize={11} fill="var(--color-foreground)">α ≈ 0.93</text>
    </svg>
  );
}

function KMultiplierMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full" role="img" aria-label="How the k over k minus one multiplier shrinks toward 1 as k grows">
      <line x1={20} y1={80} x2={210} y2={80} stroke="var(--color-border)" />
      {[2, 3, 4, 6, 10, 20].map((k, i) => {
        const x = 30 + i * 30;
        const v = k / (k - 1);
        const y = 80 - (v - 1) * 60;
        return (
          <g key={k}>
            <circle cx={x} cy={y} r={4} fill="var(--color-primary)" />
            <text x={x} y={94} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">k={k}</text>
            <text x={x} y={y - 6} textAnchor="middle" fontSize={9} fill="var(--color-foreground)">{v.toFixed(2)}</text>
          </g>
        );
      })}
    </svg>
  );
}

const CRON_GUIDE: GuideCardItem[] = [
  {
    key: "item-var",
    title: "Given — item variances",
    explain:
      "Alpha compares how much variance lives inside individual items to how much lives in the total score. Compute the sample variance (n − 1 denominator) of each column separately, then add them.",
    formula: <>σᵢ² = Σ(xᵢⱼ − x̄ᵢ)² / (n − 1) · Σσᵢ² adds the item variances</>,
    legend: [
      { sym: "xᵢⱼ", def: "score of respondent j on item i" },
      { sym: "x̄ᵢ", def: "mean of item i across respondents" },
    ],
    diagram: <ItemVarMini />,
    example: {
      given: "σ₁² = 1.30, σ₂² = 0.70, σ₃² = 1.30, σ₄² = 0.50",
      substitute: "1.30 + 0.70 + 1.30 + 0.50",
      answer: "Σσᵢ² = 3.80",
    },
  },
  {
    key: "total-var",
    title: "Substitute — total-score variance",
    explain:
      "Sum each respondent's item scores to get the total score, then take the sample variance of those totals. If items agree, respondents' totals spread out much more than any single column does — that's the whole intuition behind alpha.",
    formula: <>Tⱼ = Σᵢ xᵢⱼ · σ²ₜ = Σ(Tⱼ − T̄)² / (n − 1)</>,
    legend: [
      { sym: "Tⱼ", def: "total score for respondent j" },
      { sym: "σ²ₜ", def: "variance of total scores" },
    ],
    diagram: <TotalVarMini />,
    example: {
      given: "Totals = 18, 14, 19, 10, 15 · mean 15.2",
      substitute: "Σ(Tⱼ − 15.2)² = 50.80 · divide by n − 1 = 4",
      answer: "σ²ₜ = 12.70",
    },
  },
  {
    key: "k-factor",
    title: "Formula — k/(k−1) multiplier",
    explain:
      "The inner ratio 1 − Σσᵢ² / σ²ₜ is bounded above by 1 − 1/k, so the (k / (k − 1)) factor rescales it into the 0-to-1 range and prevents shorter scales from being unfairly penalised.",
    formula: <>k / (k − 1) → 2, 1.5, 1.33, 1.20, 1.11, 1.05 as k = 2, 3, 4, 6, 10, 20</>,
    legend: [
      { sym: "k", def: "number of items on the scale" },
    ],
    diagram: <KMultiplierMini />,
    example: {
      given: "k = 4 items",
      substitute: "4 / (4 − 1)",
      answer: "k/(k−1) = 1.3333…",
    },
  },
  {
    key: "alpha",
    title: "Answer — α and reliability band",
    explain:
      "Combine the three ingredients into α. Values between 0.70 and 0.90 are the usual sweet spot; below that suggests weak inter-item agreement, above 0.95 hints that items may be redundant rather than merely consistent.",
    formula: <>α = (k / (k − 1)) · (1 − Σσᵢ² / σ²ₜ)</>,
    legend: [
      { sym: "Σσᵢ²", def: "sum of item variances (Step 1)" },
      { sym: "σ²ₜ", def: "total-score variance (Step 2)" },
    ],
    diagram: <AlphaGaugeMini />,
    example: {
      given: "k = 4, Σσᵢ² = 3.80, σ²ₜ = 12.70",
      substitute: "(4/3) · (1 − 3.80/12.70) = (4/3) · 0.70079",
      answer: "α ≈ 0.9344 → Excellent",
    },
  },
];

function CronbachsAlphaPage() {
  const [grid, setGrid] = useState<number[][]>(DEFAULT_GRID);
  const [result, setResult] = useState<AlphaResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const nRows = grid.length;
  const nCols = grid[0]?.length ?? 0;

  const setCell = (r: number, c: number, value: string) => {
    // Allow blank while typing; store as NaN so validation catches it on compute.
    const num = value.trim() === "" ? NaN : Number(value);
    setGrid((g) => g.map((row, i) => (i === r ? row.map((v, j) => (j === c ? num : v)) : row)));
  };

  const addRow = () => setGrid((g) => [...g, Array(nCols).fill(0)]);
  const removeRow = () => nRows > 2 && setGrid((g) => g.slice(0, -1));
  const addCol = () => nCols < 30 && setGrid((g) => g.map((row) => [...row, 0]));
  const removeCol = () => nCols > 2 && setGrid((g) => g.map((row) => row.slice(0, -1)));

  const resetExample = () => {
    setGrid(DEFAULT_GRID);
    setResult(null);
    setErr(null);
  };

  const compute = () => {
    setErr(null);
    setResult(null);
    if (nRows < 2) {
      setErr("Need at least 2 respondents (rows).");
      return;
    }
    if (nCols < 2) {
      setErr("Need at least 2 items (columns) to measure internal consistency.");
      return;
    }
    for (let i = 0; i < nRows; i++) {
      for (let j = 0; j < nCols; j++) {
        if (!Number.isFinite(grid[i][j])) {
          setErr(`Row ${i + 1}, item ${j + 1} is empty or not a number.`);
          return;
        }
      }
    }
    const res = computeAlpha(grid);
    if (res.totalVariance === 0) {
      setErr(
        "Total-score variance is zero — every respondent got the exact same total. Alpha is undefined in that case.",
      );
      return;
    }
    setResult(res);
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { k, itemMeans, itemVariances, totalScores, totalMean, totalVariance, sumItemVariances, alpha } =
      result;
    return [
      {
        title: "1. Compute each item's mean and sample variance",
        body: (
          <div>
            <MathNote>
              For each column (item), variance is Σ(x − mean)² / (n − 1). This measures how spread
              out the responses on that item are.
            </MathNote>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="py-1 pr-3">Item</th>
                    <th className="py-1 pr-3">Mean</th>
                    <th className="py-1">Variance σᵢ²</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:border-b [&_td]:border-border/40 [&_td]:py-1 [&_td]:pr-3">
                  {itemMeans.map((m, i) => (
                    <tr key={i}>
                      <td>Item {i + 1}</td>
                      <td>{fmt(m, 4)}</td>
                      <td>{fmt(itemVariances[i], 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <MathLine>Σσᵢ² = {fmt(sumItemVariances, 4)}</MathLine>
          </div>
        ),
      },
      {
        title: "2. Compute each respondent's total score",
        body: (
          <div>
            <MathNote>
              Total score for respondent i = sum of their answers across all {k} items.
            </MathNote>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="py-1 pr-3">Respondent</th>
                    <th className="py-1">Total score</th>
                  </tr>
                </thead>
                <tbody className="[&_td]:border-b [&_td]:border-border/40 [&_td]:py-1 [&_td]:pr-3">
                  {totalScores.map((t, i) => (
                    <tr key={i}>
                      <td>R{i + 1}</td>
                      <td>{fmt(t, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <MathLine>mean total T̄ = {fmt(totalMean, 4)}</MathLine>
          </div>
        ),
      },
      {
        title: "3. Compute the total-score variance",
        body: (
          <>
            <MathNote>
              This should be noticeably larger than any single item's variance — respondents'
              totals spread out more than any one answer does.
            </MathNote>
            <MathLine>σ²ₜ = Σ(Tᵢ − T̄)² / (n − 1)</MathLine>
            <MathLine>σ²ₜ = {fmt(totalVariance, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "4. Plug into the Cronbach's alpha formula",
        body: (
          <>
            <MathLine>α = (k / (k − 1)) · (1 − Σσᵢ² / σ²ₜ)</MathLine>
            <MathLine>
              α = ({k} / {k - 1}) · (1 − {fmt(sumItemVariances, 4)} / {fmt(totalVariance, 4)})
            </MathLine>
            <MathLine>
              α = {fmt(k / (k - 1), 4)} · (1 − {fmt(sumItemVariances / totalVariance, 4)})
            </MathLine>
            <MathLine>
              α = {fmt(k / (k - 1), 4)} · {fmt(1 - sumItemVariances / totalVariance, 4)}
            </MathLine>
            <MathLine>α = {fmt(alpha, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "5. Interpret the value",
        body: (
          <MathNote>
            α = {fmt(alpha, 4)} falls in the "<strong>{result.reliability.band}</strong>" band.{" "}
            {result.reliability.description}
          </MathNote>
        ),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    return [
      `Cronbach's alpha — n = ${result.n} respondents, k = ${result.k} items`,
      `Sum of item variances Σσᵢ² = ${fmt(result.sumItemVariances, 4)}`,
      `Total-score variance σ²ₜ = ${fmt(result.totalVariance, 4)}`,
      `α = ${fmt(result.alpha, 4)}`,
      `Reliability: ${result.reliability.band}`,
    ].join("\n");
  }, [result]);

  return (
    <MathCalcPage
      name="Cronbach's Alpha Calculator"
      tagline="Estimate a survey or test's internal-consistency reliability. Enter respondents × items, get per-item variances, total-score variance, α with a plain-language verdict, contribution diagram and show/hide step-by-step working."
      extras={
        <>
          <CalcSection title="What is Cronbach's alpha?">
            <p>
              <strong>Cronbach's alpha (α)</strong> is a reliability coefficient — it estimates how
              consistently a group of survey or test items measure the same underlying construct
              ("customer satisfaction", "extraversion", "algebra ability"). If everyone who agrees
              with item 1 also tends to agree with items 2, 3 and 4, the items are pulling in the
              same direction and alpha is high. If responses are scattered across items, alpha is
              low.
            </p>
            <p>
              Formally, alpha compares the sum of individual item variances to the variance of the
              total score. When the items covary strongly, the total-score variance is much bigger
              than the sum of item variances, and α approaches 1.
            </p>
          </CalcSection>

<CalcSection title="Cronbach's alpha, piece by piece">
            <GuideCards items={CRON_GUIDE} />
          </CalcSection>


          <CalcSection title="How to raise a low alpha">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Recode reverse items.</strong> A single reverse-scored item left uncorrected
                can push alpha to zero or negative.
              </li>
              <li>
                <strong>Drop items with low corrected item-total correlation</strong> (rule of
                thumb: below 0.30). If an item isn't correlated with the total, it isn't measuring
                the same construct.
              </li>
              <li>
                <strong>Add more items measuring the same construct.</strong> Alpha rises with k —
                but only if the new items are relevant.
              </li>
              <li>
                <strong>Rewrite ambiguous or double-barrelled items.</strong> "I enjoy my job and my
                coworkers" mixes two things and drags alpha down.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Editable data grid — rows are respondents, columns are items. Add/remove rows and columns as needed.",
                "Pre-filled with a plausible 5 × 4 Likert-style example so you can inspect a working answer immediately.",
                "Per-item means and sample variances (n − 1 in the denominator).",
                "Total-score variance and the sum of item variances — the two quantities inside the alpha formula.",
                "Cronbach's alpha with the substitution written out in full.",
                "Plain-language reliability verdict using the George & Mallery / Nunnally thresholds — with an explicit warning when α ≥ 0.95 (usually a sign of redundant items).",
                "Contribution diagram — each item's variance as a bar next to the total-score variance, so you can see at a glance which items contribute most spread.",
                "Show/hide step-by-step working with your own numbers substituted into every formula.",
                "Copy the summary as text or download the result panel as a PNG.",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "Can alpha be negative?", a: <p>Yes, if the sum of item variances exceeds the total-score variance. This almost always signals a reverse-coded item that wasn't recoded. Fix the coding and recompute.</p> },
                { q: "Do I use sample or population variance?", a: <p>Sample variance (n − 1 in the denominator) — that's the convention this calculator and standard software (SPSS, R's psych::alpha) use.</p> },
                { q: "How many respondents do I need?", a: <p>The point estimate is defined for n ≥ 2, but confidence intervals stabilise around n = 100+. For scale-development studies, aim for at least 10 respondents per item where possible.</p> },
                { q: "Is 0.7 really the magic threshold?", a: <p>It's a convention, not a law. Nunnally originally proposed 0.7 as adequate for early research and 0.8 for applied use. Some fields accept 0.6 for new scales; others insist on 0.9 for clinical decisions.</p> },
                { q: "Should I report standardised alpha?", a: <p>Standardised alpha treats items as z-scored — it's what you'd get if every item had unit variance. Report both when items are on different scales; otherwise the raw formula (this page) is standard.</p> },
                { q: "Is alpha the same as split-half reliability?", a: <p>No, but they're related. Alpha equals the average of every possible split-half correlation corrected by the Spearman-Brown formula. It's more stable than any one split.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
                { to: "/calculators/math/correlation-calculator", label: "Correlation Coefficient Calculator" },
                { to: "/calculators/math/covariance-calculator", label: "Covariance Calculator" },
                { to: "/calculators/math/statistics-calculator", label: "Descriptive Statistics Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Rows = respondents ({nRows}) · Columns = items ({nCols}). Edit any cell to change a
          response.
        </div>
        <div className="flex flex-wrap gap-1.5">
          <IconBtn onClick={addRow} label="Add respondent">
            <Plus className="h-3.5 w-3.5" /> Row
          </IconBtn>
          <IconBtn onClick={removeRow} label="Remove last respondent" disabled={nRows <= 2}>
            <Minus className="h-3.5 w-3.5" /> Row
          </IconBtn>
          <IconBtn onClick={addCol} label="Add item" disabled={nCols >= 30}>
            <Plus className="h-3.5 w-3.5" /> Item
          </IconBtn>
          <IconBtn onClick={removeCol} label="Remove last item" disabled={nCols <= 2}>
            <Minus className="h-3.5 w-3.5" /> Item
          </IconBtn>
          <IconBtn onClick={resetExample} label="Reset to example grid">
            Reset
          </IconBtn>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/30 text-left text-muted-foreground">
              <th className="w-16 px-2 py-2"></th>
              {Array.from({ length: nCols }, (_, j) => (
                <th key={j} className="px-2 py-2 text-center font-medium">Item {j + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, r) => (
              <tr key={r} className="border-b border-border/40">
                <td className="px-2 py-1 text-xs text-muted-foreground">R{r + 1}</td>
                {row.map((v, c) => (
                  <td key={c} className="px-1 py-1">
                    <input
                      type="number"
                      step="any"
                      value={Number.isFinite(v) ? v : ""}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      className="w-full rounded-md border border-border/60 bg-background/60 px-2 py-1.5 text-center text-sm tabular-nums text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <PrimaryButton onClick={compute}>Calculate Cronbach's α</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <div ref={resultRef} className="mt-5 space-y-4">
          <div className="rounded-2xl border border-primary/40 bg-primary/[0.08] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Cronbach's α — n = {result.n} respondents, k = {result.k} items
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Tile label="α" value={fmt(result.alpha, 4)} sub={result.reliability.band} />
              <Tile label="Σσᵢ²" value={fmt(result.sumItemVariances, 4)} sub="sum of item variances" />
              <Tile label="σ²ₜ" value={fmt(result.totalVariance, 4)} sub="total-score variance" />
              <Tile label="k / (k − 1)" value={fmt(result.k / (result.k - 1), 4)} sub="length correction" />
            </div>
            <p className="mt-3 text-sm text-foreground/90">{result.reliability.description}</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Variance contribution — each item vs the total score
            </div>
            <VarianceChart
              itemVariances={result.itemVariances}
              totalVariance={result.totalVariance}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Total-score variance (accent) should sit clearly above the item bars — that's what
              drives α upward. If it's only a little bigger than Σσᵢ², the items don't covary and α
              stays low.
            </p>
          </div>

          <StepsToggle steps={steps} />

          <ResultActions
            getCopyText={() => summary}
            captureRef={resultRef}
            filename={`cronbachs-alpha-n${result.n}-k${result.k}`}
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
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
