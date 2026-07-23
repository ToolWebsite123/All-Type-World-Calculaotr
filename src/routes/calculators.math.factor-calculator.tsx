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

const MAX_N = 10_000_000;

export const Route = createFileRoute("/calculators/math/factor-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Factor Calculator",
      title: "Factor Calculator — Factor Pairs & Prime Factorization",
      metaDescription:
        "Find every factor, factor pair, prime factorization and a visual factor tree for any positive integer, with step-by-step working.",
      canonicalUrl: "/calculators/math/factor-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Factor Calculator", path: "/calculators/math/factor-calculator" },
      ],
      faqs: [
        {
          q: "How do I find all factors of a number?",
          a: "Test every integer from 1 up to the square root of the number. Whenever it divides evenly, both it and the quotient are factors. This is exactly what the calculator does under the hood, which is why it can list every factor of a seven-digit number almost instantly.",
        },
        {
          q: "What is a factor tree?",
          a: "A factor tree is a diagram that shows a number being broken down into two factors, each of those into two more factors, and so on until every branch ends in a prime. The primes at the leaves are the prime factorization of the original number.",
        },
        {
          q: "Is 1 a prime factor?",
          a: "No. Primes are defined as integers greater than 1 whose only divisors are 1 and themselves. 1 is a factor of every integer, but it is not counted in a prime factorization.",
        },
      ],
    }),
  component: FactorPage,
});

type TreeNode = { value: number; prime: boolean; left?: TreeNode; right?: TreeNode };

function smallestPrimeFactor(n: number): number {
  if (n % 2 === 0) return 2;
  const limit = Math.floor(Math.sqrt(n));
  for (let i = 3; i <= limit; i += 2) if (n % i === 0) return i;
  return n; // n is prime
}

function buildTree(n: number): TreeNode {
  if (n < 2) return { value: n, prime: false };
  const p = smallestPrimeFactor(n);
  if (p === n) return { value: n, prime: true };
  const q = n / p;
  return { value: n, prime: false, left: { value: p, prime: true }, right: buildTree(q) };
}

function primeFactors(n: number): number[] {
  const out: number[] = [];
  let x = n;
  while (x > 1) {
    const p = smallestPrimeFactor(x);
    out.push(p);
    x = x / p;
  }
  return out;
}

function allFactors(n: number): number[] {
  const small: number[] = [];
  const big: number[] = [];
  const limit = Math.floor(Math.sqrt(n));
  for (let i = 1; i <= limit; i++) {
    if (n % i === 0) {
      small.push(i);
      const q = n / i;
      if (q !== i) big.push(q);
    }
  }
  return [...small, ...big.reverse()];
}

function factorPairs(n: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  const limit = Math.floor(Math.sqrt(n));
  for (let i = 1; i <= limit; i++) {
    if (n % i === 0) pairs.push([i, n / i]);
  }
  return pairs;
}

type Solution = {
  n: number;
  factors: number[];
  pairs: Array<[number, number]>;
  primes: number[];
  tree: TreeNode;
  steps: Step[];
};

function solve(n: number): Solution {
  const factors = allFactors(n);
  const pairs = factorPairs(n);
  const primes = primeFactors(n);
  const tree = buildTree(n);

  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <FormulaBlock>
          n = {n.toLocaleString()}
        </FormulaBlock>
      ),
    },
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>d is a factor of n &nbsp;⟺&nbsp; n mod d = 0, &nbsp; 1 ≤ d ≤ ⌊√n⌋</>}
          legend={[
            { sym: "n", def: "the number being factored" },
            { sym: "d", def: "candidate divisor tested against n" },
            { sym: "⌊√n⌋", def: "largest integer ≤ √n — the upper bound to test" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — test range and pairing",
      body: (
        <FormulaBlock>
          test d = 1 … {Math.floor(Math.sqrt(n)).toLocaleString()} &nbsp;·&nbsp; each hit d pairs with n ÷ d
        </FormulaBlock>
      ),
    },
    {
      title: "Peel off the smallest prime, repeatedly",
      body: (
        <FormulaBlock>
          divide {n.toLocaleString()} by its smallest prime, then repeat on the quotient until 1 remains
        </FormulaBlock>
      ),
    },
    {
      title: "Answer — prime factorization",
      body: (
        <FormulaBlock>
          {n.toLocaleString()} = <strong>{primes.join(" × ") || String(n)}</strong>
        </FormulaBlock>
      ),
    },
  ];

  return { n, factors, pairs, primes, tree, steps };
}

