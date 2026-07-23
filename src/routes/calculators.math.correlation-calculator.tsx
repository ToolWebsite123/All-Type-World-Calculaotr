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
import type { Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import { parseDataset } from "@/lib/math/parse-numbers";
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

export const Route = createFileRoute("/calculators/math/correlation-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Correlation Coefficient Calculator",
      title: "Correlation Coefficient Calculator — Pearson r",
      metaDescription:
        "Compute Pearson's r from paired data with scatter plot, covariance, standard deviations, and worked steps.",
      canonicalUrl: "/calculators/math/correlation-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Correlation Coefficient Calculator", path: "/calculators/math/correlation-calculator" },
      ],
      faqs: [
        {
          q: "What does r = 0 mean?",
          a: "An r of exactly 0 means there is no linear relationship between the two variables in your data. It does not mean they are unrelated — they could still have a strong non-linear relationship (like a U-shape) that Pearson's r cannot detect.",
        },
        {
          q: "Does a strong correlation prove one variable causes the other?",
          a: "No. Correlation is not causation. Two variables can move together because one causes the other, because both are driven by a third hidden factor, or by pure coincidence. r tells you the strength of the association, nothing about the mechanism.",
        },
        {
          q: "What counts as a 'strong' correlation?",
          a: "A common rule of thumb: |r| ≥ 0.7 strong, 0.5–0.7 moderate, 0.3–0.5 weak, below 0.3 very weak or negligible. The sign (+ or −) tells you the direction, not the strength.",
        },
        {
          q: "Do the X and Y lists have to be the same length?",
          a: "Yes. Each x value must be paired with exactly one y value from the same observation. The calculator will show an error if the two lists have different lengths.",
        },
      ],
    }),
  component: CorrelationPage,
});

/* ---------------- Math ---------------- */

interface CorrResult {
  n: number;
  xs: number[];
  ys: number[];
  meanX: number;
  meanY: number;
  dxs: number[];
  dys: number[];
  products: number[];
  dx2: number[];
  dy2: number[];
  sumProducts: number;
  sumDx2: number;
  sumDy2: number;
  r: number;
  // best-fit line y = m x + b
  slope: number;
  intercept: number;
}

function computeCorrelation(xs: number[], ys: number[]): CorrResult | { error: string } {
  const n = xs.length;
  if (n < 2) return { error: "Need at least 2 paired observations." };
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  const dxs = xs.map((v) => v - meanX);
  const dys = ys.map((v) => v - meanY);
  const products = dxs.map((d, i) => d * dys[i]);
  const dx2 = dxs.map((d) => d * d);
  const dy2 = dys.map((d) => d * d);
  const sumProducts = products.reduce((s, v) => s + v, 0);
  const sumDx2 = dx2.reduce((s, v) => s + v, 0);
  const sumDy2 = dy2.reduce((s, v) => s + v, 0);
  if (sumDx2 === 0 || sumDy2 === 0) {
    return {
      error:
        "Correlation is undefined when all X values (or all Y values) are identical — there is no variation to correlate.",
    };
  }
  const r = sumProducts / Math.sqrt(sumDx2 * sumDy2);
  const slope = sumProducts / sumDx2;
  const intercept = meanY - slope * meanX;
  return {
    n, xs, ys, meanX, meanY, dxs, dys, products, dx2, dy2,
    sumProducts, sumDx2, sumDy2, r, slope, intercept,
  };
}

function interpretR(r: number): { label: string; tone: "positive" | "negative" | "neutral" } {
  const a = Math.abs(r);
  const dir = r > 0 ? "positive" : r < 0 ? "negative" : "no";
  let strength: string;
  if (a >= 0.9) strength = "very strong";
  else if (a >= 0.7) strength = "strong";
  else if (a >= 0.5) strength = "moderate";
  else if (a >= 0.3) strength = "weak";
  else if (a > 0) strength = "very weak / negligible";
  else strength = "no";
  const label =
    a === 0
      ? "No linear correlation"
      : `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${dir} correlation`;
  return { label, tone: r > 0 ? "positive" : r < 0 ? "negative" : "neutral" };
}

