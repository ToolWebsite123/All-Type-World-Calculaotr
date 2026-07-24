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

/* ================= Shared display primitives ================= */

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
  return (
    <div className="mt-2 mb-1 text-sm not-italic text-muted-foreground">
      {children}
    </div>
  );
}

/* ================= Math core ================= */

type AngleUnit = "deg" | "rad";


interface Inputs {
  a?: number; b?: number; c?: number;
  alpha?: number; // radians (already normalized)
  beta?: number;  // radians
  h?: number;
  area?: number;
  perim?: number;
}

interface Solved {
  a: number; b: number; c: number;
  alpha: number; beta: number; // radians
  h: number; area: number; perim: number;
  s: number; r: number; R: number;
  caseName: string;
  steps: Step[];
}

const HALF_PI = Math.PI / 2;
const toRad = (v: number, u: AngleUnit) => (u === "deg" ? (v * Math.PI) / 180 : v);
const fromRad = (v: number, u: AngleUnit) => (u === "deg" ? (v * 180) / Math.PI : v);

function fmt(n: number, sig = 6): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-6) return n.toExponential(Math.max(2, sig - 2));
  return Number(n.toPrecision(Math.max(1, sig))).toString();
}


/** Finalize triangle from a known pair (c, alpha) — computes everything. */
function completeFromCAlpha(c: number, alpha: number): Omit<Solved, "caseName" | "steps"> {
  const beta = HALF_PI - alpha;
  const a = c * Math.sin(alpha);
  const b = c * Math.cos(alpha);
  const area = 0.5 * a * b;
  const perim = a + b + c;
  const s = perim / 2;
  const h = (a * b) / c;
  const r = (a + b - c) / 2;
  const R = c / 2;
  return { a, b, c, alpha, beta, h, area, perim, s, r, R };
}

function completeFromAB(a: number, b: number): Omit<Solved, "caseName" | "steps"> {
  const c = Math.hypot(a, b);
  const alpha = Math.atan2(a, b);
  return completeFromCAlpha(c, alpha);
}

/**
 * Solve a right triangle from exactly two independent inputs.
 * Angles are provided in radians. Throws Error with a friendly message on
 * inconsistency or under-specification.
 */
