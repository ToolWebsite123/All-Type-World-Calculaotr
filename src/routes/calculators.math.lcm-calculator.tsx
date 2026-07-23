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
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import {
  gcdMany,
  lcmMany,
  parseIntList,
  primeFactorize,
  formatFactorsExpanded,
  formatFactorsPowers,
} from "@/lib/math/core";

function LcmBarDiagram({ inputs, factors, combined }: { inputs: number[]; factors: Map<number, number>[]; combined: Map<number, number> }) {
  const primes = [...combined.keys()].sort((a, b) => a - b);
  if (primes.length === 0) return null;
  const maxExp = Math.max(...primes.map((p) => combined.get(p) ?? 0));
  const chartW = 600;
  const chartH = 260;
  const padL = 50;
  const padB = 30;
  const groupW = (chartW - padL - 20) / primes.length;
  const barUnit = (chartH - padB - 20) / maxExp;
  const colors = ["fill-primary/70", "fill-secondary", "fill-muted-foreground/50", "fill-primary/40", "fill-accent"];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Prime factor multiplicities used for the LCM
      </div>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full max-w-xl mx-auto" role="img" aria-label="Bar chart of prime exponents for LCM">
        <line x1={padL} y1={chartH - padB} x2={chartW - 10} y2={chartH - padB} className="stroke-border" strokeWidth="1" />
        {primes.map((p, i) => {
          const x = padL + i * groupW + groupW / 2;
          return (
            <g key={p}>
              {inputs.map((n, j) => {
                const e = factors[j].get(p) ?? 0;
                if (e === 0) return null;
                const bx = x - (inputs.length * 14) / 2 + j * 14;
                const bh = e * barUnit;
                return (
                  <rect
                    key={j}
                    x={bx}
                    y={chartH - padB - bh}
                    width={10}
                    height={bh}
                    className={colors[j % colors.length]}
                  />
                );
              })}
              <text x={x} y={chartH - padB + 16} textAnchor="middle" className="fill-muted-foreground text-xs font-mono">
                {p}^{combined.get(p)}
              </text>
            </g>
          );
        })}
        <text x={padL} y={16} className="fill-muted-foreground text-xs">
          exponent
        </text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground text-center">
        For each prime, the LCM takes the tallest bar — the highest exponent seen across all inputs.
      </p>
    </div>
  );
}

export const Route = createFileRoute("/calculators/math/lcm-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "LCM Calculator",
      title: "LCM Calculator — Least Common Multiple Finder",
      metaDescription:
        "Find the least common multiple (LCM) of any list of whole numbers with step-by-step prime factorization and the GCD as a bonus result.",
      canonicalUrl: "/calculators/math/lcm-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "LCM Calculator", path: "/calculators/math/lcm-calculator" },
      ],
      faqs: [
        {
          q: "What is the difference between LCM and GCF?",
          a: "The GCF (greatest common factor) is the largest number that divides every input evenly, while the LCM (least common multiple) is the smallest positive number that every input divides into. They are linked by the identity a × b = GCF(a, b) × LCM(a, b) for any two positive integers.",
        },
        {
          q: "How do I find the LCM of more than two numbers?",
          a: "Work pairwise. First compute LCM of the first two numbers, then take the LCM of that result with the next number, and continue until you have folded in every input. The order does not change the final answer.",
        },
        {
          q: "Can the LCM be smaller than the largest input?",
          a: "No. The LCM is always greater than or equal to the largest number in your list, because it must be a multiple of every input including the largest one.",
        },
      ],
    }),
  component: LcmPage,
});

type Solution = {
  inputs: number[];
  factors: Map<number, number>[];
  combined: Map<number, number>;
  lcm: number;
  gcd: number;
  steps: Step[];
};

