import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
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

export const Route = createFileRoute("/calculators/math/inequality-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Inequality Solver",
      title: "Inequality Solver — Linear Inequalities with Steps",
      metaDescription:
        "Solve linear inequalities in x such as 2x + 3 < 11. Get an interval, a number line, and every step — including the sign flip.",
      canonicalUrl: "/calculators/math/inequality-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Inequality Solver", path: "/calculators/math/inequality-calculator" },
      ],
      faqs: [
        {
          q: "When does the inequality sign flip?",
          a: "Only when you multiply or divide both sides by a negative number. Adding, subtracting, or multiplying/dividing by a positive number leaves the direction of the inequality unchanged.",
        },
        {
          q: "Does the sign flip when I swap the two sides?",
          a: "Yes. Rewriting 5 > x as x < 5 flips the symbol because you are reading the same relationship in the opposite direction.",
        },
        {
          q: "What about compound inequalities like 1 < 2x + 3 ≤ 7?",
          a: "This solver handles a single inequality of the form (expression in x) op (expression in x). For compound (double) inequalities, split them into two parts — 1 < 2x + 3 AND 2x + 3 ≤ 7 — solve each, and take the intersection of the two solution intervals.",
        },
        {
          q: "What does an open vs closed circle mean on the number line?",
          a: "A closed (filled) circle means the endpoint is included — this is used for ≤ and ≥. An open (hollow) circle means the endpoint is not included — used for strict < and >.",
        },
      ],
    }),
  component: InequalityPage,
});

// ---------------- Parser ----------------
// Parses a linear expression in x into { m, c } representing m·x + c.

type Op = "<" | "<=" | ">" | ">=";

interface Lin {
  m: number;
  c: number;
}

function parseLinear(raw: string): Lin {
  // Normalize: replace unicode minus, remove spaces, split into signed terms
  let s = raw.replace(/\s+/g, "").replace(/−/g, "-").replace(/\*/g, "");
  if (!s) throw new Error("Missing expression.");
  // Ensure leading sign
  if (s[0] !== "+" && s[0] !== "-") s = "+" + s;
  const termRe = /[+-][^+-]+/g;
  const matches = s.match(termRe);
  if (!matches) throw new Error(`Cannot parse "${raw}".`);
  let m = 0;
  let c = 0;
  for (const t of matches) {
    const sign = t[0] === "-" ? -1 : 1;
    const body = t.slice(1);
    if (body.length === 0) throw new Error(`Empty term in "${raw}".`);
    if (body.includes("x") || body.includes("X")) {
      // coefficient of x
      const coefStr = body.replace(/[xX]/g, "");
      let coef: number;
      if (coefStr === "" || coefStr === ".") coef = 1;
      else {
        coef = Number(coefStr);
        if (!Number.isFinite(coef))
          throw new Error(`Bad coefficient in "${t}".`);
      }
      m += sign * coef;
    } else {
      const n = Number(body);
      if (!Number.isFinite(n)) throw new Error(`Bad number in "${t}".`);
      c += sign * n;
    }
  }
  return { m, c };
}

function parseInequality(raw: string): { lhs: Lin; op: Op; rhs: Lin } {
  const s = raw.replace(/≤/g, "<=").replace(/≥/g, ">=");
  const re = /(<=|>=|<|>)/;
  const m = s.match(re);
  if (!m) throw new Error("Enter an inequality using <, >, <= or >=.");
  const op = m[1] as Op;
  const idx = m.index!;
  const left = s.slice(0, idx);
  const right = s.slice(idx + m[1].length);
  if (!left.trim() || !right.trim())
    throw new Error("Both sides of the inequality are required.");
  return { lhs: parseLinear(left), op, rhs: parseLinear(right) };
}

// ---------------- Solver ----------------

function fmtNum(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const r = Math.round(n * 1e10) / 1e10;
  return r.toString();
}

function fmtLin({ m, c }: Lin): string {
  if (m === 0) return fmtNum(c);
  const mStr = m === 1 ? "x" : m === -1 ? "−x" : `${fmtNum(m)}x`;
  if (c === 0) return mStr;
  return c > 0 ? `${mStr} + ${fmtNum(c)}` : `${mStr} − ${fmtNum(-c)}`;
}