function svgLayoutTree(node: TreeNode) {
  // Assign leaf-index based x positions, depth based y positions.
  type Positioned = { node: TreeNode; x: number; y: number; children: Positioned[] };
  let leafCounter = 0;
  function assign(n: TreeNode, depth: number): Positioned {
    if (!n.left && !n.right) {
      const x = leafCounter;
      leafCounter += 1;
      return { node: n, x, y: depth, children: [] };
    }
    const children: Positioned[] = [];
    if (n.left) children.push(assign(n.left, depth + 1));
    if (n.right) children.push(assign(n.right, depth + 1));
    const x = children.reduce((a, c) => a + c.x, 0) / children.length;
    return { node: n, x, y: depth, children };
  }
  const root = assign(node, 0);
  const totalLeaves = Math.max(leafCounter, 1);
  const maxDepth = (function findDepth(p: Positioned): number {
    return p.children.length ? Math.max(...p.children.map(findDepth)) : p.y;
  })(root);
  return { root, totalLeaves, maxDepth };
}

function FactorTreeSvg({ tree }: { tree: TreeNode }) {
  const { root, totalLeaves, maxDepth } = svgLayoutTree(tree);
  const width = Math.max(360, totalLeaves * 80);
  const height = Math.max(160, (maxDepth + 1) * 70 + 40);
  const xScale = (x: number) => 40 + (x / Math.max(totalLeaves - 1, 1)) * (width - 80);
  const yScale = (y: number) => 30 + y * 70;

  const nodes: { x: number; y: number; value: number; prime: boolean }[] = [];
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];

  (function walk(p: any) {
    const x = xScale(p.x);
    const y = yScale(p.y);
    nodes.push({ x, y, value: p.node.value, prime: p.node.prime });
    for (const c of p.children) {
      edges.push({ x1: x, y1: y, x2: xScale(c.x), y2: yScale(c.y) });
      walk(c);
    }
  })(root);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full mx-auto" style={{ maxWidth: width }} role="img" aria-label="Factor tree diagram">
      {edges.map((e, i) => (
        <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} className="stroke-border" strokeWidth="1.5" />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle
            cx={n.x}
            cy={n.y}
            r="20"
            className={n.prime ? "fill-primary/15 stroke-primary" : "fill-muted/40 stroke-border"}
            strokeWidth="1.5"
          />
          <text x={n.x} y={n.y + 4} textAnchor="middle" className={n.prime ? "fill-primary text-xs font-mono font-semibold" : "fill-foreground text-xs font-mono"}>
            {n.value}
          </text>
        </g>
      ))}
    </svg>
  );
}

