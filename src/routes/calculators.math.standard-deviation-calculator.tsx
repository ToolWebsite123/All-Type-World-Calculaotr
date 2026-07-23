import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { SendDatasetActions } from "@/components/SendDatasetActions";
import { consumeDataset } from "@/lib/dataset-handoff";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  PrimaryButton,
  ResultBox,
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
import { ReferenceTable } from "@/components/ReferenceTable";
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
import type { Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import {
  GroupedTable,
  ModeToggle,
  expandGroupedRows,
  type GroupedRow,
  type InputMode,
} from "@/components/GroupedDataInput";

export const Route = createFileRoute("/calculators/math/standard-deviation-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Standard Deviation Calculator",
      title:
        "Standard Deviation Calculator — Sample & Population",
      metaDescription:
        "Compute sample or population SD with variance, mean, sum of squares, and full step-by-step working.",
      canonicalUrl: "/calculators/math/standard-deviation-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Standard Deviation Calculator",
          path: "/calculators/math/standard-deviation-calculator",
        },
      ],
      faqs: [
        {
          q: "What's the difference between population and sample standard deviation?",
          a: "Population standard deviation (σ) divides the sum of squared deviations by N — the total count. Sample standard deviation (s) divides by N − 1 instead. That N − 1 correction (Bessel's correction) exists because a sample's own mean sits a little closer to its data than the true population mean does, which makes the raw squared deviations underestimate the real spread. Dividing by a smaller number nudges the estimate back up.",
        },
        {
          q: "When should I pick population vs sample?",
          a: "Use the population formula when your data is the whole group you care about — every student in a class of 30, every part produced in a batch. Use the sample formula when your data is a subset used to estimate a bigger unseen group — 100 shoppers surveyed out of a city, 20 measurements taken from a production line running all day. When in doubt in research or survey work, sample (N − 1) is the safer default.",
        },
        {
          q: "What counts as a 'high' or 'low' standard deviation?",
          a: "It's always relative to the mean and the units. A standard deviation of 5 is huge for exam scores from 0–10 but tiny for house prices in dollars. The coefficient of variation — standard deviation divided by the mean — is a scale-free way to compare: values below ~15% usually feel tight, above ~30% clearly spread out.",
        },
        {
          q: "What does the margin of error / confidence interval mean?",
          a: "It's an interval around the sample mean that's likely to contain the true population mean. A 95% confidence interval means that if you repeated the sampling many times, about 95% of the intervals you'd build this way would cover the true mean. The margin of error is that interval's half-width, and it shrinks as your sample gets bigger (it scales with 1/√N).",
        },
      ],
    }),
  component: StdDevPage,
});

// ---------------- Math ----------------

type Mode = "population" | "sample";

interface Result {
  values: number[];
  n: number;
  sum: number;
  mean: number;
  variance: number;
  stdev: number;
  sem: number;
  mode: Mode;
  deviations: { x: number; d: number; d2: number }[];
  sumSquares: number;
  freq: { value: number; count: number; pct: number }[];
  steps: Step[];
}

function fmt(v: number, digits = 6): string {
  if (!Number.isFinite(v)) return String(v);
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs < 1e-4 || abs >= 1e10) return v.toExponential(digits);
  return Number(v.toPrecision(digits + 2)).toString();
}

import { parseDataset } from "@/lib/math/parse-numbers";

function parseData(raw: string): { values: number[]; cleaned: number } {
  const { values, cleaned, invalid } = parseDataset(raw);
  if (invalid.length) throw new Error(`"${invalid[0]}" is not a number`);
  return { values, cleaned };
}

