export interface ExponentResult {
  value: number;
  note?: string;
}

export function power(base: number, exponent: number): ExponentResult {
  // Negative base with a non-integer exponent produces a complex result in the
  // real numbers. Detect and report cleanly instead of returning NaN silently.
  if (base < 0 && !Number.isInteger(exponent)) {
    return {
      value: NaN,
      note: "A negative base raised to a non-integer exponent has no real value.",
    };
  }
  if (base === 0 && exponent < 0) {
    return {
      value: NaN,
      note: "0 raised to a negative exponent is undefined (division by zero).",
    };
  }
  const value = Math.pow(base, exponent);
  if (!Number.isFinite(value)) {
    return { value: NaN, note: "Result is out of range." };
  }
  return { value };
}
