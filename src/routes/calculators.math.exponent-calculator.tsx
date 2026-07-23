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
import { power } from "@/lib/math/exponent";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

export const Route = createFileRoute("/calculators/math/exponent-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Exponent Calculator",
      title: "Exponent Calculator — Powers & Fractional Exponents",
      metaDescription: "Raise any number to a power. This exponent calculator handles integer, negative and fractional exponents and warns you when the result has no real value.",
      canonicalUrl: "/calculators/math/exponent-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Exponent Calculator", path: "/calculators/math/exponent-calculator" },
      ],
      faqs: [
        {
          q: "What does a negative exponent mean?",
          a: "A negative exponent is a reciprocal: a^-n equals 1 divided by a^n. It flips the base.",
        },
        {
          q: "Are exponents and roots the same?",
          a: "Yes. A root is an exponent with a fractional value: the nth root of a equals a^(1/n).",
        },
        {
          q: "Why does 5^0 equal 1?",
          a: "Because a^m divided by a^m equals a^(m-m) = a^0, and any non-zero number divided by itself is 1.",
        },
        {
          q: "Is 0^0 defined?",
          a: "It is a special case. In most algebra contexts 0^0 is left undefined; in combinatorics and many programming languages it is treated as 1 for convenience.",
        },
      ],
    }),
  component: ExponentPage,
});

// ------------ Guide cards ------------

function StackedMini({ lines, subtitle }: { lines: string[]; subtitle?: string }) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-secondary/20 p-4 text-center">
      {lines.map((l, i) => (
        <div
          key={i}
          className={
            i === lines.length - 1
              ? "font-display text-xl font-semibold text-primary tabular-nums"
              : "font-mono text-sm text-foreground"
          }
        >
          {l}
        </div>
      ))}
      {subtitle && (
        <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {subtitle}
        </div>
      )}
    </div>
  );
}

const EXP_GUIDE: GuideCardItem[] = [
  {
    key: "positive",
    title: "Positive integer exponent — repeated multiplication",
    explain: (
      <>
        The most common case: multiply the base by itself as many times as the
        exponent tells you. The exponent is just shorthand for a chain of
        multiplications.
      </>
    ),
    formula: <>a^n = a × a × … × a &nbsp;(n copies of a)</>,
    legend: [
      { sym: "a", def: "base" },
      { sym: "n", def: "how many times a is multiplied" },
    ],
    diagram: <StackedMini lines={["5^4", "= 5·5·5·5", "= 625"]} subtitle="four copies of 5" />,
    example: {
      given: <>a = 5, n = 4</>,
      substitute: <>5 × 5 × 5 × 5</>,
      answer: <>625</>,
    },
  },
  {
    key: "negative",
    title: "Negative exponent — flip into a reciprocal",
    explain: (
      <>
        A negative exponent means "one over the positive version". The base
        moves to the denominator and the exponent's sign flips to positive.
      </>
    ),
    formula: <>a^(−n) = 1 / a^n</>,
    legend: [{ sym: "a", def: "any non-zero base" }],
    diagram: <StackedMini lines={["2^(−3)", "= 1 / 2^3", "= 0.125"]} />,
    example: {
      given: <>a = 2, n = 3</>,
      substitute: <>1 / (2·2·2) = 1 / 8</>,
      answer: <>0.125</>,
    },
  },
  {
    key: "fractional",
    title: "Fractional exponent — the same as a root",
    explain: (
      <>
        A fractional exponent takes a root of the base. The denominator of the
        fraction is the root index; the numerator is an ordinary power applied
        after (or before — either works).
      </>
    ),
    formula: <>a^(m/n) = ⁿ√(a^m) = (ⁿ√a)^m</>,
    legend: [
      { sym: "m", def: "power part" },
      { sym: "n", def: "root part (positive integer)" },
    ],
    diagram: <StackedMini lines={["27^(1/3)", "= ∛27", "= 3"]} />,
    example: {
      given: <>a = 27, exponent = 1/3</>,
      substitute: <>∛27</>,
      answer: <>3</>,
    },
  },
  {
    key: "zero",
    title: "Zero exponent — always 1 (for non-zero base)",
    explain: (
      <>
        Dividing a^m by a^m gives a^(m−m) = a^0, and any non-zero value
        divided by itself is 1. So a^0 = 1 for every non-zero base. 0^0 is
        left undefined in most algebra contexts.
      </>
    ),
    formula: <>a^0 = 1 &nbsp;(a ≠ 0)</>,
    legend: [{ sym: "a", def: "any non-zero base" }],
    diagram: <StackedMini lines={["7^0", "= 1"]} subtitle="always 1 for a ≠ 0" />,
    example: {
      given: <>a = 7, n = 0</>,
      substitute: <>7^3 / 7^3 = 7^0</>,
      answer: <>1</>,
    },
  },
  {
    key: "rules",
    title: "Combining exponents — the three shortcut rules",
    explain: (
      <>
        When the same base appears in a product, quotient or nested power, you
        can combine the exponents without expanding them out. These are the
        rules you use most in algebra.
      </>
    ),
    formula: (
      <div className="space-y-1">
        <div>a^m · a^n = a^(m+n)</div>
        <div>a^m ÷ a^n = a^(m−n)</div>
        <div>(a^m)^n = a^(m·n)</div>
      </div>
    ),
    legend: [
      { sym: "a", def: "shared base" },
      { sym: "m, n", def: "any exponents" },
    ],
    diagram: <StackedMini lines={["2^3 · 2^4", "= 2^(3+4)", "= 2^7 = 128"]} />,
    example: {
      given: <>2^3 · 2^4</>,
      substitute: <>2^(3+4) = 2^7</>,
      answer: <>128</>,
    },
  },
];