function compute(
  values: number[],
  mode: Mode,
  groupedPairs?: { value: number; freq: number }[],
): Result {
  const n = values.length;
  if (n < 2) throw new Error("Enter at least two numbers");
  if (mode === "sample" && n < 2)
    throw new Error("Sample standard deviation needs at least 2 values");

  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const deviations = values.map((x) => {
    const d = x - mean;
    return { x, d, d2: d * d };
  });
  const sumSquares = deviations.reduce((a, b) => a + b.d2, 0);
  const denom = mode === "population" ? n : n - 1;
  const variance = sumSquares / denom;
  const stdev = Math.sqrt(variance);
  const sem = stdev / Math.sqrt(n);

  // Frequency table
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const freq = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([value, count]) => ({
      value,
      count,
      pct: (count / n) * 100,
    }));

  const denomLabel = mode === "population" ? "N" : "N − 1";
  const symbol = mode === "population" ? "σ" : "s";

  const isGrouped = !!groupedPairs && groupedPairs.length > 0;

  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <>
          <MathNote>
            {isGrouped
              ? "Grouped data expanded into individual values"
              : "The data set and its count"}
          </MathNote>
          {isGrouped ? (
            <>
              <MathLine>N = Σf = {n}</MathLine>
              <MathLine>Σ xᵢ = {fmt(sum)}</MathLine>
            </>
          ) : (
            <>
              <MathLine>
                x = {values.slice(0, 25).map(fmt).join(", ")}
                {values.length > 25 ? "…" : ""}
              </MathLine>
              <MathLine>N = {n}</MathLine>
            </>
          )}
        </>
      ),
    },
    {
      title: "Formula",
      body: (
        <>
          <MathNote>Variance divides the summed squared deviations by {denomLabel}</MathNote>
          <MathLine>{symbol}² = Σ(xᵢ − μ)² / {denomLabel}</MathLine>
          <MathLine>{symbol} = √{symbol}²</MathLine>
        </>
      ),
    },
    {
      title: "Compute the mean",
      body: (
        <>
          <MathNote>Add every value, then divide by the count</MathNote>
          <MathLine>μ = Σxᵢ / N</MathLine>
          <MathLine>μ = {fmt(sum)} / {n}</MathLine>
          <MathLine>μ = {fmt(mean)}</MathLine>
        </>
      ),
    },
    {
      title: "Find each deviation (xᵢ − μ)",
      body: (
        <>
          <MathNote>Subtract the mean from every value</MathNote>
          {isGrouped
            ? groupedPairs!.slice(0, 6).map((p, i) => (
                <MathLine key={i}>
                  xᵢ = {fmt(p.value)}: {fmt(p.value)} − {fmt(mean)} = {fmt(p.value - mean)}
                </MathLine>
              ))
            : deviations.slice(0, 6).map((d, i) => (
                <MathLine key={i}>
                  {fmt(d.x)} − {fmt(mean)} = {fmt(d.d)}
                </MathLine>
              ))}
          {(isGrouped ? groupedPairs!.length : deviations.length) > 6 && (
            <MathNote>
              …and {(isGrouped ? groupedPairs!.length : deviations.length) - 6} more terms
            </MathNote>
          )}
        </>
      ),
    },
    {
      title: "Square each deviation",
      body: (
        <>
          <MathNote>Squaring removes the sign so deviations don't cancel out</MathNote>
          {isGrouped
            ? groupedPairs!.slice(0, 6).map((p, i) => {
                const d = p.value - mean;
                const d2 = d * d;
                return (
                  <MathLine key={i}>
                    ({fmt(p.value)} − {fmt(mean)})² × f={p.freq} = {fmt(p.freq * d2)}
                  </MathLine>
                );
              })
            : deviations.slice(0, 6).map((d, i) => (
                <MathLine key={i}>
                  ({fmt(d.x)} − {fmt(mean)})² = {fmt(d.d2)}
                </MathLine>
              ))}
          {(isGrouped ? groupedPairs!.length : deviations.length) > 6 && (
            <MathNote>
              …and {(isGrouped ? groupedPairs!.length : deviations.length) - 6} more terms
            </MathNote>
          )}
        </>
      ),
    },
    {
      title: "Sum the squared deviations",
      body: (
        <>
          <MathNote>Add all the squared deviations together</MathNote>
          <MathLine>Σ(xᵢ − μ)² = {fmt(sumSquares)}</MathLine>
        </>
      ),
    },
    {
      title: `Compute the ${mode === "population" ? "population" : "sample"} variance`,
      body: (
        <>
          <MathNote>Divide the sum of squares by {denomLabel}</MathNote>
          <MathLine>{symbol}² = Σ(xᵢ − μ)² / {denomLabel}</MathLine>
          <MathLine>{symbol}² = {fmt(sumSquares)} / {denom}</MathLine>
          <MathLine>{symbol}² = {fmt(variance)}</MathLine>
        </>
      ),
    },
    {
      title: "Take the square root for standard deviation",
      body: (
        <>
          <MathNote>Standard deviation is the square root of variance</MathNote>
          <MathLine>{symbol} = √{symbol}²</MathLine>
          <MathLine>{symbol} = √{fmt(variance)}</MathLine>
          <MathLine>{symbol} = {fmt(stdev)}</MathLine>
        </>
      ),
    },
  ];

  return {
    values,
    n,
    sum,
    mean,
    variance,
    stdev,
    sem,
    mode,
    deviations,
    sumSquares,
    freq,
    steps,
  };
}


