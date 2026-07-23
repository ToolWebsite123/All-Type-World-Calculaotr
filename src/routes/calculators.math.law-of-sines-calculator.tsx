import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
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

/* ================= Angle unit + helpers ================= */

type AngleUnit = "deg" | "rad";
type Mode = "ASA" | "AAS" | "SSA";

const PI = Math.PI;
const toRad = (v: number, u: AngleUnit) => (u === "deg" ? (v * PI) / 180 : v);
const fromRad = (v: number, u: AngleUnit) => (u === "deg" ? (v * 180) / PI : v);
const suffix = (u: AngleUnit) => (u === "deg" ? "°" : " rad");

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
  /** All angles stored in radians for computation. */
  A: number; B: number; C: number;
  a: number; b: number; c: number;
  area: number;
  perimeter: number;
  semiperimeter: number;
  inradius: number;
  circumradius: number;
  steps: Step[];
}

interface SolveResult {
  solutions: Solution[];
  /** SSA classification message when relevant. */
  ssaNote?: string;
}

/** ASA: given angles A, B and the included side c (between them). */
function solveASA(Ar: number, Br: number, c: number, unit: AngleUnit): Solution {
  const Cr = PI - Ar - Br;
  // c / sin C = a / sin A = b / sin B
  const k = c / Math.sin(Cr);
  const a = k * Math.sin(Ar);
  const b = k * Math.sin(Br);
  return finalize(Ar, Br, Cr, a, b, c, unit, [
    { title: "Third angle by angle-sum", body: <MathLine>C = π − A − B = {angleTxt(Cr, unit)}</MathLine> },
    { title: "Common ratio from the given side", body: <MathLine>k = c / sin C = {fmt(c)} / sin({angleTxt(Cr, unit)}) = {fmt(k)}</MathLine> },
    { title: "Remaining sides", body: <><MathLine>a = k · sin A = {fmt(a)}</MathLine><MathLine>b = k · sin B = {fmt(b)}</MathLine></> },
  ]);
}

/** AAS: given angles A, B and a side a opposite to A (non-included). */
function solveAAS(Ar: number, Br: number, a: number, unit: AngleUnit): Solution {
  const Cr = PI - Ar - Br;
  const k = a / Math.sin(Ar);
  const b = k * Math.sin(Br);
  const c = k * Math.sin(Cr);
  return finalize(Ar, Br, Cr, a, b, c, unit, [
    { title: "Third angle by angle-sum", body: <MathLine>C = π − A − B = {angleTxt(Cr, unit)}</MathLine> },
    { title: "Common ratio from the known side", body: <MathLine>k = a / sin A = {fmt(a)} / sin({angleTxt(Ar, unit)}) = {fmt(k)}</MathLine> },
    { title: "Remaining sides", body: <><MathLine>b = k · sin B = {fmt(b)}</MathLine><MathLine>c = k · sin C = {fmt(c)}</MathLine></> },
  ]);
}