function ExponentPage() {
  const [base, setBase] = useState("2");
  const [exp, setExp] = useState("10");
  const [result, setResult] = useState<null | { value: string; note?: string }>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    setSteps(null);
    const b = Number(base);
    const e = Number(exp);
    if (!Number.isFinite(b) || !Number.isFinite(e)) {
      setErr("Enter valid numbers for both base and exponent");
      return;
    }
    const r = power(b, e);
    if (Number.isNaN(r.value)) {
      setErr(r.note ?? "No real result");
      return;
    }
    setResult({ value: format(r.value), note: r.note });

    const built: Step[] = [
      {
        title: "Given",
        body: (
          <FormulaBlock>
            base = {b}, &nbsp; exponent = {e}
          </FormulaBlock>
        ),
      },
      {
        title: "Write the formula",
        body: (
          <FormulaWithLegend
            formula={<>bⁿ = b × b × … × b &nbsp;(n times)</>}
            legend={[
              { sym: "b", def: "base — the number being multiplied" },
              { sym: "n", def: "exponent — how many copies of b are multiplied" },
              { sym: "b⁻ⁿ", def: "same as 1 ÷ bⁿ" },
              { sym: "b^(1/n)", def: "the nth root of b" },
            ]}
          />
        ),
      },
    ];
    if (Number.isInteger(e) && e > 0 && e <= 12) {
      const parts = Array.from({ length: e }, () => String(b));
      built.push(
        { title: "Substitute — expand the power", body: <FormulaBlock>{`${b}^${e}`} = {parts.join(" × ")}</FormulaBlock> },
        { title: "Answer", body: <FormulaBlock><strong>{format(r.value)}</strong></FormulaBlock> },
      );
    } else if (Number.isInteger(e) && e < 0) {
      built.push(
        { title: "Substitute — rewrite the negative exponent", body: <FormulaBlock>{`${b}^${e}`} = 1 ÷ {`${b}^${-e}`}</FormulaBlock> },
        { title: "Compute the positive power", body: <FormulaBlock>{`${b}^${-e}`} = {format(Math.pow(b, -e))}</FormulaBlock> },
        { title: "Answer", body: <FormulaBlock>1 ÷ {format(Math.pow(b, -e))} = <strong>{format(r.value)}</strong></FormulaBlock> },
      );
    } else if (e === 0) {
      built.push({ title: "Answer", body: <FormulaBlock>{`${b}^0`} = <strong>1</strong></FormulaBlock> });
    } else {
      built.push(
        { title: "Substitute — use the exp/ln identity", body: <FormulaBlock>{`${b}^${e}`} = exp({e} · ln({b}))</FormulaBlock> },
        { title: "Answer", body: <FormulaBlock><strong>{format(r.value)}</strong></FormulaBlock> },
      );
    }
    setSteps(built);
  };

  return (
    <MathCalcPage
      name="Exponent Calculator"
      tagline="Compute any base raised to any exponent. Supports negative bases, negative exponents and fractional exponents (which are the same as roots)."
      extras={
        <>
          <CalcSection title="What is an exponent?">
            <p>
              An exponent — sometimes called a power — tells you how many times
              a base multiplies itself. Two to the power of three, written 2³,
              is 2 × 2 × 2 = 8. Negative exponents flip the base into a
              reciprocal: 2⁻³ is the same as 1 / 2³ = 0.125. Fractional
              exponents are roots: 9^(1/2) is the square root of 9, which is 3.
              A negative base combined with a non-integer exponent (like
              (−4)^0.5) has no real value — this calculator flags that instead
              of returning silent NaN.
            </p>
          </CalcSection>

          <CalcSection title="Exponents, one case at a time">
            <p>
              Every exponent is a compact way of describing repeated
              multiplication, but the exact meaning shifts as the exponent
              becomes negative, fractional or zero. Each card below shows one
              case with the rule, a picture and a worked value.
            </p>
            <GuideCards items={EXP_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Handles any real base with integer, decimal, negative, or fractional exponents",
                "Expands small integer powers into the underlying multiplication (e.g. 2³ = 2 × 2 × 2)",
                "Detects complex results (e.g. even root of a negative) and explains them clearly",
                "Works for very large and very small results without silent overflow",
                "Plots the growth curve y = a^x with your input point marked",
              ]}
            />
          </CalcSection>

          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What does a negative exponent mean?", a: <p>A negative exponent is a reciprocal: a⁻ⁿ = 1 / aⁿ. It flips the base.</p> },
                { q: "Are exponents and roots the same?", a: <p>Yes. A root is an exponent with a fractional value: ⁿ√a = a^(1/n).</p> },
                { q: "Why does 5⁰ equal 1?", a: <p>Because a^m ÷ a^m = a^(m−m) = a^0, and any non-zero number divided by itself is 1.</p> },
                { q: "Is 0⁰ defined?", a: <p>It is a special case. In most algebra contexts 0⁰ is left undefined; in combinatorics and many programming languages it is treated as 1 for convenience.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/root-calculator", label: "Root Calculator" },
                { to: "/calculators/math/scientific-notation-calculator", label: "Scientific Notation" },
                { to: "/calculators/math/scientific-calculator", label: "Scientific Calculator" },
                { to: "/calculators/math/quadratic-formula-calculator", label: "Quadratic Formula" },
                { to: "/calculators/math/number-base-calculator", label: "Number Base Converter" },
              ]}
            />
          </CalcSection>

        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Base (a)" htmlFor="base">
          <TextInput id="base" inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} />
        </Field>
        <Field label="Exponent (n)" htmlFor="exp">
          <TextInput id="exp" inputMode="decimal" value={exp} onChange={(e) => setExp(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">Calculate</PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && <ResultBox label={`${base}^${exp} =`} value={result.value} note={result.note} />}
      {result && <ExponentGraph base={Number(base)} exp={Number(exp)} />}
      {steps && <StepsToggle steps={steps} />}
    </MathCalcPage>
  );
}

