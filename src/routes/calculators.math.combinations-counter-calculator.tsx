import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
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
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

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

export const Route = createFileRoute("/calculators/math/combinations-counter-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Combinations Counter",
      title: "Combinations Counter — Permutations & Combinations",
      metaDescription:
        "Count arrangements the right way. Enter n and r, toggle order and repetition — the tool picks nPr, n^r, nCr or (n+r−1)Cr with steps.",
      canonicalUrl: "/calculators/math/combinations-counter-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Combinations Counter", path: "/calculators/math/combinations-counter-calculator" },
      ],
      faqs: [
        {
          q: "What is the difference between a permutation and a combination?",
          a: "Permutations count ordered arrangements — ABC and CAB are different. Combinations count unordered selections — {A, B, C} is one group regardless of the order you name it in. Same n and r, but permutations always give at least as large a count as combinations.",
        },
        {
          q: "How many possible 4-digit PINs are there?",
          a: "10,000. Each of the four digits can independently be 0–9, and order matters, so the count is 10^4 = 10 × 10 × 10 × 10 = 10,000. That's the 'order matters, repetition allowed' case.",
        },
        {
          q: "When does repetition matter?",
          a: "Repetition is allowed when you can reuse an item — PIN codes, license plates, coin flips. Repetition is not allowed when each item is used at most once — lottery draws, seating arrangements, hand of cards.",
        },
      ],
    }),
  component: CombinationsCounterPage,
});

// ---------------- Math (BigInt for large factorials) ----------------

function factorialBig(n: number): bigint {
  let r = 1n;
  for (let i = 2; i <= n; i++) r *= BigInt(i);
  return r;
}

function powBig(base: number, exp: number): bigint {
  let r = 1n;
  const b = BigInt(base);
  for (let i = 0; i < exp; i++) r *= b;
  return r;
}

// nPr = n! / (n-r)! = n · (n-1) · ... · (n-r+1)
function permutationsNoRep(n: number, r: number): bigint {
  let out = 1n;
  for (let i = 0; i < r; i++) out *= BigInt(n - i);
  return out;
}

// nCr = n! / (r! (n-r)!)  — multiplicative form, exact via BigInt
function combinationsNoRep(n: number, r: number): bigint {
  if (r > n - r) r = n - r;
  let num = 1n;
  let den = 1n;
  for (let i = 1; i <= r; i++) {
    num *= BigInt(n - r + i);
    den *= BigInt(i);
  }
  return num / den;
}

