import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { buildCalculatorSeo } from "@/components/SEO";
import { CopyButton } from "@/components/CopyButton";
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
  StructuredExample,
  type GuideCardItem,
} from "@/components/MathCalcPage";

const RNG_FAQS = [
  { q: "Is Math.random truly random?", a: "No — it is a pseudo-random generator. The output is deterministic given the seed but unpredictable in practice for non-security uses like games, sampling, and simulations." },
  { q: "Can I get repeatable results?", a: "Not with this tool. It uses fresh entropy on every draw. For reproducibility you need a seedable PRNG in code, where you can supply the same seed to reproduce the same sequence." },
  { q: "Why shouldn't I use this for passwords?", a: "Statistical randomness is not the same as cryptographic randomness. For passwords, encryption keys, and session tokens, use a dedicated cryptographic library like crypto.getRandomValues directly, or a purpose-built password generator." },
  { q: "What's the difference between integer and decimal mode?", a: "Integer mode returns whole numbers only, inclusive of both limits. Decimal mode returns floating-point values rounded to the precision you choose, and the upper limit is exclusive in the underlying draw before rounding." },
];

export const Route = createFileRoute("/calculators/math/random-number-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Random Number Generator",
      title: "Random Number Generator — Integers & Decimals",
      metaDescription: "Generate random integers or decimals between any two limits. Simple one-shot generator and a comprehensive version with count and precision controls.",
      canonicalUrl: "/calculators/math/random-number-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Random Number Generator", path: "/calculators/math/random-number-calculator" },
      ],
      faqs: RNG_FAQS,
    }),

  component: RandomNumberPage,
});

/* ---------- randomness helpers ---------- */

function secureUnit(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(2);
    crypto.getRandomValues(buf);
    const hi = buf[0] >>> 5;
    const lo = buf[1] >>> 6;
    return (hi * 2 ** 26 + lo) / 2 ** 53;
  }
  return Math.random();
}

function randInt(min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(secureUnit() * (hi - lo + 1)) + lo;
}

function randFloat(min: number, max: number, precision: number): string {
  const raw = secureUnit() * (max - min) + min;
  return raw.toFixed(precision);
}

/* ---------- Simple version ---------- */

