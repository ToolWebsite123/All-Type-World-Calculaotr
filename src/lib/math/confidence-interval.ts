// Confidence Interval math — Z (normal) and t (Student) critical values.

// Inverse standard normal CDF (Acklam's approximation) — used for Z critical values.
// Accurate to ~1e-9.
export function invNormal(p: number): number {
  if (p <= 0 || p >= 1) return NaN;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const pl = 0.02425;
  const ph = 1 - pl;
  let q: number, r: number;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= ph) {
    q = p - 0.5;
    r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/** Two-tailed Z critical value for a given confidence level (as fraction, e.g. 0.95). */
export function zCritical(confLevel: number): number {
  const alpha = 1 - confLevel;
  return invNormal(1 - alpha / 2);
}

/* ---------- Student t critical values ----------
 *
 * Standard two-tailed t-table columns (confidence levels) with df 1..30 and
 * larger df anchors. For confidence levels between columns we interpolate
 * linearly on the CL axis (safe within the covered range). For df between
 * table rows we linearly interpolate on 1/df, which follows the t-distribution
 * asymptote much more accurately than raw df interpolation. For df ≥ 1000 we
 * fall back to the Z critical value (the two are indistinguishable there).
 */

const T_CLS = [0.8, 0.9, 0.95, 0.98, 0.99, 0.995, 0.998, 0.999] as const;
const T_DFS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 40, 50, 60, 80, 100, 120, 200, 1000,
] as const;

// Values from standard Student's t two-tailed tables.
// Rows in order of T_DFS; columns in order of T_CLS.
// prettier-ignore
const T_TABLE: number[][] = [
  [3.078, 6.314, 12.706, 31.821, 63.657, 127.321, 318.309, 636.619], // df 1
  [1.886, 2.920, 4.303, 6.965, 9.925, 14.089, 22.327, 31.599],       // 2
  [1.638, 2.353, 3.182, 4.541, 5.841, 7.453, 10.215, 12.924],        // 3
  [1.533, 2.132, 2.776, 3.747, 4.604, 5.598, 7.173, 8.610],          // 4
  [1.476, 2.015, 2.571, 3.365, 4.032, 4.773, 5.893, 6.869],          // 5
  [1.440, 1.943, 2.447, 3.143, 3.707, 4.317, 5.208, 5.959],          // 6
  [1.415, 1.895, 2.365, 2.998, 3.499, 4.029, 4.785, 5.408],          // 7
  [1.397, 1.860, 2.306, 2.896, 3.355, 3.833, 4.501, 5.041],          // 8
  [1.383, 1.833, 2.262, 2.821, 3.250, 3.690, 4.297, 4.781],          // 9
  [1.372, 1.812, 2.228, 2.764, 3.169, 3.581, 4.144, 4.587],          // 10
  [1.363, 1.796, 2.201, 2.718, 3.106, 3.497, 4.025, 4.437],          // 11
  [1.356, 1.782, 2.179, 2.681, 3.055, 3.428, 3.930, 4.318],          // 12
  [1.350, 1.771, 2.160, 2.650, 3.012, 3.372, 3.852, 4.221],          // 13
  [1.345, 1.761, 2.145, 2.624, 2.977, 3.326, 3.787, 4.140],          // 14
  [1.341, 1.753, 2.131, 2.602, 2.947, 3.286, 3.733, 4.073],          // 15
  [1.337, 1.746, 2.120, 2.583, 2.921, 3.252, 3.686, 4.015],          // 16
  [1.333, 1.740, 2.110, 2.567, 2.898, 3.222, 3.646, 3.965],          // 17
  [1.330, 1.734, 2.101, 2.552, 2.878, 3.197, 3.610, 3.922],          // 18
  [1.328, 1.729, 2.093, 2.539, 2.861, 3.174, 3.579, 3.883],          // 19
  [1.325, 1.725, 2.086, 2.528, 2.845, 3.153, 3.552, 3.850],          // 20
  [1.323, 1.721, 2.080, 2.518, 2.831, 3.135, 3.527, 3.819],          // 21
  [1.321, 1.717, 2.074, 2.508, 2.819, 3.119, 3.505, 3.792],          // 22
  [1.319, 1.714, 2.069, 2.500, 2.807, 3.104, 3.485, 3.768],          // 23
  [1.318, 1.711, 2.064, 2.492, 2.797, 3.091, 3.467, 3.745],          // 24
  [1.316, 1.708, 2.060, 2.485, 2.787, 3.078, 3.450, 3.725],          // 25
  [1.315, 1.706, 2.056, 2.479, 2.779, 3.067, 3.435, 3.707],          // 26
  [1.314, 1.703, 2.052, 2.473, 2.771, 3.057, 3.421, 3.690],          // 27
  [1.313, 1.701, 2.048, 2.467, 2.763, 3.047, 3.408, 3.674],          // 28
  [1.311, 1.699, 2.045, 2.462, 2.756, 3.038, 3.396, 3.659],          // 29
  [1.310, 1.697, 2.042, 2.457, 2.750, 3.030, 3.385, 3.646],          // 30
  [1.303, 1.684, 2.021, 2.423, 2.704, 2.971, 3.307, 3.551],          // 40
  [1.299, 1.676, 2.009, 2.403, 2.678, 2.937, 3.261, 3.496],          // 50
  [1.296, 1.671, 2.000, 2.390, 2.660, 2.915, 3.232, 3.460],          // 60
  [1.292, 1.664, 1.990, 2.374, 2.639, 2.887, 3.195, 3.416],          // 80
  [1.290, 1.660, 1.984, 2.364, 2.626, 2.871, 3.174, 3.390],          // 100
  [1.289, 1.658, 1.980, 2.358, 2.617, 2.860, 3.160, 3.373],          // 120
  [1.286, 1.653, 1.972, 2.345, 2.601, 2.838, 3.131, 3.340],          // 200
  [1.282, 1.646, 1.962, 2.330, 2.581, 2.813, 3.098, 3.300],          // 1000
];

