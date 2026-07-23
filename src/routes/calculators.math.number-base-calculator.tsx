import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
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
import { CopyButton } from "@/components/CopyButton";
import { convertAll, parseFromBase, toBase, type Base } from "@/lib/math/number-base";

export const Route = createFileRoute("/calculators/math/number-base-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Number Base Converter",
      title: "Number Base Converter — Binary, Octal, Decimal, Hex",
      metaDescription:
        "Convert numbers between binary, octal, decimal and hexadecimal in one step. Enter any value in its base and see all four representations instantly.",
      canonicalUrl: "/calculators/math/number-base-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Number Base Converter", path: "/calculators/math/number-base-calculator" },
      ],
      faqs: [
        { q: "Why is hex used for colours?", a: "Because two hex digits map exactly to one byte (0–255), which is the range of each RGB channel." },
        { q: "What's the difference between hex A and decimal 10?", a: "They are the same value — hex just uses a single symbol instead of two digits." },
        { q: "Where is octal still used?", a: "Mostly in Unix file permissions (chmod 755) and a few legacy computing contexts." },
      ],

    }),
  component: NumberBasePage,
});

const BASES: { value: Base; label: string; hint: string }[] = [
  { value: 2, label: "Binary (base 2)", hint: "digits 0–1" },
  { value: 8, label: "Octal (base 8)", hint: "digits 0–7" },
  { value: 10, label: "Decimal (base 10)", hint: "digits 0–9" },
  { value: 16, label: "Hexadecimal (base 16)", hint: "digits 0–9, A–F" },
];

function digitValue(ch: string): number {
  const c = ch.toLowerCase();
  if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48;
  return c.charCodeAt(0) - 97 + 10;
}

