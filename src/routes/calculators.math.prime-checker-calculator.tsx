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

const MAX_N = 100_000_000;
const MAX_RANGE_UPPER = 100_000;
const MAX_RANGE_SPAN = 100_000;

export const Route = createFileRoute("/calculators/math/prime-checker-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Prime Number Checker",
      title: "Prime Number Checker — Is It Prime? + Prime List Generator",
      metaDescription:
        "Check whether any positive integer is prime, see step-by-step trial division working, and generate a list of all primes in any range.",
      canonicalUrl: "/calculators/math/prime-checker-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Prime Number Checker", path: "/calculators/math/prime-checker-calculator" },
      ],
      faqs: [
        {
          q: "What is the smallest prime number?",
          a: "2. It is also the only even prime — every other even number is divisible by 2 and therefore composite.",
        },
        {
          q: "Is 1 a prime number?",
          a: "No. A prime is defined as an integer greater than 1 whose only positive divisors are 1 and itself. 1 has only one divisor, so it is neither prime nor composite.",
        },
        {
          q: "Why only test divisors up to √n?",
          a: "If n = a × b with a ≤ b, then a ≤ √n. So if no divisor exists at or below √n, none exists above it either (its partner would already have shown up).",
        },
        {
          q: "How many primes are there?",
          a: "Infinitely many. Euclid proved this over 2,000 years ago: assume there are finitely many primes, multiply them all together and add 1, and you produce a number that must have a new prime factor.",
        },
      ],
    }),
  component: PrimePage,
});

function smallestPrimeFactor(n: number): number {
  if (n % 2 === 0) return 2;
  if (n % 3 === 0) return 3;
  const limit = Math.floor(Math.sqrt(n));
  for (let i = 5; i <= limit; i += 6) {
    if (n % i === 0) return i;
    if (n % (i + 2) === 0) return i + 2;
  }
  return n;
}

function primeFactorsList(n: number): number[] {
  const out: number[] = [];
  let x = n;
  while (x > 1) {
    const p = smallestPrimeFactor(x);
    out.push(p);
    x = x / p;
  }
  return out;
}

function formatFactorization(primes: number[]): string {
  const counts = new Map<number, number>();
  for (const p of primes) counts.set(p, (counts.get(p) ?? 0) + 1);
  const sup = (n: number) =>
    String(n)
      .split("")
      .map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)])
      .join("");
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([p, e]) => (e === 1 ? String(p) : `${p}${sup(e)}`))
    .join(" × ");
}

type CheckResult = {
  n: number;
  isPrime: boolean;
  primes: number[];
  steps: Step[];
};

