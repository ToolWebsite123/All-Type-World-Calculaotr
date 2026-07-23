import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildCalculatorSeo } from "@/components/SEO";
import { StepsToggle } from "@/components/StepsToggle";
import { CopyButton } from "@/components/CopyButton";
import { ResultActions } from "@/components/ResultActions";
import {
  Field,
  TextInput,
  PrimaryButton,
  ResultBox,
  ErrorBox,
  CalcSection,
  GuideCards,
  FeatureList,
  CalcFAQ,
  RelatedLinks,
  FormulaBlock,
  FormulaWithLegend,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { gcd } from "@/lib/math/core";
import {
  parseFraction,
  operate,
  toMixedString,
  toSimpleString,
  toDecimal,
  simplify,
  type FracOp,
  type Fraction,
} from "@/lib/math/fraction";
import {
  parseBigInt,
  bigSimplify,
  bigOperate,
  bigToString,
  bigToDecimalString,
  decimalStringToFraction,
  type BigOp,
} from "@/lib/math/fraction-big";

const FRACTION_FAQS = [
  {
    q: "How do I add fractions with different denominators?",
    a: "Rewrite each fraction with a common denominator (the product of the two denominators always works, or use the least common multiple to keep numbers smaller), add the numerators, keep the denominator, then simplify. For example 1/2 + 2/3 becomes 3/6 + 4/6 = 7/6.",
  },
  {
    q: "What is a mixed number?",
    a: "A mixed number combines a whole number and a proper fraction, like 1 3/4. It represents the same value as the improper fraction 7/4 — you can convert between the two by multiplying the whole number by the denominator and adding the numerator.",
  },
  {
    q: "How do I simplify a fraction to lowest terms?",
    a: "Find the greatest common factor (GCF) of the numerator and denominator, then divide both by that GCF. For example 18/24 has GCF 6, so it simplifies to 3/4. This calculator does this automatically for every result.",
  },
  {
    q: "How do I divide fractions?",
    a: "Multiply the first fraction by the reciprocal of the second (flip the second fraction upside down, then multiply straight across). For example 3/4 ÷ 2/5 becomes 3/4 × 5/2 = 15/8.",
  },
  {
    q: "How do I convert a decimal to a fraction?",
    a: "Count the digits after the decimal point, write the number without the point as the numerator, and use 10 raised to that count as the denominator, then simplify. 0.375 has three decimal places, so it becomes 375/1000 = 3/8.",
  },
];

export const Route = createFileRoute("/calculators/math/fraction-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Fraction Calculator",
      title: "Fraction Calculator - Add, Subtract, Multiply, Divide",
      metaDescription: "Free fraction calculator: add, subtract, multiply, divide, simplify and convert fractions with step-by-step solutions. Supports mixed numbers.",
      canonicalUrl: "/calculators/math/fraction-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Fraction Calculator", path: "/calculators/math/fraction-calculator" },
      ],
      faqs: FRACTION_FAQS,
    }),
  component: FractionPage,
});


/* ---------------- Page ---------------- */

function FractionPage() {
  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-6 pt-6 pb-24">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Math", to: "/calculators/math" },
            { label: "Fraction Calculator" },
          ]}
        />
        <header className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Fraction Calculator
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Add, subtract, multiply, and divide fractions with step-by-step
            working. Includes mixed numbers, simplification, decimal
            conversions, and arbitrary-precision support for very large
            integers.
          </p>
        </header>

        <div className="space-y-6">
          <ToolCard
            title="Fraction Calculator"
            subtitle="Combine two fractions with any of the four operations."
          >
            <MainFractionTool />
          </ToolCard>

          <ToolCard
            title="Mixed Numbers Calculator"
            subtitle="Enter each value as a whole number plus a fractional part."
          >
            <MixedNumberTool />
          </ToolCard>

          <ToolCard
            title="Simplify Fractions Calculator"
            subtitle="Reduce a fraction to its lowest terms."
          >
            <SimplifyTool />
          </ToolCard>

          <ToolCard
            title="Decimal to Fraction Calculator"
            subtitle="Convert a finite decimal number to a simplified fraction."
          >
            <DecimalToFractionTool />
          </ToolCard>

          <ToolCard
            title="Fraction to Decimal Calculator"
            subtitle="Convert a fraction to its decimal representation."
          >
            <FractionToDecimalTool />
          </ToolCard>

          <ToolCard
            title="Big Number Fraction Calculator"
            subtitle="Same as the main calculator, but supports arbitrarily large integers."
          >
            <BigFractionTool />
          </ToolCard>
        </div>

        <EducationalContent />
      </section>
    </Layout>
  );
}


/* ---------------- Shared UI ---------------- */

function ToolCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card/60 p-5 shadow-[0_20px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:p-6">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "inline-flex items-center justify-center rounded-full border border-border bg-secondary/40 px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary/60 active:scale-[0.98] " +
        (props.className ?? "")
      }
    />
  );
}

