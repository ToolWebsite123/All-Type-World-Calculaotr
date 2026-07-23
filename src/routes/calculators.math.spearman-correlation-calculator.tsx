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
  ResultBox,
  GuideCards,
  FormulaBlock,
  FormulaWithLegend,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import type { ReactNode } from "react";
import { parseDataset } from "@/lib/math/parse-numbers";

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

export const Route = createFileRoute("/calculators/math/spearman-correlation-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Spearman's Rank Correlation Calculator",
      title: "Spearman Rank Correlation Calculator (ρ)",
      metaDescription:
        "Compute Spearman's rank correlation from paired data with rank table, tie handling, and full working.",
      canonicalUrl: "/calculators/math/spearman-correlation-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Spearman's Rank Correlation Calculator", path: "/calculators/math/spearman-correlation-calculator" },
      ],
      faqs: [
        {
          q: "When should I use Spearman instead of Pearson?",
          a: "Use Spearman when the relationship is monotonic but not necessarily linear, when the data is ordinal (ranks or ratings), or when outliers would distort Pearson's r. Pearson only detects straight-line relationships.",
        },
        {
          q: "How does this calculator handle tied values?",
          a: "Tied values receive the average of the ranks they would have occupied. The calculator then applies Pearson's formula to the ranks, which gives the correct tie-adjusted ρ. The simplified 1 − 6Σd²/[n(n²−1)] formula is only valid when there are no ties.",
        },
        {
          q: "What range can Spearman's ρ take?",
          a: "The same as Pearson's r: −1 to +1. ρ = +1 means Y is a perfectly increasing function of X (any monotonic shape); ρ = −1 means perfectly decreasing; ρ = 0 means no monotonic relationship.",
        },
        {
          q: "Can Spearman detect a U-shaped relationship?",
          a: "No. Like Pearson, Spearman assumes the relationship is monotonic (consistently increasing or decreasing). A symmetric U-shape can give ρ ≈ 0 even though X and Y are clearly related.",
        },
        {
          q: "Do X and Y have to be the same length?",
          a: "Yes — each observation contributes one X and one Y. The calculator returns an error if the two lists differ in length.",
        },
      ],
    }),
  component: SpearmanPage,
});

/* ---------------- Ranking with ties (average / fractional rank) ---------------- */

function averageRanks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    // positions i..j (0-based) → ranks (i+1)..(j+1); average:
    const avg = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avg;
    i = j + 1;
  }
  return ranks;
}

/* ---------------- Spearman via Pearson on ranks (handles ties correctly) ---------------- */

interface Row {
  x: number;
  y: number;
  rx: number;
  ry: number;
  d: number;
  d2: number;
}

interface SpearmanResult {
  n: number;
  rows: Row[];
  meanRank: number;
  sumProducts: number;
  sumDx2: number;
  sumDy2: number;
  sumD2: number;
  hasTies: boolean;
  tiesInX: boolean;
  tiesInY: boolean;
  rho: number; // tie-adjusted (Pearson on ranks)
  rhoSimplified: number; // simplified d² formula (for comparison)
}

function computeSpearman(xs: number[], ys: number[]): SpearmanResult | { error: string } {
  const n = xs.length;
  if (n < 2) return { error: "Need at least 2 paired observations." };
  const rx = averageRanks(xs);
  const ry = averageRanks(ys);

  const tiesInX = new Set(xs).size !== xs.length;
  const tiesInY = new Set(ys).size !== ys.length;

  const meanRank = (n + 1) / 2;
  let sumProducts = 0;
  let sumDx2 = 0;
  let sumDy2 = 0;
  let sumD2 = 0;
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - meanRank;
    const dy = ry[i] - meanRank;
    sumProducts += dx * dy;
    sumDx2 += dx * dx;
    sumDy2 += dy * dy;
    const d = rx[i] - ry[i];
    const d2 = d * d;
    sumD2 += d2;
    rows.push({ x: xs[i], y: ys[i], rx: rx[i], ry: ry[i], d, d2 });
  }
  if (sumDx2 === 0 || sumDy2 === 0) {
    return { error: "ρ is undefined — all X (or all Y) values are identical, so their ranks have no variation." };
  }
  const rho = sumProducts / Math.sqrt(sumDx2 * sumDy2);
  const rhoSimplified = 1 - (6 * sumD2) / (n * (n * n - 1));
  return {
    n,
    rows,
    meanRank,
    sumProducts,
    sumDx2,
    sumDy2,
    sumD2,
    hasTies: tiesInX || tiesInY,
    tiesInX,
    tiesInY,
    rho,
    rhoSimplified,
  };
}

