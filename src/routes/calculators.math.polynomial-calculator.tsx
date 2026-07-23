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

export const Route = createFileRoute("/calculators/math/polynomial-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Polynomial Calculator",
      title: "Polynomial Calculator — Add, Subtract, Multiply, Divide",
      metaDescription:
        "Add, subtract, multiply and long-divide polynomials. See standard-form results with term-by-term steps, quotient and remainder.",
      canonicalUrl: "/calculators/math/polynomial-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Polynomial Calculator", path: "/calculators/math/polynomial-calculator" },
      ],
      faqs: [
        {
          q: "What is the degree of a polynomial?",
          a: "The degree is the largest exponent of the variable that appears with a nonzero coefficient. For 4x³ − 2x + 7 the degree is 3. A constant like 5 has degree 0, and the zero polynomial has no degree defined.",
        },
        {
          q: "What are like terms?",
          a: "Like terms are terms with exactly the same variable raised to the same power. 3x² and −7x² are like terms; 3x² and 3x are not. You can only add or subtract like terms directly by combining their coefficients.",
        },
        {
          q: "How does polynomial long division work?",
          a: "Divide the leading term of the dividend by the leading term of the divisor to get the next quotient term. Multiply the whole divisor by that term, subtract from the dividend, and repeat with the new leading term. Stop when the remainder has smaller degree than the divisor.",
        },
        {
          q: "What form should my input be in?",
          a: "Use standard algebra syntax with x as the variable, ^ for powers and + or − between terms. Examples: 3x^2 + 2x - 5, x^3 - 1, 4x - 7. Whitespace is optional and coefficients may be decimals or negatives.",
        },
      ],
    }),
  component: PolynomialPage,
});

// ---------------- Polynomial engine ----------------
// Coefficients stored as number[] where index i holds the coefficient of x^i.

function trim(p: number[]): number[] {
  const q = p.slice();
  while (q.length > 0 && Math.abs(q[q.length - 1]) < 1e-12) q.pop();
  return q;
}
function degree(p: number[]): number {
  const t = trim(p);
  return t.length - 1;
}
function addPoly(a: number[], b: number[]): number[] {
  const n = Math.max(a.length, b.length);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((a[i] ?? 0) + (b[i] ?? 0));
  return trim(out);
}
function subPoly(a: number[], b: number[]): number[] {
  const n = Math.max(a.length, b.length);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((a[i] ?? 0) - (b[i] ?? 0));
  return trim(out);
}
function mulPoly(a: number[], b: number[]): number[] {
  if (a.length === 0 || b.length === 0) return [];
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return trim(out);
}
function divPoly(a: number[], b: number[]): { q: number[]; r: number[]; steps: DivStep[] } {
  return divPolyWithSteps(a, b);
}

type DivStep = {
  quotientTerm: [number, number];
  subtracted: number[];
  before: number[];
  after: number[];
};
// Add steps field so return type accepts it
// (adjusted below where used)

// ---------------- Parsing & formatting ----------------

function parsePoly(input: string): number[] {
  const s = input.replace(/\s+/g, "").replace(/−/g, "-");
  if (!s) throw new Error("Empty polynomial.");
  // Split into signed terms
  const normalized = s.replace(/-/g, "+-");
  const terms = normalized.split("+").filter(Boolean);
  const coefs: number[] = [];
  const termRe = /^([+-]?)(\d*\.?\d*)(?:\*?(x)(?:\^(\d+))?)?$/;
  for (const t of terms) {
    const m = termRe.exec(t);
    if (!m) throw new Error(`Can't parse "${t}" — use a form like 3x^2 - 2x + 5.`);
    const sign = m[1] === "-" ? -1 : 1;
    const numStr = m[2];
    const hasX = !!m[3];
    const exp = hasX ? (m[4] ? parseInt(m[4], 10) : 1) : 0;
    let num: number;
    if (numStr === "" || numStr === ".") {
      if (!hasX) throw new Error(`Empty term in "${t}".`);
      num = 1;
    } else {
      num = parseFloat(numStr);
      if (!Number.isFinite(num)) throw new Error(`Bad number "${numStr}".`);
    }
    if (exp > 50) throw new Error(`Exponent ${exp} too large (max 50).`);
    while (coefs.length <= exp) coefs.push(0);
    coefs[exp] += sign * num;
  }
  return trim(coefs);
}