function checkPrime(n: number): CheckResult {
  const givenStep: Step = {
    title: "Given",
    body: <FormulaBlock>n = {n.toLocaleString()}</FormulaBlock>,
  };
  const formulaStep: Step = {
    title: "Write the formula",
    body: (
      <FormulaWithLegend
        formula={<>n is prime ⇔ n &gt; 1 and no integer d with 2 ≤ d ≤ ⌊√n⌋ divides n</>}
        legend={[
          { sym: "n", def: "the integer being tested" },
          { sym: "d", def: "a candidate divisor (uses 2, 3, then 6k ± 1)" },
          { sym: "⌊√n⌋", def: "largest integer ≤ √n — search only needs to reach here" },
        ]}
      />
    ),
  };

  if (n < 2) {
    return {
      n,
      isPrime: false,
      primes: [],
      steps: [
        givenStep,
        formulaStep,
        {
          title: "Answer",
          body: (
            <FormulaBlock>
              {n} ≤ 1, so it is neither prime nor composite.
            </FormulaBlock>
          ),
        },
      ],
    };
  }

  const steps: Step[] = [givenStep, formulaStep];
  const limit = Math.floor(Math.sqrt(n));

  steps.push({
    title: "Substitute — bound the search",
    body: (
      <FormulaBlock>
        √{n.toLocaleString()} ≈ {Math.sqrt(n).toFixed(4)}, so ⌊√n⌋ = {limit.toLocaleString()}
      </FormulaBlock>
    ),
  });

  if (n === 2 || n === 3) {
    steps.push({
      title: "Answer",
      body: (
        <FormulaBlock>
          {n} is smaller than any composite it could split into — <strong>{n} is prime</strong>.
        </FormulaBlock>
      ),
    });
    return { n, isPrime: true, primes: [n], steps };
  }

  const tried: number[] = [];
  const testDivisors: number[] = [2, 3];
  for (let i = 5; i <= limit; i += 6) {
    testDivisors.push(i);
    if (i + 2 <= limit) testDivisors.push(i + 2);
  }

  let firstDivisor = 0;
  for (const d of testDivisors) {
    tried.push(d);
    if (n % d === 0) {
      firstDivisor = d;
      break;
    }
  }

  const previewTried = tried.slice(0, 20);
  const previewText =
    previewTried.join(", ") + (tried.length > previewTried.length ? ", …" : "");

  steps.push({
    title: "Trial-divide by candidates up to ⌊√n⌋",
    body: (
      <FormulaBlock>
        divisors checked: {previewText}
      </FormulaBlock>
    ),
  });

  if (firstDivisor === 0) {
    steps.push({
      title: "Answer",
      body: (
        <FormulaBlock>
          No d in [2, {limit.toLocaleString()}] divides {n.toLocaleString()} — <strong>{n.toLocaleString()} is prime</strong>.
        </FormulaBlock>
      ),
    });
    return { n, isPrime: true, primes: [n], steps };
  }

  const quotient = n / firstDivisor;
  const primes = primeFactorsList(n);

  steps.push({
    title: `Divisor found: d = ${firstDivisor}`,
    body: (
      <FormulaBlock>
        {n.toLocaleString()} ÷ {firstDivisor} = {quotient.toLocaleString()}
      </FormulaBlock>
    ),
  });

  steps.push({
    title: "Answer — full prime factorization",
    body: (
      <FormulaBlock>
        {n.toLocaleString()} = {formatFactorization(primes)} → <strong>composite</strong>
      </FormulaBlock>
    ),
  });

  return { n, isPrime: false, primes, steps };
}

function generatePrimes(lo: number, hi: number): number[] {
  // Sieve of Eratosthenes up to hi.
  const sieve = new Uint8Array(hi + 1);
  sieve[0] = sieve[1] = 1;
  const limit = Math.floor(Math.sqrt(hi));
  for (let i = 2; i <= limit; i++) {
    if (!sieve[i]) {
      for (let j = i * i; j <= hi; j += i) sieve[j] = 1;
    }
  }
  const out: number[] = [];
  const start = Math.max(2, lo);
  for (let i = start; i <= hi; i++) if (!sieve[i]) out.push(i);
  return out;
}