function solveRightTriangle(input: Inputs): Solved {
  // Normalize duplicate angles.
  let alpha = input.alpha;
  let beta = input.beta;
  if (alpha !== undefined && beta !== undefined) {
    if (Math.abs(alpha + beta - HALF_PI) > 1e-6)
      throw new Error("The two acute angles must add to 90°.");
    // Treat as a single independent input.
    beta = undefined;
  }
  if (alpha === undefined && beta !== undefined) {
    alpha = HALF_PI - beta;
    beta = undefined;
  }
  // Validate angle range.
  if (alpha !== undefined && (alpha <= 0 || alpha >= HALF_PI))
    throw new Error("Acute angles must be strictly between 0° and 90°.");

  const given: Record<string, number | undefined> = {
    a: input.a, b: input.b, c: input.c,
    alpha, h: input.h, area: input.area, perim: input.perim,
  };
  const positives: [string, number][] = [];
  for (const k of ["a", "b", "c", "h", "area", "perim"] as const) {
    const v = given[k];
    if (v !== undefined) {
      if (!(v > 0)) throw new Error(`${labelFor(k)} must be a positive number.`);
      positives.push([k, v]);
    }
  }
  if (alpha !== undefined) positives.push(["alpha", alpha]);

  if (positives.length < 2) throw new Error("Enter at least 2 values.");
  if (positives.length > 2) throw new Error("Enter exactly 2 values (leave the rest blank).");

  const has = (k: string) => given[k] !== undefined || (k === "alpha" && alpha !== undefined);
  const steps: Step[] = [];
  const push = (title: string, body: ReactNode) => steps.push({ title, body });

  const a0 = given.a, b0 = given.b, c0 = given.c;
  const h0 = given.h, A0 = given.area, P0 = given.perim;

  let base: Omit<Solved, "caseName" | "steps">;
  let caseName = "";

  // Small helper for the "everything else" step that both branches use.
  const finalStep = (t: Omit<Solved, "caseName" | "steps">) => {
    push("Compute the remaining measurements", (
      <>
        <MathLine>P = a + b + c = {fmt(t.a)} + {fmt(t.b)} + {fmt(t.c)} = {fmt(t.perim)}</MathLine>
        <MathLine>s = P / 2 = {fmt(t.s)}</MathLine>
        <MathLine>A = ½·a·b = ½ · {fmt(t.a)} · {fmt(t.b)} = {fmt(t.area)}</MathLine>
        <MathLine>h = a·b / c = {fmt(t.a * t.b)} / {fmt(t.c)} = {fmt(t.h)}</MathLine>
        <MathLine>r = (a + b − c) / 2 = {fmt(t.r)}</MathLine>
        <MathLine>R = c / 2 = {fmt(t.R)}</MathLine>
      </>
    ));
  };

  if (has("a") && has("b")) {
    caseName = "Two legs (a, b) — Pythagorean theorem";
    push("Given the two legs, find the hypotenuse with a² + b² = c²", (
      <>
        <MathLine>c = √(a² + b²) = √({fmt(a0!)}² + {fmt(b0!)}²) = √{fmt(a0! * a0! + b0! * b0!)}</MathLine>
        <MathLine>c = {fmt(Math.hypot(a0!, b0!))}</MathLine>
      </>
    ));
    push("Recover the acute angles from the leg ratios", (
      <>
        <MathLine>α = tan⁻¹(a / b) = tan⁻¹({fmt(a0!)} / {fmt(b0!)})</MathLine>
        <MathLine>β = 90° − α</MathLine>
      </>
    ));
    base = completeFromAB(a0!, b0!);
  } else if (has("a") && has("c")) {
    if (!(c0! > a0!)) throw new Error("The hypotenuse c must be greater than leg a.");
    caseName = "Leg + hypotenuse (a, c)";
    const b = Math.sqrt(c0! * c0! - a0! * a0!);
    push("Rearrange the Pythagorean theorem for the missing leg", (
      <>
        <MathLine>b = √(c² − a²) = √({fmt(c0!)}² − {fmt(a0!)}²) = √{fmt(c0! * c0! - a0! * a0!)}</MathLine>
        <MathLine>b = {fmt(b)}</MathLine>
      </>
    ));
    push("Use sin α = a/c to recover the angles", (
      <MathLine>α = sin⁻¹(a / c) = sin⁻¹({fmt(a0!)} / {fmt(c0!)})</MathLine>
    ));
    base = completeFromAB(a0!, b);
  } else if (has("b") && has("c")) {
    if (!(c0! > b0!)) throw new Error("The hypotenuse c must be greater than leg b.");
    caseName = "Leg + hypotenuse (b, c)";
    const a = Math.sqrt(c0! * c0! - b0! * b0!);
    push("Rearrange the Pythagorean theorem for the missing leg", (
      <>
        <MathLine>a = √(c² − b²) = √({fmt(c0!)}² − {fmt(b0!)}²) = √{fmt(c0! * c0! - b0! * b0!)}</MathLine>
        <MathLine>a = {fmt(a)}</MathLine>
      </>
    ));
    base = completeFromAB(a, b0!);
  } else if (has("a") && has("alpha")) {
    caseName = "Leg a + acute angle α";
    const c = a0! / Math.sin(alpha!);
    push("Use sin α = a / c to find the hypotenuse", (
      <MathLine>c = a / sin α = {fmt(a0!)} / sin({fmt(fromRad(alpha!, "deg"))}°) = {fmt(c)}</MathLine>
    ));
    base = completeFromCAlpha(c, alpha!);
  } else if (has("b") && has("alpha")) {
    caseName = "Leg b + acute angle α";
    const c = b0! / Math.cos(alpha!);
    push("Use cos α = b / c to find the hypotenuse", (
      <MathLine>c = b / cos α = {fmt(b0!)} / cos({fmt(fromRad(alpha!, "deg"))}°) = {fmt(c)}</MathLine>
    ));
    base = completeFromCAlpha(c, alpha!);
  } else if (has("c") && has("alpha")) {
    caseName = "Hypotenuse + acute angle";
    push("Project the hypotenuse onto each leg with sin and cos", (
      <>
        <MathLine>a = c · sin α = {fmt(c0!)} · sin({fmt(fromRad(alpha!, "deg"))}°)</MathLine>
        <MathLine>b = c · cos α = {fmt(c0!)} · cos({fmt(fromRad(alpha!, "deg"))}°)</MathLine>
      </>
    ));
    base = completeFromCAlpha(c0!, alpha!);
  } else if (has("h") && has("alpha")) {
    caseName = "Altitude to hypotenuse + acute angle";
    const c = (2 * h0!) / Math.sin(2 * alpha!);
    push("h = c · sin α · cos α, so c = 2h / sin(2α)", (
      <MathLine>c = 2·{fmt(h0!)} / sin(2·{fmt(fromRad(alpha!, "deg"))}°) = {fmt(c)}</MathLine>
    ));
    base = completeFromCAlpha(c, alpha!);
  } else if (has("h") && has("a")) {
    if (!(a0! > h0!)) throw new Error("Leg a must be greater than altitude h.");
    caseName = "Leg a + altitude h";
    const b = (h0! * a0!) / Math.sqrt(a0! * a0! - h0! * h0!);
    push("From h = a·b / c and c² = a² + b², solve for b", (
      <>
        <MathLine>b = h·a / √(a² − h²)</MathLine>
        <MathLine>b = {fmt(h0!)}·{fmt(a0!)} / √({fmt(a0!)}² − {fmt(h0!)}²) = {fmt(b)}</MathLine>
      </>
    ));
    base = completeFromAB(a0!, b);
  } else if (has("h") && has("b")) {
    if (!(b0! > h0!)) throw new Error("Leg b must be greater than altitude h.");
    caseName = "Leg b + altitude h";
    const a = (h0! * b0!) / Math.sqrt(b0! * b0! - h0! * h0!);
    push("From h = a·b / c and c² = a² + b², solve for a", (
      <MathLine>a = h·b / √(b² − h²) = {fmt(a)}</MathLine>
    ));
    base = completeFromAB(a, b0!);
  } else if (has("h") && has("c")) {
    if (!(c0! >= 2 * h0!)) throw new Error("Need c ≥ 2h for a valid right triangle.");
    caseName = "Hypotenuse + altitude";
    const sPlus = Math.sqrt(c0! * c0! + 2 * h0! * c0!);
    const sMinus = Math.sqrt(c0! * c0! - 2 * h0! * c0!);
    const a = (sPlus + sMinus) / 2;
    const b = (sPlus - sMinus) / 2;
    push("Use (a+b)² = c² + 2hc and (a−b)² = c² − 2hc", (
      <>
        <MathLine>a + b = √(c² + 2hc) = {fmt(sPlus)}</MathLine>
        <MathLine>a − b = √(c² − 2hc) = {fmt(sMinus)}</MathLine>
        <MathLine>a = {fmt(a)}, b = {fmt(b)}</MathLine>
      </>
    ));
    base = completeFromAB(a, b);
  } else if (has("area") && has("a")) {
    caseName = "Area + leg a";
    const b = (2 * A0!) / a0!;
    push("Area = ½·a·b, so b = 2A / a", (
      <MathLine>b = 2·{fmt(A0!)} / {fmt(a0!)} = {fmt(b)}</MathLine>
    ));
    base = completeFromAB(a0!, b);
  } else if (has("area") && has("b")) {
    caseName = "Area + leg b";
    const a = (2 * A0!) / b0!;
    push("Area = ½·a·b, so a = 2A / b", (
      <MathLine>a = 2·{fmt(A0!)} / {fmt(b0!)} = {fmt(a)}</MathLine>
    ));
    base = completeFromAB(a, b0!);
  } else if (has("area") && has("c")) {
    if (!(c0! * c0! >= 4 * A0!)) throw new Error("Area is too large for hypotenuse c (need c² ≥ 4A).");
    caseName = "Area + hypotenuse";
    const sPlus = Math.sqrt(c0! * c0! + 4 * A0!);
    const sMinus = Math.sqrt(c0! * c0! - 4 * A0!);
    const a = (sPlus + sMinus) / 2;
    const b = (sPlus - sMinus) / 2;
    push("Combine a² + b² = c² with ab = 2A", (
      <>
        <MathLine>a + b = √(c² + 4A) = {fmt(sPlus)}</MathLine>
        <MathLine>a − b = √(c² − 4A) = {fmt(sMinus)}</MathLine>
        <MathLine>a = {fmt(a)}, b = {fmt(b)}</MathLine>
      </>
    ));
    base = completeFromAB(a, b);
  } else if (has("area") && has("alpha")) {
    caseName = "Area + acute angle";
    const c = Math.sqrt((2 * A0!) / (Math.sin(alpha!) * Math.cos(alpha!)));
    push("A = ½·c²·sin α·cos α, so c = √(2A / (sin α cos α))", (
      <MathLine>c = √(2·{fmt(A0!)} / (sin·cos)) = {fmt(c)}</MathLine>
    ));
    base = completeFromCAlpha(c, alpha!);
  } else if (has("area") && has("h")) {
    caseName = "Area + altitude";
    const c = (2 * A0!) / h0!;
    push("A = ½·c·h, so c = 2A / h", (
      <MathLine>c = 2·{fmt(A0!)} / {fmt(h0!)} = {fmt(c)}</MathLine>
    ));
    // now solve as (h,c)
    if (!(c >= 2 * h0!)) throw new Error("Area and altitude are inconsistent (need c ≥ 2h after deriving c).");
    const sPlus = Math.sqrt(c * c + 2 * h0! * c);
    const sMinus = Math.sqrt(c * c - 2 * h0! * c);
    const a = (sPlus + sMinus) / 2;
    const b = (sPlus - sMinus) / 2;
    push("Then split into legs using (a±b)² = c² ± 2hc", (
      <MathLine>a = {fmt(a)}, b = {fmt(b)}</MathLine>
    ));
    base = completeFromAB(a, b);
  } else if (has("perim") && has("a")) {
    const Pp = P0! - a0!;
    if (!(Pp > a0!)) throw new Error("Perimeter is too small for the given leg a.");
    const b = (Pp * Pp - a0! * a0!) / (2 * Pp);
    caseName = "Perimeter + leg a";
    push("From b + c = P − a and c² = a² + b², solve for b", (
      <>
        <MathLine>b = ((P − a)² − a²) / (2·(P − a))</MathLine>
        <MathLine>b = {fmt(b)}</MathLine>
      </>
    ));
    base = completeFromAB(a0!, b);
  } else if (has("perim") && has("b")) {
    const Pp = P0! - b0!;
    if (!(Pp > b0!)) throw new Error("Perimeter is too small for the given leg b.");
    const a = (Pp * Pp - b0! * b0!) / (2 * Pp);
    caseName = "Perimeter + leg b";
    push("From a + c = P − b and c² = a² + b², solve for a", (
      <MathLine>a = ((P − b)² − b²) / (2·(P − b)) = {fmt(a)}</MathLine>
    ));
    base = completeFromAB(a, b0!);
  } else if (has("perim") && has("c")) {
    const sum = P0! - c0!;
    if (!(sum > 0)) throw new Error("Hypotenuse cannot equal or exceed the perimeter.");
    const ab = (sum * sum - c0! * c0!) / 2;
    if (!(ab > 0)) throw new Error("Perimeter and hypotenuse are inconsistent.");
    const disc = sum * sum - 4 * ab;
    if (disc < 0) throw new Error("No real legs exist for these values.");
    const d = Math.sqrt(disc);
    const a = (sum + d) / 2;
    const b = (sum - d) / 2;
    caseName = "Perimeter + hypotenuse";
    push("Let s = a + b = P − c, then ab = (s² − c²) / 2; a and b are the two roots", (
      <MathLine>a = {fmt(a)}, b = {fmt(b)}</MathLine>
    ));
    base = completeFromAB(a, b);
  } else if (has("perim") && has("alpha")) {
    const scale = P0! / (Math.sin(alpha!) + Math.cos(alpha!) + 1);
    const c = scale;
    caseName = "Perimeter + acute angle";
    push("Sides scale as sin α : cos α : 1 — divide perimeter by their sum", (
      <MathLine>c = P / (sin α + cos α + 1) = {fmt(c)}</MathLine>
    ));
    base = completeFromCAlpha(c, alpha!);
  } else if (has("perim") && has("h")) {
    const c = (P0! * P0!) / (2 * (P0! + h0!));
    caseName = "Perimeter + altitude";
    push("Combine a + b = P − c with ab = h·c to eliminate a and b", (
      <MathLine>c = P² / (2·(P + h)) = {fmt(c)}</MathLine>
    ));
    // then (h,c)
    if (!(c >= 2 * h0!)) throw new Error("Perimeter and altitude are inconsistent.");
    const sPlus = Math.sqrt(c * c + 2 * h0! * c);
    const sMinus = Math.sqrt(c * c - 2 * h0! * c);
    const a = (sPlus + sMinus) / 2;
    const b = (sPlus - sMinus) / 2;
    base = completeFromAB(a, b);
  } else if (has("perim") && has("area")) {
    const c = (P0! * P0! - 4 * A0!) / (2 * P0!);
    if (!(c > 0)) throw new Error("Area is too large for this perimeter.");
    caseName = "Perimeter + area";
    push("From ½·ab = A and (a+b)² − 2ab = c², eliminate a+b via a+b = P − c", (
      <MathLine>c = (P² − 4A) / (2·P) = {fmt(c)}</MathLine>
    ));
    const sum = P0! - c;
    const ab = 2 * A0!;
    const disc = sum * sum - 4 * ab;
    if (disc < 0) throw new Error("No real legs exist for these values.");
    const d = Math.sqrt(disc);
    const a = (sum + d) / 2;
    const b = (sum - d) / 2;
    base = completeFromAB(a, b);
  } else {
    throw new Error("This combination is not supported. Try including at least one side.");
  }

  finalStep(base);
  return { ...base, caseName, steps };
}

