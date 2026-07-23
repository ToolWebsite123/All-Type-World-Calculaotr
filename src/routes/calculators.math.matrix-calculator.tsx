import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { create, all, type MathType } from "mathjs";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
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

const math = create(all, {});

const MAX_DIM = 6;

export const Route = createFileRoute("/calculators/math/matrix-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Matrix Calculator",
      title: "Matrix Calculator — Add, Multiply, Determinant & Inverse",
      metaDescription:
        "Add, subtract, multiply, transpose, power, invert and find the determinant of matrices up to 6×6, with worked steps.",
      canonicalUrl: "/calculators/math/matrix-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Matrix Calculator", path: "/calculators/math/matrix-calculator" },
      ],
      faqs: [
        {
          q: "When can two matrices be added?",
          a: "Only when they have the exact same dimensions — same number of rows and same number of columns. Entries are added position by position.",
        },
        {
          q: "When can two matrices be multiplied?",
          a: "For A × B to be defined, the number of columns of A must equal the number of rows of B. If A is m×n and B is n×p, the product is m×p.",
        },
        {
          q: "Which matrices have an inverse?",
          a: "Only square matrices whose determinant is non-zero. A square matrix with determinant 0 is called singular and has no inverse.",
        },
        {
          q: "Is matrix multiplication commutative?",
          a: "No. In general A × B ≠ B × A, even when both products are defined and are the same size.",
        },
      ],
    }),
  component: MatrixPage,
});

type Matrix = string[][];

function makeMatrix(rows: number, cols: number, fill: (r: number, c: number) => string): Matrix {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => fill(r, c)),
  );
}

function resize(m: Matrix, rows: number, cols: number): Matrix {
  return makeMatrix(rows, cols, (r, c) => m[r]?.[c] ?? "0");
}

function parseMatrix(m: Matrix): number[][] {
  return m.map((row) =>
    row.map((v) => {
      const n = Number(v.trim() === "" ? "0" : v);
      if (!Number.isFinite(n)) throw new Error("All entries must be valid numbers.");
      return n;
    }),
  );
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Object.is(n, -0)) n = 0;
  const rounded = Math.round(n * 1e10) / 1e10;
  return String(rounded);
}

interface MatrixGridProps {
  label: string;
  matrix: Matrix;
  rows: number;
  cols: number;
  onRowsChange: (n: number) => void;
  onColsChange: (n: number) => void;
  onCellChange: (r: number, c: number, v: string) => void;
  onFill: (v: string) => void;
  onRandom: () => void;
  onUnary: (op: "T" | "^2" | "det" | "inv") => void;
}

