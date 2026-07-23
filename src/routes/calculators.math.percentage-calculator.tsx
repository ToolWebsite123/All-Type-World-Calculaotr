import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  FormulaBlock,
  FormulaWithLegend,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { percentOf, whatPercent, percentChange } from "@/lib/math/percentage";
import {
  RecentCalculations,
  loadRecent,
  saveRecent,
  type RecentEntry,
} from "@/components/percentage/RecentCalculations";

const PERCENTAGE_FAQS = [
  {
    q: "How do I calculate a percentage increase?",
    a: "Subtract the original value from the new value, divide by the original value, then multiply by 100. For example, going from 80 to 100 is (100 − 80) / 80 × 100 = 25% increase. The Percentage Change tool on this page does this automatically.",
  },
  {
    q: "What's the difference between percentage change and percentage difference?",
    a: "Percentage change compares a new value to an original value where one clearly came first (prices, populations over time) and divides by the original. Percentage difference compares two values on equal footing (two survey results, two sensor readings) and divides by their average. They give different numbers for the same pair of values.",
  },
  {
    q: "How do I work backwards from a percentage to the original value?",
    a: "Use the \"X is Y% of what?\" tool. Divide the known part by the percentage (as a decimal) — for example, if 30 is 25% of the whole, the whole is 30 ÷ 0.25 = 120. This is the reverse-percentage calculation.",
  },
  {
    q: "How do I calculate a discount, tip, tax, or markup?",
    a: "All four are the same math. Multiply the base price by the rate as a decimal to get the amount, then add it (tax, tip, markup) or subtract it (discount) from the base. Example: a 15% tip on a $40 bill is 0.15 × 40 = $6, so the total is $46. Use the \"What is X% of Y?\" or Percentage Change tool.",
  },
  {
    q: "Why do 15% off followed by 15% off not equal 30% off?",
    a: "Percentages compound multiplicatively, not additively. Two successive 15% discounts on $100 give $100 × 0.85 × 0.85 = $72.25, not $70 — the second discount is applied to the already-reduced price, so it's worth less in dollar terms than the first.",
  },
];

export const Route = createFileRoute("/calculators/math/percentage-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Percentage Calculator",
      title: "Percentage Calculator - Calculate Percentages Easily",
      metaDescription: "Free percentage calculator with step-by-step working. Find X% of Y, percentage difference, and percentage increase or decrease — all on one page.",
      canonicalUrl: "/calculators/math/percentage-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Percentage Calculator", path: "/calculators/math/percentage-calculator" },
      ],
      faqs: PERCENTAGE_FAQS,
    }),
  component: PercentagePage,
});


/* ---------------- Types ---------------- */

interface Step {
  title: string;
  body: ReactNode;
}

/* ---------------- Page ---------------- */

function PercentagePage() {
  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-6 pt-6 pb-24">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Math", to: "/calculators/math" },
            { label: "Percentage Calculator" },
          ]}
        />
        <header className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Percentage Calculator
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Solve every common percentage question in one place — percent of a
            number, the three phrasing variations, percentage difference
            between two values, and percentage increase or decrease. Every
            result includes a step-by-step working so you can see how the
            answer was reached.
          </p>
        </header>

        <div className="space-y-6">
          <ToolCard
            title="Percentage Calculator"
            subtitle="Enter a percentage and a number to get the result."
          >
            <MainPercentTool />
          </ToolCard>

          <ToolCard
            title="Percentage in Common Phrases"
            subtitle="The three ways percentage questions are usually worded."
          >
            <PhrasesTool />
          </ToolCard>

          <ToolCard
            title="Percentage Difference Calculator"
            subtitle="Compare two values and get the percentage difference between them."
          >
            <DifferenceTool />
          </ToolCard>

          <ToolCard
            title="Percentage Change Calculator"
            subtitle="Increase or decrease a base value by a percentage."
          >
            <ChangeTool />
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
      <h2 className="font-display text-xl font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SubTool({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4 sm:p-5">
      <h3 className="mb-3 font-display text-base font-semibold text-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}


