import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
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
  FormulaWithLegend,
  WorkedExample,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { SolutionSteps, type Step } from "@/components/SolutionSteps";
import { ReferenceTable } from "@/components/ReferenceTable";
import { ResultActions } from "@/components/ResultActions";
import { gcd } from "@/lib/math/core";

export const Route = createFileRoute("/calculators/math/slope-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Slope Calculator",
      title: "Slope Calculator — Gradient, Distance, Angle & Grade",
      metaDescription:
        "Find the slope, distance, and angle of incline between two points, or the second point from a known point, slope, and distance. Includes grade %, ratio, and full step-by-step working.",
      canonicalUrl: "/calculators/math/slope-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Slope Calculator",
          path: "/calculators/math/slope-calculator",
        },
      ],
      faqs: [
        {
          q: "What is slope?",
          a: "Slope (or gradient) measures how steep a line is. It's the ratio of vertical change (rise) to horizontal change (run) between any two points on the line: m = (y₂ − y₁) / (x₂ − x₁).",
        },
        {
          q: "What does a negative slope mean?",
          a: "A negative slope means the line goes downwards from left to right — as x increases, y decreases. The steeper the descent, the larger the absolute value of m.",
        },
        {
          q: "What is an undefined slope?",
          a: "When x₁ = x₂ the two points share the same x, so the line is vertical. The slope formula divides by (x₂ − x₁) = 0, which is undefined. Vertical lines are written x = constant.",
        },
        {
          q: "How is the angle of incline calculated?",
          a: "The angle θ is the arctangent of the slope: θ = atan(m). A slope of 1 corresponds to 45°; a slope of √3 corresponds to 60°. Vertical lines have θ = 90°.",
        },
        {
          q: "What's the difference between slope and grade percent?",
          a: "Grade percent is simply the slope multiplied by 100. A slope of 0.05 is a 5% grade — a common way roads and ramps are labelled.",
        },
      ],
    }),
  component: SlopeCalculatorPage,
});

// ---------------- Utilities ----------------

function fmt(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e10)) return v.toExponential(6);
  return Number(v.toPrecision(10)).toString();
}

/** Reduce a rise:run pair to lowest terms. Works for reasonable decimals. */
function slopeAsRatio(rise: number, run: number): { r: number; s: number } | null {
  if (!Number.isFinite(rise) || !Number.isFinite(run)) return null;
  if (run === 0) return null;
  const decimals = Math.max(decimalPlaces(rise), decimalPlaces(run), 0);
  const f = Math.pow(10, Math.min(decimals, 6));
  const ri = Math.round(rise * f);
  const ru = Math.round(run * f);
  if (ru === 0) return null;
  const g = gcd(Math.abs(ri), Math.abs(ru)) || 1;
  let r = ri / g;
  let s = ru / g;
  if (s < 0) {
    r = -r;
    s = -s;
  }
  return { r, s };
}
function decimalPlaces(n: number): number {
  const s = String(n);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}

/** Render a fraction like num/den. Handles sign and den=1. */
function Frac({ n, d }: { n: number; d: number }) {
  if (d === 0) return <>undefined</>;
  if (d === 1) return <>{fmt(n)}</>;
  if (d === -1) return <>{fmt(-n)}</>;
  const neg = (n < 0) !== (d < 0);
  const an = Math.abs(n);
  const ad = Math.abs(d);
  return (
    <span className="inline-flex items-center align-middle mx-0.5">
      {neg && <span className="mr-0.5">−</span>}
      <span className="inline-flex flex-col items-center leading-none text-[0.95em]">
        <span className="px-1">{fmt(an)}</span>
        <span className="border-t border-current w-full" />
        <span className="px-1">{fmt(ad)}</span>
      </span>
    </span>
  );
}

/** Reduce integers a/b to lowest terms, sign carried on numerator. */
function reduceFrac(a: number, b: number): { n: number; d: number } {
  if (b === 0) return { n: a, d: 0 };
  const g = gcd(Math.abs(Math.round(a)), Math.abs(Math.round(b))) || 1;
  let n = Math.round(a) / g;
  let d = Math.round(b) / g;
  if (d < 0) { n = -n; d = -d; }
  return { n, d };
}

function classifyLine(m: number, vertical: boolean): string {
  if (vertical) return "This line is vertical — its slope is undefined.";
  if (m === 0) return "This line is horizontal (constant y).";
  if (m > 0) return "This line is increasing — it goes up from left to right.";
  return "This line is decreasing — it goes down from left to right.";
}

// ---------------- Linear equation parser ----------------

/** Parses linear equation strings like "y = 6x - 22", "2x + 3y = 12", or "x = 3".
 *  Returns slope-intercept (m, b), or a vertical marker, or an error. */
function parseLinearEquation(
  input: string,
): { ok: true; m: number; b: number } | { ok: true; verticalX: number } | { ok: false; error: string } {
  const raw = input.replace(/\s+/g, "").toLowerCase();
  if (!raw) return { ok: false, error: "Enter a linear equation such as y = 6x - 22 or 2x + 3y = 12." };
  if (!raw.includes("=")) return { ok: false, error: "Equation must contain an = sign." };
  const [lhs, rhs] = raw.split("=");
  if (lhs === undefined || rhs === undefined || rhs === "")
    return { ok: false, error: "Both sides of the equation are required." };

  // Tokenise a linear expression into {ax, ay, c} where value = ax*x + ay*y + c
  const parseSide = (s: string): { ax: number; ay: number; c: number } | null => {
    // Prepend + so the regex captures signs uniformly
    const str = (s.startsWith("+") || s.startsWith("-") ? s : "+" + s);
    const re = /([+-])((?:\d+\.?\d*|\.\d+)?)(x|y)?/g;
    let ax = 0, ay = 0, c = 0;
    let matched = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(str)) !== null) {
      if (m[0] === "" || (m[2] === "" && !m[3])) continue;
      matched++;
      const sign = m[1] === "-" ? -1 : 1;
      const coefStr = m[2];
      const varr = m[3];
      const coef = coefStr === "" ? 1 : parseFloat(coefStr);
      if (!Number.isFinite(coef)) return null;
      const val = sign * coef;
      if (varr === "x") ax += val;
      else if (varr === "y") ay += val;
      else c += val;
    }
    if (matched === 0) return null;
    return { ax, ay, c };
  };

  const L = parseSide(lhs);
  const R = parseSide(rhs);
  if (!L || !R) return { ok: false, error: "Could not parse the equation. Use variables x and y only." };

  // Move everything to LHS: (L.ax - R.ax) x + (L.ay - R.ay) y + (L.c - R.c) = 0
  const A = L.ax - R.ax;
  const B = L.ay - R.ay;
  const C = L.c - R.c;

  if (A === 0 && B === 0) return { ok: false, error: "Equation reduces to a constant — no line." };
  if (B === 0) {
    // A x + C = 0 → x = -C/A (vertical line)
    return { ok: true, verticalX: -C / A };
  }
  // A x + B y + C = 0 → y = -(A/B) x - C/B
  const m = -A / B;
  const b = -C / B;
  return { ok: true, m, b };
}

// ---------------- Result types ----------------

type TwoPointResult = {
  kind: "two-points";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dx: number;
  dy: number;
  m: number | null; // null => undefined slope
  d: number;
  thetaDeg: number;
  thetaRad: number;
  steps: Step[];
};

type OnePointResult = {
  kind: "one-point";
  x1: number;
  y1: number;
  d: number;
  m: number;
  thetaDeg: number;
  thetaRad: number;
  dir1: { x2: number; y2: number };
  dir2: { x2: number; y2: number };
  steps: Step[];
};

type EquationResult = {
  kind: "equation";
  input: string;
  m: number | null; // null => vertical (verticalX set)
  b: number | null;
  verticalX?: number;
  steps: Step[];
};

type Result = TwoPointResult | OnePointResult | EquationResult;

// ---------------- Shared: full algebra derivation (a–f) ----------------

