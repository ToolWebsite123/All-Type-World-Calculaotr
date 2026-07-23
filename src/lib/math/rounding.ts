export type RoundMode = "decimals" | "sigfigs";

export type RoundingMethod =
  | "half-up"
  | "half-down"
  | "ceil"
  | "floor"
  | "half-even"
  | "half-odd"
  | "half-away"
  | "half-toward";

export const ROUNDING_METHOD_LABELS: Record<RoundingMethod, string> = {
  "half-up": "Round half up",
  "half-down": "Round half down",
  "ceil": "Round up (ceiling)",
  "floor": "Round down (floor)",
  "half-even": "Round half to even (banker's)",
  "half-odd": "Round half to odd",
  "half-away": "Round half away from zero",
  "half-toward": "Round half towards zero",
};

export interface RoundResult {
  value: number;
  rule: string;
}

/**
 * Round an integer-valued number `n` (which represents x * 10^places) to an
 * integer using the specified method. This isolates the sign / tie-break
 * behaviour so every method uses one code path per rule.
 */
function roundInteger(n: number, method: RoundingMethod): number {
  if (Number.isInteger(n)) return n;
  const floor = Math.floor(n);
  const ceil = Math.ceil(n);
  const frac = n - floor; // in (0, 1)

  // Non-tie cases: methods that ignore tie behaviour still need a base rule.
  if (frac !== 0.5) {
    switch (method) {
      case "ceil":
        return ceil;
      case "floor":
        return floor;
      // half-* methods use standard nearest for non-ties
      default:
        return frac < 0.5 ? floor : ceil;
    }
  }

  // Tie case (frac === 0.5)
  switch (method) {
    case "half-up":
      return ceil; // toward +∞
    case "half-down":
      return floor; // toward −∞
    case "ceil":
      return ceil;
    case "floor":
      return floor;
    case "half-away":
      return n >= 0 ? ceil : floor;
    case "half-toward":
      return n >= 0 ? floor : ceil;
    case "half-even":
      return floor % 2 === 0 ? floor : ceil;
    case "half-odd":
      return floor % 2 !== 0 ? floor : ceil;
  }
}

/**
 * Round `x` to `places` decimal places using the chosen method.
 * `places` may be negative (e.g. -1 = tens, -2 = hundreds).
 */
export function roundToPlaces(
  x: number,
  places: number,
  method: RoundingMethod = "half-up",
): RoundResult {
  if (!Number.isFinite(x)) throw new Error("Enter a valid number");
  if (!Number.isInteger(places) || places < -20 || places > 20) {
    throw new Error("Precision must be an integer between -20 and 20");
  }
  const factor = Math.pow(10, places);
  // Use string-based scaling to reduce floating-point tie misdetection when
  // possible. Fall back to numeric multiplication.
  const scaled = x * factor;
  // Reduce tiny FP noise around .5 (e.g. 1.005 * 100 = 100.49999...).
  const cleaned = Math.round(scaled * 1e12) / 1e12;
  const rounded = roundInteger(cleaned, method);
  const value = rounded / factor;
  return {
    value,
    rule: `${ROUNDING_METHOD_LABELS[method]} — rounded to ${describePlaces(places)}.`,
  };
}

export function describePlaces(places: number): string {
  if (places === 0) return "the nearest whole number";
  if (places > 0) {
    const names = ["ones", "tenths", "hundredths", "thousandths", "ten-thousandths", "hundred-thousandths", "millionths"];
    return `${places} decimal place${places === 1 ? "" : "s"}${names[places] ? ` (${names[places]})` : ""}`;
  }
  const negNames: Record<number, string> = { [-1]: "tens", [-2]: "hundreds", [-3]: "thousands", [-4]: "ten thousands", [-5]: "hundred thousands", [-6]: "millions" };
  return `the nearest ${negNames[places] ?? `10^${-places}`}`;
}

/**
 * Round `x` to the nearest 1/denominator, returning both the decimal and
 * a mixed-number representation.
 */
export function roundToFraction(x: number, denominator: number, method: RoundingMethod = "half-up") {
  if (!Number.isFinite(x)) throw new Error("Enter a valid number");
  if (!Number.isInteger(denominator) || denominator < 1 || denominator > 1000) {
    throw new Error("Denominator must be an integer between 1 and 1000");
  }
  const scaled = x * denominator;
  const cleaned = Math.round(scaled * 1e12) / 1e12;
  const numerator = roundInteger(cleaned, method);
  const decimal = numerator / denominator;
  const sign = numerator < 0 ? -1 : 1;
  const absNum = Math.abs(numerator);
  const whole = Math.trunc(absNum / denominator);
  const remainder = absNum % denominator;
  // Simplify remainder / denominator
  const g = gcdInt(remainder, denominator);
  const simpNum = remainder / g;
  const simpDen = denominator / g;

  let mixed: string;
  if (remainder === 0) {
    mixed = `${sign < 0 ? "-" : ""}${whole}`;
  } else if (whole === 0) {
    mixed = `${sign < 0 ? "-" : ""}${simpNum}/${simpDen}`;
  } else {
    mixed = `${sign < 0 ? "-" : ""}${whole} ${simpNum}/${simpDen}`;
  }
  return { decimal, mixed, numerator, denominator };
}

function gcdInt(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

// Legacy helpers kept for backward compatibility with any other callers.
export function roundToDecimals(x: number, places: number): RoundResult {
  return roundToPlaces(x, places, "half-away");
}

export function roundToSigFigs(x: number, sig: number): RoundResult {
  if (!Number.isInteger(sig) || sig < 1 || sig > 20) {
    throw new Error("Significant figures must be a whole number between 1 and 20");
  }
  if (x === 0) return { value: 0, rule: `Zero rounded to ${sig} significant figure${sig === 1 ? "" : "s"} is 0.` };
  const magnitude = Math.floor(Math.log10(Math.abs(x)));
  const places = sig - 1 - magnitude;
  const r = roundToPlaces(x, places, "half-away");
  return { value: r.value, rule: `Rounded to ${sig} significant figure${sig === 1 ? "" : "s"} using round-half-away-from-zero.` };
}
