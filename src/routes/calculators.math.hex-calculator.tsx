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
  hexOperate,
  hexToDecimalSteps,
  decimalToHexSteps,
  hexAddSteps,
  hexSubSteps,
  hexToBigInt,
  bigIntToHex,
  isHex,
  isDecimal,
  type HexOp,
} from "@/lib/math/hex";

export const Route = createFileRoute("/calculators/math/hex-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Hex Calculator",
      title: "Hex Calculator — Add, Subtract, Multiply, Divide & Convert",
      metaDescription:
        "Add, subtract, multiply and divide hexadecimal values and convert between hex and decimal, with step-by-step working shown.",
      canonicalUrl: "/calculators/math/hex-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Hex Calculator", path: "/calculators/math/hex-calculator" },
      ],
      faqs: [
        {
          q: "What is hexadecimal used for?",
          a: "Hex is the standard shorthand for binary data in computing. It shows up in color codes (#FF8800), memory addresses, MAC addresses, cryptographic hashes and byte-level file inspection — anywhere a compact form of binary is useful.",
        },
        {
          q: "How do I convert hex to decimal?",
          a: "Multiply each hex digit by 16 raised to its position (rightmost digit is position 0) and add the results. For example, 2AF = 2×16² + 10×16 + 15 = 687.",
        },
        {
          q: "How do I convert decimal to hex?",
          a: "Repeatedly divide the decimal number by 16 and record each remainder. Read the remainders bottom-up, replacing 10–15 with A–F, to get the hex digits.",
        },
        {
          q: "Is hex case sensitive?",
          a: "No — A–F and a–f mean the same thing. This calculator accepts either and shows the result in uppercase by convention.",
        },
      ],
    }),
  component: HexPage,
});