function ExponentGraph({ base, exp }: { base: number; exp: number }) {
  if (!Number.isFinite(base) || !Number.isFinite(exp) || base <= 0 || base === 1) return null;
  const xMax = Math.max(Math.abs(exp) * 1.3, 3);
  const xMin = exp < 0 ? -xMax : 0;
  const xR = xMax - xMin;
  const N = 120;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const x = xMin + (i / N) * xR;
    const y = Math.pow(base, x);
    if (Number.isFinite(y)) pts.push([x, y]);
  }
  if (pts.length < 2) return null;
  const yMax = Math.max(...pts.map((p) => p[1]));
  const yMin = Math.min(0, ...pts.map((p) => p[1]));
  const W = 600, H = 300, PL = 44, PR = 12, PT = 14, PB = 30;
  const iw = W - PL - PR, ih = H - PT - PB;
  const sx = (x: number) => PL + ((x - xMin) / xR) * iw;
  const sy = (y: number) => PT + ih - ((y - yMin) / (yMax - yMin || 1)) * ih;
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${sx(x).toFixed(2)},${sy(y).toFixed(2)}`).join(" ");
  const val = Math.pow(base, exp);
  const ptOk = Number.isFinite(val) && val >= yMin && val <= yMax;
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-sm font-semibold text-muted-foreground">Growth curve: y = {base}^x</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Curve of y equals ${base} to the x`}>
        <line x1={PL} y1={sy(0)} x2={W - PR} y2={sy(0)} className="stroke-border" />
        <line x1={sx(0)} y1={PT} x2={sx(0)} y2={PT + ih} className="stroke-border" />
        <path d={path} className="fill-none stroke-primary" strokeWidth="2" />
        {ptOk && (
          <>
            <line x1={sx(exp)} y1={sy(0)} x2={sx(exp)} y2={sy(val)} className="stroke-primary/40" strokeDasharray="3 3" />
            <line x1={PL} y1={sy(val)} x2={sx(exp)} y2={sy(val)} className="stroke-primary/40" strokeDasharray="3 3" />
            <circle cx={sx(exp)} cy={sy(val)} r="5" className="fill-primary" />
            <text x={sx(exp) + 8} y={sy(val) - 8} className="fill-foreground text-xs font-mono">({exp}, {Number(val.toPrecision(6))})</text>
          </>
        )}
        <text x={PL} y={PT - 2} className="fill-muted-foreground text-[10px]">y</text>
        <text x={W - PR - 8} y={sy(0) + 12} className="fill-muted-foreground text-[10px]">x</text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">Dashed lines mark your input x = {exp} on the curve.</p>
    </div>
  );
}

function format(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) return n.toExponential(6);
  return parseFloat(n.toPrecision(12)).toString();
}