function PrimeVisual({ n, isPrime, primes }: { n: number; isPrime: boolean; primes: number[] }) {
  if (n < 2) return null;
  const divisors = [...new Set(primes)].sort((a, b) => a - b);
  return (
    <div className="mt-6 rounded-lg border border-border bg-card/30 p-4">
      <div className="flex items-center gap-3">
        <svg width={64} height={64} viewBox="0 0 64 64" role="img" aria-label={isPrime ? "Prime" : "Composite"}>
          <circle cx={32} cy={32} r={28} fill="none" stroke={isPrime ? "var(--color-primary)" : "var(--color-muted-foreground)"} strokeWidth={3} />
          <text x={32} y={38} textAnchor="middle" fontSize={13} fontWeight={700} fill={isPrime ? "var(--color-primary)" : "var(--color-muted-foreground)"}>
            {isPrime ? "PRIME" : "COMP."}
          </text>
        </svg>
        <div className="flex flex-wrap gap-1.5">
          {isPrime ? (
            <span className="rounded-full border border-primary/50 bg-primary/10 px-2.5 py-1 text-xs font-mono text-primary">
              {n.toLocaleString()}
            </span>
          ) : (
            divisors.map((d, i) => (
              <span key={i} className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs font-mono text-foreground">
                {d}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PrimePage() {
  const [input, setInput] = useState("97");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [lo, setLo] = useState("1");
  const [hi, setHi] = useState("100");
  const [primes, setPrimes] = useState<number[] | null>(null);
  const [rangeErr, setRangeErr] = useState<string | null>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    const trimmed = input.trim().replace(/[,\s_]/g, "");
    if (!/^\d+$/.test(trimmed)) {
      setErr("Enter a positive whole number.");
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 1) {
      setErr("Enter a positive whole number (n ≥ 1).");
      return;
    }
    if (n > MAX_N) {
      setErr(
        `That number is above the ${MAX_N.toLocaleString()} limit of this checker. Primality of very large integers needs specialized algorithms and can't be done responsively in the browser.`,
      );
      return;
    }
    setResult(checkPrime(n));
  };

  const generate = () => {
    setRangeErr(null);
    setPrimes(null);
    const a = Number(lo.trim().replace(/[,\s_]/g, ""));
    const b = Number(hi.trim().replace(/[,\s_]/g, ""));
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      setRangeErr("Enter two non-negative whole numbers.");
      return;
    }
    if (b < a) {
      setRangeErr("Upper limit must be greater than or equal to lower limit.");
      return;
    }
    if (b > MAX_RANGE_UPPER) {
      setRangeErr(
        `Upper limit is capped at ${MAX_RANGE_UPPER.toLocaleString()} to keep the browser responsive.`,
      );
      return;
    }
    if (b - a > MAX_RANGE_SPAN) {
      setRangeErr(
        `Range span is capped at ${MAX_RANGE_SPAN.toLocaleString()}.`,
      );
      return;
    }
    setPrimes(generatePrimes(a, b));
  };

  return (
    <MathCalcPage
      name="Prime Number Checker"
      tagline="Check whether any positive integer is prime, see the trial-division work step by step, and list every prime in a chosen range."
      extras={
        <>
          <CalcSection title="What is a prime number?">
            <p>
              A prime number is an integer greater than 1 whose only positive
              divisors are 1 and itself. 2, 3, 5, 7, 11, 13, 17, 19 and 23 are
              the first nine primes. Any integer greater than 1 that isn't
              prime is called <em>composite</em> — it can be written as a
              product of two smaller positive integers, each greater than 1.
            </p>
            <p>
              1 is a special case: it has only one divisor, so it fits neither
              definition. By convention it is neither prime nor composite. 2
              is the only even prime; every other even number has 2 as a
              divisor.
            </p>
          </CalcSection>

<CalcSection title="How the prime check works, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing this tool does with your input — the
              trial-division bound it uses, the shortcut that skips most
              candidates, and the reason primes are worth checking at all.
            </p>
            <GuideCards items={PRIME_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Instantly checks primality for integers up to 100,000,000",
                "Shows the trial-division work step by step",
                "Falls back to the full prime factorization when the number is composite",
                "Bonus tool: generates every prime in a range using a Sieve of Eratosthenes",
                "Uses the 6k ± 1 shortcut and a √n bound — no wasted divisions",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is the smallest prime number?",
                  a: (
                    <p>
                      2. It's also the only even prime, because every larger
                      even number has 2 as a divisor.
                    </p>
                  ),
                },
                {
                  q: "Is 1 a prime number?",
                  a: (
                    <p>
                      No. A prime is defined as an integer greater than 1 with
                      exactly two positive divisors. 1 has only one, so it
                      falls outside both the prime and composite definitions.
                    </p>
                  ),
                },
                {
                  q: "How can 91 look prime but not be?",
                  a: (
                    <p>
                      91 doesn't end in an even digit or a 5, and it isn't
                      divisible by 3, so the quickest divisibility rules miss
                      it. But 91 = 7 × 13, which trial division up to √91 ≈
                      9.5 catches immediately.
                    </p>
                  ),
                },
                {
                  q: "Why is there an upper limit on the input?",
                  a: (
                    <p>
                      Trial division stays fast well into the tens of millions,
                      but past that, browser-side checks start to lag.
                      Cryptographic-scale primes use probabilistic tests
                      (Miller–Rabin) on dedicated hardware, not a single tab of
                      JavaScript.
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
                { to: "/calculators/math/lcm-calculator", label: "LCM Calculator" },
                { to: "/calculators/math/gcf-calculator", label: "GCF Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <Field
          label="Number to check"
          htmlFor="n"
          hint="A positive whole number up to 100,000,000"
        >
          <TextInput
            id="n"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 97"
            inputMode="numeric"
          />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">
            Check
          </PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          {result.n < 2 ? (
            <ResultBox
              label="Result"
              value={`${result.n} is neither prime nor composite`}
              note="By convention, primes are integers greater than 1."
            />
          ) : result.isPrime ? (
            <ResultBox
              label="Result"
              value={`${result.n.toLocaleString()} is prime`}
              note="Its only positive divisors are 1 and itself."
            />
          ) : (
            <>
              <ResultBox
                label="Result"
                value={`${result.n.toLocaleString()} is composite`}
                note="It has at least one divisor other than 1 and itself."
              />
              <ResultBox
                label="Prime factorization"
                value={
                  <span className="font-mono">
                    {result.n.toLocaleString()} = {formatFactorization(result.primes)}
                  </span>
                }
                note={
                  <span className="font-mono">
                    Expanded: {result.primes.join(" × ")}
                  </span>
                }
              />
            </>
          )}
          <PrimeVisual n={result.n} isPrime={result.isPrime} primes={result.primes} />
          <StepsToggle steps={result.steps} />
        </>
      )}

      <div className="mt-10 border-t border-border/60 pt-8">
        <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
          Prime Number List Generator
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          List every prime between a lower and upper limit. Uses a Sieve of
          Eratosthenes under the hood; upper limit capped at{" "}
          {MAX_RANGE_UPPER.toLocaleString()}.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Lower limit" htmlFor="lo">
            <TextInput
              id="lo"
              value={lo}
              onChange={(e) => setLo(e.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="Upper limit" htmlFor="hi">
            <TextInput
              id="hi"
              value={hi}
              onChange={(e) => setHi(e.target.value)}
              inputMode="numeric"
            />
          </Field>
          <div className="flex items-end">
            <PrimaryButton onClick={generate} className="w-full sm:w-auto">
              Generate
            </PrimaryButton>
          </div>
        </div>
        {rangeErr && <ErrorBox message={rangeErr} />}
        {primes && (
          <ResultBox
            label={`Primes between ${lo} and ${hi}`}
            value={`${primes.length.toLocaleString()} found`}
            note={
              primes.length === 0 ? (
                "No primes in this range."
              ) : (
                <span className="font-mono break-words">
                  {primes.join(", ")}
                </span>
              )
            }
          />
        )}
      </div>
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function SqrtBoundMini() {
  return (
    <svg viewBox="0 0 200 110" className="w-full">
      <rect x="1" y="1" width="198" height="108" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <line x1="20" y1="60" x2="180" y2="60" stroke="var(--color-border)" />
      {[20, 60, 100, 140, 180].map((x, i) => (
        <g key={i}>
          <line x1={x} y1="56" x2={x} y2="64" stroke="var(--color-muted-foreground)" />
          <text x={x} y="78" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">{[1, "a", "√n", "b", "n"][i]}</text>
        </g>
      ))}
      <path d="M60 45 Q 100 25 140 45" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" />
      <text x="100" y="20" textAnchor="middle" fontSize="10" fill="var(--color-primary)">a · b = n → a ≤ √n</text>
      <text x="100" y="100" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">stop testing at √n</text>
    </svg>
  );
}

function SixKMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      {[1,2,3,4,5,6,7,8,9,10,11,12,13].map((n,i)=>{
        const x = 15 + i*15;
        const kept = n===2||n===3|| (n>3 && (n%6===1||n%6===5));
        return (
          <g key={n}>
            <circle cx={x} cy="45" r="8" fill={kept?"var(--color-primary)/0.2":"var(--color-muted)/0.3"} stroke={kept?"var(--color-primary)":"var(--color-border)"} />
            <text x={x} y="49" textAnchor="middle" fontSize="9" fill="var(--color-foreground)">{n}</text>
          </g>
        );
      })}
      <text x="110" y="20" textAnchor="middle" fontSize="10" fill="var(--color-primary)">test 2, 3, then only 6k±1</text>
      <text x="110" y="85" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">skips ⅔ of candidates</text>
    </svg>
  );
}

function FactorTreeMini() {
  return (
    <svg viewBox="0 0 200 110" className="w-full">
      <rect x="1" y="1" width="198" height="108" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <text x="100" y="22" textAnchor="middle" fontSize="11" fill="var(--color-foreground)">60</text>
      <line x1="95" y1="26" x2="65" y2="46" stroke="var(--color-border)" />
      <line x1="105" y1="26" x2="135" y2="46" stroke="var(--color-border)" />
      <text x="60" y="55" textAnchor="middle" fontSize="10" fill="var(--color-primary)">2</text>
      <text x="140" y="55" textAnchor="middle" fontSize="11" fill="var(--color-foreground)">30</text>
      <line x1="135" y1="60" x2="115" y2="76" stroke="var(--color-border)" />
      <line x1="145" y1="60" x2="165" y2="76" stroke="var(--color-border)" />
      <text x="110" y="85" textAnchor="middle" fontSize="10" fill="var(--color-primary)">2</text>
      <text x="170" y="85" textAnchor="middle" fontSize="11" fill="var(--color-foreground)">15</text>
      <text x="100" y="102" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">60 = 2² · 3 · 5 (unique)</text>
    </svg>
  );
}

const PRIME_GUIDE: GuideCardItem[] = [
  {
    key: "sqrt",
    title: "Trial division stops at √n",
    explain: (
      <>The tool divides <span className="font-mono">n</span> by candidates up
        to <span className="font-mono">√n</span>. If <span className="font-mono">n = a · b</span> with{" "}
        <span className="font-mono">a ≤ b</span>, then <span className="font-mono">a ≤ √n</span> — any
        factor larger than <span className="font-mono">√n</span> already has a smaller partner we
        would have found.</>
    ),
    formula: <>if <b>n = a · b</b> with a ≤ b, then a ≤ √n</>,
    diagram: <SqrtBoundMini />,
    example: {
      given: <span className="font-mono">n = 97, √97 ≈ 9.85</span>,
      substitute: <>test 2, 3, 5, 7 — none divides 97</>,
      answer: <>97 is prime</>,
    },
  },
  {
    key: "6k",
    title: "6k ± 1 skips two-thirds of candidates",
    explain: (
      <>After ruling out 2 and 3, every remaining prime has the form{" "}
        <span className="font-mono">6k − 1</span> or <span className="font-mono">6k + 1</span>.
        Anything else is divisible by 2 or 3, so the tool never tests those
        candidates.</>
    ),
    formula: <>test 2, 3, then p ∈ &#123;5, 7, 11, 13, 17, 19, …&#125;</>,
    diagram: <SixKMini />,
    example: {
      given: <span className="font-mono">candidates ≤ 20</span>,
      substitute: <>keep 5, 7, 11, 13, 17, 19</>,
      answer: <>6 tests instead of 18</>,
    },
  },
  {
    key: "fta",
    title: "Fundamental theorem of arithmetic",
    explain: (
      <>Every integer greater than 1 factors into primes in exactly one way
        (up to order). That's why the tool also shows the prime factorization
        when a number is composite — it's the unique "DNA" of the number.</>
    ),
    formula: <>n = p₁^a₁ · p₂^a₂ · … · pₖ^aₖ</>,
    diagram: <FactorTreeMini />,
    example: {
      given: <span className="font-mono">n = 60</span>,
      substitute: <>60 = 2 · 30 = 2 · 2 · 15 = 2 · 2 · 3 · 5</>,
      answer: <span className="font-mono">2² · 3 · 5</span>,
    },
  },
];
