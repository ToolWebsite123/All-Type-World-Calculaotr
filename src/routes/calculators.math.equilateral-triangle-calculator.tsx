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
  FormulaWithLegend,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  StackedMath,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import { TO_M } from "@/lib/math/geometry-shared";

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

/* ================= Math core =================
 * Every equilateral-triangle quantity is a fixed multiple of the side a,
 * so we solve for a first and derive the rest. */

const SQRT3 = Math.sqrt(3);
const RATIO = {
  perim: 3,                   // P  = 3a
  height: SQRT3 / 2,          // h  = (√3/2) a
  area: SQRT3 / 4,            // A  = (√3/4) a²   (quadratic in a)
  R: 1 / SQRT3,               // R  = a / √3
  r: 1 / (2 * SQRT3),         // r  = a / (2√3)
} as const;

type Unit = "mm" | "cm" | "m" | "km" | "in" | "ft" | "yd";
const LINEAR_UNITS: Unit[] = ["mm", "cm", "m", "km", "in", "ft", "yd"];
const AREA_LABEL: Record<Unit, string> = {
  mm: "mm²", cm: "cm²", m: "m²", km: "km²", in: "in²", ft: "ft²", yd: "yd²",
};

function fmt(n: number, sig = 6): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-6) return n.toExponential(Math.max(2, sig - 2));
  return Number(n.toPrecision(Math.max(1, sig))).toString();
}

type SolveField = "side" | "perim" | "height" | "area" | "R" | "r";
const FIELD_LABEL: Record<SolveField, string> = {
  side: "Side a",
  perim: "Perimeter P",
  height: "Height h",
  area: "Area A",
  R: "Circumradius R",
  r: "Inradius r",
};

interface Solved {
  side: number;
  perim: number;
  height: number;
  area: number;
  R: number;
  r: number;
  from: SolveField;
  steps: Step[];
}

function sideFrom(field: SolveField, v: number): { side: number; note: ReactNode } {
  switch (field) {
    case "side":
      return { side: v, note: <MathLine>a = {fmt(v)}</MathLine> };
    case "perim":
      return {
        side: v / 3,
        note: <MathLine>a = P / 3 = {fmt(v)} / 3 = {fmt(v / 3)}</MathLine>,
      };
    case "height":
      return {
        side: (2 * v) / SQRT3,
        note: (
          <MathLine>
            a = 2h / √3 = 2·{fmt(v)} / √3 = {fmt((2 * v) / SQRT3)}
          </MathLine>
        ),
      };
    case "area": {
      const s = Math.sqrt((4 * v) / SQRT3);
      return {
        side: s,
        note: (
          <MathLine>
            a = √(4A / √3) = √(4·{fmt(v)} / √3) = {fmt(s)}
          </MathLine>
        ),
      };
    }
    case "R":
      return {
        side: v * SQRT3,
        note: <MathLine>a = R · √3 = {fmt(v)} · √3 = {fmt(v * SQRT3)}</MathLine>,
      };
    case "r":
      return {
        side: v * 2 * SQRT3,
        note: (
          <MathLine>a = 2r · √3 = 2·{fmt(v)} · √3 = {fmt(v * 2 * SQRT3)}</MathLine>
        ),
      };
  }
}

function solveEquilateral(from: SolveField, value: number, unit: Unit): Solved {
  if (!(value > 0)) throw new Error(`${FIELD_LABEL[from]} must be a positive number.`);
  const steps: Step[] = [];
  const { side, note } = sideFrom(from, value);
  steps.push({
    title: `Recover the side length from ${FIELD_LABEL[from]}`,
    body: note,
  });
  const perim = 3 * side;
  const height = (SQRT3 / 2) * side;
  const area = (SQRT3 / 4) * side * side;
  const R = side / SQRT3;
  const r = side / (2 * SQRT3);
  steps.push({
    title: "Derive every other measurement from a",
    body: (
      <>
        <MathLine>P = 3a = 3·{fmt(side)} = {fmt(perim)} {unit}</MathLine>
        <MathLine>h = (√3 / 2)·a = {fmt(height)} {unit}</MathLine>
        <MathLine>A = (√3 / 4)·a² = {fmt(area)} {AREA_LABEL[unit]}</MathLine>
        <MathLine>R = a / √3 = {fmt(R)} {unit}</MathLine>
        <MathLine>r = a / (2√3) = {fmt(r)} {unit}</MathLine>
      </>
    ),
  });
  return { side, perim, height, area, R, r, from, steps };
}

