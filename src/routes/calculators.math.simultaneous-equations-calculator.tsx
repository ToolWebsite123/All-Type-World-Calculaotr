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

export const Route = createFileRoute(
  "/calculators/math/simultaneous-equations-calculator",
)({
  head: () =>
    buildCalculatorSeo({
      name: "Simultaneous Equations Solver",
      title: "Simultaneous Equations Solver — 2×2 System with Steps",
      metaDescription:
        "Solve two linear equations in two unknowns (ax + by = c). Get (x, y), or a clear message when lines are parallel, with steps.",
      canonicalUrl: "/calculators/math/simultaneous-equations-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Simultaneous Equations Solver",
          path: "/calculators/math/simultaneous-equations-calculator",
        },
      ],
      faqs: [
        {
          q: "What method does this calculator use?",
          a: "It uses the elimination method: it scales one equation so the coefficient of y (or x, if that's easier) matches the other, subtracts to eliminate that variable, solves the single-variable equation that remains, and back-substitutes for the second unknown.",
        },
        {
          q: "When does a system have no solution?",
          a: "When the two lines are parallel — same slope, different intercepts. Algebraically, the coefficients of x and y in one equation are a common multiple of the other's, but the right-hand side isn't scaled by the same factor. Elimination produces a contradiction like 0 = 5.",
        },
        {
          q: "When does a system have infinitely many solutions?",
          a: "When both equations describe the same line — one is a scalar multiple of the other in full. Elimination collapses to 0 = 0 and every point on the shared line is a valid (x, y).",
        },
        {
          q: "Can I use it if one equation has no x or no y?",
          a: "Yes. Just enter 0 as that coefficient. For example x = 4 becomes 1·x + 0·y = 4.",
        },
      ],
    }),
  component: SimultaneousPage,
});

// ---------------- Solver ----------------

type Solution =
  | { kind: "unique"; x: number; y: number; steps: Step[]; method: string }
  | { kind: "none"; steps: Step[]; reason: string }
  | { kind: "infinite"; steps: Step[]; reason: string };

function fmtNum(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const rounded = Math.round(n * 1e10) / 1e10;
  return rounded.toString();
}

function fmtEq(a: number, b: number, c: number): string {
  const aStr =
    a === 0 ? "" : `${a === 1 ? "" : a === -1 ? "−" : fmtNum(a)}x`;
  let bStr = "";
  if (b !== 0) {
    const sign = b < 0 ? " − " : aStr ? " + " : "";
    const absb = Math.abs(b);
    bStr = `${sign}${absb === 1 ? "" : fmtNum(absb)}y`;
  }
  const left = (aStr + bStr) || "0";
  return `${left} = ${fmtNum(c)}`;
}

