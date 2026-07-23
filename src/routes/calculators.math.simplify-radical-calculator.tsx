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
import { primeFactorize, formatFactorsPowers } from "@/lib/math/core";

export const Route = createFileRoute("/calculators/math/simplify-radical-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Simplify Radical Calculator",
      title: "Simplify Radical Calculator — Reduce to Simplest Form",
      metaDescription:
        "Simplify square roots and nth roots to exact radical form (e.g. √50 = 5√2) with a full prime factorization walkthrough.",
      canonicalUrl: "/calculators/math/simplify-radical-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Simplify Radical Calculator",
          path: "/calculators/math/simplify-radical-calculator",
        },
      ],
      faqs: [
        {
          q: "How do I simplify a square root?",
          a: "Break the number under the root into its prime factors. Every pair of matching primes becomes one factor pulled out in front of the radical; anything left inside stays under it. For example, √72 = √(2·2·2·3·3) = 2·3·√2 = 6√2.",
        },
        {
          q: "What is a perfect square factor?",
          a: "A perfect square is a whole number that is the square of an integer (1, 4, 9, 16, 25, 36, 49, 64, …). To simplify a square root you look for the largest perfect square that divides the number under the radical.",
        },
        {
          q: "When is a radical already in simplest form?",
          a: "A radical is fully simplified when the number inside has no factor that is a perfect power of the root's index. For √n that means no perfect-square factor other than 1; for ³√n it means no perfect-cube factor other than 1.",
        },
        {
          q: "Can I simplify cube roots or higher roots?",
          a: "Yes. Choose the root index (3 for cube root, 4, 5, …). The calculator pulls out any group of n matching prime factors, so ³√54 = ³√(2·3·3·3) = 3·³√2.",
        },
      ],
    }),
  component: SimplifyRadicalPage,
});

type Result = {
  n: number;
  index: number;
  coefficient: number; // integer pulled outside
  radicand: number;    // remaining value inside
  decimal: number;
  steps: Step[];
  factors: Map<number, number>;
};

function simplify(n: number, index: number): Result {
  // Assumes n >= 0 and index >= 2 integers.
  const steps: Step[] = [];
  const rootLabel = index === 2 ? "√" : `${superscript(index)}√`;

  const givenStep: Step = {
    title: "Given",
    body: (
      <FormulaBlock>
        {rootLabel}
        {n}, root index n = {index}
      </FormulaBlock>
    ),
  };
  const formulaStep: Step = {
    title: "Write the formula (product rule for radicals)",
    body: (
      <FormulaWithLegend
        formula={<>ⁿ√(a · b) = ⁿ√a · ⁿ√b</>}
        legend={[
          { sym: "n", def: "the root index (2 for √, 3 for ³√, …)" },
          { sym: "a, b", def: "factors of the radicand" },
          { sym: "ⁿ√a", def: "escapes the radical whenever a is a perfect nth power" },
        ]}
      />
    ),
  };

  if (n === 0) {
    return {
      n,
      index,
      coefficient: 0,
      radicand: 1,
      decimal: 0,
      factors: new Map(),
      steps: [
        givenStep,
        {
          title: "Answer",
          body: <FormulaBlock>{rootLabel}0 = 0</FormulaBlock>,
        },
      ],
    };
  }

  if (n === 1) {
    return {
      n,
      index,
      coefficient: 1,
      radicand: 1,
      decimal: 1,
      factors: new Map(),
      steps: [
        givenStep,
        {
          title: "Answer",
          body: <FormulaBlock>{rootLabel}1 = 1</FormulaBlock>,
        },
      ],
    };
  }

  const factors = primeFactorize(n);
  steps.push(givenStep, formulaStep, {
    title: "Substitute — prime factorization of the radicand",
    body: (
      <FormulaBlock>
        {n} = {formatFactorsPowers(factors)}
      </FormulaBlock>
    ),
  });

  let coefficient = 1;
  const insidePairs: string[] = [];
  const outsidePairs: string[] = [];
  const remainingInside = new Map<number, number>();

  for (const [p, e] of factors) {
    const pulls = Math.floor(e / index);
    const leftover = e - pulls * index;
    if (pulls > 0) {
      coefficient *= Math.pow(p, pulls);
      outsidePairs.push(
        pulls === 1 ? String(p) : `${p}${superscript(pulls)}`,
      );
    }
    if (leftover > 0) {
      remainingInside.set(p, leftover);
      insidePairs.push(
        leftover === 1 ? String(p) : `${p}${superscript(leftover)}`,
      );
    }
  }

  const radicand = [...remainingInside.entries()].reduce(
    (acc, [p, e]) => acc * Math.pow(p, e),
    1,
  );

  steps.push({
    title: `Group factors into sets of ${index}`,
    body: (
      <FormulaBlock>
        {rootLabel}({formatFactorsPowers(factors)})
      </FormulaBlock>
    ),
  });

  steps.push({
    title: "Pull out complete groups; keep the rest inside",
    body: (
      <FormulaBlock>
        outside: {outsidePairs.length ? outsidePairs.join(" · ") : "1"}
        {"   "}·{"   "}inside: {insidePairs.length ? insidePairs.join(" · ") : "1"}
      </FormulaBlock>
    ),
  });

  steps.push({
    title: "Answer",
    body: (
      <FormulaBlock>
        {rootLabel}
        {n} = {formatSimplified(coefficient, radicand, index)}
      </FormulaBlock>
    ),
  });

  return {
    n,
    index,
    coefficient,
    radicand,
    decimal: Math.pow(n, 1 / index),
    steps,
    factors,
  };
}

