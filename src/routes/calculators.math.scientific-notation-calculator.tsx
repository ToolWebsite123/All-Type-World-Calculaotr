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
import { CopyButton } from "@/components/CopyButton";
import { ReferenceTable } from "@/components/ReferenceTable";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

import {
  parseSci,
  formatSci,
  normalize,
  toNumber,
  type SciNum,
} from "@/lib/math/scientific-notation";

export const Route = createFileRoute("/calculators/math/scientific-notation-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Scientific Notation Calculator",
      title: "Scientific Notation Calculator — Convert & Compute",
      metaDescription:
        "Convert to and from scientific, engineering and E-notation, and add, subtract, multiply, divide or take powers and roots.",
      canonicalUrl: "/calculators/math/scientific-notation-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Scientific Notation Calculator", path: "/calculators/math/scientific-notation-calculator" },
      ],
      faqs: [
        {
          q: "What does 'e' mean in 3.2e5?",
          a: "\"e\" is shorthand for \"× 10^\", so 3.2e5 = 3.2 × 10⁵. This form is what most calculators and programming languages use because superscripts are hard to type.",
        },
        {
          q: "Do I have to normalise the answer?",
          a: "Yes — by convention the coefficient of a value in scientific notation must be between 1 and 10 in absolute value (exactly one non-zero digit before the decimal). The calculator normalises the result for you.",
        },
        {
          q: "How is engineering notation different?",
          a: "Engineering notation restricts the exponent to a multiple of 3 (0, ±3, ±6, ±9, ...), aligning with SI prefixes such as kilo-, mega- and giga-. The coefficient can be up to 999.999...",
        },
        {
          q: "Can this calculator work in reverse?",
          a: "Yes. Feed either a plain decimal like 1568938 or a scientific value like 1.568938e6 or 1.568938×10^6 into the converter — it detects the format automatically.",
        },
        {
          q: "How do I add two numbers in scientific notation?",
          a: "First rewrite them with the same power of 10, then add the coefficients. For example 1.4×10² + 5×10¹ becomes 1.4×10² + 0.5×10² = 1.9×10².",
        },
        {
          q: "How do I multiply or divide in scientific notation?",
          a: "Multiply (or divide) the coefficients and add (or subtract) the exponents, then normalise the result to the standard 1 ≤ |a| < 10 form.",
        },
      ],
    }),
  component: SciNotationPage,
});

// ---------- helpers ----------

type Op = "add" | "sub" | "mul" | "div" | "pow" | "sqrt" | "sq";

function toEngineering(n: SciNum): { m: number; e: number } {
  const nn = normalize(n);
  if (nn.m === 0) return { m: 0, e: 0 };
  // Nearest multiple of 3 ≤ exponent
  const engE = Math.floor(nn.e / 3) * 3;
  const shift = nn.e - engE;
  return { m: nn.m * Math.pow(10, shift), e: engE };
}

function formatCoefficient(m: number, precision: number): string {
  if (!Number.isFinite(m)) return String(m);
  if (Number.isInteger(m)) return String(m);
  // trim trailing zeros
  return parseFloat(m.toFixed(precision)).toString();
}

function formatSciWithPrecision(n: SciNum, precision: number): string {
  const nn = normalize(n);
  return `${formatCoefficient(nn.m, precision)} × 10^${nn.e}`;
}

function formatEng(n: SciNum, precision: number): string {
  const eng = toEngineering(n);
  return `${formatCoefficient(eng.m, precision)} × 10^${eng.e}`;
}

function formatENotation(n: SciNum, precision: number): string {
  const nn = normalize(n);
  return `${formatCoefficient(nn.m, precision)}e${nn.e}`;
}

/** Nice plain-decimal string that keeps precision even outside JS's ±1e21 range. */
function formatReal(n: SciNum): string {
  const nn = normalize(n);
  if (nn.m === 0) return "0";
  const num = nn.m * Math.pow(10, nn.e);
  if (Number.isFinite(num) && Math.abs(num) < 1e21 && Math.abs(nn.e) < 21) {
    // Regular formatting is fine
    return trimZeros(num.toPrecision(15));
  }
  // Fall back to a manual digit expansion for very large/small
  const sign = nn.m < 0 ? "-" : "";
  const digits = Math.abs(nn.m).toString();
  const [intPart, fracPart = ""] = digits.split(".");
  const raw = intPart + fracPart;
  const decimalIndex = intPart.length + nn.e;
  if (decimalIndex <= 0) {
    return `${sign}0.${"0".repeat(-decimalIndex)}${trimTrailingZeros(raw)}`;
  }
  if (decimalIndex >= raw.length) {
    return `${sign}${raw}${"0".repeat(decimalIndex - raw.length)}`;
  }
  const left = raw.slice(0, decimalIndex);
  const right = trimTrailingZeros(raw.slice(decimalIndex));
  return right ? `${sign}${left}.${right}` : `${sign}${left}`;
}

function trimZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}
function trimTrailingZeros(s: string): string {
  return s.replace(/0+$/, "");
}

// ---------- page ----------

function SciNotationPage() {
  return (
    <MathCalcPage
      name="Scientific Notation Calculator"
      tagline="Convert values into scientific, engineering and E-notation, or perform arithmetic (+, −, ×, ÷, powers, roots, squares) directly on two numbers written in scientific form."
      extras={
        <>
          <CalcSection title="What is scientific notation?">
            <p>
              Scientific notation writes any real number as a coefficient
              (also called the significand or mantissa) times a power of ten:
              <em> b × 10ⁿ</em>, with 1 ≤ |b| &lt; 10 and n an integer. It
              is the standard way to keep very large and very small numbers
              readable — 6.022 × 10²³ is much easier to work with than
              602,200,000,000,000,000,000,000.
            </p>
          </CalcSection>

          <CalcSection title="Scientific notation calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing the tool does with your input —
              how it normalises the coefficient, the exponent rules it uses
              for + − × ÷, and the two alternative formats (engineering and
              E-notation) it also outputs.
            </p>
            <GuideCards items={SN_GUIDE} />
          </CalcSection>

          <CalcSection title="Decimal vs scientific vs E-notation">
            <ReferenceTable
              headers={["Decimal", "Scientific", "E-notation"]}
              rows={[
                ["5", "5 × 10⁰", "5E0"],
                ["700", "7 × 10²", "7E2"],
                ["1,000,000", "1 × 10⁶", "1E6"],
                ["0.0004212", "4.212 × 10⁻⁴", "4.212E-4"],
                ["−5,000,000,000", "−5 × 10⁹", "-5E9"],
              ]}
            />
          </CalcSection>


          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Two tools in one — a converter and a full arithmetic calculator",
                "Converts a plain number into scientific, engineering and E-notation at once",
                "Works in reverse: paste 1.568938e6 or 1.568938×10^6 and get the real value back",
                "Seven operations on scientific-notation inputs: +, −, ×, ÷, X^Y, √X, X²",
                "Adjustable precision for the coefficient of the result (default 20 digits)",
                "Auto-normalises answers to the standard 1 ≤ |coefficient| < 10 form",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What does 'e' mean in 3.2e5?", a: <p>"e" is shorthand for "× 10^", so 3.2e5 = 3.2 × 10⁵.</p> },
                { q: "Do I have to normalise the answer?", a: <p>Yes — by convention the coefficient must be between 1 and 10 in absolute value. The calculator normalises automatically.</p> },
                { q: "Is engineering notation different from scientific?", a: <p>Yes. Engineering notation restricts the exponent to a multiple of 3 so it lines up with SI prefixes (kilo, mega, giga…). The coefficient can be up to 999.</p> },
                { q: "Can I paste 1.234 × 10^5?", a: <p>Yes. The converter accepts plain numbers, E-notation (1.234e5), and the ×10^n form (1.234×10^5).</p> },
                { q: "What about negative or fractional exponents in X^Y?", a: <p>Both are supported. Non-integer exponents may produce irrational results, rounded to the precision you set.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
                { to: "/calculators/math/big-number-calculator", label: "Big Number Calculator" },
                { to: "/calculators/math/root-calculator", label: "Root Calculator" },
                { to: "/calculators/math/percent-error-calculator", label: "Percent Error Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-8">
        <ConverterTool />
        <hr className="border-border/60" />
        <ArithmeticTool />
      </div>
    </MathCalcPage>
  );
}

// ---------- Tool 1: Converter ----------


function LogNumberLine({ e }: { e: number }) {
  const min = -30, max = 30;
  const clamped = Math.max(min, Math.min(max, e));
  const W = 560, H = 70, pad = 24;
  const x = pad + ((clamped - min) / (max - min)) * (W - 2 * pad);
  const ticks = [-30, -20, -10, 0, 10, 20, 30];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto mt-4 block w-full max-w-xl text-primary"
      role="img"
      aria-label={`Position of the value on a log base 10 exponent scale, exponent ${e}`}
    >
      <line x1={pad} x2={W - pad} y1={40} y2={40} stroke="currentColor" strokeWidth={1} className="text-muted-foreground/40" />
      {ticks.map((t) => {
        const tx = pad + ((t - min) / (max - min)) * (W - 2 * pad);
        return (
          <g key={t}>
            <line x1={tx} x2={tx} y1={36} y2={44} stroke="currentColor" strokeWidth={1} className="text-muted-foreground/60" />
            <text x={tx} y={58} textAnchor="middle" className="fill-muted-foreground text-[10px]">10^{t}</text>
          </g>
        );
      })}
      <circle cx={x} cy={40} r={6} className="fill-primary" />
      <text x={x} y={24} textAnchor="middle" className="fill-foreground text-[11px] font-medium">10^{e}</text>
    </svg>
  );
}

function ConverterTool() {
  const [value, setValue] = useState("1568938");
  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<null | {
    sci: string;
    eng: string;
    eNot: string;
    real: string;
    exp: number;
  }>(null);

  const convert = () => {
    setErr(null);
    setOut(null);
    try {
      const n = parseSci(value);
      setOut({
        sci: formatSciWithPrecision(n, 12),
        eng: formatEng(n, 12),
        eNot: formatENotation(n, 12),
        real: formatReal(n),
        exp: normalize(n).e,
      });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <section>
      <h2 className="mb-1 font-display text-lg font-semibold text-foreground">
        Scientific Notation Converter
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Provide a number below to get its scientific notation, E-notation,
        engineering notation and real number format. Accepts values in any of
        these formats: 3672.2, 2.3e11, 3.5×10^-12.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Value" htmlFor="sn-val">
          <TextInput
            id="sn-val"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 1568938 or 1.568938e6 or 3.5×10^-12"
          />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={convert} className="w-full sm:w-auto">
            Convert
          </PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {out && (
        <>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ConversionRow label="Scientific notation" value={out.sci} />
            <ConversionRow label="E-notation" value={out.eNot} />
            <ConversionRow label="Engineering notation" value={out.eng} />
            <ConversionRow label="Real number" value={out.real} />
          </div>
          <LogNumberLine e={out.exp} />
        </>
      )}
    </section>
  );
}

function ConversionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="break-all font-display text-lg font-semibold tabular-nums text-foreground">
          {value}
        </div>
        <CopyButton text={value} />
      </div>
    </div>
  );
}

// ---------- Tool 2: Arithmetic ----------

function ArithmeticTool() {
  const [xM, setXM] = useState("1.23");
  const [xE, setXE] = useState("7");
  const [yM, setYM] = useState("3.45");
  const [yE, setYE] = useState("2");
  const [precision, setPrecision] = useState("20");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<null | {
    label: string;
    value: string;
    steps: Step[];
  }>(null);

  const compute = (op: Op) => {
    setErr(null);
    setResult(null);
    const p = Math.max(1, Math.min(100, Number(precision) || 20));

    const parseField = (m: string, e: string, name: string): SciNum => {
      const mm = Number(m);
      const ee = Number(e);
      if (m.trim() === "" || !Number.isFinite(mm))
        throw new Error(`Enter a valid coefficient for ${name}`);
      if (e.trim() === "" || !Number.isFinite(ee) || !Number.isInteger(ee))
        throw new Error(`Enter a valid integer exponent for ${name}`);
      return { m: mm, e: ee };
    };

    const fmt = (n: SciNum) => formatSciWithPrecision(n, p);
    const fc = (m: number) => formatCoefficient(m, p);

    try {
      const x = parseField(xM, xE, "X");
      const needsY = op !== "sqrt" && op !== "sq";
      const y = needsY ? parseField(yM, yE, "Y") : null;
      const xLabel = `${fc(x.m)} × 10^${x.e}`;
      const yLabel = y ? `${fc(y.m)} × 10^${y.e}` : "";

      let r: SciNum;
      let label = "";
      const steps: Step[] = [];
      const fb = (s: string) => (
        <FormulaBlock>
          <span className="whitespace-pre-wrap break-words">{s}</span>
        </FormulaBlock>
      );
      const givenStep = (): Step => ({
        title: "Given",
        body: fb(y ? `X = ${xLabel}\nY = ${yLabel}` : `X = ${xLabel}`),
      });
      const formulaStep = (formula: React.ReactNode, legend: { sym: string; def: string }[]): Step => ({
        title: "Write the formula",
        body: <FormulaWithLegend formula={formula} legend={legend} />,
      });

      switch (op) {
        case "add":
        case "sub": {
          const sign = op === "add" ? "+" : "−";
          const maxE = Math.max(x.e, y!.e);
          const xShift: SciNum = { m: x.m * Math.pow(10, x.e - maxE), e: maxE };
          const yShift: SciNum = { m: y!.m * Math.pow(10, y!.e - maxE), e: maxE };
          const combined = op === "add" ? xShift.m + yShift.m : xShift.m - yShift.m;
          const raw: SciNum = { m: combined, e: maxE };
          r = normalize(raw);
          label = `${xLabel} ${sign} ${yLabel} =`;
          steps.push(
            givenStep(),
            formulaStep(
              <>(a × 10ᵐ) {sign} (b × 10ⁿ), aligned to the larger exponent</>,
              [
                { sym: "a, b", def: "coefficients of X and Y" },
                { sym: "m, n", def: "exponents of X and Y" },
                { sym: "max(m,n)", def: "shared exponent both values are rewritten to" },
              ],
            ),
            {
              title: "Substitute — align the exponents",
              body: fb(`Rewrite both values with 10^${maxE}:\n${fc(x.m)} × 10^${x.e} = ${fc(xShift.m)} × 10^${maxE}\n${fc(y!.m)} × 10^${y!.e} = ${fc(yShift.m)} × 10^${maxE}`),
            },
            {
              title: `${op === "add" ? "Add" : "Subtract"} the coefficients`,
              body: fb(`(${fc(xShift.m)} ${sign} ${fc(yShift.m)}) × 10^${maxE} = ${fc(combined)} × 10^${maxE}`),
            },
          );
          if (raw.m !== 0 && (Math.abs(raw.m) < 1 || Math.abs(raw.m) >= 10)) {
            steps.push({
              title: "Answer — normalised",
              body: fb(`${fc(raw.m)} × 10^${raw.e} = ${fmt(r)}`),
            });
          } else {
            steps.push({ title: "Answer", body: fb(fmt(r)) });
          }
          break;
        }
        case "mul": {
          const rawM = x.m * y!.m;
          const rawE = x.e + y!.e;
          r = normalize({ m: rawM, e: rawE });
          label = `${xLabel} × ${yLabel} =`;
          steps.push(
            givenStep(),
            formulaStep(
              <>(a × 10ᵐ) × (b × 10ⁿ) = (a · b) × 10^(m + n)</>,
              [
                { sym: "a, b", def: "coefficients" },
                { sym: "m, n", def: "exponents" },
              ],
            ),
            { title: "Substitute — multiply the coefficients", body: fb(`${fc(x.m)} × ${fc(y!.m)} = ${fc(rawM)}`) },
            { title: "Add the exponents", body: fb(`10^${x.e} × 10^${y!.e} = 10^(${x.e} + ${y!.e}) = 10^${rawE}`) },
            { title: "Answer", body: fb(`${fc(rawM)} × 10^${rawE} = ${fmt(r)}`) },
          );
          break;
        }
        case "div": {
          if (y!.m === 0) throw new Error("Cannot divide by zero");
          const rawM = x.m / y!.m;
          const rawE = x.e - y!.e;
          r = normalize({ m: rawM, e: rawE });
          label = `${xLabel} ÷ ${yLabel} =`;
          steps.push(
            givenStep(),
            formulaStep(
              <>(a × 10ᵐ) ÷ (b × 10ⁿ) = (a ÷ b) × 10^(m − n)</>,
              [
                { sym: "a, b", def: "coefficients (b ≠ 0)" },
                { sym: "m, n", def: "exponents" },
              ],
            ),
            { title: "Substitute — divide the coefficients", body: fb(`${fc(x.m)} ÷ ${fc(y!.m)} = ${fc(rawM)}`) },
            { title: "Subtract the exponents", body: fb(`10^${x.e} ÷ 10^${y!.e} = 10^(${x.e} − ${y!.e}) = 10^${rawE}`) },
            { title: "Answer", body: fb(`${fc(rawM)} × 10^${rawE} = ${fmt(r)}`) },
          );
          break;
        }
        case "pow": {
          const yNum = toNumber(y!);
          const val = Math.pow(toNumber(x), yNum);
          if (!Number.isFinite(val)) throw new Error("Result is out of range");
          r = fromRealNumber(val);
          label = `(${xLabel})^(${yLabel}) =`;
          steps.push(
            givenStep(),
            formulaStep(
              <>(a × 10ᵐ)^Y, evaluated as a real number then re-normalised</>,
              [
                { sym: "a", def: "coefficient of X" },
                { sym: "m", def: "exponent of X" },
                { sym: "Y", def: "exponent (as a real number)" },
              ],
            ),
            { title: "Substitute — convert to real numbers", body: fb(`X = ${fc(x.m)} × 10^${x.e} = ${toNumber(x)}\nY = ${fc(y!.m)} × 10^${y!.e} = ${yNum}`) },
            { title: "Apply the power", body: fb(`X^Y = ${toNumber(x)}^${yNum} = ${val}`) },
            { title: "Answer", body: fb(`${val} = ${fmt(r)}`) },
          );
          break;
        }
        case "sqrt": {
          const xn = toNumber(x);
          if (xn < 0) throw new Error("Square root of a negative number has no real value");
          r = fromRealNumber(Math.sqrt(xn));
          label = `√(${xLabel}) =`;
          steps.push(
            givenStep(),
            formulaStep(
              <>√(a × 10ᵐ) = √a × 10^(m/2), with m first made even</>,
              [
                { sym: "a", def: "coefficient (a ≥ 0)" },
                { sym: "m", def: "exponent; if odd, shift so it becomes even" },
              ],
            ),
          );
          if (x.e % 2 === 0) {
            steps.push(
              { title: "Substitute — split the root", body: fb(`√(${fc(x.m)} × 10^${x.e}) = √${fc(x.m)} × 10^${x.e / 2}`) },
              { title: "Take the square root of the coefficient", body: fb(`√${fc(x.m)} = ${fc(Math.sqrt(x.m))}`) },
              { title: "Answer", body: fb(`${fc(Math.sqrt(x.m))} × 10^${x.e / 2} = ${fmt(r)}`) },
            );
          } else {
            const shiftedM = x.m * 10;
            const shiftedE = x.e - 1;
            steps.push(
              { title: "Substitute — make the exponent even", body: fb(`${fc(x.m)} × 10^${x.e} = ${fc(shiftedM)} × 10^${shiftedE}`) },
              { title: "Split the root", body: fb(`√(${fc(shiftedM)} × 10^${shiftedE}) = √${fc(shiftedM)} × 10^${shiftedE / 2}`) },
              { title: "Take the square root of the coefficient", body: fb(`√${fc(shiftedM)} = ${fc(Math.sqrt(shiftedM))}`) },
              { title: "Answer", body: fb(`${fc(Math.sqrt(shiftedM))} × 10^${shiftedE / 2} = ${fmt(r)}`) },
            );
          }
          break;
        }
        case "sq": {
          const rawM = x.m * x.m;
          const rawE = x.e * 2;
          r = normalize({ m: rawM, e: rawE });
          label = `(${xLabel})² =`;
          steps.push(
            givenStep(),
            formulaStep(
              <>(a × 10ᵐ)² = a² × 10^(2m)</>,
              [
                { sym: "a", def: "coefficient of X" },
                { sym: "m", def: "exponent of X" },
              ],
            ),
            { title: "Substitute — square the coefficient", body: fb(`${fc(x.m)}² = ${fc(x.m)} × ${fc(x.m)} = ${fc(rawM)}`) },
            { title: "Double the exponent", body: fb(`(10^${x.e})² = 10^(${x.e} × 2) = 10^${rawE}`) },
            { title: "Answer", body: fb(`${fc(rawM)} × 10^${rawE} = ${fmt(r)}`) },
          );
          break;
        }
      }
      setResult({ label, value: fmt(r!), steps });
    } catch (e) {
      setErr((e as Error).message);
    }
  };


  return (
    <section>
      <h2 className="mb-1 font-display text-lg font-semibold text-foreground">
        Scientific Notation Calculator
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Use the calculator below to perform calculations using scientific
        notation. Enter each value as a coefficient and an exponent (base 10).
      </p>

      <div className="grid grid-cols-1 gap-4">
        <SciInputRow name="X" m={xM} e={xE} onM={setXM} onE={setXE} />
        <SciInputRow name="Y" m={yM} e={yE} onM={setYM} onE={setYE} />
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Precision (decimal digits)" htmlFor="sn-p">
            <TextInput
              id="sn-p"
              inputMode="numeric"
              value={precision}
              onChange={(e) => setPrecision(e.target.value)}
              className="max-w-[9rem]"
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={() => compute("add")} className="min-w-[5rem]">X + Y</PrimaryButton>
          <PrimaryButton onClick={() => compute("sub")} className="min-w-[5rem]">X − Y</PrimaryButton>
          <PrimaryButton onClick={() => compute("mul")} className="min-w-[5rem]">X × Y</PrimaryButton>
          <PrimaryButton onClick={() => compute("div")} className="min-w-[5rem]">X ÷ Y</PrimaryButton>
          <PrimaryButton onClick={() => compute("pow")} className="min-w-[5rem]">X^Y</PrimaryButton>
          <PrimaryButton onClick={() => compute("sqrt")} className="min-w-[5rem]">√X</PrimaryButton>
          <PrimaryButton onClick={() => compute("sq")} className="min-w-[5rem]">X²</PrimaryButton>
        </div>
      </div>

      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox
            label={result.label}
            value={
              <span className="flex flex-wrap items-center gap-3">
                <span className="break-all font-mono">{result.value}</span>
                <CopyButton text={result.value} />
              </span>
            }
          />
          {result.steps.length > 0 && <StepsToggle steps={result.steps} />}
        </>
      )}

    </section>
  );
}

