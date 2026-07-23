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
  parseIntList,
  primeFactorize,
  formatFactorsExpanded,
} from "@/lib/math/core";

function GcfVennDiagram({ a, b, aFactors, bFactors }: { a: number; b: number; aFactors: Map<number, number>; bFactors: Map<number, number> }) {
  const aPrimes = [...aFactors.keys()];
  const bPrimes = [...bFactors.keys()];
  const shared = aPrimes.filter((p) => bFactors.has(p));
  const aOnly = aPrimes.filter((p) => !bFactors.has(p));
  const bOnly = bPrimes.filter((p) => !aFactors.has(p));

  const fmt = (p: number, m: Map<number, number>) => {
    const e = m.get(p) ?? 1;
    return e > 1 ? `${p}^${e}` : `${p}`;
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        Venn diagram of prime factors
      </div>
      <svg viewBox="0 0 600 300" className="w-full max-w-xl mx-auto" role="img" aria-label="Venn diagram of shared prime factors">
        <circle cx="230" cy="150" r="130" className="fill-primary/10 stroke-primary/50" strokeWidth="2" />
        <circle cx="370" cy="150" r="130" className="fill-secondary/40 stroke-muted-foreground/40" strokeWidth="2" />
        <text x="120" y="60" className="fill-foreground text-sm font-mono">{a}</text>
        <text x="440" y="60" className="fill-foreground text-sm font-mono" textAnchor="end">{b}</text>
        <text x="150" y="150" textAnchor="middle" className="fill-foreground text-xs font-mono">
          {aOnly.length ? aOnly.map((p) => fmt(p, aFactors)).join(", ") : "—"}
        </text>
        <text x="450" y="150" textAnchor="middle" className="fill-foreground text-xs font-mono">
          {bOnly.length ? bOnly.map((p) => fmt(p, bFactors)).join(", ") : "—"}
        </text>
        <text x="300" y="145" textAnchor="middle" className="fill-primary text-sm font-mono font-semibold">
          {shared.length ? shared.map((p) => fmt(p, aFactors)).join(", ") : "1"}
        </text>
        <text x="300" y="165" textAnchor="middle" className="fill-primary text-xs">
          GCF factors
        </text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground text-center">
        Shared prime factors (the overlap) multiply together to give the GCF.
      </p>
    </div>
  );
}

export const Route = createFileRoute("/calculators/math/gcf-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "GCF Calculator",
      title: "GCF Calculator — Greatest Common Factor Finder",
      metaDescription:
        "Find the greatest common factor (GCF/GCD) of any list of whole numbers, with step-by-step prime factorization and the Euclidean algorithm shown side by side.",
      canonicalUrl: "/calculators/math/gcf-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "GCF Calculator", path: "/calculators/math/gcf-calculator" },
      ],
      faqs: [
        {
          q: "Is GCF the same as GCD?",
          a: "Yes. Greatest common factor (GCF) and greatest common divisor (GCD) are two names for the same number — the largest positive integer that divides every input in the set with no remainder.",
        },
        {
          q: "What is the fastest way to find the GCF of large numbers?",
          a: "Use the Euclidean algorithm. Repeatedly replace the larger number with the remainder of dividing it by the smaller one until the remainder is zero — the last non-zero remainder is the GCF. It is dramatically faster than prime factorization once the numbers get large.",
        },
        {
          q: "How do I find the GCF of three or more numbers?",
          a: "Work pairwise: compute the GCF of the first two numbers, then take the GCF of that result with the next number, and continue folding across the list. The order does not change the answer.",
        },
      ],
    }),
  component: GcfPage,
});

type Solution = {
  inputs: number[];
  factors: Map<number, number>[];
  common: Map<number, number>;
  gcf: number;
  primeSteps: Step[];
  euclidSteps: Step[] | null;
};

function commonFactors(factors: Map<number, number>[]): Map<number, number> {
  if (factors.length === 0) return new Map();
  const result = new Map<number, number>();
  const [first, ...rest] = factors;
  for (const [p, e] of first) {
    let minExp = e;
    let inAll = true;
    for (const f of rest) {
      const e2 = f.get(p);
      if (e2 === undefined) {
        inAll = false;
        break;
      }
      minExp = Math.min(minExp, e2);
    }
    if (inAll) result.set(p, minExp);
  }
  return result;
}

function formatCommonExpression(common: Map<number, number>): string {
  if (common.size === 0) return "1";
  const parts: string[] = [];
  for (const [p, e] of common) {
    for (let i = 0; i < e; i++) parts.push(String(p));
  }
  return parts.join(" × ");
}

function euclidSteps(a: number, b: number): { rows: string[]; gcf: number } {
  const rows: string[] = [];
  let x = Math.max(a, b);
  let y = Math.min(a, b);
  while (y !== 0) {
    const q = Math.floor(x / y);
    const r = x - q * y;
    rows.push(`${x} = ${y} × ${q} + ${r}`);
    x = y;
    y = r;
  }
  return { rows, gcf: x };
}