/** Given m, b, and an anchor point (x1, y1), produces the fully expanded
 *  point-slope → slope-intercept → intercepts → standard-form derivation. */
/** Centered display-math line used inside solution steps. */
function MathLine({ children }: { children: ReactNode }) {
  return (
    <div className="my-1 flex items-center justify-center text-center font-serif text-[15px] italic text-foreground">
      <span className="inline-flex items-center gap-1">{children}</span>
    </div>
  );
}

/** Small left-aligned note between math lines (e.g. "When x = 0"). */
function MathNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 mb-1 text-sm not-italic text-muted-foreground">
      {children}
    </div>
  );
}

// buildAlgebraSteps was replaced by <AnswerReport />, which renders the
// derivation as open named sections instead of collapsible numbered steps.


// ---------------- Compute (2 points) ----------------

function computeTwoPoints(x1: number, y1: number, x2: number, y2: number): TwoPointResult {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.sqrt(dx * dx + dy * dy);
  const vertical = dx === 0;
  const m = vertical ? null : dy / dx;
  const thetaRad = vertical ? Math.PI / 2 : Math.atan2(dy, dx);
  const thetaDeg = (thetaRad * 180) / Math.PI;

  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <>
          <MathLine>P₁ = ({fmt(x1)}, {fmt(y1)})</MathLine>
          <MathLine>P₂ = ({fmt(x2)}, {fmt(y2)})</MathLine>
        </>
      ),
    },
    {
      title: "Write the slope, distance, and angle formulas",
      body: (
        <>
          <MathNote>Slope — rise over run</MathNote>
          <MathLine>m = (y₂ − y₁) / (x₂ − x₁)</MathLine>
          <MathNote>Distance between the two points</MathNote>
          <MathLine>d = √((x₂ − x₁)² + (y₂ − y₁)²)</MathLine>
          <MathNote>Angle of incline from the x-axis</MathNote>
          <MathLine>θ = atan(m)</MathLine>
        </>
      ),
    },
    {
      title: "Substitute — compute Δx and Δy",
      body: (
        <>
          <MathLine>Δx = {fmt(x2)} − {fmt(x1)} = {fmt(dx)}</MathLine>
          <MathLine>Δy = {fmt(y2)} − {fmt(y1)} = {fmt(dy)}</MathLine>
        </>
      ),
    },
    {
      title: vertical ? "Slope check" : "Solve for slope m",
      body: vertical ? (
        <MathNote>
          Δx = 0, so dividing by (x₂ − x₁) is undefined. The line is
          vertical; its slope has no numeric value.
        </MathNote>
      ) : (
        <>
          <MathLine>m = Δy / Δx</MathLine>
          <MathLine>m = {fmt(dy)} / {fmt(dx)}</MathLine>
          <MathLine>m = {fmt(m as number)}</MathLine>
        </>
      ),
    },
    {
      title: "Solve for distance d",
      body: (
        <>
          <MathLine>d = √({fmt(dx)}² + {fmt(dy)}²)</MathLine>
          <MathLine>d = √{fmt(dx * dx + dy * dy)}</MathLine>
          <MathLine>d = {fmt(d)}</MathLine>
        </>
      ),
    },
    {
      title: "Solve for the angle of incline θ",
      body: vertical ? (
        <>
          <MathLine>θ = 90°</MathLine>
          <MathLine>({fmt(thetaRad)} rad)</MathLine>
        </>
      ) : (
        <>
          <MathLine>θ = atan({fmt(m as number)})</MathLine>
          <MathLine>θ = {fmt(thetaDeg)}°</MathLine>
          <MathLine>({fmt(thetaRad)} rad)</MathLine>
        </>
      ),
    },
  ];

  // Full CalculatorSoup-style derivation now lives in <AnswerReport />,
  // shown as OPEN named sections rather than a collapsible step list.


  return { kind: "two-points", x1, y1, x2, y2, dx, dy, m, d, thetaDeg, thetaRad, steps };
}




// ---------------- Compute (1 point + slope/angle + distance) ----------------

function computeOnePoint(
  x1: number,
  y1: number,
  d: number,
  m: number,
  thetaRadIn: number,
): OnePointResult {
  const thetaRad = thetaRadIn;
  const thetaDeg = (thetaRad * 180) / Math.PI;
  const cx = Math.cos(thetaRad);
  const cy = Math.sin(thetaRad);
  const dir1 = { x2: x1 + d * cx, y2: y1 + d * cy };
  const dir2 = { x2: x1 - d * cx, y2: y1 - d * cy };

  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <>
          <MathLine>P₁ = ({fmt(x1)}, {fmt(y1)})</MathLine>
          <MathLine>d = {fmt(d)}</MathLine>
          <MathLine>m = {fmt(m)}</MathLine>
          <MathLine>θ = {fmt(thetaDeg)}°</MathLine>
        </>
      ),
    },
    {
      title: "Formula for the second point",
      body: (
        <>
          <MathNote>Move a distance d from P₁ at angle θ (two directions)</MathNote>
          <MathLine>x₂ = x₁ ± d·cos(θ)</MathLine>
          <MathLine>y₂ = y₁ ± d·sin(θ)</MathLine>
        </>
      ),
    },
    {
      title: "Substitute cos(θ) and sin(θ)",
      body: (
        <>
          <MathLine>cos(θ) = {fmt(cx)}</MathLine>
          <MathLine>sin(θ) = {fmt(cy)}</MathLine>
        </>
      ),
    },
    {
      title: "Direction 1 (forward along θ)",
      body: (
        <>
          <MathLine>x₂ = {fmt(x1)} + {fmt(d)} × {fmt(cx)} = {fmt(dir1.x2)}</MathLine>
          <MathLine>y₂ = {fmt(y1)} + {fmt(d)} × {fmt(cy)} = {fmt(dir1.y2)}</MathLine>
          <MathLine>P₂ = ({fmt(dir1.x2)}, {fmt(dir1.y2)})</MathLine>
        </>
      ),
    },
    {
      title: "Direction 2 (backward, θ + 180°)",
      body: (
        <>
          <MathLine>x₂ = {fmt(x1)} − {fmt(d)} × {fmt(cx)} = {fmt(dir2.x2)}</MathLine>
          <MathLine>y₂ = {fmt(y1)} − {fmt(d)} × {fmt(cy)} = {fmt(dir2.y2)}</MathLine>
          <MathLine>P₂ = ({fmt(dir2.x2)}, {fmt(dir2.y2)})</MathLine>
        </>
      ),
    },
  ];

  return { kind: "one-point", x1, y1, d, m, thetaDeg, thetaRad, dir1, dir2, steps };
}

// ---------------- Diagram ----------------

