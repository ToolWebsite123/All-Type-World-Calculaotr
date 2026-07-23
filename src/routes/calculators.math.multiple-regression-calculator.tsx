import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { create, all } from "mathjs";
import {
  MathCalcPage,
  CalcSection,
  CalcFAQ,
  FeatureList,
  RelatedLinks,
  PrimaryButton,
  ErrorBox,
  ResultBox,
  GuideCards,
  type GuideCardItem,
  FormulaBlock,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import type { Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import { buildCalculatorSeo } from "@/components/SEO";
import { tCDF } from "@/lib/math/t-test";
import { fCDF } from "@/lib/math/p-value";
import type { ReactNode } from "react";

/** Centered display-math line used inside solution steps. */
function MathLine({ children }: { children: ReactNode }) {
  return (
    <div className="my-1 flex items-center justify-center text-center font-serif text-[15px] italic text-foreground">
      <span className="inline-flex items-center gap-1">{children}</span>
    </div>
  );
}

/** Small left-aligned note between math lines. */
function MathNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 mb-1 text-sm not-italic text-muted-foreground">
      {children}
    </div>
  );
}

const math = create(all, {});

export const Route = createFileRoute("/calculators/math/multiple-regression-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Multiple Regression Calculator",
      title:
        "Multiple Regression Calculator",
      metaDescription:
        "Fit a multiple linear regression with coefficients, R², adjusted R², SE, and t-statistics for each predictor.",
      canonicalUrl: "/calculators/math/multiple-regression-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math Calculators", path: "/calculators/math" },
        {
          name: "Multiple Regression Calculator",
          path: "/calculators/math/multiple-regression-calculator",
        },
      ],
      faqs: [
        {
          q: "How many predictors can I add?",
          a: "As many as you like, provided the number of data rows is greater than the number of predictors plus 1. Each 'Add predictor' click adds a new X column; each 'Add row' click adds a new data row.",
        },
        {
          q: "Should I look at R² or Adjusted R²?",
          a: "For a single model, either works. When comparing models with different numbers of predictors, always use Adjusted R² — plain R² can only go up (or stay the same) when you add predictors, even useless ones, so it's misleading for model comparison.",
        },
        {
          q: "What does the p-value on each coefficient mean?",
          a: "It's the two-tailed p-value for the null hypothesis that this predictor's true coefficient is zero, holding all other predictors constant. A small p-value (say < 0.05) is evidence that the predictor genuinely contributes.",
        },
        {
          q: "Why can R² be high while individual predictors are not significant?",
          a: "This is a classic sign of multicollinearity — two or more predictors carry overlapping information, so the model as a whole fits well (high R², significant F-test) but no single coefficient stands out. Consider dropping one of the correlated predictors.",
        },
        {
          q: "What if I only have one predictor?",
          a: "Use the Simple Linear Regression Calculator instead — it also plots the fitted line against your scatter of points, which is the right visual for one predictor.",
        },
      ],
    }),
  component: MultipleRegressionPage,
});

/* ================= Math ================= */

interface CoefRow {
  name: string;
  b: number;
  se: number;
  t: number;
  p: number;
}

interface MRResult {
  n: number;
  k: number; // predictors, not counting intercept
  predictorNames: string[];
  coefs: CoefRow[]; // includes intercept as first row
  yhat: number[];
  resid: number[];
  sse: number;
  sst: number;
  r2: number;
  adjR2: number;
  mse: number;
  fStat: number;
  fP: number;
  dfModel: number; // = k
  dfResid: number; // = n - k - 1
  // Standardized coefficients (excluding intercept) for the bar chart
  stdCoefs: { name: string; value: number }[];
  ys: number[];
}

