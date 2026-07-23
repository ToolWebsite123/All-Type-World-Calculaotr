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

export const Route = createFileRoute("/calculators/math/log-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Log Calculator",
      title: "Log Calculator (Logarithm) — Any Base, Natural Log, ln",
      metaDescription:
        "Solve log_b(x) = y for any missing value. Supports base 10, natural log (ln, base e) and any positive base with step-by-step working.",
      canonicalUrl: "/calculators/math/log-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Log Calculator", path: "/calculators/math/log-calculator" },
      ],
      faqs: [
        {
          q: "What is the difference between log and ln?",
          a: "log usually means base 10 (the common log), while ln means base e ≈ 2.71828 (the natural log). Both are logarithms — they just use different bases.",
        },
        {
          q: "How do I change the base of a logarithm?",
          a: "Use the change-of-base formula: log_b(x) = log_k(x) / log_k(b). Any base k works, so you can compute log_7(20) on a calculator by dividing ln(20) by ln(7).",
        },
        {
          q: "Why is log of 0 undefined?",
          a: "Because no finite exponent y makes b^y equal 0. As x approaches 0, log_b(x) tends to negative infinity for any base b > 1.",
        },
        {
          q: "Can the base or argument be negative?",
          a: "For real-valued logarithms, both the base b and the argument x must be positive, and b must not equal 1. Negative or zero inputs have no real logarithm.",
        },
      ],
    }),
  component: LogPage,
});

// ------------ Guide cards ------------

function LogMini({ lines }: { lines: string[] }) {
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
    </div>
  );
}

const LOG_GUIDE: GuideCardItem[] = [
  {
    key: "inverse",
    title: "Log is the inverse of exponent",
    explain: (
      <>
        Every logarithm question is really an exponent question in disguise.
        "log base b of x equals y" is the same statement as "b to the power y
        equals x" — the log just isolates the exponent.
      </>
    ),
    formula: <>log_b(x) = y &nbsp;⟺&nbsp; b^y = x</>,
    legend: [
      { sym: "b", def: "base (b > 0, b ≠ 1)" },
      { sym: "x", def: "argument (x > 0)" },
      { sym: "y", def: "the exponent you're solving for" },
    ],
    diagram: <LogMini lines={["log₁₀(1000) = ?", "10^? = 1000", "y = 3"]} />,
    example: {
      given: <>b = 10, x = 1000</>,
      substitute: <>10^y = 1000</>,
      answer: <>y = 3</>,
    },
  },
  {
    key: "bases",
    title: "The three common bases — 10, e and 2",
    explain: (
      <>
        <strong>log</strong> means base 10 in most engineering and everyday
        use; <strong>ln</strong> means base e ≈ 2.71828 and is the natural log
        used across calculus and finance; <strong>base 2</strong> counts
        halvings and is standard in computer science.
      </>
    ),
    formula: (
      <div className="space-y-1">
        <div>log(x) = log₁₀(x)</div>
        <div>ln(x) = log_e(x)</div>
        <div>lg(x) = log₂(x)</div>
      </div>
    ),
    legend: [{ sym: "e", def: "Euler's constant ≈ 2.71828" }],
    diagram: <LogMini lines={["log(100) = 2", "ln(e) = 1", "log₂(8) = 3"]} />,
    example: {
      given: <>x = 100 in base 10</>,
      substitute: <>10^y = 100</>,
      answer: <>y = 2</>,
    },
  },
  {
    key: "productquotient",
    title: "Product and quotient rules — turn ×/÷ into +/−",
    explain: (
      <>
        Logs convert multiplication into addition and division into
        subtraction. This is why they made pre-calculator arithmetic
        possible — slide rules are just physical log scales.
      </>
    ),
    formula: (
      <div className="space-y-1">
        <div>log_b(x · y) = log_b(x) + log_b(y)</div>
        <div>log_b(x / y) = log_b(x) − log_b(y)</div>
      </div>
    ),
    legend: [{ sym: "x, y", def: "positive real numbers" }],
    diagram: <LogMini lines={["log(10 / 2)", "= log(10) − log(2)", "≈ 0.699"]} />,
    example: {
      given: <>log(10 / 2)</>,
      substitute: <>log(10) − log(2) ≈ 1 − 0.301</>,
      answer: <>0.699</>,
    },
  },
  {
    key: "power",
    title: "Power rule — pull the exponent to the front",
    explain: (
      <>
        A power inside a log becomes a multiplier outside it. This is the
        trick behind solving equations where the unknown sits in an exponent —
        take the log of both sides and the exponent drops down.
      </>
    ),
    formula: <>log_b(x^k) = k · log_b(x)</>,
    legend: [
      { sym: "k", def: "any real exponent" },
      { sym: "x", def: "positive base of the power" },
    ],
    diagram: <LogMini lines={["log(2^6)", "= 6 · log(2)", "≈ 1.806"]} />,
    example: {
      given: <>log(2^6)</>,
      substitute: <>6 · log(2) ≈ 6 × 0.301</>,
      answer: <>1.806</>,
    },
  },
  {
    key: "changeofbase",
    title: "Change of base — compute any log with ln or log",
    explain: (
      <>
        Most calculators only have <code>log</code> and <code>ln</code>. To
        get a log in any other base, divide two logs in a base you do have.
        This is exactly what this calculator does under the hood.
      </>
    ),
    formula: <>log_b(x) = log_k(x) / log_k(b)</>,
    legend: [
      { sym: "b", def: "base you want" },
      { sym: "k", def: "any convenient base (10 or e)" },
    ],
    diagram: <LogMini lines={["log₇(20)", "= ln(20) / ln(7)", "≈ 1.540"]} />,
    example: {
      given: <>b = 7, x = 20, k = e</>,
      substitute: <>ln(20) / ln(7) ≈ 2.996 / 1.946</>,
      answer: <>1.540</>,
    },
  },
];




