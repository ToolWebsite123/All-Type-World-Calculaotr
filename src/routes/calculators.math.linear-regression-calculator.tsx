import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  PrimaryButton,
  TextInput,
  ErrorBox,
  CalcSection,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  ResultBox,
  GuideCards,
  type GuideCardItem,
  FormulaBlock,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { type Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import { parseDataset } from "@/lib/math/parse-numbers";

/** Centered display-math line used inside solution steps. */
function MathLine({ children }: { children: import("react").ReactNode }) {
  return (
    <div className="my-1 flex items-center justify-center text-center font-serif text-[15px] italic text-foreground">
      <span className="inline-flex items-center gap-1">{children}</span>
    </div>
  );
}

/** Small left-aligned note between math lines. */
function MathNote({ children }: { children: import("react").ReactNode }) {
  return (
    <div className="mt-2 mb-1 text-sm not-italic text-muted-foreground">
      {children}
    </div>
  );
}

export const Route = createFileRoute("/calculators/math/linear-regression-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Linear Regression Calculator",
      title: "Linear Regression Calculator — y = a + bx",
      metaDescription:
        "Fit a simple linear regression with slope, intercept, r, R², SE, and residuals from paired data.",
      canonicalUrl: "/calculators/math/linear-regression-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Linear Regression Calculator", path: "/calculators/math/linear-regression-calculator" },
      ],
      faqs: [
        {
          q: "What's the difference between correlation and regression?",
          a: "Correlation (r) is a single symmetric number that measures how tightly two variables move together — swapping X and Y gives the same r. Regression fits a directional line that predicts Y from X; swap the roles and the slope changes. Correlation summarises the relationship; regression models it.",
        },
        {
          q: "What does a negative slope mean?",
          a: "A negative slope (m < 0) means Y decreases as X increases. Every one-unit rise in X lowers the predicted Y by |m| units. The line simply tilts downward from left to right.",
        },
        {
          q: "Is a higher R² always a better model?",
          a: "No. R² can be inflated by too few data points, by overfitting, or by outliers. An R² of 1.00 on three points is meaningless. Always look at the scatter plot and sample size, and check whether the pattern is genuinely linear.",
        },
        {
          q: "What is R² exactly?",
          a: "R² is the coefficient of determination — the proportion of the variance in Y that the regression line explains. R² = 0.82 means the line accounts for 82% of the variation in Y; the remaining 18% is scatter around the line.",
        },
      ],
    }),
  component: LinearRegressionPage,
});

/* ---------------- Math ---------------- */

interface RegResult {
  n: number;
  xs: number[];
  ys: number[];
  sumX: number;
  sumY: number;
  sumXY: number;
  sumX2: number;
  sumY2: number;
  meanX: number;
  meanY: number;
  slope: number;
  intercept: number;
  r: number;
  r2: number;
  sse: number;
  sst: number;
  prediction?: { x: number; y: number };
}

function computeRegression(
  xs: number[],
  ys: number[],
  predictX?: number,
): RegResult | { error: string } {
  const n = xs.length;
  if (n < 2) return { error: "Need at least 2 paired observations." };
  const sumX = xs.reduce((s, v) => s + v, 0);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const sumXY = xs.reduce((s, v, i) => s + v * ys[i], 0);
  const sumX2 = xs.reduce((s, v) => s + v * v, 0);
  const sumY2 = ys.reduce((s, v) => s + v * v, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) {
    return {
      error:
        "Regression is undefined — every X value is identical, so there is no line to fit through the points.",
    };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const sst = ys.reduce((s, v) => s + (v - meanY) ** 2, 0);
  const sse = ys.reduce((s, v, i) => s + (v - (slope * xs[i] + intercept)) ** 2, 0);
  const r2 = sst === 0 ? 1 : Math.max(0, 1 - sse / sst);
  // r keeps the sign of the slope
  const r = Math.sign(slope) * Math.sqrt(r2);
  const prediction =
    predictX !== undefined && Number.isFinite(predictX)
      ? { x: predictX, y: slope * predictX + intercept }
      : undefined;
  return {
    n, xs, ys, sumX, sumY, sumXY, sumX2, sumY2,
    meanX, meanY, slope, intercept, r, r2, sse, sst, prediction,
  };
}

function fmt(n: number, dp = 4): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) return n.toExponential(3);
  return parseFloat(n.toFixed(dp)).toString();
}

