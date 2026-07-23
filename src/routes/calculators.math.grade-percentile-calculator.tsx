import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  MathCalcPage,
  CalcSection,
  CalcFAQ,
  FeatureList,
  RelatedLinks,
  Field,
  TextInput,
  PrimaryButton,
  ErrorBox,
  ResultBox,
  GuideCards,
  FormulaBlock,
  FormulaWithLegend,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import type { Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import type { ReactNode } from "react";
import { buildCalculatorSeo } from "@/components/SEO";
import { parseDataset } from "@/lib/math/parse-numbers";

const GRADE_GUIDE: GuideCardItem[] = [
  {
    key: "sort",
    title: "1. Sort the class list — position is everything",
    explain:
      "Tool 1 works on a list of raw scores. First step is to sort them ascending. Every score's percentile depends only on where it lands in that sorted list — the underlying numbers don't matter beyond ordering.",
    formula: <>sorted scores: x₍₁₎ ≤ x₍₂₎ ≤ … ≤ x₍ₙ₎</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 60" className="w-full max-w-[240px]" aria-hidden>
          {[55, 62, 68, 71, 74, 78, 82, 85, 91, 96].map((v, i) => (
            <g key={i}>
              <rect x={12 + i * 22} y="20" width="18" height="20" className={v === 78 ? "fill-primary" : "fill-primary/30"} />
              <text x={21 + i * 22} y="52" fontSize="8" textAnchor="middle" className="fill-muted-foreground">{v}</text>
            </g>
          ))}
        </svg>
      </div>
    ),
    example: {
      given: "10 scores, target 78",
      substitute: "sorted → index 5 (0-based)",
      answer: "rank r = 5",
    },
  },
  {
    key: "linear",
    title: "2. Linear-interpolation percentile (PERCENTILE.INC)",
    explain:
      "With rank r (0-indexed) and n scores, percentile = r / (n − 1) × 100. If the target falls between two class members, the calculator interpolates linearly — the same method Excel and NumPy use by default.",
    formula: <>P = r / (n − 1) × 100</>,
    legend: [
      { sym: "r", def: "0-based sorted position" },
      { sym: "n", def: "class size" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded bg-primary/10 py-1 text-primary">min → P = 0</div>
          <div className="rounded bg-primary/10 py-1 text-primary">median → P = 50</div>
          <div className="rounded bg-primary/10 py-1 text-primary">max → P = 100</div>
        </div>
      </div>
    ),
    example: {
      given: "r = 5, n = 10",
      substitute: "5 / 9 × 100",
      answer: "P ≈ 55.6",
    },
  },
  {
    key: "zscore",
    title: "3. Normal-distribution percentile (from μ and σ)",
    explain:
      "Tool 2 needs only the class mean and standard deviation. Convert the raw score to a z-score, then the percentile is the area to the left under the standard normal curve — Φ(z) × 100.",
    formula: (
      <>
        z = (x − μ) / σ &nbsp;·&nbsp; Percentile = Φ(z) × 100
      </>
    ),
    legend: [
      { sym: "x", def: "raw score" },
      { sym: "μ", def: "class mean" },
      { sym: "σ", def: "class SD" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 90" className="w-full max-w-[240px]" aria-hidden>
          <path d="M20 75 Q120 -5 220 75" className="fill-primary/20 stroke-primary" />
          <line x1="160" y1="30" x2="160" y2="75" className="stroke-primary" strokeDasharray="2 2" />
          <text x="160" y="88" fontSize="9" textAnchor="middle" className="fill-primary">x = 82</text>
          <text x="80" y="55" fontSize="9" textAnchor="middle" className="fill-muted-foreground">≈ 81%</text>
        </svg>
      </div>
    ),
    example: {
      given: "x=82, μ=75, σ=8",
      substitute: "Φ(0.875)",
      answer: "≈ 81st percentile",
    },
  },
  {
    key: "vs",
    title: "4. Percentile vs percentage — a common mix-up",
    explain:
      "A percentage score is what fraction of the exam a student got right. A percentile is how many classmates they beat. Scoring 82% might place a student at the 30th percentile in a high-performing class, or the 95th in a low-performing one.",
    formula: <>percentage → performance · percentile → rank</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded bg-primary/10 py-1 text-primary">82% ≠ 82nd percentile</div>
          <div className="rounded bg-primary/10 py-1 text-primary">depends on class distribution</div>
        </div>
      </div>
    ),
    example: {
      given: "82% score",
      substitute: "depends on class",
      answer: "any percentile",
    },
  },
];


export const Route = createFileRoute("/calculators/math/grade-percentile-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Grade Percentile Calculator",
      title: "Grade Percentile Calculator — Score Rank",
      metaDescription:
        "Find the percentile of any test score from a class list or from the class mean and standard deviation. Bell-curve visual and worked steps.",
      canonicalUrl: "/calculators/math/grade-percentile-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math Calculators", path: "/calculators/math" },
        {
          name: "Grade Percentile Calculator",
          path: "/calculators/math/grade-percentile-calculator",
        },
      ],
      faqs: [
        {
          q: "Is the 90th percentile the same as a 90% score?",
          a: "No. A 90% score means you got 90% of the questions right. Being in the 90th percentile means you scored higher than 90% of the people who took the same test. Those two numbers describe completely different things and often disagree — a 90% score can be the 60th percentile on an easy test, or the 99th percentile on a very hard one.",
        },
        {
          q: "What percentile is average?",
          a: "The 50th percentile — the median. Half the group scored at or below that value and half scored above it. Assuming a normal distribution, the 50th percentile is the mean.",
        },
        {
          q: "Which tool should I use — the class list or the mean and standard deviation?",
          a: "Use the class-list tool (Tool 1) whenever you actually have everyone's scores; it doesn't assume any distribution shape. Use the mean/standard-deviation tool (Tool 2) only when you don't have the individual scores and the distribution is roughly bell-shaped.",
        },
        {
          q: "Can two students have the same percentile?",
          a: "Yes — tied scores share the same percentile rank. If three students all scored 85 out of 100, they all sit at the same percentile.",
        },
        {
          q: "Which percentile method does this calculator use?",
          a: "The same linear-interpolation method as our Percentile & Quartile Calculator (matches NumPy's percentile and Excel's PERCENTILE.INC by default). For a score exactly matching a class member, the percentile is simply the rank divided by (n − 1) × 100.",
        },
      ],
    }),
  component: GradePercentilePage,
});

