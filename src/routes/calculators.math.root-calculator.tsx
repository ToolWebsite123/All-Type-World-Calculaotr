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
import { nthRoot } from "@/lib/math/root";

export const Route = createFileRoute("/calculators/math/root-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Root Calculator",
      title: "Root Calculator — Square Root, Cube Root & Nth Root",
      metaDescription:
        "Compute square roots, cube roots, and any nth root of a real number. Includes step-by-step working, verification, and hand-estimation methods.",
      canonicalUrl: "/calculators/math/root-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Root Calculator", path: "/calculators/math/root-calculator" },
      ],
      faqs: [
        {
          q: "What is the difference between a square root and a cube root?",
          a: "The square root of x is the number that, when multiplied by itself once, gives x — so √25 = 5 because 5 × 5 = 25. The cube root of x is the number that, when multiplied by itself twice more, gives x — so ∛27 = 3 because 3 × 3 × 3 = 27. Square root is a root of index 2; cube root is a root of index 3.",
        },
        {
          q: "Can you take the root of a negative number?",
          a: "Odd roots of negative numbers are real: ∛(−8) = −2 because (−2)³ = −8. Even roots of negatives (square root, 4th root, 6th root, …) have no real value; they are complex numbers. This calculator returns a real result when one exists and flags the case when it does not.",
        },
        {
          q: "How do you estimate a square root without a calculator?",
          a: "Guess a starting value b, divide the target a by b, then average the two: (b + a/b) / 2 becomes your new guess. Repeat until the guess stops changing at your chosen precision. This is Newton's method for square roots and converges very quickly — usually four or five iterations reach ten decimal places.",
        },
      ],
    }),
  component: RootPage,
});

function RootNumberLine({ value, label }: { value: number; label: string }) {
  if (!Number.isFinite(value)) return null;
  const lo = Math.floor(value);
  const hi = Math.ceil(value) === lo ? lo + 1 : Math.ceil(value);
  const width = 600;
  const height = 100;
  const padX = 60;
  const x = (v: number) => padX + ((v - lo) / (hi - lo)) * (width - 2 * padX);

  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Position on the number line
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xl mx-auto" role="img" aria-label={`Number line showing ${label}`}>
        <line x1={padX} y1={50} x2={width - padX} y2={50} className="stroke-border" strokeWidth="2" />
        {[lo, hi].map((v) => (
          <g key={v}>
            <line x1={x(v)} y1={42} x2={x(v)} y2={58} className="stroke-muted-foreground" strokeWidth="2" />
            <text x={x(v)} y={78} textAnchor="middle" className="fill-muted-foreground text-xs font-mono">
              {v}
            </text>
          </g>
        ))}
        <circle cx={x(value)} cy={50} r="6" className="fill-primary" />
        <text x={x(value)} y={30} textAnchor="middle" className="fill-primary text-xs font-mono font-semibold">
          {label}
        </text>
      </svg>
    </div>
  );
}