function solve(
  a1: number,
  b1: number,
  c1: number,
  a2: number,
  b2: number,
  c2: number,
): Solution {
  const D = a1 * b2 - a2 * b1;
  const steps: Step[] = [];

  steps.push({
    title: "Given",
    body: (
      <FormulaBlock>
        (1) {fmtEq(a1, b1, c1)}
        {"   "}·{"   "}(2) {fmtEq(a2, b2, c2)}
      </FormulaBlock>
    ),
  });
  steps.push({
    title: "Formula — elimination method",
    body: (
      <FormulaWithLegend
        formula={<>x = (c₁·b₂ − c₂·b₁) / (a₁·b₂ − a₂·b₁); &nbsp; y from back-substitution</>}
        legend={[
          { sym: "a₁, b₁, c₁", def: "coefficients of equation (1)" },
          { sym: "a₂, b₂, c₂", def: "coefficients of equation (2)" },
          { sym: "D = a₁b₂ − a₂b₁", def: "determinant; D ≠ 0 gives a unique solution" },
        ]}
      />
    ),
  });

  if (D !== 0) {
    // Elimination: eliminate y by combining b2·(1) − b1·(2)
    // Choose to eliminate the variable with larger absolute leading coefficient
    // to keep it readable. We'll eliminate y here.
    const m1 = b2;
    const m2 = b1;
    const na1 = a1 * m1 - a2 * m2;
    const nc1 = c1 * m1 - c2 * m2;
    // na1 · x = nc1
    const x = nc1 / na1;
    // Back-substitute into equation (1) if b1 != 0, else (2)
    let y: number;
    let backEq: string;
    if (b1 !== 0) {
      y = (c1 - a1 * x) / b1;
      backEq = `y = (${fmtNum(c1)} − ${fmtNum(a1)}·${fmtNum(x)}) / ${fmtNum(b1)} = ${fmtNum(y)}`;
    } else {
      y = (c2 - a2 * x) / b2;
      backEq = `y = (${fmtNum(c2)} − ${fmtNum(a2)}·${fmtNum(x)}) / ${fmtNum(b2)} = ${fmtNum(y)}`;
    }

    steps.push({
      title: "Substitute — scale each equation to match y-coefficients",
      body: (
        <FormulaBlock>
          (1′) {fmtEq(a1 * m1, b1 * m1, c1 * m1)}
          <br />
          (2′) {fmtEq(a2 * m2, b2 * m2, c2 * m2)}
        </FormulaBlock>
      ),
    });

    steps.push({
      title: "Subtract to eliminate y",
      body: (
        <FormulaBlock>
          (1′) − (2′) → {fmtNum(na1)}x = {fmtNum(nc1)}
        </FormulaBlock>
      ),
    });

    steps.push({
      title: "Solve for x",
      body: (
        <FormulaBlock>
          x = {fmtNum(nc1)} / {fmtNum(na1)} = {fmtNum(x)}
        </FormulaBlock>
      ),
    });

    steps.push({
      title: "Back-substitute to find y",
      body: <FormulaBlock>{backEq}</FormulaBlock>,
    });

    steps.push({
      title: "Answer",
      body: (
        <FormulaBlock>
          x = {fmtNum(x)}, y = {fmtNum(y)}
        </FormulaBlock>
      ),
    });

    return { kind: "unique", x, y, steps, method: "Elimination" };
  }

  // D == 0: parallel or coincident. Check dependency.
  // If one equation is all-zero coefficients, handle separately.
  const eq1AllZero = a1 === 0 && b1 === 0;
  const eq2AllZero = a2 === 0 && b2 === 0;
  if (eq1AllZero && c1 !== 0) {
    return {
      kind: "none",
      steps: [
        {
          title: "Equation (1) is inconsistent on its own",
          body: (
            <p className="font-mono">
              0 = {fmtNum(c1)} has no solution.
            </p>
          ),
        },
      ],
      reason: "Equation (1) reduces to a false statement.",
    };
  }
  if (eq2AllZero && c2 !== 0) {
    return {
      kind: "none",
      steps: [
        {
          title: "Equation (2) is inconsistent on its own",
          body: (
            <p className="font-mono">
              0 = {fmtNum(c2)} has no solution.
            </p>
          ),
        },
      ],
      reason: "Equation (2) reduces to a false statement.",
    };
  }

  // Are (a2, b2, c2) a scalar multiple of (a1, b1, c1)?
  // Find scalar k from a nonzero coefficient of eq1.
  let k: number | null = null;
  if (a1 !== 0) k = a2 / a1;
  else if (b1 !== 0) k = b2 / b1;
  else if (c1 !== 0) k = c2 / c1;

  const nearEq = (u: number, v: number) => Math.abs(u - v) < 1e-9;

  if (k !== null && nearEq(k * a1, a2) && nearEq(k * b1, b2) && nearEq(k * c1, c2)) {
    steps.push({
      title: "The two equations are proportional",
      body: (
        <p>
          Equation (2) equals{" "}
          <span className="font-mono">{fmtNum(k)}</span> · Equation (1), so
          they describe the same line. Every point on that line satisfies
          both.
        </p>
      ),
    });
    return {
      kind: "infinite",
      steps,
      reason: "The equations describe the same line — infinitely many solutions.",
    };
  }

  steps.push({
    title: "Compare the coefficients",
    body: (
      <p>
        The left-hand sides are proportional (same slope), but the
        right-hand sides are not scaled by the same factor. The lines are
        parallel but distinct.
      </p>
    ),
  });
  steps.push({
    title: "Elimination gives a contradiction",
    body: (
      <p>
        Any attempt to eliminate a variable collapses to a false statement
        such as <span className="font-mono">0 = k</span> with k ≠ 0.
      </p>
    ),
  });
  return {
    kind: "none",
    steps,
    reason: "The lines are parallel — no solution exists.",
  };
}

// ---------------- Page ----------------