/* ================= Math ================= */

// Abramowitz & Stegun 7.1.26 — max error ~1.5e-7 (same as Z-score Calculator)
function erf(x: number): number {
  const sign = Math.sign(x) || 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}
function Phi(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function fmt(n: number, d = 4): string {
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n);
  return parseFloat(n.toFixed(d)).toString();
}

function ordinal(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  const suffix =
    Math.abs(rounded % 1) > 0
      ? "th"
      : (() => {
          const r = rounded % 100;
          if (r >= 11 && r <= 13) return "th";
          switch (r % 10) {
            case 1:
              return "st";
            case 2:
              return "nd";
            case 3:
              return "rd";
            default:
              return "th";
          }
        })();
  return `${rounded}${suffix}`;
}

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

/* ================= Bell curve (matches Z-score calc styling) ================= */

function BellCurve({
  z,
  percentile,
}: {
  z: number;
  percentile: number;
}) {
  const W = 520,
    H = 220;
  const padL = 30,
    padR = 20,
    padT = 20,
    padB = 40;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const XMIN = -4,
    XMAX = 4;
  const xToPx = (x: number) => padL + ((x - XMIN) / (XMAX - XMIN)) * iw;
  const pdf = (x: number) =>
    Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const yMax = pdf(0);
  const yToPx = (y: number) => padT + ih - (y / yMax) * ih;

  const N = 200;
  const curve: string[] = [];
  for (let i = 0; i <= N; i++) {
    const x = XMIN + ((XMAX - XMIN) * i) / N;
    curve.push(
      `${i === 0 ? "M" : "L"}${xToPx(x).toFixed(2)},${yToPx(pdf(x)).toFixed(2)}`,
    );
  }

  const hi = clamp(z, XMIN, XMAX);
  const shade: string[] = [`M${xToPx(XMIN).toFixed(2)},${yToPx(0).toFixed(2)}`];
  const M = 200;
  for (let i = 0; i <= M; i++) {
    const x = XMIN + ((hi - XMIN) * i) / M;
    shade.push(`L${xToPx(x).toFixed(2)},${yToPx(pdf(x)).toFixed(2)}`);
  }
  shade.push(`L${xToPx(hi).toFixed(2)},${yToPx(0).toFixed(2)} Z`);

  const ticks = [-3, -2, -1, 0, 1, 2, 3];
  const markerX = clamp(xToPx(hi), padL, W - padR);

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W }}
        role="img"
        aria-label={`Standard normal curve with score at z = ${fmt(z, 3)} shaded to the left, area = ${fmt(percentile, 2)}%`}
      >
        <path d={shade.join(" ")} className="fill-primary/25" />
        <path
          d={curve.join(" ")}
          className="stroke-primary"
          strokeWidth={1.8}
          fill="none"
        />
        <line
          x1={padL}
          y1={yToPx(0)}
          x2={W - padR}
          y2={yToPx(0)}
          className="stroke-border"
          strokeWidth={1}
        />
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={xToPx(t)}
              y1={yToPx(0)}
              x2={xToPx(t)}
              y2={yToPx(0) + 4}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={xToPx(t)}
              y={yToPx(0) + 18}
              textAnchor="middle"
              fontSize={11}
              className="fill-muted-foreground"
            >
              {t}
            </text>
          </g>
        ))}
        <line
          x1={markerX}
          y1={padT + 4}
          x2={markerX}
          y2={yToPx(0)}
          className="stroke-primary"
          strokeDasharray="3 3"
          strokeWidth={1.4}
        />
        <text
          x={markerX}
          y={padT}
          textAnchor="middle"
          fontSize={11}
          className="fill-primary font-serif italic"
        >
          z = {fmt(z, 3)}
        </text>
        <text
          x={markerX}
          y={yToPx(0) + 32}
          textAnchor="middle"
          fontSize={12}
          className="fill-primary font-semibold"
        >
          {ordinal(percentile)} percentile
        </text>
      </svg>
    </div>
  );
}