function labelFor(k: string): string {
  const m: Record<string, string> = {
    a: "Leg a", b: "Leg b", c: "Hypotenuse c",
    alpha: "Angle α", beta: "Angle β",
    h: "Altitude h", area: "Area", perim: "Perimeter",
  };
  return m[k] ?? k;
}

/* ================= Live SVG diagram ================= */

function TriangleDiagram({
  a, b, c, alpha, beta, h, sig,
}: {
  a: number; b: number; c: number; alpha: number; beta: number; h: number;
  sig: number;
}) {
  const W = 360;
  const H = 240;
  const pad = 40;
  const scale = Math.min((W - 2 * pad) / b, (H - 2 * pad) / a);
  const legB = b * scale;
  const legA = a * scale;
  const x0 = pad;
  const y0 = H - pad;
  const xB = x0 + legB;
  const xA = x0;
  const yA = y0 - legA;
  // Foot of altitude from right angle to hypotenuse: parametric projection.
  const dx = xB - xA;
  const dy = y0 - yA;
  const len2 = dx * dx + dy * dy;
  const t = ((x0 - xA) * dx + (y0 - yA) * dy) / len2;
  const fx = xA + t * dx;
  const fy = yA + t * dy;
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        To-scale right triangle (with altitude h)
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        <polygon
          points={`${x0},${y0} ${xB},${y0} ${xA},${yA}`}
          className="fill-primary/10 stroke-primary"
          strokeWidth={2}
        />
        {/* right-angle square */}
        <rect x={x0} y={y0 - 12} width={12} height={12} className="fill-none stroke-primary" strokeWidth={1.2} />
        {/* altitude */}
        <line x1={x0} y1={y0} x2={fx} y2={fy} className="stroke-primary" strokeDasharray="4 3" strokeWidth={1.6} />
        {/* labels */}
        <text x={(x0 + xB) / 2} y={y0 + 18} textAnchor="middle" className="fill-foreground text-[12px]">b = {fmt(b, sig)}</text>
        <text x={x0 - 8} y={(y0 + yA) / 2 + 4} textAnchor="end" className="fill-foreground text-[12px]">a = {fmt(a, sig)}</text>
        <text x={(xA + xB) / 2 + 10} y={(yA + y0) / 2 - 6} className="fill-primary text-[12px] font-semibold">c = {fmt(c, sig)}</text>
        <text x={x0 + 6} y={yA + 14} className="fill-foreground text-[11px] italic">α = {fmt(fromRad(alpha, "deg"), sig)}°</text>
        <text x={xB - 40} y={y0 - 6} className="fill-foreground text-[11px] italic">β = {fmt(fromRad(beta, "deg"), sig)}°</text>
        <text x={(x0 + fx) / 2 + 4} y={(y0 + fy) / 2 + 4} className="fill-primary/80 text-[11px] italic">h = {fmt(h, sig)}</text>
      </svg>
    </div>
  );
}