const OP_SYM: Record<Op, string> = {
  "<": "<",
  "<=": "≤",
  ">": ">",
  ">=": "≥",
};

function flipOp(op: Op): Op {
  return op === "<" ? ">" : op === "<=" ? ">=" : op === ">" ? "<" : "<=";
}

type Solution =
  | {
      kind: "range";
      op: Op;
      value: number;
      steps: Step[];
      interval: string;
      description: string;
    }
  | { kind: "all"; steps: Step[] }
  | { kind: "none"; steps: Step[] };

function solve(raw: string): Solution {
  const { lhs, op, rhs } = parseInequality(raw);
  const steps: Step[] = [];
  steps.push({
    title: "Given",
    body: (
      <FormulaBlock>
        {fmtLin(lhs)} {OP_SYM[op]} {fmtLin(rhs)}
      </FormulaBlock>
    ),
  });
  steps.push({
    title: "Formula — isolate x",
    body: (
      <FormulaWithLegend
        formula={<>ax {"<"} b ⇒ x {"<"} b/a &nbsp;(flip sign if a {"<"} 0)</>}
        legend={[
          { sym: "a", def: "coefficient of x after collecting like terms" },
          { sym: "b", def: "the constant on the right after moving terms" },
          { sym: "flip", def: "reverse the inequality when dividing by a negative" },
        ]}
      />
    ),
  });

  // Move all x-terms to the left, all constants to the right
  const newM = lhs.m - rhs.m;
  const newC = rhs.c - lhs.c;
  steps.push({
    title: "Substitute — collect x-terms and constants",
    body: (
      <FormulaBlock>
        {fmtLin({ m: newM, c: 0 })} {OP_SYM[op]} {fmtNum(newC)}
      </FormulaBlock>
    ),
  });

  if (newM === 0) {
    // 0 op newC — no x remains
    const holds =
      (op === "<" && 0 < newC) ||
      (op === "<=" && 0 <= newC) ||
      (op === ">" && 0 > newC) ||
      (op === ">=" && 0 >= newC);
    steps.push({
      title: "Answer",
      body: (
        <FormulaBlock>
          0 {OP_SYM[op]} {fmtNum(newC)} — {holds ? "always true (all real x)" : "never true (no solution)"}
        </FormulaBlock>
      ),
    });
    return holds ? { kind: "all", steps } : { kind: "none", steps };
  }

  let finalOp = op;
  if (newM < 0) {
    finalOp = flipOp(op);
    steps.push({
      title: `Divide both sides by ${fmtNum(newM)} — a negative number`,
      body: (
        <FormulaBlock>
          {OP_SYM[op]} → {OP_SYM[finalOp]} (sign flips when dividing by a negative)
        </FormulaBlock>
      ),
    });
  } else {
    steps.push({
      title: `Divide both sides by ${fmtNum(newM)} — a positive number`,
      body: (
        <FormulaBlock>Sign unchanged when dividing by a positive.</FormulaBlock>
      ),
    });
  }

  const value = newC / newM;
  steps.push({
    title: "Answer",
    body: (
      <FormulaBlock>
        x {OP_SYM[finalOp]} {fmtNum(value)}
      </FormulaBlock>
    ),
  });

  const included = finalOp === "<=" || finalOp === ">=";
  const upperBound = finalOp === "<" || finalOp === "<=";
  const bracketL = upperBound ? "(" : included ? "[" : "(";
  const bracketR = upperBound ? (included ? "]" : ")") : ")";
  const interval = upperBound
    ? `(−∞, ${fmtNum(value)}${included ? "]" : ")"}`
    : `${included ? "[" : "("}${fmtNum(value)}, ∞)`;
  void bracketL;
  void bracketR;
  const description = upperBound
    ? `All real numbers less than ${included ? "or equal to " : ""}${fmtNum(value)}.`
    : `All real numbers greater than ${included ? "or equal to " : ""}${fmtNum(value)}.`;

  return {
    kind: "range",
    op: finalOp,
    value,
    steps,
    interval,
    description,
  };
}