function PlaceValueDiagram({ value, base }: { value: string; base: Base }) {
  const digits = value.trim().replace(/^-/, "").split(".")[0].split("");
  const n = digits.length;
  if (n === 0 || n > 20 || digits.some((d) => Number.isNaN(digitValue(d)))) return null;
  const cell = 40;
  const gap = 5;
  const width = n * cell + (n - 1) * gap;
  const height = 66;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-5 w-full max-w-full"
      style={{ maxWidth: width }}
      role="img"
      aria-label={`Place value breakdown in base ${base}`}
    >
      {digits.map((d, i) => {
        const power = n - 1 - i;
        const x = i * (cell + gap);
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
              {base}^{power}
            </text>
            <rect
              x={x}
              y={20}
              width={cell}
              height={cell}
              rx={4}
              className="fill-primary/20 stroke-primary"
              strokeWidth={1.5}
            />
            <text
              x={x + cell / 2}
              y={20 + cell / 2 + 5}
              textAnchor="middle"
              className="fill-primary"
              fontSize={15}
              fontFamily="monospace"
              fontWeight={600}
            >
              {d.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const BASE_LABEL: Record<Base, string> = {
  2: "binary (base 2)",
  8: "octal (base 8)",
  10: "decimal (base 10)",
  16: "hexadecimal (base 16)",
};

function buildSteps(raw: string, from: Base, conv: Record<Base, string>): Step[] {
  const n = parseFromBase(raw, from);
  const abs = n < 0n ? -n : n;
  const sign = n < 0n ? "-" : "";
  const digits = raw.trim().replace(/^-/, "").toLowerCase();
  // "Read in": weighted-sum expansion when the source isn't decimal
  const readSteps: Step[] = [];
  if (from !== 10) {
    const terms: string[] = [];
    const values: string[] = [];
    for (let i = 0; i < digits.length; i++) {
      const ch = digits[i];
      const d = ch >= "a" ? ch.charCodeAt(0) - 87 : ch.charCodeAt(0) - 48;
      const power = digits.length - 1 - i;
      terms.push(`${d}·${from}^${power}`);
      values.push(String(BigInt(d) * BigInt(from) ** BigInt(power)));
    }
    readSteps.push(
      {
        title: "Given",
        body: (
          <FormulaBlock>
            value = {sign}
            {raw.trim().replace(/^-/, "").toUpperCase()} in {BASE_LABEL[from]}
          </FormulaBlock>
        ),
      },
      {
        title: "Write the formula",
        body: (
          <FormulaWithLegend
            formula={
              <>
                n = Σ digit<sub>i</sub> × base<sup>i</sup>
              </>
            }
            legend={[
              { sym: "digit_i", def: "digit at position i (rightmost = 0)" },
              { sym: "base", def: `source base — here ${from}` },
            ]}
          />
        ),
      },
      {
        title: "Substitute — expand and sum",
        body: (
          <FormulaBlock>
            {sign}({terms.join(" + ")})
            {"\n"}= {sign}({values.join(" + ")})
            {"\n"}= {n.toString()}
          </FormulaBlock>
        ),
      },
      {
        title: "Answer (decimal)",
        body: <FormulaBlock>n = {conv[10]}</FormulaBlock>,
      },
    );
  }
  // "Write out": repeated division by target base for one non-source, non-decimal target
  const targets: Base[] = ([2, 8, 10, 16] as Base[]).filter((b) => b !== from);
  const writeTarget: Base | undefined = targets.find((b) => b !== 10) ?? targets[0];
  const writeSteps: Step[] = [];
  if (writeTarget !== undefined) {
    const b = BigInt(writeTarget);
    const rows: string[] = [];
    let x = abs;
    if (x === 0n) {
      rows.push("0 ÷ " + writeTarget + " → quotient 0, remainder 0 (digit 0)");
    } else {
      while (x > 0n) {
        const q = x / b;
        const r = x % b;
        const digitChar =
          Number(r) < 10 ? String(Number(r)) : String.fromCharCode(65 + Number(r) - 10);
        rows.push(`${x} ÷ ${writeTarget} → quotient ${q}, remainder ${r} (digit ${digitChar})`);
        x = q;
      }
    }
    writeSteps.push(
      {
        title: "Given",
        body: <FormulaBlock>n = {conv[10]} (decimal)</FormulaBlock>,
      },
      {
        title: "Write the formula",
        body: (
          <FormulaWithLegend
            formula={
              <>
                n<sub>k+1</sub> = ⌊n<sub>k</sub> / b⌋,&nbsp; digit<sub>k</sub> = n<sub>k</sub> mod b
              </>
            }
            legend={[
              { sym: "b", def: `target base — here ${writeTarget}` },
              { sym: "n_k", def: "quotient at step k (starts at n)" },
              { sym: "read", def: "remainders read bottom-up form the digits" },
            ]}
          />
        ),
      },
      {
        title: `Substitute — repeated division by ${writeTarget}`,
        body: <FormulaBlock>{rows.join("\n")}</FormulaBlock>,
      },
      {
        title: `Answer in ${BASE_LABEL[writeTarget]}`,
        body: (
          <FormulaBlock>
            {sign}
            {toBase(abs, writeTarget)}
          </FormulaBlock>
        ),
      },
    );
  }
  return [...readSteps, ...writeSteps];
}


function NumberBasePage() {
  const [from, setFrom] = useState<Base>(10);
  const [value, setValue] = useState("255");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<
    | null
    | { conv: Record<Base, string>; steps: Step[] }
  >(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    try {
      const conv = convertAll(value, from);
      const steps = buildSteps(value, from, conv);
      setResult({ conv, steps });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <MathCalcPage
      name="Number Base Converter"
      tagline="One tool for binary ↔ octal ↔ decimal ↔ hexadecimal. Enter a value in any base and see all four representations."
      extras={
        <>
          <CalcSection title="What is a number base?">
            <p>
              Every positional number system works the same way — the base just
              changes how many digits each position can hold. Decimal (base 10)
              uses ten digits per position; binary (base 2) uses two; hexadecimal
              (base 16) uses sixteen, borrowing A through F for the extra six.
              The <em>value</em> a written number represents is identical across
              all four; only its notation changes.
            </p>
            <p>
              Programmers reach for hex and binary constantly — colour codes,
              bitmasks, memory addresses, file signatures — while networking and
              classic Unix permissions still lean on octal. This tool runs on
              arbitrary-precision integers, so very large values (32-, 64-, even
              256-bit) convert without losing accuracy.
            </p>
          </CalcSection>

          <CalcSection title="Number base converter, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing this tool does with your input —
              how it reads the source base, how it writes the target base,
              and why arbitrary-precision integers matter for large values.
            </p>
            <GuideCards items={NB_GUIDE} />
          </CalcSection>

          <CalcSection title="Digit reference (0–15 across all four bases)">
            <div className="overflow-x-auto rounded-2xl border border-border/60">
              <table className="min-w-full text-left text-sm tabular-nums">
                <thead className="bg-secondary/40 text-foreground">
                  <tr>
                    <th className="px-3 py-2">Decimal</th>
                    <th className="px-3 py-2">Binary</th>
                    <th className="px-3 py-2">Octal</th>
                    <th className="px-3 py-2">Hex</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 16 }, (_, i) => (
                    <tr key={i} className="odd:bg-background/40">
                      <td className="px-3 py-1.5">{i}</td>
                      <td className="px-3 py-1.5">{i.toString(2).padStart(4, "0")}</td>
                      <td className="px-3 py-1.5">{i.toString(8)}</td>
                      <td className="px-3 py-1.5">{i.toString(16).toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CalcSection>


          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
            "Convert numbers between any two bases from 2 to 36",
            "Supports fractional (radix-point) numbers, not just integers",
            "Shows the step-by-step division/multiplication working",
            "Quick presets for binary, octal, decimal, and hexadecimal",
            "Validates digits against the chosen base before converting",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "Why is hex used for colours?", a: <p>Because two hex digits map exactly to one byte (0–255), which is the range of each RGB channel.</p> },
                { q: "What's the difference between hex A and decimal 10?", a: <p>They are the same value — hex just uses a single symbol instead of two digits.</p> },
                { q: "Where is octal still used?", a: <p>Mostly in Unix file permissions (chmod 755) and a few legacy computing contexts.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/binary-calculator", label: "Binary Calculator" },
                { to: "/calculators/math/scientific-calculator", label: "Scientific Calculator" },
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="From base" htmlFor="from">
          <select
            id="from"
            value={from}
            onChange={(e) => setFrom(Number(e.target.value) as Base)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {BASES.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </Field>
        <Field
          label="Value"
          htmlFor="val"
          hint={BASES.find((b) => b.value === from)?.hint}
        >
          <TextInput id="val" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">Convert</PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BASES.map((b) => (
            <div key={b.value} className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{b.label}</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="break-all font-display text-lg font-semibold tabular-nums text-foreground">
                  {result.conv[b.value]}
                </div>
                <CopyButton text={result.conv[b.value]} />
              </div>
            </div>
          ))}
        </div>
      )}
      {result && <PlaceValueDiagram value={value} base={from} />}
      {result && result.steps.length > 0 && (
        <div className="mt-5">
          <StepsToggle steps={result.steps} />
        </div>
      )}
    </MathCalcPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function ReadInMini() {
  const digits = ["F", "F"];
  const weights = ["16", "1"];
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      {digits.map((d, i) => (
        <g key={i}>
          <rect x={70 + i * 50} y="18" width="40" height="32" rx="4" className="fill-primary/15 stroke-primary" />
          <text x={90 + i * 50} y="40" textAnchor="middle" className="fill-primary font-mono" fontSize="16" fontWeight="700">{d}</text>
          <text x={90 + i * 50} y="64" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="10">×{weights[i]}</text>
        </g>
      ))}
      <line x1="30" y1="78" x2="210" y2="78" stroke="var(--color-border)" />
      <text x="120" y="98" textAnchor="middle" className="fill-foreground font-mono" fontSize="11">15·16 + 15·1</text>
      <text x="120" y="118" textAnchor="middle" className="fill-primary font-mono" fontSize="14" fontWeight="700">= 255</text>
    </svg>
  );
}

function WriteOutMini() {
  const rows = [
    ["255 ÷ 16", "15", "15 = F"],
    ["15 ÷ 16", "0", "15 = F"],
  ];
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="20" className="fill-muted-foreground font-mono" fontSize="10">divide</text>
      <text x="110" y="20" className="fill-muted-foreground font-mono" fontSize="10">quo</text>
      <text x="170" y="20" className="fill-muted-foreground font-mono" fontSize="10">rem→digit</text>
      {rows.map((r, i) => (
        <g key={i}>
          <text x="10" y={44 + i * 22} className="fill-foreground font-mono" fontSize="11">{r[0]}</text>
          <text x="110" y={44 + i * 22} className="fill-foreground font-mono" fontSize="11">{r[1]}</text>
          <text x="170" y={44 + i * 22} className="fill-primary font-mono" fontSize="11" fontWeight="700">{r[2]}</text>
        </g>
      ))}
      <text x="10" y="122" className="fill-primary font-mono" fontSize="12" fontWeight="700">read up → FF₁₆</text>
    </svg>
  );
}

function BigNumMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="120" y="30" textAnchor="middle" className="fill-foreground font-mono" fontSize="10">2¹²⁸ − 1 in three bases</text>
      <text x="10" y="56" className="fill-foreground font-mono" fontSize="9">dec: 340282366920938…455</text>
      <text x="10" y="76" className="fill-foreground font-mono" fontSize="9">hex: FFFF FFFF FFFF FFFF…</text>
      <text x="10" y="96" className="fill-foreground font-mono" fontSize="9">bin: 1111 1111 1111 1111…</text>
      <line x1="10" y1="105" x2="230" y2="105" stroke="var(--color-border)" />
      <text x="120" y="122" textAnchor="middle" className="fill-primary font-mono" fontSize="10">same value, three notations</text>
    </svg>
  );
}

const NB_GUIDE: GuideCardItem[] = [
  {
    key: "read",
    title: "Reading your input — weighted sum of digits",
    explain: (
      <>The converter treats every digit in your input as a coefficient
      multiplied by the source base raised to that digit's position. Summing
      those products gives the numeric value in "plain integer" form — this
      is the step that turns your typed string into a number the tool can
      re-express in any other base.</>
    ),
    formula: <>value = Σ digit<sub>i</sub> × base<sup>i</sup></>,
    legend: [{ sym: "digit_i", def: "digit at position i (rightmost = 0)" }, { sym: "base", def: "source base 2–36" }],
    diagram: <ReadInMini />,
    example: { given: "FF in base 16", substitute: "15·16 + 15·1", answer: "255" },
  },
  {
    key: "write",
    title: "Writing the output — repeated division by the target base",
    explain: (
      <>To emit each result the calculator divides the integer value by the
      target base, records the remainder, and repeats on the quotient until
      zero. The remainders read bottom-up are the digits of the answer;
      values 10 and above become letters A, B, C… up to Z for base 36.</>
    ),
    formula: <>n<sub>k+1</sub> = ⌊n<sub>k</sub> / b⌋, digit<sub>k</sub> = n<sub>k</sub> mod b</>,
    legend: [{ sym: "b", def: "target base" }, { sym: "n_k", def: "quotient at step k, starts at your value" }],
    diagram: <WriteOutMini />,
    example: { given: "255 → base 16", substitute: "255 = 15·16 + 15", answer: "FF₁₆" },
  },
  {
    key: "bigint",
    title: "Arbitrary precision — why 256-bit values still convert exactly",
    explain: (
      <>The tool runs on JavaScript's native BigInt, so there is no 64-bit
      wraparound and no floating-point rounding. Address masks, hash digests,
      and cryptographic constants convert digit-for-digit regardless of
      length — the four output boxes always show the <em>same</em> exact
      number in binary, octal, decimal, and hex.</>
    ),
    formula: <>identical value, four notations</>,
    diagram: <BigNumMini />,
    example: { given: "2¹²⁸ − 1", substitute: "convert to hex", answer: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF" },
  },
];