function solve(nums: number[]): Solution {
  const factors = nums.map((n) => primeFactorize(n));
  const combined = new Map<number, number>();
  for (const f of factors) {
    for (const [p, e] of f) {
      combined.set(p, Math.max(combined.get(p) ?? 0, e));
    }
  }
  const lcmVal = lcmMany(nums);
  const gcdVal = gcdMany(nums);

  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <FormulaBlock>
          numbers: {nums.join(", ")}
        </FormulaBlock>
      ),
    },
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>LCM(n₁, n₂, …) = ∏ pᵢ^max(eᵢ)</>}
          legend={[
            { sym: "nᵢ", def: "each input number" },
            { sym: "pᵢ", def: "every prime appearing in any input's factorization" },
            { sym: "max(eᵢ)", def: "highest power of that prime across all inputs" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — prime factorization of each number",
      body: (
        <FormulaBlock>
          <ul className="space-y-1">
            {nums.map((n, i) => (
              <li key={i}>
                {n} = {formatFactorsExpanded(factors[i])}
              </li>
            ))}
          </ul>
        </FormulaBlock>
      ),
    },
    {
      title: "Take the highest power of each prime",
      body: (
        <FormulaBlock>
          LCM = {formatFactorsPowers(combined)}
        </FormulaBlock>
      ),
    },
    {
      title: "Answer",
      body: (
        <FormulaBlock>
          LCM({nums.join(", ")}) = {formatFactorsExpanded(combined)} = <strong>{lcmVal}</strong>
        </FormulaBlock>
      ),
    },
    {
      title: "Bonus — greatest common divisor",
      body: (
        <FormulaBlock>
          GCD({nums.join(", ")}) = {gcdVal}
        </FormulaBlock>
      ),
    },
  ];

  return { inputs: nums, factors, combined, lcm: lcmVal, gcd: gcdVal, steps };
}

function LcmPage() {
  const [nums, setNums] = useState("330, 75, 450, 225");
  const [sol, setSol] = useState<Solution | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const compute = () => {
    setErr(null);
    setSol(null);
    try {
      const parsed = parseIntList(nums);
      if (parsed.length < 2) {
        setErr("Enter at least two whole numbers, separated by commas");
        return;
      }
      if (parsed.some((n) => n <= 0)) {
        setErr("Enter positive integers only (each number must be ≥ 1)");
        return;
      }
      setSol(solve(parsed));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input");
    }
  };

  return (
    <MathCalcPage
      name="LCM Calculator"
      tagline="Least common multiple of any list of positive whole numbers — with step-by-step prime factorization and the GCD shown as a bonus."
      extras={
        <>
          <CalcSection title="What is the least common multiple?">
            <p>
              The least common multiple (LCM) of a set of positive integers is
              the smallest positive number that every input divides into with
              no remainder. It is what you need whenever repeating things must
              line up: common denominators for fractions, syncing schedules,
              or packing quantities into several bundle sizes.
            </p>
          </CalcSection>

          <CalcSection title="LCM calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one part of what this calculator does with
              your input — how it factors each number, how it builds the LCM
              from those factors, and the shortcut that keeps it fast for
              large values.
            </p>
            <GuideCards items={LCM_GUIDE} />
          </CalcSection>


          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Accepts a comma- or space-separated list of two or more positive integers",
                "Shows the prime factorization of every input",
                "Explains how the LCM is built by taking the highest power of each prime",
                "Also reports the GCD of the same set of numbers",
                "Handles large numbers without overflow using the GCD identity",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is the difference between LCM and GCF?",
                  a: (
                    <p>
                      GCF is the largest number that divides every input; LCM
                      is the smallest number every input divides into. For two
                      positive integers they satisfy a × b = GCF(a, b) × LCM(a, b).
                    </p>
                  ),
                },
                {
                  q: "How do I find the LCM of more than two numbers?",
                  a: (
                    <p>
                      Work pairwise: LCM of the first two, then the LCM of
                      that with the next number, and so on until every input
                      has been folded in.
                    </p>
                  ),
                },
                {
                  q: "Can the LCM be smaller than the largest input?",
                  a: (
                    <p>
                      No — the LCM must be a multiple of every input, so it is
                      always at least as large as the biggest number in the
                      list.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/gcf-calculator", label: "GCF Calculator" },
                { to: "/calculators/math/fraction-calculator", label: "Fraction Calculator" },
                { to: "/calculators/math/ratio-calculator", label: "Ratio Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Numbers" htmlFor="nums" hint="Two or more positive integers, separated by commas or spaces">
          <TextInput
            id="nums"
            value={nums}
            onChange={(e) => setNums(e.target.value)}
            placeholder="e.g. 330, 75, 450, 225"
          />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">
            Calculate
          </PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {sol && (
        <>
          <ResultBox
            label={`LCM(${sol.inputs.join(", ")})`}
            value={sol.lcm.toLocaleString()}
            note={
              <>
                = {formatFactorsPowers(sol.combined)}
              </>
            }
          />
          <ResultBox
            label={`GCD(${sol.inputs.join(", ")})`}
            value={sol.gcd.toLocaleString()}
            note="Largest integer that divides every input evenly."
          />
          <LcmBarDiagram inputs={sol.inputs} factors={sol.factors} combined={sol.combined} />
          <StepsToggle steps={sol.steps} />
        </>
      )}
    </MathCalcPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function MultiplesMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="30" className="fill-foreground font-mono" fontSize="11">6: 6 12 18 <tspan className="fill-primary" fontWeight="700">24</tspan> 30 36</text>
      <text x="10" y="55" className="fill-foreground font-mono" fontSize="11">8: 8 16 <tspan className="fill-primary" fontWeight="700">24</tspan> 32 40 48</text>
      <line x1="10" y1="70" x2="230" y2="70" stroke="var(--color-border)" />
      <text x="120" y="100" textAnchor="middle" className="fill-primary font-mono" fontSize="16" fontWeight="700">LCM = 24</text>
    </svg>
  );
}

function PrimeStackMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="24" className="fill-foreground font-mono" fontSize="11">12 = 2² × 3</text>
      <text x="10" y="44" className="fill-foreground font-mono" fontSize="11">18 = 2 × 3²</text>
      <text x="10" y="64" className="fill-foreground font-mono" fontSize="11">30 = 2 × 3 × 5</text>
      <line x1="10" y1="76" x2="230" y2="76" stroke="var(--color-border)" />
      <text x="10" y="98" className="fill-primary font-mono" fontSize="12" fontWeight="700">max: 2², 3², 5</text>
      <text x="10" y="118" className="fill-primary font-mono" fontSize="14" fontWeight="700">= 4 × 9 × 5 = 180</text>
    </svg>
  );
}

function GcdBridgeMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="120" y="30" textAnchor="middle" className="fill-foreground font-mono" fontSize="13">a × b</text>
      <line x1="60" y1="42" x2="180" y2="42" stroke="var(--color-muted-foreground)" strokeWidth="1.5" />
      <text x="120" y="62" textAnchor="middle" className="fill-foreground font-mono" fontSize="13">GCD(a,b)</text>
      <text x="120" y="90" textAnchor="middle" className="fill-primary font-mono" fontSize="12">= LCM(a,b)</text>
      <text x="120" y="115" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="11">12·18 / 6 = 36</text>
    </svg>
  );
}