function superscript(n: number): string {
  return String(n)
    .split("")
    .map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)])
    .join("");
}

function formatSimplified(
  coefficient: number,
  radicand: number,
  index: number,
): ReactNode {
  const rootLabel = index === 2 ? "√" : `${superscript(index)}√`;
  if (radicand === 1) return <>{coefficient}</>;
  if (coefficient === 1)
    return (
      <>
        {rootLabel}
        {radicand}
      </>
    );
  return (
    <>
      {coefficient}
      {rootLabel}
      {radicand}
    </>
  );
}

function RadicalGroupingDiagram({ n, index, factors }: { n: number; index: number; factors: Map<number, number> }) {
  if (n < 2) return null;
  // Build list of {prime, groupId, pulled} boxes.
  type Box = { prime: number; pulled: boolean; groupKey: string };
  const boxes: Box[] = [];
  let groupCounter = 0;
  for (const [p, e] of [...factors.entries()].sort((a, b) => a[0] - b[0])) {
    const pulls = Math.floor(e / index);
    let remaining = e;
    for (let g = 0; g < pulls; g++) {
      const key = `pulled-${p}-${g}`;
      for (let i = 0; i < index; i++) boxes.push({ prime: p, pulled: true, groupKey: key });
      remaining -= index;
      groupCounter++;
    }
    for (let i = 0; i < remaining; i++) {
      boxes.push({ prime: p, pulled: false, groupKey: `leftover-${p}` });
    }
  }
  if (boxes.length === 0) return null;

  const boxSize = 34;
  const gap = 6;
  const perRow = Math.min(boxes.length, 12);
  const rows = Math.ceil(boxes.length / perRow);
  const width = perRow * (boxSize + gap) + gap;
  const height = rows * (boxSize + gap) + gap + 20;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Grouping prime factors into sets of {index}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xl mx-auto" role="img" aria-label="Diagram of prime factors grouped for radical simplification">
        {boxes.map((b, i) => {
          const col = i % perRow;
          const row = Math.floor(i / perRow);
          const x = gap + col * (boxSize + gap);
          const y = gap + row * (boxSize + gap);
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={boxSize}
                height={boxSize}
                rx="6"
                className={b.pulled ? "fill-primary/20 stroke-primary" : "fill-muted/30 stroke-border"}
                strokeWidth="1.5"
              />
              <text x={x + boxSize / 2} y={y + boxSize / 2 + 4} textAnchor="middle" className={b.pulled ? "fill-primary text-xs font-mono font-semibold" : "fill-foreground text-xs font-mono"}>
                {b.prime}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground text-center">
        Highlighted groups of {index} matching primes are pulled outside the radical; ungrouped primes stay inside.
      </p>
    </div>
  );
}

function SimplifyRadicalPage() {
  const [nStr, setNStr] = useState("72");
  const [indexStr, setIndexStr] = useState("2");
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setRes(null);
    const n = Number(nStr.trim().replace(/[,\s_]/g, ""));
    const index = Number(indexStr.trim());
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      setErr("Enter a non-negative whole number under the radical.");
      return;
    }
    if (!Number.isFinite(index) || !Number.isInteger(index) || index < 2) {
      setErr("Root index must be a whole number ≥ 2.");
      return;
    }
    if (n > 1e12) {
      setErr("Please enter a value below 1,000,000,000,000 for fast factorization.");
      return;
    }
    setRes(simplify(n, index));
  };

  return (
    <MathCalcPage
      name="Simplify Radical Calculator"
      tagline="Reduce a square root or nth root to its exact simplest radical form. Enter the number under the radical (and optionally a different root index) to see every prime factor pulled out and what stays inside."
      extras={
        <>
<CalcSection title="What does it mean to simplify a radical?">
            <p>
              Simplifying a radical means rewriting it so that no perfect
              power of the root's index is left under the radical sign. For a
              square root, you pull out any perfect-square factor; for a cube
              root, any perfect-cube factor; and so on. The value doesn't
              change — you're just splitting the radical into an integer part
              in front and a smaller radical behind it.
            </p>
          </CalcSection>

          <CalcSection title="How the simplification works, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing this tool does with your radicand —
              the product rule that lets factors escape, the grouping trick
              that works for any root index, and how it decides a radical is
              already as simple as it gets.
            </p>
            <GuideCards items={RAD_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Simplifies square roots and any nth root (index ≥ 2)",
                "Returns exact radical form, not just a decimal approximation",
                "Shows the full prime factorization of the radicand",
                "Pulls out every perfect nth-power factor and keeps the rest inside",
                "Includes the decimal approximation as a check",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "How do I simplify a square root?",
                  a: (
                    <p>
                      Prime-factorize the number, pair up matching primes, and
                      pull one copy of each pair outside the radical. Whatever
                      doesn't pair up stays inside.
                    </p>
                  ),
                },
                {
                  q: "What is a perfect square factor?",
                  a: (
                    <p>
                      A factor that is itself a perfect square — 4, 9, 16, 25,
                      36, 49, 64, … When the number under a square root has
                      one of these as a factor, you can pull its root out
                      front.
                    </p>
                  ),
                },
                {
                  q: "Does this work for cube roots?",
                  a: (
                    <p>
                      Yes — set the root index to 3. The calculator groups
                      prime factors into sets of three instead of pairs. For
                      any index n it groups them into sets of n.
                    </p>
                  ),
                },
                {
                  q: "Why is √8 = 2√2?",
                  a: (
                    <p>
                      Because 8 = 4 · 2 and 4 is a perfect square (2²). So
                      √8 = √4 · √2 = 2√2. Prime-factor form: 8 = 2³ = 2² · 2,
                      one pair of 2's comes out and one 2 stays under.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/root-calculator", label: "Root Calculator" },
                { to: "/calculators/math/factor-calculator", label: "Factor Calculator" },
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px_auto]">
        <Field label="Number under the radical" htmlFor="n">
          <TextInput
            id="n"
            value={nStr}
            onChange={(e) => setNStr(e.target.value)}
            placeholder="e.g. 72"
            inputMode="numeric"
          />
        </Field>
        <Field label="Root index (n)" htmlFor="idx" hint="2 = square root, 3 = cube root">
          <TextInput
            id="idx"
            value={indexStr}
            onChange={(e) => setIndexStr(e.target.value)}
            placeholder="2"
            inputMode="numeric"
          />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={onCalc} className="w-full sm:w-auto">
            Simplify
          </PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {res && (
        <>
          <ResultBox
            label="Simplified radical"
            value={
              <span className="font-mono">
                {res.index === 2 ? "√" : `${superscript(res.index)}√`}
                {res.n} = {formatSimplified(res.coefficient, res.radicand, res.index)}
              </span>
            }
            note={
              <>
                Decimal approximation:{" "}
                <span className="font-mono tabular-nums">
                  {res.decimal.toPrecision(10).replace(/\.?0+$/, "")}
                </span>
                {res.coefficient !== 1 && res.radicand !== 1 && (
                  <>
                    <br />
                    Pulled out: {res.coefficient}. Left under the radical:{" "}
                    {res.radicand}.
                  </>
                )}
                {res.radicand === 1 && res.n > 1 && (
                  <>
                    <br />
                    {res.n} is a perfect {res.index === 2 ? "square" : `${res.index}th power`} — the root is a whole number.
                  </>
                )}
                {res.coefficient === 1 && res.radicand !== 1 && res.n > 1 && (
                  <>
                    <br />
                    Already in simplest form — no perfect{" "}
                    {res.index === 2 ? "square" : `${res.index}th power`}{" "}
                    factor to pull out.
                  </>
                )}
              </>
            }
          />
          <RadicalGroupingDiagram n={res.n} index={res.index} factors={res.factors} />
          <StepsToggle steps={res.steps} />
        </>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function ProductRuleMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <text x="110" y="30" textAnchor="middle" fontSize="14" fill="var(--color-primary)">√50 = √(25 · 2)</text>
      <text x="110" y="55" textAnchor="middle" fontSize="14" fill="var(--color-foreground)">= √25 · √2</text>
      <text x="110" y="80" textAnchor="middle" fontSize="16" fill="var(--color-primary)">= 5√2</text>
    </svg>
  );
}

function GroupingMini() {
  const groups = [[2,2,2],[3,3]];
  return (
    <svg viewBox="0 0 220 110" className="w-full">
      <rect x="1" y="1" width="218" height="108" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <text x="110" y="18" textAnchor="middle" fontSize="10" fill="var(--color-primary)">72 = 2 · 2 · 2 · 3 · 3</text>
      {groups.map((g, gi) => (
        <g key={gi}>
          {g.map((p, pi) => {
            const x = 30 + gi*90 + pi*20;
            return <circle key={pi} cx={x} cy="55" r="10" fill="var(--color-primary)/0.2" stroke="var(--color-primary)" />;
          })}
          {g.map((p, pi) => {
            const x = 30 + gi*90 + pi*20;
            return <text key={"t"+pi} x={x} y="58" textAnchor="middle" fontSize="10" fill="var(--color-foreground)">{p}</text>;
          })}
          <rect x={20 + gi*90} y="42" width={g.length*20 + 5} height="26" rx="4" fill="none" stroke="var(--color-primary)" strokeDasharray="3 2" />
        </g>
      ))}
      <text x="110" y="90" textAnchor="middle" fontSize="10" fill="var(--color-muted-foreground)">pair of 2's → 2 · pair of 3's → 3 · one 2 stays</text>
      <text x="110" y="103" textAnchor="middle" fontSize="12" fill="var(--color-primary)">√72 = 6√2</text>
    </svg>
  );
}

function AlreadySimpleMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <text x="55" y="30" textAnchor="middle" fontSize="10" fill="var(--color-muted-foreground)">15 = 3 · 5</text>
      <text x="55" y="55" textAnchor="middle" fontSize="16" fill="var(--color-primary)">√15</text>
      <text x="55" y="80" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">no pair → done</text>
      <line x1="110" y1="15" x2="110" y2="85" stroke="var(--color-border)" />
      <text x="165" y="30" textAnchor="middle" fontSize="10" fill="var(--color-muted-foreground)">4 = 2²</text>
      <text x="165" y="55" textAnchor="middle" fontSize="16" fill="var(--color-primary)">³√4</text>
      <text x="165" y="80" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">need three of a kind</text>
    </svg>
  );
}

const RAD_GUIDE: GuideCardItem[] = [
  {
    key: "prod",
    title: "Product rule — split off perfect powers",
    explain: (
      <>The radical of a product is the product of the radicals, so any
        perfect n-th power factor comes out as an integer coefficient in
        front of a smaller radical.</>
    ),
    formula: <>ⁿ√(a · b) = ⁿ√a · ⁿ√b</>,
    diagram: <ProductRuleMini />,
    example: {
      given: <span className="font-mono">√50</span>,
      substitute: <>√(25 · 2) = √25 · √2</>,
      answer: <span className="font-mono">5√2</span>,
    },
  },
  {
    key: "group",
    title: "Prime factors — group in n's for the n-th root",
    explain: (
      <>Factor the radicand into primes, group them in sets of{" "}
        <span className="font-mono">n</span> (the index), and pull one copy
        of each complete group out. Loose primes stay inside.</>
    ),
    formula: <>ⁿ√(pⁿ · m) = p · ⁿ√m</>,
    diagram: <GroupingMini />,
    example: {
      given: <span className="font-mono">√72, 72 = 2³ · 3²</span>,
      substitute: <>pair of 2's · pair of 3's · lone 2</>,
      answer: <span className="font-mono">6√2</span>,
    },
  },
  {
    key: "done",
    title: "When it can't be simplified further",
    explain: (
      <>A radical is already in simplest form when no prime appears at least{" "}
        <span className="font-mono">n</span> times in the factorization —
        there is no complete group to pull out.</>
    ),
    formula: <>ⁿ√m is simplest when every prime in m has exponent &lt; n</>,
    diagram: <AlreadySimpleMini />,
    example: {
      given: <span className="font-mono">³√4, 4 = 2²</span>,
      substitute: <>need three 2's to escape a cube root</>,
      answer: <span className="font-mono">³√4</span>,
    },
  },
];
