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
  type GuideCardItem,
  FormulaBlock,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

export const Route = createFileRoute("/calculators/math/absolute-value-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Absolute Value Equation Calculator",
      title: "Absolute Value Equation Calculator",
      metaDescription:
        "Solve |ax + b| = c and other absolute value equations and inequalities with step-by-step algebra.",
      canonicalUrl: "/calculators/math/absolute-value-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Absolute Value Equation Calculator", path: "/calculators/math/absolute-value-calculator" },
      ],
      faqs: [
        {
          q: "Why can an absolute value equation have two solutions?",
          a: "Because |x| measures distance from 0 without regard to direction. Two different numbers can sit the same distance from 0 — for example |x| = 5 is true for both x = 5 and x = −5 — so the equation splits into two linear cases and can yield two solutions.",
        },
        {
          q: "Why does |expression| = negative have no solution?",
          a: "The absolute value of any real number is 0 or positive — never negative. So no real x can make |mx + b| equal a negative number. The equation has no solution and the calculator reports the empty set.",
        },
        {
          q: "What about absolute value inequalities?",
          a: "They use the same case-split idea. |X| < c (with c > 0) becomes −c < X < c, and |X| > c becomes X < −c OR X > c. If c is negative, |X| < c has no solution and |X| > c is true for every real number. This calculator handles the equation case; use the Inequality Solver for the linear pieces.",
        },
        {
          q: "What if c = 0?",
          a: "Then |mx + b| = 0 forces mx + b = 0, which has the single solution x = −b/m. There is only one solution (a repeated root), because the two cases collapse into the same equation.",
        },
      ],
    }),
  component: AbsoluteValuePage,
});

// ---------------- Math ----------------

function fmtNum(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const r = Math.round(n * 1e10) / 1e10;
  return r.toString();
}

type Solution =
  | { kind: "two"; x1: number; x2: number; steps: Step[] }
  | { kind: "one"; x: number; steps: Step[] }
  | { kind: "none"; steps: Step[] }
  | { kind: "all"; steps: Step[] };

function solve(m: number, b: number, c: number): Solution {
  const steps: Step[] = [];
  steps.push({
    title: "Given — equation",
    body: (<FormulaBlock><p className="font-mono">
        |{fmtNum(m)}x {b >= 0 ? "+" : "−"} {fmtNum(Math.abs(b))}| ={" "}
        {fmtNum(c)}
      </p></FormulaBlock>),
  });

  if (c < 0) {
    steps.push({
      title: "Answer — no solution (RHS < 0)",
      body: (<FormulaBlock><p>
          The absolute value of any real expression is 0 or greater — it
          cannot equal a negative number. There is no real solution.
        </p></FormulaBlock>),
    });
    return { kind: "none", steps };
  }

  if (m === 0) {
    // |b| = c
    steps.push({
      title: "Answer — degenerate case",
      body: (<FormulaBlock><p className="font-mono">
          The equation reduces to |{fmtNum(b)}| = {fmtNum(c)}, which is{" "}
          {Math.abs(b) === c ? "always true" : "never true"} — independent of x.
        </p></FormulaBlock>),
    });
    return Math.abs(b) === c ? { kind: "all", steps } : { kind: "none", steps };
  }

  if (c === 0) {
    const x = -b / m;
    steps.push({
      title: "Answer — single solution (RHS = 0)",
      body: (<FormulaBlock><p className="font-mono">
          {fmtNum(m)}x {b >= 0 ? "+" : "−"} {fmtNum(Math.abs(b))} = 0
          &nbsp;⇒&nbsp; x = {fmtNum(x)} (a single, repeated solution)
        </p></FormulaBlock>),
    });
    return { kind: "one", x, steps };
  }

  // General case: split into two
  steps.push({
    title: "Formula — split into two cases",
    body: (<FormulaBlock><div className="space-y-1 font-mono">
        <div>Case 1: {fmtNum(m)}x {b >= 0 ? "+" : "−"} {fmtNum(Math.abs(b))} = {fmtNum(c)}</div>
        <div>Case 2: {fmtNum(m)}x {b >= 0 ? "+" : "−"} {fmtNum(Math.abs(b))} = {fmtNum(-c)}</div>
      </div></FormulaBlock>),
  });

  const x1 = (c - b) / m;
  const x2 = (-c - b) / m;

  steps.push({
    title: "Substitute — case 1",
    body: (<FormulaBlock><p className="font-mono">
        {fmtNum(m)}x = {fmtNum(c)} − ({fmtNum(b)}) = {fmtNum(c - b)}
        &nbsp;⇒&nbsp; x = {fmtNum(c - b)} / {fmtNum(m)} = {fmtNum(x1)}
      </p></FormulaBlock>),
  });
  steps.push({
    title: "Substitute — case 2",
    body: (<FormulaBlock><p className="font-mono">
        {fmtNum(m)}x = {fmtNum(-c)} − ({fmtNum(b)}) = {fmtNum(-c - b)}
        &nbsp;⇒&nbsp; x = {fmtNum(-c - b)} / {fmtNum(m)} = {fmtNum(x2)}
      </p></FormulaBlock>),
  });

  return { kind: "two", x1, x2, steps };
}