function fmtNum(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const rounded = Math.round(n * 1e10) / 1e10;
  const s = rounded.toString();
  return s;
}

function sup(n: number): string {
  return String(n)
    .split("")
    .map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)] ?? d)
    .join("");
}

function fmtTerm(coef: number, exp: number, first: boolean): string {
  const abs = Math.abs(coef);
  const sign = coef < 0 ? (first ? "−" : " − ") : first ? "" : " + ";
  const coefStr = abs === 1 && exp !== 0 ? "" : fmtNum(abs);
  const xPart = exp === 0 ? "" : exp === 1 ? "x" : `x${sup(exp)}`;
  return `${sign}${coefStr}${xPart}`;
}

function fmtPoly(p: number[]): string {
  const t = trim(p);
  if (t.length === 0) return "0";
  const parts: string[] = [];
  let first = true;
  for (let i = t.length - 1; i >= 0; i--) {
    const c = t[i];
    if (c === 0) continue;
    parts.push(fmtTerm(c, i, first));
    first = false;
  }
  return parts.length ? parts.join("") : "0";
}

// ---------------- Step builders ----------------

function buildAddSubSteps(a: number[], b: number[], op: "+" | "−"): Step[] {
  const sign = op === "+" ? 1 : -1;
  const n = Math.max(a.length, b.length);
  const rows: ReactNode[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const ca = a[i] ?? 0;
    const cb = b[i] ?? 0;
    if (ca === 0 && cb === 0) continue;
    const result = ca + sign * cb;
    const xLbl = i === 0 ? "" : i === 1 ? "x" : `x${sup(i)}`;
    rows.push(
      <div key={i} className="font-mono">
        ({fmtNum(ca)}
        {xLbl}) {op} ({fmtNum(cb)}
        {xLbl}) = {fmtNum(result)}
        {xLbl}
      </div>,
    );
  }
  return [
    {
      title: "Given",
      body: (
        <FormulaBlock>
          A = {fmtPoly(a)}
          {"\n"}B = {fmtPoly(b)}
          {"\n"}Operation: A {op} B
        </FormulaBlock>
      ),
    },
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>(A {op} B)<sub>k</sub> = A<sub>k</sub> {op} B<sub>k</sub></>}
          legend={[
            { sym: "A_k, B_k", def: "coefficient of xᵏ in each polynomial" },
            { sym: "missing power", def: "treat as coefficient 0" },
          ]}
        />
      ),
    },
    {
      title: op === "+" ? "Substitute — add coefficients power by power" : "Substitute — subtract coefficients power by power",
      body: <div className="space-y-1">{rows}</div>,
    },
    {
      title: "Answer",
      body: (
        <FormulaBlock>
          {fmtPoly(op === "+" ? addPoly(a, b) : subPoly(a, b))}
        </FormulaBlock>
      ),
    },
  ];
}

function buildMulSteps(a: number[], b: number[]): Step[] {
  const distRows: ReactNode[] = [];
  for (let i = a.length - 1; i >= 0; i--) {
    if (a[i] === 0) continue;
    const parts: string[] = [];
    for (let j = b.length - 1; j >= 0; j--) {
      if (b[j] === 0) continue;
      parts.push(`${fmtNum(a[i] * b[j])}${j + i === 0 ? "" : j + i === 1 ? "x" : `x${sup(j + i)}`}`);
    }
    distRows.push(
      <div key={i} className="font-mono">
        {fmtTerm(a[i], i, true)} · ({fmtPoly(b)}) = {parts.join(" + ").replace(/\+ -/g, "− ")}
      </div>,
    );
  }
  return [
    {
      title: "Given",
      body: (
        <FormulaBlock>
          A = {fmtPoly(a)}
          {"\n"}B = {fmtPoly(b)}
          {"\n"}Operation: A × B
        </FormulaBlock>
      ),
    },
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>(a·xⁱ)(b·xʲ) = ab·xⁱ⁺ʲ</>}
          legend={[
            { sym: "a, b", def: "coefficients of the two terms being multiplied" },
            { sym: "i, j", def: "exponents — added to get the exponent of the product" },
          ]}
        />
      ),
    },
    { title: "Substitute — distribute every term of A across B", body: <div className="space-y-1">{distRows}</div> },
    {
      title: "Answer",
      body: <FormulaBlock>{fmtPoly(mulPoly(a, b))}</FormulaBlock>,
    },
  ];
}

