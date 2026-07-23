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

export const Route = createFileRoute("/calculators/math/outliers-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Outlier Detector",
      title: "Outlier Detector — Tukey's 1.5×IQR Rule with Box Plot",
      metaDescription:
        "Find outliers with Tukey's 1.5×IQR fences. Separates mild and extreme (3×IQR) outliers; shows Q1, Q3, IQR, fences and a box plot.",
      canonicalUrl: "/calculators/math/outliers-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Outlier Detector", path: "/calculators/math/outliers-calculator" },
      ],
      faqs: [
        {
          q: "Should outliers always be removed?",
          a: "No. An outlier is a value that looks unusual compared to the rest of the data — not automatically a wrong value. Deleting outliers by default can hide real signal (a fraud case, a breakthrough result, a genuinely tall person). Investigate first: check for data-entry mistakes, unit errors and duplicated rows. Remove only if you can justify it, and always report both versions of the analysis.",
        },
        {
          q: "What's the difference between a mild and an extreme outlier?",
          a: "Mild outliers fall beyond Tukey's 1.5×IQR fences but within 3×IQR of Q1 or Q3. Extreme outliers fall beyond 3×IQR — they're far enough out that they almost certainly deserve individual attention. Both are candidates for investigation, not automatic deletion.",
        },
        {
          q: "Why 1.5×IQR and not some other multiplier?",
          a: "Tukey chose 1.5 as a practical rule of thumb: on normally distributed data, about 0.7% of values fall outside the 1.5×IQR fences, so anything caught by the rule is genuinely unusual without being over-strict. The 3×IQR extreme fence catches only about 1 in 250,000 normal values.",
        },
        {
          q: "Does this work if my data is skewed?",
          a: "The IQR rule is more robust than mean-based rules (like ±3 standard deviations) because Q1, Q3 and IQR are unaffected by extreme values. But on strongly skewed data the rule will still flag more points on the long tail — those aren't errors, just genuine tail values. Consider a log transform first if your data is skewed by nature (income, response times, populations).",
        },
      ],
    }),
  component: OutliersPage,
});

/* ---------------- Math ---------------- */

function medianOfSorted(arr: number[]): number {
  const n = arr.length;
  if (n === 0) return NaN;
  if (n % 2 === 1) return arr[(n - 1) / 2];
  return (arr[n / 2 - 1] + arr[n / 2]) / 2;
}

interface OutlierResult {
  sorted: number[];
  n: number;
  min: number;
  max: number;
  q1: number;
  q2: number;
  q3: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  extremeLowerFence: number;
  extremeUpperFence: number;
  mildOutliers: number[];
  extremeOutliers: number[];
  cleanData: number[];
  oddN: boolean;
  lowerHalf: number[];
  upperHalf: number[];
}