function fmt(n: number, dp = 4): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) return n.toExponential(3);
  return parseFloat(n.toFixed(dp)).toString();
}

/* ---------------- Scatter plot ---------------- */

function ScatterPlot({
  xs,
  ys,
  slope,
  intercept,
}: {
  xs: number[];
  ys: number[];
  slope: number;
  intercept: number;
}) {
  const width = 640;
  const height = 360;
  const padL = 48;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const iw = width - padL - padR;
  const ih = height - padT - padB;

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xPad = (xMax - xMin) * 0.08 || 1;
  const yPad = (yMax - yMin) * 0.08 || 1;
  const xLo = xMin - xPad;
  const xHi = xMax + xPad;
  const yLo = yMin - yPad;
  const yHi = yMax + yPad;

  const xTo = (v: number) => padL + ((v - xLo) / (xHi - xLo)) * iw;
  const yTo = (v: number) => padT + ih - ((v - yLo) / (yHi - yLo)) * ih;

  // Best-fit line endpoints
  const lineX1 = xLo;
  const lineX2 = xHi;
  const lineY1 = slope * lineX1 + intercept;
  const lineY2 = slope * lineX2 + intercept;

  const ticks = 4;
  const xTicks = Array.from({ length: ticks + 1 }, (_, i) => xLo + ((xHi - xLo) * i) / ticks);
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yLo + ((yHi - yLo) * i) / ticks);

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Scatter plot of paired X and Y values with best-fit line"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
      >
        {/* Grid */}
        {yTicks.map((t, i) => {
          const y = yTo(t);
          return (
            <g key={`y${i}`}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} opacity={0.4} />
              <text x={padL - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--color-muted-foreground)">
                {fmt(Number(t.toFixed(2)), 2)}
              </text>
            </g>
          );
        })}
        {xTicks.map((t, i) => {
          const x = xTo(t);
          return (
            <g key={`x${i}`}>
              <line x1={x} x2={x} y1={padT} y2={height - padB} stroke="var(--color-border)" strokeWidth={1} opacity={0.4} />
              <text x={x} y={height - padB + 14} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">
                {fmt(Number(t.toFixed(2)), 2)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padL} x2={width - padR} y1={height - padB} y2={height - padB} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />
        <line x1={padL} x2={padL} y1={padT} y2={height - padB} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />

        {/* Best-fit line */}
        <line
          x1={xTo(lineX1)}
          y1={yTo(lineY1)}
          x2={xTo(lineX2)}
          y2={yTo(lineY2)}
          stroke="var(--color-primary)"
          strokeWidth={2}
          opacity={0.9}
          strokeDasharray="6 4"
        />

        {/* Points */}
        {xs.map((x, i) => (
          <circle
            key={i}
            cx={xTo(x)}
            cy={yTo(ys[i])}
            r={4}
            fill="var(--color-primary)"
            stroke="var(--color-background)"
            strokeWidth={1.5}
          />
        ))}

        {/* Axis labels */}
        <text x={padL + iw / 2} y={height - 4} textAnchor="middle" fontSize={11} fill="var(--color-muted-foreground)">
          X
        </text>
        <text
          x={12}
          y={padT + ih / 2}
          textAnchor="middle"
          fontSize={11}
          fill="var(--color-muted-foreground)"
          transform={`rotate(-90 12 ${padT + ih / 2})`}
        >
          Y
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Guide diagrams ---------------- */

function CorrDirectionDiagram() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 260 130" className="w-full max-w-[260px]" aria-hidden>
        {[
          { x0: 10, x1: 80, y0: 100, y1: 30, lbl: "r ≈ +1", dx: [15, 30, 50, 65], dy: [92, 74, 52, 38] },
          { x0: 95, x1: 165, y0: 30, y1: 100, lbl: "r ≈ −1", dx: [100, 115, 135, 150], dy: [38, 55, 78, 92] },
          { x0: 180, x1: 250, y0: 65, y1: 65, lbl: "r ≈ 0", dx: [185, 200, 215, 225, 240], dy: [40, 90, 55, 75, 50] },
        ].map((g, i) => (
          <g key={i}>
            <line x1={g.x0} y1={g.y0} x2={g.x1} y2={g.y1} className="stroke-primary" strokeWidth={1.5} strokeDasharray="4 3" />
            {g.dx.map((cx, k) => (
              <circle key={k} cx={cx} cy={g.dy[k]} r={2.5} className="fill-primary" />
            ))}
            <text x={(g.x0 + g.x1) / 2} y={120} fontSize={10} textAnchor="middle" className="fill-muted-foreground font-serif italic">{g.lbl}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function CorrFormulaDiagram() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 260 130" className="w-full max-w-[260px]" aria-hidden>
        <line x1="130" y1="15" x2="130" y2="115" className="stroke-border" strokeDasharray="3 3" />
        <line x1="20" y1="65" x2="240" y2="65" className="stroke-border" strokeDasharray="3 3" />
        {[
          { x: 50, y: 90 }, { x: 80, y: 78 }, { x: 105, y: 70 },
          { x: 145, y: 58 }, { x: 175, y: 48 }, { x: 210, y: 30 },
        ].map((p, i) => {
          const dxPos = p.x > 130;
          const dyPos = p.y < 65;
          const productPos = dxPos === dyPos;
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3.5} className={productPos ? "fill-primary" : "fill-muted-foreground"} />
            </g>
          );
        })}
        <text x="132" y="12" fontSize="9" className="fill-muted-foreground">x̄</text>
        <text x="244" y="66" fontSize="9" className="fill-muted-foreground">ȳ</text>
        <text x="130" y="128" fontSize="9" textAnchor="middle" className="fill-muted-foreground">products (x−x̄)(y−ȳ) sum in direction of trend</text>
      </svg>
    </div>
  );
}

function CorrStrengthDiagram() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 260 130" className="w-full max-w-[260px]" aria-hidden>
        {[
          { x0: 10, x1: 80, scatter: 3, lbl: "|r| = 0.95" },
          { x0: 95, x1: 165, scatter: 10, lbl: "|r| = 0.70" },
          { x0: 180, x1: 250, scatter: 22, lbl: "|r| = 0.30" },
        ].map((g, i) => {
          const pts: { x: number; y: number }[] = [];
          for (let k = 0; k < 8; k++) {
            const t = k / 7;
            const cx = g.x0 + t * (g.x1 - g.x0);
            const cy = 100 - t * 60 + (Math.sin(k * 1.7 + i) * g.scatter);
            pts.push({ x: cx, y: cy });
          }
          return (
            <g key={i}>
              <line x1={g.x0} y1={100} x2={g.x1} y2={40} className="stroke-primary" strokeWidth={1.2} strokeDasharray="3 3" />
              {pts.map((p, k) => (
                <circle key={k} cx={p.x} cy={p.y} r={2.4} className="fill-primary" />
              ))}
              <text x={(g.x0 + g.x1) / 2} y={122} fontSize={10} textAnchor="middle" className="fill-muted-foreground font-serif italic">{g.lbl}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CorrCausationDiagram() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 260 130" className="w-full max-w-[260px]" aria-hidden>
        <circle cx="130" cy="30" r="22" className="fill-primary/15 stroke-primary" strokeWidth={1.3} />
        <text x="130" y="34" fontSize="11" textAnchor="middle" className="fill-foreground font-semibold">summer</text>
        <circle cx="55" cy="95" r="22" className="fill-secondary stroke-border" strokeWidth={1.3} />
        <text x="55" y="99" fontSize="10" textAnchor="middle" className="fill-foreground">ice cream</text>
        <circle cx="205" cy="95" r="22" className="fill-secondary stroke-border" strokeWidth={1.3} />
        <text x="205" y="99" fontSize="10" textAnchor="middle" className="fill-foreground">swimming</text>
        <line x1="118" y1="48" x2="70" y2="78" className="stroke-primary" strokeWidth={1.4} markerEnd="url(#ah)" />
        <line x1="142" y1="48" x2="190" y2="78" className="stroke-primary" strokeWidth={1.4} markerEnd="url(#ah)" />
        <line x1="80" y1="105" x2="180" y2="105" className="stroke-muted-foreground" strokeDasharray="4 3" />
        <text x="130" y="120" fontSize="9" textAnchor="middle" className="fill-muted-foreground">observed correlation ≠ causation</text>
        <defs>
          <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" className="fill-primary" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

const CORR_GUIDE: GuideCardItem[] = [
  {
    key: "what",
    title: "1. What Pearson's r measures",
    explain:
      "r captures how tightly two variables move together in a straight line. It always sits between −1 and +1, with the sign giving the direction and the magnitude giving the strength.",
    formula: <>−1 ≤ r ≤ +1</>,
    diagram: <CorrDirectionDiagram />,
    example: {
      given: "study hours vs. exam score",
      substitute: "hours ↑ ⇒ score ↑",
      answer: "positive r, close to +1",
    },
  },
  {
    key: "formula",
    title: "2. Where the formula comes from",
    explain:
      "The numerator sums products of paired deviations (x − x̄)(y − ȳ). When both variables move up or down together the products are positive; when they move oppositely the products are negative. The denominator scales that sum into the −1…+1 range.",
    formula: <>r = Σ(xᵢ − x̄)(yᵢ − ȳ) / √( Σ(xᵢ − x̄)² · Σ(yᵢ − ȳ)² )</>,
    legend: [
      { sym: "x̄, ȳ", def: "means of the two lists" },
      { sym: "Σ", def: "sum over all paired points" },
    ],
    diagram: <CorrFormulaDiagram />,
    example: {
      given: "n = 5 study hours vs. scores",
      substitute: "Σ products = 58, Σdx² = 10, Σdy² = 338",
      answer: "r = 58/√3380 ≈ 0.998",
    },
  },
  {
    key: "strength",
    title: "3. Reading the strength",
    explain:
      "A common rule of thumb: |r| ≥ 0.9 very strong, 0.7–0.9 strong, 0.5–0.7 moderate, 0.3–0.5 weak, below 0.3 negligible. The sign is direction — an r of −0.95 is exactly as tight as +0.95.",
    formula: <>|r| = strength · sign = direction</>,
    diagram: <CorrStrengthDiagram />,
    example: {
      given: "r = 0.72",
      substitute: "|0.72| ∈ [0.7, 0.9]",
      answer: "strong positive correlation",
    },
  },
  {
    key: "causation",
    title: "4. Correlation is not causation",
    explain:
      "A strong r means two variables move together. It does not prove one causes the other — a hidden third variable, or pure coincidence, can produce the same pattern. Always ask what mechanism could plausibly connect them.",
    formula: <>A↔B may hide C→A, C→B</>,
    diagram: <CorrCausationDiagram />,
    example: {
      given: "ice cream sales and drownings",
      substitute: "both driven by hot weather",
      answer: "high r, no causal link",
    },
  },
];

/* ---------------- Page ---------------- */


function CorrelationPage() {
  const [xInput, setXInput] = useState("1, 2, 3, 4, 5, 6, 7, 8");
  const [yInput, setYInput] = useState("2, 3, 5, 4, 6, 8, 7, 9");
  const [result, setResult] = useState<CorrResult | null>(null);
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
    if (px.values.length === 0 || py.values.length === 0)
      return setErr("Enter numbers in both X and Y lists.");
    if (px.values.length !== py.values.length)
      return setErr(
        `X and Y must have the same number of values — got ${px.values.length} X and ${py.values.length} Y.`,
      );
    const res = computeCorrelation(px.values, py.values);
    if ("error" in res) return setErr(res.error);
    setResult(res);
    const cleaned = px.cleaned + py.cleaned;
    if (cleaned > 0) {
      setNotice(
        `Cleaned ${cleaned} value${cleaned === 1 ? "" : "s"} — stripped currency symbols, thousand separators or stray punctuation.`,
      );
    }
  };

  const clear = () => {
    setXInput("");
    setYInput("");
    setResult(null);
    setErr(null);
    setNotice(null);
  };

  const interpretation = result ? interpretR(result.r) : null;

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const show = Math.min(result.n, 6);
    return [
      {
        title: "Given",
        body: (
          <>
            <MathNote>Paired X and Y values (n = {result.n})</MathNote>
            <MathLine>X: {result.xs.slice(0, 10).map(fmt).join(", ")}{result.n > 10 ? "…" : ""}</MathLine>
            <MathLine>Y: {result.ys.slice(0, 10).map(fmt).join(", ")}{result.n > 10 ? "…" : ""}</MathLine>
          </>
        ),
      },
      {
        title: "Compute the means",
        body: (
          <>
            <MathNote>Average each list to get x̄ and ȳ</MathNote>
            <MathLine>x̄ = (Σ xᵢ) / n = {fmt(result.meanX)}</MathLine>
            <MathLine>ȳ = (Σ yᵢ) / n = {fmt(result.meanY)}</MathLine>
          </>
        ),
      },
      {
        title: "Find Σ(xᵢ − x̄)(yᵢ − ȳ)",
        body: (
          <>
            <MathNote>Multiply each pair of deviations, then add them up</MathNote>
            {Array.from({ length: show }).map((_, i) => (
              <MathLine key={i}>
                ({fmt(result.dxs[i])})({fmt(result.dys[i])}) = {fmt(result.products[i])}
              </MathLine>
            ))}
            {result.n > show && <MathNote>…{result.n - show} more row(s)</MathNote>}
            <MathLine>Σ(xᵢ − x̄)(yᵢ − ȳ) = {fmt(result.sumProducts)}</MathLine>
          </>
        ),
      },
      {
        title: "Find Σ(xᵢ − x̄)²",
        body: (
          <>
            <MathNote>Square each x-deviation and sum</MathNote>
            <MathLine>Σ(xᵢ − x̄)² = {fmt(result.sumDx2)}</MathLine>
          </>
        ),
      },
      {
        title: "Find Σ(yᵢ − ȳ)²",
        body: (
          <>
            <MathNote>Square each y-deviation and sum</MathNote>
            <MathLine>Σ(yᵢ − ȳ)² = {fmt(result.sumDy2)}</MathLine>
          </>
        ),
      },
      {
        title: "Compute Pearson's r",
        body: (
          <>
            <MathNote>Divide the sum of co-deviations by the square root of the product of the squared sums</MathNote>
            <MathLine>r = Σ(x−x̄)(y−ȳ) / √( Σ(x−x̄)² · Σ(y−ȳ)² )</MathLine>
            <MathLine>r = {fmt(result.sumProducts)} / √({fmt(result.sumDx2)} × {fmt(result.sumDy2)})</MathLine>
            <MathLine>r = {fmt(result.r)}</MathLine>
            <MathNote>Best-fit line: ŷ = {fmt(result.slope)}·x + {fmt(result.intercept)}</MathNote>
          </>
        ),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result || !interpretation) return "";
    return [
      `Pearson correlation coefficient r = ${fmt(result.r)}`,
      `Interpretation: ${interpretation.label}`,
      `N = ${result.n}`,
      `Mean X = ${fmt(result.meanX)}, Mean Y = ${fmt(result.meanY)}`,
      `Σ(x−x̄)(y−ȳ) = ${fmt(result.sumProducts)}`,
      `Σ(x−x̄)² = ${fmt(result.sumDx2)}`,
      `Σ(y−ȳ)² = ${fmt(result.sumDy2)}`,
      `Best-fit line: y = ${fmt(result.slope)}·x + ${fmt(result.intercept)}`,
    ].join("\n");
  }, [result, interpretation]);

  return (
    <MathCalcPage
      name="Correlation Coefficient Calculator"
      tagline="Enter two paired data sets (X and Y) and get Pearson's r, the plain-language strength of the relationship, and a scatter plot with a best-fit trend line."
      extras={
        <>
          <CalcSection title="Correlation explained, step by step">
            <p className="text-sm text-muted-foreground">
              Each concept below has a plain-English definition, its formula, a small diagram and a worked example — all in one card so you never have to jump between sections to piece it together.
            </p>
            <GuideCards items={CORR_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Pearson's correlation coefficient r computed from two paired data lists",
                "Plain-language classification — very strong / strong / moderate / weak positive or negative",
                "Scatter plot of every (x, y) point with a dashed least-squares best-fit line",
                "Full step-by-step working: means, deviations, products, sums and the formula",
                "Best-fit line equation y = m·x + b returned alongside r",
                "Handles negative numbers, decimals, and messy pasted data (currency symbols, thousand separators)",
                "Copy the result summary or download the whole panel — plot and steps — as an image",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What does r = 0 mean?", a: <p>No linear relationship in your data. There could still be a strong non-linear one (like a U-shape) that Pearson's r cannot see.</p> },
                { q: "Does a strong correlation prove causation?", a: <p>No. r measures how tightly two variables move together, not why. A third variable, or coincidence, can produce a strong correlation without any causal link.</p> },
                { q: "What's the difference between r and r²?", a: <p>r is the correlation coefficient (direction + strength, −1 to +1). r² is the coefficient of determination — the share of Y's variance explained by X, from 0 to 1.</p> },
                { q: "Can the X and Y lists have different lengths?", a: <p>No — each observation contributes one x and one y. Different lengths means at least one point has no partner, so r is not defined.</p> },
                { q: "What if all my X values are the same?", a: <p>Then there is no variation in X to correlate with Y, and r is undefined. The calculator will show a clear error in that case.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
                { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
                { to: "/calculators/math/mean-median-mode-calculator", label: "Mean, Median, Mode Calculator" },
                { to: "/calculators/math/slope-intercept-calculator", label: "Slope-Intercept Form Calculator" },
                { to: "/calculators/math/spearman-correlation-calculator", label: "Spearman's Rank Correlation Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }

    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="X values (comma or space separated)" htmlFor="xdata" hint="e.g. 1, 2, 3, 4, 5, 6, 7, 8">
            <textarea
              id="xdata"
              value={xInput}
              onChange={(e) => setXInput(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="1, 2, 3, 4, 5, 6, 7, 8"
            />
          </Field>
          <Field label="Y values (paired with X, same count)" htmlFor="ydata" hint="e.g. 2, 3, 5, 4, 6, 8, 7, 9">
            <textarea
              id="ydata"
              value={yInput}
              onChange={(e) => setYInput(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="2, 3, 5, 4, 6, 8, 7, 9"
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
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
        <div className="mt-2 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
          {notice}
        </div>
      )}

      {result && interpretation && (
        <div className="mt-6 space-y-4">
          <ResultActions
            filename="correlation-coefficient-result"
            captureRef={resultRef}
            getCopyText={() => summary}
          />
          <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Pearson correlation coefficient"
              value={<>r = {fmt(result.r)}</>}
              note={
                <>
                  <div>{interpretation.label}</div>
                  <div className="mt-1 text-xs">
                    Best-fit line: y = {fmt(result.slope)}·x + {fmt(result.intercept)} · n = {result.n}
                  </div>
                </>
              }
            />

            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-2 text-sm font-semibold text-foreground">Scatter plot with best-fit line</div>
              <ScatterPlot xs={result.xs} ys={result.ys} slope={result.slope} intercept={result.intercept} />
              <div className="mt-2 text-xs text-muted-foreground">
                Dashed line is the least-squares regression y = m·x + b. Tightness around the line reflects |r|.
              </div>
            </div>

            <StepsToggle steps={steps} />
          </div>
        </div>
      )}
    </MathCalcPage>
  );
}
