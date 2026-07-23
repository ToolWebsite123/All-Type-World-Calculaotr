import { createFileRoute, Link } from "@tanstack/react-router";
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

export const Route = createFileRoute("/calculators/math/five-number-summary-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Five Number Summary Calculator",
      title: "Five Number Summary — Min, Q1, Median, Q3, Max",
      metaDescription:
        "Compute the five number summary and IQR from any list of numbers. Exclusive quartile method with a box plot and full step-by-step working.",
      canonicalUrl: "/calculators/math/five-number-summary-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Five Number Summary Calculator", path: "/calculators/math/five-number-summary-calculator" },
      ],
      faqs: [
        {
          q: "What is the five number summary?",
          a: "The five number summary is a set of five values that describe a dataset's spread and center: the minimum, first quartile (Q1), median (Q2), third quartile (Q3), and maximum. Together with the IQR (Q3 − Q1), it forms the basis of the box plot.",
        },
        {
          q: "Which quartile method does this calculator use?",
          a: "It uses the exclusive method (median-of-halves): the data is sorted, the overall median is found, and Q1/Q3 are the medians of the lower/upper halves — excluding the overall median from both halves when n is odd. This matches the Percentile & Quartile Calculator on this site and the method used by TI calculators.",
        },
        {
          q: "Why do other tools give different quartile values?",
          a: "There are at least nine defined methods for quartiles (the R quantile 'types'). Excel's QUARTILE.INC uses linear interpolation and includes the median in both halves; TI-83/84 and this calculator use the exclusive method. All are mathematically valid — for small samples, the cut-points just land in slightly different places.",
        },
        {
          q: "What is the IQR used for?",
          a: "The interquartile range (IQR = Q3 − Q1) captures the spread of the middle 50% of the data. It's the basis for Tukey's outlier fences: any point below Q1 − 1.5·IQR or above Q3 + 1.5·IQR is flagged as a potential outlier.",
        },
        {
          q: "How many values do I need?",
          a: "At least 4 values, so the halves each contain at least 2 values and Q1/Q3 are well-defined. More values give more meaningful quartiles.",
        },
        {
          q: "Do I have to sort the data first?",
          a: "No — the calculator sorts the data for you and shows the sorted list in the step-by-step working. But if you're doing this by hand, you must sort ascending before finding Min, Q1, median, Q3, or Max.",
        },
      ],
    }),
  component: FiveNumberSummaryPage,
});

/* ---------------- Math (matches Percentile & Quartile Calculator) ---------------- */

function medianOfSorted(arr: number[]): number {
  const n = arr.length;
  if (n === 0) return NaN;
  if (n % 2 === 1) return arr[(n - 1) / 2];
  return (arr[n / 2 - 1] + arr[n / 2]) / 2;
}

interface SummaryResult {
  sorted: number[];
  n: number;
  min: number;
  q1: number;
  q2: number;
  q3: number;
  max: number;
  iqr: number;
  lowerHalf: number[];
  upperHalf: number[];
  oddN: boolean;
}

