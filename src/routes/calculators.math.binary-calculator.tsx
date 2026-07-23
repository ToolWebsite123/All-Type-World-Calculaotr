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
import { ReferenceTable } from "@/components/ReferenceTable";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import { CopyButton } from "@/components/CopyButton";
import {
  binaryOperate,
  binaryToDecimalSteps,
  decimalToBinarySteps,
  isBinary,
  type BinOp,
} from "@/lib/math/binary";

export const Route = createFileRoute("/calculators/math/binary-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Binary Calculator",
      title: "Binary Calculator — Add, Subtract, Multiply & Convert",
      metaDescription:
        "Add, subtract, multiply and divide binary numbers and convert between binary and decimal, with step-by-step column working shown.",
      canonicalUrl: "/calculators/math/binary-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Binary Calculator", path: "/calculators/math/binary-calculator" },
      ],
      faqs: [
        {
          q: "Why do computers use binary?",
          a: "Electronic circuits are cheapest and most reliable when they only have to distinguish two states — on/off, high/low voltage. Two states map naturally to two digits, so every layer above the hardware works in binary too.",
        },
        {
          q: "What is the largest binary number I can enter?",
          a: "There is no fixed limit. This calculator uses arbitrary-precision integers, so you can add or multiply 200-digit binary numbers and still get exact results.",
        },
        {
          q: "Does it handle negative binary numbers?",
          a: "Yes — put a minus sign in front (for example -1011). This tool uses signed arithmetic, not two's complement, so you write the sign explicitly.",
        },
        {
          q: "How do I convert binary to hex or octal?",
          a: "Use the Number Base Converter — it handles binary, octal, decimal and hexadecimal in one step.",
        },
      ],
    }),
  component: BinaryPage,
});


function BinaryPage() {
  return (
    <MathCalcPage
      name="Binary Calculator"
      tagline="Perform arithmetic directly on binary numbers, or convert between binary and decimal — with every step shown."
      extras={
        <>
          <CalcSection title="What is the binary number system?">
            <p>
              The binary number system is the language computers actually use.
              It only has two digits — 0 and 1 — and every position represents
              a power of two rather than a power of ten. This calculator
              handles three related tasks in one place: full binary arithmetic
              (add / subtract / multiply / divide), converting a binary value
              into its decimal equivalent, and converting a decimal value back
              into binary.
            </p>
            <p>
              All three tools show the exact working, so you can use this both
              as a checker for homework and as a learning aid. Numbers of any
              length are supported — the arithmetic uses arbitrary-precision
              integers under the hood, so a 200-digit binary value adds and
              multiplies without losing precision.
            </p>
          </CalcSection>

          <CalcSection title="Binary calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one job the calculator does — how it turns
              binary into decimal and back, and how the four arithmetic
              operations run column-by-column in base 2.
            </p>
            <GuideCards items={BIN_GUIDE} />
          </CalcSection>


          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
            "Add, subtract, multiply, and divide two binary numbers",
            "Convert between binary, decimal, and hexadecimal",
            "Supports signed (two's complement) and unsigned integers",
            "Shows column-by-column working, not just the final answer",
            "Includes a quick binary/decimal/hex reference table",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Why do computers use binary?",
                  a: (
                    <p>
                      Electronic circuits are cheapest and most reliable when
                      they only have to distinguish two states — on / off, high
                      / low voltage. Two states map naturally to two digits, so
                      every layer above the hardware works in binary too.
                    </p>
                  ),
                },
                {
                  q: "What is the largest number I can enter?",
                  a: (
                    <p>
                      There is no fixed limit. This calculator uses arbitrary-
                      precision integers, so you can add or multiply 200-digit
                      binary numbers and still get exact results.
                    </p>
                  ),
                },
                {
                  q: "Does it handle negative binary numbers?",
                  a: (
                    <p>
                      Yes — put a minus sign in front (e.g. −1011). This tool
                      uses signed arithmetic, not two's complement, so you
                      write the sign explicitly.
                    </p>
                  ),
                },
                {
                  q: "How do I convert to hex or octal instead?",
                  a: (
                    <p>
                      Use the{" "}
                      <a href="/calculators/math/number-base-calculator" className="text-primary underline">
                        Number Base Converter
                      </a>{" "}
                      — it handles binary, octal, decimal and hexadecimal in
                      one step.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/number-base-calculator", label: "Number Base Converter" },
                { to: "/calculators/math/scientific-calculator", label: "Scientific Calculator" },
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
                { to: "/calculators/math/scientific-notation-calculator", label: "Scientific Notation" },
                { to: "/calculators/math/rounding-calculator", label: "Rounding Calculator" },
              ]}
            />
          </CalcSection>

        </>
      }
    >
      <div className="space-y-8">
        <ArithmeticTool />
        <hr className="border-border/60" />
        <BinaryToDecimalTool />
        <hr className="border-border/60" />
        <DecimalToBinaryTool />
      </div>
    </MathCalcPage>
  );
}

