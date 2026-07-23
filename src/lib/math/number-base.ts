// 4-way base conversion: binary (2) ↔ octal (8) ↔ decimal (10) ↔ hex (16).
// BigInt-backed for arbitrary size, supports negatives.

export type Base = 2 | 8 | 10 | 16;

const RADIX_NAME: Record<Base, string> = {
  2: "binary",
  8: "octal",
  10: "decimal",
  16: "hexadecimal",
};

export function baseName(b: Base): string {
  return RADIX_NAME[b];
}

const VALID: Record<Base, RegExp> = {
  2: /^-?[01]+$/,
  8: /^-?[0-7]+$/,
  10: /^-?\d+$/,
  16: /^-?[0-9a-fA-F]+$/,
};

export function parseFromBase(raw: string, base: Base): bigint {
  const s = raw.trim();
  if (!VALID[base].test(s)) {
    throw new Error(`"${raw}" is not a valid ${RADIX_NAME[base]} number`);
  }
  const neg = s.startsWith("-");
  const digits = (neg ? s.slice(1) : s).toLowerCase();
  const b = BigInt(base);
  let n = 0n;
  for (const ch of digits) {
    const d = ch >= "a" ? BigInt(ch.charCodeAt(0) - 87) : BigInt(ch);
    n = n * b + d;
  }
  return neg ? -n : n;
}

export function toBase(n: bigint, base: Base): string {
  if (n === 0n) return "0";
  const neg = n < 0n;
  let x = neg ? -n : n;
  const b = BigInt(base);
  const chars = "0123456789abcdef";
  let out = "";
  while (x > 0n) {
    const d = Number(x % b);
    out = chars[d] + out;
    x /= b;
  }
  if (base === 16) out = out.toUpperCase();
  return neg ? "-" + out : out;
}

export function convertAll(raw: string, from: Base): Record<Base, string> {
  const n = parseFromBase(raw, from);
  return {
    2: toBase(n, 2),
    8: toBase(n, 8),
    10: toBase(n, 10),
    16: toBase(n, 16),
  };
}
