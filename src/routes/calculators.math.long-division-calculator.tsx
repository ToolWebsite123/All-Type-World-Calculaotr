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
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

export const Route = createFileRoute("/calculators/math/long-division-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Long Division Calculator",
      title: "Long Division Calculator — Steps, Remainder & Decimals",
      metaDescription:
        "Divide two whole numbers with the classic long-division layout. See the quotient, remainder and every divide-multiply-subtract-bring-down step.",
      canonicalUrl: "/calculators/math/long-division-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Long Division Calculator",
          path: "/calculators/math/long-division-calculator",
        },
      ],
      faqs: [
        {
          q: "How do I do long division with decimals?",
          a: "First divide normally until you use up all the dividend digits. If a nonzero remainder is left, place a decimal point in the quotient, then keep bringing down zeros (as if the dividend has '.000…' after it) and dividing until the remainder is zero or you have enough decimal places.",
        },
        {
          q: "What do I do when the divisor doesn't go in evenly?",
          a: "You have two choices. Stop and report a whole-number quotient plus a remainder (e.g. 17 ÷ 5 = 3 R 2), or keep going into decimals by appending zeros to the dividend and continuing the same divide-multiply-subtract-bring-down loop.",
        },
        {
          q: "Why do I write nothing in the quotient sometimes?",
          a: "You only start writing quotient digits once the running number is at least as big as the divisor. Before that you keep bringing digits down. Once you have started writing, any step where the divisor doesn't fit still gets a '0' written above.",
        },
        {
          q: "Can I divide by a multi-digit number?",
          a: "Yes. The method is identical — you estimate how many times the divisor fits into the current portion, write that as the next quotient digit, multiply, subtract, and bring down the next dividend digit.",
        },
      ],
    }),
  component: LongDivisionPage,
});

// ------------ Guide cards ------------

