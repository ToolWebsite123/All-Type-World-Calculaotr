// Arbitrary-precision binary arithmetic using BigInt, plus base conversions
// and step-by-step working for the Binary Calculator page.

export type BinOp = "+" | "-" | "*" | "/";

export function isBinary(s: string): boolean {
  return /^-?[01]+$/.test(s.trim());
}

/** Parse a signed binary string like "1010" or "-1101" into a BigInt. */
export function binaryToBigInt(raw: string): bigint {
  const s = raw.trim();
  if (!isBinary(s)) throw new Error(`"${raw}" is not a valid binary number (only 0/1 allowed)`);
  const neg = s.startsWith("-");
  const digits = neg ? s.slice(1) : s;
  let n = 0n;
  for (const ch of digits) {
    n = n * 2n + (ch === "1" ? 1n : 0n);
  }
  return neg ? -n : n;
}

export function bigIntToBinary(n: bigint): string {
  if (n === 0n) return "0";
  const neg = n < 0n;
  let x = neg ? -n : n;
  let out = "";
  while (x > 0n) {
    out = (x % 2n).toString() + out;
    x /= 2n;
  }
  return neg ? "-" + out : out;
}

export interface BinaryOpResult {
  binary: string;
  decimal: string;
  quotientRemainder?: { q: string; r: string }; // for division
}

export function binaryOperate(a: string, op: BinOp, b: string): BinaryOpResult {
  const x = binaryToBigInt(a);
  const y = binaryToBigInt(b);
  switch (op) {
    case "+":
      return { binary: bigIntToBinary(x + y), decimal: (x + y).toString() };
    case "-":
      return { binary: bigIntToBinary(x - y), decimal: (x - y).toString() };
    case "*":
      return { binary: bigIntToBinary(x * y), decimal: (x * y).toString() };
    case "/": {
      if (y === 0n) throw new Error("Cannot divide by zero");
      const q = x / y;
      const r = x - q * y;
      return {
        binary: bigIntToBinary(q),
        decimal: q.toString(),
        quotientRemainder: { q: bigIntToBinary(q), r: bigIntToBinary(r) },
      };
    }
  }
}

/** Place-value breakdown steps for binary → decimal. */
export function binaryToDecimalSteps(binary: string): { terms: string[]; sum: string } {
  const s = binary.trim().replace(/^-/, "");
  const neg = binary.trim().startsWith("-");
  const terms: string[] = [];
  let total = 0n;
  for (let i = 0; i < s.length; i++) {
    const bit = s[i];
    const power = BigInt(s.length - 1 - i);
    const place = 2n ** power;
    if (bit === "1") {
      terms.push(`1 × 2^${power.toString()} = ${place.toString()}`);
      total += place;
    } else {
      terms.push(`0 × 2^${power.toString()} = 0`);
    }
  }
  return { terms, sum: (neg ? -total : total).toString() };
}

/** Repeated-division steps for decimal → binary (positive integers). */
export function decimalToBinarySteps(decimal: string): { rows: Array<{ n: string; q: string; r: string }>; binary: string } {
  const s = decimal.trim();
  if (!/^-?\d+$/.test(s)) throw new Error(`"${decimal}" is not a whole number`);
  const neg = s.startsWith("-");
  let n = BigInt(neg ? s.slice(1) : s);
  if (n === 0n) return { rows: [{ n: "0", q: "0", r: "0" }], binary: "0" };
  const rows: Array<{ n: string; q: string; r: string }> = [];
  let bits = "";
  while (n > 0n) {
    const q = n / 2n;
    const r = n % 2n;
    rows.push({ n: n.toString(), q: q.toString(), r: r.toString() });
    bits = r.toString() + bits;
    n = q;
  }
  return { rows, binary: neg ? "-" + bits : bits };
}
