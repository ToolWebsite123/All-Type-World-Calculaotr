import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { ResultActions } from "@/components/ResultActions";
import { ReferenceTable } from "@/components/ReferenceTable";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  FormulaWithLegend,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  StackedMath,
  ModeFormula,
  AllFormulasSection,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";


/* ================= Display primitives ================= */

function MathLine({ children }: { children: ReactNode }) {
  return (
    <div className="my-1 flex items-center justify-center text-center font-serif text-[15px] italic text-foreground">
      <span className="inline-flex flex-col items-center gap-1">
        <StackedMath>{children}</StackedMath>
      </span>
    </div>
  );
}
function MathNote({ children }: { children: ReactNode }) {
  return <div className="mt-2 mb-1 text-sm not-italic text-muted-foreground">{children}</div>;
}

/* ================= Math core ================= */

type AngleUnit = "deg" | "rad";
const toRad = (v: number, u: AngleUnit) => (u === "deg" ? (v * Math.PI) / 180 : v);
const fromRad = (v: number, u: AngleUnit) => (u === "deg" ? (v * 180) / Math.PI : v);
const PHI = (1 + Math.sqrt(5)) / 2;

function fmt(n: number, sig = 6): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-6) return n.toExponential(Math.max(2, sig - 2));
  return Number(n.toPrecision(Math.max(1, sig))).toString();
}

interface Inputs {
  a?: number;    // leg length (a = c)
  b?: number;    // base
  hb?: number;   // altitude to base
  ha?: number;   // altitude to a leg
  vertex?: number;   // vertex angle B (radians)
  base?: number;     // base angle A (radians)
  area?: number;
  perim?: number;
}

interface Solved {
  a: number; b: number;
  vertex: number; base: number; // radians (B and A)
  hb: number; ha: number;
  area: number; perim: number; s: number;
  r: number; R: number;
  isEquilateral: boolean;
  isRight: boolean;   // 45-45-90
  isGolden: boolean;  // a/b ≈ φ, base angle 72°
  caseName: string;
  steps: Step[];
}

const LABELS: Record<string, string> = {
  a: "Leg a", b: "Base b", hb: "Height hb (base → apex)",
  ha: "Height ha (leg → opposite vertex)",
  vertex: "Vertex angle B", base: "Base angle A",
  area: "Area", perim: "Perimeter",
};

function completeFromAB(a: number, b: number): Omit<Solved, "caseName" | "steps"> {
  if (!(a > 0 && b > 0)) throw new Error("Sides must be positive.");
  if (!(2 * a > b)) throw new Error("Triangle inequality fails: 2·a must be greater than b (the two legs cannot lay flat over the base).");
  const disc = 4 * a * a - b * b;
  const rootDisc = Math.sqrt(disc);
  const hb = rootDisc / 2;
  const ha = (b / (2 * a)) * rootDisc;
  const baseAngle = Math.acos(b / (2 * a));     // A
  const vertex = Math.PI - 2 * baseAngle;       // B
  const area = (b / 4) * rootDisc;
  const perim = 2 * a + b;
  const s = a + b / 2;
  const r = area / s;
  const R = (a * a) / rootDisc;
  const isEquilateral = Math.abs(a - b) < 1e-9 * Math.max(a, b);
  const isRight = Math.abs(vertex - Math.PI / 2) < 1e-6;
  const isGolden = Math.abs(a / b - PHI) < 1e-4;
  return { a, b, vertex, base: baseAngle, hb, ha, area, perim, s, r, R, isEquilateral, isRight, isGolden };
}

