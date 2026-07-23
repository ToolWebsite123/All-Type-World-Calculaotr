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
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  FormulaBlock,
  FormulaWithLegend,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { CopyButton } from "@/components/CopyButton";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import type { ReactNode } from "react";
import {
  GroupedTable,
  ModeToggle,
  expandGroupedRows,
  type GroupedRow,
  type InputMode,
} from "@/components/GroupedDataInput";

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

export const Route = createFileRoute("/calculators/math/statistics-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Statistics Calculator",
      title: "Statistics Calculator — Mean, Median, SD, Variance & More",
      metaDescription:
        "Count, sum, mean, median, mode, range, geometric mean, plus population and sample variance and standard deviation — every formula labelled.",
      canonicalUrl: "/calculators/math/statistics-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Statistics Calculator", path: "/calculators/math/statistics-calculator" },
      ],
      faqs: [
        {
          q: "Should I use population or sample standard deviation?",
          a: "Use population (σ, denominator N) when your data set IS the entire population you care about — every student in a class, every product in a batch. Use sample (s, denominator N−1) when your data is a subset that you are using to estimate a larger population. When in doubt, sample standard deviation is the safer default because it does not understate variability.",
        },
        {
          q: "Why does sample standard deviation divide by N−1 instead of N?",
          a: "This is Bessel's correction. The sample mean is itself estimated from the data, which slightly reduces the apparent spread. Dividing by N−1 instead of N compensates for that bias and produces an unbiased estimator of the population variance.",
        },
        {
          q: "What is the geometric mean and when should I use it?",
          a: "The geometric mean is the Nth root of the product of N positive numbers. Use it for growth rates, ratios, index numbers or any values on different scales — anywhere multiplying makes more sense than adding. It only works on strictly positive data.",
        },
        {
          q: "Why is variance so much larger than standard deviation?",
          a: "Variance is standard deviation squared, and its units are also squared (e.g. dollars²). Standard deviation is in the original units of the data, which is why it is reported far more often. If your standard deviation is 10, your variance is 100 — same information, different units.",
        },
        {
          q: "Can this calculator handle negative numbers and decimals?",
          a: "Yes. Every statistic except the geometric mean works on any real numbers. The geometric mean requires all values to be positive and is reported as n/a otherwise.",
        },
      ],
    }),
  component: StatisticsPage,
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
  popVariance: number;
  popStdDev: number;
  sampleVariance: number | null;
  sampleStdDev: number | null;
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
  if (count % 2 === 1) median = sorted[(count - 1) / 2];
  else median = (sorted[count / 2 - 1] + sorted[count / 2]) / 2;

  // Mode
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

  // Geometric mean
  let geoMean: number | null = null;
  let geoNote: string | undefined;
  if (values.every((v) => v > 0)) {
    const logSum = values.reduce((s, v) => s + Math.log(v), 0);
    geoMean = Math.exp(logSum / count);
  } else {
    geoNote = "requires positive values";
  }

  // Variance & standard deviation
  const sqDev = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  const popVariance = sqDev / count;
  const popStdDev = Math.sqrt(popVariance);
  const sampleVariance = count > 1 ? sqDev / (count - 1) : null;
  const sampleStdDev = sampleVariance !== null ? Math.sqrt(sampleVariance) : null;

  return {
    values, sorted, count, sum, mean, median,
    modes, modeCount: maxFreq, range, min, max, geoMean, geoNote,
    popVariance, popStdDev, sampleVariance, sampleStdDev,
  };
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) return n.toExponential(6);
  return parseFloat(n.toPrecision(12)).toString();
}

/* ---------------- Bar chart with mean/median overlay ---------------- */