function fmtBig(b: bigint): string {
  const s = b.toString();
  // add thousands separators
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

type Mode =
  | "perm-no-rep"      // order matters, no repetition
  | "perm-with-rep"    // order matters, repetition allowed
  | "comb-no-rep"      // order doesn't matter, no repetition
  | "comb-with-rep";   // order doesn't matter, repetition allowed

function pickMode(orderMatters: boolean, repetition: boolean): Mode {
  if (orderMatters && !repetition) return "perm-no-rep";
  if (orderMatters && repetition) return "perm-with-rep";
  if (!orderMatters && !repetition) return "comb-no-rep";
  return "comb-with-rep";
}

interface ModeMeta {
  title: string;
  formula: string;
  example: string;
}

const MODE_META: Record<Mode, ModeMeta> = {
  "perm-no-rep": {
    title: "Permutations without repetition",
    formula: "nPr = n! / (n − r)!",
    example: "like choosing 1st, 2nd and 3rd place from a group of runners",
  },
  "perm-with-rep": {
    title: "Ordered with repetition",
    formula: "n^r",
    example: "like choosing an r-digit PIN from n possible digits",
  },
  "comb-no-rep": {
    title: "Combinations without repetition",
    formula: "nCr = n! / (r! (n − r)!)",
    example: "like drawing r lottery numbers from a pool of n",
  },
  "comb-with-rep": {
    title: "Combinations with repetition (multisets)",
    formula: "(n + r − 1)Cr",
    example: "like scooping r ice-cream scoops from n flavours (repeats allowed, order ignored)",
  },
};

interface CalcResult {
  mode: Mode;
  count: bigint;
  steps: Step[];
}

const NPR_LEGEND = [
  { sym: "n", def: "items to choose from" },
  { sym: "r", def: "positions / slots to fill" },
  { sym: "nPr", def: "ordered arrangements, no repeats" },
];
const NR_LEGEND = [
  { sym: "n", def: "options per slot" },
  { sym: "r", def: "number of slots" },
];
const NCR_LEGEND = [
  { sym: "n", def: "items to choose from" },
  { sym: "r", def: "items in each unordered group" },
  { sym: "nCr", def: "unordered selections, no repeats" },
];
const MULTI_LEGEND = [
  { sym: "n", def: "distinct item types" },
  { sym: "r", def: "items drawn (repeats allowed)" },
];

function calculate(n: number, r: number, mode: Mode): CalcResult {
  const steps: Step[] = [];
  steps.push({
    title: "Given",
    body: (
      <>
        <MathNote>{MODE_META[mode].title} — {MODE_META[mode].example}.</MathNote>
        <MathLine>n = {n}, r = {r}</MathLine>
      </>
    ),
  });

  let count: bigint;
  switch (mode) {
    case "perm-no-rep": {
      count = permutationsNoRep(n, r);
      const terms: string[] = [];
      for (let i = 0; i < r; i++) terms.push(String(n - i));
      steps.push({
        title: "Formula",
        body: <FormulaWithLegend formula={<>nPr = n! / (n − r)!</>} legend={NPR_LEGEND} />,
      });
      steps.push({
        title: "Substitute",
        body: (
          <>
            <MathLine>{n}P{r} = {n}! / ({n} − {r})!</MathLine>
            <MathLine>= {n}! / {n - r}!</MathLine>
            <MathLine>= {terms.join(" × ")}</MathLine>
          </>
        ),
      });
      steps.push({
        title: "Answer",
        body: <MathLine>{n}P{r} = {fmtBig(count)}</MathLine>,
      });
      break;
    }
    case "perm-with-rep": {
      count = powBig(n, r);
      steps.push({
        title: "Formula",
        body: <FormulaWithLegend formula={<>count = nʳ</>} legend={NR_LEGEND} />,
      });
      steps.push({
        title: "Substitute",
        body: <MathLine>{n}^{r} = {Array(r).fill(n).join(" × ")}</MathLine>,
      });
      steps.push({
        title: "Answer",
        body: <MathLine>{n}^{r} = {fmtBig(count)}</MathLine>,
      });
      break;
    }
    case "comb-no-rep": {
      count = combinationsNoRep(n, r);
      steps.push({
        title: "Formula",
        body: <FormulaWithLegend formula={<>nCr = n! / (r! · (n − r)!)</>} legend={NCR_LEGEND} />,
      });
      steps.push({
        title: "Substitute",
        body: (
          <>
            <MathLine>{n}C{r} = {n}! / ({r}! × ({n} − {r})!)</MathLine>
            <MathLine>= {n}! / ({r}! × {n - r}!)</MathLine>
          </>
        ),
      });
      if (n <= 40) {
        const rr = Math.min(r, n - r);
        const numTerms: string[] = [];
        for (let i = 0; i < rr; i++) numTerms.push(String(n - i));
        const denTerms: string[] = [];
        for (let i = 1; i <= rr; i++) denTerms.push(String(i));
        steps.push({
          title: "Cancel",
          body: (
            <>
              <MathNote>Cancel the shared factors so only r terms remain top and bottom</MathNote>
              <MathLine>= ({numTerms.join(" × ")}) / ({denTerms.join(" × ")})</MathLine>
            </>
          ),
        });
      }
      steps.push({
        title: "Answer",
        body: <MathLine>{n}C{r} = {fmtBig(count)}</MathLine>,
      });
      break;
    }
    case "comb-with-rep": {
      const top = n + r - 1;
      count = combinationsNoRep(top, r);
      steps.push({
        title: "Formula",
        body: <FormulaWithLegend formula={<>count = (n + r − 1)Cr</>} legend={MULTI_LEGEND} />,
      });
      steps.push({
        title: "Substitute",
        body: (
          <>
            <MathLine>({n} + {r} − 1)C{r} = {top}C{r}</MathLine>
            <MathLine>= {top}! / ({r}! × {top - r}!)</MathLine>
          </>
        ),
      });
      steps.push({
        title: "Answer",
        body: <MathLine>{top}C{r} = {fmtBig(count)}</MathLine>,
      });
      break;
    }
  }

  return { mode, count, steps };
}

// ---------------- Diagram: 2x2 decision matrix ----------------

function DecisionMatrix({ current }: { current: Mode }) {
  const cells: { mode: Mode; label: string; sub: string }[] = [
    { mode: "perm-no-rep", label: "nPr", sub: "n! / (n−r)!" },
    { mode: "perm-with-rep", label: "n^r", sub: "each slot free" },
    { mode: "comb-no-rep", label: "nCr", sub: "n! / (r!(n−r)!)" },
    { mode: "comb-with-rep", label: "(n+r−1)Cr", sub: "multiset" },
  ];
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">
        How the toggles pick a formula
      </div>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-xs">
        <div />
        <div className="text-center text-muted-foreground">
          No repetition
        </div>
        <div className="text-center text-muted-foreground">
          Repetition allowed
        </div>
        {(["Order matters", "Order doesn't matter"] as const).flatMap(
          (row, ri) => [
            <div
              key={"lbl" + ri}
              className="flex items-center pr-2 text-right text-muted-foreground"
            >
              {row}
            </div>,
            ...[0, 1].map((ci) => {
              const idx = ri * 2 + ci;
              const c = cells[idx];
              const active = c.mode === current;
              return (
                <div
                  key={c.mode}
                  className={
                    "rounded-lg border p-2 text-center transition-colors " +
                    (active
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border/60 bg-background/30 text-muted-foreground")
                  }
                >
                  <div className="font-mono text-sm font-semibold">
                    {c.label}
                  </div>
                  <div className="mt-0.5 text-[10px]">{c.sub}</div>
                </div>
              );
            }),
          ],
        )}
      </div>
    </div>
  );
}

// ---------------- Diagram: slots visualization ----------------

function SlotsDiagram({ n, r, mode }: { n: number; r: number; mode: Mode }) {
  // Cap visual slots to keep it readable
  const shownR = Math.min(r, 8);
  const truncated = r > shownR;

  // Options-per-slot text for each mode
  const perSlot = (i: number): string => {
    switch (mode) {
      case "perm-no-rep":
        return String(n - i);
      case "perm-with-rep":
        return String(n);
      case "comb-no-rep":
        return String(n - i);
      case "comb-with-rep":
        // (n+r−1)Cr — no natural per-slot; show n throughout
        return String(n);
    }
  };

  const divisor =
    mode === "comb-no-rep" ? `÷ ${r}!` : mode === "comb-with-rep" ? `÷ ${r}!` : "";

  const caption: Record<Mode, string> = {
    "perm-no-rep":
      "Each slot has one fewer option than the last — no repeats, order matters.",
    "perm-with-rep":
      "Every slot is an independent free choice from all n items.",
    "comb-no-rep":
      "Same as nPr, then divide by r! to strip out order.",
    "comb-with-rep":
      "Think of r identical stars placed among n bins — order ignored, repeats allowed.",
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">
        Counting slot by slot
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: shownR }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-muted-foreground">
                {mode === "perm-with-rep" || mode === "comb-no-rep" || mode === "perm-no-rep"
                  ? "×"
                  : "×"}
              </span>
            )}
            <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border border-border/60 bg-background/40">
              <div className="font-mono text-base font-semibold text-foreground">
                {perSlot(i)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                slot {i + 1}
              </div>
            </div>
          </div>
        ))}
        {truncated && (
          <span className="text-muted-foreground">× … ({r} slots total)</span>
        )}
        {divisor && (
          <span className="ml-2 font-mono text-sm text-muted-foreground">
            {divisor}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{caption[mode]}</p>
    </div>
  );
}

