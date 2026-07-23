import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  PrimaryButton,
  ErrorBox,
  CalcSection,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  ResultBox,
  GuideCards,
  FormulaBlock,
  FormulaWithLegend,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import { parseDataset } from "@/lib/math/parse-numbers";
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

export const Route = createFileRoute("/calculators/math/covariance-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Covariance Calculator",
      title: "Covariance Calculator — Sample & Population",
      metaDescription:
        "Compute sample or population covariance from paired data with a per-pair table, scatter plot, and full steps.",
      canonicalUrl: "/calculators/math/covariance-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Covariance Calculator", path: "/calculators/math/covariance-calculator" },
      ],
      faqs: [
        {
          q: "What's the difference between sample and population covariance?",
          a: "Population covariance divides the sum of paired deviations by N — use it when your data is the entire population. Sample covariance divides by N−1 (Bessel's correction) and is the right choice when your data is a sample from a larger population, which is by far the more common case in practice.",
        },
        {
          q: "Why is covariance so hard to interpret on its own?",
          a: "Covariance carries the units of X times the units of Y — kilograms·dollars, meters·seconds, etc. That means the raw number depends entirely on the scale of your variables: rescaling X from meters to millimeters multiplies covariance by 1000 without changing the underlying relationship. Use the sign for direction and the correlation coefficient r for strength.",
        },
        {
          q: "Can covariance be zero when the variables are related?",
          a: "Yes. Covariance only measures linear co-movement. A perfectly symmetric non-linear relationship (like Y = X² around 0) can have covariance ≈ 0 even though X and Y are tightly related — the positive and negative products cancel out.",
        },
        {
          q: "How is covariance related to correlation?",
          a: "Correlation is covariance standardized: r = cov(X,Y) / (σ_X · σ_Y). Dividing by the two standard deviations strips out the units and forces the result into −1 to +1, so correlations from different variable pairs can be compared directly. Covariance can't.",
        },
      ],
    }),
  component: CovariancePage,
});

/* ---------------- Math ---------------- */

type Mode = "sample" | "population";

interface CovResult {
  n: number;
  xs: number[];
  ys: number[];
  meanX: number;
  meanY: number;
  dxs: number[];
  dys: number[];
  products: number[];
  dx2: number[];
  dy2: number[];
  sumProducts: number;
  sumDx2: number;
  sumDy2: number;
  divisor: number;
  cov: number;
  sdX: number;
  sdY: number;
  r: number;
  mode: Mode;
}

function computeCovariance(xs: number[], ys: number[], mode: Mode): CovResult | { error: string } {
  const n = xs.length;
  if (n < 2) return { error: "Need at least 2 paired observations." };
  if (mode === "sample" && n < 2)
    return { error: "Sample covariance needs at least 2 paired observations." };
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  const dxs = xs.map((v) => v - meanX);
  const dys = ys.map((v) => v - meanY);
  const products = dxs.map((d, i) => d * dys[i]);
  const dx2 = dxs.map((d) => d * d);
  const dy2 = dys.map((d) => d * d);
  const sumProducts = products.reduce((s, v) => s + v, 0);
  const sumDx2 = dx2.reduce((s, v) => s + v, 0);
  const sumDy2 = dy2.reduce((s, v) => s + v, 0);
  const divisor = mode === "sample" ? n - 1 : n;
  const cov = sumProducts / divisor;
  const sdX = Math.sqrt(sumDx2 / divisor);
  const sdY = Math.sqrt(sumDy2 / divisor);
  const r =
    sumDx2 === 0 || sumDy2 === 0 ? NaN : sumProducts / Math.sqrt(sumDx2 * sumDy2);
  return {
    n, xs, ys, meanX, meanY, dxs, dys, products, dx2, dy2,
    sumProducts, sumDx2, sumDy2, divisor, cov, sdX, sdY, r, mode,
  };
}

function interpretCov(cov: number, r: number): { label: string } {
  if (!Number.isFinite(r) || Math.abs(cov) < 1e-12) {
    return { label: "No linear co-movement" };
  }
  const dir = cov > 0 ? "positive" : "negative";
  const a = Math.abs(r);
  let strength: string;
  if (a >= 0.9) strength = "very strong";
  else if (a >= 0.7) strength = "strong";
  else if (a >= 0.5) strength = "moderate";
  else if (a >= 0.3) strength = "weak";
  else strength = "very weak";
  return { label: `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${dir} covariance` };
}