function SlopeDiagram({
  x1,
  y1,
  x2,
  y2,
  label,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
}) {
  const W = 480;
  const H = 300;
  const PAD = 40;
  const xs = [x1, x2];
  const ys = [y1, y2];
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xR = xMax - xMin || 1;
  const yR = yMax - yMin || 1;
  const xLo = xMin - xR * 0.3;
  const xHi = xMax + xR * 0.3;
  const yLo = yMin - yR * 0.3;
  const yHi = yMax + yR * 0.3;
  const px = (v: number) => PAD + ((v - xLo) / (xHi - xLo)) * (W - 2 * PAD);
  const py = (v: number) => H - PAD - ((v - yLo) / (yHi - yLo)) * (H - 2 * PAD);
  const p1 = { x: px(x1), y: py(y1) };
  const p2 = { x: px(x2), y: py(y2) };
  const corner = { x: p2.x, y: p1.y };

  const lineColor = "var(--color-primary)";
  const dashColor = "var(--color-muted-foreground)";
  const pointColor = "var(--color-primary)";
  const textColor = "var(--color-foreground)";
  const borderColor = "var(--color-border)";

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">
        {label ?? "Line and right triangle"}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Diagram of the line between the two points, showing rise, run, distance, and angle of incline"
      >
        <rect
          x={PAD}
          y={PAD}
          width={W - 2 * PAD}
          height={H - 2 * PAD}
          fill="none"
          stroke={borderColor}
          strokeWidth={1}
        />
        {/* right-triangle legs (dashed) */}
        <line x1={p1.x} y1={p1.y} x2={corner.x} y2={corner.y} stroke={dashColor} strokeDasharray="4 4" />
        <line x1={corner.x} y1={corner.y} x2={p2.x} y2={p2.y} stroke={dashColor} strokeDasharray="4 4" />
        {/* hypotenuse — the actual line segment */}
        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={lineColor} strokeWidth={2.5} />
        {/* points */}
        <circle cx={p1.x} cy={p1.y} r={5} fill={pointColor} />
        <circle cx={p2.x} cy={p2.y} r={5} fill={pointColor} />
        {/* labels */}
        <text
          x={p1.x + 8}
          y={p1.y + 14}
          fill={textColor}
          fontSize={11}
          fontFamily="monospace"
        >
          (x₁, y₁) = ({fmt(x1)}, {fmt(y1)})
        </text>
        <text
          x={p2.x + 8}
          y={p2.y - 8}
          fill={textColor}
          fontSize={11}
          fontFamily="monospace"
        >
          (x₂, y₂) = ({fmt(x2)}, {fmt(y2)})
        </text>
        <text
          x={(p1.x + corner.x) / 2}
          y={corner.y + 14}
          fill="var(--color-muted-foreground)"
          fontSize={11}
          textAnchor="middle"
        >
          Δx
        </text>
        <text
          x={corner.x + 8}
          y={(corner.y + p2.y) / 2}
          fill="var(--color-muted-foreground)"
          fontSize={11}
        >
          Δy
        </text>
        <text
          x={(p1.x + p2.x) / 2 - 10}
          y={(p1.y + p2.y) / 2 - 6}
          fill="var(--color-primary)"
          fontSize={11}
          fontWeight="bold"
        >
          d
        </text>
      </svg>
    </div>
  );
}

// ---------------- Page ----------------

type Mode = "two-points" | "one-point" | "equation";

// ---------------- Compute (equation) ----------------

function computeEquation(input: string): EquationResult | { error: string } {
  const parsed = parseLinearEquation(input);
  if (!parsed.ok) return { error: parsed.error };

  if ("verticalX" in parsed) {
    return {
      kind: "equation",
      input,
      m: null,
      b: null,
      verticalX: parsed.verticalX,
      steps: [
        {
          title: "Parse the equation",
          body: <MathLine>Input: {input}</MathLine>,
        },
        {
          title: "Vertical line detected",
          body: (
            <>
              <MathNote>Equation reduces to a vertical line</MathNote>
              <MathLine>x = {fmt(parsed.verticalX)}</MathLine>
              <MathNote>Slope is undefined; no slope-intercept form exists.</MathNote>
            </>
          ),
        },
      ],
    };
  }

  const { m, b } = parsed;
  const steps: Step[] = [
    {
      title: "Parse the equation",
      body: (
        <>
          <MathLine>Input: {input}</MathLine>
          <MathNote>Rewrite as y = mx + b</MathNote>
          <MathLine>y = {fmt(m)}x {b >= 0 ? "+" : "−"} {fmt(Math.abs(b))}</MathLine>
          <MathLine>m = {fmt(m)}</MathLine>
          <MathLine>b = {fmt(b)}</MathLine>
        </>
      ),
    },
  ];

  return { kind: "equation", input, m, b, steps };
}