function MatrixGrid({
  label,
  matrix,
  rows,
  cols,
  onRowsChange,
  onColsChange,
  onCellChange,
  onFill,
  onRandom,
  onUnary,
}: MatrixGridProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-foreground">Matrix {label}</div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-muted-foreground">Rows</label>
          <select
            className="bg-background border border-border rounded px-2 py-1"
            value={rows}
            onChange={(e) => onRowsChange(Number(e.target.value))}
          >
            {Array.from({ length: MAX_DIM }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-muted-foreground">×</span>
          <label className="text-muted-foreground">Cols</label>
          <select
            className="bg-background border border-border rounded px-2 py-1"
            value={cols}
            onChange={(e) => onColsChange(Number(e.target.value))}
          >
            {Array.from({ length: MAX_DIM }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse">
          <tbody>
            {matrix.map((row, r) => (
              <tr key={r}>
                {row.map((val, c) => (
                  <td key={c} className="p-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={val}
                      onChange={(e) => onCellChange(r, c, e.target.value)}
                      className="w-14 sm:w-16 text-center font-mono bg-background border border-border rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <button className="px-2 py-1 rounded border border-border hover:bg-muted" onClick={() => onFill("0")}>All 0</button>
        <button className="px-2 py-1 rounded border border-border hover:bg-muted" onClick={() => onFill("1")}>All 1</button>
        <button className="px-2 py-1 rounded border border-border hover:bg-muted" onClick={onRandom}>Random</button>
        <button className="px-2 py-1 rounded border border-border hover:bg-muted" onClick={() => onUnary("T")}>Transpose</button>
        <button className="px-2 py-1 rounded border border-border hover:bg-muted" onClick={() => onUnary("^2")}>Power of 2</button>
        <button className="px-2 py-1 rounded border border-border hover:bg-muted" onClick={() => onUnary("det")}>Determinant</button>
        <button className="px-2 py-1 rounded border border-border hover:bg-muted" onClick={() => onUnary("inv")}>Inverse</button>
      </div>
    </div>
  );
}

type Result =
  | { kind: "matrix"; label: string; data: number[][]; steps?: Step[] }
  | { kind: "scalar"; label: string; value: number; steps?: Step[] };

function MatrixView({ m }: { m: number[][] }) {
  return (
    <table className="border-collapse inline-block">
      <tbody>
        {m.map((row, r) => (
          <tr key={r}>
            {row.map((v, c) => (
              <td
                key={c}
                className="px-2 py-1 font-mono text-xs border border-border/60 bg-background/60 text-center min-w-[2.25rem]"
              >
                {fmt(v)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function matStr(M: number[][]): string {
  return M.map((row) => "  [ " + row.map(fmt).join(", ") + " ]").join("\n");
}

function givenAB(A: number[][], B?: number[][]): Step {
  return {
    title: "Given",
    body: (
      <FormulaBlock>
        A = {"["}
        {"\n"}{matStr(A)}
        {"\n"}]
        {B !== undefined && (
          <>
            {"\n\n"}B = {"["}
            {"\n"}{matStr(B)}
            {"\n"}]
          </>
        )}
      </FormulaBlock>
    ),
  };
}

function stepsAddSub(A: number[][], B: number[][], op: "+" | "-"): Step[] {
  const sign = op === "+" ? "+" : "−";
  const rows = A.length;
  const cols = A[0].length;
  const sample: string[] = [];
  outer: for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      sample.push(
        `(${r + 1},${c + 1}): ${fmt(A[r][c])} ${sign} ${fmt(B[r][c])} = ${fmt(op === "+" ? A[r][c] + B[r][c] : A[r][c] - B[r][c])}`,
      );
      if (sample.length >= Math.min(6, rows * cols)) break outer;
    }
  }
  return [
    givenAB(A, B),
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>(A {sign} B)<sub>ij</sub> = A<sub>ij</sub> {sign} B<sub>ij</sub></>}
          legend={[
            { sym: "A_ij, B_ij", def: "entry at row i, column j of each matrix" },
            { sym: "dim(A) = dim(B)", def: "both matrices must be the same size" },
          ]}
        />
      ),
    },
    {
      title: `Substitute — combine each entry with ${sign}`,
      body: (
        <FormulaBlock>
          Both matrices are {rows}×{cols}, so the operation is defined.
          {"\n\n"}{sample.join("\n")}{rows * cols > sample.length ? "\n…" : ""}
        </FormulaBlock>
      ),
    },
  ];
}

function stepsMultiply(A: number[][], B: number[][], R: number[][]): Step[] {
  const m = A.length;
  const n = A[0].length;
  const p = B[0].length;
  const terms = A[0].map((v, k) => `${fmt(v)}·${fmt(B[k][0])}`).join(" + ");
  const sum = A[0].reduce((s, v, k) => s + v * B[k][0], 0);
  return [
    givenAB(A, B),
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>(A × B)<sub>ij</sub> = Σ<sub>k</sub> A<sub>ik</sub> · B<sub>kj</sub></>}
          legend={[
            { sym: "cols(A) = rows(B)", def: "inner dimensions must match — otherwise the product is undefined" },
            { sym: "result", def: `m×p, where A is m×n and B is n×p (here ${m}×${p})` },
          ]}
        />
      ),
    },
    {
      title: "Substitute — worked entry at position (1, 1)",
      body: (
        <FormulaBlock>
          A is {m}×{n},&nbsp; B is {n}×{p} — inner dim = {n}, so A × B is defined.
          {"\n\n"}(A × B)₁₁ = {terms} = {fmt(sum)}
          {"\n"}(matches R[1][1] = {fmt(R[0][0])})
        </FormulaBlock>
      ),
    },
  ];
}

function stepsTranspose(A: number[][]): Step[] {
  return [
    givenAB(A),
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>(A<sup>T</sup>)<sub>ij</sub> = A<sub>ji</sub></>}
          legend={[
            { sym: "i, j", def: "row and column indices — swapped in the transpose" },
            { sym: "shape", def: "if A is m×n, then Aᵀ is n×m" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — first row of A becomes first column of Aᵀ",
      body: (
        <FormulaBlock>
          Row 1 of A = [{A[0].map(fmt).join(", ")}]
          {"\n"}→ column 1 of Aᵀ
        </FormulaBlock>
      ),
    },
  ];
}

function stepsPower(A: number[][], R: number[][]): Step[] {
  return [
    givenAB(A),
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>A² = A × A</>}
          legend={[
            { sym: "A", def: "must be square — same number of rows and columns" },
            { sym: "entry (i,j)", def: "dot product of row i of A with column j of A" },
          ]}
        />
      ),
    },
    ...stepsMultiply(A, A, R).slice(2),
  ];
}

function stepsDet(A: number[][], d: number): Step[] {
  const n = A.length;
  const givenStep = givenAB(A);
  if (n === 1) {
    return [
      givenStep,
      { title: "Answer", body: <FormulaBlock>det([a]) = a = <strong>{fmt(A[0][0])}</strong></FormulaBlock> },
    ];
  }
  if (n === 2) {
    const [a, b] = A[0];
    const [c, dd] = A[1];
    return [
      givenStep,
      {
        title: "Write the formula",
        body: (
          <FormulaWithLegend
            formula={<>det(A) = ad − bc</>}
            legend={[
              { sym: "a, b", def: "entries of row 1" },
              { sym: "c, d", def: "entries of row 2" },
            ]}
          />
        ),
      },
      {
        title: "Substitute the entries",
        body: (
          <FormulaBlock>
            = ({fmt(a)})·({fmt(dd)}) − ({fmt(b)})·({fmt(c)})
            {"\n"}= {fmt(a * dd)} − {fmt(b * c)}
          </FormulaBlock>
        ),
      },
      { title: "Answer", body: <FormulaBlock>det(A) = <strong>{fmt(d)}</strong></FormulaBlock> },
    ];
  }
  if (n === 3) {
    const [[a11, a12, a13], [a21, a22, a23], [a31, a32, a33]] = A;
    const M11 = a22 * a33 - a23 * a32;
    const M12 = a21 * a33 - a23 * a31;
    const M13 = a21 * a32 - a22 * a31;
    return [
      givenStep,
      {
        title: "Write the formula",
        body: (
          <FormulaWithLegend
            formula={<>det(A) = a₁₁·M₁₁ − a₁₂·M₁₂ + a₁₃·M₁₃</>}
            legend={[
              { sym: "a₁ⱼ", def: "entries of row 1" },
              { sym: "M₁ⱼ", def: "2×2 minor obtained by deleting row 1 and column j" },
            ]}
          />
        ),
      },
      {
        title: "Substitute — the three 2×2 minors",
        body: (
          <FormulaBlock>
            M₁₁ = ({fmt(a22)})({fmt(a33)}) − ({fmt(a23)})({fmt(a32)}) = {fmt(M11)}
            {"\n"}M₁₂ = ({fmt(a21)})({fmt(a33)}) − ({fmt(a23)})({fmt(a31)}) = {fmt(M12)}
            {"\n"}M₁₃ = ({fmt(a21)})({fmt(a32)}) − ({fmt(a22)})({fmt(a31)}) = {fmt(M13)}
            {"\n\n"}det = ({fmt(a11)})({fmt(M11)}) − ({fmt(a12)})({fmt(M12)}) + ({fmt(a13)})({fmt(M13)})
          </FormulaBlock>
        ),
      },
      { title: "Answer", body: <FormulaBlock>det(A) = <strong>{fmt(d)}</strong></FormulaBlock> },
    ];
  }
  return [
    givenStep,
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>det(A) = ± ∏ diag(U),&nbsp; A = P · L · U</>}
          legend={[
            { sym: "P, L, U", def: "permutation, lower- and upper-triangular factors" },
            { sym: "±", def: "sign flips once per row swap performed by P" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — reduce to upper triangular",
      body: (
        <FormulaBlock>
          For {n}×{n}, cofactor expansion would need {factorial(n).toLocaleString()} terms.
          {"\n"}LU decomposition multiplies the diagonal of U (with sign from row swaps).
        </FormulaBlock>
      ),
    },
    { title: "Answer", body: <FormulaBlock>det(A) = <strong>{fmt(d)}</strong></FormulaBlock> },
  ];
}

function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

function stepsInverse(A: number[][], inv: number[][], d: number): Step[] {
  const n = A.length;
  const base: Step[] = [givenAB(A)];
  if (n === 2) {
    const [[a, b], [c, dd]] = A;
    base.push(
      {
        title: "Write the formula",
        body: (
          <FormulaWithLegend
            formula={<>A⁻¹ = (1 / det(A)) · [[d, −b], [−c, a]]</>}
            legend={[
              { sym: "det(A)", def: "must be non-zero for the inverse to exist" },
              { sym: "a, b, c, d", def: "entries of A in reading order" },
            ]}
          />
        ),
      },
      {
        title: "Substitute — det(A) and the adjugate",
        body: (
          <FormulaBlock>
            det(A) = {fmt(d)} (non-zero → invertible)
            {"\n"}= (1 / {fmt(d)}) · [[{fmt(dd)}, {fmt(-b)}], [{fmt(-c)}, {fmt(a)}]]
            {"\n"}= [[{fmt(dd / d)}, {fmt(-b / d)}], [{fmt(-c / d)}, {fmt(a / d)}]]
          </FormulaBlock>
        ),
      },
    );
  } else {
    base.push(
      {
        title: "Write the formula",
        body: (
          <FormulaWithLegend
            formula={<>[A | I]  →  row-reduce  →  [I | A⁻¹]</>}
            legend={[
              { sym: "I", def: "identity matrix of the same size as A" },
              { sym: "row-reduce", def: "Gauss–Jordan elimination on the augmented matrix" },
            ]}
          />
        ),
      },
      {
        title: "Substitute — det(A) and elimination",
        body: (
          <FormulaBlock>
            det(A) = {fmt(d)} (non-zero → invertible)
            {"\n"}Augment [A | I] and reduce until the left block is I.
          </FormulaBlock>
        ),
      },
    );
  }
  base.push({
    title: "Answer",
    body: <MatrixView m={inv} />,
  });
  return base;
}



function ResultHeatmap({ data }: { data: number[][] }) {
  const rows = data.length;
  const cols = data[0]?.length ?? 0;
  const max = Math.max(1e-9, ...data.flat().map((v) => Math.abs(v)));
  const cell = 44, pad = 3;
  const W = cols * cell, H = rows * cell;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-xs"
      role="img"
      aria-label="Heatmap of the result matrix, shaded by cell magnitude"
    >
      {data.map((row, r) =>
        row.map((v, c) => {
          const op = Math.min(1, Math.abs(v) / max);
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={c * cell + pad / 2}
                y={r * cell + pad / 2}
                width={cell - pad}
                height={cell - pad}
                rx={5}
                className="fill-primary"
                style={{ opacity: 0.1 + op * 0.75 }}
              />
              <text
                x={c * cell + cell / 2}
                y={r * cell + cell / 2 + 4}
                textAnchor="middle"
                className="fill-foreground text-[10px] font-mono"
              >
                {fmt(v)}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}

function ResultDisplay({
  result,
  onCopyToA,
  onCopyToB,
}: {
  result: Result;
  onCopyToA: (m: number[][]) => void;
  onCopyToB: (m: number[][]) => void;
}) {
  if (result.kind === "scalar") {
    return (
      <>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {result.label}
          </div>
          <div className="text-2xl font-mono font-bold text-primary">{fmt(result.value)}</div>
        </div>
        {result.steps && result.steps.length > 0 && <StepsToggle steps={result.steps} />}
      </>
    );
  }
  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {result.label} — {result.data.length}×{result.data[0]?.length ?? 0}
          </div>
          <div className="flex gap-2 text-xs">
            <button className="px-2 py-1 rounded border border-border hover:bg-muted" onClick={() => onCopyToA(result.data)}>Copy to A</button>
            <button className="px-2 py-1 rounded border border-border hover:bg-muted" onClick={() => onCopyToB(result.data)}>Copy to B</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="border-collapse">
            <tbody>
              {result.data.map((row, r) => (
                <tr key={r}>
                  {row.map((v, c) => (
                    <td key={c} className="px-3 py-2 font-mono text-sm border border-border/60 bg-muted/30 text-center min-w-[3rem]">
                      {fmt(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center">
          <ResultHeatmap data={result.data} />
        </div>
      </div>
      {result.steps && result.steps.length > 0 && <StepsToggle steps={result.steps} />}
    </>
  );
}

function MatrixPage() {
  const [aRows, setARows] = useState(2);
  const [aCols, setACols] = useState(2);
  const [bRows, setBRows] = useState(2);
  const [bCols, setBCols] = useState(2);

  const [a, setA] = useState<Matrix>(() => makeMatrix(2, 2, (r, c) => (r === c ? "1" : "0")));
  const [b, setB] = useState<Matrix>(() => makeMatrix(2, 2, (r, c) => (r === c ? "1" : "0")));

  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const updateDims = (
    which: "A" | "B",
    rows: number,
    cols: number,
  ) => {
    if (which === "A") {
      setARows(rows);
      setACols(cols);
      setA((prev) => resize(prev, rows, cols));
    } else {
      setBRows(rows);
      setBCols(cols);
      setB((prev) => resize(prev, rows, cols));
    }
  };

  const setCell = (which: "A" | "B", r: number, c: number, v: string) => {
    const target = which === "A" ? a : b;
    const next = target.map((row) => row.slice());
    next[r][c] = v;
    (which === "A" ? setA : setB)(next);
  };

  const fill = (which: "A" | "B", v: string) => {
    const rows = which === "A" ? aRows : bRows;
    const cols = which === "A" ? aCols : bCols;
    (which === "A" ? setA : setB)(makeMatrix(rows, cols, () => v));
  };

  const random = (which: "A" | "B") => {
    const rows = which === "A" ? aRows : bRows;
    const cols = which === "A" ? aCols : bCols;
    (which === "A" ? setA : setB)(
      makeMatrix(rows, cols, () => String(Math.floor(Math.random() * 19) - 9)),
    );
  };

  const loadFromNums = (which: "A" | "B", m: number[][]) => {
    const rows = m.length;
    const cols = m[0]?.length ?? 0;
    if (rows === 0 || cols === 0) return;
    if (which === "A") {
      setARows(rows);
      setACols(cols);
      setA(m.map((row) => row.map((v) => fmt(v))));
    } else {
      setBRows(rows);
      setBCols(cols);
      setB(m.map((row) => row.map((v) => fmt(v))));
    }
  };

  const run = (fn: () => Result) => {
    setErr(null);
    setResult(null);
    try {
      setResult(fn());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const unary = (which: "A" | "B", op: "T" | "^2" | "det" | "inv") => {
    run(() => {
      const src = which === "A" ? a : b;
      const rows = which === "A" ? aRows : bRows;
      const cols = which === "A" ? aCols : bCols;
      const nums = parseMatrix(src);
      if (op === "T") {
        const t = math.transpose(nums) as number[][];
        return { kind: "matrix", label: `${which}ᵀ (Transpose)`, data: t, steps: stepsTranspose(nums) };
      }
      if (op === "^2") {
        if (rows !== cols) throw new Error("Power is only defined for square matrices.");
        const p = math.multiply(nums as MathType, nums as MathType) as number[][];
        return { kind: "matrix", label: `${which}² (Power of 2)`, data: p, steps: stepsPower(nums, p) };
      }
      if (op === "det") {
        if (rows !== cols) throw new Error("Determinant is only defined for square matrices.");
        const d = math.det(nums) as number;
        return { kind: "scalar", label: `det(${which})`, value: d, steps: stepsDet(nums, d) };
      }
      // inv
      if (rows !== cols) throw new Error("Inverse is only defined for square matrices.");
      const d = math.det(nums) as number;
      if (Math.abs(d) < 1e-12) throw new Error("Matrix is singular (determinant = 0) and has no inverse.");
      const inv = math.inv(nums) as number[][];
      return { kind: "matrix", label: `${which}⁻¹ (Inverse)`, data: inv, steps: stepsInverse(nums, inv, d) };
    });
  };

  const binary = (op: "+" | "-" | "*") => {
    run(() => {
      const A = parseMatrix(a);
      const B = parseMatrix(b);
      if (op === "+" || op === "-") {
        if (aRows !== bRows || aCols !== bCols) {
          throw new Error(
            `Addition/subtraction requires matching dimensions. A is ${aRows}×${aCols}, B is ${bRows}×${bCols}.`,
          );
        }
        const r = op === "+"
          ? math.add(A as MathType, B as MathType) as number[][]
          : math.subtract(A as MathType, B as MathType) as number[][];
        return { kind: "matrix", label: `A ${op} B`, data: r, steps: stepsAddSub(A, B, op) };
      }
      // multiply
      if (aCols !== bRows) {
        throw new Error(
          `For A × B the columns of A (${aCols}) must equal the rows of B (${bRows}).`,
        );
      }
      const r = math.multiply(A as MathType, B as MathType) as number[][];
      return { kind: "matrix", label: "A × B", data: r, steps: stepsMultiply(A, B, r) };
    });
  };

  const swap = () => {
    setErr(null);
    setResult(null);
    const prevA = a;
    const prevAR = aRows;
    const prevAC = aCols;
    setA(b);
    setARows(bRows);
    setACols(bCols);
    setB(prevA);
    setBRows(prevAR);
    setBCols(prevAC);
  };

  const gridA = useMemo(() => a, [a]);
  const gridB = useMemo(() => b, [b]);

  return (
    <MathCalcPage
      name="Matrix Calculator"
      tagline="Add, subtract, multiply, transpose, power, determinant and inverse — for any matrices up to 6×6."
      extras={
        <>
          <CalcSection title="What is a matrix?">
            <p>
              A matrix is a rectangular array of numbers arranged in rows and
              columns. A matrix with <em>m</em> rows and <em>n</em> columns is
              called an <em>m×n</em> matrix; the entry in row <em>i</em> and
              column <em>j</em> is written <span className="font-mono">aᵢⱼ</span>.
              Matrices are the workhorses of linear algebra and show up
              anywhere a system of linear relationships needs to be
              represented compactly.
            </p>
            <p>
              They power computer graphics (every 3D rotation, scaling and
              projection is a matrix multiplication), statistics
              (design matrices in regression), physics (states in quantum
              mechanics, stress tensors in mechanics), economics
              (input–output models) and machine learning (essentially every
              modern neural network is a chain of matrix operations).
            </p>
          </CalcSection>

          <CalcSection title="Matrix calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing this tool actually does with your
              grid — how it combines two matrices, how it produces a single
              number (determinant) from a square one, and how it inverts a
              matrix when that number isn't zero.
            </p>
            <GuideCards items={MATRIX_GUIDE} />
          </CalcSection>


          <CalcSection title="Common mistakes">
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Trying to add matrices of different sizes. Addition is entry
                by entry, so the shapes must match exactly.
              </li>
              <li>
                Multiplying matrices in the wrong order. Even when both
                products are defined, A × B and B × A are usually different.
              </li>
              <li>
                Multiplying two matrices whose inner dimensions do not agree
                — for example a 2×3 times a 2×2. Check that cols(A) = rows(B).
              </li>
              <li>
                Assuming every square matrix has an inverse. Singular
                matrices (det = 0) do not; the calculator will flag this.
              </li>
              <li>
                Confusing the transpose with the inverse. Aᵀ is defined for
                every matrix; A⁻¹ is not.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Two independent input grids with adjustable rows and columns up to 6×6",
                "Fill helpers: all zeros, all ones and random small integers",
                "Per-matrix unary tools: transpose, square (A²), determinant and inverse",
                "Combined operations: A + B, A − B, A × B and swap A ↔ B",
                "Copy any result matrix straight back into A or B for chained work",
                "Clear error messages for singular matrices and dimension mismatches",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "When can two matrices be added?",
                  a: <p>Only when they have identical dimensions. Addition is done position by position.</p>,
                },
                {
                  q: "When can two matrices be multiplied?",
                  a: <p>When the number of columns of the first matrix matches the number of rows of the second. An m×n times an n×p produces an m×p matrix.</p>,
                },
                {
                  q: "Which matrices have an inverse?",
                  a: <p>Only square matrices whose determinant is non-zero. If det(A) = 0 the matrix is singular and there is no inverse.</p>,
                },
                {
                  q: "Is matrix multiplication commutative?",
                  a: <p>No. A × B is generally different from B × A, even when both products are defined and the same shape.</p>,
                },
                {
                  q: "What is the transpose used for?",
                  a: <p>It is the natural companion of the dot product, appears throughout statistics (Aᵀ A shows up in least squares), and turns row-based data into column-based data.</p>,
                },
                {
                  q: "Why does the calculator cap dimensions at 6×6?",
                  a: <p>Above 6×6 the input grid becomes unwieldy on screen. All the underlying algorithms scale much further; the limit is a UX choice.</p>,
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
                { to: "/calculators/math/fraction-calculator", label: "Fraction Calculator" },
                { to: "/calculators/math/big-number-calculator", label: "Big Number Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MatrixGrid
          label="A"
          matrix={gridA}
          rows={aRows}
          cols={aCols}
          onRowsChange={(n) => updateDims("A", n, aCols)}
          onColsChange={(n) => updateDims("A", aRows, n)}
          onCellChange={(r, c, v) => setCell("A", r, c, v)}
          onFill={(v) => fill("A", v)}
          onRandom={() => random("A")}
          onUnary={(op) => unary("A", op)}
        />
        <MatrixGrid
          label="B"
          matrix={gridB}
          rows={bRows}
          cols={bCols}
          onRowsChange={(n) => updateDims("B", n, bCols)}
          onColsChange={(n) => updateDims("B", bRows, n)}
          onCellChange={(r, c, v) => setCell("B", r, c, v)}
          onFill={(v) => fill("B", v)}
          onRandom={() => random("B")}
          onUnary={(op) => unary("B", op)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <PrimaryButton onClick={() => binary("+")}>A + B</PrimaryButton>
        <PrimaryButton onClick={() => binary("-")}>A − B</PrimaryButton>
        <PrimaryButton onClick={() => binary("*")}>A × B</PrimaryButton>
        <button
          onClick={swap}
          className="px-4 py-2 rounded-md border border-border bg-card hover:bg-muted text-sm font-semibold"
        >
          A ↔ B (swap)
        </button>
      </div>

      {err && <ErrorBox message={err} />}
      {result && (
        <ResultDisplay
          result={result}
          onCopyToA={(m) => loadFromNums("A", m)}
          onCopyToB={(m) => loadFromNums("B", m)}
        />
      )}
    </MathCalcPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function AddMini() {
  const cell = (x: number, y: number, t: string, cls = "fill-primary") => (
    <>
      <rect x={x} y={y} width="18" height="18" rx="2" className="fill-primary/10 stroke-primary/40" />
      <text x={x + 9} y={y + 13} textAnchor="middle" className={`${cls} font-mono`} fontSize="10">{t}</text>
    </>
  );
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      {cell(20, 30, "1")}{cell(40, 30, "2")}{cell(20, 50, "3")}{cell(40, 50, "4")}
      <text x="72" y="52" className="fill-foreground" fontSize="14">+</text>
      {cell(88, 30, "5")}{cell(108, 30, "6")}{cell(88, 50, "7")}{cell(108, 50, "8")}
      <text x="140" y="52" className="fill-foreground" fontSize="14">=</text>
      {cell(156, 30, "6")}{cell(176, 30, "8")}{cell(156, 50, "10")}{cell(176, 50, "12")}
      <text x="120" y="100" textAnchor="middle" className="fill-muted-foreground" fontSize="10">entry-by-entry — shapes must match</text>
    </svg>
  );
}

function MulMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <rect x="10" y="20" width="60" height="40" rx="4" className="fill-primary/10 stroke-primary/50" />
      <text x="40" y="44" textAnchor="middle" className="fill-primary font-mono" fontSize="10">m × n</text>
      <text x="80" y="44" className="fill-foreground" fontSize="14">·</text>
      <rect x="94" y="20" width="60" height="40" rx="4" className="fill-primary/10 stroke-primary/50" />
      <text x="124" y="44" textAnchor="middle" className="fill-primary font-mono" fontSize="10">n × p</text>
      <text x="164" y="44" className="fill-foreground" fontSize="14">=</text>
      <rect x="178" y="20" width="52" height="40" rx="4" className="fill-primary/20 stroke-primary/60" />
      <text x="204" y="44" textAnchor="middle" className="fill-primary font-mono" fontSize="10">m × p</text>
      <line x1="10" y1="72" x2="230" y2="72" stroke="var(--color-border)" />
      <text x="120" y="90" textAnchor="middle" className="fill-foreground font-mono" fontSize="10">(A·B)ᵢⱼ = Σₖ aᵢₖ · bₖⱼ</text>
      <text x="120" y="108" textAnchor="middle" className="fill-muted-foreground" fontSize="10">row of A · column of B (dot product)</text>
      <text x="120" y="124" textAnchor="middle" className="fill-muted-foreground" fontSize="9">A·B ≠ B·A in general</text>
    </svg>
  );
}

function DetInvMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="22" className="fill-muted-foreground font-mono" fontSize="10">2×2 det = ad − bc</text>
      <text x="10" y="40" className="fill-foreground font-mono" fontSize="10">det [[3,8],[4,6]] = 18 − 32 = −14</text>
      <line x1="10" y1="50" x2="230" y2="50" stroke="var(--color-border)" />
      <text x="10" y="68" className="fill-muted-foreground font-mono" fontSize="10">n≥3 → LU / cofactor expansion</text>
      <line x1="10" y1="78" x2="230" y2="78" stroke="var(--color-border)" />
      <text x="10" y="96" className="fill-muted-foreground font-mono" fontSize="10">inverse = (1/det) · adj(A)</text>
      <text x="10" y="112" className="fill-foreground font-mono" fontSize="10">det = 0 → singular, no inverse</text>
      <text x="10" y="126" className="fill-primary font-mono" fontSize="9">Gauss–Jordan used behind the scenes</text>
    </svg>
  );
}

const MATRIX_GUIDE: GuideCardItem[] = [
  {
    key: "addmul-scalar",
    title: "Add, subtract, scalar × — the shape-preserving operations",
    explain: (
      <>Addition and subtraction work entry by entry, so both matrices must
      have the same rows and columns. Scalar multiplication is even simpler
      — every entry is multiplied by the scalar. The output keeps the shape
      of the input. If your two matrices don't share dimensions, the
      calculator refuses instead of guessing.</>
    ),
    formula: <>(A ± B)ᵢⱼ = aᵢⱼ ± bᵢⱼ &nbsp;·&nbsp; (kA)ᵢⱼ = k · aᵢⱼ</>,
    diagram: <AddMini />,
    example: { given: "[[1,2],[3,4]] + [[5,6],[7,8]]", substitute: "cell by cell", answer: "[[6,8],[10,12]]" },
  },
  {
    key: "mul-pow-trans",
    title: "Multiply, power, transpose — how shapes rearrange",
    explain: (
      <>Matrix × matrix requires the inner dimensions to match: an m×n times
      an n×p produces an m×p, and each output entry is the dot product of a
      row of A with a column of B. Raising a matrix to a positive integer
      power only works for squares (repeated self-multiply). The transpose
      just flips rows into columns, so m×n becomes n×m. Multiplication is
      not commutative — A·B and B·A are usually different even when both
      exist.</>
    ),
    formula: <>(A·B)ᵢⱼ = Σₖ aᵢₖ bₖⱼ &nbsp;·&nbsp; (Aᵀ)ᵢⱼ = aⱼᵢ</>,
    diagram: <MulMini />,
    example: { given: "[[1,2,3],[4,5,6]] · [[7,8],[9,10],[11,12]]", substitute: "row·col dots", answer: "[[58,64],[139,154]]" },
  },
  {
    key: "det-inv",
    title: "Determinant & inverse — the square-matrix helpers",
    explain: (
      <>The determinant collapses a square matrix into a single number that
      says how much the matrix scales area or volume; the sign tells you if
      it flips orientation. For 2×2 that's simply ad − bc, for larger sizes
      the calculator uses LU decomposition to stay fast at 5×5 and 6×6.
      Once det is known the inverse follows: A⁻¹ = (1/det)·adj(A), which
      the tool computes with Gauss–Jordan. If det(A) = 0 the matrix is
      singular and the calculator reports that rather than returning
      nonsense.</>
    ),
    formula: <>2×2: det = ad − bc &nbsp;·&nbsp; A⁻¹ = (1/det) · adj(A)</>,
    diagram: <DetInvMini />,
    example: { given: "A = [[4,7],[2,6]]", substitute: "det = 10, swap+negate", answer: "A⁻¹ = [[0.6,−0.7],[−0.2,0.4]]" },
  },
];