function RootPage() {
  return (
    <MathCalcPage
      name="Root Calculator"
      tagline="Three tools in one: square root, cube root, and general nth root of any real number, with full working shown."
      extras={
        <>
          <CalcSection title="What is a root?">
            <p>
              The nth root of a number <span className="font-mono">a</span> is
              the value <span className="font-mono">b</span> that, when raised
              to the nth power, gives <span className="font-mono">a</span>{" "}
              back — <span className="font-mono">ⁿ√a = b ⇔ bⁿ = a</span>.
              Roots are exponents in disguise: <span className="font-mono">ⁿ√a
              = a^(1/n)</span>. This page runs three flavours of that idea —
              square root, cube root, and general nth root — and shows the
              verification and steps for each.
            </p>
          </CalcSection>

          <CalcSection title="Root calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card matches one of the three tools above and shows the
              rule it applies, plus the check line that reproduces your input.
            </p>
            <GuideCards items={ROOT_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Dedicated square root, cube root, and nth root tools",
                "Handles negative numbers correctly for odd roots (and flags even roots as not real)",
                "Verification line — result raised to the appropriate power reproduces the input",
                "Step-by-step working for the general nth root",
                "Accepts integer or decimal inputs",
              ]}
            />
          </CalcSection>

          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What is the difference between a square root and a cube root?", a: <p>Square root uses index 2 (√25 = 5 because 5² = 25). Cube root uses index 3 (∛27 = 3 because 3³ = 27). Cube roots also work on negative numbers; square roots of negatives are not real.</p> },
                { q: "Can you take the root of a negative number?", a: <p>Odd roots of negatives are real: ∛(−8) = −2. Even roots of negatives are complex, so this calculator flags them rather than returning a misleading NaN.</p> },
                { q: "How do you estimate a square root without a calculator?", a: <p>Guess b, compute a ÷ b, then average: (b + a/b) / 2 is the next, sharper guess. Repeat until the value stops changing.</p> },
                { q: "Is ⁿ√a the same as a^(1/n)?", a: <p>Yes — they are two notations for the same operation.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
                { to: "/calculators/math/scientific-calculator", label: "Scientific Calculator" },
                { to: "/calculators/math/log-calculator", label: "Log Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <SquareRootTool />
      <div className="mt-8">
        <CubeRootTool />
      </div>
      <div className="mt-8">
        <NthRootTool />
      </div>
    </MathCalcPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Square root sub-tool
// ─────────────────────────────────────────────────────────────────────────────

function SquareRootTool() {
  const [x, setX] = useState("34");
  const [result, setResult] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    const n = Number(x);
    if (!Number.isFinite(n)) {
      setErr("Enter a valid number.");
      return;
    }
    if (n < 0) {
      setErr("The square root of a negative number is not a real value.");
      return;
    }
    setResult(Math.sqrt(n));
  };

  return (
    <ToolCard title="Square Root Calculator" symbol="√">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Number (x)" htmlFor="sq-x">
          <TextInput id="sq-x" inputMode="decimal" value={x} onChange={(e) => setX(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">Calculate</PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result !== null && (
        <>
          <ResultBox label={`√${x}`} value={formatLong(result)} />
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            Check: {formatShort(result)}² = {formatShort(result * result)}
          </p>
          <RootNumberLine value={result} label={`√${x} ≈ ${formatShort(result)}`} />
        </>
      )}
    </ToolCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cube root sub-tool
// ─────────────────────────────────────────────────────────────────────────────

function CubeRootTool() {
  const [x, setX] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    const n = Number(x);
    if (!Number.isFinite(n)) {
      setErr("Enter a valid number.");
      return;
    }
    // JS Math.cbrt handles negatives correctly.
    setResult(Math.cbrt(n));
  };

  return (
    <ToolCard title="Cube Root Calculator" symbol="∛">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <Field label="Number (x)" htmlFor="cb-x" hint="Negative numbers are allowed">
          <TextInput id="cb-x" inputMode="decimal" value={x} onChange={(e) => setX(e.target.value)} placeholder="e.g. -27" />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">Calculate</PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result !== null && (
        <>
          <ResultBox label={`∛${x}`} value={formatLong(result)} />
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            Check: {formatShort(result)}³ = {formatShort(result * result * result)}
          </p>
          <RootNumberLine value={result} label={`∛${x} ≈ ${formatShort(result)}`} />
        </>
      )}
    </ToolCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// General nth root sub-tool
// ─────────────────────────────────────────────────────────────────────────────

function NthRootTool() {
  const [n, setN] = useState("4");
  const [a, setA] = useState("81");
  const [result, setResult] = useState<{ value: number; note?: string; steps: Step[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    const nn = Number(n);
    const an = Number(a);
    if (!Number.isFinite(nn) || !Number.isFinite(an)) {
      setErr("Enter valid numbers for both n and a.");
      return;
    }
    if (nn === 0) {
      setErr("The root index n cannot be zero.");
      return;
    }
    const r = nthRoot(an, nn);
    if (Number.isNaN(r.value)) {
      setErr(r.note ?? "No real root exists for these inputs.");
      return;
    }
    setResult({ value: r.value, note: r.note, steps: buildNthSteps(an, nn, r.value) });
  };

  return (
    <ToolCard title="General (nth) Root Calculator" symbol="ⁿ√">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Root index (n)" htmlFor="nth-n" hint="2 = square, 3 = cube">
          <TextInput id="nth-n" inputMode="decimal" value={n} onChange={(e) => setN(e.target.value)} />
        </Field>
        <Field label="Number (a)" htmlFor="nth-a">
          <TextInput id="nth-a" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">Calculate</PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox
            label={`${n}√${a}`}
            value={formatLong(result.value)}
            note={result.note}
          />
          <RootNumberLine value={result.value} label={`${n}√${a} ≈ ${formatShort(result.value)}`} />
          <StepsToggle steps={result.steps} />
        </>
      )}
    </ToolCard>
  );
}

function buildNthSteps(a: number, n: number, b: number): Step[] {
  const verify = Math.pow(b, n);
  return [
    {
      title: "Given",
      body: (
        <FormulaBlock>
          n = {formatShort(n)}, &nbsp; a = {formatShort(a)}
        </FormulaBlock>
      ),
    },
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>ⁿ√a = b &nbsp;⟺&nbsp; bⁿ = a &nbsp;⇒&nbsp; b = a^(1÷n)</>}
          legend={[
            { sym: "a", def: "radicand — the number under the root" },
            { sym: "n", def: "root index (2 = square, 3 = cube, …)" },
            { sym: "b", def: "the root value we are solving for" },
          ]}
        />
      ),
    },
    {
      title: "Substitute",
      body: (
        <FormulaBlock>
          b = {formatShort(a)}^(1 ÷ {formatShort(n)})
        </FormulaBlock>
      ),
    },
    {
      title: "Answer",
      body: (
        <FormulaBlock>
          b = <strong>{formatShort(b)}</strong> &nbsp;·&nbsp; check: {formatShort(b)}^{formatShort(n)} ≈ {formatShort(verify)}{approxEqual(verify, a) ? "  ✓" : ""}
        </FormulaBlock>
      ),
    },
  ];
}