function interpretRho(rho: number): string {
  const a = Math.abs(rho);
  const dir = rho > 0 ? "positive" : rho < 0 ? "negative" : "no";
  let s: string;
  if (a >= 0.9) s = "Very strong";
  else if (a >= 0.7) s = "Strong";
  else if (a >= 0.5) s = "Moderate";
  else if (a >= 0.3) s = "Weak";
  else if (a > 0) s = "Very weak / negligible";
  else return "No monotonic relationship";
  return `${s} ${dir} monotonic relationship`;
}

function fmt(n: number, dp = 4): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n);
  return parseFloat(n.toFixed(dp)).toString();
}

/* ---------------- Rank scatter plot with best-fit line on ranks ---------------- */

function RankScatterPlot({ rows, n }: { rows: Row[]; n: number }) {
  const width = 640;
  const height = 380;
  const padL = 48;
  const padR = 20;
  const padT = 20;
  const padB = 44;
  const iw = width - padL - padR;
  const ih = height - padT - padB;

  const lo = 0.5;
  const hi = n + 0.5;
  const xTo = (v: number) => padL + ((v - lo) / (hi - lo)) * iw;
  const yTo = (v: number) => padT + ih - ((v - lo) / (hi - lo)) * ih;

  // Best-fit through ranks (mean = (n+1)/2)
  const mean = (n + 1) / 2;
  let sxy = 0;
  let sxx = 0;
  for (const r of rows) {
    sxy += (r.rx - mean) * (r.ry - mean);
    sxx += (r.rx - mean) * (r.rx - mean);
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = mean - slope * mean;

  const ticks = Math.min(n, 10);
  const step = Math.max(1, Math.ceil(n / ticks));
  const tickVals: number[] = [];
  for (let i = 1; i <= n; i += step) tickVals.push(i);
  if (tickVals[tickVals.length - 1] !== n) tickVals.push(n);

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Scatter plot of Rank(X) versus Rank(Y) with best-fit line — visualises the monotonic relationship Spearman measures"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
      >
        {tickVals.map((t) => (
          <g key={`gx${t}`}>
            <line x1={xTo(t)} x2={xTo(t)} y1={padT} y2={height - padB} stroke="var(--color-border)" strokeWidth={1} opacity={0.35} />
            <text x={xTo(t)} y={height - padB + 14} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">{t}</text>
          </g>
        ))}
        {tickVals.map((t) => (
          <g key={`gy${t}`}>
            <line x1={padL} x2={width - padR} y1={yTo(t)} y2={yTo(t)} stroke="var(--color-border)" strokeWidth={1} opacity={0.35} />
            <text x={padL - 8} y={yTo(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--color-muted-foreground)">{t}</text>
          </g>
        ))}

        <line x1={padL} x2={width - padR} y1={height - padB} y2={height - padB} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />
        <line x1={padL} x2={padL} y1={padT} y2={height - padB} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />

        {/* Best-fit line on ranks */}
        <line
          x1={xTo(lo)}
          y1={yTo(slope * lo + intercept)}
          x2={xTo(hi)}
          y2={yTo(slope * hi + intercept)}
          stroke="var(--color-primary)"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.9}
        />

        {rows.map((r, i) => (
          <circle
            key={i}
            cx={xTo(r.rx)}
            cy={yTo(r.ry)}
            r={5}
            fill="var(--color-primary)"
            stroke="var(--color-background)"
            strokeWidth={1.5}
          />
        ))}

        <text x={padL + iw / 2} y={height - 6} textAnchor="middle" fontSize={12} fill="var(--color-muted-foreground)">
          Rank of X
        </text>
        <text
          x={14}
          y={padT + ih / 2}
          textAnchor="middle"
          fontSize={12}
          fill="var(--color-muted-foreground)"
          transform={`rotate(-90 14 ${padT + ih / 2})`}
        >
          Rank of Y
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Guide diagrams ---------------- */

function SpearRankDiagram() {
  const xs = [56, 75, 45, 71, 61];
  const ranks = [2, 5, 1, 4, 3];
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 260 130" className="w-full max-w-[260px]" aria-hidden>
        <text x="130" y="15" fontSize="10" textAnchor="middle" className="fill-muted-foreground">raw values → ranks</text>
        {xs.map((v, i) => (
          <g key={i}>
            <rect x={20 + i * 46} y={30} width={38} height={28} rx={4} className="fill-secondary stroke-border" />
            <text x={39 + i * 46} y={48} fontSize="12" textAnchor="middle" className="fill-foreground font-serif italic">{v}</text>
            <line x1={39 + i * 46} y1={62} x2={39 + i * 46} y2={78} className="stroke-muted-foreground" markerEnd="url(#sa)" />
            <rect x={20 + i * 46} y={82} width={38} height={28} rx={4} className="fill-primary/15 stroke-primary" />
            <text x={39 + i * 46} y={100} fontSize="12" textAnchor="middle" className="fill-primary font-serif italic font-semibold">{ranks[i]}</text>
          </g>
        ))}
        <defs>
          <marker id="sa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" className="fill-muted-foreground" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

function SpearTiesDiagram() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 260 130" className="w-full max-w-[260px]" aria-hidden>
        <text x="130" y="14" fontSize="10" textAnchor="middle" className="fill-muted-foreground">tied 61s share ranks 4 &amp; 5</text>
        {[
          { v: 45, r: "1", tie: false },
          { v: 56, r: "2", tie: false },
          { v: 58, r: "3", tie: false },
          { v: 61, r: "4.5", tie: true },
          { v: 61, r: "4.5", tie: true },
          { v: 64, r: "6", tie: false },
        ].map((row, i) => (
          <g key={i}>
            <rect x={16 + i * 38} y={30} width={34} height={26} rx={4} className="fill-secondary stroke-border" />
            <text x={33 + i * 38} y={47} fontSize="11" textAnchor="middle" className="fill-foreground font-serif italic">{row.v}</text>
            <rect x={16 + i * 38} y={78} width={34} height={26} rx={4} className={row.tie ? "fill-primary/25 stroke-primary" : "fill-primary/10 stroke-primary/60"} />
            <text x={33 + i * 38} y={95} fontSize="11" textAnchor="middle" className={row.tie ? "fill-primary font-semibold font-serif italic" : "fill-primary font-serif italic"}>{row.r}</text>
          </g>
        ))}
        <text x="130" y="120" fontSize="9" textAnchor="middle" className="fill-muted-foreground">average rank = (4 + 5) / 2 = 4.5</text>
      </svg>
    </div>
  );
}

function SpearFormulaDiagram() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 260 130" className="w-full max-w-[260px]" aria-hidden>
        <line x1="30" y1="100" x2="240" y2="100" className="stroke-border" />
        <line x1="30" y1="20" x2="30" y2="100" className="stroke-border" />
        {[
          [1, 2], [2, 1], [3, 3], [4, 4], [5, 5], [6, 6], [7, 8], [8, 7],
        ].map(([rx, ry], i) => (
          <circle key={i} cx={30 + rx * 25} cy={100 - ry * 10} r={3} className="fill-primary" />
        ))}
        <line x1="30" y1="100" x2="240" y2="20" className="stroke-primary" strokeWidth={1.2} strokeDasharray="4 3" />
        <text x="245" y="115" fontSize="9" textAnchor="end" className="fill-muted-foreground">Rank(X)</text>
        <text x="30" y="16" fontSize="9" textAnchor="middle" className="fill-muted-foreground">Rank(Y)</text>
        <text x="135" y="128" fontSize="9" textAnchor="middle" className="fill-muted-foreground">ρ = Pearson r on the ranks</text>
      </svg>
    </div>
  );
}

