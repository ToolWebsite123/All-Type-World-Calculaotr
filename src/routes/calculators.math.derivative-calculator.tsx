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

export const Route = createFileRoute("/calculators/math/derivative-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Derivative Calculator",
      title: "Derivative Calculator — Polynomial Differentiation",
      metaDescription:
        "Differentiate a polynomial in x using the power rule. Enter e.g. 3x^3 + 2x^2 − 5x + 7, evaluate at a point, and see every step.",
      canonicalUrl: "/calculators/math/derivative-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Derivative Calculator", path: "/calculators/math/derivative-calculator" },
      ],
      faqs: [
        {
          q: "What does a derivative represent?",
          a: "The derivative of a function at a point is its instantaneous rate of change — geometrically, the slope of the tangent line to the graph at that point. For a distance-vs-time graph the derivative is velocity; for velocity-vs-time it is acceleration.",
        },
        {
          q: "What is the power rule?",
          a: "For any real exponent n, d/dx[x^n] = n · x^(n−1). You bring the exponent down as a coefficient and reduce the exponent by 1. Combined with linearity (constants factor out, sums differentiate term by term), it handles every polynomial.",
        },
        {
          q: "What is the derivative of a constant?",
          a: "Zero. A constant does not change as x changes, so its rate of change is 0. That is why the +7 in 3x^3 + 2x^2 − 5x + 7 disappears in the derivative.",
        },
        {
          q: "Does this calculator handle sin(x), e^x or ln(x)?",
          a: "No. This tool is deliberately limited to polynomial expressions in x — terms of the form a·x^n with integer (or simple) exponents. Trigonometric, exponential and logarithmic derivatives use different rules that are outside its scope.",
        },
      ],
    }),
  component: DerivativePage,
});

// ---------------- Parser ----------------
// Parses a polynomial in x into a map: exponent -> coefficient.

function parsePolynomial(raw: string): Map<number, number> {
  let s = raw
    .replace(/\s+/g, "")
    .replace(/−/g, "-")
    .replace(/\*/g, "")
    .replace(/[Xx]/g, "x");
  if (!s) throw new Error("Enter a polynomial in x.");
  if (s[0] !== "+" && s[0] !== "-") s = "+" + s;

  const termRe = /[+-][^+-]+/g;
  const matches = s.match(termRe);
  if (!matches) throw new Error(`Cannot parse "${raw}".`);

  const terms = new Map<number, number>();
  for (const raw of matches) {
    const sign = raw[0] === "-" ? -1 : 1;
    const body = raw.slice(1);
    if (body.length === 0) throw new Error(`Empty term in "${raw}".`);

    let coef: number;
    let exp: number;

    if (!body.includes("x")) {
      const n = Number(body);
      if (!Number.isFinite(n)) throw new Error(`Bad constant "${body}".`);
      coef = sign * n;
      exp = 0;
    } else {
      const xIdx = body.indexOf("x");
      const coefPart = body.slice(0, xIdx);
      const rest = body.slice(xIdx + 1);
      if (coefPart === "") coef = sign * 1;
      else {
        const c = Number(coefPart);
        if (!Number.isFinite(c)) throw new Error(`Bad coefficient "${coefPart}".`);
        coef = sign * c;
      }
      if (rest === "") exp = 1;
      else if (rest.startsWith("^")) {
        const e = Number(rest.slice(1));
        if (!Number.isFinite(e)) throw new Error(`Bad exponent "${rest.slice(1)}".`);
        exp = e;
      } else {
        throw new Error(`Unexpected "${rest}" after x. Use x^n for exponents.`);
      }
    }
    terms.set(exp, (terms.get(exp) ?? 0) + coef);
  }
  // remove zero terms
  for (const [k, v] of terms) if (v === 0) terms.delete(k);
  return terms;
}

function fmtNum(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const r = Math.round(n * 1e10) / 1e10;
  return r.toString();
}