/* ================= FAQ & Guide content ================= */

const FAQ_ITEMS = [
  {
    q: "What is a right triangle?",
    a: "A right triangle is a triangle with exactly one 90° angle. The side opposite the right angle is the hypotenuse (always the longest side), and the two sides that form the right angle are called the legs.",
  },
  {
    q: "How do I find a missing side of a right triangle?",
    a: "If you know both legs or the hypotenuse and one leg, use the Pythagorean theorem: a² + b² = c². If you know one side and one acute angle, use the trigonometric ratios: sin α = opposite/hypotenuse, cos α = adjacent/hypotenuse, tan α = opposite/adjacent.",
  },
  {
    q: "How do I find a missing angle?",
    a: "Take any two known sides and apply an inverse trig function. For example, α = tan⁻¹(a/b) if you know both legs, α = sin⁻¹(a/c) if you know a leg and the hypotenuse. Because the angles in any triangle add to 180° and one is 90°, the other acute angle is simply β = 90° − α.",
  },
  {
    q: "What is the altitude of a right triangle?",
    a: "The altitude h is the perpendicular distance from the right-angle vertex to the hypotenuse. It splits the triangle into two smaller triangles similar to the original. The compact formula is h = a·b / c — the product of the legs divided by the hypotenuse.",
  },
  {
    q: "Why is the circumradius always half the hypotenuse?",
    a: "By Thales' theorem, any triangle inscribed in a circle with one side as a diameter is a right triangle, and the right angle sits on the circle. Turned around: for a right triangle, the hypotenuse IS a diameter of the circumscribed circle. So R = c / 2 exactly.",
  },
  {
    q: "What are the 30-60-90 and 45-45-90 special triangles?",
    a: "They are the two most useful right triangles in trigonometry. A 30-60-90 triangle has sides in the fixed ratio 1 : √3 : 2 — if the short leg is 1, the long leg is √3 and the hypotenuse is 2. A 45-45-90 triangle (an isosceles right triangle) has sides 1 : 1 : √2. Knowing just one side lets you write down the other two without a calculator.",
  },
  {
    q: "How is this different from your Triangle and Pythagorean calculators?",
    a: "The Triangle Calculator solves any triangle (not necessarily right-angled) from SSS, SAS, ASA, AAS or SSA. The Pythagorean Theorem Calculator only handles the single equation a² + b² = c². This Right Triangle Calculator is specialised: it accepts any two of seven measurements — legs, hypotenuse, either acute angle, altitude, area or perimeter — and returns every one of them along with the inradius and circumradius.",
  },
] as const;

/* ---------- Diagrams used inside GuideCards ---------- */

function GuideRight({ a, b, unknown }: { a: number; b: number; unknown?: "a" | "b" | "c" }) {
  const W = 300, H = 200, pad = 30;
  const s = Math.min((W - 2 * pad) / b, (H - 2 * pad) / a);
  const bx = b * s;
  const ay = a * s;
  const x0 = pad, y0 = H - pad;
  const dim = "var(--muted-foreground)";
  const accent = "var(--primary)";
  const stroke = "currentColor";
  const col = (w: "a" | "b" | "c") => (unknown === w ? accent : stroke);
  return (
    <div className="flex items-center justify-center rounded-xl border border-border/60 bg-secondary/20 p-3 text-foreground">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[300px] h-auto" aria-label="right triangle">
        <polygon points={`${x0},${y0} ${x0 + bx},${y0} ${x0},${y0 - ay}`} style={{ fill: accent, opacity: 0.08 }} />
        <rect x={x0} y={y0 - 12} width={12} height={12} fill="none" style={{ stroke: dim }} strokeWidth={1.2} />
        <line x1={x0} y1={y0} x2={x0 + bx} y2={y0} style={{ stroke: col("b") }} strokeWidth={3} strokeLinecap="round" />
        <line x1={x0} y1={y0} x2={x0} y2={y0 - ay} style={{ stroke: col("a") }} strokeWidth={3} strokeLinecap="round" />
        <line x1={x0} y1={y0 - ay} x2={x0 + bx} y2={y0} style={{ stroke: col("c") }} strokeWidth={3} strokeLinecap="round" />
        <text x={x0 - 10} y={y0 - ay / 2} style={{ fill: col("a") }} fontSize="15" fontWeight="600" textAnchor="end" dominantBaseline="middle" fontStyle="italic">a</text>
        <text x={x0 + bx / 2} y={y0 + 18} style={{ fill: col("b") }} fontSize="15" fontWeight="600" textAnchor="middle" fontStyle="italic">b</text>
        <text x={x0 + bx / 2 + 10} y={y0 - ay / 2 - 6} style={{ fill: col("c") }} fontSize="15" fontWeight="600" fontStyle="italic">c</text>
      </svg>
    </div>
  );
}