function LinesPlot({
  a1, b1, c1, a2, b2, c2, x, y,
}: {
  a1: number; b1: number; c1: number; a2: number; b2: number; c2: number; x: number; y: number;
}) {
  const W = 320, H = 260, padL = 32, padR = 14, padT = 14, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const span = Math.max(Math.abs(x), Math.abs(y), 5) * 1.6;
  const xLo = -span, xHi = span, yLo = -span, yHi = span;
  const xTo = (v: number) => padL + ((v - xLo) / (xHi - xLo)) * iw;
  const yTo = (v: number) => padT + ih - ((v - yLo) / (yHi - yLo)) * ih;

  const linePts = (a: number, b: number, c: number): [number, number][] | null => {
    if (b !== 0) {
      return [
        [xLo, (c - a * xLo) / b],
        [xHi, (c - a * xHi) / b],
      ];
    }
    if (a !== 0) {
      const xv = c / a;
      return [
        [xv, yLo],
        [xv, yHi],
      ];
    }
    return null;
  };
  const l1 = linePts(a1, b1, c1);
  const l2 = linePts(a2, b2, c2);

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card/30 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Both lines and their intersection</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[280px]" role="img" aria-label="Plot of both lines with their intersection point">
        <line x1={padL} x2={W - padR} y1={yTo(0)} y2={yTo(0)} stroke="var(--color-border)" strokeWidth={1} />
        <line x1={xTo(0)} x2={xTo(0)} y1={padT} y2={H - padB} stroke="var(--color-border)" strokeWidth={1} />
        {l1 && (
          <line x1={xTo(l1[0][0])} y1={yTo(l1[0][1])} x2={xTo(l1[1][0])} y2={yTo(l1[1][1])} stroke="var(--color-primary)" strokeWidth={2} />
        )}
        {l2 && (
          <line x1={xTo(l2[0][0])} y1={yTo(l2[0][1])} x2={xTo(l2[1][0])} y2={yTo(l2[1][1])} stroke="var(--color-muted-foreground)" strokeWidth={2} strokeDasharray="4 3" />
        )}
        {Number.isFinite(x) && Number.isFinite(y) && (
          <circle cx={xTo(x)} cy={yTo(y)} r={4.5} fill="var(--color-primary)" stroke="var(--color-background)" strokeWidth={1.5} />
        )}
      </svg>
    </div>
  );
}