function fmtTerm(coef: number, exp: number, first: boolean): string {
  const sign = coef < 0 ? "−" : first ? "" : "+";
  const a = Math.abs(coef);
  const coefStr =
    exp === 0 ? fmtNum(a) : a === 1 ? "" : `${fmtNum(a)}`;
  const xStr = exp === 0 ? "" : exp === 1 ? "x" : `x^${fmtNum(exp)}`;
  const body = `${coefStr}${xStr}` || "1";
  return first ? `${sign}${body}` : ` ${sign} ${body}`;
}

function fmtPoly(terms: Map<number, number>): string {
  if (terms.size === 0) return "0";
  const entries = [...terms.entries()].sort((a, b) => b[0] - a[0]);
  return entries.map(([exp, c], i) => fmtTerm(c, exp, i === 0)).join("");
}

function evaluate(terms: Map<number, number>, x: number): number {
  let sum = 0;
  for (const [exp, c] of terms) sum += c * Math.pow(x, exp);
  return sum;
}

function differentiate(
  terms: Map<number, number>,
): { deriv: Map<number, number>; steps: Step[] } {
  const deriv = new Map<number, number>();
  const rows: ReactNode[] = [];
  const entries = [...terms.entries()].sort((a, b) => b[0] - a[0]);

  for (const [exp, c] of entries) {
    const original = fmtTerm(c, exp, true);
    if (exp === 0) {
      rows.push(
        <div key={`t-${exp}`} className="font-mono text-sm">
          d/dx[{original}] = 0 &nbsp;·&nbsp; <span className="text-muted-foreground">(derivative of a constant)</span>
        </div>,
      );
      continue;
    }
    const newCoef = c * exp;
    const newExp = exp - 1;
    deriv.set(newExp, (deriv.get(newExp) ?? 0) + newCoef);
    const workedCoef = fmtNum(c);
    const workedExp = fmtNum(exp);
    const resultTerm = fmtTerm(newCoef, newExp, true);
    rows.push(
      <div key={`t-${exp}`} className="font-mono text-sm">
        d/dx[{original}] = {workedCoef} · {workedExp} · x^{fmtNum(exp - 1)} = {resultTerm}
      </div>,
    );
  }

  for (const [k, v] of deriv) if (v === 0) deriv.delete(k);

  const steps: Step[] = [
    {
      title: "Formula — power rule",
      body: (
        <FormulaWithLegend
          formula={<>d/dx[a·xⁿ] = a·n·xⁿ⁻¹; &nbsp; d/dx[constant] = 0</>}
          legend={[
            { sym: "a", def: "coefficient of the term" },
            { sym: "n", def: "exponent of x" },
            { sym: "a·n", def: "new coefficient after differentiating" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — apply the power rule to each term",
      body: <FormulaBlock>{rows}</FormulaBlock>,
    },
    {
      title: "Sum the term derivatives",
      body: <FormulaBlock>f′(x) = {fmtPoly(deriv)}</FormulaBlock>,
    },
  ];
  return { deriv, steps };
}

// ---------------- Page ----------------


function evalPoly(terms: Map<number, number>, x: number): number {
  let sum = 0;
  for (const [exp, c] of terms) sum += c * Math.pow(x, exp);
  return sum;
}

function DerivativePlot({ f, fPrime, at }: { f: Map<number, number>; fPrime: Map<number, number>; at?: number }) {
  const W = 360, H = 220, padL = 34, padR = 14, padT = 14, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const xLo = -6, xHi = 6;
  const steps = 80;
  const fPts: [number, number][] = [];
  const fpPts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = xLo + ((xHi - xLo) * i) / steps;
    fPts.push([x, evalPoly(f, x)]);
    fpPts.push([x, evalPoly(fPrime, x)]);
  }
  const allY = [...fPts, ...fpPts].map((p) => p[1]).filter(Number.isFinite);
  let yLo = Math.min(...allY);
  let yHi = Math.max(...allY);
  if (!Number.isFinite(yLo) || !Number.isFinite(yHi) || yHi - yLo < 1e-6) { yLo = -5; yHi = 5; }
  const pad = (yHi - yLo) * 0.1 || 1;
  yLo -= pad; yHi += pad;
  const cap = (v: number) => Math.max(yLo, Math.min(yHi, v));
  const xTo = (v: number) => padL + ((v - xLo) / (xHi - xLo)) * iw;
  const yTo = (v: number) => padT + ih - ((cap(v) - yLo) / (yHi - yLo)) * ih;
  const toPath = (pts: [number, number][]) =>
    pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${xTo(x).toFixed(1)},${yTo(y).toFixed(1)}`).join(" ");
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card/30 p-3">
      <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-primary" /> f(x)</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-muted-foreground" /> f&apos;(x)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[300px]" role="img" aria-label="Plot of f(x) and its derivative f'(x)">
        <line x1={padL} x2={W - padR} y1={yTo(0)} y2={yTo(0)} stroke="var(--color-border)" strokeWidth={1} />
        <line x1={xTo(0)} x2={xTo(0)} y1={padT} y2={H - padB} stroke="var(--color-border)" strokeWidth={1} />
        <path d={toPath(fPts)} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
        <path d={toPath(fpPts)} fill="none" stroke="var(--color-muted-foreground)" strokeWidth={2} strokeDasharray="4 3" />
        {at !== undefined && Number.isFinite(at) && at >= xLo && at <= xHi && (
          <circle cx={xTo(at)} cy={yTo(evalPoly(fPrime, at))} r={4} fill="var(--color-primary)" stroke="var(--color-background)" strokeWidth={1.5} />
        )}
      </svg>
    </div>
  );
}

function DerivativePage() {
  const [expr, setExpr] = useState("3x^3 + 2x^2 - 5x + 7");
  const [at, setAt] = useState("");
  const [display, setDisplay] = useState<{
    value: ReactNode;
    note: ReactNode;
    terms: Map<number, number>;
    deriv: Map<number, number>;
    at?: number;
  } | null>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setDisplay(null);
    setSteps(null);
    try {
      const terms = parsePolynomial(expr);
      const { deriv, steps: dSteps } = differentiate(terms);
      const derivStr = fmtPoly(deriv);

      const allSteps: Step[] = [
        {
          title: "Given",
          body: <FormulaBlock>f(x) = {fmtPoly(terms)}</FormulaBlock>,
        },
        ...dSteps,
      ];

      let note: ReactNode = "Derivative computed with the power rule.";
      if (at.trim() !== "") {
        const x = Number(at);
        if (!Number.isFinite(x)) throw new Error("Evaluation point must be a number.");
        const y = evaluate(deriv, x);
        note = (
          <>
            Evaluation: f′({fmtNum(x)}) ={" "}
            <span className="font-mono">{fmtNum(y)}</span>. This is the slope
            of the tangent line to f(x) at x = {fmtNum(x)}.
          </>
        );
        allSteps.push({
          title: `Answer — evaluate at x = ${fmtNum(x)}`,
          body: (
            <FormulaBlock>
              f′({fmtNum(x)}) = {derivStr === "0" ? "0" : derivStr.replace(/x/g, `(${fmtNum(x)})`)} = {fmtNum(y)}
            </FormulaBlock>
          ),
        });
      }

      setDisplay({
        value: <span className="font-mono">f′(x) = {derivStr}</span>,
        note,
        terms,
        deriv,
        at: at.trim() !== "" ? Number(at) : undefined,
      });
      setSteps(allSteps);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input.");
    }
  };

  return (
    <MathCalcPage
      name="Derivative Calculator"
      tagline="Enter a polynomial in x such as 3x^3 + 2x^2 − 5x + 7. The calculator differentiates it term by term with the power rule, shows every step, and optionally evaluates the derivative at a specific x value."
      extras={
        <>
          <CalcSection title="What is a derivative?">
            <p>
              A derivative measures how fast a function changes. If you
              zoom in on the graph of f(x) at a single point, the curve
              starts to look like a straight line — the tangent line at
              that point. The slope of that tangent line is the
              derivative, written f′(x) or df/dx. Intuitively it answers
              the question <em>"if x wiggles by a tiny amount, how much
              does f(x) wiggle in response?"</em>
            </p>
            <p>
              In everyday terms: if f(t) is the distance a car has
              travelled at time t, then f′(t) is its speed. If f(t) is
              speed, then f′(t) is acceleration. Derivatives turn "how
              much" into "how fast".
            </p>
          </CalcSection>

<CalcSection title="How this calculator differentiates, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one rule the tool applies to your polynomial
              — how a single power term shrinks, how a coefficient rides
              along, and how the terms split apart so each is handled on its
              own.
            </p>
            <GuideCards items={DERIV_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Differentiates any polynomial in x, including negative and non-integer exponents (e.g. 4x^(-2) or 6x^(0.5))",
                "Applies the power rule to every term and shows the intermediate a · n · x^(n−1) form",
                "Combines like terms after differentiation for a clean final expression",
                "Optionally evaluates f′(x) at a given point to give the slope of the tangent line there",
                "Handles missing coefficients (x^2 as 1x^2) and constant terms correctly",
                "Reports the derivative of a constant as 0, so the +C in a polynomial vanishes automatically",
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Scope: polynomial expressions only. Trigonometric,
              exponential and logarithmic functions (sin x, cos x, e^x,
              ln x, …) are not supported — those require rules beyond
              the power rule.
            </p>
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Why does the constant term disappear?",
                  a: (
                    <p>
                      Because the derivative of any constant is 0. A
                      constant term contributes a flat horizontal piece
                      to the graph, which has no slope, so it does not
                      appear in f′(x). That is also why every
                      antiderivative comes with an unknown "+C" — the
                      constant is invisible to differentiation.
                    </p>
                  ),
                },
                {
                  q: "What does evaluating the derivative at a point give me?",
                  a: (
                    <p>
                      The slope of the tangent line to the curve at that
                      x-value. For example, if f(x) = x^2 then f′(x) =
                      2x, and f′(3) = 6 — so at x = 3 the graph is
                      climbing with slope 6.
                    </p>
                  ),
                },
                {
                  q: "Can I use negative or fractional exponents?",
                  a: (
                    <p>
                      Yes. The power rule works for any real exponent.
                      For instance d/dx[x^(−2)] = −2·x^(−3), and
                      d/dx[x^(1/2)] = (1/2)·x^(−1/2). Enter them as{" "}
                      <span className="font-mono">x^-2</span> or{" "}
                      <span className="font-mono">x^0.5</span>.
                    </p>
                  ),
                },
                {
                  q: "Why doesn't this handle sin(x) or e^x?",
                  a: (
                    <p>
                      Those functions have their own derivative rules
                      (d/dx[sin x] = cos x, d/dx[e^x] = e^x, and so on)
                      that are not the power rule. To keep the steps
                      short and the parser predictable, this calculator
                      is intentionally scoped to polynomials only.
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
                  to: "/calculators/math/polynomial-calculator",
                  label: "Polynomial Calculator",
                },
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
        <Field label="Polynomial f(x)" htmlFor="expr">
          <TextInput
            id="expr"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            placeholder="e.g. 3x^3 + 2x^2 - 5x + 7"
          />
        </Field>
        <Field label="Evaluate f′(x) at x = (optional)" htmlFor="at">
          <TextInput
            id="at"
            value={at}
            onChange={(e) => setAt(e.target.value)}
            placeholder="e.g. 2"
            inputMode="decimal"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Use <span className="font-mono">^</span> for exponents (e.g.{" "}
          <span className="font-mono">x^3</span>). Only the variable x is
          supported. Polynomials only — no sin, cos, e^x or ln.
        </p>
        <PrimaryButton onClick={onCalc}>Differentiate</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {display && (
        <>
          <ResultBox label="Derivative" value={display.value} note={display.note} />
          <DerivativePlot f={display.terms} fPrime={display.deriv} at={display.at} />
          {steps && <StepsToggle steps={steps} />}
        </>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function PowerMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <text x="110" y="28" textAnchor="middle" fontSize="13" fill="var(--color-primary)">x^n</text>
      <path d="M90 40 Q 110 60 130 40" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#dm1)" />
      <defs><marker id="dm1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--color-primary)" /></marker></defs>
      <text x="110" y="76" textAnchor="middle" fontSize="13" fill="var(--color-foreground)">n · x^(n−1)</text>
      <text x="110" y="93" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">drop n in front, subtract 1 from exponent</text>
    </svg>
  );
}

function LinearMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <text x="110" y="28" textAnchor="middle" fontSize="12" fill="var(--color-primary)">d/dx [ a·f + b·g + c ]</text>
      <text x="110" y="55" textAnchor="middle" fontSize="12" fill="var(--color-foreground)">= a·f′ + b·g′ + 0</text>
      <text x="110" y="82" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">coefficients ride along · constants vanish</text>
    </svg>
  );
}

function SlopeMini() {
  return (
    <svg viewBox="0 0 220 110" className="w-full">
      <rect x="1" y="1" width="218" height="108" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <path d="M20 90 Q 90 30 200 20" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" />
      <circle cx="110" cy="45" r="3" fill="var(--color-primary)" />
      <line x1="70" y1="65" x2="150" y2="30" stroke="var(--color-foreground)" strokeWidth="1" strokeDasharray="3 2" />
      <text x="155" y="30" fontSize="10" fill="var(--color-foreground)">slope = f′(x)</text>
      <text x="110" y="105" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">the derivative is the tangent slope at each x</text>
    </svg>
  );
}

const DERIV_GUIDE: GuideCardItem[] = [
  {
    key: "power",
    title: "Power rule — the workhorse for x^n",
    explain: <>Bring the exponent down as a coefficient and lower the exponent by 1. This one rule handles every term in a polynomial.</>,
    formula: <>d/dx [ x^n ] = n · x^(n−1)</>,
    diagram: <PowerMini />,
    example: {
      given: <span className="font-mono">3x^3</span>,
      substitute: <>3 · 3 · x^(3−1)</>,
      answer: <span className="font-mono">9x^2</span>,
    },
  },
  {
    key: "lin",
    title: "Linearity — coefficients & sums split cleanly",
    explain: <>A constant coefficient stays put while its variable part is differentiated, and terms add or subtract independently. Any constant term becomes zero.</>,
    formula: <>d/dx [ a·f(x) + g(x) + c ] = a·f′(x) + g′(x)</>,
    diagram: <LinearMini />,
    example: {
      given: <span className="font-mono">3x^3 + 2x^2 − 5x + 7</span>,
      substitute: <>9x^2 + 4x − 5 + 0</>,
      answer: <span className="font-mono">9x^2 + 4x − 5</span>,
    },
  },
  {
    key: "slope",
    title: "What the answer means — instantaneous slope",
    explain: <>The derivative <span className="font-mono">f′(x)</span> is a new function whose value at a point equals the slope of the original curve's tangent line there — how fast <span className="font-mono">f</span> is changing at that x.</>,
    formula: <>f′(x) = slope of tangent to y = f(x)</>,
    diagram: <SlopeMini />,
    example: {
      given: <span className="font-mono">f(x) = x^2, at x = 3</span>,
      substitute: <>f′(x) = 2x → f′(3)</>,
      answer: <span className="font-mono">slope = 6</span>,
    },
  },
];