function FactorTree({ node }: { node: TreeNode }) {
  const isLeaf = !node.left && !node.right;
  return (
    <div className="flex flex-col items-center">
      <div
        className={`px-3 py-1 rounded-md border font-mono text-sm ${
          node.prime
            ? "border-primary/60 bg-primary/10 text-primary font-semibold"
            : "border-border bg-muted/40 text-foreground"
        }`}
      >
        {node.value.toLocaleString()}
      </div>
      {!isLeaf && (
        <>
          <div className="relative w-full flex justify-center">
            <div className="h-4 w-px bg-border" />
          </div>
          <div className="relative flex items-start gap-6 sm:gap-10">
            {/* connecting bar */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-[calc(100%-2rem)] bg-border" />
            <div className="pt-4">{node.left && <FactorTree node={node.left} />}</div>
            <div className="pt-4">{node.right && <FactorTree node={node.right} />}</div>
          </div>
        </>
      )}
    </div>
  );
}

function FactorPage() {
  const [input, setInput] = useState("120");
  const [sol, setSol] = useState<Solution | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const compute = () => {
    setErr(null);
    setSol(null);
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
        `That number is above the ${MAX_N.toLocaleString()} limit of this calculator. Factoring very large integers is computationally hard — no fast general algorithm is known — and running it in the browser would freeze the page.`,
      );
      return;
    }
    // n up to 10M — trial division to √n is at most ~3163 iterations; instant.
    setSol(solve(n));
  };

  return (
    <MathCalcPage
      name="Factor Calculator"
      tagline="Every factor, every factor pair, the prime factorization and a visual factor tree for any positive integer up to 10 million."
      extras={
        <>
          <CalcSection title="What is a factor?">
            <p>
              A factor of an integer <em>n</em> is any positive integer that
              divides <em>n</em> with no remainder. Factor pairs are the
              two-number products that reconstruct <em>n</em>; the prime
              factorization is the unique way to write <em>n</em> as a
              product of primes. This calculator returns all three views at
              once, plus a visual factor tree.
            </p>
          </CalcSection>

          <CalcSection title="Factor calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one section of the output above — the full
              factor list, factor pairs, the prime factorization, and the
              factor tree diagram.
            </p>
            <GuideCards items={FACTOR_GUIDE} />
          </CalcSection>


          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Lists all factors of the number in ascending order",
                "Shows every factor pair (a, b) with a × b = n",
                "Gives the prime factorization as a plain multiplication",
                "Renders a visual factor tree that matches the site theme",
                "Handles inputs up to 10,000,000 without blocking the browser",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "How do I find all factors of a number?",
                  a: (
                    <p>
                      Test every integer from 1 up to √n. Each one that
                      divides evenly gives you two factors: the divisor
                      itself and the quotient. Collecting those pairs gives
                      the full list.
                    </p>
                  ),
                },
                {
                  q: "What is a factor tree?",
                  a: (
                    <p>
                      A diagram that splits a number into two factors, splits
                      any composite factors again, and keeps going until
                      every leaf is prime. The leaves are the prime
                      factorization.
                    </p>
                  ),
                },
                {
                  q: "Is 1 a prime factor?",
                  a: (
                    <p>
                      No. 1 is a factor of every integer, but primes are
                      defined as integers greater than 1, so 1 never appears
                      in a prime factorization.
                    </p>
                  ),
                },
                {
                  q: "Why is there an upper limit on the input?",
                  a: (
                    <p>
                      Above about 10 million, browser-side trial division
                      starts to lag noticeably. Larger inputs need
                      specialized algorithms and dedicated servers rather
                      than a single tab of JavaScript.
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
                { to: "/calculators/math/gcf-calculator", label: "GCF Calculator" },
                { to: "/calculators/math/fraction-calculator", label: "Fraction Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Number" htmlFor="n" hint="A positive whole number up to 10,000,000">
          <TextInput
            id="n"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 120"
            inputMode="numeric"
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
            label={`Factors of ${sol.n.toLocaleString()}`}
            value={`${sol.factors.length} total`}
            note={
              <span className="font-mono break-words">
                {sol.factors.join(", ")}
              </span>
            }
          />
          <ResultBox
            label="Factor pairs"
            value={`${sol.pairs.length} pair${sol.pairs.length === 1 ? "" : "s"}`}
            note={
              <span className="font-mono break-words">
                {sol.pairs.map(([a, b]) => `(${a}, ${b})`).join("  ")}
              </span>
            }
          />
          <ResultBox
            label="Prime factorization"
            value={sol.primes.length === 1 ? `${sol.n} is prime` : `${sol.n} = ${sol.primes.join(" × ")}`}
          />
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Factor tree
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-fit mx-auto">
                <FactorTree node={sol.tree} />
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <FactorTreeSvg tree={sol.tree} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Primes are highlighted. Each composite splits into its smallest
              prime and the remaining quotient.
            </p>
          </div>
          <StepsToggle steps={sol.steps} />
        </>
      )}
    </MathCalcPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function AllFactorsMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="120" y="26" textAnchor="middle" className="fill-foreground font-mono" fontSize="12">12</text>
      <line x1="30" y1="35" x2="210" y2="35" stroke="var(--color-border)" />
      {["1", "2", "3", "4", "6", "12"].map((v, i) => (
        <g key={v}>
          <rect x={22 + i * 33} y="50" width="26" height="26" rx="4" className="fill-primary/15 stroke-primary/60" />
          <text x={35 + i * 33} y="68" textAnchor="middle" className="fill-primary font-mono" fontSize="12">{v}</text>
        </g>
      ))}
      <text x="120" y="108" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="11">6 factors total</text>
    </svg>
  );
}

function PairsMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="30" className="fill-foreground font-mono" fontSize="12">1 × 12 = 12</text>
      <text x="10" y="55" className="fill-foreground font-mono" fontSize="12">2 × 6 = 12</text>
      <text x="10" y="80" className="fill-foreground font-mono" fontSize="12">3 × 4 = 12</text>
      <line x1="10" y1="92" x2="230" y2="92" stroke="var(--color-border)" />
      <text x="10" y="115" className="fill-primary font-mono" fontSize="11">tested only up to √12 ≈ 3.46</text>
    </svg>
  );
}

function PrimeChainMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="24" className="fill-foreground font-mono" fontSize="11">120 ÷ 2 = 60</text>
      <text x="10" y="42" className="fill-foreground font-mono" fontSize="11">60 ÷ 2 = 30</text>
      <text x="10" y="60" className="fill-foreground font-mono" fontSize="11">30 ÷ 2 = 15</text>
      <text x="10" y="78" className="fill-foreground font-mono" fontSize="11">15 ÷ 3 = 5 &nbsp;(prime)</text>
      <line x1="10" y1="88" x2="230" y2="88" stroke="var(--color-border)" />
      <text x="10" y="110" className="fill-primary font-mono" fontSize="12" fontWeight="700">120 = 2·2·2·3·5</text>
    </svg>
  );
}

function TreeMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <circle cx="120" cy="20" r="14" className="fill-muted/40 stroke-border" />
      <text x="120" y="24" textAnchor="middle" className="fill-foreground font-mono" fontSize="11">12</text>
      <line x1="112" y1="30" x2="80" y2="52" stroke="var(--color-border)" />
      <line x1="128" y1="30" x2="160" y2="52" stroke="var(--color-border)" />
      <circle cx="80" cy="62" r="12" className="fill-primary/15 stroke-primary" />
      <text x="80" y="66" textAnchor="middle" className="fill-primary font-mono" fontSize="11">2</text>
      <circle cx="160" cy="62" r="12" className="fill-muted/40 stroke-border" />
      <text x="160" y="66" textAnchor="middle" className="fill-foreground font-mono" fontSize="11">6</text>
      <line x1="153" y1="70" x2="130" y2="92" stroke="var(--color-border)" />
      <line x1="167" y1="70" x2="190" y2="92" stroke="var(--color-border)" />
      <circle cx="130" cy="102" r="12" className="fill-primary/15 stroke-primary" />
      <text x="130" y="106" textAnchor="middle" className="fill-primary font-mono" fontSize="11">2</text>
      <circle cx="190" cy="102" r="12" className="fill-primary/15 stroke-primary" />
      <text x="190" y="106" textAnchor="middle" className="fill-primary font-mono" fontSize="11">3</text>
    </svg>
  );
}

const FACTOR_GUIDE: GuideCardItem[] = [
  {
    key: "all",
    title: "All factors — every divisor of n",
    explain: (
      <>The first result box lists every positive integer that divides your
      number evenly. Under the hood the calculator only tests candidates up to
      √n — each hit gives two factors at once (the divisor and the quotient),
      which is why the list appears instantly even for seven-digit inputs.</>
    ),
    formula: <>d is a factor of n ⇔ n mod d = 0</>,
    legend: [{ sym: "d", def: "candidate divisor tested from 1 to √n" }],
    diagram: <AllFactorsMini />,
    example: { given: "n = 12", substitute: "test 1, 2, 3", answer: "1, 2, 3, 4, 6, 12" },
  },
  {
    key: "pairs",
    title: "Factor pairs — rectangles that make n",
    explain: (
      <>The second result box groups the factors into pairs (a, b) with
      a × b = n. Each pair is one way to arrange n items into a rectangle.
      Perfect squares get a self-pair like (10, 10); the calculator prints it
      once so the list stays clean.</>
    ),
    formula: <>a × b = n with a ≤ √n ≤ b</>,
    diagram: <PairsMini />,
    example: { given: "n = 12", substitute: "small × large", answer: "(1,12) (2,6) (3,4)" },
  },
  {
    key: "prime",
    title: "Prime factorization — how the calculator builds it",
    explain: (
      <>The third box shows n written as a product of primes. The tool works
      by peeling off the smallest prime that fits, dividing, and repeating on
      the quotient until it hits a prime — the sequence of divisors is the
      factorization. It's unique for every integer above 1.</>
    ),
    formula: <>n = p₁ × p₂ × … × p<sub>k</sub>, each p<sub>i</sub> prime</>,
    diagram: <PrimeChainMini />,
    example: { given: "n = 120", substitute: "peel smallest primes", answer: "2·2·2·3·5" },
  },
  {
    key: "tree",
    title: "Factor tree — the picture at the bottom",
    explain: (
      <>The tree diagram at the bottom of the output is the same factorization
      drawn as branches: split into any two factors, then split any composite
      leaf again, and keep going until every leaf is a prime. Primes are
      highlighted in the theme colour.</>
    ),
    formula: <>branch until every leaf is prime</>,
    diagram: <TreeMini />,
    example: { given: "n = 12", substitute: "12 → 2 · 6 → 2 · 2 · 3", answer: "leaves = 2, 2, 3" },
  },
];
