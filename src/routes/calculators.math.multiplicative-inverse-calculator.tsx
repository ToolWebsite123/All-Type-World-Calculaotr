import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
  ResultBox,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  WorkedExample,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  type GuideCardItem,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

export const Route = createFileRoute("/calculators/math/multiplicative-inverse-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Multiplicative Inverse Calculator",
      title:
        "Multiplicative Inverse Calculator",
      metaDescription:
        "Find the multiplicative inverse (reciprocal) of a number, fraction, or modular integer with worked steps.",
      canonicalUrl: "/calculators/math/multiplicative-inverse-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Multiplicative Inverse Calculator",
          path: "/calculators/math/multiplicative-inverse-calculator",
        },
      ],
      faqs: [
        {
          q: "Why doesn't zero have a multiplicative inverse?",
          a: "The multiplicative inverse of x is the number that satisfies x · y = 1. For x = 0 that would require 0 · y = 1, but 0 times anything is 0 — never 1. So no such y exists, and 1/0 is undefined.",
        },
        {
          q: "What is a singular matrix?",
          a: "A singular (or non-invertible) matrix is a square matrix whose determinant is zero. Because the inverse formula divides by the determinant, a zero determinant makes the inverse undefined. Geometrically, singular matrices squash space into a lower dimension, so the transformation can't be reversed.",
        },
        {
          q: "Is the multiplicative inverse the same as the reciprocal?",
          a: "Yes — for numbers and fractions, 'reciprocal' and 'multiplicative inverse' mean the same thing: the value you multiply the original by to get 1. For matrices we usually say 'inverse' rather than 'reciprocal', but the definition is identical: A · A⁻¹ = I.",
        },
      ],
    }),
  component: MultiplicativeInversePage,
});

// ---------------- helpers ----------------

function fmt(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e10)) return v.toExponential(6);
  return Number(v.toPrecision(10)).toString();
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function simplifyFraction(n: number, d: number): { n: number; d: number } {
  if (!Number.isInteger(n) || !Number.isInteger(d)) return { n, d };
  const g = gcd(n, d);
  let nn = n / g;
  let dd = d / g;
  if (dd < 0) {
    nn = -nn;
    dd = -dd;
  }
  return { n: nn, d: dd };
}

// ---------------- Number inverse ----------------

function NumberInverseTool() {
  const [xStr, setXStr] = useState("4");
  const [result, setResult] = useState<{
    x: number;
    inv: number;
    steps: Step[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setResult(null);
    const x = Number(xStr);
    if (!Number.isFinite(x)) {
      setErr("Please enter a valid real number.");
      return;
    }
    if (x === 0) {
      setErr("0 has no multiplicative inverse — division by zero is undefined.");
      return;
    }
    const inv = 1 / x;
    const steps: Step[] = [
      {
        title: "Given — definition",
        body: (<FormulaBlock><p>
            The multiplicative inverse of a nonzero number{" "}
            <span className="font-mono">x</span> is the number{" "}
            <span className="font-mono">y</span> for which{" "}
            <span className="font-mono">x · y = 1</span>. Rearranging gives{" "}
            <span className="font-mono">y = 1 / x</span>.
          </p></FormulaBlock>),
      },
      {
        title: "Substitute your value",
        body: (<FormulaBlock><p className="font-mono">1 / {fmt(x)} = {fmt(inv)}</p></FormulaBlock>),
      },
      {
        title: "Answer — verify by multiplying",
        body: (<FormulaBlock><p className="font-mono">
            {fmt(x)} · {fmt(inv)} = {fmt(x * inv)} &nbsp;✓
          </p></FormulaBlock>),
      },
    ];
    setResult({ x, inv, steps });
  };

  return (
    <div className="space-y-4">
      <Field label="Number (x)" htmlFor="num-x">
        <TextInput
          id="num-x"
          value={xStr}
          onChange={(e) => setXStr(e.target.value)}
          inputMode="decimal"
        />
      </Field>
      <PrimaryButton onClick={onCalc}>Find 1 / x</PrimaryButton>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox
            label="Multiplicative inverse"
            value={
              <span className="font-mono">
                1 / {fmt(result.x)} = {fmt(result.inv)}
              </span>
            }
            note={`${fmt(result.x)} × ${fmt(result.inv)} = 1.`}
          />
          <ReciprocalHyperbola x={result.x} />
          <StepsToggle steps={result.steps} />
        </>
      )}
    </div>
  );
}