/** Solve the isosceles triangle from any consistent 2-input combination. */
function solveIsosceles(input: Inputs): Solved {
  // Merge vertex + base (dependent).
  let vertex = input.vertex;
  let base = input.base;
  if (vertex !== undefined && base !== undefined) {
    if (Math.abs(2 * base + vertex - Math.PI) > 1e-6)
      throw new Error("Vertex angle plus 2 × base angle must equal 180°.");
    base = undefined; // treat as one input
  }
  if (vertex === undefined && base !== undefined) {
    if (!(base > 0 && base < Math.PI / 2))
      throw new Error("Base angle must be strictly between 0° and 90°.");
    vertex = Math.PI - 2 * base;
    base = undefined;
  }
  if (vertex !== undefined && !(vertex > 0 && vertex < Math.PI))
    throw new Error("Vertex angle must be strictly between 0° and 180°.");

  const given: Record<string, number | undefined> = {
    a: input.a, b: input.b, hb: input.hb, ha: input.ha,
    vertex, area: input.area, perim: input.perim,
  };
  const active: string[] = [];
  for (const k of ["a", "b", "hb", "ha", "area", "perim"] as const) {
    const v = given[k];
    if (v !== undefined) {
      if (!(v > 0)) throw new Error(`${LABELS[k]} must be a positive number.`);
      active.push(k);
    }
  }
  if (vertex !== undefined) active.push("vertex");
  if (active.length < 2) throw new Error("Enter at least 2 values.");
  if (active.length > 2) throw new Error("Enter exactly 2 values (leave the other fields blank).");

  const has = (k: string) => active.includes(k);
  const steps: Step[] = [];
  const push = (title: string, body: ReactNode) => steps.push({ title, body });

  const a0 = input.a, b0 = input.b, hb0 = input.hb, ha0 = input.ha;
  const A0 = input.area, P0 = input.perim;
  const V = vertex; // radians
  const Adeg = V !== undefined ? fromRad(V, "deg") : undefined;
  const baseAngDeg = V !== undefined ? fromRad((Math.PI - V) / 2, "deg") : undefined;

  let a: number, b: number, caseName: string;

  if (has("a") && has("b")) {
    caseName = "Leg + base (a, b)";
    a = a0!; b = b0!;
    push("Both sides are given directly — nothing to solve for the sides.",
      <MathLine>a = {fmt(a)}, &nbsp; b = {fmt(b)}</MathLine>);
  } else if (has("a") && has("hb")) {
    caseName = "Leg + height to base (a, hb)";
    if (!(a0! > hb0!)) throw new Error("Leg a must be greater than height hb.");
    b = 2 * Math.sqrt(a0! * a0! - hb0! * hb0!);
    a = a0!;
    push("Use the right triangle formed by hb, half the base, and a leg.",
      <>
        <MathLine>a² = hb² + (b/2)²</MathLine>
        <MathLine>b = 2·√(a² − hb²) = 2·√({fmt(a)}² − {fmt(hb0!)}²) = {fmt(b)}</MathLine>
      </>);
  } else if (has("a") && has("ha")) {
    caseName = "Leg + height to leg (a, ha)";
    if (!(a0! >= ha0!)) throw new Error("Leg a must be at least the altitude ha.");
    // b² = 2a² ± 2a·√(a²−ha²). Pick smaller root (acute vertex).
    const disc = a0! * a0! - ha0! * ha0!;
    const rootSmall = 2 * a0! * a0! - 2 * a0! * Math.sqrt(disc);
    b = Math.sqrt(rootSmall);
    a = a0!;
    push("From ha = (b/2a)·√(4a² − b²), squaring gives a quadratic in b².",
      <>
        <MathLine>b⁴ − 4a²·b² + 4a²·ha² = 0</MathLine>
        <MathLine>b² = 2a² − 2a·√(a² − ha²) = {fmt(rootSmall)}</MathLine>
        <MathLine>b = {fmt(b)}</MathLine>
      </>);
  } else if (has("a") && has("vertex")) {
    caseName = "Leg + vertex angle (a, B)";
    a = a0!;
    b = 2 * a0! * Math.sin(V! / 2);
    push("Split the vertex angle in half — hb is the axis of symmetry.",
      <MathLine>b = 2·a·sin(B/2) = 2·{fmt(a)}·sin({fmt(Adeg!)}°/2) = {fmt(b)}</MathLine>);
  } else if (has("a") && has("area")) {
    caseName = "Leg + area (a, K)";
    // K = ½·a²·sinB → sinB = 2K/a². b = 2a·sin(B/2). Prefer acute B (default).
    const sinB = (2 * A0!) / (a0! * a0!);
    if (!(sinB > 0 && sinB <= 1 + 1e-9)) throw new Error("Area is too large for this leg length.");
    const Bacute = Math.asin(Math.min(1, sinB));
    a = a0!;
    b = 2 * a * Math.sin(Bacute / 2);
    push("From K = ½·a²·sin B, recover the vertex angle then the base.",
      <>
        <MathLine>sin B = 2K / a² = 2·{fmt(A0!)} / {fmt(a * a)} = {fmt(sinB)}</MathLine>
        <MathLine>B = sin⁻¹({fmt(sinB)}) = {fmt(fromRad(Bacute, "deg"))}° (acute solution)</MathLine>
        <MathLine>b = 2a·sin(B/2) = {fmt(b)}</MathLine>
      </>);
  } else if (has("a") && has("perim")) {
    caseName = "Leg + perimeter (a, P)";
    b = P0! - 2 * a0!;
    a = a0!;
    if (!(b > 0)) throw new Error("Perimeter is too small: P must exceed 2·a.");
    push("The base is what's left after removing the two legs.",
      <MathLine>b = P − 2a = {fmt(P0!)} − 2·{fmt(a)} = {fmt(b)}</MathLine>);
  } else if (has("b") && has("hb")) {
    caseName = "Base + height to base (b, hb)";
    a = Math.sqrt(hb0! * hb0! + (b0! * b0!) / 4);
    b = b0!;
    push("Pythagoras on the half-triangle (hb, b/2, a).",
      <MathLine>a = √(hb² + (b/2)²) = √({fmt(hb0! * hb0!)} + {fmt((b * b) / 4)}) = {fmt(a)}</MathLine>);
  } else if (has("b") && has("ha")) {
    caseName = "Base + height to leg (b, ha)";
    if (!(b0! > ha0!)) throw new Error("Base b must be greater than the leg-altitude ha.");
    a = Math.sqrt((b0! ** 4) / (4 * (b0! * b0! - ha0! * ha0!)));
    b = b0!;
    push("From ha = (b/(2a))·√(4a²−b²), solve for a.",
      <>
        <MathLine>4·ha²·a² = b²·(4a² − b²)</MathLine>
        <MathLine>a² = b⁴ / (4·(b² − ha²)) = {fmt(a * a)}</MathLine>
        <MathLine>a = {fmt(a)}</MathLine>
      </>);
  } else if (has("b") && has("vertex")) {
    caseName = "Base + vertex angle (b, B)";
    a = b0! / (2 * Math.sin(V! / 2));
    b = b0!;
    push("Invert b = 2a·sin(B/2) to get the leg.",
      <MathLine>a = b / (2·sin(B/2)) = {fmt(b)} / (2·sin({fmt(Adeg! / 2)}°)) = {fmt(a)}</MathLine>);
  } else if (has("b") && has("area")) {
    caseName = "Base + area (b, K)";
    const hb = (2 * A0!) / b0!;
    a = Math.sqrt(hb * hb + (b0! * b0!) / 4);
    b = b0!;
    push("Recover hb from K = ½·b·hb, then apply Pythagoras.",
      <>
        <MathLine>hb = 2K / b = {fmt(hb)}</MathLine>
        <MathLine>a = √(hb² + (b/2)²) = {fmt(a)}</MathLine>
      </>);
  } else if (has("b") && has("perim")) {
    caseName = "Base + perimeter (b, P)";
    a = (P0! - b0!) / 2;
    b = b0!;
    if (!(a > 0)) throw new Error("Perimeter is too small: P must exceed b.");
    push("The two legs share the remaining perimeter equally.",
      <MathLine>a = (P − b)/2 = ({fmt(P0!)} − {fmt(b)}) / 2 = {fmt(a)}</MathLine>);
  } else if (has("hb") && has("vertex")) {
    caseName = "Height to base + vertex angle (hb, B)";
    a = hb0! / Math.cos(V! / 2);
    b = 2 * a * Math.sin(V! / 2);
    push("hb and a form the half-triangle with angle B/2 at the apex.",
      <>
        <MathLine>a = hb / cos(B/2) = {fmt(hb0!)} / cos({fmt(Adeg! / 2)}°) = {fmt(a)}</MathLine>
        <MathLine>b = 2a·sin(B/2) = {fmt(b)}</MathLine>
      </>);
  } else if (has("hb") && has("area")) {
    caseName = "Height to base + area (hb, K)";
    b = (2 * A0!) / hb0!;
    a = Math.sqrt(hb0! * hb0! + (b * b) / 4);
    push("Recover the base from K = ½·b·hb.",
      <>
        <MathLine>b = 2K / hb = {fmt(b)}</MathLine>
        <MathLine>a = √(hb² + (b/2)²) = {fmt(a)}</MathLine>
      </>);
  } else if (has("hb") && has("perim")) {
    caseName = "Height to base + perimeter (hb, P)";
    // a² = hb² + (P-2a)²/4  ⇒  a = (4hb² + P²)/(4P)
    a = (4 * hb0! * hb0! + P0! * P0!) / (4 * P0!);
    b = P0! - 2 * a;
    if (!(b > 0)) throw new Error("Height is too small for this perimeter (b came out non-positive).");
    push("Substitute b = P − 2a into a² = hb² + (b/2)², then solve.",
      <>
        <MathLine>4·a·P = 4·hb² + P²</MathLine>
        <MathLine>a = (4·hb² + P²) / (4·P) = {fmt(a)}</MathLine>
        <MathLine>b = P − 2a = {fmt(b)}</MathLine>
      </>);
  } else if (has("ha") && has("vertex")) {
    caseName = "Height to leg + vertex angle (ha, B)";
    // ha = a·sin(B)
    a = ha0! / Math.sin(V!);
    b = 2 * a * Math.sin(V! / 2);
    push("For an isosceles triangle, the leg altitude satisfies ha = a·sin B.",
      <>
        <MathLine>a = ha / sin B = {fmt(ha0!)} / sin({fmt(Adeg!)}°) = {fmt(a)}</MathLine>
        <MathLine>b = 2a·sin(B/2) = {fmt(b)}</MathLine>
      </>);
  } else if (has("ha") && has("area")) {
    caseName = "Height to leg + area (ha, K)";
    a = (2 * A0!) / ha0!;
    // then reduce to (a, ha) case
    const disc = a * a - ha0! * ha0!;
    if (disc < 0) throw new Error("Area and leg-altitude are inconsistent.");
    b = Math.sqrt(2 * a * a - 2 * a * Math.sqrt(disc));
    push("Recover the leg from K = ½·a·ha, then use ha to find the base.",
      <>
        <MathLine>a = 2K / ha = {fmt(a)}</MathLine>
        <MathLine>b² = 2a² − 2a·√(a² − ha²) = {fmt(b * b)}</MathLine>
        <MathLine>b = {fmt(b)}</MathLine>
      </>);
  } else if (has("vertex") && has("area")) {
    caseName = "Vertex angle + area (B, K)";
    a = Math.sqrt((2 * A0!) / Math.sin(V!));
    b = 2 * a * Math.sin(V! / 2);
    push("Use K = ½·a²·sin B and then b = 2a·sin(B/2).",
      <>
        <MathLine>a = √(2K / sin B) = √(2·{fmt(A0!)} / sin({fmt(Adeg!)}°)) = {fmt(a)}</MathLine>
        <MathLine>b = 2a·sin(B/2) = {fmt(b)}</MathLine>
      </>);
  } else if (has("vertex") && has("perim")) {
    caseName = "Vertex angle + perimeter (B, P)";
    a = P0! / (2 * (1 + Math.sin(V! / 2)));
    b = 2 * a * Math.sin(V! / 2);
    push("P = 2a + 2a·sin(B/2) = 2a·(1 + sin(B/2)).",
      <>
        <MathLine>a = P / (2·(1 + sin(B/2))) = {fmt(a)}</MathLine>
        <MathLine>b = 2a·sin(B/2) = {fmt(b)}</MathLine>
      </>);
  } else {
    throw new Error(
      "This input combination isn't supported directly. Try including a side (a or b) or the vertex angle.",
    );
  }

  const solved = completeFromAB(a, b);
  const baseAngleDeg = fromRad(solved.base, "deg");
  push("Fill in every remaining measurement.", (
    <>
      <MathLine>A = C = arccos(b / 2a) = {fmt(baseAngleDeg)}°</MathLine>
      <MathLine>B = 180° − 2·A = {fmt(fromRad(solved.vertex, "deg"))}°</MathLine>
      <MathLine>hb = √(4a² − b²)/2 = {fmt(solved.hb)}</MathLine>
      <MathLine>ha = hc = (b/2a)·√(4a² − b²) = {fmt(solved.ha)}</MathLine>
      <MathLine>P = 2a + b = {fmt(solved.perim)}</MathLine>
      <MathLine>s = a + b/2 = {fmt(solved.s)}</MathLine>
      <MathLine>K = (b/4)·√(4a² − b²) = {fmt(solved.area)}</MathLine>
      <MathLine>r = K / s = {fmt(solved.r)}</MathLine>
      <MathLine>R = a² / √(4a² − b²) = {fmt(solved.R)}</MathLine>
      {baseAngDeg !== undefined && Math.abs(baseAngleDeg - baseAngDeg) > 1 &&
        <MathLine>(input base angle {fmt(baseAngDeg)}° matches within rounding)</MathLine>}
    </>
  ));
  return { ...solved, caseName, steps };
}

