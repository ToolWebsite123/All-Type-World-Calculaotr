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
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  FormulaBlock,
  FormulaWithLegend,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import {
  roundToPlaces,
  roundToFraction,
  ROUNDING_METHOD_LABELS,
  describePlaces,
  type RoundingMethod,
} from "@/lib/math/rounding";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

export const Route = createFileRoute("/calculators/math/rounding-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Rounding Calculator",
      title: "Rounding Calculator — 8 Methods & Rounding to Fractions",
      metaDescription:
        "Round numbers with 8 methods — half-up, half-down, ceiling, floor, banker's and more. Also rounds to any fraction such as 1/8.",
      canonicalUrl: "/calculators/math/rounding-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Rounding Calculator", path: "/calculators/math/rounding-calculator" },
      ],
      faqs: [
        {
          q: "What is banker's rounding and why is it used?",
          a: "Banker's rounding (round half to even) breaks ties by rounding to the nearest even integer, so 2.5 becomes 2 and 3.5 becomes 4. Because half the ties round up and half round down, sums and averages accumulate less bias than with always-up rounding, which is why banking, accounting, and the IEEE 754 floating-point standard use it.",
        },
        {
          q: "How does rounding work with negative numbers?",
          a: "It depends on the method. 'Ceiling' always moves toward +∞ so −5.01 → −5. 'Floor' always moves toward −∞ so −5.01 → −6. 'Half up' means toward +∞ for ties (−5.5 → −5) while 'half away from zero' means −5.5 → −6. Read each method's rule carefully — negative numbers reveal the difference.",
        },
        {
          q: "What is the difference between round half up and round half away from zero?",
          a: "For positive numbers they agree (2.5 → 3). For negatives they differ: half up rounds −2.5 to −2 (toward +∞) while half away from zero rounds −2.5 to −3 (away from 0).",
        },
        {
          q: "How do I round to the nearest 1/8?",
          a: "Multiply the number by 8, round to the nearest integer, then divide by 8. For example 15.65 × 8 = 125.2, rounds to 125, and 125 / 8 = 15.625 = 15 5/8.",
        },
        {
          q: "Which rounding method should I use?",
          a: "For everyday values, half up or half away from zero match what most people expect. For scientific and financial calculations where repeated rounding could bias a total, use half to even. For guaranteed upper or lower bounds, use ceiling or floor.",
        },
      ],
    }),
  component: RoundingPage,
});

const METHODS: RoundingMethod[] = [
  "half-up",
  "half-down",
  "ceil",
  "floor",
  "half-even",
  "half-odd",
  "half-away",
  "half-toward",
];

const PRECISION_OPTIONS: { value: number; label: string }[] = [
  { value: -3, label: "Thousands (-3)" },
  { value: -2, label: "Hundreds (-2)" },
  { value: -1, label: "Tens (-1)" },
  { value: 0, label: "Ones (0)" },
  { value: 1, label: "Tenths (1)" },
  { value: 2, label: "Hundredths (2)" },
  { value: 3, label: "Thousandths (3)" },
  { value: 4, label: "Ten-thousandths (4)" },
  { value: 6, label: "Millionths (6)" },
];

const selectClass =
  "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30";

