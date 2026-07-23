import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { SendDatasetActions } from "@/components/SendDatasetActions";
import { consumeDataset } from "@/lib/dataset-handoff";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  PrimaryButton,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { CopyButton } from "@/components/CopyButton";
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

export const Route = createFileRoute("/calculators/math/mean-median-mode-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Mean, Median, Mode, Range Calculator",
      title: "Mean, Median, Mode, Range Calculator — With Chart & Steps",
      metaDescription:
        "Calculate mean, median, mode, range, geometric mean, sum and more from a list of numbers. Handles multimodal data and shows a labeled bar chart of your values.",
      canonicalUrl: "/calculators/math/mean-median-mode-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Mean, Median, Mode, Range Calculator", path: "/calculators/math/mean-median-mode-calculator" },
      ],
      faqs: [
        {
          q: "What's the difference between mean and median?",
          a: "Mean is the arithmetic average — sum divided by count. Median is the middle value once the data is sorted. The mean gets pulled toward outliers; the median barely moves, which is why median is preferred for skewed data like income or house prices.",
        },
        {
          q: "Can a data set have more than one mode?",
          a: "Yes. A data set is bimodal if two values tie for the highest frequency, and multimodal if more than two do. If every value appears the same number of times, there is no mode.",
        },
        {
          q: "When should I use median instead of mean?",
          a: "Use median whenever the data is skewed or has outliers — income, home prices, response times. Use mean for roughly symmetric data where every value should influence the summary.",
        },
        {
          q: "What is the geometric mean?",
          a: "The geometric mean is the nth root of the product of n positive numbers. It is used for growth rates, ratios and percentages, because it multiplies rather than adds. It only works for strictly positive numbers.",
        },
        {
          q: "Is the range affected by outliers?",
          a: "Very much. Range is just max minus min, so a single extreme value can inflate it dramatically. For a more robust spread, look at standard deviation or interquartile range.",
        },
      ],
    }),
  component: MMMRPage,
});

/* ---------------- Stats engine ---------------- */

interface Stats {
  values: number[];
  sorted: number[];
  count: number;
  sum: number;
  mean: number;
  median: number;
  modes: number[];
  modeCount: number;
  range: number;
  min: number;
  max: number;
  geoMean: number | null;
  geoNote?: string;
  harmonicMean: number | null;
  harmonicNote?: string;
  midrange: number;
}

import { parseDataset } from "@/lib/math/parse-numbers";

function parseNumbers(input: string): { values: number[]; error?: string; cleaned: number } {
  const { values, invalid, cleaned } = parseDataset(input);
  if (invalid.length) return { values: [], cleaned, error: `"${invalid[0]}" is not a valid number.` };
  if (values.length === 0) return { values: [], cleaned, error: "Enter at least one number." };
  return { values, cleaned };
}

function computeStats(values: number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const count = values.length;
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / count;
  const min = sorted[0];
  const max = sorted[count - 1];
  const range = max - min;

  let median: number;
  if (count % 2 === 1) {
    median = sorted[(count - 1) / 2];
  } else {
    median = (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
  }

  // Mode — preserve first-seen order among tied max frequencies
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  let maxFreq = 0;
  for (const f of freq.values()) if (f > maxFreq) maxFreq = f;
  const modes: number[] = [];
  if (maxFreq > 1) {
    const seen = new Set<number>();
    for (const v of values) {
      if (freq.get(v) === maxFreq && !seen.has(v)) {
        modes.push(v);
        seen.add(v);
      }
    }
  }

  // Geometric mean — only defined for strictly positive numbers
  let geoMean: number | null = null;
  let geoNote: string | undefined;
  let harmonicMean: number | null = null;
  let harmonicNote: string | undefined;
  if (values.every((v) => v > 0)) {
    const logSum = values.reduce((s, v) => s + Math.log(v), 0);
    geoMean = Math.exp(logSum / count);
    const recipSum = values.reduce((s, v) => s + 1 / v, 0);
    harmonicMean = count / recipSum;
  } else {
    geoNote = "Requires all positive values";
    harmonicNote = "Requires all positive values";
  }

  const midrange = (max + min) / 2;

  return {
    values, sorted, count, sum, mean, median,
    modes, modeCount: maxFreq, range, min, max, geoMean, geoNote,
    harmonicMean, harmonicNote, midrange,
  };
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) return n.toExponential(6);
  return parseFloat(n.toPrecision(12)).toString();
}