function SciInputRow({
  name,
  m,
  e,
  onM,
  onE,
}: {
  name: string;
  m: string;
  e: string;
  onM: (v: string) => void;
  onE: (v: string) => void;
}) {
  const idM = `sn-${name}-m`;
  const idE = `sn-${name}-e`;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
      <Field label={`${name} — coefficient`} htmlFor={idM}>
        <TextInput
          id={idM}
          inputMode="decimal"
          value={m}
          onChange={(ev) => onM(ev.target.value)}
        />
      </Field>
      <div className="flex items-end pb-3 text-base font-semibold text-muted-foreground sm:pb-2.5">
        × 10^
      </div>
      <Field label={`${name} — exponent`} htmlFor={idE}>
        <TextInput
          id={idE}
          inputMode="numeric"
          value={e}
          onChange={(ev) => onE(ev.target.value)}
        />
      </Field>
    </div>
  );
}

// Build a SciNum from a real JS number without losing sign on 0
function fromRealNumber(n: number): SciNum {
  if (n === 0) return { m: 0, e: 0 };
  const e = Math.floor(Math.log10(Math.abs(n)));
  const m = n / Math.pow(10, e);
  return normalize({ m, e });
}

// Silence unused imports if some helpers stop being referenced.
void formatSci;

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function NormalizeMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="30" className="fill-foreground font-mono" fontSize="12">4,730,000</text>
      <text x="10" y="52" className="fill-muted-foreground font-mono" fontSize="10">shift point left 6 places</text>
      <line x1="10" y1="60" x2="230" y2="60" stroke="var(--color-border)" />
      <text x="10" y="80" className="fill-primary font-mono" fontSize="14" fontWeight="700">4.73 × 10⁶</text>
      <text x="10" y="100" className="fill-foreground font-mono" fontSize="11">0.00042</text>
      <text x="10" y="120" className="fill-primary font-mono" fontSize="12" fontWeight="700">→ 4.2 × 10⁻⁴</text>
    </svg>
  );
}

function ExpRulesMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="22" className="fill-muted-foreground font-mono" fontSize="10">×  → add exponents</text>
      <text x="10" y="38" className="fill-foreground font-mono" fontSize="11">10² × 10⁻¹ × 10⁵ = 10⁶</text>
      <line x1="10" y1="48" x2="230" y2="48" stroke="var(--color-border)" />
      <text x="10" y="66" className="fill-muted-foreground font-mono" fontSize="10">÷  → subtract exponents</text>
      <text x="10" y="82" className="fill-foreground font-mono" fontSize="11">10² ÷ 10⁻¹ ÷ 10⁵ = 10⁻²</text>
      <line x1="10" y1="92" x2="230" y2="92" stroke="var(--color-border)" />
      <text x="10" y="108" className="fill-muted-foreground font-mono" fontSize="10">+ −  → align exponents first</text>
      <text x="10" y="124" className="fill-foreground font-mono" fontSize="11">1.4·10² + 0.8·10² = 2.2·10²</text>
    </svg>
  );
}

function EngMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="24" className="fill-foreground font-mono" fontSize="11">1.234 × 10⁸  (scientific)</text>
      <text x="10" y="46" className="fill-primary font-mono" fontSize="11" fontWeight="700">123.4 × 10⁶  (engineering)</text>
      <line x1="10" y1="56" x2="230" y2="56" stroke="var(--color-border)" />
      <text x="10" y="76" className="fill-muted-foreground font-mono" fontSize="10">exponent snaps to multiple of 3</text>
      <text x="10" y="96" className="fill-foreground font-mono" fontSize="10">10³ kilo · 10⁶ mega · 10⁹ giga</text>
      <text x="10" y="112" className="fill-foreground font-mono" fontSize="10">10⁻³ milli · 10⁻⁶ micro · 10⁻⁹ nano</text>
    </svg>
  );
}

