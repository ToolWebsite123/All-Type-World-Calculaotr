// Scientific notation: parse, normalize, arithmetic. Uses regular number math
// (double precision) — sufficient for typical scientific-notation use cases.

export interface SciNum {
  /** Coefficient (mantissa). */
  m: number;
  /** Base-10 exponent. */
  e: number;
}

/** Accept "1.23e4", "1.23 × 10^4", "1.23*10^4", "1.23 x 10^4", or plain "12300". */
export function parseSci(raw: string): SciNum {
  const s = raw.trim().replace(/\s+/g, "").replace(/×/g, "x");
  if (!s) throw new Error("Empty value");

  // 1.23x10^4  or  1.23*10^4
  const m1 = s.match(/^(-?\d+(?:\.\d+)?)[x*]10\^(-?\d+)$/i);
  if (m1) return normalize({ m: Number(m1[1]), e: Number(m1[2]) });

  // 1.23e4
  const m2 = s.match(/^(-?\d+(?:\.\d+)?)[eE](-?\d+)$/);
  if (m2) return normalize({ m: Number(m2[1]), e: Number(m2[2]) });

  // Plain number
  const n = Number(s);
  if (Number.isFinite(n)) return normalize(fromNumber(n));

  throw new Error(`"${raw}" is not a valid scientific-notation value`);
}

export function fromNumber(n: number): SciNum {
  if (n === 0) return { m: 0, e: 0 };
  const e = Math.floor(Math.log10(Math.abs(n)));
  const m = n / Math.pow(10, e);
  return { m, e };
}

export function normalize({ m, e }: SciNum): SciNum {
  if (m === 0 || !Number.isFinite(m)) return { m: 0, e: 0 };
  const shift = Math.floor(Math.log10(Math.abs(m)));
  return { m: m / Math.pow(10, shift), e: e + shift };
}

export function toNumber({ m, e }: SciNum): number {
  return m * Math.pow(10, e);
}

export function formatSci(n: SciNum, digits = 6): string {
  const nn = normalize(n);
  const coeff = parseFloat(nn.m.toPrecision(digits)).toString();
  return `${coeff} × 10^${nn.e}`;
}

export function addSci(a: SciNum, b: SciNum): SciNum {
  const maxE = Math.max(a.e, b.e);
  return normalize({
    m: a.m * Math.pow(10, a.e - maxE) + b.m * Math.pow(10, b.e - maxE),
    e: maxE,
  });
}

export function subSci(a: SciNum, b: SciNum): SciNum {
  return addSci(a, { m: -b.m, e: b.e });
}

export function mulSci(a: SciNum, b: SciNum): SciNum {
  return normalize({ m: a.m * b.m, e: a.e + b.e });
}

export function divSci(a: SciNum, b: SciNum): SciNum {
  if (b.m === 0) throw new Error("Cannot divide by zero");
  return normalize({ m: a.m / b.m, e: a.e - b.e });
}
