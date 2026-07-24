/**
 * Shared helpers for the geometry calculator pages (area, volume, circle).
 * Extracted so number parsing, formatting, and unit-conversion tables are
 * defined in exactly one place.
 */

/** Parse a user-typed string into a finite number, or null when blank/invalid. */
export function num(s: string | undefined | null): number | null {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Format a number for display. Trims trailing zeros; falls back to scientific
 * notation for extreme magnitudes so cells never blow out.
 */
export function fmt(x: number, dp = 4): string {
  if (!Number.isFinite(x)) return "—";
  if (Math.abs(x) >= 1e12 || (Math.abs(x) > 0 && Math.abs(x) < 1e-4)) {
    return x.toExponential(4);
  }
  const s = x.toFixed(dp);
  return s.replace(/\.?0+$/, "") || "0";
}

/** Linear unit → meters. */
export const TO_M: Record<string, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
};

/** Squared unit → m². */
export const TO_M2: Record<string, number> = {
  mm: 1e-6,
  cm: 1e-4,
  m: 1,
  km: 1e6,
  in: 0.00064516,
  ft: 0.09290304,
  yd: 0.83612736,
  mi: 2589988.110336,
};

/** Cubic unit → m³. */
export const TO_M3: Record<string, number> = {
  mm: 1e-9,
  cm: 1e-6,
  m: 1,
  km: 1e9,
  in: 0.0254 ** 3,
  ft: 0.3048 ** 3,
  yd: 0.9144 ** 3,
};

/* ================= Law of Cosines ==================
 * Shared helpers used by both the general Triangle Calculator (SAS/SSS
 * branches) and the dedicated Law of Cosines Calculator. Angles are in
 * radians; sides are unit-agnostic (the caller labels the display unit).
 */

/**
 * SAS branch: given two sides and the included angle (radians),
 * return the length of the third side.
 *
 *   c = √( a² + b² − 2ab·cos(C) )
 */
export function solveCosineLawSide(
  s1: number,
  s2: number,
  includedAngleRad: number,
): number {
  const sq = s1 * s1 + s2 * s2 - 2 * s1 * s2 * Math.cos(includedAngleRad);
  // Guard against tiny negative values from floating-point rounding.
  return Math.sqrt(Math.max(0, sq));
}

/**
 * SSS branch: given three side lengths, return the angle (radians)
 * opposite `opposite`, using the rearranged law of cosines
 *
 *   cos(θ) = (s1² + s2² − opposite²) / (2·s1·s2)
 *
 * where s1 and s2 are the two sides adjacent to θ. Clamps the argument
 * to [-1, 1] so floating-point drift never produces NaN.
 */
export function solveCosineLawAngle(
  opposite: number,
  s1: number,
  s2: number,
): number {
  const cosTheta = (s1 * s1 + s2 * s2 - opposite * opposite) / (2 * s1 * s2);
  const clamped = Math.min(1, Math.max(-1, cosTheta));
  return Math.acos(clamped);
}

/**
 * Triangle-inequality check. Returns true when the three sides can form
 * a valid triangle (sum of any two > the third, strictly).
 */
export function isValidTriangleSides(a: number, b: number, c: number): boolean {
  return a + b > c && a + c > b && b + c > a;
}

/* ================= Trapezoid ==================
 * Shared helper for deriving the perpendicular height of a trapezoid
 * from its four side lengths. Reused by the general Area Calculator
 * (trapezoid — "all 4 sides" mode) and the dedicated Trapezoid
 * Calculator so the geometry lives in exactly one place.
 *
 * `a` and `b` are the two parallel bases (order does not matter);
 * `c` and `d` are the two non-parallel legs. Returns `{ h, x }` where
 * `x` is the horizontal offset of the shorter base's foot from the
 * longer base's endpoint on the side of leg `c`. When a === b (the
 * parallelogram edge case) `x = 0` and `h = c` (assuming c is
 * perpendicular to the bases). Returns `null` when the four sides
 * cannot close into a valid trapezoid.
 */
export function trapezoidHeightFromSides(
  a: number,
  b: number,
  c: number,
  d: number,
): { h: number; x: number } | null {
  if (!(a > 0 && b > 0 && c > 0 && d > 0)) return null;
  if (a === b) return { h: c, x: 0 };
  const diff = b - a;
  const x = (diff * diff + c * c - d * d) / (2 * diff);
  const under = c * c - x * x;
  if (under < 0) return null;
  return { h: Math.sqrt(under), x };
}