const SN_GUIDE: GuideCardItem[] = [
  {
    key: "norm",
    title: "Normalising the coefficient — where the decimal point lands",
    explain: (
      <>The calculator slides the decimal point in your input until exactly
      one non-zero digit sits to the left of it, counting every shift as a
      change in the exponent. Shifting the point to the <em>left</em> makes
      the exponent bigger; shifting to the <em>right</em> makes it smaller.
      This is what forces the coefficient into the required 1 ≤ |b| &lt; 10
      range in the result box.</>
    ),
    formula: <>b × 10ⁿ, &nbsp; 1 ≤ |b| &lt; 10, &nbsp; n integer</>,
    legend: [{ sym: "b", def: "coefficient / mantissa after the shift" }, { sym: "n", def: "number of decimal-point shifts (left +, right −)" }],
    diagram: <NormalizeMini />,
    example: { given: "4,730,000", substitute: "shift left 6 places", answer: "4.73 × 10⁶" },
  },
  {
    key: "arith",
    title: "Arithmetic — how + − × ÷ handle the exponents",
    explain: (
      <>Multiplication multiplies the coefficients and <em>adds</em> the
      exponents; division divides coefficients and <em>subtracts</em>. For
      addition and subtraction the calculator first rewrites every term with
      the same power of ten, then adds or subtracts the coefficients. After
      every operation it re-normalises the result so the output stays in the
      form 1 ≤ |b| &lt; 10.</>
    ),
    formula: <>(a·10ᵐ)(c·10ⁿ) = ac·10<sup>m+n</sup>, &nbsp; (a·10ᵐ)/(c·10ⁿ) = (a/c)·10<sup>m−n</sup></>,
    diagram: <ExpRulesMini />,
    example: { given: "(1.432·10²)(800·10⁻¹)(0.001·10⁵)", substitute: "coeffs · sum of exps", answer: "1.1456 × 10⁶" },
  },
  {
    key: "eng",
    title: "Engineering & E-notation — the two alternative outputs",
    explain: (
      <>The tool also prints two related formats. <em>Engineering notation</em>
      snaps the exponent to a multiple of 3 so it lines up with SI prefixes
      (kilo, mega, giga, milli, micro, nano). <em>E-notation</em> replaces
      "× 10" with the letter E, which is what programming languages,
      spreadsheets, and calculator screens actually accept. Same value, three
      ways to write it.</>
    ),
    formula: <>engineering: exponent ∈ 3ℤ, &nbsp; E-notation: bEn ≡ b × 10ⁿ</>,
    diagram: <EngMini />,
    example: { given: "1.234 × 10⁸", substitute: "regroup to 10⁶ / E", answer: "123.4 × 10⁶ · 1.234E8" },
  },
];
