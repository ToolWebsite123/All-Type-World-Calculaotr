import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  PrimaryButton,
  TextInput,
  ErrorBox,
  CalcSection,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  ResultBox,
  GuideCards,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
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

export const Route = createFileRoute("/calculators/math/percentile-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Percentile & Quartile Calculator",
      title: "Percentile & Quartile Calculator — Q1 Q2 Q3 IQR",
      metaDescription:
        "Find quartiles (Q1, Q2, Q3), IQR, and any percentile using linear interpolation. Includes a box-plot visual and full step-by-step working.",
      canonicalUrl: "/calculators/math/percentile-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Percentile & Quartile Calculator", path: "/calculators/math/percentile-calculator" },
      ],
      faqs: [
        {
          q: "What's the difference between a percentile and a percentage?",
          a: "A percentage tells you how much of something you got — 87% on a test means 87 marks out of 100. A percentile tells you where you rank compared to everyone else — the 87th percentile means you scored higher than 87% of people who took the test.",
        },
        {
          q: "Why do different tools give different quartile values?",
          a: "There are at least nine defined ways to compute quartiles (the R quantile 'types'). The two most common are the exclusive method (median-of-halves, excluding the overall median for odd n) and the inclusive method (including the median in both halves). Excel's PERCENTILE / QUARTILE.INC uses linear interpolation across the full data; TI calculators use exclusive; some textbooks use inclusive. All are correct — they just draw the cut-points slightly differently, especially for small samples.",
        },
        {
          q: "Which method does this calculator use?",
          a: "For Q1, Q2 and Q3 we use the exclusive method (median-of-halves), matching the median used in the Mean/Median/Mode calculator. For arbitrary percentiles we use linear interpolation between closest ranks (rank = (P/100)·(n−1)), which is the same method NumPy's percentile and Excel's PERCENTILE.INC use by default.",
        },
        {
          q: "How is IQR used to spot outliers?",
          a: "The standard rule (Tukey's fences) flags any value below Q1 − 1.5·IQR or above Q3 + 1.5·IQR as a potential outlier, and beyond ±3·IQR as an extreme outlier. IQR captures the spread of the middle 50%, so points that fall far outside it are unusually far from the bulk of the data.",
        },
      ],
    }),
  component: PercentilePage,
});

/* ---------------- Math ---------------- */

/** Median of an already-sorted array. */
function medianOfSorted(arr: number[]): number {
  const n = arr.length;
  if (n === 0) return NaN;
  if (n % 2 === 1) return arr[(n - 1) / 2];
  return (arr[n / 2 - 1] + arr[n / 2]) / 2;
}

interface QuartileResult {
  sorted: number[];
  n: number;
  min: number;
  max: number;
  q1: number;
  q2: number;
  q3: number;
  iqr: number;
  lowerHalf: number[];
  upperHalf: number[];
  oddN: boolean;
  outlierFenceLow: number;
  outlierFenceHigh: number;
  outliers: number[];
}

/** Exclusive method: split sorted data at the median (excluded for odd n),
 *  Q1 = median of lower half, Q3 = median of upper half. */
function computeQuartiles(values: number[]): QuartileResult | { error: string } {
  if (values.length < 4) {
    return { error: "Need at least 4 values to compute quartiles reliably." };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const oddN = n % 2 === 1;
  const half = Math.floor(n / 2);
  const lowerHalf = sorted.slice(0, half);
  const upperHalf = oddN ? sorted.slice(half + 1) : sorted.slice(half);
  const q1 = medianOfSorted(lowerHalf);
  const q2 = medianOfSorted(sorted);
  const q3 = medianOfSorted(upperHalf);
  const iqr = q3 - q1;
  const outlierFenceLow = q1 - 1.5 * iqr;
  const outlierFenceHigh = q3 + 1.5 * iqr;
  const outliers = sorted.filter((v) => v < outlierFenceLow || v > outlierFenceHigh);
  return {
    sorted, n, min: sorted[0], max: sorted[n - 1],
    q1, q2, q3, iqr, lowerHalf, upperHalf, oddN,
    outlierFenceLow, outlierFenceHigh, outliers,
  };
}

interface PercentileResult {
  sorted: number[];
  n: number;
  p: number;
  rank: number;
  lowerIdx: number;
  upperIdx: number;
  lowerVal: number;
  upperVal: number;
  frac: number;
  value: number;
}

/** Linear interpolation between closest ranks (NumPy/Excel .INC default). */
function computePercentile(values: number[], p: number): PercentileResult | { error: string } {
  if (values.length < 2) return { error: "Need at least 2 values." };
  if (!Number.isFinite(p) || p < 0 || p > 100)
    return { error: "Percentile must be a number between 0 and 100." };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const rank = (p / 100) * (n - 1);
  const lowerIdx = Math.floor(rank);
  const upperIdx = Math.ceil(rank);
  const frac = rank - lowerIdx;
  const lowerVal = sorted[lowerIdx];
  const upperVal = sorted[upperIdx];
  const value = lowerVal + frac * (upperVal - lowerVal);
  return { sorted, n, p, rank, lowerIdx, upperIdx, lowerVal, upperVal, frac, value };
}

function fmt(n: number, dp = 4): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) return n.toExponential(3);
  return parseFloat(n.toFixed(dp)).toString();
}