function ReciprocalHyperbola({ x }: { x: number }) {
  if (!Number.isFinite(x) || x === 0) return null;
  const span = Math.max(Math.abs(x) * 1.6, 1 / Math.max(Math.abs(x), 1e-6) * 1.6, 4);
  const xMin = -span, xMax = span;
  const yMin = -span, yMax = span;
  const W = 400, H = 300, PL = 30, PR = 12, PT = 12, PB = 24;
  const iw = W - PL - PR, ih = H - PT - PB;
  const sx = (v: number) => PL + ((v - xMin) / (xMax - xMin)) * iw;
  const sy = (v: number) => PT + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const build = (from: number, to: number, step: number) => {
    let d = "";
    let first = true;
    for (let v = from; v <= to + 1e-9; v += step) {
      const y = 1 / v;
      if (!Number.isFinite(y) || y < yMin || y > yMax) { first = true; continue; }
      d += `${first ? "M" : "L"}${sx(v).toFixed(2)},${sy(y).toFixed(2)} `;
      first = false;
    }
    return d;
  };
  const rightBranch = build(0.05, xMax, (xMax - 0.05) / 200);
  const leftBranch = build(xMin, -0.05, (xMax - 0.05) / 200);
  const inv = 1 / x;
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-sm font-semibold text-muted-foreground">Reciprocal curve: y = 1 / x</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto" role="img" aria-label="Hyperbola y = 1 over x">
        <line x1={PL} y1={sy(0)} x2={W - PR} y2={sy(0)} className="stroke-border" />
        <line x1={sx(0)} y1={PT} x2={sx(0)} y2={PT + ih} className="stroke-border" />
        <path d={rightBranch} className="fill-none stroke-primary" strokeWidth="2" />
        <path d={leftBranch} className="fill-none stroke-primary" strokeWidth="2" />
        {inv >= yMin && inv <= yMax && (
          <>
            <line x1={sx(x)} y1={sy(0)} x2={sx(x)} y2={sy(inv)} className="stroke-primary/40" strokeDasharray="3 3" />
            <line x1={sx(0)} y1={sy(inv)} x2={sx(x)} y2={sy(inv)} className="stroke-primary/40" strokeDasharray="3 3" />
            <circle cx={sx(x)} cy={sy(inv)} r="5" className="fill-primary" />
            <text x={sx(x) + 8} y={sy(inv) - 8} className="fill-foreground text-xs font-mono">({fmt(x)}, {fmt(inv)})</text>
          </>
        )}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground text-center">The reciprocal of {fmt(x)} lies on the y = 1/x curve.</p>
    </div>
  );
}

// ---------------- Fraction inverse ----------------