function GuideAltitude() {
  const W = 320, H = 210, pad = 30;
  const a = 3, b = 4;
  const s = Math.min((W - 2 * pad) / b, (H - 2 * pad) / a);
  const bx = b * s, ay = a * s;
  const x0 = pad, y0 = H - pad;
  const xA = x0, yA = y0 - ay;
  const xB = x0 + bx;
  const dx = xB - xA, dy = y0 - yA;
  const len2 = dx * dx + dy * dy;
  const t = ((x0 - xA) * dx + (y0 - yA) * dy) / len2;
  const fx = xA + t * dx, fy = yA + t * dy;
  return (
    <div className="flex items-center justify-center rounded-xl border border-border/60 bg-secondary/20 p-3 text-foreground">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[320px] h-auto" aria-label="altitude to hypotenuse">
        <polygon points={`${x0},${y0} ${xB},${y0} ${xA},${yA}`} style={{ fill: "var(--primary)", opacity: 0.08 }} />
        <rect x={x0} y={y0 - 12} width={12} height={12} fill="none" style={{ stroke: "var(--muted-foreground)" }} strokeWidth={1.2} />
        <line x1={x0} y1={y0} x2={xB} y2={y0} stroke="currentColor" strokeWidth={2.5} />
        <line x1={x0} y1={y0} x2={xA} y2={yA} stroke="currentColor" strokeWidth={2.5} />
        <line x1={xA} y1={yA} x2={xB} y2={y0} stroke="currentColor" strokeWidth={2.5} />
        <line x1={x0} y1={y0} x2={fx} y2={fy} style={{ stroke: "var(--primary)" }} strokeWidth={2.5} strokeDasharray="4 3" />
        <text x={(x0 + fx) / 2 + 4} y={(y0 + fy) / 2 + 4} style={{ fill: "var(--primary)" }} fontSize="14" fontWeight="600" fontStyle="italic">h</text>
        <text x={x0 - 10} y={y0 - ay / 2} fontSize="14" fontWeight="600" textAnchor="end" dominantBaseline="middle" fontStyle="italic">a</text>
        <text x={x0 + bx / 2} y={y0 + 18} fontSize="14" fontWeight="600" textAnchor="middle" fontStyle="italic">b</text>
        <text x={x0 + bx / 2 + 10} y={y0 - ay / 2 - 6} fontSize="14" fontWeight="600" fontStyle="italic">c</text>
      </svg>
    </div>
  );
}

function GuideCircum() {
  const W = 320, H = 210;
  const cx = W / 2, cy = H / 2 + 10, R = 70;
  // Right triangle inscribed with hypotenuse as diameter.
  const A: [number, number] = [cx - R, cy];
  const B: [number, number] = [cx + R, cy];
  const C: [number, number] = [cx - R + 2 * R * 0.6 ** 2, cy - 2 * R * 0.6 * 0.8]; // on the circle
  // Force C exactly on the circle: parametric angle 120° from A
  const ang = (2 * Math.PI) / 3;
  C[0] = cx + R * Math.cos(Math.PI - ang);
  C[1] = cy - R * Math.sin(Math.PI - ang);
  return (
    <div className="flex items-center justify-center rounded-xl border border-border/60 bg-secondary/20 p-3 text-foreground">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[320px] h-auto" aria-label="circumscribed circle">
        <circle cx={cx} cy={cy} r={R} fill="none" style={{ stroke: "var(--muted-foreground)" }} strokeWidth={1.4} strokeDasharray="4 3" />
        <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} style={{ stroke: "var(--primary)" }} strokeWidth={2.5} />
        <line x1={A[0]} y1={A[1]} x2={C[0]} y2={C[1]} stroke="currentColor" strokeWidth={2.5} />
        <line x1={B[0]} y1={B[1]} x2={C[0]} y2={C[1]} stroke="currentColor" strokeWidth={2.5} />
        <circle cx={cx} cy={cy} r={3} style={{ fill: "var(--primary)" }} />
        <text x={cx + 6} y={cy - 6} style={{ fill: "var(--primary)" }} fontSize="12" fontWeight="600">O</text>
        <text x={(A[0] + B[0]) / 2} y={cy + 18} textAnchor="middle" style={{ fill: "var(--primary)" }} fontSize="13" fontWeight="600" fontStyle="italic">c (diameter)</text>
        <text x={C[0]} y={C[1] - 6} textAnchor="middle" fontSize="13" fontWeight="600">90°</text>
      </svg>
    </div>
  );
}

const GUIDE: GuideCardItem[] = [
  {
    key: "sides",
    title: "Find a missing side with the Pythagorean theorem",
    explain:
      "If you know both legs, the hypotenuse is the square root of the sum of their squares. If you know the hypotenuse and one leg, subtract that leg-square from the hypotenuse-square before taking the root.",
    formula: <>c = √(a² + b²) &nbsp;·&nbsp; a = √(c² − b²)</>,
    legend: [
      { sym: "a, b", def: "the two legs" },
      { sym: "c", def: "the hypotenuse (opposite the right angle)" },
    ],
    diagram: <GuideRight a={3} b={4} unknown="c" />,
    example: {
      given: <>a = 3, &nbsp; b = 4</>,
      substitute: <>c = √(3² + 4²) = √(9 + 16) = √25</>,
      answer: <>c = 5</>,
    },
  },
  {
    key: "trig-side",
    title: "Find a side from one side + an acute angle (trigonometry)",
    explain:
      "When you only know one side plus one acute angle, use sine, cosine or tangent. sin α = opposite/hypotenuse, cos α = adjacent/hypotenuse, tan α = opposite/adjacent. Pick the ratio that pairs your known side with the one you need.",
    formula: <>a = c · sin α &nbsp;·&nbsp; b = c · cos α &nbsp;·&nbsp; a = b · tan α</>,
    legend: [
      { sym: "α", def: "acute angle opposite leg a" },
      { sym: "c", def: "hypotenuse" },
    ],
    diagram: <GuideRight a={3} b={4} />,
    example: {
      given: <>c = 10, &nbsp; α = 30°</>,
      substitute: <>a = 10 · sin 30° = 10 · 0.5, &nbsp; b = 10 · cos 30°</>,
      answer: <>a = 5, &nbsp; b ≈ 8.6603</>,
    },
  },
  {
    key: "angle",
    title: "Find a missing angle with inverse trigonometry",
    explain:
      "Given any two sides, form the appropriate ratio and take its inverse trig function. The other acute angle is always 90° − α.",
    formula: <>α = sin⁻¹(a/c) = cos⁻¹(b/c) = tan⁻¹(a/b)</>,
    legend: [
      { sym: "α", def: "acute angle you want" },
      { sym: "a, b, c", def: "any two of the three sides" },
    ],
    diagram: <GuideRight a={3} b={4} />,
    example: {
      given: <>a = 3, &nbsp; b = 4</>,
      substitute: <>α = tan⁻¹(3 / 4) = tan⁻¹(0.75)</>,
      answer: <>α ≈ 36.87°, &nbsp; β ≈ 53.13°</>,
    },
  },
  {
    key: "altitude",
    title: "Altitude from the right angle to the hypotenuse",
    explain:
      "The altitude h drops from the 90° corner perpendicular to the hypotenuse. It splits the triangle into two smaller triangles that are similar to the whole. Because the area can be written as ½·a·b OR ½·c·h, the two must match — giving h = a·b / c.",
    formula: <>h = a · b / c</>,
    legend: [
      { sym: "a, b", def: "the two legs" },
      { sym: "c", def: "the hypotenuse" },
      { sym: "h", def: "altitude to the hypotenuse" },
    ],
    diagram: <GuideAltitude />,
    example: {
      given: <>a = 3, &nbsp; b = 4, &nbsp; c = 5</>,
      substitute: <>h = 3 · 4 / 5 = 12 / 5</>,
      answer: <>h = 2.4</>,
    },
  },
  {
    key: "circum",
    title: "Circumradius = half the hypotenuse (Thales' theorem)",
    explain:
      "The circle passing through all three vertices — the circumcircle — always has the hypotenuse as its diameter for a right triangle. This is Thales' theorem: an angle inscribed in a semicircle is a right angle. So the circumradius is exactly half the hypotenuse, no matter the shape of the right triangle.",
    formula: <>R = c / 2</>,
    legend: [
      { sym: "R", def: "circumradius" },
      { sym: "c", def: "hypotenuse" },
    ],
    diagram: <GuideCircum />,
    example: {
      given: <>c = 10</>,
      substitute: <>R = 10 / 2</>,
      answer: <>R = 5</>,
    },
  },
];

