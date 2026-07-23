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
import { ReferenceTable } from "@/components/ReferenceTable";

export const Route = createFileRoute("/calculators/math/unit-circle-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Unit Circle Calculator",
      title: "Unit Circle Calculator — Exact Sin, Cos, Tan",
      metaDescription:
        "Enter any angle in degrees or radians and get sin, cos, tan as exact radicals for 30°, 45°, 60° or decimals otherwise, with a diagram.",
      canonicalUrl: "/calculators/math/unit-circle-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Unit Circle Calculator", path: "/calculators/math/unit-circle-calculator" },
      ],
      faqs: [
        {
          q: "Why is tan undefined at 90° and 270°?",
          a: "Because tan θ = sin θ / cos θ, and at 90° and 270° the cosine is exactly 0. Division by zero is undefined, so tan blows up at those angles — the tangent line to the unit circle becomes vertical.",
        },
        {
          q: "How does the unit circle extend sine and cosine beyond right triangles?",
          a: "For any angle θ, drop the point (cos θ, sin θ) on the unit circle. Cos is the x-coordinate, sin is the y-coordinate — no triangle needed. That definition works for negative angles, angles above 90° and angles beyond 360°.",
        },
        {
          q: "Why do 30°, 45° and 60° have 'nice' exact values?",
          a: "They come from two special right triangles: the 45-45-90 (isoceles) and the 30-60-90 (half of an equilateral triangle). Their side ratios involve √2 and √3, which is where √2/2 and √3/2 come from on the unit circle.",
        },
        {
          q: "What are sec, csc and cot?",
          a: "They're the reciprocals of cos, sin and tan: sec θ = 1/cos θ, csc θ = 1/sin θ, cot θ = 1/tan θ. Each is undefined whenever its underlying function equals 0.",
        },
        {
          q: "What is a reference angle and why does it matter?",
          a: "The reference angle is the acute angle (between 0° and 90°) between the terminal side and the x-axis. It lets you find any angle's trig values from the first-quadrant values, just with a sign flip based on the quadrant.",
        },
      ],
    }),
  component: UnitCirclePage,
});

// ---------------- Exact-value table ----------------

interface ExactValues {
  sin: string;
  cos: string;
  tan: string | "undefined";
  sec: string;
  csc: string;
  cot: string;
  sinDec: number;
  cosDec: number;
  tanDec: number | null;
  secDec: number | null;
  cscDec: number | null;
  cotDec: number | null;
}

// Reciprocal of a known exact trig string ("0", "1", "1/2", "√2/2", "√3/2", "√3", "√3/3", "undefined")
function reciprocalExact(s: string): string {
  if (s === "0") return "undefined";
  if (s === "undefined") return "0";
  const neg = s.startsWith("−");
  const body = neg ? s.slice(1) : s;
  const MAP: Record<string, string> = {
    "1": "1",
    "1/2": "2",
    "√2/2": "√2",
    "√3/2": "2√3/3",
    "√3": "√3/3",
    "√3/3": "√3",
  };
  const out = MAP[body] ?? body;
  return neg ? "−" + out : out;
}

const SQRT2_2 = Math.SQRT2 / 2;
const SQRT3_2 = Math.sqrt(3) / 2;
const SQRT3 = Math.sqrt(3);
const SQRT3_3 = Math.sqrt(3) / 3;

// Map degree (0..330 step 30/45) → exact string forms (base sin/cos/tan)
interface ExactBase {
  sin: string;
  cos: string;
  tan: string | "undefined";
  sinDec: number;
  cosDec: number;
  tanDec: number | null;
}