function StatsChart({ stats }: { stats: Stats }) {
  const [hover, setHover] = useState<number | null>(null);
  const { values, mean, median } = stats;
  const width = 640;
  const height = 280;
  const padL = 44;
  const padR = 90; // room for mean/median labels on the right
  const padT = 16;
  const padB = 40;
  const iw = width - padL - padR;
  const ih = height - padT - padB;

  const max = Math.max(0, ...values, mean, median);
  const min = Math.min(0, ...values, mean, median);
  const yRange = max - min || 1;
  const yToPx = (v: number) => padT + ih - ((v - min) / yRange) * ih;
  const zeroY = yToPx(0);

  const n = values.length;
  const gap = 6;
  const bw = Math.max(4, (iw - gap * (n - 1)) / n);

  const ticks = 4;
  const step = yRange / ticks;
  const tickVals: number[] = [];
  for (let i = 0; i <= ticks; i++) tickVals.push(min + step * i);

  const meanY = yToPx(mean);
  const medianY = yToPx(median);

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Bar chart of input values with mean and median overlay"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
      >
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
        {min < 0 && (
          <line x1={padL} x2={width - padR} y1={zeroY} y2={zeroY} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />
        )}

        {values.map((v, i) => {
          const x = padL + i * (bw + gap);
          const y = v >= 0 ? yToPx(v) : zeroY;
          const h = Math.abs(zeroY - yToPx(v));
          const isHover = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={y} width={bw} height={Math.max(1, h)} rx={3}
                fill="var(--color-primary)" opacity={isHover ? 1 : 0.75} />
              <text x={x + bw / 2} y={height - padB + 14} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">
                {fmt(v)}
              </text>
            </g>
          );
        })}

        {/* Mean line */}
        <line x1={padL} x2={width - padR} y1={meanY} y2={meanY}
          stroke="var(--color-primary)" strokeWidth={1.5} strokeDasharray="6 4" opacity={0.9} />
        <text x={width - padR + 6} y={meanY} dominantBaseline="middle" fontSize={11}
          fill="var(--color-primary)" fontWeight={600}>
          mean {fmt(Number(mean.toFixed(3)))}
        </text>

        {/* Median line */}
        <line x1={padL} x2={width - padR} y1={medianY} y2={medianY}
          stroke="var(--color-foreground)" strokeWidth={1.5} strokeDasharray="2 3" opacity={0.7} />
        <text x={width - padR + 6} y={medianY} dominantBaseline="middle" fontSize={11}
          fill="var(--color-foreground)" opacity={0.85}>
          median {fmt(Number(median.toFixed(3)))}
        </text>

        {hover !== null && (() => {
          const v = values[hover];
          const x = padL + hover * (bw + gap) + bw / 2;
          const y = v >= 0 ? yToPx(v) - 10 : yToPx(v) + 22;
          const label = `#${hover + 1}: ${fmt(v)}`;
          const tw = Math.max(48, label.length * 6.2 + 12);
          return (
            <g pointerEvents="none">
              <rect x={x - tw / 2} y={y - 14} width={tw} height={18} rx={4} fill="var(--color-foreground)" opacity={0.9} />
              <text x={x} y={y} textAnchor="middle" fontSize={11} fill="var(--color-background)">{label}</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

/* ---------------- Result table ---------------- */

function StatsTable({ stats }: { stats: Stats }) {
  const modeText =
    stats.modes.length === 0
      ? "No mode (all values are unique)"
      : `${stats.modes.map(fmt).join(", ")} — appeared ${stats.modeCount} times`;

  const rows: { label: string; value: string; note?: string }[] = [
    { label: "Count", value: fmt(stats.count) },
    { label: "Sum", value: fmt(stats.sum) },
    { label: "Mean (Average)", value: fmt(stats.mean), note: "x̄ = Σxᵢ / N" },
    { label: "Median", value: fmt(stats.median) },
    { label: "Mode", value: modeText },
    { label: "Largest", value: fmt(stats.max) },
    { label: "Smallest", value: fmt(stats.min) },
    { label: "Range", value: fmt(stats.range), note: "max − min" },
    {
      label: "Geometric Mean",
      value: stats.geoMean === null ? "n/a" : fmt(stats.geoMean),
      note: stats.geoNote ?? "(Πxᵢ)^(1/N)",
    },
    {
      label: "Standard Deviation (Population)",
      value: fmt(stats.popStdDev),
      note: "σ — divides by N (use when data is the entire population)",
    },
    {
      label: "Variance (Population)",
      value: fmt(stats.popVariance),
      note: "σ² — divides by N",
    },
    {
      label: "Sample Standard Deviation",
      value: stats.sampleStdDev === null ? "n/a (need N ≥ 2)" : fmt(stats.sampleStdDev),
      note: "s — divides by N−1 (Bessel's correction; use when estimating a larger population)",
    },
    {
      label: "Sample Variance",
      value: stats.sampleVariance === null ? "n/a (need N ≥ 2)" : fmt(stats.sampleVariance),
      note: "s² — divides by N−1",
    },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60">
      <table className="min-w-full text-left text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="odd:bg-background/40 border-b border-border/40 last:border-0 align-top">
              <th scope="row" className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{r.label}</th>
              <td className="px-3 py-2.5 tabular-nums text-foreground">{r.value}</td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Guide diagrams ---------------- */

function CenterDiagram() {
  return (
    <svg viewBox="0 0 240 120" className="w-full">
      <line x1="10" y1="80" x2="230" y2="80" className="stroke-border" strokeWidth="1" />
      {[20, 55, 90, 100, 110, 140, 200].map((x, i) => (
        <circle key={i} cx={x} cy="80" r="5" className="fill-primary/70" />
      ))}
      <line x1="102" y1="30" x2="102" y2="90" className="stroke-primary" strokeWidth="2" strokeDasharray="3 3" />
      <text x="102" y="24" textAnchor="middle" fontSize="10" className="fill-foreground">mean ≈ 102</text>
      <line x1="100" y1="80" x2="100" y2="105" className="stroke-foreground/60" strokeWidth="1" />
      <text x="100" y="115" textAnchor="middle" fontSize="9" className="fill-muted-foreground">median</text>
    </svg>
  );
}

function GeoMeanDiagram() {
  return (
    <svg viewBox="0 0 240 120" className="w-full">
      <rect x="20" y="60" width="30" height="40" className="fill-primary/40" />
      <text x="35" y="55" textAnchor="middle" fontSize="10" className="fill-foreground">2</text>
      <rect x="70" y="30" width="30" height="70" className="fill-primary/50" />
      <text x="85" y="25" textAnchor="middle" fontSize="10" className="fill-foreground">5</text>
      <rect x="120" y="15" width="30" height="85" className="fill-primary/60" />
      <text x="135" y="10" textAnchor="middle" fontSize="10" className="fill-foreground">8</text>
      <line x1="10" y1="100" x2="230" y2="100" className="stroke-border" />
      <text x="120" y="115" textAnchor="middle" fontSize="10" className="fill-muted-foreground">GM = ³√(2·5·8) ≈ 4.31</text>
    </svg>
  );
}

function PopVsSampleDiagram() {
  return (
    <svg viewBox="0 0 240 120" className="w-full">
      <ellipse cx="120" cy="60" rx="105" ry="45" className="fill-primary/10 stroke-primary/40" strokeDasharray="4 3" />
      <text x="120" y="20" textAnchor="middle" fontSize="10" className="fill-muted-foreground">population (÷ N)</text>
      <ellipse cx="120" cy="65" rx="45" ry="22" className="fill-primary/30 stroke-primary" />
      <text x="120" y="68" textAnchor="middle" fontSize="10" className="fill-foreground" fontWeight={600}>sample (÷ N−1)</text>
    </svg>
  );
}

function VarianceDiagram() {
  return (
    <svg viewBox="0 0 240 120" className="w-full">
      <line x1="10" y1="80" x2="230" y2="80" className="stroke-border" />
      <line x1="120" y1="20" x2="120" y2="90" className="stroke-primary" strokeDasharray="3 3" />
      <text x="120" y="14" textAnchor="middle" fontSize="10" className="fill-foreground">mean</text>
      {[60, 90, 150, 190].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="80" r="4" className="fill-primary/70" />
          <line x1={x} y1="80" x2="120" y2="80" className="stroke-primary/60" strokeDasharray="2 2" />
        </g>
      ))}
      <text x="120" y="115" textAnchor="middle" fontSize="9" className="fill-muted-foreground">variance = mean of squared deviations</text>
    </svg>
  );
}

const STATS_GUIDE: GuideCardItem[] = [
  {
    key: "center",
    title: "Center — mean and median",
    explain:
      "The mean is the arithmetic average and is sensitive to outliers. The median is the middle of the sorted list and is not. Reporting both — and letting the gap between them tell you about skew — is the fastest way to describe a data set's center.",
    formula: <>x̄ = (1/N)·Σ xᵢ &nbsp;·&nbsp; median = middle of sorted values</>,
    legend: [
      { sym: "x̄", def: "arithmetic mean" },
      { sym: "N", def: "count of values" },
      { sym: "xᵢ", def: "each value" },
    ],
    diagram: <CenterDiagram />,
    example: {
      given: "20, 55, 90, 100, 110, 140, 200",
      substitute: "sum = 715, N = 7 → mean = 715/7; median = 4th value = 100",
      answer: "mean ≈ 102.14, median = 100",
    },
  },
  {
    key: "geomean",
    title: "Geometric mean",
    explain:
      "The Nth root of the product of N positive values. Use it for growth rates, ratios and any values on very different scales — the geometric mean treats a 2× change in one factor the same as a 2× change in another, which the arithmetic mean cannot.",
    formula: <>GM = (x₁·x₂·…·xₙ)^(1/N)</>,
    legend: [
      { sym: "GM", def: "geometric mean" },
      { sym: "xᵢ", def: "each value (must be > 0)" },
      { sym: "N", def: "number of values" },
    ],
    diagram: <GeoMeanDiagram />,
    example: {
      given: "2, 5, 8",
      substitute: "(2·5·8)^(1/3) = 80^(1/3)",
      answer: "≈ 4.31 (arithmetic mean = 5)",
    },
  },
  {
    key: "pop-vs-sample",
    title: "Population vs sample standard deviation",
    explain:
      "Both measure spread around the mean. Use population σ (divide by N) when your data is the whole population. Use sample s (divide by N−1, Bessel's correction) when your data is a subset used to estimate a bigger population — the correction stops it under-reporting variability.",
    formula: (
      <>σ = √( Σ(xᵢ − μ)² / N ) &nbsp;·&nbsp; s = √( Σ(xᵢ − x̄)² / (N − 1) )</>
    ),
    legend: [
      { sym: "σ", def: "population standard deviation" },
      { sym: "s", def: "sample standard deviation" },
      { sym: "μ / x̄", def: "population / sample mean" },
    ],
    diagram: <PopVsSampleDiagram />,
    example: {
      given: "2, 4, 4, 4, 5 — mean = 3.8",
      substitute: "Σ(xᵢ − 3.8)² = 4.8 → σ² = 4.8/5, s² = 4.8/4",
      answer: "σ ≈ 0.9798, s ≈ 1.0954",
    },
  },
  {
    key: "variance",
    title: "Variance",
    explain:
      "Variance is standard deviation squared — the mean of the squared distances from the mean. It's the workhorse in proofs (ANOVA, error propagation) but lives in the squared units of your data, which is why standard deviation is what people report.",
    formula: <>σ² = Σ(xᵢ − μ)² / N &nbsp;·&nbsp; s² = Σ(xᵢ − x̄)² / (N − 1)</>,
    legend: [
      { sym: "σ²", def: "population variance" },
      { sym: "s²", def: "sample variance" },
    ],
    diagram: <VarianceDiagram />,
    example: {
      given: "σ ≈ 0.9798, s ≈ 1.0954 (from the previous example)",
      substitute: "square each SD",
      answer: "σ² = 0.96, s² = 1.20",
    },
  },
];

/* ---------------- Page ---------------- */

function StatisticsPage() {
  const [input, setInput] = useState("10, 2, 38, 23, 38, 23, 21, 23");
  const [inputMode, setInputMode] = useState<InputMode>("raw");
  const [groupedRows, setGroupedRows] = useState<GroupedRow[]>([
    { value: "2", frequency: "1" },
    { value: "10", frequency: "1" },
    { value: "21", frequency: "1" },
    { value: "23", frequency: "3" },
    { value: "38", frequency: "2" },
  ]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [expansionNote, setExpansionNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const incoming = consumeDataset("/calculators/math/statistics-calculator");
    if (incoming) {
      setInput(incoming);
      setInputMode("raw");
    }
  }, []);

  const compute = () => {
    setErr(null);
    setStats(null);
    setNotice(null);
    setExpansionNote(null);
    if (inputMode === "grouped") {
      const { values, invalid } = expandGroupedRows(groupedRows);
      if (invalid) return setErr(invalid);
      if (values.length === 0) return setErr("Enter at least one row with a positive frequency.");
      setStats(computeStats(values));
      const pairs = groupedRows.filter((r) => {
        const f = Number(r.frequency);
        return r.value.trim() !== "" && Number.isFinite(f) && Number.isInteger(f) && f >= 1;
      });
      const preview = pairs
        .slice(0, 3)
        .map((r) => `${r.value}×${r.frequency}`)
        .join(", ") + (pairs.length > 3 ? ", …" : "");
      setExpansionNote(
        `Grouped input expanded into N = Σf = ${values.length} observation${values.length === 1 ? "" : "s"} (${preview}). Every statistic below is computed on that expanded dataset, so a value with frequency 3 contributes three identical terms wherever xᵢ appears — mean, (xᵢ − mean)², frequency table, etc.`,
      );
      return;
    }
    const { values, error, cleaned } = parseNumbers(input);
    if (error) return setErr(error);
    setStats(computeStats(values));
    if (cleaned > 0) setNotice(`Cleaned ${cleaned} value${cleaned === 1 ? "" : "s"} — stripped currency symbols, thousand separators or stray punctuation.`);
  };
  const clear = () => { setInput(""); setStats(null); setErr(null); setNotice(null); setExpansionNote(null); };


  const steps: Step[] = useMemo(() => {
    if (!stats) return [];
    const n = stats.count;
    const isOdd = n % 2 === 1;
    const midIdx = isOdd ? (n - 1) / 2 : n / 2 - 1;
    const sumTerms = stats.values.map(fmt).join(" + ");
    const sqDevTerms = stats.values
      .map((v) => `(${fmt(v)} − ${fmt(stats.mean)})²`)
      .join(" + ");
    const sqDevSum = stats.popVariance * stats.count;
    const productTerms = stats.values.map(fmt).join(" × ");

    return [
      {
        title: "Count and sum",
        body: (
          <>
            <MathNote>Count how many values there are, then add them all</MathNote>
            <MathLine>N = {n}</MathLine>
            <MathLine>Σ xᵢ = {sumTerms}</MathLine>
            <MathLine>Σ xᵢ = {fmt(stats.sum)}</MathLine>
          </>
        ),
      },
      {
        title: "Compute the mean",
        body: (
          <>
            <MathNote>Divide the sum by the count</MathNote>
            <MathLine>x̄ = Σxᵢ / N</MathLine>
            <MathLine>x̄ = {fmt(stats.sum)} / {n}</MathLine>
            <MathLine>x̄ = {fmt(stats.mean)}</MathLine>
          </>
        ),
      },
      {
        title: "Sort the data",
        body: (
          <>
            <MathNote>Arrange the values from smallest to largest</MathNote>
            <MathLine>sorted: {stats.sorted.map(fmt).join(", ")}</MathLine>
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
              <MathLine>mode = {stats.modes.map(fmt).join(", ")}</MathLine>
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
      {
        title: "Compute the geometric mean",
        body:
          stats.geoMean === null ? (
            <>
              <MathNote>The geometric mean requires every value to be strictly positive</MathNote>
              <MathLine>geometric mean = n/a ({stats.geoNote})</MathLine>
            </>
          ) : (
            <>
              <MathNote>Multiply every value together, then take the Nth root</MathNote>
              <MathLine>GM = (x₁ × x₂ × … × xₙ)^(1/N)</MathLine>
              <MathLine>GM = ({productTerms})^(1/{n})</MathLine>
              <MathLine>GM = {fmt(stats.geoMean)}</MathLine>
            </>
          ),
      },
      {
        title: "Sum of squared deviations",
        body: (
          <>
            <MathNote>Needed for both variance formulas — subtract the mean from each value, square it, then add</MathNote>
            <MathLine>SS = Σ(xᵢ − x̄)²</MathLine>
            <MathLine>SS = {sqDevTerms}</MathLine>
            <MathLine>SS = {fmt(sqDevSum)}</MathLine>
          </>
        ),
      },
      {
        title: "Population variance",
        body: (
          <>
            <MathNote>Divide the sum of squared deviations by N</MathNote>
            <MathLine>σ² = SS / N</MathLine>
            <MathLine>σ² = {fmt(sqDevSum)} / {n}</MathLine>
            <MathLine>σ² = {fmt(stats.popVariance)}</MathLine>
          </>
        ),
      },
      {
        title: "Population standard deviation",
        body: (
          <>
            <MathNote>Take the square root of the population variance</MathNote>
            <MathLine>σ = √σ²</MathLine>
            <MathLine>σ = √{fmt(stats.popVariance)}</MathLine>
            <MathLine>σ = {fmt(stats.popStdDev)}</MathLine>
          </>
        ),
      },
      {
        title: "Sample variance",
        body:
          stats.sampleVariance === null ? (
            <>
              <MathNote>Not defined — need at least 2 values</MathNote>
              <MathLine>s² = n/a</MathLine>
            </>
          ) : (
            <>
              <MathNote>Divide the sum of squared deviations by N − 1 (Bessel's correction)</MathNote>
              <MathLine>s² = SS / (N − 1)</MathLine>
              <MathLine>s² = {fmt(sqDevSum)} / ({n} − 1)</MathLine>
              <MathLine>s² = {fmt(stats.sampleVariance)}</MathLine>
            </>
          ),
      },
      {
        title: "Sample standard deviation",
        body:
          stats.sampleStdDev === null ? (
            <>
              <MathNote>Not defined — need at least 2 values</MathNote>
              <MathLine>s = n/a</MathLine>
            </>
          ) : (
            <>
              <MathNote>Take the square root of the sample variance</MathNote>
              <MathLine>s = √s²</MathLine>
              <MathLine>s = √{fmt(stats.sampleVariance!)}</MathLine>
              <MathLine>s = {fmt(stats.sampleStdDev)}</MathLine>
            </>
          ),
      },
    ];
  }, [stats]);

  const summary = useMemo(() => {
    if (!stats) return "";
    return [
      `Count: ${stats.count}`,
      `Sum: ${fmt(stats.sum)}`,
      `Mean: ${fmt(stats.mean)}`,
      `Median: ${fmt(stats.median)}`,
      `Mode: ${stats.modes.length ? stats.modes.map(fmt).join(", ") : "none"}`,
      `Range: ${fmt(stats.range)}`,
      `Geometric Mean: ${stats.geoMean === null ? "n/a" : fmt(stats.geoMean)}`,
      `Population SD (σ): ${fmt(stats.popStdDev)}`,
      `Population Variance (σ²): ${fmt(stats.popVariance)}`,
      `Sample SD (s): ${stats.sampleStdDev === null ? "n/a" : fmt(stats.sampleStdDev)}`,
      `Sample Variance (s²): ${stats.sampleVariance === null ? "n/a" : fmt(stats.sampleVariance)}`,
      `Sorted: ${stats.sorted.map(fmt).join(", ")}`,
    ].join("\n");
  }, [stats]);

  return (
    <MathCalcPage
      name="Statistics Calculator"
      tagline="Paste any list of numbers and get every standard summary statistic at once — with each formula labelled so there's no confusion between population and sample versions."
      extras={
        <>
          <CalcSection title="About this calculator">
            <p>
              Paste your data, hit Calculate, and get the full standard toolkit —
              center, spread, extremes and shape — in one place. For a deeper
              explanation of any individual measure, use the dedicated
              calculator below.
            </p>
          </CalcSection>

          <CalcSection title="Every summary statistic, measure by measure">
            <p className="text-sm text-muted-foreground">
              Each measure below gets a plain-English definition, the exact
              formula (with every symbol spelled out), a small diagram of
              what it's actually measuring, and a worked example — all in one
              card.
            </p>
            <GuideCards items={STATS_GUIDE} />
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Using population SD on a sample.</strong> Understates variability and biases every downstream statistic. If your data is a subset of a larger group, use the sample formula.</li>
              <li><strong>Confusing variance and standard deviation units.</strong> If heights are in cm, SD is in cm but variance is in cm². Never compare a variance directly to a raw data value.</li>
              <li><strong>Averaging percentages or growth rates with the arithmetic mean.</strong> Use the geometric mean, or averages compound incorrectly.</li>
              <li><strong>Reporting "the mode" when the data is multimodal.</strong> If two or more values tie for the top count, all of them are modes.</li>
              <li><strong>Treating range as a robust spread measure.</strong> A single outlier can inflate the range enormously; standard deviation and IQR are more stable.</li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Thirteen summary statistics in a single result table — count, sum, mean, median, mode, largest, smallest, range, geometric mean, population and sample standard deviation, population and sample variance",
                "Every formula labelled inline so you know whether N or N−1 was used — no more guessing which flavour of standard deviation you got",
                "Bar chart of your values with mean and median drawn as reference lines",
                "Multimodal-aware — reports every value tied for the top frequency",
                "Copy the full result set in one click; sorted data always shown for verification",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "When should I use population vs sample standard deviation?", a: <p>Population (divide by N) if the data IS the entire group of interest. Sample (divide by N−1) if the data is a subset used to estimate a larger population. When in doubt, use the sample formula.</p> },
                { q: "Why is my variance so large compared to the standard deviation?", a: <p>Variance = SD². It's on the squared scale of the data, which is why standard deviation is what people usually report.</p> },
                { q: "Can I compute the geometric mean of negative numbers?", a: <p>No — it's only defined for strictly positive values. This calculator shows "n/a" when any value is zero or negative.</p> },
                { q: "How many numbers can I enter?", a: <p>There's no hard cap. The bar chart stays readable up to a few dozen values; the numeric results are exact for any length.</p> },
                { q: "Does this handle repeated values correctly?", a: <p>Yes — repeated values are counted every time. That's what drives the mode calculation and is the reason the mean/median can differ from what you'd get from de-duplicated data.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/mean-median-mode-calculator", label: "Mean, Median, Mode, Range Calculator" },
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
                { to: "/calculators/math/sample-size-calculator", label: "Sample Size Calculator" },
                { to: "/calculators/math/weighted-mean-calculator", label: "Weighted Mean Calculator" },
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
            label="Values (comma or space separated)"
            htmlFor="stats-input"
            hint="Example: 10, 2, 38, 23, 38, 23, 21, 23"
          >
            <textarea
              id="stats-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. 10, 2, 38, 23, 38, 23, 21, 23"
            />
          </Field>
        ) : (
          <Field
            label="Grouped data"
            htmlFor="stats-grouped"
            hint="Enter each distinct value with how many times it appears. Rows are expanded internally into the equivalent dataset."
          >
            <div id="stats-grouped">
              <GroupedTable rows={groupedRows} onChange={setGroupedRows} />
            </div>
          </Field>
        )}

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center justify-center rounded-full border border-border bg-secondary/40 px-5 py-2.5 text-sm font-medium text-foreground hover:border-primary/40"
          >
            Clear
          </button>
        </div>

        {err && <ErrorBox message={err} />}
        {notice && (
          <div className="mt-2 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
            {notice}
          </div>
        )}
        {expansionNote && (
          <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
            {expansionNote}
          </div>
        )}


        {stats && (
          <div className="mt-4 space-y-4">
            <ResultActions
              filename="statistics-result"
              captureRef={resultRef}
              getCopyText={() => summary}
            />
            <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Result
              </div>
              <CopyButton text={summary} label="Copy all" />
            </div>

            <StatsTable stats={stats} />

            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Sorted data: </span>
              <span className="tabular-nums">{stats.sorted.map(fmt).join(", ")}</span>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
              <StatsChart stats={stats} />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span><span className="inline-block w-3 border-t-2 border-dashed align-middle" style={{ borderColor: "var(--color-primary)" }} /> mean</span>
                <span><span className="inline-block w-3 border-t-2 border-dotted align-middle" style={{ borderColor: "var(--color-foreground)" }} /> median</span>
              </div>
            </div>
            <StepsToggle steps={steps} />
            </div>
            <SendDatasetActions
              currentPath="/calculators/math/statistics-calculator"
              getDataset={() => {
                if (inputMode === "grouped") {
                  const { values } = expandGroupedRows(groupedRows);
                  return values.join(", ");
                }
                return input;
              }}
            />
          </div>
        )}

      </div>
    </MathCalcPage>
  );
}