// Confidence intervals — z multipliers for a normal distribution
const CONFIDENCE_LEVELS: { label: string; z: number }[] = [
  { label: "68.3%", z: 1.0 },
  { label: "90%", z: 1.645 },
  { label: "95%", z: 1.96 },
  { label: "99%", z: 2.576 },
  { label: "99.9%", z: 3.291 },
];

function ErrorBarRow({
  mean,
  moe,
  maxMoe,
}: {
  mean: number;
  moe: number;
  maxMoe: number;
}) {
  // Draw a horizontal bar; the widest interval fills the box, others scale down.
  const centerPct = 50;
  const halfWidthPct = maxMoe > 0 ? (moe / maxMoe) * 48 : 0;
  const left = centerPct - halfWidthPct;
  const right = centerPct + halfWidthPct;
  return (
    <div className="relative h-6 w-full min-w-[140px] rounded-md bg-secondary/40">
      {/* interval bar */}
      <div
        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-sm bg-primary/40"
        style={{ left: `${left}%`, width: `${right - left}%` }}
        aria-hidden
      />
      {/* whiskers */}
      <div
        className="absolute top-1/2 h-4 w-[2px] -translate-y-1/2 bg-primary"
        style={{ left: `${left}%` }}
        aria-hidden
      />
      <div
        className="absolute top-1/2 h-4 w-[2px] -translate-y-1/2 bg-primary"
        style={{ left: `${right}%` }}
        aria-hidden
      />
      {/* mean marker */}
      <div
        className="absolute top-1/2 h-5 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-foreground"
        style={{ left: `${centerPct}%` }}
        aria-hidden
        title={`mean = ${mean}`}
      />
    </div>
  );
}


function StdDevPlot({ result }: { result: Result }) {
  const { values, mean, stdev } = result;
  const w = 640, h = 200, pad = 32;
  const lo = Math.min(mean - 3 * stdev, ...values);
  const hi = Math.max(mean + 3 * stdev, ...values);
  const span = hi - lo || 1;
  const x = (v: number) => pad + ((v - lo) / span) * (w - pad * 2);
  const bands = [
    { k: 2, opacity: 0.06 },
    { k: 1, opacity: 0.12 },
  ];
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-sm font-medium text-foreground">
        Data points relative to the mean (±1σ, ±2σ bands)
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[480px]" role="img" aria-label="Standard deviation plot">
        {bands.map((b) => {
          const x1 = x(mean - b.k * stdev);
          const x2 = x(mean + b.k * stdev);
          return (
            <rect
              key={b.k}
              x={x1}
              y={20}
              width={Math.max(0, x2 - x1)}
              height={h - 60}
              fill="currentColor"
              className="text-primary"
              opacity={b.opacity}
            />
          );
        })}
        {/* axis */}
        <line x1={pad} y1={h - 40} x2={w - pad} y2={h - 40} stroke="currentColor" className="text-border" strokeWidth={1} />
        {/* mean line */}
        <line x1={x(mean)} y1={20} x2={x(mean)} y2={h - 40} stroke="currentColor" className="text-foreground" strokeWidth={2} />
        <text x={x(mean)} y={14} textAnchor="middle" className="fill-foreground text-[10px]">
          mean
        </text>
        {/* data points as dots (jittered vertically to reduce overlap) */}
        {values.map((v, i) => {
          const jitter = ((i * 37) % 100) / 100;
          const cy = h - 50 - jitter * (h - 90);
          return (
            <circle
              key={i}
              cx={x(v)}
              cy={cy}
              r={4}
              fill="currentColor"
              className="text-primary"
              opacity={0.85}
            >
              <title>{fmt(v)}</title>
            </circle>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{fmt(lo)}</span>
        <span>{fmt(mean)}</span>
        <span>{fmt(hi)}</span>
      </div>
    </div>
  );
}

/* ---------------- Guide diagrams ---------------- */

function DeviationsDiagram() {
  const data = [10, 12, 16, 16, 21, 23, 23, 23];
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const w = 320, h = 140, padL = 20, padR = 20, padT = 20, padB = 30;
  const min = 8, max = 26;
  const xToPx = (v: number) => padL + ((v - min) / (max - min)) * (w - padL - padR);
  const y = h - padB;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Deviations from the mean">
      <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--color-border)" strokeWidth={1.5} />
      <line x1={xToPx(mean)} y1={padT} x2={xToPx(mean)} y2={y} stroke="var(--color-foreground)" strokeDasharray="4 3" />
      {data.map((v, i) => (
        <g key={i}>
          <line x1={xToPx(v)} y1={y - 12 - (i % 4) * 8} x2={xToPx(mean)} y2={y - 12 - (i % 4) * 8}
            stroke="var(--color-primary)" strokeWidth={1.5} opacity={0.6} />
          <circle cx={xToPx(v)} cy={y - 12 - (i % 4) * 8} r={4} fill="var(--color-primary)" />
        </g>
      ))}
      <text x={xToPx(mean)} y={padT - 4} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>
        μ = {mean.toFixed(1)}
      </text>
    </svg>
  );
}

function SquaredDiagram() {
  const w = 320, h = 140, padT = 20;
  const devs = [1, 2, 3];
  const scale = 22;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Squaring turns deviations into areas">
      {devs.map((d, i) => {
        const x = 30 + i * 100;
        const side = d * scale;
        return (
          <g key={i}>
            <rect x={x} y={padT + 80 - side} width={side} height={side}
              fill="var(--color-primary)" opacity={0.25} stroke="var(--color-primary)" />
            <text x={x + side / 2} y={padT + 96} textAnchor="middle" fontSize={11}
              fill="var(--color-foreground)">d = {d}</text>
            <text x={x + side / 2} y={padT + 110} textAnchor="middle" fontSize={10}
              fill="var(--color-muted-foreground)">d² = {d * d}</text>
          </g>
        );
      })}
      <text x={w / 2} y={h - 6} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>
        squaring turns each deviation into an area
      </text>
    </svg>
  );
}

