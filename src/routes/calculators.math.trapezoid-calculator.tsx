import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  MathCalcPage,
  CalcSection,
  FormulaBlock,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  Field,
  TextInput,
  PrimaryButton,
  ResultBox,
  ErrorBox,
  GuideCards,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  num,
  fmt,
  TO_M,
  TO_M2,
  trapezoidHeightFromSides,
} from "@/lib/math/geometry-shared";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Unit = "mm" | "cm" | "m" | "km" | "in" | "ft" | "yd";
type Shape = "scalene" | "isosceles" | "right";

type Mode =
  | "area-abh"
  | "find-a"
  | "find-b"
  | "find-h"
  | "sides-c-angleA" // a, b, c, ∠A
  | "sides-d-angleD" // a, b, d, ∠D
  | "angles-A-D" // a, b, ∠A, ∠D
  | "all-sides" // a, b, c, d
  | "isosceles-quick" // a, b, c (c = d)
  | "right-quick" // a, b, c (c = h, ∠A = ∠B = 90°)
  | "diagonals" // p, q, θ between diagonals
  | "coords"; // 4 vertices


interface Solved {
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  h?: number;
  m?: number; // midsegment
  P?: number;
  Area?: number;
  p?: number; // diagonal AC
  q?: number; // diagonal BD
  angleA?: number; // radians
  angleB?: number;
  angleC?: number;
  angleD?: number;
  /** Local vertex coords in geometry space (A bottom-left origin). */
  verts?: [number, number][];
  steps?: Step[];
  warning?: string;
  error?: string;
}


/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DEG = (r: number) => (r * 180) / Math.PI;
const RAD = (d: number) => (d * Math.PI) / 180;

function fmtA(rad: number | undefined): string {
  if (rad == null || !Number.isFinite(rad)) return "—";
  return `${fmt(DEG(rad), 2)}°`;
}

function step(title: string, body: ReactNode): Step {
  return { title, body };
}

function anglesFromCoords(v: [number, number][]): number[] {
  const n = v.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = v[(i - 1 + n) % n];
    const cur = v[i];
    const next = v[(i + 1) % n];
    const v1x = prev[0] - cur[0];
    const v1y = prev[1] - cur[1];
    const v2x = next[0] - cur[0];
    const v2y = next[1] - cur[1];
    const dot = v1x * v2x + v1y * v2y;
    const m1 = Math.hypot(v1x, v1y);
    const m2 = Math.hypot(v2x, v2y);
    const c = Math.min(1, Math.max(-1, dot / (m1 * m2)));
    out.push(Math.acos(c));
  }
  return out;
}