const LCM_GUIDE: GuideCardItem[] = [
  {
    key: "brute",
    title: "List multiples — the visual method",
    explain: (
      <>Write out multiples of each number and look for the smallest one that
      appears in every list. This is what happens on paper, and the calculator's
      first result box mirrors it: <strong>the smallest number every input
      divides into</strong>.</>
    ),
    formula: <>smallest m with m mod aᵢ = 0 for every input aᵢ</>,
    diagram: <MultiplesMini />,
    example: { given: "a = 6, b = 8", substitute: "first common multiple", answer: "24" },
  },
  {
    key: "prime",
    title: "Prime factorization — how the calculator builds the LCM",
    explain: (
      <>Every result on this page uses the prime-factorization method: factor
      each input, then for each prime that appears, take the <em>highest</em>
      power seen across the inputs. Multiplying those together gives the LCM.
      The bar chart above shows exactly which exponent won for each prime.</>
    ),
    formula: <>LCM = ∏ p<sup>max(eᵢ)</sup></>,
    legend: [{ sym: "p", def: "each prime that appears in any input" }, { sym: "eᵢ", def: "the exponent of p in input i" }],
    diagram: <PrimeStackMini />,
    example: { given: "12, 18, 30", substitute: "2², 3², 5¹", answer: "180" },
  },
  {
    key: "gcd",
    title: "GCD shortcut — why the answer stays exact for huge numbers",
    explain: (
      <>The calculator also reports the GCD, and the two are linked by
      a × b = GCD(a,b) × LCM(a,b). Folding this identity pairwise across the
      list avoids ever multiplying enormous numbers together — that is how the
      tool stays instant even when the inputs get big.</>
    ),
    formula: <>LCM(a, b) = a × b / GCD(a, b)</>,
    legend: [{ sym: "GCD", def: "greatest common divisor of the two numbers" }],
    diagram: <GcdBridgeMini />,
    example: { given: "12 and 18, GCD = 6", substitute: "12 × 18 / 6", answer: "36" },
  },
];