/* ---------------- 1. Arithmetic ---------------- */

function ArithmeticTool() {
  const [a, setA] = useState("1010");
  const [op, setOp] = useState<BinOp>("+");
  const [b, setB] = useState("1101");
  const [result, setResult] = useState<null | { binary: string; decimal: string; steps: Step[]; qr?: { q: string; r: string } }>(null);
  const [err, setErr] = useState<string | null>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    try {
      const r = binaryOperate(a, op, b);
      const aDec = binaryToDecimalSteps(a).sum;
      const bDec = binaryToDecimalSteps(b).sum;
      const opSym = op === "*" ? "×" : op === "/" ? "÷" : op === "-" ? "−" : "+";
      const opWord =
        op === "+"
          ? "Add: A + B"
          : op === "-"
          ? "Subtract: A − B"
          : op === "*"
          ? "Multiply: A × B"
          : "Divide: A ÷ B (integer quotient)";
      const steps: Step[] = [
        {
          title: "Given",
          body: (
            <FormulaBlock>
              A = {a}₂,&nbsp; B = {b}₂
            </FormulaBlock>
          ),
        },
        {
          title: "Write the formula",
          body: (
            <FormulaWithLegend
              formula={<>{opWord}, working in base 2</>}
              legend={[
                { sym: "A, B", def: "binary operands (digits are 0 or 1)" },
                { sym: "bit", def: "single binary digit at position i, weight 2^i" },
                { sym: "carry / borrow", def: "fires when a column reaches 2, not 10" },
              ]}
            />
          ),
        },
        {
          title: "Substitute — convert both operands to decimal",
          body: (
            <FormulaBlock>
              {a}₂ = {aDec}₁₀,&nbsp; {b}₂ = {bDec}₁₀
            </FormulaBlock>
          ),
        },
        {
          title: "Perform the operation in decimal",
          body: (
            <FormulaBlock>
              {aDec} {opSym} {bDec} = {r.decimal}
            </FormulaBlock>
          ),
        },
        {
          title: "Answer — convert back to binary",
          body: (
            <FormulaBlock>
              {a} {opSym} {b} = <strong>{r.binary}</strong>₂ ({r.decimal}₁₀)
            </FormulaBlock>
          ),
        },
      ];
      setResult({ binary: r.binary, decimal: r.decimal, steps, qr: r.quotientRemainder });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <section>
      <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
        Binary arithmetic
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
        <Field label="First value (binary)" htmlFor="bin-a">
          <TextInput id="bin-a" value={a} onChange={(e) => setA(e.target.value)} placeholder="e.g. 1010" />
        </Field>
        <Field label="Op">
          <select
            value={op}
            onChange={(e) => setOp(e.target.value as BinOp)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="+">+</option>
            <option value="-">−</option>
            <option value="*">×</option>
            <option value="/">÷</option>
          </select>
        </Field>
        <Field label="Second value (binary)" htmlFor="bin-b">
          <TextInput id="bin-b" value={b} onChange={(e) => setB(e.target.value)} placeholder="e.g. 1101" />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">Calculate</PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox
            label={`${a} ${op === "*" ? "×" : op === "/" ? "÷" : op} ${b} =`}
            value={
              <div className="flex flex-wrap items-center gap-3">
                <span>{result.binary}₂</span>
                <CopyButton text={result.binary} />
              </div>
            }
            note={
              <div className="space-y-1">
                <div>Decimal: {result.decimal}</div>
                {result.qr && (
                  <div>
                    Quotient: {result.qr.q}₂ · Remainder: {result.qr.r}₂
                  </div>
                )}
              </div>
            }
          />
          <StepsToggle steps={result.steps} />
        </>
      )}
    </section>
  );
}