function PopVsSampleDiagram() {
  const w = 320, h = 140, padT = 24, padB = 30;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Population vs sample denominators">
      <g transform={`translate(20, ${padT})`}>
        <rect x={0} y={0} width={130} height={64} rx={8} fill="var(--color-secondary)" opacity={0.6}
          stroke="var(--color-border)" />
        <text x={65} y={22} textAnchor="middle" fontSize={12} fill="var(--color-foreground)" fontWeight={600}>Population</text>
        <text x={65} y={44} textAnchor="middle" fontSize={11} fill="var(--color-foreground)">÷ N</text>
        <text x={65} y={58} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">σ</text>
      </g>
      <g transform={`translate(170, ${padT})`}>
        <rect x={0} y={0} width={130} height={64} rx={8} fill="var(--color-primary)" opacity={0.18}
          stroke="var(--color-primary)" />
        <text x={65} y={22} textAnchor="middle" fontSize={12} fill="var(--color-foreground)" fontWeight={600}>Sample</text>
        <text x={65} y={44} textAnchor="middle" fontSize={11} fill="var(--color-foreground)">÷ (N − 1)</text>
        <text x={65} y={58} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">s (Bessel)</text>
      </g>
      <text x={w / 2} y={h - padB + 22} textAnchor="middle" fontSize={11} fill="var(--color-muted-foreground)">
        smaller denominator ⇒ slightly larger estimate
      </text>
    </svg>
  );
}

function SEMDiagram() {
  const w = 320, h = 140, padT = 20;
  const bars = [{ n: 25, sem: 1.0 }, { n: 100, sem: 0.5 }, { n: 400, sem: 0.25 }];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Standard error shrinks with sample size">
      {bars.map((b, i) => {
        const y = padT + i * 34;
        const barW = b.sem * 180;
        return (
          <g key={i}>
            <text x={40} y={y + 14} textAnchor="end" fontSize={11} fill="var(--color-foreground)">N = {b.n}</text>
            <line x1={50} y1={y + 10} x2={50 + barW} y2={y + 10} stroke="var(--color-primary)" strokeWidth={4} />
            <line x1={50} y1={y + 4} x2={50} y2={y + 16} stroke="var(--color-primary)" strokeWidth={2} />
            <line x1={50 + barW} y1={y + 4} x2={50 + barW} y2={y + 16} stroke="var(--color-primary)" strokeWidth={2} />
            <text x={50 + barW + 8} y={y + 14} fontSize={10} fill="var(--color-muted-foreground)">SEM ≈ {b.sem}</text>
          </g>
        );
      })}
      <text x={w / 2} y={h - 6} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>
        SEM = σ / √N
      </text>
    </svg>
  );
}