function computeSummary(values: number[]): SummaryResult | { error: string } {
  if (values.length < 4) {
    return { error: "Need at least 4 values to compute the five number summary reliably." };
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
  return {
    sorted,
    n,
    min: sorted[0],
    max: sorted[n - 1],
    q1,
    q2,
    q3,
    iqr: q3 - q1,
    lowerHalf,
    upperHalf,
    oddN,
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
}: {
  min: number;
  q1: number;
  q2: number;
  q3: number;
  max: number;
}) {
  const width = 640;
  const height = 200;
  const padL = 40;
  const padR = 40;
  const padT = 30;
  const boxTop = padT + 20;
  const boxBottom = boxTop + 80;
  const midY = (boxTop + boxBottom) / 2;
  const iw = width - padL - padR;

  const pad = (max - min) * 0.08 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const xTo = (v: number) => padL + ((v - lo) / (hi - lo)) * iw;

  const ticks = 5;
  const xTicks = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Box plot showing minimum, Q1, median, Q3, and maximum"
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
        <line x1={xTo(min)} x2={xTo(q1)} y1={midY} y2={midY} stroke="var(--color-foreground)" strokeWidth={1.5} />
        <line x1={xTo(q3)} x2={xTo(max)} y1={midY} y2={midY} stroke="var(--color-foreground)" strokeWidth={1.5} />
        {/* Whisker caps */}
        <line x1={xTo(min)} x2={xTo(min)} y1={midY - 12} y2={midY + 12} stroke="var(--color-foreground)" strokeWidth={1.5} />
        <line x1={xTo(max)} x2={xTo(max)} y1={midY - 12} y2={midY + 12} stroke="var(--color-foreground)" strokeWidth={1.5} />

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

        {/* Labels above */}
        <text x={xTo(min)} y={boxTop - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">min {fmt(min, 2)}</text>
        <text x={xTo(q1)} y={boxTop - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">Q1 {fmt(q1, 2)}</text>
        <text x={xTo(q2)} y={boxBottom + 14} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--color-primary)">median {fmt(q2, 2)}</text>
        <text x={xTo(q3)} y={boxTop - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">Q3 {fmt(q3, 2)}</text>
        <text x={xTo(max)} y={boxTop - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">max {fmt(max, 2)}</text>
      </svg>
    </div>
  );
}

/* ---------------- Page ---------------- */

function FiveNumberSummaryPage() {
  const [dataInput, setDataInput] = useState("3, 7, 8, 5, 12, 14, 21, 13, 18");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setResult(null);
    setErr(null);
    setNotice(null);
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
    const res = computeSummary(parsed.values);
    if ("error" in res) return setErr(res.error);
    setResult(res);
  };

  const clear = () => {
    setDataInput("");
    setResult(null);
    setErr(null);
    setNotice(null);
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const n = result.n;
    const midPos = (n + 1) / 2;
    const lowerN = result.lowerHalf.length;
    const upperN = result.upperHalf.length;
    const lowerMidIsOdd = lowerN % 2 === 1;
    const upperMidIsOdd = upperN % 2 === 1;

    return [
      {
        title: "Sort the data",
        body: (
          <>
            <MathNote>Arrange the values from smallest to largest</MathNote>
            <MathLine>n = {n}</MathLine>
            <MathLine>sorted: {result.sorted.map((v) => fmt(v)).join(", ")}</MathLine>
          </>
        ),
      },
      {
        title: "Min and Max",
        body: (
          <>
            <MathNote>The minimum and maximum are the first and last sorted values</MathNote>
            <MathLine>min = {fmt(result.min)}</MathLine>
            <MathLine>max = {fmt(result.max)}</MathLine>
          </>
        ),
      },
      {
        title: "Find the median (Q2)",
        body: (
          <>
            <MathNote>
              n = {n} ({result.oddN ? "odd" : "even"}) —{" "}
              {result.oddN
                ? "the median is the middle value of the sorted list"
                : "the median is the average of the two middle values"}
            </MathNote>
            {result.oddN ? (
              <>
                <MathLine>position = (n + 1) / 2 = {midPos}</MathLine>
                <MathLine>Q2 = {fmt(result.q2)}</MathLine>
              </>
            ) : (
              <MathLine>Q2 = {fmt(result.q2)}</MathLine>
            )}
          </>
        ),
      },
      {
        title: "Split into lower and upper halves",
        body: (
          <>
            <MathNote>
              {result.oddN
                ? "n is odd, so the overall median is excluded from both halves"
                : "n is even, so the sorted list splits evenly in half"}
            </MathNote>
            <MathLine>lower half: {result.lowerHalf.map((v) => fmt(v)).join(", ")}</MathLine>
            <MathLine>upper half: {result.upperHalf.map((v) => fmt(v)).join(", ")}</MathLine>
          </>
        ),
      },
      {
        title: "Find Q1 — median of the lower half",
        body: (
          <>
            <MathNote>
              Lower half has {lowerN} value{lowerN === 1 ? "" : "s"} ({lowerMidIsOdd ? "odd" : "even"}) —{" "}
              {lowerMidIsOdd
                ? "Q1 is its middle value"
                : "Q1 is the average of its two middle values"}
            </MathNote>
            {lowerMidIsOdd && (
              <MathLine>position = (n + 1) / 2 = {(lowerN + 1) / 2}</MathLine>
            )}
            <MathLine>Q1 = {fmt(result.q1)}</MathLine>
          </>
        ),
      },
      {
        title: "Find Q3 — median of the upper half",
        body: (
          <>
            <MathNote>
              Upper half has {upperN} value{upperN === 1 ? "" : "s"} ({upperMidIsOdd ? "odd" : "even"}) —{" "}
              {upperMidIsOdd
                ? "Q3 is its middle value"
                : "Q3 is the average of its two middle values"}
            </MathNote>
            {upperMidIsOdd && (
              <MathLine>position = (n + 1) / 2 = {(upperN + 1) / 2}</MathLine>
            )}
            <MathLine>Q3 = {fmt(result.q3)}</MathLine>
          </>
        ),
      },
      {
        title: "Compute the IQR",
        body: (
          <>
            <MathNote>The interquartile range measures the spread of the middle 50% of the data</MathNote>
            <MathLine>IQR = Q3 − Q1</MathLine>
            <MathLine>IQR = {fmt(result.q3)} − {fmt(result.q1)}</MathLine>
            <MathLine>IQR = {fmt(result.iqr)}</MathLine>
          </>
        ),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    return [
      `Five number summary (exclusive quartile method), n = ${result.n}`,
      `Min    = ${fmt(result.min)}`,
      `Q1     = ${fmt(result.q1)}`,
      `Median = ${fmt(result.q2)}`,
      `Q3     = ${fmt(result.q3)}`,
      `Max    = ${fmt(result.max)}`,
      `IQR    = ${fmt(result.iqr)}`,
    ].join("\n");
  }, [result]);
const FNS_GUIDE: GuideCardItem[] = [
  {
    key: "five",
    title: "1. The five values that summarise a dataset",
    explain:
      "Min and max mark the extremes. Q1 sits a quarter of the way in, Q3 three-quarters in, and the median (Q2) is dead centre. Together the five values split sorted data into four groups of roughly equal size.",
    formula: <>min · Q1 · median · Q3 · max</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 80" className="w-full max-w-[220px]" aria-hidden>
          <line x1="15" y1="50" x2="205" y2="50" className="stroke-border" />
          {[15, 62, 110, 158, 205].map((x, i) => (
            <g key={i}>
              <line x1={x} y1="42" x2={x} y2="58" className="stroke-primary" strokeWidth={1.5} />
              <text x={x} y="72" fontSize="9" textAnchor="middle" className="fill-muted-foreground">
                {["min", "Q1", "med", "Q3", "max"][i]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    ),
    example: {
      given: "3, 5, 7, 8, 12, 13, 14, 18, 21",
      substitute: "min=3 · Q1=6 · med=12 · Q3=16 · max=21",
      answer: "5-number summary: 3, 6, 12, 16, 21",
    },
  },
  {
    key: "exclusive",
    title: "2. Exclusive method — median of each half",
    explain:
      "Sort. If n is odd, drop the overall median before splitting so each half has the same size. Q1 is the median of the lower half; Q3 is the median of the upper half. TI-83/84 calculators and this site's Percentile page use the same method.",
    formula: (
      <>
        1. sort ascending{"\n"}
        2. Q2 = middle value (or mean of two middle values){"\n"}
        3. if n odd, exclude Q2 before splitting{"\n"}
        4. Q1 = median of lower half · Q3 = median of upper half
      </>
    ),
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs font-serif italic">
        <div className="space-y-1 text-center">
          <div>3 &nbsp; 5 &nbsp; 7 &nbsp; 8 &nbsp; <span className="font-bold text-primary">12</span> &nbsp; 13 &nbsp; 14 &nbsp; 18 &nbsp; 21</div>
          <div className="text-muted-foreground">↙ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; drop &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ↘</div>
          <div>
            <span className="text-foreground">{"{3, 5, 7, 8}"}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-foreground">{"{13, 14, 18, 21}"}</span>
          </div>
          <div className="text-primary">Q1 = 6 &nbsp;·&nbsp; Q3 = 16</div>
        </div>
      </div>
    ),
    example: {
      given: "n = 9 (odd)",
      substitute: "median = 12, halves = {3,5,7,8} and {13,14,18,21}",
      answer: "Q1 = 6, Q3 = 16",
    },
  },
  {
    key: "iqr",
    title: "3. IQR — spread of the middle 50%",
    explain:
      "IQR = Q3 − Q1 captures how wide the middle 50% of the data is. Unlike range (max − min), a single stray value can't move it. When median sits closer to Q1, the distribution is right-skewed; closer to Q3, it's left-skewed.",
    formula: <>IQR = Q3 − Q1</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 90" className="w-full max-w-[220px]" aria-hidden>
          <line x1="15" y1="50" x2="205" y2="50" className="stroke-border" />
          <line x1="30" y1="50" x2="70" y2="50" className="stroke-foreground" />
          <line x1="30" y1="43" x2="30" y2="57" className="stroke-foreground" />
          <rect x="70" y="34" width="80" height="32" fill="rgba(59,130,246,0.15)" className="stroke-primary" strokeWidth={1.5} />
          <line x1="100" y1="34" x2="100" y2="66" className="stroke-primary" strokeWidth={2} />
          <line x1="150" y1="50" x2="185" y2="50" className="stroke-foreground" />
          <line x1="185" y1="43" x2="185" y2="57" className="stroke-foreground" />
          <text x="110" y="26" fontSize="9" textAnchor="middle" className="fill-primary">IQR</text>
        </svg>
      </div>
    ),
    example: {
      given: "Q1 = 6, Q3 = 16",
      substitute: "IQR = 16 − 6",
      answer: "IQR = 10 (middle 50% spans 10 units)",
    },
  },
  {
    key: "box",
    title: "4. Reading the box plot",
    explain:
      "The box spans Q1–Q3; the line inside is the median; whiskers reach min and max. A roughly symmetric box with the median in the middle means a symmetric distribution. A lopsided box or median stuck near one end signals skew.",
    formula: <>box = [Q1, Q3] · median line · whiskers = [min, max]</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 80" className="w-full max-w-[220px]" aria-hidden>
          <line x1="15" y1="40" x2="205" y2="40" className="stroke-border" />
          <line x1="30" y1="40" x2="70" y2="40" className="stroke-foreground" />
          <line x1="30" y1="33" x2="30" y2="47" className="stroke-foreground" />
          <rect x="70" y="25" width="80" height="30" fill="rgba(59,130,246,0.15)" className="stroke-primary" strokeWidth={2} />
          <line x1="95" y1="25" x2="95" y2="55" className="stroke-primary" strokeWidth={2.5} />
          <line x1="150" y1="40" x2="200" y2="40" className="stroke-foreground" />
          <line x1="200" y1="33" x2="200" y2="47" className="stroke-foreground" />
          <text x="95" y="70" fontSize="9" textAnchor="middle" className="fill-primary">median</text>
        </svg>
      </div>
    ),
    example: {
      given: "median sits close to Q1",
      substitute: "long right whisker",
      answer: "right-skewed distribution",
    },
  },
];


  return (
    <MathCalcPage
      name="Five Number Summary Calculator"
      tagline="Enter a list of numbers to get the minimum, Q1, median, Q3, and maximum — with a box plot and full step-by-step working."
      extras={
        <>
          <CalcSection title="Five number summary explained, step by step">
            <p>
              The five number summary is a compact, robust description of a dataset: <strong>min · Q1 · median · Q3 · max</strong>. Unlike the mean and standard deviation, a single extreme value shifts only the min or max — it barely moves the middle three, which is why this summary is preferred for skewed data. Each card below walks through one piece of the workflow this calculator runs.
            </p>
            <GuideCards items={FNS_GUIDE} />
            <p className="mt-3 text-sm">
              <strong>A real statistical nuance worth stating outright:</strong> there are at least nine defined methods for computing quartiles. Excel's <code>QUARTILE.INC</code> uses linear interpolation and includes the median in both halves; some textbooks use an inclusive median-of-halves. For small samples these methods can give slightly different Q1 and Q3 values. All are mathematically valid — they just draw the cut-points in slightly different places. If your textbook or software gives a different number, that's why. See the{" "}
              <Link to="/calculators/math/percentile-calculator" className="text-primary underline underline-offset-2">
                Percentile & Quartile Calculator
              </Link>{" "}
              on this site for the same exclusive method.
            </p>
          </CalcSection>

<CalcSection title="Five number summary vs standard deviation">
            <p>
              The two most common ways to summarise a dataset are:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Median + IQR (from the five number summary)</strong> — position-based. Unaffected by
                extreme values. Best for skewed data or when outliers are present.
              </li>
              <li>
                <strong>Mean + standard deviation</strong> — magnitude-based. A single very large or very small
                value pulls both the mean and the standard deviation. Best when data is roughly symmetric with no
                strong outliers.
              </li>
            </ul>
            <p>
              If you suspect outliers, first flag them with the{" "}
              <Link to="/calculators/math/outliers-calculator" className="text-primary underline underline-offset-2">
                Outlier Detector
              </Link>{" "}
              (Tukey's 1.5·IQR rule), then compare the median/IQR you get here against the mean and standard
              deviation from the{" "}
              <Link to="/calculators/math/standard-deviation-calculator" className="text-primary underline underline-offset-2">
                Standard Deviation Calculator
              </Link>
              . A large gap between the mean and the median is a strong hint that outliers are distorting the
              mean.
            </p>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Forgetting to sort.</strong> Min, Q1, median, Q3 and Max are all positional — they only
                make sense on sorted data. Reading them off unsorted data gives wrong answers.
              </li>
              <li>
                <strong>Assuming there's one true quartile.</strong> Different tools use different methods. If two
                calculators disagree on Q1 for the same data, both can be correct — check which method each uses.
              </li>
              <li>
                <strong>Including the median in both halves for odd n.</strong> The exclusive method drops the
                overall median before splitting; the inclusive method keeps it in both halves. Pick one and stick
                with it.
              </li>
              <li>
                <strong>Confusing IQR with range.</strong> Range = Max − Min (uses only the two extreme values).
                IQR = Q3 − Q1 (uses the middle 50% and ignores extremes).
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Computes all five summary values plus IQR in one step.",
                "Renders a labeled SVG box plot with whiskers to min/max and a median line inside the box.",
                "Shows the sorted data and every calculation step in a collapsible working panel.",
                "Uses the exclusive quartile method — the same method as the Percentile & Quartile Calculator on this site — so numbers agree across pages.",
                "Accepts messy input: commas, spaces, tabs, line breaks, currency symbols and thousand separators are cleaned automatically.",
                "Copy the result as text or download the box plot as a PNG.",
              ]}
            />
          </CalcSection>


          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is the five number summary used for?",
                  a: <p>To summarise a dataset's center and spread using position-based statistics that aren't distorted by outliers, and to draw a box plot for quick visual comparison of one or more distributions.</p>,
                },
                {
                  q: "Which quartile method does this page use?",
                  a: <p>The exclusive method (median-of-halves), matching the Percentile & Quartile Calculator on this site and the method used by TI-83/84 calculators.</p>,
                },
                {
                  q: "Why does Excel give me a different Q1?",
                  a: <p>Excel's <code>QUARTILE.INC</code> and <code>PERCENTILE.INC</code> use linear interpolation across all values, which includes the median in both halves. For small samples that produces a slightly different cut-point than the exclusive method used here. Both answers are correct under their respective definitions.</p>,
                },
                {
                  q: "How many values do I need?",
                  a: <p>At least 4. With fewer values the halves are too small to have a meaningful median.</p>,
                },
                {
                  q: "Do outliers change the five number summary?",
                  a: <p>They change the min and max directly, but Q1, the median, and Q3 barely move — that's the whole point of using a robust summary. To flag outliers explicitly, use the Outlier Detector.</p>,
                },
                {
                  q: "How is the box plot drawn?",
                  a: <p>The box spans Q1 to Q3, with a line inside at the median. Whiskers extend to the minimum and maximum. This is the classic Tukey box plot without outlier separation — for outlier-aware whiskers, use the Percentile & Quartile Calculator's box plot.</p>,
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/percentile-calculator", label: "Percentile & Quartile Calculator" },
                { to: "/calculators/math/outliers-calculator", label: "Outlier Detector" },
                { to: "/calculators/math/mean-median-mode-calculator", label: "Mean, Median, Mode, Range Calculator" },
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <Field label="Data set" htmlFor="fns-data" hint="Comma-, space-, or line-separated numbers.">
        <textarea
          id="fns-data"
          rows={4}
          value={dataInput}
          onChange={(e) => setDataInput(e.target.value)}
          placeholder="e.g. 3, 7, 8, 5, 12, 14, 21, 13, 18"
          className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </Field>

      <div className="mt-4 flex flex-wrap gap-3">
        <PrimaryButton onClick={compute}>Compute five number summary</PrimaryButton>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
        >
          Clear
        </button>
      </div>

      {err && <ErrorBox message={err} />}
      {notice && !err && (
        <div className="mt-4 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
          {notice}
        </div>
      )}

      {result && (
        <div ref={resultRef} className="mt-5 space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Five number summary
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: "Min", value: result.min },
                { label: "Q1", value: result.q1 },
                { label: "Median", value: result.q2 },
                { label: "Q3", value: result.q3 },
                { label: "Max", value: result.max },
              ].map((it) => (
                <div key={it.label} className="rounded-xl border border-border/60 bg-background/60 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{it.label}</div>
                  <div className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">
                    {fmt(it.value)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              IQR = Q3 − Q1 = <span className="tabular-nums text-foreground">{fmt(result.iqr)}</span> · n ={" "}
              <span className="tabular-nums text-foreground">{result.n}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Quartiles computed using the <strong>exclusive method</strong> (median-of-halves), matching the
              Percentile & Quartile Calculator on this site. Other methods (e.g. Excel <code>QUARTILE.INC</code>)
              may give slightly different Q1 / Q3 values.
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">Box plot</div>
            <BoxPlot
              min={result.min}
              q1={result.q1}
              q2={result.q2}
              q3={result.q3}
              max={result.max}
            />
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">Sorted data</div>
            <div className="font-serif italic text-xs break-words text-foreground">
              {result.sorted.map((v) => fmt(v)).join(", ")}
            </div>
          </div>

          <StepsToggle steps={steps} />

          <ResultActions
            getCopyText={() => summary}
            captureRef={resultRef}
            filename="five-number-summary"
          />
        </div>
      )}
    </MathCalcPage>
  );
}