// ---------------- Number line ----------------

function NumberLine({ op, value }: { op: Op; value: number }) {
  // Center the value in a window of half-width 5 (or scaled)
  const half = Math.max(5, Math.abs(value) * 1.2);
  const min = value - half;
  const max = value + half;
  const width = 480;
  const height = 90;
  const pad = 30;
  const scale = (x: number) =>
    pad + ((x - min) / (max - min)) * (width - pad * 2);
  const cy = 50;
  const cx = scale(value);
  const filled = op === "<=" || op === ">=";
  const goesLeft = op === "<" || op === "<=";
  const barY = cy;

  // Tick marks
  const ticks: number[] = [];
  const step = Math.pow(10, Math.floor(Math.log10(half))) || 1;
  const t0 = Math.ceil(min / step) * step;
  for (let t = t0; t <= max; t += step) ticks.push(t);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-lg"
      role="img"
      aria-label="Number line showing the solution set"
    >
      {/* Axis */}
      <line
        x1={pad}
        x2={width - pad}
        y1={barY}
        y2={barY}
        className="stroke-border"
        strokeWidth={1.5}
      />
      {/* Arrow heads */}
      <polygon
        points={`${pad},${barY} ${pad + 8},${barY - 4} ${pad + 8},${barY + 4}`}
        className="fill-border"
      />
      <polygon
        points={`${width - pad},${barY} ${width - pad - 8},${barY - 4} ${width - pad - 8},${barY + 4}`}
        className="fill-border"
      />
      {/* Ticks */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={scale(t)}
            x2={scale(t)}
            y1={barY - 4}
            y2={barY + 4}
            className="stroke-border"
            strokeWidth={1}
          />
          <text
            x={scale(t)}
            y={barY + 20}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={11}
          >
            {fmtNum(t)}
          </text>
        </g>
      ))}
      {/* Solution ray */}
      <line
        x1={goesLeft ? pad + 8 : cx}
        x2={goesLeft ? cx : width - pad - 8}
        y1={barY}
        y2={barY}
        className="stroke-primary"
        strokeWidth={4}
      />
      {/* Endpoint circle */}
      <circle
        cx={cx}
        cy={cy}
        r={7}
        className={
          filled ? "fill-primary stroke-primary" : "fill-background stroke-primary"
        }
        strokeWidth={2.5}
      />
      <text
        x={cx}
        y={barY - 14}
        textAnchor="middle"
        className="fill-foreground"
        fontSize={12}
        fontWeight={600}
      >
        {fmtNum(value)}
      </text>
    </svg>
  );
}

// ---------------- Page ----------------

