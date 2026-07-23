import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  PrimaryButton,
  ResultBox,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";


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

export const Route = createFileRoute("/calculators/math/weighted-mean-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Weighted Mean Calculator",
      title: "Weighted Mean Calculator — Weighted Average with Steps",
      metaDescription:
        "Enter value/weight pairs to compute the weighted mean = Σ(value × weight) / Σ(weight). See each product, the totals and the simple mean for comparison.",
      canonicalUrl: "/calculators/math/weighted-mean-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Weighted Mean Calculator", path: "/calculators/math/weighted-mean-calculator" },
      ],
      faqs: [
        {
          q: "When should I use a weighted mean instead of a simple average?",
          a: "Use a weighted mean whenever your values don't count equally — course grades where the final exam is worth more than a quiz, portfolio returns where holdings differ in size, product ratings where some reviews carry more trust, or survey results where certain groups are under-sampled. If every value should count the same, a simple average is correct.",
        },
        {
          q: "What happens if all the weights are equal?",
          a: "The weighted mean collapses to the ordinary arithmetic mean. Algebraically, if every wᵢ = w then Σ(xᵢ·w) / Σ(w) = w·Σxᵢ / (n·w) = Σxᵢ / n. That's why a simple average is a special case of a weighted average.",
        },
        {
          q: "Do the weights have to add up to 1 (or 100%)?",
          a: "No. The formula divides by Σw, so any scale works — raw counts, percentages, dollar amounts. Weights that already sum to 1 or 100 just make the arithmetic cleaner, but 1, 2 and 3 give the same weighted mean as 10%, 20% and 30%.",
        },
      ],
    }),
  component: WeightedMeanPage,
});

// ---------------- Math ----------------

function fmt(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e10)) return v.toExponential(6);
  return Number(v.toPrecision(10)).toString();
}

interface Row {
  id: number;
  value: string;
  weight: string;
}

interface Result {
  weightedMean: number;
  simpleMean: number;
  sumProducts: number;
  sumWeights: number;
  pairs: { value: number; weight: number; product: number; share: number }[];
  steps: Step[];
}

function compute(pairs: { value: number; weight: number }[]): Result {
  const enriched = pairs.map((p) => ({
    value: p.value,
    weight: p.weight,
    product: p.value * p.weight,
    share: 0,
  }));
  const sumProducts = enriched.reduce((s, p) => s + p.product, 0);
  const sumWeights = enriched.reduce((s, p) => s + p.weight, 0);
  const sumValues = enriched.reduce((s, p) => s + p.value, 0);
  const weightedMean = sumProducts / sumWeights;
  const simpleMean = sumValues / enriched.length;
  for (const p of enriched) p.share = p.weight / sumWeights;

  const steps: Step[] = [
    {
      title: "Set up the weighted mean formula",
      body: (
        <>
          <MathNote>The weighted mean multiplies each value by its weight, sums those products, then divides by the sum of the weights</MathNote>
          <MathLine>x̄<sub>w</sub> = Σ(wᵢ·xᵢ) / Σ wᵢ</MathLine>
        </>
      ),
    },
    {
      title: "Multiply each value by its weight",
      body: (
        <>
          <MathNote>Compute wᵢ·xᵢ for every row</MathNote>
          {enriched.map((p, i) => (
            <MathLine key={i}>
              {fmt(p.weight)} × {fmt(p.value)} = {fmt(p.product)}
            </MathLine>
          ))}
        </>
      ),
    },
    {
      title: "Sum the products (Σ(wᵢ·xᵢ))",
      body: (
        <>
          <MathNote>Add up every wᵢ·xᵢ value</MathNote>
          <MathLine>Σ(wᵢ·xᵢ) = {enriched.map((p) => fmt(p.product)).join(" + ")}</MathLine>
          <MathLine>Σ(wᵢ·xᵢ) = {fmt(sumProducts)}</MathLine>
        </>
      ),
    },
    {
      title: "Sum the weights (Σ wᵢ)",
      body: (
        <>
          <MathNote>Add up every weight</MathNote>
          <MathLine>Σ wᵢ = {enriched.map((p) => fmt(p.weight)).join(" + ")}</MathLine>
          <MathLine>Σ wᵢ = {fmt(sumWeights)}</MathLine>
        </>
      ),
    },
    {
      title: "Divide to get the weighted mean",
      body: (
        <>
          <MathNote>Substitute the two totals into the formula</MathNote>
          <MathLine>x̄<sub>w</sub> = {fmt(sumProducts)} / {fmt(sumWeights)}</MathLine>
          <MathLine>x̄<sub>w</sub> = {fmt(weightedMean)}</MathLine>
        </>
      ),
    },
    {
      title: "Compare with the simple (unweighted) mean",
      body: (
        <>
          <MathNote>Ignoring the weights, the plain average of the values is</MathNote>
          <MathLine>x̄ = ({enriched.map((p) => fmt(p.value)).join(" + ")}) / {enriched.length}</MathLine>
          <MathLine>x̄ = {fmt(simpleMean)}</MathLine>
        </>
      ),
    },
  ];

  return {
    weightedMean,
    simpleMean,
    sumProducts,
    sumWeights,
    pairs: enriched,
    steps,
  };
}