function CIWidthDiagram() {
  const w = 320, h = 140, padT = 20;
  const levels = [
    { label: "68%", z: 1.0 },
    { label: "95%", z: 1.96 },
    { label: "99%", z: 2.58 },
  ];
  const maxZ = 2.58;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Higher confidence needs a wider interval">
      {levels.map((l, i) => {
        const y = padT + i * 32;
        const half = (l.z / maxZ) * 110;
        const cx = w / 2;
        return (
          <g key={i}>
            <text x={30} y={y + 14} fontSize={11} fill="var(--color-foreground)" fontWeight={600}>{l.label}</text>
            <line x1={cx - half} y1={y + 12} x2={cx + half} y2={y + 12} stroke="var(--color-primary)" strokeWidth={4} opacity={0.6} />
            <line x1={cx - half} y1={y + 4} x2={cx - half} y2={y + 20} stroke="var(--color-primary)" strokeWidth={2} />
            <line x1={cx + half} y1={y + 4} x2={cx + half} y2={y + 20} stroke="var(--color-primary)" strokeWidth={2} />
            <circle cx={cx} cy={y + 12} r={3} fill="var(--color-foreground)" />
          </g>
        );
      })}
      <text x={w / 2} y={h - 6} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>
        margin of error = z × SEM
      </text>
    </svg>
  );
}

/* ---------------- Guide ---------------- */

const SD_GUIDE: GuideCardItem[] = [
  {
    key: "deviations",
    title: "1. Deviations from the mean",
    explain:
      "First compute the mean, then measure how far each value sits from it: dᵢ = xᵢ − μ. Points below the mean give negative deviations, points above give positive ones. Signed deviations always sum to zero — which is exactly why we can't average them raw.",
    formula: <>dᵢ = xᵢ − μ, &nbsp; μ = (1/N) · Σ xᵢ</>,
    legend: [
      { sym: "μ", def: "population mean (x̄ for a sample)" },
      { sym: "N", def: "number of values" },
      { sym: "xᵢ", def: "each value in the dataset" },
    ],
    diagram: <DeviationsDiagram />,
    example: {
      given: "10, 12, 16, 16, 21, 23, 23, 23  → μ = 18",
      substitute: "deviations: −8, −6, −2, −2, 3, 5, 5, 5",
      answer: "Σd = 0",
    },
  },
  {
    key: "squared",
    title: "2. Square each deviation",
    explain:
      "To get rid of the sign problem, square every deviation. Now every term is positive, and points further from the mean contribute much more than nearby ones — that's what makes SD sensitive to outliers.",
    formula: <>Σ(xᵢ − μ)²</>,
    legend: [{ sym: "(xᵢ − μ)²", def: "squared deviation for value xᵢ" }],
    diagram: <SquaredDiagram />,
    example: {
      given: "deviations: −8, −6, −2, −2, 3, 5, 5, 5",
      substitute: "64 + 36 + 4 + 4 + 9 + 25 + 25 + 25",
      answer: "Σ(xᵢ − μ)² = 192",
    },
  },
  {
    key: "variance",
    title: "3. Divide → variance (population vs sample)",
    explain:
      "Variance is the average squared deviation. Divide by N for a whole population; divide by N − 1 for a sample (Bessel's correction), because the sample mean sits a hair too close to its own data.",
    formula: <>σ² = Σ(xᵢ − μ)² / N &nbsp;·&nbsp; s² = Σ(xᵢ − x̄)² / (N − 1)</>,
    legend: [
      { sym: "σ²", def: "population variance" },
      { sym: "s²", def: "sample variance (unbiased)" },
    ],
    diagram: <PopVsSampleDiagram />,
    example: {
      given: "Σ(xᵢ − μ)² = 192, N = 8",
      substitute: "σ² = 192 / 8 = 24 · s² = 192 / 7 ≈ 27.43",
      answer: "σ² = 24 (population)",
    },
  },
  {
    key: "sqrt",
    title: "4. Take the square root → standard deviation",
    explain:
      "Variance is in squared units (cm², $²…). Take a square root to bring it back to the original units — that's the standard deviation. A value of σ = 5 cm on heights literally means about 5 cm spread from average.",
    formula: <>σ = √(σ²) &nbsp;·&nbsp; s = √(s²)</>,
    legend: [
      { sym: "σ", def: "population standard deviation" },
      { sym: "s", def: "sample standard deviation" },
    ],
    diagram: <SquaredDiagram />,
    example: { given: "σ² = 24", substitute: "σ = √24", answer: "σ ≈ 4.90" },
  },
  {
    key: "sem",
    title: "5. Standard error of the mean (SEM)",
    explain:
      "SD describes how spread the individual values are. SEM describes how much the sample mean itself bounces from sample to sample. It shrinks with the square root of N — quadruple your sample and SEM halves.",
    formula: <>SEM = σ / √N</>,
    legend: [
      { sym: "SEM", def: "standard error of the mean" },
      { sym: "N", def: "sample size" },
    ],
    diagram: <SEMDiagram />,
    example: { given: "σ ≈ 4.90, N = 8", substitute: "SEM = 4.90 / √8", answer: "SEM ≈ 1.73" },
  },
  {
    key: "ci",
    title: "6. Margin of error and confidence intervals",
    explain:
      "Multiply SEM by a z-score to get the half-width of a confidence interval around the mean. Higher confidence needs a bigger z, so the interval widens: 95% uses z ≈ 1.96, 99% uses z ≈ 2.58.",
    formula: <>CI = mean ± z · (σ / √N)</>,
    legend: [
      { sym: "z", def: "z-multiplier for the chosen confidence level" },
      { sym: "z · SEM", def: "margin of error (half-width)" },
    ],
    diagram: <CIWidthDiagram />,
    example: {
      given: "mean = 18, SEM ≈ 1.73, 95% ⇒ z = 1.96",
      substitute: "18 ± 1.96 × 1.73",
      answer: "≈ [14.61, 21.39]",
    },
  },
];