/* ================= Live SVG diagram ================= */

function IsoDiagram({
  a, b, vertex, base, hb, sig,
}: {
  a: number; b: number; vertex: number; base: number; hb: number; sig: number;
}) {
  const W = 360, H = 260, pad = 40;
  // Scale so the largest of (b, hb) fits.
  const scale = Math.min((W - 2 * pad) / b, (H - 2 * pad - 20) / hb);
  const bw = b * scale, hh = hb * scale;
  const cx = W / 2;
  const yBase = H - pad;
  const xLeft = cx - bw / 2, xRight = cx + bw / 2;
  const yApex = yBase - hh;
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        To-scale isosceles triangle (with axis of symmetry hb)
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-label="isosceles triangle">
        <polygon points={`${xLeft},${yBase} ${xRight},${yBase} ${cx},${yApex}`}
          style={{ fill: "var(--primary)", opacity: 0.08 }} />
        {/* legs */}
        <line x1={xLeft} y1={yBase} x2={cx} y2={yApex} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={xRight} y1={yBase} x2={cx} y2={yApex} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        {/* base */}
        <line x1={xLeft} y1={yBase} x2={xRight} y2={yBase} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        {/* altitude (axis of symmetry) */}
        <line x1={cx} y1={yBase} x2={cx} y2={yApex} style={{ stroke: "var(--primary)" }} strokeWidth={1.8} strokeDasharray="4 3" />
        {/* right-angle marker at base of altitude */}
        <rect x={cx} y={yBase - 10} width={10} height={10} fill="none" style={{ stroke: "var(--muted-foreground)" }} strokeWidth={1.2} />
        {/* tick marks on equal legs */}
        <MidTick x1={xLeft} y1={yBase} x2={cx} y2={yApex} />
        <MidTick x1={xRight} y1={yBase} x2={cx} y2={yApex} />

        {/* labels */}
        <text x={(xLeft + cx) / 2 - 14} y={(yBase + yApex) / 2 - 4} textAnchor="end" fontSize="14" fontWeight="600" fontStyle="italic" className="fill-foreground">a = {fmt(a, sig)}</text>
        <text x={(xRight + cx) / 2 + 14} y={(yBase + yApex) / 2 - 4} fontSize="14" fontWeight="600" fontStyle="italic" className="fill-foreground">c = {fmt(a, sig)}</text>
        <text x={cx} y={yBase + 20} textAnchor="middle" fontSize="14" fontWeight="600" fontStyle="italic" className="fill-foreground">b = {fmt(b, sig)}</text>
        <text x={cx + 6} y={(yBase + yApex) / 2 + 4} fontSize="12" fontStyle="italic" style={{ fill: "var(--primary)" }}>hb = {fmt(hb, sig)}</text>
        <text x={cx} y={yApex - 6} textAnchor="middle" fontSize="12" fontStyle="italic" className="fill-foreground">B = {fmt(fromRad(vertex, "deg"), sig)}°</text>
        <text x={xLeft - 4} y={yBase - 6} textAnchor="end" fontSize="12" fontStyle="italic" className="fill-foreground">A = {fmt(fromRad(base, "deg"), sig)}°</text>
        <text x={xRight + 4} y={yBase - 6} fontSize="12" fontStyle="italic" className="fill-foreground">C = {fmt(fromRad(base, "deg"), sig)}°</text>
      </svg>
    </div>
  );
}