/* ================= Tool 1 — from class data ================= */

interface T1Result {
  sorted: number[];
  score: number;
  rank: number; // linear-interpolated position on the (n-1) sorted axis
  percentile: number;
  matchIdx: number | null; // exact match index in sorted[], if any
  belowCount: number;
  atOrBelowCount: number;
  steps: Step[];
}

/** Inverse of the Percentile & Quartile Calculator's percentile method:
 *  rank r on 0..(n-1) is defined by rank = (P/100)(n-1) and value(r)
 *  linearly interpolates between sorted[floor(r)] and sorted[ceil(r)].
 *  Given a score we solve for r and return P = r/(n-1) × 100.
 *
 *  For scores below the min or above the max we clamp to 0 or 100 —
 *  the interpolation is undefined outside the sample range. */
function scoreToPercentile(sorted: number[], score: number): number {
  const n = sorted.length;
  if (score <= sorted[0]) return 0;
  if (score >= sorted[n - 1]) return 100;
  // Find bracket where sorted[i] <= score <= sorted[i+1]
  for (let i = 0; i < n - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (score >= lo && score <= hi) {
      // Handle a run of equal values: land at the top of the run so the
      // percentile matches the "at-or-below" reading a student expects.
      if (hi === lo) continue;
      const frac = (score - lo) / (hi - lo);
      const rank = i + frac;
      return (rank / (n - 1)) * 100;
    }
  }
  // Score equals a duplicated max — treat as the top rank.
  return 100;
}