function equationText(slope: number, intercept: number): string {
  const s = fmt(slope);
  const b = fmt(Math.abs(intercept));
  const sign = intercept >= 0 ? "+" : "−";
  return `y = ${s}·x ${sign} ${b}`;
}

/* ---------------- Scatter plot with line + prediction ---------------- */

function RegressionPlot({
  xs,
  ys,
  slope,
  intercept,
  prediction,
}: {
  xs: number[];
  ys: number[];
  slope: number;
  intercept: number;
  prediction?: { x: number; y: number };
}) {
  const width = 640;
  const height = 360;
  const padL = 48;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const iw = width - padL - padR;
  const ih = height - padT - padB;

  const allX = prediction ? [...xs, prediction.x] : xs;
  const allY = prediction ? [...ys, prediction.y] : ys;
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  const xPad = (xMax - xMin) * 0.08 || 1;
  const yPad = (yMax - yMin) * 0.08 || 1;
  const xLo = xMin - xPad;
  const xHi = xMax + xPad;
  const yLo = yMin - yPad;
  const yHi = yMax + yPad;

  const xTo = (v: number) => padL + ((v - xLo) / (xHi - xLo)) * iw;
  const yTo = (v: number) => padT + ih - ((v - yLo) / (yHi - yLo)) * ih;

  const lineY1 = slope * xLo + intercept;
  const lineY2 = slope * xHi + intercept;

  const ticks = 4;
  const xTicks = Array.from({ length: ticks + 1 }, (_, i) => xLo + ((xHi - xLo) * i) / ticks);
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yLo + ((yHi - yLo) * i) / ticks);

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Scatter plot of paired X and Y values with least-squares regression line"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
      >
        {yTicks.map((t, i) => {
          const y = yTo(t);
          return (
            <g key={`y${i}`}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} opacity={0.4} />
              <text x={padL - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--color-muted-foreground)">
                {fmt(Number(t.toFixed(2)), 2)}
              </text>
            </g>
          );
        })}
        {xTicks.map((t, i) => {
          const x = xTo(t);
          return (
            <g key={`x${i}`}>
              <line x1={x} x2={x} y1={padT} y2={height - padB} stroke="var(--color-border)" strokeWidth={1} opacity={0.4} />
              <text x={x} y={height - padB + 14} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">
                {fmt(Number(t.toFixed(2)), 2)}
              </text>
            </g>
          );
        })}

        <line x1={padL} x2={width - padR} y1={height - padB} y2={height - padB} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />
        <line x1={padL} x2={padL} y1={padT} y2={height - padB} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />

        {/* Residuals — thin dashed vertical lines from each point to the fitted line */}
        {xs.map((x, i) => {
          const yHat = slope * x + intercept;
          return (
            <line
              key={`res${i}`}
              x1={xTo(x)}
              x2={xTo(x)}
              y1={yTo(ys[i])}
              y2={yTo(yHat)}
              stroke="var(--color-muted-foreground)"
              strokeWidth={1}
              strokeDasharray="2 3"
              opacity={0.55}
            />
          );
        })}

        {/* Regression line */}
        <line
          x1={xTo(xLo)}
          y1={yTo(lineY1)}
          x2={xTo(xHi)}
          y2={yTo(lineY2)}
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          opacity={0.95}
        />

        {/* Data points */}
        {xs.map((x, i) => (
          <circle
            key={i}
            cx={xTo(x)}
            cy={yTo(ys[i])}
            r={4}
            fill="var(--color-primary)"
            stroke="var(--color-background)"
            strokeWidth={1.5}
          />
        ))}

        {/* Prediction marker */}
        {prediction && (
          <g>
            <line
              x1={xTo(prediction.x)}
              x2={xTo(prediction.x)}
              y1={yTo(prediction.y)}
              y2={height - padB}
              stroke="var(--color-destructive, #ef4444)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.85}
            />
            <line
              x1={padL}
              x2={xTo(prediction.x)}
              y1={yTo(prediction.y)}
              y2={yTo(prediction.y)}
              stroke="var(--color-destructive, #ef4444)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.85}
            />
            <circle
              cx={xTo(prediction.x)}
              cy={yTo(prediction.y)}
              r={6}
              fill="var(--color-destructive, #ef4444)"
              stroke="var(--color-background)"
              strokeWidth={2}
            />
            <text
              x={xTo(prediction.x) + 10}
              y={yTo(prediction.y) - 8}
              fontSize={11}
              fill="var(--color-destructive, #ef4444)"
              fontWeight={600}
            >
              ({fmt(prediction.x, 2)}, {fmt(prediction.y, 2)})
            </text>
          </g>
        )}

        <text x={padL + iw / 2} y={height - 4} textAnchor="middle" fontSize={11} fill="var(--color-muted-foreground)">X</text>
        <text
          x={12}
          y={padT + ih / 2}
          textAnchor="middle"
          fontSize={11}
          fill="var(--color-muted-foreground)"
          transform={`rotate(-90 12 ${padT + ih / 2})`}
        >
          Y
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Guide cards ---------------- */

