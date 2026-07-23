// Shared helpers for Core Math calculators.

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export function lcm(a: number, b: number): number {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  if (a === 0 || b === 0) return 0;
  return (a / gcd(a, b)) * b;
}

export function gcdMany(nums: number[]): number {
  return nums.reduce((acc, n) => gcd(acc, n), Math.abs(Math.trunc(nums[0] ?? 0)));
}

export function lcmMany(nums: number[]): number {
  return nums.reduce((acc, n) => lcm(acc, n), Math.abs(Math.trunc(nums[0] ?? 0)));
}

export function parseIntList(input: string): number[] {
  return input
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = Number(s);
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        throw new Error(`"${s}" is not a whole number`);
      }
      return n;
    });
}

/** Return prime factorization as a map of prime -> exponent. */
export function primeFactorize(n: number): Map<number, number> {
  n = Math.abs(Math.trunc(n));
  const out = new Map<number, number>();
  if (n < 2) return out;
  let x = n;
  for (let p = 2; p * p <= x; p++) {
    while (x % p === 0) {
      out.set(p, (out.get(p) ?? 0) + 1);
      x = x / p;
    }
  }
  if (x > 1) out.set(x, (out.get(x) ?? 0) + 1);
  return out;
}

/** Format a factorization map as "2 × 3 × 3 × 5" (expanded). */
export function formatFactorsExpanded(f: Map<number, number>): string {
  const parts: number[] = [];
  for (const [p, e] of f) for (let i = 0; i < e; i++) parts.push(p);
  return parts.length ? parts.join(" × ") : "1";
}

/** Format a factorization map as "2² × 3 × 5". */
export function formatFactorsPowers(f: Map<number, number>): string {
  const sup = (n: number) =>
    String(n)
      .split("")
      .map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)])
      .join("");
  const parts: string[] = [];
  for (const [p, e] of [...f.entries()].sort((a, b) => a[0] - b[0])) {
    parts.push(e === 1 ? String(p) : `${p}${sup(e)}`);
  }
  return parts.length ? parts.join(" × ") : "1";
}