/* ================= Unit conversion table ================= */

function LengthTable({ meters, label }: { meters: number; label: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label} in other length units
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {LINEAR_UNITS.map((u) => (
          <div key={u} className="flex justify-between border-b border-border/40 py-1">
            <span className="text-muted-foreground">{u}</span>
            <span className="font-serif italic tabular-nums text-foreground">
              {fmt(meters / TO_M[u], 6)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AreaTable({ m2 }: { m2: number }) {
  // m² → other units²
  const factor: Record<Unit, number> = {
    mm: 1e-6, cm: 1e-4, m: 1, km: 1e6,
    in: 0.00064516, ft: 0.09290304, yd: 0.83612736,
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Area in other units
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {LINEAR_UNITS.map((u) => (
          <div key={u} className="flex justify-between border-b border-border/40 py-1">
            <span className="text-muted-foreground">{AREA_LABEL[u]}</span>
            <span className="font-serif italic tabular-nums text-foreground">
              {fmt(m2 / factor[u], 6)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= SVG Diagram ================= */

function EqDiagram({ side, height, sig, unit }: { side: number; height: number; sig: number; unit: Unit }) {
  const W = 360, H = 300, pad = 40;
  const scale = Math.min((W - 2 * pad) / side, (H - 2 * pad - 20) / height);
  const bw = side * scale, hh = height * scale;
  const cx = W / 2;
  const yBase = H - pad;
  const xL = cx - bw / 2, xR = cx + bw / 2;
  const yA = yBase - hh;
  const midL = { x: (xL + cx) / 2, y: (yBase + yA) / 2 };
  const midR = { x: (xR + cx) / 2, y: (yBase + yA) / 2 };
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        To-scale equilateral triangle (all sides {fmt(side, sig)} {unit}, all angles 60°)
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-label="equilateral triangle">
        <polygon points={`${xL},${yBase} ${xR},${yBase} ${cx},${yA}`}
          style={{ fill: "var(--primary)", opacity: 0.08 }} />
        <line x1={xL} y1={yBase} x2={cx} y2={yA} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={xR} y1={yBase} x2={cx} y2={yA} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={xL} y1={yBase} x2={xR} y2={yBase} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        {/* altitude */}
        <line x1={cx} y1={yBase} x2={cx} y2={yA} style={{ stroke: "var(--primary)" }} strokeWidth={1.8} strokeDasharray="4 3" />
        <rect x={cx} y={yBase - 10} width={10} height={10} fill="none" style={{ stroke: "var(--muted-foreground)" }} strokeWidth={1.2} />
        {/* tick marks — all three sides equal */}
        <SideTick a={{ x: xL, y: yBase }} b={{ x: cx, y: yA }} />
        <SideTick a={{ x: xR, y: yBase }} b={{ x: cx, y: yA }} />
        <SideTick a={{ x: xL, y: yBase }} b={{ x: xR, y: yBase }} />

        <text x={midL.x - 8} y={midL.y - 4} textAnchor="end" fontSize="13" fontWeight="600" fontStyle="italic" className="fill-foreground">
          a = {fmt(side, sig)}
        </text>
        <text x={midR.x + 8} y={midR.y - 4} fontSize="13" fontWeight="600" fontStyle="italic" className="fill-foreground">
          a = {fmt(side, sig)}
        </text>
        <text x={cx} y={yBase + 20} textAnchor="middle" fontSize="13" fontWeight="600" fontStyle="italic" className="fill-foreground">
          a = {fmt(side, sig)}
        </text>
        <text x={cx + 6} y={(yBase + yA) / 2 + 4} fontSize="12" fontStyle="italic" style={{ fill: "var(--primary)" }}>
          h = {fmt(height, sig)}
        </text>
        <text x={cx} y={yA - 6} textAnchor="middle" fontSize="12" fontStyle="italic" className="fill-foreground">60°</text>
        <text x={xL - 4} y={yBase - 6} textAnchor="end" fontSize="12" fontStyle="italic" className="fill-foreground">60°</text>
        <text x={xR + 4} y={yBase - 6} fontSize="12" fontStyle="italic" className="fill-foreground">60°</text>
      </svg>
    </div>
  );
}

function SideTick({ a, b }: { a: { x: number; y: number }; b: { x: number; y: number } }) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const t = 5;
  return (
    <line x1={mx - nx * t} y1={my - ny * t} x2={mx + nx * t} y2={my + ny * t}
      style={{ stroke: "var(--primary)" }} strokeWidth={2} />
  );
}

/* ================= FAQ + Guide content ================= */

const FAQ_ITEMS = [
  {
    q: "What is an equilateral triangle?",
    a: "An equilateral triangle is a triangle in which all three sides have the same length. Because equal sides face equal angles, all three interior angles are also equal — and because they must add to 180°, each angle is exactly 60°. That single symmetry makes it the most regular of all triangles: it's both isosceles (twice over) and equiangular.",
  },
  {
    q: "How do you find the area of an equilateral triangle?",
    a: "Use A = (√3 / 4)·a², where a is the side length. It comes from the standard base × height ÷ 2 formula with height h = (√3/2)a substituted in. For a = 6, A = (√3/4)·36 = 9√3 ≈ 15.588.",
  },
  {
    q: "How do you find the height of an equilateral triangle?",
    a: "Drop an altitude from any vertex to the opposite side — it bisects that side. The resulting right triangle has hypotenuse a and one leg a/2, so by Pythagoras the height is h = √(a² − (a/2)²) = (√3/2)·a. For a = 10, h ≈ 8.660.",
  },
  {
    q: "How do you find the side length from the area?",
    a: "Invert A = (√3/4)·a² to get a = √(4A / √3). For A = 25, a = √(100/√3) ≈ 7.6.",
  },
  {
    q: "What are the circumradius and inradius of an equilateral triangle?",
    a: "R (circumradius, the radius of the circle through all three vertices) = a / √3. r (inradius, the radius of the largest inscribed circle) = a / (2√3). Note R = 2r exactly — a property unique to equilateral triangles.",
  },
  {
    q: "Are all equilateral triangles similar?",
    a: "Yes. Since every equilateral triangle has three 60° angles, any two equilateral triangles are similar by AAA. They only differ in scale, so ratios like h/a = √3/2, R/a = 1/√3 and area/side² = √3/4 are the same for every one of them.",
  },
  {
    q: "How is this calculator different from the general Triangle Calculator?",
    a: "This page only needs one measurement — a side, the perimeter, the height, the area, R, or r — because equilateral triangles are fully determined by scale. The general Triangle Calculator needs three inputs (SSS, SAS, ASA, AAS, SSA) because a scalene triangle has three independent degrees of freedom.",
  },
  {
    q: "Where do equilateral triangles show up in real life?",
    a: "Traffic yield signs, the faces of a regular tetrahedron, the fundamental tile of a triangular tiling, roof-truss webs, geodesic domes, the outline of many warning symbols, and the isogonic (Fermat) point of certain networks. Anywhere maximum symmetry or rigidity matters, the equilateral triangle shows up.",
  },
] as const;

const GUIDE: GuideCardItem[] = [
  {
    key: "from-side",
    title: "Everything from the side length",
    explain:
      "The side is the natural input — every other quantity is a fixed multiple of it. Perimeter is three times the side; height is √3/2 times the side; area is √3/4 times the side squared. If you already know a, no other input is needed.",
    formula: <>P = 3a &nbsp;·&nbsp; h = (√3/2)·a &nbsp;·&nbsp; A = (√3/4)·a²</>,
    legend: [
      { sym: "a", def: "any side (all three are equal)" },
      { sym: "P", def: "perimeter" },
      { sym: "h", def: "height (altitude from any vertex)" },
      { sym: "A", def: "area" },
    ],
    diagram: <MiniEq />,
    example: {
      given: <>a = 6</>,
      substitute: <>P = 18, &nbsp; h = 3√3, &nbsp; A = 9√3</>,
      answer: <>P = 18, &nbsp; h ≈ 5.196, &nbsp; A ≈ 15.588</>,
    },
  },
  {
    key: "area-derivation",
    title: "Where the area formula comes from",
    explain:
      "The altitude bisects the base, so the half-triangle is a right triangle with hypotenuse a and one leg a/2. Pythagoras gives the other leg (the height) as (√3/2)·a. Substitute that back into base × height ÷ 2 and the a's collect: A = ½·a·(√3/2)·a = (√3/4)·a².",
    formula: <>A = ½·a·h &nbsp;·&nbsp; h = (√3/2)·a &nbsp;⇒&nbsp; A = (√3/4)·a²</>,
    legend: [
      { sym: "a", def: "side length" },
      { sym: "h", def: "height" },
    ],
    diagram: <MiniEq showAltitude />,
    example: {
      given: <>a = 10</>,
      substitute: <>A = (√3/4)·100 = 25√3</>,
      answer: <>A ≈ 43.301</>,
    },
  },
  {
    key: "reverse",
    title: "Reverse: side from area, perimeter or height",
    explain:
      "Because the ratios between quantities are fixed, any single measurement locks the triangle down. Solve backwards to get the side, then the rest follows automatically.",
    formula: (
      <>
        a = P / 3 &nbsp;·&nbsp; a = 2h / √3 &nbsp;·&nbsp; a = √(4A / √3)
      </>
    ),
    legend: [
      { sym: "P", def: "perimeter" },
      { sym: "h", def: "height" },
      { sym: "A", def: "area" },
    ],
    diagram: <MiniEq />,
    example: {
      given: <>A = 25</>,
      substitute: <>a = √(4·25 / √3) = √(100/√3)</>,
      answer: <>a ≈ 7.6</>,
    },
  },
  {
    key: "circles",
    title: "The two circles — inradius and circumradius",
    explain:
      "The incircle is the largest circle that fits inside the triangle; the circumcircle passes through all three vertices. For an equilateral triangle both circles share the same centre (the centroid), and the circumradius is exactly twice the inradius — a relationship that is unique to this shape.",
    formula: <>R = a / √3 &nbsp;·&nbsp; r = a / (2√3) &nbsp;·&nbsp; R = 2r</>,
    legend: [
      { sym: "R", def: "circumradius (through all three vertices)" },
      { sym: "r", def: "inradius (largest inscribed circle)" },
    ],
    diagram: <MiniEq showCircles />,
    example: {
      given: <>a = 6</>,
      substitute: <>R = 6/√3, &nbsp; r = 6/(2√3)</>,
      answer: <>R ≈ 3.464, &nbsp; r ≈ 1.732</>,
    },
  },
  {
    key: "from-perimeter",
    title: "Starting from the perimeter",
    explain:
      "If the fence around the triangle is what you know, divide by three to recover the side and then let every other quantity fall out of it. Perimeter is the friendliest reverse input because no square roots appear until you go for the height or area.",
    formula: <>a = P / 3 &nbsp;⇒&nbsp; h = (√3/2)·a &nbsp;·&nbsp; A = (√3/4)·a² &nbsp;·&nbsp; R = a/√3 &nbsp;·&nbsp; r = a/(2√3)</>,
    legend: [
      { sym: "P", def: "perimeter (known)" },
      { sym: "a", def: "side length" },
    ],
    diagram: <MiniEq />,
    example: {
      given: <>P = 30 cm</>,
      substitute: <>a = 30/3 = 10, &nbsp; h = 5√3, &nbsp; A = 25√3, &nbsp; R = 10/√3, &nbsp; r = 10/(2√3)</>,
      answer: <>a = 10 cm, &nbsp; h ≈ 8.660 cm, &nbsp; A ≈ 43.301 cm², &nbsp; R ≈ 5.774 cm, &nbsp; r ≈ 2.887 cm</>,
    },
  },
  {
    key: "from-circumradius",
    title: "Starting from the circumradius R",
    explain:
      "The circumcircle passes through all three vertices; its radius fixes the scale of the triangle. Multiply R by √3 to get the side, then use R = 2r to read off the inradius for free — no separate calculation needed.",
    formula: <>a = R·√3 &nbsp;·&nbsp; r = R / 2 &nbsp;⇒&nbsp; h = (√3/2)·a &nbsp;·&nbsp; P = 3a &nbsp;·&nbsp; A = (√3/4)·a²</>,
    legend: [
      { sym: "R", def: "circumradius (known)" },
      { sym: "r", def: "inradius" },
    ],
    diagram: <MiniEq showCircles />,
    example: {
      given: <>R = 5 cm</>,
      substitute: <>a = 5√3, &nbsp; r = 2.5, &nbsp; h = (√3/2)·5√3 = 15/2, &nbsp; P = 15√3, &nbsp; A = 75√3/4</>,
      answer: <>a ≈ 8.660 cm, &nbsp; h = 7.5 cm, &nbsp; P ≈ 25.981 cm, &nbsp; A ≈ 32.476 cm², &nbsp; r = 2.5 cm</>,
    },
  },
  {
    key: "from-inradius",
    title: "Starting from the inradius r",
    explain:
      "The incircle is the largest circle that fits snugly inside the triangle, touching each side once. Its radius is exactly half the circumradius, so doubling r and multiplying by √3 gives the side — everything else follows the standard chain.",
    formula: <>a = 2r·√3 &nbsp;·&nbsp; R = 2r &nbsp;⇒&nbsp; h = 3r &nbsp;·&nbsp; P = 3a &nbsp;·&nbsp; A = (√3/4)·a²</>,
    legend: [
      { sym: "r", def: "inradius (known)" },
      { sym: "R", def: "circumradius" },
    ],
    diagram: <MiniEq showCircles />,
    example: {
      given: <>r = 3 cm</>,
      substitute: <>a = 2·3·√3 = 6√3, &nbsp; R = 6, &nbsp; h = 9, &nbsp; P = 18√3, &nbsp; A = (√3/4)·108 = 27√3</>,
      answer: <>a ≈ 10.392 cm, &nbsp; h = 9 cm, &nbsp; P ≈ 31.177 cm, &nbsp; A ≈ 46.765 cm², &nbsp; R = 6 cm</>,
    },
  },
];

function MiniEq({ showAltitude, showCircles }: { showAltitude?: boolean; showCircles?: boolean }) {
  const W = 300, H = 220, pad = 24;
  const side = 6;
  const h = (SQRT3 / 2) * side;
  const scale = Math.min((W - 2 * pad) / side, (H - 2 * pad - 12) / h);
  const bw = side * scale, hh = h * scale;
  const cx = W / 2, yBase = H - pad;
  const xL = cx - bw / 2, xR = cx + bw / 2, yA = yBase - hh;
  const centroidY = yBase - hh / 3;
  const R = (side / SQRT3) * scale;
  const r = (side / (2 * SQRT3)) * scale;
  return (
    <div className="flex items-center justify-center rounded-xl border border-border/60 bg-secondary/20 p-3 text-foreground">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[300px] h-auto" aria-label="equilateral triangle">
        {showCircles && (
          <>
            <circle cx={cx} cy={centroidY} r={R} fill="none" style={{ stroke: "var(--primary)" }} strokeWidth={1.2} strokeDasharray="3 3" />
            <circle cx={cx} cy={centroidY} r={r} fill="none" style={{ stroke: "var(--primary)" }} strokeWidth={1.2} />
          </>
        )}
        <polygon points={`${xL},${yBase} ${xR},${yBase} ${cx},${yA}`} style={{ fill: "var(--primary)", opacity: 0.08 }} />
        <line x1={xL} y1={yBase} x2={cx} y2={yA} stroke="currentColor" strokeWidth={2.5} />
        <line x1={xR} y1={yBase} x2={cx} y2={yA} stroke="currentColor" strokeWidth={2.5} />
        <line x1={xL} y1={yBase} x2={xR} y2={yBase} stroke="currentColor" strokeWidth={2.5} />
        <SideTick a={{ x: xL, y: yBase }} b={{ x: cx, y: yA }} />
        <SideTick a={{ x: xR, y: yBase }} b={{ x: cx, y: yA }} />
        <SideTick a={{ x: xL, y: yBase }} b={{ x: xR, y: yBase }} />
        {showAltitude && (
          <>
            <line x1={cx} y1={yBase} x2={cx} y2={yA} style={{ stroke: "var(--primary)" }} strokeWidth={1.8} strokeDasharray="4 3" />
            <text x={cx + 6} y={(yBase + yA) / 2} fontSize="12" fontStyle="italic" style={{ fill: "var(--primary)" }}>h</text>
          </>
        )}
        {showCircles && (
          <>
            <text x={cx + R + 4} y={centroidY + 4} fontSize="11" fontStyle="italic" style={{ fill: "var(--primary)" }}>R</text>
            <text x={cx + r + 4} y={centroidY - 4} fontSize="11" fontStyle="italic" style={{ fill: "var(--primary)" }}>r</text>
          </>
        )}
        <text x={cx} y={yA - 4} textAnchor="middle" fontSize="12" fontStyle="italic">60°</text>
        <text x={xL - 4} y={yBase - 4} textAnchor="end" fontSize="12" fontStyle="italic">60°</text>
        <text x={xR + 4} y={yBase - 4} fontSize="12" fontStyle="italic">60°</text>
      </svg>
    </div>
  );
}

/* ================= Presets ================= */

const PRESETS: { label: string; note?: string; from: SolveField; value: string }[] = [
  { label: "Yield sign (side 90 cm)", from: "side", value: "90" },
  { label: "Tetrahedron face (side 1)", from: "side", value: "1" },
  { label: "Roof gable (side 4 m)", from: "side", value: "4" },
  { label: "From area = 25", from: "area", value: "25" },
  { label: "From perimeter = 30", from: "perim", value: "30" },
  { label: "From height = 10", from: "height", value: "10" },
];

/* ================= Page ================= */

function EquilateralPage() {
  const [from, setFrom] = useState<SolveField>("side");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<Unit>("cm");
  const [sig, setSig] = useState(4);
  const [result, setResult] = useState<Solved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => {
    const s = value.trim();
    if (!s) return null;
    const v = Number(s);
    return Number.isFinite(v) ? v : "err";
  }, [value]);

  const onCalc = () => {
    setError(null);
    setResult(null);
    if (parsed === null) {
      setError(`Enter a value for ${FIELD_LABEL[from]}.`);
      return;
    }
    if (parsed === "err") {
      setError(`${FIELD_LABEL[from]} is not a valid number.`);
      return;
    }
    try {
      setResult(solveEquilateral(from, parsed, unit));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const clearAll = () => {
    setValue("");
    setResult(null);
    setError(null);
  };

  const copyText = () => {
    if (!result) return "";
    return [
      `Equilateral Triangle — solved from ${FIELD_LABEL[result.from]}`,
      `Side a = ${fmt(result.side, sig)} ${unit}`,
      `Perimeter P = ${fmt(result.perim, sig)} ${unit}`,
      `Height h = ${fmt(result.height, sig)} ${unit}`,
      `Area A = ${fmt(result.area, sig)} ${AREA_LABEL[unit]}`,
      `Circumradius R = ${fmt(result.R, sig)} ${unit}`,
      `Inradius r = ${fmt(result.r, sig)} ${unit}`,
      `All angles = 60°`,
    ].join("\n");
  };

  return (
    <MathCalcPage
      name="Equilateral Triangle Calculator"
      tagline="Enter any one of side, perimeter, height, area, circumradius or inradius and get every other measurement — with a to-scale diagram, unit conversion table and step-by-step working."
      extras={<PageExtras />}
    >
      {/* Presets */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            title={p.note}
            onClick={() => {
              setFrom(p.from);
              setValue(p.value);
              setError(null);
              setResult(null);
            }}
            className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Options */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Length unit</span>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            className="rounded-lg border border-border bg-background/60 px-2 py-1 text-sm"
          >
            {LINEAR_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Significant figures</span>
          <input
            type="number"
            min={2}
            max={10}
            value={sig}
            onChange={(e) => setSig(Math.max(2, Math.min(10, Number(e.target.value) || 4)))}
            className="w-16 rounded-lg border border-border bg-background/60 px-2 py-1 text-center text-sm tabular-nums"
          />
        </label>
      </div>

      {/* Solve-for */}
      <Field label="Solve from" htmlFor="eq-from">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FIELD_LABEL) as SolveField[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrom(f)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (from === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent")
              }
            >
              {FIELD_LABEL[f]}
            </button>
          ))}
        </div>
      </Field>

      <div className="mt-4">
        <Field
          label={`${FIELD_LABEL[from]} (${from === "area" ? AREA_LABEL[unit] : unit})`}
          htmlFor="eq-val"
          hint="Only one input is needed — the equilateral triangle is fully determined by scale."
        >
          <TextInput
            id="eq-val"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 6"
            inputMode="decimal"
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Clear
        </button>
      </div>

      {error && <ErrorBox message={error} />}

      {result && (
        <div ref={captureRef} className="mt-6 space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Solved from {FIELD_LABEL[result.from]}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label={`Side a (${unit})`} value={fmt(result.side, sig)} />
              <Stat label={`Perimeter P (${unit})`} value={fmt(result.perim, sig)} />
              <Stat label={`Height h (${unit})`} value={fmt(result.height, sig)} />
              <Stat label={`Area A (${AREA_LABEL[unit]})`} value={fmt(result.area, sig)} />
              <Stat label={`Circumradius R (${unit})`} value={fmt(result.R, sig)} />
              <Stat label={`Inradius r (${unit})`} value={fmt(result.r, sig)} />
              <Stat label="All angles" value="60°" />
              <Stat label="R : r" value="2 : 1" />
              <Stat label="h / a" value={fmt(SQRT3 / 2, sig)} />
            </div>
          </div>

          <EqDiagram side={result.side} height={result.height} sig={sig} unit={unit} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LengthTable meters={result.side * TO_M[unit]} label={`Side a`} />
            <LengthTable meters={result.height * TO_M[unit]} label={`Height h`} />
            <LengthTable meters={result.perim * TO_M[unit]} label={`Perimeter P`} />
            <AreaTable m2={result.area * TO_M[unit] * TO_M[unit]} />
          </div>

          <StepsToggle steps={result.steps} />

          <ResultActions getCopyText={copyText} captureRef={captureRef} filename="equilateral-triangle" />
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
      <CalcSection title="What is an equilateral triangle?">
        <p>
          An <strong>equilateral triangle</strong> is the simplest possible
          regular polygon: three sides, all cut to the same length. That one
          constraint on the sides quietly fixes everything else about the
          shape. The three interior angles have to match too, and because the
          angles in any triangle add to 180°, each corner works out to exactly
          <strong> 60°</strong>. It has three axes of mirror symmetry and a
          120° rotational symmetry — properties no other triangle shares.
        </p>
        <p>
          A practical consequence of all that symmetry is that <em>one number
          is enough</em>. Give this calculator any single measurement — the
          side, the perimeter around the outside, the vertical height, the
          area of the interior, the inscribed circle's radius, or the
          circumscribed circle's radius — and the remaining five follow from
          a short chain of algebra. That is why the input box below only asks
          for one value at a time.
        </p>
      </CalcSection>


      <CalcSection title="Equilateral triangle, case by case">
        <GuideCards items={GUIDE} />
      </CalcSection>

      <CalcSection title="Formulas at a glance">
        <ReferenceTable
          headers={["Quantity", "Formula", "Reverse"]}
          rows={[
            [<>Perimeter</>, <span className="font-serif italic">P = 3a</span>, <span className="font-serif italic">a = P / 3</span>],
            [<>Height</>, <span className="font-serif italic">h = (√3 / 2)·a</span>, <span className="font-serif italic">a = 2h / √3</span>],
            [<>Area</>, <span className="font-serif italic">A = (√3 / 4)·a²</span>, <span className="font-serif italic">a = √(4A / √3)</span>],
            [<>Circumradius</>, <span className="font-serif italic">R = a / √3</span>, <span className="font-serif italic">a = R·√3</span>],
            [<>Inradius</>, <span className="font-serif italic">r = a / (2√3)</span>, <span className="font-serif italic">a = 2r·√3</span>],
            [<>R vs r</>, <span className="font-serif italic">R = 2r</span>, "Unique to equilateral triangles."],
          ]}
        />
      </CalcSection>






      <CalcSection title="What this tool does for you">
        <FeatureList
          items={[
            "Accepts any one of six inputs — side, perimeter, height, area, circumradius or inradius — and back-solves the other five in a single click.",
            "Lets you pick the length unit up front (mm, cm, m, km, in, ft, yd) so both the input you type and every output stay in the same system.",
            "Renders a conversion table alongside the answer so a side of 10 cm is instantly visible as mm, m, inches and feet without a second calculation.",
            "Draws a to-scale SVG of the triangle with the height dashed, the inscribed and circumscribed circles optional, and all three 60° corners labelled.",
            "Ships with one-tap presets — a real-world yield sign, a tetrahedron face, a roof gable, and reverse-from-area / perimeter / height starting points.",
            "Prints a personalised working-out that plugs your actual number into each formula, so the algebra is easy to copy into homework or a report.",
            "Includes a copy-to-clipboard action plus a diagram snapshot download, both respecting the significant-figures setting you choose.",
            "Runs entirely in your browser — nothing you type is uploaded, and the page works offline once loaded.",
          ]}
        />
      </CalcSection>



      <CalcSection title="Common mistakes to avoid">
        <FeatureList
          items={[
            <>Using <em>h = a</em> instead of <em>h = (√3/2)·a</em>. The height is always shorter than the side by roughly 13% — the two are never equal for any equilateral triangle.</>,
            <>Mixing linear and area units in the same answer. If you type the side in inches, the area comes out in square inches, not inches — the calculator's area label reminds you which one it is.</>,
            <>Confusing R and r. The circumradius sits outside touching the vertices, the inradius sits inside touching the edges; getting them the wrong way round doubles or halves your answer.</>,
            <>Forgetting that "equilateral" also means equiangular. If a problem tells you a triangle is equilateral, you already know all three angles are 60° — you don't need to be given them.</>,
            <>Squaring only part of the side when computing area. The formula is (√3/4)·<em>a²</em>, not (√3/4)·<em>a</em>; the whole side gets squared, not just the numeric part.</>,
            <>Rounding √3 to 1.7 in the middle of a calculation. Keep it symbolic (or at 1.7320508) until the last step — rounding early can shift the final answer by a full percent on small triangles.</>,
          ]}
        />
      </CalcSection>

      <CalcSection title="Key concepts worth remembering">
        <FeatureList
          items={[
            <><strong>Fixed ratios.</strong> Every equilateral triangle is a scaled copy of every other one, so h/a, R/a, r/a and A/a² are the same constants no matter how big or small the triangle is.</>,
            <><strong>One input is enough.</strong> Unlike scalene triangles (which need three independent measurements), a single number — side, height, area, perimeter, R, or r — pins the whole shape down.</>,
            <><strong>R = 2r.</strong> The circumradius is exactly twice the inradius. That 2:1 lock is unique to equilateral triangles; no other triangle shape has it.</>,
            <><strong>The centroid, incenter, circumcenter and orthocenter coincide.</strong> All four "centres" collapse to the same point — another consequence of full three-fold symmetry.</>,
            <><strong>Height splits the triangle into two 30-60-90 right triangles.</strong> That's where the √3 comes from — it's the long-leg-to-short-leg ratio in the 30-60-90 family.</>,
            <><strong>Area scales as the square of the side.</strong> Doubling <em>a</em> quadruples <em>A</em>; tripling <em>a</em> makes the area nine times bigger. Perimeter, height, R and r all scale linearly.</>,
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
            { to: "/calculators/math/isosceles-triangle-calculator", label: "Isosceles Triangle Calculator (two equal sides)" },
            { to: "/calculators/math/right-triangle-calculator", label: "Right Triangle Calculator (one 90° angle)" },
            { to: "/calculators/math/pythagorean-theorem-calculator", label: "Pythagorean Theorem Calculator (a² + b² = c²)" },
            { to: "/calculators/math/area-calculator", label: "Area Calculator (all common shapes)" },
          ]}
        />
      </CalcSection>
    </>
  );
}

export const Route = createFileRoute("/calculators/math/equilateral-triangle-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Equilateral Triangle Calculator",
      title: "Equilateral Triangle Calculator — Side, Height, Area & Perimeter",
      metaDescription:
        "Solve an equilateral triangle from any one value — side, perimeter, height, area, inradius or circumradius. Get every other measurement plus a to-scale diagram, unit conversion table and step-by-step working. All angles 60°.",
      canonicalUrl: "/calculators/math/equilateral-triangle-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Equilateral Triangle Calculator", path: "/calculators/math/equilateral-triangle-calculator" },
      ],
      faqs: FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a })),
    }),
  component: EquilateralPage,
});