/* ================= Presets ================= */

interface Preset { label: string; assign: (setters: Setters) => void; }

interface Setters {
  setA: (v: string) => void; setB: (v: string) => void; setC: (v: string) => void;
  setAlpha: (v: string) => void; setBeta: (v: string) => void; setH: (v: string) => void;
  setArea: (v: string) => void; setPerim: (v: string) => void;
  setAngleUnit: (u: AngleUnit) => void;
  clearAll: () => void;
}

const PRESETS: Preset[] = [
  {
    label: "Use 3-4-5",
    assign: (s) => { s.clearAll(); s.setA("3"); s.setB("4"); },
  },
  {
    label: "Use 30-60-90 (short leg = 1)",
    assign: (s) => { s.clearAll(); s.setAngleUnit("deg"); s.setA("1"); s.setAlpha("30"); },
  },
  {
    label: "Use 45-45-90 (leg = 1)",
    assign: (s) => { s.clearAll(); s.setAngleUnit("deg"); s.setA("1"); s.setAlpha("45"); },
  },
  {
    label: "Ladder (c = 5 m, α = 75°)",
    assign: (s) => { s.clearAll(); s.setAngleUnit("deg"); s.setC("5"); s.setAlpha("75"); },
  },
];

/* ================= Page ================= */

function RightTrianglePage() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [alpha, setAlpha] = useState("");
  const [beta, setBeta] = useState("");
  const [h, setH] = useState("");
  const [area, setArea] = useState("");
  const [perim, setPerim] = useState("");
  const [angleUnit, setAngleUnit] = useState<AngleUnit>("deg");
  const [sig, setSig] = useState(4);
  const [result, setResult] = useState<Solved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const setters: Setters = {
    setA, setB, setC, setAlpha, setBeta, setH, setArea, setPerim, setAngleUnit,
    clearAll: () => {
      setA(""); setB(""); setC(""); setAlpha(""); setBeta("");
      setH(""); setArea(""); setPerim(""); setResult(null); setError(null);
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
      a: one(a), b: one(b), c: one(c),
      alpha: one(alpha), beta: one(beta),
      h: one(h), area: one(area), perim: one(perim),
    };
  }, [a, b, c, alpha, beta, h, area, perim]);

  const onCalc = () => {
    setError(null); setResult(null);
    for (const [k, v] of Object.entries(parsed)) {
      if (v === "err") { setError(`${labelFor(k)} is not a valid number.`); return; }
    }
    const inputs: Inputs = {};
    if (typeof parsed.a === "number") inputs.a = parsed.a;
    if (typeof parsed.b === "number") inputs.b = parsed.b;
    if (typeof parsed.c === "number") inputs.c = parsed.c;
    if (typeof parsed.h === "number") inputs.h = parsed.h;
    if (typeof parsed.area === "number") inputs.area = parsed.area;
    if (typeof parsed.perim === "number") inputs.perim = parsed.perim;
    if (typeof parsed.alpha === "number") inputs.alpha = toRad(parsed.alpha, angleUnit);
    if (typeof parsed.beta === "number") inputs.beta = toRad(parsed.beta, angleUnit);
    try {
      const sol = solveRightTriangle(inputs);
      setResult(sol);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const clear = () => setters.clearAll();

  const copyText = () => {
    if (!result) return "";
    const u = angleUnit === "deg" ? "°" : " rad";
    return [
      `Right Triangle — ${result.caseName}`,
      `a = ${fmt(result.a, sig)}`,
      `b = ${fmt(result.b, sig)}`,
      `c = ${fmt(result.c, sig)}`,
      `α = ${fmt(fromRad(result.alpha, angleUnit), sig)}${u}`,
      `β = ${fmt(fromRad(result.beta, angleUnit), sig)}${u}`,
      `γ = 90${u}`,
      `Area = ${fmt(result.area, sig)}`,
      `Perimeter = ${fmt(result.perim, sig)}`,
      `Semiperimeter = ${fmt(result.s, sig)}`,
      `Altitude h = ${fmt(result.h, sig)}`,
      `Inradius r = ${fmt(result.r, sig)}`,
      `Circumradius R = ${fmt(result.R, sig)}`,
    ].join("\n");
  };

  return (
    <MathCalcPage
      name="Right Triangle Calculator"
      tagline="Enter any 2 of 7 values — legs, hypotenuse, either acute angle, altitude, area or perimeter — and get every remaining measurement, plus the inradius, circumradius and a to-scale diagram."
      extras={<PageExtras />}
    >
      {/* ---------- Presets & options ---------- */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => p.assign(setters)}
            className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Angle unit:</span>
          <div className="inline-flex overflow-hidden rounded-full border border-border">
            {(["deg", "rad"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setAngleUnit(u)}
                className={
                  "px-3 py-1 text-xs font-medium transition-colors " +
                  (angleUnit === u ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-accent")
                }
              >
                {u === "deg" ? "Degrees" : "Radians"}
              </button>
            ))}
          </div>
        </div>
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

      {/* ---------- Inputs ---------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Leg a" htmlFor="rt-a"><TextInput id="rt-a" value={a} onChange={(e) => setA(e.target.value)} placeholder="e.g. 3" inputMode="decimal" /></Field>
        <Field label="Leg b" htmlFor="rt-b"><TextInput id="rt-b" value={b} onChange={(e) => setB(e.target.value)} placeholder="e.g. 4" inputMode="decimal" /></Field>
        <Field label="Hypotenuse c" htmlFor="rt-c"><TextInput id="rt-c" value={c} onChange={(e) => setC(e.target.value)} placeholder="e.g. 5" inputMode="decimal" /></Field>
        <Field label={`Angle α (opposite a, ${angleUnit === "deg" ? "degrees" : "radians"})`} htmlFor="rt-alpha"><TextInput id="rt-alpha" value={alpha} onChange={(e) => setAlpha(e.target.value)} placeholder={angleUnit === "deg" ? "e.g. 36.87" : "e.g. 0.6435"} inputMode="decimal" /></Field>
        <Field label={`Angle β (opposite b, ${angleUnit === "deg" ? "degrees" : "radians"})`} htmlFor="rt-beta"><TextInput id="rt-beta" value={beta} onChange={(e) => setBeta(e.target.value)} placeholder={angleUnit === "deg" ? "e.g. 53.13" : "e.g. 0.9273"} inputMode="decimal" /></Field>
        <Field label="Altitude h (right angle → hypotenuse)" htmlFor="rt-h"><TextInput id="rt-h" value={h} onChange={(e) => setH(e.target.value)} placeholder="e.g. 2.4" inputMode="decimal" /></Field>
        <Field label="Area" htmlFor="rt-area"><TextInput id="rt-area" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. 6" inputMode="decimal" /></Field>
        <Field label="Perimeter" htmlFor="rt-perim"><TextInput id="rt-perim" value={perim} onChange={(e) => setPerim(e.target.value)} placeholder="e.g. 12" inputMode="decimal" /></Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Clear
        </button>
        <span className="text-xs text-muted-foreground">
          Enter exactly 2 values. γ is always 90°.
        </span>
      </div>

      {error && <ErrorBox message={error} />}

      {result && (
        <div ref={captureRef} className="mt-6 space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {result.caseName}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Leg a" value={fmt(result.a, sig)} />
              <Stat label="Leg b" value={fmt(result.b, sig)} />
              <Stat label="Hypotenuse c" value={fmt(result.c, sig)} />
              <Stat label="Angle α" value={`${fmt(fromRad(result.alpha, angleUnit), sig)}${angleUnit === "deg" ? "°" : " rad"}`} />
              <Stat label="Angle β" value={`${fmt(fromRad(result.beta, angleUnit), sig)}${angleUnit === "deg" ? "°" : " rad"}`} />
              <Stat label="Angle γ" value={angleUnit === "deg" ? "90°" : `${fmt(HALF_PI, sig)} rad`} />
              <Stat label="Area A" value={fmt(result.area, sig)} />
              <Stat label="Perimeter P" value={fmt(result.perim, sig)} />
              <Stat label="Semiperimeter s" value={fmt(result.s, sig)} />
              <Stat label="Altitude h" value={fmt(result.h, sig)} />
              <Stat label="Inradius r" value={fmt(result.r, sig)} />
              <Stat label="Circumradius R" value={fmt(result.R, sig)} note="= c / 2 (Thales)" />
            </div>
          </div>

          <TriangleDiagram a={result.a} b={result.b} c={result.c} alpha={result.alpha} beta={result.beta} h={result.h} sig={sig} />

          <StepsToggle steps={result.steps} />

          <ResultActions getCopyText={copyText} captureRef={captureRef} filename="right-triangle" />
        </div>
      )}
    </MathCalcPage>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-lg italic tabular-nums text-foreground">{value}</div>
      {note && <div className="mt-0.5 text-[11px] text-muted-foreground">{note}</div>}
    </div>
  );
}

/* ================= Extras (educational content) ================= */

function PageExtras() {
  return (
    <>
      <CalcSection title="What is a right triangle?">
        <p>
          A <strong>right triangle</strong> is any triangle that contains one
          90° angle. The two sides that meet at the right angle are the{" "}
          <em>legs</em> (usually written a and b); the side opposite the right
          angle — always the longest — is the <em>hypotenuse</em>, c. The two
          non-right angles are acute and, because the interior angles of a
          triangle sum to 180°, they always add up to 90°: α + β = 90°.
        </p>
        <p>
          That single 90° angle is what makes right triangles special. The
          Pythagorean theorem <span className="font-serif italic">a² + b² = c²</span>{" "}
          holds only here, and the sine, cosine and tangent ratios are defined
          on the sides of a right triangle. In practice this means <strong>any two independent measurements are enough to lock the whole triangle down</strong> —
          the calculator above uses that fact to solve for every remaining side,
          angle, area, perimeter, altitude, inradius and circumradius.
        </p>
      </CalcSection>


      <CalcSection title="Right triangles, case by case">
        <GuideCards items={GUIDE} />
      </CalcSection>

      <CalcSection title="All formulas — every calculation mode">
        <AllFormulasSection
          intro={
            <>
              Notation: legs <em>a</em>, <em>b</em>; hypotenuse <em>c</em>;
              acute angles <em>α</em> opposite <em>a</em> and <em>β</em>{" "}
              opposite <em>b</em>; area <em>K</em>; perimeter <em>P</em>;
              altitude to hypotenuse <em>h</em>. Any two independent inputs
              solve the whole triangle.
            </>
          }
        >
          <ModeFormula
            label="1. Two legs — given a, b"
            lines={[
              <>c = √(a² + b²)</>,
              <>α = tan⁻¹(a / b),   β = 90° − α</>,
            ]}
          />
          <ModeFormula
            label="2. Leg + hypotenuse — given a, c"
            lines={[
              <>b = √(c² − a²)</>,
              <>α = sin⁻¹(a / c),   β = 90° − α</>,
            ]}
          />
          <ModeFormula
            label="3. Leg + adjacent acute angle — given a, α"
            lines={[
              <>c = a / sin α</>,
              <>b = a / tan α</>,
              <>β = 90° − α</>,
            ]}
          />
          <ModeFormula
            label="4. Leg + opposite acute angle — given a, β"
            lines={[
              <>c = a / cos β</>,
              <>b = a · tan β</>,
              <>α = 90° − β</>,
            ]}
          />
          <ModeFormula
            label="5. Hypotenuse + acute angle — given c, α"
            lines={[
              <>a = c · sin α</>,
              <>b = c · cos α</>,
              <>β = 90° − α</>,
            ]}
          />
          <ModeFormula
            label="6. Area + leg — given K, a"
            lines={[
              <>b = 2K / a</>,
              <>c = √(a² + b²)</>,
              <>α = tan⁻¹(a / b)</>,
            ]}
          />
          <ModeFormula
            label="7. Perimeter + one leg — given P, a"
            lines={[
              <>b + c = P − a,  with c² = a² + b²</>,
              <>b = ((P − a)² − a²) / (2(P − a))</>,
              <>c = P − a − b</>,
            ]}
          />
          <ModeFormula
            label="Derived quantities (every mode)"
            lines={[
              <>Area  K = ½ · a · b</>,
              <>Perimeter  P = a + b + c</>,
              <>Altitude to hypotenuse  h = a · b / c</>,
              <>Inradius  r = (a + b − c) / 2</>,
              <>Circumradius  R = c / 2</>,
            ]}
          />
        </AllFormulasSection>
      </CalcSection>



      <CalcSection title="Trigonometric ratios — the cheat sheet">
        <p>
          For a right triangle with acute angle α opposite leg a, the three
          primary ratios and their inverses cover every side-and-angle problem.
        </p>
        <ReferenceTable
          headers={["Ratio", "Definition", "Solves for a side", "Solves for α"]}
          rows={[
            ["sin α", "opposite / hypotenuse = a / c", "a = c · sin α", "α = sin⁻¹(a / c)"],
            ["cos α", "adjacent / hypotenuse = b / c", "b = c · cos α", "α = cos⁻¹(b / c)"],
            ["tan α", "opposite / adjacent = a / b", "a = b · tan α", "α = tan⁻¹(a / b)"],
          ]}
        />
        <MathNote>
          Reciprocal ratios (csc, sec, cot) work the same way — just flip the
          fraction. β = 90° − α, so the roles of sin and cos swap when you
          switch which acute angle you name.
        </MathNote>
      </CalcSection>

      <CalcSection title="Special right triangles">
        <p>
          Two right triangles come up so often in trigonometry that their side
          ratios are worth memorising. Given a single side, you can write the
          other two straight from the ratio — no calculator required.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
            <h3 className="font-display text-lg font-semibold text-foreground">30°-60°-90°</h3>
            <p className="mt-2 text-sm">
              Side ratio <span className="font-serif italic">1 : √3 : 2</span>.
              The short leg faces the 30° angle; the long leg faces the 60°
              angle; the hypotenuse is twice the short leg.
            </p>
            <FormulaWithLegend
              formula={<>short : long : hyp = 1 : √3 : 2</>}
              legend={[{ sym: "short leg", def: "opposite the 30° angle" }]}
            />
            <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Example</div>
              <div className="mt-1 space-y-1">
                <div><span className="text-muted-foreground">Given:</span> short leg = 5</div>
                <div><span className="text-muted-foreground">Long leg:</span> 5·√3 ≈ 8.6603</div>
                <div><span className="text-muted-foreground">Hypotenuse:</span> 2·5 = 10</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
            <h3 className="font-display text-lg font-semibold text-foreground">45°-45°-90°</h3>
            <p className="mt-2 text-sm">
              Side ratio <span className="font-serif italic">1 : 1 : √2</span>.
              Because two angles are equal, the two legs are equal — it's an
              isosceles right triangle, and the hypotenuse is √2 times a leg.
            </p>
            <FormulaWithLegend
              formula={<>leg : leg : hyp = 1 : 1 : √2</>}
              legend={[{ sym: "leg", def: "either of the two equal sides" }]}
            />
            <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Example</div>
              <div className="mt-1 space-y-1">
                <div><span className="text-muted-foreground">Given:</span> leg = 7</div>
                <div><span className="text-muted-foreground">Other leg:</span> 7</div>
                <div><span className="text-muted-foreground">Hypotenuse:</span> 7·√2 ≈ 9.8995</div>
              </div>
            </div>
          </div>
        </div>
      </CalcSection>

      <CalcSection title="Where h = a·b / c actually comes from">
        <p>
          The altitude formula falls straight out of computing the same area
          two different ways. Using the two legs as base and height gives A =
          ½·a·b. Using the hypotenuse as the base with h as its perpendicular
          height gives A = ½·c·h. Setting the two equal:
        </p>
        <FormulaBlock>½·a·b = ½·c·h &nbsp; ⇒ &nbsp; h = a·b / c</FormulaBlock>
        <p>
          The same picture also produces the geometric-mean relationship h² =
          p·q, where p and q are the two segments the altitude cuts the
          hypotenuse into. That's another consequence of the three similar
          triangles the altitude creates.
        </p>
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Accepts any 2 of: leg a, leg b, hypotenuse c, angle α, angle β, altitude h, area A, perimeter P.",
            "Degrees or radians toggle for every angle input and output.",
            "Live to-scale SVG showing labelled sides, angles, the right-angle marker and the altitude h.",
            "One-click presets for the 3-4-5, 30-60-90 and 45-45-90 triangles plus a ladder-against-wall example.",
            "Step-by-step derivation using your actual numbers — every substitution shown.",
            "Reports the inradius r = (a + b − c) / 2 and circumradius R = c / 2 (half the hypotenuse, always).",
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
            { to: "/calculators/math/pythagorean-theorem-calculator", label: "Pythagorean Theorem Calculator (a² + b² = c² only)" },
            { to: "/calculators/math/area-calculator", label: "Area Calculator" },
            { to: "/calculators/math/slope-calculator", label: "Slope Calculator" },
          ]}
        />
        <MathNote>
          Not sure which to use? This page is the right pick when the triangle
          has a 90° angle and you know two of its measurements. Use the{" "}
          <em>Triangle Calculator</em> for any other triangle (no right angle
          required) and the <em>Pythagorean Theorem Calculator</em> when you
          only need to solve the a² + b² = c² equation itself.
        </MathNote>
      </CalcSection>
    </>
  );
}

export const Route = createFileRoute("/calculators/math/right-triangle-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Right Triangle Calculator",
      title: "Right Triangle Calculator — Sides, Angles, Altitude & Area",
      metaDescription:
        "Solve a right triangle from any 2 of 7 values — legs, hypotenuse, either acute angle, altitude, area or perimeter. Live scale diagram, 30-60-90 & 45-45-90 presets, inradius, circumradius and full step-by-step working.",
      canonicalUrl: "/calculators/math/right-triangle-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Right Triangle Calculator", path: "/calculators/math/right-triangle-calculator" },
      ],
      faqs: FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a })),
    }),
  component: RightTrianglePage,
});