function interpAtDf(row: number[], cl: number): number {
  if (cl <= T_CLS[0]) {
    // Extend downward using z ratio — but clamp to smallest column.
    return row[0] * (zCritical(cl) / zCritical(T_CLS[0]));
  }
  if (cl >= T_CLS[T_CLS.length - 1]) {
    return row[row.length - 1] *
      (zCritical(cl) / zCritical(T_CLS[T_CLS.length - 1]));
  }
  for (let i = 0; i < T_CLS.length - 1; i++) {
    if (cl >= T_CLS[i] && cl <= T_CLS[i + 1]) {
      const t = (cl - T_CLS[i]) / (T_CLS[i + 1] - T_CLS[i]);
      return row[i] * (1 - t) + row[i + 1] * t;
    }
  }
  return row[row.length - 1];
}

/** Two-tailed t critical value for the given confidence level (fraction) and df. */
export function tCritical(confLevel: number, df: number): number {
  if (!Number.isFinite(df) || df < 1) return NaN;
  if (df >= 1000) return zCritical(confLevel);
  // Find bracketing df rows.
  let lo = 0;
  let hi = T_DFS.length - 1;
  for (let i = 0; i < T_DFS.length - 1; i++) {
    if (df >= T_DFS[i] && df <= T_DFS[i + 1]) {
      lo = i;
      hi = i + 1;
      break;
    }
  }
  const vLo = interpAtDf(T_TABLE[lo], confLevel);
  const vHi = interpAtDf(T_TABLE[hi], confLevel);
  if (T_DFS[lo] === df) return vLo;
  if (T_DFS[hi] === df) return vHi;
  // Interpolate on 1/df — closer to the true asymptotic behaviour.
  const x = 1 / df;
  const xLo = 1 / T_DFS[lo];
  const xHi = 1 / T_DFS[hi];
  const w = (x - xLo) / (xHi - xLo);
  return vLo * (1 - w) + vHi * w;
}

export type CIMethod = "z" | "t";

export interface CIResult {
  method: CIMethod;
  critical: number; // the Z or t critical value used
  df: number | null;
  se: number; // standard error = sd / sqrt(n)
  moe: number; // margin of error
  lower: number;
  upper: number;
  moePct: number; // moe as % of |mean|, NaN when mean==0
}

export function computeCI(
  mean: number,
  sd: number,
  n: number,
  confLevel: number,
  methodOverride?: CIMethod,
): CIResult {
  const method: CIMethod = methodOverride ?? (n >= 30 ? "z" : "t");
  const df = method === "t" ? n - 1 : null;
  const critical =
    method === "z" ? zCritical(confLevel) : tCritical(confLevel, n - 1);
  const se = sd / Math.sqrt(n);
  const moe = critical * se;
  return {
    method,
    critical,
    df,
    se,
    moe,
    lower: mean - moe,
    upper: mean + moe,
    moePct: mean === 0 ? NaN : (moe / Math.abs(mean)) * 100,
  };
}

export function fmt(n: number, dp = 3): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e10)) return n.toExponential(3);
  return Number(n.toFixed(dp)).toString();
}