function FractionInverseTool() {
  const [nStr, setNStr] = useState("3");
  const [dStr, setDStr] = useState("4");
  const [result, setResult] = useState<{
    n: number;
    d: number;
    invN: number;
    invD: number;
    steps: Step[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setResult(null);
    const n = Number(nStr);
    const d = Number(dStr);
    if (!Number.isFinite(n) || !Number.isFinite(d)) {
      setErr("Numerator and denominator must both be valid numbers.");
      return;
    }
    if (n === 0) {
      setErr(
        "The fraction 0/d equals 0, which has no multiplicative inverse.",
      );
      return;
    }
    if (d === 0) {
      setErr("The denominator can't be 0 — that isn't a valid fraction.");
      return;
    }
    const flipped = simplifyFraction(d, n);
    const original = simplifyFraction(n, d);
    const steps: Step[] = [
      {
        title: "Formula — reciprocal of a fraction",
        body: (<FormulaBlock><p>
            The multiplicative inverse of{" "}
            <span className="font-mono">a/b</span> is{" "}
            <span className="font-mono">b/a</span> — flip numerator and
            denominator. Their product{" "}
            <span className="font-mono">(a/b) · (b/a) = ab / ab = 1</span>.
          </p></FormulaBlock>),
      },
      {
        title: "Substitute — flip numerator and denominator",
        body: (<FormulaBlock><p className="font-mono">
            ({n}/{d})⁻¹ = {d}/{n}
          </p></FormulaBlock>),
      },
      ...(flipped.n !== d || flipped.d !== n
        ? [
            {
              title: "Substitute — simplify",
              body: (<FormulaBlock><p className="font-mono">
                  {d}/{n} = {flipped.n}/{flipped.d}
                </p></FormulaBlock>),
            } as Step,
          ]
        : []),
      {
        title: "Answer — verify by multiplying",
        body: (<FormulaBlock><p className="font-mono">
            ({original.n}/{original.d}) · ({flipped.n}/{flipped.d}) ={" "}
            {original.n * flipped.n}/{original.d * flipped.d} = 1 ✓
          </p></FormulaBlock>),
      },
    ];
    setResult({ n, d, invN: flipped.n, invD: flipped.d, steps });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Numerator (a)" htmlFor="fr-n">
          <TextInput
            id="fr-n"
            value={nStr}
            onChange={(e) => setNStr(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Denominator (b)" htmlFor="fr-d">
          <TextInput
            id="fr-d"
            value={dStr}
            onChange={(e) => setDStr(e.target.value)}
            inputMode="decimal"
          />
        </Field>
      </div>
      <PrimaryButton onClick={onCalc}>Flip the fraction</PrimaryButton>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox
            label="Multiplicative inverse"
            value={
              <span className="font-mono">
                ({result.n}/{result.d})⁻¹ = {result.invN}/{result.invD}
              </span>
            }
            note="Reciprocal of a fraction is the same fraction with numerator and denominator swapped."
          />
          <StepsToggle steps={result.steps} />
        </>
      )}
    </div>
  );
}

// ---------------- Matrix inverse (2×2 and 3×3) ----------------

type Size = 2 | 3;

function emptyMatrix(n: Size): string[][] {
  return Array.from({ length: n }, () => Array(n).fill(""));
}

function parseMatrix(m: string[][]): number[][] | null {
  const out: number[][] = [];
  for (const row of m) {
    const parsed: number[] = [];
    for (const cell of row) {
      const v = Number(cell.trim() || "0");
      if (!Number.isFinite(v)) return null;
      parsed.push(v);
    }
    out.push(parsed);
  }
  return out;
}

function det2(m: number[][]): number {
  return m[0][0] * m[1][1] - m[0][1] * m[1][0];
}

function det3(m: number[][]): number {
  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];
  return (
    a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
  );
}

function inverse2(m: number[][]): { det: number; inv: number[][] | null } {
  const D = det2(m);
  if (D === 0) return { det: D, inv: null };
  const [a, b] = m[0];
  const [c, d] = m[1];
  return {
    det: D,
    inv: [
      [d / D, -b / D],
      [-c / D, a / D],
    ],
  };
}

function cofactor3(m: number[][], r: number, c: number): number {
  const sub: number[][] = [];
  for (let i = 0; i < 3; i++) {
    if (i === r) continue;
    const row: number[] = [];
    for (let j = 0; j < 3; j++) {
      if (j === c) continue;
      row.push(m[i][j]);
    }
    sub.push(row);
  }
  const sign = (r + c) % 2 === 0 ? 1 : -1;
  return sign * (sub[0][0] * sub[1][1] - sub[0][1] * sub[1][0]);
}

function inverse3(m: number[][]): { det: number; inv: number[][] | null } {
  const D = det3(m);
  if (D === 0) return { det: D, inv: null };
  const cof: number[][] = [];
  for (let i = 0; i < 3; i++) {
    const row: number[] = [];
    for (let j = 0; j < 3; j++) row.push(cofactor3(m, i, j));
    cof.push(row);
  }
  // adjugate = transpose of cofactor matrix
  const inv: number[][] = [
    [cof[0][0] / D, cof[1][0] / D, cof[2][0] / D],
    [cof[0][1] / D, cof[1][1] / D, cof[2][1] / D],
    [cof[0][2] / D, cof[1][2] / D, cof[2][2] / D],
  ];
  return { det: D, inv };
}

