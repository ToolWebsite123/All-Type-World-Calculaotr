import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { create, all, type BigNumber, type MathJsInstance } from "mathjs";
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

export const Route = createFileRoute("/calculators/math/big-number-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Big Number Calculator",
      title: "Big Number Calculator — Arbitrary Precision Arithmetic",
      metaDescription:
        "Arbitrary-precision arithmetic for very large or small numbers. Integers, decimals, E-notation, factorial, GCD, LCM, MOD.",
      canonicalUrl: "/calculators/math/big-number-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Big Number Calculator", path: "/calculators/math/big-number-calculator" },
      ],
      faqs: [
        {
          q: "How many digits can this calculator handle?",
          a: "The calculator uses arbitrary-precision arithmetic. You control how many digits after the decimal point are shown via the precision setting; the internal representation can hold hundreds of significant digits.",
        },
        {
          q: "What is E-notation?",
          a: "E-notation is a shorthand for scientific notation where bEn means b × 10^n. For example, 3.5E19 is 3.5 × 10^19, or 35,000,000,000,000,000,000.",
        },
        {
          q: "Why did my calculation return an approximation?",
          a: "Operations like division, square roots and non-integer powers can produce irrational or repeating results. They are rounded to the precision you set. Increase the precision if you need more digits.",
        },
        {
          q: "Can regular calculators handle these numbers?",
          a: "No. JavaScript's Number type (IEEE-754 double) only preserves about 15 to 17 significant digits, and most pocket calculators are similar. Anything larger silently loses precision or overflows.",
        },
        {
          q: "Do factorial, GCD, LCM and MOD need integer inputs?",
          a: "Yes. Those operations are only defined on whole numbers, so non-integer inputs are rejected. Factorial additionally requires a non-negative value.",
        },
      ],
    }),
  component: BigNumberPage,
});

type Op = "add" | "sub" | "mul" | "div" | "pow" | "sqrt" | "sq" | "fact" | "mod" | "gcd" | "lcm";

const OPS: { key: Op; label: string; needsY: boolean; unary?: boolean }[] = [
  { key: "add", label: "X + Y", needsY: true },
  { key: "sub", label: "X − Y", needsY: true },
  { key: "mul", label: "X × Y", needsY: true },
  { key: "div", label: "X ÷ Y", needsY: true },
  { key: "pow", label: "X^Y", needsY: true },
  { key: "sqrt", label: "√X", needsY: false, unary: true },
  { key: "sq", label: "X²", needsY: false, unary: true },
  { key: "fact", label: "X!", needsY: false, unary: true },
  { key: "mod", label: "X MOD Y", needsY: true },
  { key: "gcd", label: "GCD(X, Y)", needsY: true },
  { key: "lcm", label: "LCM(X, Y)", needsY: true },
];

function isIntegerLike(s: string): boolean {
  return /^-?\d+(?:[eE]\+?\d+)?$/.test(s.trim());
}


function digitCount(raw: string): number | null {
  try {
    const m = create(all, { number: "BigNumber", precision: 50 });
    const v = m.bignumber(raw.trim());
    if (v.isZero()) return 1;
    return v.abs().toFixed(0).replace(/[^0-9]/g, "").length;
  } catch {
    return null;
  }
}

function DigitCompareBar({ x, y }: { x: string; y: string }) {
  const dx = digitCount(x);
  const dy = digitCount(y);
  if (dx == null || dy == null) return null;
  const max = Math.max(dx, dy, 1);
  const W = 420, pad = 8, barH = 22, rowGap = 34;
  const scale = (d: number) => Math.max(6, (d / max) * (W - 2 * pad));
  return (
    <svg
      viewBox={`0 0 ${W} ${rowGap * 2 + 10}`}
      className="mt-4 w-full max-w-md"
      role="img"
      aria-label={`Digit-count comparison: X has ${dx} digits, Y has ${dy} digits`}
    >
      <text x={pad} y={14} className="fill-muted-foreground text-[11px]">X — {dx} digit{dx === 1 ? "" : "s"}</text>
      <rect x={pad} y={18} width={scale(dx)} height={barH} rx={4} className="fill-primary/70" />
      <text x={pad} y={18 + barH + 16} className="fill-muted-foreground text-[11px]">Y — {dy} digit{dy === 1 ? "" : "s"}</text>
      <rect x={pad} y={18 + barH + 20} width={scale(dy)} height={barH} rx={4} className="fill-primary/40" />
    </svg>
  );
}