function RoundingPage() {
  // Main tool
  const [x, setX] = useState("2.5");
  const [places, setPlaces] = useState<number>(0);
  const [method, setMethod] = useState<RoundingMethod>("half-up");
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<null | { value: string; rule: string; input: string; precisionLabel: string; methodLabel: string }>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Fraction tool
  const [fx, setFx] = useState("15.65");
  const [fDen, setFDen] = useState("8");
  const [fMethod, setFMethod] = useState<RoundingMethod>("half-up");
  const [fRes, setFRes] = useState<null | { mixed: string; decimal: string }>(null);
  const [fErr, setFErr] = useState<string | null>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    setSteps(null);
    const xn = Number(x);
    if (!Number.isFinite(xn)) {
      setErr("Enter a valid number");
      return;
    }
    try {
      const r = roundToPlaces(xn, places, method);
      const precisionLabel = PRECISION_OPTIONS.find((p) => p.value === places)?.label ?? String(places);
      setResult({
        value: String(r.value),
        rule: r.rule,
        input: String(xn),
        precisionLabel,
        methodLabel: ROUNDING_METHOD_LABELS[method],
      });

      const factor = Math.pow(10, places);
      const scaled = xn * factor;
      const digitStr = scaled.toFixed(6);
      const frac = Math.abs(scaled - Math.trunc(scaled));
      const direction = r.value > xn ? "up" : r.value < xn ? "down" : "unchanged (already exact)";
      setSteps([
        {
          title: "Given",
          body: (
            <FormulaBlock>
              x = {xn} &nbsp;·&nbsp; round to {describePlaces(places)} &nbsp;·&nbsp; method: {ROUNDING_METHOD_LABELS[method].toLowerCase()}
            </FormulaBlock>
          ),
        },
        {
          title: "Write the formula",
          body: (
            <FormulaWithLegend
              formula={<>round(x, p) = ⌊x · 10^p + tie-break⌋ ÷ 10^p</>}
              legend={[
                { sym: "x", def: "the number being rounded" },
                { sym: "p", def: "digits kept after the decimal point (negative = tens/hundreds/…)" },
                { sym: "tie-break", def: "the rule that decides which way a 0.5 tie goes" },
              ]}
            />
          ),
        },
        {
          title: "Substitute — scale to the rounding position",
          body: (
            <FormulaBlock>
              {xn} × 10^{places} = {digitStr}
            </FormulaBlock>
          ),
        },
        {
          title: "Inspect the deciding digit",
          body: (
            <FormulaBlock>
              fractional part = {frac.toFixed(6)} &nbsp;·&nbsp; {frac === 0.5 ? "exactly a tie — tie-break rule decides" : frac < 0.5 ? "< 0.5 → toward smaller magnitude" : "> 0.5 → toward larger magnitude"}
            </FormulaBlock>
          ),
        },
        {
          title: "Answer",
          body: (
            <FormulaBlock>
              <strong>{r.value}</strong> &nbsp;({direction})
            </FormulaBlock>
          ),
        },
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input");
    }
  };

  const computeFraction = () => {
    setFErr(null);
    setFRes(null);
    const xn = Number(fx);
    const dn = Number(fDen);
    if (!Number.isFinite(xn)) {
      setFErr("Enter a valid number");
      return;
    }
    try {
      const r = roundToFraction(xn, dn, fMethod);
      setFRes({ mixed: r.mixed, decimal: String(r.decimal) });
    } catch (e) {
      setFErr(e instanceof Error ? e.message : "Invalid input");
    }
  };

  return (
    <MathCalcPage
      name="Rounding Calculator"
      tagline="Round any number using 8 different rounding methods, or round to the nearest fraction like 1/8."
      extras={
        <>

          <CalcSection title="What is rounding?">
            <p>
              Rounding replaces a number with a shorter approximation at a
              chosen level of precision — nearest whole number, nearest tenth,
              nearest thousand. What makes rounding interesting is the
              tie-break: what should happen with an exact half like 2.5, or a
              negative half like −5.5? Different rules give different answers,
              and picking the right one matters in accounting, science and
              engineering. This calculator supports eight tie-break methods
              plus a separate rounding-to-fractions tool.
            </p>
          </CalcSection>

          <CalcSection title="Rounding calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one of the tie-break families the calculator
              offers, plus the fraction tool below the main rounder. Try the
              same input with different methods to see where they agree and
              where they diverge.
            </p>
            <GuideCards items={ROUND_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Eight rounding methods, each with correct handling of negative numbers",
                "Choose precision from thousands down to millionths, or any custom decimal place",
                "A separate rounding-to-fractions tool for engineering and shop measurements",
                "Full explanation of the method applied to your number",
              ]}
            />
          </CalcSection>

          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What is banker's rounding and why is it used?", a: <p>Banker's rounding (round half to even) breaks ties by rounding to the nearest even integer. Because half the ties round up and half round down, sums and averages accumulate less bias than always-up rounding. It is the IEEE 754 floating-point default and standard in accounting.</p> },
                { q: "How does rounding work with negative numbers?", a: <p>It depends on the method. Ceiling always moves toward +∞ so −5.01 → −5. Floor always moves toward −∞ so −5.01 → −6. 'Half up' means toward +∞ for ties (−5.5 → −5) while 'half away from zero' means −5.5 → −6.</p> },
                { q: "What is the difference between half up and half away from zero?", a: <p>For positive numbers they give the same answer. For negatives they diverge: half up rounds −2.5 to −2, half away from zero rounds −2.5 to −3.</p> },
                { q: "How do I round to the nearest 1/8?", a: <p>Multiply by 8, round to the nearest integer, then divide by 8. Use the fraction tool above to do this automatically.</p> },
                { q: "Which method should I pick?", a: <p>Everyday: half up or half away from zero. Repeated financial or scientific rounding: half to even. Guaranteed upper/lower bound: ceiling or floor.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/percentage-calculator", label: "Percentage Calculator" },
                { to: "/calculators/math/percent-error-calculator", label: "Percent Error" },
                { to: "/calculators/math/scientific-notation-calculator", label: "Scientific Notation" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Number" htmlFor="x">
          <TextInput id="x" inputMode="decimal" value={x} onChange={(e) => setX(e.target.value)} />
        </Field>
        <Field label="Precision" htmlFor="precision">
          <select
            id="precision"
            className={selectClass}
            value={places}
            onChange={(e) => setPlaces(Number(e.target.value))}
          >
            {PRECISION_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">Calculate</PrimaryButton>
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowSettings((s) => !s)}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {showSettings ? "Hide settings" : "Settings ▾"}
        </button>
        {showSettings && (
          <div className="mt-3 rounded-2xl border border-border bg-secondary/30 p-4">
            <Field label="Rounding method" htmlFor="method">
              <select
                id="method"
                className={selectClass}
                value={method}
                onChange={(e) => setMethod(e.target.value as RoundingMethod)}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>{ROUNDING_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </Field>
            <p className="mt-2 text-xs text-muted-foreground">
              Each method handles negative numbers differently — see the "Rounding methods" section below for exact behaviour.
            </p>
          </div>
        )}
      </div>

      {err && <ErrorBox message={err} />}
      {result && (
        <ResultBox
          label="Rounded value"
          value={result.value}
          note={
            <>
              <strong className="text-foreground">{result.value}</strong> is the result of rounding{" "}
              <strong className="text-foreground">{result.input}</strong> to {result.precisionLabel.toLowerCase()} using{" "}
              <strong className="text-foreground">{result.methodLabel.toLowerCase()}</strong>.
            </>
          }
        />
      )}
      {result && <RoundingNumberLine input={Number(result.input)} rounded={Number(result.value)} places={places} />}
      {steps && <StepsToggle steps={steps} />}

      {/* Fraction rounding sub-tool */}
      <div className="mt-10 rounded-2xl border border-border bg-secondary/20 p-5">
        <h3 className="mb-3 font-display text-lg font-semibold text-foreground">Round to a fraction</h3>
        <p className="mb-4 text-sm text-muted-foreground">Round a decimal to the nearest 1/n — e.g. the nearest 1/8 for shop measurements.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <Field label="Number" htmlFor="fx">
            <TextInput id="fx" inputMode="decimal" value={fx} onChange={(e) => setFx(e.target.value)} />
          </Field>
          <Field label="Nearest 1 /" htmlFor="fden">
            <TextInput id="fden" inputMode="numeric" value={fDen} onChange={(e) => setFDen(e.target.value)} />
          </Field>
          <Field label="Method" htmlFor="fmethod">
            <select
              id="fmethod"
              className={selectClass}
              value={fMethod}
              onChange={(e) => setFMethod(e.target.value as RoundingMethod)}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>{ROUNDING_METHOD_LABELS[m]}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <PrimaryButton onClick={computeFraction} className="w-full sm:w-auto">Round</PrimaryButton>
          </div>
        </div>
        {fErr && <ErrorBox message={fErr} />}
        {fRes && (
          <ResultBox
            label="Rounded value"
            value={<span>{fRes.mixed} <span className="text-muted-foreground">= {fRes.decimal}</span></span>}
            note={<>Nearest 1/{fDen} of {fx}.</>}
          />
        )}
      </div>
    </MathCalcPage>
  );
}

function MethodBlock({ title, blurb, rows }: { title: string; blurb: string; rows: [string, string][] }) {
  return (
    <div className="mb-4">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <p className="mt-1 text-muted-foreground">{blurb}</p>
      <div className="mt-2 rounded-xl border border-border bg-secondary/30 p-3 font-mono text-sm tabular-nums text-foreground">
        {rows.map(([from, to]) => (
          <div key={from}>{from} ⇒ {to}</div>
        ))}
      </div>
    </div>
  );
}

function RoundingNumberLine({ input, rounded, places }: { input: number; rounded: number; places: number }) {
  if (!Number.isFinite(input) || !Number.isFinite(rounded)) return null;
  const step = Math.pow(10, -places);
  const lower = Math.floor(input / step) * step;
  const upper = lower + step;
  const min = Math.min(lower, rounded, input) - step * 0.5;
  const max = Math.max(upper, rounded, input) + step * 0.5;
  const range = max - min || 1;
  const W = 600, H = 140, PL = 30, PR = 30;
  const iw = W - PL - PR;
  const sx = (v: number) => PL + ((v - min) / range) * iw;
  const y = 80;
  // gridline ticks: from lower - step to upper + step
  const ticks: number[] = [];
  for (let t = lower - step; t <= upper + step + step * 0.01; t += step) ticks.push(Number(t.toFixed(12)));
  const fmt = (v: number) => (places >= 0 ? v.toFixed(Math.max(places, 0)) : String(Math.round(v)));
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-sm font-semibold text-muted-foreground">Number line — snapping to the nearest step</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Number line showing rounding">
        <line x1={PL} y1={y} x2={W - PR} y2={y} className="stroke-border" strokeWidth="2" />
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={sx(t)} y1={y - 8} x2={sx(t)} y2={y + 8} className="stroke-muted-foreground/60" />
            <text x={sx(t)} y={y + 24} textAnchor="middle" className="fill-muted-foreground text-[11px] font-mono">{fmt(t)}</text>
          </g>
        ))}
        {/* input marker */}
        <circle cx={sx(input)} cy={y} r="6" className="fill-muted-foreground" />
        <text x={sx(input)} y={y - 16} textAnchor="middle" className="fill-muted-foreground text-xs">input</text>
        {/* rounded marker */}
        <circle cx={sx(rounded)} cy={y} r="7" className="fill-primary" />
        <text x={sx(rounded)} y={y + 46} textAnchor="middle" className="fill-primary text-xs font-semibold">rounded</text>
        {/* arrow from input to rounded */}
        {input !== rounded && (
          <path
            d={`M ${sx(input)} ${y - 30} Q ${(sx(input) + sx(rounded)) / 2} ${y - 55}, ${sx(rounded)} ${y - 30}`}
            className="fill-none stroke-primary"
            strokeWidth="1.5"
            markerEnd="url(#rnd-arrow)"
          />
        )}
        <defs>
          <marker id="rnd-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" className="fill-primary" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function HalfUpMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <line x1="20" y1="70" x2="200" y2="70" stroke="var(--color-border)" strokeWidth="2" />
      {[2, 3].map((n, i) => (
        <g key={n}>
          <line x1={60 + i * 80} y1="63" x2={60 + i * 80} y2="77" stroke="var(--color-muted-foreground)" />
          <text x={60 + i * 80} y="94" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="12">{n}</text>
        </g>
      ))}
      <circle cx="100" cy="70" r="4" className="fill-muted-foreground" />
      <text x="100" y="55" textAnchor="middle" className="fill-muted-foreground" fontSize="11">2.5</text>
      <path d="M 105 46 Q 120 30, 140 46" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#ru)" />
      <defs><marker id="ru" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" className="fill-primary" /></marker></defs>
      <circle cx="140" cy="70" r="5" className="fill-primary" />
      <text x="140" y="115" textAnchor="middle" className="fill-primary font-mono" fontSize="12">→ 3</text>
    </svg>
  );
}

function CeilFloorMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="30" className="fill-foreground font-mono" fontSize="12">ceiling ↑</text>
      <line x1="20" y1="42" x2="200" y2="42" stroke="var(--color-border)" />
      <text x="20" y="60" className="fill-foreground font-mono" fontSize="12">5.01 → 6</text>
      <text x="115" y="60" className="fill-foreground font-mono" fontSize="12">−5.01 → −5</text>
      <text x="20" y="88" className="fill-foreground font-mono" fontSize="12">floor ↓</text>
      <line x1="20" y1="100" x2="200" y2="100" stroke="var(--color-border)" />
      <text x="20" y="118" className="fill-foreground font-mono" fontSize="12">5.99 → 5</text>
      <text x="115" y="118" className="fill-foreground font-mono" fontSize="12">−5.01 → −6</text>
    </svg>
  );
}

function BankersMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <line x1="20" y1="70" x2="200" y2="70" stroke="var(--color-border)" strokeWidth="2" />
      {[2, 3, 4].map((n, i) => (
        <g key={n}>
          <line x1={40 + i * 60} y1="63" x2={40 + i * 60} y2="77" stroke="var(--color-muted-foreground)" />
          <text x={40 + i * 60} y="94" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="12">{n}</text>
        </g>
      ))}
      <circle cx="70" cy="70" r="4" className="fill-muted-foreground" />
      <text x="70" y="55" textAnchor="middle" className="fill-muted-foreground" fontSize="11">2.5→2</text>
      <circle cx="130" cy="70" r="4" className="fill-muted-foreground" />
      <text x="130" y="55" textAnchor="middle" className="fill-muted-foreground" fontSize="11">3.5→4</text>
      <text x="110" y="118" textAnchor="middle" className="fill-primary font-mono" fontSize="11">ties round to EVEN</text>
    </svg>
  );
}

function FractionMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="35" className="fill-foreground font-mono" fontSize="13">15.65 × 8</text>
      <text x="140" y="35" className="fill-muted-foreground font-mono" fontSize="12">= 125.2</text>
      <text x="20" y="60" className="fill-foreground font-mono" fontSize="13">round → 125</text>
      <text x="20" y="85" className="fill-foreground font-mono" fontSize="13">125 ÷ 8</text>
      <text x="130" y="85" className="fill-muted-foreground font-mono" fontSize="12">= 15.625</text>
      <text x="20" y="115" className="fill-primary font-mono" fontSize="14">= 15 5/8</text>
    </svg>
  );
}

const ROUND_GUIDE: GuideCardItem[] = [
  {
    key: "half",
    title: "Half-up / half-down — nearest with a tie rule",
    explain: (
      <>Most everyday rounding: pick the nearer integer for non-ties, and for
      an exact half use the tie rule. <strong>Half up</strong> sends the tie
      toward +∞ (so 2.5 → 3 and −2.5 → −2). <strong>Half down</strong> is
      the mirror. Half-away-from-zero and half-toward-zero are two more
      tie rules the calculator offers.</>
    ),
    formula: <>|x − ⌊x⌋| &lt; 0.5 → floor, &nbsp; &gt; 0.5 → ceiling, &nbsp; = 0.5 → tie rule</>,
    legend: [{ sym: "0.5", def: "the tie value that the method has to decide" }],
    diagram: <HalfUpMini />,
    example: { given: "2.5, method = half up", substitute: "tie → toward +∞", answer: "3" },
  },
  {
    key: "ceilfloor",
    title: "Ceiling and floor — one-way rounding",
    explain: (
      <>Ceiling always moves toward +∞ and floor always toward −∞, regardless
      of how close the input is to the next integer. Use them when you need a
      guaranteed upper bound (ceiling) or lower bound (floor) — for example,
      how many buses fit a group or how many whole tiles cover a floor.</>
    ),
    formula: <>ceil(x) = ⌈x⌉ &nbsp;·&nbsp; floor(x) = ⌊x⌋</>,
    legend: [{ sym: "⌈ ⌉", def: "smallest integer ≥ x" }, { sym: "⌊ ⌋", def: "largest integer ≤ x" }],
    diagram: <CeilFloorMini />,
    example: { given: "−5.01", substitute: "ceil vs floor", answer: "−5 vs −6" },
  },
  {
    key: "banker",
    title: "Half to even — banker's rounding",
    explain: (
      <>Ties round to the nearest <em>even</em> integer, so 2.5 → 2 and
      3.5 → 4. Because half the ties go up and half go down, sums and
      averages accumulate less bias than always-up rounding. It's the IEEE
      754 floating-point default and the standard in accounting.</>
    ),
    formula: <>tie → nearest even</>,
    legend: [{ sym: "half-even", def: "also called banker's rounding" }],
    diagram: <BankersMini />,
    example: { given: "2.5 and 3.5", substitute: "both round to even", answer: "2 and 4" },
  },
  {
    key: "fraction",
    title: "Round to a fraction",
    explain: (
      <>The second tool rounds a decimal to the nearest <span className="font-mono">1/n</span> —
      1/8, 1/16, 1/32 — the way engineering, shop and imperial measurements
      quantise sizes. Internally it scales by <span className="font-mono">n</span>,
      rounds to the nearest whole number, then divides back.</>
    ),
    formula: <>round(x · n) ÷ n</>,
    legend: [{ sym: "n", def: "the denominator of the fraction step" }],
    diagram: <FractionMini />,
    example: { given: "15.65 to nearest 1/8", substitute: "round(125.2) ÷ 8", answer: "15 5/8" },
  },
];
