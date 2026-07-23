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

export const Route = createFileRoute("/calculators/math/modulo-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Modulo Calculator",
      title: "Modulo Calculator — a mod b with Quotient, Remainder & Steps",
      metaDescription:
        "Compute a mod b for any integers (including negatives) with quotient, remainder and step-by-step working, plus the programming convention.",
      canonicalUrl: "/calculators/math/modulo-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Modulo Calculator", path: "/calculators/math/modulo-calculator" },
      ],
      faqs: [
        {
          q: "What is the modulo operator used for?",
          a: "Modulo returns the remainder after division. It is used in programming for looping over arrays, in cryptography (RSA, Diffie–Hellman), in hashing, and in everyday problems like clock arithmetic and scheduling recurring events.",
        },
        {
          q: "Why is -7 mod 3 different in math vs programming?",
          a: "Mathematics defines the result to have the same sign as the divisor, so -7 mod 3 = 2 (because -7 = -3·3 + 2). Many programming languages (C, Java, JavaScript) truncate toward zero instead, so -7 % 3 = -1. Python and Ruby follow the mathematical convention.",
        },
        {
          q: "Can the divisor be zero?",
          a: "No. Division by zero is undefined, so a mod 0 is undefined too.",
        },
        {
          q: "What is the difference between mod and remainder?",
          a: "For positive numbers they agree. They only differ for negative operands: the true mathematical 'mod' always returns a non-negative result when the divisor is positive; the 'remainder' from truncated division can be negative.",
        },
      ],
    }),
  component: ModuloPage,
});

type Result = {
  a: number;
  b: number;
  mathMod: number;
  mathQuot: number;
  progMod: number;
  progQuot: number;
  steps: Step[];
};

function compute(a: number, b: number): Result {
  // Mathematical (floored) modulo — sign matches divisor.
  const mathQuot = Math.floor(a / b);
  const mathMod = a - mathQuot * b;
  // Programming (truncated) — sign matches dividend (JS's % operator).
  const progQuot = Math.trunc(a / b);
  const progMod = a - progQuot * b;

  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <FormulaBlock>
          a = {a},&nbsp; b = {b}
        </FormulaBlock>
      ),
    },
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>a = q · b + r,&nbsp; q = ⌊a ÷ b⌋,&nbsp; r = a − q · b</>}
          legend={[
            { sym: "a", def: "dividend" },
            { sym: "b", def: "divisor (b ≠ 0)" },
            { sym: "q", def: "quotient — floor of a ÷ b (mathematical convention)" },
            { sym: "r", def: "remainder, same sign as b, with 0 ≤ r < |b|" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — divide a by b",
      body: (
        <FormulaBlock>
          {a} ÷ {b} = {(a / b).toString()}
        </FormulaBlock>
      ),
    },
    {
      title: "Take the floor to get q",
      body: (
        <FormulaBlock>
          q = ⌊{a} ÷ {b}⌋ = {mathQuot}
        </FormulaBlock>
      ),
    },
    {
      title: "Subtract q · b from a",
      body: (
        <FormulaBlock>
          r = {a} − ({mathQuot} · {b}) = {a} − {mathQuot * b} = {mathMod}
        </FormulaBlock>
      ),
    },
    {
      title: "Answer",
      body: (
        <FormulaBlock>
          {a} mod {b} = <strong>{mathMod}</strong>
        </FormulaBlock>
      ),
    },
  ];

  if (mathMod !== progMod) {
    steps.push({
      title: "Compare with truncated (programming) modulo",
      body: (
        <FormulaBlock>
          q′ = trunc({a} ÷ {b}) = {progQuot},&nbsp; r′ = {a} − ({progQuot} · {b}) = {progMod}
          {"\n"}so {a} % {b} = {progMod} in C, Java and JavaScript.
        </FormulaBlock>
      ),
    });
  }

  return { a, b, mathMod, mathQuot, progMod, progQuot, steps };
}