/** SSA: given sides a, b and angle A opposite to a. */
function solveSSA(a: number, b: number, Ar: number, unit: AngleUnit): SolveResult {
  const sinB = (b * Math.sin(Ar)) / a;
  const baseSteps = (extra: Step[]): Step[] => [
    { title: "Apply the ratio to find sin B", body: <MathLine>sin B = b · sin A / a = {fmt(b)} · sin({angleTxt(Ar, unit)}) / {fmt(a)} = {fmt(sinB)}</MathLine> },
    ...extra,
  ];

  // No triangle
  if (sinB > 1 + 1e-12) {
    return {
      solutions: [],
      ssaNote:
        `sin B = ${fmt(sinB)} > 1, which is impossible. No triangle exists with these values — side b is too long to close on side a at angle A.`,
    };
  }

  // Exactly one solution — right triangle
  if (Math.abs(sinB - 1) <= 1e-9) {
    const Br = PI / 2;
    const Cr = PI - Ar - Br;
    if (Cr <= 0) return { solutions: [], ssaNote: "No triangle exists — angle A leaves no room after the right angle at B." };
    const k = a / Math.sin(Ar);
    const c = k * Math.sin(Cr);
    return {
      solutions: [
        finalize(Ar, Br, Cr, a, b, c, unit, baseSteps([
          { title: "sin B = 1 → exactly one solution (right angle at B)", body: <MathLine>B = 90° &nbsp; ⇒ &nbsp; C = π − A − B</MathLine> },
          { title: "Third side by the ratio", body: <MathLine>c = a · sin C / sin A = {fmt(c)}</MathLine> },
        ])),
      ],
      ssaNote: "One unique solution (right triangle at B).",
    };
  }

  // Potentially two solutions
  const B1 = Math.asin(Math.min(1, Math.max(-1, sinB)));
  const B2 = PI - B1;
  const sols: Solution[] = [];

  // First solution — always valid as long as A + B1 < π
  if (Ar + B1 < PI - 1e-12) {
    const Cr = PI - Ar - B1;
    const k = a / Math.sin(Ar);
    const c = k * Math.sin(Cr);
    sols.push(finalize(Ar, B1, Cr, a, b, c, unit, baseSteps([
      { title: "Solution 1 — acute B", body: <MathLine>B = arcsin({fmt(sinB)}) = {angleTxt(B1, unit)}</MathLine> },
      { title: "Third angle", body: <MathLine>C = π − A − B = {angleTxt(Cr, unit)}</MathLine> },
      { title: "Third side", body: <MathLine>c = a · sin C / sin A = {fmt(c)}</MathLine> },
    ])));
  }

  // Second solution — only if A + B2 still leaves room for C > 0
  if (Ar + B2 < PI - 1e-9) {
    const Cr = PI - Ar - B2;
    const k = a / Math.sin(Ar);
    const c = k * Math.sin(Cr);
    sols.push(finalize(Ar, B2, Cr, a, b, c, unit, baseSteps([
      { title: "Solution 2 — obtuse B (the ambiguous companion)", body: <MathLine>B' = 180° − arcsin({fmt(sinB)}) = {angleTxt(B2, unit)}</MathLine> },
      { title: "Third angle", body: <MathLine>C = π − A − B' = {angleTxt(Cr, unit)}</MathLine> },
      { title: "Third side", body: <MathLine>c = a · sin C / sin A = {fmt(c)}</MathLine> },
    ])));
  }

  const note =
    sols.length === 2
      ? "Two valid triangles — the ambiguous SSA case. Toggle the tabs below to view each."
      : sols.length === 1
        ? "One valid triangle — the obtuse companion B' would force A + B' ≥ 180°, so it is discarded."
        : "No triangle exists — even the acute B choice leaves no room for a positive third angle.";

  return { solutions: sols, ssaNote: note };
}

function finalize(
  Ar: number, Br: number, Cr: number,
  a: number, b: number, c: number,
  _unit: AngleUnit,
  steps: Step[],
): Solution {
  const s = (a + b + c) / 2;
  const area = 0.5 * a * b * Math.sin(Cr);
  const R = a / (2 * Math.sin(Ar));
  const inradius = area / s;
  return {
    A: Ar, B: Br, C: Cr, a, b, c,
    area, perimeter: a + b + c, semiperimeter: s,
    inradius, circumradius: R,
    steps,
  };
}

function angleTxt(rad: number, unit: AngleUnit) {
  return `${fmt(fromRad(rad, unit))}${suffix(unit)}`;
}

/* ================= Scaled diagram ================= */

function TriangleSVG({ sol, unit, label }: { sol: Solution; unit: AngleUnit; label?: string }) {
  // Place B at origin, C along +x at distance a. Compute A from angle B.
  const { a, b, c, A: Aang, B: Bang, C: Cang } = sol;
  const Ax = c * Math.cos(Bang);
  const Ay = c * Math.sin(Bang);
  const pts = [
    { name: "B", x: 0, y: 0 },
    { name: "C", x: a, y: 0 },
    { name: "A", x: Ax, y: Ay },
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
    y: H - pad - p.y * scale, // flip Y so triangle points up
  });
  const P = pts.map(proj);
  const [pB, pC, pA] = P;

  // Midpoints for side labels
  const mid = (p: { x: number; y: number }, q: { x: number; y: number }) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const mBC = mid(pB, pC); // side a
  const mCA = mid(pC, pA); // side b
  const mAB = mid(pA, pB); // side c

  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      {label && (
        <div className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-md">
        <polygon
          points={`${pA.x},${pA.y} ${pB.x},${pB.y} ${pC.x},${pC.y}`}
          className="fill-primary/10 stroke-primary"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Vertex labels */}
        <text x={pA.x} y={pA.y - 10} textAnchor="middle" fontSize="14" className="fill-foreground/80">A</text>
        <text x={pB.x - 10} y={pB.y + 16} textAnchor="middle" fontSize="14" className="fill-foreground/80">B</text>
        <text x={pC.x + 10} y={pC.y + 16} textAnchor="middle" fontSize="14" className="fill-foreground/80">C</text>
        {/* Side labels */}
        <text x={mBC.x} y={mBC.y + 18} textAnchor="middle" fontSize="12" fontStyle="italic" className="fill-foreground">a = {fmt(a)}</text>
        <text x={mCA.x + 14} y={mCA.y} textAnchor="start" fontSize="12" fontStyle="italic" className="fill-foreground">b = {fmt(b)}</text>
        <text x={mAB.x - 14} y={mAB.y} textAnchor="end" fontSize="12" fontStyle="italic" className="fill-foreground">c = {fmt(c)}</text>
        {/* Angle labels near each vertex, inside */}
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

function LawOfSinesPage() {
  const [mode, setMode] = useState<Mode>("ASA");
  const [unit, setUnit] = useState<AngleUnit>("deg");

  // Inputs — reused across modes; the UI only shows the relevant ones.
  const [Aval, setAval] = useState("");
  const [Bval, setBval] = useState("");
  const [aSide, setASide] = useState("");
  const [bSide, setBSide] = useState("");
  const [cSide, setCSide] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const sig = 5;

  const parse = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };

  const onCalc = () => {
    setError(null);
    setResult(null);
    setActiveIdx(0);

    try {
      if (mode === "ASA") {
        const A = parse(Aval), B = parse(Bval), c = parse(cSide);
        if (![A, B, c].every(Number.isFinite)) throw new Error("Enter angles A, B and the included side c.");
        if (A <= 0 || B <= 0) throw new Error("Angles must be greater than 0.");
        if (c <= 0) throw new Error("Side c must be positive.");
        const Ar = toRad(A, unit), Br = toRad(B, unit);
        if (Ar + Br >= PI - 1e-12) throw new Error("A + B must be less than 180° (or π rad).");
        setResult({ solutions: [solveASA(Ar, Br, c, unit)] });
      } else if (mode === "AAS") {
        const A = parse(Aval), B = parse(Bval), a = parse(aSide);
        if (![A, B, a].every(Number.isFinite)) throw new Error("Enter angles A, B and side a (opposite A).");
        if (A <= 0 || B <= 0) throw new Error("Angles must be greater than 0.");
        if (a <= 0) throw new Error("Side a must be positive.");
        const Ar = toRad(A, unit), Br = toRad(B, unit);
        if (Ar + Br >= PI - 1e-12) throw new Error("A + B must be less than 180° (or π rad).");
        setResult({ solutions: [solveAAS(Ar, Br, a, unit)] });
      } else {
        // SSA
        const a = parse(aSide), b = parse(bSide), A = parse(Aval);
        if (![a, b, A].every(Number.isFinite)) throw new Error("Enter sides a, b and angle A (opposite a).");
        if (a <= 0 || b <= 0) throw new Error("Sides must be positive.");
        if (A <= 0) throw new Error("Angle A must be greater than 0.");
        const Ar = toRad(A, unit);
        if (Ar >= PI - 1e-12) throw new Error("Angle A must be less than 180° (or π rad).");
        const res = solveSSA(a, b, Ar, unit);
        setResult(res);
        if (res.solutions.length === 0) {
          setError(res.ssaNote ?? "No valid triangle for these values.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const clearAll = () => {
    setAval(""); setBval(""); setASide(""); setBSide(""); setCSide("");
    setError(null); setResult(null); setActiveIdx(0);
  };

  const copyText = () => {
    if (!result || result.solutions.length === 0) return "";
    const lines: string[] = ["Law of Sines Calculator"];
    result.solutions.forEach((sol, i) => {
      if (result.solutions.length > 1) lines.push("", `— Solution ${i + 1} —`);
      lines.push(
        `A = ${angleTxt(sol.A, unit)}   B = ${angleTxt(sol.B, unit)}   C = ${angleTxt(sol.C, unit)}`,
        `a = ${fmt(sol.a, sig)}   b = ${fmt(sol.b, sig)}   c = ${fmt(sol.c, sig)}`,
        `Perimeter = ${fmt(sol.perimeter, sig)}   Semiperimeter s = ${fmt(sol.semiperimeter, sig)}`,
        `Area = ${fmt(sol.area, sig)}`,
        `Circumradius R = ${fmt(sol.circumradius, sig)}   Inradius r = ${fmt(sol.inradius, sig)}`,
      );
    });
    return lines.join("\n");
  };

  const active = result?.solutions[activeIdx];

  return (
    <MathCalcPage
      name="Law of Sines Calculator"
      tagline="Solve any triangle from ASA, AAS or SSA using a/sin A = b/sin B = c/sin C — with the ambiguous case handled explicitly and every solution drawn to scale."
      extras={<PageExtras />}
    >
      {/* Mode picker */}
      <Field label="Which values do you know?" htmlFor="los-mode">
        <div className="flex flex-wrap gap-2" id="los-mode">
          {([
            { m: "ASA", t: "Two angles + the side between (ASA)" },
            { m: "AAS", t: "Two angles + a side not between (AAS)" },
            { m: "SSA", t: "Two sides + a non-included angle (SSA)" },
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

      {/* Angle unit toggle */}
      <div className="mt-4">
        <Field label="Angle unit" htmlFor="los-unit">
          <div className="flex flex-wrap gap-2" id="los-unit">
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
      </div>

      {/* Mode-specific inputs */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {mode === "ASA" && (
          <>
            <Field label={`Angle A (${unit})`} hint="First angle">
              <TextInput value={Aval} onChange={(e) => setAval(e.target.value)} inputMode="decimal" placeholder={unit === "deg" ? "45" : "0.7854"} />
            </Field>
            <Field label={`Angle B (${unit})`} hint="Second angle">
              <TextInput value={Bval} onChange={(e) => setBval(e.target.value)} inputMode="decimal" placeholder={unit === "deg" ? "60" : "1.0472"} />
            </Field>
            <Field label="Side c" hint="The side between A and B">
              <TextInput value={cSide} onChange={(e) => setCSide(e.target.value)} inputMode="decimal" placeholder="10" />
            </Field>
          </>
        )}
        {mode === "AAS" && (
          <>
            <Field label={`Angle A (${unit})`} hint="Opposite side a">
              <TextInput value={Aval} onChange={(e) => setAval(e.target.value)} inputMode="decimal" placeholder={unit === "deg" ? "45" : "0.7854"} />
            </Field>
            <Field label={`Angle B (${unit})`} hint="Second angle">
              <TextInput value={Bval} onChange={(e) => setBval(e.target.value)} inputMode="decimal" placeholder={unit === "deg" ? "75" : "1.309"} />
            </Field>
            <Field label="Side a" hint="Opposite angle A">
              <TextInput value={aSide} onChange={(e) => setASide(e.target.value)} inputMode="decimal" placeholder="7" />
            </Field>
          </>
        )}
        {mode === "SSA" && (
          <>
            <Field label="Side a" hint="Opposite angle A">
              <TextInput value={aSide} onChange={(e) => setASide(e.target.value)} inputMode="decimal" placeholder="7" />
            </Field>
            <Field label="Side b" hint="Not opposite angle A">
              <TextInput value={bSide} onChange={(e) => setBSide(e.target.value)} inputMode="decimal" placeholder="9" />
            </Field>
            <Field label={`Angle A (${unit})`} hint="Opposite side a — the ambiguous angle">
              <TextInput value={Aval} onChange={(e) => setAval(e.target.value)} inputMode="decimal" placeholder={unit === "deg" ? "35" : "0.6109"} />
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
          Uses a / sin A = b / sin B = c / sin C.
        </span>
      </div>

      {error && <ErrorBox message={error} />}

      {result && result.solutions.length > 0 && (
        <div ref={captureRef} className="mt-6 space-y-4">
          {result.ssaNote && mode === "SSA" && (
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-3 text-sm text-foreground">
              {result.ssaNote}
            </div>
          )}

          {/* Solution tabs for two-solution SSA */}
          {result.solutions.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist">
              {result.solutions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={activeIdx === i}
                  onClick={() => setActiveIdx(i)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                    (activeIdx === i
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent")
                  }
                >
                  Solution {i + 1}
                </button>
              ))}
            </div>
          )}

          {active && (
            <>
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {result.solutions.length > 1 ? `Solution ${activeIdx + 1}` : "Solved triangle"}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stat label="A" value={angleTxt(active.A, unit)} />
                  <Stat label="B" value={angleTxt(active.B, unit)} />
                  <Stat label="C" value={angleTxt(active.C, unit)} />
                  <Stat label="a" value={fmt(active.a, sig)} />
                  <Stat label="b" value={fmt(active.b, sig)} />
                  <Stat label="c" value={fmt(active.c, sig)} />
                  <Stat label="Perimeter" value={fmt(active.perimeter, sig)} />
                  <Stat label="Semiperimeter s" value={fmt(active.semiperimeter, sig)} />
                  <Stat label="Area" value={fmt(active.area, sig)} />
                  <Stat label="Circumradius R" value={fmt(active.circumradius, sig)} />
                  <Stat label="Inradius r" value={fmt(active.inradius, sig)} />
                </div>
              </div>

              {/* Show BOTH diagrams side-by-side when there are two solutions, per the spec. */}
              {result.solutions.length > 1 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {result.solutions.map((s, i) => (
                    <TriangleSVG key={i} sol={s} unit={unit} label={`Solution ${i + 1}`} />
                  ))}
                </div>
              ) : (
                <TriangleSVG sol={active} unit={unit} />
              )}

              <StepsToggle steps={active.steps} />

              <ResultActions
                getCopyText={copyText}
                captureRef={captureRef}
                filename="law-of-sines"
              />
            </>
          )}
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

function MiniTri({
  variant = "basic",
  ssa,
}: {
  variant?: "basic" | "asa" | "aas" | "altitude";
  ssa?: "none" | "one" | "two";
}) {
  const A = { x: 30, y: 150 };
  const B = { x: 270, y: 150 };
  const C = { x: 160, y: 30 };
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <svg viewBox="0 0 300 190" className="mx-auto block h-auto w-full max-w-xs">
        {/* Altitude construction for the proof card */}
        {variant === "altitude" && (
          <line x1={C.x} y1={C.y} x2={C.x} y2={A.y} className="stroke-primary" strokeWidth="1.5" strokeDasharray="4 3" />
        )}
        <polygon
          points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          className="fill-primary/10 stroke-primary"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* SSA — show the two possible positions of B when ambiguous */}
        {ssa === "two" && (
          <>
            <polygon
              points={`${A.x},${A.y} ${B.x - 90},${B.y} ${C.x},${C.y}`}
              className="fill-transparent stroke-primary/60"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
            <text x={B.x - 90} y={B.y + 14} fontSize="10" className="fill-primary/70">B'</text>
          </>
        )}
        {ssa === "none" && (
          <line x1={A.x} y1={A.y} x2={A.x + 60} y2={A.y - 60} className="stroke-destructive" strokeWidth="2" strokeDasharray="4 3" />
        )}
        <text x={A.x - 4} y={A.y + 16} fontSize="12" className="fill-foreground/70">A</text>
        <text x={B.x + 6} y={B.y + 16} fontSize="12" className="fill-foreground/70">B</text>
        <text x={C.x - 4} y={C.y - 6} fontSize="12" className="fill-foreground/70">C</text>
        <text x={(A.x + B.x) / 2} y={A.y + 16} fontSize="11" fontStyle="italic" className="fill-foreground">c</text>
        <text x={(B.x + C.x) / 2 + 6} y={(B.y + C.y) / 2} fontSize="11" fontStyle="italic" className="fill-foreground">a</text>
        <text x={(A.x + C.x) / 2 - 12} y={(A.y + C.y) / 2} fontSize="11" fontStyle="italic" className="fill-foreground">b</text>
      </svg>
    </div>
  );
}

/* ================= Educational content ================= */

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is the law of sines in simple terms?",
    a: "In any triangle, each side divided by the sine of its opposite angle gives the same number: a/sin A = b/sin B = c/sin C. That shared ratio equals 2R, the diameter of the circumscribed circle. Because the ratio is fixed for a given triangle, knowing any matched side–angle pair lets you solve for the other sides once you know their opposite angles.",
  },
  {
    q: "When should I use the law of sines instead of the law of cosines?",
    a: "Use the law of sines when the values you know pair sides with their opposite angles — that's the ASA, AAS and SSA cases. Reach for the law of cosines when you know two sides and the angle between them (SAS) or all three sides (SSS): those have no matched side–angle pair, so the sine ratio has no starting point.",
  },
  {
    q: "What is the ambiguous case?",
    a: "The ambiguous case is SSA: you know two sides and an angle that is not between them. Depending on the numbers, the given angle can produce no triangle at all, exactly one triangle, or two different triangles that both fit. This calculator classifies which of the three you have and shows both triangles side by side when there are two.",
  },
  {
    q: "Why do some SSA inputs give two answers?",
    a: "Because arcsin(x) can return two valid angles between 0° and 180° — an acute angle B and its supplement B' = 180° − B. Both produce a real triangle as long as A + B' is still less than 180°. If the supplement pushes the angle sum past 180°, the second triangle is discarded and only the acute solution survives.",
  },
  {
    q: "Can I use this calculator for right triangles?",
    a: "Yes — the law of sines works for right triangles too, and this tool will solve them. If you already know the triangle is right, the dedicated Right Triangle Calculator is faster because it uses sine, cosine, tangent and the Pythagorean theorem directly instead of the full ratio.",
  },
  {
    q: "What if my inputs describe an SAS or SSS triangle?",
    a: "The law of sines can't start those — there is no side–angle pair to anchor the ratio. Use the dedicated Law of Cosines Calculator for a straight SAS/SSS solver, or the full Triangle Calculator if you want every derived value (sides, angles, area, perimeter, R and r) in one pass.",
  },

];

const GUIDE: GuideCardItem[] = [
  {
    key: "asa",
    title: "ASA — two angles and the side between them",
    explain:
      "You know both angles at the ends of a side. Find the third angle by C = 180° − A − B, then read every other side off the shared ratio c / sin C = a / sin A = b / sin B.",
    formula: <>c / sin C = a / sin A = b / sin B</>,
    legend: [
      { sym: "A, B", def: "the two known angles" },
      { sym: "c", def: "the side between A and B" },
      { sym: "C", def: "= 180° − A − B" },
    ],
    diagram: <MiniTri variant="asa" />,
    example: {
      given: <>A = 45°, B = 60°, c = 10</>,
      substitute: <>C = 180° − 45° − 60° = 75°; a = 10 · sin 45° / sin 75°</>,
      answer: <>a ≈ 7.321, b ≈ 8.966, C = 75°</>,
    },
  },
  {
    key: "aas",
    title: "AAS — two angles and a non-included side",
    explain:
      "Same idea as ASA, but the known side is opposite one of the angles instead of between them. Find the third angle first, then use the pair that includes your known side to build the common ratio.",
    formula: <>a / sin A = b / sin B = c / sin C</>,
    legend: [
      { sym: "A, B", def: "the two known angles" },
      { sym: "a", def: "the side opposite A" },
    ],
    diagram: <MiniTri variant="aas" />,
    example: {
      given: <>A = 45°, B = 75°, a = 7</>,
      substitute: <>C = 180° − 45° − 75° = 60°; b = 7 · sin 75° / sin 45°</>,
      answer: <>b ≈ 9.562, c ≈ 8.573, C = 60°</>,
    },
  },
  {
    key: "ssa-two",
    title: "SSA — two triangles (the classic ambiguous case)",
    explain:
      "You know two sides and an angle opposite one of them. When the given angle is acute and the opposite side is shorter than the adjacent one but longer than the altitude, sin B has two valid angles — the acute solution and its 180° − B supplement — so two real triangles fit.",
    formula: <>sin B = b · sin A / a &nbsp;⇒&nbsp; B, or 180° − B</>,
    legend: [
      { sym: "a, b", def: "the two known sides" },
      { sym: "A", def: "angle opposite side a" },
    ],
    diagram: <MiniTri ssa="two" />,
    example: {
      given: <>a = 7, b = 9, A = 35°</>,
      substitute: <>sin B = 9 · sin 35° / 7 ≈ 0.7374 ⇒ B ≈ 47.52° or 132.48°</>,
      answer: <>Two triangles: C ≈ 97.48°, c ≈ 12.10 &nbsp;or&nbsp; C ≈ 12.52°, c ≈ 2.65</>,
    },
  },
  {
    key: "ssa-one",
    title: "SSA — exactly one triangle",
    explain:
      "When the supplement of B would push A + B past 180°, the obtuse companion is discarded and only the acute solution survives. This also happens when sin B works out to exactly 1, giving a right angle at B.",
    formula: <>A + (180° − B) &lt; 180° &nbsp;must hold&nbsp; for B' to be valid</>,
    legend: [
      { sym: "B", def: "acute solution from arcsin" },
      { sym: "B'", def: "= 180° − B, the supplement" },
    ],
    diagram: <MiniTri ssa="one" />,
    example: {
      given: <>a = 12, b = 8, A = 65°</>,
      substitute: <>sin B = 8 · sin 65° / 12 ≈ 0.6041 ⇒ B ≈ 37.16° (supplement rejected)</>,
      answer: <>Unique triangle: C ≈ 77.84°, c ≈ 12.94</>,
    },
  },
  {
    key: "ssa-none",
    title: "SSA — no triangle at all",
    explain:
      "If the computed sin B is greater than 1, no angle can satisfy it — side b is simply too long to close on side a at angle A. The calculator flags this instead of silently returning NaN.",
    formula: <>sin B = b · sin A / a &gt; 1 &nbsp;⇒&nbsp; no triangle</>,
    legend: [
      { sym: "a, b, A", def: "given values" },
    ],
    diagram: <MiniTri ssa="none" />,
    example: {
      given: <>a = 3, b = 8, A = 60°</>,
      substitute: <>sin B = 8 · sin 60° / 3 ≈ 2.309</>,
      answer: <>Impossible — no triangle exists.</>,
    },
  },
  {
    key: "proof",
    title: "Why the law works — a quick altitude proof",
    explain:
      "Drop the altitude h from vertex C to side AB. In the right triangle on the left, sin A = h / b, so h = b · sin A. On the right, sin B = h / a, so h = a · sin B. Equating the two expressions for h gives a · sin B = b · sin A, i.e. a / sin A = b / sin B. Repeat with a different altitude to include c / sin C.",
    formula: <>h = b · sin A = a · sin B &nbsp;⇒&nbsp; a / sin A = b / sin B</>,
    legend: [
      { sym: "h", def: "altitude from C onto AB" },
    ],
    diagram: <MiniTri variant="altitude" />,
    example: {
      given: <>Any triangle ABC with altitude h from C</>,
      substitute: <>b · sin A = a · sin B</>,
      answer: <>a / sin A = b / sin B = c / sin C = 2R</>,
    },
  },
];

function PageExtras() {
  return (
    <>
      <CalcSection title="What is the law of sines?">
        <p>
          The <strong>law of sines</strong> — sometimes called the sine rule —
          says that in any triangle, the ratio of a side to the sine of its
          opposite angle is the same for all three sides:
        </p>
        <FormulaBlock>a / sin A = b / sin B = c / sin C = 2R</FormulaBlock>
        <p>
          That shared value equals <em>2R</em>, the diameter of the triangle's
          circumscribed circle. The rule is the natural tool for the three
          cases where you already know a side paired with its opposite angle:
          <strong> ASA</strong> (two angles and the side between them),{" "}
          <strong>AAS</strong> (two angles and a side not between them), and
          the famous <strong>SSA ambiguous case</strong> (two sides and a
          non-included angle). For SAS or SSS — where no side is paired with
          its opposite angle — use the dedicated{" "}
          <a className="text-primary underline underline-offset-4 hover:no-underline" href="/calculators/math/law-of-cosines-calculator">
            Law of Cosines Calculator
          </a>{" "}
          or the{" "}
          <a className="text-primary underline underline-offset-4 hover:no-underline" href="/calculators/math/triangle-calculator">
            full Triangle Calculator
          </a>
          , which apply the law of cosines to handle those cases.
        </p>

      </CalcSection>

      <CalcSection title="Law of sines, case by case">
        <GuideCards items={GUIDE} />
      </CalcSection>

      <CalcSection title="Law of sines vs. law of cosines — when to use which">
        <ReferenceTable
          headers={["You know…", "Use", "Why"]}
          rows={[
            [<>Two angles + included side (ASA)</>, "Law of sines", "You already have a matched side–angle pair after finding the third angle."],
            [<>Two angles + non-included side (AAS)</>, "Law of sines", "The known side is opposite one of the known angles."],
            [<>Two sides + non-included angle (SSA)</>, "Law of sines (ambiguous)", "Handled here; the angle is opposite one of the sides."],
            [<>Two sides + included angle (SAS)</>, "Law of cosines", "No matched side–angle pair to anchor the ratio."],
            [<>Three sides (SSS)</>, "Law of cosines", "You need cosines to recover the angles first."],
            [<>One angle = 90°</>, "Right-triangle trig", <>Faster with the <a className="text-primary underline underline-offset-4 hover:no-underline" href="/calculators/math/right-triangle-calculator">Right Triangle Calculator</a>.</>],
          ]}
        />
      </CalcSection>

      <CalcSection title="What this tool does for you">
        <FeatureList
          items={[
            "Solves ASA, AAS and SSA using the law of sines — every side, every angle, area, perimeter, semiperimeter, inradius and circumradius returned in one go.",
            "Handles the SSA ambiguous case explicitly: classifies no-triangle, one-triangle and two-triangle inputs, then shows both valid triangles side-by-side with their own diagrams.",
            "Draws each solution to scale from the solved side lengths, so the geometry — not just the numbers — makes the ambiguity obvious.",
            "Accepts input in degrees or radians with a one-click unit toggle.",
            "Prints personalised step-by-step working with your own numbers substituted into a / sin A = b / sin B = c / sin C.",
            "Skips SAS and SSS on purpose — those need the law of cosines and are handled by the full Triangle Calculator we link to.",
            "Copy result / download PNG / download PDF / print, matching the shared result-actions used across the site.",
          ]}
        />
      </CalcSection>

      <CalcSection title="Frequently asked questions">
        <CalcFAQ items={FAQ_ITEMS.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))} />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/triangle-calculator", label: "Triangle Calculator (SAS / SSS cases, plus everything else)" },
            { to: "/calculators/math/triangle-sum-theorem-calculator", label: "Triangle Sum Theorem Calculator (find the third angle)" },
            { to: "/calculators/math/right-triangle-calculator", label: "Right Triangle Calculator (one 90° angle)" },
            { to: "/calculators/math/isosceles-triangle-calculator", label: "Isosceles Triangle Calculator" },
            { to: "/calculators/math/equilateral-triangle-calculator", label: "Equilateral Triangle Calculator" },
            { to: "/calculators/math/pythagorean-theorem-calculator", label: "Pythagorean Theorem Calculator" },
          ]}
        />
      </CalcSection>
    </>
  );
}

export const Route = createFileRoute("/calculators/math/law-of-sines-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Law of Sines Calculator",
      title: "Law of Sines Calculator — ASA, AAS & SSA Ambiguous Case",
      metaDescription:
        "Free law of sines calculator — solve ASA, AAS and the SSA ambiguous case using a/sin A = b/sin B = c/sin C. Both triangles shown when SSA has two solutions, with step-by-step working, a scaled diagram and a proof.",
      canonicalUrl: "/calculators/math/law-of-sines-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Law of Sines Calculator", path: "/calculators/math/law-of-sines-calculator" },
      ],
      faqs: FAQ_ITEMS,
    }),
  component: LawOfSinesPage,
});