function computeOutliers(values: number[]): OutlierResult | { error: string } {
  if (values.length < 4) {
    return { error: "Need at least 4 values to detect outliers reliably." };
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
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const extremeLowerFence = q1 - 3 * iqr;
  const extremeUpperFence = q3 + 3 * iqr;

  const extremeOutliers: number[] = [];
  const mildOutliers: number[] = [];
  const cleanData: number[] = [];
  for (const v of sorted) {
    if (v < extremeLowerFence || v > extremeUpperFence) extremeOutliers.push(v);
    else if (v < lowerFence || v > upperFence) mildOutliers.push(v);
    else cleanData.push(v);
  }
  return {
    sorted, n, min: sorted[0], max: sorted[n - 1],
    q1, q2, q3, iqr,
    lowerFence, upperFence, extremeLowerFence, extremeUpperFence,
    mildOutliers, extremeOutliers, cleanData,
    oddN, lowerHalf, upperHalf,
  };
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
  mildOutliers,
  extremeOutliers,
  lowerFence,
  upperFence,
}: {
  min: number;
  q1: number;
  q2: number;
  q3: number;
  max: number;
  mildOutliers: number[];
  extremeOutliers: number[];
  lowerFence: number;
  upperFence: number;
}) {
  const width = 640;
  const height = 200;
  const padL = 40;
  const padR = 40;
  const padT = 30;
  const boxTop = padT + 20;
  const boxBottom = boxTop + 70;
  const midY = (boxTop + boxBottom) / 2;
  const iw = width - padL - padR;

  const outliers = [...mildOutliers, ...extremeOutliers];
  const allValues = [min, max, q1, q3, lowerFence, upperFence, ...outliers];
  const domainMin = Math.min(...allValues);
  const domainMax = Math.max(...allValues);
  const pad = (domainMax - domainMin) * 0.06 || 1;
  const lo = domainMin - pad;
  const hi = domainMax + pad;
  const xTo = (v: number) => padL + ((v - lo) / (hi - lo)) * iw;

  // Whiskers extend to min/max EXCLUDING outliers
  const outlierSet = new Set(outliers);
  const inliers: number[] = [];
  // We only know min/max from full sorted; we need actual whisker endpoints from clean data.
  // Approx: whiskers reach the tightest of (min, upperFence) inside fences.
  // Use max inside fence as high whisker, min inside fence as low whisker.
  const nonOutMin = Math.max(min, lowerFence);
  const nonOutMax = Math.min(max, upperFence);
  // But if min itself is not an outlier, whisker extends there.
  const whiskLo = !outlierSet.has(min) ? min : nonOutMin;
  const whiskHi = !outlierSet.has(max) ? max : nonOutMax;
  void inliers;

  const ticks = 5;
  const xTicks = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Box plot with outliers marked beyond the whiskers"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
      >
        {/* Axis */}
        <line x1={padL} x2={width - padR} y1={height - 20} y2={height - 20} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />
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

        {/* Fence markers (dashed vertical lines) */}
        <line x1={xTo(lowerFence)} x2={xTo(lowerFence)} y1={boxTop - 12} y2={boxBottom + 12} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" opacity={0.5} />
        <line x1={xTo(upperFence)} x2={xTo(upperFence)} y1={boxTop - 12} y2={boxBottom + 12} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" opacity={0.5} />
        <text x={xTo(lowerFence)} y={boxBottom + 26} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">lower fence</text>
        <text x={xTo(upperFence)} y={boxBottom + 26} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">upper fence</text>

        {/* Whiskers */}
        <line x1={xTo(whiskLo)} x2={xTo(q1)} y1={midY} y2={midY} stroke="var(--color-foreground)" strokeWidth={1.5} />
        <line x1={xTo(q3)} x2={xTo(whiskHi)} y1={midY} y2={midY} stroke="var(--color-foreground)" strokeWidth={1.5} />
        <line x1={xTo(whiskLo)} x2={xTo(whiskLo)} y1={midY - 10} y2={midY + 10} stroke="var(--color-foreground)" strokeWidth={1.5} />
        <line x1={xTo(whiskHi)} x2={xTo(whiskHi)} y1={midY - 10} y2={midY + 10} stroke="var(--color-foreground)" strokeWidth={1.5} />

        {/* Box */}
        <rect x={xTo(q1)} y={boxTop} width={xTo(q3) - xTo(q1)} height={boxBottom - boxTop} fill="var(--color-primary)" fillOpacity={0.18} stroke="var(--color-primary)" strokeWidth={2} />
        <line x1={xTo(q2)} x2={xTo(q2)} y1={boxTop} y2={boxBottom} stroke="var(--color-primary)" strokeWidth={3} />

        {/* Mild outliers */}
        {mildOutliers.map((v, i) => (
          <circle key={`m${i}`} cx={xTo(v)} cy={midY} r={4} fill="var(--color-destructive, #ef4444)" fillOpacity={0.35} stroke="var(--color-destructive, #ef4444)" strokeWidth={1.5} />
        ))}
        {/* Extreme outliers (filled) */}
        {extremeOutliers.map((v, i) => (
          <g key={`e${i}`}>
            <circle cx={xTo(v)} cy={midY} r={5} fill="var(--color-destructive, #ef4444)" stroke="var(--color-background)" strokeWidth={1.5} />
            <text x={xTo(v)} y={midY - 12} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--color-destructive, #ef4444)">extreme</text>
          </g>
        ))}

        {/* Labels */}
        <text x={xTo(q1)} y={boxTop - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">Q1 {fmt(q1, 2)}</text>
        <text x={xTo(q2)} y={boxBottom + 14} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--color-primary)">median {fmt(q2, 2)}</text>
        <text x={xTo(q3)} y={boxTop - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">Q3 {fmt(q3, 2)}</text>
      </svg>
    </div>
  );
}

/* ---------------- Page ---------------- */