const LR_GUIDE: GuideCardItem[] = [
  {
    key: "line",
    title: "1. The best-fit line y = m·x + b",
    explain: "Linear regression finds a single straight line through your scatter. Once you have the slope m and intercept b, you can describe how Y changes with X and predict Y for any x — even values you never observed.",
    formula: <>ŷ = m·x + b</>,
    legend: [
      { sym: "m", def: "slope — change in Y per +1 in X" },
      { sym: "b", def: "intercept — predicted Y when x = 0" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 140" className="w-full max-w-[220px]" aria-hidden>
          <line x1="20" y1="120" x2="200" y2="120" className="stroke-border" />
          <line x1="20" y1="20" x2="20" y2="120" className="stroke-border" />
          {[[40,110],[70,95],[100,80],[130,70],[160,50],[185,35]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r={3} className="fill-primary" />))}
          <line x1="25" y1="115" x2="195" y2="30" className="stroke-primary" strokeWidth={2} />
          <text x="100" y="18" fontSize="10" textAnchor="middle" className="fill-primary">ŷ = m·x + b</text>
        </svg>
      </div>
    ),
    example: {
      given: "study hours vs exam score",
      substitute: "m = 5.8, b = 46.6",
      answer: "ŷ = 5.8·x + 46.6",
    },
  },
  {
    key: "leastsq",
    title: "2. The least-squares idea",
    explain: "For every point measure the vertical gap between the observed y and the line — the residual (y − ŷ). Square each gap (so signs don't cancel and big misses are punished). The least-squares line is the unique line that minimises Σ(y − ŷ)².",
    formula: <>minimise SSE = Σ(yᵢ − ŷᵢ)²</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 140" className="w-full max-w-[220px]" aria-hidden>
          <line x1="20" y1="120" x2="200" y2="120" className="stroke-border" />
          <line x1="20" y1="20" x2="20" y2="120" className="stroke-border" />
          <line x1="25" y1="110" x2="195" y2="35" className="stroke-primary" strokeWidth={1.8} />
          {[[50,95,80],[95,60,72],[140,80,52],[175,30,45]].map(([x,y,yl],i)=>(
            <g key={i}>
              <line x1={x} x2={x} y1={y} y2={yl} className="stroke-muted-foreground" strokeDasharray="2 3" />
              <circle cx={x} cy={y} r={3.2} className="fill-primary" />
            </g>
          ))}
          <text x="110" y="18" fontSize="10" textAnchor="middle" className="fill-muted-foreground">dashed = residuals</text>
        </svg>
      </div>
    ),
    example: {
      given: "residuals = −2, +3, +1, −4",
      substitute: "SSE = 4 + 9 + 1 + 16 = 30",
      answer: "line that makes SSE smallest is the fit",
    },
  },
  {
    key: "formula",
    title: "3. Slope and intercept formulas",
    explain: "Solving the least-squares problem in closed form gives compact formulas in terms of Σx, Σy, Σxy and Σx². The intercept is chosen so the fitted line passes through the point of means (x̄, ȳ).",
    formula: <>m = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²) &nbsp;·&nbsp; b = ȳ − m·x̄</>,
    legend: [
      { sym: "n", def: "number of paired points" },
      { sym: "Σ", def: "sum over all points" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-[11px]">
        <div className="w-full space-y-1 font-serif italic">
          <div>n = 5   Σx = 15   Σy = 320</div>
          <div>Σxy = 1018   Σx² = 55</div>
          <div className="pt-1 text-primary">m = (5·1018 − 15·320) / (5·55 − 15²)</div>
          <div className="text-primary">  = 290 / 50 = 5.8</div>
          <div className="text-primary">b = (320 − 5.8·15) / 5 = 46.6</div>
        </div>
      </div>
    ),
    example: {
      given: "n = 5, Σx = 15, Σy = 320, Σxy = 1018, Σx² = 55",
      substitute: "m = 290/50 · b = (320 − 87)/5",
      answer: "m = 5.8, b = 46.6",
    },
  },
  {
    key: "r2",
    title: "4. What R² tells you",
    explain: "R² is the share of Y's total variance the line explains, from 0 to 1. R² = 0.82 means the line accounts for 82% of the scatter; the remaining 18% is noise. Higher isn't always better — R² = 1.00 on three points is a straight-line-through-three-points, not a great model.",
    formula: <>R² = 1 − SS_res / SS_tot &nbsp;·&nbsp; r = sign(m)·√R²</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 130" className="w-full max-w-[220px]" aria-hidden>
          {[
            { x: 20, r2: 0.95, lbl: "R² = 0.95" },
            { x: 95, r2: 0.70, lbl: "R² = 0.70" },
            { x: 170, r2: 0.20, lbl: "R² = 0.20" },
          ].map((g, i) => {
            const pts: [number, number][] = [];
            const scatter = (1 - g.r2) * 34;
            for (let k = 0; k < 7; k++) {
              const t = k / 6;
              const cx = g.x + t * 45;
              const cy = 100 - t * 60 + Math.sin(k * 1.8 + i) * scatter;
              pts.push([cx, cy]);
            }
            return (
              <g key={i}>
                <line x1={g.x} y1={100} x2={g.x + 45} y2={40} className="stroke-primary" strokeDasharray="3 3" />
                {pts.map(([x, y], k) => (<circle key={k} cx={x} cy={y} r={2.2} className="fill-primary" />))}
                <text x={g.x + 22} y={122} fontSize={9} textAnchor="middle" className="fill-muted-foreground font-serif italic">{g.lbl}</text>
              </g>
            );
          })}
        </svg>
      </div>
    ),
    example: {
      given: "SS_tot = 400, SS_res = 72",
      substitute: "R² = 1 − 72/400",
      answer: "R² = 0.82 (82% of variance explained)",
    },
  },
  {
    key: "predict",
    title: "5. Predicting Y at a new X",
    explain: "Once you have m and b, plugging in any x gives the fitted value ŷ. Predictions inside the range of your observed X are usually reliable; predictions far outside that range (extrapolation) are guesses — the relationship may not hold there.",
    formula: <>ŷ = m·x + b</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 140" className="w-full max-w-[220px]" aria-hidden>
          <line x1="20" y1="120" x2="200" y2="120" className="stroke-border" />
          <line x1="20" y1="20" x2="20" y2="120" className="stroke-border" />
          <line x1="25" y1="115" x2="195" y2="30" className="stroke-primary" strokeWidth={1.8} />
          {[[40,108],[70,92],[100,78],[130,66],[155,52]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r={2.6} className="fill-primary" />))}
          <line x1="180" y1="120" x2="180" y2="40" className="stroke-destructive" strokeDasharray="4 3" />
          <line x1="20" y1="40" x2="180" y2="40" className="stroke-destructive" strokeDasharray="4 3" />
          <circle cx="180" cy="40" r={4} className="fill-destructive" />
          <text x="180" y="132" fontSize="9" textAnchor="middle" className="fill-destructive">new x</text>
          <text x="12" y="40" fontSize="9" textAnchor="end" className="fill-destructive">ŷ</text>
        </svg>
      </div>
    ),
    example: {
      given: "ŷ = 5.8·x + 46.6, predict at x = 6",
      substitute: "5.8·6 + 46.6",
      answer: "ŷ = 81.4",
    },
  },
];