function computeMR(
  ys: number[],
  xCols: number[][], // xCols[j] = column j
  predictorNames: string[],
): MRResult | { error: string } {
  const n = ys.length;
  const k = xCols.length;
  if (k < 1) return { error: "Add at least one predictor column." };
  if (n < k + 2)
    return {
      error: `Need at least ${k + 2} data rows for ${k} predictor${k > 1 ? "s" : ""} (n > k + 1).`,
    };
  for (const col of xCols)
    if (col.length !== n)
      return { error: "Every column must have the same number of rows." };

  // Design matrix with leading column of 1s
  const X: number[][] = ys.map((_, i) => [1, ...xCols.map((c) => c[i])]);
  const Xt = math.transpose(X) as number[][];
  const XtX = math.multiply(Xt, X) as number[][];
  const Xty = math.multiply(Xt, ys) as number[];

  let XtXinv: number[][];
  try {
    XtXinv = math.inv(XtX) as number[][];
  } catch {
    return {
      error:
        "X'X is singular — a predictor is likely an exact linear combination of the others (perfect multicollinearity). Remove or transform one of the correlated predictors.",
    };
  }
  const beta = math.multiply(XtXinv, Xty) as number[];

  const yhat = X.map((row) =>
    row.reduce((s, v, j) => s + v * beta[j], 0),
  );
  const resid = ys.map((y, i) => y - yhat[i]);
  const sse = resid.reduce((s, r) => s + r * r, 0);
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  const sst = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const r2 = sst === 0 ? NaN : 1 - sse / sst;
  const dfResid = n - k - 1;
  const dfModel = k;
  const adjR2 =
    dfResid > 0 ? 1 - (1 - r2) * ((n - 1) / dfResid) : NaN;
  const mse = dfResid > 0 ? sse / dfResid : NaN;

  // Coefficient standard errors: sqrt(diag(MSE * (X'X)^-1))
  const se: number[] = [];
  for (let j = 0; j < k + 1; j++) {
    const v = mse * XtXinv[j][j];
    se.push(v >= 0 ? Math.sqrt(v) : NaN);
  }
  const tStats = beta.map((b, j) => (se[j] > 0 ? b / se[j] : NaN));
  const pVals = tStats.map((t) =>
    dfResid > 0 && Number.isFinite(t)
      ? 2 * (1 - tCDF(Math.abs(t), dfResid))
      : NaN,
  );

  const names = ["Intercept", ...predictorNames];
  const coefs: CoefRow[] = names.map((name, j) => ({
    name,
    b: beta[j],
    se: se[j],
    t: tStats[j],
    p: pVals[j],
  }));

  // F-statistic for overall model significance
  const fStat =
    dfResid > 0 && r2 < 1 ? (r2 / k) / ((1 - r2) / dfResid) : Infinity;
  const fP = Number.isFinite(fStat) ? 1 - fCDF(fStat, k, dfResid) : 0;

  // Standardized coefficients b_j * (SD(x_j) / SD(y))
  const sdY = Math.sqrt(sst / (n - 1));
  const stdCoefs = predictorNames.map((name, j) => {
    const col = xCols[j];
    const meanCol = col.reduce((s, v) => s + v, 0) / n;
    const varCol =
      col.reduce((s, v) => s + (v - meanCol) ** 2, 0) / (n - 1);
    const sdCol = Math.sqrt(varCol);
    const value = sdY === 0 ? 0 : beta[j + 1] * (sdCol / sdY);
    return { name, value };
  });

  return {
    n,
    k,
    predictorNames,
    coefs,
    yhat,
    resid,
    sse,
    sst,
    r2,
    adjR2,
    mse,
    fStat,
    fP,
    dfModel,
    dfResid,
    stdCoefs,
    ys,
  };
}

function fmt(n: number, d = 4): string {
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e10)) return n.toExponential(3);
  return parseFloat(n.toFixed(d)).toString();
}
function fmtP(p: number): string {
  if (!Number.isFinite(p)) return "—";
  if (p < 0.0001) return "< 0.0001";
  return p.toFixed(4);
}

/* ================= Diagrams ================= */