function LdMini({ rows }: { rows: { text: string; className?: string }[] }) {
  return (
    <div className="flex h-full min-h-[140px] items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <pre className="whitespace-pre font-mono text-[13px] leading-6 text-foreground">
        {rows.map((r, i) => (
          <span key={i} className={r.className ?? ""}>
            {r.text}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}

const LD_GUIDE: GuideCardItem[] = [
  {
    key: "divide",
    title: "1. Divide — how many times does the divisor fit?",
    explain: (
      <>
        Read enough leading digits of the dividend so that the running number
        is at least as big as the divisor. Ask: how many whole times does the
        divisor fit in? Write that count above the last digit you used.
      </>
    ),
    formula: <>q = ⌊current ÷ divisor⌋</>,
    legend: [
      { sym: "current", def: "the digits you've collected so far" },
      { sym: "q", def: "next quotient digit written above the bar" },
    ],
    diagram: (
      <LdMini
        rows={[
          { text: "     1        ", className: "text-primary font-semibold" },
          { text: "   ─────      ", className: "text-muted-foreground" },
          { text: " 7 ) 1 2 5 8  " },
        ]}
      />
    ),
    example: {
      given: <>1258 ÷ 7 — start with "12" (since "1" &lt; 7)</>,
      substitute: <>⌊12 ÷ 7⌋ = 1</>,
      answer: <>write 1 above the 2</>,
    },
  },
  {
    key: "multiply",
    title: "2. Multiply — the divisor times the new quotient digit",
    explain: (
      <>
        Multiply the divisor by the digit you just wrote and place the product
        directly under the digits you were looking at. This is the largest
        multiple of the divisor that still fits.
      </>
    ),
    formula: <>product = q × divisor</>,
    legend: [
      { sym: "q", def: "quotient digit from step 1" },
      { sym: "product", def: "written under the current digits" },
    ],
    diagram: (
      <LdMini
        rows={[
          { text: "     1        ", className: "text-primary font-semibold" },
          { text: " 7 ) 1 2 5 8  " },
          { text: "    − 7       ", className: "text-foreground/90" },
          { text: "    ───       ", className: "text-muted-foreground" },
        ]}
      />
    ),
    example: {
      given: <>q = 1, divisor = 7</>,
      substitute: <>1 × 7 = 7</>,
      answer: <>write 7 under the "12"</>,
    },
  },
  {
    key: "subtract",
    title: "3. Subtract — find the leftover",
    explain: (
      <>
        Subtract the product from the digits above it and draw a short line.
        The result is the leftover — always smaller than the divisor, or you
        chose too small a quotient digit in step 1.
      </>
    ),
    formula: <>leftover = current − product</>,
    legend: [
      { sym: "leftover", def: "must be less than the divisor" },
    ],
    diagram: (
      <LdMini
        rows={[
          { text: " 7 ) 1 2 5 8  " },
          { text: "    − 7       ", className: "text-foreground/90" },
          { text: "    ───       ", className: "text-muted-foreground" },
          { text: "      5       ", className: "text-primary font-semibold" },
        ]}
      />
    ),
    example: {
      given: <>current = 12, product = 7</>,
      substitute: <>12 − 7 = 5</>,
      answer: <>5 is the leftover so far</>,
    },
  },
  {
    key: "bringdown",
    title: "4. Bring down — pick up the next dividend digit",
    explain: (
      <>
        Copy the next unused digit of the dividend down beside the leftover to
        form the new running number. Return to step 1 with this bigger number
        and repeat until every dividend digit has been used.
      </>
    ),
    formula: <>new current = leftover · 10 + next digit</>,
    legend: [{ sym: "next digit", def: "the next digit of the dividend" }],
    diagram: (
      <LdMini
        rows={[
          { text: "     1  7  9  ", className: "text-primary font-semibold" },
          { text: " 7 ) 1 2 5 8  " },
          { text: "    − 7       " },
          { text: "    ───       ", className: "text-muted-foreground" },
          { text: "      5 5     " },
        ]}
      />
    ),
    example: {
      given: <>leftover 5, next digit 5</>,
      substitute: <>5·10 + 5 = 55, then ⌊55 ÷ 7⌋ = 7</>,
      answer: <>write 7 above the 5, continue to get 179 R 5</>,
    },
  },
  {
    key: "decimals",
    title: "Continuing past the decimal point",
    explain: (
      <>
        To turn the remainder into decimals, place a decimal point in the
        quotient after the last integer digit, then pretend the dividend has
        ".000…" tacked on. Bring down a zero, divide, and repeat as many times
        as you need.
      </>
    ),
    formula: <>append .0, bring down, repeat</>,
    legend: [
      { sym: "R", def: "the remainder you're extending" },
    ],
    diagram: (
      <LdMini
        rows={[
          { text: "  1 7 9 . 7   ", className: "text-primary font-semibold" },
          { text: " 7 ) 1 2 5 8 . 0" },
          { text: "              " },
          { text: "        5 0   " },
          { text: "      − 4 9   " },
          { text: "        ───   ", className: "text-muted-foreground" },
          { text: "          1   " },
        ]}
      />
    ),
    example: {
      given: <>1258 ÷ 7 leaves remainder 5</>,
      substitute: <>bring down 0 → 50; ⌊50 ÷ 7⌋ = 7 remainder 1</>,
      answer: <>1258 ÷ 7 ≈ 179.7…</>,
    },
  },
];



// ------------ Long-division engine ------------

type LDStep = {
  endCol: number;
  current: number;
  q: number;
  product: number;
  remainder: number;
};

type LDResult = {
  W: number;
  quotientChars: string[];
  dividendChars: string[];
  steps: LDStep[];
  integerQuotient: number;
  integerRemainder: number;
  decimalPlaces: number;
  hasDecimal: boolean;
  finalRemainder: number;
  quotientString: string;
  truncated: boolean;
};

function longDivide(
  dividendStr: string,
  divisor: number,
  maxDecimals: number,
): LDResult {
  const allDigits = dividendStr.split("").map(Number);
  const steps: LDStep[] = [];
  const quotientChars: string[] = [];
  const dividendChars: string[] = dividendStr.split("");

  let current = 0;
  let started = false;
  let colIdx = 0;

  for (let i = 0; i < allDigits.length; i++) {
    current = current * 10 + allDigits[i];
    const q = Math.floor(current / divisor);
    if (!started && q === 0) {
      quotientChars.push(" ");
      colIdx++;
      continue;
    }
    started = true;
    const product = q * divisor;
    const remainder = current - product;
    quotientChars.push(String(q));
    steps.push({ endCol: colIdx, current, q, product, remainder });
    current = remainder;
    colIdx++;
  }

  if (!started) {
    // Dividend < divisor, quotient's integer part is 0.
    quotientChars[quotientChars.length - 1] = "0";
  }

  const integerRemainder = current;
  const integerQuotient = Number(
    quotientChars.join("").trim().replace(/^$/, "0"),
  );

  let hasDecimal = false;
  let decimalCount = 0;
  if (maxDecimals > 0 && integerRemainder !== 0) {
    hasDecimal = true;
    quotientChars.push(".");
    dividendChars.push(".");
    colIdx++;
    while (current !== 0 && decimalCount < maxDecimals) {
      current = current * 10;
      const q = Math.floor(current / divisor);
      const product = q * divisor;
      const remainder = current - product;
      quotientChars.push(String(q));
      dividendChars.push("0");
      steps.push({ endCol: colIdx, current, q, product, remainder });
      current = remainder;
      colIdx++;
      decimalCount++;
    }
  }

  const finalRemainder = current;
  const truncated = hasDecimal && finalRemainder !== 0;
  const quotientString = quotientChars.join("").trimStart();

  return {
    W: quotientChars.length,
    quotientChars,
    dividendChars,
    steps,
    integerQuotient,
    integerRemainder,
    decimalPlaces: decimalCount,
    hasDecimal,
    finalRemainder,
    quotientString,
    truncated,
  };
}

function buildRows(res: LDResult): string[] {
  const { W, steps, dividendChars } = res;
  const rows: string[] = [];
  for (let k = 0; k < steps.length; k++) {
    const s = steps[k];
    const e = s.endCol;
    const pStr = String(s.product);
    const pStart = e - pStr.length + 1;

    const productRow = " ".repeat(W).split("");
    if (pStart - 1 >= 0) productRow[pStart - 1] = "−";
    for (let i = 0; i < pStr.length; i++) productRow[pStart + i] = pStr[i];
    rows.push(productRow.join(""));

    const dashRow = " ".repeat(W).split("");
    for (let c = pStart; c <= e; c++) dashRow[c] = "─";
    rows.push(dashRow.join(""));

    const rStr = String(s.remainder);
    const rStart = e - rStr.length + 1;
    const remRow = " ".repeat(W).split("");
    for (let i = 0; i < rStr.length; i++) remRow[rStart + i] = rStr[i];
    const nextE = k + 1 < steps.length ? steps[k + 1].endCol : e;
    for (let c = e + 1; c <= nextE; c++) {
      remRow[c] = dividendChars[c] ?? " ";
    }
    rows.push(remRow.join(""));
  }
  return rows;
}

// ------------ Visual layout ------------

function LongDivisionVisual({
  res,
  divisor,
}: {
  res: LDResult;
  divisor: number;
}) {
  const { W, quotientChars, dividendChars } = res;
  const prefix = `${divisor} ) `;
  const pad = " ".repeat(prefix.length);
  const bar = "─".repeat(W);
  const rows = buildRows(res);

  const quotientLine = pad + quotientChars.join("");
  const barLine = pad + bar;
  const dividendLine = prefix + dividendChars.join("");

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <pre className="whitespace-pre font-mono text-[13px] leading-6 sm:text-sm sm:leading-7">
        <span className="font-semibold text-primary">{quotientLine}</span>
        {"\n"}
        <span className="text-muted-foreground">{barLine}</span>
        {"\n"}
        <span className="text-foreground">{dividendLine}</span>
        {"\n"}
        {rows.map((r, i) => (
          <span
            key={i}
            className={
              i % 3 === 1
                ? "text-muted-foreground"
                : i % 3 === 0
                  ? "text-foreground/90"
                  : "text-foreground"
            }
          >
            {r}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}

// ------------ Page component ------------

function buildDivisionSteps(res: LDResult, a: number, b: number): Step[] {
  const steps: Step[] = res.steps.map((s, i) => ({
    title: `Divide, multiply, subtract, bring down (step ${i + 1})`,
    body: (
      <>
        Bring down digits to get <strong>{s.current}</strong>. {b} goes into{" "}
        {s.current} <strong>{s.q}</strong> time{s.q === 1 ? "" : "s"}: {s.q} ×{" "}
        {b} = {s.product}. Subtract: {s.current} − {s.product} ={" "}
        <strong>{s.remainder}</strong>.
      </>
    ),
  }));
  steps.push({
    title: "Final result",
    body: res.hasDecimal ? (
      <>
        Quotient ≈ <strong>{res.quotientString}{res.truncated ? "…" : ""}</strong>{" "}
        (continued to {res.decimalPlaces} decimal place{res.decimalPlaces === 1 ? "" : "s"}).
      </>
    ) : (
      <>
        {a} = {res.integerQuotient} × {b} + {res.integerRemainder}, so the
        quotient is <strong>{res.integerQuotient}</strong> with remainder{" "}
        <strong>{res.integerRemainder}</strong>.
      </>
    ),
  });
  return steps;
}

function LongDivisionPage() {
  const [dividendStr, setDividendStr] = useState("1258");
  const [divisorStr, setDivisorStr] = useState("7");
  const [decimalsStr, setDecimalsStr] = useState("0");
  const [res, setRes] = useState<LDResult | null>(null);
  const [inputs, setInputs] = useState<{ a: number; b: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setRes(null);
    setInputs(null);

    const rawA = dividendStr.trim().replace(/[,\s_]/g, "");
    const rawB = divisorStr.trim().replace(/[,\s_]/g, "");
    const a = Number(rawA);
    const b = Number(rawB);
    const dp = Number(decimalsStr.trim() || "0");

    if (!/^\d+$/.test(rawA) || !/^\d+$/.test(rawB)) {
      setErr("Enter non-negative whole numbers for the dividend and divisor.");
      return;
    }
    if (b === 0) {
      setErr("Divisor cannot be zero.");
      return;
    }
    if (rawA.length > 15) {
      setErr("Dividend must be at most 15 digits.");
      return;
    }
    if (!Number.isFinite(b) || b > 1e9) {
      setErr("Divisor must be at most 1,000,000,000.");
      return;
    }
    if (!Number.isInteger(dp) || dp < 0 || dp > 20) {
      setErr("Decimal places must be a whole number between 0 and 20.");
      return;
    }

    const stripped = rawA.replace(/^0+(?=\d)/, "") || "0";
    setInputs({ a, b });
    setRes(longDivide(stripped, b, dp));
  };

  return (
    <MathCalcPage
      name="Long Division Calculator"
      tagline="Divide two whole numbers using the classic long-division layout. See the quotient, the remainder and the full divide–multiply–subtract–bring-down process, with an option to continue past the decimal point."
      extras={
        <>
          <CalcSection title="What is long division?">
            <p>
              Long division is the standard written method for dividing one
              whole number (the <em>dividend</em>) by another (the{" "}
              <em>divisor</em>) when the numbers are too big to divide in your
              head. Instead of tackling the whole dividend at once, you work
              through it one digit at a time from left to right — writing the
              answer (the <em>quotient</em>) above a horizontal bar and any
              leftover amount (the <em>remainder</em>) at the bottom. The
              relationship it enforces at every step is{" "}
              <span className="font-mono">
                dividend = quotient × divisor + remainder
              </span>
              .
            </p>
          </CalcSection>

          <CalcSection title="Long division, step by step">
            <p>
              Every stage of long division cycles through the same four moves
              on a smaller and smaller piece of the dividend. Below is what
              each move looks like using{" "}
              <span className="font-mono">1258 ÷ 7</span>.
            </p>
            <GuideCards items={LD_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Classic long-division layout with divisor, dividend, quotient and dashes aligned",
                "Every subtraction and bring-down shown in the same monospaced grid",
                "Whole-number mode returns quotient plus remainder (e.g. 17 ÷ 5 = 3 R 2)",
                "Decimal mode continues the division to any number of decimal places",
                "Handles leading zeros and multi-digit divisors correctly",
              ]}
            />
          </CalcSection>

          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "How do I do long division with decimals?",
                  a: (
                    <p>
                      Once you've used every digit of the dividend, put a
                      decimal point in the quotient and start bringing down
                      zeros. Each zero acts like the next digit of the
                      dividend, and the divide-multiply-subtract-bring-down
                      cycle continues normally until the remainder is zero or
                      you decide to stop.
                    </p>
                  ),
                },
                {
                  q: "What do I do when the divisor doesn't go in evenly?",
                  a: (
                    <p>
                      Either stop and record the leftover as a remainder
                      (e.g. 22 ÷ 5 = 4 R 2), or continue past the decimal
                      point by appending zeros. Both answers are correct — the
                      remainder form is exact, and the decimal form gives an
                      approximation to as many places as you want.
                    </p>
                  ),
                },
                {
                  q: "Why is there a 0 in the middle of my quotient?",
                  a: (
                    <p>
                      Because once you have started writing the quotient, you
                      must write a digit above every dividend digit you
                      process — even when the current number is smaller than
                      the divisor. In that case the divisor fits 0 times, so
                      you write a 0 and immediately bring the next digit down.
                    </p>
                  ),
                },
                {
                  q: "Can I use long division to divide by a multi-digit number?",
                  a: (
                    <p>
                      Yes. The steps don't change — the only harder part is
                      estimating how many times a multi-digit divisor fits
                      into the current number. Trial multiplication or
                      rounding the divisor to the nearest ten can help you
                      pick each quotient digit.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/fraction-calculator", label: "Fraction Calculator" },
                { to: "/calculators/math/rounding-calculator", label: "Rounding Calculator" },
                { to: "/calculators/math/modulo-calculator", label: "Modulo Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_140px_auto]">
        <Field label="Dividend" htmlFor="dividend">
          <TextInput
            id="dividend"
            value={dividendStr}
            onChange={(e) => setDividendStr(e.target.value)}
            placeholder="e.g. 1258"
            inputMode="numeric"
          />
        </Field>
        <Field label="Divisor" htmlFor="divisor">
          <TextInput
            id="divisor"
            value={divisorStr}
            onChange={(e) => setDivisorStr(e.target.value)}
            placeholder="e.g. 7"
            inputMode="numeric"
          />
        </Field>
        <Field
          label="Decimal places"
          htmlFor="dp"
          hint="0 = show remainder"
        >
          <TextInput
            id="dp"
            value={decimalsStr}
            onChange={(e) => setDecimalsStr(e.target.value)}
            placeholder="0"
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
      {res && inputs && (
        <>
          <ResultBox
            label={`${inputs.a} ÷ ${inputs.b}`}
            value={
              <span className="font-mono">
                {res.hasDecimal
                  ? `${res.quotientString}${res.truncated ? "…" : ""}`
                  : `${res.integerQuotient} R ${res.integerRemainder}`}
              </span>
            }
            note={
              res.hasDecimal ? (
                <>
                  Continued to {res.decimalPlaces} decimal place
                  {res.decimalPlaces === 1 ? "" : "s"}.
                  {res.truncated
                    ? " Remainder is not yet zero — the answer is truncated."
                    : " The division terminates exactly."}
                </>
              ) : (
                <span className="font-mono">
                  {inputs.a} = {res.integerQuotient} · {inputs.b} +{" "}
                  {res.integerRemainder}
                </span>
              )
            }
          />
          <LongDivisionVisual res={res} divisor={inputs.b} />
          <StepsToggle steps={buildDivisionSteps(res, inputs.a, inputs.b)} />
        </>
      )}
    </MathCalcPage>
  );
}
