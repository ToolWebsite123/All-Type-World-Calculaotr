export interface PercentErrorResult {
  /** Signed percent error (observed − true) / |true| × 100. */
  signed: number;
  /** Absolute percent error |observed − true| / |true| × 100. */
  absolute: number;
  absoluteError: number;
  relativeError: number;
}

export function percentError(observed: number, trueValue: number): PercentErrorResult {
  if (!Number.isFinite(observed) || !Number.isFinite(trueValue)) {
    throw new Error("Enter valid numbers");
  }
  if (trueValue === 0) {
    throw new Error("True value cannot be zero (division by zero)");
  }
  const absoluteError = observed - trueValue;
  const relativeError = absoluteError / Math.abs(trueValue);
  return {
    signed: relativeError * 100,
    absolute: Math.abs(relativeError) * 100,
    absoluteError,
    relativeError,
  };
}