/* ---------------- Bar chart ---------------- */

function BarChart({ values }: { values: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const height = 260;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 40;
  const iw = width - padL - padR;
  const ih = height - padT - padB;

  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const yRange = max - min || 1;
  const yToPx = (v: number) => padT + ih - ((v - min) / yRange) * ih;
  const zeroY = yToPx(0);

  const n = values.length;
  const gap = 6;
  const bw = Math.max(4, (iw - gap * (n - 1)) / n);

  // Y-axis ticks: 4 evenly-spaced
  const ticks = 4;
  const step = yRange / ticks;
  const tickVals: number[] = [];
  for (let i = 0; i <= ticks; i++) tickVals.push(min + step * i);

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Bar chart of input values"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
      >
        {/* Y grid + labels */}
        {tickVals.map((t, i) => {
          const y = yToPx(t);
          return (
            <g key={i}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} opacity={0.5} />
              <text x={padL - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--color-muted-foreground)">
                {fmt(Number(t.toFixed(2)))}
              </text>
            </g>
          );
        })}

        {/* Zero baseline emphasized when min < 0 */}
        {min < 0 && (
          <line x1={padL} x2={width - padR} y1={zeroY} y2={zeroY} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />
        )}

        {/* Bars */}
        {values.map((v, i) => {
          const x = padL + i * (bw + gap);
          const y = v >= 0 ? yToPx(v) : zeroY;
          const h = Math.abs(zeroY - yToPx(v));
          const isHover = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect
                x={x}
                y={y}
                width={bw}
                height={Math.max(1, h)}
                rx={3}
                fill="var(--color-primary)"
                opacity={isHover ? 1 : 0.85}
              />
              {/* value label under axis */}
              <text
                x={x + bw / 2}
                y={height - padB + 14}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-muted-foreground)"
              >
                {fmt(v)}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {hover !== null && (() => {
          const v = values[hover];
          const x = padL + hover * (bw + gap) + bw / 2;
          const y = v >= 0 ? yToPx(v) - 10 : yToPx(v) + 22;
          const label = `#${hover + 1}: ${fmt(v)}`;
          const tw = Math.max(48, label.length * 6.2 + 12);
          return (
            <g pointerEvents="none">
              <rect x={x - tw / 2} y={y - 14} width={tw} height={18} rx={4} fill="var(--color-foreground)" opacity={0.9} />
              <text x={x} y={y} textAnchor="middle" fontSize={11} fill="var(--color-background)">
                {label}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

/* ---------------- Concept diagrams (guide cards) ---------------- */

function MeanDiagram() {
  // Dot plot of 2, 3, 4, 7, 9 (mean = 5) with a dashed line at the mean.
  const data = [2, 3, 4, 7, 9];
  const mean = data.reduce((s, v) => s + v, 0) / data.length;
  const w = 320, h = 140, padL = 20, padR = 20, padT = 20, padB = 30;
  const min = 0, max = 10;
  const xToPx = (v: number) => padL + ((v - min) / (max - min)) * (w - padL - padR);
  const y = h - padB;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Mean as balance point">
      <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--color-border)" strokeWidth={1.5} />
      {Array.from({ length: 11 }, (_, i) => (
        <g key={i}>
          <line x1={xToPx(i)} y1={y - 3} x2={xToPx(i)} y2={y + 3} stroke="var(--color-border)" />
          <text x={xToPx(i)} y={y + 16} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">{i}</text>
        </g>
      ))}
      {data.map((v, i) => (
        <circle key={i} cx={xToPx(v)} cy={y - 12} r={6} fill="var(--color-primary)" opacity={0.85} />
      ))}
      {/* Fulcrum */}
      <polygon
        points={`${xToPx(mean)},${y + 4} ${xToPx(mean) - 8},${y + 20} ${xToPx(mean) + 8},${y + 20}`}
        fill="var(--color-foreground)"
      />
      <line x1={xToPx(mean)} y1={padT} x2={xToPx(mean)} y2={y} stroke="var(--color-foreground)" strokeDasharray="4 3" />
      <text x={xToPx(mean)} y={padT - 4} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>
        mean = {mean}
      </text>
    </svg>
  );
}

function MedianDiagram() {
  const data = [2, 3, 4, 7, 9];
  const w = 320, h = 120, gap = 10;
  const bw = (w - gap * (data.length + 1)) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Median as middle value">
      {data.map((v, i) => {
        const middle = i === Math.floor(data.length / 2);
        const x = gap + i * (bw + gap);
        return (
          <g key={i}>
            <rect
              x={x} y={30} width={bw} height={h - 60} rx={6}
              fill={middle ? "var(--color-primary)" : "var(--color-secondary)"}
              stroke={middle ? "var(--color-primary)" : "var(--color-border)"}
              strokeWidth={middle ? 2 : 1}
              opacity={middle ? 0.9 : 0.7}
            />
            <text x={x + bw / 2} y={h / 2 + 5} textAnchor="middle" fontSize={16} fontWeight={middle ? 700 : 500}
              fill={middle ? "white" : "var(--color-foreground)"}>{v}</text>
          </g>
        );
      })}
      <text x={w / 2} y={18} textAnchor="middle" fontSize={11} fill="var(--color-muted-foreground)">
        sorted — middle value is the median
      </text>
      <text x={gap + 2 * (bw + gap) + bw / 2} y={h - 12} textAnchor="middle" fontSize={11}
        fill="var(--color-foreground)" fontWeight={600}>median = 4</text>
    </svg>
  );
}

function ModeDiagram() {
  // frequencies of 2,3,3,5,5,5,7
  const bars = [
    { v: 2, f: 1 }, { v: 3, f: 2 }, { v: 5, f: 3 }, { v: 7, f: 1 },
  ];
  const w = 320, h = 150, padL = 20, padR = 20, padT = 20, padB = 30;
  const iw = w - padL - padR, ih = h - padT - padB;
  const maxF = 3;
  const gap = 14;
  const bw = (iw - gap * (bars.length - 1)) / bars.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Mode as most frequent value">
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="var(--color-border)" />
      {bars.map((b, i) => {
        const isMode = b.f === maxF;
        const barH = (b.f / maxF) * ih;
        const x = padL + i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={h - padB - barH} width={bw} height={barH} rx={4}
              fill={isMode ? "var(--color-primary)" : "var(--color-secondary)"}
              opacity={isMode ? 0.95 : 0.7}
              stroke={isMode ? "var(--color-primary)" : "var(--color-border)"} />
            <text x={x + bw / 2} y={h - padB + 14} textAnchor="middle" fontSize={11}
              fill="var(--color-muted-foreground)">{b.v}</text>
            <text x={x + bw / 2} y={h - padB - barH - 4} textAnchor="middle" fontSize={10}
              fill="var(--color-foreground)">{b.f}×</text>
          </g>
        );
      })}
      <text x={w / 2} y={14} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>
        mode = 5 (appears 3 times)
      </text>
    </svg>
  );
}

function RangeDiagram() {
  const w = 320, h = 110, padL = 20, padR = 20;
  const min = 0, max = 10;
  const y = 60;
  const xToPx = (v: number) => padL + ((v - min) / (max - min)) * (w - padL - padR);
  const dataMin = 2, dataMax = 9;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Range from min to max">
      <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--color-border)" strokeWidth={1.5} />
      {Array.from({ length: 11 }, (_, i) => (
        <g key={i}>
          <line x1={xToPx(i)} y1={y - 4} x2={xToPx(i)} y2={y + 4} stroke="var(--color-border)" />
          <text x={xToPx(i)} y={y + 18} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">{i}</text>
        </g>
      ))}
      <line x1={xToPx(dataMin)} y1={y - 14} x2={xToPx(dataMax)} y2={y - 14}
        stroke="var(--color-primary)" strokeWidth={3} />
      <circle cx={xToPx(dataMin)} cy={y - 14} r={5} fill="var(--color-primary)" />
      <circle cx={xToPx(dataMax)} cy={y - 14} r={5} fill="var(--color-primary)" />
      <text x={xToPx(dataMin)} y={y - 22} textAnchor="middle" fontSize={10} fill="var(--color-foreground)">min = 2</text>
      <text x={xToPx(dataMax)} y={y - 22} textAnchor="middle" fontSize={10} fill="var(--color-foreground)">max = 9</text>
      <text x={w / 2} y={h - 6} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>
        range = 9 − 2 = 7
      </text>
    </svg>
  );
}