// ---------------- UI ----------------

function StdDevPage() {
  const [raw, setRaw] = useState("10, 12, 23, 23, 16, 23, 21, 16");
  const [inputMode, setInputMode] = useState<InputMode>("raw");
  const [groupedRows, setGroupedRows] = useState<GroupedRow[]>([
    { value: "10", frequency: "1" },
    { value: "12", frequency: "1" },
    { value: "16", frequency: "2" },
    { value: "21", frequency: "1" },
    { value: "23", frequency: "3" },
  ]);
  const [mode, setMode] = useState<Mode>("population");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const incoming = consumeDataset("/calculators/math/standard-deviation-calculator");
    if (incoming) {
      setRaw(incoming);
      setInputMode("raw");
    }
  }, []);

  function onCalculate() {
    setError(null);
    setResult(null);
    setNotice(null);
    try {
      if (inputMode === "grouped") {
        const { values, invalid } = expandGroupedRows(groupedRows);
        if (invalid) return setError(invalid);
        if (values.length < 2) return setError("Enter at least two observations (Σf ≥ 2).");
        const pairs = groupedRows
          .map((r) => ({ value: Number(r.value), freq: Number(r.frequency) }))
          .filter((p) => Number.isFinite(p.value) && Number.isInteger(p.freq) && p.freq >= 1);
        setResult(compute(values, mode, pairs));
        setNotice(`Expanded ${pairs.length} grouped row${pairs.length === 1 ? "" : "s"} into N = ${values.length} observation${values.length === 1 ? "" : "s"}.`);
        return;
      }
      const { values, cleaned } = parseData(raw);
      setResult(compute(values, mode));
      if (cleaned > 0) {
        setNotice(`Cleaned ${cleaned} value${cleaned === 1 ? "" : "s"} — stripped currency symbols, thousand separators or stray punctuation.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid input");
    }
  }


  function onClear() {
    setRaw("");
    setResult(null);
    setError(null);
    setNotice(null);
  }

  const maxMoe = result ? CONFIDENCE_LEVELS[CONFIDENCE_LEVELS.length - 1].z * result.sem : 0;
  const symbol = result?.mode === "population" ? "σ" : "s";

  return (
    <MathCalcPage
      name="Standard Deviation Calculator"
      tagline="Paste a dataset — get the mean, variance, standard deviation, a frequency table and confidence intervals with error-bar visuals."
      extras={
        <>
          <CalcSection title="What does standard deviation measure?">
            <p>
              Standard deviation is a single number that summarises how spread out a
              dataset is around its mean. A small standard deviation means the values
              huddle tightly around the average; a large one means they're scattered.
              It has the same units as your data — a standard deviation of 3 cm on a
              set of heights is 3 cm, not "3 units squared".
            </p>
            <p>
              Two datasets can share the same mean and look completely different:
              A = [48, 49, 50, 51, 52] has mean 50 with σ ≈ 1.41, while B = [10, 30,
              50, 70, 90] has the same mean 50 but σ ≈ 28.28. The mean tells you where
              the center is; the standard deviation tells you how far a typical value
              sits from that center.
            </p>
          </CalcSection>

          <CalcSection title="Standard deviation explained, step by step">
            <p className="text-sm text-muted-foreground">
              Each step below has a plain-English definition, its formula (with every
              symbol spelled out), a small diagram, and a worked example — all in one
              card, so you can follow the whole pipeline from raw data → mean →
              variance → standard deviation → confidence interval without jumping
              between sections.
            </p>
            <GuideCards items={SD_GUIDE} />
          </CalcSection>

          <CalcSection title="Common z-multipliers">
            <ReferenceTable
              headers={["Confidence level", "z", "Roughly means"]}
              numericColumns={[1]}
              rows={[
                ["68.3%", "1.000", "±1 standard error"],
                ["90%", "1.645", "commonly used, tighter interval"],
                ["95%", "1.960", "the default in most research"],
                ["99%", "2.576", "stricter, wider interval"],
                ["99.9%", "3.291", "very high confidence"],
              ]}
            />
          </CalcSection>

          <CalcSection title="Common mistakes">
            <FeatureList
              items={[
                <>Using the population formula on a random sample — under-estimates the true spread. Prefer N − 1 when in doubt.</>,
                <>Reporting variance and calling it standard deviation. Variance is in squared units (e.g. cm²) — always take the square root for a meaningful "spread" figure.</>,
                <>Comparing standard deviations across variables in different units. Use the coefficient of variation (s / mean) for a fair comparison.</>,
                <>Treating a confidence interval as "95% probability the true mean is in this range for this specific sample". It's a statement about the procedure, not a probability about this one interval.</>,
              ]}
            />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                <>Accepts comma, space, semicolon, tab or newline separated data — paste directly from a spreadsheet.</>,
                <>Toggle between population (N) and sample (N − 1) formulas — the result updates the correct denominator and symbol.</>,
                <>Frequency table with counts and percentages so repeated values are easy to spot.</>,
                <>Confidence-interval table at 68.3%, 90%, 95%, 99% and 99.9% with proportional error-bar visuals that grow as confidence increases.</>,
                <>Full step-by-step working: mean → each (xᵢ − mean)² → sum → variance → square root.</>,
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Can standard deviation be negative?",
                  a: (
                    <p>
                      No. It's the square root of a sum of squares, so it's always
                      ≥ 0. A standard deviation of exactly 0 means every value in
                      the dataset is identical.
                    </p>
                  ),
                },
                {
                  q: "Why do the 68%, 95%, 99.7% rules exist?",
                  a: (
                    <p>
                      For any dataset that's roughly bell-shaped (normally
                      distributed), about 68% of values fall within ±1σ of the mean,
                      about 95% within ±2σ and about 99.7% within ±3σ.
                    </p>
                  ),
                },
                {
                  q: "How does sample size affect the margin of error?",
                  a: (
                    <p>
                      Margin of error scales with 1/√N, so quadrupling the sample
                      size cuts the margin roughly in half.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/weighted-mean-calculator", label: "Weighted Mean Calculator" },
                { to: "/calculators/math/mean-absolute-deviation-calculator", label: "Mean Absolute Deviation" },
                { to: "/calculators/math/percent-error-calculator", label: "Percent Error Calculator" },
              ]}
            />
          </CalcSection>
        </>

      }
    >
      <div className="space-y-4">
        <ModeToggle mode={inputMode} onChange={setInputMode} />

        {inputMode === "raw" ? (
          <Field
            label="Dataset"
            htmlFor="sd-data"
            hint="Comma, space or newline separated. Example: 10, 12, 23, 23, 16, 23, 21, 16"
          >
            <textarea
              id="sd-data"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 font-serif italic text-sm text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="10, 12, 23, 23, 16, 23, 21, 16"
            />
          </Field>
        ) : (
          <Field
            label="Grouped data"
            htmlFor="sd-grouped"
            hint="Enter each distinct value with how many times it appears. Rows are expanded internally into the equivalent dataset."
          >
            <div id="sd-grouped">
              <GroupedTable rows={groupedRows} onChange={setGroupedRows} />
            </div>
          </Field>
        )}


        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1.5 block text-sm font-medium text-foreground">
            Data represents
          </legend>
          {(["population", "sample"] as Mode[]).map((m) => (
            <label
              key={m}
              className={
                "cursor-pointer rounded-full border px-4 py-1.5 text-sm capitalize transition-colors " +
                (mode === m
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-background/40 text-muted-foreground hover:border-primary/40")
              }
            >
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="sr-only"
              />
              {m === "population" ? "Population (N)" : "Sample (N − 1)"}
            </label>
          ))}
        </fieldset>

        <div className="flex gap-2">
          <PrimaryButton onClick={onCalculate}>Calculate</PrimaryButton>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center justify-center rounded-full border border-border bg-background/60 px-5 py-2.5 text-sm font-medium text-foreground hover:border-primary/40"
          >
            Clear
          </button>
        </div>

        {error && <ErrorBox message={error} />}
        {notice && (
          <div className="mt-2 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
            {notice}
          </div>
        )}

        {result && (
          <>
            <ResultActions
              className="mt-4"
              filename="standard-deviation-result"
              captureRef={resultRef}
              getCopyText={() => {
                const symbol = result.mode === "population" ? "σ" : "s";
                const preview = result.values.slice(0, 12).map(fmt).join(", ") + (result.values.length > 12 ? ", …" : "");
                return [
                  `Standard Deviation Calculator`,
                  `Mode: ${result.mode}`,
                  `Dataset: ${preview}`,
                  `N=${result.n} | Sum=${fmt(result.sum)} | Mean=${fmt(result.mean)}`,
                  `${symbol}=${fmt(result.stdev)} | Variance ${symbol}²=${fmt(result.variance)}`,
                  `SEM=${fmt(result.sem)}`,
                ].join("\n");
              }}
            />
            <div ref={resultRef} className="mt-4 rounded-3xl bg-background/60 p-4">

            <ResultBox
              label={`Standard deviation (${result.mode === "population" ? "σ" : "s"})`}
              value={fmt(result.stdev)}
              note={
                <>
                  Variance {symbol}² = {fmt(result.variance)} · Mean = {fmt(result.mean)} ·
                  N = {result.n}
                </>
              }
            />

            {/* Summary stats */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Count (N)", value: String(result.n) },
                { label: "Sum", value: fmt(result.sum) },
                { label: "Mean", value: fmt(result.mean) },
                { label: `Variance ${symbol}²`, value: fmt(result.variance) },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border/60 bg-secondary/20 p-3"
                >
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="mt-1 font-serif italic text-sm text-foreground tabular-nums">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <StdDevPlot result={result} />

            <StepsToggle steps={result.steps} />

            {/* Confidence interval table */}
            <div className="mt-6">
              <h3 className="mb-2 font-display text-base font-semibold text-foreground">
                Margin of error (confidence intervals for the mean)
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Standard error of the mean SEM = {symbol} / √N = {fmt(result.stdev)} / √
                {result.n} = <b>{fmt(result.sem)}</b>. Margin of error = z × SEM.
              </p>
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="min-w-full text-left text-xs sm:text-sm">
                  <thead className="bg-secondary/40 text-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Confidence</th>
                      <th className="px-3 py-2 text-right font-semibold tabular-nums">z</th>
                      <th className="px-3 py-2 text-right font-semibold tabular-nums">
                        Margin of error
                      </th>
                      <th className="px-3 py-2 text-right font-semibold tabular-nums">
                        Interval
                      </th>
                      <th className="px-3 py-2 font-semibold">Visual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CONFIDENCE_LEVELS.map((c) => {
                      const moe = c.z * result.sem;
                      const pct = result.mean !== 0 ? (moe / Math.abs(result.mean)) * 100 : 0;
                      return (
                        <tr key={c.label} className="odd:bg-background/40">
                          <td className="px-3 py-2">{c.label}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {c.z.toFixed(3)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            ±{fmt(moe)}
                            {result.mean !== 0 && (
                              <span className="ml-1 text-muted-foreground">
                                (±{pct.toFixed(2)}%)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            [{fmt(result.mean - moe)}, {fmt(result.mean + moe)}]
                          </td>
                          <td className="px-3 py-2">
                            <ErrorBarRow
                              mean={result.mean}
                              moe={moe}
                              maxMoe={maxMoe}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                The mean tick sits at the center of every bar; the coloured band is
                the interval mean ± margin. Bars share a common horizontal scale so
                the widening at higher confidence is visually obvious.
              </p>
            </div>

            {/* Frequency table */}
            <div className="mt-6">
              <h3 className="mb-2 font-display text-base font-semibold text-foreground">
                Frequency table
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-secondary/40 text-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Value</th>
                      <th className="px-3 py-2 text-right font-semibold tabular-nums">
                        Count
                      </th>
                      <th className="px-3 py-2 text-right font-semibold tabular-nums">
                        Percent
                      </th>
                      <th className="px-3 py-2 font-semibold">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.freq.map((f) => (
                      <tr key={f.value} className="odd:bg-background/40">
                        <td className="px-3 py-2 tabular-nums">{fmt(f.value)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{f.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {f.pct.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2">
                          <div className="h-2 w-full min-w-[80px] rounded-full bg-secondary/40">
                            <div
                              className="h-2 rounded-full bg-primary/60"
                              style={{ width: `${f.pct}%` }}
                              aria-hidden
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
            <SendDatasetActions
              currentPath="/calculators/math/standard-deviation-calculator"
              getDataset={() => {
                if (inputMode === "grouped") {
                  const { values } = expandGroupedRows(groupedRows);
                  return values.join(", ");
                }
                return raw;
              }}
            />
          </>

        )}
      </div>
    </MathCalcPage>
  );
}