function OpSelect<T extends string>({
  id,
  value,
  onChange,
}: {
  id: string;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-[46px] w-full rounded-xl border border-border bg-background/60 px-3 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <option value="+">+ Add</option>
      <option value="-">− Subtract</option>
      <option value="*">× Multiply</option>
      <option value="/">÷ Divide</option>
    </select>
  );
}

/** Stacked numerator over denominator input. */
function FractionStack({
  label,
  n,
  d,
  setN,
  setD,
}: {
  label: string;
  n: string;
  d: string;
  setN: (v: string) => void;
  setD: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-foreground">{label}</div>
      <div className="w-28">
        <TextInput
          inputMode="numeric"
          value={n}
          onChange={(e) => setN(e.target.value)}
          className="text-center"
          aria-label={`${label} numerator`}
        />
        <div className="my-1 h-px bg-border" />
        <TextInput
          inputMode="numeric"
          value={d}
          onChange={(e) => setD(e.target.value)}
          className="text-center"
          aria-label={`${label} denominator`}
        />
      </div>
    </div>
  );
}

function MixedStack({
  label,
  w,
  n,
  d,
  setW,
  setN,
  setD,
}: {
  label: string;
  w: string;
  n: string;
  d: string;
  setW: (v: string) => void;
  setN: (v: string) => void;
  setD: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-foreground">{label}</div>
      <div className="flex items-center gap-3">
        <TextInput
          inputMode="numeric"
          value={w}
          onChange={(e) => setW(e.target.value)}
          className="w-16 text-center"
          aria-label={`${label} whole`}
          placeholder="0"
        />
        <div className="w-20">
          <TextInput
            inputMode="numeric"
            value={n}
            onChange={(e) => setN(e.target.value)}
            className="text-center"
            aria-label={`${label} numerator`}
          />
          <div className="my-1 h-px bg-border" />
          <TextInput
            inputMode="numeric"
            value={d}
            onChange={(e) => setD(e.target.value)}
            className="text-center"
            aria-label={`${label} denominator`}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------- 1. Main Fraction Calculator with steps ---------------- */

interface Step {
  title: string;
  body: ReactNode;
}

function MainFractionTool() {
  const [n1, setN1] = useState("1");
  const [d1, setD1] = useState("2");
  const [n2, setN2] = useState("2");
  const [d2, setD2] = useState("3");
  const [op, setOp] = useState<FracOp>("+");
  const [result, setResult] = useState<null | {
    simple: string;
    mixed: string;
    decimal: string;
    steps: Step[];
  }>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const clear = () => {
    setN1("");
    setD1("");
    setN2("");
    setD2("");
    setResult(null);
    setErr(null);
  };

  const compute = () => {
    setErr(null);
    setResult(null);
    try {
      const a: Fraction = { n: parseInt(n1, 10), d: parseInt(d1, 10) };
      const b: Fraction = { n: parseInt(n2, 10), d: parseInt(d2, 10) };
      if ([a.n, a.d, b.n, b.d].some((x) => !Number.isFinite(x))) {
        throw new Error("Please fill every numerator and denominator with a whole number.");
      }
      if (a.d === 0 || b.d === 0) throw new Error("Denominator cannot be zero");
      const r = operate(simplify(a), op, simplify(b));
      setResult({
        simple: toSimpleString(r),
        mixed: toMixedString(r),
        decimal: toDecimal(r).toFixed(6).replace(/\.?0+$/, ""),
        steps: buildSteps(a, op, b, r),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <FractionStack label="First fraction" n={n1} d={d1} setN={setN1} setD={setD1} />
        <div className="w-32">
          <div className="mb-1.5 text-sm font-medium text-foreground">Operation</div>
          <OpSelect id="op-main" value={op} onChange={setOp} />
        </div>
        <FractionStack label="Second fraction" n={n2} d={d2} setN={setN2} setD={setD2} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
        <SecondaryButton onClick={clear}>Clear</SecondaryButton>
      </div>

      {err && <ErrorBox message={err} />}
      {result && (
        <div className="mt-4 space-y-4">
          <ResultActions
            filename="fraction-result"
            captureRef={resultRef}
            getCopyText={() => `${n1}/${d1} ${op} ${n2}/${d2} = ${result.simple} (mixed ${result.mixed}, decimal ${result.decimal})`}
          />
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Result"
              value={
                <span className="flex flex-wrap items-center gap-3">
                  <span>{result.simple}</span>
                  <CopyButton text={result.simple} />
                </span>
              }
              note={
                <>
                  Mixed: <span className="tabular-nums">{result.mixed}</span>
                  {" · "}
                  Decimal: <span className="tabular-nums">{result.decimal}</span>
                </>
              }
            />
            <FractionVisual
              a={{ n: parseInt(n1, 10), d: parseInt(d1, 10) }}
              op={op}
              b={{ n: parseInt(n2, 10), d: parseInt(d2, 10) }}
              resultDecimal={parseFloat(result.decimal)}
            />
            <StepsToggle steps={result.steps} />
          </div>
        </div>
      )}


    </>
  );
}

function buildSteps(a: Fraction, op: FracOp, b: Fraction, result: Fraction): Step[] {
  const steps: Step[] = [];
  const aStr = `${a.n}/${a.d}`;
  const bStr = `${b.n}/${b.d}`;
  const opSym = { "+": "+", "-": "−", "*": "×", "/": "÷" }[op];

  steps.push({
    title: "Given",
    body: (
      <FormulaBlock>
        {aStr} {opSym} {bStr}
      </FormulaBlock>
    ),
  });

  if (op === "+" || op === "-") {
    steps.push({
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>a⁄b {opSym} c⁄d = (a·d {opSym} b·c) ⁄ (b·d)</>}
          legend={[
            { sym: "a, b", def: "numerator and denominator of the first fraction" },
            { sym: "c, d", def: "numerator and denominator of the second fraction" },
          ]}
        />
      ),
    });
    const lcd = a.d * b.d;
    const an = a.n * b.d;
    const bn = b.n * a.d;
    steps.push({
      title: "Substitute",
      body: (
        <FormulaBlock>
          ({a.n} × {b.d}) {opSym} ({b.n} × {a.d}) ⁄ ({a.d} × {b.d}) = ({an} {opSym} {bn}) ⁄ {lcd}
        </FormulaBlock>
      ),
    });
    const combined = op === "+" ? an + bn : an - bn;
    steps.push({
      title: "Combine",
      body: (
        <FormulaBlock>
          = {combined} ⁄ {lcd}
        </FormulaBlock>
      ),
    });
    const g = gcd(combined, lcd);
    steps.push({
      title: "Simplify",
      body: (
        <FormulaBlock>
          {g > 1
            ? `Divide top and bottom by GCF ${g}: ${combined}/${lcd} = ${combined / g}/${lcd / g}`
            : `${combined}/${lcd} is already in lowest terms`}
        </FormulaBlock>
      ),
    });
  } else if (op === "*") {
    steps.push({
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>a⁄b × c⁄d = (a·c) ⁄ (b·d)</>}
          legend={[
            { sym: "a, b", def: "numerator and denominator of the first fraction" },
            { sym: "c, d", def: "numerator and denominator of the second fraction" },
          ]}
        />
      ),
    });
    const n = a.n * b.n;
    const d = a.d * b.d;
    steps.push({
      title: "Substitute",
      body: (
        <FormulaBlock>
          ({a.n} × {b.n}) ⁄ ({a.d} × {b.d}) = {n} ⁄ {d}
        </FormulaBlock>
      ),
    });
    const g = gcd(n, d);
    steps.push({
      title: "Simplify",
      body: (
        <FormulaBlock>
          {g > 1 ? `Divide by GCF ${g}: ${n}/${d} = ${n / g}/${d / g}` : `${n}/${d} is already in lowest terms`}
        </FormulaBlock>
      ),
    });
  } else {
    steps.push({
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>a⁄b ÷ c⁄d = a⁄b × d⁄c = (a·d) ⁄ (b·c)</>}
          legend={[
            { sym: "a, b", def: "numerator and denominator of the dividend" },
            { sym: "c, d", def: "numerator and denominator of the divisor" },
          ]}
        />
      ),
    });
    const n = a.n * b.d;
    const d = a.d * b.n;
    steps.push({
      title: "Substitute (multiply by the reciprocal)",
      body: (
        <FormulaBlock>
          ({a.n} × {b.d}) ⁄ ({a.d} × {b.n}) = {n} ⁄ {d}
        </FormulaBlock>
      ),
    });
    const g = gcd(n, d);
    steps.push({
      title: "Simplify",
      body: (
        <FormulaBlock>
          {g > 1 ? `Divide by GCF ${g}: ${n}/${d} = ${n / g}/${d / g}` : `${n}/${d} is already in lowest terms`}
        </FormulaBlock>
      ),
    });
  }

  steps.push({
    title: "Answer",
    body: (
      <FormulaBlock>
        <strong>{toSimpleString(result)}</strong> &nbsp;(mixed: {toMixedString(result)}, decimal: {toDecimal(result)})
      </FormulaBlock>
    ),
  });
  return steps;
}