function Tool1() {
  const [scoresStr, setScoresStr] = useState(
    "72, 85, 91, 68, 77, 82, 88, 74, 95, 79, 84, 66, 90, 81, 76",
  );
  const [scoreStr, setScoreStr] = useState("85");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<T1Result | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const onCalc = () => {
    setErr(null);
    setRes(null);
    const parsed = parseDataset(scoresStr);
    if (parsed.invalid.length > 0) {
      setErr(`Couldn't read these values: ${parsed.invalid.slice(0, 5).join(", ")}`);
      return;
    }
    if (parsed.values.length < 2) {
      setErr("Enter at least 2 scores in the class list.");
      return;
    }
    const s = Number(scoreStr.trim());
    if (!Number.isFinite(s)) {
      setErr("Enter a valid score to check.");
      return;
    }
    const sorted = [...parsed.values].sort((a, b) => a - b);
    const n = sorted.length;
    const percentile = scoreToPercentile(sorted, s);
    const rank = (percentile / 100) * (n - 1);
    const matchIdx = sorted.findIndex((v) => v === s);
    const belowCount = sorted.filter((v) => v < s).length;
    const atOrBelowCount = sorted.filter((v) => v <= s).length;

    const locateLine =
      s < sorted[0] ? (
        <MathLine>{s} is below the lowest score ({sorted[0]}) → r = 0</MathLine>
      ) : s > sorted[n - 1] ? (
        <MathLine>{s} is above the highest score ({sorted[n - 1]}) → r = n − 1</MathLine>
      ) : matchIdx >= 0 ? (
        <MathLine>{s} appears at sorted position i = {matchIdx} → r = {matchIdx}</MathLine>
      ) : (
        <MathLine>
          {s} lies between sorted[{Math.floor(rank)}] = {sorted[Math.floor(rank)]} and sorted[{Math.ceil(rank)}] = {sorted[Math.ceil(rank)]} → r ≈ {fmt(rank, 4)}
        </MathLine>
      );
    const steps: Step[] = [
      {
        title: "Given — sort the class scores",
        body: (
          <>
            <MathNote>n = {n} scores, target x = {s}</MathNote>
            <MathLine>sorted: {sorted.join(", ")}</MathLine>
          </>
        ),
      },
      {
        title: "Formula",
        body: (
          <>
            <MathNote>
              r is the 0-based rank of x in the sorted list (fractional if between two values); P is the percentile — % of the class at or below x
            </MathNote>
            <MathLine>P = r / (n − 1) × 100</MathLine>
          </>
        ),
      },
      {
        title: "Substitute — locate x",
        body: <>{locateLine}</>,
      },
      {
        title: "Substitute — formula",
        body: <MathLine>P = {fmt(rank, 4)} / ({n} − 1) × 100</MathLine>,
      },
      {
        title: "Answer",
        body: (
          <>
            <MathLine>P = {fmt(percentile, 2)}</MathLine>
            <MathNote>
              {ordinal(percentile)} percentile ({atOrBelowCount} of {n} scored at or below {s}
              {belowCount !== atOrBelowCount ? `; ${belowCount} strictly below` : ""})
            </MathNote>
          </>
        ),
      },
    ];

    setRes({
      sorted,
      score: s,
      rank,
      percentile,
      matchIdx: matchIdx >= 0 ? matchIdx : null,
      belowCount,
      atOrBelowCount,
      steps,
    });
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
      <h3 className="text-lg font-semibold text-foreground">
        Tool 1 — Percentile from a class/data set
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Paste every score in the class (or group) and the score you want to
        rank. Uses the same linear-interpolation method as the Percentile
        &amp; Quartile Calculator.
      </p>
      <div className="mt-4 grid gap-3">
        <Field
          label="All class scores"
          htmlFor="t1-list"
          hint="Comma, space, tab or newline separated. Pasting from a spreadsheet works."
        >
          <textarea
            id="t1-list"
            value={scoresStr}
            onChange={(e) => setScoresStr(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 font-serif italic text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
        <Field label="Score to rank" htmlFor="t1-score">
          <TextInput
            id="t1-score"
            value={scoreStr}
            onChange={(e) => setScoreStr(e.target.value)}
            inputMode="decimal"
          />
        </Field>
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryButton onClick={onCalc}>Calculate percentile</PrimaryButton>
        <button
          type="button"
          onClick={() => {
            setRes(null);
            setErr(null);
          }}
          className="rounded-full border border-border/60 bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40"
        >
          Clear
        </button>
      </div>

      {err && <ErrorBox message={err} />}

      {res && (
        <div ref={resultRef}>
          <ResultBox
            label={`Percentile of ${fmt(res.score)}`}
            value={`${fmt(res.percentile, 2)} — ${ordinal(res.percentile)} percentile`}
            note={
              <>
                {res.atOrBelowCount} of {res.sorted.length} scores are at or
                below this score
                {res.belowCount !== res.atOrBelowCount &&
                  ` (${res.belowCount} strictly below)`}
                .
              </>
            }
          />

          {/* Sorted-list visual with the target position highlighted */}
          <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Sorted class list — target position highlighted
            </div>
            <div className="flex flex-wrap gap-1.5 font-serif italic text-sm">
              {res.sorted.map((v, i) => {
                const isMatch = res.matchIdx !== null && i === res.matchIdx;
                const isBetween =
                  res.matchIdx === null &&
                  (i === Math.floor(res.rank) || i === Math.ceil(res.rank));
                return (
                  <span
                    key={i}
                    className={
                      "rounded-md px-2 py-1 " +
                      (isMatch
                        ? "bg-primary/20 text-primary ring-1 ring-primary/50"
                        : isBetween
                          ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                          : "bg-background/60 text-muted-foreground")
                    }
                  >
                    {v}
                  </span>
                );
              })}
            </div>
            {res.matchIdx === null &&
              res.percentile > 0 &&
              res.percentile < 100 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  The score {fmt(res.score)} isn't in the class list, so it's
                  placed by linear interpolation between the two highlighted
                  neighbours.
                </p>
              )}
          </div>

          <StepsToggle steps={res.steps} />
        </div>
      )}
    </section>
  );
}

/* ================= Tool 2 — from mean and SD ================= */

interface T2Result {
  score: number;
  mean: number;
  sd: number;
  z: number;
  percentile: number;
  steps: Step[];
}

function Tool2() {
  const [scoreStr, setScoreStr] = useState("82");
  const [meanStr, setMeanStr] = useState("75");
  const [sdStr, setSdStr] = useState("8");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<T2Result | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const onCalc = () => {
    setErr(null);
    setRes(null);
    const x = Number(scoreStr.trim());
    const m = Number(meanStr.trim());
    const s = Number(sdStr.trim());
    if (!Number.isFinite(x) || !Number.isFinite(m) || !Number.isFinite(s)) {
      setErr("Enter valid numbers for score, mean and standard deviation.");
      return;
    }
    if (s <= 0) {
      setErr("Standard deviation must be positive.");
      return;
    }
    const z = (x - m) / s;
    const p = Phi(z) * 100;
    const steps: Step[] = [
      {
        title: "Given",
        body: <MathLine>x = {x}, &nbsp; μ = {m}, &nbsp; σ = {s}</MathLine>,
      },
      {
        title: "Formula",
        body: (
          <>
            <MathNote>
              Convert the score to a z-score, then take the standard normal CDF (Φ) — the area to the left of z
            </MathNote>
            <MathLine>z = (x − μ) / σ</MathLine>
            <MathLine>P = Φ(z) × 100</MathLine>
          </>
        ),
      },
      {
        title: "Substitute",
        body: (
          <>
            <MathLine>z = ({x} − {m}) / {s} = {fmt(z, 4)}</MathLine>
            <MathLine>Φ({fmt(z, 4)}) = {fmt(p / 100, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "Answer",
        body: (
          <>
            <MathLine>P = {fmt(p, 2)}</MathLine>
            <MathNote>{ordinal(p)} percentile</MathNote>
          </>
        ),
      },
    ];
    setRes({ score: x, mean: m, sd: s, z, percentile: p, steps });
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
      <h3 className="text-lg font-semibold text-foreground">
        Tool 2 — Percentile from mean and standard deviation
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Assumes the class scores are roughly normally distributed. Uses the
        same standard-normal CDF as the Z-score Calculator.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label="Score, x">
          <TextInput
            value={scoreStr}
            onChange={(e) => setScoreStr(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Class mean, μ">
          <TextInput
            value={meanStr}
            onChange={(e) => setMeanStr(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Standard deviation, σ">
          <TextInput
            value={sdStr}
            onChange={(e) => setSdStr(e.target.value)}
            inputMode="decimal"
          />
        </Field>
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryButton onClick={onCalc}>Calculate percentile</PrimaryButton>
        <button
          type="button"
          onClick={() => {
            setRes(null);
            setErr(null);
          }}
          className="rounded-full border border-border/60 bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40"
        >
          Clear
        </button>
      </div>

      {err && <ErrorBox message={err} />}

      {res && (
        <div ref={resultRef}>
          <ResultBox
            label={`Percentile of score ${fmt(res.score)}`}
            value={`${fmt(res.percentile, 2)} — ${ordinal(res.percentile)} percentile`}
            note={
              <>
                Z-score = {fmt(res.z, 4)}. Assumes the class distribution is
                approximately normal.
              </>
            }
          />

          <div className="mt-4">
            <BellCurve z={res.z} percentile={res.percentile} />
            <p className="mt-2 text-xs text-muted-foreground">
              Shaded area = Φ(z) = probability a randomly chosen student scored
              at or below {fmt(res.score)}.
            </p>
          </div>

          <StepsToggle steps={res.steps} />
        </div>
      )}
    </section>
  );
}

/* ================= Page ================= */

function GradePercentilePage() {
  const extras = useMemo(
    () => (
      <>
        <CalcSection title="What is a percentile?">
          <p>
            A <b>percentile</b> is the percentage of scores in a group that
            fall <em>at or below</em> a given score. If you're at the 85th
            percentile on a test, 85% of the people who took that test scored
            the same as you or lower — you outranked roughly 85 out of every
            100 test-takers.
          </p>
          <p className="mt-3">
            <b>A percentile is NOT a percentage score.</b> These two numbers
            answer completely different questions and constantly get confused:
          </p>
          <ul className="mt-2 ml-5 list-disc space-y-1">
            <li>
              <b>Percentage score</b> (e.g. 85%) — how many questions you got
              right. It's a property of <em>your paper</em>.
            </li>
            <li>
              <b>Percentile</b> (e.g. 85th percentile) — how you rank against
              everyone else who took the same test. It's a property of{" "}
              <em>your position in the group</em>.
            </li>
          </ul>
          <p className="mt-3">
            The two numbers can look almost identical or wildly different
            depending on the class. Concrete example: imagine an easy quiz
            where 60% of the class scored above 90%. You scored{" "}
            <b>85% correct</b>, but because so many classmates scored higher,
            you land at only the <b>40th percentile</b>. Same student, same
            paper — the two numbers disagree because they measure different
            things.
          </p>
        </CalcSection>

<CalcSection title="Grade percentile explained, step by step">
          <p>
            The calculator exposes two tools because "percentile" is computed
            two very different ways depending on what data you have. Each card
            covers one piece of the logic used here.
          </p>
          <GuideCards items={GRADE_GUIDE} />
        </CalcSection>


        <CalcSection title="Percentile vs percentile rank vs quartile">
          <p>
            These three terms describe the same idea at different levels of
            detail:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <b>Percentile</b> — any value from 0 to 100. The 37th percentile
              is the score below which 37% of the data sits.
            </li>
            <li>
              <b>Percentile rank</b> — the percentile assigned to a{" "}
              <em>specific score</em>. That's what Tool 1 computes.
            </li>
            <li>
              <b>Quartile</b> — the special percentiles 25 (Q1), 50 (Q2, the
              median) and 75 (Q3) that split the data into four equal parts.
            </li>
          </ul>
          <p className="mt-3">
            For quartile-specific work — Q1, Q3, IQR, box plots, outlier
            flagging — use the{" "}
            <Link
              to="/calculators/math/percentile-calculator"
              className="text-primary underline"
            >
              Percentile &amp; Quartile Calculator
            </Link>
            .
          </p>
        </CalcSection>

        <CalcSection title="Common mistakes">
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <b>Treating percentage score and percentile as the same
              number.</b>{" "}
              An 85% score is not automatically the 85th percentile — it
              depends entirely on how the rest of the class did.
            </li>
            <li>
              <b>Assuming a normal distribution when the real data is
              skewed.</b>{" "}
              Tool 2 assumes bell-shaped scores. If the class actually has a
              ceiling effect (lots of 100s), or a long tail of very low
              scores, the normal-based percentile will be off. Prefer Tool 1
              whenever you have the real list.
            </li>
            <li>
              <b>Confusing "top 10%" with "10th percentile".</b> The top 10%
              is the 90th percentile and above. The 10th percentile is the
              bottom 10%.
            </li>
            <li>
              <b>Using σ from a small sample as if it were the population
              value.</b>{" "}
              With only a handful of scores, prefer Tool 1 or compute a
              confidence interval on the mean instead.
            </li>
          </ul>
        </CalcSection>

        <CalcSection title="Features of this calculator">
          <FeatureList
            items={[
              "Two tools in one page: from a full class list, or from mean and standard deviation",
              "Tool 1 uses the same linear-interpolation percentile method as the Percentile & Quartile Calculator (NumPy percentile / Excel PERCENTILE.INC)",
              "Tool 2 uses the same standard-normal CDF as the Z-score Calculator, with a shaded bell-curve diagram",
              "Sorted-list view highlights exactly where the target score sits",
              "Show / hide step-by-step working for every result",
              "Clear explanation of percentile vs percentage score, addressing the most common student confusion",
            ]}
          />
        </CalcSection>

        
        <CalcSection title="Frequently asked questions">
          <CalcFAQ
            items={[
              {
                q: "Is the 90th percentile the same as a 90% score?",
                a: (
                  <p>
                    No. 90% means you got 90% of the questions right; the 90th
                    percentile means you scored higher than 90% of the people
                    who took the same test. A 90% score can be the 60th
                    percentile on an easy test or the 99th on a hard one.
                  </p>
                ),
              },
              {
                q: "What percentile is average?",
                a: (
                  <p>
                    The 50th percentile — the median. Half the group scored at
                    or below that value; half scored above. In a symmetric
                    (normal) distribution the 50th percentile equals the mean.
                  </p>
                ),
              },
              {
                q: "Which tool should I pick?",
                a: (
                  <p>
                    If you have every score in the class, use Tool 1 — it
                    doesn't assume any distribution shape. Use Tool 2 only
                    when all you have is the mean and standard deviation and
                    the scores are roughly bell-shaped.
                  </p>
                ),
              },
              {
                q: "Can two students share the same percentile?",
                a: (
                  <p>
                    Yes. Tied scores share the same percentile rank — the
                    calculator returns the same number for both.
                  </p>
                ),
              },
              {
                q: "Why does the calculator return 0 or 100 for scores outside the class range?",
                a: (
                  <p>
                    Linear interpolation can only place scores that sit
                    between real class members. A score below the lowest
                    student is at the 0th percentile of that class; a score
                    above the highest is at the 100th.
                  </p>
                ),
              },
              {
                q: "Which percentile formula is this?",
                a: (
                  <p>
                    The same linear-interpolation-between-closest-ranks method
                    used by NumPy's <code>percentile</code> and Excel's
                    <code> PERCENTILE.INC</code>. It's also what the Percentile
                    &amp; Quartile Calculator on this site uses — so the two
                    pages always agree.
                  </p>
                ),
              },
            ]}
          />
        </CalcSection>

        <CalcSection title="Related calculators">
          <RelatedLinks
            links={[
              {
                to: "/calculators/math/percentile-calculator",
                label: "Percentile & Quartile Calculator",
              },
              { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
              {
                to: "/calculators/math/empirical-rule-calculator",
                label: "Empirical Rule Calculator",
              },
              {
                to: "/calculators/math/standard-deviation-calculator",
                label: "Standard Deviation Calculator",
              },
              {
                to: "/calculators/math/mean-median-mode-calculator",
                label: "Mean, Median, Mode & Range",
              },
            ]}
          />
        </CalcSection>
      </>
    ),
    [],
  );

  return (
    <MathCalcPage
      name="Grade Percentile Calculator"
      tagline="Find the percentile of any test score — from a full class score list, or from the class mean and standard deviation."
      extras={extras}
    >
      <div className="space-y-6">
        <Tool1 />
        <Tool2 />
      </div>
    </MathCalcPage>
  );
}