function GeoMeanDiagram() {
  // Rectangle 2×8 and square √16 = 4, same area
  const w = 320, h = 150;
  const scale = 12;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Geometric mean as equal-area square">
      <g transform="translate(30, 25)">
        <rect x={0} y={0} width={8 * scale} height={2 * scale} fill="var(--color-secondary)"
          stroke="var(--color-border)" opacity={0.75} />
        <text x={4 * scale} y={2 * scale + 14} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">a = 8</text>
        <text x={-6} y={scale + 4} textAnchor="end" fontSize={10} fill="var(--color-muted-foreground)">b = 2</text>
        <text x={4 * scale} y={-6} textAnchor="middle" fontSize={11} fill="var(--color-foreground)">rectangle area = 16</text>
      </g>
      <g transform="translate(190, 25)">
        <rect x={0} y={0} width={4 * scale} height={4 * scale} fill="var(--color-primary)"
          opacity={0.85} stroke="var(--color-primary)" />
        <text x={2 * scale} y={4 * scale + 14} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">side = √(8·2) = 4</text>
        <text x={2 * scale} y={-6} textAnchor="middle" fontSize={11} fill="var(--color-foreground)">square area = 16</text>
      </g>
      <text x={w / 2} y={h - 6} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>
        geometric mean = √(a·b)
      </text>
    </svg>
  );
}

