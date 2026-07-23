import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
  ResultBox,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  FormulaWithLegend,
  WorkedExample,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

export const Route = createFileRoute("/calculators/math/number-line-distance-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Number Line Distance Calculator",
      title: "Number Line Distance Calculator — |a − b|",
      metaDescription:
        "Distance between two numbers on a number line using |a − b|. Accepts integers, decimals and fractions a/b, with a visual and steps.",
      canonicalUrl: "/calculators/math/number-line-distance-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Number Line Distance Calculator",
          path: "/calculators/math/number-line-distance-calculator",
        },
      ],
      faqs: [
        {
          q: "Why can't distance be negative?",
          a: "Distance measures how far apart two things are — it's always a length. Even if you walk backwards, you still cover positive ground. Subtracting two numbers can give a negative result (that tells you direction), but taking the absolute value strips the sign and leaves just the length.",
        },
        {
          q: "How is this related to absolute value?",
          a: "The distance between numbers a and b on a number line is defined as |a − b|. The absolute value bars turn any negative result into its positive twin, matching the everyday idea that distance can't be less than zero.",
        },
        {
          q: "Does the order of the two numbers matter?",
          a: "No. |a − b| and |b − a| always give the same answer, because reversing the subtraction only flips the sign — and the absolute value throws the sign away.",
        },
      ],
    }),
  component: NumberLineDistancePage,
});

// ---------------- Parsing ----------------

/** Parse an integer, decimal, or fraction "a/b". Returns null on invalid. */
function parseNumber(raw: string): { value: number; display: string } | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.includes("/")) {
    const parts = s.split("/");
    if (parts.length !== 2) return null;
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return { value: num / den, display: `${num}/${den}` };
  }
  const v = Number(s);
  if (!Number.isFinite(v)) return null;
  return { value: v, display: s };
}

function fmt(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  return Number(v.toPrecision(12)).toString();
}

// ---------------- Diagram ----------------