/* ---------------- Bit-position diagram ---------------- */

function BitPositionDiagram({ bin }: { bin: string }) {
  const digits = bin.replace(/^-/, "").split("");
  const n = digits.length;
  if (n === 0 || n > 24) return null;
  const cell = 34;
  const gap = 4;
  const width = n * cell + (n - 1) * gap;
  const height = 66;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-4 w-full max-w-full"
      style={{ maxWidth: width }}
      role="img"
      aria-label="Bit position grid showing place values"
    >
      {digits.map((bit, i) => {
        const power = n - 1 - i;
        const x = i * (cell + gap);
        const isOne = bit === "1";
        return (
          <g key={i}>
            <rect
              x={x}
              y={20}
              width={cell}
              height={cell}
              rx={4}
              className={isOne ? "fill-primary/20 stroke-primary" : "fill-transparent stroke-border"}
              strokeWidth={1.5}
            />
            <text
              x={x + cell / 2}
              y={20 + cell / 2 + 5}
              textAnchor="middle"
              className={isOne ? "fill-primary" : "fill-muted-foreground"}
              fontSize={15}
              fontFamily="monospace"
              fontWeight={600}
            >
              {bit}
            </text>
            <text
              x={x + cell / 2}
              y={12}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
              fontFamily="monospace"
            >
              2^{power}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- 2. Binary → Decimal ---------------- */

function BinaryToDecimalTool() {
  const [bin, setBin] = useState("101010");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<null | { decimal: string; terms: string[] }>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    if (!isBinary(bin)) {
      setErr("Binary numbers can only contain 0 and 1");
      return;
    }
    try {
      const r = binaryToDecimalSteps(bin);
      setResult({ decimal: r.sum, terms: r.terms });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <section>
      <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
        Convert binary to decimal
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Binary value" htmlFor="b2d">
          <TextInput id="b2d" value={bin} onChange={(e) => setBin(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">Convert</PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox
            label={`${bin}₂ =`}
            value={
              <div className="flex flex-wrap items-center gap-3">
                <span>{result.decimal}₁₀</span>
                <CopyButton text={result.decimal} />
              </div>
            }
          />
          <BitPositionDiagram bin={bin} />
          <StepsToggle
            steps={[
              {
                title: "Given",
                body: <FormulaBlock>binary value = {bin}₂</FormulaBlock>,
              },
              {
                title: "Write the formula",
                body: (
                  <FormulaWithLegend
                    formula={<>value = Σ bit<sub>i</sub> × 2<sup>i</sup></>}
                    legend={[
                      { sym: "bit_i", def: "binary digit at position i (0 or 1)" },
                      { sym: "i", def: "position from the right, starting at 0" },
                    ]}
                  />
                ),
              },
              {
                title: "Substitute — weight every 1-bit by its power of 2",
                body: (
                  <ul className="ml-4 list-disc space-y-0.5">
                    {result.terms.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                ),
              },
              {
                title: "Answer — add the terms",
                body: (
                  <FormulaBlock>
                    {bin}₂ = <strong>{result.decimal}</strong>₁₀
                  </FormulaBlock>
                ),
              },
            ]}
          />
        </>
      )}
    </section>
  );
}

/* ---------------- 3. Decimal → Binary ---------------- */

function DecimalToBinaryTool() {
  const [dec, setDec] = useState("170");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<null | { binary: string; rows: Array<{ n: string; q: string; r: string }> }>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    try {
      const r = decimalToBinarySteps(dec);
      setResult({ binary: r.binary, rows: r.rows });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <section>
      <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
        Convert decimal to binary
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Decimal value" htmlFor="d2b">
          <TextInput id="d2b" inputMode="numeric" value={dec} onChange={(e) => setDec(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">Convert</PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox
            label={`${dec}₁₀ =`}
            value={
              <div className="flex flex-wrap items-center gap-3">
                <span>{result.binary}₂</span>
                <CopyButton text={result.binary} />
              </div>
            }
          />
          <StepsToggle
            steps={[
              {
                title: "Given",
                body: <FormulaBlock>n = {dec}₁₀</FormulaBlock>,
              },
              {
                title: "Write the formula",
                body: (
                  <FormulaWithLegend
                    formula={<>n<sub>k+1</sub> = ⌊n<sub>k</sub> ÷ 2⌋,&nbsp; bit<sub>k</sub> = n<sub>k</sub> mod 2</>}
                    legend={[
                      { sym: "n_k", def: "quotient at step k, starting at your value" },
                      { sym: "bit_k", def: "remainder at step k (0 or 1)" },
                    ]}
                  />
                ),
              },
              {
                title: "Substitute — divide by 2 repeatedly",
                body: (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-foreground">
                        <tr>
                          <th className="pr-4">n</th>
                          <th className="pr-4">n ÷ 2</th>
                          <th>remainder</th>
                        </tr>
                      </thead>
                      <tbody className="tabular-nums">
                        {result.rows.map((row, i) => (
                          <tr key={i}>
                            <td className="pr-4">{row.n}</td>
                            <td className="pr-4">{row.q}</td>
                            <td>{row.r}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ),
              },
              {
                title: "Answer — read remainders bottom-up",
                body: (
                  <FormulaBlock>
                    {dec}₁₀ = <strong>{result.binary}</strong>₂
                  </FormulaBlock>
                ),
              },
            ]}
          />
        </>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function PlaceValueMini() {
  const bits = [1, 0, 1, 1];
  const powers = [8, 4, 2, 1];
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      {bits.map((b, i) => (
        <g key={i}>
          <rect x={30 + i * 45} y="20" width="36" height="30" rx="4" className={b ? "fill-primary/20 stroke-primary" : "fill-muted stroke-border"} />
          <text x={48 + i * 45} y="40" textAnchor="middle" className={b ? "fill-primary font-mono" : "fill-muted-foreground font-mono"} fontSize="14" fontWeight="700">{b}</text>
          <text x={48 + i * 45} y="66" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="10">×{powers[i]}</text>
        </g>
      ))}
      <line x1="20" y1="82" x2="220" y2="82" stroke="var(--color-border)" />
      <text x="120" y="105" textAnchor="middle" className="fill-primary font-mono" fontSize="13" fontWeight="700">8 + 0 + 2 + 1 = 11</text>
    </svg>
  );
}

function DivMini() {
  const rows = [
    ["13 ÷ 2", "6", "1"],
    ["6 ÷ 2", "3", "0"],
    ["3 ÷ 2", "1", "1"],
    ["1 ÷ 2", "0", "1"],
  ];
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="20" className="fill-muted-foreground font-mono" fontSize="10">step</text>
      <text x="100" y="20" className="fill-muted-foreground font-mono" fontSize="10">quo</text>
      <text x="180" y="20" className="fill-muted-foreground font-mono" fontSize="10">rem</text>
      {rows.map((r, i) => (
        <g key={i}>
          <text x="10" y={38 + i * 18} className="fill-foreground font-mono" fontSize="11">{r[0]}</text>
          <text x="100" y={38 + i * 18} className="fill-foreground font-mono" fontSize="11">{r[1]}</text>
          <text x="180" y={38 + i * 18} className="fill-primary font-mono" fontSize="11" fontWeight="700">{r[2]}</text>
        </g>
      ))}
      <text x="10" y="122" className="fill-primary font-mono" fontSize="11">read up → 1101</text>
    </svg>
  );
}

function AddMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="30" y="22" className="fill-muted-foreground font-mono" fontSize="9">carry: 1 1 1</text>
      <text x="60" y="46" className="fill-foreground font-mono" fontSize="16">  1 0 1 1</text>
      <text x="60" y="66" className="fill-foreground font-mono" fontSize="16">+   1 1 0</text>
      <line x1="55" y1="72" x2="200" y2="72" stroke="var(--color-foreground)" />
      <text x="60" y="94" className="fill-primary font-mono" fontSize="16" fontWeight="700">1 0 0 0 1</text>
      <text x="120" y="118" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="10">= 17 decimal</text>
    </svg>
  );
}

function MulMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="60" y="24" className="fill-foreground font-mono" fontSize="14">    1 0 1</text>
      <text x="60" y="42" className="fill-foreground font-mono" fontSize="14">×     1 1</text>
      <line x1="55" y1="48" x2="200" y2="48" stroke="var(--color-foreground)" />
      <text x="60" y="66" className="fill-foreground font-mono" fontSize="13">    1 0 1</text>
      <text x="60" y="82" className="fill-foreground font-mono" fontSize="13">  1 0 1 ·</text>
      <line x1="55" y1="88" x2="200" y2="88" stroke="var(--color-foreground)" />
      <text x="60" y="108" className="fill-primary font-mono" fontSize="14" fontWeight="700">  1 1 1 1</text>
      <text x="120" y="124" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="10">shift-and-add</text>
    </svg>
  );
}

const BIN_GUIDE: GuideCardItem[] = [
  {
    key: "b2d",
    title: "Binary → decimal — how the converter reads your bits",
    explain: (
      <>The rightmost bit is worth 1, then 2, then 4, then 8, doubling each
      step to the left. The converter multiplies each bit by its place value
      and sums them. That is why a single "1" moved one place to the left
      instantly doubles the decimal reading you see below the input.</>
    ),
    formula: <>value = Σ bit<sub>i</sub> × 2<sup>i</sup></>,
    legend: [{ sym: "bit_i", def: "0 or 1 at position i" }, { sym: "i", def: "position from the right, starting at 0" }],
    diagram: <PlaceValueMini />,
    example: { given: "1011₂", substitute: "1·8 + 0·4 + 1·2 + 1·1", answer: "11" },
  },
  {
    key: "d2b",
    title: "Decimal → binary — the repeated-division trick",
    explain: (
      <>The reverse converter keeps dividing your decimal by 2 and writing
      down the remainder each time. When the quotient hits zero, the
      remainders read <em>bottom-up</em> are the binary digits. This is a
      standard base-conversion algorithm and works for any base by dividing
      by that base instead of 2.</>
    ),
    formula: <>n<sub>k+1</sub> = ⌊n<sub>k</sub> / 2⌋, bit<sub>k</sub> = n<sub>k</sub> mod 2</>,
    diagram: <DivMini />,
    example: { given: "n = 13", substitute: "collect remainders", answer: "1101₂" },
  },
  {
    key: "add",
    title: "Binary addition — 1 + 1 carries a 1",
    explain: (
      <>Addition works exactly like the decimal method — align, add column by
      column, carry when you exceed the base. In binary the base is 2, so
      1 + 1 makes a carry instead of a 2. The calculator does this with
      arbitrary-precision integers, so even 200-digit binary sums stay exact.</>
    ),
    formula: <>0+0=0, 0+1=1, 1+1=10 (write 0, carry 1)</>,
    diagram: <AddMini />,
    example: { given: "1011 + 110", substitute: "column-by-column with carries", answer: "10001₂ = 17" },
  },
  {
    key: "muldiv",
    title: "Binary multiplication & division — shift, add, subtract",
    explain: (
      <>Multiplication is the shift-and-add algorithm: for every 1 in the
      multiplier, copy the multiplicand shifted left by that many places,
      then add all the rows in binary. Division is the mirror — repeatedly
      subtract the shifted divisor. Both are what the "×" and "÷" buttons on
      the calculator run for you.</>
    ),
    formula: <>a × b = Σ (a &lt;&lt; i) for every 1-bit at position i of b</>,
    diagram: <MulMini />,
    example: { given: "101 × 11", substitute: "101 + (101 &lt;&lt; 1)", answer: "1111₂ = 15" },
  },
];