function solve(nums: number[]): Solution {
  const factors = nums.map((n) => primeFactorize(n));
  const common = commonFactors(factors);
  const gcf = gcdMany(nums);

  const commonList =
    common.size === 0
      ? "none (the numbers share no prime factors, so GCF = 1)"
      : [...common.entries()]
          .map(([p, e]) => (e === 1 ? String(p) : `${p} (×${e})`))
          .join(", ");

  const primeSteps: Step[] = [
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
          formula={<>GCF(n₁, n₂, …) = ∏ pᵢ^min(eᵢ)</>}
          legend={[
            { sym: "nᵢ", def: "each input number" },
            { sym: "pᵢ", def: "a prime that appears in every input's factorization" },
            { sym: "min(eᵢ)", def: "smallest power of that prime across all inputs" },
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
      title: "Identify shared prime factors",
      body: (
        <FormulaBlock>
          shared primes (with smallest power): <strong>{commonList}</strong>
        </FormulaBlock>
      ),
    },
    {
      title: "Answer",
      body: (
        <FormulaBlock>
          GCF({nums.join(", ")}) = {formatCommonExpression(common)} = <strong>{gcf}</strong>
        </FormulaBlock>
      ),
    },
  ];

  let eSteps: Step[] | null = null;
  if (nums.length === 2) {
    const { rows } = euclidSteps(nums[0], nums[1]);
    eSteps = [
      {
        title: "Given",
        body: (
          <FormulaBlock>
            a = {Math.max(nums[0], nums[1])}, &nbsp; b = {Math.min(nums[0], nums[1])}
          </FormulaBlock>
        ),
      },
      {
        title: "Write the formula",
        body: (
          <FormulaWithLegend
            formula={<>a = b · q + r, &nbsp; then repeat with (b, r) until r = 0</>}
            legend={[
              { sym: "a", def: "larger of the two numbers at each step" },
              { sym: "b", def: "smaller of the two numbers at each step" },
              { sym: "q, r", def: "quotient and remainder of a ÷ b" },
            ]}
          />
        ),
      },
      {
        title: "Substitute — division steps",
        body: (
          <FormulaBlock>
            <ul className="space-y-1">
              {rows.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </FormulaBlock>
        ),
      },
      {
        title: "Answer",
        body: (
          <FormulaBlock>
            GCF({nums[0]}, {nums[1]}) = <strong>{gcf}</strong>
          </FormulaBlock>
        ),
      },
    ];
  }

  return { inputs: nums, factors, common, gcf, primeSteps, euclidSteps: eSteps };
}

function GcfPage() {
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
      name="GCF Calculator"
      tagline="Greatest common factor (also called greatest common divisor) of any list of whole numbers — with prime factorization and the Euclidean algorithm shown step by step."
      extras={
        <>
          <CalcSection title="What is the greatest common factor?">
            <p>
              The greatest common factor (GCF) — also called the greatest
              common divisor (GCD) — of a set of positive integers is the
              largest whole number that divides every one of them evenly. If
              the only shared factor is 1, the numbers are called{" "}
              <em>coprime</em>. GCF is the tool for reducing fractions,
              simplifying ratios, and splitting quantities into the largest
              possible equal groups.
            </p>
          </CalcSection>

          <CalcSection title="GCF calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              This calculator reports the GCF using two independent methods so
              you can check your working either way. Each card explains one
              part of what appears in the output above.
            </p>
            <GuideCards items={GCF_GUIDE} />
          </CalcSection>


          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Accepts a comma- or space-separated list of two or more positive integers",
                "Shows the prime factorization of every input and calls out the shared primes",
                "Displays the Euclidean algorithm side by side for two-number inputs",
                "Handles large numbers without overflow",
                "Pairs naturally with the LCM calculator on the same values",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Is GCF the same as GCD?",
                  a: (
                    <p>
                      Yes — "greatest common factor" and "greatest common
                      divisor" are two names for the same number.
                    </p>
                  ),
                },
                {
                  q: "What is the fastest way to find the GCF of large numbers?",
                  a: (
                    <p>
                      Use the Euclidean algorithm. It reaches the answer in a
                      handful of divisions even when the inputs are in the
                      millions, whereas prime factorization becomes impractical
                      once the numbers get large.
                    </p>
                  ),
                },
                {
                  q: "What is the GCF of two coprime numbers?",
                  a: <p>Always 1 — that is the definition of coprime.</p>,
                },
                {
                  q: "Why can't I enter 0?",
                  a: (
                    <p>
                      Every integer divides 0 evenly, so the GCF of only zeros
                      is undefined. Formally gcd(a, 0) = |a| when a ≠ 0, but
                      this calculator asks for positive integers to keep the
                      inputs unambiguous.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/lcm-calculator", label: "LCM Calculator" },
                { to: "/calculators/math/fraction-calculator", label: "Fraction Calculator" },
                { to: "/calculators/math/ratio-calculator", label: "Ratio Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <Field
          label="Numbers"
          htmlFor="nums"
          hint="Two or more positive integers, separated by commas or spaces"
        >
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
            label={`GCF(${sol.inputs.join(", ")})`}
            value={sol.gcf.toLocaleString()}
            note={
              sol.common.size === 0
                ? "The inputs share no prime factors, so the GCF is 1 (they are coprime)."
                : `= ${formatCommonExpression(sol.common)}`
            }
          />
          {sol.inputs.length >= 2 && (
            <GcfVennDiagram
              a={sol.inputs[0]}
              b={sol.inputs[1]}
              aFactors={sol.factors[0]}
              bFactors={sol.factors[1]}
            />
          )}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Prime factorization method
            </h3>
            <StepsToggle steps={sol.primeSteps} />
          </div>
          {sol.euclidSteps && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Euclidean algorithm (alternative method)
              </h3>
              <StepsToggle steps={sol.euclidSteps} />
            </div>
          )}
        </>
      )}
    </MathCalcPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function VennMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <circle cx="90" cy="65" r="50" className="fill-primary/10 stroke-primary/60" strokeWidth="1.5" />
      <circle cx="150" cy="65" r="50" className="fill-secondary/40 stroke-muted-foreground/40" strokeWidth="1.5" />
      <text x="55" y="68" textAnchor="middle" className="fill-foreground font-mono" fontSize="11">2·2</text>
      <text x="185" y="68" textAnchor="middle" className="fill-foreground font-mono" fontSize="11">11</text>
      <text x="120" y="60" textAnchor="middle" className="fill-primary font-mono" fontSize="12" fontWeight="700">2·2·2</text>
      <text x="120" y="76" textAnchor="middle" className="fill-primary" fontSize="9">shared</text>
      <text x="120" y="120" textAnchor="middle" className="fill-primary font-mono" fontSize="12">GCF = 8</text>
    </svg>
  );
}

function EuclidMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="24" className="fill-foreground font-mono" fontSize="11">48 = 18·2 + 12</text>
      <text x="10" y="44" className="fill-foreground font-mono" fontSize="11">18 = 12·1 + 6</text>
      <text x="10" y="64" className="fill-foreground font-mono" fontSize="11">12 = 6·2 + 0</text>
      <line x1="10" y1="76" x2="230" y2="76" stroke="var(--color-border)" />
      <text x="10" y="102" className="fill-primary font-mono" fontSize="14" fontWeight="700">last remainder = 6</text>
      <text x="10" y="120" className="fill-primary font-mono" fontSize="11">GCF(48, 18) = 6</text>
    </svg>
  );
}

function PairwiseMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="30" className="fill-foreground font-mono" fontSize="12">GCF(330, 75) = 15</text>
      <text x="10" y="55" className="fill-foreground font-mono" fontSize="12">GCF(15, 450) = 15</text>
      <text x="10" y="80" className="fill-foreground font-mono" fontSize="12">GCF(15, 225) = 15</text>
      <line x1="10" y1="92" x2="230" y2="92" stroke="var(--color-border)" />
      <text x="10" y="115" className="fill-primary font-mono" fontSize="13" fontWeight="700">= 15 for all four</text>
    </svg>
  );
}

const GCF_GUIDE: GuideCardItem[] = [
  {
    key: "prime",
    title: "Prime factorization — the intuitive method",
    explain: (
      <>The calculator factors every input, then for each prime that appears
      in <em>every</em> factorization it takes the <strong>lowest</strong>
      power. Multiplying those together gives the GCF — the Venn diagram
      above shows exactly which primes made it into the overlap.</>
    ),
    formula: <>GCF = ∏ p<sup>min(eᵢ)</sup></>,
    legend: [{ sym: "p", def: "each prime appearing in every input" }, { sym: "eᵢ", def: "exponent of p in input i" }],
    diagram: <VennMini />,
    example: { given: "16, 88, 104", substitute: "shared = 2³", answer: "8" },
  },
  {
    key: "euclid",
    title: "Euclidean algorithm — no factoring required",
    explain: (
      <>For two-number inputs the calculator also shows the Euclidean
      algorithm: divide, keep the remainder, repeat until the remainder is
      zero. The last non-zero remainder is the GCF, and this method stays
      fast even when the inputs would be painful to factor by hand.</>
    ),
    formula: <>gcd(a, b) = gcd(b, a mod b), &nbsp; gcd(a, 0) = a</>,
    diagram: <EuclidMini />,
    example: { given: "48 and 18", substitute: "three divisions", answer: "6" },
  },
  {
    key: "pairwise",
    title: "Three or more numbers — pairwise folding",
    explain: (
      <>When you enter three or more values the calculator folds the two-input
      GCF across the list: GCF of the first pair, then GCF of that result with
      the next number, and so on. Order does not affect the answer, so you can
      throw in as many inputs as you need.</>
    ),
    formula: <>gcd(a, b, c, …) = gcd(gcd(a, b), c, …)</>,
    diagram: <PairwiseMini />,
    example: { given: "330, 75, 450, 225", substitute: "fold pairwise", answer: "15" },
  },
];