// ---------------- Number line visual ----------------

function NumberLineTwo({ x1, x2 }: { x1: number; x2: number }) {
  const lo = Math.min(x1, x2);
  const hi = Math.max(x1, x2);
  const spread = Math.max(hi - lo, 4);
  const min = lo - spread * 0.4;
  const max = hi + spread * 0.4;
  const width = 480;
  const height = 90;
  const pad = 30;
  const scale = (v: number) =>
    pad + ((v - min) / (max - min)) * (width - pad * 2);
  const barY = 50;

  const step = Math.pow(10, Math.floor(Math.log10(spread))) || 1;
  const ticks: number[] = [];
  const t0 = Math.ceil(min / step) * step;
  for (let t = t0; t <= max; t += step) ticks.push(t);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-lg"
      role="img"
      aria-label="Number line showing the two solutions"
    >
      <line
        x1={pad}
        x2={width - pad}
        y1={barY}
        y2={barY}
        className="stroke-border"
        strokeWidth={1.5}
      />
      <polygon
        points={`${pad},${barY} ${pad + 8},${barY - 4} ${pad + 8},${barY + 4}`}
        className="fill-border"
      />
      <polygon
        points={`${width - pad},${barY} ${width - pad - 8},${barY - 4} ${width - pad - 8},${barY + 4}`}
        className="fill-border"
      />
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={scale(t)}
            x2={scale(t)}
            y1={barY - 3}
            y2={barY + 3}
            className="stroke-border"
            strokeWidth={1}
          />
          <text
            x={scale(t)}
            y={barY + 20}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {fmtNum(t)}
          </text>
        </g>
      ))}
      {[x1, x2].map((xVal, i) =>
        xVal === x1 && xVal === x2 && i === 1 ? null : (
          <g key={i}>
            <circle
              cx={scale(xVal)}
              cy={barY}
              r={7}
              className="fill-primary stroke-primary"
              strokeWidth={2}
            />
            <text
              x={scale(xVal)}
              y={barY - 14}
              textAnchor="middle"
              className="fill-foreground"
              fontSize={12}
              fontWeight={600}
            >
              x = {fmtNum(xVal)}
            </text>
          </g>
        ),
      )}
    </svg>
  );
}

// ---------------- Page ----------------

