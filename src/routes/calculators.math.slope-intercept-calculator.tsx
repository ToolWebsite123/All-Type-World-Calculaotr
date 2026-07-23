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
  FormulaBlock,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  type GuideCardItem,
} from "@/components/MathCalcPage";

export const Route = createFileRoute("/calculators/math/slope-intercept-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Slope-Intercept Form Calculator",
      title: "Slope-Intercept Calculator — y = mx + b from Two Points",
      metaDescription:
        "Enter two points, a point and slope, or a line equation to get y = mx + b, point-slope form, standard form, intercepts, distance, angle, and a graph.",
      canonicalUrl: "/calculators/math/slope-intercept-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Slope-Intercept Form Calculator",
          path: "/calculators/math/slope-intercept-calculator",
        },
      ],
      faqs: [
        {
          q: "What does a slope of zero mean?",
          a: "Zero slope means the line is perfectly horizontal — y never changes as x moves. The equation collapses to y = b, so every point on the line shares the same y value (the y-intercept).",
        },
        {
          q: "What is an undefined slope?",
          a: "Undefined slope happens when x₁ = x₂ — the two points sit on a vertical line. The slope formula divides by (x₂ − x₁), which becomes zero. Vertical lines can't be written as y = mx + b at all; they're written as x = constant.",
        },
        {
          q: "How do I convert to standard form?",
          a: "Starting from y = mx + b, move mx to the left: −mx + y = b, then multiply through so the leading coefficient is a positive integer if possible. The result Ax + By = C is the standard form.",
        },
      ],
    }),
  component: SlopeInterceptPage,
});

// ---------------- Math ----------------

type Mode = "two-points" | "point-slope" | "equation";

interface LineData {
  kind: "line";
  mode: Mode;
  m: number;
  b: number;
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
}
interface VerticalData {
  kind: "vertical";
  mode: Mode;
  x: number;
  y1: number;
  y2: number;
}
type Result = LineData | VerticalData;

const EPS = 1e-9;
function snap(v: number): number {
  return Math.abs(v) < EPS ? 0 : v;
}

function fmt(v: number): string {
  v = snap(v);
  if (!Number.isFinite(v)) return String(v);
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e10)) return v.toExponential(6);
  return Number(v.toPrecision(10)).toString();
}

