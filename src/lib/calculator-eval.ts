import { create, all, type MathJsInstance } from "mathjs";

const math: MathJsInstance = create(all, {});

export type AngleMode = "Deg" | "Rad";

const FORWARD_TRIG = ["sin", "cos", "tan"] as const;
const INVERSE_TRIG = ["asin", "acos", "atan"] as const;

/**
 * Recursively walks the expression. When in Deg mode:
 * - Forward trig (sin/cos/tan): wrap the argument with mathjs `deg` unit so
 *   sin(30) is interpreted as 30 degrees.
 * - Inverse trig (asin/acos/atan): mathjs returns radians. Multiply the call
 *   by (180/pi) inline so the output is in degrees regardless of where the
 *   call appears in a larger expression (e.g. `2*asin(0.5)` → 60).
 *
 * Because the transform is done in the expression string itself, it works
 * for any nesting depth and position — top-level, inside arithmetic,
 * inside another function call.
 */
function wrapTrigForDeg(expr: string): string {
  let out = "";
  let i = 0;
  while (i < expr.length) {
    const prev = i > 0 ? expr[i - 1] : "";
    const isBoundary = !/[a-zA-Z_]/.test(prev);
    let matched = false;

    if (isBoundary) {
      // Try inverse trig first (longer names), so "asin" isn't mistaken for "sin".
      for (const fn of INVERSE_TRIG) {
        if (
          expr.slice(i, i + fn.length) === fn &&
          expr[i + fn.length] === "("
        ) {
          const { inner, end } = readParenArg(expr, i + fn.length);
          const wrappedInner = wrapTrigForDeg(inner);
          out += `(${fn}(${wrappedInner}) * (180 / pi))`;
          i = end;
          matched = true;
          break;
        }
      }
      if (!matched) {
        for (const fn of FORWARD_TRIG) {
          if (
            expr.slice(i, i + fn.length) === fn &&
            expr[i + fn.length] === "("
          ) {
            const { inner, end } = readParenArg(expr, i + fn.length);
            const wrappedInner = wrapTrigForDeg(inner);
            out += `${fn}((${wrappedInner}) deg)`;
            i = end;
            matched = true;
            break;
          }
        }
      }
    }

    if (!matched) {
      out += expr[i];
      i++;
    }
  }
  return out;
}

/**
 * Given a position pointing at `(`, returns the inner text (without parens)
 * and the index just past the matching `)`.
 */
function readParenArg(expr: string, openParenIdx: number): { inner: string; end: number } {
  let depth = 1;
  let j = openParenIdx + 1;
  while (j < expr.length && depth > 0) {
    if (expr[j] === "(") depth++;
    else if (expr[j] === ")") depth--;
    if (depth === 0) break;
    j++;
  }
  return { inner: expr.slice(openParenIdx + 1, j), end: j + 1 };
}

function normalize(expr: string, mode: AngleMode): string {
  let s = expr;
  if (mode === "Deg") {
    s = wrapTrigForDeg(s);
  }
  return s
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "pi");
}

export function evaluateExpression(
  rawExpr: string,
  mode: AngleMode,
  scope: Record<string, number> = {},
): number {
  if (!rawExpr.trim()) throw new Error("Empty expression");
  const normalized = normalize(rawExpr, mode);
  const value = math.evaluate(normalized, scope);

  let numeric: number;
  if (typeof value === "number") numeric = value;
  else if (value && typeof value.toNumber === "function") numeric = value.toNumber();
  else numeric = Number(value);

  if (!Number.isFinite(numeric)) throw new Error("Non-finite result");
  return numeric;
}

/** Pretty-format numbers: keep ints exact, floats up to 10 significant digits. */
export function formatResult(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toString();
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) return n.toExponential(6);
  return parseFloat(n.toPrecision(10)).toString();
}