function CoefBarChart({ items }: { items: { name: string; value: number }[] }) {
  const W = 520;
  const rowH = 34;
  const H = 30 + items.length * rowH;
  const padL = 90;
  const padR = 20;
  const iw = W - padL - padR;
  const maxAbs = Math.max(1e-9, ...items.map((i) => Math.abs(i.value)));
  const zeroX = padL + iw / 2;
  const xTo = (v: number) => zeroX + (v / maxAbs) * (iw / 2);
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Standardized coefficients — relative contribution of each predictor
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W }}
        role="img"
        aria-label="Standardized coefficient bar chart"
      >
        <line
          x1={zeroX}
          y1={20}
          x2={zeroX}
          y2={H - 10}
          className="stroke-border"
          strokeWidth={1}
        />
        {items.map((it, i) => {
          const y = 20 + i * rowH + rowH / 2;
          const x0 = Math.min(zeroX, xTo(it.value));
          const w = Math.abs(xTo(it.value) - zeroX);
          const positive = it.value >= 0;
          return (
            <g key={it.name}>
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={12}
                className="fill-foreground"
              >
                {it.name}
              </text>
              <rect
                x={x0}
                y={y - 10}
                width={Math.max(w, 1)}
                height={20}
                className={
                  positive ? "fill-primary/70" : "fill-destructive/70"
                }
                rx={3}
              />
              <text
                x={positive ? xTo(it.value) + 6 : xTo(it.value) - 6}
                y={y + 4}
                textAnchor={positive ? "start" : "end"}
                fontSize={11}
                className="fill-foreground font-serif italic"
              >
                {fmt(it.value, 3)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">
        Bars are on the same scale (units of standard deviations of Y per SD
        of X), so larger absolute bars mean a stronger relative effect. Red
        bars are negative effects.
      </p>
    </div>
  );
}

function ResidualsPlot({
  yhat,
  resid,
}: {
  yhat: number[];
  resid: number[];
}) {
  const W = 520,
    H = 260;
  const padL = 50,
    padR = 20,
    padT = 20,
    padB = 40;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const xMin = Math.min(...yhat);
  const xMax = Math.max(...yhat);
  const xPad = (xMax - xMin) * 0.05 || 1;
  const rMax = Math.max(1e-9, ...resid.map((r) => Math.abs(r)));
  const xTo = (x: number) =>
    padL + ((x - (xMin - xPad)) / (xMax - xMin + 2 * xPad)) * iw;
  const yTo = (r: number) => padT + ih / 2 - (r / rMax) * (ih / 2 - 8);

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Residuals vs predicted — model-fit diagnostic
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W }}
        role="img"
        aria-label="Residuals versus predicted values plot"
      >
        <line
          x1={padL}
          y1={yTo(0)}
          x2={W - padR}
          y2={yTo(0)}
          className="stroke-primary"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={H - padB}
          className="stroke-border"
          strokeWidth={1}
        />
        <line
          x1={padL}
          y1={H - padB}
          x2={W - padR}
          y2={H - padB}
          className="stroke-border"
          strokeWidth={1}
        />
        {yhat.map((yh, i) => (
          <circle
            key={i}
            cx={xTo(yh)}
            cy={yTo(resid[i])}
            r={4}
            className="fill-primary/70 stroke-primary"
            strokeWidth={1}
          />
        ))}
        <text
          x={(padL + W - padR) / 2}
          y={H - 10}
          textAnchor="middle"
          fontSize={11}
          className="fill-muted-foreground"
        >
          Predicted Y
        </text>
        <text
          x={16}
          y={(padT + H - padB) / 2}
          transform={`rotate(-90 16 ${(padT + H - padB) / 2})`}
          textAnchor="middle"
          fontSize={11}
          className="fill-muted-foreground"
        >
          Residual (Y − Ŷ)
        </text>
        <text
          x={W - padR}
          y={yTo(0) - 4}
          textAnchor="end"
          fontSize={10}
          className="fill-primary"
        >
          residual = 0
        </text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">
        Look for a random cloud around the dashed zero line. Any visible
        pattern (curve, funnel, trend) suggests the linear model is missing
        structure in your data.
      </p>
    </div>
  );
}

/* ================= Guide cards ================= */