function fmt(n: number, dp = 4): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) return n.toExponential(3);
  return parseFloat(n.toFixed(dp)).toString();
}

/* ---------------- Scatter plot with quadrant shading ---------------- */

function QuadrantScatter({
  xs,
  ys,
  meanX,
  meanY,
}: {
  xs: number[];
  ys: number[];
  meanX: number;
  meanY: number;
}) {
  const width = 640;
  const height = 360;
  const padL = 48;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const iw = width - padL - padR;
  const ih = height - padT - padB;

  const xMin = Math.min(...xs, meanX);
  const xMax = Math.max(...xs, meanX);
  const yMin = Math.min(...ys, meanY);
  const yMax = Math.max(...ys, meanY);
  const xPad = (xMax - xMin) * 0.1 || 1;
  const yPad = (yMax - yMin) * 0.1 || 1;
  const xLo = xMin - xPad;
  const xHi = xMax + xPad;
  const yLo = yMin - yPad;
  const yHi = yMax + yPad;

  const xTo = (v: number) => padL + ((v - xLo) / (xHi - xLo)) * iw;
  const yTo = (v: number) => padT + ih - ((v - yLo) / (yHi - yLo)) * ih;

  const cx = xTo(meanX);
  const cy = yTo(meanY);

  const ticks = 4;
  const xTicks = Array.from({ length: ticks + 1 }, (_, i) => xLo + ((xHi - xLo) * i) / ticks);
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yLo + ((yHi - yLo) * i) / ticks);

  // colors: positive-contribution quadrants (top-right + bottom-left) green tint;
  // negative-contribution quadrants (top-left + bottom-right) red tint.
  const posFill = "rgba(34, 197, 94, 0.10)";
  const negFill = "rgba(239, 68, 68, 0.10)";

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Scatter plot of paired X and Y values with quadrants shaded around the means"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
      >
        {/* Quadrant fills (based on means) */}
        {/* top-right: x>mean, y>mean → positive product */}
        <rect x={cx} y={padT} width={width - padR - cx} height={cy - padT} fill={posFill} />
        {/* bottom-left: x<mean, y<mean → positive product */}
        <rect x={padL} y={cy} width={cx - padL} height={height - padB - cy} fill={posFill} />
        {/* top-left: x<mean, y>mean → negative product */}
        <rect x={padL} y={padT} width={cx - padL} height={cy - padT} fill={negFill} />
        {/* bottom-right: x>mean, y<mean → negative product */}
        <rect x={cx} y={cy} width={width - padR - cx} height={height - padB - cy} fill={negFill} />

        {/* Grid */}
        {yTicks.map((t, i) => {
          const y = yTo(t);
          return (
            <g key={`y${i}`}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} opacity={0.35} />
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
              <line x1={x} x2={x} y1={padT} y2={height - padB} stroke="var(--color-border)" strokeWidth={1} opacity={0.35} />
              <text x={x} y={height - padB + 14} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">
                {fmt(Number(t.toFixed(2)), 2)}
              </text>
            </g>
          );
        })}

        {/* Mean lines */}
        <line x1={cx} x2={cx} y1={padT} y2={height - padB} stroke="var(--color-primary)" strokeWidth={1.5} opacity={0.7} strokeDasharray="4 4" />
        <line x1={padL} x2={width - padR} y1={cy} y2={cy} stroke="var(--color-primary)" strokeWidth={1.5} opacity={0.7} strokeDasharray="4 4" />
        <text x={cx + 4} y={padT + 12} fontSize={10} fill="var(--color-primary)">x̄ = {fmt(meanX)}</text>
        <text x={padL + 4} y={cy - 4} fontSize={10} fill="var(--color-primary)">ȳ = {fmt(meanY)}</text>

        {/* Quadrant sign labels */}
        <text x={(cx + (width - padR)) / 2} y={padT + 14} textAnchor="middle" fontSize={11} fill="rgb(21,128,61)" opacity={0.75}>(+)(+) = +</text>
        <text x={(padL + cx) / 2} y={height - padB - 6} textAnchor="middle" fontSize={11} fill="rgb(21,128,61)" opacity={0.75}>(−)(−) = +</text>
        <text x={(padL + cx) / 2} y={padT + 14} textAnchor="middle" fontSize={11} fill="rgb(185,28,28)" opacity={0.75}>(−)(+) = −</text>
        <text x={(cx + (width - padR)) / 2} y={height - padB - 6} textAnchor="middle" fontSize={11} fill="rgb(185,28,28)" opacity={0.75}>(+)(−) = −</text>

        {/* Axes */}
        <line x1={padL} x2={width - padR} y1={height - padB} y2={height - padB} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />
        <line x1={padL} x2={padL} y1={padT} y2={height - padB} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />

        {/* Points colored by quadrant contribution sign */}
        {xs.map((x, i) => {
          const y = ys[i];
          const product = (x - meanX) * (y - meanY);
          const fill = product >= 0 ? "rgb(22,163,74)" : "rgb(220,38,38)";
          return (
            <circle
              key={i}
              cx={xTo(x)}
              cy={yTo(y)}
              r={4.5}
              fill={fill}
              stroke="var(--color-background)"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Axis labels */}
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

const COV_GUIDE: GuideCardItem[] = [
  {
    key: "what",
    title: "1. What covariance measures",
    explain: "For every point compute (xᵢ − x̄)(yᵢ − ȳ). Positive when both deviations share a sign, negative when they don't. Averaging those products gives covariance — a signed number telling you whether X and Y drift together (+), apart (−) or are unrelated (~0).",
    formula: <>cov(X, Y) = mean of (xᵢ − x̄)(yᵢ − ȳ)</>,
    legend: [
      { sym: "x̄, ȳ", def: "means of X and Y" },
      { sym: "Σ", def: "sum over all paired points" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 140" className="w-full max-w-[220px]" aria-hidden>
          <line x1="20" y1="120" x2="200" y2="120" className="stroke-border" />
          <line x1="20" y1="20" x2="20" y2="120" className="stroke-border" />
          <line x1="110" y1="20" x2="110" y2="120" strokeDasharray="4 3" className="stroke-primary" />
          <line x1="20" y1="70" x2="200" y2="70" strokeDasharray="4 3" className="stroke-primary" />
          {[[40,110],[65,95],[95,85],[130,60],[160,45],[185,30]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r={3.2} className="fill-primary" />))}
          <text x="114" y="18" fontSize="9" className="fill-primary">x̄</text>
          <text x="200" y="66" fontSize="9" className="fill-primary">ȳ</text>
        </svg>
      </div>
    ),
    example: {
      given: "X: 2, 4, 6  ·  Y: 20, 24, 33",
      substitute: "mean of paired-deviation products",
      answer: "cov > 0 — X and Y rise together",
    },
  },
  {
    key: "divisor",
    title: "2. Sample (n − 1) vs population (n)",
    explain: "Divide the sum of paired-deviation products by n − 1 for a sample (the usual case; Bessel's correction removes bias) or by n when the data is the entire population. The toggle on the calculator switches which divisor is applied.",
    formula: <>sample: Σ(xᵢ − x̄)(yᵢ − ȳ) / (n − 1)  ·  population: Σ / n</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-primary/60 bg-primary/10 p-3">
            <div className="font-semibold text-primary">Sample</div>
            <div className="mt-1 font-serif italic">÷ (n − 1)</div>
            <div className="mt-1 text-[10px] text-muted-foreground">unbiased estimate</div>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <div className="font-semibold text-foreground">Population</div>
            <div className="mt-1 font-serif italic">÷ n</div>
            <div className="mt-1 text-[10px] text-muted-foreground">true parameter</div>
          </div>
        </div>
      </div>
    ),
    example: {
      given: "n = 5, Σ products = 144",
      substitute: "sample: 144 / 4 · population: 144 / 5",
      answer: "cov = 36 (sample) or 28.8 (population)",
    },
  },
  {
    key: "vsr",
    title: "3. Covariance vs correlation",
    explain: "Covariance carries units of X × Y, so a raw value like 36 is hard to interpret and changes if you rescale a variable. Dividing by σ_X · σ_Y strips units and produces Pearson's r in [−1, +1] — comparable across data sets, which cov cannot be.",
    formula: <>r = cov(X, Y) / (σ_X · σ_Y)</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 120" className="w-full max-w-[220px]" aria-hidden>
          <text x="110" y="22" fontSize="11" textAnchor="middle" className="fill-foreground">cov(X, Y) = 36 (units²)</text>
          <line x1="20" y1="35" x2="200" y2="35" className="stroke-border" />
          <text x="110" y="55" fontSize="11" textAnchor="middle" className="fill-muted-foreground">÷ (σ_X · σ_Y)</text>
          <line x1="20" y1="70" x2="200" y2="70" className="stroke-border" />
          <text x="110" y="90" fontSize="12" textAnchor="middle" className="fill-primary font-semibold">r = 0.995</text>
          <text x="110" y="106" fontSize="9" textAnchor="middle" className="fill-muted-foreground">unitless, bounded −1 … +1</text>
        </svg>
      </div>
    ),
    example: {
      given: "cov = 36, σ_X ≈ 3.16, σ_Y ≈ 11.45",
      substitute: "r = 36 / (3.16 · 11.45)",
      answer: "r ≈ 0.995 — very strong positive",
    },
  },
  {
    key: "quadrants",
    title: "4. Reading the quadrant-shaded plot",
    explain: "The dashed cross on the scatter marks (x̄, ȳ). Top-right and bottom-left (green) contribute positive products; top-left and bottom-right (red) contribute negative ones. Whichever colour dominates gives the sign of covariance. Even a tight non-linear pattern (like y ≈ x²) can produce cov ≈ 0 when the four quadrants balance.",
    formula: <>same-side product = + &nbsp;·&nbsp; opposite-side = −</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 200 140" className="w-full max-w-[200px]" aria-hidden>
          <rect x="100" y="10" width="90" height="60" fill="rgba(34,197,94,0.18)" />
          <rect x="10" y="70" width="90" height="60" fill="rgba(34,197,94,0.18)" />
          <rect x="10" y="10" width="90" height="60" fill="rgba(239,68,68,0.18)" />
          <rect x="100" y="70" width="90" height="60" fill="rgba(239,68,68,0.18)" />
          <line x1="100" y1="10" x2="100" y2="130" className="stroke-primary" strokeDasharray="3 3" />
          <line x1="10" y1="70" x2="190" y2="70" className="stroke-primary" strokeDasharray="3 3" />
          <text x="145" y="45" fontSize="13" textAnchor="middle" fill="rgb(21,128,61)">+</text>
          <text x="55" y="108" fontSize="13" textAnchor="middle" fill="rgb(21,128,61)">+</text>
          <text x="55" y="45" fontSize="13" textAnchor="middle" fill="rgb(185,28,28)">−</text>
          <text x="145" y="108" fontSize="13" textAnchor="middle" fill="rgb(185,28,28)">−</text>
        </svg>
      </div>
    ),
    example: {
      given: "most points sit in the two green quadrants",
      substitute: "positive products dominate",
      answer: "covariance > 0",
    },
  },
];