function OutliersPage() {
  const [dataInput, setDataInput] = useState("42, 45, 48, 50, 52, 55, 58, 61, 240");
  const [result, setResult] = useState<OutlierResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const clearOutput = () => {
    setResult(null);
    setErr(null);
    setNotice(null);
  };

  const compute = () => {
    clearOutput();
    const parsed = parseDataset(dataInput);
    if (parsed.invalid.length) {
      setErr(`"${parsed.invalid[0]}" is not a valid number.`);
      return;
    }
    if (parsed.values.length === 0) {
      setErr("Enter at least one number.");
      return;
    }
    if (parsed.cleaned > 0) {
      setNotice(
        `Cleaned ${parsed.cleaned} value${parsed.cleaned === 1 ? "" : "s"} — stripped currency symbols, thousand separators or stray punctuation.`,
      );
    }
    const res = computeOutliers(parsed.values);
    if ("error" in res) return setErr(res.error);
    setResult(res);
  };

  const clear = () => {
    setDataInput("");
    clearOutput();
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const flagged = [...result.mildOutliers, ...result.extremeOutliers];
    return [
      {
        title: "Sort the data",
        body: (
          <>
            <MathNote>Arrange the values from smallest to largest (n = {result.n})</MathNote>
            <MathLine>sorted: {result.sorted.map(fmt).join(", ")}</MathLine>
          </>
        ),
      },
      {
        title: "Split into halves",
        body: (
          <>
            <MathNote>
              {result.oddN
                ? "N is odd — exclude the middle value, then split the rest into a lower and upper half"
                : "N is even — split the sorted list down the middle"}
            </MathNote>
            <MathLine>lower half: {result.lowerHalf.map(fmt).join(", ")}</MathLine>
            <MathLine>upper half: {result.upperHalf.map(fmt).join(", ")}</MathLine>
          </>
        ),
      },
      {
        title: "Find Q1 and Q3",
        body: (
          <>
            <MathNote>Q1 is the median of the lower half; Q3 is the median of the upper half</MathNote>
            <MathLine>Q1 = {fmt(result.q1)}</MathLine>
            <MathLine>Q3 = {fmt(result.q3)}</MathLine>
          </>
        ),
      },
      {
        title: "Compute the IQR",
        body: (
          <>
            <MathNote>The interquartile range is the width of the middle 50% of the data</MathNote>
            <MathLine>IQR = Q3 − Q1</MathLine>
            <MathLine>IQR = {fmt(result.q3)} − {fmt(result.q1)}</MathLine>
            <MathLine>IQR = {fmt(result.iqr)}</MathLine>
          </>
        ),
      },
      {
        title: "Compute the mild (1.5·IQR) fences",
        body: (
          <>
            <MathNote>Values beyond these fences are candidate mild outliers</MathNote>
            <MathLine>lower fence = Q1 − 1.5·IQR</MathLine>
            <MathLine>lower fence = {fmt(result.q1)} − 1.5·{fmt(result.iqr)} = {fmt(result.lowerFence)}</MathLine>
            <MathLine>upper fence = Q3 + 1.5·IQR</MathLine>
            <MathLine>upper fence = {fmt(result.q3)} + 1.5·{fmt(result.iqr)} = {fmt(result.upperFence)}</MathLine>
          </>
        ),
      },
      {
        title: "Compute the extreme (3·IQR) fences",
        body: (
          <>
            <MathNote>Values beyond these wider fences are extreme outliers</MathNote>
            <MathLine>extreme lower = Q1 − 3·IQR</MathLine>
            <MathLine>extreme lower = {fmt(result.q1)} − 3·{fmt(result.iqr)} = {fmt(result.extremeLowerFence)}</MathLine>
            <MathLine>extreme upper = Q3 + 3·IQR</MathLine>
            <MathLine>extreme upper = {fmt(result.q3)} + 3·{fmt(result.iqr)} = {fmt(result.extremeUpperFence)}</MathLine>
          </>
        ),
      },
      {
        title: "Classify each value",
        body:
          flagged.length === 0 ? (
            <>
              <MathNote>Compare every value against the fences</MathNote>
              <MathLine>no values fall outside the 1.5·IQR fences</MathLine>
              <MathLine>outliers = none</MathLine>
            </>
          ) : (
            <>
              <MathNote>
                Beyond 3·IQR → extreme; beyond 1.5·IQR (but within 3·IQR) → mild; otherwise → normal
              </MathNote>
              {result.extremeOutliers.length > 0 && (
                <MathLine>extreme outliers = {result.extremeOutliers.map(fmt).join(", ")}</MathLine>
              )}
              {result.mildOutliers.length > 0 && (
                <MathLine>mild outliers = {result.mildOutliers.map(fmt).join(", ")}</MathLine>
              )}
            </>
          ),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    const lines = [
      `Outlier detection (Tukey 1.5·IQR), n = ${result.n}`,
      `Q1 = ${fmt(result.q1)}, Q3 = ${fmt(result.q3)}, IQR = ${fmt(result.iqr)}`,
      `Fences (1.5·IQR): [${fmt(result.lowerFence)}, ${fmt(result.upperFence)}]`,
      `Extreme fences (3·IQR): [${fmt(result.extremeLowerFence)}, ${fmt(result.extremeUpperFence)}]`,
    ];
    if (result.extremeOutliers.length) lines.push(`Extreme outliers: ${result.extremeOutliers.map(fmt).join(", ")}`);
    if (result.mildOutliers.length) lines.push(`Mild outliers: ${result.mildOutliers.map(fmt).join(", ")}`);
    if (!result.extremeOutliers.length && !result.mildOutliers.length) lines.push("No outliers detected.");
    return lines.join("\n");
  }, [result]);
const OUT_GUIDE: GuideCardItem[] = [
  {
    key: "what",
    title: "1. What counts as an outlier",
    explain:
      "An outlier is a value that sits unusually far from the rest of the data. It might be a genuine extreme (a CEO in a salary sample), a typo (240 typed instead of 24), or a unit mistake (kg mixed into a lb column). The detector's job is to flag candidates for you to investigate — never to silently prune them.",
    formula: <>outlier ≡ value far outside the bulk of the data</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 100" className="w-full max-w-[220px]" aria-hidden>
          <line x1="15" y1="60" x2="205" y2="60" className="stroke-border" />
          {[35, 45, 55, 65, 75, 85, 95].map((x, i) => (
            <circle key={i} cx={x} cy="60" r="3" className="fill-primary" />
          ))}
          <circle cx="195" cy="60" r="4" fill="rgb(239,68,68)" />
          <text x="195" y="45" fontSize="9" textAnchor="middle" fill="rgb(239,68,68)">outlier</text>
          <text x="65" y="80" fontSize="9" textAnchor="middle" className="fill-muted-foreground">bulk of the data</text>
        </svg>
      </div>
    ),
    example: {
      given: "42, 45, 48, 50, 52, 55, 58, 61, 240",
      substitute: "eight values cluster in the 40s–60s; 240 stands alone",
      answer: "240 is the outlier candidate",
    },
  },
  {
    key: "fence",
    title: "2. Tukey's 1.5·IQR fences — the mild outlier rule",
    explain:
      "The interquartile range (IQR = Q3 − Q1) is the width of the middle 50%. Anything more than 1.5·IQR beyond Q1 or Q3 is a mild outlier candidate. Because IQR uses only Q1 and Q3, extreme values can't inflate the rule the way they inflate mean ± 3σ.",
    formula: (
      <>
        IQR = Q3 − Q1{"\n"}
        lower = Q1 − 1.5·IQR &nbsp;·&nbsp; upper = Q3 + 1.5·IQR
      </>
    ),
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 90" className="w-full max-w-[220px]" aria-hidden>
          <line x1="15" y1="50" x2="205" y2="50" className="stroke-border" />
          <line x1="40" y1="42" x2="40" y2="58" className="stroke-muted-foreground" strokeDasharray="3 3" />
          <line x1="180" y1="42" x2="180" y2="58" className="stroke-muted-foreground" strokeDasharray="3 3" />
          <rect x="80" y="34" width="60" height="32" fill="rgba(59,130,246,0.15)" className="stroke-primary" />
          <line x1="110" y1="34" x2="110" y2="66" className="stroke-primary" strokeWidth={2} />
          <text x="40" y="80" fontSize="8" textAnchor="middle" className="fill-muted-foreground">lower fence</text>
          <text x="180" y="80" fontSize="8" textAnchor="middle" className="fill-muted-foreground">upper fence</text>
          <circle cx="205" cy="50" r="3.5" fill="rgb(239,68,68)" />
        </svg>
      </div>
    ),
    example: {
      given: "Q1 = 46.5, Q3 = 59.5, IQR = 13",
      substitute: "upper fence = 59.5 + 1.5·13 = 79",
      answer: "value 240 > 79 → mild outlier flagged",
    },
  },
  {
    key: "extreme",
    title: "3. Extreme outliers — 3·IQR fences",
    explain:
      "Values beyond Q1 − 3·IQR or Q3 + 3·IQR are flagged as extreme outliers. On normal data only about 1 in 250,000 values falls outside these fences — so anything that trips them almost always deserves individual investigation.",
    formula: <>extreme lower = Q1 − 3·IQR &nbsp;·&nbsp; extreme upper = Q3 + 3·IQR</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded-lg bg-primary/10 py-1 text-primary">safe zone: within 1.5·IQR</div>
          <div className="rounded-lg bg-orange-500/15 py-1" style={{ color: "rgb(234, 88, 12)" }}>mild: 1.5·IQR – 3·IQR</div>
          <div className="rounded-lg bg-destructive/15 py-1 text-destructive">extreme: beyond 3·IQR</div>
        </div>
      </div>
    ),
    example: {
      given: "Q3 = 59.5, IQR = 13",
      substitute: "extreme upper = 59.5 + 3·13 = 98.5",
      answer: "240 > 98.5 → extreme outlier",
    },
  },
  {
    key: "investigate",
    title: "4. Investigate — don't automatically delete",
    explain:
      "Removing every flagged value silently distorts your results and can hide the most important finding in the data. Instead: check the raw source, consider context, report both versions with and without the outlier, and prefer robust methods (median, IQR) when outliers are expected.",
    formula: <>flag → investigate → decide → report both versions</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 100" className="w-full max-w-[220px]" aria-hidden>
          {["Flag", "Check", "Decide", "Report"].map((t, i) => (
            <g key={t}>
              <rect x={10 + i * 52} y="40" width="45" height="22" rx="6" fill="rgba(59,130,246,0.15)" className="stroke-primary" />
              <text x={32.5 + i * 52} y="55" fontSize="9" textAnchor="middle" className="fill-foreground">{t}</text>
              {i < 3 && <text x={57 + i * 52} y="55" fontSize="12" textAnchor="middle" className="fill-primary">→</text>}
            </g>
          ))}
          <text x="110" y="82" fontSize="9" textAnchor="middle" className="fill-muted-foreground">never: flag → delete</text>
        </svg>
      </div>
    ),
    example: {
      given: "salary of 240 flagged as extreme",
      substitute: "check source: CEO in an analyst sample?",
      answer: "keep, and report the split analysis",
    },
  },
];


  return (
    <MathCalcPage
      name="Outlier Detector"
      tagline="Find outliers in a data set using Tukey's 1.5×IQR rule. Mild and extreme (3×IQR) outliers listed separately, with a box plot and step-by-step working."
      extras={
        <>
          <CalcSection title="Outlier detection explained, step by step">
            <p>
              An outlier is a value that sits unusually far from the rest of the data. It might distort averages, inflate standard deviations, and pull a regression line off course — but it's not automatically an error. Each card below walks through one piece of the workflow this calculator runs.
            </p>
            <GuideCards items={OUT_GUIDE} />
          </CalcSection>

<CalcSection title="Common mistakes">
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Deleting outliers by default.</strong> Investigate; don't silently prune.</li>
              <li><strong>Using ±3σ on skewed data.</strong> The mean and standard deviation are themselves pulled by outliers — that's why IQR fences are the safer default.</li>
              <li><strong>Forgetting to state the method.</strong> Different tools use different quartile conventions, so results can vary slightly on small samples.</li>
              <li><strong>Running the rule on tiny samples.</strong> With fewer than about 8 values, Q1 and Q3 are jumpy and the fences can flag half the data.</li>
              <li><strong>Confusing mild and extreme.</strong> A mild outlier is a candidate; an extreme outlier is almost always worth investigating individually.</li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Tukey's 1.5·IQR fences applied to Q1 and Q3 — the standard outlier rule",
                "Separates mild outliers (beyond 1.5·IQR) from extreme outliers (beyond 3·IQR)",
                "Box plot with individual outlier dots plotted beyond the whiskers",
                "Full step-by-step working — sorted data, Q1/Q3/IQR, fence formulas, and every flagged value",
                "Handles pasted spreadsheet data — commas, tabs, currency symbols and thousand separators",
                "Copy the summary or download the box plot and steps as an image",
              ]}
            />
          </CalcSection>



          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "Should outliers always be removed?", a: <p>No. Outliers are <em>candidates</em> for investigation. Remove them only if you can identify a specific cause (typo, unit error, duplicate row) and report your analysis both ways when they might change the conclusion.</p> },
                { q: "What's the difference between a mild and an extreme outlier?", a: <p>Mild outliers sit beyond Tukey's 1.5×IQR fences but within 3×IQR of Q1 or Q3. Extreme outliers sit beyond the 3×IQR fences — much further from the bulk of the data and almost always worth individual attention.</p> },
                { q: "Why 1.5×IQR?", a: <p>On normal data, about 0.7% of values fall outside the 1.5×IQR fences — unusual without being over-strict. The 3×IQR extreme fence catches roughly 1 in 250,000 normal values, so anything that trips it really is unusual.</p> },
                { q: "Is this the same rule a box plot uses?", a: <p>Yes. A standard box plot draws whiskers only to the extreme values inside the 1.5×IQR fences, and plots anything beyond them as individual dots. This calculator does exactly that.</p> },
                { q: "Does it work on skewed data?", a: <p>The rule is robust in the sense that Q1, Q3 and IQR aren't distorted by extreme values. But strongly skewed data will still see more points flagged on the long tail — those are usually genuine tail values, not errors. Consider a log transform first for naturally skewed data.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/percentile-calculator", label: "Percentile & Quartile Calculator" },
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
                { to: "/calculators/math/mean-median-mode-calculator", label: "Mean, Median, Mode & Range Calculator" },
                { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Data set (comma, space, tab or newline separated)" htmlFor="data" hint="Handles pasted spreadsheet data; strips currency and thousand separators automatically.">
          <textarea
            id="data"
            value={dataInput}
            onChange={(e) => setDataInput(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="e.g. 42, 45, 48, 50, 52, 55, 58, 61, 240"
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={compute}>Detect outliers</PrimaryButton>
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

      {result && (
        <div className="mt-6 space-y-4">
          <ResultActions
            filename="outliers-result"
            captureRef={resultRef}
            getCopyText={() => summary}
          />
          <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label={
                result.extremeOutliers.length + result.mildOutliers.length === 0
                  ? "No outliers detected"
                  : `${result.extremeOutliers.length + result.mildOutliers.length} outlier${result.extremeOutliers.length + result.mildOutliers.length === 1 ? "" : "s"} found`
              }
              value={
                <span className="tabular-nums">
                  Fences: [{fmt(result.lowerFence)}, {fmt(result.upperFence)}]
                </span>
              }
              note={
                <>
                  <div className="text-xs">
                    Q1 = {fmt(result.q1)} · Q3 = {fmt(result.q3)} · IQR = <strong>{fmt(result.iqr)}</strong> · n = {result.n}
                  </div>
                  {result.extremeOutliers.length > 0 && (
                    <div className="mt-1 text-xs">
                      <span className="text-destructive font-semibold">Extreme (3·IQR):</span> {result.extremeOutliers.map(fmt).join(", ")}
                    </div>
                  )}
                  {result.mildOutliers.length > 0 && (
                    <div className="mt-1 text-xs">
                      <span className="text-destructive">Mild (1.5·IQR):</span> {result.mildOutliers.map(fmt).join(", ")}
                    </div>
                  )}
                </>
              }
            />

            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-2 text-sm font-semibold text-foreground">Box plot with outliers</div>
              <BoxPlot
                min={result.min}
                q1={result.q1}
                q2={result.q2}
                q3={result.q3}
                max={result.max}
                mildOutliers={result.mildOutliers}
                extremeOutliers={result.extremeOutliers}
                lowerFence={result.lowerFence}
                upperFence={result.upperFence}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                Box = Q1 to Q3 (IQR). Whiskers reach the extremes inside the 1.5·IQR fences (dashed lines). Faded red dots = mild outliers, solid red dots = extreme (3·IQR) outliers.
              </div>
            </div>

            <StepsToggle steps={steps} />
          </div>
        </div>
      )}
    </MathCalcPage>
  );
}