function SpearVsPearsonDiagram() {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const x = 20 + i * 18;
    const y = 100 - 60 * Math.log(1 + i / 3) / Math.log(5);
    pts.push({ x, y });
  }
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 260 130" className="w-full max-w-[260px]" aria-hidden>
        <line x1="10" y1="105" x2="250" y2="105" className="stroke-border" />
        <line x1="10" y1="20" x2="10" y2="105" className="stroke-border" />
        <path
          d={pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")}
          className="stroke-muted-foreground"
          strokeDasharray="3 3"
          fill="none"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} className="fill-primary" />
        ))}
        <text x="130" y="16" fontSize="10" textAnchor="middle" className="fill-muted-foreground">curved but monotonic</text>
        <text x="130" y="125" fontSize="9" textAnchor="middle" className="fill-muted-foreground">Pearson r ≈ 0.85 · Spearman ρ = 1.00</text>
      </svg>
    </div>
  );
}

const SPEAR_GUIDE: GuideCardItem[] = [
  {
    key: "rank",
    title: "1. Convert values to ranks first",
    explain:
      "Spearman doesn't care about the raw values — only their order. Sort each variable separately and assign rank 1 to the smallest, rank 2 to the next, and so on up to n.",
    formula: <>Rank(smallest) = 1 · Rank(largest) = n</>,
    diagram: <SpearRankDiagram />,
    example: {
      given: "56, 75, 45, 71, 61",
      substitute: "sorted: 45, 56, 61, 71, 75",
      answer: "ranks: 2, 5, 1, 4, 3",
    },
  },
  {
    key: "ties",
    title: "2. Ties get the average rank",
    explain:
      "When two or more values are equal they would occupy consecutive rank positions. Give each tied value the average of those positions — this is the standard tie-adjusted (midrank) method.",
    formula: <>tied ranks = (i + j) / 2</>,
    legend: [
      { sym: "i, j", def: "first and last rank positions the tie would occupy" },
    ],
    diagram: <SpearTiesDiagram />,
    example: {
      given: "two 61s would take ranks 4 and 5",
      substitute: "(4 + 5) / 2",
      answer: "each 61 gets rank 4.5",
    },
  },
  {
    key: "formula",
    title: "3. ρ = Pearson r on the ranks",
    explain:
      "Once both variables are ranked, ρ is just Pearson's correlation coefficient applied to the two rank lists. This general formula stays correct whether or not the data has ties.",
    formula: <>ρ = Σ(Rxᵢ − R̄)(Ryᵢ − R̄) / √( Σ(Rxᵢ − R̄)² · Σ(Ryᵢ − R̄)² )</>,
    legend: [
      { sym: "Rxᵢ, Ryᵢ", def: "ranks of the i-th observation" },
      { sym: "R̄", def: "mean rank = (n + 1) / 2" },
    ],
    diagram: <SpearFormulaDiagram />,
    example: {
      given: "n = 10 paired ranks",
      substitute: "Σproducts = 55, Σdx² = 82, Σdy² = 82.5",
      answer: "ρ = 55/√6765 ≈ 0.669",
    },
  },
  {
    key: "vs-pearson",
    title: "4. Why Spearman beats Pearson on curves",
    explain:
      "Pearson only picks up straight-line relationships. A perfectly monotonic curve — like exponential growth or a logarithmic decay — can give a Pearson r well below 1 even though the two variables move together perfectly. Spearman gives ρ = ±1 for any monotonic shape.",
    formula: <>monotonic curve → ρ = ±1, r &lt; ±1</>,
    diagram: <SpearVsPearsonDiagram />,
    example: {
      given: "y = log(x + 1)",
      substitute: "monotonic, not linear",
      answer: "ρ = 1.00 · r ≈ 0.85",
    },
  },
];