function gcdI(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/** Continued-fraction rational approximation, capped denominator. */
function toRational(
  x: number,
  maxDen = 1000,
  tol = 1e-9,
): { n: number; d: number } | null {
  if (!Number.isFinite(x)) return null;
  const sign = x < 0 ? -1 : 1;
  let y = Math.abs(x);
  let h0 = 0,
    h1 = 1,
    k0 = 1,
    k1 = 0;
  let bVal = y;
  for (let i = 0; i < 64; i++) {
    const a = Math.floor(bVal);
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;
    if (k2 > maxDen) break;
    h0 = h1;
    h1 = h2;
    k0 = k1;
    k1 = k2;
    if (Math.abs(y - h1 / k1) < tol) return { n: sign * h1, d: k1 };
    const frac = bVal - a;
    if (Math.abs(frac) < 1e-15) break;
    bVal = 1 / frac;
  }
  if (k1 > 0 && Math.abs(y - h1 / k1) < tol) return { n: sign * h1, d: k1 };
  return null;
}

interface Standard {
  ok: boolean;
  A: number;
  B: number;
  C: number;
}

function standardForm(m: number, b: number): Standard {
  const rm = toRational(m);
  const rb = toRational(b);
  if (rm && rb) {
    const L = (rm.d * rb.d) / gcdI(rm.d, rb.d); // lcm
    let A = -rm.n * (L / rm.d);
    let B = L;
    let C = rb.n * (L / rb.d);
    A = Math.round(A);
    B = Math.round(B);
    C = Math.round(C);
    const g = gcdI(gcdI(A || 1, B || 1), C || 1);
    A = A / g;
    B = B / g;
    C = C / g;
    if (A < 0 || (A === 0 && B < 0)) {
      A = -A;
      B = -B;
      C = -C;
    }
    return { ok: true, A, B, C };
  }
  // Fallback decimal
  return { ok: false, A: -m, B: 1, C: b };
}

function formatStandardEq(sf: Standard): string {
  const { A, B, C } = sf;
  const aTerm =
    A === 0 ? "" : A === 1 ? "x" : A === -1 ? "−x" : `${fmt(A)}x`;
  let bTerm = "";
  if (B !== 0) {
    if (aTerm === "") {
      bTerm = B === 1 ? "y" : B === -1 ? "−y" : `${fmt(B)}y`;
    } else if (B > 0) {
      bTerm = B === 1 ? " + y" : ` + ${fmt(B)}y`;
    } else {
      bTerm = B === -1 ? " − y" : ` − ${fmt(-B)}y`;
    }
  }
  return `${aTerm}${bTerm} = ${fmt(C)}`;
}

/** Format "mx + b" nicely. */
function formatLine(m: number, b: number): string {
  const mPart =
    m === 0 ? "" : m === 1 ? "x" : m === -1 ? "−x" : `${fmt(m)}x`;
  if (m === 0) return `y = ${fmt(b)}`;
  if (b === 0) return `y = ${mPart}`;
  const sign = b > 0 ? "+" : "−";
  return `y = ${mPart} ${sign} ${fmt(Math.abs(b))}`;
}

function formatPointSlope(m: number, x1: number, y1: number): string {
  const lhs = y1 === 0 ? "y" : y1 > 0 ? `y − ${fmt(y1)}` : `y + ${fmt(-y1)}`;
  const inner =
    x1 === 0 ? "x" : x1 > 0 ? `x − ${fmt(x1)}` : `x + ${fmt(-x1)}`;
  const mPart =
    m === 1 ? `(${inner})` : m === -1 ? `−(${inner})` : `${fmt(m)}(${inner})`;
  return `${lhs} = ${mPart}`;
}

// -------------- Equation parser --------------

interface Term {
  coef: number;
  v: "x" | "y" | "";
}

function parseNumberToken(s: string): number {
  const t = s.trim();
  if (t === "" || t === "+") return 1;
  if (t === "-") return -1;
  const frac = t.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (frac) {
    const n = Number(frac[1]);
    const d = Number(frac[2]);
    if (d === 0 || !Number.isFinite(n) || !Number.isFinite(d))
      throw new Error(`Invalid coefficient "${s}".`);
    return n / d;
  }
  const v = Number(t);
  if (!Number.isFinite(v)) throw new Error(`Invalid coefficient "${s}".`);
  return v;
}

function parseTerms(sideRaw: string): Term[] {
  let s = sideRaw;
  if (s === "") throw new Error("Missing side of equation.");
  if (s[0] !== "+" && s[0] !== "-") s = "+" + s;
  const re = /([+-])([^+-]+)/g;
  const out: Term[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(s)) !== null) {
    const sign = match[1] === "-" ? -1 : 1;
    let body = match[2].replace(/\*/g, "");
    let v: "x" | "y" | "" = "";
    if (body.endsWith("x")) {
      v = "x";
      body = body.slice(0, -1);
    } else if (body.endsWith("y")) {
      v = "y";
      body = body.slice(0, -1);
    }
    const coef = parseNumberToken(body);
    out.push({ coef: sign * coef, v });
  }
  return out;
}

function parseEquation(
  raw: string,
): { m: number; b: number } | { vertical: number } {
  const s = raw.replace(/\s+/g, "").replace(/−/g, "-");
  if (!s.includes("=")) throw new Error("Equation must contain '='.");
  const parts = s.split("=");
  if (parts.length !== 2) throw new Error("Equation must contain exactly one '='.");
  const [lhs, rhs] = parts;
  const terms = parseTerms(lhs).concat(
    parseTerms(rhs).map((t) => ({ ...t, coef: -t.coef })),
  );
  let A = 0,
    B = 0,
    K = 0;
  for (const t of terms) {
    if (t.v === "x") A += t.coef;
    else if (t.v === "y") B += t.coef;
    else K += t.coef;
  }
  // Ax + By + K = 0
  A = snap(A);
  B = snap(B);
  K = snap(K);
  if (B === 0) {
    if (A === 0) throw new Error("Equation has no x or y term.");
    return { vertical: -K / A };
  }
  return { m: -A / B, b: -K / B };
}

// -------------- Normalization --------------

function needNum(fields: Record<string, string>, key: string, label: string): number {
  const s = fields[key];
  if (s === undefined || s.trim() === "") {
    throw new Error(
      `Please fill in all coordinate fields — ${label} is empty.`,
    );
  }
  const v = Number(s);
  if (!Number.isFinite(v)) throw new Error(`${label} is not a valid number.`);
  return v;
}