// ---------------- Diagram: dots for sample vs population ----------------

function SampleDotsDiagram({ n, r }: { n: number; r: number }) {
  const shownN = Math.min(n, 60);
  const truncated = n > shownN;
  const cols = Math.min(shownN, 12) || 1;
  const rows = Math.ceil(shownN / cols);
  const radius = 7;
  const spacing = 20;
  const width = cols * spacing;
  const height = rows * spacing;

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">
        Population of {n}, sample of {r}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-full"
        style={{ maxWidth: width }}
        role="img"
        aria-label={`${r} highlighted dots out of ${n} total`}
      >
        {Array.from({ length: shownN }, (_, i) => {
          const cx = (i % cols) * spacing + spacing / 2;
          const cy = Math.floor(i / cols) * spacing + spacing / 2;
          const inSample = i < Math.min(r, shownN);
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              className={inSample ? "fill-primary stroke-primary" : "fill-transparent stroke-border"}
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">
        Filled dots represent the {r} items chosen{truncated ? ` (of ${n} shown as ${shownN})` : ""} out of {n} total.
      </p>
    </div>
  );
}

// ---------------- Toggle ----------------

function YesNoToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm text-muted-foreground">{label}</div>
      <div className="flex rounded-xl border border-border/60 bg-secondary/30 p-1 text-sm">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={
            "flex-1 rounded-lg px-3 py-1.5 font-medium transition-colors " +
            (value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={
            "flex-1 rounded-lg px-3 py-1.5 font-medium transition-colors " +
            (!value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          No
        </button>
      </div>
    </div>
  );
}

// ---------------- Page ----------------

const MAX_N = 500;
const MAX_R_REP = 60; // for n^r expansion sanity

function CombinationsCounterPage() {
  const [nStr, setNStr] = useState("10");
  const [rStr, setRStr] = useState("4");
  const [orderMatters, setOrderMatters] = useState(true);
  const [repetition, setRepetition] = useState(true);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const currentMode = pickMode(orderMatters, repetition);
  const meta = MODE_META[currentMode];

  const onCalc = () => {
    setErr(null);
    setResult(null);
    const n = Number(nStr);
    const r = Number(rStr);
    if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0) {
      setErr("n and r must be non-negative whole numbers.");
      return;
    }
    if (n > MAX_N || r > MAX_N) {
      setErr(`Keep n and r at ${MAX_N} or below for a responsive calculation.`);
      return;
    }
    if (!repetition && r > n) {
      setErr("Without repetition, r cannot exceed n — you can't pick more items than exist.");
      return;
    }
    if (currentMode === "perm-with-rep" && r > MAX_R_REP) {
      setErr(`For ordered with repetition, keep r ≤ ${MAX_R_REP} so the expansion stays readable.`);
      return;
    }
    setResult(calculate(n, r, currentMode));
  };

  const resultDisplay: ReactNode = result ? (
    <span className="font-mono">{fmtBig(result.count)}</span>
  ) : null;

  return (
    <MathCalcPage
      name="Combinations Counter"
      tagline="Count the number of ways to arrange or choose things. Enter how many items you have (n) and how many slots to fill (r), then set the two toggles — the calculator picks the right formula from permutations, combinations and their repetition-allowed cousins."
      extras={
        <>
          <CalcSection title="Why does order matter sometimes?">
            <p>
              Whether order matters is the first question to ask before
              counting. Contrast a bike-lock combination with a lottery
              draw:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                A 4-digit <strong>bike lock</strong> reading "1-2-3-4"
                is a different combination from "4-3-2-1" — order
                matters, so you count with permutations.
              </li>
              <li>
                A <strong>lottery draw</strong> of {"{3, 7, 12, 22, 45, 46}"}{" "}
                is the same winning ticket whichever order the balls
                come out — order doesn't matter, so you count with
                combinations.
              </li>
            </ul>
            <p>
              Repetition is the second question: can an item appear more
              than once? PIN codes yes, lottery draws no. Together the
              two toggles pick exactly one of the four formulas below.
            </p>
          </CalcSection>

<CalcSection title="The four count modes, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one of the four counting modes this tool
              switches between — what the mode assumes about order and
              repetition, the exact formula it uses, and a worked example
              that matches the mode's classic archetype.
            </p>
            <GuideCards items={COUNT_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "One calculator for all four counting cases — permutations and combinations, with or without repetition",
                "Automatically selects nPr, n^r, nCr or (n + r − 1)Cr based on the two toggles",
                "Live 2×2 decision matrix highlights the formula your toggles pick",
                "Practical framing (PIN codes, lottery draws, ice-cream scoops) so the result is easy to interpret",
                "BigInt arithmetic — exact counts even when n! would overflow a regular number",
                "Step-by-step working shows the formula, the substitution and the cancellation",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What's the exact difference between permutations and combinations?",
                  a: (
                    <p>
                      A permutation is an <em>ordered</em> arrangement
                      — ABC and CAB count as different. A combination
                      is an <em>unordered</em> selection — {"{A, B, C}"}{" "}
                      is a single set regardless of how you list its
                      members. Permutations are always ≥ combinations
                      for the same n and r, since each combination
                      corresponds to r! different orderings.
                    </p>
                  ),
                },
                {
                  q: "How many 4-digit PINs are possible?",
                  a: (
                    <p>
                      10,000. Each digit is independently 0–9 and
                      repetition is allowed, so the count is 10^4. If
                      repeats were forbidden the count would be 10P4 =
                      10 × 9 × 8 × 7 = 5,040 instead.
                    </p>
                  ),
                },
                {
                  q: "Why isn't r > n allowed without repetition?",
                  a: (
                    <p>
                      Because you can't pick more distinct items than
                      exist — 5C10 would ask "how many ways to pick 10
                      distinct items from a pool of 5?", which is zero.
                      The calculator flags this instead of silently
                      returning 0. With repetition allowed, r can
                      exceed n freely.
                    </p>
                  ),
                },
                {
                  q: "Can I compute nCr when n is very large?",
                  a: (
                    <p>
                      Yes — the calculator uses BigInt with the
                      multiplicative form (n · (n−1) · … · (n−r+1)) / r!
                      instead of computing n! directly. This is exact
                      even for n in the hundreds, where n! would have
                      thousands of digits.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/factor-calculator", label: "Factor Calculator" },
                { to: "/calculators/math/probability-calculator", label: "Probability Calculator (coming soon)" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="n — items to choose from" htmlFor="n">
            <TextInput
              id="n"
              value={nStr}
              onChange={(e) => setNStr(e.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="r — positions / slots to fill" htmlFor="r">
            <TextInput
              id="r"
              value={rStr}
              onChange={(e) => setRStr(e.target.value)}
              inputMode="numeric"
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <YesNoToggle
            label="Order matters?"
            value={orderMatters}
            onChange={setOrderMatters}
          />
          <YesNoToggle
            label="Repetition allowed?"
            value={repetition}
            onChange={setRepetition}
          />
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 text-sm">
          <div className="text-foreground">
            <span className="text-muted-foreground">Formula selected:</span>{" "}
            <span className="font-mono">{meta.formula}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {meta.title} — {meta.example}.
          </div>
        </div>
        <PrimaryButton onClick={onCalc}>Count arrangements</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <>
          <ResultBox
            label="Number of arrangements"
            value={resultDisplay}
            note={`${MODE_META[result.mode].title} · ${MODE_META[result.mode].example}.`}
          />
          <SampleDotsDiagram n={Number(nStr)} r={Number(rStr)} />
          <DecisionMatrix current={result.mode} />
          <SlotsDiagram
            n={Number(nStr)}
            r={Number(rStr)}
            mode={result.mode}
          />
          <StepsToggle steps={result.steps} />
        </>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function OrderedNoRepMini() {
  return (
    <svg viewBox="0 0 220 90" className="w-full">
      <rect x="1" y="1" width="218" height="88" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      {["8","7","6"].map((v,i)=>(
        <g key={i}>
          <rect x={30+i*55} y="30" width="45" height="30" rx="6" fill="color-mix(in srgb, var(--color-primary) 12%, transparent)" stroke="var(--color-primary)" />
          <text x={52+i*55} y="49" textAnchor="middle" fontSize="14" fill="var(--color-foreground)">{v}</text>
          {i<2 && <text x={82+i*55} y="49" textAnchor="middle" fontSize="12" fill="var(--color-primary)">×</text>}
        </g>
      ))}
      <text x="110" y="80" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">choices shrink: 8 → 7 → 6 · order matters</text>
    </svg>
  );
}

function OrderedRepMini() {
  return (
    <svg viewBox="0 0 220 90" className="w-full">
      <rect x="1" y="1" width="218" height="88" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      {[0,1,2,3].map(i=>(
        <g key={i}>
          <rect x={20+i*48} y="30" width="40" height="30" rx="6" fill="color-mix(in srgb, var(--color-primary) 12%, transparent)" stroke="var(--color-primary)" />
          <text x={40+i*48} y="49" textAnchor="middle" fontSize="12" fill="var(--color-foreground)">10</text>
          {i<3 && <text x={65+i*48} y="49" textAnchor="middle" fontSize="12" fill="var(--color-primary)">×</text>}
        </g>
      ))}
      <text x="110" y="80" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">every slot independent: 10 × 10 × 10 × 10</text>
    </svg>
  );
}

function UnorderedNoRepMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <text x="110" y="24" textAnchor="middle" fontSize="12" fill="var(--color-primary)">nPr / r!</text>
      <text x="110" y="52" textAnchor="middle" fontSize="10" fill="var(--color-foreground)">count arrangements, then divide out order</text>
      {[0,1,2,3,4,5].map(i=>(
        <circle key={i} cx={45 + i*26} cy="72" r="8" fill="color-mix(in srgb, var(--color-primary) 20%, transparent)" stroke="var(--color-primary)" />
      ))}
      <text x="110" y="94" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">6 distinct items chosen · order thrown away</text>
    </svg>
  );
}

function UnorderedRepMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <text x="110" y="24" textAnchor="middle" fontSize="12" fill="var(--color-primary)">stars & bars</text>
      <g fontSize="16" fill="var(--color-foreground)" fontFamily="monospace">
        <text x="30" y="60">★★</text>
        <text x="65" y="60">|</text>
        <text x="80" y="60">★</text>
        <text x="105" y="60">|</text>
        <text x="120" y="60">|</text>
        <text x="135" y="60">★★★</text>
        <text x="175" y="60">|</text>
      </g>
      <text x="110" y="92" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">place r stars into n bins → (n+r−1)Cr</text>
    </svg>
  );
}

const COUNT_GUIDE: GuideCardItem[] = [
  {
    key: "npr",
    title: "Permutations without repetition — nPr",
    explain: <>Order matters and each item can be used at most once. The tool multiplies a shrinking chain of choices: n · (n−1) · … · (n−r+1).</>,
    formula: <>nPr = n! / (n − r)!</>,
    legend: NPR_LEGEND,
    diagram: <OrderedNoRepMini />,
    example: {
      given: <span className="font-mono">n = 8 runners, r = 3 medals</span>,
      substitute: <>8 · 7 · 6</>,
      answer: <span className="font-mono">336 arrangements</span>,
    },
  },
  {
    key: "nr",
    title: "Ordered with repetition — n^r",
    explain: <>Each of the r positions is an independent choice from all n items, so the counts multiply as the same n each time.</>,
    formula: <>count = nʳ</>,
    legend: NR_LEGEND,
    diagram: <OrderedRepMini />,
    example: {
      given: <span className="font-mono">n = 10 digits, r = 4 slots</span>,
      substitute: <>10 · 10 · 10 · 10</>,
      answer: <span className="font-mono">10,000 PINs</span>,
    },
  },
  {
    key: "ncr",
    title: "Combinations without repetition — nCr",
    explain: <>Order doesn't matter and each item can appear at most once. The tool counts arrangements first, then divides out the r! ways a chosen set can be reordered.</>,
    formula: <>nCr = n! / (r!·(n − r)!)</>,
    legend: NCR_LEGEND,
    diagram: <UnorderedNoRepMini />,
    example: {
      given: <span className="font-mono">n = 49, r = 6</span>,
      substitute: <>49! / (6! · 43!)</>,
      answer: <span className="font-mono">13,983,816 tickets</span>,
    },
  },
  {
    key: "multi",
    title: "Combinations with repetition — (n+r−1)Cr",
    explain: <>Unordered but items can repeat — the "multiset" count. The classic stars-and-bars picture converts the problem into choosing r stars among (n+r−1) positions.</>,
    formula: <>count = (n + r − 1)Cr</>,
    legend: MULTI_LEGEND,
    diagram: <UnorderedRepMini />,
    example: {
      given: <span className="font-mono">n = 5 flavours, r = 3 scoops</span>,
      substitute: <>7C3 = 7! / (3!·4!)</>,
      answer: <span className="font-mono">35 cones</span>,
    },
  },
];