function HexPage() {
  return (
    <MathCalcPage
      name="Hex Calculator"
      tagline="Add, subtract, multiply and divide hexadecimal numbers, or convert between hex and decimal — with every step shown."
      extras={
        <>
          <CalcSection title="What is hexadecimal?">
            <p>
              Hexadecimal — or hex — is a base-16 number system. Instead of the
              ten digits 0–9 used in the decimal system, hex uses sixteen
              symbols: the digits 0–9 followed by the letters A, B, C, D, E and
              F, which stand for the decimal values 10, 11, 12, 13, 14 and 15.
            </p>
            <p>
              Because 16 is a power of 2 (16 = 2⁴), each hex digit maps to
              exactly four binary digits. That makes hex a compact,
              human-readable shorthand for binary — the string
              <span className="mx-1 font-mono">1111&nbsp;1010&nbsp;1100&nbsp;1110</span>
              becomes <span className="font-mono">FACE</span>. That's why hex
              shows up in color codes (#FF8800), memory addresses, MAC
              addresses, hash outputs and byte dumps.
            </p>
          </CalcSection>

          <CalcSection title="Hex calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one job the calculator does — reading a hex
              value into decimal, writing a decimal back into hex, and running
              the four arithmetic operations column-by-column in base 16.
            </p>
            <GuideCards items={HEX_GUIDE} />
          </CalcSection>

          <CalcSection title="Hex / decimal / binary quick reference">
            <ReferenceTable
              headers={["Hex", "Decimal", "Binary (4-bit)"]}
              numericColumns={[0, 1, 2]}
              rows={[
                ...Array.from({ length: 16 }, (_, n) => [
                  n.toString(16).toUpperCase(),
                  n,
                  n.toString(2).padStart(4, "0"),
                ]),
                ["14", 20, "0001 0100"],
                ["3F", 63, "0011 1111"],
                ["FF", 255, "1111 1111"],
                ["100", 256, "1 0000 0000"],
                ["3E8", 1000, "11 1110 1000"],
              ]}
            />
          </CalcSection>

          <HexMultiplicationTable />


          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Add, subtract, multiply and divide two hex values",
                "Convert hexadecimal to decimal with place-value working",
                "Convert decimal to hexadecimal via repeated division by 16",
                "Arbitrary-precision — handles very large hex numbers exactly",
                "Includes a hex/binary/decimal reference and a 16×16 multiplication table",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is hexadecimal used for?",
                  a: (
                    <p>
                      Hex is the standard shorthand for binary in computing —
                      color codes, memory addresses, MAC addresses, hashes and
                      byte-level file dumps all use it because one hex digit
                      cleanly represents four binary digits.
                    </p>
                  ),
                },
                {
                  q: "How do I convert hex to decimal by hand?",
                  a: (
                    <p>
                      Multiply each digit by 16 raised to its position from the
                      right, replacing A–F with 10–15, and add the results.
                      Example: 2AF = 2·256 + 10·16 + 15 = 687.
                    </p>
                  ),
                },
                {
                  q: "Why does hex use letters?",
                  a: (
                    <p>
                      Base 16 needs sixteen distinct symbols. The digits 0–9
                      only cover ten, so A–F were chosen for the extra six.
                      Using existing keyboard characters keeps hex easy to
                      type and print.
                    </p>
                  ),
                },
                {
                  q: "Can I enter negative hex values?",
                  a: (
                    <p>
                      Yes — put a minus sign in front (e.g. −1F). This
                      calculator uses signed arithmetic rather than two's
                      complement, so you write the sign explicitly instead of
                      picking a bit width.
                    </p>
                  ),
                },
                {
                  q: "How is this different from the Binary Calculator?",
                  a: (
                    <p>
                      Same idea, different base. Use the{" "}
                      <a href="/calculators/math/binary-calculator" className="text-primary underline">
                        Binary Calculator
                      </a>{" "}
                      for base 2, or the{" "}
                      <a href="/calculators/math/number-base-calculator" className="text-primary underline">
                        Number Base Converter
                      </a>{" "}
                      to switch between binary, octal, decimal and hex in one
                      step.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/binary-calculator", label: "Binary Calculator" },
                { to: "/calculators/math/number-base-calculator", label: "Number Base Converter" },
                { to: "/calculators/math/scientific-calculator", label: "Scientific Calculator" },
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
                { to: "/calculators/math/scientific-notation-calculator", label: "Scientific Notation" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-8">
        <ArithmeticTool />
        <hr className="border-border/60" />
        <HexToDecimalTool />
        <hr className="border-border/60" />
        <DecimalToHexTool />
      </div>
    </MathCalcPage>
  );
}

/* ---------------- 1. Arithmetic ---------------- */

function ArithmeticTool() {
  const [a, setA] = useState("5D");
  const [op, setOp] = useState<HexOp>("+");
  const [b, setB] = useState("B78");
  const [result, setResult] = useState<null | {
    hex: string;
    decimal: string;
    steps: Step[];
    qr?: { q: string; r: string; qDec: string; rDec: string };
  }>(null);
  const [err, setErr] = useState<string | null>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    try {
      const r = hexOperate(a, op, b);
      const aDec = hexToBigInt(a);
      const bDec = hexToBigInt(b);
      const steps: Step[] = [];
      const opSym = op === "*" ? "×" : op === "/" ? "÷" : op === "-" ? "−" : "+";
      const opWord =
        op === "+"
          ? "Add: A + B"
          : op === "-"
          ? "Subtract: A − B"
          : op === "*"
          ? "Multiply: A × B"
          : "Divide: A ÷ B (integer quotient)";

      steps.push({
        title: "Given",
        body: (
          <FormulaBlock>
            A = {a.toUpperCase()}₁₆,&nbsp; B = {b.toUpperCase()}₁₆
          </FormulaBlock>
        ),
      });

      steps.push({
        title: "Write the formula",
        body: (
          <FormulaWithLegend
            formula={<>{opWord}, working in base 16</>}
            legend={[
              { sym: "A, B", def: "hex operands (letters A–F stand for 10–15)" },
              { sym: "digit", def: "value 0–15 in one hex position (weight 16^i)" },
              { sym: "carry / borrow", def: "fires when a column reaches 16, not 10" },
            ]}
          />
        ),
      });

      steps.push({
        title: "Substitute — convert both operands to decimal",
        body: (
          <FormulaBlock>
            {a.toUpperCase()}₁₆ = {aDec.toString()}₁₀,&nbsp; {b.toUpperCase()}₁₆ = {bDec.toString()}₁₀
          </FormulaBlock>
        ),
      });

      // For + and -, show column-by-column hex working (positive operands only).
      if (op === "+" && !a.trim().startsWith("-") && !b.trim().startsWith("-")) {
        const add = hexAddSteps(a, b);
        steps.push({
          title: "Add column-by-column in hex (carry when a column ≥ 16)",
          body: (
            <ul className="ml-4 list-disc space-y-0.5">
              {add.columns.map((c, i) => (
                <li key={i}>
                  16^{c.pos}: {c.da} + {c.db}
                  {c.carryIn ? ` + ${c.carryIn}(carry)` : ""} = {c.sumDec}
                  {" → digit "}
                  {c.digit}
                  {c.carryOut ? `, carry ${c.carryOut}` : ""}
                </li>
              ))}
            </ul>
          ),
        });
      } else if (
        op === "-" &&
        !a.trim().startsWith("-") &&
        !b.trim().startsWith("-") &&
        aDec >= bDec
      ) {
        const sub = hexSubSteps(a, b);
        steps.push({
          title: "Subtract column-by-column in hex (borrow 16 when needed)",
          body: (
            <ul className="ml-4 list-disc space-y-0.5">
              {sub.columns.map((c, i) => (
                <li key={i}>
                  16^{c.pos}: {c.da} − {c.db}
                  {c.borrowed ? ` (borrowed 16 → ${c.effA} − ${c.db})` : ""}
                  {" = "}
                  {c.digit}
                </li>
              ))}
            </ul>
          ),
        });
      } else {
        steps.push({
          title: "Perform the operation in decimal",
          body: (
            <FormulaBlock>
              {aDec.toString()} {opSym} {bDec.toString()} = {r.decimal}
            </FormulaBlock>
          ),
        });
      }

      steps.push({
        title: "Answer — convert back to hex",
        body: (
          <FormulaBlock>
            {a.toUpperCase()} {opSym} {b.toUpperCase()} = <strong>{r.hex}₁₆</strong> ({r.decimal}₁₀)
          </FormulaBlock>
        ),
      });

      setResult({
        hex: r.hex,
        decimal: r.decimal,
        steps,
        qr: r.quotientRemainder,
      });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <section>
      <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
        Hexadecimal calculation — add, subtract, multiply, divide
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
        <Field label="First value (hex)" htmlFor="hex-a">
          <TextInput
            id="hex-a"
            value={a}
            onChange={(e) => setA(e.target.value)}
            placeholder="e.g. 5D"
          />
        </Field>
        <Field label="Op">
          <select
            value={op}
            onChange={(e) => setOp(e.target.value as HexOp)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="+">+</option>
            <option value="-">−</option>
            <option value="*">×</option>
            <option value="/">÷</option>
          </select>
        </Field>
        <Field label="Second value (hex)" htmlFor="hex-b">
          <TextInput
            id="hex-b"
            value={b}
            onChange={(e) => setB(e.target.value)}
            placeholder="e.g. B78"
          />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">
            Calculate
          </PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox
            label={`${a.toUpperCase()} ${
              op === "*" ? "×" : op === "/" ? "÷" : op
            } ${b.toUpperCase()} =`}
            value={
              <div className="flex flex-wrap items-center gap-3">
                <span>{result.hex}₁₆</span>
                <CopyButton text={result.hex} />
              </div>
            }
            note={
              <div className="space-y-1">
                <div>Decimal: {result.decimal}</div>
                {result.qr && (
                  <div>
                    Quotient: {result.qr.q}₁₆ ({result.qr.qDec}) · Remainder:{" "}
                    {result.qr.r}₁₆ ({result.qr.rDec})
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

/* ---------------- Hex place-value diagram ---------------- */

function HexPlaceValueDiagram({ hex }: { hex: string }) {
  const digits = hex.trim().replace(/^-/, "").toUpperCase().split("");
  const n = digits.length;
  if (n === 0 || n > 16) return null;
  const cell = 46;
  const gap = 6;
  const width = n * cell + (n - 1) * gap;
  const height = 92;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-4 w-full max-w-full"
      style={{ maxWidth: width }}
      role="img"
      aria-label="Hex digit place values and binary nibbles"
    >
      {digits.map((d, i) => {
        const power = n - 1 - i;
        const x = i * (cell + gap);
        const val = parseInt(d, 16);
        const nibble = val.toString(2).padStart(4, "0");
        return (
          <g key={i}>
            <text
              x={x + cell / 2}
              y={12}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
              fontFamily="monospace"
            >
              16^{power}
            </text>
            <rect
              x={x}
              y={20}
              width={cell}
              height={30}
              rx={4}
              className="fill-primary/20 stroke-primary"
              strokeWidth={1.5}
            />
            <text
              x={x + cell / 2}
              y={40}
              textAnchor="middle"
              className="fill-primary"
              fontSize={16}
              fontFamily="monospace"
              fontWeight={600}
            >
              {d}
            </text>
            <text
              x={x + cell / 2}
              y={68}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
              fontFamily="monospace"
            >
              {nibble}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- 2. Hex → Decimal ---------------- */

function HexToDecimalTool() {
  const [hex, setHex] = useState("D4D");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<null | { decimal: string; terms: string[] }>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    if (!isHex(hex)) {
      setErr("Hex values can only contain digits 0–9 and letters A–F");
      return;
    }
    try {
      const r = hexToDecimalSteps(hex);
      setResult({ decimal: r.sum, terms: r.terms });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <section>
      <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
        Convert hexadecimal to decimal
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Hexadecimal value" htmlFor="h2d">
          <TextInput id="h2d" value={hex} onChange={(e) => setHex(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">
            Convert
          </PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox
            label={`${hex.toUpperCase()}₁₆ =`}
            value={
              <div className="flex flex-wrap items-center gap-3">
                <span>{result.decimal}₁₀</span>
                <CopyButton text={result.decimal} />
              </div>
            }
          />
          <HexPlaceValueDiagram hex={hex} />
          <StepsToggle
            steps={[
              {
                title: "Given",
                body: <FormulaBlock>hex value = {hex.toUpperCase()}₁₆</FormulaBlock>,
              },
              {
                title: "Write the formula",
                body: (
                  <FormulaWithLegend
                    formula={<>value = Σ digit<sub>i</sub> × 16<sup>i</sup></>}
                    legend={[
                      { sym: "digit_i", def: "hex digit at position i, with A–F = 10–15" },
                      { sym: "i", def: "position from the right, starting at 0" },
                    ]}
                  />
                ),
              },
              {
                title: "Substitute — weight every digit by its power of 16",
                body: (
                  <ul className="ml-4 list-disc space-y-0.5">
                    {result.terms.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ),
              },
              {
                title: "Answer — add the terms",
                body: (
                  <FormulaBlock>
                    {hex.toUpperCase()}₁₆ = <strong>{result.decimal}</strong>₁₀
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

/* ---------------- 3. Decimal → Hex ---------------- */

function DecimalToHexTool() {
  const [dec, setDec] = useState("170");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<null | {
    hex: string;
    rows: Array<{ n: string; q: string; r: string; hexDigit: string }>;
  }>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    if (!isDecimal(dec)) {
      setErr("Enter a whole decimal number");
      return;
    }
    try {
      const r = decimalToHexSteps(dec);
      setResult({ hex: r.hex, rows: r.rows });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <section>
      <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
        Convert decimal to hexadecimal
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Decimal value" htmlFor="d2h">
          <TextInput
            id="d2h"
            inputMode="numeric"
            value={dec}
            onChange={(e) => setDec(e.target.value)}
          />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">
            Convert
          </PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox
            label={`${dec}₁₀ =`}
            value={
              <div className="flex flex-wrap items-center gap-3">
                <span>{result.hex}₁₆</span>
                <CopyButton text={result.hex} />
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
                    formula={<>n<sub>k+1</sub> = ⌊n<sub>k</sub> ÷ 16⌋,&nbsp; digit<sub>k</sub> = n<sub>k</sub> mod 16</>}
                    legend={[
                      { sym: "n_k", def: "quotient at step k, starting at your value" },
                      { sym: "digit_k", def: "remainder at step k (10–15 written as A–F)" },
                    ]}
                  />
                ),
              },
              {
                title: "Substitute — divide by 16 repeatedly",
                body: (
                  <ReferenceTable
                    headers={["n", "n ÷ 16 = q", "remainder", "hex digit"]}
                    numericColumns={[0, 1, 2, 3]}
                    rows={result.rows.map((r) => [r.n, r.q, r.r, r.hexDigit])}
                  />
                ),
              },
              {
                title: "Answer — read the digits bottom-up",
                body: (
                  <FormulaBlock>
                    {dec}₁₀ = <strong>{result.hex}</strong>₁₆
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

/* ---------------- Reference: 16×16 multiplication table ---------------- */

function HexMultiplicationTable() {
  const [open, setOpen] = useState(false);
  const digits = Array.from({ length: 16 }, (_, i) => i); // 0..15
  return (
    <CalcSection title="Hexadecimal multiplication table">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-sm text-foreground hover:border-primary/40"
        aria-expanded={open}
      >
        {open ? "Hide multiplication table" : "Show multiplication table"}
      </button>
      {open && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60">
          <table className="min-w-full text-right text-xs tabular-nums">
            <thead className="bg-secondary/40 text-foreground">
              <tr>
                <th className="px-2 py-1.5">×</th>
                {digits.map((d) => (
                  <th key={d} className="px-2 py-1.5">
                    {bigIntToHex(BigInt(d))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {digits.map((r) => (
                <tr key={r} className="odd:bg-background/40">
                  <th className="bg-secondary/40 px-2 py-1.5 text-foreground">
                    {bigIntToHex(BigInt(r))}
                  </th>
                  {digits.map((c) => (
                    <td key={c} className="px-2 py-1.5">
                      {bigIntToHex(BigInt(r * c))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CalcSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function HexPlaceMini() {
  const digits = ["2", "A", "F"];
  const powers = ["256", "16", "1"];
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      {digits.map((d, i) => (
        <g key={i}>
          <rect x={50 + i * 45} y="18" width="36" height="30" rx="4" className="fill-primary/15 stroke-primary" />
          <text x={68 + i * 45} y="38" textAnchor="middle" className="fill-primary font-mono" fontSize="16" fontWeight="700">{d}</text>
          <text x={68 + i * 45} y="62" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="10">×{powers[i]}</text>
        </g>
      ))}
      <line x1="30" y1="78" x2="220" y2="78" stroke="var(--color-border)" />
      <text x="120" y="98" textAnchor="middle" className="fill-foreground font-mono" fontSize="11">512 + 160 + 15</text>
      <text x="120" y="118" textAnchor="middle" className="fill-primary font-mono" fontSize="14" fontWeight="700">= 687</text>
    </svg>
  );
}

function HexDivMini() {
  const rows = [
    ["1000 ÷ 16", "62", "8"],
    ["62 ÷ 16", "3", "E"],
    ["3 ÷ 16", "0", "3"],
  ];
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="22" className="fill-muted-foreground font-mono" fontSize="10">step</text>
      <text x="120" y="22" className="fill-muted-foreground font-mono" fontSize="10">quo</text>
      <text x="190" y="22" className="fill-muted-foreground font-mono" fontSize="10">rem</text>
      {rows.map((r, i) => (
        <g key={i}>
          <text x="10" y={44 + i * 22} className="fill-foreground font-mono" fontSize="11">{r[0]}</text>
          <text x="120" y={44 + i * 22} className="fill-foreground font-mono" fontSize="11">{r[1]}</text>
          <text x="190" y={44 + i * 22} className="fill-primary font-mono" fontSize="12" fontWeight="700">{r[2]}</text>
        </g>
      ))}
      <text x="10" y="122" className="fill-primary font-mono" fontSize="12" fontWeight="700">read up → 3E8</text>
    </svg>
  );
}

function HexAddMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="40" y="24" className="fill-muted-foreground font-mono" fontSize="10">carry: 1</text>
      <text x="60" y="46" className="fill-foreground font-mono" fontSize="18">  5 D</text>
      <text x="60" y="68" className="fill-foreground font-mono" fontSize="18">+ 7 C</text>
      <line x1="55" y1="74" x2="180" y2="74" stroke="var(--color-foreground)" />
      <text x="60" y="96" className="fill-primary font-mono" fontSize="18" fontWeight="700">  D 9</text>
      <text x="120" y="118" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="10">carry at ≥ 16, not 10</text>
    </svg>
  );
}

function HexMulMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="40" y="26" className="fill-muted-foreground font-mono" fontSize="10">carry: 2</text>
      <text x="60" y="48" className="fill-foreground font-mono" fontSize="18">  1 F</text>
      <text x="60" y="70" className="fill-foreground font-mono" fontSize="18">×   3</text>
      <line x1="55" y1="76" x2="180" y2="76" stroke="var(--color-foreground)" />
      <text x="60" y="98" className="fill-primary font-mono" fontSize="18" fontWeight="700">  5 D</text>
      <text x="120" y="120" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="10">F·3=45=2D; write D, carry 2</text>
    </svg>
  );
}

const HEX_GUIDE: GuideCardItem[] = [
  {
    key: "h2d",
    title: "Hex → decimal — how the digits are weighted",
    explain: (
      <>The rightmost hex digit is worth 1, the next 16, then 256 (=16²), and
      so on — the calculator multiplies every digit by its place value and
      sums. The letters A–F stand for 10–15, so a two-digit hex value fits
      the range 0–255, exactly one byte.</>
    ),
    formula: <>value = Σ digit<sub>i</sub> × 16<sup>i</sup></>,
    legend: [{ sym: "digit_i", def: "hex digit 0–F at position i, with A=10…F=15" }, { sym: "i", def: "position from the right" }],
    diagram: <HexPlaceMini />,
    example: { given: "2AF", substitute: "2·256 + 10·16 + 15·1", answer: "687" },
  },
  {
    key: "d2h",
    title: "Decimal → hex — repeated division by 16",
    explain: (
      <>The reverse converter divides your decimal by 16, records the
      remainder (translating 10–15 back to A–F), and repeats on the quotient
      until it reaches zero. Reading the remainders <em>bottom-up</em> spells
      the hex value the calculator shows in the output.</>
    ),
    formula: <>n<sub>k+1</sub> = ⌊n<sub>k</sub> / 16⌋, digit<sub>k</sub> = n<sub>k</sub> mod 16</>,
    diagram: <HexDivMini />,
    example: { given: "n = 1000", substitute: "3 divisions", answer: "3E8" },
  },
  {
    key: "add",
    title: "Hex add & subtract — carry at 16, borrow 16",
    explain: (
      <>Hex addition uses the same column-by-column method as decimal, but
      the carry only fires when a column reaches 16, not 10. Subtraction
      borrows 16 from the next column. Under the hood the calculator runs
      the arithmetic in native big integers, then converts back to base 16
      for display.</>
    ),
    formula: <>column ≥ 16 → write (col−16), carry 1</>,
    diagram: <HexAddMini />,
    example: { given: "5D + 7C", substitute: "D+C=25→9 c1; 5+7+1=D", answer: "D9" },
  },
  {
    key: "mul",
    title: "Hex multiplication — long multiply with the F×F table",
    explain: (
      <>Multiplication follows the same shift-and-add layout as decimal long
      multiplication — multiply the top by each digit of the bottom, then
      sum the shifted rows in hex. The 16×16 table above is the base-16
      version of the times table and is what the calculator uses for the
      single-digit products.</>
    ),
    formula: <>(top) × (bottom) = Σ (top × digit<sub>k</sub>) &lt;&lt; 4k</>,
    diagram: <HexMulMini />,
    example: { given: "1F × 3", substitute: "F·3=2D, 1·3+carry", answer: "5D" },
  },
];