/* ---------------- Page ---------------- */


function SpearmanPage() {
  const [xInput, setXInput] = useState("56, 75, 45, 71, 61, 64, 58, 80, 76, 61");
  const [yInput, setYInput] = useState("66, 70, 40, 60, 65, 56, 59, 77, 67, 63");
  const [result, setResult] = useState<SpearmanResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    setNotice(null);
    const px = parseDataset(xInput);
    const py = parseDataset(yInput);
    if (px.invalid.length) return setErr(`X list — "${px.invalid[0]}" is not a valid number.`);
    if (py.invalid.length) return setErr(`Y list — "${py.invalid[0]}" is not a valid number.`);
    if (px.values.length === 0 || py.values.length === 0) return setErr("Enter numbers in both X and Y lists.");
    if (px.values.length !== py.values.length)
      return setErr(`X and Y must have the same number of values — got ${px.values.length} X and ${py.values.length} Y.`);
    const res = computeSpearman(px.values, py.values);
    if ("error" in res) return setErr(res.error);
    setResult(res);
    const cleaned = px.cleaned + py.cleaned;
    if (cleaned > 0) {
      setNotice(`Cleaned ${cleaned} value${cleaned === 1 ? "" : "s"} — stripped currency symbols, thousand separators or stray punctuation.`);
    }
  };

  const clear = () => {
    setXInput("");
    setYInput("");
    setResult(null);
    setErr(null);
    setNotice(null);
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const show = Math.min(result.n, 6);
    const legend = [
      { sym: "Rxᵢ, Ryᵢ", def: "ranks of X and Y (average-rank for ties)" },
      { sym: "R̄", def: "mean rank = (n + 1) / 2" },
      { sym: "ρ", def: "Spearman's rank correlation (−1 ≤ ρ ≤ 1)" },
    ];
    return [
      {
        title: "Rank X and Y",
        body: (
          <>
            <MathNote>
              n = {result.n}, ties: {result.hasTies ? "yes" : "no"} — ties receive the average of the rank positions they would occupy
            </MathNote>
            {result.rows.slice(0, show).map((r, i) => (
              <MathLine key={i}>
                ({fmt(r.x)}, {fmt(r.y)}) → (Rx = {fmt(r.rx)}, Ry = {fmt(r.ry)})
              </MathLine>
            ))}
            {result.n > show && <MathNote>…{result.n - show} more row(s)</MathNote>}
          </>
        ),
      },
      {
        title: "Formula",
        body: <FormulaWithLegend formula={<>ρ = Σ(Rxᵢ − R̄)(Ryᵢ − R̄) / √( Σ(Rxᵢ − R̄)² · Σ(Ryᵢ − R̄)² )</>} legend={legend} />,
      },
      {
        title: "Mean rank",
        body: (
          <>
            <MathNote>The mean rank is the same for both X and Y since ranks always run from 1 to n</MathNote>
            <MathLine>R̄ = (n + 1) / 2</MathLine>
            <MathLine>R̄ = ({result.n} + 1) / 2 = {fmt(result.meanRank)}</MathLine>
          </>
        ),
      },
      {
        title: "Deviations and sum of products",
        body: (
          <>
            <MathNote>Subtract the mean rank from each rank, then sum the cross-products and squared deviations</MathNote>
            <MathLine>Σ(Rx − R̄)(Ry − R̄) = {fmt(result.sumProducts)}</MathLine>
            <MathLine>Σ(Rx − R̄)² = {fmt(result.sumDx2)}</MathLine>
            <MathLine>Σ(Ry − R̄)² = {fmt(result.sumDy2)}</MathLine>
            <MathLine>Σd² = {fmt(result.sumD2)} (reference for the simplified formula)</MathLine>
          </>
        ),
      },
      {
        title: "Denominator",
        body: (
          <>
            <MathNote>Multiply the two sums of squared deviations, then take the square root</MathNote>
            <MathLine>√(Σ(Rx − R̄)² · Σ(Ry − R̄)²)</MathLine>
            <MathLine>√({fmt(result.sumDx2)} × {fmt(result.sumDy2)}) = {fmt(Math.sqrt(result.sumDx2 * result.sumDy2))}</MathLine>
          </>
        ),
      },
      {
        title: "Compute ρ",
        body: (
          <>
            <MathLine>ρ = Σ(Rx − R̄)(Ry − R̄) / √(Σ(Rx − R̄)² · Σ(Ry − R̄)²)</MathLine>
            <MathLine>ρ = {fmt(result.sumProducts)} / √({fmt(result.sumDx2)} × {fmt(result.sumDy2)})</MathLine>
            <MathLine>ρ = {fmt(result.rho)}</MathLine>
            {result.hasTies && (
              <MathNote>No-ties formula would give ≈ {fmt(result.rhoSimplified)} (biased by ties).</MathNote>
            )}
          </>
        ),
      },
    ];
  }, [result]);


  const summary = useMemo(() => {
    if (!result) return "";
    return [
      `Spearman's rank correlation coefficient ρ = ${fmt(result.rho)}`,
      `Interpretation: ${interpretRho(result.rho)}`,
      `n = ${result.n}`,
      `Ties present: ${result.hasTies ? "yes" : "no"}`,
      `Σd² = ${fmt(result.sumD2)}`,
    ].join("\n");
  }, [result]);

  return (
    <MathCalcPage
      name="Spearman's Rank Correlation Calculator"
      tagline="Compute Spearman's ρ from two paired data sets — with correct tie-adjusted ranks, a rank-vs-rank scatter plot, the full ranking table and step-by-step working."
      extras={
        <>
          <CalcSection title="Spearman's ρ explained, step by step">
            <p className="text-sm text-muted-foreground">
              Each concept below has a plain-English definition, its formula, a small diagram and a worked example — all in one card so you never have to jump between sections to piece it together.
            </p>
            <GuideCards items={SPEAR_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Correct tie-adjusted ranks — tied values receive the average of the ranks they would have occupied",
                "Uses Pearson's formula on the ranks, so results stay correct whether or not your data has ties",
                "Full ranking table showing original X, original Y, Rank(X), Rank(Y) and d² for every row",
                "Rank scatter plot with best-fit line — the true visual of a monotonic relationship, not a raw-value scatter",
                "Show/hide step-by-step working with the substituted formula",
                "Plain-language strength interpretation (very strong / strong / moderate / weak, positive or negative)",
                "Reports the simplified-formula answer for comparison so you can see exactly what ties cost you",
                "Handles messy pasted data — currency symbols, thousand separators and stray punctuation are stripped",
                "Copy the result summary or download the entire panel as an image",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "When should I use Spearman instead of Pearson?", a: <p>Use Spearman when the relationship is monotonic but not straight, when the data is ordinal (rankings or ratings), or when outliers would distort Pearson's r. Pearson only detects linear relationships.</p> },
                { q: "How are ties handled?", a: <p>Tied values receive the average of the ranks they would have occupied (the "midrank" or "fractional rank" method). The calculator then applies Pearson's formula to the ranks, which produces the correct tie-adjusted ρ.</p> },
                { q: "What range can ρ take?", a: <p>−1 to +1, exactly like Pearson's r. ρ = +1 means Y is a perfectly increasing function of X (any monotonic shape), ρ = −1 perfectly decreasing, ρ = 0 no monotonic relationship.</p> },
                { q: "Does ρ tell me the shape of the relationship?", a: <p>No — only its direction and monotonic strength. ρ = 0.95 could come from a straight line, an exponential curve or a logarithmic curve. Always look at the scatter plot to see the shape.</p> },
                { q: "Can Spearman handle negative numbers or decimals?", a: <p>Yes. Ranking only uses the ordering of the values, so any real numbers (negative, positive, decimals, mixed) work fine.</p> },
                { q: "What if all my X (or Y) values are identical?", a: <p>Then their ranks have no variation and ρ is undefined. The calculator returns a clear error in that case.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/correlation-calculator", label: "Correlation Coefficient Calculator (Pearson's r)" },
                { to: "/calculators/math/covariance-calculator", label: "Covariance Calculator" },
                { to: "/calculators/math/linear-regression-calculator", label: "Linear Regression Calculator" },
                { to: "/calculators/math/percentile-calculator", label: "Percentile & Quartile Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }

    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="X values (comma, space or newline separated)" htmlFor="xdata" hint="e.g. 56, 75, 45, 71, 61, 64, 58, 80, 76, 61">
            <textarea
              id="xdata"
              value={xInput}
              onChange={(e) => setXInput(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="56, 75, 45, 71, 61, 64, 58, 80, 76, 61"
            />
          </Field>
          <Field label="Y values (paired with X, same count)" htmlFor="ydata" hint="e.g. 66, 70, 40, 60, 65, 56, 59, 77, 67, 63">
            <textarea
              id="ydata"
              value={yInput}
              onChange={(e) => setYInput(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="66, 70, 40, 60, 65, 56, 59, 77, 67, 63"
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={compute}>Calculate Spearman's ρ</PrimaryButton>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center justify-center rounded-full border border-border bg-secondary/40 px-5 py-2.5 text-sm font-semibold text-foreground hover:border-primary/40"
          >
            Clear
          </button>
        </div>
      </div>

      {err && <ErrorBox message={err} />}
      {notice && (
        <div className="mt-2 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">{notice}</div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <ResultActions filename="spearman-rank-correlation-result" captureRef={resultRef} getCopyText={() => summary} />
          <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Spearman's rank correlation coefficient"
              value={<>ρ = {fmt(result.rho)}</>}
              note={
                <>
                  <div>{interpretRho(result.rho)}</div>
                  <div className="mt-1 text-xs">
                    n = {result.n} · {result.hasTies ? "ties present (tie-adjusted formula used)" : "no ties"} · Σd² = {fmt(result.sumD2)}
                  </div>
                </>
              }
            />

            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-2 text-sm font-semibold text-foreground">Ranking table</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm font-serif italic">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground">
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">X</th>
                      <th className="py-2 pr-4">Y</th>
                      <th className="py-2 pr-4">Rank(X)</th>
                      <th className="py-2 pr-4">Rank(Y)</th>
                      <th className="py-2 pr-4">d = Rx − Ry</th>
                      <th className="py-2">d²</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {result.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-1.5 pr-4">{fmt(r.x)}</td>
                        <td className="py-1.5 pr-4">{fmt(r.y)}</td>
                        <td className="py-1.5 pr-4">{fmt(r.rx)}</td>
                        <td className="py-1.5 pr-4">{fmt(r.ry)}</td>
                        <td className="py-1.5 pr-4">{fmt(r.d)}</td>
                        <td className="py-1.5">{fmt(r.d2)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border/60 font-semibold">
                      <td className="py-2 pr-4">Σ</td>
                      <td className="py-2 pr-4"></td>
                      <td className="py-2 pr-4"></td>
                      <td className="py-2 pr-4"></td>
                      <td className="py-2 pr-4"></td>
                      <td className="py-2 pr-4"></td>
                      <td className="py-2">{fmt(result.sumD2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-2 text-sm font-semibold text-foreground">Scatter plot of Rank(X) vs Rank(Y)</div>
              <RankScatterPlot rows={result.rows} n={result.n} />
              <div className="mt-2 text-xs text-muted-foreground">
                Spearman's ρ is fundamentally about the relationship between <em>ranks</em>, so this plot uses ranks — not raw values — with the least-squares line fitted through the ranks. The tighter the points hug the dashed line, the closer |ρ| is to 1.
              </div>
            </div>

            <StepsToggle steps={steps} />
          </div>
        </div>
      )}
    </MathCalcPage>
  );
}