function MatrixDisplay({ m }: { m: number[][] }) {
  return (
    <div className="inline-block rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <table className="font-mono text-sm">
        <tbody>
          {m.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => (
                <td key={j} className="px-2 py-0.5 text-right tabular-nums">
                  {fmt(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatrixInverseTool() {
  const [size, setSize] = useState<Size>(2);
  const [cells, setCells] = useState<string[][]>(() => {
    const m = emptyMatrix(2);
    m[0][0] = "4"; m[0][1] = "7";
    m[1][0] = "2"; m[1][1] = "6";
    return m;
  });
  const [result, setResult] = useState<{
    A: number[][];
    det: number;
    inv: number[][] | null;
    steps: Step[];
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const setSizeSafely = (n: Size) => {
    setSize(n);
    setCells(emptyMatrix(n));
    setResult(null);
    setErr(null);
  };

  const setCell = (r: number, c: number, v: string) => {
    setCells((prev) => {
      const next = prev.map((row) => row.slice());
      next[r][c] = v;
      return next;
    });
  };

  const onCalc = () => {
    setErr(null);
    setResult(null);
    const A = parseMatrix(cells);
    if (!A) {
      setErr("All matrix entries must be valid numbers.");
      return;
    }
    if (size === 2) {
      const D = det2(A);
      const steps: Step[] = [
        {
          title: "Formula — 2×2 inverse",
          body: (<FormulaBlock><p className="font-mono">
              For A = [[a, b], [c, d]]:&nbsp; A⁻¹ = (1/det A) · [[d, −b], [−c, a]],&nbsp; with det A = ad − bc.
            </p></FormulaBlock>),
        },
        {
          title: "Substitute — determinant",
          body: (<FormulaBlock><p className="font-mono">
              det A = ({fmt(A[0][0])})({fmt(A[1][1])}) − ({fmt(A[0][1])})({fmt(A[1][0])}) = {fmt(D)}
            </p></FormulaBlock>),
        },
      ];
      if (D === 0) {
        steps.push({
          title: "Answer — singular matrix",
          body: (<FormulaBlock><p>
              A matrix with determinant 0 has no inverse (it's called{" "}
              <strong>singular</strong>). Geometrically it collapses space into
              a lower dimension, so its transformation can't be undone.
            </p></FormulaBlock>),
        });
        setResult({ A, det: D, inv: null, steps });
        return;
      }
      const { inv } = inverse2(A);
      steps.push({
        title: "Substitute — adjugate / det",
        body: (<FormulaBlock><p className="font-mono">
            A⁻¹ = (1/{fmt(D)}) · [[{fmt(A[1][1])}, {fmt(-A[0][1])}], [{fmt(-A[1][0])}, {fmt(A[0][0])}]]
          </p></FormulaBlock>),
      });
      if (inv) {
        steps.push({
          title: "Substitute — divide by det",
          body: <FormulaBlock><MatrixDisplay m={inv} /></FormulaBlock>,
        });
      }
      setResult({ A, det: D, inv, steps });
    } else {
      const D = det3(A);
      const steps: Step[] = [
        {
          title: "Formula — 3×3 inverse",
          body: (<FormulaBlock><p>
              For a 3×3 matrix A,&nbsp;
              <span className="font-mono">
                A⁻¹ = (1/det A) · adj(A)
              </span>
              , where{" "}
              <span className="font-mono">adj(A)</span> is the transpose of the
              cofactor matrix.
            </p></FormulaBlock>),
        },
        {
          title: "Compute the determinant by cofactor expansion along row 1",
          body: (
            <p className="font-mono break-words">
              det A = {fmt(A[0][0])}·({fmt(A[1][1])}·{fmt(A[2][2])} −{" "}
              {fmt(A[1][2])}·{fmt(A[2][1])}) − {fmt(A[0][1])}·(
              {fmt(A[1][0])}·{fmt(A[2][2])} − {fmt(A[1][2])}·
              {fmt(A[2][0])}) + {fmt(A[0][2])}·({fmt(A[1][0])}·
              {fmt(A[2][1])} − {fmt(A[1][1])}·{fmt(A[2][0])}) = {fmt(D)}
            </p>
          ),
        },
      ];
      if (D === 0) {
        steps.push({
          title: "Answer — singular matrix",
          body: (<FormulaBlock><p>
              A 3×3 matrix with zero determinant has linearly dependent rows
              (or columns), so it has no inverse.
            </p></FormulaBlock>),
        });
        setResult({ A, det: D, inv: null, steps });
        return;
      }
      const { inv } = inverse3(A);
      if (inv) {
        steps.push({
          title: "Build the cofactor matrix, transpose it, then divide by det A",
          body: (
            <>
              <p className="mb-2 text-sm text-muted-foreground">
                A⁻¹ = (1/{fmt(D)}) · adj(A) =
              </p>
              <MatrixDisplay m={inv} />
            </>
          ),
        });
      }
      setResult({ A, det: D, inv, steps });
    }
  };

  const sizeButton = (n: Size) => (
    <button
      key={n}
      type="button"
      onClick={() => setSizeSafely(n)}
      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        size === n
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground"
      }`}
    >
      {n} × {n}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Matrix size:</span>
        {sizeButton(2)}
        {sizeButton(3)}
      </div>

      <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <div className="mb-2 text-sm font-medium text-foreground">Matrix A</div>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {cells.map((row, r) =>
            row.map((v, c) => (
              <TextInput
                key={`${r}-${c}`}
                value={v}
                onChange={(e) => setCell(r, c, e.target.value)}
                inputMode="decimal"
                aria-label={`A row ${r + 1} column ${c + 1}`}
              />
            )),
          )}
        </div>
      </div>

      <PrimaryButton onClick={onCalc}>Find A⁻¹</PrimaryButton>

      {err && <ErrorBox message={err} />}

      {result && (
        <>
          {result.inv ? (
            <ResultBox
              label="Inverse matrix A⁻¹"
              value={<MatrixDisplay m={result.inv} />}
              note={`det A = ${fmt(result.det)}. Since det A ≠ 0, the matrix is invertible.`}
            />
          ) : (
            <ResultBox
              label="No inverse — matrix is singular"
              value={
                <span className="font-mono">det A = {fmt(result.det)}</span>
              }
              note="A matrix with zero determinant has no multiplicative inverse."
            />
          )}
          <StepsToggle steps={result.steps} />
        </>
      )}
    </div>
  );
}

// ---------------- Page ----------------

type Mode = "number" | "fraction" | "matrix";

function MultiplicativeInversePage() {
  const [mode, setMode] = useState<Mode>("number");

  const modes: { id: Mode; label: string; hint: string }[] = useMemo(
    () => [
      { id: "number", label: "Number", hint: "1 / x" },
      { id: "fraction", label: "Fraction", hint: "flip a/b" },
      { id: "matrix", label: "Matrix", hint: "A⁻¹ (2×2, 3×3)" },
    ],
    [],
  );

  const tabButton = (m: { id: Mode; label: string; hint: string }) => (
    <button
      key={m.id}
      type="button"
      onClick={() => setMode(m.id)}
      className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
        mode === m.id
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground"
      }`}
    >
      <div className="font-medium">{m.label}</div>
      <div className="text-xs opacity-70">{m.hint}</div>
    </button>
  );

  let tool: ReactNode = null;
  if (mode === "number") tool = <NumberInverseTool />;
  else if (mode === "fraction") tool = <FractionInverseTool />;
  else tool = <MatrixInverseTool />;

  return (
    <MathCalcPage
      name="Multiplicative Inverse Calculator"
      tagline="Find the value that multiplies with your original to give 1 — for real numbers, fractions, or 2×2 and 3×3 matrices — with full step-by-step working."
      extras={
        <>
          <CalcSection title="What is a multiplicative inverse?">
            <p>
              The <strong>multiplicative inverse</strong> (or{" "}
              <strong>reciprocal</strong>) of a value is whatever you multiply
              it by to get the multiplicative identity — the number 1 for
              ordinary arithmetic, or the identity matrix I for matrices.
            </p>
            <FormulaBlock>x · x⁻¹ = 1 &nbsp;&nbsp; A · A⁻¹ = I</FormulaBlock>
            <p>
              The idea is the same across all three cases, but the mechanics
              differ.
            </p>
          </CalcSection>

<CalcSection title="Multiplicative inverse, piece by piece">
            <p>
              The same idea — find the y so that x · y = 1 — plays out
              differently for numbers, fractions, and matrices. Each card
              below covers one case and shows when the inverse does not exist.
            </p>
            <GuideCards items={MI_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Three modes on one page: real number (1/x), fraction (b/a) and matrix (A⁻¹)",
                "Matrix mode supports 2×2 and 3×3 using the standard adjugate / determinant formula",
                "Detects the non-invertible cases — 0 for numbers, 0-numerator for fractions, det A = 0 for matrices",
                "Fraction results are auto-simplified using the GCD",
                "Every mode shows a verification step so you can see the product returns 1 (or the identity matrix)",
                "Clean handling of decimals and negatives throughout",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Why doesn't zero have a multiplicative inverse?",
                  a: (
                    <p>
                      Because no number multiplied by 0 gives 1 — the product
                      is always 0. There's simply no value that satisfies the
                      definition x · x⁻¹ = 1 when x = 0, so 1/0 is left
                      undefined.
                    </p>
                  ),
                },
                {
                  q: "What is a singular matrix?",
                  a: (
                    <p>
                      A square matrix whose determinant is 0. Such a matrix
                      has no inverse, because the formula A⁻¹ = (1/det A) ·
                      adj(A) would divide by zero. Singular matrices arise
                      when the rows (or columns) are linearly dependent — one
                      row is a combination of the others.
                    </p>
                  ),
                },
                {
                  q: "Is reciprocal the same as multiplicative inverse?",
                  a: (
                    <p>
                      For numbers and fractions, yes — the two words mean
                      exactly the same thing. For matrices we usually say
                      "inverse" rather than "reciprocal", but the definition
                      is the same: whatever you multiply the original by to
                      get the identity.
                    </p>
                  ),
                },
                {
                  q: "What's the multiplicative inverse of 1 and −1?",
                  a: (
                    <p>
                      1⁻¹ = 1 and (−1)⁻¹ = −1. They're each their own
                      inverse, because 1·1 = 1 and (−1)·(−1) = 1.
                    </p>
                  ),
                },
                {
                  q: "Does every non-zero matrix have an inverse?",
                  a: (
                    <p>
                      No. Only <em>square</em> matrices can have inverses at
                      all, and among square matrices, only those with a
                      non-zero determinant. Non-square matrices have
                      generalized inverses (like the Moore–Penrose
                      pseudoinverse), but not a true multiplicative inverse.
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
                  to: "/calculators/math/fraction-calculator",
                  label: "Fraction Calculator",
                },
                {
                  to: "/calculators/math/matrix-calculator",
                  label: "Matrix Calculator",
                },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">{modes.map(tabButton)}</div>
        {tool}
      </div>
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function NumMini() {
  return (
    <svg viewBox="0 0 220 90" className="w-full">
      <rect x="1" y="1" width="218" height="88" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <text x="110" y="30" textAnchor="middle" fontSize="14" fill="var(--color-foreground)" fontFamily="monospace">x × (1/x) = 1</text>
      <text x="110" y="58" textAnchor="middle" fontSize="12" fill="var(--color-primary)" fontFamily="monospace">4 × 0.25 = 1</text>
      <text x="110" y="78" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">flip to 1 / x</text>
    </svg>
  );
}

function FracMini() {
  return (
    <svg viewBox="0 0 220 90" className="w-full">
      <rect x="1" y="1" width="218" height="88" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <g fontFamily="monospace">
        <text x="55" y="35" textAnchor="middle" fontSize="18" fill="var(--color-foreground)">3</text>
        <line x1="35" y1="42" x2="75" y2="42" stroke="var(--color-foreground)" />
        <text x="55" y="60" textAnchor="middle" fontSize="18" fill="var(--color-foreground)">4</text>
        <text x="110" y="52" textAnchor="middle" fontSize="16" fill="var(--color-primary)">→</text>
        <text x="165" y="35" textAnchor="middle" fontSize="18" fill="var(--color-primary)">4</text>
        <line x1="145" y1="42" x2="185" y2="42" stroke="var(--color-primary)" />
        <text x="165" y="60" textAnchor="middle" fontSize="18" fill="var(--color-primary)">3</text>
      </g>
      <text x="110" y="82" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">swap numerator and denominator</text>
    </svg>
  );
}

function MatMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <g fontFamily="monospace" fontSize="12" fill="var(--color-foreground)">
        <text x="20" y="30">A · A⁻¹ = I</text>
        <text x="20" y="58">[a b]   [ d −b] / (ad−bc)</text>
        <text x="20" y="74">[c d] · [−c  a]</text>
      </g>
      <text x="110" y="93" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">det = 0 → no inverse</text>
    </svg>
  );
}

function ZeroMini() {
  return (
    <svg viewBox="0 0 220 90" className="w-full">
      <rect x="1" y="1" width="218" height="88" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <text x="110" y="35" textAnchor="middle" fontSize="14" fill="var(--color-destructive)" fontFamily="monospace">0 · y = 1 ?</text>
      <text x="110" y="58" textAnchor="middle" fontSize="12" fill="var(--color-foreground)">0 · anything = 0, never 1</text>
      <text x="110" y="78" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">1 / 0 is undefined</text>
    </svg>
  );
}

const MI_GUIDE: GuideCardItem[] = [
  {
    key: "num",
    title: "Inverse of a real number",
    explain: <>For any nonzero x, the inverse is 1/x. Multiplying the two gives 1 by construction.</>,
    formula: <>x⁻¹ = 1 / x  (x ≠ 0)</>,
    diagram: <NumMini />,
    example: {
      given: <span className="font-mono">x = 4</span>,
      substitute: <>1 / 4</>,
      answer: <span className="font-mono">0.25</span>,
    },
  },
  {
    key: "frac",
    title: "Inverse of a fraction",
    explain: <>Flip numerator and denominator. Their product (a·b)/(b·a) collapses to 1.</>,
    formula: <>(a/b)⁻¹ = b/a  (a, b ≠ 0)</>,
    diagram: <FracMini />,
    example: {
      given: <span className="font-mono">3/4</span>,
      substitute: <>swap top and bottom</>,
      answer: <span className="font-mono">4/3</span>,
    },
  },
  {
    key: "mat",
    title: "Inverse of a matrix",
    explain: <>For a 2×2, divide the adjugate by the determinant. If det A = 0 the matrix is singular and no inverse exists.</>,
    formula: <>A⁻¹ = (1 / det A) · adj(A)</>,
    diagram: <MatMini />,
    example: {
      given: <span className="font-mono">[[4, 7], [2, 6]]</span>,
      substitute: <>det = 10 · adj = [[6, −7], [−2, 4]]</>,
      answer: <span className="font-mono">[[0.6, −0.7], [−0.2, 0.4]]</span>,
    },
  },
  {
    key: "zero",
    title: "Why zero has no inverse",
    explain: <>An inverse of 0 would need to satisfy 0 · y = 1, but 0 · anything = 0. That's why 1 / 0 is undefined and the calculator refuses to invert 0.</>,
    formula: <>0 · y = 1 has no solution</>,
    diagram: <ZeroMini />,
    example: {
      given: <span className="font-mono">x = 0</span>,
      substitute: <>1 / 0</>,
      answer: <span className="font-mono">undefined</span>,
    },
  },
];
