import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  StackedMath,
  GuideCards,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { ReferenceTable } from "@/components/ReferenceTable";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import {
  solveCosineLawSide,
  solveCosineLawAngle,
  isValidTriangleSides,
} from "@/lib/math/geometry-shared";

/* ================= Angle unit + helpers ================= */

type AngleUnit = "deg" | "rad";
type Mode = "SAS" | "SSS";

const PI = Math.PI;
const toRad = (v: number, u: AngleUnit) => (u === "deg" ? (v * PI) / 180 : v);
const fromRad = (v: number, u: AngleUnit) => (u === "deg" ? (v * 180) / PI : v);
const suffix = (u: AngleUnit) => (u === "deg" ? "°" : " rad");

const LENGTH_UNITS = ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"] as const;
type LengthUnit = (typeof LENGTH_UNITS)[number];

function fmt(n: number, sig = 5): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-6) return n.toExponential(Math.max(2, sig - 2));
  return Number(n.toPrecision(Math.max(1, sig))).toString();
}

function MathLine({ children }: { children: ReactNode }) {
  return (
    <div className="my-1 flex items-center justify-center text-center font-serif text-[15px] italic text-foreground">
      <span className="inline-flex flex-col items-center gap-1">
        <StackedMath>{children}</StackedMath>
      </span>
    </div>
  );
}

/* ================= Solver ================= */

interface Solution {
  A: number; B: number; C: number; // radians
  a: number; b: number; c: number;
  area: number;
  perimeter: number;
  semiperimeter: number;
  inradius: number;
  circumradius: number;
  steps: Step[];
}

function angleTxt(rad: number, unit: AngleUnit) {
  return `${fmt(fromRad(rad, unit))}${suffix(unit)}`;
}

function finalize(
  Ar: number, Br: number, Cr: number,
  a: number, b: number, c: number,
  steps: Step[],
): Solution {
  const s = (a + b + c) / 2;
  // Heron's formula, guarded against negative floating drift.
  const heron = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
  const R = (a * b * c) / (4 * heron);
  const r = heron / s;
  return {
    A: Ar, B: Br, C: Cr, a, b, c,
    area: heron, perimeter: a + b + c, semiperimeter: s,
    inradius: r, circumradius: R,
    steps,
  };
}

/** SAS: two sides (a, b) and the included angle C between them → third side c. */
function solveSAS(a: number, b: number, Cr: number, unit: AngleUnit): Solution {
  const c = solveCosineLawSide(a, b, Cr);
  const Ar = solveCosineLawAngle(a, b, c);
  const Br = PI - Ar - Cr;
  return finalize(Ar, Br, Cr, a, b, c, [
    {
      title: "Detected SAS — two sides and the included angle C",
      body: (
        <>
          <MathLine>c² = a² + b² − 2ab · cos C</MathLine>
        </>
      ),
    },
    {
      title: "Third side c by the law of cosines",
      body: (
        <>
          <MathLine>c² = {fmt(a)}² + {fmt(b)}² − 2 · {fmt(a)} · {fmt(b)} · cos({angleTxt(Cr, unit)})</MathLine>
          <MathLine>c² = {fmt(c * c)}</MathLine>
          <MathLine>c = √{fmt(c * c)} = {fmt(c)}</MathLine>
        </>
      ),
    },
    {
      title: "Angle A by the rearranged law of cosines",
      body: (
        <>
          <MathLine>cos A = (b² + c² − a²) / (2bc)</MathLine>
          <MathLine>A = arccos({fmt(Math.cos(Ar))}) = {angleTxt(Ar, unit)}</MathLine>
        </>
      ),
    },
    {
      title: "Angle B by the angle-sum rule",
      body: <MathLine>B = 180° − A − C = {angleTxt(Br, unit)}</MathLine>,
    },
  ]);
}

