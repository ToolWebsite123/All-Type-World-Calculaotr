// Arbitrary-precision fraction utilities using BigInt.

export type BigOp = "+" | "-" | "*" | "/";

export interface BigFraction {
  n: bigint; // numerator, sign here
  d: bigint; // denominator, always > 0
}

function bigAbs(x: bigint): bigint {
  return x < 0n ? -x : x;
}

export function bigGcd(a: bigint, b: bigint): bigint {
  a = bigAbs(a);
  b = bigAbs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1n;
}

export function bigSimplify({ n, d }: BigFraction): BigFraction {
  if (d === 0n) throw new Error("Denominator cannot be zero");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = bigGcd(n, d);
  return { n: n / g, d: d / g };
}

export function parseBigInt(raw: string): bigint {
  const s = raw.trim();
  if (!/^-?\d+$/.test(s)) throw new Error(`"${raw}" is not a whole number`);
  return BigInt(s);
}

export function bigOperate(a: BigFraction, op: BigOp, b: BigFraction): BigFraction {
  switch (op) {
    case "+":
      return bigSimplify({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
    case "-":
      return bigSimplify({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
    case "*":
      return bigSimplify({ n: a.n * b.n, d: a.d * b.d });
    case "/":
      if (b.n === 0n) throw new Error("Cannot divide by zero");
      return bigSimplify({ n: a.n * b.d, d: a.d * b.n });
  }
}

export function bigToString(f: BigFraction): string {
  return f.d === 1n ? f.n.toString() : `${f.n.toString()}/${f.d.toString()}`;
}

/** Long-division decimal string with configurable max digits. */
export function bigToDecimalString(f: BigFraction, maxDigits = 20): string {
  const sign = f.n < 0n ? "-" : "";
  let n = bigAbs(f.n);
  const d = f.d;
  const whole = (n / d).toString();
  let rem = n % d;
  if (rem === 0n) return sign + whole;
  let out = sign + whole + ".";
  for (let i = 0; i < maxDigits && rem !== 0n; i++) {
    rem *= 10n;
    out += (rem / d).toString();
    rem = rem % d;
  }
  if (rem !== 0n) out += "…";
  return out;
}

/** Convert a finite decimal string like "-1.375" or "0.5" to a simplified BigFraction. */
export function decimalStringToFraction(raw: string): BigFraction {
  const s = raw.trim();
  const m = s.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!m) throw new Error(`"${raw}" is not a valid decimal`);
  const sign = m[1] === "-" ? -1n : 1n;
  const intPart = m[2];
  const fracPart = m[3] ?? "";
  const digits = intPart + fracPart;
  const n = sign * BigInt(digits);
  const d = 10n ** BigInt(fracPart.length);
  return bigSimplify({ n, d });
}