/* ---------------- Page ---------------- */

function LinearRegressionPage() {
  const [xInput, setXInput] = useState("1, 2, 3, 4, 5, 6, 7, 8");
  const [yInput, setYInput] = useState("2, 3, 5, 4, 6, 8, 7, 9");
  const [predictInput, setPredictInput] = useState("9");
  const [result, setResult] = useState<RegResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    setNotice(null);
    const px = parseDataset(xInput);
    const py = parseDataset(yInput);
    if (px.invalid.length) return setErr(`X list — "${px.invalid[0]}" is not a valid number.`);
    if (py.invalid.length) return setErr(`Y list — "${py.invalid[0]}" is not a valid number.`);
    if (px.values.length === 0 || py.values.length === 0)
      return setErr("Enter numbers in both X and Y lists.");
    if (px.values.length !== py.values.length)
      return setErr(
        `X and Y must have the same number of values — got ${px.values.length} X and ${py.values.length} Y.`,
      );
    let predictX: number | undefined;
    const trimmed = predictInput.trim();
    if (trimmed !== "") {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) return setErr(`Prediction X "${trimmed}" is not a valid number.`);
      predictX = n;
    }
    const res = computeRegression(px.values, py.values, predictX);
    if ("error" in res) return setErr(res.error);
    setResult(res);
    const cleaned = px.cleaned + py.cleaned;
    if (cleaned > 0) {
      setNotice(
        `Cleaned ${cleaned} value${cleaned === 1 ? "" : "s"} — stripped currency symbols, thousand separators or stray punctuation.`,
      );
    }
  };

  const clear = () => {
    setXInput("");
    setYInput("");
    setPredictInput("");
    setResult(null);
    setErr(null);
    setNotice(null);
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const sxy = result.sumXY - result.n * result.meanX * result.meanY;
    const sxx = result.sumX2 - result.n * result.meanX * result.meanX;
    return [
      {
        title: "Mean of X and mean of Y",
        body: (
          <>
            <MathNote>Average each column — the fitted line always passes through (x̄, ȳ)</MathNote>
            <MathLine>x̄ = Σx / n = {fmt(result.sumX)} / {result.n}</MathLine>
            <MathLine>x̄ = {fmt(result.meanX)}</MathLine>
            <MathLine>ȳ = Σy / n = {fmt(result.sumY)} / {result.n}</MathLine>
            <MathLine>ȳ = {fmt(result.meanY)}</MathLine>
          </>
        ),
      },
      {
        title: "Sum of cross deviations Σ(x−x̄)(y−ȳ)",
        body: (
          <>
            <MathNote>Measures how X and Y move together — same sign as the slope</MathNote>
            <MathLine>Σ(x−x̄)(y−ȳ) = Σxy − n·x̄·ȳ</MathLine>
            <MathLine>Σ(x−x̄)(y−ȳ) = {fmt(result.sumXY)} − {result.n}·{fmt(result.meanX)}·{fmt(result.meanY)}</MathLine>
            <MathLine>Σ(x−x̄)(y−ȳ) = {fmt(sxy)}</MathLine>
          </>
        ),
      },
      {
        title: "Sum of squared deviations Σ(x−x̄)²",
        body: (
          <>
            <MathNote>Measures how spread out X is — the denominator of the slope</MathNote>
            <MathLine>Σ(x−x̄)² = Σx² − n·x̄²</MathLine>
            <MathLine>Σ(x−x̄)² = {fmt(result.sumX2)} − {result.n}·{fmt(result.meanX)}²</MathLine>
            <MathLine>Σ(x−x̄)² = {fmt(sxx)}</MathLine>
          </>
        ),
      },
      {
        title: "Slope m",
        body: (
          <>
            <MathNote>Slope = cross deviation over X's own spread</MathNote>
            <MathLine>m = Σ(x−x̄)(y−ȳ) / Σ(x−x̄)²</MathLine>
            <MathLine>m = {fmt(sxy)} / {fmt(sxx)}</MathLine>
            <MathLine>m = {fmt(result.slope)}</MathLine>
          </>
        ),
      },
      {
        title: "Intercept b",
        body: (
          <>
            <MathNote>The line must pass through the point of means (x̄, ȳ)</MathNote>
            <MathLine>b = ȳ − m·x̄</MathLine>
            <MathLine>b = {fmt(result.meanY)} − {fmt(result.slope)}·{fmt(result.meanX)}</MathLine>
            <MathLine>b = {fmt(result.intercept)}</MathLine>
          </>
        ),
      },
      {
        title: "Fitted equation",
        body: (
          <>
            <MathNote>Plug m and b into y = m·x + b</MathNote>
            <MathLine>y = {fmt(result.slope)}·x {result.intercept >= 0 ? "+" : "−"} {fmt(Math.abs(result.intercept))}</MathLine>
          </>
        ),
      },
      {
        title: "Correlation r and R²",
        body: (
          <>
            <MathNote>R² is the share of Y's variance the line explains; r keeps the slope's sign</MathNote>
            <MathLine>SS_tot = Σ(y−ȳ)² = {fmt(result.sst)}</MathLine>
            <MathLine>SS_res = Σ(y−ŷ)² = {fmt(result.sse)}</MathLine>
            <MathLine>R² = 1 − SS_res / SS_tot = 1 − {fmt(result.sse)} / {fmt(result.sst)}</MathLine>
            <MathLine>R² = {fmt(result.r2)}</MathLine>
            <MathLine>r = sign(m)·√R² = {fmt(result.r)}</MathLine>
          </>
        ),
      },
      ...(result.prediction
        ? [
            {
              title: `Predict Y at x = ${fmt(result.prediction.x)}`,
              body: (
                <>
                  <MathNote>Substitute x into the fitted equation</MathNote>
                  <MathLine>ŷ = m·x + b = {fmt(result.slope)}·{fmt(result.prediction.x)} + {fmt(result.intercept)}</MathLine>
                  <MathLine>ŷ = {fmt(result.prediction.y)}</MathLine>
                </>
              ),
            } as Step,
          ]
        : []),
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    const lines = [
      `Linear regression: ${equationText(result.slope, result.intercept)}`,
      `Slope m = ${fmt(result.slope)}`,
      `Intercept b = ${fmt(result.intercept)}`,
      `Correlation r = ${fmt(result.r)}`,
      `R² = ${fmt(result.r2)}`,
      `n = ${result.n}`,
      `Σx=${fmt(result.sumX)}, Σy=${fmt(result.sumY)}, Σxy=${fmt(result.sumXY)}, Σx²=${fmt(result.sumX2)}`,
    ];
    if (result.prediction) {
      lines.push(`Prediction at x=${fmt(result.prediction.x)}: ŷ = ${fmt(result.prediction.y)}`);
    }
    return lines.join("\n");
  }, [result]);

  return (
    <MathCalcPage
      name="Linear Regression Calculator"
      tagline="Fit the least-squares regression line y = mx + b to paired data. Get the slope, intercept, correlation r, R², a scatter plot with the fitted line and predictions for any X."
      extras={
        <>
          <CalcSection title="Linear regression explained, step by step">
            <p className="text-sm text-muted-foreground">
              Each concept has a plain-English definition, the exact formula this calculator uses, a small diagram and a worked example — all in one card so the maths lines up with the visual.
            </p>
            <GuideCards items={LR_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Least-squares slope m and intercept b of the best-fit line y = mx + b",
                "Correlation coefficient r and coefficient of determination R²",
                "Optional prediction: enter any X and get the fitted ŷ on the line",
                "Scatter plot with the regression line, thin dashed residuals, and the prediction point marked",
                "Step-by-step working — Σx, Σy, Σxy, Σx², slope substitution, intercept, R²",
                "Handles negative numbers, decimals, and messy pasted data (currency, thousand separators)",
                "Copy the result summary or download the whole panel — plot and steps — as an image",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What's the difference between correlation and regression?", a: <p>Correlation summarises how tightly X and Y move together with one symmetric number (r). Regression fits a directional line to predict Y from X — swap the axes and you get a different slope.</p> },
                { q: "What does a negative slope mean?", a: <p>Y decreases as X increases. Each one-unit rise in X lowers the predicted Y by |m| units and the line tilts downward.</p> },
                { q: "Can R² be negative?", a: <p>For the standard least-squares line on your training data, no — R² is between 0 and 1. Negative R² only appears when you apply a model to a different dataset or force a line through the origin.</p> },
                { q: "How many data points do I need?", a: <p>Two points are enough to draw a line, but the fit is meaningless. Aim for at least 8–10 points, more if the data is noisy.</p> },
                { q: "Should the intercept always make physical sense?", a: <p>Not always. If X = 0 lies outside the range you sampled, the intercept is a mathematical anchor for the line, not a real-world prediction.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/correlation-calculator", label: "Correlation Coefficient Calculator" },
                { to: "/calculators/math/slope-intercept-calculator", label: "Slope-Intercept Form Calculator" },
                { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="X values (comma or space separated)" htmlFor="xdata" hint="e.g. 1, 2, 3, 4, 5, 6, 7, 8">
            <textarea
              id="xdata"
              value={xInput}
              onChange={(e) => setXInput(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="1, 2, 3, 4, 5, 6, 7, 8"
            />
          </Field>
          <Field label="Y values (paired with X, same count)" htmlFor="ydata" hint="e.g. 2, 3, 5, 4, 6, 8, 7, 9">
            <textarea
              id="ydata"
              value={yInput}
              onChange={(e) => setYInput(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="2, 3, 5, 4, 6, 8, 7, 9"
            />
          </Field>
        </div>
        <Field label="Predict Y at X (optional)" htmlFor="predx" hint="Leave blank to skip. The line will still be drawn.">
          <TextInput
            id="predx"
            value={predictInput}
            onChange={(e) => setPredictInput(e.target.value)}
            placeholder="e.g. 9"
            inputMode="decimal"
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center justify-center rounded-full border border-border bg-secondary/40 px-5 py-2.5 text-sm font-semibold text-foreground hover:border-primary/40"
          >
            Clear
          </button>
        </div>
      </div>

      {err && <ErrorBox message={err} />}
      {notice && (
        <div className="mt-2 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
          {notice}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <ResultActions
            filename="linear-regression-result"
            captureRef={resultRef}
            getCopyText={() => summary}
          />
          <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Regression line"
              value={equationText(result.slope, result.intercept)}
              note={
                <>
                  <div>slope m = {fmt(result.slope)} · intercept b = {fmt(result.intercept)}</div>
                  <div className="mt-1 text-xs">
                    r = {fmt(result.r)} · R² = {fmt(result.r2)} · n = {result.n}
                  </div>
                </>
              }
            />

            {result.prediction && (
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Prediction
                </div>
                <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                  At x = {fmt(result.prediction.x)}, ŷ = {fmt(result.prediction.y)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Beware of predictions far outside the range of your input X values.
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-2 text-sm font-semibold text-foreground">
                Scatter plot with regression line{result.prediction ? " and prediction" : ""}
              </div>
              <RegressionPlot
                xs={result.xs}
                ys={result.ys}
                slope={result.slope}
                intercept={result.intercept}
                prediction={result.prediction}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                Solid line: least-squares fit. Thin dashed segments: residuals (vertical gaps the line minimises). Red marker: your prediction, if given.
              </div>
            </div>

            <StepsToggle steps={steps} />
          </div>
        </div>
      )}
    </MathCalcPage>
  );
}
