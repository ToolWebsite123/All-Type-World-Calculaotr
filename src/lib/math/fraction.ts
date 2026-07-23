import { gcd } from "./core";

export type FracOp = "+" | "-" | "*" | "/";

export interface Fraction {
  n: number; // numerator (sign lives here)
  d: number; // denominator (always positive)
}

/** Parse "3/4", "-3/4", "5", "1 2/3", "-1 2/3". */
export function parseFraction(raw: string): Fraction {
  const s = raw.trim();
  if (!s) throw new Error("Empty fraction");

  const mixed = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = parseInt(mixed[1], 10);
    const num = parseInt(mixed[2], 10);
    const den = parseInt(mixed[3], 10);
    if (den === 0) throw new Error("Denominator cannot be zero");
    const sign = whole < 0 ? -1 : 1;
    const n = sign * (Math.abs(whole) * den + num);
    return simplify({ n, d: den });
  }

  const simple = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (simple) {
    const n = parseInt(simple[1], 10);
    const d = parseInt(simple[2], 10);
    if (d === 0) throw new Error("Denominator cannot be zero");
    return simplify({ n, d });
  }

  const whole = s.match(/^-?\d+$/);
  if (whole) return { n: parseInt(s, 10), d: 1 };

  throw new Error(`Cannot parse "${raw}" as a fraction`);
}

export function simplify({ n, d }: Fraction): Fraction {
  if (d === 0) throw new Error("Denominator cannot be zero");
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

export function operate(a: Fraction, op: FracOp, b: Fraction): Fraction {
  switch (op) {
    case "+":
      return simplify({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
    case "-":
      return simplify({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
    case "*":
      return simplify({ n: a.n * b.n, d: a.d * b.d });
    case "/":
      if (b.n === 0) throw new Error("Cannot divide by zero");
      return simplify({ n: a.n * b.d, d: a.d * b.n });
  }
}

export function toMixedString(f: Fraction): string {
  const { n, d } = f;
  if (d === 1) return String(n);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const whole = Math.trunc(abs / d);
  const rem = abs % d;
  if (whole === 0) return `${sign}${abs}/${d}`;
  if (rem === 0) return `${sign}${whole}`;
  return `${sign}${whole} ${rem}/${d}`;
}

export function toSimpleString(f: Fraction): string {
  return f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
}

export function toDecimal(f: Fraction): number {
  return f.n / f.d;
}