/** SSS: three sides → all three angles. */
function solveSSS(a: number, b: number, c: number, unit: AngleUnit): Solution {
  const Ar = solveCosineLawAngle(a, b, c);
  const Br = solveCosineLawAngle(b, a, c);
  const Cr = PI - Ar - Br;
  return finalize(Ar, Br, Cr, a, b, c, [
    {
      title: "Detected SSS — three sides given",
      body: <MathLine>cos(angle) = (adjacent² + adjacent² − opposite²) / (2 · adjacent · adjacent)</MathLine>,
    },
    {
      title: "Angle A opposite side a",
      body: (
        <>
          <MathLine>cos A = (b² + c² − a²) / (2bc)</MathLine>
          <MathLine>cos A = ({fmt(b * b)} + {fmt(c * c)} − {fmt(a * a)}) / (2 · {fmt(b)} · {fmt(c)})</MathLine>
          <MathLine>A = arccos({fmt((b * b + c * c - a * a) / (2 * b * c))}) = {angleTxt(Ar, unit)}</MathLine>
        </>
      ),
    },
    {
      title: "Angle B opposite side b",
      body: (
        <>
          <MathLine>cos B = (a² + c² − b²) / (2ac)</MathLine>
          <MathLine>B = arccos({fmt((a * a + c * c - b * b) / (2 * a * c))}) = {angleTxt(Br, unit)}</MathLine>
        </>
      ),
    },
    {
      title: "Angle C by the angle-sum rule",
      body: <MathLine>C = 180° − A − B = {angleTxt(Cr, unit)}</MathLine>,
    },
  ]);
}

/* ================= Scaled diagram ================= */

function TriangleSVG({ sol, unit, lu }: { sol: Solution; unit: AngleUnit; lu: LengthUnit }) {
  const { a, b, c, A: Aang, B: Bang, C: Cang } = sol;
  // Place B at origin, C along +x at distance a. A determined by angle B.
  const Ax = c * Math.cos(Bang);
  const Ay = c * Math.sin(Bang);
  const pts = [
    { x: 0, y: 0 },      // B
    { x: a, y: 0 },      // C
    { x: Ax, y: Ay },    // A
  ];
  const maxX = Math.max(...pts.map((p) => p.x));
  const minX = Math.min(...pts.map((p) => p.x));
  const maxY = Math.max(...pts.map((p) => p.y));
  const spanX = Math.max(1e-9, maxX - minX);
  const spanY = Math.max(1e-9, maxY);
  const W = 380, H = 240, pad = 42;
  const scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
  const proj = (p: { x: number; y: number }) => ({
    x: pad + (p.x - minX) * scale,
    y: H - pad - p.y * scale,
  });
  const P = pts.map(proj);
  const [pB, pC, pA] = P;

  const mid = (p: { x: number; y: number }, q: { x: number; y: number }) => ({
    x: (p.x + q.x) / 2, y: (p.y + q.y) / 2,
  });
  const mBC = mid(pB, pC);
  const mCA = mid(pC, pA);
  const mAB = mid(pA, pB);

  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-md">
        <polygon
          points={`${pA.x},${pA.y} ${pB.x},${pB.y} ${pC.x},${pC.y}`}
          className="fill-primary/10 stroke-primary"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <text x={pA.x} y={pA.y - 10} textAnchor="middle" fontSize="14" className="fill-foreground/80">A</text>
        <text x={pB.x - 10} y={pB.y + 16} textAnchor="middle" fontSize="14" className="fill-foreground/80">B</text>
        <text x={pC.x + 10} y={pC.y + 16} textAnchor="middle" fontSize="14" className="fill-foreground/80">C</text>
        <text x={mBC.x} y={mBC.y + 18} textAnchor="middle" fontSize="12" fontStyle="italic" className="fill-foreground">a = {fmt(a)} {lu}</text>
        <text x={mCA.x + 14} y={mCA.y} textAnchor="start" fontSize="12" fontStyle="italic" className="fill-foreground">b = {fmt(b)} {lu}</text>
        <text x={mAB.x - 14} y={mAB.y} textAnchor="end" fontSize="12" fontStyle="italic" className="fill-foreground">c = {fmt(c)} {lu}</text>
        <text x={pA.x} y={pA.y + 18} textAnchor="middle" fontSize="11" fontStyle="italic" className="fill-primary">A={angleTxt(Aang, unit)}</text>
        <text x={pB.x + 14} y={pB.y - 4} textAnchor="start" fontSize="11" fontStyle="italic" className="fill-primary">B={angleTxt(Bang, unit)}</text>
        <text x={pC.x - 14} y={pC.y - 4} textAnchor="end" fontSize="11" fontStyle="italic" className="fill-primary">C={angleTxt(Cang, unit)}</text>
      </svg>
      <div className="mt-1 text-center text-xs text-muted-foreground">
        Drawn to scale from the solved side lengths.
      </div>
    </div>
  );
}