function AbsoluteValuePage() {
  const [m, setM] = useState("2");
  const [b, setB] = useState("-3");
  const [c, setC] = useState("7");
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
      const M = Number(m);
      const B = Number(b);
      const C = Number(c);
      if (!Number.isFinite(M) || !Number.isFinite(B) || !Number.isFinite(C))
        throw new Error("All three coefficients must be numbers.");
      const s = solve(M, B, C);
      setSol(s);
      if (s.kind === "two") {
        setDisplay({
          value: (
            <span className="font-mono">
              x = {fmtNum(s.x1)} &nbsp;or&nbsp; x = {fmtNum(s.x2)}
            </span>
          ),
          note: "Two solutions from the case split.",
        });
      } else if (s.kind === "one") {
        setDisplay({
          value: <span className="font-mono">x = {fmtNum(s.x)}</span>,
          note: "One repeated solution (right side is 0).",
        });
      } else if (s.kind === "none") {
        setDisplay({
          value: <span className="font-mono">∅</span>,
          note: "No solution — the right side is negative or the constants disagree.",
        });
      } else {
        setDisplay({
          value: <span className="font-mono">x ∈ ℝ</span>,
          note: "Every real number satisfies the equation.",
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input.");
    }
  };

  return (
    <MathCalcPage
      name="Absolute Value Equation Calculator"
      tagline="Solve equations of the form |mx + b| = c. Enter m, b and c — the calculator splits the equation into its two cases, solves each linear piece, and shows both solutions on a number line (or reports 'no solution' when c is negative)."
      extras={
        <>
<CalcSection title="What does absolute value mean?">
            <p>
              The absolute value of a number is its <strong>distance
              from 0</strong> on the number line, ignoring direction.
              Because distance is never negative, |x| is always 0 or
              positive: |3| = 3 and |−3| = 3. You can think of the bars
              as stripping off the sign.
            </p>
          </CalcSection>

          <CalcSection title="How the equation is solved, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing this tool does with the equation
              you enter — how the bars split it into two ordinary linear
              equations, and how it detects an equation that has no real
              solution.
            </p>
            <GuideCards items={AV_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Solves any equation of the form |mx + b| = c with integer, decimal or negative coefficients",
                "Shows both cases side by side — mx + b = c and mx + b = −c",
                "Reports 'no solution' when c is negative, and a single repeated solution when c = 0",
                "Handles the degenerate m = 0 case (|b| = c) and reports 'all real numbers' or 'no solution' correctly",
                "Plots both solutions on an interactive number-line visual for quick sanity checks",
                "Full step-by-step working, so it doubles as a study aid — not just an answer key",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "How do I solve an absolute value inequality?",
                  a: (
                    <p>
                      Use the same case-split idea. For c &gt; 0, |X|
                      &lt; c becomes −c &lt; X &lt; c (an interval), and
                      |X| &gt; c becomes X &lt; −c OR X &gt; c (a
                      union). Solve each linear piece with the{" "}
                      <a
                        href="/calculators/math/inequality-calculator"
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        Inequality Solver
                      </a>
                      .
                    </p>
                  ),
                },
                {
                  q: "Why can there be two solutions?",
                  a: (
                    <p>
                      Because the number line has two points at any
                      given distance from 0 — one on each side. So an
                      equation like |x − 4| = 3 is satisfied by both x =
                      7 (three to the right of 4) and x = 1 (three to
                      the left).
                    </p>
                  ),
                },
                {
                  q: "What if my equation has an absolute value on both sides?",
                  a: (
                    <p>
                      |A| = |B| leads to two cases as well: A = B or A =
                      −B. Solve both and check each candidate in the
                      original equation — sometimes one is extraneous.
                      This calculator handles the more common single-bar
                      form.
                    </p>
                  ),
                },
                {
                  q: "How do I check my answer?",
                  a: (
                    <p>
                      Substitute each candidate back into the original
                      equation and confirm the left side (after taking
                      the absolute value) really equals the right side.
                      If it doesn't, the value is extraneous and should
                      be discarded.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/inequality-calculator", label: "Inequality Solver" },
                {
                  to: "/calculators/math/quadratic-formula-calculator",
                  label: "Quadratic Formula Calculator",
                },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Solve <span className="font-mono">|m·x + b| = c</span>. Enter
          m, b and c below.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="m (coefficient of x)" htmlFor="m">
            <TextInput id="m" value={m} onChange={(e) => setM(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="b (constant inside)" htmlFor="b">
            <TextInput id="b" value={b} onChange={(e) => setB(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="c (right side)" htmlFor="c">
            <TextInput id="c" value={c} onChange={(e) => setC(e.target.value)} inputMode="decimal" />
          </Field>
        </div>
        <PrimaryButton onClick={onCalc}>Solve</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {sol && display && (
        <>
          <ResultBox label="Solution" value={display.value} note={display.note} />
          {sol.kind === "two" && (
            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-2 text-sm font-medium text-foreground">
                Solutions on the number line
              </div>
              <NumberLineTwo x1={sol.x1} x2={sol.x2} />
              <p className="mt-2 text-xs text-muted-foreground">
                Both filled circles are equally valid — the two cases
                give two distinct roots.
              </p>
            </div>
          )}
          {sol.kind === "one" && (
            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-2 text-sm font-medium text-foreground">
                Solution on the number line
              </div>
              <NumberLineTwo x1={sol.x} x2={sol.x} />
              <p className="mt-2 text-xs text-muted-foreground">
                Only one point — the two cases collapsed into a repeated root.
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

function SplitMini() {
  return (
    <svg viewBox="0 0 220 110" className="w-full">
      <rect x="1" y="1" width="218" height="108" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <text x="110" y="22" textAnchor="middle" fontSize="12" fill="var(--color-primary)">|X| = a</text>
      <line x1="110" y1="28" x2="60" y2="55" stroke="var(--color-border)" />
      <line x1="110" y1="28" x2="160" y2="55" stroke="var(--color-border)" />
      <rect x="20" y="55" width="80" height="30" rx="6" fill="color-mix(in srgb, var(--color-primary) 12%, transparent)" stroke="var(--color-primary)" />
      <text x="60" y="74" textAnchor="middle" fontSize="11" fill="var(--color-foreground)">X = a</text>
      <rect x="120" y="55" width="80" height="30" rx="6" fill="color-mix(in srgb, var(--color-primary) 12%, transparent)" stroke="var(--color-primary)" />
      <text x="160" y="74" textAnchor="middle" fontSize="11" fill="var(--color-foreground)">X = −a</text>
      <text x="110" y="102" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">solve two linear equations, keep both roots</text>
    </svg>
  );
}

function NoSolMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <line x1="15" y1="55" x2="205" y2="55" stroke="var(--color-border)" />
      {[-4,-2,0,2,4].map((n,i)=>{
        const x=15+i*47.5;
        return <g key={n}><line x1={x} y1="50" x2={x} y2="60" stroke="var(--color-muted-foreground)" /><text x={x} y="72" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">{n}</text></g>;
      })}
      <path d="M110 55 L 110 22" stroke="var(--color-primary)" strokeWidth="2" />
      <text x="115" y="20" fontSize="10" fill="var(--color-primary)">|X| ≥ 0</text>
      <text x="30" y="20" fontSize="10" fill="var(--color-foreground)">right side = −4</text>
      <line x1="15" y1="88" x2="205" y2="88" stroke="var(--color-foreground)" strokeDasharray="4 3" />
      <text x="110" y="98" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">the two never meet → no real solution</text>
    </svg>
  );
}

const AV_GUIDE: GuideCardItem[] = [
  {
    key: "split",
    title: "Formula — split into two cases",
    explain: <>Because <span className="font-mono">|X|</span> equals either <span className="font-mono">X</span> or <span className="font-mono">−X</span>, the equation <span className="font-mono">|X| = a</span> (with <span className="font-mono">a ≥ 0</span>) breaks into two ordinary linear equations that the tool solves separately.</>,
    formula: <>|X| = a ⇔ X = a or X = −a</>,
    diagram: <SplitMini />,
    example: {
      given: <span className="font-mono">|2x − 3| = 7</span>,
      substitute: <>2x − 3 = 7 or 2x − 3 = −7</>,
      answer: <span className="font-mono">x = 5 or x = −2</span>,
    },
  },
  {
    key: "no",
    title: "Answer — no solution (RHS < 0)",
    explain: <>Since <span className="font-mono">|X|</span> is a distance, it is never negative. If the right side is negative the tool reports <span className="font-mono">∅</span> immediately — there is no real value of x that can satisfy the equation.</>,
    formula: <>|X| = a with a &lt; 0 ⇒ no real solution</>,
    diagram: <NoSolMini />,
    example: {
      given: <span className="font-mono">|3x + 1| = −4</span>,
      substitute: <>left ≥ 0, right = −4</>,
      answer: <span className="font-mono">∅ (empty set)</span>,
    },
  },
];
