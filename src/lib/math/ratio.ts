import { gcd } from "./core";

export interface Ratio {
  a: number;
  b: number;
}

export function simplifyRatio(a: number, b: number): Ratio {
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error("Invalid numbers");
  if (b === 0) throw new Error("Second term cannot be zero");
  // Scale floats to integers.
  const decimals = Math.max(decimalPlaces(a), decimalPlaces(b));
  const factor = Math.pow(10, decimals);
  const ai = Math.round(a * factor);
  const bi = Math.round(b * factor);
  const g = gcd(ai, bi);
  return { a: ai / g, b: bi / g };
}

function decimalPlaces(n: number): number {
  const s = String(n);
  const idx = s.indexOf(".");
  return idx === -1 ? 0 : s.length - idx - 1;
}

/**
 * Solve a:b = c:d given exactly three of the four terms (undefined = unknown).
 * Returns the full ratio with the missing term filled in.
 */
export function solveProportion(
  a: number | undefined,
  b: number | undefined,
  c: number | undefined,
  d: number | undefined,
): { a: number; b: number; c: number; d: number; solvedFor: "a" | "b" | "c" | "d" } {
  const missing = [a, b, c, d].filter((v) => v === undefined).length;
  if (missing !== 1) throw new Error("Provide exactly three of the four terms");
  if (a === undefined) {
    if (d === 0) throw new Error("d cannot be zero when solving for a");
    return { a: (b! * c!) / d!, b: b!, c: c!, d: d!, solvedFor: "a" };
  }
  if (b === undefined) {
    if (c === 0) throw new Error("c cannot be zero when solving for b");
    return { a, b: (a * d!) / c!, c: c!, d: d!, solvedFor: "b" };
  }
  if (c === undefined) {
    if (b === 0) throw new Error("b cannot be zero when solving for c");
    return { a, b, c: (a * d!) / b, d: d!, solvedFor: "c" };
  }
  if (a === 0) throw new Error("a cannot be zero when solving for d");
  return { a, b: b!, c: c!, d: (b! * c!) / a, solvedFor: "d" };
}