/* ================= Component ================= */

function LawOfCosinesPage() {
  const [mode, setMode] = useState<Mode>("SAS");
  const [unit, setUnit] = useState<AngleUnit>("deg");
  const [lu, setLu] = useState<LengthUnit>("cm");
  const [sig, setSig] = useState(5);

  const [aSide, setASide] = useState("");
  const [bSide, setBSide] = useState("");
  const [cSide, setCSide] = useState("");
  const [Cval, setCval] = useState(""); // included angle for SAS

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Solution | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const parse = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };

  const onCalc = () => {
    setError(null);
    setResult(null);
    try {
      if (mode === "SAS") {
        const a = parse(aSide), b = parse(bSide), C = parse(Cval);
        if (![a, b, C].every(Number.isFinite)) throw new Error("Enter sides a, b and the included angle C.");
        if (a <= 0 || b <= 0) throw new Error("Sides must be positive.");
        if (C <= 0) throw new Error("Included angle must be greater than 0.");
        const Cr = toRad(C, unit);
        if (Cr >= PI - 1e-12) throw new Error("Included angle must be less than 180° (or π rad).");
        setResult(solveSAS(a, b, Cr, unit));
      } else {
        const a = parse(aSide), b = parse(bSide), c = parse(cSide);
        if (![a, b, c].every(Number.isFinite)) throw new Error("Enter all three sides a, b and c.");
        if (a <= 0 || b <= 0 || c <= 0) throw new Error("Sides must be positive.");
        if (!isValidTriangleSides(a, b, c))
          throw new Error("Triangle inequality violated — the two shorter sides must sum to more than the longest side. These three lengths can't form a triangle.");
        setResult(solveSSS(a, b, c, unit));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const clearAll = () => {
    setASide(""); setBSide(""); setCSide(""); setCval("");
    setError(null); setResult(null);
  };

  const copyText = () => {
    if (!result) return "";
    const s = result;
    return [
      "Law of Cosines Calculator",
      `A = ${angleTxt(s.A, unit)}   B = ${angleTxt(s.B, unit)}   C = ${angleTxt(s.C, unit)}`,
      `a = ${fmt(s.a, sig)} ${lu}   b = ${fmt(s.b, sig)} ${lu}   c = ${fmt(s.c, sig)} ${lu}`,
      `Perimeter = ${fmt(s.perimeter, sig)} ${lu}   Semiperimeter s = ${fmt(s.semiperimeter, sig)} ${lu}`,
      `Area = ${fmt(s.area, sig)} ${lu}²`,
      `Circumradius R = ${fmt(s.circumradius, sig)} ${lu}   Inradius r = ${fmt(s.inradius, sig)} ${lu}`,
    ].join("\n");
  };

  return (
    <MathCalcPage
      name="Law of Cosines Calculator"
      tagline="Solve SAS (two sides + the included angle) or SSS (three sides) with c² = a² + b² − 2ab·cos C — plus area, perimeter, inradius, circumradius and a scaled diagram."
      extras={<PageExtras />}
    >
      {/* Mode picker */}
      <Field label="Which values do you know?" htmlFor="loc-mode">
        <div className="flex flex-wrap gap-2" id="loc-mode">
          {([
            { m: "SAS", t: "Two sides + the angle between (SAS)" },
            { m: "SSS", t: "Three sides (SSS)" },
          ] as { m: Mode; t: string }[]).map(({ m, t }) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setResult(null); setError(null); }}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (mode === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent")
              }
            >
              {t}
            </button>
          ))}
        </div>
      </Field>

      {/* Unit / precision controls */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Angle unit">
          <div className="flex flex-wrap gap-2">
            {(["deg", "rad"] as AngleUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (unit === u
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-accent")
                }
              >
                {u === "deg" ? "Degrees (°)" : "Radians (π)"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Length unit (display only)" hint="Only labels the answer — math is unit-agnostic.">
          <select
            value={lu}
            onChange={(e) => setLu(e.target.value as LengthUnit)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {LENGTH_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>
        <Field label="Significant figures">
          <select
            value={sig}
            onChange={(e) => setSig(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {[3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Mode-specific inputs */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {mode === "SAS" ? (
          <>
            <Field label={`Side a (${lu})`} hint="First side of the included angle">
              <TextInput value={aSide} onChange={(e) => setASide(e.target.value)} inputMode="decimal" placeholder="8" />
            </Field>
            <Field label={`Side b (${lu})`} hint="Second side of the included angle">
              <TextInput value={bSide} onChange={(e) => setBSide(e.target.value)} inputMode="decimal" placeholder="11" />
            </Field>
            <Field label={`Included angle C (${unit})`} hint="The angle between a and b">
              <TextInput value={Cval} onChange={(e) => setCval(e.target.value)} inputMode="decimal" placeholder={unit === "deg" ? "37" : "0.6458"} />
            </Field>
          </>
        ) : (
          <>
            <Field label={`Side a (${lu})`}>
              <TextInput value={aSide} onChange={(e) => setASide(e.target.value)} inputMode="decimal" placeholder="7" />
            </Field>
            <Field label={`Side b (${lu})`}>
              <TextInput value={bSide} onChange={(e) => setBSide(e.target.value)} inputMode="decimal" placeholder="9" />
            </Field>
            <Field label={`Side c (${lu})`}>
              <TextInput value={cSide} onChange={(e) => setCSide(e.target.value)} inputMode="decimal" placeholder="12" />
            </Field>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={onCalc}>Solve triangle</PrimaryButton>
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Clear
        </button>
        <span className="text-xs text-muted-foreground">
          Uses c² = a² + b² − 2ab · cos C.
        </span>
      </div>

      {error && <ErrorBox message={error} />}

      {result && (
        <div ref={captureRef} className="mt-6 space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Solved triangle</div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="A" value={angleTxt(result.A, unit)} />
              <Stat label="B" value={angleTxt(result.B, unit)} />
              <Stat label="C" value={angleTxt(result.C, unit)} />
              <Stat label={`a (${lu})`} value={fmt(result.a, sig)} />
              <Stat label={`b (${lu})`} value={fmt(result.b, sig)} />
              <Stat label={`c (${lu})`} value={fmt(result.c, sig)} />
              <Stat label={`Perimeter (${lu})`} value={fmt(result.perimeter, sig)} />
              <Stat label={`Semiperimeter s (${lu})`} value={fmt(result.semiperimeter, sig)} />
              <Stat label={`Area (${lu}²)`} value={fmt(result.area, sig)} />
              <Stat label={`Circumradius R (${lu})`} value={fmt(result.circumradius, sig)} />
              <Stat label={`Inradius r (${lu})`} value={fmt(result.inradius, sig)} />
            </div>
          </div>

          <TriangleSVG sol={result} unit={unit} lu={lu} />

          <StepsToggle steps={result.steps} />

          <ResultActions
            getCopyText={copyText}
            captureRef={captureRef}
            filename="law-of-cosines"
          />
        </div>
      )}
    </MathCalcPage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-base italic tabular-nums text-foreground">{value}</div>
    </div>
  );
}

/* ================= Mini diagrams for GuideCards ================= */

function MiniTri({ variant = "sas" }: { variant?: "sas" | "sss" | "altitude" }) {
  const A = { x: 30, y: 150 };
  const B = { x: 270, y: 150 };
  const C = { x: 170, y: 30 };
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <svg viewBox="0 0 300 190" className="mx-auto block h-auto w-full max-w-xs">
        {variant === "altitude" && (
          <line x1={C.x} y1={C.y} x2={C.x} y2={A.y} className="stroke-primary" strokeWidth="1.5" strokeDasharray="4 3" />
        )}
        <polygon
          points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          className="fill-primary/10 stroke-primary"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <text x={A.x - 6} y={A.y + 16} fontSize="12" className="fill-foreground/70">A</text>
        <text x={B.x + 6} y={B.y + 16} fontSize="12" className="fill-foreground/70">B</text>
        <text x={C.x - 4} y={C.y - 6} fontSize="12" className="fill-foreground/70">C</text>
        <text x={(A.x + B.x) / 2} y={A.y + 16} fontSize="11" fontStyle="italic" className="fill-foreground">c</text>
        <text x={(B.x + C.x) / 2 + 6} y={(B.y + C.y) / 2} fontSize="11" fontStyle="italic" className="fill-foreground">a</text>
        <text x={(A.x + C.x) / 2 - 12} y={(A.y + C.y) / 2} fontSize="11" fontStyle="italic" className="fill-foreground">b</text>
        {variant === "sas" && (
          <text x={C.x} y={C.y + 22} textAnchor="middle" fontSize="10" fontStyle="italic" className="fill-primary">C (known)</text>
        )}
      </svg>
    </div>
  );
}

/* ================= Educational content ================= */

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is the law of cosines?",
    a: "The law of cosines relates the three sides of any triangle to the cosine of one of its angles: c² = a² + b² − 2ab · cos C. Rearranged, it also lets you recover any angle from all three sides: cos C = (a² + b² − c²) / (2ab). It works for every triangle — acute, right or obtuse — and reduces to the Pythagorean theorem when the included angle is exactly 90°.",
  },
  {
    q: "When should I use the law of cosines instead of the law of sines?",
    a: "Reach for the law of cosines when your known values do not pair a side with its opposite angle — that's SAS (two sides plus the angle between them) and SSS (all three sides). The law of sines needs a matched side–angle pair to anchor the ratio, so it can't get started in those cases. Use the law of sines for ASA, AAS and the SSA ambiguous case instead.",
  },
  {
    q: "How does the law of cosines relate to the Pythagorean theorem?",
    a: "It's a direct generalisation. When C = 90°, cos C = 0 and the −2ab · cos C term vanishes, leaving c² = a² + b² — exactly Pythagoras. For C < 90° the extra term is subtracted and c is shorter than the Pythagorean prediction; for C > 90° cos C is negative, the extra term adds, and c is longer. The law of cosines simply corrects Pythagoras by an amount that depends on how far the included angle is from a right angle.",
  },
  {
    q: "What does a negative cosine result mean?",
    a: "It means the angle is obtuse — larger than 90°. arccos maps positive cosines to acute angles (0–90°) and negative cosines to obtuse angles (90°–180°), so seeing cos A = −0.42 tells you A ≈ 114.8°. There is no ambiguity in the SSS or SAS cases: each side gives one and only one angle, so the sign of the cosine is enough to identify obtuse triangles.",
  },
  {
    q: "Why is my SSS triangle rejected as invalid?",
    a: "Because the three lengths violate the triangle inequality: the sum of the two shorter sides must be strictly greater than the longest side. If side c ≥ a + b, the two shorter sides can't close the gap to form a triangle — no set of angles will work. The calculator checks this before running arccos so you get a clear message instead of a NaN.",
  },
  {
    q: "Where does the −2ab · cos C term come from?",
    a: "From the vector identity |c|² = |b − a|² = |b|² − 2 a · b + |a|², where a · b = |a| |b| cos C is the dot product of the two side vectors meeting at C. Written with side lengths, that's c² = a² + b² − 2ab cos C. The proofs section on this page walks through the same result three other ways — dropping an altitude, placing the triangle in coordinates and using Ptolemy on a cyclic quadrilateral.",
  },
];

const GUIDE: GuideCardItem[] = [
  {
    key: "sas",
    title: "SAS — two sides and the angle between them",
    explain:
      "When you know two sides and the angle they form at their common vertex, the law of cosines gives you the third side in a single step. Square the two known sides, subtract 2ab · cos C, and take the square root.",
    formula: <>c² = a² + b² − 2ab · cos C</>,
    legend: [
      { sym: "a, b", def: "the two known sides" },
      { sym: "C", def: "the included angle between a and b" },
      { sym: "c", def: "the side opposite C — the unknown" },
    ],
    diagram: <MiniTri variant="sas" />,
    example: {
      given: <>a = 8, b = 11, C = 37°</>,
      substitute: <>c² = 8² + 11² − 2·8·11·cos 37° = 64 + 121 − 140.579</>,
      answer: <>c ≈ 6.667; A ≈ 46.29°, B ≈ 96.71°</>,
    },
  },
  {
    key: "sss",
    title: "SSS — three sides",
    explain:
      "When all three sides are known, rearrange the law of cosines to solve for each angle. Apply it twice (once for A, once for B) and close the triangle with the angle-sum rule. The triangle inequality is checked first so impossible inputs are caught immediately.",
    formula: <>cos A = (b² + c² − a²) / (2bc)</>,
    legend: [
      { sym: "a, b, c", def: "the three known sides" },
      { sym: "A", def: "angle opposite side a" },
    ],
    diagram: <MiniTri variant="sss" />,
    example: {
      given: <>a = 7, b = 9, c = 12</>,
      substitute: <>cos A = (81 + 144 − 49) / (2·9·12) = 176/216 ≈ 0.8148</>,
      answer: <>A ≈ 35.42°, B ≈ 48.19°, C ≈ 96.38°</>,
    },
  },
  {
    key: "obtuse",
    title: "Reading a negative cosine",
    explain:
      "arccos returns values from 0° to 180°, so a positive cosine gives an acute angle and a negative cosine gives an obtuse one. In SSS this is how you spot an obtuse triangle without any extra work — the biggest side always sits opposite the biggest angle, and its cosine sign tells you whether that angle is under or over 90°.",
    formula: <>cos θ &lt; 0 &nbsp;⇔&nbsp; θ &gt; 90°</>,
    legend: [
      { sym: "θ", def: "any interior angle" },
    ],
    diagram: <MiniTri variant="sss" />,
    example: {
      given: <>a = 5, b = 6, c = 10</>,
      substitute: <>cos C = (25 + 36 − 100) / (2·5·6) = −39/60 = −0.65</>,
      answer: <>C ≈ 130.54° — clearly obtuse.</>,
    },
  },
  {
    key: "right",
    title: "The Pythagorean special case",
    explain:
      "Set C = 90° in the law of cosines. cos 90° = 0, so the −2ab · cos C term drops out and you're left with c² = a² + b² — exactly the Pythagorean theorem. That's the sanity check: any law-of-cosines answer on a right triangle should reduce to Pythagoras.",
    formula: <>C = 90° &nbsp;⇒&nbsp; c² = a² + b²</>,
    legend: [
      { sym: "C", def: "included angle = 90°" },
    ],
    diagram: <MiniTri variant="altitude" />,
    example: {
      given: <>a = 3, b = 4, C = 90°</>,
      substitute: <>c² = 9 + 16 − 24 · 0 = 25</>,
      answer: <>c = 5 (the familiar 3-4-5 triple).</>,
    },
  },
];

function PageExtras() {
  return (
    <>
      <CalcSection title="What is the law of cosines?">
        <p>
          The <strong>law of cosines</strong> — sometimes called the cosine rule
          — is the generalisation of the Pythagorean theorem to <em>every</em>
          {" "}triangle, not just right ones. For any triangle with sides
          <em> a</em>, <em>b</em>, <em>c</em> and the angle{" "}
          <em>C</em> opposite side <em>c</em>:
        </p>
        <FormulaBlock>c² = a² + b² − 2ab · cos C</FormulaBlock>
        <p>
          It handles the two cases where the law of sines can't get started:{" "}
          <strong>SAS</strong> (you know two sides and the angle between them,
          and want the third side), and <strong>SSS</strong> (you know all
          three sides and want the angles). Once one angle is out, the other
          two follow from a second application of the same rule and the 180°
          angle-sum rule.
        </p>
      </CalcSection>

      <CalcSection title="Law of cosines, case by case">
        <GuideCards items={GUIDE} />
      </CalcSection>

      <CalcSection title="Law of sines vs. law of cosines — when to use which">
        <ReferenceTable
          headers={["You know…", "Use", "Why"]}
          rows={[
            [<>Two sides + included angle (SAS)</>, "Law of cosines", "Direct formula for the third side; no matched side–angle pair for the sine ratio."],
            [<>Three sides (SSS)</>, "Law of cosines", "Rearranged form gives each angle from its opposite side and the two adjacent ones."],
            [<>Two angles + included side (ASA)</>, <>Law of sines (see <a className="text-primary underline underline-offset-4 hover:no-underline" href="/calculators/math/law-of-sines-calculator">Law of Sines Calculator</a>)</>, "Third angle from angle-sum; then a/sin A = b/sin B ratios."],
            [<>Two angles + non-included side (AAS)</>, "Law of sines", "The known side is opposite one of the known angles."],
            [<>Two sides + non-included angle (SSA)</>, "Law of sines (ambiguous)", "Handled with explicit no / one / two triangle classification."],
            [<>One angle = 90°</>, <>Right-triangle trig (<a className="text-primary underline underline-offset-4 hover:no-underline" href="/calculators/math/right-triangle-calculator">Right Triangle Calculator</a>)</>, "Faster with sine/cosine/tangent and the Pythagorean theorem."],
          ]}
        />
      </CalcSection>

      <CalcSection title="Proofs">
        <p>
          Four independent ways to arrive at c² = a² + b² − 2ab · cos C.
          Each starts from a different piece of geometry, and they all
          reduce to the same identity — a useful reminder that the law of
          cosines is a genuine theorem of Euclidean geometry, not just a
          convenient formula.
        </p>

        <div className="mt-4 space-y-4">
          <ProofCard title="(a) Trigonometric proof — drop an altitude">
            <p>
              Drop the altitude <em>h</em> from vertex A onto side <em>a</em>
              {" "}(= BC), meeting it at foot F. This splits the triangle into
              two right triangles sharing the leg <em>h</em>.
            </p>
            <MathLine>h = b · sin C &nbsp;and&nbsp; CF = b · cos C</MathLine>
            <MathLine>BF = a − b · cos C</MathLine>
            <p>Apply the Pythagorean theorem to the right triangle ABF:</p>
            <MathLine>c² = h² + BF²</MathLine>
            <MathLine>c² = (b · sin C)² + (a − b · cos C)²</MathLine>
            <MathLine>c² = b² sin²C + a² − 2ab · cos C + b² cos²C</MathLine>
            <MathLine>c² = a² + b² (sin²C + cos²C) − 2ab · cos C</MathLine>
            <MathLine>c² = a² + b² − 2ab · cos C</MathLine>
            <p className="text-muted-foreground">
              The Pythagorean identity sin²C + cos²C = 1 collapses the two
              trig terms into a single b². The proof works unchanged when C
              is obtuse — the foot F just lands outside segment BC and the
              sign takes care of itself.
            </p>
          </ProofCard>

          <ProofCard title="(b) Distance-formula proof — place the triangle in coordinates">
            <p>
              Put vertex C at the origin and side a along the positive
              x-axis, so B = (a, 0). Vertex A sits at angle C from the
              x-axis at distance b, so A = (b · cos C, b · sin C).
            </p>
            <p>The side c is the distance from A to B:</p>
            <MathLine>c² = (a − b · cos C)² + (0 − b · sin C)²</MathLine>
            <MathLine>c² = a² − 2ab · cos C + b² cos²C + b² sin²C</MathLine>
            <MathLine>c² = a² + b² − 2ab · cos C</MathLine>
            <p className="text-muted-foreground">
              Same identity, no picture-drawing needed — just the
              distance formula and sin² + cos² = 1.
            </p>
          </ProofCard>

          <ProofCard title="(c) Ptolemy's theorem — via a cyclic quadrilateral">
            <p>
              Inscribe triangle ABC in its circumscribed circle. Reflect
              vertex A across the perpendicular bisector of BC to get a
              fourth point A′ on the circle, forming the cyclic
              quadrilateral A′BAC. By construction A′C = c and A′B = b, so
              the diagonals are the chord AA′ and the side BC = a.
            </p>
            <p>
              Ptolemy's theorem for a cyclic quadrilateral says the product
              of the diagonals equals the sum of the products of opposite
              sides. Applying the extended law of sines (AA′ = 2R · sin ∠ABA′)
              and expanding ∠ABA′ = ∠ABC + ∠A′BC gives, after simplifying
              with sin(x + y) = sin x cos y + cos x sin y:
            </p>
            <MathLine>c² = a² + b² − 2ab · cos C</MathLine>
            <p className="text-muted-foreground">
              Ptolemy's theorem is itself a corollary of the inscribed-angle
              theorem, so this route grounds the law of cosines directly in
              circle geometry.
            </p>
          </ProofCard>

          <ProofCard title="(d) Vector / dot-product proof">
            <p>
              Treat the sides as vectors from vertex C: let
              <strong> a</strong> point to B and <strong>b</strong> point to A.
              Then the side c runs from A to B, so as vectors{" "}
              <strong>c</strong> = <strong>a</strong> − <strong>b</strong>.
            </p>
            <p>Take the dot product of c with itself:</p>
            <MathLine>|c|² = c · c = (a − b) · (a − b)</MathLine>
            <MathLine>|c|² = a · a − 2 (a · b) + b · b</MathLine>
            <MathLine>|c|² = |a|² + |b|² − 2 |a| |b| cos C</MathLine>
            <p>
              Since |a| = a, |b| = b and |c| = c are the side lengths, that's
              exactly c² = a² + b² − 2ab · cos C. The −2ab · cos C term is
              literally the dot product of the two side vectors meeting at C.
            </p>
          </ProofCard>
        </div>
      </CalcSection>

      <CalcSection title="Where you'll actually use it">
        <div className="space-y-3">
          <p>
            <strong>Surveying and triangulation.</strong> Land surveyors
            frequently know the distance to two landmarks and the angle
            between the sight lines but not the distance between the
            landmarks themselves. That's a textbook SAS setup — the law of
            cosines gives the missing distance in one calculation without
            planting a physical baseline between the two points.
          </p>
          <p>
            <strong>Navigation.</strong> If a ship or aircraft knows its
            distances to two known reference stations and the angle between
            them, it can compute the direct distance between the stations
            or triangulate its own position from three ranges. GPS receivers
            do a three-dimensional version of exactly this every time they
            fix a position from satellite ranges.
          </p>
          <p>
            <strong>Resultant forces in physics.</strong> Two forces acting
            at a common point form the two sides of a parallelogram; the
            resultant is the diagonal. The law of cosines gives its
            magnitude directly from |F₁|, |F₂| and the angle between them
            — no vector decomposition required. The same trick handles
            velocities, momenta and any other vector quantities that
            combine head-to-tail.
          </p>
        </div>
      </CalcSection>

      <CalcSection title="Worked examples">
        <div className="space-y-4">
          <WorkedExampleBlock
            title="SAS worked example — a = 8 cm, b = 11 cm, C = 37°"
            steps={solveSAS(8, 11, toRad(37, "deg"), "deg").steps}
          />
          <WorkedExampleBlock
            title="SSS worked example — a = 7, b = 9, c = 12"
            steps={solveSSS(7, 9, 12, "deg").steps}
          />
        </div>
      </CalcSection>

      <CalcSection title="What this tool does for you">
        <FeatureList
          items={[
            "Solves both SAS (two sides + included angle) and SSS (three sides) using c² = a² + b² − 2ab·cos C and its rearranged form.",
            "Returns every derived value in one pass: all three sides, all three angles, area (Heron's formula), perimeter, semiperimeter, inradius r = Area/s and circumradius R = abc/(4·Area).",
            "Checks the triangle inequality on SSS input and rejects impossible side triples with a clear explanation instead of returning NaN.",
            "Draws the solved triangle to scale from the computed side lengths with vertices, sides and angles all labelled.",
            "Accepts degrees or radians for angle input, and a display-only length-unit selector (mm, cm, m, km, in, ft, yd, mi) so results are labelled correctly.",
            "Configurable significant figures (3 – 8) so short-form and high-precision answers can be produced from the same input.",
            "Prints personalised step-by-step working with your own numbers substituted into the formula — handy for showing your work on homework.",
            "Copy result / download PNG / download PDF / print, using the shared result actions available across the site.",
          ]}
        />
      </CalcSection>

      <CalcSection title="Frequently asked questions">
        <CalcFAQ items={FAQ_ITEMS.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))} />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/triangle-calculator", label: "Triangle Calculator (all cases in one tool)" },
            { to: "/calculators/math/law-of-sines-calculator", label: "Law of Sines Calculator (ASA / AAS / SSA)" },
            { to: "/calculators/math/pythagorean-theorem-calculator", label: "Pythagorean Theorem Calculator" },
            { to: "/calculators/math/right-triangle-calculator", label: "Right Triangle Calculator" },
          ]}
        />
      </CalcSection>
    </>
  );
}

function ProofCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <h3 className="mb-2 font-display text-base font-semibold text-foreground">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

function WorkedExampleBlock({ title, steps }: { title: string; steps: Step[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <h3 className="mb-3 font-display text-base font-semibold text-foreground">{title}</h3>
      <StepsToggle steps={steps} />
    </div>
  );
}

export const Route = createFileRoute("/calculators/math/law-of-cosines-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Law of Cosines Calculator",
      title: "Law of Cosines Calculator — Solve SAS & SSS Triangles",
      metaDescription:
        "Free law of cosines calculator — solve SAS and SSS triangles with c² = a² + b² − 2ab·cos C. Returns all sides, angles, area, perimeter, inradius and circumradius.",
      canonicalUrl: "/calculators/math/law-of-cosines-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Law of Cosines Calculator", path: "/calculators/math/law-of-cosines-calculator" },
      ],
      faqs: FAQ_ITEMS,
    }),
  component: LawOfCosinesPage,
});