function buildDivSteps(a: number[], b: number[], divSteps: DivStep[], q: number[], r: number[]): Step[] {
  const rows: ReactNode[] = divSteps.map((s, i) => (
    <div key={i} className="rounded-lg border border-border/50 bg-background/40 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Step {i + 1}
      </div>
      <div className="mt-1 font-mono text-sm">
        Leading term:{" "}
        <span className="text-foreground">
          {fmtNum(s.before[s.before.length - 1])}
          {s.before.length - 1 === 0
            ? ""
            : s.before.length - 1 === 1
              ? "x"
              : `x${sup(s.before.length - 1)}`}
        </span>
        <br />
        Next quotient term:{" "}
        <span className="text-primary">
          {fmtTerm(s.quotientTerm[0], s.quotientTerm[1], true)}
        </span>
        <br />
        Subtract: <span className="text-foreground">{fmtPoly(s.subtracted)}</span>
        <br />
        New dividend: <span className="text-foreground">{fmtPoly(s.after)}</span>
      </div>
    </div>
  ));
  return [
    {
      title: "Given",
      body: (
        <FormulaBlock>
          A (dividend) = {fmtPoly(a)}
          {"\n"}B (divisor)&nbsp; = {fmtPoly(b)}
          {"\n"}Operation: A ÷ B
        </FormulaBlock>
      ),
    },
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>A = B · Q + R,&nbsp; deg(R) &lt; deg(B)</>}
          legend={[
            { sym: "Q", def: "quotient — built one term at a time from leading terms" },
            { sym: "R", def: "remainder — what's left when no more terms can be divided" },
          ]}
        />
      ),
    },
    { title: "Substitute — round-by-round long division", body: <div className="space-y-2">{rows}</div> },
    {
      title: "Answer",
      body: (
        <FormulaBlock>
          Quotient Q&nbsp; = {fmtPoly(q)}
          {"\n"}Remainder R = {fmtPoly(r)}
        </FormulaBlock>
      ),
    },
  ];
}

// ---------------- Page ----------------

type Op = "+" | "−" | "×" | "÷";


function evalPoly(p: number[], x: number): number {
  let sum = 0;
  for (let i = 0; i < p.length; i++) sum += p[i] * Math.pow(x, i);
  return sum;
}

