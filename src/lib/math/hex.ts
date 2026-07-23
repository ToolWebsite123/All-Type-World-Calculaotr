// Arbitrary-precision hexadecimal arithmetic + conversions with step working.

export type HexOp = "+" | "-" | "*" | "/";

const HEX_RE = /^-?[0-9a-fA-F]+$/;
const DEC_RE = /^-?\d+$/;

export function isHex(s: string): boolean {
  return HEX_RE.test(s.trim());
}
export function isDecimal(s: string): boolean {
  return DEC_RE.test(s.trim());
}

export function hexToBigInt(raw: string): bigint {
  const s = raw.trim();
  if (!isHex(s)) throw new Error(`"${raw}" is not a valid hexadecimal number (digits 0–9 and A–F only)`);
  const neg = s.startsWith("-");
  const digits = (neg ? s.slice(1) : s).toLowerCase();
  let n = 0n;
  for (const ch of digits) {
    const d = ch >= "a" ? BigInt(ch.charCodeAt(0) - 87) : BigInt(ch);
    n = n * 16n + d;
  }
  return neg ? -n : n;
}

export function bigIntToHex(n: bigint): string {
  if (n === 0n) return "0";
  const neg = n < 0n;
  let x = neg ? -n : n;
  const chars = "0123456789ABCDEF";
  let out = "";
  while (x > 0n) {
    out = chars[Number(x % 16n)] + out;
    x /= 16n;
  }
  return neg ? "-" + out : out;
}

export function decimalToBigInt(raw: string): bigint {
  const s = raw.trim();
  if (!isDecimal(s)) throw new Error(`"${raw}" is not a whole decimal number`);
  return BigInt(s);
}

export interface HexOpResult {
  hex: string;
  decimal: string;
  quotientRemainder?: { q: string; r: string; qDec: string; rDec: string };
}

export function hexOperate(a: string, op: HexOp, b: string): HexOpResult {
  const x = hexToBigInt(a);
  const y = hexToBigInt(b);
  switch (op) {
    case "+":
      return { hex: bigIntToHex(x + y), decimal: (x + y).toString() };
    case "-":
      return { hex: bigIntToHex(x - y), decimal: (x - y).toString() };
    case "*":
      return { hex: bigIntToHex(x * y), decimal: (x * y).toString() };
    case "/": {
      if (y === 0n) throw new Error("Cannot divide by zero");
      const q = x / y;
      const r = x - q * y;
      return {
        hex: bigIntToHex(q),
        decimal: q.toString(),
        quotientRemainder: {
          q: bigIntToHex(q),
          r: bigIntToHex(r),
          qDec: q.toString(),
          rDec: r.toString(),
        },
      };
    }
  }
}

/** Place-value breakdown for hex → decimal. */
export function hexToDecimalSteps(hex: string): { terms: string[]; sum: string } {
  const s = hex.trim().replace(/^-/, "").toUpperCase();
  const neg = hex.trim().startsWith("-");
  const chars = "0123456789ABCDEF";
  const terms: string[] = [];
  let total = 0n;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const d = chars.indexOf(ch);
    const power = BigInt(s.length - 1 - i);
    const place = 16n ** power;
    const contrib = BigInt(d) * place;
    terms.push(`${ch} (${d}) × 16^${power.toString()} = ${d} × ${place.toString()} = ${contrib.toString()}`);
    total += contrib;
  }
  return { terms, sum: (neg ? -total : total).toString() };
}

/** Repeated division by 16 for decimal → hex. */
export function decimalToHexSteps(decimal: string):
  { rows: Array<{ n: string; q: string; r: string; hexDigit: string }>; hex: string } {
  const s = decimal.trim();
  if (!DEC_RE.test(s)) throw new Error(`"${decimal}" is not a whole decimal number`);
  const neg = s.startsWith("-");
  let n = BigInt(neg ? s.slice(1) : s);
  if (n === 0n) return { rows: [{ n: "0", q: "0", r: "0", hexDigit: "0" }], hex: "0" };
  const chars = "0123456789ABCDEF";
  const rows: Array<{ n: string; q: string; r: string; hexDigit: string }> = [];
  let digits = "";
  while (n > 0n) {
    const q = n / 16n;
    const r = n % 16n;
    const hd = chars[Number(r)];
    rows.push({ n: n.toString(), q: q.toString(), r: r.toString(), hexDigit: hd });
    digits = hd + digits;
    n = q;
  }
  return { rows, hex: neg ? "-" + digits : digits };
}

/** Column-by-column addition working in base 16. */
export function hexAddSteps(a: string, b: string):
  { columns: Array<{ pos: number; da: string; db: string; carryIn: number; sumDec: number; digit: string; carryOut: number }>; result: string } {
  const A = a.replace(/^-/, "").toUpperCase();
  const B = b.replace(/^-/, "").toUpperCase();
  const len = Math.max(A.length, B.length);
  const Ap = A.padStart(len, "0");
  const Bp = B.padStart(len, "0");
  const chars = "0123456789ABCDEF";
  const columns = [];
  let carry = 0;
  let result = "";
  for (let i = len - 1; i >= 0; i--) {
    const da = Ap[i];
    const db = Bp[i];
    const va = chars.indexOf(da);
    const vb = chars.indexOf(db);
    const sum = va + vb + carry;
    const digit = chars[sum % 16];
    const nextCarry = Math.floor(sum / 16);
    columns.unshift({
      pos: len - 1 - i,
      da,
      db,
      carryIn: carry,
      sumDec: sum,
      digit,
      carryOut: nextCarry,
    });
    result = digit + result;
    carry = nextCarry;
  }
  if (carry > 0) result = chars[carry] + result;
  return { columns, result };
}

/** Column-by-column subtraction working in base 16 (assumes a >= b, both non-negative). */
export function hexSubSteps(a: string, b: string):
  { columns: Array<{ pos: number; da: string; db: string; borrowed: boolean; effA: number; digit: string }>; result: string } {
  const A = a.replace(/^-/, "").toUpperCase();
  const B = b.replace(/^-/, "").toUpperCase();
  const len = Math.max(A.length, B.length);
  const chars = "0123456789ABCDEF";
  const Ap = A.padStart(len, "0").split("").map((c) => chars.indexOf(c));
  const Bp = B.padStart(len, "0").split("").map((c) => chars.indexOf(c));
  const columns = [];
  for (let i = len - 1; i >= 0; i--) {
    let borrowed = false;
    if (Ap[i] < Bp[i]) {
      // borrow from next non-zero column to the left
      let j = i - 1;
      while (j >= 0 && Ap[j] === 0) {
        Ap[j] = 15;
        j--;
      }
      if (j >= 0) Ap[j] -= 1;
      Ap[i] += 16;
      borrowed = true;
    }
    const diff = Ap[i] - Bp[i];
    columns.unshift({
      pos: len - 1 - i,
      da: chars[Ap[i]],
      db: chars[Bp[i]],
      borrowed,
      effA: Ap[i],
      digit: chars[diff],
    });
  }
  const raw = columns.map((c) => c.digit).join("").replace(/^0+/, "") || "0";
  return { columns, result: raw };
}
