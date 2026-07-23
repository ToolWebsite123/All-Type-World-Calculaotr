export interface RootResult {
  value: number;
  note?: string;
}

/** nth root of x. Handles negative x when n is an odd integer. */
export function nthRoot(x: number, n: number): RootResult {
  if (n === 0) return { value: NaN, note: "Root index cannot be zero." };
  if (x === 0) return { value: 0 };

  if (x < 0) {
    if (Number.isInteger(n) && n % 2 !== 0) {
      // Real negative root exists.
      return { value: -Math.pow(-x, 1 / n) };
    }
    return {
      value: NaN,
      note: "Even or non-integer roots of negative numbers are not real.",
    };
  }

  const value = Math.pow(x, 1 / n);
  if (!Number.isFinite(value)) return { value: NaN, note: "Result is out of range." };
  return { value };
}