function parseBase(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (t === "" ) return null;
  if (t === "e") return Math.E;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function format(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) return n.toExponential(6);
  return parseFloat(n.toPrecision(12)).toString();
}

type Solved = {
  solvedFor: "b" | "x" | "y";
  b: number;
  x: number;
  y: number;
  bLabel: string;
  steps: Step[];
};

function solve(bRaw: string, xRaw: string, yRaw: string):
  | { ok: true; result: Solved }
  | { ok: false; error: string } {
  const filled = [bRaw, xRaw, yRaw].filter((v) => v.trim() !== "").length;
  if (filled !== 2) {
    return {
      ok: false,
      error: "Leave exactly one field blank — fill in the other two.",
    };
  }

  const bParsed = bRaw.trim() === "" ? null : parseBase(bRaw);
  const xParsed = xRaw.trim() === "" ? null : parseNum(xRaw);
  const yParsed = yRaw.trim() === "" ? null : parseNum(yRaw);

  if (bRaw.trim() !== "" && bParsed === null)
    return { ok: false, error: "Base must be a positive number (or 'e')." };
  if (xRaw.trim() !== "" && xParsed === null)
    return { ok: false, error: "Argument x must be a valid number." };
  if (yRaw.trim() !== "" && yParsed === null)
    return { ok: false, error: "Result y must be a valid number." };

  const bLabelFrom = (v: number, raw: string) =>
    raw.trim().toLowerCase() === "e" ? "e" : format(v);

  // Solve for y
  if (yParsed === null && bParsed !== null && xParsed !== null) {
    if (bParsed <= 0 || bParsed === 1)
      return { ok: false, error: "Base must be positive and not equal to 1." };
    if (xParsed <= 0)
      return { ok: false, error: "Argument x must be positive for a real log." };
    const y = Math.log(xParsed) / Math.log(bParsed);
    const bLabel = bLabelFrom(bParsed, bRaw);
    return {
      ok: true,
      result: {
        solvedFor: "y",
        b: bParsed,
        x: xParsed,
        y,
        bLabel,
        steps: [
          {
            title: "Given",
            body: (
              <FormulaBlock>
                b = {bLabel}, &nbsp; x = {format(xParsed)}, &nbsp; y = ?
              </FormulaBlock>
            ),
          },
          {
            title: "Write the formula",
            body: (
              <FormulaWithLegend
                formula={<>log_b(x) = y &nbsp;⟺&nbsp; b^y = x &nbsp;⇒&nbsp; y = ln(x) ÷ ln(b)</>}
                legend={[
                  { sym: "b", def: "base (b > 0, b ≠ 1)" },
                  { sym: "x", def: "argument (x > 0)" },
                  { sym: "y", def: "the exponent we are solving for" },
                ]}
              />
            ),
          },
          {
            title: "Substitute",
            body: (
              <FormulaBlock>
                y = ln({format(xParsed)}) ÷ ln({bLabel}) = {format(Math.log(xParsed))} ÷ {format(Math.log(bParsed))}
              </FormulaBlock>
            ),
          },
          {
            title: "Answer",
            body: (
              <FormulaBlock>
                y = <strong>{format(y)}</strong>
              </FormulaBlock>
            ),
          },
        ],
      },
    };
  }

  // Solve for x
  if (xParsed === null && bParsed !== null && yParsed !== null) {
    if (bParsed <= 0 || bParsed === 1)
      return { ok: false, error: "Base must be positive and not equal to 1." };
    const x = Math.pow(bParsed, yParsed);
    const bLabel = bLabelFrom(bParsed, bRaw);
    return {
      ok: true,
      result: {
        solvedFor: "x",
        b: bParsed,
        x,
        y: yParsed,
        bLabel,
        steps: [
          {
            title: "Given",
            body: (
              <FormulaBlock>
                b = {bLabel}, &nbsp; y = {format(yParsed)}, &nbsp; x = ?
              </FormulaBlock>
            ),
          },
          {
            title: "Write the formula",
            body: (
              <FormulaWithLegend
                formula={<>log_b(x) = y &nbsp;⟺&nbsp; x = b^y</>}
                legend={[
                  { sym: "b", def: "base (b > 0, b ≠ 1)" },
                  { sym: "y", def: "the exponent" },
                  { sym: "x", def: "the argument we are solving for" },
                ]}
              />
            ),
          },
          {
            title: "Substitute",
            body: (
              <FormulaBlock>
                x = {bLabel}^{format(yParsed)}
              </FormulaBlock>
            ),
          },
          {
            title: "Answer",
            body: (
              <FormulaBlock>
                x = <strong>{format(x)}</strong>
              </FormulaBlock>
            ),
          },
        ],
      },
    };
  }

  // Solve for b
  if (bParsed === null && xParsed !== null && yParsed !== null) {
    if (yParsed === 0)
      return { ok: false, error: "Cannot solve for base when y = 0 (any base gives log_b(1) = 0)." };
    if (xParsed <= 0)
      return { ok: false, error: "Argument x must be positive." };
    const b = Math.pow(xParsed, 1 / yParsed);
    if (!Number.isFinite(b) || b <= 0 || b === 1)
      return { ok: false, error: "No valid positive base solves this equation." };
    return {
      ok: true,
      result: {
        solvedFor: "b",
        b,
        x: xParsed,
        y: yParsed,
        bLabel: format(b),
        steps: [
          {
            title: "Given",
            body: (
              <FormulaBlock>
                x = {format(xParsed)}, &nbsp; y = {format(yParsed)}, &nbsp; b = ?
              </FormulaBlock>
            ),
          },
          {
            title: "Write the formula",
            body: (
              <FormulaWithLegend
                formula={<>log_b(x) = y &nbsp;⟺&nbsp; b^y = x &nbsp;⇒&nbsp; b = x^(1÷y)</>}
                legend={[
                  { sym: "x", def: "the argument" },
                  { sym: "y", def: "the exponent" },
                  { sym: "b", def: "the base we are solving for" },
                ]}
              />
            ),
          },
          {
            title: "Substitute",
            body: (
              <FormulaBlock>
                b = {format(xParsed)}^(1 ÷ {format(yParsed)})
              </FormulaBlock>
            ),
          },
          {
            title: "Answer",
            body: (
              <FormulaBlock>
                b = <strong>{format(b)}</strong>
              </FormulaBlock>
            ),
          },
        ],
      },
    };
  }

  return { ok: false, error: "Enter two of the three fields." };
}