const EXACT_BASE: Record<number, ExactBase> = {
  0:   { sin: "0",       cos: "1",       tan: "0",         sinDec: 0,        cosDec: 1,        tanDec: 0 },
  30:  { sin: "1/2",     cos: "√3/2",    tan: "√3/3",      sinDec: 0.5,      cosDec: SQRT3_2,  tanDec: SQRT3_3 },
  45:  { sin: "√2/2",    cos: "√2/2",    tan: "1",         sinDec: SQRT2_2,  cosDec: SQRT2_2,  tanDec: 1 },
  60:  { sin: "√3/2",    cos: "1/2",     tan: "√3",        sinDec: SQRT3_2,  cosDec: 0.5,      tanDec: SQRT3 },
  90:  { sin: "1",       cos: "0",       tan: "undefined", sinDec: 1,        cosDec: 0,        tanDec: null },
  120: { sin: "√3/2",    cos: "−1/2",    tan: "−√3",       sinDec: SQRT3_2,  cosDec: -0.5,     tanDec: -SQRT3 },
  135: { sin: "√2/2",    cos: "−√2/2",   tan: "−1",        sinDec: SQRT2_2,  cosDec: -SQRT2_2, tanDec: -1 },
  150: { sin: "1/2",     cos: "−√3/2",   tan: "−√3/3",     sinDec: 0.5,      cosDec: -SQRT3_2, tanDec: -SQRT3_3 },
  180: { sin: "0",       cos: "−1",      tan: "0",         sinDec: 0,        cosDec: -1,       tanDec: 0 },
  210: { sin: "−1/2",    cos: "−√3/2",   tan: "√3/3",      sinDec: -0.5,     cosDec: -SQRT3_2, tanDec: SQRT3_3 },
  225: { sin: "−√2/2",   cos: "−√2/2",   tan: "1",         sinDec: -SQRT2_2, cosDec: -SQRT2_2, tanDec: 1 },
  240: { sin: "−√3/2",   cos: "−1/2",    tan: "√3",        sinDec: -SQRT3_2, cosDec: -0.5,     tanDec: SQRT3 },
  270: { sin: "−1",      cos: "0",       tan: "undefined", sinDec: -1,       cosDec: 0,        tanDec: null },
  300: { sin: "−√3/2",   cos: "1/2",     tan: "−√3",       sinDec: -SQRT3_2, cosDec: 0.5,      tanDec: -SQRT3 },
  315: { sin: "−√2/2",   cos: "√2/2",    tan: "−1",        sinDec: -SQRT2_2, cosDec: SQRT2_2,  tanDec: -1 },
  330: { sin: "−1/2",    cos: "√3/2",    tan: "−√3/3",     sinDec: -0.5,     cosDec: SQRT3_2,  tanDec: -SQRT3_3 },
};

// Full exact table: base sin/cos/tan plus their reciprocals sec/csc/cot
const EXACT: Record<number, ExactValues> = Object.fromEntries(
  Object.entries(EXACT_BASE).map(([key, b]) => {
    const sec = reciprocalExact(b.cos);
    const csc = reciprocalExact(b.sin);
    const cot = reciprocalExact(b.tan);
    return [
      Number(key),
      {
        ...b,
        sec,
        csc,
        cot,
        secDec: b.cosDec === 0 ? null : 1 / b.cosDec,
        cscDec: b.sinDec === 0 ? null : 1 / b.sinDec,
        cotDec: b.tanDec === null ? 0 : b.tanDec === 0 ? null : 1 / b.tanDec,
      },
    ];
  }),
) as Record<number, ExactValues>;

const RADIAN_LABEL: Record<number, string> = {
  0: "0",
  30: "π/6",
  45: "π/4",
  60: "π/3",
  90: "π/2",
  120: "2π/3",
  135: "3π/4",
  150: "5π/6",
  180: "π",
  210: "7π/6",
  225: "5π/4",
  240: "4π/3",
  270: "3π/2",
  300: "5π/3",
  315: "7π/4",
  330: "11π/6",
};

function normalizeDeg(d: number): number {
  let n = d % 360;
  if (n < 0) n += 360;
  return n;
}

function fmt(n: number): string {
  if (Object.is(n, -0)) n = 0;
  return (Math.round(n * 1e6) / 1e6).toString();
}

interface QuadrantInfo {
  quadrant: 1 | 2 | 3 | 4 | 0; // 0 = on an axis
  referenceAngle: number;
  referenceFormula: string;
  signs: { sin: boolean; cos: boolean; tan: boolean };
}

function quadrantInfo(norm: number): QuadrantInfo {
  const onAxis = Math.abs(norm % 90) < 1e-9;
  if (onAxis) {
    const k = Math.round(norm / 90) % 4;
    const axisSigns = [
      { sin: false, cos: true, tan: false }, // 0°
      { sin: true, cos: false, tan: false }, // 90°
      { sin: false, cos: true, tan: false }, // 180°
      { sin: true, cos: false, tan: false }, // 270°
    ][k];
    return { quadrant: 0, referenceAngle: 0, referenceFormula: `θ is on an axis (${fmt(norm)}°)`, signs: axisSigns };
  }
  if (norm < 90) {
    return { quadrant: 1, referenceAngle: norm, referenceFormula: "θ (Q1)", signs: { sin: true, cos: true, tan: true } };
  }
  if (norm < 180) {
    return { quadrant: 2, referenceAngle: 180 - norm, referenceFormula: "180° − θ (Q2)", signs: { sin: true, cos: false, tan: false } };
  }
  if (norm < 270) {
    return { quadrant: 3, referenceAngle: norm - 180, referenceFormula: "θ − 180° (Q3)", signs: { sin: false, cos: false, tan: true } };
  }
  return { quadrant: 4, referenceAngle: 360 - norm, referenceFormula: "360° − θ (Q4)", signs: { sin: false, cos: true, tan: false } };
}