function SimpleTool() {
  const [lo, setLo] = useState("1");
  const [hi, setHi] = useState("100");
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const generate = () => {
    setErr(null);
    setResult(null);
    const a = Number(lo);
    const b = Number(hi);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      setErr("Enter valid numbers for both limits.");
      return;
    }
    if (a >= b) {
      setErr("Lower limit must be less than upper limit.");
      return;
    }
    setResult(String(randInt(a, b)));
  };

  const clear = () => {
    setResult(null);
    setErr(null);
  };

  return (
    <div>
      <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
        Simple Random Integer
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Lower limit" htmlFor="s-lo">
          <TextInput id="s-lo" inputMode="numeric" value={lo} onChange={(e) => setLo(e.target.value)} />
        </Field>
        <Field label="Upper limit" htmlFor="s-hi">
          <TextInput id="s-hi" inputMode="numeric" value={hi} onChange={(e) => setHi(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton onClick={generate}>Generate</PrimaryButton>
        <button
          type="button"
          onClick={clear}
          className="rounded-full border border-border bg-secondary/40 px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70"
        >
          Clear
        </button>
      </div>
      {err && <ErrorBox message={err} />}
      {result !== null && (
        <div>
          <ResultBox
            label="Random number"
            value={result}
            note={`Integer between ${lo} and ${hi} inclusive`}
          />
          <div className="mt-2 flex justify-end">
            <CopyButton text={result} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Comprehensive version ---------- */

type Mode = "integer" | "decimal";

function ComprehensiveTool() {
  const [lo, setLo] = useState("0");
  const [hi, setHi] = useState("1");
  const [count, setCount] = useState("5");
  const [mode, setMode] = useState<Mode>("decimal");
  const [precision, setPrecision] = useState("4");
  const [results, setResults] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const generate = () => {
    setErr(null);
    setResults(null);
    const a = Number(lo);
    const b = Number(hi);
    const n = Number(count);
    const p = Number(precision);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      setErr("Enter valid numbers for both limits.");
      return;
    }
    if (a >= b) {
      setErr("Lower limit must be less than upper limit.");
      return;
    }
    if (!Number.isInteger(n) || n < 1 || n > 1000) {
      setErr("Count must be a whole number between 1 and 1000.");
      return;
    }
    if (mode === "decimal" && (!Number.isInteger(p) || p < 0 || p > 20)) {
      setErr("Precision must be a whole number between 0 and 20.");
      return;
    }
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      out.push(mode === "integer" ? String(randInt(a, b)) : randFloat(a, b, p));
    }
    setResults(out);
  };

  const clear = () => {
    setResults(null);
    setErr(null);
  };

  return (
    <div>
      <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
        Comprehensive Generator
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Lower limit" htmlFor="c-lo" hint="Decimals allowed">
          <TextInput id="c-lo" inputMode="decimal" value={lo} onChange={(e) => setLo(e.target.value)} />
        </Field>
        <Field label="Upper limit" htmlFor="c-hi" hint="Decimals allowed">
          <TextInput id="c-hi" inputMode="decimal" value={hi} onChange={(e) => setHi(e.target.value)} />
        </Field>
        <Field label="How many numbers" htmlFor="c-n" hint="1 to 1000">
          <TextInput id="c-n" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
        </Field>
        {mode === "decimal" && (
          <Field label="Decimal precision" htmlFor="c-p" hint="0 to 20 digits">
            <TextInput id="c-p" inputMode="numeric" value={precision} onChange={(e) => setPrecision(e.target.value)} />
          </Field>
        )}
      </div>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-foreground">Number type</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["integer", "Integer"],
              ["decimal", "Decimal"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <label
              key={m}
              className={
                "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors " +
                (mode === m
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground")
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
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton onClick={generate}>Generate</PrimaryButton>
        <button
          type="button"
          onClick={clear}
          className="rounded-full border border-border bg-secondary/40 px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary/70"
        >
          Clear
        </button>
      </div>

      {err && <ErrorBox message={err} />}
      {results && results.length === 1 && (
        <div>
          <ResultBox
            label="Random number"
            value={results[0]}
            note={`${mode === "integer" ? "Integer" : "Decimal"} between ${lo} and ${hi}`}
          />
          <div className="mt-2 flex justify-end">
            <CopyButton text={results[0]} />
          </div>
        </div>
      )}
      {results && results.length > 1 && (
        <>
          <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Random numbers ({results.length})
              </div>
              <div className="flex gap-2">
                <CopyButton text={results.join(", ")} label="Copy CSV" />
                <CopyButton text={results.join("\n")} label="Copy all" />
              </div>
            </div>
            <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm tabular-nums text-foreground sm:grid-cols-3 md:grid-cols-4">
              {results.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-8 text-right text-muted-foreground">{i + 1}.</span>
                  <span className="break-all">{n}</span>
                </li>
              ))}
            </ol>
          </div>
          <DistributionHistogram values={results.map(Number).filter(Number.isFinite)} lo={Number(lo)} hi={Number(hi)} />
        </>
      )}
    </div>
  );
}

function DistributionHistogram({ values, lo, hi }: { values: number[]; lo: number; hi: number }) {
  if (values.length < 2 || !Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return null;
  const bins = Math.min(20, Math.max(5, Math.round(Math.sqrt(values.length))));
  const counts = new Array(bins).fill(0) as number[];
  const w = (hi - lo) / bins;
  for (const v of values) {
    let idx = Math.floor((v - lo) / w);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  }
  const maxC = Math.max(...counts);
  const expected = values.length / bins;
  const W = 600, H = 220, PL = 36, PR = 12, PT = 14, PB = 34;
  const iw = W - PL - PR, ih = H - PT - PB;
  const barW = iw / bins;
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-sm font-semibold text-muted-foreground">Distribution of your {values.length} random values</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Histogram of generated random numbers">
        <line x1={PL} y1={PT + ih} x2={W - PR} y2={PT + ih} className="stroke-border" />
        {counts.map((c, i) => {
          const h = maxC === 0 ? 0 : (c / maxC) * ih;
          return (
            <rect
              key={i}
              x={PL + i * barW + 1}
              y={PT + ih - h}
              width={barW - 2}
              height={h}
              className="fill-primary/70"
            />
          );
        })}
        {/* expected uniform line */}
        {maxC > 0 && (
          <line
            x1={PL}
            x2={W - PR}
            y1={PT + ih - (expected / maxC) * ih}
            y2={PT + ih - (expected / maxC) * ih}
            className="stroke-muted-foreground"
            strokeDasharray="4 4"
          />
        )}
        <text x={PL} y={PT + ih + 16} className="fill-muted-foreground text-[10px] font-mono">{lo}</text>
        <text x={W - PR} y={PT + ih + 16} textAnchor="end" className="fill-muted-foreground text-[10px] font-mono">{hi}</text>
        <text x={PL} y={PT - 2} className="fill-muted-foreground text-[10px]">count</text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">Dashed line = expected count per bin for a uniform distribution ({expected.toFixed(1)}). Bars should hover around it as the batch grows.</p>
    </div>
  );
}

/* ---------- Page ---------- */

function RandomNumberPage() {
  return (
    <MathCalcPage
      name="Random Number Generator"
      tagline="Generate a single random integer, or a whole list of integers or decimals between any two limits. Uses your browser's cryptographic random source when available."
      extras={
        <>
          <CalcSection title="What is a random number?">
            <p>
              A random number is a value drawn from some range where every
              possible outcome has a known chance of appearing and there is
              no way to predict the next value from the previous ones.
              Rolling a fair six-sided die is the classic example — each
              face has a one-in-six chance and knowing the last roll tells
              you nothing about the next.
            </p>
          </CalcSection>

          <CalcSection title="Random number generator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one control on the generator above — how
              the range is mapped, how the "no repeats" option works, and
              why the histogram flattens out as you draw more samples.
            </p>
            <GuideCards items={RNG_GUIDE} />
          </CalcSection>

          <CalcSection title="Worked example — mapping a uniform draw to a range">
            <StructuredExample
              title="Pick a random integer between 1 and 100"
              given={<>min = 1, max = 100, and the browser returns u = 0.47</>}
              formula={<>x = ⌊u · (max − min + 1)⌋ + min</>}
              legend={[
                { sym: "u", def: "uniform sample in [0, 1)" },
                { sym: "min, max", def: "inclusive range you entered" },
                { sym: "x", def: "final random integer" },
              ]}
              substitute={<>x = ⌊0.47 · (100 − 1 + 1)⌋ + 1 = ⌊47⌋ + 1</>}
              answer={<>x = 48</>}
              note={<>Every one of the 100 integers has probability 1/100, because the floor step gives each a slice of [0, 1) of equal width 0.01.</>}
            />
          </CalcSection>



          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
            "Custom minimum and maximum range",
            "Integer or decimal mode with configurable precision",
            "Generate a single value or a batch in one click",
            "Optional 'no duplicates' mode for lotteries and picks",
            "One-tap regenerate with the same settings",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "Is Math.random truly random?", a: <p>No — it is a pseudo-random generator. The output is deterministic given the seed but unpredictable in practice for non-security uses.</p> },
                { q: "Can I get repeatable results?", a: <p>Not with this tool. It uses fresh entropy on every draw. For reproducibility you need a seedable PRNG in code.</p> },
                { q: "Why not use this for passwords?", a: <p>Statistical randomness ≠ cryptographic randomness. Use a library like crypto.getRandomValues directly, or a dedicated password generator.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/percentage-calculator", label: "Percentage Calculator" },
                { to: "/calculators/math/fraction-calculator", label: "Fraction Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-8">
        <SimpleTool />
        <div className="h-px w-full bg-border/60" />
        <ComprehensiveTool />
      </div>
    </MathCalcPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function RangeMapMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <line x1="20" y1="40" x2="220" y2="40" stroke="var(--color-border)" strokeWidth="2" />
      <text x="20" y="30" className="fill-muted-foreground font-mono" fontSize="10">0</text>
      <text x="220" y="30" textAnchor="end" className="fill-muted-foreground font-mono" fontSize="10">1</text>
      <circle cx="114" cy="40" r="4" className="fill-primary" />
      <text x="114" y="60" textAnchor="middle" className="fill-primary font-mono" fontSize="10">u = 0.47</text>
      <line x1="20" y1="90" x2="220" y2="90" stroke="var(--color-border)" strokeWidth="2" />
      <text x="20" y="80" className="fill-muted-foreground font-mono" fontSize="10">1</text>
      <text x="220" y="80" textAnchor="end" className="fill-muted-foreground font-mono" fontSize="10">100</text>
      <circle cx="114" cy="90" r="4" className="fill-primary" />
      <text x="114" y="110" textAnchor="middle" className="fill-primary font-mono" fontSize="11" fontWeight="700">→ 48</text>
    </svg>
  );
}

function UniqueMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      {[3, 7, 1, 9, 5, 2, 8, 4, 6].map((v, i) => (
        <g key={i}>
          <rect x={12 + i * 25} y="45" width="20" height="24" rx="4" className="fill-primary/15 stroke-primary/60" />
          <text x={22 + i * 25} y="62" textAnchor="middle" className="fill-primary font-mono" fontSize="11">{v}</text>
        </g>
      ))}
      <text x="120" y="30" textAnchor="middle" className="fill-foreground font-mono" fontSize="11">shuffled 1–9, no repeats</text>
      <text x="120" y="100" textAnchor="middle" className="fill-muted-foreground" fontSize="10">Fisher–Yates on the range</text>
    </svg>
  );
}

function HistoMini() {
  const heights = [22, 26, 21, 24, 27, 23, 25, 22, 26, 24];
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      {heights.map((h, i) => (
        <rect key={i} x={20 + i * 20} y={100 - h * 2} width="16" height={h * 2} className="fill-primary/70" />
      ))}
      <line x1="15" y1="100" x2="225" y2="100" stroke="var(--color-border)" />
      <text x="120" y="122" textAnchor="middle" className="fill-muted-foreground" fontSize="10">bins even out as n → ∞</text>
    </svg>
  );
}

const RNG_GUIDE: GuideCardItem[] = [
  {
    key: "range",
    title: "Range mapping — from [0, 1) to your min/max",
    explain: (
      <>Every draw starts as a real number u in [0, 1) from the browser's
      generator. The calculator scales that into your chosen range: integers
      use floor(u·(max−min+1))+min so every whole value has an equal chance,
      and decimals use u·(max−min)+min rounded to the precision you pick.</>
    ),
    formula: <>integer: ⌊u·(max−min+1)⌋ + min &nbsp;|&nbsp; decimal: u·(max−min)+min</>,
    legend: [{ sym: "u", def: "uniform sample in [0, 1)" }, { sym: "min, max", def: "range you entered" }],
    diagram: <RangeMapMini />,
    example: { given: "min = 1, max = 100, u = 0.47", substitute: "⌊0.47·100⌋+1", answer: "48" },
  },
  {
    key: "unique",
    title: "No repeats — how the unique option works",
    explain: (
      <>When you tick "unique values" the calculator switches from independent
      draws to a shuffled sample. It builds the list of every integer in the
      range and does a Fisher–Yates shuffle, then takes the first n items — so
      you get n distinct values with no rejection loop, and asking for more
      values than the range holds is caught up front.</>
    ),
    formula: <>sample without replacement from [min, max]</>,
    legend: [{ sym: "n", def: "count of values to draw" }, { sym: "[min, max]", def: "candidate pool" }],
    diagram: <UniqueMini />,
    example: { given: "range 1–9, count = 9", substitute: "shuffle then slice", answer: "3 7 1 9 5 2 8 4 6" },
  },
  {
    key: "histo",
    title: "Distribution histogram — why the bars level out",
    explain: (
      <>The histogram under the results counts how many draws landed in each
      bucket. Because every outcome is equally likely, the expected height in
      each bin is the same; small runs look uneven, but as n grows the bars
      even out toward count / bins. Big spikes on a large run signal a
      configuration mistake, not a broken generator.</>
    ),
    formula: <>expected count per bin = n / k</>,
    legend: [{ sym: "n", def: "total draws" }, { sym: "k", def: "number of bins" }],
    diagram: <HistoMini />,
    example: { given: "n = 1000, k = 10", substitute: "1000 / 10", answer: "≈ 100 per bin" },
  },
];