function BigNumberPage() {
  const [x, setX] = useState("45");
  const [y, setY] = useState("55");
  const [precision, setPrecision] = useState("20");
  const [result, setResult] = useState<null | { label: string; value: string; steps?: Step[] }>(null);
  const [err, setErr] = useState<string | null>(null);

  const compute = (op: Op) => {
    setErr(null);
    setResult(null);
    const p = Math.max(1, Math.min(1000, Number(precision) || 20));
    // Fresh mathjs instance so precision doesn't leak between calculations.
    const math: MathJsInstance = create(all, { number: "BigNumber", precision: p + 20 });

    const spec = OPS.find((o) => o.key === op)!;
    const xRaw = x.trim();
    const yRaw = y.trim();
    if (!xRaw) return setErr("Enter a value for X");
    if (spec.needsY && !yRaw) return setErr("Enter a value for Y");

    let xb: BigNumber;
    let yb: BigNumber | null = null;
    try {
      xb = math.bignumber(xRaw);
      if (spec.needsY) yb = math.bignumber(yRaw);
    } catch {
      return setErr("Could not parse the input. Use digits, an optional decimal, or E-notation like 3.5e19.");
    }

    try {
      let out: BigNumber;
      let label = "";
      const steps: Step[] = [];
      const xStr = xb.toString();
      const yStr = yb ? yb.toString() : "";
      const fb = (s: string) => (
        <FormulaBlock>
          <span className="whitespace-pre-wrap break-words">{s}</span>
        </FormulaBlock>
      );
      const given = (): Step => ({
        title: "Given",
        body: fb(yb ? `X = ${xStr}\nY = ${yStr}` : `X = ${xStr}`),
      });
      const formulaStep = (formula: React.ReactNode, legend: { sym: string; def: string }[]): Step => ({
        title: "Write the formula",
        body: <FormulaWithLegend formula={formula} legend={legend} />,
      });

      switch (op) {
        case "add":
          out = math.add(xb, yb!) as BigNumber;
          label = `${xRaw} + ${yRaw} =`;
          steps.push(
            given(),
            formulaStep(<>S = X + Y</>, [
              { sym: "X, Y", def: "the two inputs" },
              { sym: "S", def: "sum, computed digit-by-digit with carries" },
            ]),
            { title: "Substitute", body: fb(`${xStr} + ${yStr}`) },
            { title: "Answer", body: fb(formatBig(out, p)) },
          );
          break;
        case "sub":
          out = math.subtract(xb, yb!) as BigNumber;
          label = `${xRaw} − ${yRaw} =`;
          steps.push(
            given(),
            formulaStep(<>D = X − Y</>, [
              { sym: "X", def: "minuend" },
              { sym: "Y", def: "subtrahend" },
              { sym: "D", def: "difference, computed digit-by-digit with borrows" },
            ]),
            { title: "Substitute", body: fb(`${xStr} − ${yStr}`) },
            { title: "Answer", body: fb(formatBig(out, p)) },
          );
          break;
        case "mul":
          out = math.multiply(xb, yb!) as BigNumber;
          label = `${xRaw} × ${yRaw} =`;
          steps.push(
            given(),
            formulaStep(<>P = X · Y</>, [
              { sym: "X, Y", def: "the two factors" },
              { sym: "P", def: "product, computed by long multiplication of every digit pair" },
            ]),
            { title: "Substitute", body: fb(`${xStr} × ${yStr}`) },
            { title: "Answer", body: fb(formatBig(out, p)) },
          );
          break;
        case "div":
          if ((yb as BigNumber).isZero()) return setErr("Cannot divide by zero");
          out = math.divide(xb, yb!) as BigNumber;
          label = `${xRaw} ÷ ${yRaw} =`;
          {
            const q = math.floor(math.divide(xb, yb!) as BigNumber) as BigNumber;
            const r = math.subtract(xb, math.multiply(q, yb!) as BigNumber) as BigNumber;
            steps.push(
              given(),
              formulaStep(<>X = Y · q + r,&nbsp; then extend the quotient into decimals</>, [
                { sym: "X", def: "dividend" },
                { sym: "Y", def: "divisor (Y ≠ 0)" },
                { sym: "q", def: "integer quotient" },
                { sym: "r", def: "remainder (0 ≤ r < |Y|)" },
              ]),
              { title: "Substitute — long division", body: fb(`${xStr} = ${q.toString()} × ${yStr} + ${r.toString()}`) },
              { title: `Extend to ${p} decimal digits`, body: fb(`Bring down zeros after the decimal point until the requested precision is reached.`) },
              { title: "Answer", body: fb(`${xStr} ÷ ${yStr} = ${formatBig(out, p)}`) },
            );
          }
          break;
        case "pow":
          out = math.pow(xb, yb!) as BigNumber;
          label = `${xRaw}^${yRaw} =`;
          steps.push(
            given(),
            formulaStep(<>X^Y = X · X · … · X&nbsp; (Y times); non-integer Y uses X^Y = exp(Y · ln X)</>, [
              { sym: "X", def: "base" },
              { sym: "Y", def: "exponent" },
            ]),
            { title: "Substitute", body: fb(`${xStr}^${yStr}`) },
            { title: "Answer", body: fb(formatBig(out, p)) },
          );
          break;
        case "sqrt":
          if (xb.isNegative()) return setErr("Square root of a negative number has no real value");
          out = math.sqrt(xb) as BigNumber;
          label = `√${xRaw} =`;
          steps.push(
            given(),
            formulaStep(<>Find r such that r² = X&nbsp; (Newton's method to {p} digits)</>, [
              { sym: "X", def: "radicand (X ≥ 0)" },
              { sym: "r", def: "positive square root, refined iteratively" },
            ]),
            { title: "Substitute", body: fb(`r² = ${xStr}`) },
            { title: "Answer", body: fb(`√${xStr} = ${formatBig(out, p)}`) },
          );
          break;
        case "sq":
          out = math.multiply(xb, xb) as BigNumber;
          label = `${xRaw}² =`;
          steps.push(
            given(),
            formulaStep(<>X² = X · X</>, [{ sym: "X", def: "the input" }]),
            { title: "Substitute", body: fb(`${xStr} × ${xStr}`) },
            { title: "Answer", body: fb(formatBig(out, p)) },
          );
          break;
        case "fact": {
          if (!isIntegerLike(xRaw)) return setErr("Factorial requires a whole number");
          if (xb.isNegative()) return setErr("Factorial is not defined for negative numbers");
          if (xb.gt(50000)) return setErr("Factorial input is too large for this tool (limit 50,000)");
          out = math.factorial(xb) as BigNumber;
          label = `${xRaw}! =`;
          const n = Number(xb.toString());
          steps.push(
            given(),
            formulaStep(<>n! = 1 · 2 · 3 · … · n,&nbsp; with 0! = 1! = 1</>, [
              { sym: "n", def: "non-negative integer input" },
              { sym: "n!", def: "product of every integer from 1 up to n" },
            ]),
          );
          if (n === 0 || n === 1) {
            steps.push({ title: "Answer", body: fb(`${n}! = 1`) });
          } else if (n <= 12) {
            const parts = Array.from({ length: n }, (_, i) => String(i + 1));
            steps.push(
              { title: "Substitute — expand the factorial", body: fb(`${n}! = ${parts.join(" × ")}`) },
              { title: "Answer", body: fb(`= ${formatBig(out, p)}`) },
            );
          } else {
            steps.push(
              { title: "Substitute — expand the factorial", body: fb(`${n}! = 1 × 2 × 3 × … × ${n - 1} × ${n}`) },
              { title: `Multiply all ${n} terms`, body: fb(`The product has ${out.toString().length} digits.`) },
              { title: "Answer", body: fb(formatBig(out, p)) },
            );
          }
          break;
        }
        case "mod":
          if (!isIntegerLike(xRaw) || !isIntegerLike(yRaw))
            return setErr("MOD requires whole-number inputs");
          if ((yb as BigNumber).isZero()) return setErr("Cannot take MOD of zero");
          out = math.mod(xb, yb!) as BigNumber;
          label = `${xRaw} MOD ${yRaw} =`;
          {
            const q = math.floor(math.divide(xb, yb!) as BigNumber) as BigNumber;
            steps.push(
              given(),
              formulaStep(<>X mod Y = X − Y · ⌊X ÷ Y⌋</>, [
                { sym: "X", def: "dividend (integer)" },
                { sym: "Y", def: "modulus (non-zero integer)" },
                { sym: "⌊·⌋", def: "floor — largest integer ≤ the value" },
              ]),
              { title: "Substitute — divide X by Y", body: fb(`⌊${xStr} ÷ ${yStr}⌋ = ${q.toString()}`) },
              { title: "Subtract quotient × Y from X", body: fb(`${xStr} − (${q.toString()} × ${yStr}) = ${out.toString()}`) },
              { title: "Answer", body: fb(`${xStr} mod ${yStr} = ${out.toString()}`) },
            );
          }
          break;
        case "gcd":
          if (!isIntegerLike(xRaw) || !isIntegerLike(yRaw))
            return setErr("GCD requires whole-number inputs");
          out = math.gcd(xb, yb!) as BigNumber;
          label = `GCD(${xRaw}, ${yRaw}) =`;
          {
            const lines: string[] = [];
            let a = math.abs(xb) as BigNumber;
            let b = math.abs(yb!) as BigNumber;
            let i = 0;
            while (!b.isZero() && i < 25) {
              const q = math.floor(math.divide(a, b) as BigNumber) as BigNumber;
              const r = math.mod(a, b) as BigNumber;
              lines.push(`${a.toString()} = ${q.toString()} × ${b.toString()} + ${r.toString()}`);
              a = b;
              b = r;
              i++;
            }
            if (!b.isZero()) lines.push("… (further steps omitted)");
            steps.push(
              given(),
              formulaStep(<>GCD(a, b) via Euclid: (a, b) → (b, a mod b) until b = 0</>, [
                { sym: "a, b", def: "the two integer inputs" },
                { sym: "a mod b", def: "remainder of a ÷ b" },
              ]),
              { title: "Substitute — Euclidean steps", body: fb(lines.join("\n")) },
              { title: "Answer", body: fb(`GCD = ${out.toString()}`) },
            );
          }
          break;
        case "lcm":
          if (!isIntegerLike(xRaw) || !isIntegerLike(yRaw))
            return setErr("LCM requires whole-number inputs");
          out = math.lcm(xb, yb!) as BigNumber;
          label = `LCM(${xRaw}, ${yRaw}) =`;
          {
            const g = math.gcd(xb, yb!) as BigNumber;
            const prod = math.abs(math.multiply(xb, yb!) as BigNumber) as BigNumber;
            steps.push(
              given(),
              formulaStep(<>LCM(a, b) = |a · b| ÷ GCD(a, b)</>, [
                { sym: "a, b", def: "the two integer inputs" },
                { sym: "GCD(a, b)", def: "greatest common divisor" },
              ]),
              { title: "Substitute — find the GCD", body: fb(`GCD(${xStr}, ${yStr}) = ${g.toString()}`) },
              { title: "Divide the product by the GCD", body: fb(`|${xStr} × ${yStr}| ÷ ${g.toString()} = ${prod.toString()} ÷ ${g.toString()} = ${out.toString()}`) },
              { title: "Answer", body: fb(`LCM = ${out.toString()}`) },
            );
          }
          break;
      }

      const formatted = formatBig(out!, p);
      setResult({ label, value: formatted, steps: steps.length ? steps : undefined });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Calculation failed");
    }
  };


  return (
    <MathCalcPage
      name="Big Number Calculator"
      tagline="Do arithmetic on very large or very precise numbers — integers, decimals, or E-notation like 3.5e19 — without the rounding errors of a standard calculator."
      extras={
        <>
          <CalcSection title="What is a big number calculator?">
            <p>
              Most everyday calculators — and JavaScript's own <code>Number</code>{" "}
              type — use 64-bit floating-point, which keeps only about 15 to 17
              significant digits. Anything longer is rounded off, so a
              multiplication like 123,456,789,012,345 × 987 quietly loses accuracy
              in the trailing digits.
            </p>
            <p>
              A big number calculator uses arbitrary-precision arithmetic instead.
              It stores each number as a full sequence of digits and does the
              operation the way you would on paper, so the answer is exact for
              integers and rounded only where a truly irrational result forces it
              (division, roots, non-integer powers).
            </p>
            <p>
              Big numbers show up all over the place: cryptography (RSA keys are
              hundreds of digits long), cosmology and astronomy (distances in
              metres, atoms in the observable universe), chemistry (Avogadro's
              constant is 6.022 × 10²³), combinatorics (52! is the number of
              possible shuffles of a deck), and computer science (the number of
              addresses in a 128-bit space).
            </p>
          </CalcSection>

          <CalcSection title="Big number calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing the tool does that a normal
              calculator can't — how it stores numbers digit-by-digit,
              how the arithmetic operators behave once precision is
              unlimited, and how the number-theory helpers (n!, GCD, LCM,
              MOD) build on that.
            </p>
            <GuideCards items={BN_GUIDE} />
          </CalcSection>


          <CalcSection title="Powers of 10 and their names">
            <ReferenceTable
              headers={["Powers of 10", "Name"]}
              rows={[
                ["10⁹", "Billion"],
                ["10¹²", "Trillion"],
                ["10¹⁵", "Quadrillion"],
                ["10¹⁸", "Quintillion"],
                ["10²¹", "Sextillion"],
                ["10²⁴", "Septillion"],
                ["10²⁷", "Octillion"],
                ["10³⁰", "Nonillion"],
                ["10³³", "Decillion"],
                ["10³⁶", "Undecillion"],
                ["10¹⁰⁰", "Googol"],
                ["10³⁰³", "Centillion"],
              ]}
            />
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Assuming a regular calculator is precise enough.</strong>{" "}
                Anything beyond ~15 significant digits silently rounds on a
                standard float — the trailing digits you see may be noise.
              </li>
              <li>
                <strong>Confusing the E in E-notation with the X^Y button.</strong>{" "}
                3.5e19 means "3.5 × 10¹⁹" — a single number. To raise 3.5 to the
                19th power, enter 3.5 in X, 19 in Y, and press X^Y.
              </li>
              <li>
                <strong>Using factorial, GCD, LCM or MOD on decimals.</strong>{" "}
                These operations require whole numbers. The calculator flags the
                input rather than returning a misleading value.
              </li>
              <li>
                <strong>Requesting √ of a negative number.</strong> There is no
                real square root; use a complex-number tool if you need one.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Arbitrary-precision arithmetic — no silent overflow above 15 significant digits",
                "Accepts integers, decimals, and E-notation (e.g. 3.5e19, 23E18)",
                "Eleven operations: +, −, ×, ÷, powers, square, square root, factorial, MOD, GCD, LCM",
                "Adjustable precision (1 – 1000 digits after the decimal point)",
                "Copy button on results so long numbers move cleanly into your notes",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "How many digits can this calculator handle?", a: <p>Internally the calculator keeps hundreds of significant digits. You control how many appear after the decimal point via the precision field (1 – 1000).</p> },
                { q: "What is E-notation?", a: <p>Shorthand for scientific notation. <code>bEn</code> means <code>b × 10ⁿ</code>. For example, 3.5e19 is 3.5 × 10¹⁹.</p> },
                { q: "Why does my division return a ‘…’ or a rounded value?", a: <p>Some divisions and roots have infinitely many digits. The result is rounded to the precision you set — raise the precision to see more digits.</p> },
                { q: "Is a factorial input capped?", a: <p>Yes, factorial is capped at 50,000 to keep the browser responsive. Even 10,000! has more than 35,000 digits.</p> },
                { q: "Can I use the result as the next input?", a: <p>Yes — copy the result, paste it into X or Y, and continue calculating.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
                { to: "/calculators/math/scientific-notation-calculator", label: "Scientific Notation" },
                { to: "/calculators/math/root-calculator", label: "Root Calculator" },
                { to: "/calculators/math/gcf-calculator", label: "GCF Calculator" },
                { to: "/calculators/math/lcm-calculator", label: "LCM Calculator" },
                { to: "/calculators/math/random-number-calculator", label: "Random Number Generator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <Field label="X" htmlFor="bn-x">
          <textarea
            id="bn-x"
            value={x}
            onChange={(e) => setX(e.target.value)}
            rows={2}
            spellCheck={false}
            className="w-full resize-y rounded-xl border border-border bg-background/60 px-3 py-2.5 font-mono text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="e.g. 3.5e19 or 12345678901234567890"
          />
        </Field>
        <Field label="Y" htmlFor="bn-y">
          <textarea
            id="bn-y"
            value={y}
            onChange={(e) => setY(e.target.value)}
            rows={2}
            spellCheck={false}
            className="w-full resize-y rounded-xl border border-border bg-background/60 px-3 py-2.5 font-mono text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Leave blank for unary operations (√X, X², X!)"
          />
        </Field>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Precision (decimal digits)" htmlFor="bn-p">
            <TextInput
              id="bn-p"
              inputMode="numeric"
              value={precision}
              onChange={(e) => setPrecision(e.target.value)}
              className="max-w-[10rem]"
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          {OPS.map((o) => (
            <PrimaryButton key={o.key} onClick={() => compute(o.key)} className="min-w-[5.5rem]">
              {o.label}
            </PrimaryButton>
          ))}
        </div>
      </div>
      <DigitCompareBar x={x} y={y} />
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
          {result.steps && <StepsToggle steps={result.steps} />}
        </>
      )}
    </MathCalcPage>
  );
}