function normalize(mode: Mode, fields: Record<string, string>): Result {
  if (mode === "two-points") {
    const x1 = needNum(fields, "x1", "x₁");
    const y1 = needNum(fields, "y1", "y₁");
    const x2 = needNum(fields, "x2", "x₂");
    const y2 = needNum(fields, "y2", "y₂");
    if (x1 === x2 && y1 === y2)
      throw new Error(
        "The two points are identical — enter two different points.",
      );
    if (x1 === x2)
      return { kind: "vertical", mode, x: x1, y1, y2 };
    const m = snap((y2 - y1) / (x2 - x1));
    const b = snap(y1 - m * x1);
    return { kind: "line", mode, m, b, x1, y1, x2, y2 };
  }
  if (mode === "point-slope") {
    const x1 = needNum(fields, "x1", "x₁");
    const y1 = needNum(fields, "y1", "y₁");
    const m = snap(needNum(fields, "m", "m"));
    const b = snap(y1 - m * x1);
    return { kind: "line", mode, m, b, x1, y1 };
  }
  // equation
  const raw = fields.eq ?? "";
  if (raw.trim() === "") throw new Error("Please enter an equation.");
  const parsed = parseEquation(raw);
  if ("vertical" in parsed)
    return { kind: "vertical", mode, x: parsed.vertical, y1: 0, y2: 1 };
  const m = snap(parsed.m);
  const b = snap(parsed.b);
  return { kind: "line", mode, m, b, x1: 0, y1: b };
}

// ---------------- Diagram ----------------

