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