function formatBig(n: BigNumber, decimals: number): string {
  // Integers: full digit expansion (no rounding).
  if (n.isInteger()) return n.toFixed(0);
  // Non-integers: round to the requested decimal places, then trim trailing zeros.
  const s = n.toFixed(decimals);
  return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function DigitsMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="24" className="fill-muted-foreground font-mono" fontSize="10">float (64-bit)</text>
      <text x="10" y="40" className="fill-foreground font-mono" fontSize="10">3.0414093201713…e64</text>
      <text x="10" y="54" className="fill-primary" fontSize="9">≈ 15–17 digits, rest lost</text>
      <line x1="10" y1="66" x2="230" y2="66" stroke="var(--color-border)" />
      <text x="10" y="82" className="fill-muted-foreground font-mono" fontSize="10">arbitrary precision</text>
      <text x="10" y="98" className="fill-primary font-mono" fontSize="8">3041409320171337804361…</text>
      <text x="10" y="112" className="fill-primary font-mono" fontSize="8">…60000000000000000000</text>
      <text x="10" y="124" className="fill-primary" fontSize="9">every digit kept</text>
    </svg>
  );
}

function OpsMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="22" className="fill-muted-foreground font-mono" fontSize="10">+  −  ×  → always exact</text>
      <text x="10" y="40" className="fill-foreground font-mono" fontSize="10">2¹⁰⁰ = 1267…205376  ✓</text>
      <line x1="10" y1="50" x2="230" y2="50" stroke="var(--color-border)" />
      <text x="10" y="66" className="fill-muted-foreground font-mono" fontSize="10">÷  √  x^y  → rounded to prec</text>
      <text x="10" y="84" className="fill-foreground font-mono" fontSize="10">1/7 = 0.142857142857… (n dp)</text>
      <line x1="10" y1="94" x2="230" y2="94" stroke="var(--color-border)" />
      <text x="10" y="110" className="fill-muted-foreground font-mono" fontSize="10">E-notation stays literal</text>
      <text x="10" y="124" className="fill-foreground font-mono" fontSize="10">3.5e19 · 2e18 = 7e37</text>
    </svg>
  );
}

function NumTheoryMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="22" className="fill-muted-foreground font-mono" fontSize="10">n!  factorial (chain product)</text>
      <text x="10" y="40" className="fill-foreground font-mono" fontSize="10">5! = 5·4·3·2·1 = 120</text>
      <line x1="10" y1="50" x2="230" y2="50" stroke="var(--color-border)" />
      <text x="10" y="66" className="fill-muted-foreground font-mono" fontSize="10">GCD  (Euclidean algorithm)</text>
      <text x="10" y="84" className="fill-foreground font-mono" fontSize="10">gcd(3780,1764)=252</text>
      <line x1="10" y1="94" x2="230" y2="94" stroke="var(--color-border)" />
      <text x="10" y="110" className="fill-muted-foreground font-mono" fontSize="10">LCM = |a·b|/gcd  · MOD = a%b</text>
      <text x="10" y="124" className="fill-foreground font-mono" fontSize="10">lcm(3780,1764)=26,460</text>
    </svg>
  );
}

const BN_GUIDE: GuideCardItem[] = [
  {
    key: "digits",
    title: "Digit-by-digit storage — why 50! comes out complete",
    explain: (
      <>A standard hardware float keeps only about 15–17 significant digits,
      so anything past 2⁵³ silently rounds. This calculator stores each
      number as its full string of digits and does the arithmetic the way
      you would on paper. That is why 50! prints all 65 digits instead of
      collapsing into scientific notation, and why 2¹⁰⁰ prints exactly.</>
    ),
    formula: <>digits stored: unlimited &nbsp;·&nbsp; float limit: 2<sup>53</sup> ≈ 9.0·10¹⁵</>,
    diagram: <DigitsMini />,
    example: { given: "50!", substitute: "product 1·2·…·50", answer: "30,414,093,201,713,378…000,000,000" },
  },
  {
    key: "ops",
    title: "How + − × ÷ ^ √ behave once precision is unlimited",
    explain: (
      <>Integer add, subtract and multiply are always exact — no rounding
      happens because the result of two integers is another integer. Divide,
      root, and non-integer power are the only operations that force a
      rounded answer, and they round to the precision setting you choose
      (default 64 digits). E-notation entries like 3.5e19 stay literal:
      mantissas multiply, exponents add.</>
    ),
    formula: <>bEn = b × 10ⁿ &nbsp;·&nbsp; a^b exact when b ∈ ℤ</>,
    diagram: <OpsMini />,
    example: { given: "3.5e19 × 2e18", substitute: "3.5·2 · 10^(19+18)", answer: "7 × 10³⁷" },
  },
  {
    key: "numtheory",
    title: "n!, GCD, LCM, MOD — the integer helpers built on top",
    explain: (
      <>Factorial chains the multiplication from 1 up to n (with 0! defined
      as 1). GCD uses the Euclidean algorithm — replace the pair (a, b)
      with (b, a mod b) until b is zero. LCM is derived from GCD by
      |a·b|/gcd(a,b). MOD is the remainder after integer division. Because
      the base representation is arbitrary-precision, all four run without
      overflow no matter how many digits you feed them.</>
    ),
    formula: <>n! = ∏<sub>k=1..n</sub> k &nbsp;·&nbsp; lcm(a,b) = |ab|/gcd(a,b)</>,
    diagram: <NumTheoryMini />,
    example: { given: "gcd(3780, 1764)", substitute: "Euclidean chain", answer: "252 · lcm = 26,460" },
  },
];