/* ---------------- Guide ---------------- */

interface MMMRGuideItem {
  key: string;
  title: string;
  explain: ReactNode;
  formula: ReactNode;
  legend: { sym: ReactNode; def: ReactNode }[];
  diagram: ReactNode;
  example: { given: ReactNode; substitute: ReactNode; answer: ReactNode };
}

const MMMR_GUIDE: MMMRGuideItem[] = [
  {
    key: "mean",
    title: "Mean (arithmetic average)",
    explain:
      "The mean is the balance point of the data: add everything up and divide by how many values you have. It uses every number, which makes it precise but also sensitive — a single huge outlier can drag it a long way from what most values look like.",
    formula: <>x̄ = (1/N) · Σ xᵢ</>,
    legend: [
      { sym: "x̄", def: "sample mean" },
      { sym: "N", def: "number of values" },
      { sym: "xᵢ", def: "each value in the data set" },
    ],
    diagram: <MeanDiagram />,
    example: {
      given: "10, 2, 38, 23, 38, 23, 21",
      substitute: "(10 + 2 + 38 + 23 + 38 + 23 + 21) / 7 = 155 / 7",
      answer: "≈ 22.14",
    },
  },
  {
    key: "median",
    title: "Median (middle value)",
    explain:
      "Sort the data from small to large; the median is the value sitting in the middle. With an even count you average the two middle values. Because it ignores how extreme the outer values are, the median is the summary of choice for skewed data like income or house prices.",
    formula: <>median = middle of the sorted list (average the two middle values if N is even)</>,
    legend: [
      { sym: "N", def: "number of values (odd → single middle; even → average of the pair)" },
    ],
    diagram: <MedianDiagram />,
    example: {
      given: "sorted: 2, 3, 4, 7, 9",
      substitute: "N = 5 (odd) → middle position is the 3rd value",
      answer: "4",
    },
  },
  {
    key: "mode",
    title: "Mode (most frequent value)",
    explain:
      "The mode is whichever value shows up most often. A data set can have one mode, several (bimodal / multimodal) if there is a tie, or none at all when every value is unique. It's the only summary here that also works on non-numeric data like colors or product brands.",
    formula: <>mode = value(s) with the highest frequency</>,
    legend: [
      { sym: "f", def: "frequency (how many times a value appears)" },
    ],
    diagram: <ModeDiagram />,
    example: {
      given: "2, 3, 3, 5, 5, 5, 7",
      substitute: "frequencies: 2→1, 3→2, 5→3, 7→1",
      answer: "mode = 5",
    },
  },
  {
    key: "range",
    title: "Range (spread from min to max)",
    explain:
      "Range is the simplest measure of how spread out the data is: subtract the smallest value from the largest. It's a single number that captures the total width of the data — but because it only looks at the two endpoints, a single outlier can inflate it dramatically.",
    formula: <>Range = max − min</>,
    legend: [
      { sym: "max", def: "largest value in the data" },
      { sym: "min", def: "smallest value in the data" },
    ],
    diagram: <RangeDiagram />,
    example: {
      given: "2, 3, 4, 7, 9",
      substitute: "max = 9, min = 2 → 9 − 2",
      answer: "range = 7",
    },
  },
  {
    key: "geo",
    title: "Geometric mean",
    explain:
      "Instead of adding values and dividing, the geometric mean multiplies them and takes the Nth root. It's the natural average for growth rates, ratios, and percentages — anything where the underlying process is multiplicative. Only defined for strictly positive numbers.",
    formula: <>G = (x₁ · x₂ · … · x_N)^(1/N)</>,
    legend: [
      { sym: "G", def: "geometric mean" },
      { sym: "N", def: "number of values" },
      { sym: "xᵢ", def: "each value (must be > 0)" },
    ],
    diagram: <GeoMeanDiagram />,
    example: {
      given: "a = 8, b = 2",
      substitute: "G = √(8 × 2) = √16",
      answer: "G = 4",
    },
  },
];