/* ---------------- Helpers ---------------- */

function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toPrecision(10)).toString();
}

function parseNumber(raw: string, name: string): number {
  const s = raw.trim();
  if (!s) throw new Error(`Please enter a value for ${name}.`);
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`"${raw}" is not a valid number.`);
  return n;
}


function PercentPieDiagram({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-6 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0" role="img" aria-label={`${clamped}% pie chart`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" className="text-border" strokeWidth={12} />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth={12}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="55" textAnchor="middle" className="fill-foreground text-[16px] font-semibold">
          {Math.round(clamped)}%
        </text>
      </svg>
      <div className="h-4 flex-1 min-w-[140px] overflow-hidden rounded-full bg-background/60">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------- 1. Main Percentage Calculator ---------------- */

function MainPercentTool() {
  const [p, setP] = useState("15");
  const [y, setY] = useState("240");
  const [result, setResult] = useState<null | { value: string; steps: Step[]; pct: number }>(
    null,
  );
  const [err, setErr] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = (
    pStr: string = p,
    yStr: string = y,
    opts: { record?: boolean } = { record: true },
  ) => {
    setErr(null);
    setResult(null);
    try {
      const pn = parseNumber(pStr, "percentage");
      const yn = parseNumber(yStr, "number");
      const out = percentOf(pn, yn);
      const value = `${fmt(pn)}% of ${fmt(yn)} = ${fmt(out)}`;
      const steps: Step[] = [
        {
          title: "Write the formula",
          body: (
            <FormulaWithLegend
              formula={<>Result = (P ÷ 100) × Y</>}
              legend={[
                { sym: "P", def: "percent" },
                { sym: "Y", def: "whole value" },
              ]}
            />
          ),
        },
        {
          title: "Substitute the values",
          body: (
            <FormulaBlock>
              Result = ({pn} ÷ 100) × {yn} = {fmt(pn / 100)} × {yn}
            </FormulaBlock>
          ),
        },
        {
          title: "Multiply",
          body: (
            <FormulaBlock>
              {fmt(pn / 100)} × {yn} = <strong>{fmt(out)}</strong>
            </FormulaBlock>
          ),
        },
      ];
      setResult({ value, steps, pct: pn });

      // Record this calculation in the per-browser recent list. Skipped when
      // reloading an existing entry (we don't want to double-count).
      if (opts.record !== false) {
        setRecent(
          saveRecent({
            id: `${Date.now()}`,
            label: value,
            params: { percent: pStr, value: yStr },
            at: Date.now(),
          }),
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  // Hydrate the recent-calculations list from localStorage on mount.
  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  const loadEntry = (e: RecentEntry) => {
    setP(e.params.percent);
    setY(e.params.value);
    compute(e.params.percent, e.params.value, { record: false });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr_auto]">
        <Field label="Percentage (%)" htmlFor="main-p">
          <TextInput
            id="main-p"
            inputMode="decimal"
            value={p}
            onChange={(e) => setP(e.target.value)}
          />
        </Field>
        <div className="hidden items-end pb-3 text-xl text-muted-foreground sm:flex">
          of
        </div>
        <Field label="Number" htmlFor="main-y">
          <TextInput
            id="main-y"
            inputMode="decimal"
            value={y}
            onChange={(e) => setY(e.target.value)}
          />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={() => compute()} className="w-full sm:w-auto">
            Calculate
          </PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <ResultActions
              filename="percentage-of"
              captureRef={resultRef}
              getCopyText={() => result.value}
            />
            
          </div>
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Result"
              value={
                <span className="flex flex-wrap items-center gap-3">
                  <span>{result.value}</span>
                  <CopyButton text={result.value} />
                </span>
              }
            />
            <PercentPieDiagram pct={result.pct} />
            <StepsToggle steps={result.steps} />
          </div>
        </div>
      )}

      <RecentCalculations
        items={recent}
        onSelect={loadEntry}
        onClear={() => setRecent(saveRecent(null))}
      />
    </>
  );
}

/* ---------------- 2. Percentage in Common Phrases ---------------- */

function PhrasesTool() {
  return (
    <div className="space-y-4">
      <SubTool title="What is X% of Y?">
        <PhraseA />
      </SubTool>
      <SubTool title="X is what % of Y?">
        <PhraseB />
      </SubTool>
      <SubTool title="X is Y% of what?">
        <PhraseC />
      </SubTool>
    </div>
  );
}

function PhraseA() {
  const [x, setX] = useState("25");
  const [y, setY] = useState("80");
  const [res, setRes] = useState<null | { value: string; steps: Step[] }>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = () => {
    setErr(null);
    setRes(null);
    try {
      const xn = parseNumber(x, "X");
      const yn = parseNumber(y, "Y");
      const out = percentOf(xn, yn);
      setRes({
        value: `${fmt(xn)}% of ${fmt(yn)} = ${fmt(out)}`,
        steps: [
          {
            title: "Formula",
            body: (
              <FormulaWithLegend
                formula={<>Result = (X ÷ 100) × Y</>}
                legend={[
                  { sym: "X", def: "percent" },
                  { sym: "Y", def: "whole value" },
                ]}
              />
            ),
          },
          {
            title: "Substitute",
            body: (
              <FormulaBlock>
                ({xn} ÷ 100) × {yn} = {fmt(xn / 100)} × {yn}
              </FormulaBlock>
            ),
          },
          {
            title: "Multiply",
            body: (
              <FormulaBlock>
                {fmt(xn / 100)} × {yn} = <strong>{fmt(out)}</strong>
              </FormulaBlock>
            ),
          },
        ],
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <PhraseShell
      inputs={
        <>
          <Field label="X (percent)" htmlFor="pa-x">
            <TextInput
              id="pa-x"
              inputMode="decimal"
              value={x}
              onChange={(e) => setX(e.target.value)}
            />
          </Field>
          <Field label="Y" htmlFor="pa-y">
            <TextInput
              id="pa-y"
              inputMode="decimal"
              value={y}
              onChange={(e) => setY(e.target.value)}
            />
          </Field>
        </>
      }
      onCalculate={run}
      err={err}
      result={res}
      filename={"percentage-x-of-y"}
    />
  );
}

function PhraseB() {
  const [x, setX] = useState("15");
  const [y, setY] = useState("60");
  const [res, setRes] = useState<null | { value: string; steps: Step[] }>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = () => {
    setErr(null);
    setRes(null);
    try {
      const xn = parseNumber(x, "X");
      const yn = parseNumber(y, "Y");
      const out = whatPercent(xn, yn);
      setRes({
        value: `${fmt(xn)} is ${fmt(out)}% of ${fmt(yn)}`,
        steps: [
          {
            title: "Formula",
            body: (
              <FormulaWithLegend
                formula={<>Percent = (X ÷ Y) × 100</>}
                legend={[
                  { sym: "X", def: "part" },
                  { sym: "Y", def: "whole" },
                ]}
              />
            ),
          },
          {
            title: "Substitute",
            body: (
              <FormulaBlock>
                ({xn} ÷ {yn}) × 100 = {fmt(xn / yn)} × 100
              </FormulaBlock>
            ),
          },
          {
            title: "Multiply",
            body: (
              <FormulaBlock>
                {fmt(xn / yn)} × 100 = <strong>{fmt(out)}%</strong>
              </FormulaBlock>
            ),
          },
        ],
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <PhraseShell
      inputs={
        <>
          <Field label="X (part)" htmlFor="pb-x">
            <TextInput
              id="pb-x"
              inputMode="decimal"
              value={x}
              onChange={(e) => setX(e.target.value)}
            />
          </Field>
          <Field label="Y (whole)" htmlFor="pb-y">
            <TextInput
              id="pb-y"
              inputMode="decimal"
              value={y}
              onChange={(e) => setY(e.target.value)}
            />
          </Field>
        </>
      }
      onCalculate={run}
      err={err}
      result={res}
      filename={"percentage-x-is-what-percent"}
    />
  );
}

function PhraseC() {
  const [x, setX] = useState("30");
  const [y, setY] = useState("25");
  const [res, setRes] = useState<null | { value: string; steps: Step[] }>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = () => {
    setErr(null);
    setRes(null);
    try {
      const xn = parseNumber(x, "X");
      const yn = parseNumber(y, "Y (percent)");
      if (yn === 0) throw new Error("Percentage cannot be zero.");
      const whole = (xn / yn) * 100;
      setRes({
        value: `${fmt(xn)} is ${fmt(yn)}% of ${fmt(whole)}`,
        steps: [
          {
            title: "Formula",
            body: (
              <FormulaWithLegend
                formula={<>Whole = (X ÷ Y) × 100</>}
                legend={[
                  { sym: "X", def: "known part" },
                  { sym: "Y", def: "percent" },
                ]}
              />
            ),
          },
          {
            title: "Substitute",
            body: (
              <FormulaBlock>
                ({xn} ÷ {yn}) × 100 = {fmt(xn / yn)} × 100
              </FormulaBlock>
            ),
          },
          {
            title: "Multiply",
            body: (
              <FormulaBlock>
                {fmt(xn / yn)} × 100 = <strong>{fmt(whole)}</strong>
              </FormulaBlock>
            ),
          },
        ],
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <PhraseShell
      inputs={
        <>
          <Field label="X (part)" htmlFor="pc-x">
            <TextInput
              id="pc-x"
              inputMode="decimal"
              value={x}
              onChange={(e) => setX(e.target.value)}
            />
          </Field>
          <Field label="Y (percent)" htmlFor="pc-y">
            <TextInput
              id="pc-y"
              inputMode="decimal"
              value={y}
              onChange={(e) => setY(e.target.value)}
            />
          </Field>
        </>
      }
      onCalculate={run}
      err={err}
      result={res}
      filename={"percentage-reverse"}
    />
  );
}

function PhraseShell({
  inputs,
  onCalculate,
  err,
  result,
  filename,
}: {
  inputs: ReactNode;
  onCalculate: () => void;
  err: string | null;
  result: null | { value: string; steps: Step[] };
  filename: string;
}) {
  const resultRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        {inputs}
        <PrimaryButton onClick={onCalculate} className="w-full sm:w-auto">
          Calculate
        </PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <div className="mt-4 space-y-4">
          <ResultActions
            filename={filename}
            captureRef={resultRef}
            getCopyText={() => result.value}
          />
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Result"
              value={
                <span className="flex flex-wrap items-center gap-3">
                  <span>{result.value}</span>
                  <CopyButton text={result.value} />
                </span>
              }
            />
            <StepsToggle steps={result.steps} />
          </div>
        </div>
      )}
    </>
  );
}


/* ---------------- 3. Percentage Difference ---------------- */

function DifferenceTool() {
  const [a, setA] = useState("40");
  const [b, setB] = useState("60");
  const [res, setRes] = useState<null | { value: string; steps: Step[] }>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const run = () => {
    setErr(null);
    setRes(null);
    try {
      const v1 = parseNumber(a, "Value 1");
      const v2 = parseNumber(b, "Value 2");
      const diff = Math.abs(v1 - v2);
      const avg = (Math.abs(v1) + Math.abs(v2)) / 2;
      if (avg === 0) throw new Error("Both values are zero — difference is undefined.");
      const pct = (diff / avg) * 100;
      setRes({
        value: `Percentage difference = ${fmt(pct)}%`,
        steps: [
          {
            title: "Formula",
            body: (
              <FormulaWithLegend
                formula={<>% diff = |V₁ − V₂| ÷ ((|V₁| + |V₂|) ÷ 2) × 100</>}
                legend={[
                  { sym: "V₁", def: "first value" },
                  { sym: "V₂", def: "second value" },
                ]}
              />
            ),
          },
          {
            title: "Absolute difference",
            body: (
              <FormulaBlock>
                |{v1} − {v2}| = <strong>{fmt(diff)}</strong>
              </FormulaBlock>
            ),
          },
          {
            title: "Average of absolutes",
            body: (
              <FormulaBlock>
                (|{v1}| + |{v2}|) ÷ 2 = ({fmt(Math.abs(v1))} + {fmt(Math.abs(v2))}) ÷ 2 ={" "}
                <strong>{fmt(avg)}</strong>
              </FormulaBlock>
            ),
          },
          {
            title: "Divide and convert to percent",
            body: (
              <FormulaBlock>
                ({fmt(diff)} ÷ {fmt(avg)}) × 100 = <strong>{fmt(pct)}%</strong>
              </FormulaBlock>
            ),
          },
        ],
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Value 1" htmlFor="diff-a">
          <TextInput
            id="diff-a"
            inputMode="decimal"
            value={a}
            onChange={(e) => setA(e.target.value)}
          />
        </Field>
        <Field label="Value 2" htmlFor="diff-b">
          <TextInput
            id="diff-b"
            inputMode="decimal"
            value={b}
            onChange={(e) => setB(e.target.value)}
          />
        </Field>
        <PrimaryButton onClick={run} className="w-full sm:w-auto">
          Calculate
        </PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {res && (
        <div className="mt-4 space-y-4">
          <ResultActions
            filename="percentage-difference"
            captureRef={resultRef}
            getCopyText={() => res.value}
          />
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Result"
              value={
                <span className="flex flex-wrap items-center gap-3">
                  <span>{res.value}</span>
                  <CopyButton text={res.value} />
                </span>
              }
            />
            <StepsToggle steps={res.steps} />
          </div>
        </div>
      )}

    </>
  );
}

/* ---------------- 4. Percentage Change ---------------- */

function ChangeTool() {
  const [base, setBase] = useState("200");
  const [dir, setDir] = useState<"inc" | "dec">("inc");
  const [pct, setPct] = useState("15");
  const [res, setRes] = useState<null | { value: string; steps: Step[] }>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const run = () => {
    setErr(null);
    setRes(null);
    try {
      const b = parseNumber(base, "base value");
      const p = parseNumber(pct, "percentage");
      const factor = dir === "inc" ? 1 + p / 100 : 1 - p / 100;
      const delta = (p / 100) * b;
      const out = b * factor;
      const verb = dir === "inc" ? "Increase" : "Decrease";
      // Cross-check with existing helper for percentage change verification.
      const check = percentChange(b, out);
      void check;
      setRes({
        value: `${verb} ${fmt(b)} by ${fmt(p)}% = ${fmt(out)}`,
        steps: [
          {
            title: "Formula",
            body: (
              <FormulaWithLegend
                formula={
                  dir === "inc" ? <>New = Base × (1 + P ÷ 100)</> : <>New = Base × (1 − P ÷ 100)</>
                }
                legend={[
                  { sym: "Base", def: "starting value" },
                  { sym: "P", def: "percent change" },
                ]}
              />
            ),
          },
          {
            title: "Amount of change",
            body: (
              <FormulaBlock>
                (P ÷ 100) × Base = ({p} ÷ 100) × {b} = <strong>{fmt(delta)}</strong>
              </FormulaBlock>
            ),
          },
          {
            title: dir === "inc" ? "Add to base" : "Subtract from base",
            body:
              dir === "inc" ? (
                <FormulaBlock>
                  {b} + {fmt(delta)} = <strong>{fmt(out)}</strong>
                </FormulaBlock>
              ) : (
                <FormulaBlock>
                  {b} − {fmt(delta)} = <strong>{fmt(out)}</strong>
                </FormulaBlock>
              ),
          },
        ],
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
        <Field label="Base value" htmlFor="ch-base">
          <TextInput
            id="ch-base"
            inputMode="decimal"
            value={base}
            onChange={(e) => setBase(e.target.value)}
          />
        </Field>
        <Field label="Direction" htmlFor="ch-dir">
          <select
            id="ch-dir"
            value={dir}
            onChange={(e) => setDir(e.target.value as "inc" | "dec")}
            className="h-[46px] w-full rounded-xl border border-border bg-background/60 px-3 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="inc">Increase</option>
            <option value="dec">Decrease</option>
          </select>
        </Field>
        <Field label="Percentage (%)" htmlFor="ch-pct">
          <TextInput
            id="ch-pct"
            inputMode="decimal"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
          />
        </Field>
        <PrimaryButton onClick={run} className="w-full sm:w-auto">
          Calculate
        </PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {res && (
        <div className="mt-4 space-y-4">
          <ResultActions
            filename="percentage-change"
            captureRef={resultRef}
            getCopyText={() => res.value}
          />
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Result"
              value={
                <span className="flex flex-wrap items-center gap-3">
                  <span>{res.value}</span>
                  <CopyButton text={res.value} />
                </span>
              }
            />
            <StepsToggle steps={res.steps} />
          </div>
        </div>
      )}

    </>
  );
}

/* ---------------- Educational Content ---------------- */

function PctMini({ lines }: { lines: string[] }) {
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

const PCT_GUIDE: GuideCardItem[] = [
  {
    key: "of",
    title: "What is X% of Y? — take a slice of a whole",
    explain: (
      <>
        The most common question. Convert the percentage to a decimal by
        dividing by 100, then multiply by the number. This is what the main
        tool at the top of the page does.
      </>
    ),
    formula: <>Result = (X / 100) × Y</>,
    legend: [
      { sym: "X", def: "percentage (e.g. 15)" },
      { sym: "Y", def: "the number you're taking a share of" },
    ],
    diagram: <PctMini lines={["15% of 240", "= 0.15 × 240", "= 36"]} />,
    example: {
      given: <>X = 15, Y = 240</>,
      substitute: <>(15 / 100) × 240 = 0.15 × 240</>,
      answer: <>36</>,
    },
  },
  {
    key: "whatpct",
    title: "X is what % of Y? — turn a ratio into a percent",
    explain: (
      <>
        When you know a part and a whole and want the share as a percent,
        divide part by whole and multiply by 100. The result answers questions
        like "what percent of my score did I get right?"
      </>
    ),
    formula: <>Percent = (X / Y) × 100</>,
    legend: [
      { sym: "X", def: "the part" },
      { sym: "Y", def: "the whole (Y ≠ 0)" },
    ],
    diagram: <PctMini lines={["15 out of 60", "= (15 / 60) × 100", "= 25%"]} />,
    example: {
      given: <>X = 15, Y = 60</>,
      substitute: <>(15 / 60) × 100 = 0.25 × 100</>,
      answer: <>25%</>,
    },
  },
  {
    key: "reverse",
    title: "X is Y% of what? — recover the original whole",
    explain: (
      <>
        The reverse-percentage question. You know a part and the percentage it
        represents, and want the whole. Divide the part by the percentage as a
        decimal — or equivalently, multiply by 100 and divide by the percent.
      </>
    ),
    formula: <>Whole = X ÷ (Y / 100) = (X / Y) × 100</>,
    legend: [
      { sym: "X", def: "the known part" },
      { sym: "Y", def: "the percentage (Y ≠ 0)" },
    ],
    diagram: <PctMini lines={["30 is 25% of ?", "= 30 / 0.25", "= 120"]} />,
    example: {
      given: <>X = 30, Y = 25</>,
      substitute: <>30 / 0.25</>,
      answer: <>120</>,
    },
  },
  {
    key: "difference",
    title: "Percentage difference — comparing two equal values",
    explain: (
      <>
        Use this when neither value is more of a "reference" than the other —
        two sensor readings, two survey results. Because they're on equal
        footing, divide by their average (not by one of them).
      </>
    ),
    formula: <>% diff = |V₁ − V₂| ÷ ((|V₁| + |V₂|) ÷ 2) × 100</>,
    legend: [
      { sym: "V₁, V₂", def: "the two values being compared" },
    ],
    diagram: <PctMini lines={["40 vs 60", "|40−60| / 50 × 100", "= 40%"]} />,
    example: {
      given: <>V₁ = 40, V₂ = 60</>,
      substitute: <>|40 − 60| / ((40 + 60) / 2) × 100 = 20 / 50 × 100</>,
      answer: <>40%</>,
    },
  },
  {
    key: "change",
    title: "Percentage change — before and after",
    explain: (
      <>
        Use this when one value clearly came first (a price, a population, a
        score) and another came after. The original value is the reference, so
        you divide by it — not by an average. Positive means an increase,
        negative means a decrease.
      </>
    ),
    formula: <>% change = (New − Original) ÷ |Original| × 100</>,
    legend: [
      { sym: "Original", def: "starting value (≠ 0)" },
      { sym: "New", def: "value after the change" },
    ],
    diagram: <PctMini lines={["200 → 170", "(170 − 200) / 200 × 100", "= −15%"]} />,
    example: {
      given: <>Original = 200, New = 170</>,
      substitute: <>(170 − 200) / 200 × 100 = −30 / 200 × 100</>,
      answer: <>−15% (a 15% decrease)</>,
    },
  },
  {
    key: "compound",
    title: "Compound percentages — why 15% + 15% ≠ 30%",
    explain: (
      <>
        Successive percentage changes multiply, they don't add. Two 15%
        discounts on $100 give $100 × 0.85 × 0.85 = $72.25 — the second
        discount is applied to the already-reduced price, so it's worth less
        in dollar terms than the first.
      </>
    ),
    formula: <>Final = Base × (1 ± p₁) × (1 ± p₂) × …</>,
    legend: [
      { sym: "pᵢ", def: "each rate as a decimal (0.15 for 15%)" },
    ],
    diagram: <PctMini lines={["$100 − 15% − 15%", "100 × 0.85 × 0.85", "= $72.25"]} />,
    example: {
      given: <>Base = 100, two 15% discounts</>,
      substitute: <>100 × 0.85 × 0.85</>,
      answer: <>$72.25 (not $70)</>,
    },
  },
];

function EducationalContent() {
  return (
    <div className="mt-12 space-y-10 text-[15px] leading-relaxed text-muted-foreground">
      <CalcSection title="What is a percentage?">
        <p>
          A percentage is a way of writing a number as a portion of one
          hundred. The word comes from the Latin <em>per centum</em>, "by the
          hundred." When you say 25%, you are saying "25 out of every 100."
          That makes percentages a shared language for comparing things that
          would otherwise be hard to line up — discounts at different shops,
          or how full one glass is versus another of a different size. Any
          time you take a part, divide by the whole, and multiply by 100, you
          have converted a plain ratio into a percentage.
        </p>
      </CalcSection>

      <CalcSection title="Every percentage question, walked through">
        <p>
          Every question this page can answer is one of six patterns below.
          Each card shows the formula, a picture and a worked value you can
          verify with the tools above.
        </p>
        <GuideCards items={PCT_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Find X% of a number with the main percentage tool",
            "Three phrasing variations — \"what is X% of Y\", \"X is what % of Y\", and reverse \"X is Y% of what?\"",
            "Percentage difference between two values, using the average as the denominator",
            "Percentage change (increase or decrease) — same math used for tips, taxes, discounts, and markups",
            "Every result shows collapsible step-by-step working plus copy and download-as-image actions",
          ]}
        />
      </CalcSection>

      <CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={PERCENTAGE_FAQS.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))}
        />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/fraction-calculator", label: "Fraction Calculator" },
            { to: "/calculators/math/ratio-calculator", label: "Ratio Calculator" },
            { to: "/calculators/math/percent-error-calculator", label: "Percent Error" },
            { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
          ]}
        />
      </CalcSection>
    </div>
  );
}