function PolynomialPlot({ p, label }: { p: number[]; label: string }) {
  const W = 360, H = 220, padL = 34, padR = 14, padT = 14, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const xLo = -6, xHi = 6;
  const steps = 80;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = xLo + ((xHi - xLo) * i) / steps;
    pts.push([x, evalPoly(p, x)]);
  }
  const ys = pts.map((pt) => pt[1]).filter(Number.isFinite);
  let yLo = Math.min(...ys);
  let yHi = Math.max(...ys);
  if (!Number.isFinite(yLo) || !Number.isFinite(yHi) || yHi - yLo < 1e-6) { yLo = -5; yHi = 5; }
  const pad = (yHi - yLo) * 0.1 || 1;
  yLo -= pad; yHi += pad;
  const cap = (v: number) => Math.max(yLo, Math.min(yHi, v));
  const xTo = (v: number) => padL + ((v - xLo) / (xHi - xLo)) * iw;
  const yTo = (v: number) => padT + ih - ((cap(v) - yLo) / (yHi - yLo)) * ih;
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${xTo(x).toFixed(1)},${yTo(y).toFixed(1)}`).join(" ");
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card/30 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Graph of {label}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[300px]" role="img" aria-label={`Plot of ${label}`}>
        <line x1={padL} x2={W - padR} y1={yTo(0)} y2={yTo(0)} stroke="var(--color-border)" strokeWidth={1} />
        <line x1={xTo(0)} x2={xTo(0)} y1={padT} y2={H - padB} stroke="var(--color-border)" strokeWidth={1} />
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      </svg>
    </div>
  );
}

function PolynomialPage() {
  const [aStr, setAStr] = useState("3x^2 + 2x - 5");
  const [bStr, setBStr] = useState("x^2 - x + 4");
  const [op, setOp] = useState<Op>("+");
  const [result, setResult] = useState<{
    label: string;
    display: ReactNode;
    steps: Step[];
    note?: ReactNode;
    plotPoly?: number[];
    plotLabel?: string;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setResult(null);
    try {
      const a = parsePoly(aStr);
      const b = parsePoly(bStr);
      if (op === "+" || op === "−") {
        const out = op === "+" ? addPoly(a, b) : subPoly(a, b);
        setResult({
          label: `A ${op} B`,
          display: <span className="font-mono">{fmtPoly(out)}</span>,
          steps: buildAddSubSteps(a, b, op),
          note: `Degree ${degree(out)}`,
          plotPoly: out,
          plotLabel: `y = ${fmtPoly(out)}`,
        });
      } else if (op === "×") {
        const out = mulPoly(a, b);
        setResult({
          label: "A × B",
          display: <span className="font-mono">{fmtPoly(out)}</span>,
          steps: buildMulSteps(a, b),
          note: `Degree ${degree(out)}`,
          plotPoly: out,
          plotLabel: `y = ${fmtPoly(out)}`,
        });
      } else {
        const { q, r, steps: dSteps } = divPolyWithSteps(a, b);
        setResult({
          label: "A ÷ B",
          display: (
            <span className="font-mono">
              {fmtPoly(q)}
              {r.length > 0 && (
                <>
                  {"  "}remainder{"  "}
                  {fmtPoly(r)}
                </>
              )}
            </span>
          ),
          steps: buildDivSteps(a, b, dSteps, q, r),
          note:
            r.length === 0
              ? "The divisor divides A evenly."
              : `A = (${fmtPoly(b)}) · (${fmtPoly(q)}) + (${fmtPoly(r)})`,
          plotPoly: q,
          plotLabel: `y = ${fmtPoly(q)} (quotient)`,
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not parse polynomials.");
    }
  };

  return (
    <MathCalcPage
      name="Polynomial Calculator"
      tagline="Add, subtract, multiply or divide two polynomials in x. Enter each polynomial in standard algebra syntax (e.g. 3x^2 + 2x - 5) and see the answer in descending powers along with a full term-by-term working."
      extras={
        <>
          <CalcSection title="What is a polynomial?">
            <p>
              A polynomial is a sum of <em>terms</em>, where each term is a
              constant (the <em>coefficient</em>) times a non-negative
              whole-number power of the variable — usually x. The{" "}
              <em>degree</em> is the largest exponent with a nonzero coefficient.
              In <span className="font-mono">4x³ − 2x + 7</span> the terms are
              4x³, −2x and 7, and the degree is 3. This calculator adds,
              subtracts, multiplies and long-divides them.
            </p>
          </CalcSection>

          <CalcSection title="Polynomial operations, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one of the four operations the calculator
              performs, with the rule and a worked example matched to what you
              see in the step-by-step output.
            </p>
            <GuideCards items={POLY_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Accepts natural syntax like 3x^2 + 2x - 5 with decimal or negative coefficients",
                "Supports addition, subtraction, multiplication and polynomial long division",
                "Returns the result in standard form, ordered by descending powers",
                "Shows term-by-term working for +, − and × and every subtraction round for ÷",
                "Reports the degree of the result and the remainder when dividing",
              ]}
            />
          </CalcSection>


          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is the degree of a polynomial?",
                  a: (
                    <p>
                      The largest exponent whose coefficient is not zero. The
                      degree of a constant like 7 is 0, and the degree of
                      the sum determines what shape its graph has (line,
                      parabola, cubic, and so on).
                    </p>
                  ),
                },
                {
                  q: "What are like terms?",
                  a: (
                    <p>
                      Terms with the same variable raised to the same power.
                      Only like terms can be combined by adding or
                      subtracting their coefficients.
                    </p>
                  ),
                },
                {
                  q: "How do I know when to stop polynomial long division?",
                  a: (
                    <p>
                      Stop as soon as the current remainder has a strictly
                      smaller degree than the divisor. What's left is the
                      remainder; everything you built up on top is the
                      quotient.
                    </p>
                  ),
                },
                {
                  q: "Can I enter negative or decimal coefficients?",
                  a: (
                    <p>
                      Yes — the parser accepts numbers like −3, 0.5 or 2.25
                      in front of any x term, and you can chain plus and
                      minus signs naturally.
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
                { to: "/calculators/math/factor-calculator", label: "Factor Calculator" },
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <Field label="Polynomial A" htmlFor="pa" hint="Example: 3x^2 + 2x - 5">
          <TextInput
            id="pa"
            value={aStr}
            onChange={(e) => setAStr(e.target.value)}
            placeholder="3x^2 + 2x - 5"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Polynomial B" htmlFor="pb" hint="Example: x^2 - x + 4">
            <TextInput
              id="pb"
              value={bStr}
              onChange={(e) => setBStr(e.target.value)}
              placeholder="x^2 - x + 4"
            />
          </Field>
          <Field label="Operation" htmlFor="op">
            <select
              id="op"
              value={op}
              onChange={(e) => setOp(e.target.value as Op)}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="+">Add (A + B)</option>
              <option value="−">Subtract (A − B)</option>
              <option value="×">Multiply (A × B)</option>
              <option value="÷">Divide (A ÷ B)</option>
            </select>
          </Field>
        </div>
        <div>
          <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox label={result.label} value={result.display} note={result.note} />
          {result.plotPoly && result.plotPoly.length > 0 && (
            <PolynomialPlot p={result.plotPoly} label={result.plotLabel ?? ""} />
          )}
          <StepsToggle steps={result.steps} />
        </>
      )}
    </MathCalcPage>
  );
}

// Wrapper to expose steps from divPoly (kept separate so buildDivSteps has data).
function divPolyWithSteps(
  a: number[],
  b: number[],
): { q: number[]; r: number[]; steps: DivStep[] } {
  const A = trim(a);
  const B = trim(b);
  if (B.length === 0) throw new Error("Cannot divide by the zero polynomial.");
  if (A.length < B.length) return { q: [], r: A, steps: [] };
  const q = new Array(A.length - B.length + 1).fill(0);
  let rem = A.slice();
  const steps: DivStep[] = [];
  const bDeg = B.length - 1;
  const bLead = B[bDeg];
  while (trim(rem).length >= B.length) {
    const remT = trim(rem);
    const rDeg = remT.length - 1;
    const coef = remT[rDeg] / bLead;
    const exp = rDeg - bDeg;
    q[exp] = coef;
    const sub = new Array(rem.length).fill(0);
    for (let i = 0; i < B.length; i++) sub[i + exp] = coef * B[i];
    const newRem: number[] = [];
    for (let i = 0; i < rem.length; i++) newRem.push((rem[i] ?? 0) - (sub[i] ?? 0));
    steps.push({
      quotientTerm: [coef, exp],
      subtracted: trim(sub),
      before: remT,
      after: trim(newRem),
    });
    rem = newRem;
    if (steps.length > 200) throw new Error("Division did not terminate.");
  }
  return { q: trim(q), r: trim(rem), steps };
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function AddMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="30" className="fill-foreground font-mono" fontSize="12">3x² + 2x − 5</text>
      <text x="20" y="52" className="fill-foreground font-mono" fontSize="12">+  x² −  x + 4</text>
      <line x1="20" y1="60" x2="200" y2="60" stroke="var(--color-border)" />
      <text x="20" y="80" className="fill-primary font-mono" fontSize="13">4x² +  x − 1</text>
      <text x="20" y="110" className="fill-muted-foreground" fontSize="11">combine like terms</text>
    </svg>
  );
}

function MulMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="30" className="fill-foreground font-mono" fontSize="12">(x + 2)(x² − 3x + 4)</text>
      <line x1="20" y1="42" x2="200" y2="42" stroke="var(--color-border)" />
      <text x="20" y="60" className="fill-foreground font-mono" fontSize="11">x·(x²−3x+4) = x³−3x²+4x</text>
      <text x="20" y="80" className="fill-foreground font-mono" fontSize="11">2·(x²−3x+4) = 2x²−6x+8</text>
      <text x="20" y="105" className="fill-primary font-mono" fontSize="11">= x³ − x² − 2x + 8</text>
    </svg>
  );
}

function DivMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="24" className="fill-muted-foreground font-mono" fontSize="10">          x² − x + 2</text>
      <line x1="60" y1="30" x2="200" y2="30" stroke="var(--color-border)" />
      <text x="20" y="46" className="fill-foreground font-mono" fontSize="11">x−1 │ x³ − 2x² + 3x − 4</text>
      <text x="76" y="66" className="fill-muted-foreground font-mono" fontSize="10">− (x³ − x²)</text>
      <text x="98" y="82" className="fill-foreground font-mono" fontSize="10">−x² + 3x</text>
      <text x="98" y="98" className="fill-muted-foreground font-mono" fontSize="10">− (−x² + x)</text>
      <text x="132" y="114" className="fill-primary font-mono" fontSize="10">R = −2</text>
    </svg>
  );
}

function DegreeMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="30" className="fill-foreground font-mono" fontSize="12">4x³ − 2x + 7</text>
      <line x1="20" y1="42" x2="200" y2="42" stroke="var(--color-border)" />
      <text x="20" y="66" className="fill-primary font-mono" fontSize="12">degree = 3</text>
      <text x="20" y="90" className="fill-muted-foreground" fontSize="11">largest exponent with</text>
      <text x="20" y="106" className="fill-muted-foreground" fontSize="11">a nonzero coefficient</text>
    </svg>
  );
}

const POLY_GUIDE: GuideCardItem[] = [
  {
    key: "add",
    title: "Addition and subtraction — combine like terms",
    explain: (
      <>Terms with the same power of x are <em>like</em> terms; add or
      subtract their coefficients and keep the power. Anything with a unique
      power carries through unchanged. For subtraction, distribute the minus
      sign first: A − B = A + (−B).</>
    ),
    formula: <>(aₖ + bₖ)·xᵏ &nbsp; for each power k</>,
    legend: [{ sym: "aₖ, bₖ", def: "coefficients of xᵏ in the two polynomials" }],
    diagram: <AddMini />,
    example: { given: "(3x² + 2x − 5) + (x² − x + 4)", substitute: "combine per power", answer: "4x² + x − 1" },
  },
  {
    key: "mul",
    title: "Multiplication — distribute every term",
    explain: (
      <>Distribute every term of the first polynomial across every term of
      the second (the general form of FOIL). When two terms multiply, the
      coefficients multiply and the exponents add. Finally, combine like
      terms in the result.</>
    ),
    formula: <>(a·xⁱ)·(b·xʲ) = ab · xⁱ⁺ʲ</>,
    legend: [{ sym: "i + j", def: "exponents add on multiplication" }],
    diagram: <MulMini />,
    example: { given: "(x + 2)(x² − 3x + 4)", substitute: "distribute + combine", answer: "x³ − x² − 2x + 8" },
  },
  {
    key: "div",
    title: "Long division — divide, multiply, subtract, repeat",
    explain: (
      <>Divide the leading term of the current dividend by the leading term
      of the divisor to get the next quotient term. Multiply the divisor by
      that term, subtract from the dividend, and repeat with what's left.
      Stop when the remainder has a lower degree than the divisor.</>
    ),
    formula: <>A(x) = B(x)·Q(x) + R(x), &nbsp; deg R &lt; deg B</>,
    legend: [
      { sym: "Q", def: "quotient built up as you go" },
      { sym: "R", def: "final remainder" },
    ],
    diagram: <DivMini />,
    example: { given: "(x³ − 2x² + 3x − 4) ÷ (x − 1)", substitute: "3 rounds of ÷·−", answer: "Q = x² − x + 2, R = −2" },
  },
  {
    key: "degree",
    title: "Degree and standard form",
    explain: (
      <>The <em>degree</em> is the largest exponent with a nonzero
      coefficient — it decides the shape of the graph (line, parabola, cubic
      …). Answers are returned in <em>standard form</em>: terms ordered by
      descending power, with zero-coefficient terms dropped.</>
    ),
    formula: <>aₙxⁿ + aₙ₋₁xⁿ⁻¹ + … + a₁x + a₀</>,
    legend: [{ sym: "n", def: "the degree of the polynomial" }],
    diagram: <DegreeMini />,
    example: { given: "4x³ − 2x + 7", substitute: "highest power = x³", answer: "degree 3, standard form" },
  },
];
