export type QuadraticKind = "two-real" | "repeated" | "complex";

export interface QuadraticResult {
  kind: QuadraticKind;
  discriminant: number;
  /** Real roots (present for two-real and repeated). */
  roots: number[];
  /** Complex conjugate pair (present for complex). */
  complex?: { real: number; imag: number };
}

export function solveQuadratic(a: number, b: number, c: number): QuadraticResult {
  if (a === 0) throw new Error("Coefficient a cannot be zero (that would not be a quadratic)");
  const disc = b * b - 4 * a * c;
  if (disc > 0) {
    const sq = Math.sqrt(disc);
    return {
      kind: "two-real",
      discriminant: disc,
      roots: [(-b + sq) / (2 * a), (-b - sq) / (2 * a)],
    };
  }
  if (disc === 0) {
    return {
      kind: "repeated",
      discriminant: 0,
      roots: [-b / (2 * a)],
    };
  }
  // disc < 0 → complex conjugate roots: (-b ± i·√|disc|) / (2a)
  const real = -b / (2 * a);
  const imag = Math.sqrt(-disc) / (2 * a);
  return {
    kind: "complex",
    discriminant: disc,
    roots: [],
    complex: { real, imag: Math.abs(imag) },
  };
}