/* ---------------- Page ---------------- */

function MMMRPage() {
  const [input, setInput] = useState("10, 2, 38, 23, 38, 23, 21");
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const incoming = consumeDataset("/calculators/math/mean-median-mode-calculator");
    if (incoming) setInput(incoming);
  }, []);





  const compute = () => {
    setErr(null);
    setStats(null);
    setNotice(null);
    const { values, error, cleaned } = parseNumbers(input);
    if (error) {
      setErr(error);
      return;
    }
    setStats(computeStats(values));
    if (cleaned > 0) {
      setNotice(`Cleaned ${cleaned} value${cleaned === 1 ? "" : "s"} — stripped currency symbols, thousand separators or stray punctuation.`);
    }
  };

  const clear = () => {
    setInput("");
    setStats(null);
    setErr(null);
    setNotice(null);
  };

  const steps: Step[] = useMemo(() => {
    if (!stats) return [];
    const sumTerms = stats.values.map(fmt).join(" + ");
    const n = stats.count;
    const isOdd = n % 2 === 1;
    const midIdx = isOdd ? (n - 1) / 2 : n / 2 - 1;
    return [
      {
        title: "Sort the data",
        body: (
          <>
            <MathNote>Arrange the values from smallest to largest</MathNote>
            <MathLine>original: {stats.values.map(fmt).join(", ")}</MathLine>
            <MathLine>sorted: {stats.sorted.map(fmt).join(", ")}</MathLine>
          </>
        ),
      },
      {
        title: "Compute the mean",
        body: (
          <>
            <MathNote>Add every value, then divide by the count</MathNote>
            <MathLine>x̄ = (Σ xᵢ) / N</MathLine>
            <MathLine>Σ xᵢ = {sumTerms}</MathLine>
            <MathLine>Σ xᵢ = {fmt(stats.sum)}</MathLine>
            <MathLine>x̄ = {fmt(stats.sum)} / {n}</MathLine>
            <MathLine>x̄ = {fmt(stats.mean)}</MathLine>
          </>
        ),
      },
      {
        title: "Find the median",
        body: (
          <>
            <MathNote>
              N = {n} ({isOdd ? "odd" : "even"}) —{" "}
              {isOdd
                ? "median is the middle value of the sorted list"
                : "median is the average of the two middle values"}
            </MathNote>
            {isOdd ? (
              <>
                <MathLine>position = (N + 1) / 2 = {(n + 1) / 2}</MathLine>
                <MathLine>median = {fmt(stats.sorted[midIdx])}</MathLine>
              </>
            ) : (
              <>
                <MathLine>
                  middle values = {fmt(stats.sorted[midIdx])}, {fmt(stats.sorted[midIdx + 1])}
                </MathLine>
                <MathLine>
                  median = ({fmt(stats.sorted[midIdx])} + {fmt(stats.sorted[midIdx + 1])}) / 2
                </MathLine>
                <MathLine>median = {fmt(stats.median)}</MathLine>
              </>
            )}
          </>
        ),
      },
      {
        title: "Find the mode",
        body:
          stats.modes.length === 0 ? (
            <>
              <MathNote>The mode is the value that appears most often</MathNote>
              <MathLine>each value appears exactly once</MathLine>
              <MathLine>mode = none</MathLine>
            </>
          ) : (
            <>
              <MathNote>
                Highest frequency = {stats.modeCount} — every value tied at that count is a mode
              </MathNote>
              <MathLine>
                mode = {stats.modes.map(fmt).join(", ")}
              </MathLine>
            </>
          ),
      },
      {
        title: "Find the range",
        body: (
          <>
            <MathNote>Range measures spread — largest minus smallest</MathNote>
            <MathLine>range = max − min</MathLine>
            <MathLine>range = {fmt(stats.max)} − {fmt(stats.min)}</MathLine>
            <MathLine>range = {fmt(stats.range)}</MathLine>
          </>
        ),
      },
    ];
  }, [stats]);

  const summary = useMemo(() => {
    if (!stats) return "";
    const modeText =
      stats.modes.length === 0
        ? "No mode (all values are unique)"
        : `${stats.modes.map(fmt).join(", ")} — each appeared ${stats.modeCount} times`;
    return [
      `Mean: ${fmt(stats.mean)}`,
      `Median: ${fmt(stats.median)}`,
      `Mode: ${modeText}`,
      `Range: ${fmt(stats.range)}`,
      `Geometric Mean: ${stats.geoMean === null ? "n/a (requires positive values)" : fmt(stats.geoMean)}`,
      `Harmonic Mean: ${stats.harmonicMean === null ? "n/a (requires positive values)" : fmt(stats.harmonicMean)}`,
      `Midrange: ${fmt(stats.midrange)}`,
      `Largest: ${fmt(stats.max)}`,
      `Smallest: ${fmt(stats.min)}`,
      `Sum: ${fmt(stats.sum)}`,
      `Count: ${stats.count}`,
      `Sorted: ${stats.sorted.map(fmt).join(", ")}`,
    ].join("\n");
  }, [stats]);

  return (
    <MathCalcPage
      name="Mean, Median, Mode, Range Calculator"
      tagline="Paste any list of numbers and get the mean, median, mode, range, geometric mean, sum and more — plus a labeled bar chart of your values."
      extras={
        <>
          <CalcSection title="What is Mean, Median, Mode, and Range?">
            <p>
              Mean, median, mode and range are the four workhorse summaries of a
              data set. Mean and median describe the <em>center</em> — a typical
              value. Mode describes the <em>most common</em> value. Range
              describes the <em>spread</em> from smallest to largest. Together
              they give a quick fingerprint of a data set before you reach for
              more advanced tools like standard deviation.
            </p>
            <p>
              The <strong>harmonic mean</strong> is the reciprocal of the average
              of reciprocals, H = n / Σ(1/xᵢ) — the right average for rates and
              ratios (like average speed over equal distances), and it's only
              defined when every value is strictly positive.
            </p>
            <p>
              The <strong>midrange</strong> is simply (max + min) / 2 — the exact
              midpoint between the smallest and largest value. It's quick to
              compute but, like range, very sensitive to outliers.
            </p>
          </CalcSection>

          <CalcSection title="Mean, median, mode and range explained, measure by measure">
            <p className="text-sm text-muted-foreground">
              Each of the five measures below gets a plain-English definition,
              its formula (with every symbol spelled out), a small diagram of
              what it's actually measuring, and a worked example — all in one
              card, so you never have to jump between sections to piece it
              together.
            </p>
            <div className="mt-4 space-y-5">
              {MMMR_GUIDE.map((g) => (
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

          <CalcSection title="Common mistakes">
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Forgetting to sort before finding the median.</strong> The middle position of the <em>original</em> list is not the median.</li>
              <li><strong>Reporting only one mode.</strong> When two or more values tie for the top frequency, all of them are modes.</li>
              <li><strong>Confusing "range" with "the range of values".</strong> Statistical range is a single number (max − min), not the list of values in between.</li>
              <li><strong>Averaging categorical data.</strong> Use mode, not mean, for things like brand names or colors.</li>
              <li><strong>Assuming mean = typical.</strong> With skewed data, the median is usually the more honest "typical" value.</li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Nine summary stats at once — mean, median, mode, range, geometric mean, largest, smallest, sum and count",
                "Multimodal aware — lists every value tied for the top frequency, or says outright when there is no mode",
                "Labeled bar chart of your values in entry order with hover tooltips showing the exact number",
                "Show/hide step-by-step working — sort, sum, mean, median, mode and range in order",
                "Handles negative numbers, decimals and duplicates; strips currency symbols and thousand separators automatically",
                "Copy the full result summary in one click, or send the same dataset to Standard Deviation, Weighted Mean or the full Statistics tool",
              ]}
            />
          </CalcSection>


          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What's the difference between mean and median?", a: <p>Mean is the arithmetic average; median is the middle value after sorting. Mean is pulled by outliers, median is not.</p> },
                { q: "Can a data set have more than one mode?", a: <p>Yes — a data set is bimodal with two modes, and multimodal with more. If every value is unique, there is no mode at all.</p> },
                { q: "When should I use median instead of mean?", a: <p>Whenever the data is skewed or has outliers — income, home prices, response times.</p> },
                { q: "Does mode work on non-numeric data?", a: <p>Yes. Mode is the most frequent category, so it works on colors, brands, or any labeled values. Mean, median and range do not.</p> },
                { q: "What if my data set is empty?", a: <p>None of these statistics are defined for an empty set. The calculator will ask you to enter at least one value.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
                { to: "/calculators/math/weighted-mean-calculator", label: "Weighted Mean Calculator" },
                { to: "/calculators/math/sample-size-calculator", label: "Sample Size Calculator" },
                { to: "/calculators/math/percentage-calculator", label: "Percentage Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Numbers (comma or space separated)" htmlFor="data" hint="e.g. 10, 2, 38, 23, 38, 23, 21">
          <textarea
            id="data"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="10, 2, 38, 23, 38, 23, 21"
          />
        </Field>
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

      {stats && (
        <div className="mt-6 space-y-4">
          <ResultActions
            filename="mean-median-mode-result"
            captureRef={resultRef}
            getCopyText={() => summary}
          />
          <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Result</div>
              <CopyButton text={summary} label="Copy summary" />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <tbody className="divide-y divide-border/60">
                  <ResultRow label="Mean (Average)" value={fmt(stats.mean)} />
                  <ResultRow label="Median" value={fmt(stats.median)} />
                  <ResultRow label="Range" value={fmt(stats.range)} />
                  <ResultRow
                    label="Mode"
                    value={
                      stats.modes.length === 0
                        ? "No mode (all values are unique)"
                        : `${stats.modes.map(fmt).join(", ")}, each appeared ${stats.modeCount} times`
                    }
                  />
                  <ResultRow
                    label="Geometric Mean"
                    value={stats.geoMean === null ? `— (${stats.geoNote})` : fmt(stats.geoMean)}
                  />
                  <ResultRow
                    label="Harmonic Mean"
                    value={stats.harmonicMean === null ? `— (${stats.harmonicNote})` : fmt(stats.harmonicMean)}
                  />
                  <ResultRow label="Midrange" value={fmt(stats.midrange)} />
                  <ResultRow label="Largest" value={fmt(stats.max)} />
                  <ResultRow label="Smallest" value={fmt(stats.min)} />
                  <ResultRow label="Sum" value={fmt(stats.sum)} />
                  <ResultRow label="Count" value={String(stats.count)} />
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm">
              <span className="font-semibold text-foreground">Sorted Data Set: </span>
              <span className="tabular-nums text-foreground/90">{stats.sorted.map(fmt).join(", ")}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <div className="mb-2 text-sm font-semibold text-foreground">Column Chart of the Values</div>
            <BarChart values={stats.values} />
            <div className="mt-2 text-xs text-muted-foreground">Hover a bar for its exact value.</div>
          </div>
          <StepsToggle steps={steps} />
          </div>
          <SendDatasetActions
            currentPath="/calculators/math/mean-median-mode-calculator"
            getDataset={() => input}
          />
        </div>
      )}

    </MathCalcPage>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th scope="row" className="py-2 pr-4 font-semibold text-foreground align-top w-1/3 whitespace-nowrap">
        {label}
      </th>
      <td className="py-2 tabular-nums text-foreground/90 break-words">{value}</td>
    </tr>
  );
}
