// P-value math: normal, chi-square and F distribution CDFs / PDFs / critical
// values. Re-uses the log-gamma and regularised-incomplete-beta helpers from
// the t-test module so the whole page ships one consistent numerical core.

import { lngamma, betai, tCDF, tPDF, tInv, fmt, fmtP } from "./t-test";
export { tCDF, tPDF, tInv, fmt, fmtP };

export type Tail = "two" | "left" | "right";

/* ---------------- Normal (standard) ---------------- */

// Abramowitz & Stegun 7.1.26 erf approximation (max error ~1.5e-7).
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741,
    a4 = -1.453152027,
    a5 = 1.061405429,
    p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export function normalPDF(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

// Inverse standard-normal CDF via bisection.
export function normalInv(p: number): number {
  if (p <= 0 || p >= 1) return NaN;
  let lo = -12,
    hi = 12;
  for (let i = 0; i < 120; i++) {
    const m = (lo + hi) / 2;
    if (normalCDF(m) < p) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/* ---------------- Regularised lower incomplete gamma P(a, x) ---------------- */
// Numerical Recipes-style series/continued-fraction split.

function gser(a: number, x: number): number {
  const ITMAX = 200;
  const EPS = 3e-12;
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 0; n < ITMAX; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lngamma(a));
}

function gcf(a: number, x: number): number {
  const ITMAX = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= ITMAX; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h * Math.exp(-x + a * Math.log(x) - lngamma(a));
}

export function gammap(a: number, x: number): number {
  if (x <= 0 || a <= 0) return 0;
  if (x < a + 1) return gser(a, x);
  return 1 - gcf(a, x);
}

/* ---------------- Chi-square ---------------- */

export function chiSquareCDF(x: number, df: number): number {
  if (x <= 0 || df <= 0) return 0;
  return gammap(df / 2, x / 2);
}

export function chiSquarePDF(x: number, df: number): number {
  if (x <= 0 || df <= 0) return 0;
  const k = df / 2;
  return Math.exp((k - 1) * Math.log(x) - x / 2 - k * Math.log(2) - lngamma(k));
}

export function chiSquareInv(p: number, df: number): number {
  if (p <= 0 || p >= 1 || df <= 0) return NaN;
  let lo = 0,
    hi = Math.max(df * 10, 50);
  while (chiSquareCDF(hi, df) < p) hi *= 2;
  for (let i = 0; i < 120; i++) {
    const m = (lo + hi) / 2;
    if (chiSquareCDF(m, df) < p) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/* ---------------- F distribution ---------------- */

export function fCDF(f: number, d1: number, d2: number): number {
  if (f <= 0 || d1 <= 0 || d2 <= 0) return 0;
  const x = (d1 * f) / (d1 * f + d2);
  return betai(d1 / 2, d2 / 2, x);
}

export function fPDF(f: number, d1: number, d2: number): number {
  if (f <= 0 || d1 <= 0 || d2 <= 0) return 0;
  const a = d1 / 2,
    b = d2 / 2;
  const logNum =
    a * Math.log(d1) +
    b * Math.log(d2) +
    (a - 1) * Math.log(f) -
    (a + b) * Math.log(d1 * f + d2);
  const logBeta = lngamma(a) + lngamma(b) - lngamma(a + b);
  return Math.exp(logNum - logBeta);
}

export function fInv(p: number, d1: number, d2: number): number {
  if (p <= 0 || p >= 1) return NaN;
  let lo = 0,
    hi = 10;
  while (fCDF(hi, d1, d2) < p) hi *= 2;
  for (let i = 0; i < 120; i++) {
    const m = (lo + hi) / 2;
    if (fCDF(m, d1, d2) < p) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/* ---------------- p-value + critical-value helpers ---------------- */

export interface DistSpec {
  kind: "z" | "t" | "chi2" | "f";
  df1?: number;
  df2?: number;
}

/** Symmetric-tail p-value for z / t. */
function symP(stat: number, cdf: (x: number) => number, tail: Tail): number {
  if (tail === "left") return cdf(stat);
  if (tail === "right") return 1 - cdf(stat);
  return 2 * (1 - cdf(Math.abs(stat)));
}

export function pValueFor(stat: number, spec: DistSpec, tail: Tail): number {
  if (spec.kind === "z") return symP(stat, normalCDF, tail);
  if (spec.kind === "t") return symP(stat, (x) => tCDF(x, spec.df1!), tail);
  if (spec.kind === "chi2") {
    const cdf = chiSquareCDF(stat, spec.df1!);
    if (tail === "left") return cdf;
    if (tail === "right") return 1 - cdf;
    // Two-tailed on chi² — rarely used but reported as 2·min(cdf, 1-cdf).
    return 2 * Math.min(cdf, 1 - cdf);
  }
  const cdf = fCDF(stat, spec.df1!, spec.df2!);
  if (tail === "left") return cdf;
  if (tail === "right") return 1 - cdf;
  return 2 * Math.min(cdf, 1 - cdf);
}

export function criticalFor(alpha: number, spec: DistSpec, tail: Tail): number | [number, number] {
  if (spec.kind === "z") {
    if (tail === "two") {
      const c = normalInv(1 - alpha / 2);
      return [-c, c];
    }
    return tail === "right" ? normalInv(1 - alpha) : normalInv(alpha);
  }
  if (spec.kind === "t") {
    const df = spec.df1!;
    if (tail === "two") {
      const c = tInv(1 - alpha / 2, df);
      return [-c, c];
    }
    return tail === "right" ? tInv(1 - alpha, df) : tInv(alpha, df);
  }
  if (spec.kind === "chi2") {
    const df = spec.df1!;
    if (tail === "two") return [chiSquareInv(alpha / 2, df), chiSquareInv(1 - alpha / 2, df)];
    return tail === "right" ? chiSquareInv(1 - alpha, df) : chiSquareInv(alpha, df);
  }
  const { df1, df2 } = spec as { df1: number; df2: number };
  if (tail === "two") return [fInv(alpha / 2, df1, df2), fInv(1 - alpha / 2, df1, df2)];
  return tail === "right" ? fInv(1 - alpha, df1, df2) : fInv(alpha, df1, df2);
}