/* ---------------- Shared: Copy button + Fraction visualizer ---------------- */




function PieFraction({ value, label }: { value: number; label: string }) {
  // Clamp for pure visual purposes; keep sign info via label.
  const v = Math.max(0, Math.min(1, Math.abs(value)));
  const r = 34;
  const cx = 40;
  const cy = 40;
  // Full circle when v ~= 1
  let path = "";
  if (v >= 0.999) {
    path = `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  } else if (v > 0) {
    const angle = v * Math.PI * 2;
    const x = cx + r * Math.sin(angle);
    const y = cy - r * Math.cos(angle);
    const large = v > 0.5 ? 1 : 0;
    path = `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} Z`;
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 80 80" className="h-20 w-20" aria-hidden>
        <circle cx={cx} cy={cy} r={r} className="fill-secondary/40 stroke-border" strokeWidth="1" />
        {path && <path d={path} className="fill-primary/70 stroke-primary" strokeWidth="1" />}
      </svg>
      <div className="text-xs font-medium tabular-nums text-foreground">{label}</div>
    </div>
  );
}

function FractionVisual({
  a,
  op,
  b,
  resultDecimal,
}: {
  a: Fraction;
  op: FracOp;
  b: Fraction;
  resultDecimal: number;
}) {
  const opSym = { "+": "+", "-": "−", "*": "×", "/": "÷" }[op];
  const aVal = a.d !== 0 ? a.n / a.d : 0;
  const bVal = b.d !== 0 ? b.n / b.d : 0;
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Visual
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        <PieFraction value={aVal} label={`${a.n}/${a.d}`} />
        <div className="text-2xl font-semibold text-muted-foreground">{opSym}</div>
        <PieFraction value={bVal} label={`${b.n}/${b.d}`} />
        <div className="text-2xl font-semibold text-muted-foreground">=</div>
        <PieFraction value={resultDecimal} label={resultDecimal.toString().slice(0, 6)} />
      </div>
      {(Math.abs(aVal) > 1 || Math.abs(bVal) > 1 || Math.abs(resultDecimal) > 1) && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Values greater than 1 are shown as a full pie.
        </p>
      )}
    </div>
  );
}




/* ---------------- 2. Mixed Numbers ---------------- */

function MixedNumberTool() {
  const [w1, setW1] = useState("1");
  const [n1, setN1] = useState("1");
  const [d1, setD1] = useState("2");
  const [w2, setW2] = useState("2");
  const [n2, setN2] = useState("1");
  const [d2, setD2] = useState("3");
  const [op, setOp] = useState<FracOp>("+");
  const [result, setResult] = useState<null | {
    simple: string;
    mixed: string;
    decimal: string;
    steps: Step[];
  }>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const compute = () => {
    setErr(null);
    setResult(null);
    try {
      const a = mixedToFraction(w1, n1, d1);
      const b = mixedToFraction(w2, n2, d2);
      const r = operate(a, op, b);
      const steps: Step[] = [];
      steps.push({
        title: "Write the formula",
        body: (
          <FormulaWithLegend
            formula={<>w n⁄d = (w · d + n) ⁄ d</>}
            legend={[
              { sym: "w", def: "whole number part" },
              { sym: "n", def: "numerator of the fractional part" },
              { sym: "d", def: "denominator of the fractional part" },
            ]}
          />
        ),
      });
      steps.push({
        title: "Substitute — convert each mixed number to an improper fraction",
        body: (
          <FormulaBlock>
            First: ({w1 || 0} × {d1 || 1} + {n1 || 0}) ⁄ {d1 || 1} = {a.n}/{a.d}
            <br />
            Second: ({w2 || 0} × {d2 || 1} + {n2 || 0}) ⁄ {d2 || 1} = {b.n}/{b.d}
          </FormulaBlock>
        ),
      });
      buildSteps(a, op, b, r).forEach((s) => steps.push(s));
      steps.push({
        title: "Write as a mixed number",
        body: (
          <FormulaBlock>
            {toSimpleString(r)} = <strong>{toMixedString(r)}</strong>
          </FormulaBlock>
        ),
      });
      setResult({
        simple: toSimpleString(r),
        mixed: toMixedString(r),
        decimal: toDecimal(r).toFixed(6).replace(/\.?0+$/, ""),
        steps,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <MixedStack label="First mixed number" w={w1} n={n1} d={d1} setW={setW1} setN={setN1} setD={setD1} />
        <div className="w-32">
          <div className="mb-1.5 text-sm font-medium text-foreground">Operation</div>
          <OpSelect id="op-mixed" value={op} onChange={setOp} />
        </div>
        <MixedStack label="Second mixed number" w={w2} n={n2} d={d2} setW={setW2} setN={setN2} setD={setD2} />
      </div>
      <div className="mt-5">
        <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <div className="mt-4 space-y-4">
          <ResultActions
            filename="mixed-number-result"
            captureRef={resultRef}
            getCopyText={() => `${w1} ${n1}/${d1} ${op} ${w2} ${n2}/${d2} = ${result.mixed} (fraction ${result.simple}, decimal ${result.decimal})`}
          />
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Result"
              value={result.mixed}
              note={
                <>
                  Fraction: <span className="tabular-nums">{result.simple}</span>
                  {" · "}
                  Decimal: <span className="tabular-nums">{result.decimal}</span>
                </>
              }
            />
            <StepsToggle steps={result.steps} />
          </div>
        </div>
      )}

    </>
  );
}

function mixedToFraction(wStr: string, nStr: string, dStr: string): Fraction {
  const w = wStr.trim() === "" ? 0 : parseInt(wStr, 10);
  const n = nStr.trim() === "" ? 0 : parseInt(nStr, 10);
  const d = dStr.trim() === "" ? 1 : parseInt(dStr, 10);
  if (![w, n, d].every(Number.isFinite)) throw new Error("Enter whole numbers only.");
  if (d === 0) throw new Error("Denominator cannot be zero");
  if (n < 0) throw new Error("Fractional numerator must be non-negative in a mixed number");
  const sign = w < 0 ? -1 : 1;
  const num = sign * (Math.abs(w) * d + n);
  return simplify({ n: num, d });
}

/* ---------------- 3. Simplify ---------------- */

function SimplifyTool() {
  const [n, setN] = useState("18");
  const [d, setD] = useState("24");
  const [result, setResult] = useState<null | { simple: string; note: string; steps: Step[] }>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const compute = () => {
    setErr(null);
    setResult(null);
    try {
      const num = parseInt(n, 10);
      const den = parseInt(d, 10);
      if (!Number.isFinite(num) || !Number.isFinite(den)) throw new Error("Enter whole numbers");
      if (den === 0) throw new Error("Denominator cannot be zero");
      const g = gcd(num, den);
      const r = simplify({ n: num, d: den });
      const steps: Step[] = [
        {
          title: "Given",
          body: <FormulaBlock>{num}⁄{den}</FormulaBlock>,
        },
        {
          title: "Write the formula",
          body: (
            <FormulaWithLegend
              formula={<>simplified = n⁄GCF(n, d) &nbsp;⁄&nbsp; d⁄GCF(n, d)</>}
              legend={[
                { sym: "n", def: "numerator" },
                { sym: "d", def: "denominator" },
                { sym: "GCF", def: "greatest common factor of n and d" },
              ]}
            />
          ),
        },
        {
          title: "Find the GCF",
          body: <FormulaBlock>GCF({Math.abs(num)}, {Math.abs(den)}) = {g}</FormulaBlock>,
        },
        {
          title: "Substitute",
          body: (
            <FormulaBlock>
              {g > 1
                ? `${num} ÷ ${g} = ${num / g},  ${den} ÷ ${g} = ${den / g}`
                : `GCF is 1 — the fraction is already in lowest terms`}
            </FormulaBlock>
          ),
        },
        {
          title: "Answer",
          body: <FormulaBlock><strong>{toSimpleString(r)}</strong></FormulaBlock>,
        },
      ];
      setResult({
        simple: toSimpleString(r),
        note: g > 1 ? `Divided top and bottom by GCF ${g}.` : "Already in lowest terms.",
        steps,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <FractionStack label="Fraction" n={n} d={d} setN={setN} setD={setD} />
        <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <div className="mt-4 space-y-4">
          <ResultActions
            filename="simplified-fraction"
            captureRef={resultRef}
            getCopyText={() => `Simplified: ${result.simple} — ${result.note}`}
          />
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
            <ResultBox label="Simplified" value={result.simple} note={result.note} />
            <StepsToggle steps={result.steps} />
          </div>
        </div>
      )}

    </>
  );
}

/* ---------------- 4. Decimal to Fraction ---------------- */

function DecimalToFractionTool() {
  const [dec, setDec] = useState("0.375");
  const [result, setResult] = useState<null | { simple: string; mixed: string; steps: Step[] }>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const compute = () => {
    setErr(null);
    setResult(null);
    try {
      const f = decimalStringToFraction(dec);
      const asRegular: Fraction = { n: Number(f.n), d: Number(f.d) };
      const simple = bigToString(f);
      const mixed =
        Number.isSafeInteger(asRegular.n) && Number.isSafeInteger(asRegular.d)
          ? toMixedString(asRegular)
          : simple;

      const s = dec.trim();
      const sign = s.startsWith("-") ? "-" : "";
      const body = s.replace(/^-/, "");
      const dot = body.indexOf(".");
      const fracDigits = dot === -1 ? 0 : body.length - dot - 1;
      const rawNum = sign + body.replace(".", "");
      const rawDen = Math.pow(10, fracDigits).toString();
      const steps: Step[] = [
        { title: "Given", body: <FormulaBlock>{s}</FormulaBlock> },
        {
          title: "Write the formula",
          body: (
            <FormulaWithLegend
              formula={<>fraction = (digits without the point) ⁄ 10ⁿ, then simplify by GCF</>}
              legend={[
                { sym: "n", def: "number of digits after the decimal point" },
                { sym: "GCF", def: "greatest common factor of numerator and denominator" },
              ]}
            />
          ),
        },
        {
          title: "Substitute",
          body: (
            <FormulaBlock>
              {rawNum} ⁄ 10^{fracDigits} = {rawNum} ⁄ {rawDen}
            </FormulaBlock>
          ),
        },
        {
          title: "Simplify",
          body: <FormulaBlock>= {simple}</FormulaBlock>,
        },
        {
          title: "Answer",
          body: (
            <FormulaBlock>
              <strong>{simple}</strong>
              {mixed !== simple ? <> &nbsp;(mixed: {mixed})</> : null}
            </FormulaBlock>
          ),
        },
      ];
      setResult({ simple, mixed, steps });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <>
      <Field label="Decimal number" htmlFor="dec-input">
        <TextInput
          id="dec-input"
          inputMode="decimal"
          value={dec}
          onChange={(e) => setDec(e.target.value)}
          placeholder="e.g. 0.375 or -1.25"
        />
      </Field>
      <div className="mt-4">
        <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <div className="mt-4 space-y-4">
          <ResultActions
            filename="decimal-to-fraction"
            captureRef={resultRef}
            getCopyText={() => `${dec} = ${result.simple}${result.simple !== result.mixed ? ` (mixed ${result.mixed})` : ""}`}
          />
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Fraction"
              value={result.simple}
              note={result.simple !== result.mixed ? <>Mixed: <span className="tabular-nums">{result.mixed}</span></> : null}
            />
            <StepsToggle steps={result.steps} />
          </div>
        </div>
      )}

    </>
  );
}

/* ---------------- 5. Fraction to Decimal ---------------- */

function FractionToDecimalTool() {
  const [n, setN] = useState("7");
  const [d, setD] = useState("8");
  const [result, setResult] = useState<null | { dec: string; simple: string; steps: Step[] }>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const compute = () => {
    setErr(null);
    setResult(null);
    try {
      const f = parseFraction(`${n}/${d}`);
      const decStr = bigToDecimalString({ n: BigInt(f.n), d: BigInt(f.d) }, 24);
      const simpleStr = toSimpleString(f);
      const steps: Step[] = [
        { title: "Given", body: <FormulaBlock>{n} ⁄ {d}</FormulaBlock> },
        {
          title: "Write the formula",
          body: (
            <FormulaWithLegend
              formula={<>decimal = n ÷ d</>}
              legend={[
                { sym: "n", def: "numerator" },
                { sym: "d", def: "denominator" },
              ]}
            />
          ),
        },
        {
          title: "Simplify first (optional)",
          body: (
            <FormulaBlock>
              {simpleStr === `${n}/${d}`
                ? `${n}/${d} is already in lowest terms`
                : `${n}/${d} reduces to ${simpleStr}`}
            </FormulaBlock>
          ),
        },
        {
          title: "Substitute — divide numerator by denominator",
          body: (
            <FormulaBlock>
              {f.n} ÷ {f.d} = {decStr}
            </FormulaBlock>
          ),
        },
        {
          title: "Answer",
          body: <FormulaBlock><strong>{decStr}</strong></FormulaBlock>,
        },
      ];
      setResult({ dec: decStr, simple: simpleStr, steps });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <FractionStack label="Fraction" n={n} d={d} setN={setN} setD={setD} />
        <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <div className="mt-4 space-y-4">
          <ResultActions
            filename="fraction-to-decimal"
            captureRef={resultRef}
            getCopyText={() => `${n}/${d} = ${result.dec} (simplified ${result.simple})`}
          />
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Decimal"
              value={result.dec}
              note={<>Simplified fraction: <span className="tabular-nums">{result.simple}</span></>}
            />
            <StepsToggle steps={result.steps} />
          </div>
        </div>
      )}

    </>
  );
}

/* ---------------- 6. Big Number Fraction ---------------- */

function BigFractionTool() {
  const [n1, setN1] = useState("123456789012345678901234567890");
  const [d1, setD1] = useState("2");
  const [n2, setN2] = useState("1");
  const [d2, setD2] = useState("3");
  const [op, setOp] = useState<BigOp>("+");
  const [result, setResult] = useState<null | { simple: string; decimal: string }>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const compute = () => {
    setErr(null);
    setResult(null);
    try {
      const a = bigSimplify({ n: parseBigInt(n1), d: parseBigInt(d1) });
      const b = bigSimplify({ n: parseBigInt(n2), d: parseBigInt(d2) });
      const r = bigOperate(a, op, b);
      setResult({
        simple: bigToString(r),
        decimal: bigToDecimalString(r, 30),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First numerator" htmlFor="bn1">
          <TextInput id="bn1" value={n1} onChange={(e) => setN1(e.target.value)} />
        </Field>
        <Field label="First denominator" htmlFor="bd1">
          <TextInput id="bd1" value={d1} onChange={(e) => setD1(e.target.value)} />
        </Field>
        <Field label="Operation" htmlFor="op-big">
          <OpSelect id="op-big" value={op} onChange={setOp} />
        </Field>
        <div />
        <Field label="Second numerator" htmlFor="bn2">
          <TextInput id="bn2" value={n2} onChange={(e) => setN2(e.target.value)} />
        </Field>
        <Field label="Second denominator" htmlFor="bd2">
          <TextInput id="bd2" value={d2} onChange={(e) => setD2(e.target.value)} />
        </Field>
      </div>
      <div className="mt-5">
        <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <div className="mt-4 space-y-4">
          <ResultActions
            filename="big-fraction-result"
            captureRef={resultRef}
            getCopyText={() => `${n1}/${d1} ${op} ${n2}/${d2} = ${result.simple} (decimal ${result.decimal})`}
          />
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Result"
              value={<span className="break-all text-lg sm:text-2xl">{result.simple}</span>}
              note={<>Decimal (truncated): <span className="tabular-nums break-all">{result.decimal}</span></>}
            />
          </div>
        </div>
      )}

    </>
  );
}

/* ---------------- Educational Content ---------------- */

function EducationalContent() {
  return (
    <div className="mt-12 space-y-10 text-[15px] leading-relaxed text-muted-foreground">
      <CalcSection title="What is a fraction?">
        <p>
          A <strong>fraction</strong> represents a part of a whole. It is written as
          two numbers separated by a bar — the <strong>numerator</strong> on top and
          the <strong>denominator</strong> below. The denominator says how many equal
          pieces the whole is cut into; the numerator counts how many of those pieces
          you have.
        </p>
        <p>
          A fraction whose numerator is smaller than its denominator (like 3/4) is a{" "}
          <em>proper</em> fraction. When the numerator is greater than or equal to the
          denominator (like 7/4), it is <em>improper</em> and can also be written as a{" "}
          <em>mixed number</em> such as 1 3/4.
        </p>
      </CalcSection>

      <CalcSection title="Fractions explained, operation by operation">
        <p className="text-sm text-muted-foreground">
          Each card pairs a plain-English rule with the formula, a small diagram
          and a worked example — so the concept and the arithmetic sit side by side.
        </p>
        <GuideCards items={FRACTION_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Six tools in one page — main calculator, mixed numbers, simplify, decimal↔fraction, and a big-integer mode.",
            "Full step-by-step working for every operation (common denominator, product, reciprocal, GCF reduction).",
            "Auto-simplifies every result to lowest terms and shows both improper and mixed-number forms.",
            "Handles arbitrarily large numerators and denominators via the big-number mode — no precision loss.",
            "Copy any answer or download the result panel as a PNG for notes and homework.",
            "Keyboard-friendly inputs with clear validation for zero denominators and malformed entries.",
          ]}
        />
      </CalcSection>

      <CalcSection title="Frequently asked questions">
        <CalcFAQ items={FRACTION_FAQS} />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/percentage-calculator", label: "Percentage Calculator" },
            { to: "/calculators/math/ratio-calculator", label: "Ratio Calculator" },
            { to: "/calculators/math/gcf-calculator", label: "GCF Calculator" },
            { to: "/calculators/math/lcm-calculator", label: "LCM Calculator" },
          ]}
        />
      </CalcSection>
    </div>
  );
}

/* ---------------- Guide diagrams ---------------- */

function PieMini({ num, den, label }: { num: number; den: number; label: string }) {
  const cx = 60, cy = 60, r = 46;
  const slices = Array.from({ length: den }, (_, i) => {
    const a1 = (i / den) * Math.PI * 2 - Math.PI / 2;
    const a2 = ((i + 1) / den) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const large = a2 - a1 > Math.PI ? 1 : 0;
    return { d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, filled: i < num };
  });
  return (
    <svg viewBox="0 0 140 140" className="mx-auto h-32 w-32">
      {slices.map((s, i) => (
        <path key={i} d={s.d} fill={s.filled ? "var(--color-primary) / 0.35" : "var(--color-secondary)"} stroke="var(--color-border)" strokeWidth="1" />
      ))}
      <text x="70" y="132" textAnchor="middle" className="fill-muted-foreground" fontSize="11">{label}</text>
    </svg>
  );
}

function TwoPiesMini() {
  return (
    <div className="flex items-center justify-center gap-2">
      <PieMini num={3} den={6} label="3/6" />
      <span className="font-mono text-lg text-primary">+</span>
      <PieMini num={4} den={6} label="4/6" />
    </div>
  );
}

function MultiplyMini() {
  return (
    <svg viewBox="0 0 220 120" className="mx-auto h-28 w-full max-w-[240px]">
      <rect x="10" y="20" width="90" height="80" fill="var(--color-secondary)" stroke="var(--color-border)" />
      <rect x="10" y="20" width="36" height="48" fill="var(--color-primary) / 0.35" stroke="var(--color-border)" />
      <text x="55" y="115" textAnchor="middle" className="fill-muted-foreground" fontSize="11">2/5 × 3/4</text>
      <text x="150" y="55" className="fill-foreground font-mono" fontSize="14">= 6/20</text>
      <text x="150" y="80" className="fill-primary font-mono" fontSize="14">= 3/10</text>
    </svg>
  );
}

function ReciprocalMini() {
  return (
    <svg viewBox="0 0 220 120" className="mx-auto h-28 w-full max-w-[240px]">
      <text x="20" y="55" className="fill-foreground font-mono" fontSize="18">3/4 ÷ 2/5</text>
      <text x="20" y="95" className="fill-primary font-mono" fontSize="18">3/4 × 5/2</text>
      <path d="M 150 70 q 25 -20 40 -25" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#arr)" />
      <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-primary)" /></marker></defs>
      <text x="165" y="30" className="fill-muted-foreground" fontSize="11">flip 2nd</text>
    </svg>
  );
}

function GcfMini() {
  return (
    <svg viewBox="0 0 220 120" className="mx-auto h-28 w-full max-w-[240px]">
      <text x="20" y="40" className="fill-foreground font-mono" fontSize="16">18 / 24</text>
      <text x="90" y="40" className="fill-muted-foreground" fontSize="11">÷ GCF(6)</text>
      <text x="20" y="80" className="fill-primary font-mono" fontSize="20">= 3 / 4</text>
    </svg>
  );
}

function DecimalMini() {
  return (
    <svg viewBox="0 0 220 120" className="mx-auto h-28 w-full max-w-[240px]">
      <text x="20" y="40" className="fill-foreground font-mono" fontSize="15">0.375 → 375/1000</text>
      <text x="20" y="70" className="fill-muted-foreground" fontSize="11">÷ GCF(125)</text>
      <text x="20" y="100" className="fill-primary font-mono" fontSize="18">= 3/8</text>
    </svg>
  );
}

/* ---------------- Guide data ---------------- */

const FRACTION_GUIDE: GuideCardItem[] = [
  {
    key: "anatomy",
    title: "Anatomy of a fraction",
    explain: (
      <>The <strong>numerator</strong> counts the pieces you have; the{" "}
      <strong>denominator</strong> counts the equal pieces in the whole.
      Three of four equal slices is written 3/4.</>
    ),
    formula: <>a / b</>,
    legend: [
      { sym: "a", def: "numerator (pieces you have)" },
      { sym: "b", def: "denominator (equal pieces in the whole)" },
    ],
    diagram: <PieMini num={3} den={4} label="3/4 of a whole" />,
    example: { given: "pizza cut into 4, take 3 slices", substitute: "3 / 4", answer: "3/4 (proper)" },
  },
  {
    key: "add",
    title: "Adding & subtracting — common denominator first",
    explain: (
      <>Only pieces of the same size can be combined. Rewrite each fraction over
      a common denominator (LCM keeps numbers small), add or subtract the
      numerators, then simplify.</>
    ),
    formula: <>a/b ± c/d = (a·d ± c·b) / (b·d)</>,
    legend: [
      { sym: "b·d", def: "shared denominator" },
      { sym: "a·d, c·b", def: "rewritten numerators" },
    ],
    diagram: <TwoPiesMini />,
    example: { given: "1/2 + 2/3", substitute: "3/6 + 4/6", answer: "7/6 = 1 1/6" },
  },
  {
    key: "mul",
    title: "Multiplying — straight across",
    explain: (
      <>Multiplication needs no common denominator. Multiply the numerators for
      the new top, multiply the denominators for the new bottom, then reduce.</>
    ),
    formula: <>a/b × c/d = (a·c) / (b·d)</>,
    legend: [
      { sym: "a·c", def: "product of numerators" },
      { sym: "b·d", def: "product of denominators" },
    ],
    diagram: <MultiplyMini />,
    example: { given: "2/5 × 3/4", substitute: "(2·3) / (5·4) = 6/20", answer: "3/10" },
  },
  {
    key: "div",
    title: "Dividing — multiply by the reciprocal",
    explain: (
      <>Dividing by c/d is the same as multiplying by d/c. Flip the second
      fraction upside down, then multiply straight across as usual.</>
    ),
    formula: <>a/b ÷ c/d = a/b × d/c</>,
    legend: [{ sym: "d/c", def: "reciprocal of the divisor" }],
    diagram: <ReciprocalMini />,
    example: { given: "3/4 ÷ 2/5", substitute: "3/4 × 5/2 = 15/8", answer: "15/8 = 1 7/8" },
  },
  {
    key: "simplify",
    title: "Simplifying — divide by the GCF",
    explain: (
      <>A fraction is in <em>lowest terms</em> when the numerator and denominator
      share no factor above 1. Find their greatest common factor (GCF) and
      divide both sides by it.</>
    ),
    formula: <>a/b = (a÷g) / (b÷g), &nbsp; g = GCF(a, b)</>,
    legend: [{ sym: "g", def: "greatest common factor of a and b" }],
    diagram: <GcfMini />,
    example: { given: "18/24", substitute: "GCF = 6 → 18÷6 / 24÷6", answer: "3/4" },
  },
  {
    key: "decimal",
    title: "Converting between fractions and decimals",
    explain: (
      <>To convert a fraction to a decimal, divide numerator by denominator. To
      convert a finite decimal, use a power of 10 as the denominator based on
      the digits after the point, then simplify by the GCF.</>
    ),
    formula: <>0.d₁d₂…dₙ = (digits) / 10ⁿ</>,
    legend: [{ sym: "n", def: "number of decimal places" }],
    diagram: <DecimalMini />,
    example: { given: "0.375", substitute: "375/1000, GCF = 125", answer: "3/8" },
  },
];