/* ---------------- Page ---------------- */

function CovariancePage() {
  const [xInput, setXInput] = useState("2.1, 2.5, 3.6, 4.0, 4.5, 5.1");
  const [yInput, setYInput] = useState("8, 10, 12, 15, 16, 20");
  const [mode, setMode] = useState<Mode>("sample");
  const [result, setResult] = useState<CovResult | null>(null);
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
    const res = computeCovariance(px.values, py.values, mode);
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
    setResult(null);
    setErr(null);
    setNotice(null);
  };

  const interpretation = result ? interpretCov(result.cov, result.r) : null;

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const show = Math.min(result.n, 6);
    const symbol = result.mode === "sample" ? "s" : "σ";
    return [
      {
        title: "Compute the means",
        body: (
          <>
            <MathNote>Add each list of values and divide by the count</MathNote>
            <MathLine>x̄ = (Σ xᵢ) / n</MathLine>
            <MathLine>x̄ = {result.xs.slice(0, 10).map(fmt).join(" + ")}{result.n > 10 ? " + …" : ""} / {result.n}</MathLine>
            <MathLine>x̄ = {fmt(result.meanX)}</MathLine>
            <MathLine>ȳ = (Σ yᵢ) / n</MathLine>
            <MathLine>ȳ = {result.ys.slice(0, 10).map(fmt).join(" + ")}{result.n > 10 ? " + …" : ""} / {result.n}</MathLine>
            <MathLine>ȳ = {fmt(result.meanY)}</MathLine>
          </>
        ),
      },
      {
        title: "Per-pair deviation products",
        body: (
          <>
            <MathNote>For each pair, multiply (xᵢ − x̄) by (yᵢ − ȳ)</MathNote>
            {Array.from({ length: show }).map((_, i) => (
              <MathLine key={i}>
                ({fmt(result.dxs[i])})({fmt(result.dys[i])}) = {fmt(result.products[i])}
              </MathLine>
            ))}
            {result.n > show && <MathNote>…{result.n - show} more row(s)</MathNote>}
          </>
        ),
      },
      {
        title: "Sum the products",
        body: (
          <>
            <MathNote>Add every per-pair product together</MathNote>
            <MathLine>Σ(xᵢ − x̄)(yᵢ − ȳ) = {result.products.slice(0, show).map(fmt).join(" + ")}{result.n > show ? " + …" : ""}</MathLine>
            <MathLine>Σ(xᵢ − x̄)(yᵢ − ȳ) = {fmt(result.sumProducts)}</MathLine>
          </>
        ),
      },
      {
        title: "Population covariance",
        body: (
          <>
            <MathNote>Divide the sum of products by N</MathNote>
            <MathLine>cov_pop(X, Y) = Σ(xᵢ − x̄)(yᵢ − ȳ) / N</MathLine>
            <MathLine>cov_pop(X, Y) = {fmt(result.sumProducts)} / {result.n}</MathLine>
            <MathLine>cov_pop(X, Y) = {fmt(result.sumProducts / result.n)}</MathLine>
          </>
        ),
      },
      {
        title: "Sample covariance",
        body: (
          <>
            <MathNote>Divide the sum of products by N − 1 (Bessel's correction)</MathNote>
            <MathLine>cov_sample(X, Y) = Σ(xᵢ − x̄)(yᵢ − ȳ) / (N − 1)</MathLine>
            <MathLine>cov_sample(X, Y) = {fmt(result.sumProducts)} / {result.n - 1}</MathLine>
            <MathLine>cov_sample(X, Y) = {fmt(result.sumProducts / (result.n - 1))}</MathLine>
          </>
        ),
      },
      {
        title: `${result.mode === "sample" ? "Sample" : "Population"} covariance used here`,
        body: (
          <>
            <MathNote>This calculator is set to {result.mode} mode, dividing by {result.mode === "sample" ? "n − 1" : "n"}</MathNote>
            <MathLine>cov(X, Y) = {fmt(result.sumProducts)} / {result.divisor}</MathLine>
            <MathLine>cov(X, Y) = {fmt(result.cov)}</MathLine>
          </>
        ),
      },
      {
        title: "Pearson correlation coefficient r",
        body: (
          <>
            <MathNote>Standardize covariance by the two standard deviations</MathNote>
            <MathLine>{symbol}_X = {fmt(result.sdX)}, &nbsp; {symbol}_Y = {fmt(result.sdY)}</MathLine>
            <MathLine>r = cov(X, Y) / ({symbol}_X · {symbol}_Y)</MathLine>
            <MathLine>r = {fmt(result.cov)} / ({fmt(result.sdX)} · {fmt(result.sdY)})</MathLine>
            <MathLine>r = {fmt(result.r)}</MathLine>
          </>
        ),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result || !interpretation) return "";
    return [
      `${result.mode === "sample" ? "Sample" : "Population"} covariance cov(X, Y) = ${fmt(result.cov)}`,
      `Correlation coefficient r = ${fmt(result.r)}`,
      `Interpretation: ${interpretation.label}`,
      `N = ${result.n}`,
      `Mean X = ${fmt(result.meanX)}, Mean Y = ${fmt(result.meanY)}`,
      `Σ(x−x̄)(y−ȳ) = ${fmt(result.sumProducts)}`,
      `Divisor = ${result.divisor}`,
    ].join("\n");
  }, [result, interpretation]);

  return (
    <MathCalcPage
      name="Covariance Calculator"
      tagline="Enter two paired data sets (X and Y) and get the sample or population covariance, the correlation coefficient r alongside, and a scatter plot with the mean-quadrants shaded to show which points push covariance up or down."
      extras={
        <>
          <CalcSection title="Covariance explained, step by step">
            <p className="text-sm text-muted-foreground">
              Each concept has a plain-English definition, the exact formula this calculator uses, a small diagram and a worked example — all together so the maths ties directly to the visual.
            </p>
            <GuideCards items={COV_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Sample (÷ n − 1) and population (÷ n) modes with a single toggle",
                "Correlation coefficient r reported alongside so you see direction, magnitude and standardized strength in one pass",
                "Quadrant-shaded scatter around (x̄, ȳ) — green pushes cov up, red pulls it down, matching the working",
                "Step-by-step working: means, per-pair (xᵢ − x̄)(yᵢ − ȳ), running sum, and the final division",
                "σ_X and σ_Y shown as an intermediate step so the cov → r conversion is explicit",
                "Handles messy pasted input — currency symbols, thousand separators, tabs and mixed line endings all normalized",
                "Copy the summary or download the entire panel (plot and steps) as an image",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "Sample or population — which should I use?", a: <p>Almost always sample (n − 1). Population (n) is only correct when your data is every member of the group you care about.</p> },
                { q: "Why does the covariance number feel meaningless?", a: <p>Because it carries the units of X × Y and scales with variable size. Correlation r fixes this by standardising into −1 to +1.</p> },
                { q: "Can covariance be zero for related variables?", a: <p>Yes. Covariance only picks up linear co-movement. Symmetric non-linear patterns can have cov ≈ 0 while X and Y are tightly connected.</p> },
                { q: "Is cov(X, X) the same as variance?", a: <p>Yes — variance is the covariance of a variable with itself: Var(X) = cov(X, X).</p> },
                { q: "Do the two lists need the same length?", a: <p>Yes. Each x must be paired with the y from the same observation.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/correlation-calculator", label: "Correlation Coefficient Calculator" },
                { to: "/calculators/math/linear-regression-calculator", label: "Linear Regression Calculator" },
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
                { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="X values (comma or space separated)" htmlFor="xdata" hint="e.g. 2.1, 2.5, 3.6, 4.0, 4.5, 5.1">
            <textarea
              id="xdata"
              value={xInput}
              onChange={(e) => setXInput(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="2.1, 2.5, 3.6, 4.0, 4.5, 5.1"
            />
          </Field>
          <Field label="Y values (paired with X, same count)" htmlFor="ydata" hint="e.g. 8, 10, 12, 15, 16, 20">
            <textarea
              id="ydata"
              value={yInput}
              onChange={(e) => setYInput(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="8, 10, 12, 15, 16, 20"
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Mode:</span>
          <div className="inline-flex rounded-full border border-border bg-secondary/40 p-1">
            <button
              type="button"
              onClick={() => setMode("sample")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                mode === "sample" ? "bg-primary text-primary-foreground" : "text-foreground hover:text-primary"
              }`}
            >
              Sample (n − 1)
            </button>
            <button
              type="button"
              onClick={() => setMode("population")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                mode === "population" ? "bg-primary text-primary-foreground" : "text-foreground hover:text-primary"
              }`}
            >
              Population (n)
            </button>
          </div>
        </div>
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

      {result && interpretation && (
        <div className="mt-6 space-y-4">
          <ResultActions
            filename="covariance-result"
            captureRef={resultRef}
            getCopyText={() => summary}
          />
          <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label={result.mode === "sample" ? "Sample covariance" : "Population covariance"}
              value={<>cov(X, Y) = {fmt(result.cov)}</>}
              note={
                <>
                  <div>{interpretation.label}</div>
                  <div className="mt-1 text-xs">
                    Correlation r = {fmt(result.r)} · Divisor {result.mode === "sample" ? "n − 1" : "n"} = {result.divisor} · n = {result.n}
                  </div>
                </>
              }
            />

            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-2 text-sm font-semibold text-foreground">Scatter plot with mean-quadrants shaded</div>
              <QuadrantScatter xs={result.xs} ys={result.ys} meanX={result.meanX} meanY={result.meanY} />
              <div className="mt-2 text-xs text-muted-foreground">
                Green quadrants (top-right, bottom-left): points here contribute a positive (xᵢ − x̄)(yᵢ − ȳ) product and push covariance up. Red quadrants (top-left, bottom-right): points here contribute a negative product and pull it down.
              </div>
            </div>

            <StepsToggle steps={steps} />
          </div>
        </div>
      )}
    </MathCalcPage>
  );
}
