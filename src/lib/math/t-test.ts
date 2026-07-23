// T-test math: t-distribution CDF/PDF/inverse, plus one-sample,
// two-sample (Student & Welch) and paired t-test computations.
//
// The t-distribution CDF is computed via the regularized incomplete beta
// function (Numerical Recipes-style) — accurate to ~1e-9 across all df.

// ---------- Log-gamma (Lanczos) ----------
export function lngamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lngamma(1 - z);
  }
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// ---------- Regularized incomplete beta ----------
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

export function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    lngamma(a + b) - lngamma(a) - lngamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// ---------- Student t distribution ----------
/** CDF P(T <= t) for df = v > 0. */
export function tCDF(t: number, v: number): number {
  if (!Number.isFinite(t) || !Number.isFinite(v) || v <= 0) return NaN;
  const x = v / (v + t * t);
  const ib = betai(v / 2, 0.5, x);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

/** PDF f(t) for df = v > 0. */
export function tPDF(t: number, v: number): number {
  const log =
    lngamma((v + 1) / 2) -
    lngamma(v / 2) -
    0.5 * Math.log(v * Math.PI) -
    ((v + 1) / 2) * Math.log(1 + (t * t) / v);
  return Math.exp(log);
}

/** Two-sided p-value for |t|. */
export function tPValue(
  t: number,
  df: number,
  tail: "two" | "left" | "right",
): number {
  if (tail === "two") return 2 * (1 - tCDF(Math.abs(t), df));
  if (tail === "right") return 1 - tCDF(t, df);
  return tCDF(t, df);
}

/**
 * Inverse CDF for the Student t distribution — returns t such that
 * P(T <= t) = p. Uses bisection with a normal-approximation start.
 */
export function tInv(p: number, df: number): number {
  if (p <= 0 || p >= 1 || df <= 0) return NaN;
  let lo = -50;
  let hi = 50;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (tCDF(mid, df) < p) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-10) break;
  }
  return (lo + hi) / 2;
}

/** Critical t value(s) for a test at level α with the given tail. */
export function tCriticalValue(
  alpha: number,
  df: number,
  tail: "two" | "left" | "right",
): number {
  if (tail === "two") return tInv(1 - alpha / 2, df);
  if (tail === "right") return tInv(1 - alpha, df);
  return tInv(alpha, df);
}

// ---------- Summary stats ----------
export interface SampleStats {
  n: number;
  mean: number;
  sd: number; // sample standard deviation (n-1)
  variance: number;
}

export function summarize(values: number[]): SampleStats {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const ssq = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  const variance = n > 1 ? ssq / (n - 1) : 0;
  return { n, mean, sd: Math.sqrt(variance), variance };
}

// ---------- Test results ----------
export type Tail = "two" | "left" | "right";

export interface TTestResult {
  t: number;
  df: number;
  pValue: number;
  critical: number;
  reject: boolean;
  alpha: number;
  tail: Tail;
  se: number;
  meanDiff?: number;
  // Diagnostics for the steps panel
  extras?: Record<string, number>;
}

export function oneSampleTTest(
  s: SampleStats,
  mu0: number,
  alpha: number,
  tail: Tail,
): TTestResult {
  const se = s.sd / Math.sqrt(s.n);
  const t = (s.mean - mu0) / se;
  const df = s.n - 1;
  const pValue = tPValue(t, df, tail);
  const critical = tCriticalValue(alpha, df, tail);
  const reject =
    tail === "two"
      ? Math.abs(t) > critical
      : tail === "right"
        ? t > critical
        : t < critical;
  return { t, df, pValue, critical, reject, alpha, tail, se, meanDiff: s.mean - mu0 };
}

export function twoSampleTTest(
  a: SampleStats,
  b: SampleStats,
  alpha: number,
  tail: Tail,
  equalVariance: boolean,
): TTestResult {
  const meanDiff = a.mean - b.mean;
  let se: number, df: number;
  const extras: Record<string, number> = {};
  if (equalVariance) {
    const sp2 =
      ((a.n - 1) * a.variance + (b.n - 1) * b.variance) / (a.n + b.n - 2);
    se = Math.sqrt(sp2 * (1 / a.n + 1 / b.n));
    df = a.n + b.n - 2;
    extras.pooledVar = sp2;
    extras.pooledSD = Math.sqrt(sp2);
  } else {
    // Welch's t-test
    const vA = a.variance / a.n;
    const vB = b.variance / b.n;
    se = Math.sqrt(vA + vB);
    const num = (vA + vB) ** 2;
    const den = (vA * vA) / (a.n - 1) + (vB * vB) / (b.n - 1);
    df = num / den;
    extras.vA = vA;
    extras.vB = vB;
    extras.welchNum = num;
    extras.welchDen = den;
  }
  const t = meanDiff / se;
  const pValue = tPValue(t, df, tail);
  const critical = tCriticalValue(alpha, df, tail);
  const reject =
    tail === "two"
      ? Math.abs(t) > critical
      : tail === "right"
        ? t > critical
        : t < critical;
  return { t, df, pValue, critical, reject, alpha, tail, se, meanDiff, extras };
}

export function pairedTTest(
  a: number[],
  b: number[],
  alpha: number,
  tail: Tail,
): TTestResult | { error: string } {
  if (a.length !== b.length)
    return { error: "Paired data must have the same length." };
  if (a.length < 2) return { error: "Need at least 2 paired observations." };
  const diffs = a.map((v, i) => v - b[i]);
  const s = summarize(diffs);
  const se = s.sd / Math.sqrt(s.n);
  const t = s.mean / se;
  const df = s.n - 1;
  const pValue = tPValue(t, df, tail);
  const critical = tCriticalValue(alpha, df, tail);
  const reject =
    tail === "two"
      ? Math.abs(t) > critical
      : tail === "right"
        ? t > critical
        : t < critical;
  return {
    t,
    df,
    pValue,
    critical,
    reject,
    alpha,
    tail,
    se,
    meanDiff: s.mean,
    extras: { sdDiff: s.sd },
  };
}

export function fmt(n: number, dp = 4): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e6)) return n.toExponential(3);
  return Number(n.toFixed(dp)).toString();
}

export function fmtP(p: number): string {
  if (!Number.isFinite(p)) return "—";
  if (p < 1e-4) return p.toExponential(3);
  return p.toFixed(4);
}