function MidTick({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const t = 5;
  return (
    <line
      x1={mx - nx * t} y1={my - ny * t}
      x2={mx + nx * t} y2={my + ny * t}
      style={{ stroke: "var(--primary)" }} strokeWidth={2}
    />
  );
}

/* ================= FAQ + Guide content ================= */

const FAQ_ITEMS = [
  {
    q: "What is an isosceles triangle?",
    a: "An isosceles triangle has two sides of the same length (the legs). Because of that symmetry, the two angles opposite the equal legs — the base angles — are always equal to each other. The remaining angle, between the two equal legs, is called the vertex angle.",
  },
  {
    q: "How do I find the area of an isosceles triangle from the leg and base?",
    a: "Drop a perpendicular from the apex to the base. It splits the triangle into two mirror-image right triangles with height hb = √(a² − (b/2)²) = √(4a² − b²)/2. Then the area is K = ½·b·hb = (b/4)·√(4a² − b²).",
  },
  {
    q: "How do I find the height of an isosceles triangle?",
    a: "For the height from the apex to the base use hb = √(4a² − b²)/2. For the altitude drawn from a leg to the opposite vertex use ha = hc = (b/(2a))·√(4a² − b²). The base altitude hb is what people usually mean by 'the height'.",
  },
  {
    q: "How do I find a missing angle?",
    a: "The three angles obey 2·A + B = 180°, where A is either base angle and B is the vertex angle. So if you know one angle you know the others: given B, each base angle is A = (180° − B)/2; given A, the vertex angle is B = 180° − 2A. If you know the sides, A = arccos(b / 2a).",
  },
  {
    q: "What is a golden triangle?",
    a: "A golden triangle is an isosceles triangle whose leg-to-base ratio equals the golden ratio φ ≈ 1.618. Its base angles are exactly 72° and its vertex angle is exactly 36°. It appears in the points of a regular pentagon and in the growth curve of the logarithmic (golden) spiral. Use the 'Golden triangle' preset to load it.",
  },
  {
    q: "How is this different from your Triangle and Right Triangle calculators?",
    a: "This calculator is specialised for triangles with two equal sides — it exploits the symmetry and needs only 2 measurements to lock everything down. Use the general Triangle Calculator when your triangle is scalene (SSS/SAS/ASA/AAS/SSA). Use the Right Triangle Calculator when one angle is exactly 90°. A triangle can also be both isosceles and right (the 45-45-90 preset), in which case both this page and the Right Triangle page give the same answer.",
  },
] as const;

const GUIDE: GuideCardItem[] = [
  {
    key: "sides-from-vertex",
    title: "Two equal sides, angles from the vertex-angle split",
    explain:
      "The altitude from the apex cuts the vertex angle exactly in half and the base exactly in half. That produces two congruent right triangles with hypotenuse a, adjacent leg hb and opposite leg b/2. Every formula on this page comes from that one right triangle.",
    formula: <>b = 2a · sin(B / 2) &nbsp;·&nbsp; hb = a · cos(B / 2)</>,
    legend: [
      { sym: "a", def: "either equal leg (a = c)" },
      { sym: "b", def: "base (the odd side)" },
      { sym: "B", def: "vertex angle (between the two legs)" },
    ],
    diagram: <MiniIso showAltitude />,
    example: {
      given: <>a = 10, &nbsp; B = 40°</>,
      substitute: <>b = 2·10·sin(20°) ≈ 20·0.34202</>,
      answer: <>b ≈ 6.8404</>,
    },
  },
  {
    key: "area-from-leg-base",
    title: "Area from a leg and the base",
    explain:
      "Once you know a and b, the height to the base is fixed by Pythagoras on the half-triangle. Multiplying half the base by that height gives the area — no trigonometry needed.",
    formula: <>K = (b / 4) · √(4a² − b²)</>,
    legend: [
      { sym: "K", def: "area" },
      { sym: "a", def: "either equal leg" },
      { sym: "b", def: "base" },
    ],
    diagram: <MiniIso showAltitude />,
    example: {
      given: <>a = 5, &nbsp; b = 6</>,
      substitute: <>K = (6/4) · √(4·25 − 36) = 1.5·√64 = 1.5·8</>,
      answer: <>K = 12</>,
    },
  },
  {
    key: "altitudes",
    title: "Both altitudes — hb (to base) and ha (to a leg)",
    explain:
      "hb is the axis of symmetry and the height most people mean. ha is the perpendicular from a base vertex to the opposite leg — smaller than hb whenever the triangle is 'tall', larger when it's squat. Both come out of the same area, computed two different ways.",
    formula: <>hb = √(4a² − b²) / 2 &nbsp;·&nbsp; ha = (b / 2a) · √(4a² − b²)</>,
    legend: [
      { sym: "hb", def: "altitude from apex to base" },
      { sym: "ha, hc", def: "altitude from a base vertex to the opposite leg (equal)" },
    ],
    diagram: <MiniIso showBothAltitudes />,
    example: {
      given: <>a = 5, &nbsp; b = 6</>,
      substitute: <>hb = √(100 − 36)/2 = √64/2, &nbsp; ha = (6/10)·√64 = 0.6·8</>,
      answer: <>hb = 4, &nbsp; ha = 4.8</>,
    },
  },
  {
    key: "golden",
    title: "The golden triangle (a special case)",
    explain:
      "A golden triangle is the isosceles triangle whose leg-to-base ratio equals φ = (1+√5)/2 ≈ 1.618. Its base angles are 72° and its vertex angle is 36°, meeting the constraint 2·72° + 36° = 180°. This is the triangle you see at the points of a regular pentagram and in the sequence of triangles that generates the golden spiral.",
    formula: <>a / b = φ ≈ 1.618 &nbsp;·&nbsp; A = C = 72°, &nbsp; B = 36°</>,
    legend: [
      { sym: "φ", def: "golden ratio (1 + √5) / 2" },
    ],
    diagram: <MiniIso golden />,
    example: {
      given: <>b = 1</>,
      substitute: <>a = φ · 1 = (1 + √5)/2</>,
      answer: <>a ≈ 1.6180, &nbsp; A = 72°, &nbsp; B = 36°</>,
    },
  },
];

function MiniIso({
  showAltitude, showBothAltitudes, golden,
}: { showAltitude?: boolean; showBothAltitudes?: boolean; golden?: boolean }) {
  const W = 300, H = 200, pad = 24;
  const b = golden ? 1 : 6;
  const a = golden ? PHI : 5;
  const hb = Math.sqrt(4 * a * a - b * b) / 2;
  const scale = Math.min((W - 2 * pad) / b, (H - 2 * pad - 12) / hb);
  const bw = b * scale, hh = hb * scale;
  const cx = W / 2, y0 = H - pad;
  const xL = cx - bw / 2, xR = cx + bw / 2, yA = y0 - hh;
  return (
    <div className="flex items-center justify-center rounded-xl border border-border/60 bg-secondary/20 p-3 text-foreground">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[300px] h-auto" aria-label="isosceles triangle">
        <polygon points={`${xL},${y0} ${xR},${y0} ${cx},${yA}`} style={{ fill: "var(--primary)", opacity: 0.08 }} />
        <line x1={xL} y1={y0} x2={cx} y2={yA} stroke="currentColor" strokeWidth={2.5} />
        <line x1={xR} y1={y0} x2={cx} y2={yA} stroke="currentColor" strokeWidth={2.5} />
        <line x1={xL} y1={y0} x2={xR} y2={y0} stroke="currentColor" strokeWidth={2.5} />
        <MidTick x1={xL} y1={y0} x2={cx} y2={yA} />
        <MidTick x1={xR} y1={y0} x2={cx} y2={yA} />
        {(showAltitude || showBothAltitudes) && (
          <>
            <line x1={cx} y1={y0} x2={cx} y2={yA} style={{ stroke: "var(--primary)" }} strokeWidth={1.8} strokeDasharray="4 3" />
            <text x={cx + 6} y={(y0 + yA) / 2} fontSize="12" fontStyle="italic" style={{ fill: "var(--primary)" }}>hb</text>
          </>
        )}
        {showBothAltitudes && (() => {
          // altitude from left vertex perpendicular to right leg
          const dx = cx - xR, dy = yA - y0;
          const len2 = dx * dx + dy * dy;
          const t = ((xL - xR) * dx + (y0 - y0) * dy) / len2;
          const fx = xR + t * dx, fy = y0 + t * dy;
          return (
            <>
              <line x1={xL} y1={y0} x2={fx} y2={fy} style={{ stroke: "var(--primary)" }} strokeWidth={1.6} strokeDasharray="3 3" />
              <text x={(xL + fx) / 2 + 4} y={(y0 + fy) / 2 + 4} fontSize="12" fontStyle="italic" style={{ fill: "var(--primary)" }}>ha</text>
            </>
          );
        })()}
        <text x={xL - 4} y={(y0 + yA) / 2} textAnchor="end" fontSize="13" fontWeight="600" fontStyle="italic">a</text>
        <text x={xR + 4} y={(y0 + yA) / 2} fontSize="13" fontWeight="600" fontStyle="italic">c</text>
        <text x={cx} y={y0 + 16} textAnchor="middle" fontSize="13" fontWeight="600" fontStyle="italic">b</text>
        <text x={cx} y={yA - 4} textAnchor="middle" fontSize="12" fontStyle="italic">B</text>
      </svg>
    </div>
  );
}

/* ================= Presets ================= */

interface Setters {
  setA: (v: string) => void; setB: (v: string) => void;
  setHb: (v: string) => void; setHa: (v: string) => void;
  setVertex: (v: string) => void; setBase: (v: string) => void;
  setArea: (v: string) => void; setPerim: (v: string) => void;
  setAngleUnit: (u: AngleUnit) => void;
  clearAll: () => void;
}

const PRESETS: { label: string; note?: string; assign: (s: Setters) => void }[] = [
  {
    label: "Equilateral (a = b = 6)",
    assign: (s) => { s.clearAll(); s.setA("6"); s.setB("6"); },
  },
  {
    label: "Golden triangle (b = 1)",
    note: "a/b = φ, base 72°, vertex 36°",
    assign: (s) => { s.clearAll(); s.setAngleUnit("deg"); s.setB("1"); s.setBase("72"); },
  },
  {
    label: "45-45-90 (leg = 1)",
    note: "Isosceles right — try the Right Triangle Calculator too",
    assign: (s) => { s.clearAll(); s.setAngleUnit("deg"); s.setA("1"); s.setVertex("90"); },
  },
  {
    label: "Roof gable (a = 5 m, B = 100°)",
    assign: (s) => { s.clearAll(); s.setAngleUnit("deg"); s.setA("5"); s.setVertex("100"); },
  },
];

/* ================= Page ================= */

function IsoscelesPage() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [hb, setHb] = useState("");
  const [ha, setHa] = useState("");
  const [vertex, setVertex] = useState("");
  const [base, setBase] = useState("");
  const [area, setArea] = useState("");
  const [perim, setPerim] = useState("");
  const [angleUnit, setAngleUnit] = useState<AngleUnit>("deg");
  const [sig, setSig] = useState(4);
  const [result, setResult] = useState<Solved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const setters: Setters = {
    setA, setB, setHb, setHa, setVertex, setBase, setArea, setPerim, setAngleUnit,
    clearAll: () => {
      setA(""); setB(""); setHb(""); setHa(""); setVertex(""); setBase("");
      setArea(""); setPerim(""); setResult(null); setError(null);
    },
  };

  const parsed = useMemo(() => {
    const one = (raw: string): number | undefined | "err" => {
      const s = raw.trim();
      if (!s) return undefined;
      const v = Number(s);
      return Number.isFinite(v) ? v : "err";
    };
    return {
      a: one(a), b: one(b), hb: one(hb), ha: one(ha),
      vertex: one(vertex), base: one(base),
      area: one(area), perim: one(perim),
    };
  }, [a, b, hb, ha, vertex, base, area, perim]);

  const onCalc = () => {
    setError(null); setResult(null);
    for (const [k, v] of Object.entries(parsed)) {
      if (v === "err") { setError(`${LABELS[k] ?? k} is not a valid number.`); return; }
    }
    const inputs: Inputs = {};
    if (typeof parsed.a === "number") inputs.a = parsed.a;
    if (typeof parsed.b === "number") inputs.b = parsed.b;
    if (typeof parsed.hb === "number") inputs.hb = parsed.hb;
    if (typeof parsed.ha === "number") inputs.ha = parsed.ha;
    if (typeof parsed.area === "number") inputs.area = parsed.area;
    if (typeof parsed.perim === "number") inputs.perim = parsed.perim;
    if (typeof parsed.vertex === "number") inputs.vertex = toRad(parsed.vertex, angleUnit);
    if (typeof parsed.base === "number") inputs.base = toRad(parsed.base, angleUnit);
    try {
      setResult(solveIsosceles(inputs));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const copyText = () => {
    if (!result) return "";
    const u = angleUnit === "deg" ? "°" : " rad";
    return [
      `Isosceles Triangle — ${result.caseName}`,
      `a = c = ${fmt(result.a, sig)}`,
      `b = ${fmt(result.b, sig)}`,
      `Vertex angle B = ${fmt(fromRad(result.vertex, angleUnit), sig)}${u}`,
      `Base angles A = C = ${fmt(fromRad(result.base, angleUnit), sig)}${u}`,
      `Perimeter P = ${fmt(result.perim, sig)}`,
      `Semiperimeter s = ${fmt(result.s, sig)}`,
      `Area K = ${fmt(result.area, sig)}`,
      `Height to base hb = ${fmt(result.hb, sig)}`,
      `Height to leg ha = hc = ${fmt(result.ha, sig)}`,
      `Inradius r = ${fmt(result.r, sig)}`,
      `Circumradius R = ${fmt(result.R, sig)}`,
      result.isEquilateral ? "Note: this triangle is also equilateral." : "",
      result.isRight ? "Note: this triangle is also right (45-45-90)." : "",
      result.isGolden ? "Note: this is a golden triangle (a/b ≈ φ)." : "",
    ].filter(Boolean).join("\n");
  };

  return (
    <MathCalcPage
      name="Isosceles Triangle Calculator"
      tagline="Enter any 2 of 8 values — leg a, base b, either altitude (hb or ha), vertex or base angle, area, or perimeter — and get every remaining side, angle, altitude, area, perimeter, inradius and circumradius, with a to-scale diagram and full working."
      extras={<PageExtras />}
    >
      {/* Presets */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            title={p.note}
            onClick={() => p.assign(setters)}
            className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Options */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Angle unit:</span>
          <div className="inline-flex overflow-hidden rounded-full border border-border">
            {(["deg", "rad"] as const).map((u) => (
              <button key={u} type="button" onClick={() => setAngleUnit(u)}
                className={"px-3 py-1 text-xs font-medium transition-colors " +
                  (angleUnit === u ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-accent")}>
                {u === "deg" ? "Degrees" : "Radians"}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Significant figures</span>
          <input type="number" min={2} max={10} value={sig}
            onChange={(e) => setSig(Math.max(2, Math.min(10, Number(e.target.value) || 4)))}
            className="w-16 rounded-lg border border-border bg-background/60 px-2 py-1 text-center text-sm tabular-nums" />
        </label>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Leg a (equal sides, a = c)" htmlFor="is-a">
          <TextInput id="is-a" value={a} onChange={(e) => setA(e.target.value)} placeholder="e.g. 5" inputMode="decimal" />
        </Field>
        <Field label="Base b" htmlFor="is-b">
          <TextInput id="is-b" value={b} onChange={(e) => setB(e.target.value)} placeholder="e.g. 6" inputMode="decimal" />
        </Field>
        <Field label="Height hb (apex → base)" htmlFor="is-hb">
          <TextInput id="is-hb" value={hb} onChange={(e) => setHb(e.target.value)} placeholder="e.g. 4" inputMode="decimal" />
        </Field>
        <Field label="Height ha (base vertex → leg)" htmlFor="is-ha">
          <TextInput id="is-ha" value={ha} onChange={(e) => setHa(e.target.value)} placeholder="e.g. 4.8" inputMode="decimal" />
        </Field>
        <Field label={`Vertex angle B (${angleUnit === "deg" ? "degrees" : "radians"})`} htmlFor="is-vx">
          <TextInput id="is-vx" value={vertex} onChange={(e) => setVertex(e.target.value)} placeholder={angleUnit === "deg" ? "e.g. 73.74" : "e.g. 1.287"} inputMode="decimal" />
        </Field>
        <Field label={`Base angle A = C (${angleUnit === "deg" ? "degrees" : "radians"})`} htmlFor="is-ba">
          <TextInput id="is-ba" value={base} onChange={(e) => setBase(e.target.value)} placeholder={angleUnit === "deg" ? "e.g. 53.13" : "e.g. 0.9273"} inputMode="decimal" />
        </Field>
        <Field label="Area K" htmlFor="is-area">
          <TextInput id="is-area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. 12" inputMode="decimal" />
        </Field>
        <Field label="Perimeter P" htmlFor="is-perim">
          <TextInput id="is-perim" value={perim} onChange={(e) => setPerim(e.target.value)} placeholder="e.g. 16" inputMode="decimal" />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
        <button type="button" onClick={setters.clearAll}
          className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
          Clear
        </button>
        <span className="text-xs text-muted-foreground">
          Enter exactly 2 values. Vertex + 2 × base angle always equals 180°.
        </span>
      </div>

      {error && <ErrorBox message={error} />}

      {result && (
        <div ref={captureRef} className="mt-6 space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{result.caseName}</div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Leg a = c" value={fmt(result.a, sig)} />
              <Stat label="Base b" value={fmt(result.b, sig)} />
              <Stat label="Perimeter P" value={fmt(result.perim, sig)} />
              <Stat label="Vertex angle B" value={`${fmt(fromRad(result.vertex, angleUnit), sig)}${angleUnit === "deg" ? "°" : " rad"}`} />
              <Stat label="Base angles A = C" value={`${fmt(fromRad(result.base, angleUnit), sig)}${angleUnit === "deg" ? "°" : " rad"}`} />
              <Stat label="Semiperimeter s" value={fmt(result.s, sig)} />
              <Stat label="Area K" value={fmt(result.area, sig)} />
              <Stat label="Height hb (to base)" value={fmt(result.hb, sig)} />
              <Stat label="Height ha = hc (to leg)" value={fmt(result.ha, sig)} />
              <Stat label="Inradius r" value={fmt(result.r, sig)} />
              <Stat label="Circumradius R" value={fmt(result.R, sig)} />
            </div>
            {(result.isEquilateral || result.isRight || result.isGolden) && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {result.isEquilateral && <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-medium text-foreground">Also equilateral (a = b, all angles 60°)</span>}
                {result.isRight && <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-medium text-foreground">Also right (45-45-90) — see the Right Triangle Calculator</span>}
                {result.isGolden && <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-medium text-foreground">Golden triangle (a/b ≈ φ)</span>}
              </div>
            )}
          </div>

          <IsoDiagram a={result.a} b={result.b} vertex={result.vertex} base={result.base} hb={result.hb} sig={sig} />

          <StepsToggle steps={result.steps} />

          <ResultActions getCopyText={copyText} captureRef={captureRef} filename="isosceles-triangle" />
        </div>
      )}
    </MathCalcPage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-lg italic tabular-nums text-foreground">{value}</div>
    </div>
  );
}

/* ================= Extras ================= */

function PageExtras() {
  return (
    <>

      <CalcSection title="What is an isosceles triangle?">
        <p>
          An <strong>isosceles triangle</strong> is a triangle with two sides of
          the same length. Those two equal sides are called the <em>legs</em>;
          the third side is the <em>base</em>. The mirror symmetry between the
          two legs forces the two angles at the base to be equal as well — this
          is the <em>isosceles triangle theorem</em>: equal sides face equal
          angles, and (the converse) equal angles face equal sides.
        </p>
        <p>
          Because of that symmetry every isosceles triangle has an <em>axis of symmetry</em>:
          the perpendicular from the apex to the midpoint of the base. That
          single line is the altitude to the base, the median to the base, the
          angle bisector of the vertex angle, and the perpendicular bisector of
          the base all at once — four different definitions collapse onto the
          same segment. That's why any two of a leg, the base, an altitude, an
          angle, the area or the perimeter are enough to determine the whole
          triangle.
        </p>
      </CalcSection>

      <CalcSection title="Isosceles triangles, case by case">
        <GuideCards items={GUIDE} />
      </CalcSection>

      <CalcSection title="Notation used on this page">
        <ReferenceTable
          headers={["Symbol", "Meaning"]}
          rows={[
            [<span className="font-serif italic">a, c</span>, "The two equal legs (a = c by convention)."],
            [<span className="font-serif italic">b</span>, "Base — the odd side, opposite the vertex."],
            [<span className="font-serif italic">A, C</span>, "Base angles (equal, opposite the equal legs)."],
            [<span className="font-serif italic">B</span>, "Vertex angle (between the two legs, at the apex)."],
            [<span className="font-serif italic">hb</span>, "Altitude from apex to base (the axis of symmetry)."],
            [<span className="font-serif italic">ha, hc</span>, "Altitude from a base vertex to the opposite leg (equal to each other)."],
            [<span className="font-serif italic">P, s</span>, "Perimeter and semiperimeter (s = P/2 = a + b/2)."],
            [<span className="font-serif italic">K</span>, "Area."],
            [<span className="font-serif italic">r, R</span>, "Inradius and circumradius."],
          ]}
        />
      </CalcSection>

      <CalcSection title="Formulas at a glance">
        <ReferenceTable
          headers={["Quantity", "Formula", "Where it comes from"]}
          rows={[
            [<>Third side <span className="font-serif italic">c</span></>, <span className="font-serif italic">c = a</span>, "Two legs are equal by definition."],
            [<>Base angles</>, <span className="font-serif italic">A = C = (180° − B) / 2</span>, "Angle sum minus the vertex angle, split evenly."],
            [<>Base from leg + vertex</>, <span className="font-serif italic">b = 2a · sin(B/2)</span>, "Half-triangle at the axis of symmetry."],
            [<>Base angle from sides</>, <span className="font-serif italic">A = arccos(b / 2a)</span>, "cos of base angle = adjacent (b/2) / hypotenuse (a)."],
            [<>Perimeter</>, <span className="font-serif italic">P = 2a + b</span>, "Direct."],
            [<>Semiperimeter</>, <span className="font-serif italic">s = a + b/2</span>, "P / 2."],
            [<>Altitude to base</>, <span className="font-serif italic">hb = √(4a² − b²) / 2</span>, "Pythagoras on the half-triangle."],
            [<>Altitude to leg</>, <span className="font-serif italic">ha = hc = (b / 2a) · √(4a² − b²)</span>, "Two-area identity: ½·b·hb = ½·a·ha."],
            [<>Area</>, <span className="font-serif italic">K = (b / 4) · √(4a² − b²) = ½·a²·sin B</span>, "Base × height ÷ 2, or SAS area formula."],
            [<>Inradius</>, <span className="font-serif italic">r = K / s</span>, "Standard identity for every triangle."],
            [<>Circumradius</>, <span className="font-serif italic">R = a² / √(4a² − b²)</span>, "Law of sines: R = a / (2·sin A)."],
          ]}
        />
      </CalcSection>

      <CalcSection title="All formulas — every calculation mode">
        <AllFormulasSection
          intro={
            <>
              Any two independent inputs from{" "}
              <em>a</em> (leg), <em>b</em> (base), <em>hb</em> (altitude to base),{" "}
              <em>ha</em> (altitude to leg), <em>B</em> (vertex angle),{" "}
              <em>A</em> (base angle), <em>K</em> (area) and <em>P</em> (perimeter)
              determine the whole triangle. The most common pairs are listed below.
            </>
          }
        >
          <ModeFormula
            label="1. Leg a and base b"
            lines={[
              <>hb = √(4a² − b²) / 2</>,
              <>K = ½ · b · hb</>,
              <>A = arccos(b / 2a),   B = 180° − 2A</>,
              <>P = 2a + b</>,
            ]}
          />
          <ModeFormula
            label="2. Leg a and vertex angle B"
            lines={[
              <>b = 2a · sin(B/2)</>,
              <>hb = a · cos(B/2)</>,
              <>K = ½ · a² · sin B</>,
              <>A = (180° − B)/2</>,
            ]}
          />
          <ModeFormula
            label="3. Base b and vertex angle B"
            lines={[
              <>a = b / (2 sin(B/2))</>,
              <>hb = b / (2 tan(B/2))</>,
              <>then apply the "leg a and base b" formulas</>,
            ]}
          />
          <ModeFormula
            label="4. Base b and base angle A"
            lines={[
              <>a = b / (2 cos A)</>,
              <>hb = (b/2) · tan A</>,
              <>B = 180° − 2A</>,
              <>K = ½ · b · hb</>,
            ]}
          />
          <ModeFormula
            label="5. Leg a and altitude to base hb"
            lines={[
              <>b = 2 · √(a² − hb²)</>,
              <>K = ½ · b · hb</>,
              <>then apply the "leg a and base b" formulas</>,
            ]}
          />
          <ModeFormula
            label="6. Base b and altitude to base hb"
            lines={[
              <>a = √((b/2)² + hb²)</>,
              <>K = ½ · b · hb</>,
              <>then apply the "leg a and base b" formulas</>,
            ]}
          />
          <ModeFormula
            label="7. Base b and area K"
            lines={[
              <>hb = 2K / b</>,
              <>a = √((b/2)² + hb²)</>,
              <>then apply the "leg a and base b" formulas</>,
            ]}
          />
          <ModeFormula
            label="8. Perimeter P and any one length"
            lines={[
              <>if a known:  b = P − 2a</>,
              <>if b known:  a = (P − b) / 2</>,
              <>then apply the "leg a and base b" formulas</>,
            ]}
          />
          <ModeFormula
            label="Auxiliary quantities (for every mode)"
            lines={[
              <>Altitude to leg  ha = 2K / a</>,
              <>Semiperimeter  s = P / 2 = a + b/2</>,
              <>Inradius  r = K / s</>,
              <>Circumradius  R = a² / √(4a² − b²)</>,
            ]}
          />
        </AllFormulasSection>
      </CalcSection>



      <CalcSection title="Three ways to get the area">
        <p>
          Depending on which measurements you already have, different area
          formulas save you an extra step:
        </p>
        <FormulaWithLegend
          formula={<>K = (b / 4) · √(4a² − b²)</>}
          legend={[{ sym: "a", def: "leg" }, { sym: "b", def: "base" }]}
        />
        <FormulaWithLegend
          formula={<>K = ½ · b · hb</>}
          legend={[{ sym: "hb", def: "height to the base" }]}
        />
        <FormulaWithLegend
          formula={<>K = ½ · a² · sin B = ½ · a · c · sin B</>}
          legend={[{ sym: "B", def: "vertex angle (between the two legs)" }]}
        />
        <MathNote>
          The first is Heron's identity specialised to the isosceles case; the
          third is the general SAS (two sides + included angle) formula
          simplified by <em>a = c</em>. All three give the same number for a
          valid triangle — a handy way to cross-check by hand.
        </MathNote>
      </CalcSection>

      <CalcSection title="The isosceles triangle theorem (and its converse)">
        <p>
          The isosceles triangle theorem states: <strong>if two sides of a triangle are equal, the angles opposite those sides are equal</strong>.
          The converse also holds: <strong>if two angles of a triangle are equal, the sides opposite those angles are equal</strong>.
          The clean way to see both is to drop the altitude from the apex to the
          base — it splits the triangle into two right triangles that share the
          altitude and the two equal legs, so they're congruent by hypotenuse-leg.
          Corresponding angles match, and that gives A = C directly.
        </p>
      </CalcSection>

      <CalcSection title="The golden triangle in a bit more depth">
        <p>
          When the leg-to-base ratio is the golden ratio φ = (1 + √5)/2 ≈ 1.618,
          the triangle has base angles exactly 72° and vertex angle exactly 36°.
          Bisect one base angle and you cut off a smaller triangle that is
          itself a golden triangle — this self-similarity is what generates the
          logarithmic spiral that shows up in nautilus shells and sunflower
          heads. The five points of a regular pentagram are all golden
          triangles, and the "obtuse" golden triangle (also called the golden
          gnomon) — same φ ratio, but base angles 36° and vertex 108° — tiles
          the plane together with the acute golden triangle in Penrose tilings.
        </p>
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Accepts any 2 of: leg a, base b, height to base hb, height to leg ha, vertex angle B, base angle A, area K, perimeter P.",
            "Degrees or radians toggle for every angle input and output.",
            "Live to-scale SVG showing labelled legs, base, vertex and base angles, tick marks on the equal legs, and the axis of symmetry hb.",
            "One-click presets for equilateral, golden triangle, 45-45-90 (isosceles right), and a roof-gable example.",
            "Auto-detects equilateral, right and golden cases and flags them in the result panel.",
            "Reports every side, angle, altitude, area, perimeter, semiperimeter, inradius r = K/s and circumradius R = a²/√(4a² − b²).",
            "Personalised step-by-step derivation using your actual numbers — every substitution shown.",
          ]}
        />
      </CalcSection>

      <CalcSection title="Frequently asked questions">
        <CalcFAQ items={FAQ_ITEMS.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))} />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/triangle-calculator", label: "Triangle Calculator (any triangle: SSS, SAS, ASA, AAS, SSA)" },
            { to: "/calculators/math/right-triangle-calculator", label: "Right Triangle Calculator (one 90° angle)" },
            { to: "/calculators/math/pythagorean-theorem-calculator", label: "Pythagorean Theorem Calculator (a² + b² = c²)" },
            { to: "/calculators/math/area-calculator", label: "Area Calculator" },
          ]}
        />
        <MathNote>
          Not sure which to use? Pick <em>this</em> page when two sides of your
          triangle are equal. Pick the <em>Right Triangle Calculator</em> when
          one angle is exactly 90°. Pick the general <em>Triangle Calculator</em>
          when the triangle is scalene (all three sides different) and you know
          any three measurements.
        </MathNote>
      </CalcSection>
    </>
  );
}

export const Route = createFileRoute("/calculators/math/isosceles-triangle-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Isosceles Triangle Calculator",
      title: "Isosceles Triangle Calculator — Sides, Angles, Height & Area",
      metaDescription:
        "Solve an isosceles triangle from any 2 of 8 values — leg, base, either altitude (hb or ha), vertex or base angle, area or perimeter. Reports every side, angle, altitude, perimeter, area, inradius and circumradius, with a to-scale diagram, golden-triangle preset and full step-by-step working.",
      canonicalUrl: "/calculators/math/isosceles-triangle-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Isosceles Triangle Calculator", path: "/calculators/math/isosceles-triangle-calculator" },
      ],
      faqs: FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a })),
    }),
  component: IsoscelesPage,
});