interface Computed {
  inputDeg: number;
  normDeg: number;
  radians: number;
  sinDec: number;
  cosDec: number;
  tanDec: number | null;
  secDec: number | null;
  cscDec: number | null;
  cotDec: number | null;
  exact?: ExactValues;
  referenceAngle: number;
  referenceFormula: string;
  quadrant: 1 | 2 | 3 | 4 | 0;
  signs: { sin: boolean; cos: boolean; tan: boolean };
  coterminalPlusDeg: number;
  coterminalMinusDeg: number;
  coterminalPlusRad: number;
  coterminalMinusRad: number;
}

function compute(angle: number, mode: "deg" | "rad"): Computed {
  const deg = mode === "deg" ? angle : (angle * 180) / Math.PI;
  const rad = mode === "rad" ? angle : (angle * Math.PI) / 180;
  const norm = normalizeDeg(deg);
  // Match to exact table if within tolerance
  let exact: ExactValues | undefined;
  for (const key of Object.keys(EXACT)) {
    const k = Number(key);
    if (Math.abs(norm - k) < 1e-9) {
      exact = EXACT[k];
      break;
    }
  }
  const cosDec = Math.cos(rad);
  const sinDec = Math.sin(rad);
  // tan undefined at 90 + 180k
  const isTanUndefined =
    Math.abs(Math.abs(((norm - 90) % 180 + 180) % 180)) < 1e-9;
  const tanDec = isTanUndefined ? null : Math.tan(rad);
  const secDec = Math.abs(cosDec) < 1e-12 ? null : 1 / cosDec;
  const cscDec = Math.abs(sinDec) < 1e-12 ? null : 1 / sinDec;
  const cotDec = tanDec === null ? 0 : Math.abs(tanDec) < 1e-12 ? null : 1 / tanDec;
  const q = quadrantInfo(norm);
  return {
    inputDeg: deg,
    normDeg: norm,
    radians: rad,
    sinDec,
    cosDec,
    tanDec,
    secDec,
    cscDec,
    cotDec,
    exact,
    referenceAngle: q.referenceAngle,
    referenceFormula: q.referenceFormula,
    quadrant: q.quadrant,
    signs: q.signs,
    coterminalPlusDeg: deg + 360,
    coterminalMinusDeg: deg - 360,
    coterminalPlusRad: rad + 2 * Math.PI,
    coterminalMinusRad: rad - 2 * Math.PI,
  };
}

// ---------------- SVG unit circle ----------------

function UnitCircleDiagram({ c }: { c: Computed }) {
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const r = 140;
  const rad = c.radians;
  const px = cx + r * Math.cos(rad);
  const py = cy - r * Math.sin(rad); // SVG y flipped

  const axisTicks = [
    { d: 0, x: cx + r, y: cy, label: "(1, 0)" },
    { d: 90, x: cx, y: cy - r, label: "(0, 1)" },
    { d: 180, x: cx - r, y: cy, label: "(−1, 0)" },
    { d: 270, x: cx, y: cy + r, label: "(0, −1)" },
  ];

  // Arc from 0° to θ (positive angle)
  const angleForArc = ((c.inputDeg % 360) + 360) % 360;
  const arcR = 34;
  const largeArc = angleForArc > 180 ? 1 : 0;
  const arcEndX = cx + arcR * Math.cos(rad);
  const arcEndY = cy - arcR * Math.sin(rad);
  const arcPath = `M ${cx + arcR} ${cy} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}`;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto w-full max-w-xs sm:max-w-sm"
      role="img"
      aria-label={`Unit circle with an angle of ${fmt(c.inputDeg)} degrees`}
    >
      {/* axes */}
      <line x1={20} x2={size - 20} y1={cy} y2={cy} className="stroke-border" strokeWidth={1} />
      <line x1={cx} x2={cx} y1={20} y2={size - 20} className="stroke-border" strokeWidth={1} />
      {/* circle */}
      <circle cx={cx} cy={cy} r={r} className="fill-none stroke-border" strokeWidth={1.5} />
      {/* axis labels */}
      {axisTicks.map((t) => (
        <text
          key={t.d}
          x={t.x + (t.d === 0 ? 6 : t.d === 180 ? -6 : 0)}
          y={t.y + (t.d === 90 ? -6 : t.d === 270 ? 14 : 4)}
          textAnchor={t.d === 0 ? "start" : t.d === 180 ? "end" : "middle"}
          fontSize={10}
          className="fill-muted-foreground"
        >
          {t.label}
        </text>
      ))}

      {/* projection lines (cos horizontal, sin vertical) */}
      <line
        x1={px}
        y1={py}
        x2={px}
        y2={cy}
        className="stroke-primary/70"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <line
        x1={px}
        y1={py}
        x2={cx}
        y2={py}
        className="stroke-primary/70"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />

      {/* radius line */}
      <line x1={cx} y1={cy} x2={px} y2={py} className="stroke-primary" strokeWidth={2} />

      {/* angle arc */}
      <path d={arcPath} className="fill-none stroke-primary" strokeWidth={1.5} />
      <text
        x={cx + 48 * Math.cos(rad / 2)}
        y={cy - 48 * Math.sin(rad / 2) + 4}
        textAnchor="middle"
        fontSize={11}
        className="fill-foreground"
        fontWeight={600}
      >
        θ
      </text>

      {/* point */}
      <circle cx={px} cy={py} r={5} className="fill-primary stroke-primary" strokeWidth={2} />
      <text
        x={px + (Math.cos(rad) >= 0 ? 8 : -8)}
        y={py + (Math.sin(rad) >= 0 ? -8 : 14)}
        textAnchor={Math.cos(rad) >= 0 ? "start" : "end"}
        fontSize={11}
        className="fill-foreground"
        fontWeight={600}
      >
        ({fmt(c.cosDec)}, {fmt(c.sinDec)})
      </text>

      {/* cos / sin labels on the projections */}
      <text
        x={(cx + px) / 2}
        y={cy + (py > cy ? -6 : 14)}
        textAnchor="middle"
        fontSize={10}
        className="fill-primary"
      >
        cos θ
      </text>
      <text
        x={px + (px > cx ? 6 : -6)}
        y={(cy + py) / 2}
        textAnchor={px > cx ? "start" : "end"}
        fontSize={10}
        className="fill-primary"
      >
        sin θ
      </text>
    </svg>
  );
}