const MR_GUIDE: GuideCardItem[] = [
  {
    key: "model",
    title: "1. The multiple-regression model",
    explain: "Multiple regression extends the y = m·x + b line to two or more predictors. Instead of a line through a scatter it fits a flat plane (2 predictors) or a hyperplane (more), choosing the intercept b₀ and slopes b₁ … bₖ that make the plane sit as close as possible to all data points at once.",
    formula: <>Y = b₀ + b₁·X₁ + b₂·X₂ + … + bₖ·Xₖ + ε</>,
    legend: [
      { sym: "bⱼ", def: "partial slope for Xⱼ (others held fixed)" },
      { sym: "ε", def: "residual — what the model can't explain" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 140" className="w-full max-w-[220px]" aria-hidden>
          <polygon points="30,110 190,90 180,40 20,60" className="fill-primary/15 stroke-primary" />
          {[[60,95],[110,80],[150,72],[90,60],[140,55]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r={3} className="fill-primary" />))}
          <text x="105" y="130" fontSize="10" textAnchor="middle" className="fill-muted-foreground">fitted plane through the cloud</text>
        </svg>
      </div>
    ),
    example: {
      given: "n = 6, k = 2 predictors",
      substitute: "Ŷ = 1.833 + 2.028·X₁ + 0.694·X₂",
      answer: "each coefficient is a partial effect",
    },
  },
  {
    key: "leastsq",
    title: "2. Least-squares fit via matrices",
    explain: "The best-fit coefficients minimise the sum of squared residuals Σ(y − ŷ)². For multiple predictors the compact closed form uses matrix algebra — the calculator builds X, computes XᵀX and Xᵀy, and solves for the coefficient vector b.",
    formula: <>b = (XᵀX)⁻¹ Xᵀy</>,
    legend: [
      { sym: "X", def: "design matrix (columns of predictors + 1s)" },
      { sym: "y", def: "vector of observed Y values" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-[11px] font-serif italic">
        <div className="text-primary">
          <div>b = (XᵀX)⁻¹ Xᵀ y</div>
          <div className="mt-2 text-muted-foreground font-sans">If XᵀX is singular, two predictors carry the same information → the calculator flags multicollinearity.</div>
        </div>
      </div>
    ),
    example: {
      given: "default 6-row dataset",
      substitute: "solve (XᵀX)⁻¹ Xᵀy",
      answer: "b₀ = 1.833, b₁ = 2.028, b₂ = 0.694",
    },
  },
  {
    key: "r2",
    title: "3. R² vs Adjusted R² — the important one",
    explain: "R² is the fraction of Y's variance the model explains. It has one bad property: adding any new predictor — even random noise — can only push R² up, never down. Adjusted R² pays a penalty for each extra predictor, so it actually falls if a variable isn't earning its keep.",
    formula: <>Adj R² = 1 − (1 − R²) · (n − 1)/(n − k − 1)</>,
    legend: [
      { sym: "n", def: "number of rows" },
      { sym: "k", def: "number of predictors (excl. intercept)" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 130" className="w-full max-w-[220px]" aria-hidden>
          <line x1="20" y1="110" x2="200" y2="110" className="stroke-border" />
          <line x1="20" y1="20" x2="20" y2="110" className="stroke-border" />
          <path d="M 20 90 L 60 75 L 100 55 L 140 45 L 180 40" className="fill-none stroke-primary" strokeWidth={2} />
          <path d="M 20 92 L 60 78 L 100 58 L 140 62 L 180 78" className="fill-none stroke-emerald-500" strokeWidth={2} strokeDasharray="4 3" />
          <text x="185" y="35" fontSize="9" textAnchor="end" className="fill-primary">R²</text>
          <text x="185" y="90" fontSize="9" textAnchor="end" className="fill-emerald-600">Adj R²</text>
          <text x="110" y="125" fontSize="9" textAnchor="middle" className="fill-muted-foreground">predictors added →</text>
        </svg>
      </div>
    ),
    example: {
      given: "n = 6, k = 2, R² = 0.9955",
      substitute: "1 − 0.0045·5/3",
      answer: "Adj R² ≈ 0.9926",
    },
  },
  {
    key: "coef",
    title: "4. Interpreting a coefficient — 'partial effect'",
    explain: "Each bⱼ is the expected change in Y for a one-unit rise in Xⱼ with every other predictor held constant. That 'holding constant' clause matters — b₁ = 2 doesn't mean 'X₁ up 1 ⇒ Y up 2' in the raw data; it means that after removing what X₂, X₃, … already explain, X₁ still moves Y by 2 per unit.",
    formula: <>ŷ = b₀ + Σ bⱼ · xⱼ</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 130" className="w-full max-w-[220px]" aria-hidden>
          {[["X₁", 90, "fill-primary"], ["X₂", 45, "fill-primary/70"], ["X₃", 15, "fill-primary/40"]].map(([lbl,h,cls], i)=>{
            const x = 40 + i * 55;
            const H = Number(h);
            return (
              <g key={i as number}>
                <rect x={x} y={110-H} width="34" height={H} className={cls as string} />
                <text x={x+17} y={122} fontSize="10" textAnchor="middle" className="fill-muted-foreground">{lbl as string}</text>
              </g>
            );
          })}
          <text x="110" y="14" fontSize="10" textAnchor="middle" className="fill-muted-foreground">standardised coefficients</text>
        </svg>
      </div>
    ),
    example: {
      given: "b₁ = 2.028, b₂ = 0.694",
      substitute: "same-unit comparison via standardised chart",
      answer: "X₁ contributes more per SD than X₂",
    },
  },
  {
    key: "ftest",
    title: "5. Overall F-test & per-coefficient p-values",
    explain: "The F-test asks a single yes/no question: does the whole model explain more than nothing? Per-coefficient t-statistics and p-values then ask, for each Xⱼ, whether it adds anything beyond the others. A tiny F p-value with no individual significant t is the classic sign of multicollinearity.",
    formula: <>F = (R²/k) / ((1 − R²)/(n − k − 1))</>,
    legend: [
      { sym: "df", def: "(k, n − k − 1) for the F distribution" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 130" className="w-full max-w-[220px]" aria-hidden>
          <line x1="20" y1="105" x2="200" y2="105" className="stroke-border" />
          <path d="M 20 105 Q 60 30 100 55 T 200 100" className="fill-primary/20 stroke-primary" />
          <line x1="150" y1="105" x2="150" y2="55" className="stroke-destructive" strokeDasharray="3 3" />
          <text x="155" y="45" fontSize="9" className="fill-destructive">F observed</text>
        </svg>
      </div>
    ),
    example: {
      given: "R² = 0.9955, n = 6, k = 2",
      substitute: "(0.9955/2) / (0.0045/3)",
      answer: "F ≈ 334.5, p ≈ 0.0003",
    },
  },
];

/* ================= Page ================= */

type Grid = string[][]; // rows × cols; col 0 is Y, cols 1..k are X1..Xk

function makeInitialGrid(): Grid {
  // Verified worked-example dataset (see extras). Kept in sync.
  //  Y  X1 X2
  //  5   1  2
  //  7   2  1
  // 10   3  3
  // 11   4  2
  // 15   5  4
  // 16   6  3
  return [
    ["5", "1", "2"],
    ["7", "2", "1"],
    ["10", "3", "3"],
    ["11", "4", "2"],
    ["15", "5", "4"],
    ["16", "6", "3"],
  ];
}

function MultipleRegressionPage() {
  const [grid, setGrid] = useState<Grid>(makeInitialGrid());
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<MRResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const numPredictors = (grid[0]?.length ?? 1) - 1;
  const predictorNames = useMemo(
    () => Array.from({ length: numPredictors }, (_, j) => `X${j + 1}`),
    [numPredictors],
  );

  const setCell = (r: number, c: number, v: string) => {
    setGrid((g) => {
      const copy = g.map((row) => row.slice());
      copy[r][c] = v;
      return copy;
    });
  };
  const addRow = () =>
    setGrid((g) => [...g, Array(g[0].length).fill("")]);
  const removeRow = (r: number) =>
    setGrid((g) => (g.length > 3 ? g.filter((_, i) => i !== r) : g));
  const addPredictor = () =>
    setGrid((g) => g.map((row) => [...row, ""]));
  const removePredictor = () =>
    setGrid((g) =>
      g[0].length > 2 ? g.map((row) => row.slice(0, -1)) : g,
    );

  const onCalc = () => {
    setErr(null);
    setRes(null);
    const rows = grid
      .map((r) => r.map((c) => c.trim()))
      .filter((r) => r.some((c) => c !== ""));
    if (rows.length < 3) {
      setErr("Enter at least 3 complete data rows.");
      return;
    }
    const ys: number[] = [];
    const xCols: number[][] = Array.from(
      { length: numPredictors },
      () => [],
    );
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.length !== numPredictors + 1 || row.some((c) => c === "")) {
        setErr(`Row ${i + 1} has missing values.`);
        return;
      }
      const nums = row.map(Number);
      if (nums.some((v) => !Number.isFinite(v))) {
        setErr(`Row ${i + 1} contains a non-numeric value.`);
        return;
      }
      ys.push(nums[0]);
      for (let j = 0; j < numPredictors; j++) xCols[j].push(nums[j + 1]);
    }
    const out = computeMR(ys, xCols, predictorNames);
    if ("error" in out) {
      setErr(out.error);
      return;
    }
    setRes(out);
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      }),
    );
  };

  const eqString = res
    ? `Y = ${fmt(res.coefs[0].b, 4)}` +
      res.coefs
        .slice(1)
        .map(
          (c) =>
            ` ${c.b >= 0 ? "+" : "−"} ${fmt(Math.abs(c.b), 4)}·${c.name}`,
        )
        .join("")
    : "";

  const steps: Step[] = useMemo(() => {
    if (!res) return [];
    const coefLines = res.coefs.map((c) => (
      <MathLine key={c.name}>
        b({c.name}) = {fmt(c.b, 4)}, SE = {fmt(c.se, 4)}, t = {fmt(c.t, 3)}, p = {fmtP(c.p)}
      </MathLine>
    ));
    return [
      {
        title: "Set up the design matrix",
        body: (
          <>
            <MathNote>
              Stack a column of 1s (for the intercept) with the {res.k} predictor
              column{res.k > 1 ? "s" : ""} to build an n×(k+1) design matrix X, using
              the n = {res.n} rows entered.
            </MathNote>
            <MathLine>X = [1, X₁, …, X{res.k}], y = [Y₁, …, Yₙ]</MathLine>
          </>
        ),
      },
      {
        title: "Solve the normal equations",
        body: (
          <>
            <MathNote>
              The least-squares coefficients minimise Σ(y − ŷ)². The closed-form
              solution comes from the normal equations.
            </MathNote>
            <MathLine>XᵀX = Xᵀ · X</MathLine>
            <MathLine>Xᵀy = Xᵀ · y</MathLine>
            <MathLine>β̂ = (XᵀX)⁻¹ · Xᵀy</MathLine>
            <MathLine>β̂ = [{res.coefs.map((c) => fmt(c.b, 4)).join(", ")}]</MathLine>
          </>
        ),
      },
      {
        title: "Fitted equation",
        body: (
          <>
            <MathNote>Plug β̂ back into the model to get the fitted equation.</MathNote>
            <MathLine>{eqString}</MathLine>
          </>
        ),
      },
      {
        title: "Fitted values and residuals",
        body: (
          <>
            <MathNote>
              For each row, the fitted value ŷᵢ = xᵢᵀβ̂, and the residual is the
              gap between observed and fitted.
            </MathNote>
            <MathLine>ŷ = X · β̂</MathLine>
            <MathLine>e = y − ŷ</MathLine>
          </>
        ),
      },
      {
        title: "Sums of squares — RSS and TSS",
        body: (
          <>
            <MathNote>
              TSS is the total variance in Y; RSS (a.k.a. SSE) is what's left
              unexplained after fitting the model.
            </MathNote>
            <MathLine>TSS = Σ(y − ȳ)²</MathLine>
            <MathLine>TSS = {fmt(res.sst)}</MathLine>
            <MathLine>RSS = Σ(y − ŷ)²</MathLine>
            <MathLine>RSS = {fmt(res.sse)}</MathLine>
            <MathLine>SSR = TSS − RSS = {fmt(res.sst - res.sse)}</MathLine>
          </>
        ),
      },
      {
        title: "R²",
        body: (
          <>
            <MathNote>R² is the fraction of Y's variance explained by the model.</MathNote>
            <MathLine>R² = 1 − RSS / TSS</MathLine>
            <MathLine>
              R² = 1 − {fmt(res.sse)} / {fmt(res.sst)}
            </MathLine>
            <MathLine>R² = {fmt(res.r2, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "Adjusted R²",
        body: (
          <>
            <MathNote>
              Adjusted R² penalises extra predictors that don't improve the fit
              enough to justify the lost degrees of freedom.
            </MathNote>
            <MathLine>Adj R² = 1 − (1 − R²) · (n − 1)/(n − k − 1)</MathLine>
            <MathLine>
              Adj R² = 1 − (1 − {fmt(res.r2, 4)}) · ({res.n} − 1)/({res.n} − {res.k} − 1)
            </MathLine>
            <MathLine>Adj R² = {fmt(res.adjR2, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "Standard error and t-statistic per coefficient",
        body: (
          <>
            <MathNote>
              Each coefficient's SE comes from the diagonal of MSE·(XᵀX)⁻¹, where
              MSE = RSS/(n − k − 1); the t-statistic tests whether the coefficient
              differs from zero.
            </MathNote>
            <MathLine>MSE = RSS / (n − k − 1) = {fmt(res.mse)}</MathLine>
            <MathLine>SE(bⱼ) = √(MSE · [(XᵀX)⁻¹]ⱼⱼ)</MathLine>
            <MathLine>t(bⱼ) = bⱼ / SE(bⱼ)</MathLine>
            {coefLines}
          </>
        ),
      },
      {
        title: "Overall F-test",
        body: (
          <>
            <MathNote>
              The F-test checks whether the model as a whole explains
              significantly more variance than an intercept-only model.
            </MathNote>
            <MathLine>F = (R²/k) / ((1 − R²)/(n − k − 1))</MathLine>
            <MathLine>
              F = ({fmt(res.r2, 4)}/{res.k}) / ((1 − {fmt(res.r2, 4)})/{res.dfResid})
            </MathLine>
            <MathLine>
              F = {fmt(res.fStat, 3)}, df = ({res.k}, {res.dfResid}), p = {fmtP(res.fP)}
            </MathLine>
          </>
        ),
      },
    ];
  }, [res, eqString]);

  const extras = (
    <>
      <CalcSection title="Multiple regression explained, step by step">
        <p className="text-sm text-muted-foreground">
          Each concept has a plain-English definition, the formula this calculator uses, a small diagram and a worked example — all in one card so the maths lines up with the visual.
        </p>
        <GuideCards items={MR_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Any number of predictors — dynamic Add predictor / Add row controls (not capped at 2)",
            "Full coefficient table: estimate, standard error, t-statistic and two-tailed p-value for every b",
            "Both R² and Adjusted R², plus the overall F-test with p-value",
            "Standardised-coefficient bar chart to compare each predictor's relative contribution on a common scale",
            "Residuals-vs-predicted diagnostic plot to visually check model fit quality",
            "Detects perfect multicollinearity (singular XᵀX) and reports it plainly",
            "Show / hide step-by-step working for R², Adjusted R² and the F-test",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            { q: "How many predictors can I add?", a: (<p>Any number, as long as n &gt; k + 1 (so residual degrees of freedom n − k − 1 ≥ 1).</p>) },
            { q: "Should I look at R² or Adjusted R²?", a: (<p>Report both, decide with Adjusted R². Plain R² only ever rises when you add predictors — including useless ones — so it can't fairly compare models of different sizes.</p>) },
            { q: "What does the p-value on each coefficient mean?", a: (<p>The two-tailed p-value for the null hypothesis that the coefficient's true value is zero, holding the other predictors constant.</p>) },
            { q: "Why can the F-test be significant while no individual coefficient is?", a: (<p>Classic multicollinearity — the predictors collectively explain a lot, but each is redundant given the others, so standard errors inflate and no single t-stat is significant.</p>) },
            { q: "How is the F-statistic computed?", a: (<p>F = (R²/k) / ((1 − R²)/(n − k − 1)) on (k, n − k − 1) degrees of freedom.</p>) },
            { q: "What if I only have one predictor?", a: (<p>Use the <Link to="/calculators/math/linear-regression-calculator" className="text-primary underline">Simple Linear Regression Calculator</Link>; it also plots the fitted line against the scatter.</p>) },
          ]}
        />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/linear-regression-calculator", label: "Simple Linear Regression Calculator" },
            { to: "/calculators/math/correlation-calculator", label: "Correlation Coefficient Calculator" },
            { to: "/calculators/math/covariance-calculator", label: "Covariance Calculator" },
            { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
          ]}
        />
      </CalcSection>
    </>
  );

  return (
    <MathCalcPage
      name="Multiple Regression Calculator"
      tagline="Fit Y = b₀ + b₁X₁ + b₂X₂ + … with any number of predictors. Per-coefficient significance, R² and Adjusted R², overall F-test, plus a residuals plot and standardised-coefficient chart."
      extras={extras}
    >
      <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-foreground">
            Data table — Y in the first column, X₁, X₂, … after
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addPredictor}
              className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40"
            >
              + Predictor
            </button>
            <button
              type="button"
              onClick={removePredictor}
              disabled={numPredictors <= 1}
              className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 disabled:opacity-40"
            >
              − Predictor
            </button>
            <button
              type="button"
              onClick={addRow}
              className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40"
            >
              + Row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/40">
              <tr>
                <th className="px-2 py-2 text-left font-semibold">#</th>
                <th className="px-2 py-2 text-left font-semibold">Y</th>
                {predictorNames.map((n) => (
                  <th key={n} className="px-2 py-2 text-left font-semibold">
                    {n}
                  </th>
                ))}
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {grid.map((row, r) => (
                <tr key={r} className="odd:bg-background/40">
                  <td className="px-2 py-1 text-xs text-muted-foreground">
                    {r + 1}
                  </td>
                  {row.map((cell, c) => (
                    <td key={c} className="px-2 py-1">
                      <input
                        value={cell}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        inputMode="decimal"
                        className="w-24 rounded-md border border-border/60 bg-background/60 px-2 py-1 font-serif italic text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() => removeRow(r)}
                      disabled={grid.length <= 3}
                      className="rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-30"
                      aria-label={`Remove row ${r + 1}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-2">
          <PrimaryButton onClick={onCalc}>Run regression</PrimaryButton>
          <button
            type="button"
            onClick={() => {
              setGrid(makeInitialGrid());
              setRes(null);
              setErr(null);
            }}
            className="rounded-full border border-border/60 bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40"
          >
            Reset
          </button>
        </div>

        {err && <ErrorBox message={err} />}

        {res && (
          <div ref={resultRef} className="mt-2">
            <ResultBox
              label="Fitted equation"
              value={<span className="font-serif italic">{eqString}</span>}
              note={
                <>
                  R² = <b>{fmt(res.r2, 4)}</b> · Adjusted R² ={" "}
                  <b>{fmt(res.adjR2, 4)}</b> · F({res.dfModel},{" "}
                  {res.dfResid}) = {fmt(res.fStat, 3)}, p = {fmtP(res.fP)}
                </>
              }
            />

            <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary/40 text-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">
                      Coefficient
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Estimate
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Std. error
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      t-stat
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      p-value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {res.coefs.map((c) => (
                    <tr key={c.name} className="odd:bg-background/40">
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2 text-right font-serif italic tabular-nums">
                        {fmt(c.b, 4)}
                      </td>
                      <td className="px-3 py-2 text-right font-serif italic tabular-nums">
                        {fmt(c.se, 4)}
                      </td>
                      <td className="px-3 py-2 text-right font-serif italic tabular-nums">
                        {fmt(c.t, 3)}
                      </td>
                      <td className="px-3 py-2 text-right font-serif italic tabular-nums">
                        {fmtP(c.p)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <CoefBarChart items={res.stdCoefs} />
              <ResidualsPlot yhat={res.yhat} resid={res.resid} />
            </div>

            <StepsToggle steps={steps} />
          </div>
        )}
      </section>
    </MathCalcPage>
  );
}