function LogCurvePlot({ b, x, y }: { b: number; x: number; y: number }) {
  if (!Number.isFinite(b) || b <= 0 || b === 1 || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const W = 340, H = 220, padL = 34, padR = 14, padT = 14, padB = 28;
  const iw = W - padL - padR, ih = H - padT - padB;
  const xMax = Math.max(x * 1.6, 10);
  const xMin = xMax / 200;
  const pts: [number, number][] = [];
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const px = xMin * Math.pow(xMax / xMin, i / steps);
    const py = Math.log(px) / Math.log(b);
    pts.push([px, py]);
  }
  const yVals = pts.map((p) => p[1]).concat([y]);
  const yLo = Math.min(...yVals) - 0.5;
  const yHi = Math.max(...yVals) + 0.5;
  const xTo = (v: number) => padL + (Math.log(v / xMin) / Math.log(xMax / xMin)) * iw;
  const yTo = (v: number) => padT + ih - ((v - yLo) / (yHi - yLo)) * ih;
  const path = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${xTo(px).toFixed(1)},${yTo(py).toFixed(1)}`).join(" ");
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card/30 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Graph of y = log_{Number.isFinite(b) ? b : ""}(x)</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[280px]" role="img" aria-label="Logarithm curve with the computed point marked">
        <line x1={padL} x2={W - padR} y1={yTo(0)} y2={yTo(0)} stroke="var(--color-border)" strokeWidth={1} />
        <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke="var(--color-border)" strokeWidth={1} />
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
        {x > 0 && Number.isFinite(y) && (
          <>
            <line x1={xTo(x)} x2={xTo(x)} y1={yTo(y)} y2={H - padB} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" strokeWidth={1} />
            <circle cx={xTo(x)} cy={yTo(y)} r={4} fill="var(--color-primary)" stroke="var(--color-background)" strokeWidth={1.5} />
          </>
        )}
        <text x={W - padR} y={H - 6} textAnchor="end" fontSize={10} fill="var(--color-muted-foreground)">x</text>
        <text x={padL + 4} y={padT + 10} fontSize={10} fill="var(--color-muted-foreground)">y</text>
      </svg>
    </div>
  );
}

function LogPage() {
  const [b, setB] = useState("10");
  const [x, setX] = useState("1000");
  const [y, setY] = useState("");
  const [result, setResult] = useState<Solved | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    const out = solve(b, x, y);
    if (!out.ok) {
      setErr(out.error);
      return;
    }
    setResult(out.result);
  };

  const label = result
    ? result.solvedFor === "y"
      ? `log_${result.bLabel}(${format(result.x)}) =`
      : result.solvedFor === "x"
        ? `x =`
        : `b =`
    : "";
  const value = result
    ? result.solvedFor === "y"
      ? format(result.y)
      : result.solvedFor === "x"
        ? format(result.x)
        : format(result.b)
    : "";

  return (
    <MathCalcPage
      name="Log Calculator (Logarithm)"
      tagline="Solve log_b(x) = y for any one missing value. Leave one field blank — the calculator fills it in. Enter e in the base field for the natural log (ln)."
      extras={
        <>
          <CalcSection title="What is a logarithm?">
            <p>
              A logarithm is the inverse of exponentiation. The equation{" "}
              <code>x = b^y</code> and the equation <code>y = log_b(x)</code>{" "}
              say exactly the same thing: y is the power the base b must be
              raised to in order to produce x. Three bases show up almost
              everywhere — <strong>base 10</strong> (written{" "}
              <code>log</code>, used in decibels, pH, Richter),{" "}
              <strong>base e</strong> (written <code>ln</code>, used in
              calculus and continuous growth) and <strong>base 2</strong>{" "}
              (the binary log used in computer science).
            </p>
          </CalcSection>

          <CalcSection title="Logarithms, rule by rule">
            <p>
              Each card explains one identity, shows the formula, and gives a
              worked value you can verify against the calculator.
            </p>
            <GuideCards items={LOG_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Solves for any of the three variables (base, argument, or result)",
                "Accepts e in the base field for natural logarithms (ln)",
                "Shows every step using the change-of-base formula",
                "Guards against invalid inputs (non-positive x, base ≤ 0 or = 1)",
                "Plots the curve y = log_b(x) with your point marked",
              ]}
            />
          </CalcSection>

          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What is the difference between log and ln?", a: <p>log usually means base 10, while ln means base e ≈ 2.71828. They are both logarithms — just different bases.</p> },
                { q: "How do I change the base of a logarithm?", a: <p>Use log_b(x) = log_k(x) / log_k(b). Any base k works.</p> },
                { q: "Why is log of 0 undefined?", a: <p>No finite exponent y makes b^y equal 0; as x → 0, log_b(x) → −∞.</p> },
                { q: "Can the base or argument be negative?", a: <p>For real logarithms both must be positive, and the base cannot be 1.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/scientific-calculator", label: "Scientific Calculator" },
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
                { to: "/calculators/math/root-calculator", label: "Root Calculator" },
                { to: "/calculators/math/scientific-notation-calculator", label: "Scientific Notation" },
                { to: "/calculators/math/half-life-calculator", label: "Half-Life Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Enter any two of the three values in <code>log_b(x) = y</code>. Type{" "}
        <code>e</code> in the base field for the natural log.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Base (b)" htmlFor="log-b">
          <TextInput
            id="log-b"
            inputMode="decimal"
            value={b}
            onChange={(e) => setB(e.target.value)}
            placeholder="10 or e"
          />
        </Field>
        <Field label="Argument (x)" htmlFor="log-x">
          <TextInput
            id="log-x"
            inputMode="decimal"
            value={x}
            onChange={(e) => setX(e.target.value)}
            placeholder="e.g. 1000"
          />
        </Field>
        <Field label="Result (y)" htmlFor="log-y">
          <TextInput
            id="log-y"
            inputMode="decimal"
            value={y}
            onChange={(e) => setY(e.target.value)}
            placeholder="leave blank to solve"
          />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
        <button
          type="button"
          onClick={() => {
            setB("");
            setX("");
            setY("");
            setResult(null);
            setErr(null);
          }}
          className="rounded-xl border border-border/60 bg-secondary/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/50"
        >
          Clear
        </button>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox label={label} value={value} />
          <LogCurvePlot b={result.b} x={result.x} y={result.y} />
          <StepsToggle steps={result.steps} />
        </>
      )}
      {/* end */}
    </MathCalcPage>
  );
}