function approxEqual(x: number, y: number) {
  const scale = Math.max(1, Math.abs(x), Math.abs(y));
  return Math.abs(x - y) / scale < 1e-9;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared display helpers
// ─────────────────────────────────────────────────────────────────────────────

function ToolCard({ title, symbol, children }: { title: string; symbol: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
        <span className="font-mono text-primary">{symbol}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function formatLong(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  return parseFloat(n.toPrecision(13)).toString();
}

function formatShort(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  return parseFloat(n.toPrecision(6)).toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function SquareMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <rect x="35" y="30" width="70" height="70" fill="var(--color-primary) / 0.18" stroke="var(--color-primary)" />
      <text x="70" y="72" textAnchor="middle" className="fill-primary font-mono" fontSize="13">area 25</text>
      <text x="70" y="118" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="11">side = 5</text>
      <text x="130" y="55" className="fill-foreground font-mono" fontSize="14">√25 = 5</text>
      <text x="130" y="80" className="fill-muted-foreground font-mono" fontSize="11">5² = 25 ✓</text>
    </svg>
  );
}

function CubeMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <g transform="translate(35,30)">
        <polygon points="0,20 40,0 80,20 40,40" fill="var(--color-primary) / 0.25" stroke="var(--color-primary)" />
        <polygon points="0,20 0,70 40,90 40,40" fill="var(--color-primary) / 0.15" stroke="var(--color-primary)" />
        <polygon points="80,20 80,70 40,90 40,40" fill="var(--color-primary) / 0.10" stroke="var(--color-primary)" />
      </g>
      <text x="130" y="55" className="fill-foreground font-mono" fontSize="14">∛27 = 3</text>
      <text x="130" y="80" className="fill-muted-foreground font-mono" fontSize="11">3³ = 27 ✓</text>
      <text x="130" y="100" className="fill-muted-foreground font-mono" fontSize="11">∛(−27) = −3</text>
    </svg>
  );
}

function NthMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="45" className="fill-foreground font-mono" fontSize="16">⁴√81</text>
      <text x="80" y="45" className="fill-muted-foreground" fontSize="14">= 81^(1/4)</text>
      <line x1="20" y1="60" x2="200" y2="60" stroke="var(--color-border)" />
      <text x="20" y="85" className="fill-primary font-mono" fontSize="16">= 3</text>
      <text x="70" y="85" className="fill-muted-foreground font-mono" fontSize="12">since 3⁴ = 81</text>
      <text x="20" y="115" className="fill-muted-foreground" fontSize="11">any positive index n works</text>
    </svg>
  );
}

function VerifyMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <rect x="20" y="20" width="180" height="34" rx="6" fill="var(--color-secondary)" stroke="var(--color-border)" />
      <text x="110" y="42" textAnchor="middle" className="fill-foreground font-mono" fontSize="13">b = ⁿ√a</text>
      <path d="M 110 60 L 110 74" stroke="var(--color-muted-foreground)" markerEnd="url(#va)" />
      <defs>
        <marker id="va" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" className="fill-muted-foreground" />
        </marker>
      </defs>
      <rect x="20" y="80" width="180" height="34" rx="6" fill="var(--color-primary) / 0.15" stroke="var(--color-primary)" />
      <text x="110" y="102" textAnchor="middle" className="fill-primary font-mono" fontSize="13">bⁿ ≈ a  ✓</text>
    </svg>
  );
}

const ROOT_GUIDE: GuideCardItem[] = [
  {
    key: "sq",
    title: "Square root — √a",
    explain: (
      <>Answers "what side length gives a square of area <span className="font-mono">a</span>?" Every
      positive <span className="font-mono">a</span> has two square roots; the
      <span className="font-mono"> √</span> symbol returns the non-negative
      one. Negatives are flagged as not real.</>
    ),
    formula: <>√a = b &nbsp;⇔&nbsp; b² = a &nbsp;(a ≥ 0)</>,
    legend: [{ sym: "a", def: "non-negative input" }],
    diagram: <SquareMini />,
    example: { given: "√34", substitute: "b² = 34", answer: "≈ 5.831" },
  },
  {
    key: "cb",
    title: "Cube root — ∛a",
    explain: (
      <>Answers "what edge length gives a cube of volume <span className="font-mono">a</span>?"
      Cube roots are defined on the whole real line, so negative inputs are
      allowed: <span className="font-mono">∛(−27) = −3</span>.</>
    ),
    formula: <>∛a = b &nbsp;⇔&nbsp; b³ = a</>,
    legend: [{ sym: "a", def: "any real number, positive or negative" }],
    diagram: <CubeMini />,
    example: { given: "∛(−27)", substitute: "b³ = −27", answer: "−3" },
  },
  {
    key: "nth",
    title: "General nth root — ⁿ√a",
    explain: (
      <>For any positive index <span className="font-mono">n</span>, the nth
      root is just a fractional exponent — <span className="font-mono">ⁿ√a
      = a^(1/n)</span>. Odd n handles negative a; even n of a negative
      returns a "no real root" note instead of a false number.</>
    ),
    formula: <>ⁿ√a = a^(1/n)</>,
    legend: [
      { sym: "n", def: "root index (2, 3, 4, …)" },
      { sym: "a", def: "the number under the radical" },
    ],
    diagram: <NthMini />,
    example: { given: "⁴√81", substitute: "81^(1/4)", answer: "3" },
  },
  {
    key: "verify",
    title: "Automatic verification",
    explain: (
      <>After each result, the calculator raises the answer back to the same
      power and displays it beside the input. If the check line matches
      (up to floating-point precision), you can trust the root; if it
      doesn't, the input was out of range.</>
    ),
    formula: <>check: bⁿ ≈ a</>,
    legend: [{ sym: "b", def: "the computed root" }],
    diagram: <VerifyMini />,
    example: { given: "b = √34 ≈ 5.831", substitute: "5.831²", answer: "≈ 34 ✓" },
  },
];