/* ---------------- Box plot ---------------- */

function BoxPlot({
  min,
  q1,
  q2,
  q3,
  max,
  outliers = [],
  highlight,
}: {
  min: number;
  q1: number;
  q2: number;
  q3: number;
  max: number;
  outliers?: number[];
  highlight?: { value: number; label: string };
}) {
  const width = 640;
  const height = 180;
  const padL = 40;
  const padR = 40;
  const padT = 30;
  const boxTop = padT + 20;
  const boxBottom = boxTop + 70;
  const midY = (boxTop + boxBottom) / 2;
  const iw = width - padL - padR;

  const allValues = [min, max, ...outliers, ...(highlight ? [highlight.value] : [])];
  const domainMin = Math.min(...allValues);
  const domainMax = Math.max(...allValues);
  const pad = (domainMax - domainMin) * 0.06 || 1;
  const lo = domainMin - pad;
  const hi = domainMax + pad;
  const xTo = (v: number) => padL + ((v - lo) / (hi - lo)) * iw;

  // Whiskers extend to min/max EXCLUDING outliers
  const nonOutliers = [min, max].filter(
    (v) => !outliers.includes(v),
  );
  const whiskLo = nonOutliers.length > 0 ? Math.min(...nonOutliers, q1) : q1;
  const whiskHi = nonOutliers.length > 0 ? Math.max(...nonOutliers, q3) : q3;
  const actualWhiskLo = outliers.length > 0 ? Math.max(whiskLo, min) : min;
  const actualWhiskHi = outliers.length > 0 ? Math.min(whiskHi, max) : max;

  const ticks = 5;
  const xTicks = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Box plot showing minimum, first quartile, median, third quartile, and maximum"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
      >
        {/* Axis */}
        <line
          x1={padL}
          x2={width - padR}
          y1={height - 20}
          y2={height - 20}
          stroke="var(--color-foreground)"
          strokeWidth={1}
          opacity={0.6}
        />
        {xTicks.map((t, i) => {
          const x = xTo(t);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={height - 20} y2={height - 16} stroke="var(--color-foreground)" opacity={0.6} />
              <text x={x} y={height - 4} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">
                {fmt(Number(t.toFixed(2)), 2)}
              </text>
            </g>
          );
        })}

        {/* Whiskers */}
        <line
          x1={xTo(actualWhiskLo)}
          x2={xTo(q1)}
          y1={midY}
          y2={midY}
          stroke="var(--color-foreground)"
          strokeWidth={1.5}
        />
        <line
          x1={xTo(q3)}
          x2={xTo(actualWhiskHi)}
          y1={midY}
          y2={midY}
          stroke="var(--color-foreground)"
          strokeWidth={1.5}
        />
        {/* Whisker caps */}
        <line x1={xTo(actualWhiskLo)} x2={xTo(actualWhiskLo)} y1={midY - 10} y2={midY + 10} stroke="var(--color-foreground)" strokeWidth={1.5} />
        <line x1={xTo(actualWhiskHi)} x2={xTo(actualWhiskHi)} y1={midY - 10} y2={midY + 10} stroke="var(--color-foreground)" strokeWidth={1.5} />

        {/* Box */}
        <rect
          x={xTo(q1)}
          y={boxTop}
          width={xTo(q3) - xTo(q1)}
          height={boxBottom - boxTop}
          fill="var(--color-primary)"
          fillOpacity={0.18}
          stroke="var(--color-primary)"
          strokeWidth={2}
        />
        {/* Median line */}
        <line
          x1={xTo(q2)}
          x2={xTo(q2)}
          y1={boxTop}
          y2={boxBottom}
          stroke="var(--color-primary)"
          strokeWidth={3}
        />

        {/* Outliers as dots */}
        {outliers.map((v, i) => (
          <circle
            key={i}
            cx={xTo(v)}
            cy={midY}
            r={3.5}
            fill="var(--color-destructive, #ef4444)"
            stroke="var(--color-background)"
            strokeWidth={1}
          />
        ))}

        {/* Labels */}
        <text x={xTo(actualWhiskLo)} y={boxTop - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">min {fmt(min, 2)}</text>
        <text x={xTo(q1)} y={boxTop - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">Q1 {fmt(q1, 2)}</text>
        <text x={xTo(q2)} y={boxBottom + 14} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--color-primary)">median {fmt(q2, 2)}</text>
        <text x={xTo(q3)} y={boxTop - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">Q3 {fmt(q3, 2)}</text>
        <text x={xTo(actualWhiskHi)} y={boxTop - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">max {fmt(max, 2)}</text>

        {/* Highlighted percentile */}
        {highlight && (
          <g>
            <line
              x1={xTo(highlight.value)}
              x2={xTo(highlight.value)}
              y1={boxTop - 18}
              y2={boxBottom + 4}
              stroke="var(--color-destructive, #ef4444)"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
            <text
              x={xTo(highlight.value)}
              y={boxBottom + 26}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill="var(--color-destructive, #ef4444)"
            >
              {highlight.label} = {fmt(highlight.value, 2)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/* ---------------- Guide ---------------- */

const PCT_GUIDE: GuideCardItem[] = [
  {
    key: "quartiles",
    title: "1. Quartiles — Q1, Q2, Q3 split the data into four equal groups",
    explain:
      "Sort ascending, then split. Q2 is the median. Q1 is the median of the lower half (25% of the data falls below it); Q3 is the median of the upper half (75% falls below it). Together they carve the sorted data into four groups of roughly equal size.",
    formula: <>Q1 = 25th pct · Q2 = median · Q3 = 75th pct</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 90" className="w-full max-w-[220px]" aria-hidden>
          <line x1="15" y1="60" x2="205" y2="60" className="stroke-border" />
          {[15, 62, 110, 158, 205].map((x, i) => (
            <g key={i}>
              <line x1={x} y1="52" x2={x} y2="68" className="stroke-primary" />
              <text x={x} y="82" fontSize="9" textAnchor="middle" className="fill-muted-foreground">
                {["min", "Q1", "Q2", "Q3", "max"][i]}
              </text>
            </g>
          ))}
          <rect x="62" y="30" width="96" height="30" fill="rgba(59,130,246,0.15)" className="stroke-primary" />
          <line x1="110" y1="30" x2="110" y2="60" className="stroke-primary" strokeWidth={2} />
          <text x="38" y="25" fontSize="9" textAnchor="middle" className="fill-muted-foreground">25%</text>
          <text x="86" y="25" fontSize="9" textAnchor="middle" className="fill-muted-foreground">25%</text>
          <text x="134" y="25" fontSize="9" textAnchor="middle" className="fill-muted-foreground">25%</text>
          <text x="182" y="25" fontSize="9" textAnchor="middle" className="fill-muted-foreground">25%</text>
        </svg>
      </div>
    ),
    example: {
      given: "3, 5, 7, 8, 12, 13, 14, 18, 21 (n = 9)",
      substitute: "Q1 = med{3,5,7,8} · Q2 = 12 · Q3 = med{13,14,18,21}",
      answer: "Q1 = 6, Q2 = 12, Q3 = 16",
    },
  },
  {
    key: "percentile",
    title: "2. Arbitrary percentile — linear interpolation",
    explain:
      "For any P between 0 and 100, compute the fractional rank r = (P/100)·(n − 1). If r isn't an integer, slide between the two neighbouring sorted values proportionally. This is what NumPy percentile and Excel PERCENTILE.INC use by default.",
    formula: (
      <>
        rank = (P / 100)·(n − 1){"\n"}
        value = sorted[⌊r⌋] + f·(sorted[⌈r⌉] − sorted[⌊r⌋])
      </>
    ),
    legend: [
      { sym: "P", def: "target percentile 0–100" },
      { sym: "n", def: "sample size" },
      { sym: "f", def: "fractional part of r" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 110" className="w-full max-w-[220px]" aria-hidden>
          <line x1="15" y1="80" x2="205" y2="80" className="stroke-border" />
          {[15, 55, 95, 135, 175, 205].map((x, i) => (
            <circle key={i} cx={x} cy="80" r="3" className="fill-primary" />
          ))}
          <line x1="150" y1="35" x2="150" y2="85" className="stroke-primary" strokeDasharray="3 3" strokeWidth={1.5} />
          <text x="150" y="28" fontSize="10" textAnchor="middle" className="fill-primary font-semibold">P90</text>
          <text x="135" y="100" fontSize="9" textAnchor="middle" className="fill-muted-foreground">lower</text>
          <text x="175" y="100" fontSize="9" textAnchor="middle" className="fill-muted-foreground">upper</text>
        </svg>
      </div>
    ),
    example: {
      given: "n = 10, P = 90",
      substitute: "rank = 0.9·9 = 8.1 → between sorted[8] and sorted[9]",
      answer: "value = sorted[8] + 0.1·(sorted[9] − sorted[8])",
    },
  },
  {
    key: "iqr",
    title: "3. IQR — spread of the middle 50%",
    explain:
      "IQR = Q3 − Q1 captures the spread of the middle half of the data. Unlike range (max − min), a single stray value can't distort it. Tukey's rule flags values beyond Q1 − 1.5·IQR or Q3 + 1.5·IQR as candidate outliers.",
    formula: (
      <>
        IQR = Q3 − Q1{"\n"}
        fences = [Q1 − 1.5·IQR , Q3 + 1.5·IQR]
      </>
    ),
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 100" className="w-full max-w-[220px]" aria-hidden>
          <line x1="15" y1="60" x2="205" y2="60" className="stroke-border" />
          <line x1="30" y1="55" x2="30" y2="65" className="stroke-muted-foreground" strokeDasharray="3 3" />
          <line x1="190" y1="55" x2="190" y2="65" className="stroke-muted-foreground" strokeDasharray="3 3" />
          <rect x="80" y="40" width="60" height="40" fill="rgba(59,130,246,0.15)" className="stroke-primary" />
          <line x1="110" y1="40" x2="110" y2="80" className="stroke-primary" strokeWidth={2} />
          <line x1="80" y1="60" x2="55" y2="60" className="stroke-foreground" />
          <line x1="140" y1="60" x2="165" y2="60" className="stroke-foreground" />
          <circle cx="205" cy="60" r="3" fill="rgb(239,68,68)" />
          <text x="110" y="35" fontSize="9" textAnchor="middle" className="fill-primary">IQR</text>
          <text x="205" y="92" fontSize="8" textAnchor="middle" fill="rgb(239,68,68)">outlier</text>
        </svg>
      </div>
    ),
    example: {
      given: "Q1 = 46.5, Q3 = 59.5",
      substitute: "IQR = 13 · upper fence = 59.5 + 1.5·13 = 79",
      answer: "value 240 > 79 → outlier",
    },
  },
  {
    key: "boxplot",
    title: "4. Reading a box plot",
    explain:
      "The box spans Q1 to Q3 — its width is the IQR. The line inside is the median. Whiskers reach to the extreme non-outlier values. Dots beyond the whiskers are outliers. A lopsided box or a median stuck near one end signals skew.",
    formula: <>box = [Q1 , Q3] · whiskers within 1.5·IQR fences</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 90" className="w-full max-w-[220px]" aria-hidden>
          <line x1="15" y1="45" x2="205" y2="45" className="stroke-border" />
          <line x1="30" y1="45" x2="70" y2="45" className="stroke-foreground" />
          <line x1="30" y1="38" x2="30" y2="52" className="stroke-foreground" />
          <rect x="70" y="28" width="80" height="34" fill="rgba(59,130,246,0.15)" className="stroke-primary" strokeWidth={2} />
          <line x1="105" y1="28" x2="105" y2="62" className="stroke-primary" strokeWidth={2.5} />
          <line x1="150" y1="45" x2="185" y2="45" className="stroke-foreground" />
          <line x1="185" y1="38" x2="185" y2="52" className="stroke-foreground" />
          <text x="70" y="78" fontSize="9" textAnchor="middle" className="fill-muted-foreground">Q1</text>
          <text x="105" y="78" fontSize="9" textAnchor="middle" className="fill-primary">med</text>
          <text x="150" y="78" fontSize="9" textAnchor="middle" className="fill-muted-foreground">Q3</text>
        </svg>
      </div>
    ),
    example: {
      given: "median near left edge of the box",
      substitute: "long right whisker, short left whisker",
      answer: "right-skewed distribution",
    },
  },
];

/* ---------------- Page ---------------- */



type Tab = "quartiles" | "percentile";

function PercentilePage() {
  const [tab, setTab] = useState<Tab>("quartiles");
  const [dataInput, setDataInput] = useState("7, 15, 36, 39, 40, 41, 42, 43, 47, 49");
  const [pInput, setPInput] = useState("90");

  const [qResult, setQResult] = useState<QuartileResult | null>(null);
  const [pResult, setPResult] = useState<PercentileResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const clearOutput = () => {
    setQResult(null);
    setPResult(null);
    setErr(null);
    setNotice(null);
  };

  const parseData = () => {
    const parsed = parseDataset(dataInput);
    if (parsed.invalid.length) {
      setErr(`"${parsed.invalid[0]}" is not a valid number.`);
      return null;
    }
    if (parsed.values.length === 0) {
      setErr("Enter at least one number.");
      return null;
    }
    if (parsed.cleaned > 0) {
      setNotice(
        `Cleaned ${parsed.cleaned} value${parsed.cleaned === 1 ? "" : "s"} — stripped currency symbols, thousand separators or stray punctuation.`,
      );
    }
    return parsed.values;
  };

  const computeQuartiles_ = () => {
    clearOutput();
    const vals = parseData();
    if (!vals) return;
    const res = computeQuartiles(vals);
    if ("error" in res) return setErr(res.error);
    setQResult(res);
  };

  const computePercentile_ = () => {
    clearOutput();
    const vals = parseData();
    if (!vals) return;
    const p = Number(pInput.trim());
    const res = computePercentile(vals, p);
    if ("error" in res) return setErr(res.error);
    setPResult(res);
  };

  const clear = () => {
    setDataInput("");
    setPInput("90");
    clearOutput();
  };

  const quartileSteps: Step[] = useMemo(() => {
    if (!qResult) return [];
    return [
      {
        title: "Sort the data",
        body: (
          <>
            <MathNote>Arrange the values from smallest to largest</MathNote>
            <MathLine>sorted: {qResult.sorted.map(fmt).join(", ")}</MathLine>
            <MathLine>n = {qResult.n}</MathLine>
          </>
        ),
      },
      {
        title: "Split into halves",
        body: (
          <>
            <MathNote>
              {qResult.oddN ? "n is odd — exclude the middle value from both halves" : "n is even — split evenly down the middle"}
            </MathNote>
            <MathLine>lower half = {qResult.lowerHalf.map(fmt).join(", ")}</MathLine>
            <MathLine>upper half = {qResult.upperHalf.map(fmt).join(", ")}</MathLine>
          </>
        ),
      },
      {
        title: "Find Q2 (the median)",
        body: (
          <>
            <MathNote>Q2 is the median of the full sorted data set</MathNote>
            <MathLine>Q2 = {fmt(qResult.q2)}</MathLine>
          </>
        ),
      },
      {
        title: "Find Q1 and Q3",
        body: (
          <>
            <MathNote>Q1 is the median of the lower half; Q3 is the median of the upper half</MathNote>
            <MathLine>Q1 = median(lower half) = {fmt(qResult.q1)}</MathLine>
            <MathLine>Q3 = median(upper half) = {fmt(qResult.q3)}</MathLine>
          </>
        ),
      },
      {
        title: "Compute the IQR",
        body: (
          <>
            <MathNote>The interquartile range measures the spread of the middle 50%</MathNote>
            <MathLine>IQR = Q3 − Q1</MathLine>
            <MathLine>IQR = {fmt(qResult.q3)} − {fmt(qResult.q1)}</MathLine>
            <MathLine>IQR = {fmt(qResult.iqr)}</MathLine>
          </>
        ),
      },
      {
        title: "Compute the outlier fences",
        body: (
          <>
            <MathNote>Tukey's rule: values outside 1.5·IQR of the box are potential outliers</MathNote>
            <MathLine>lower fence = Q1 − 1.5·IQR = {fmt(qResult.q1)} − 1.5×{fmt(qResult.iqr)} = {fmt(qResult.outlierFenceLow)}</MathLine>
            <MathLine>upper fence = Q3 + 1.5·IQR = {fmt(qResult.q3)} + 1.5×{fmt(qResult.iqr)} = {fmt(qResult.outlierFenceHigh)}</MathLine>
            {qResult.outliers.length > 0 && (
              <MathLine>outliers = {qResult.outliers.map(fmt).join(", ")}</MathLine>
            )}
          </>
        ),
      },
    ];
  }, [qResult]);

  const percentileSteps: Step[] = useMemo(() => {
    if (!pResult) return [];
    return [
      {
        title: "Sort the data",
        body: (
          <>
            <MathNote>Arrange the values from smallest to largest</MathNote>
            <MathLine>sorted: {pResult.sorted.map(fmt).join(", ")}</MathLine>
            <MathLine>n = {pResult.n}, P = {pResult.p}</MathLine>
          </>
        ),
      },
      {
        title: "Compute the fractional rank",
        body: (
          <>
            <MathNote>The rank locates where the P-th percentile falls among the sorted values</MathNote>
            <MathLine>r = (P / 100)·(n − 1)</MathLine>
            <MathLine>r = ({pResult.p} / 100)·({pResult.n} − 1)</MathLine>
            <MathLine>r = {fmt(pResult.rank)}</MathLine>
          </>
        ),
      },
      {
        title: "Identify the neighbouring ranks",
        body: (
          <>
            <MathNote>Take the sorted values immediately below and above the rank</MathNote>
            <MathLine>L = sorted[{pResult.lowerIdx}] = {fmt(pResult.lowerVal)}</MathLine>
            <MathLine>U = sorted[{pResult.upperIdx}] = {fmt(pResult.upperVal)}</MathLine>
            <MathLine>f = r − ⌊r⌋ = {fmt(pResult.frac)}</MathLine>
          </>
        ),
      },
      {
        title: "Interpolate linearly",
        body: (
          <>
            <MathNote>Slide proportionally between L and U using the fractional part f</MathNote>
            <MathLine>value = L + f·(U − L)</MathLine>
            <MathLine>value = {fmt(pResult.lowerVal)} + {fmt(pResult.frac)}×({fmt(pResult.upperVal)} − {fmt(pResult.lowerVal)})</MathLine>
            <MathLine>value = {fmt(pResult.value)}</MathLine>
          </>
        ),
      },
    ];
  }, [pResult]);

  const summary = useMemo(() => {
    if (qResult) {
      const lines = [
        `Quartiles (exclusive method), n = ${qResult.n}`,
        `Min = ${fmt(qResult.min)}`,
        `Q1  = ${fmt(qResult.q1)}`,
        `Q2 (median) = ${fmt(qResult.q2)}`,
        `Q3  = ${fmt(qResult.q3)}`,
        `Max = ${fmt(qResult.max)}`,
        `IQR = ${fmt(qResult.iqr)}`,
        `Outlier fences: [${fmt(qResult.outlierFenceLow)}, ${fmt(qResult.outlierFenceHigh)}]`,
      ];
      if (qResult.outliers.length) lines.push(`Outliers: ${qResult.outliers.map(fmt).join(", ")}`);
      return lines.join("\n");
    }
    if (pResult) {
      return [
        `Percentile P${pResult.p} = ${fmt(pResult.value)}`,
        `n = ${pResult.n}`,
        `Rank = ${fmt(pResult.rank)} (linear interpolation)`,
        `Between sorted[${pResult.lowerIdx}] = ${fmt(pResult.lowerVal)} and sorted[${pResult.upperIdx}] = ${fmt(pResult.upperVal)}`,
      ].join("\n");
    }
    return "";
  }, [qResult, pResult]);

  // Build a box-plot data source for either tab
  const boxData = useMemo(() => {
    if (qResult) {
      return {
        min: qResult.min,
        q1: qResult.q1,
        q2: qResult.q2,
        q3: qResult.q3,
        max: qResult.max,
        outliers: qResult.outliers,
        highlight: undefined as { value: number; label: string } | undefined,
      };
    }
    if (pResult) {
      const q = computeQuartiles(pResult.sorted);
      if ("error" in q) return null;
      return {
        min: q.min,
        q1: q.q1,
        q2: q.q2,
        q3: q.q3,
        max: q.max,
        outliers: q.outliers,
        highlight: { value: pResult.value, label: `P${pResult.p}` },
      };
    }
    return null;
  }, [qResult, pResult]);

  const tabBtn = (t: Tab, label: string) =>
    `flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      tab === t
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <MathCalcPage
      name="Percentile & Quartile Calculator"
      tagline="Compute quartiles (Q1, Q2, Q3) and the interquartile range (IQR), or find any percentile of your data using linear interpolation. Includes a box-plot visual."
      extras={
        <>
          <CalcSection title="Quartiles & percentiles explained, step by step">
            <p>
              Percentiles rank values against the rest of the data. Being in the 90th percentile on a test means you outscored 90% of the group — the raw score itself might be 78/100. Quartiles are just the three named percentiles (25th, 50th, 75th) that split sorted data into quarters. Each card below walks through one piece of the workflow this calculator runs.
            </p>
            <GuideCards items={PCT_GUIDE} />
            <p className="mt-4">
              For a full outlier workflow across the whole data set, pair this with the{" "}
              <Link to="/calculators/math/outliers-calculator" className="text-primary underline-offset-4 hover:underline">
                Outlier Detector Calculator
              </Link>
              , which applies Tukey's 1.5·IQR and 3·IQR fences and highlights every flagged value.
            </p>
          </CalcSection>

<CalcSection title="Common mistakes">
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Not sorting first.</strong> Quartiles are always computed on the sorted data — the original order tells you nothing.</li>
              <li><strong>Confusing percentile with percentage.</strong> A test score is a percentage of possible marks; a percentile is a rank against other people.</li>
              <li><strong>Expecting every tool to agree.</strong> Different quartile methods legitimately give slightly different Q1 and Q3 on small samples. Always state which method you used.</li>
              <li><strong>Treating any outlier as bad data.</strong> Tukey's fences flag <em>candidates</em>. Investigate — an outlier can be a data-entry error or the most interesting point in your sample.</li>
              <li><strong>Using IQR on tiny samples.</strong> With fewer than about 8 values, quartiles are jumpy — a single point can move them a lot.</li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Two sub-tools: full quartile breakdown, or any specific percentile from 0 to 100",
                "Quartiles use the exclusive median-of-halves method (matches this site's Median calculator)",
                "Arbitrary percentiles use linear interpolation between closest ranks (same as NumPy & Excel PERCENTILE.INC)",
                "Box plot showing min, Q1, median, Q3 and max — with potential outliers marked separately",
                "Automatic outlier detection using Tukey's 1.5·IQR fences",
                "Full step-by-step working — sorted data, rank, interpolation, IQR and outlier fences",
                "Copy the result summary or download the whole panel — box plot and steps — as an image",
              ]}
            />
          </CalcSection>


          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What's the difference between a percentile and a percentage?", a: <p>A percentage measures how much of something you got; a percentile measures how you rank against others. Scoring 87% on a test means 87 marks out of 100. Being in the 87th percentile means you outscored 87% of the people who took it.</p> },
                { q: "Why do different tools give different quartile values?", a: <p>There are multiple defined ways to compute quartiles (nine, in R's convention). The two most common are the exclusive method (median-of-halves, excluding the median for odd n) and the inclusive method. Excel's PERCENTILE.INC uses linear interpolation across the full data. All are correct — they just cut slightly differently, mainly on small samples.</p> },
                { q: "Which method does this calculator use?", a: <p>Q1, Q2, Q3 use the exclusive median-of-halves method, matching this site's Mean/Median/Mode calculator. Arbitrary percentiles use linear interpolation between closest ranks (rank = (P/100)·(n−1)) — NumPy's and Excel PERCENTILE.INC's default.</p> },
                { q: "How is IQR used to detect outliers?", a: <p>Tukey's rule flags values below Q1 − 1.5·IQR or above Q3 + 1.5·IQR as potential outliers, and beyond ±3·IQR as extreme outliers. This calculator highlights any it finds.</p> },
                { q: "Can a percentile equal one of my data points?", a: <p>Yes — whenever the fractional rank lands on a whole number, the percentile equals the value at that sorted position exactly, with no interpolation needed.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/mean-median-mode-calculator", label: "Mean, Median, Mode & Range Calculator" },
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
                { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
                { to: "/calculators/math/outliers-calculator", label: "Outlier Detector Calculator" },
                { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-full border border-border/60 bg-secondary/30 p-1">
          <button type="button" className={tabBtn("quartiles", "Quartiles")} onClick={() => { setTab("quartiles"); clearOutput(); }}>
            Quartiles &amp; IQR
          </button>
          <button type="button" className={tabBtn("percentile", "Percentile")} onClick={() => { setTab("percentile"); clearOutput(); }}>
            Find a percentile
          </button>
        </div>

        <Field label="Data set (comma, space, tab or newline separated)" htmlFor="data" hint="Handles pasted spreadsheet data; strips currency and thousand separators automatically.">
          <textarea
            id="data"
            value={dataInput}
            onChange={(e) => setDataInput(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="e.g. 7, 15, 36, 39, 40, 41, 42, 43, 47, 49"
          />
        </Field>

        {tab === "percentile" && (
          <Field label="Percentile P (0 – 100)" htmlFor="pval" hint="e.g. 90 for the 90th percentile.">
            <TextInput
              id="pval"
              value={pInput}
              onChange={(e) => setPInput(e.target.value)}
              inputMode="decimal"
              placeholder="90"
            />
          </Field>
        )}

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={tab === "quartiles" ? computeQuartiles_ : computePercentile_}>
            Calculate
          </PrimaryButton>
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

      {(qResult || pResult) && (
        <div className="mt-6 space-y-4">
          <ResultActions
            filename={qResult ? "quartiles-result" : "percentile-result"}
            captureRef={resultRef}
            getCopyText={() => summary}
          />
          <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
            {qResult && (
              <>
                <ResultBox
                  label="Quartiles (exclusive method)"
                  value={
                    <span className="tabular-nums">
                      Q1 = {fmt(qResult.q1)} · Q2 = {fmt(qResult.q2)} · Q3 = {fmt(qResult.q3)}
                    </span>
                  }
                  note={
                    <>
                      <div>IQR = Q3 − Q1 = <strong>{fmt(qResult.iqr)}</strong></div>
                      <div className="mt-1 text-xs">
                        min = {fmt(qResult.min)} · max = {fmt(qResult.max)} · n = {qResult.n}
                      </div>
                      {qResult.outliers.length > 0 && (
                        <div className="mt-1 text-xs">
                          <span className="text-destructive">Potential outliers:</span> {qResult.outliers.map(fmt).join(", ")}
                        </div>
                      )}
                    </>
                  }
                />
                <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                  <div className="mb-2 text-sm font-semibold text-foreground">Box plot</div>
                  {boxData && (
                    <BoxPlot
                      min={boxData.min}
                      q1={boxData.q1}
                      q2={boxData.q2}
                      q3={boxData.q3}
                      max={boxData.max}
                      outliers={boxData.outliers}
                    />
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Box = Q1 to Q3 (IQR). Line inside = median. Whiskers reach to the extremes inside Tukey's 1.5·IQR fences. Red dots are potential outliers.
                  </div>
                </div>
                <StepsToggle steps={quartileSteps} />
              </>
            )}

            {pResult && (
              <>
                <ResultBox
                  label={`Percentile P${pResult.p}`}
                  value={fmt(pResult.value)}
                  note={
                    <>
                      <div>Rank = {fmt(pResult.rank)} (linear interpolation)</div>
                      <div className="mt-1 text-xs">
                        Between sorted[{pResult.lowerIdx}] = {fmt(pResult.lowerVal)} and sorted[{pResult.upperIdx}] = {fmt(pResult.upperVal)} · n = {pResult.n}
                      </div>
                    </>
                  }
                />
                {boxData && (
                  <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                    <div className="mb-2 text-sm font-semibold text-foreground">
                      Box plot with P{pResult.p} marked
                    </div>
                    <BoxPlot
                      min={boxData.min}
                      q1={boxData.q1}
                      q2={boxData.q2}
                      q3={boxData.q3}
                      max={boxData.max}
                      outliers={boxData.outliers}
                      highlight={boxData.highlight}
                    />
                    <div className="mt-2 text-xs text-muted-foreground">
                      The red dashed marker shows where P{pResult.p} lands on the distribution.
                    </div>
                  </div>
                )}
                <StepsToggle steps={percentileSteps} />
              </>
            )}
          </div>
        </div>
      )}
    </MathCalcPage>
  );
}