function LineDiagram({
  line,
}: {
  line: LineData | { vertical: true; x: number; y1: number; y2: number };
}) {
  const W = 480;
  const H = 300;
  const PAD = 40;

  const vertical = "vertical" in line;
  const xs: number[] = [];
  const ys: number[] = [];
  let xInt: number | null = null;
  if (vertical) {
    xs.push(line.x, 0);
    ys.push(line.y1, line.y2, 0);
  } else {
    xs.push(line.x1, 0);
    ys.push(line.y1, line.b, 0);
    if (line.x2 !== undefined) xs.push(line.x2);
    if (line.y2 !== undefined) ys.push(line.y2);
    if (line.m !== 0) {
      xInt = -line.b / line.m;
      xs.push(xInt);
    }
  }
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xR = xMax - xMin || 1;
  const yR = yMax - yMin || 1;
  const xPad = xR * 0.25 || 1;
  const yPad = yR * 0.25 || 1;
  const xLo = xMin - xPad;
  const xHi = xMax + xPad;
  const yLo = yMin - yPad;
  const yHi = yMax + yPad;

  const px = (v: number) => PAD + ((v - xLo) / (xHi - xLo)) * (W - 2 * PAD);
  const py = (v: number) => H - PAD - ((v - yLo) / (yHi - yLo)) * (H - 2 * PAD);

  const axisColor = "var(--color-border)";
  const gridColor = "var(--color-border)";
  const lineColor = "var(--color-primary)";
  const pointColor = "var(--color-primary)";
  const yIntColor = "#f59e0b";
  const xIntColor = "#10b981";
  const textColor = "var(--color-foreground)";

  const zeroX = xLo <= 0 && xHi >= 0 ? px(0) : null;
  const zeroY = yLo <= 0 && yHi >= 0 ? py(0) : null;

  let lineEls: ReactNode = null;
  let yIntMarker: ReactNode = null;
  let xIntMarker: ReactNode = null;
  let pointMarkers: ReactNode = null;

  if (vertical) {
    const cx = px(line.x);
    lineEls = (
      <line x1={cx} y1={PAD} x2={cx} y2={H - PAD} stroke={lineColor} strokeWidth={2.5} />
    );
    pointMarkers = (
      <>
        <circle cx={cx} cy={py(line.y1)} r={5} fill={pointColor} />
        <circle cx={cx} cy={py(line.y2)} r={5} fill={pointColor} />
      </>
    );
  } else {
    const yAt = (xv: number) => line.m * xv + line.b;
    lineEls = (
      <line
        x1={px(xLo)}
        y1={py(yAt(xLo))}
        x2={px(xHi)}
        y2={py(yAt(xHi))}
        stroke={lineColor}
        strokeWidth={2.5}
      />
    );
    if (zeroX !== null && line.b >= yLo && line.b <= yHi) {
      yIntMarker = (
        <>
          <circle
            cx={zeroX}
            cy={py(line.b)}
            r={5}
            fill={yIntColor}
            stroke="var(--color-background)"
            strokeWidth={2}
          />
          <text
            x={zeroX + 8}
            y={py(line.b) - 6}
            fill={yIntColor}
            fontSize={11}
            fontFamily="monospace"
            fontWeight="bold"
          >
            (0, {fmt(line.b)})
          </text>
        </>
      );
    }
    if (
      xInt !== null &&
      zeroY !== null &&
      xInt >= xLo &&
      xInt <= xHi
    ) {
      xIntMarker = (
        <>
          <rect
            x={px(xInt) - 5}
            y={zeroY - 5}
            width={10}
            height={10}
            fill={xIntColor}
            stroke="var(--color-background)"
            strokeWidth={2}
          />
          <text
            x={px(xInt) + 8}
            y={zeroY - 6}
            fill={xIntColor}
            fontSize={11}
            fontFamily="monospace"
            fontWeight="bold"
          >
            ({fmt(xInt)}, 0)
          </text>
        </>
      );
    }
    pointMarkers = (
      <>
        <circle cx={px(line.x1)} cy={py(line.y1)} r={5} fill={pointColor} />
        <text
          x={px(line.x1) + 8}
          y={py(line.y1) - 6}
          fill={textColor}
          fontSize={11}
          fontFamily="monospace"
        >
          ({fmt(line.x1)}, {fmt(line.y1)})
        </text>
        {line.x2 !== undefined && line.y2 !== undefined && (
          <>
            <circle cx={px(line.x2)} cy={py(line.y2)} r={5} fill={pointColor} />
            <text
              x={px(line.x2) + 8}
              y={py(line.y2) - 6}
              fill={textColor}
              fontSize={11}
              fontFamily="monospace"
            >
              ({fmt(line.x2)}, {fmt(line.y2)})
            </text>
          </>
        )}
      </>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={
          vertical
            ? "Graph of the vertical line"
            : "Graph of the computed line with y-intercept and x-intercept marked"
        }
      >
        <rect
          x={PAD}
          y={PAD}
          width={W - 2 * PAD}
          height={H - 2 * PAD}
          fill="none"
          stroke={axisColor}
          strokeWidth={1}
        />
        {zeroX !== null && (
          <line
            x1={zeroX}
            y1={PAD}
            x2={zeroX}
            y2={H - PAD}
            stroke={gridColor}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        )}
        {zeroY !== null && (
          <line
            x1={PAD}
            y1={zeroY}
            x2={W - PAD}
            y2={zeroY}
            stroke={gridColor}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        )}
        {lineEls}
        {yIntMarker}
        {xIntMarker}
        {pointMarkers}
        <text
          x={W - PAD}
          y={H - PAD + 16}
          fill="var(--color-muted-foreground)"
          fontSize={11}
          textAnchor="end"
        >
          x
        </text>
        <text
          x={PAD - 6}
          y={PAD + 4}
          fill="var(--color-muted-foreground)"
          fontSize={11}
          textAnchor="end"
        >
          y
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="inline-block h-0.5 w-4 align-middle bg-[var(--color-primary)]" />{" "}
          line
        </span>
        <span>
          <span className="inline-block h-2 w-2 rounded-full align-middle bg-[var(--color-primary)]" />{" "}
          points
        </span>
        {!vertical && (
          <>
            <span>
              <span className="inline-block h-2 w-2 rounded-full align-middle bg-[#f59e0b]" />{" "}
              y-intercept
            </span>
            <span>
              <span className="inline-block h-2 w-2 align-middle bg-[#10b981]" />{" "}
              x-intercept
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------- Sections ----------------

function AnswerReport({ line }: { line: LineData }) {
  const { m, b, x1, y1, x2, y2, mode } = line;
  const sf = standardForm(m, b);
  const stdEq = sf.ok ? formatStandardEq(sf) : `${fmt(-m)}x + y = ${fmt(b)}`;
  const hasTwoPoints = mode === "two-points" && x2 !== undefined && y2 !== undefined;
  const dx = hasTwoPoints ? (x2 as number) - x1 : 0;
  const dy = hasTwoPoints ? (y2 as number) - y1 : 0;
  const dist = hasTwoPoints ? Math.hypot(dx, dy) : 0;
  const thetaRad = Math.atan(m);
  const thetaDeg = (thetaRad * 180) / Math.PI;

  const xIntExists = m !== 0;
  const xInt = xIntExists ? -b / m : NaN;

  return (
    <>
      {hasTwoPoints && (
        <CalcSection title="Slope, Distance, and Angle">
          <p className="text-sm text-muted-foreground">
            With two points, we can also compute the distance between them and
            the angle the line makes with the x-axis.
          </p>
          <FormulaBlock>
            Δx = x₂ − x₁ = {fmt(x2 as number)} − {fmt(x1)} = {fmt(dx)}
            <br />
            Δy = y₂ − y₁ = {fmt(y2 as number)} − {fmt(y1)} = {fmt(dy)}
            <br />
            m = Δy / Δx = {fmt(dy)} / {fmt(dx)} = {fmt(m)}
            <br />
            d = √(Δx² + Δy²) = √({fmt(dx * dx)} + {fmt(dy * dy)}) = {fmt(dist)}
            <br />
            θ = atan(m) = {fmt(thetaDeg)}° ({fmt(thetaRad)} rad)
          </FormulaBlock>
        </CalcSection>
      )}

      <CalcSection title="Answer">
        <ResultBox
          label="Equation of the line"
          value={<span className="font-serif italic">{formatLine(m, b)}</span>}
          note={
            <>
              <div>Slope m = {fmt(m)}, y-intercept b = {fmt(b)}.</div>
              <div>
                y-intercept point: (0, {fmt(b)})
                {" · "}
                {xIntExists
                  ? `x-intercept point: (${fmt(xInt)}, 0)`
                  : "no x-intercept (horizontal line)"}
              </div>
              {hasTwoPoints && (
                <div>
                  Distance between the two points: {fmt(dist)} · Angle of
                  incline: {fmt(thetaDeg)}° ({fmt(thetaRad)} rad)
                </div>
              )}
            </>
          }
        />
      </CalcSection>

      <CalcSection title="Point-Slope Form">
        <p className="text-sm text-muted-foreground">
          Using the point ({fmt(x1)}, {fmt(y1)}) and slope m = {fmt(m)}.
        </p>
        <FormulaBlock>
          y − y₁ = m(x − x₁)
          <br />
          {formatPointSlope(m, x1, y1)}
        </FormulaBlock>
      </CalcSection>

      <CalcSection title="Slope-Intercept Form">
        <p className="text-sm text-muted-foreground">
          Expand the point-slope form and solve for y.
        </p>
        <FormulaBlock>
          y − y₁ = m(x − x₁)
          <br />
          y − {fmt(y1)} = {fmt(m)}(x − {fmt(x1)})
          <br />
          y − {fmt(y1)} = {fmt(m)}x − ({fmt(m)} × {fmt(x1)})
          <br />
          y − {fmt(y1)} = {fmt(m)}x − {fmt(m * x1)}
          <br />
          y = {fmt(m)}x − {fmt(m * x1)} + {fmt(y1)}
          <br />
          y = {fmt(m)}x + {fmt(b)}
        </FormulaBlock>
        <p className="text-sm">
          So slope <strong>m = {fmt(m)}</strong> and y-intercept{" "}
          <strong>b = {fmt(b)}</strong>. Final equation:{" "}
          <span className="font-serif italic">{formatLine(m, b)}</span>.
        </p>
      </CalcSection>

      <CalcSection title="Y-Intercept, when x = 0">
        <FormulaBlock>
          y = mx + b
          <br />
          y = {fmt(m)}(0) + {fmt(b)}
          <br />
          y = {fmt(b)}
        </FormulaBlock>
        <p className="text-sm">
          y-intercept: <strong>{fmt(b)}</strong>. In coordinates:{" "}
          <span className="font-serif italic">(x, y) = (0, {fmt(b)})</span>.
        </p>
      </CalcSection>

      <CalcSection title="X-Intercept, when y = 0">
        {xIntExists ? (
          <>
            <FormulaBlock>
              0 = mx + b
              <br />
              mx = −b
              <br />
              x = −b / m
              <br />
              x = −({fmt(b)}) / ({fmt(m)})
              <br />
              x = {fmt(xInt)}
            </FormulaBlock>
            <p className="text-sm">
              x-intercept: <strong>{fmt(xInt)}</strong>. In coordinates:{" "}
              <span className="font-serif italic">(x, y) = ({fmt(xInt)}, 0)</span>.
              <br />
              In decimals: (x, y) = ({(Math.round(xInt * 1e5) / 1e5).toString()}
              , 0)
            </p>
          </>
        ) : (
          <p className="text-sm">
            This line is horizontal (m = 0) and has no x-intercept — it never
            crosses the x-axis (unless b = 0, in which case the line{" "}
            <em>is</em> the x-axis).
          </p>
        )}
      </CalcSection>

      <CalcSection title="Graph of the line y = mx + b">
        <LineDiagram line={line} />
      </CalcSection>

      <CalcSection title="Standard Form of a Linear Equation">
        <p className="text-sm text-muted-foreground">
          Rearrange y = mx + b so the x and y terms are on the same side.
        </p>
        <FormulaBlock>
          y = mx + b
          <br />
          −mx + y = b
          <br />
          {sf.ok ? (
            <>
              (multiply through to clear fractions and make A ≥ 0)
              <br />
              {formatStandardEq(sf)}
            </>
          ) : (
            <>
              {fmt(-m)}x + y = {fmt(b)}
            </>
          )}
        </FormulaBlock>
        <ul className="mt-2 space-y-1 text-sm font-serif italic">
          <li>A = {fmt(sf.A)}</li>
          <li>B = {fmt(sf.B)}</li>
          <li>C = {fmt(sf.C)}</li>
        </ul>
      </CalcSection>
    </>
  );
}

function VerticalReport({ v }: { v: VerticalData }) {
  return (
    <>
      <CalcSection title="Answer">
        <ResultBox
          label="Vertical line — no slope-intercept form"
          value={<span className="font-serif italic">x = {fmt(v.x)}</span>}
          note="Both points share the same x, so the slope is undefined. Vertical lines are written as x = constant instead of y = mx + b."
        />
      </CalcSection>
      <CalcSection title="Point-Slope Form (vertical case)">
        <p className="text-sm">
          A vertical line has an <strong>undefined slope</strong>: the run
          (x₂ − x₁) is zero, and dividing by zero is not defined. Because
          point-slope form <span className="font-serif italic">y − y₁ = m(x − x₁)</span>{" "}
          needs a numeric m, vertical lines cannot be written in point-slope
          form either. Instead, we describe every point on the line by fixing
          x: <span className="font-serif italic">x = {fmt(v.x)}</span>. The y value is
          free — it can be anything.
        </p>
      </CalcSection>
      <CalcSection title="Slope-Intercept & Standard Form (vertical case)">
        <p className="text-sm">
          The line <span className="font-serif italic">x = {fmt(v.x)}</span> cannot be
          written as <span className="font-serif italic">y = mx + b</span> — there is
          no single b, because the line does not cross the y-axis at a single
          y value (unless {fmt(v.x)} = 0, in which case it <em>is</em> the
          y-axis). In standard form we can still write it as{" "}
          <span className="font-serif italic">1·x + 0·y = {fmt(v.x)}</span>.
        </p>
      </CalcSection>
      <CalcSection title="Graph of the vertical line">
        <LineDiagram line={{ vertical: true, x: v.x, y1: v.y1, y2: v.y2 }} />
      </CalcSection>
    </>
  );
}

// ---------------- Page ----------------

function SlopeInterceptPage() {
  const [mode, setMode] = useState<Mode>("two-points");
  const [x1s, setX1s] = useState("1");
  const [y1s, setY1s] = useState("2");
  const [x2s, setX2s] = useState("4");
  const [y2s, setY2s] = useState("11");
  const [ms, setMs] = useState("3");
  const [eq, setEq] = useState("y = 3x - 1");
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setResult(null);
    try {
      const fields: Record<string, string> = {
        x1: x1s,
        y1: y1s,
        x2: x2s,
        y2: y2s,
        m: ms,
        eq,
      };
      setResult(normalize(mode, fields));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <MathCalcPage
      name="Slope-Intercept Form Calculator"
      tagline="Enter two points, a point and a slope, or a line equation. Get y = mx + b, point-slope form, standard form, both intercepts, distance, angle, and a full graph."
      extras={
        <>
          <CalcSection title="What does slope-intercept form tell you?">
            <p>
              The equation <strong>y = mx + b</strong> packs two facts about a
              straight line into two numbers:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>m — the slope.</strong> How steep the line is, and
                which way it tilts. A positive m rises left-to-right, a
                negative m falls, and m = 0 is flat.
              </li>
              <li>
                <strong>b — the y-intercept.</strong> Where the line crosses
                the y-axis, at (0, b).
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Slope-intercept form, piece by piece">
            <GuideCards items={SI_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Three input modes: two points, one point + slope, or a line equation (y = mx + b or Ax + By = C)",
                "Computes slope m, y-intercept b, and x-intercept (with a clean note when the line is horizontal)",
                "For two-point input, also shows distance between the points and the angle of incline in degrees and radians",
                "Shows the same line in point-slope form and standard (Ax + By = C) form with a proper rational approximation — no huge ugly numbers for slopes like 4/3 or 1/6",
                "Detects vertical lines (x₁ = x₂) and explains why they can't be written as y = mx + b",
                "Interactive SVG graph with both intercepts marked in distinct colors",
                "Full step-by-step working laid out in named sections: Answer, Point-Slope, Slope-Intercept expansion, Y-Intercept, X-Intercept, Graph, Standard Form",
              ]}
            />
          </CalcSection>

          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What does a slope of zero mean?",
                  a: (
                    <p>
                      Zero slope means the line is perfectly horizontal — y
                      never changes as x moves. The equation collapses to y = b.
                    </p>
                  ),
                },
                {
                  q: "What does undefined slope mean?",
                  a: (
                    <p>
                      Undefined slope happens when the two points sit on a
                      vertical line (x₁ = x₂). The slope formula divides by
                      zero. Such lines are written x = constant instead of y =
                      mx + b.
                    </p>
                  ),
                },
                {
                  q: "Does it matter which point I call (x₁, y₁)?",
                  a: (
                    <p>
                      No. Swap them and both numerator and denominator of the
                      slope formula change sign, so m is unchanged.
                    </p>
                  ),
                },
                {
                  q: "How do I convert to standard form?",
                  a: (
                    <p>
                      Starting from y = mx + b, move mx to the left to get
                      −mx + y = b, then multiply through by a common factor so
                      A, B, and C are integers and A ≥ 0.
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
                  to: "/calculators/math/simultaneous-equations-calculator",
                  label: "Simultaneous Equations Solver",
                },
                {
                  to: "/calculators/math/distance-calculator",
                  label: "Distance Calculator",
                },
                {
                  to: "/calculators/math/interpolation-calculator",
                  label: "Interpolation Calculator",
                },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["two-points", "Two Points"],
              ["point-slope", "Point + Slope"],
              ["equation", "Equation"],
            ] as [Mode, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id);
                setResult(null);
                setErr(null);
              }}
              aria-pressed={mode === id}
              className={
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors " +
                (mode === id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background/60 text-muted-foreground hover:border-primary/40")
              }
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "two-points" && (
          <>
            <div>
              <div className="mb-2 text-sm text-muted-foreground">
                First point (x₁, y₁)
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="x₁" htmlFor="x1">
                  <TextInput
                    id="x1"
                    value={x1s}
                    onChange={(e) => setX1s(e.target.value)}
                    inputMode="decimal"
                  />
                </Field>
                <Field label="y₁" htmlFor="y1">
                  <TextInput
                    id="y1"
                    value={y1s}
                    onChange={(e) => setY1s(e.target.value)}
                    inputMode="decimal"
                  />
                </Field>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm text-muted-foreground">
                Second point (x₂, y₂)
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="x₂" htmlFor="x2">
                  <TextInput
                    id="x2"
                    value={x2s}
                    onChange={(e) => setX2s(e.target.value)}
                    inputMode="decimal"
                  />
                </Field>
                <Field label="y₂" htmlFor="y2">
                  <TextInput
                    id="y2"
                    value={y2s}
                    onChange={(e) => setY2s(e.target.value)}
                    inputMode="decimal"
                  />
                </Field>
              </div>
            </div>
          </>
        )}

        {mode === "point-slope" && (
          <div>
            <div className="mb-2 text-sm text-muted-foreground">
              Point (x₁, y₁) and slope m
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="x₁" htmlFor="ps-x1">
                <TextInput
                  id="ps-x1"
                  value={x1s}
                  onChange={(e) => setX1s(e.target.value)}
                  inputMode="decimal"
                />
              </Field>
              <Field label="y₁" htmlFor="ps-y1">
                <TextInput
                  id="ps-y1"
                  value={y1s}
                  onChange={(e) => setY1s(e.target.value)}
                  inputMode="decimal"
                />
              </Field>
              <Field label="m (slope)" htmlFor="ps-m">
                <TextInput
                  id="ps-m"
                  value={ms}
                  onChange={(e) => setMs(e.target.value)}
                  inputMode="decimal"
                />
              </Field>
            </div>
          </div>
        )}

        {mode === "equation" && (
          <Field
            label="Line equation"
            htmlFor="eq"
            hint="Accepts y = mx + b (e.g. y = 3x - 1) or Ax + By = C (e.g. 3x - y = 1). Fractions allowed, e.g. y = 4/3 x + 2."
          >
            <TextInput
              id="eq"
              value={eq}
              onChange={(e) => setEq(e.target.value)}
            />
          </Field>
        )}

        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && result.kind === "line" && (
        <div className="mt-6 space-y-6">
          <AnswerReport line={result} />
        </div>
      )}

      {result && result.kind === "vertical" && (
        <div className="mt-6 space-y-6">
          <VerticalReport v={result} />
        </div>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function TwoPointsMini() {
  return (
    <svg
      viewBox="0 0 220 110"
      className="w-full"
      role="img"
      aria-label="Diagram showing two points on axes and the rise-over-run between them"
    >
      <rect
        x="1"
        y="1"
        width="218"
        height="108"
        rx="10"
        fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)"
        stroke="var(--color-border)"
      />
      <line x1="20" y1="20" x2="20" y2="95" stroke="var(--color-border)" />
      <line x1="20" y1="95" x2="205" y2="95" stroke="var(--color-border)" />
      <line
        x1="30"
        y1="80"
        x2="180"
        y2="25"
        stroke="var(--color-primary)"
        strokeWidth="2"
      />
      <circle cx="55" cy="70" r="4" fill="var(--color-primary)" />
      <circle cx="160" cy="32" r="4" fill="var(--color-primary)" />
      <line
        x1="55"
        y1="70"
        x2="160"
        y2="70"
        stroke="var(--color-muted-foreground)"
        strokeDasharray="3 3"
      />
      <line
        x1="160"
        y1="70"
        x2="160"
        y2="32"
        stroke="var(--color-muted-foreground)"
        strokeDasharray="3 3"
      />
      <text
        x="107"
        y="82"
        textAnchor="middle"
        fontSize="9"
        fill="var(--color-muted-foreground)"
      >
        run
      </text>
      <text x="170" y="55" fontSize="9" fill="var(--color-muted-foreground)">
        rise
      </text>
    </svg>
  );
}

function ThreeFormsMini() {
  return (
    <svg
      viewBox="0 0 220 110"
      className="w-full"
      role="img"
      aria-label="Three equivalent forms of a linear equation: slope-intercept, point-slope, and standard"
    >
      <rect
        x="1"
        y="1"
        width="218"
        height="108"
        rx="10"
        fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)"
        stroke="var(--color-border)"
      />
      {["y = mx + b", "y − y₁ = m(x − x₁)", "Ax + By = C"].map((t, i) => (
        <g key={i}>
          <rect
            x="18"
            y={12 + i * 30}
            width="184"
            height="24"
            rx="6"
            fill="color-mix(in srgb, var(--color-primary) 10%, transparent)"
            stroke="var(--color-primary)"
          />
          <text
            x="110"
            y={28 + i * 30}
            textAnchor="middle"
            fontSize="11"
            fill="var(--color-foreground)"
            fontFamily="monospace"
          >
            {t}
          </text>
        </g>
      ))}
    </svg>
  );
}

function VerticalMini() {
  return (
    <svg
      viewBox="0 0 220 110"
      className="w-full"
      role="img"
      aria-label="A vertical line with two points sharing the same x value and undefined slope"
    >
      <rect
        x="1"
        y="1"
        width="218"
        height="108"
        rx="10"
        fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)"
        stroke="var(--color-border)"
      />
      <line x1="20" y1="15" x2="20" y2="95" stroke="var(--color-border)" />
      <line x1="20" y1="95" x2="205" y2="95" stroke="var(--color-border)" />
      <line
        x1="120"
        y1="18"
        x2="120"
        y2="92"
        stroke="var(--color-primary)"
        strokeWidth="2"
      />
      <circle cx="120" cy="30" r="4" fill="var(--color-primary)" />
      <circle cx="120" cy="75" r="4" fill="var(--color-primary)" />
      <text
        x="120"
        y="107"
        textAnchor="middle"
        fontSize="10"
        fill="var(--color-foreground)"
        fontFamily="monospace"
      >
        x = 3
      </text>
      <text x="165" y="55" fontSize="9" fill="var(--color-destructive)">
        slope undefined
      </text>
    </svg>
  );
}

const SI_GUIDE: GuideCardItem[] = [
  {
    key: "two-points",
    title: "From two points to y = mx + b",
    explain: (
      <>
        Slope m is the rise over the run between the two points. The intercept
        b comes from plugging either point into y = mx + b and solving.
      </>
    ),
    formula: <>m = (y₂ − y₁)/(x₂ − x₁) · b = y₁ − m·x₁</>,
    diagram: <TwoPointsMini />,
    example: {
      given: <span className="font-serif italic">(1, 2) and (4, 11)</span>,
      substitute: <>m = 9/3 = 3 · b = 2 − 3·1</>,
      answer: <span className="font-serif italic">y = 3x − 1</span>,
    },
  },
  {
    key: "three-forms",
    title: "Three ways to write the same line",
    explain: (
      <>
        Slope-intercept, point-slope, and standard form describe the same line
        rearranged. The calculator shows all three — pick whichever your
        problem uses.
      </>
    ),
    formula: <>y = mx + b ⇔ y − y₁ = m(x − x₁) ⇔ Ax + By = C</>,
    diagram: <ThreeFormsMini />,
    example: {
      given: <span className="font-serif italic">y = 3x − 1</span>,
      substitute: <>y − 2 = 3(x − 1)</>,
      answer: <span className="font-serif italic">3x − y = 1</span>,
    },
  },
  {
    key: "vertical",
    title: "Vertical lines don't fit y = mx + b",
    explain: (
      <>
        When x₁ = x₂ the slope formula divides by zero. The calculator reports
        the line as x = constant instead of pretending m exists.
      </>
    ),
    formula: <>x₁ = x₂ ⇒ line is x = x₁ (slope undefined)</>,
    diagram: <VerticalMini />,
    example: {
      given: <span className="font-serif italic">(3, 1) and (3, 7)</span>,
      substitute: <>same x on both points</>,
      answer: <span className="font-serif italic">x = 3</span>,
    },
  },
];