// ---------------- Diagram: weight share bar + contribution bars ----------------

function ContributionDiagram({ result }: { result: Result }) {
  const palette = [
    "var(--color-primary)",
    "#f59e0b",
    "#10b981",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f43f5e",
    "#84cc16",
    "#eab308",
    "#6366f1",
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">
        Where each weight lands
      </div>

      {/* Stacked weight-share bar */}
      <div className="mb-2 text-xs text-muted-foreground">
        Weight share (each block's width = wᵢ / Σw)
      </div>
      <div className="flex h-8 w-full overflow-hidden rounded-lg border border-border/60">
        {result.pairs.map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-[10px] font-medium text-white"
            style={{
              width: `${p.share * 100}%`,
              background: palette[i % palette.length],
            }}
            title={`Row ${i + 1}: weight ${fmt(p.weight)} → ${(p.share * 100).toFixed(1)}%`}
          >
            {p.share >= 0.08 ? `${(p.share * 100).toFixed(0)}%` : ""}
          </div>
        ))}
      </div>

      {/* Row-by-row breakdown */}
      <div className="mt-4 space-y-2">
        {result.pairs.map((p, i) => {
          const contrib = p.product / result.sumProducts;
          return (
            <div key={i} className="text-xs">
              <div className="mb-0.5 flex items-center justify-between text-muted-foreground">
                <span>
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                    style={{ background: palette[i % palette.length] }}
                  />
                  Row {i + 1}: value {fmt(p.value)}, weight {fmt(p.weight)}
                </span>
                <span className="font-serif italic">
                  contributes {fmt(p.product)} ({(contrib * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-background/40">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.max(0, Math.min(1, contrib)) * 100}%`,
                    background: palette[i % palette.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        The weighted mean sits closer to values with fatter blocks above. When
        the two means differ, it's because the biggest weights are pulling in
        one direction.
      </p>
    </div>
  );
}


function WeightedMeanBarChart({ result }: { result: Result }) {
  const w = 640, h = 220, pad = 36;
  const maxW = Math.max(...result.pairs.map((p) => p.weight), 1);
  const maxV = Math.max(...result.pairs.map((p) => p.value), result.weightedMean, 1);
  const minV = Math.min(...result.pairs.map((p) => p.value), result.weightedMean, 0);
  const n = result.pairs.length;
  const barSlot = (w - pad * 2) / n;
  const barW = Math.min(48, barSlot * 0.6);
  const chartTop = 20, chartBottom = h - 30;
  const valueToY = (v: number) =>
    chartBottom - ((v - minV) / (maxV - minV || 1)) * (chartBottom - chartTop);
  const meanY = valueToY(result.weightedMean);
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-sm font-medium text-foreground">
        Bar height = value, bar width = weight share, line = weighted mean
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[480px]" role="img" aria-label="Weighted mean bar chart">
        <line x1={pad} y1={chartBottom} x2={w - pad} y2={chartBottom} stroke="currentColor" className="text-border" strokeWidth={1} />
        {result.pairs.map((p, i) => {
          const slotX = pad + i * barSlot + (barSlot - barW) / 2;
          const widthFactor = 0.5 + (p.weight / maxW) * 0.5;
          const barWidth = barW * widthFactor;
          const y = valueToY(p.value);
          const x = pad + i * barSlot + (barSlot - barWidth) / 2;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={chartBottom - y}
                fill="currentColor"
                className="text-primary"
                opacity={0.55 + 0.4 * (p.weight / maxW)}
                rx={3}
              >
                <title>{`value ${fmt(p.value)}, weight ${fmt(p.weight)}`}</title>
              </rect>
              <text x={x + barWidth / 2} y={chartBottom + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {fmt(p.value)}
              </text>
            </g>
          );
        })}
        {/* weighted mean line */}
        <line x1={pad} y1={meanY} x2={w - pad} y2={meanY} stroke="currentColor" className="text-foreground" strokeWidth={2} strokeDasharray="6 4" />
        <text x={w - pad} y={meanY - 6} textAnchor="end" className="fill-foreground text-[11px] font-medium">
          weighted mean = {fmt(result.weightedMean)}
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Concept diagrams (guide cards) ---------------- */

function WMFormulaDiagram() {
  // Three bars: value height, width = weight; dashed line = weighted mean
  const bars = [
    { v: 85, w: 20 },
    { v: 78, w: 30 },
    { v: 92, w: 50 },
  ];
  const totalW = bars.reduce((s, b) => s + b.w, 0);
  const wm =
    bars.reduce((s, b) => s + b.v * b.w, 0) / totalW; // 86.4
  const W = 320, H = 170, padL = 24, padR = 16, padT = 20, padB = 30;
  const iw = W - padL - padR, ih = H - padT - padB;
  const maxV = 100;
  const valueToY = (v: number) => padT + ih - (v / maxV) * ih;
  let cursor = padL;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weighted mean bar diagram">
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--color-border)" />
      {bars.map((b, i) => {
        const barW = (b.w / totalW) * iw;
        const y = valueToY(b.v);
        const el = (
          <g key={i}>
            <rect x={cursor} y={y} width={barW - 2} height={H - padB - y} rx={3}
              fill="var(--color-primary)" opacity={0.55 + 0.35 * (b.w / totalW)} />
            <text x={cursor + barW / 2} y={y - 4} textAnchor="middle" fontSize={10} fill="var(--color-foreground)">{b.v}</text>
            <text x={cursor + barW / 2} y={H - padB + 14} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">w={b.w}</text>
          </g>
        );
        cursor += barW;
        return el;
      })}
      <line x1={padL} y1={valueToY(wm)} x2={W - padR} y2={valueToY(wm)}
        stroke="var(--color-foreground)" strokeWidth={1.5} strokeDasharray="5 3" />
      <text x={W - padR} y={valueToY(wm) - 4} textAnchor="end" fontSize={11}
        fill="var(--color-foreground)" fontWeight={600}>weighted mean = {wm.toFixed(1)}</text>
    </svg>
  );
}

function WeightShareDiagram() {
  // Stacked share bar for weights 20/30/50 → 20%/30%/50%
  const parts = [
    { w: 20, color: "var(--color-primary)" },
    { w: 30, color: "#10b981" },
    { w: 50, color: "#f59e0b" },
  ];
  const total = 100;
  const W = 320, H = 130;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weight share bar">
      <text x={W / 2} y={20} textAnchor="middle" fontSize={11} fill="var(--color-muted-foreground)">
        each block's width = wᵢ / Σw
      </text>
      {(() => {
        let x = 20;
        const barW = W - 40;
        return parts.map((p, i) => {
          const w = (p.w / total) * barW;
          const el = (
            <g key={i}>
              <rect x={x} y={40} width={w} height={40} fill={p.color} opacity={0.85} />
              <text x={x + w / 2} y={65} textAnchor="middle" fontSize={12} fill="white" fontWeight={600}>
                {p.w}%
              </text>
            </g>
          );
          x += w;
          return el;
        });
      })()}
      <text x={W / 2} y={110} textAnchor="middle" fontSize={11} fill="var(--color-foreground)">
        Σw = 20 + 30 + 50 = 100
      </text>
    </svg>
  );
}

function EqualWeightsDiagram() {
  const values = [4, 6, 8];
  const W = 320, H = 140, padL = 24, padR = 24, padB = 30, padT = 20;
  const iw = W - padL - padR, ih = H - padT - padB;
  const bw = iw / values.length - 10;
  const mean = 6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Equal weights collapse to simple mean">
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--color-border)" />
      {values.map((v, i) => {
        const x = padL + i * (bw + 10) + 5;
        const y = H - padB - (v / 10) * ih;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={H - padB - y} rx={4} fill="var(--color-primary)" opacity={0.75} />
            <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize={10} fill="var(--color-foreground)">{v}</text>
            <text x={x + bw / 2} y={H - padB + 14} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">w = 1</text>
          </g>
        );
      })}
      <line x1={padL} y1={H - padB - (mean / 10) * ih} x2={W - padR} y2={H - padB - (mean / 10) * ih}
        stroke="var(--color-foreground)" strokeWidth={1.5} strokeDasharray="5 3" />
      <text x={W - padR} y={H - padB - (mean / 10) * ih - 4} textAnchor="end" fontSize={11}
        fontWeight={600} fill="var(--color-foreground)">mean = 6</text>
    </svg>
  );
}

/* ---------------- Guide ---------------- */

interface WMGuideItem {
  key: string;
  title: string;
  explain: ReactNode;
  formula: ReactNode;
  legend: { sym: ReactNode; def: ReactNode }[];
  diagram: ReactNode;
  example: { given: ReactNode; substitute: ReactNode; answer: ReactNode };
}

const WM_GUIDE: WMGuideItem[] = [
  {
    key: "formula",
    title: "The weighted mean formula",
    explain:
      "Multiply each value by its weight, add those products up, then divide by the sum of the weights. Values with bigger weights pull the answer toward themselves — which is exactly what you want when some numbers matter more than others.",
    formula: <>x̄<sub>w</sub> = Σ (xᵢ · wᵢ) / Σ wᵢ</>,
    legend: [
      { sym: "x̄w", def: "weighted mean" },
      { sym: "xᵢ", def: "each value" },
      { sym: "wᵢ", def: "the weight for that value" },
      { sym: "Σ", def: "sum over every row" },
    ],
    diagram: <WMFormulaDiagram />,
    example: {
      given: "grades 85 (w = 20), 78 (w = 30), 92 (w = 50)",
      substitute: "(85·20 + 78·30 + 92·50) / (20 + 30 + 50) = 8640 / 100",
      answer: "x̄w = 86.4",
    },
  },
  {
    key: "share",
    title: "Weight share (why raw numbers still work)",
    explain:
      "You don't have to convert your weights into percentages first. The Σw in the denominator normalises them for you, so weights of 20/30/50 give the exact same answer as 20%/30%/50% or 2/3/5. The picture below shows how each weight becomes a share of the whole.",
    formula: <>share of row i = wᵢ / Σ wᵢ</>,
    legend: [
      { sym: "wᵢ", def: "weight for row i" },
      { sym: "Σ wᵢ", def: "sum of all weights" },
    ],
    diagram: <WeightShareDiagram />,
    example: {
      given: "weights 20, 30, 50",
      substitute: "shares = 20/100, 30/100, 50/100",
      answer: "20%, 30%, 50%",
    },
  },
  {
    key: "equal",
    title: "When all weights are equal",
    explain:
      "If every weight is the same, the weights cancel out and the weighted mean collapses to the plain arithmetic mean. That's why the simple average is really a special case of the weighted average — the case where every value is equally important.",
    formula: <>if all wᵢ = w then x̄<sub>w</sub> = Σ xᵢ / N</>,
    legend: [
      { sym: "w", def: "the common weight" },
      { sym: "N", def: "number of values" },
    ],
    diagram: <EqualWeightsDiagram />,
    example: {
      given: "values 4, 6, 8 with equal weights",
      substitute: "(4 + 6 + 8) / 3",
      answer: "x̄w = 6 (same as simple mean)",
    },
  },
];

// ---------------- Page ----------------

let nextId = 4;

function WeightedMeanPage() {
  const [rows, setRows] = useState<Row[]>([
    { id: 1, value: "85", weight: "20" },
    { id: 2, value: "78", weight: "30" },
    { id: 3, value: "92", weight: "50" },
  ]);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const updateRow = (id: number, field: "value" | "weight", v: string) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: v } : r)));
  };

  const addRow = () => {
    setRows((rs) => [...rs, { id: nextId++, value: "", weight: "" }]);
  };

  const removeRow = (id: number) => {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  };

  const onCalc = () => {
    setErr(null);
    setResult(null);
    const filled = rows.filter(
      (r) => r.value.trim() !== "" || r.weight.trim() !== "",
    );
    if (filled.length < 2) {
      setErr("Enter at least two value/weight pairs.");
      return;
    }
    const parsed: { value: number; weight: number }[] = [];
    for (let i = 0; i < filled.length; i++) {
      const r = filled[i];
      const v = Number(r.value);
      const w = Number(r.weight);
      if (!Number.isFinite(v) || !Number.isFinite(w)) {
        setErr(`Row ${i + 1}: both value and weight must be numbers.`);
        return;
      }
      if (w < 0) {
        setErr(`Row ${i + 1}: weights must be zero or positive.`);
        return;
      }
      parsed.push({ value: v, weight: w });
    }
    const sumW = parsed.reduce((s, p) => s + p.weight, 0);
    if (sumW === 0) {
      setErr("At least one weight must be greater than zero.");
      return;
    }
    setResult(compute(parsed));
  };

  const resultDisplay: ReactNode = result ? (
    <span className="font-serif italic">{fmt(result.weightedMean)}</span>
  ) : null;

  return (
    <MathCalcPage
      name="Weighted Mean Calculator"
      tagline="Add as many value/weight pairs as you need — the calculator returns the weighted mean, contrasts it with the simple average, shows every product in the sum, and draws a bar of each weight's share."
      extras={
        <>
          <CalcSection title="What is a weighted mean?">
            <p>
              A weighted mean is an average where each value carries an
              <em> importance</em> — a weight — instead of every value counting
              equally. The classic classroom setting is course grades:
              assignments, quizzes and the final exam are usually worth
              different percentages of the overall grade. If you take the
              plain average of your scores you get the wrong answer, because
              the 40%-weighted final exam should influence your grade far more
              than a 5%-weighted homework.
            </p>
            <p>
              Formally, given values x₁, x₂, …, xₙ with matching weights w₁,
              w₂, …, wₙ, the weighted mean is the sum of value × weight,
              divided by the sum of the weights. The next section walks through
              exactly what that formula does, with a diagram and worked example
              for every idea.
            </p>
          </CalcSection>

          <CalcSection title="Weighted mean explained, idea by idea">
            <p className="text-sm text-muted-foreground">
              Each card below pairs a plain-English definition with the
              formula (and what every symbol means), a small diagram, and a
              worked example — so you can see the concept and the arithmetic
              side by side.
            </p>
            <div className="mt-4 space-y-5">
              {WM_GUIDE.map((g) => (
                <div
                  key={g.key}
                  className="rounded-2xl border border-border/60 bg-background/40 p-4 sm:p-5"
                >
                  <h3 className="mb-3 font-display text-lg font-semibold text-foreground">
                    {g.title}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 text-foreground md:col-start-1 md:row-span-2 md:row-start-1">
                      <p className="text-[15px] leading-relaxed">{g.explain}</p>
                      <FormulaWithLegend formula={g.formula} legend={g.legend} />
                    </div>
                    <div className="md:col-start-2 md:row-start-1">
                      {g.diagram}
                    </div>
                    <div className="md:col-start-2 md:row-start-2">
                      <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Example
                        </div>
                        <div className="space-y-1 text-foreground">
                          <div><span className="text-muted-foreground">Given: </span>{g.example.given}</div>
                          <div className="font-serif italic text-[13px]"><span className="font-sans text-muted-foreground">Substitute: </span>{g.example.substitute}</div>
                          <div>
                            <span className="text-muted-foreground">Answer: </span>
                            <span className="font-display font-semibold tabular-nums">{g.example.answer}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CalcSection>


          <CalcSection title="Common places weighted means show up">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Grades and GPA</strong> — assignments carry different
                percentages, courses carry different credit hours.
              </li>
              <li>
                <strong>Portfolio returns</strong> — a 5% gain on a small
                holding should not count the same as a 5% gain on a huge one.
              </li>
              <li>
                <strong>Product ratings</strong> — a 4.5-star rating from 200
                reviews is more trustworthy than 5.0 from 3 reviews; sites
                weight by review count.
              </li>
              <li>
                <strong>Survey data</strong> — respondents from
                under-represented groups get up-weighted so the sample matches
                the target population.
              </li>
              <li>
                <strong>Inventory costing</strong> — weighted-average cost
                methods value stock using the total cost divided by total
                units received.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Dynamic row list — add or remove value/weight pairs as your dataset grows",
                "Shows both the weighted mean and the plain arithmetic mean so you can see the impact of the weights",
                "Show/hide step-by-step working — every value × weight product, both totals, and the final division",
                "Weight-share bar plus per-row contribution bars — spot which entries dominate the average",
                "Bar chart with height = value and width = weight, and a dashed line marking the weighted mean",
                "Weights work at any scale (raw counts, percentages, dollars, hours) — the formula normalises internally",
                "Guards against empty inputs and all-zero weights, which would divide by zero",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "How is a weighted mean different from a simple average?",
                  a: (
                    <p>
                      A simple (arithmetic) mean divides the sum by the count,
                      treating every value equally. A weighted mean divides
                      the sum of (value × weight) by the sum of weights, so
                      values with larger weights pull the answer more than
                      values with smaller weights.
                    </p>
                  ),
                },
                {
                  q: "What if all the weights are equal?",
                  a: (
                    <p>
                      Then the weighted mean equals the simple mean exactly.
                      That's why the simple average is really a special case
                      of the weighted average — the case where every value is
                      equally important.
                    </p>
                  ),
                },
                {
                  q: "Can weights be zero?",
                  a: (
                    <p>
                      Yes. A weight of zero effectively drops that value from
                      the calculation. What can't happen is <em>every</em>{" "}
                      weight being zero — that would divide by zero. The
                      calculator flags this case.
                    </p>
                  ),
                },
                {
                  q: "Can weights be negative?",
                  a: (
                    <p>
                      In this calculator, no — negative weights don't have a
                      natural "importance" interpretation and can flip the
                      answer in unexpected ways. If you're doing something
                      like a hedge fund short position where a negative weight
                      makes sense, model it as a positive weight on a
                      sign-flipped value.
                    </p>
                  ),
                },
                {
                  q: "Do the weights need to sum to 1 or 100%?",
                  a: (
                    <p>
                      No. Any positive scale works — 1/2/3, 10/20/30, or
                      dollar amounts. The Σw denominator normalises them for
                      you. Sums of 1 or 100 just make each weight feel like a
                      share, which is easier to read at a glance.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/percentage-calculator", label: "Percentage Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2 px-1 text-xs uppercase tracking-wide text-muted-foreground">
            <div>Value</div>
            <div>Weight</div>
            <div className="w-9" />
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div
                key={r.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"
              >
                <input
                  aria-label={`Row ${i + 1} value`}
                  value={r.value}
                  onChange={(e) => updateRow(r.id, "value", e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-xl border border-border/60 bg-secondary/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                <input
                  aria-label={`Row ${i + 1} weight`}
                  value={r.weight}
                  onChange={(e) => updateRow(r.id, "weight", e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-xl border border-border/60 bg-secondary/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  disabled={rows.length <= 1}
                  aria-label={`Remove row ${i + 1}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-primary/60 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addRow}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-secondary/20 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/60"
          >
            <Plus className="h-4 w-4" /> Add row
          </button>
        </div>

        <PrimaryButton onClick={onCalc}>Calculate weighted mean</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <>
          <ResultBox
            label="Weighted mean"
            value={resultDisplay}
            note={
              `Simple (unweighted) mean = ${fmt(result.simpleMean)}. ` +
              (Math.abs(result.weightedMean - result.simpleMean) < 1e-9
                ? "The two match because every weight is effectively equal."
                : result.weightedMean > result.simpleMean
                ? "Larger weights are sitting on the larger values, pulling the weighted mean above the simple mean."
                : "Larger weights are sitting on the smaller values, pulling the weighted mean below the simple mean.")
            }
          />
          <WeightedMeanBarChart result={result} />
          <ContributionDiagram result={result} />
          <StepsToggle steps={result.steps} />
        </>
      )}
    </MathCalcPage>
  );
}