function NumberLineDiagram({
  a,
  b,
  aLabel,
  bLabel,
  distance,
}: {
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
  distance: number;
}) {
  const W = 520;
  const H = 160;
  const PAD = 40;

  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const span = hi - lo || 1;
  const pad = span * 0.35;
  const xLo = lo - pad;
  const xHi = hi + pad;

  const yLine = H - 55;
  const px = (v: number) => PAD + ((v - xLo) / (xHi - xLo)) * (W - 2 * PAD);
  const ax = px(a);
  const bx = px(b);
  const leftX = Math.min(ax, bx);
  const rightX = Math.max(ax, bx);

  // Choose a "nice" tick step
  const targetTicks = 8;
  const rawStep = span / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 1e-9))));
  const norm = rawStep / mag;
  const stepMul = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  const step = stepMul * mag;
  const firstTick = Math.ceil(xLo / step) * step;
  const ticks: number[] = [];
  for (let t = firstTick; t <= xHi + 1e-9; t += step) {
    ticks.push(Number(t.toPrecision(12)));
  }

  const axisColor = "var(--color-border)";
  const tickColor = "var(--color-muted-foreground)";
  const pointColor = "var(--color-primary)";
  const bracketColor = "#f59e0b";
  const textColor = "var(--color-foreground)";

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">
        Number line
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Number line showing ${aLabel} and ${bLabel} with the distance ${fmt(distance)} bracketed between them`}
      >
        {/* main axis */}
        <line
          x1={PAD}
          y1={yLine}
          x2={W - PAD}
          y2={yLine}
          stroke={axisColor}
          strokeWidth={1.5}
        />
        {/* arrowheads */}
        <polygon
          points={`${PAD - 2},${yLine} ${PAD + 6},${yLine - 4} ${PAD + 6},${yLine + 4}`}
          fill={axisColor}
        />
        <polygon
          points={`${W - PAD + 2},${yLine} ${W - PAD - 6},${yLine - 4} ${W - PAD - 6},${yLine + 4}`}
          fill={axisColor}
        />

        {/* ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={px(t)}
              y1={yLine - 4}
              x2={px(t)}
              y2={yLine + 4}
              stroke={tickColor}
              strokeWidth={1}
            />
            <text
              x={px(t)}
              y={yLine + 18}
              fill={tickColor}
              fontSize={10}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {t}
            </text>
          </g>
        ))}

        {/* bracket / distance bar above the line */}
        <line
          x1={leftX}
          y1={yLine - 30}
          x2={rightX}
          y2={yLine - 30}
          stroke={bracketColor}
          strokeWidth={2}
        />
        <line
          x1={leftX}
          y1={yLine - 30}
          x2={leftX}
          y2={yLine - 8}
          stroke={bracketColor}
          strokeWidth={2}
        />
        <line
          x1={rightX}
          y1={yLine - 30}
          x2={rightX}
          y2={yLine - 8}
          stroke={bracketColor}
          strokeWidth={2}
        />
        <text
          x={(leftX + rightX) / 2}
          y={yLine - 36}
          fill={bracketColor}
          fontSize={12}
          textAnchor="middle"
          fontFamily="monospace"
          fontWeight="bold"
        >
          distance = {fmt(distance)}
        </text>

        {/* the two points */}
        <circle cx={ax} cy={yLine} r={6} fill={pointColor} />
        <circle cx={bx} cy={yLine} r={6} fill={pointColor} />
        <text
          x={ax}
          y={yLine + 40}
          fill={textColor}
          fontSize={12}
          textAnchor="middle"
          fontFamily="monospace"
          fontWeight="bold"
        >
          a = {aLabel}
        </text>
        <text
          x={bx}
          y={yLine + 56}
          fill={textColor}
          fontSize={12}
          textAnchor="middle"
          fontFamily="monospace"
          fontWeight="bold"
        >
          b = {bLabel}
        </text>
      </svg>
    </div>
  );
}

// ---------------- Page ----------------

interface Result {
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
  distance: number;
  steps: Step[];
}

function compute(
  aVal: number,
  bVal: number,
  aLabel: string,
  bLabel: string,
): Result {
  const diff = aVal - bVal;
  const distance = Math.abs(diff);

  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <FormulaBlock>
          a = {aLabel}, &nbsp; b = {bLabel}
        </FormulaBlock>
      ),
    },
    {
      title: "Formula — distance on a number line",
      body: (
        <FormulaWithLegend
          formula={<>distance = |a − b|</>}
          legend={[
            { sym: "a, b", def: "the two points on the number line" },
            { sym: "|·|", def: "absolute value; drops any negative sign" },
            { sym: "distance", def: "non-negative length between a and b" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — plug in a and b",
      body: (
        <FormulaBlock>
          distance = |{aLabel} − ({bLabel})| = |{fmt(diff)}|
        </FormulaBlock>
      ),
    },
    {
      title: "Substitute — take the absolute value",
      body: (
        <FormulaBlock>
          {diff < 0
            ? `|${fmt(diff)}| = ${fmt(distance)} (negative sign dropped)`
            : diff === 0
              ? "|0| = 0 (the two numbers are the same point)"
              : `|${fmt(diff)}| = ${fmt(distance)} (already positive)`}
        </FormulaBlock>
      ),
    },
    {
      title: "Answer",
      body: <FormulaBlock>distance = {fmt(distance)}</FormulaBlock>,
    },
  ];

  return { a: aVal, b: bVal, aLabel, bLabel, distance, steps };
}

function NumberLineDistancePage() {
  const [aStr, setAStr] = useState("-3");
  const [bStr, setBStr] = useState("5");
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setResult(null);
    const a = parseNumber(aStr);
    const b = parseNumber(bStr);
    if (!a || !b) {
      setErr(
        'Please enter two valid numbers. You can use integers (5), decimals (2.75) or fractions ("3/4").',
      );
      return;
    }
    setResult(compute(a.value, b.value, a.display, b.display));
  };

  return (
    <MathCalcPage
      name="Number Line Distance Calculator"
      tagline="Find how far apart two numbers are on the number line. Enter any two values — whole numbers, decimals, or fractions like 3/4 — and get the distance |a − b| with a picture and step-by-step working."
      extras={
        <>
          <CalcSection title="What does distance on a number line mean?">
            <p>
              A <strong>number line</strong> is just a straight line with zero
              in the middle, positive numbers stretching to the right, and
              negative numbers stretching to the left. Every number lives at
              one exact spot on that line.
            </p>
            <p>
              The <strong>distance between two numbers</strong> is how many
              units you'd have to walk along the line to get from one to the
              other. If you're at 3 and your friend is at 7, you'd walk 4
              steps to reach them. Distance = 4.
            </p>
            <p>
              It doesn't matter whether you walk left-to-right or
              right-to-left — the number of steps is the same. That's why
              distance never depends on which number comes first.
            </p>
          </CalcSection>

<CalcSection title="Number-line distance, piece by piece">
            <p>
              The distance between two numbers is |a − b| — the absolute value
              of their difference. The cards below cover the three cases you
              actually run into, plus the sign traps that make this seem harder
              than it is.
            </p>
            <GuideCards items={NLD_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                'Accepts integers ("7"), decimals ("2.5") and fractions ("3/4" or "-5/2") in either input',
                "Works with positive numbers, negative numbers, and any mix of the two",
                "Draws a labelled number line with both points and the distance bracketed between them",
                "Shows every step: setting up |a − b|, substituting the numbers, and taking the absolute value",
                "Handles the case where both numbers are the same (distance = 0) cleanly",
                "No sign confusion — the order you enter the numbers doesn't change the answer",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Why can't distance be negative?",
                  a: (
                    <p>
                      Distance is a length — how far apart two things are.
                      Lengths are always zero or positive. A negative
                      subtraction result tells you the direction (which one is
                      bigger), but the absolute value bars strip that sign
                      away and leave just the length.
                    </p>
                  ),
                },
                {
                  q: "How does this relate to absolute value equations?",
                  a: (
                    <p>
                      An equation like |x − 3| = 5 asks: "which numbers are
                      exactly 5 units away from 3 on the number line?" There
                      are two answers, one on each side: x = 8 and x = −2.
                      This calculator does the reverse — you give it the two
                      numbers, and it tells you the distance.
                    </p>
                  ),
                },
                {
                  q: "Does this work for fractions and decimals?",
                  a: (
                    <p>
                      Yes. Enter a decimal like <code>2.75</code> or a
                      fraction like <code>3/4</code> in either input. The
                      calculator converts fractions to decimals for the
                      arithmetic and reports the distance.
                    </p>
                  ),
                },
                {
                  q: "What if I enter the same number twice?",
                  a: (
                    <p>
                      The distance is 0 — the two points are actually the
                      same point on the number line, so there's nothing to
                      walk.
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
                  to: "/calculators/math/absolute-value-calculator",
                  label: "Absolute Value Equation Calculator",
                },
                {
                  to: "/calculators/math/fraction-calculator",
                  label: "Fraction Calculator",
                },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First number (a)" htmlFor="a">
            <TextInput
              id="a"
              value={aStr}
              onChange={(e) => setAStr(e.target.value)}
              inputMode="text"
              placeholder="e.g. -3, 2.5 or 3/4"
            />
          </Field>
          <Field label="Second number (b)" htmlFor="b">
            <TextInput
              id="b"
              value={bStr}
              onChange={(e) => setBStr(e.target.value)}
              inputMode="text"
              placeholder="e.g. 5, -1.25 or -5/2"
            />
          </Field>
        </div>

        <PrimaryButton onClick={onCalc}>Calculate distance</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <>
          <ResultBox
            label="Distance on the number line"
            value={<span className="font-mono">{fmt(result.distance)}</span>}
            note={`|${result.aLabel} − ${result.bLabel}| = ${fmt(result.distance)} units apart.`}
          />
          <NumberLineDiagram
            a={result.a}
            b={result.b}
            aLabel={result.aLabel}
            bLabel={result.bLabel}
            distance={result.distance}
          />
          <StepsToggle steps={result.steps} />
        </>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function NlMini({ a, b, label }: { a: number; b: number; label: string }) {
  const min = -10, max = 10, W = 220, pad = 15;
  const x = (v: number) => pad + ((v - min) / (max - min)) * (W - 2 * pad);
  return (
    <svg viewBox="0 0 220 90" className="w-full">
      <rect x="1" y="1" width="218" height="88" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <line x1={pad} y1="55" x2={W - pad} y2="55" stroke="var(--color-border)" />
      {[-10, -5, 0, 5, 10].map((t) => (
        <g key={t}>
          <line x1={x(t)} y1="52" x2={x(t)} y2="58" stroke="var(--color-muted-foreground)" />
          <text x={x(t)} y="72" textAnchor="middle" fontSize="8" fill="var(--color-muted-foreground)">{t}</text>
        </g>
      ))}
      <line x1={x(Math.min(a, b))} y1="40" x2={x(Math.max(a, b))} y2="40" stroke="var(--color-primary)" strokeWidth="3" />
      <circle cx={x(a)} cy="55" r="4" fill="var(--color-primary)" />
      <circle cx={x(b)} cy="55" r="4" fill="var(--color-primary)" />
      <text x={x(a)} y="34" textAnchor="middle" fontSize="9" fill="var(--color-foreground)">{a}</text>
      <text x={x(b)} y="34" textAnchor="middle" fontSize="9" fill="var(--color-foreground)">{b}</text>
      <text x={(x(a) + x(b)) / 2} y="18" textAnchor="middle" fontSize="10" fill="var(--color-primary)">{label}</text>
    </svg>
  );
}

const NLD_GUIDE: GuideCardItem[] = [
  {
    key: "positive",
    title: "Two positive numbers",
    explain: <>Just count the steps from one to the other. |a − b| strips any sign the subtraction leaves behind.</>,
    formula: <>d = |a − b|</>,
    diagram: <NlMini a={3} b={7} label="d = 4" />,
    example: {
      given: <span className="font-mono">a = 3, b = 7</span>,
      substitute: <>|3 − 7| = |−4|</>,
      answer: <span className="font-mono">4</span>,
    },
  },
  {
    key: "mixed",
    title: "Signs mixed or both negative",
    explain: <>Subtracting a negative flips it to plus: a − (−b) = a + b. Write it out fully before you take the absolute value.</>,
    formula: <>|a − (−b)| = |a + b|</>,
    diagram: <NlMini a={-3} b={5} label="d = 8" />,
    example: {
      given: <span className="font-mono">a = −8, b = −2</span>,
      substitute: <>|−8 − (−2)| = |−6|</>,
      answer: <span className="font-mono">6</span>,
    },
  },
  {
    key: "mistakes",
    title: "Sign traps and order",
    explain: <>Distance never goes negative — if you got a negative answer, you forgot the bars. And |a − b| always equals |b − a|, so input order does not matter.</>,
    formula: <>|a − b| = |b − a| ≥ 0</>,
    diagram: <NlMini a={-2} b={4} label="either order" />,
    example: {
      given: <span className="font-mono">check both orderings</span>,
      substitute: <>|−2 − 4| = |4 − (−2)|</>,
      answer: <span className="font-mono">6 either way</span>,
    },
  },
];