function SimultaneousPage() {
  const [a1, setA1] = useState("2");
  const [b1, setB1] = useState("3");
  const [c1, setC1] = useState("12");
  const [a2, setA2] = useState("1");
  const [b2, setB2] = useState("-1");
  const [c2, setC2] = useState("1");
  const [res, setRes] = useState<Solution | null>(null);
  const [display, setDisplay] = useState<{ label: string; value: ReactNode; note?: ReactNode } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const parse = (s: string, name: string) => {
    const n = Number(s.trim().replace(/[,\s_]/g, ""));
    if (!Number.isFinite(n)) throw new Error(`"${name}" must be a number.`);
    return n;
  };

  const onCalc = () => {
    setErr(null);
    setRes(null);
    setDisplay(null);
    try {
      const A1 = parse(a1, "a₁");
      const B1 = parse(b1, "b₁");
      const C1 = parse(c1, "c₁");
      const A2 = parse(a2, "a₂");
      const B2 = parse(b2, "b₂");
      const C2 = parse(c2, "c₂");
      const s = solve(A1, B1, C1, A2, B2, C2);
      setRes(s);
      if (s.kind === "unique") {
        setDisplay({
          label: "Solution",
          value: (
            <span className="font-mono">
              x = {fmtNum(s.x)}, &nbsp; y = {fmtNum(s.y)}
            </span>
          ),
          note: `Solved by ${s.method}. The two lines meet at a single point.`,
        });
      } else if (s.kind === "none") {
        setDisplay({
          label: "No solution",
          value: <span className="font-mono">∅</span>,
          note: s.reason,
        });
      } else {
        setDisplay({
          label: "Infinitely many solutions",
          value: <span className="font-mono">∞ points</span>,
          note: s.reason,
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input.");
    }
  };

  return (
    <MathCalcPage
      name="Simultaneous Equations Solver"
      tagline="Solve a system of two linear equations in two unknowns. Enter the coefficients of a₁x + b₁y = c₁ and a₂x + b₂y = c₂ — the solver returns (x, y), or flags cleanly when the lines are parallel or identical."
      extras={
        <>
          <CalcSection title="What is a system of equations?">
            <p>
              A system of equations is a set of two or more equations that
              share the same variables. A <em>solution</em> makes every
              equation true at once. For two linear equations in x and y,
              each equation is a straight line and the solution is where the
              lines meet — one point (unique), never (parallel), or every
              point on the shared line (coincident).
            </p>
          </CalcSection>

          <CalcSection title="Solving 2×2 systems, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one part of what the calculator does — the
              standard form, the two solving techniques, and the two special
              cases where a unique answer doesn't exist.
            </p>
            <GuideCards items={SIM_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Solves any 2×2 linear system in the form ax + by = c",
                "Accepts negative and decimal coefficients",
                "Detects parallel lines (no solution) and coincident lines (infinite solutions)",
                "Shows the elimination method step by step, including the check substitution",
                "Reports the method used and the geometric interpretation",
              ]}
            />
          </CalcSection>


          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Which method should I use — substitution or elimination?",
                  a: (
                    <p>
                      Use substitution when one equation already has a
                      variable with coefficient 1 or −1. Otherwise
                      elimination is usually faster because you don't have to
                      manipulate fractions.
                    </p>
                  ),
                },
                {
                  q: "What is the determinant and why does it matter?",
                  a: (
                    <p>
                      For a 2×2 system, the determinant is{" "}
                      <span className="font-mono">a₁b₂ − a₂b₁</span>. When
                      it's nonzero the system has a unique solution; when
                      it's zero the lines are either parallel or identical.
                    </p>
                  ),
                },
                {
                  q: "Can decimal or negative coefficients cause problems?",
                  a: (
                    <p>
                      No. The calculator handles any real-number coefficients
                      the same way. If the arithmetic gets messy by hand,
                      that's when elimination tends to shine.
                    </p>
                  ),
                },
                {
                  q: "How do I enter an equation like y = 2x + 1?",
                  a: (
                    <p>
                      Rewrite it as −2x + y = 1 first, then enter a = −2,
                      b = 1, c = 1. Any linear equation can be reshaped into
                      the ax + by = c form.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/quadratic-formula-calculator", label: "Quadratic Formula Calculator" },
                { to: "/calculators/math/matrix-calculator", label: "Matrix Calculator" },
                { to: "/calculators/math/polynomial-calculator", label: "Polynomial Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <div className="mb-3 text-sm font-medium text-foreground">
            Equation (1): a₁x + b₁y = c₁
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="a₁" htmlFor="a1">
              <TextInput id="a1" value={a1} onChange={(e) => setA1(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="b₁" htmlFor="b1">
              <TextInput id="b1" value={b1} onChange={(e) => setB1(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="c₁" htmlFor="c1">
              <TextInput id="c1" value={c1} onChange={(e) => setC1(e.target.value)} inputMode="decimal" />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <div className="mb-3 text-sm font-medium text-foreground">
            Equation (2): a₂x + b₂y = c₂
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="a₂" htmlFor="a2">
              <TextInput id="a2" value={a2} onChange={(e) => setA2(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="b₂" htmlFor="b2">
              <TextInput id="b2" value={b2} onChange={(e) => setB2(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="c₂" htmlFor="c2">
              <TextInput id="c2" value={c2} onChange={(e) => setC2(e.target.value)} inputMode="decimal" />
            </Field>
          </div>
        </div>

        <PrimaryButton onClick={onCalc}>Solve</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {res && display && (
        <>
          <ResultBox label={display.label} value={display.value} note={display.note} />
          {res.kind === "unique" && (
            <LinesPlot
              a1={Number(a1)} b1={Number(b1)} c1={Number(c1)}
              a2={Number(a2)} b2={Number(b2)} c2={Number(c2)}
              x={res.x} y={res.y}
            />
          )}
          <StepsToggle steps={res.steps} />
        </>
      )}
    </MathCalcPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function LinesMini({ kind = "cross" as "cross" | "parallel" | "same" }) {
  const w = 220, h = 130;
  const lines: [number, number, number, number][] =
    kind === "cross"
      ? [[20, 100, 200, 30], [20, 30, 200, 110]]
      : kind === "parallel"
      ? [[20, 90, 200, 40], [20, 110, 200, 60]]
      : [[20, 90, 200, 40], [20, 90, 200, 40]];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto h-32 w-full max-w-[240px]">
      <line x1="10" y1={h - 15} x2={w - 10} y2={h - 15} stroke="var(--color-border)" />
      <line x1="20" y1="10" x2="20" y2={h - 5} stroke="var(--color-border)" />
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-primary)" strokeWidth="2" strokeDasharray={kind === "same" && i === 1 ? "5,3" : undefined} />
      ))}
      {kind === "cross" && <circle cx="110" cy="70" r="5" className="fill-primary" />}
    </svg>
  );
}

function SubMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="24" className="fill-foreground font-mono" fontSize="11">x − y = 1  →  x = 1 + y</text>
      <text x="20" y="46" className="fill-foreground font-mono" fontSize="11">2(1+y) + 3y = 12</text>
      <text x="20" y="66" className="fill-foreground font-mono" fontSize="11">5y = 10  →  y = 2</text>
      <text x="20" y="88" className="fill-foreground font-mono" fontSize="11">x = 1 + 2 = 3</text>
      <text x="20" y="112" className="fill-primary font-mono" fontSize="12">(x, y) = (3, 2)</text>
    </svg>
  );
}

function ElimMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="24" className="fill-foreground font-mono" fontSize="11">(1) 2x + 3y = 12</text>
      <text x="20" y="42" className="fill-foreground font-mono" fontSize="11">(2)  x −  y = 1  ×3</text>
      <line x1="20" y1="50" x2="200" y2="50" stroke="var(--color-border)" />
      <text x="20" y="68" className="fill-foreground font-mono" fontSize="11">3x − 3y = 3</text>
      <text x="20" y="86" className="fill-foreground font-mono" fontSize="11">add: 5x = 15</text>
      <text x="20" y="110" className="fill-primary font-mono" fontSize="12">x = 3, y = 2</text>
    </svg>
  );
}

const SIM_GUIDE: GuideCardItem[] = [
  {
    key: "form",
    title: "Standard form and geometry",
    explain: (
      <>Enter each equation as <span className="font-mono">ax + by = c</span>.
      Each row is a straight line in the plane; the solution is where the
      two lines meet. The <em>determinant</em>{" "}
      <span className="font-mono">a₁b₂ − a₂b₁</span> tells you upfront whether
      that intersection is a single point.</>
    ),
    formula: <>a₁x + b₁y = c₁ &nbsp;·&nbsp; a₂x + b₂y = c₂</>,
    legend: [{ sym: "det ≠ 0", def: "unique intersection point" }],
    diagram: <LinesMini kind="cross" />,
    example: { given: "2x+3y=12, x−y=1", substitute: "det = 2·(−1) − 1·3 = −5 ≠ 0", answer: "unique solution" },
  },
  {
    key: "sub",
    title: "Substitution method",
    explain: (
      <>Rearrange one equation to isolate a variable, plug that expression
      into the other, and you're left with a single equation in one unknown.
      Best when a variable already has coefficient 1 or −1.</>
    ),
    formula: <>x = f(y) &nbsp;→&nbsp; substitute into the other equation</>,
    legend: [{ sym: "back-substitute", def: "reuse the solved value to find the other variable" }],
    diagram: <SubMini />,
    example: { given: "2x+3y=12, x−y=1", substitute: "x = 1+y  →  5y = 10", answer: "(x, y) = (3, 2)" },
  },
  {
    key: "elim",
    title: "Elimination method",
    explain: (
      <>Scale the two equations so one variable's coefficients match (or are
      exact opposites), then add or subtract to cancel that variable. This
      calculator uses elimination internally and prints every step.</>
    ),
    formula: <>k₁·(eq1) ± k₂·(eq2) &nbsp;⇒&nbsp; one variable cancels</>,
    legend: [{ sym: "k₁, k₂", def: "scaling factors chosen to match coefficients" }],
    diagram: <ElimMini />,
    example: { given: "2x+3y=12, x−y=1", substitute: "×3 second, add: 5x = 15", answer: "(x, y) = (3, 2)" },
  },
  {
    key: "special",
    title: "No solution or infinitely many",
    explain: (
      <>If the two lines are <em>parallel</em>, elimination collapses to a
      contradiction like <span className="font-mono">0 = 5</span> — no
      solution. If they're the <em>same</em> line, it collapses to{" "}
      <span className="font-mono">0 = 0</span> — every point on the line is
      a solution. Both cases correspond to{" "}
      <span className="font-mono">a₁b₂ − a₂b₁ = 0</span>.</>
    ),
    formula: <>det = 0 &nbsp;→&nbsp; parallel or coincident</>,
    legend: [{ sym: "0 = 5", def: "parallel (no solution)" }, { sym: "0 = 0", def: "same line (infinite)" }],
    diagram: <LinesMini kind="parallel" />,
    example: { given: "2x+y=3 and 4x+2y=10", substitute: "×2 first → 4x+2y=6 vs 10", answer: "no solution" },
  },
];