function SlopeCalculatorPage() {
  const [mode, setMode] = useState<Mode>("two-points");

  // Two-point inputs
  const [x1s, setX1s] = useState("3");
  const [y1s, setY1s] = useState("4");
  const [x2s, setX2s] = useState("6");
  const [y2s, setY2s] = useState("8");

  // One-point inputs
  const [px1s, setPx1s] = useState("1");
  const [py1s, setPy1s] = useState("1");
  const [pds, setPds] = useState("5");
  const [pms, setPms] = useState("0.75");
  const [pAngS, setPAngS] = useState("");

  // Equation input
  const [eqS, setEqS] = useState("y = 6x - 22");


  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const onCalc = () => {
    setErr(null);
    setNotice(null);
    setResult(null);

    if (mode === "two-points") {
      const vs = [x1s, y1s, x2s, y2s].map(Number);
      if (vs.some((v) => !Number.isFinite(v))) {
        setErr("Please enter valid numeric values for all four coordinates.");
        return;
      }
      const [x1, y1, x2, y2] = vs;
      if (x1 === x2 && y1 === y2) {
        setErr("Points are identical — no line is defined. Enter two different points.");
        return;
      }
      setResult(computeTwoPoints(x1, y1, x2, y2));
    } else if (mode === "equation") {
      const r = computeEquation(eqS.trim());
      if ("error" in r) {
        setErr(r.error);
        return;
      }
      setResult(r);
    } else {
      const x1 = Number(px1s);
      const y1 = Number(py1s);
      const d = Number(pds);
      const mRaw = pms.trim();
      const aRaw = pAngS.trim();
      if (![x1, y1, d].every(Number.isFinite)) {
        setErr("Please enter valid numeric values for x₁, y₁ and distance d.");
        return;
      }
      if (d <= 0) {
        setErr("Distance d must be greater than zero.");
        return;
      }
      if (!mRaw && !aRaw) {
        setErr("Enter either the slope m or the angle of incline θ.");
        return;
      }
      let m: number;
      let thetaRad: number;
      if (mRaw && aRaw) {
        const mVal = Number(mRaw);
        if (!Number.isFinite(mVal)) {
          setErr("Slope m is not a valid number.");
          return;
        }
        m = mVal;
        thetaRad = Math.atan(mVal);
        setNotice("Both slope and angle were provided — slope was used, and the angle was recomputed from it.");
      } else if (mRaw) {
        const mVal = Number(mRaw);
        if (!Number.isFinite(mVal)) {
          setErr("Slope m is not a valid number.");
          return;
        }
        m = mVal;
        thetaRad = Math.atan(mVal);
      } else {
        const aDeg = Number(aRaw);
        if (!Number.isFinite(aDeg)) {
          setErr("Angle θ is not a valid number.");
          return;
        }
        if (Math.abs(aDeg) === 90) {
          setErr("An angle of ±90° would produce an undefined slope. Use the two-points mode for vertical lines.");
          return;
        }
        thetaRad = (aDeg * Math.PI) / 180;
        m = Math.tan(thetaRad);
      }
      setResult(computeOnePoint(x1, y1, d, m, thetaRad));
    }
  };

  const copyText = (): string => {
    if (!result) return "";
    if (result.kind === "two-points") {
      const mStr = result.m === null ? "undefined (vertical)" : fmt(result.m);
      return [
        `Slope Calculator — two points`,
        `P₁ = (${fmt(result.x1)}, ${fmt(result.y1)})`,
        `P₂ = (${fmt(result.x2)}, ${fmt(result.y2)})`,
        `Slope m = ${mStr}`,
        `Distance d = ${fmt(result.d)}`,
        `Angle θ = ${fmt(result.thetaDeg)}° (${fmt(result.thetaRad)} rad)`,
      ].join("\n");
    }
    if (result.kind === "one-point") {
      return [
        `Slope Calculator — one point, slope, distance`,
        `P₁ = (${fmt(result.x1)}, ${fmt(result.y1)})`,
        `Slope m = ${fmt(result.m)}, distance d = ${fmt(result.d)}, θ = ${fmt(result.thetaDeg)}°`,
        `Direction 1: P₂ = (${fmt(result.dir1.x2)}, ${fmt(result.dir1.y2)})`,
        `Direction 2: P₂ = (${fmt(result.dir2.x2)}, ${fmt(result.dir2.y2)})`,
      ].join("\n");
    }
    // Equation mode
    if (result.verticalX !== undefined) {
      return `Slope Calculator — equation\nInput: ${result.input}\nVertical line x = ${fmt(result.verticalX)} (slope undefined)`;
    }
    return [
      `Slope Calculator — equation`,
      `Input: ${result.input}`,
      `Slope m = ${fmt(result.m as number)}`,
      `y-intercept b = ${fmt(result.b as number)}`,
      `Line: y = ${fmt(result.m as number)}x ${(result.b as number) >= 0 ? "+" : "−"} ${fmt(Math.abs(result.b as number))}`,
    ].join("\n");
  };

  return (
    <MathCalcPage
      name="Slope Calculator"
      tagline="Compute the slope, distance, and angle of incline of a line — from two points, or from one point with a known slope (or angle) and distance."
      extras={
        <>
          <CalcSection title="What is slope?">
            <p>
              The <strong>slope</strong> (or gradient) of a line describes its
              steepness, incline, or grade. It is defined as the ratio of the
              vertical change (<em>rise</em>) to the horizontal change
              (<em>run</em>) between any two points on the line:
            </p>
            <FormulaWithLegend
              formula={<>m = (y₂ − y₁) / (x₂ − x₁) = tan(θ)</>}
              legend={[
                { sym: "m", def: "slope of the line" },
                { sym: "θ", def: "angle of incline from the x-axis" },
                { sym: "(x₁, y₁), (x₂, y₂)", def: "two points on the line" },
              ]}
            />
            <ul className="list-disc space-y-1 pl-6">
              <li>A line is <strong>increasing</strong> and goes upward left-to-right when m &gt; 0.</li>
              <li>A line is <strong>decreasing</strong> and goes downward left-to-right when m &lt; 0.</li>
              <li>A line is <strong>horizontal</strong> (constant y) when m = 0.</li>
              <li>A <strong>vertical</strong> line has an <strong>undefined</strong> slope, because the denominator (x₂ − x₁) is zero.</li>
            </ul>
            <p>
              Slope is often called <em>“rise over run”</em>. Civil engineers
              use it to describe the grade of a road or ramp, geographers use
              it for terrain, and it's a building block of linear equations,
              calculus derivatives, and regression lines.
            </p>
          </CalcSection>

          <CalcSection title="Slope, step by step">
            <p>
              Pick the workflow that matches the information you already have:
              two points, or one point plus a known slope (or angle) and a
              distance. Both cases produce the same right-triangle picture —
              Δx and Δy along the axes, and the line segment d as the
              hypotenuse.
            </p>
            <GuideCards items={SLOPE_GUIDE} />
          </CalcSection>

          <CalcSection title="Worked example — the (3, 4) to (6, 8) line">
            <WorkedExample title="Slope, distance, and angle from two points">
              <FormulaBlock>P₁ = (3, 4), P₂ = (6, 8)</FormulaBlock>
              <FormulaBlock>m = (8 − 4)/(6 − 3) = 4/3 ≈ 1.3333</FormulaBlock>
              <FormulaBlock>d = √((6 − 3)² + (8 − 4)²) = √(9 + 16) = √25 = 5</FormulaBlock>
              <FormulaBlock>θ = atan(4/3) ≈ 53.13°</FormulaBlock>
              <p className="text-sm text-muted-foreground">
                So the segment from (3, 4) to (6, 8) has slope 4/3, length 5,
                and rises at about 53.13° from the horizontal — a 133.3% grade.
              </p>
            </WorkedExample>
          </CalcSection>

          <CalcSection title="Slope and angle — common values">
            <ReferenceTable
              headers={["Angle θ", "Slope m = tan(θ)", "Grade %", "Ratio (rise : run)"]}
              numericColumns={[0, 1, 2]}
              rows={[
                ["0°", "0", "0%", "0 : 1"],
                ["15°", fmt(Math.tan(Math.PI / 12)), "26.79%", "≈ 1 : 3.73"],
                ["30°", fmt(Math.tan(Math.PI / 6)), "57.74%", "1 : √3"],
                ["45°", "1", "100%", "1 : 1"],
                ["60°", fmt(Math.tan(Math.PI / 3)), "173.21%", "√3 : 1"],
                ["75°", fmt(Math.tan((75 * Math.PI) / 180)), "373.21%", "≈ 3.73 : 1"],
                ["90°", "undefined", "—", "vertical"],
              ]}
            />
          </CalcSection>

          <CalcSection title="Where slope shows up in real life">
            <p>
              Slope is not just a classroom idea — you meet it every day, even
              when nobody calls it &ldquo;slope&rdquo;. Any time something goes
              up or down as something else changes, a slope is quietly doing
              the work behind the scene.
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Roads and ramps.</strong> A road sign that says
                &ldquo;8% grade&rdquo; is telling you the slope of the hill.
                The road rises 8 metres for every 100 metres you drive
                forward.
              </li>
              <li>
                <strong>Roofs and stairs.</strong> Builders talk about
                &ldquo;pitch&rdquo; for roofs and &ldquo;rise over run&rdquo;
                for stairs. Both are slope, just with different names.
              </li>
              <li>
                <strong>Wheelchair ramps.</strong> Access rules usually cap
                the slope at 1 : 12 — for every 1 unit of rise you need at
                least 12 units of run, so the ramp is gentle enough to use
                safely.
              </li>
              <li>
                <strong>Money and business.</strong> On a chart of price over
                time, the slope tells you how fast a value grows or drops.
                A steeper slope means faster change.
              </li>
              <li>
                <strong>Science and data.</strong> In a straight-line trend
                line, the slope is the &ldquo;rate&rdquo; — kilometres per
                hour, cost per unit, degrees per minute, and so on.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="How to use this calculator">
            <p>
              The calculator has three simple modes. Pick the one that matches
              the numbers you already have, fill in the boxes, and press
              <em> Calculate</em>. Every answer comes with a full step-by-step
              working so you can follow the math, not just copy the result.
            </p>
            <ol className="list-decimal space-y-1 pl-6">
              <li>
                <strong>Two Points</strong> — enter (x₁, y₁) and (x₂, y₂). The
                calculator gives you slope, distance between the points, angle
                of incline, grade %, and the reduced rise : run ratio.
              </li>
              <li>
                <strong>One Point + Slope</strong> — enter one point, a distance
                d, and either the slope m or the angle θ. The calculator finds
                the second point in both directions along the line.
              </li>
              <li>
                <strong>Equation</strong> — paste an equation like
                <span className="font-serif italic"> y = 6x − 22 </span> or
                <span className="font-serif italic"> 2x + 3y = 12</span>. The
                calculator reads it, pulls out the slope and intercepts, and
                shows the full derivation.
              </li>
            </ol>
            <p>
              Below the answer you get seven sections — Answer, Point-Slope
              Form, Slope-Intercept Form (with the full algebra expansion),
              Y-Intercept, X-Intercept, a graph with points marked, and
              Standard Form. You can hide any section you don&rsquo;t need by
              clicking &ldquo;Hide&rdquo; on its heading.
            </p>
          </CalcSection>

          <CalcSection title="Common mistakes to avoid">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Flipping rise and run.</strong> The formula is
                <span className="font-serif italic"> (y₂ − y₁) / (x₂ − x₁)</span>, not
                the other way around. Always put the change in y on top.
              </li>
              <li>
                <strong>Mixing up the point order.</strong> You can start with
                either point, but you must be consistent — if y₂ comes from
                point 2, then x₂ must come from point 2 as well.
              </li>
              <li>
                <strong>Forgetting the sign.</strong> A line falling to the
                right has a negative slope. Missing the minus sign turns a
                downhill line into an uphill line.
              </li>
              <li>
                <strong>Dividing by zero.</strong> If x₁ = x₂ the line is
                vertical and the slope is undefined — not zero. Zero slope
                means horizontal.
              </li>
              <li>
                <strong>Confusing slope with angle.</strong> A slope of 1 is a
                45° incline, not a 100° or &ldquo;100%&rdquo; incline. Grade %
                and angle in degrees are two different numbers.
              </li>
              <li>
                <strong>Rounding too early.</strong> If you round the slope
                before finding the y-intercept, small rounding errors get
                multiplied and the final equation drifts. Keep the exact
                fraction until the last step.
              </li>
            </ul>
          </CalcSection>


          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Two independent modes: from two known points, or from one point with slope/angle and distance",
                "Reports slope m, distance d, and angle θ in both degrees and radians",
                "Slope also shown as a percentage (grade) and as a reduced rise:run ratio",
                "Handles vertical (undefined slope) and horizontal (m = 0) lines cleanly",
                "In one-point mode, returns both possible positions for P₂ (forward and backward along the line)",
                "Interactive SVG diagram showing Δx, Δy, and the line as the hypotenuse",
                "Copy, PDF, print and image export of the result",
                "Full step-by-step working with formulas, substitutions, and answer",
              ]}
            />
          </CalcSection>

          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is slope?",
                  a: (
                    <p>
                      Slope measures how steep a line is and which way it
                      tilts. It's the ratio of rise (Δy) to run (Δx) between
                      any two points on the line: m = (y₂ − y₁) / (x₂ − x₁).
                    </p>
                  ),
                },
                {
                  q: "What does a negative slope mean?",
                  a: (
                    <p>
                      A negative slope means the line falls as you move to
                      the right — y decreases while x increases. The larger
                      the absolute value, the steeper the descent.
                    </p>
                  ),
                },
                {
                  q: "What is an undefined slope?",
                  a: (
                    <p>
                      When x₁ = x₂ the two points lie on a vertical line and
                      the denominator of the slope formula becomes 0. Division
                      by zero is undefined, so vertical lines have no numeric
                      slope; they're written x = constant instead.
                    </p>
                  ),
                },
                {
                  q: "How is the angle of incline calculated?",
                  a: (
                    <p>
                      Since m = tan(θ), the angle is θ = atan(m). A slope of 1
                      is exactly 45°; slopes above 1 climb steeper than 45°,
                      and slopes below 1 climb shallower.
                    </p>
                  ),
                },
                {
                  q: "What's the difference between slope and grade %?",
                  a: (
                    <p>
                      Grade percent is just slope × 100. A road with slope 0.08
                      has an 8% grade — meaning it rises 8 units for every 100
                      units travelled horizontally.
                    </p>
                  ),
                },
                {
                  q: "Can one point, a slope, and a distance define the second point?",
                  a: (
                    <p>
                      Yes — but only up to direction. Along the same line you
                      can travel distance d either forward or backward from
                      P₁, so there are two valid second points. The calculator
                      shows both.
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
                  to: "/calculators/math/slope-intercept-calculator",
                  label: "Slope-Intercept Form Calculator",
                },
                {
                  to: "/calculators/math/distance-calculator",
                  label: "Distance Calculator",
                },
                {
                  to: "/calculators/math/triangle-calculator",
                  label: "Triangle Calculator",
                },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      {/* Mode switch */}
      <div className="mb-5 flex flex-wrap gap-2">
        <ModeButton active={mode === "two-points"} onClick={() => { setMode("two-points"); setResult(null); setErr(null); setNotice(null); }}>
          If the 2 points are known
        </ModeButton>
        <ModeButton active={mode === "one-point"} onClick={() => { setMode("one-point"); setResult(null); setErr(null); setNotice(null); }}>
          If 1 point and slope are known
        </ModeButton>
        <ModeButton active={mode === "equation"} onClick={() => { setMode("equation"); setResult(null); setErr(null); setNotice(null); }}>
          From an equation
        </ModeButton>
      </div>


      {mode === "equation" ? (
        <div className="space-y-4">
          <Field
            label="Line equation"
            htmlFor="eq"
            hint='Accepts slope-intercept form (e.g. "y = 6x - 22") or standard form (e.g. "2x + 3y = 12"). Variables must be x and y.'
          >
            <TextInput
              id="eq"
              value={eqS}
              onChange={(e) => setEqS(e.target.value)}
              placeholder="y = 6x - 22"
            />
          </Field>
          <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
        </div>
      ) : mode === "two-points" ? (
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm text-muted-foreground">
              First point (x₁, y₁)
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="x₁" htmlFor="x1">
                <TextInput id="x1" value={x1s} onChange={(e) => setX1s(e.target.value)} inputMode="decimal" />
              </Field>
              <Field label="y₁" htmlFor="y1">
                <TextInput id="y1" value={y1s} onChange={(e) => setY1s(e.target.value)} inputMode="decimal" />
              </Field>
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm text-muted-foreground">
              Second point (x₂, y₂)
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="x₂" htmlFor="x2">
                <TextInput id="x2" value={x2s} onChange={(e) => setX2s(e.target.value)} inputMode="decimal" />
              </Field>
              <Field label="y₂" htmlFor="y2">
                <TextInput id="y2" value={y2s} onChange={(e) => setY2s(e.target.value)} inputMode="decimal" />
              </Field>
            </div>
          </div>
          <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm text-muted-foreground">
              Known point (x₁, y₁)
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="x₁" htmlFor="px1">
                <TextInput id="px1" value={px1s} onChange={(e) => setPx1s(e.target.value)} inputMode="decimal" />
              </Field>
              <Field label="y₁" htmlFor="py1">
                <TextInput id="py1" value={py1s} onChange={(e) => setPy1s(e.target.value)} inputMode="decimal" />
              </Field>
            </div>
          </div>
          <Field label="Distance d" htmlFor="pd" hint="Length along the line from (x₁, y₁) to the unknown point. Must be > 0.">
            <TextInput id="pd" value={pds} onChange={(e) => setPds(e.target.value)} inputMode="decimal" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Slope m" htmlFor="pm" hint="Provide either slope or angle. If both are given, slope wins.">
              <TextInput id="pm" value={pms} onChange={(e) => setPms(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="OR angle of incline θ (degrees)" htmlFor="pang">
              <TextInput id="pang" value={pAngS} onChange={(e) => setPAngS(e.target.value)} inputMode="decimal" />
            </Field>
          </div>
          <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
        </div>
      )}

      {err && <ErrorBox message={err} />}
      {notice && (
        <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/[0.06] p-3 text-sm text-foreground">
          {notice}
        </div>
      )}

      {result && (
        <div ref={resultRef}>
          {result.kind === "two-points" ? (
            result.m === null ? (
              <TwoPointResultView r={result} />
            ) : (
              <AnswerReport
                m={result.m}
                b={result.y1 - result.m * result.x1}
                x1={result.x1}
                y1={result.y1}
                twoPoint={{
                  x2: result.x2,
                  y2: result.y2,
                  dx: result.dx,
                  dy: result.dy,
                  d: result.d,
                  thetaDeg: result.thetaDeg,
                  thetaRad: result.thetaRad,
                }}
              />
            )
          ) : result.kind === "one-point" ? (
            <OnePointResultView r={result} />
          ) : result.verticalX !== undefined ? (
            <EquationResultView r={result} />
          ) : (
            <AnswerReport
              m={result.m as number}
              b={result.b as number}
              x1={0}
              y1={result.b as number}
            />
          )}
          <div className="mt-4">
            <ResultActions
              getCopyText={copyText}
              captureRef={resultRef}
              filename="slope-calculator-result"
            />
          </div>
          {result.kind === "one-point" && (
            <>
              <SolutionSteps steps={result.steps} />
              <AnswerReport
                m={result.m}
                b={result.y1 - result.m * result.x1}
                x1={result.x1}
                y1={result.y1}
                twoPoint={{
                  x2: result.dir1.x2,
                  y2: result.dir1.y2,
                  dx: result.dir1.x2 - result.x1,
                  dy: result.dir1.y2 - result.y1,
                  d: result.d,
                  thetaDeg: result.thetaDeg,
                  thetaRad: result.thetaRad,
                }}
              />
            </>
          )}
        </div>
      )}

    </MathCalcPage>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors " +
        (active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

// ---------------- Result views ----------------

function TwoPointResultView({ r }: { r: TwoPointResult }) {
  const vertical = r.m === null;
  const grade = vertical ? null : (r.m as number) * 100;
  const ratio = vertical ? null : slopeAsRatio(r.dy, r.dx);
  const classification = classifyLine((r.m ?? 0) as number, vertical);

  return (
    <>
      <ResultBox
        label={vertical ? "Slope — undefined (vertical line)" : "Slope m"}
        value={
          <span className="font-serif italic">
            {vertical ? "undefined" : fmt(r.m as number)}
          </span>
        }
        note={classification}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard label="Distance d" value={fmt(r.d)} />
        <StatCard
          label="Angle of incline θ"
          value={`${fmt(r.thetaDeg)}°`}
          sub={`${fmt(r.thetaRad)} rad`}
        />
        <StatCard
          label="Grade (percentage)"
          value={vertical ? "—" : `${fmt(grade as number)}%`}
        />
        <StatCard
          label="Rise : run ratio"
          value={
            vertical
              ? "vertical"
              : ratio
                ? `${ratio.r} : ${ratio.s}`
                : "—"
          }
        />
      </div>
      <div className="mt-4">
        <SlopeDiagram x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
      </div>
    </>
  );
}

function OnePointResultView({ r }: { r: OnePointResult }) {
  const grade = r.m * 100;
  const ratio = slopeAsRatio(Math.sin(r.thetaRad), Math.cos(r.thetaRad));
  const classification = classifyLine(r.m, false);
  return (
    <>
      <ResultBox
        label="Slope m"
        value={<span className="font-serif italic">{fmt(r.m)}</span>}
        note={classification}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard label="Distance d" value={fmt(r.d)} />
        <StatCard
          label="Angle of incline θ"
          value={`${fmt(r.thetaDeg)}°`}
          sub={`${fmt(r.thetaRad)} rad`}
        />
        <StatCard label="Grade (percentage)" value={`${fmt(grade)}%`} />
        <StatCard
          label="Rise : run ratio"
          value={ratio ? `${ratio.r} : ${ratio.s}` : "—"}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Direction 1 — P₂"
          value={`(${fmt(r.dir1.x2)}, ${fmt(r.dir1.y2)})`}
          sub="Forward along θ"
        />
        <StatCard
          label="Direction 2 — P₂"
          value={`(${fmt(r.dir2.x2)}, ${fmt(r.dir2.y2)})`}
          sub="Backward (θ + 180°)"
        />
      </div>
      <div className="mt-4">
        <SlopeDiagram
          x1={r.x1}
          y1={r.y1}
          x2={r.dir1.x2}
          y2={r.dir1.y2}
          label="Direction 1 diagram"
        />
      </div>
    </>
  );
}

function EquationResultView({ r }: { r: EquationResult }) {
  if (r.verticalX !== undefined) {
    return (
      <>
        <ResultBox
          label="Slope m"
          value={<span className="font-serif italic">undefined</span>}
          note={`Vertical line x = ${fmt(r.verticalX)}`}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <StatCard label="Line" value={`x = ${fmt(r.verticalX)}`} />
          <StatCard label="Type" value="Vertical" />
        </div>
      </>
    );
  }
  const m = r.m as number;
  const b = r.b as number;
  const grade = m * 100;
  const ratio = slopeAsRatio(m, 1);
  const xInt = m === 0 ? null : -b / m;
  const classification = classifyLine(m, false);
  return (
    <>
      <ResultBox
        label="Slope m"
        value={<span className="font-serif italic">{fmt(m)}</span>}
        note={classification}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Line (slope-intercept)"
          value={`y = ${fmt(m)}x ${b >= 0 ? "+" : "−"} ${fmt(Math.abs(b))}`}
        />
        <StatCard label="y-intercept" value={`(0, ${fmt(b)})`} />
        <StatCard
          label="x-intercept"
          value={xInt === null ? "none" : `(${fmt(xInt)}, 0)`}
        />
        <StatCard label="Grade (percentage)" value={`${fmt(grade)}%`} />
        <StatCard
          label="Rise : run ratio"
          value={ratio ? `${ratio.r} : ${ratio.s}` : "—"}
        />
        <StatCard
          label="Angle of incline θ"
          value={`${fmt((Math.atan(m) * 180) / Math.PI)}°`}
        />
      </div>
      {xInt !== null && (
        <div className="mt-4">
          <SlopeDiagram x1={0} y1={b} x2={xInt} y2={0} label="Line diagram" />
        </div>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ---------------- Guide cards ---------------- //

function TwoPointsMini() {
  return (
    <svg viewBox="0 0 220 110" className="w-full">
      <rect x="1" y="1" width="218" height="108" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <line x1="20" y1="20" x2="20" y2="95" stroke="var(--color-border)" />
      <line x1="20" y1="95" x2="205" y2="95" stroke="var(--color-border)" />
      <line x1="45" y1="80" x2="180" y2="30" stroke="var(--color-primary)" strokeWidth="2" />
      <circle cx="45" cy="80" r="4" fill="var(--color-primary)" />
      <circle cx="180" cy="30" r="4" fill="var(--color-primary)" />
      <line x1="45" y1="80" x2="180" y2="80" stroke="var(--color-muted-foreground)" strokeDasharray="3 3" />
      <line x1="180" y1="80" x2="180" y2="30" stroke="var(--color-muted-foreground)" strokeDasharray="3 3" />
      <text x="112" y="92" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">Δx (run)</text>
      <text x="188" y="58" fontSize="9" fill="var(--color-muted-foreground)">Δy (rise)</text>
      <text x="105" y="50" fontSize="10" fill="var(--color-primary)" fontWeight="bold">d</text>
    </svg>
  );
}

function OnePointMini() {
  return (
    <svg viewBox="0 0 220 110" className="w-full">
      <rect x="1" y="1" width="218" height="108" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <line x1="20" y1="55" x2="205" y2="55" stroke="var(--color-border)" strokeDasharray="3 3" />
      <line x1="40" y1="85" x2="200" y2="25" stroke="var(--color-primary)" strokeWidth="2" />
      <circle cx="110" cy="55" r="4" fill="var(--color-primary)" />
      <circle cx="200" cy="25" r="4" fill="var(--color-primary)" />
      <circle cx="40" cy="85" r="4" fill="var(--color-primary)" />
      <text x="110" y="48" fontSize="9" fill="var(--color-foreground)" textAnchor="middle">P₁</text>
      <text x="205" y="22" fontSize="9" fill="var(--color-foreground)">dir 1</text>
      <text x="30" y="100" fontSize="9" fill="var(--color-foreground)">dir 2</text>
    </svg>
  );
}

function VerticalMini() {
  return (
    <svg viewBox="0 0 220 110" className="w-full">
      <rect x="1" y="1" width="218" height="108" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <line x1="20" y1="15" x2="20" y2="95" stroke="var(--color-border)" />
      <line x1="20" y1="95" x2="205" y2="95" stroke="var(--color-border)" />
      <line x1="120" y1="18" x2="120" y2="92" stroke="var(--color-primary)" strokeWidth="2" />
      <circle cx="120" cy="30" r="4" fill="var(--color-primary)" />
      <circle cx="120" cy="75" r="4" fill="var(--color-primary)" />
      <text x="120" y="107" textAnchor="middle" fontSize="10" fill="var(--color-foreground)" fontFamily="monospace">x = c</text>
      <text x="165" y="55" fontSize="9" fill="var(--color-destructive)">slope undefined</text>
    </svg>
  );
}

const SLOPE_GUIDE: GuideCardItem[] = [
  {
    key: "two-points",
    title: "From two points → slope, distance, angle",
    explain: (
      <>
        With both endpoints known, slope is the rise divided by the run,
        distance uses the Pythagorean theorem on Δx and Δy, and the angle of
        incline is the arctangent of the slope.
      </>
    ),
    formula: <>m = Δy/Δx · d = √(Δx² + Δy²) · θ = atan(m)</>,
    legend: [
      { sym: "Δx", def: "x₂ − x₁" },
      { sym: "Δy", def: "y₂ − y₁" },
    ],
    diagram: <TwoPointsMini />,
    example: {
      given: <span className="font-serif italic">(3, 4) and (6, 8)</span>,
      substitute: <>m = 4/3 · d = √25 · θ = atan(4/3)</>,
      answer: <span className="font-serif italic">m ≈ 1.333 · d = 5 · θ ≈ 53.13°</span>,
    },
  },
  {
    key: "one-point",
    title: "One point + slope + distance → second point (two directions)",
    explain: (
      <>
        Converting slope to an angle gives a unit direction (cos θ, sin θ).
        Moving distance d along that direction from P₁ gives one candidate
        for P₂; moving the same distance in the opposite direction gives the
        other. Both lie on the same line.
      </>
    ),
    formula: <>x₂ = x₁ ± d·cos(θ) · y₂ = y₁ ± d·sin(θ)</>,
    diagram: <OnePointMini />,
    example: {
      given: <span className="font-serif italic">P₁ = (1, 1), m = 0.75, d = 5</span>,
      substitute: <>θ = atan(0.75) ≈ 36.87° · cos θ = 0.8 · sin θ = 0.6</>,
      answer: <span className="font-serif italic">P₂ = (5, 4) or (−3, −2)</span>,
    },
  },
  {
    key: "vertical",
    title: "Vertical lines have undefined slope",
    explain: (
      <>
        When x₁ equals x₂ the denominator of the slope formula becomes zero,
        so the slope is undefined. The line is written as x = constant, the
        angle of incline is 90°, and only the distance d = |y₂ − y₁| is
        meaningful.
      </>
    ),
    formula: <>x₁ = x₂ ⇒ slope undefined · θ = 90°</>,
    diagram: <VerticalMini />,
    example: {
      given: <span className="font-serif italic">(3, 1) and (3, 7)</span>,
      substitute: <>Δx = 0 · Δy = 6</>,
      answer: <span className="font-serif italic">x = 3 · d = 6 · θ = 90°</span>,
    },
  },
];

// ---------------- Line graph (labels y-int and x-int) ----------------

function LineGraph({
  m,
  b,
  extraPoints = [],
}: {
  m: number;
  b: number;
  extraPoints?: { x: number; y: number; label?: string }[];
}) {
  const yInt = { x: 0, y: b, label: `y-int (0, ${fmt(b)})` };
  const xIntX = m === 0 ? null : -b / m;
  const xInt =
    xIntX === null ? null : { x: xIntX, y: 0, label: `x-int (${fmt(xIntX)}, 0)` };

  const pts = [yInt, ...(xInt ? [xInt] : []), ...extraPoints];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const xMin = Math.min(...xs, 0);
  const xMax = Math.max(...xs, 0);
  const yMin = Math.min(...ys, 0);
  const yMax = Math.max(...ys, 0);
  const xR = xMax - xMin || 1;
  const yR = yMax - yMin || 1;
  const xLo = xMin - xR * 0.3;
  const xHi = xMax + xR * 0.3;
  const yLo = yMin - yR * 0.3;
  const yHi = yMax + yR * 0.3;

  const W = 480;
  const H = 320;
  const PAD = 40;
  const px = (v: number) => PAD + ((v - xLo) / (xHi - xLo)) * (W - 2 * PAD);
  const py = (v: number) => H - PAD - ((v - yLo) / (yHi - yLo)) * (H - 2 * PAD);

  // Endpoints of the line clipped to viewport (extend range)
  const lineP1 = { x: xLo, y: m * xLo + b };
  const lineP2 = { x: xHi, y: m * xHi + b };

  const ax0 = px(0);
  const ay0 = py(0);
  const axesX = xLo <= 0 && xHi >= 0;
  const axesY = yLo <= 0 && yHi >= 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Graph of the line y = ${fmt(m)}x + ${fmt(b)}, with y-intercept and x-intercept marked`}
      >
        <rect
          x={PAD}
          y={PAD}
          width={W - 2 * PAD}
          height={H - 2 * PAD}
          fill="none"
          stroke="var(--color-border)"
        />
        {axesY && (
          <line x1={ax0} y1={PAD} x2={ax0} y2={H - PAD} stroke="var(--color-muted-foreground)" strokeWidth={1} />
        )}
        {axesX && (
          <line x1={PAD} y1={ay0} x2={W - PAD} y2={ay0} stroke="var(--color-muted-foreground)" strokeWidth={1} />
        )}
        <line
          x1={px(lineP1.x)}
          y1={py(lineP1.y)}
          x2={px(lineP2.x)}
          y2={py(lineP2.y)}
          stroke="var(--color-primary)"
          strokeWidth={2.5}
        />
        {pts.map((p, i) => {
          const isYInt = p === yInt;
          const isXInt = xInt !== null && p === xInt;
          const color = isYInt
            ? "var(--color-primary)"
            : isXInt
              ? "var(--color-destructive)"
              : "var(--color-foreground)";
          return (
            <g key={i}>
              <circle cx={px(p.x)} cy={py(p.y)} r={5} fill={color} />
              {p.label && (
                <text
                  x={px(p.x) + 8}
                  y={py(p.y) - 8}
                  fontSize={11}
                  fontFamily="monospace"
                  fill="var(--color-foreground)"
                >
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------- Answer report (open, named sections) ----------------

interface AnswerReportProps {
  m: number;
  b: number;
  x1: number;
  y1: number;
  twoPoint?: {
    x2: number;
    y2: number;
    dx: number;
    dy: number;
    d: number;
    thetaDeg: number;
    thetaRad: number;
  };
}

function AnswerReport({ m, b, x1, y1, twoPoint }: AnswerReportProps) {
  const mx1 = m * x1;
  const yInt = b;
  const xInt = m === 0 ? null : -b / m;
  const bFrac = reduceFrac(Math.round(b * 1_000_000), 1_000_000);
  const xIntFrac =
    xInt === null
      ? null
      : reduceFrac(Math.round(b * 1_000_000), Math.round(-m * 1_000_000));

  // Standard form: −m·x + y = b → scale to integers, A ≥ 0
  const scale = 1_000_000;
  let A = -m,
    B = 1,
    C = b;
  const gABC =
    gcd(
      gcd(Math.abs(Math.round(A * scale)), Math.abs(Math.round(B * scale))),
      Math.abs(Math.round(C * scale)),
    ) || 1;
  const As = Math.round(A * scale) / gABC;
  const Bs = Math.round(B * scale) / gABC;
  const Cs = Math.round(C * scale) / gABC;
  const asInt = Number.isInteger(As) && Number.isInteger(Bs) && Number.isInteger(Cs);
  if (asInt) {
    A = As;
    B = Bs;
    C = Cs;
    if (A < 0 || (A === 0 && B < 0)) {
      A = -A;
      B = -B;
      C = -C;
    }
  }

  const sgn = (v: number) => (v >= 0 ? "+" : "−");
  const absF = (v: number) => fmt(Math.abs(v));
  const eqStr = `y = ${fmt(m)}x ${sgn(b)} ${absF(b)}`;

  return (
    <div className="mt-6 space-y-6">
      {/* Answer summary — always visible */}
      <CalcSection title="Answer">
        <ResultBox
          label="Equation of the Line"
          value={<span className="font-serif italic">{eqStr}</span>}
        />
        <div className="mt-3 space-y-1 text-foreground">
          <MathLine>
            y-intercept b = {fmt(yInt)}
            {bFrac.d !== 1 && (
              <>
                {" = "}
                <Frac n={bFrac.n} d={bFrac.d} />
              </>
            )}
          </MathLine>
          {xInt === null ? (
            <MathLine>
              x-intercept = none (horizontal line{b === 0 ? "; every x satisfies" : ""})
            </MathLine>
          ) : xIntFrac && xIntFrac.d !== 1 ? (
            <MathLine>
              x-intercept = <Frac n={xIntFrac.n} d={xIntFrac.d} /> ≈ {fmt(xInt)}
            </MathLine>
          ) : (
            <MathLine>x-intercept = {fmt(xInt)}</MathLine>
          )}
          {twoPoint && (
            <>
              <MathLine>slope m = {fmt(m)}</MathLine>
              <MathLine>distance d = {fmt(twoPoint.d)}</MathLine>
              <MathLine>
                angle of incline θ = {fmt(twoPoint.thetaDeg)}° ({fmt(twoPoint.thetaRad)} rad)
              </MathLine>
            </>
          )}
        </div>
      </CalcSection>

      {/* Single master toggle for ALL derivation sub-sections */}
      <StepsToggle>
        {/* Slope, Distance, and Angle — Two Points mode only */}
        {twoPoint && (
          <CalcSection title="Slope, Distance, and Angle">
            <FormulaBlock>
              <MathLine>Δx = x₂ − x₁ = {fmt(twoPoint.x2)} − {fmt(x1)} = {fmt(twoPoint.dx)}</MathLine>
              <MathLine>Δy = y₂ − y₁ = {fmt(twoPoint.y2)} − {fmt(y1)} = {fmt(twoPoint.dy)}</MathLine>
              <MathNote>Slope (rise over run)</MathNote>
              <MathLine>
                m = <Frac n={twoPoint.dy} d={twoPoint.dx} /> = {fmt(m)}
              </MathLine>
              <MathNote>Distance (Pythagorean theorem)</MathNote>
              <MathLine>
                d = √(Δx² + Δy²) = √({fmt(twoPoint.dx)}² + {fmt(twoPoint.dy)}²) = {fmt(twoPoint.d)}
              </MathLine>
              <MathNote>Angle of incline</MathNote>
              <MathLine>
                θ = atan(m) = {fmt(twoPoint.thetaDeg)}° ({fmt(twoPoint.thetaRad)} rad)
              </MathLine>
            </FormulaBlock>
          </CalcSection>
        )}

        {/* Point-Slope Form */}
        <CalcSection title="Point-Slope Form">
          <FormulaBlock>
            <MathLine>y − y₁ = m(x − x₁)</MathLine>
            <MathLine>
              y − {fmt(y1)} = {fmt(m)}(x − {fmt(x1)})
            </MathLine>
          </FormulaBlock>
        </CalcSection>

        {/* Slope-Intercept Form */}
        <CalcSection title="Slope-Intercept Form">
          <p className="text-foreground">
            Find the <strong>Equation of the Line: y = mx + b</strong>, by solving
            for y using the Point-Slope Equation.
          </p>
          <FormulaBlock>
            <MathLine>y − y₁ = m(x − x₁)</MathLine>
            <MathLine>
              y − {fmt(y1)} = {fmt(m)}(x − {fmt(x1)})
            </MathLine>
            <MathLine>
              y − {fmt(y1)} = {fmt(m)}x − ({fmt(m)} × {fmt(x1)})
            </MathLine>
            <MathLine>
              y − {fmt(y1)} = {fmt(m)}x − {fmt(mx1)}
            </MathLine>
            <MathLine>
              y = {fmt(m)}x − {fmt(mx1)} + {fmt(y1)}
            </MathLine>
            <MathLine>
              <strong>{eqStr}</strong>
            </MathLine>
          </FormulaBlock>
          <div className="mt-2 space-y-1 text-foreground">
            <MathLine>m = {fmt(m)}</MathLine>
            <MathLine>b = {fmt(b)}</MathLine>
          </div>
        </CalcSection>

        {/* Y-Intercept */}
        <CalcSection title="Y-Intercept, when x = 0">
          <FormulaBlock>
            <MathLine>y = mx + b</MathLine>
            <MathLine>
              y = {fmt(m)}x {sgn(b)} {absF(b)}
            </MathLine>
            <MathNote>When x = 0</MathNote>
            <MathLine>
              y = {fmt(m)} × 0 {sgn(b)} {absF(b)}
            </MathLine>
            <MathLine>y = {fmt(b)}</MathLine>
            <MathNote>Therefore</MathNote>
            <MathLine>y-intercept = {fmt(yInt)}</MathLine>
            <MathLine>(x, y) = (0, {fmt(yInt)})</MathLine>
          </FormulaBlock>
        </CalcSection>

        {/* X-Intercept */}
        <CalcSection title="X-Intercept, when y = 0">
          {m === 0 ? (
            <p className="text-foreground">
              The line <span className="font-serif italic">y = {fmt(b)}</span> is horizontal
              and has {b === 0 ? "infinitely many x-intercepts" : "no x-intercept"}.
            </p>
          ) : (
            <FormulaBlock>
              <MathLine>y = mx + b</MathLine>
              <MathLine>
                y = {fmt(m)}x {sgn(b)} {absF(b)}
              </MathLine>
              <MathNote>When y = 0</MathNote>
              <MathLine>
                0 = {fmt(m)}x {sgn(b)} {absF(b)}
              </MathLine>
              <MathLine>
                {fmt(-m)}x = {fmt(b)}
              </MathLine>
              <MathLine>
                x = <Frac n={Math.round(b * 1_000_000)} d={Math.round(-m * 1_000_000)} />
              </MathLine>
              {xIntFrac && xIntFrac.d !== 1 ? (
                <>
                  <MathLine>
                    x = <Frac n={xIntFrac.n} d={xIntFrac.d} />
                  </MathLine>
                  <MathNote>In decimals</MathNote>
                  <MathLine>x ≈ {fmt(xInt as number)}</MathLine>
                </>
              ) : (
                <MathLine>x = {fmt(xInt as number)}</MathLine>
              )}
              <MathNote>Therefore</MathNote>
              {xIntFrac && xIntFrac.d !== 1 ? (
                <MathLine>
                  (x, y) = (<Frac n={xIntFrac.n} d={xIntFrac.d} />, 0)
                </MathLine>
              ) : (
                <MathLine>(x, y) = ({fmt(xInt as number)}, 0)</MathLine>
              )}
            </FormulaBlock>
          )}
        </CalcSection>

        {/* Graph */}
        <CalcSection title={`Graph of the line ${eqStr}`}>
          <LineGraph
            m={m}
            b={b}
            extraPoints={
              twoPoint
                ? [
                    { x: x1, y: y1, label: `P₁ (${fmt(x1)}, ${fmt(y1)})` },
                    {
                      x: twoPoint.x2,
                      y: twoPoint.y2,
                      label: `P₂ (${fmt(twoPoint.x2)}, ${fmt(twoPoint.y2)})`,
                    },
                  ]
                : []
            }
          />
        </CalcSection>

        {/* Standard Form */}
        <CalcSection title="Standard Form of a Linear Equation">
          <p className="text-foreground">
            Starting with <span className="font-serif italic">y = mx + b</span>, move the
            x-term to the left so the equation has the form{" "}
            <span className="font-serif italic">Ax + By = C</span>.
          </p>
          <FormulaBlock>
            <MathLine>y = mx + b</MathLine>
            <MathLine>
              y = {fmt(m)}x {sgn(b)} {absF(b)}
            </MathLine>
            <MathLine>
              {fmt(-m)}x + 1y = {fmt(b)}
            </MathLine>
            {asInt && (
              <MathLine>
                <strong>
                  {fmt(A)}x {B >= 0 ? "+" : "−"} {absF(B)}y = {fmt(C)}
                </strong>
              </MathLine>
            )}
          </FormulaBlock>
          <div className="mt-2 space-y-1 text-foreground">
            <MathLine>A = {fmt(A)}</MathLine>
            <MathLine>B = {fmt(B)}</MathLine>
            <MathLine>C = {fmt(C)}</MathLine>
          </div>
        </CalcSection>
      </StepsToggle>
    </div>
  );
}

/** Single master Show/Hide toggle that wraps all derivation sub-sections. */
function StepsToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        {open ? "Hide calculation steps" : "Show calculation steps"}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2 4l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && <div className="space-y-6">{children}</div>}
    </div>
  );
}