// ---------------- Inverse trig tool ----------------

type InverseFn = "asin" | "acos" | "atan";

function InverseTrigTool() {
  const [fn, setFn] = useState<InverseFn>("asin");
  const [input, setInput] = useState("0.5");
  const [out, setOut] = useState<{ deg: number; rad: number } | null>(null);
  const [ierr, setIerr] = useState<string | null>(null);

  const label = fn === "asin" ? "arcsin" : fn === "acos" ? "arccos" : "arctan";

  const onCalc = () => {
    setIerr(null);
    setOut(null);
    const v = Number(input);
    if (!Number.isFinite(v)) {
      setIerr("Enter a numeric value.");
      return;
    }
    if ((fn === "asin" || fn === "acos") && (v < -1 || v > 1)) {
      setIerr(`${label} is only defined for inputs in [−1, 1].`);
      return;
    }
    const rad = fn === "asin" ? Math.asin(v) : fn === "acos" ? Math.acos(v) : Math.atan(v);
    setOut({ rad, deg: (rad * 180) / Math.PI });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <div className="flex rounded-xl border border-border/60 bg-secondary/30 p-1 text-sm">
          {(["asin", "acos", "atan"] as InverseFn[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFn(f)}
              className={
                "rounded-lg px-3 py-1.5 font-medium transition-colors " +
                (fn === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {f === "asin" ? "arcsin" : f === "acos" ? "arccos" : "arctan"}
            </button>
          ))}
        </div>
        <Field label="Value" htmlFor="inv-value">
          <TextInput
            id="inv-value"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
      </div>

      {ierr && <ErrorBox message={ierr} />}

      {out && (
        <ResultBox
          label={`${label}(${input})`}
          value={<span className="font-mono">{fmt(out.deg)}°</span>}
          note={`= ${fmt(out.rad)} rad`}
        />
      )}
    </div>
  );
}

// ---------------- Page ----------------

function UnitCirclePage() {
  const [mode, setMode] = useState<"deg" | "rad">("deg");
  const [value, setValue] = useState("60");
  const [result, setResult] = useState<Computed | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const referenceRows = useMemo(() => {
    const angles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
    return angles.map((d): ReactNode[] => {
      const ex = EXACT[d];
      return [
        `${d}°`,
        RADIAN_LABEL[d],
        ex.sin,
        ex.cos,
        ex.tan,
      ];
    });
  }, []);

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const s: Step[] = [
      {
        title: "Given",
        body: (
          <FormulaBlock>
            θ = {fmt(result.inputDeg)}°
          </FormulaBlock>
        ),
      },
      {
        title: "Formula — unit-circle definitions",
        body: (
          <FormulaWithLegend
            formula={
              <>
                rad = deg × π / 180; &nbsp; (cos θ, sin θ) is the point on the unit circle; &nbsp; tan θ = sin θ /
                cos θ; &nbsp; sec θ = 1 / cos θ; &nbsp; csc θ = 1 / sin θ; &nbsp; cot θ = cos θ / sin θ
              </>
            }
            legend={[
              { sym: "θ", def: "angle, in degrees or radians" },
              { sym: "cos θ, sin θ", def: "x- and y-coordinates on the unit circle" },
              { sym: "sec, csc, cot", def: "reciprocal trig functions" },
            ]}
          />
        ),
      },
      {
        title: "Substitute — convert to radians and normalize",
        body: (
          <FormulaBlock>
            {fmt(result.inputDeg)}° × π/180 = {fmt(result.radians)} rad; &nbsp; θ mod 360° = {fmt(result.normDeg)}°
          </FormulaBlock>
        ),
      },
    ];
    if (result.exact) {
      s.push({
        title: "Substitute — read exact reference values",
        body: (
          <FormulaBlock>
            sin θ = {result.exact.sin}, &nbsp; cos θ = {result.exact.cos}, &nbsp; tan θ = {result.exact.tan}
          </FormulaBlock>
        ),
      });
    } else {
      s.push({
        title: "Substitute — compute coordinates",
        body: (
          <FormulaBlock>
            (cos θ, sin θ) ≈ ({fmt(result.cosDec)}, {fmt(result.sinDec)})
          </FormulaBlock>
        ),
      });
    }
    s.push({
      title: "Answer — tangent",
      body:
        result.tanDec === null ? (
          <FormulaBlock>cos θ = 0 → tan θ is undefined</FormulaBlock>
        ) : (
          <FormulaBlock>
            tan θ = {fmt(result.sinDec)} / {fmt(result.cosDec)} ≈ {result.exact ? result.exact.tan : fmt(result.tanDec)}
          </FormulaBlock>
        ),
    });
    s.push({
      title: "Answer — secant",
      body:
        result.secDec === null ? (
          <FormulaBlock>sec θ = 1 / cos θ = 1 / 0 → undefined</FormulaBlock>
        ) : (
          <FormulaBlock>
            sec θ = 1 / cos θ = 1 / {fmt(result.cosDec)} ≈ {result.exact ? result.exact.sec : fmt(result.secDec)}
          </FormulaBlock>
        ),
    });
    s.push({
      title: "Answer — cosecant",
      body:
        result.cscDec === null ? (
          <FormulaBlock>csc θ = 1 / sin θ = 1 / 0 → undefined</FormulaBlock>
        ) : (
          <FormulaBlock>
            csc θ = 1 / sin θ = 1 / {fmt(result.sinDec)} ≈ {result.exact ? result.exact.csc : fmt(result.cscDec)}
          </FormulaBlock>
        ),
    });
    s.push({
      title: "Answer — cotangent",
      body:
        result.cotDec === null ? (
          <FormulaBlock>cot θ = cos θ / sin θ = {fmt(result.cosDec)} / 0 → undefined</FormulaBlock>
        ) : (
          <FormulaBlock>
            cot θ = cos θ / sin θ = {fmt(result.cosDec)} / {fmt(result.sinDec)} ≈{" "}
            {result.exact ? result.exact.cot : fmt(result.cotDec)}
          </FormulaBlock>
        ),
    });
    return s;
  }, [result]);

  const onCalc = () => {
    setErr(null);
    setResult(null);
    const v = Number(value);
    if (!Number.isFinite(v)) {
      setErr("Enter a numeric angle.");
      return;
    }
    setResult(compute(v, mode));
  };

  return (
    <MathCalcPage
      name="Unit Circle Calculator"
      tagline="Enter any angle in degrees or radians and read sin, cos and tan straight off the unit circle. Common angles like 30°, 45° and 60° are returned as exact radical values; other angles come back as decimals — with a labelled diagram showing the point (cos θ, sin θ) and its projections."
      extras={
        <>
<CalcSection title="What is the unit circle?">
            <p>
              The unit circle is the circle of radius 1 centred at the
              origin of the coordinate plane. Every point on it can be
              written as <span className="font-mono">(cos θ, sin θ)</span>,
              where θ is the angle measured counterclockwise from the
              positive x-axis. That single picture defines sine and
              cosine for every real angle — positive, negative or bigger
              than a full turn.
            </p>
          </CalcSection>

          <CalcSection title="How the unit circle produces sin, cos, tan — piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing this tool reads from the angle
              you pick — how the circle coordinates give cosine and sine,
              how tangent comes out as their ratio, and why certain
              reference angles have exact radical values instead of
              decimals.
            </p>
            <GuideCards items={UC_GUIDE} />
          </CalcSection>

          <CalcSection title="Reference table of common angles">
            <ReferenceTable
              caption="Sin, cos and tan for the 16 classic unit-circle angles"
              headers={["Degrees", "Radians", "sin θ", "cos θ", "tan θ"]}
              rows={referenceRows}
              numericColumns={[]}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Every entry in this table is exact — no rounding. Angles
              beyond 360° or below 0° reduce to one of these by adding
              or subtracting full turns.
            </p>
          </CalcSection>

          <CalcSection title="Inverse trig" collapsible defaultOpen={false}>
            <p className="text-sm text-muted-foreground">
              Go the other way: type a ratio and get the angle whose
              arcsine, arccosine or arctangent produces it.
            </p>
            <InverseTrigTool />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Switch between degrees and radians with a single toggle — no manual conversion needed",
                "Returns exact values (½, √2/2, √3/2, √3, …) for the 16 common unit-circle angles",
                "Falls back to accurate decimals for arbitrary angles, including angles > 360° or negatives",
                "Labelled SVG unit circle draws the terminal side, the point (cos θ, sin θ) and the sine/cosine projections",
                "Correctly flags tan as undefined at 90°, 270° and every 180° offset",
                "Full reference table of the classic 16 angles for quick lookup or memorisation",
                "Also returns sec, csc and cot θ as exact radicals or decimals, with undefined flagged correctly",
                "Shows the reference angle and the quadrant formula used to derive it",
                "Quadrant indicator with the ASTC sign chart for sin, cos and tan",
                "Coterminal angles (θ + 360° and θ − 360°) in both degrees and radians",
                "Built-in inverse trig tool: arcsin, arccos and arctan with domain checking",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Why is tan θ undefined at 90° and 270°?",
                  a: (
                    <p>
                      Because tan θ = sin θ / cos θ, and cos 90° = cos
                      270° = 0. Dividing by zero is undefined. On the
                      unit circle, the radius at 90° points straight up
                      — its slope is infinite, so tan blows up.
                    </p>
                  ),
                },
                {
                  q: "What about angles bigger than 360° or negative angles?",
                  a: (
                    <p>
                      Add or subtract multiples of 360° (or 2π) to bring
                      the angle into the range [0°, 360°). Sine, cosine
                      and tangent are periodic, so 400° gives the same
                      values as 40°, and −30° gives the same values as
                      330°. The calculator does this normalisation
                      automatically.
                    </p>
                  ),
                },
                {
                  q: "How do I convert between degrees and radians?",
                  a: (
                    <p className="font-mono">
                      radians = degrees × π / 180
                      <br />
                      degrees = radians × 180 / π
                    </p>
                  ),
                },
                {
                  q: "How does the unit circle extend trig beyond right triangles?",
                  a: (
                    <p>
                      Right-triangle definitions of sin and cos only
                      work for angles between 0° and 90°. The unit
                      circle uses coordinates instead — cos is the
                      x-coordinate of the point on the circle, sin is
                      the y-coordinate — so every real angle gets a
                      well-defined value, including obtuse and negative
                      ones.
                    </p>
                  ),
                },
                {
                  q: "What are sec, csc and cot θ?",
                  a: (
                    <p>
                      They're reciprocals: sec θ = 1/cos θ, csc θ = 1/sin θ,
                      cot θ = 1/tan θ. This calculator lists all three
                      alongside sin, cos and tan, and flags them as
                      undefined whenever the function they invert is 0.
                    </p>
                  ),
                },
                {
                  q: "What is the reference angle and the ASTC rule?",
                  a: (
                    <p>
                      The reference angle is the acute angle your terminal
                      side makes with the x-axis — 180° − θ in Quadrant II,
                      θ − 180° in Quadrant III, and 360° − θ in Quadrant IV.
                      ASTC ("All Students Take Calculus") is a memory aid
                      for which functions are positive in each quadrant:
                      All in Q1, Sin in Q2, Tan in Q3, Cos in Q4.
                    </p>
                  ),
                },
                {
                  q: "What are coterminal angles?",
                  a: (
                    <p>
                      Coterminal angles share the same terminal side because
                      they differ by a full turn — θ + 360° and θ − 360°
                      (or θ ± 2π in radians) always land on the same point
                      of the unit circle and give identical sin, cos and
                      tan values.
                    </p>
                  ),
                },
                {
                  q: "How do I find an angle from a trig ratio?",
                  a: (
                    <p>
                      Use the inverse functions: arcsin, arccos and arctan.
                      The tool above accepts any value and returns the
                      angle in both degrees and radians, and rejects
                      inputs outside [−1, 1] for arcsin/arccos since those
                      functions have a restricted domain.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/scientific-calculator", label: "Scientific Calculator" },
                { to: "/calculators/math/log-calculator", label: "Log Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter an angle and choose whether it's in degrees or radians.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Angle" htmlFor="angle">
            <TextInput
              id="angle"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
            />
          </Field>
          <div className="flex rounded-xl border border-border/60 bg-secondary/30 p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("deg")}
              className={
                "rounded-lg px-3 py-1.5 font-medium transition-colors " +
                (mode === "deg"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              Degrees
            </button>
            <button
              type="button"
              onClick={() => setMode("rad")}
              className={
                "rounded-lg px-3 py-1.5 font-medium transition-colors " +
                (mode === "rad"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              Radians
            </button>
          </div>
        </div>
        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <UnitCircleDiagram c={result} />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                θ = {fmt(result.inputDeg)}° = {fmt(result.radians)} rad
                {result.normDeg !== ((result.inputDeg % 360) + 360) % 360
                  ? null
                  : result.inputDeg !== result.normDeg
                  ? ` (equivalent to ${fmt(result.normDeg)}°)`
                  : ""}
              </p>
            </div>
            <div className="space-y-3">
              <ResultBox
                label="sin θ"
                value={
                  <span className="font-mono">
                    {result.exact ? result.exact.sin : fmt(result.sinDec)}
                  </span>
                }
                note={
                  result.exact
                    ? `Exact value · ≈ ${fmt(result.sinDec)}`
                    : "Decimal (no exact radical form for this angle)"
                }
              />
              <ResultBox
                label="cos θ"
                value={
                  <span className="font-mono">
                    {result.exact ? result.exact.cos : fmt(result.cosDec)}
                  </span>
                }
                note={
                  result.exact
                    ? `Exact value · ≈ ${fmt(result.cosDec)}`
                    : "Decimal (no exact radical form for this angle)"
                }
              />
              <ResultBox
                label="tan θ"
                value={
                  <span className="font-mono">
                    {result.tanDec === null
                      ? "undefined"
                      : result.exact
                      ? result.exact.tan
                      : fmt(result.tanDec)}
                  </span>
                }
                note={
                  result.tanDec === null
                    ? "cos θ = 0, so sin θ / cos θ is undefined"
                    : result.exact
                    ? `Exact value · ≈ ${fmt(result.tanDec)}`
                    : "Decimal (sin θ / cos θ)"
                }
              />
              <ResultBox
                label="sec θ"
                value={
                  <span className="font-mono">
                    {result.secDec === null
                      ? "undefined"
                      : result.exact
                      ? result.exact.sec
                      : fmt(result.secDec)}
                  </span>
                }
                note={
                  result.secDec === null
                    ? "cos θ = 0, so 1 / cos θ is undefined"
                    : result.exact
                    ? `Exact value (1/cos θ) · ≈ ${fmt(result.secDec)}`
                    : "Decimal (1 / cos θ)"
                }
              />
              <ResultBox
                label="csc θ"
                value={
                  <span className="font-mono">
                    {result.cscDec === null
                      ? "undefined"
                      : result.exact
                      ? result.exact.csc
                      : fmt(result.cscDec)}
                  </span>
                }
                note={
                  result.cscDec === null
                    ? "sin θ = 0, so 1 / sin θ is undefined"
                    : result.exact
                    ? `Exact value (1/sin θ) · ≈ ${fmt(result.cscDec)}`
                    : "Decimal (1 / sin θ)"
                }
              />
              <ResultBox
                label="cot θ"
                value={
                  <span className="font-mono">
                    {result.cotDec === null
                      ? "undefined"
                      : result.exact
                      ? result.exact.cot
                      : fmt(result.cotDec)}
                  </span>
                }
                note={
                  result.cotDec === null
                    ? "tan θ = 0, so 1 / tan θ is undefined"
                    : result.exact
                    ? `Exact value (1/tan θ) · ≈ ${fmt(result.cotDec)}`
                    : "Decimal (1 / tan θ)"
                }
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Reference angle</div>
              <div className="mt-1 font-serif text-xl font-semibold text-foreground">
                {fmt(result.referenceAngle)}°
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.quadrant === 0
                  ? result.referenceFormula
                  : <>Formula: <span className="font-mono">{result.referenceFormula}</span></>}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Quadrant</div>
              <div className="mt-1 font-serif text-xl font-semibold text-foreground">
                {result.quadrant === 0 ? "On an axis" : `Quadrant ${result.quadrant}`}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Positive here (ASTC):{" "}
                <span className="font-mono">
                  {[
                    result.signs.sin && "sin",
                    result.signs.cos && "cos",
                    result.signs.tan && "tan",
                  ]
                    .filter(Boolean)
                    .join(", ") || "none"}
                </span>
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-secondary/10 p-4 sm:col-span-2">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Coterminal angles</div>
              <p className="mt-1 font-mono text-sm text-foreground">
                θ + 360° = {fmt(result.coterminalPlusDeg)}° ({fmt(result.coterminalPlusRad)} rad) &nbsp;·&nbsp;
                θ − 360° = {fmt(result.coterminalMinusDeg)}° ({fmt(result.coterminalMinusRad)} rad)
              </p>
            </div>
          </div>

          <StepsToggle steps={steps} />
        </>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function CosSinMini() {
  const theta = 60 * Math.PI / 180;
  const r = 42;
  const cx = 100, cy = 60;
  const px = cx + r * Math.cos(theta);
  const py = cy - r * Math.sin(theta);
  return (
    <svg viewBox="0 0 200 120" className="w-full">
      <rect x="1" y="1" width="198" height="118" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <line x1="30" y1={cy} x2="170" y2={cy} stroke="var(--color-border)" />
      <line x1={cx} y1="15" x2={cx} y2="105" stroke="var(--color-border)" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="var(--color-primary)" strokeWidth="1.5" />
      <line x1={px} y1={cy} x2={px} y2={py} stroke="var(--color-foreground)" strokeDasharray="3 2" />
      <line x1={cx} y1={cy} x2={px} y2={cy} stroke="var(--color-foreground)" strokeDasharray="3 2" />
      <circle cx={px} cy={py} r="3" fill="var(--color-primary)" />
      <text x={px + 6} y={py - 4} fontSize="9" fill="var(--color-primary)">(cos θ, sin θ)</text>
      <text x={(cx + px) / 2} y={cy + 12} fontSize="9" fill="var(--color-muted-foreground)">cos θ</text>
      <text x={px + 4} y={(cy + py) / 2 + 3} fontSize="9" fill="var(--color-muted-foreground)">sin θ</text>
      <text x="100" y="115" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">x = cos θ · y = sin θ</text>
    </svg>
  );
}

function TanMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <text x="110" y="30" textAnchor="middle" fontSize="14" fill="var(--color-primary)">tan θ = sin θ / cos θ</text>
      <text x="110" y="58" textAnchor="middle" fontSize="11" fill="var(--color-foreground)">= slope of the radius line</text>
      <text x="110" y="82" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">undefined when cos θ = 0 (θ = 90°, 270°, …)</text>
    </svg>
  );
}

function ExactMini() {
  return (
    <svg viewBox="0 0 220 110" className="w-full">
      <rect x="1" y="1" width="218" height="108" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <polygon points="30,80 100,80 30,20" fill="color-mix(in srgb, var(--color-primary) 12%, transparent)" stroke="var(--color-primary)" />
      <text x="35" y="95" fontSize="9" fill="var(--color-muted-foreground)">1 : 1 : √2</text>
      <text x="60" y="55" fontSize="9" fill="var(--color-foreground)">45°</text>
      <polygon points="130,80 200,80 200,20" fill="color-mix(in srgb, var(--color-primary) 12%, transparent)" stroke="var(--color-primary)" />
      <text x="135" y="95" fontSize="9" fill="var(--color-muted-foreground)">1 : √3 : 2</text>
      <text x="180" y="55" fontSize="9" fill="var(--color-foreground)">30-60</text>
      <text x="110" y="18" textAnchor="middle" fontSize="10" fill="var(--color-primary)">two special triangles → all exact values</text>
    </svg>
  );
}

const UC_GUIDE: GuideCardItem[] = [
  {
    key: "coord",
    title: "Coordinates on the circle are (cos θ, sin θ)",
    explain: <>Walk counter-clockwise from the positive x-axis by angle θ. The x-coordinate of where you land is <span className="font-mono">cos θ</span> and the y-coordinate is <span className="font-mono">sin θ</span>. This is how the tool reads any angle.</>,
    formula: <>x² + y² = 1 · (x, y) = (cos θ, sin θ)</>,
    diagram: <CosSinMini />,
    example: {
      given: <span className="font-mono">θ = 60°</span>,
      substitute: <>walk 60° round the circle</>,
      answer: <span className="font-mono">(1/2, √3/2)</span>,
    },
  },
  {
    key: "tan",
    title: "Tangent as the ratio sin / cos",
    explain: <>Once the tool has sine and cosine, tangent falls out as their ratio — equivalently, the slope of the radius drawn from the origin to the point.</>,
    formula: <>tan θ = sin θ / cos θ</>,
    diagram: <TanMini />,
    example: {
      given: <span className="font-mono">θ = 60°</span>,
      substitute: <>(√3/2) / (1/2)</>,
      answer: <span className="font-mono">√3</span>,
    },
  },
  {
    key: "exact",
    title: "Why 30°/45°/60° come out as neat radicals",
    explain: <>The reference table entries are exact because two special right triangles (45-45-90 and 30-60-90) have simple radical side ratios. Reflecting those into every quadrant produces the 16 classic angles. Any other angle gives a decimal.</>,
    formula: <>45-45-90 → 1:1:√2 · 30-60-90 → 1:√3:2</>,
    diagram: <ExactMini />,
    example: {
      given: <span className="font-mono">θ = 45°</span>,
      substitute: <>from 1 : 1 : √2</>,
      answer: <span className="font-mono">sin = cos = √2/2</span>,
    },
  },
];