function InequalityPage() {
  const [input, setInput] = useState("2x + 3 < 11");
  const [sol, setSol] = useState<Solution | null>(null);
  const [display, setDisplay] = useState<{ value: ReactNode; note: ReactNode } | null>(
    null,
  );
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setSol(null);
    setDisplay(null);
    try {
      const s = solve(input);
      setSol(s);
      if (s.kind === "range") {
        setDisplay({
          value: (
            <span className="font-mono">
              x {OP_SYM[s.op]} {fmtNum(s.value)}
            </span>
          ),
          note: (
            <>
              Interval form: <span className="font-mono">{s.interval}</span>.{" "}
              {s.description}
            </>
          ),
        });
      } else if (s.kind === "all") {
        setDisplay({
          value: <span className="font-mono">x ∈ ℝ</span>,
          note: "Every real number satisfies the inequality.",
        });
      } else {
        setDisplay({
          value: <span className="font-mono">∅</span>,
          note: "No real number satisfies the inequality.",
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input.");
    }
  };

  return (
    <MathCalcPage
      name="Inequality Solver"
      tagline="Enter a linear inequality in x, such as 2x + 3 < 11 or 5 − 3x ≥ 2x + 1. The solver isolates x, reports the solution as an interval and on a number line, and shows every step — including the sign flip when you divide by a negative."
      extras={
        <>
<CalcSection title="What is an inequality?">
            <p>
              An inequality is a statement that two expressions are not
              necessarily equal — one is smaller than, larger than, or at
              most/at least the other. Instead of an equals sign it uses one
              of <span className="font-mono">&lt;, ≤, &gt;, ≥</span>. A
              solution is any value that makes the statement true; unlike
              an equation, that solution set is usually a whole range of
              numbers rather than a single value.
            </p>
          </CalcSection>

          <CalcSection title="Solving inequalities, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing this tool does with your input —
              how it isolates x, when it must flip the inequality sign, and
              how it renders the solution set as an interval and a number
              line.
            </p>
            <GuideCards items={INEQ_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Accepts inequalities with <, >, ≤, ≥ (or <= and >=) in either direction",
                "Handles x on either side and combines like terms automatically",
                "Reports the answer as x < a (or ≤, >, ≥), in interval notation, and on a number line",
                "Uses open circles for strict inequalities and closed circles for non-strict",
                "Explicitly flags the step where the inequality sign flips",
                "Detects always-true and never-true statements after the x-terms cancel",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Does the sign flip when I add or subtract?",
                  a: (
                    <p>
                      No. Adding or subtracting the same value from both
                      sides never changes the inequality's direction. Only
                      multiplication or division by a negative number does.
                    </p>
                  ),
                },
                {
                  q: "How do I solve a compound inequality like 1 < 2x + 3 ≤ 7?",
                  a: (
                    <p>
                      Split it into two parts joined by AND — 1 &lt; 2x + 3
                      and 2x + 3 ≤ 7 — solve each separately with this
                      calculator, and take the intersection of the two
                      solution intervals. In this example you get 2x &gt; −2
                      and 2x ≤ 4, giving −1 &lt; x ≤ 2, or (−1, 2].
                    </p>
                  ),
                },
                {
                  q: "What if x cancels out completely?",
                  a: (
                    <p>
                      Then the inequality reduces to a plain numeric
                      statement. If it's true (like 3 &lt; 7) every real
                      number is a solution; if it's false (like 4 &lt; 1)
                      there are no solutions. The solver reports both cases
                      clearly.
                    </p>
                  ),
                },
                {
                  q: "How do I write the solution in interval notation?",
                  a: (
                    <p>
                      Round brackets <span className="font-mono">(</span>{" "}
                      and <span className="font-mono">)</span> mean the
                      endpoint is excluded (strict &lt; or &gt;). Square
                      brackets <span className="font-mono">[</span> and{" "}
                      <span className="font-mono">]</span> mean it's
                      included (≤ or ≥). Infinity always uses a round
                      bracket because it isn't a number you can reach.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                {
                  to: "/calculators/math/quadratic-formula-calculator",
                  label: "Quadratic Formula Calculator",
                },
                {
                  to: "/calculators/math/simultaneous-equations-calculator",
                  label: "Simultaneous Equations Solver",
                },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Inequality (in x)" htmlFor="ineq">
          <TextInput
            id="ineq"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 2x + 3 < 11 or 5 - 3x >= 2x + 1"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Use <span className="font-mono">&lt;</span>,{" "}
          <span className="font-mono">&gt;</span>,{" "}
          <span className="font-mono">&lt;=</span> or{" "}
          <span className="font-mono">&gt;=</span> (≤ and ≥ also work).
          Only the variable x is supported.
        </p>
        <PrimaryButton onClick={onCalc}>Solve</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {sol && display && (
        <>
          <ResultBox label="Solution" value={display.value} note={display.note} />
          {sol.kind === "range" && (
            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-2 text-sm font-medium text-foreground">
                Number line
              </div>
              <NumberLine op={sol.op} value={sol.value} />
              <p className="mt-2 text-xs text-muted-foreground">
                {sol.op === "<" || sol.op === ">"
                  ? "Open circle — endpoint not included (strict inequality)."
                  : "Closed circle — endpoint included (non-strict inequality)."}
              </p>
            </div>
          )}
          <StepsToggle steps={sol.steps} />
        </>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function IsolateMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <text x="110" y="25" textAnchor="middle" fontSize="12" fill="var(--color-primary)">2x + 3 &lt; 11</text>
      <text x="110" y="50" textAnchor="middle" fontSize="11" fill="var(--color-foreground)">2x &lt; 8   (−3 both sides)</text>
      <text x="110" y="75" textAnchor="middle" fontSize="12" fill="var(--color-primary)">x &lt; 4   (÷2, sign kept)</text>
    </svg>
  );
}

function FlipMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <line x1="15" y1="55" x2="205" y2="55" stroke="var(--color-border)" />
      {[-3,-2,-1,0,1,2,3].map((n,i)=>{
        const x = 15 + i*32;
        return <g key={n}><line x1={x} y1="50" x2={x} y2="60" stroke="var(--color-muted-foreground)" /><text x={x} y="72" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">{n}</text></g>;
      })}
      <circle cx="175" cy="55" r="4" fill="var(--color-primary)" />
      <text x="175" y="42" textAnchor="middle" fontSize="10" fill="var(--color-primary)">2</text>
      <circle cx="47" cy="55" r="4" fill="var(--color-primary)" />
      <text x="47" y="42" textAnchor="middle" fontSize="10" fill="var(--color-primary)">−2</text>
      <path d="M175 30 Q 110 5 47 30" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#iar)" />
      <defs><marker id="iar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--color-primary)" /></marker></defs>
      <text x="110" y="92" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">×(−1) reflects order → &lt; becomes &gt;</text>
    </svg>
  );
}

function IntervalMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <line x1="15" y1="55" x2="205" y2="55" stroke="var(--color-border)" />
      <line x1="15" y1="55" x2="140" y2="55" stroke="var(--color-primary)" strokeWidth="3" />
      <circle cx="140" cy="55" r="5" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
      <text x="140" y="42" textAnchor="middle" fontSize="10" fill="var(--color-primary)">4</text>
      <text x="110" y="80" textAnchor="middle" fontSize="10" fill="var(--color-foreground)">x &lt; 4  →  (−∞, 4)</text>
      <text x="110" y="94" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">open circle = strict, closed = ≤/≥</text>
    </svg>
  );
}

const INEQ_GUIDE: GuideCardItem[] = [
  {
    key: "iso",
    title: "Isolate x — the same moves as an equation",
    explain: (
      <>Move constants to one side and gather x on the other. Adding or
        subtracting the same value from both sides, and multiplying or
        dividing by a positive number, all keep the inequality sign as it
        is.</>
    ),
    formula: <>a &lt; b ⇒ a + c &lt; b + c · a &lt; b, k &gt; 0 ⇒ ka &lt; kb</>,
    diagram: <IsolateMini />,
    example: {
      given: <span className="font-mono">2x + 3 &lt; 11</span>,
      substitute: <>2x &lt; 8, ÷2</>,
      answer: <span className="font-mono">x &lt; 4</span>,
    },
  },
  {
    key: "flip",
    title: "Multiply or divide by a negative — sign flips",
    explain: (
      <>Multiplying both sides by a negative number reverses the order of
        the two values on the number line, so the inequality symbol has to
        flip to keep the statement true.</>
    ),
    formula: <>a &lt; b, k &lt; 0 ⇒ ka &gt; kb</>,
    diagram: <FlipMini />,
    example: {
      given: <span className="font-mono">−5x ≥ −4</span>,
      substitute: <>÷ (−5), flip ≥ to ≤</>,
      answer: <span className="font-mono">x ≤ 4/5</span>,
    },
  },
  {
    key: "interval",
    title: "Interval & number-line notation",
    explain: (
      <>The tool writes the solution as an interval and draws it on a number
        line. A round bracket <span className="font-mono">(</span>{" "}
        or open circle marks a strict boundary; a square bracket{" "}
        <span className="font-mono">[</span> or filled circle marks{" "}
        <span className="font-mono">≤</span> / <span className="font-mono">≥</span>.</>
    ),
    formula: <>x &lt; a ↔ (−∞, a) · x ≤ a ↔ (−∞, a]</>,
    diagram: <IntervalMini />,
    example: {
      given: <span className="font-mono">x &lt; 4</span>,
      substitute: <>strict → open circle at 4</>,
      answer: <span className="font-mono">(−∞, 4)</span>,
    },
  },
];