function shoelace(pts: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

/**
 * Build the full trapezoid solution from vertex coordinates in the
 * canonical layout: A=(0,0), B=(x, h), C=(x+a, h), D=(b, 0).
 * Assumes a is the top base (BC) and b is the bottom base (AD).
 */
function fromCanonical(a: number, b: number, c: number, d: number, h: number, x: number): Solved {
  const verts: [number, number][] = [
    [0, 0],
    [x, h],
    [x + a, h],
    [b, 0],
  ];
  const [angA, angB, angC, angD] = anglesFromCoords(verts);
  const p = Math.hypot(x + a, h); // AC
  const q = Math.hypot(b - x, h); // BD
  return {
    a, b, c, d, h,
    m: (a + b) / 2,
    P: a + b + c + d,
    Area: ((a + b) / 2) * h,
    p, q,
    angleA: angA,
    angleB: angB,
    angleC: angC,
    angleD: angD,
    verts,
  };
}

/* ------------------------------------------------------------------ */
/* Solve                                                                */
/* ------------------------------------------------------------------ */

function solve(mode: Mode, shape: Shape, raw: Record<string, string>): Solved {
  const sol = solveCore(mode, raw);
  if (sol.error) return sol;
  // Non-blocking shape validation for general modes.
  const generalModes: Mode[] = ["area-abh", "sides-c-angleA", "sides-d-angleD", "angles-A-D", "all-sides"];
  if (generalModes.includes(mode)) {
    if (shape === "isosceles" && sol.c != null && sol.d != null) {
      const denom = Math.max(sol.c, sol.d, 1e-9);
      if (Math.abs(sol.c - sol.d) / denom > 1e-6) {
        sol.warning = `Note: these values don't form an isosceles trapezoid (legs differ: c = ${fmt(sol.c)}, d = ${fmt(sol.d)}). Switch to the Isosceles quick mode, or pick Scalene.`;
      }
    }
    if (shape === "right" && sol.angleA != null && sol.angleB != null) {
      const okA = Math.abs(DEG(sol.angleA) - 90) < 0.5;
      const okB = Math.abs(DEG(sol.angleB) - 90) < 0.5;
      if (!okA && !okB) {
        sol.warning =
          "Note: these values don't produce a right angle. Switch to the Right quick mode, or pick Scalene.";
      }
    }
  }
  return sol;
}

function solveCore(mode: Mode, raw: Record<string, string>): Solved {
  const n = (k: string) => num(raw[k] ?? "");



  switch (mode) {
    case "area-abh": {
      const a = n("a"), b = n("b"), h = n("h");
      if (a === null || b === null || h === null)
        return { error: "Enter both bases (a, b) and the height h." };
      if (a <= 0 || b <= 0 || h <= 0)
        return { error: "Bases and height must be positive numbers." };
      const A = ((a + b) / 2) * h;
      return {
        a, b, h, Area: A, m: (a + b) / 2,
        steps: [
          step("Formula", <>A = ½ (a + b) h</>),
          step("Substitute", <>A = ½ ({a} + {b}) × {h}</>),
          step("Answer", <>A = <strong>{fmt(A)}</strong></>),
        ],
      };
    }
    case "find-a": {
      const A = n("A"), b = n("b"), h = n("h");
      if (A === null || b === null || h === null)
        return { error: "Enter area A, base b and height h." };
      if (h <= 0) return { error: "Height must be positive." };
      const a = (2 * A) / h - b;
      if (a <= 0) return { error: "No valid trapezoid — computed base a is not positive." };
      return {
        a, b, h, Area: A, m: (a + b) / 2,
        steps: [
          step("Rearrange A = ½(a+b)h", <>a = 2A/h − b</>),
          step("Substitute", <>a = 2×{A}/{h} − {b}</>),
          step("Answer", <>a = <strong>{fmt(a)}</strong></>),
        ],
      };
    }
    case "find-b": {
      const A = n("A"), a = n("a"), h = n("h");
      if (A === null || a === null || h === null)
        return { error: "Enter area A, base a and height h." };
      if (h <= 0) return { error: "Height must be positive." };
      const b = (2 * A) / h - a;
      if (b <= 0) return { error: "No valid trapezoid — computed base b is not positive." };
      return {
        a, b, h, Area: A, m: (a + b) / 2,
        steps: [
          step("Rearrange", <>b = 2A/h − a</>),
          step("Substitute", <>b = 2×{A}/{h} − {a}</>),
          step("Answer", <>b = <strong>{fmt(b)}</strong></>),
        ],
      };
    }
    case "find-h": {
      const A = n("A"), a = n("a"), b = n("b");
      if (A === null || a === null || b === null)
        return { error: "Enter area A and both bases a, b." };
      if (a + b <= 0) return { error: "Sum of bases must be positive." };
      const h = (2 * A) / (a + b);
      return {
        a, b, h, Area: A, m: (a + b) / 2,
        steps: [
          step("Rearrange", <>h = 2A / (a + b)</>),
          step("Substitute", <>h = 2×{A} / ({a} + {b})</>),
          step("Answer", <>h = <strong>{fmt(h)}</strong></>),
        ],
      };
    }
    case "sides-c-angleA": {
      // Given a (top base), b (bottom base), c (left leg), ∠A (bottom-left, deg)
      const a = n("a"), b = n("b"), c = n("c"), Adeg = n("angleA");
      if (a === null || b === null || c === null || Adeg === null)
        return { error: "Enter a, b, c and angle A." };
      if (a <= 0 || b <= 0 || c <= 0) return { error: "Sides must be positive." };
      if (Adeg <= 0 || Adeg >= 180) return { error: "Angle A must be between 0° and 180°." };
      const A = RAD(Adeg);
      const h = c * Math.sin(A);
      const x = c * Math.cos(A);
      // Top-right at (x+a, h); bottom-right at (b, 0). d = distance
      const dx = b - x - a;
      const d = Math.hypot(dx, h);
      // Reject self-intersecting/degenerate layouts:
      //   Top-left B must sit strictly left of bottom-right D → x < b
      //   Top-right (x + a) must sit strictly right of bottom-left A → x + a > 0
      if (!(x < b && x + a > 0)) {
        return {
          error:
            "These values don't close into a simple (non-self-intersecting) trapezoid — try a smaller angle A.",
        };
      }
      const sol = fromCanonical(a, b, c, d, h, x);
      sol.steps = [
        step("Height from leg c and angle A", <>h = c · sin A = {c} × sin({Adeg}°) = <strong>{fmt(h)}</strong></>),
        step("Horizontal offset x", <>x = c · cos A = {c} × cos({Adeg}°) = <strong>{fmt(x)}</strong></>),
        step("Right leg d", <>d = √((b − x − a)² + h²) = <strong>{fmt(d)}</strong></>),
        step("Angle B (co-interior on leg c)", <>∠B = 180° − ∠A = <strong>{fmtA(sol.angleB)}</strong></>),
        step("Angle D (from right leg)", <>∠D = atan2(h, b − x − a) = <strong>{fmtA(sol.angleD)}</strong></>),
        step("Angle C", <>∠C = 180° − ∠D = <strong>{fmtA(sol.angleC)}</strong></>),
        step("Area", <>A = ½(a + b)h = <strong>{fmt(sol.Area!)}</strong></>),
      ];
      return sol;
    }

    case "sides-d-angleD": {
      // Given a (top base), b (bottom base), d (right leg), ∠D (bottom-right, deg)
      const a = n("a"), b = n("b"), d = n("d"), Ddeg = n("angleD");
      if (a === null || b === null || d === null || Ddeg === null)
        return { error: "Enter a, b, d and angle D." };
      if (a <= 0 || b <= 0 || d <= 0) return { error: "Sides must be positive." };
      if (Ddeg <= 0 || Ddeg >= 180) return { error: "Angle D must be between 0° and 180°." };
      const D = RAD(Ddeg);
      const h = d * Math.sin(D);
      // Top-right C sits at (b − d·cos D, h). Top-left B at (x, h) with x = b − a − d·cos D.
      const x = b - a - d * Math.cos(D);
      const dxLeft = x; // horizontal from A(0,0) to B
      const c = Math.hypot(dxLeft, h);
      if (!(x < b && x + a > 0)) {
        return {
          error:
            "These values don't close into a simple (non-self-intersecting) trapezoid — try a smaller angle D.",
        };
      }
      const sol = fromCanonical(a, b, c, d, h, x);
      sol.steps = [
        step("Height from leg d and angle D", <>h = d · sin D = {d} × sin({Ddeg}°) = <strong>{fmt(h)}</strong></>),
        step("Horizontal offset x", <>x = b − a − d · cos D = <strong>{fmt(x)}</strong></>),
        step("Left leg c", <>c = √(x² + h²) = <strong>{fmt(c)}</strong></>),
        step("Angle C (co-interior on leg d)", <>∠C = 180° − ∠D = <strong>{fmtA(sol.angleC)}</strong></>),
        step("Angle A (from left leg)", <>∠A = atan2(h, x) = <strong>{fmtA(sol.angleA)}</strong></>),
        step("Angle B", <>∠B = 180° − ∠A = <strong>{fmtA(sol.angleB)}</strong></>),
        step("Area", <>A = ½(a + b)h = <strong>{fmt(sol.Area!)}</strong></>),
      ];
      return sol;
    }


    case "angles-A-D": {
      const a = n("a"), b = n("b"), Adeg = n("angleA"), Ddeg = n("angleD");
      if (a === null || b === null || Adeg === null || Ddeg === null)
        return { error: "Enter a, b, angle A and angle D." };
      if (a <= 0 || b <= 0) return { error: "Bases must be positive." };
      if (Adeg <= 0 || Adeg >= 180 || Ddeg <= 0 || Ddeg >= 180)
        return { error: "Angles must be between 0° and 180°." };
      const A = RAD(Adeg), D = RAD(Ddeg);
      const cotSum = 1 / Math.tan(A) + 1 / Math.tan(D);
      if (Math.abs(cotSum) < 1e-12) return { error: "Angles produce parallel legs — not a valid trapezoid." };
      const h = (b - a) / cotSum;
      if (h <= 0) return { error: "Angles and bases don't close into a valid trapezoid (need b > a with these angles)." };
      const c = h / Math.sin(A);
      const d = h / Math.sin(D);
      const x = c * Math.cos(A);
      const sol = fromCanonical(a, b, c, d, h, x);
      sol.steps = [
        step("Setup", <>h = (b − a) / (cot A + cot D)</>),
        step("Substitute", <>h = ({b} − {a}) / (cot {Adeg}° + cot {Ddeg}°) = <strong>{fmt(h)}</strong></>),
        step("Left leg c", <>c = h / sin A = <strong>{fmt(c)}</strong></>),
        step("Right leg d", <>d = h / sin D = <strong>{fmt(d)}</strong></>),
        step("Angle B", <>∠B = 180° − ∠A = <strong>{fmtA(sol.angleB)}</strong></>),
        step("Angle C", <>∠C = 180° − ∠D = <strong>{fmtA(sol.angleC)}</strong></>),
        step("Area", <>A = ½(a + b)h = <strong>{fmt(sol.Area!)}</strong></>),
      ];
      return sol;
    }
    case "all-sides": {
      const a = n("a"), b = n("b"), c = n("c"), d = n("d");
      if (a === null || b === null || c === null || d === null)
        return { error: "Enter all four side lengths." };
      // Solver assumes b is bottom base and orients c on left; swap if a > b for stability.
      const [top, bot] = a <= b ? [a, b] : [b, a];
      const solved = trapezoidHeightFromSides(top, bot, c, d);
      if (!solved) return { error: "These side lengths can't form a valid trapezoid — check the values." };
      const { h, x } = solved;
      const sol = fromCanonical(top, bot, c, d, h, x);
      // Map user labels back
      sol.a = a; sol.b = b;
      sol.steps = [
        step("Horizontal offset x", <>x = [(b − a)² + c² − d²] / [2(b − a)] = <strong>{fmt(x)}</strong></>),
        step("Height", <>h = √(c² − x²) = <strong>{fmt(h)}</strong></>),
        step("Midsegment", <>m = (a + b)/2 = <strong>{fmt(sol.m!)}</strong></>),
        step("Perimeter", <>P = a + b + c + d = <strong>{fmt(sol.P!)}</strong></>),
        step("Area", <>A = ½(a + b)h = <strong>{fmt(sol.Area!)}</strong></>),
      ];
      return sol;
    }
    case "isosceles-quick": {
      const a = n("a"), b = n("b"), c = n("c");
      if (a === null || b === null || c === null)
        return { error: "Enter both bases (a, b) and the leg length c." };
      if (a <= 0 || b <= 0 || c <= 0) return { error: "Bases and leg must be positive." };
      const x = (b - a) / 2;
      const under = c * c - x * x;
      if (under <= 0)
        return { error: "Leg c is too short to reach across the bases — check the values." };
      const h = Math.sqrt(under);
      const sol = fromCanonical(a, b, c, c, h, x);
      sol.steps = [
        step("Symmetry", <>Legs are equal, so d = c and each base overhang is x = (b − a) / 2.</>),
        step("Horizontal offset x", <>x = ({b} − {a}) / 2 = <strong>{fmt(x)}</strong></>),
        step("Height", <>h = √(c² − x²) = √({fmt(c * c)} − {fmt(x * x)}) = <strong>{fmt(h)}</strong></>),
        step("Angles", <>∠A = ∠D = <strong>{fmtA(sol.angleA)}</strong>, ∠B = ∠C = <strong>{fmtA(sol.angleB)}</strong></>),
        step("Area", <>A = ½(a + b)h = <strong>{fmt(sol.Area!)}</strong></>),
      ];
      return sol;
    }
    case "right-quick": {
      const a = n("a"), b = n("b"), c = n("c");
      if (a === null || b === null || c === null)
        return { error: "Enter both bases (a, b) and the vertical leg c." };
      if (a <= 0 || b <= 0 || c <= 0) return { error: "Bases and leg must be positive." };
      const h = c;
      const x = 0;
      const d = Math.hypot(b - a, h);
      const sol = fromCanonical(a, b, c, d, h, x);
      sol.steps = [
        step("Right angles", <>Leg c is perpendicular to both bases, so ∠A = ∠B = 90° and h = c = <strong>{fmt(h)}</strong>.</>),
        step("Slanted leg d", <>d = √((b − a)² + c²) = √({fmt((b - a) * (b - a))} + {fmt(c * c)}) = <strong>{fmt(d)}</strong></>),
        step("Angle D", <>∠D = atan2(h, b − a) = <strong>{fmtA(sol.angleD)}</strong></>),
        step("Angle C", <>∠C = 180° − ∠D = <strong>{fmtA(sol.angleC)}</strong></>),
        step("Area", <>A = ½(a + b)h = <strong>{fmt(sol.Area!)}</strong></>),
      ];
      return sol;
    }
    case "diagonals": {

      const p = n("p"), q = n("q"), thetaDeg = n("theta");
      if (p === null || q === null || thetaDeg === null)
        return { error: "Enter both diagonals p and q, and the angle θ between them." };
      if (p <= 0 || q <= 0) return { error: "Diagonals must be positive." };
      if (thetaDeg <= 0 || thetaDeg >= 180) return { error: "θ must be between 0° and 180°." };
      const t = RAD(thetaDeg);
      const Area = 0.5 * p * q * Math.sin(t);
      return {
        p, q, Area,
        steps: [
          step("Formula", <>A = ½ · p · q · sin θ</>),
          step("Substitute", <>A = ½ × {p} × {q} × sin({thetaDeg}°)</>),
          step("Answer", <>A = <strong>{fmt(Area)}</strong></>),
        ],
      };
    }
    case "coords": {
      const pts: [number, number][] = [];
      for (const key of ["A", "B", "C", "D"]) {
        const x = n(`${key}x`), y = n(`${key}y`);
        if (x === null || y === null) return { error: `Enter both coordinates for vertex ${key}.` };
        pts.push([x, y]);
      }
      const [A, B, C, D] = pts;
      const sideAB = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const sideBC = Math.hypot(C[0] - B[0], C[1] - B[1]);
      const sideCD = Math.hypot(D[0] - C[0], D[1] - C[1]);
      const sideDA = Math.hypot(A[0] - D[0], A[1] - D[1]);
      // Check which pair of opposite sides is parallel (cross product ≈ 0).
      const cross = (ux: number, uy: number, vx: number, vy: number) => ux * vy - uy * vx;
      const par1 = Math.abs(cross(B[0] - A[0], B[1] - A[1], D[0] - C[0], D[1] - C[1]));
      const par2 = Math.abs(cross(C[0] - B[0], C[1] - B[1], A[0] - D[0], A[1] - D[1]));
      const eps = 1e-6 * Math.max(sideAB, sideBC, sideCD, sideDA, 1);
      let parallelPair = "none";
      let base1 = 0, base2 = 0;
      if (par2 < eps) { parallelPair = "BC ∥ AD"; base1 = sideBC; base2 = sideDA; }
      else if (par1 < eps) { parallelPair = "AB ∥ CD"; base1 = sideAB; base2 = sideCD; }
      if (parallelPair === "none")
        return { error: "These 4 vertices don't form a trapezoid — no pair of opposite sides is parallel." };
      const Area = shoelace(pts);
      const sumBases = base1 + base2;
      const h = sumBases > 0 ? (2 * Area) / sumBases : 0;
      const [angA, angB, angC, angD] = anglesFromCoords(pts);
      return {
        a: base1, b: base2, c: parallelPair === "BC ∥ AD" ? sideAB : sideBC,
        d: parallelPair === "BC ∥ AD" ? sideCD : sideDA,
        h, m: sumBases / 2, P: sideAB + sideBC + sideCD + sideDA, Area,
        angleA: angA, angleB: angB, angleC: angC, angleD: angD,
        verts: pts,
        steps: [
          step("Parallel sides", <>{parallelPair} — confirmed a valid trapezoid.</>),
          step("Shoelace formula", <>A = ½|Σ (xᵢyᵢ₊₁ − xᵢ₊₁yᵢ)| = <strong>{fmt(Area)}</strong></>),
          step("Height from area", <>h = 2A / (base₁ + base₂) = <strong>{fmt(h)}</strong></>),
          step("Midsegment", <>m = (base₁ + base₂)/2 = <strong>{fmt(sumBases / 2)}</strong></>),
        ],
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Diagram                                                              */
/* ------------------------------------------------------------------ */

function TrapezoidSVG({
  shape,
  sol,
  unit,
}: {
  shape: Shape;
  sol: Solved;
  unit: Unit;
}) {
  // Use verts if provided; else build a default illustration by shape.
  let verts = sol.verts;
  if (!verts) {
    if (shape === "isosceles") {
      const a = sol.a ?? 6, b = sol.b ?? 10, h = sol.h ?? 4;
      const x = (b - a) / 2;
      verts = [[0, 0], [x, h], [x + a, h], [b, 0]];
    } else if (shape === "right") {
      const a = sol.a ?? 6, b = sol.b ?? 10, h = sol.h ?? 4;
      verts = [[0, 0], [0, h], [a, h], [b, 0]];
    } else {
      const a = sol.a ?? 5, b = sol.b ?? 10, h = sol.h ?? 4;
      verts = [[0, 0], [1.5, h], [1.5 + a, h], [b, 0]];
    }
  }
  const xs = verts.map((v) => v[0]);
  const ys = verts.map((v) => v[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = 360, height = 240;
  const pad = 40;
  const sx = (maxX - minX) || 1;
  const sy = (maxY - minY) || 1;
  const scale = Math.min((width - 2 * pad) / sx, (height - 2 * pad) / sy);
  const project = ([x, y]: [number, number]) => [
    pad + (x - minX) * scale,
    height - pad - (y - minY) * scale,
  ];
  const [pA, pB, pC, pD] = verts.map(project) as [number, number][];
  const poly = [pA, pB, pC, pD].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  const label = (p: [number, number], t: string, dx = 0, dy = 0) => (
    <text
      x={p[0] + dx}
      y={p[1] + dy}
      className="fill-foreground"
      fontSize="12"
      fontFamily="serif"
      fontStyle="italic"
      textAnchor="middle"
    >
      {t}
    </text>
  );

  // Midpoints for side labels
  const mid = (p1: [number, number], p2: [number, number]): [number, number] => [
    (p1[0] + p2[0]) / 2,
    (p1[1] + p2[1]) / 2,
  ];
  const mAB = mid(pA, pB), mBC = mid(pB, pC), mCD = mid(pC, pD), mDA = mid(pD, pA);

  return (
    <svg
      role="img"
      aria-label={`Trapezoid diagram with vertices A, B, C, D`}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-md mx-auto"
    >
      <polygon
        points={poly}
        className="fill-primary/10 stroke-primary"
        strokeWidth={2}
      />
      {/* Height guide */}
      {sol.h != null && (
        <line
          x1={pB[0]}
          y1={pB[1]}
          x2={pB[0]}
          y2={height - pad}
          className="stroke-muted-foreground"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}
      {/* Vertex dots */}
      {[pA, pB, pC, pD].map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} className="fill-primary" />
      ))}
      {/* Vertex labels */}
      {label(pA, "A", -10, 14)}
      {label(pB, "B", -10, -6)}
      {label(pC, "C", 10, -6)}
      {label(pD, "D", 10, 14)}
      {/* Side labels */}
      {label(mBC, `a${sol.a != null ? ` = ${fmt(sol.a)} ${unit}` : ""}`, 0, -8)}
      {label(mDA, `b${sol.b != null ? ` = ${fmt(sol.b)} ${unit}` : ""}`, 0, 16)}
      {label(mAB, `c${sol.c != null ? ` = ${fmt(sol.c)} ${unit}` : ""}`, -22, 4)}
      {label(mCD, `d${sol.d != null ? ` = ${fmt(sol.d)} ${unit}` : ""}`, 22, 4)}
      {sol.h != null && label([pB[0] + 12, (pB[1] + (height - pad)) / 2], `h = ${fmt(sol.h)} ${unit}`, 0, 0)}
      {/* Right-angle marks for right trapezoid */}
      {shape === "right" && (
        <>
          <rect x={pA[0]} y={pA[1] - 10} width={10} height={10} className="fill-none stroke-primary" strokeWidth={1} />
          <rect x={pB[0]} y={pB[1]} width={10} height={10} className="fill-none stroke-primary" strokeWidth={1} />
        </>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Guide cards                                                          */
/* ------------------------------------------------------------------ */

function MiniTrap() {
  return (
    <svg role="img" aria-label="Trapezoid diagram" viewBox="0 0 200 130" className="w-full max-w-[240px]">
      <polygon points="30,110 70,30 150,30 190,110" className="fill-primary/10 stroke-primary" strokeWidth={2} />
      <line x1="70" y1="30" x2="70" y2="110" strokeDasharray="4 4" className="stroke-muted-foreground" strokeWidth={1} />
      <text x="110" y="24" textAnchor="middle" fontSize="12" fontFamily="serif" fontStyle="italic" className="fill-foreground">a</text>
      <text x="110" y="124" textAnchor="middle" fontSize="12" fontFamily="serif" fontStyle="italic" className="fill-foreground">b</text>
      <text x="82" y="72" fontSize="12" fontFamily="serif" fontStyle="italic" className="fill-foreground">h</text>
    </svg>
  );
}

const GUIDE: GuideCardItem[] = [
  {
    key: "area",
    title: "Area of a trapezoid",
    explain: (
      <>
        Add the two parallel bases, halve them (the midsegment), then multiply by
        the perpendicular height. It's the same as making a rectangle whose length
        is the average of the two bases.
      </>
    ),
    formula: <>A = ½ (a + b) · h</>,
    legend: [
      { sym: "a, b", def: "the two parallel bases" },
      { sym: "h", def: "perpendicular height between bases" },
    ],
    diagram: <MiniTrap />,
    example: {
      given: <>a = 6, b = 10, h = 4</>,
      substitute: <>A = ½ (6 + 10) × 4 = ½ × 16 × 4</>,
      answer: <>A = 32 square units</>,
    },
  },
  {
    key: "height",
    title: "Height from the four sides",
    explain: (
      <>
        When you know both bases and both legs but not the height, drop a
        perpendicular from the shorter base. The horizontal offset x from the
        longer base gives h via the Pythagorean theorem.
      </>
    ),
    formula: (
      <>
        x = [(b − a)² + c² − d²] / [2(b − a)]<br />
        h = √(c² − x²)
      </>
    ),
    legend: [
      { sym: "a", def: "top base" },
      { sym: "b", def: "bottom base" },
      { sym: "c, d", def: "left and right legs" },
    ],
    diagram: <MiniTrap />,
    example: {
      given: <>a = 6, b = 10, c = 5, d = 5</>,
      substitute: <>x = [(10 − 6)² + 5² − 5²] / [2 × 4] = 16/8 = 2</>,
      answer: <>h = √(25 − 4) = √21 ≈ 4.583</>,
    },
  },
  {
    key: "midseg",
    title: "Midsegment (median)",
    explain: (
      <>
        The midsegment joins the midpoints of the two legs. It is parallel to
        both bases and equals their average — the same quantity that appears in
        the area formula.
      </>
    ),
    formula: <>m = (a + b) / 2</>,
    legend: [{ sym: "m", def: "midsegment length" }],
    diagram: <MiniTrap />,
    example: {
      given: <>a = 6, b = 10</>,
      substitute: <>m = (6 + 10) / 2</>,
      answer: <>m = 8</>,
    },
  },
  {
    key: "angles",
    title: "Co-interior angle rule",
    explain: (
      <>
        Because the two bases are parallel, each pair of angles on the same leg
        sums to 180°. Knowing one angle at either end of a leg immediately gives
        you the other.
      </>
    ),
    formula: (
      <>
        ∠A + ∠B = 180°<br />
        ∠C + ∠D = 180°
      </>
    ),
    legend: [{ sym: "∠A, ∠B, ∠C, ∠D", def: "interior angles at vertices" }],
    diagram: <MiniTrap />,
    example: {
      given: <>∠A = 70°</>,
      substitute: <>∠B = 180° − 70°</>,
      answer: <>∠B = 110°</>,
    },
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

const NAME = "Trapezoid Calculator";

export const Route = createFileRoute("/calculators/math/trapezoid-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: NAME,
      title: "Trapezoid Calculator — Area, Perimeter, Angles & Diagonals",
      metaDescription:
        "Solve any trapezoid: area, perimeter, height, midsegment, all four angles and both diagonals. Scalene, isosceles and right modes with a live diagram.",
      canonicalUrl: "/calculators/math/trapezoid-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: NAME, path: "/calculators/math/trapezoid-calculator" },
      ],
    }),
  component: Page,
});

const MODE_LABELS: { value: Mode; label: string }[] = [
  { value: "area-abh", label: "Find Area — given a, b, h" },
  { value: "find-a", label: "Find a — given Area, b, h" },
  { value: "find-b", label: "Find b — given Area, a, h" },
  { value: "find-h", label: "Find h — given Area, a, b" },
  { value: "sides-c-angleA", label: "Full solve — given a, b, c, ∠A" },
  { value: "sides-d-angleD", label: "Full solve — given a, b, d, ∠D" },
  { value: "angles-A-D", label: "Full solve — given a, b, ∠A, ∠D" },
  { value: "all-sides", label: "Full solve — given all 4 sides" },
  { value: "isosceles-quick", label: "Isosceles — given a, b, c (legs equal)" },
  { value: "right-quick", label: "Right — given a, b, c (vertical leg)" },
  { value: "diagonals", label: "Area — given diagonals p, q and angle θ" },
  { value: "coords", label: "From 4 vertex coordinates (shoelace)" },
];


const UNITS: Unit[] = ["mm", "cm", "m", "km", "in", "ft", "yd"];

function Page() {
  const [shape, setShape] = useState<Shape>("scalene");
  const [mode, setMode] = useState<Mode>("area-abh");
  const [unit, setUnit] = useState<Unit>("cm");
  const [inputs, setInputs] = useState<Record<string, string>>({
    a: "6", b: "10", h: "4",
  });
  const [price, setPrice] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(() => (submitted ? solve(mode, shape, inputs) : null), [submitted, mode, shape, inputs]);

  const setIn = (k: string, v: string) => setInputs((s) => ({ ...s, [k]: v }));

  const fieldsFor = (m: Mode): { key: string; label: string; hint?: string }[] => {
    switch (m) {
      case "area-abh": return [
        { key: "a", label: `Top base a (${unit})` },
        { key: "b", label: `Bottom base b (${unit})` },
        { key: "h", label: `Height h (${unit})` },
      ];
      case "find-a": return [
        { key: "A", label: `Area A (${unit}²)` },
        { key: "b", label: `Bottom base b (${unit})` },
        { key: "h", label: `Height h (${unit})` },
      ];
      case "find-b": return [
        { key: "A", label: `Area A (${unit}²)` },
        { key: "a", label: `Top base a (${unit})` },
        { key: "h", label: `Height h (${unit})` },
      ];
      case "find-h": return [
        { key: "A", label: `Area A (${unit}²)` },
        { key: "a", label: `Top base a (${unit})` },
        { key: "b", label: `Bottom base b (${unit})` },
      ];
      case "sides-c-angleA": return [
        { key: "a", label: `Top base a (${unit})` },
        { key: "b", label: `Bottom base b (${unit})` },
        { key: "c", label: `Left leg c (${unit})` },
        { key: "angleA", label: `Angle ∠A (degrees)` },
      ];
      case "sides-d-angleD": return [
        { key: "a", label: `Top base a (${unit})` },
        { key: "b", label: `Bottom base b (${unit})` },
        { key: "d", label: `Right leg d (${unit})` },
        { key: "angleD", label: `Angle ∠D (degrees)` },
      ];
      case "angles-A-D": return [
        { key: "a", label: `Top base a (${unit})` },
        { key: "b", label: `Bottom base b (${unit})` },
        { key: "angleA", label: `Angle ∠A (degrees)` },
        { key: "angleD", label: `Angle ∠D (degrees)` },
      ];
      case "all-sides": return [
        { key: "a", label: `Top base a (${unit})` },
        { key: "b", label: `Bottom base b (${unit})` },
        { key: "c", label: `Left leg c (${unit})` },
        { key: "d", label: `Right leg d (${unit})` },
      ];
      case "isosceles-quick": return [
        { key: "a", label: `Top base a (${unit})` },
        { key: "b", label: `Bottom base b (${unit})` },
        { key: "c", label: `Leg length c (${unit})`, hint: "Both legs equal (c = d)" },
      ];
      case "right-quick": return [
        { key: "a", label: `Top base a (${unit})` },
        { key: "b", label: `Bottom base b (${unit})` },
        { key: "c", label: `Vertical leg c (${unit})`, hint: "Perpendicular to both bases (= height)" },
      ];

      case "diagonals": return [
        { key: "p", label: `Diagonal p (${unit})` },
        { key: "q", label: `Diagonal q (${unit})` },
        { key: "theta", label: `Angle θ between diagonals (degrees)` },
      ];
      case "coords": return [
        { key: "Ax", label: "A — x" }, { key: "Ay", label: "A — y" },
        { key: "Bx", label: "B — x" }, { key: "By", label: "B — y" },
        { key: "Cx", label: "C — x" }, { key: "Cy", label: "C — y" },
        { key: "Dx", label: "D — x" }, { key: "Dy", label: "D — y" },
      ];
    }
  };

  const fields = fieldsFor(mode);

  // Cost estimator: convert area (in unit²) to m² for pricing per m².
  const priceNum = num(price);
  const areaM2 = result?.Area != null ? result.Area * TO_M2[unit] : null;
  const cost = areaM2 != null && priceNum != null ? areaM2 * priceNum : null;

  return (
    <MathCalcPage
      name={NAME}
      tagline="Area, perimeter, height, midsegment, all four angles, and both diagonals — for any scalene, isosceles or right trapezoid."
      extras={<Extras />}
    >
      {/* Shape + Mode + Unit */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Trapezoid type">
          <select
            value={shape}
            onChange={(e) => {
              const next = e.target.value as Shape;
              setShape(next);
              if (next === "isosceles") {
                setMode("isosceles-quick");
                setSubmitted(false);
              } else if (next === "right") {
                setMode("right-quick");
                setSubmitted(false);
              }
            }}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base"
          >
            <option value="scalene">Scalene</option>
            <option value="isosceles">Isosceles</option>
            <option value="right">Right</option>
          </select>
        </Field>

        <Field label="Choose a calculation">
          <select
            value={mode}
            onChange={(e) => { setMode(e.target.value as Mode); setSubmitted(false); }}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base"
          >
            {MODE_LABELS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Unit">
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
      </div>

      {/* Inputs */}
      <div className={`mt-5 grid gap-3 ${mode === "coords" ? "sm:grid-cols-4" : "sm:grid-cols-2"}`}>
        {fields.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint}>
            <TextInput
              inputMode="decimal"
              value={inputs[f.key] ?? ""}
              onChange={(e) => setIn(f.key, e.target.value)}
              placeholder="0"
            />
          </Field>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <PrimaryButton onClick={() => setSubmitted(true)}>Calculate</PrimaryButton>
        <button
          type="button"
          onClick={() => { setInputs({}); setSubmitted(false); }}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/50"
        >
          Clear
        </button>
      </div>

      {result?.error && <ErrorBox message={result.error} />}

      {result && !result.error && (
        <>
          {result.warning && (
            <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              {result.warning}
            </div>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>

              <TrapezoidSVG shape={shape} sol={result} unit={unit} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {result.Area != null && <Stat label="Area" value={`${fmt(result.Area)} ${unit}²`} />}
              {result.P != null && <Stat label="Perimeter" value={`${fmt(result.P)} ${unit}`} />}
              {result.h != null && <Stat label="Height" value={`${fmt(result.h)} ${unit}`} />}
              {result.m != null && <Stat label="Midsegment" value={`${fmt(result.m)} ${unit}`} />}
              {result.a != null && <Stat label="Base a" value={`${fmt(result.a)} ${unit}`} />}
              {result.b != null && <Stat label="Base b" value={`${fmt(result.b)} ${unit}`} />}
              {result.c != null && <Stat label="Leg c" value={`${fmt(result.c)} ${unit}`} />}
              {result.d != null && <Stat label="Leg d" value={`${fmt(result.d)} ${unit}`} />}
              {result.p != null && <Stat label="Diagonal p (AC)" value={`${fmt(result.p)} ${unit}`} />}
              {result.q != null && <Stat label="Diagonal q (BD)" value={`${fmt(result.q)} ${unit}`} />}
              {result.angleA != null && <Stat label="∠A" value={fmtA(result.angleA)} />}
              {result.angleB != null && <Stat label="∠B" value={fmtA(result.angleB)} />}
              {result.angleC != null && <Stat label="∠C" value={fmtA(result.angleC)} />}
              {result.angleD != null && <Stat label="∠D" value={fmtA(result.angleD)} />}
            </div>
          </div>

          {result.Area != null && (
            <ResultBox
              label="Area"
              value={<>{fmt(result.Area)} {unit}²</>}
              note={
                <>
                  Length unit: {unit}. Multiply by {TO_M[unit]} to convert to metres, or
                  by {TO_M2[unit]} to convert the area to m².
                </>
              }
            />
          )}

          {result.steps && result.steps.length > 0 && <StepsToggle steps={result.steps} />}
        </>
      )}

      {/* Cost estimator */}
      <div className="mt-8 rounded-2xl border border-border/60 bg-background/40 p-4">
        <h3 className="mb-2 font-display text-base font-semibold text-foreground">
          Material / cost estimator
        </h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Enter a price per square metre (paint, flooring, land, fabric, etc.) to
          estimate the total cost from the computed area.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Price per m²">
            <TextInput
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 25"
            />
          </Field>
          <div className="flex items-end">
            <div className="text-sm text-foreground">
              {cost != null ? (
                <>
                  Estimated total: <strong>{fmt(cost, 2)}</strong> (area ={" "}
                  {fmt(areaM2!, 4)} m²)
                </>
              ) : (
                <span className="text-muted-foreground">
                  Enter a price and calculate an area to see the total.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </MathCalcPage>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">

        {label}
      </div>
      <div className="mt-0.5 font-serif italic text-foreground">{value}</div>
    </div>
  );
}

function ModeFormula({ label, lines }: { label: string; lines: ReactNode[] }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 font-display text-sm font-semibold text-foreground">
        {label}
      </div>
      <div className="space-y-1">
        {lines.map((line, i) => (
          <FormulaBlock key={i}>{line}</FormulaBlock>
        ))}
      </div>
    </div>
  );
}



/* ------------------------------------------------------------------ */
/* Extras — educational content rendered below the widget               */
/* ------------------------------------------------------------------ */

function Extras() {
  return (
    <>
      <CalcSection title="What is a trapezoid?">
        <p>
          A trapezoid is a four-sided polygon (quadrilateral) with{" "}
          <strong>at least one pair of parallel sides</strong>, called the{" "}
          <em>bases</em>. The other two sides are the <em>legs</em>, and the
          perpendicular distance between the two bases is the <em>height</em>.
        </p>
        <p>
          Three common variants appear in practice: a <strong>scalene</strong>{" "}
          trapezoid has legs of different length; an <strong>isosceles</strong>{" "}
          trapezoid has legs of equal length and matching base angles; a{" "}
          <strong>right</strong> trapezoid has two 90° angles on the same leg.
          You'll meet them in drainage channels, retaining walls, roof trusses,
          bridge girders, land plots with two parallel boundaries, and the
          trapezoidal rule for numerical integration.
        </p>
      </CalcSection>

      <CalcSection title="Trapezoid, case by case">
        <GuideCards items={GUIDE} />
      </CalcSection>

      <CalcSection title="Formulas at a glance">
        <FormulaBlock>Area   A = ½ (a + b) · h</FormulaBlock>
        <FormulaBlock>Perimeter   P = a + b + c + d</FormulaBlock>
        <FormulaBlock>Midsegment   m = (a + b) / 2</FormulaBlock>
        <FormulaBlock>Height from a leg   h = c · sin(∠A) = d · sin(∠D)</FormulaBlock>
        <FormulaBlock>Co-interior pairs   ∠A + ∠B = 180°,   ∠C + ∠D = 180°</FormulaBlock>
        <FormulaBlock>Height from 4 sides   x = [(b − a)² + c² − d²] / [2(b − a)],   h = √(c² − x²)</FormulaBlock>
        <FormulaBlock>Area from diagonals   A = ½ · p · q · sin θ</FormulaBlock>
      </CalcSection>

      <CalcSection title="All formulas — every calculation mode">
        <div className="rounded-2xl border border-border/60 bg-background/40 p-4 sm:p-5">
          <p className="mb-4 text-sm text-muted-foreground">
            The exact symbolic chain each mode of this calculator evaluates.
            Same notation as the widget: <em>a</em>, <em>b</em> are the parallel
            bases, <em>c</em>, <em>d</em> the legs, <em>h</em> the height,{" "}
            <em>m</em> the midsegment, <em>P</em> the perimeter,{" "}
            <em>A</em> the area, and <em>x</em> the horizontal offset of the top
            base from the bottom-left corner.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <ModeFormula
              label="1. Find Area — given a, b, h"
              lines={[
                <>A = ½ (a + b) · h</>,
                <>m = (a + b) / 2</>,
              ]}
            />
            <ModeFormula
              label="2. Find a — given A, b, h"
              lines={[
                <>a = 2A / h − b</>,
                <>m = (a + b) / 2</>,
              ]}
            />
            <ModeFormula
              label="3. Find b — given A, a, h"
              lines={[
                <>b = 2A / h − a</>,
                <>m = (a + b) / 2</>,
              ]}
            />
            <ModeFormula
              label="4. Find h — given A, a, b"
              lines={[
                <>h = 2A / (a + b)</>,
                <>m = (a + b) / 2</>,
              ]}
            />
            <ModeFormula
              label="5. Full solve — given a, b, c, ∠A"
              lines={[
                <>h = c · sin(∠A)</>,
                <>x = c · cos(∠A)</>,
                <>d = √((b − x − a)² + h²)</>,
                <>∠D = atan2(h, b − x − a)</>,
                <>∠B = 180° − ∠A,  ∠C = 180° − ∠D</>,
                <>A = ½(a + b)h,  P = a + b + c + d,  m = (a + b)/2</>,
              ]}
            />
            <ModeFormula
              label="6. Full solve — given a, b, d, ∠D"
              lines={[
                <>h = d · sin(∠D)</>,
                <>x = b − a − d · cos(∠D)</>,
                <>c = √(x² + h²)</>,
                <>∠A = atan2(h, x)</>,
                <>∠C = 180° − ∠D,  ∠B = 180° − ∠A</>,
                <>A = ½(a + b)h,  P = a + b + c + d,  m = (a + b)/2</>,
              ]}
            />
            <ModeFormula
              label="7. Full solve — given a, b, ∠A, ∠D"
              lines={[
                <>h = (b − a) / (cot ∠A + cot ∠D)</>,
                <>c = h / sin(∠A),  d = h / sin(∠D)</>,
                <>∠B = 180° − ∠A,  ∠C = 180° − ∠D</>,
                <>A = ½(a + b)h,  P = a + b + c + d,  m = (a + b)/2</>,
              ]}
            />
            <ModeFormula
              label="8. Full solve — given all 4 sides a, b, c, d"
              lines={[
                <>x = [(b − a)² + c² − d²] / [2(b − a)]</>,
                <>h = √(c² − x²)</>,
                <>m = (a + b)/2,  P = a + b + c + d</>,
                <>A = ½(a + b)h</>,
              ]}
            />
            <ModeFormula
              label="9. Isosceles quick — given a, b, c (legs equal)"
              lines={[
                <>x = (b − a)/2</>,
                <>h = √(c² − x²)</>,
                <>∠A = ∠D,  ∠B = ∠C</>,
                <>A = ½(a + b)h</>,
              ]}
            />
            <ModeFormula
              label="10. Right quick — given a, b, c (vertical leg)"
              lines={[
                <>h = c</>,
                <>d = √((b − a)² + c²)</>,
                <>∠A = ∠B = 90°</>,
                <>A = ½(a + b)h</>,
              ]}
            />
            <ModeFormula
              label="11. Area — given diagonals p, q and angle θ"
              lines={[
                <>A = ½ · p · q · sin θ</>,
              ]}
            />
            <ModeFormula
              label="12. From 4 vertex coordinates (shoelace)"
              lines={[
                <>A = ½ |Σ (xᵢ yᵢ₊₁ − xᵢ₊₁ yᵢ)|</>,
                <>h = 2A / (base₁ + base₂)</>,
                <>m = (base₁ + base₂) / 2</>,
              ]}
            />
          </div>
        </div>
      </CalcSection>



      <CalcSection title="What this tool does for you">
        <FeatureList
          items={[
            "Nine calculation modes — from a simple A = ½(a+b)h to a full solve from 4 vertex coordinates",
            "Scalene, isosceles and right diagrams with vertex, side, angle and height labels",
            "Reports area, perimeter, height, midsegment, all four interior angles and both diagonals",
            "Unit selector (mm, cm, m, km, in, ft, yd) with automatic m² conversion for the cost estimator",
            "Show/hide step-by-step working for every mode",
            "Material or cost estimator — enter a price per m² and get the total",
          ]}
        />
      </CalcSection>

      <CalcSection title="Frequently asked questions">
        <CalcFAQ items={FAQ} />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/area-calculator", label: "Area Calculator" },
            { to: "/calculators/math/triangle-calculator", label: "Triangle Calculator" },
            { to: "/calculators/math/law-of-cosines-calculator", label: "Law of Cosines Calculator" },
            { to: "/calculators/math", label: "All Math Calculators" },
          ]}
        />
      </CalcSection>
    </>
  );
}

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "What's the difference between a trapezoid and a trapezium?",
    a: (
      <>
        Regional terminology. In US English a <em>trapezoid</em> is a
        quadrilateral with exactly one pair of parallel sides. In UK English the
        same shape is a <em>trapezium</em>, while <em>trapezoid</em> means a
        quadrilateral with no parallel sides. This calculator uses the US
        convention.
      </>
    ),
  },
  {
    q: "What makes a trapezoid isosceles?",
    a: (
      <>
        An isosceles trapezoid has legs of equal length (c = d). As a
        consequence, the base angles are equal in pairs (∠A = ∠D, ∠B = ∠C), the
        diagonals are equal (p = q), and the shape has a line of symmetry
        perpendicular to the bases through their midpoints.
      </>
    ),
  },
  {
    q: "When should I use the Isosceles or Right quick modes?",
    a: (
      <>
        Pick these when you already know the shape is symmetric or has a
        perpendicular leg. The <strong>Isosceles quick</strong> mode takes just
        the two bases and one leg length (both legs equal), and derives the
        height, second leg and all four angles automatically. The{" "}
        <strong>Right quick</strong> mode treats the entered leg c as the
        vertical side (so ∠A = ∠B = 90° and h = c), then computes the slanted
        leg d and the remaining angles. Selecting "Isosceles" or "Right" from
        the Trapezoid type dropdown switches you into the matching quick mode
        automatically.
      </>
    ),
  },

  {
    q: "How do the diagonals relate to the area?",
    a: (
      <>
        For any quadrilateral, A = ½ · p · q · sin θ, where θ is the angle
        between the diagonals. This is why the "diagonals + angle" mode works
        without knowing the bases. If you only know p, q and the height h, the
        area isn't uniquely determined — you still need one base or the angle
        between the diagonals.
      </>
    ),
  },
  {
    q: "When does a trapezoid become a parallelogram?",
    a: (
      <>
        When both pairs of opposite sides are parallel — equivalently, when a =
        b. The area formula still works (½(a+a)h = a·h), which matches the
        parallelogram area. Under the exclusive US definition, that shape is no
        longer called a trapezoid; under the inclusive definition, every
        parallelogram is a trapezoid.
      </>
    ),
  },
  {
    q: "Which mode should I pick for a real problem?",
    a: (
      <>
        If you measured height perpendicular to the bases, use{" "}
        <strong>Find Area — a, b, h</strong>. If you only have the four side
        lengths, use <strong>all 4 sides</strong> — the height is derived. If
        you have field angles at the base corners, use the{" "}
        <strong>angles A &amp; D</strong> mode. If you have vertex GPS or CAD
        coordinates, use <strong>coordinates</strong>.
      </>
    ),
  },
];