function ModDial({ b, r }: { b: number; r: number }) {
  const n = Math.abs(b);
  if (n < 2 || n > 60) return null;
  const size = 220, cx = size / 2, cy = size / 2, radius = size / 2 - 30;
  const points = Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return {
      i,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
  const active = points.find((p) => p.i === ((r % n) + n) % n);
  return (
    <div className="mt-6 rounded-lg border border-border bg-card/30 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Position of the remainder on a mod-{n} dial</p>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[240px]" role="img" aria-label={`Dial showing remainder position modulo ${n}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={1.5} />
        {points.map((p) => (
          <g key={p.i}>
            <circle cx={p.x} cy={p.y} r={p.i === active?.i ? 8 : 3} fill={p.i === active?.i ? "var(--color-primary)" : "var(--color-muted-foreground)"} />
            {n <= 24 && (
              <text
                x={cx + (radius + 14) * Math.cos((p.i / n) * 2 * Math.PI - Math.PI / 2)}
                y={cy + (radius + 14) * Math.sin((p.i / n) * 2 * Math.PI - Math.PI / 2)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fill="var(--color-muted-foreground)"
              >
                {p.i}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function ModuloPage() {
  const [aStr, setAStr] = useState("17");
  const [bStr, setBStr] = useState("5");
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setRes(null);
    const a = Number(aStr.trim().replace(/[,\s_]/g, ""));
    const b = Number(bStr.trim().replace(/[,\s_]/g, ""));
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isInteger(a) || !Number.isInteger(b)) {
      setErr("Enter two whole numbers (integers).");
      return;
    }
    if (b === 0) {
      setErr("Divisor cannot be zero — a mod 0 is undefined.");
      return;
    }
    if (Math.abs(a) > Number.MAX_SAFE_INTEGER || Math.abs(b) > Number.MAX_SAFE_INTEGER) {
      setErr("Values must fit in a safe integer range (below 2^53).");
      return;
    }
    setRes(compute(a, b));
  };

  return (
    <MathCalcPage
      name="Modulo Calculator"
      tagline="Compute a mod b for any integers, positive or negative. See the quotient, remainder and step-by-step working — with both the mathematical and the programming sign conventions."
      extras={
        <>
          <CalcSection title="What is modulo?">
            <p>
              The modulo operation returns the <em>remainder</em> after
              dividing one integer by another. Written{" "}
              <span className="font-mono">a mod b</span>, it answers:
              "after taking out as many whole copies of b as fit inside a,
              what's left over?"
            </p>
            <p>
              Formally, given integers <span className="font-mono">a</span>{" "}
              and <span className="font-mono">b ≠ 0</span>, we write{" "}
              <span className="font-mono">a = q · b + r</span> with{" "}
              <span className="font-mono">0 ≤ r &lt; |b|</span>. That{" "}
              <span className="font-mono">r</span> is the value of{" "}
              <span className="font-mono">a mod b</span>. A familiar case is
              clock arithmetic — if it's 10 AM now, 15 hours later is{" "}
              <span className="font-mono">(10 + 15) mod 12 = 1</span>. The
              clock forgets everything except the remainder.
            </p>
          </CalcSection>

<CalcSection title="Modulo, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing this tool decides for you — how
              the remainder is defined, how it handles negative inputs, and
              why the two common conventions can disagree.
            </p>
            <GuideCards items={MOD_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Handles positive, negative and mixed-sign integer inputs",
                "Follows the mathematical convention (result has the sign of the divisor)",
                "Also shows the truncated result used by C, Java and JavaScript",
                "Displays the quotient and full a = q · b + r identity",
                "Step-by-step working using the floor definition",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is the modulo operator used for?",
                  a: (
                    <p>
                      It returns the remainder after integer division and is
                      used for cyclic problems: array wrap-around, calendar
                      arithmetic, hashing, cryptography and checksums.
                    </p>
                  ),
                },
                {
                  q: "Why is −7 mod 3 different in math vs programming?",
                  a: (
                    <p>
                      They use different definitions of the quotient. The
                      mathematical convention <em>floors</em>, giving
                      quotient −3 and remainder 2. Truncated modulo (C, Java,
                      JS) rounds toward zero, giving quotient −2 and
                      remainder −1.
                    </p>
                  ),
                },
                {
                  q: "Can the divisor be zero?",
                  a: (
                    <p>
                      No. Division by zero is undefined, so a mod 0 has no
                      meaning either.
                    </p>
                  ),
                },
                {
                  q: "What if both operands are negative?",
                  a: (
                    <p>
                      The mathematical result still has the sign of the
                      divisor. For example, −7 mod −3 = −1, because
                      −7 = 2 · (−3) + (−1) and −1 is in the range (−3, 0].
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
                { to: "/calculators/math/binary-calculator", label: "Binary Calculator" },
                { to: "/calculators/math/gcf-calculator", label: "GCF Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Dividend (a)" htmlFor="a">
          <TextInput
            id="a"
            value={aStr}
            onChange={(e) => setAStr(e.target.value)}
            placeholder="e.g. 17"
            inputMode="numeric"
          />
        </Field>
        <Field label="Divisor (b)" htmlFor="b">
          <TextInput
            id="b"
            value={bStr}
            onChange={(e) => setBStr(e.target.value)}
            placeholder="e.g. 5"
            inputMode="numeric"
          />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={onCalc} className="w-full sm:w-auto">
            Calculate
          </PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {res && (
        <>
          <ResultBox
            label={`${res.a} mod ${res.b}`}
            value={<span className="font-mono">{res.mathMod}</span>}
            note={
              <>
                <span className="font-mono">
                  {res.a} = {res.mathQuot} · {res.b} + {res.mathMod}
                </span>
                <br />
                Mathematical convention: the result has the same sign as the
                divisor.
              </>
            }
          />
          {res.mathMod !== res.progMod && (
            <ResultBox
              label="Truncated (programming) result"
              value={<span className="font-mono">{res.progMod}</span>}
              note={
                <>
                  What <span className="font-mono">{res.a} % {res.b}</span>{" "}
                  returns in C, Java and JavaScript (quotient truncated toward
                  zero: {res.progQuot}).
                </>
              }
            />
          )}
          <ModDial b={res.b} r={res.mathMod} />
          <StepsToggle steps={res.steps} />
        </>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function QuotRemMini() {
  return (
    <svg viewBox="0 0 200 100" className="w-full">
      <rect x="1" y="1" width="198" height="98" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <line x1="15" y1="55" x2="185" y2="55" stroke="var(--color-border)" />
      {[15, 45, 75, 105, 135, 165].map((x,i)=>(
        <line key={i} x1={x} y1="50" x2={x} y2="60" stroke="var(--color-muted-foreground)" />
      ))}
      {[0,1,2,3,4].map(i => (
        <rect key={i} x={15+i*30} y="40" width="30" height="15" fill={i<3?"var(--color-primary)/0.18":"var(--color-muted)/0.25"} stroke="var(--color-border)" />
      ))}
      <text x="60" y="30" textAnchor="middle" fontSize="10" fill="var(--color-primary)">3 whole b's fit</text>
      <text x="150" y="78" textAnchor="middle" fontSize="10" fill="var(--color-foreground)">r = a − 3b</text>
      <text x="100" y="94" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">17 mod 5: three 5's, remainder 2</text>
    </svg>
  );
}

function NegModMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <line x1="15" y1="55" x2="205" y2="55" stroke="var(--color-border)" />
      {[-9,-6,-3,0,3,6,9].map((n,i)=>{
        const x = 15+i*32;
        return (
          <g key={n}>
            <line x1={x} y1="50" x2={x} y2="60" stroke="var(--color-muted-foreground)" />
            <text x={x} y="72" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">{n}</text>
          </g>
        );
      })}
      <circle cx="47" cy="55" r="4" fill="var(--color-primary)" />
      <text x="47" y="35" textAnchor="middle" fontSize="10" fill="var(--color-primary)">−7</text>
      <path d="M47 40 Q 65 20 105 30" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#am1)" />
      <defs>
        <marker id="am1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--color-primary)" />
        </marker>
      </defs>
      <text x="110" y="20" textAnchor="middle" fontSize="10" fill="var(--color-primary)">−7 + 3·3 = +2 (mathematical)</text>
      <text x="110" y="94" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">result has sign of divisor b</text>
    </svg>
  );
}

function ConventionMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <text x="110" y="20" textAnchor="middle" fontSize="10" fill="var(--color-primary)">−7 ÷ 3</text>
      <rect x="15" y="35" width="90" height="50" rx="6" fill="var(--color-primary)/0.08" stroke="var(--color-primary)/0.35" />
      <text x="60" y="50" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">Math (floor)</text>
      <text x="60" y="68" textAnchor="middle" fontSize="12" fill="var(--color-foreground)">q=−3, r=+2</text>
      <text x="60" y="80" textAnchor="middle" fontSize="8" fill="var(--color-muted-foreground)">Python, Ruby</text>
      <rect x="115" y="35" width="90" height="50" rx="6" fill="var(--color-muted)/0.25" stroke="var(--color-border)" />
      <text x="160" y="50" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">Truncated</text>
      <text x="160" y="68" textAnchor="middle" fontSize="12" fill="var(--color-foreground)">q=−2, r=−1</text>
      <text x="160" y="80" textAnchor="middle" fontSize="8" fill="var(--color-muted-foreground)">C, Java, JS</text>
    </svg>
  );
}

const MOD_GUIDE: GuideCardItem[] = [
  {
    key: "def",
    title: "Definition — how the remainder is chosen",
    explain: (
      <>Write <span className="font-mono">a = q · b + r</span> and pick the
        integer quotient <span className="font-mono">q</span> that makes{" "}
        <span className="font-mono">0 ≤ r &lt; |b|</span>. That{" "}
        <span className="font-mono">r</span> is <span className="font-mono">a mod b</span> —
        the "leftover" after taking out whole copies of <span className="font-mono">b</span>.</>
    ),
    formula: <>a mod b = a − ⌊a / b⌋ · b</>,
    diagram: <QuotRemMini />,
    example: {
      given: <span className="font-mono">a = 17, b = 5</span>,
      substitute: <>17 − ⌊17/5⌋ · 5 = 17 − 3 · 5</>,
      answer: <span className="font-mono">2</span>,
    },
  },
  {
    key: "neg",
    title: "Negative dividends — sign follows the divisor",
    explain: (
      <>For negatives we still require <span className="font-mono">0 ≤ r &lt; |b|</span>, so
        the mathematical result has the same sign as the divisor{" "}
        <span className="font-mono">b</span>. The tool follows this convention.</>
    ),
    formula: <>a mod b ≡ a + k·b (mod b), pick k so 0 ≤ r &lt; |b|</>,
    diagram: <NegModMini />,
    example: {
      given: <span className="font-mono">a = −7, b = 3</span>,
      substitute: <>⌊−7/3⌋ = −3 → r = −7 − (−3)·3</>,
      answer: <span className="font-mono">2</span>,
    },
  },
  {
    key: "conv",
    title: "Math vs programming — where they disagree",
    explain: (
      <>Many programming languages truncate the quotient toward zero instead
        of flooring, which flips the sign of the remainder for negative
        inputs. The tool shows both so you can match the behaviour of your
        language.</>
    ),
    formula: <>truncated r = a − trunc(a / b) · b</>,
    diagram: <ConventionMini />,
    example: {
      given: <span className="font-mono">−7 mod 3</span>,
      substitute: <>floor → +2, truncate → −1</>,
      answer: <>+2 (math) · −1 (C/Java/JS)</>,
    },
  },
];
