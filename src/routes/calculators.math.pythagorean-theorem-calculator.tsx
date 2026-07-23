import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { ResultActions } from "@/components/ResultActions";
import { ReferenceTable } from "@/components/ReferenceTable";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  FormulaWithLegend,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  type GuideCardItem,
} from "@/components/MathCalcPage";

import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

/** Centered display-math line used inside solution steps. */
function MathLine({ children }: { children: ReactNode }) {
  return (
    <div className="my-1 flex items-center justify-center text-center font-serif text-[15px] italic text-foreground">
      <span className="inline-flex items-center gap-1">{children}</span>
    </div>
  );
}
function MathNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 mb-1 text-sm not-italic text-muted-foreground">
      {children}
    </div>
  );
}

/* ---------- Diagrams for the case-by-case guide ---------- */
function RightTriangleDiagram({
  a,
  b,
  c: _c,
  aLabel = "a",
  bLabel = "b",
  cLabel = "c",
  unknown,
}: {
  a: number;
  b: number;
  c: number;
  aLabel?: string;
  bLabel?: string;
  cLabel?: string;
  unknown?: "a" | "b" | "c";
}) {
  const W = 320;
  const H = 220;
  const pad = 34;
  const s = Math.min((W - 2 * pad) / b, (H - 2 * pad) / a);
  const bx = b * s;
  const ay = a * s;
  const x0 = pad;
  const y0 = H - pad;
  const x1 = x0 + bx;
  const y1 = y0 - ay;
  const stroke = "currentColor";
  const dim = "var(--muted-foreground)";
  const accent = "var(--primary)";
  const legColor = (which: "a" | "b" | "c") =>
    unknown === which ? accent : stroke;
  return (
    <div className="flex items-center justify-center rounded-xl border border-border/60 bg-secondary/20 p-3 text-foreground">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="right triangle diagram"
        className="w-full max-w-[320px] h-auto"
      >
        {/* triangle fill */}
        <polygon
          points={`${x0},${y0} ${x1},${y0} ${x0},${y1}`}
          style={{ fill: accent, opacity: 0.08 }}
        />
        {/* right-angle square */}
        <rect x={x0} y={y0 - 12} width={12} height={12} fill="none" style={{ stroke: dim }} strokeWidth={1.5} />
        {/* triangle sides */}
        <line x1={x0} y1={y0} x2={x1} y2={y0} style={{ stroke: legColor("b") }} strokeWidth={3} strokeLinecap="round" />
        <line x1={x0} y1={y0} x2={x0} y2={y1} style={{ stroke: legColor("a") }} strokeWidth={3} strokeLinecap="round" />
        <line x1={x0} y1={y1} x2={x1} y2={y0} style={{ stroke: legColor("c") }} strokeWidth={3} strokeLinecap="round" />
        {/* labels */}
        <text x={x0 - 12} y={(y0 + y1) / 2} style={{ fill: legColor("a") }} fontSize="16" fontWeight="600" textAnchor="end" dominantBaseline="middle" fontStyle="italic">{aLabel}</text>
        <text x={(x0 + x1) / 2} y={y0 + 22} style={{ fill: legColor("b") }} fontSize="16" fontWeight="600" textAnchor="middle" fontStyle="italic">{bLabel}</text>
        <text x={(x0 + x1) / 2 + 10} y={(y0 + y1) / 2 - 8} style={{ fill: legColor("c") }} fontSize="16" fontWeight="600" textAnchor="start" fontStyle="italic">{cLabel}</text>
      </svg>
    </div>
  );
}


function BoxDiagonalDiagram({ l, w, h }: { l: number; w: number; h: number }) {
  const W = 320;
  const H = 220;
  const pad = 36;
  const s = Math.min((W - 2 * pad) / (l + w * 0.5), (H - 2 * pad) / (h + w * 0.5));
  const lx = l * s;
  const hy = h * s;
  const dx = w * 0.5 * s;
  const dy = w * 0.5 * s;
  const x0 = pad;
  const y0 = H - pad;
  const stroke = "currentColor";
  const dim = "var(--muted-foreground)";
  const accent = "var(--primary)";
  const A = [x0, y0];
  const B = [x0 + lx, y0];
  const C = [x0 + lx, y0 - hy];
  const D = [x0, y0 - hy];
  const A2 = [A[0] + dx, A[1] - dy];
  const B2 = [B[0] + dx, B[1] - dy];
  const C2 = [C[0] + dx, C[1] - dy];
  const D2 = [D[0] + dx, D[1] - dy];
  return (
    <div className="flex items-center justify-center rounded-xl border border-border/60 bg-secondary/20 p-3 text-foreground">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="box space diagonal diagram"
        className="w-full max-w-[320px] h-auto"
      >
        {/* back face + hidden edges */}
        <polygon points={`${A2[0]},${A2[1]} ${B2[0]},${B2[1]} ${C2[0]},${C2[1]} ${D2[0]},${D2[1]}`} fill="none" style={{ stroke: dim }} strokeWidth={1.5} strokeDasharray="4 3" />
        <line x1={A[0]} y1={A[1]} x2={A2[0]} y2={A2[1]} style={{ stroke: dim }} strokeWidth={1.5} strokeDasharray="4 3" />
        {/* box edges */}
        <line x1={B[0]} y1={B[1]} x2={B2[0]} y2={B2[1]} style={{ stroke: stroke }} strokeWidth={2} />
        <line x1={C[0]} y1={C[1]} x2={C2[0]} y2={C2[1]} style={{ stroke: stroke }} strokeWidth={2} />
        <line x1={D[0]} y1={D[1]} x2={D2[0]} y2={D2[1]} style={{ stroke: stroke }} strokeWidth={2} />
        <polygon points={`${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]} ${D[0]},${D[1]}`} fill="none" style={{ stroke: stroke }} strokeWidth={2} />
        {/* space diagonal */}
        <line x1={A[0]} y1={A[1]} x2={C2[0]} y2={C2[1]} style={{ stroke: accent }} strokeWidth={3} strokeLinecap="round" />
        {/* labels */}
        <text x={(A[0] + B[0]) / 2} y={A[1] + 18} style={{ fill: stroke }} fontSize="14" fontWeight="600" textAnchor="middle" fontStyle="italic">l</text>
        <text x={B[0] + 8} y={(B[1] + C[1]) / 2} style={{ fill: stroke }} fontSize="14" fontWeight="600" fontStyle="italic">h</text>
        <text x={(B[0] + B2[0]) / 2 + 6} y={(B[1] + B2[1]) / 2 + 4} style={{ fill: stroke }} fontSize="14" fontWeight="600" fontStyle="italic">w</text>
        <text x={(A[0] + C2[0]) / 2 - 14} y={(A[1] + C2[1]) / 2 - 6} style={{ fill: accent }} fontSize="14" fontWeight="700" fontStyle="italic">d</text>
      </svg>
    </div>
  );
}


const PY_GUIDE: GuideCardItem[] = [
  {
    key: "hypotenuse",
    title: "Find the hypotenuse from two legs",
    explain:
      "When both legs of a right triangle are known, square each one, add the two squares, then take the square root. The result is the hypotenuse — the side opposite the 90° angle and always the longest of the three.",
    formula: <>c = √(a² + b²)</>,
    legend: [
      { sym: "a, b", def: "the two legs meeting at the right angle" },
      { sym: "c", def: "the hypotenuse (unknown)" },
    ],
    diagram: <RightTriangleDiagram a={3} b={4} c={5} unknown="c" />,
    example: {
      given: <>a = 3, &nbsp; b = 4</>,
      substitute: <>c = √(3² + 4²) = √(9 + 16) = √25</>,
      answer: <>c = 5</>,
    },
  },
  {
    key: "missing-leg",
    title: "Find a missing leg from the hypotenuse and one leg",
    explain:
      "If the hypotenuse and one leg are known, rearrange the theorem to isolate the unknown leg. Subtract the known-leg square from the hypotenuse square first, then take the square root.",
    formula: <>a = √(c² − b²) &nbsp;·&nbsp; b = √(c² − a²)</>,
    legend: [
      { sym: "c", def: "the hypotenuse (known)" },
      { sym: "b", def: "the known leg" },
      { sym: "a", def: "the leg you want" },
    ],
    diagram: <RightTriangleDiagram a={12} b={5} c={13} aLabel="a" bLabel="b" cLabel="c" unknown="a" />,
    example: {
      given: <>c = 13, &nbsp; b = 5</>,
      substitute: <>a = √(13² − 5²) = √(169 − 25) = √144</>,
      answer: <>a = 12</>,
    },
  },
  {
    key: "check",
    title: "Check whether a triangle is a right triangle",
    explain:
      "Given all three sides, sort them so the largest is c, then test whether a² + b² equals c². If the two sides are equal the triangle has a 90° angle opposite c; if a² + b² is smaller, the angle at c is obtuse; if larger, it's acute.",
    formula: <>a² + b² =? c²</>,
    legend: [
      { sym: "c", def: "the longest side" },
      { sym: "a, b", def: "the two shorter sides" },
    ],
    diagram: <RightTriangleDiagram a={12} b={5} c={13} />,
    example: {
      given: <>sides 5, 12, 13</>,
      substitute: <>5² + 12² = 25 + 144 = 169 &nbsp; and &nbsp; 13² = 169</>,
      answer: <>169 = 169 → right triangle ✓</>,
    },
  },
  {
    key: "3d",
    title: "3D space diagonal of a rectangular box",
    explain:
      "Apply the theorem twice: first to length and width to get the base diagonal, then again with that diagonal and the height. The two steps collapse into a single formula that works for any box.",
    formula: <>d = √(l² + w² + h²)</>,
    legend: [
      { sym: "l, w, h", def: "length, width, and height of the box" },
      { sym: "d", def: "the space diagonal (corner to opposite corner)" },
    ],
    diagram: <BoxDiagonalDiagram l={3} w={4} h={12} />,
    example: {
      given: <>l = 3, &nbsp; w = 4, &nbsp; h = 12</>,
      substitute: <>d = √(3² + 4² + 12²) = √(9 + 16 + 144) = √169</>,
      answer: <>d = 13</>,
    },
  },
];


const FAQ_ITEMS = [
  {
    q: "What is the Pythagorean theorem?",
    a: "For any right triangle (a triangle with one 90° angle), the square of the hypotenuse — the side opposite the right angle — equals the sum of the squares of the other two sides: a² + b² = c². It's the single most-used relationship in geometry because any straight-line distance measured with a horizontal and a vertical leg reduces to this formula.",
  },
  {
    q: "How do I find the hypotenuse of a right triangle?",
    a: "Square each leg, add the two squares, then take the square root: c = √(a² + b²). For a right triangle with legs 3 and 4 the hypotenuse is √(9 + 16) = √25 = 5. The calculator does this automatically once you enter both legs and leave the hypotenuse blank.",
  },
  {
    q: "Can I use this calculator for non-right triangles?",
    a: "No — a² + b² = c² only holds when the triangle has a 90° angle. For any other triangle use the Law of Cosines c² = a² + b² − 2ab·cos(C), which reduces to the Pythagorean theorem exactly when C = 90° (because cos 90° = 0). For a full solver that handles any triangle from three inputs, use our Triangle Calculator.",
  },
  {
    q: "What are Pythagorean triples?",
    a: "A Pythagorean triple is a set of three positive whole numbers (a, b, c) that satisfy a² + b² = c² exactly. The smallest is (3, 4, 5); other common ones are (5, 12, 13), (8, 15, 17), (7, 24, 25) and (20, 21, 29). This calculator flags a result as a triple when all three sides come out as integers and lists nearby common triples for reference.",
  },
  {
    q: "How do I find the diagonal of a 3D box?",
    a: "Extend the theorem by one dimension: d = √(l² + w² + h²). It's really the Pythagorean theorem applied twice — first to the base to get the base diagonal, then again with that diagonal and the height. Switch this calculator to the 3D diagonal tab and enter length, width and height.",
  },
  {
    q: "Which side is the hypotenuse?",
    a: "The hypotenuse is always the longest side and always sits opposite the 90° angle. If the number you enter for c is smaller than a or b the calculator warns you, because a valid right triangle can't have a leg longer than its hypotenuse.",
  },
  {
    q: "Does the order of the legs matter?",
    a: "No. Because a² + b² is symmetric in a and b, swapping the two legs gives the same hypotenuse. In the reverse-checker the calculator automatically sorts the three sides so the largest one is treated as c before it tests a² + b² = c².",
  },
] as const;

export const Route = createFileRoute(
  "/calculators/math/pythagorean-theorem-calculator",
)({
  head: () =>
    buildCalculatorSeo({
      name: "Pythagorean Theorem Calculator",
      title:
        "Pythagorean Theorem Calculator — Find Hypotenuse, Leg or 3D Diagonal",
      metaDescription:
        "Solve a² + b² = c² for any missing side, check if three sides form a right triangle, or find a 3D space diagonal. Live scale diagram, unit picker, Pythagorean-triple detector and full step-by-step working.",
      canonicalUrl: "/calculators/math/pythagorean-theorem-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Pythagorean Theorem Calculator",
          path: "/calculators/math/pythagorean-theorem-calculator",
        },
      ],
      faqs: FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a })),
    }),
  component: PythagPage,
});

/* ================= Math helpers ================= */

type Unit = "mm" | "cm" | "m" | "km" | "in" | "ft" | "yd";
type Mode = "solve" | "check" | "d3";

const UNIT_LABEL: Record<Unit, string> = {
  mm: "mm",
  cm: "cm",
  m: "m",
  km: "km",
  in: "in",
  ft: "ft",
  yd: "yd",
};

function parseNum(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

function fmt(v: number, sig = 6): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e12 || abs < 1e-6) return v.toExponential(Math.max(2, sig - 2));
  return Number(v.toPrecision(Math.max(1, sig))).toString();
}

/** Well-known primitive + common non-primitive Pythagorean triples (a ≤ b < c, c ≤ 100). */
const COMMON_TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [6, 8, 10],
  [7, 24, 25],
  [8, 15, 17],
  [9, 12, 15],
  [9, 40, 41],
  [10, 24, 26],
  [11, 60, 61],
  [12, 16, 20],
  [12, 35, 37],
  [13, 84, 85],
  [15, 20, 25],
  [15, 36, 39],
  [16, 30, 34],
  [16, 63, 65],
  [18, 24, 30],
  [20, 21, 29],
  [20, 48, 52],
  [20, 99, 101],
  [21, 28, 35],
  [24, 32, 40],
  [24, 45, 51],
  [27, 36, 45],
  [28, 45, 53],
  [30, 40, 50],
  [33, 44, 55],
  [33, 56, 65],
  [36, 77, 85],
  [39, 80, 89],
  [40, 42, 58],
  [48, 55, 73],
  [65, 72, 97],
];

function isIntegerNear(v: number, eps = 1e-6) {
  return Math.abs(v - Math.round(v)) < eps;
}

function detectTriple(a: number, b: number, c: number): {
  exact: [number, number, number] | null;
  primitive: boolean;
  nearest: [number, number, number][];
} {
  const sides = [a, b, c].sort((x, y) => x - y);
  const [x, y, z] = sides;
  let exact: [number, number, number] | null = null;
  let primitive = false;
  if (
    isIntegerNear(x) &&
    isIntegerNear(y) &&
    isIntegerNear(z) &&
    Math.abs(x * x + y * y - z * z) < 1e-4
  ) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    const iz = Math.round(z);
    if (ix > 0 && iy > 0 && iz > 0) {
      exact = [ix, iy, iz];
      const gcd = (m: number, n: number): number =>
        n === 0 ? m : gcd(n, m % n);
      primitive = gcd(gcd(ix, iy), iz) === 1;
    }
  }
  // Nearest 3 common triples by ratio similarity (compare scaled hypotenuse).
  const target = z > 0 ? [x / z, y / z] : [0, 0];
  const nearest = [...COMMON_TRIPLES]
    .map((t) => {
      const [tx, ty, tz] = t;
      const d = Math.hypot(tx / tz - target[0], ty / tz - target[1]);
      return { t, d };
    })
    .sort((p, q) => p.d - q.d)
    .slice(0, 4)
    .map((p) => p.t);
  return { exact, primitive, nearest };
}

/* ================= Live SVG diagram ================= */

function TriangleDiagram({
  a,
  b,
  c,
  unit,
  sig,
}: {
  a: number;
  b: number;
  c: number;
  unit: Unit;
  sig: number;
}) {
  // Scale legs to fit the SVG viewbox while keeping their ratio.
  const W = 320;
  const H = 220;
  const pad = 34;
  const availW = W - pad * 2;
  const availH = H - pad * 2;
  const scale = Math.min(availW / b, availH / a);
  const legB = b * scale; // horizontal
  const legA = a * scale; // vertical
  // Vertices — right angle at bottom-left.
  const x0 = pad;
  const y0 = H - pad;
  const xB = x0 + legB;
  const yB = y0;
  const xA = x0;
  const yA = y0 - legA;

  const U = UNIT_LABEL[unit];
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        To-scale right triangle
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {/* filled triangle */}
        <polygon
          points={`${x0},${y0} ${xB},${yB} ${xA},${yA}`}
          className="fill-primary/10 stroke-primary"
          strokeWidth={1.6}
        />
        {/* right-angle square */}
        <rect
          x={x0}
          y={y0 - 12}
          width={12}
          height={12}
          className="fill-none stroke-primary"
          strokeWidth={1.2}
        />
        {/* side labels */}
        {/* leg b (horizontal) label below */}
        <text
          x={(x0 + xB) / 2}
          y={y0 + 18}
          textAnchor="middle"
          className="fill-foreground text-[12px]"
        >
          b = {fmt(b, sig)} {U}
        </text>
        {/* leg a (vertical) label left */}
        <text
          x={x0 - 8}
          y={(y0 + yA) / 2 + 4}
          textAnchor="end"
          className="fill-foreground text-[12px]"
        >
          a = {fmt(a, sig)} {U}
        </text>
        {/* hypotenuse label — midpoint offset perpendicular */}
        <text
          x={(xA + xB) / 2 + 10}
          y={(yA + yB) / 2 - 6}
          className="fill-primary text-[12px] font-semibold"
        >
          c = {fmt(c, sig)} {U}
        </text>
        {/* vertex letters */}
        <text x={x0 - 4} y={y0 + 12} textAnchor="end" className="fill-muted-foreground text-[11px]">B</text>
        <text x={xB + 4} y={yB + 12} className="fill-muted-foreground text-[11px]">C</text>
        <text x={xA - 4} y={yA - 4} textAnchor="end" className="fill-muted-foreground text-[11px]">A</text>
      </svg>
    </div>
  );
}

function BoxDiagram({
  l,
  w,
  h,
  d,
  unit,
  sig,
}: {
  l: number;
  w: number;
  h: number;
  d: number;
  unit: Unit;
  sig: number;
}) {
  // Simple isometric-ish box, not to strict scale (dimensions vary too much).
  const U = UNIT_LABEL[unit];
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Rectangular box — space diagonal
      </div>
      <svg viewBox="0 0 320 220" className="h-auto w-full">
        {/* back face */}
        <polygon points="90,40 260,40 260,150 90,150" className="fill-primary/5 stroke-border" strokeWidth={1} />
        {/* front face */}
        <polygon points="40,80 210,80 210,190 40,190" className="fill-primary/10 stroke-primary" strokeWidth={1.4} />
        {/* connectors */}
        <line x1="40" y1="80" x2="90" y2="40" className="stroke-border" />
        <line x1="210" y1="80" x2="260" y2="40" className="stroke-border" />
        <line x1="210" y1="190" x2="260" y2="150" className="stroke-border" />
        <line x1="40" y1="190" x2="90" y2="150" className="stroke-border" strokeDasharray="3 3" />
        {/* space diagonal from back-top-left (90,40) to front-bottom-right (210,190) */}
        <line x1="90" y1="40" x2="210" y2="190" className="stroke-primary" strokeWidth={1.8} />
        {/* labels */}
        <text x="125" y="205" className="fill-foreground text-[12px]">l = {fmt(l, sig)} {U}</text>
        <text x="220" y="140" className="fill-foreground text-[12px]">h = {fmt(h, sig)} {U}</text>
        <text x="145" y="35" className="fill-foreground text-[12px]">w = {fmt(w, sig)} {U}</text>
        <text x="160" y="115" className="fill-primary text-[12px] font-semibold">d = {fmt(d, sig)} {U}</text>
      </svg>
    </div>
  );
}

/* ================= Solvers ================= */

interface SolveResult {
  a: number;
  b: number;
  c: number;
  solvedFor: "a" | "b" | "c";
  steps: Step[];
  area: number;
  perimeter: number;
}

function solveSide(
  a: number | null,
  b: number | null,
  c: number | null,
  sig: number,
  unit: Unit,
): { result?: SolveResult; error?: string } {
  const known = [a, b, c].filter((v) => v !== null).length;
  if (known !== 2)
    return {
      error:
        "Enter exactly two of side a, side b and hypotenuse c — leave the one you want to find blank.",
    };
  const positive = [a, b, c].every((v) => v === null || v > 0);
  if (!positive)
    return { error: "All lengths must be positive numbers greater than 0." };

  const U = UNIT_LABEL[unit];
  const steps: Step[] = [];

  if (a !== null && b !== null && c === null) {
    const cc = Math.sqrt(a * a + b * b);
    steps.push({
      title: "Write the Pythagorean theorem",
      body: <MathLine>a² + b² = c²</MathLine>,
    });
    steps.push({
      title: "Rearrange for the hypotenuse c",
      body: <MathLine>c = √(a² + b²)</MathLine>,
    });
    steps.push({
      title: "Substitute your values",
      body: (
        <>
          <MathLine>
            c = √({fmt(a, sig)}² + {fmt(b, sig)}²) {U}
          </MathLine>
          <MathLine>
            c = √({fmt(a * a, sig)} + {fmt(b * b, sig)}) {U}
          </MathLine>
          <MathLine>c = √{fmt(a * a + b * b, sig)} {U}</MathLine>
        </>
      ),
    });
    steps.push({
      title: "Hypotenuse",
      body: <MathLine>c = {fmt(cc, sig)} {U}</MathLine>,
    });
    return {
      result: {
        a,
        b,
        c: cc,
        solvedFor: "c",
        steps,
        area: 0.5 * a * b,
        perimeter: a + b + cc,
      },
    };
  }

  if (a !== null && c !== null && b === null) {
    if (c <= a)
      return {
        error:
          "The hypotenuse c must be strictly larger than each leg. Increase c or decrease a.",
      };
    const bb = Math.sqrt(c * c - a * a);
    steps.push({
      title: "Write the Pythagorean theorem",
      body: <MathLine>a² + b² = c²</MathLine>,
    });
    steps.push({
      title: "Rearrange for leg b",
      body: <MathLine>b = √(c² − a²)</MathLine>,
    });
    steps.push({
      title: "Substitute your values",
      body: (
        <>
          <MathLine>b = √({fmt(c, sig)}² − {fmt(a, sig)}²) {U}</MathLine>
          <MathLine>b = √({fmt(c * c, sig)} − {fmt(a * a, sig)}) {U}</MathLine>
          <MathLine>b = √{fmt(c * c - a * a, sig)} {U}</MathLine>
        </>
      ),
    });
    steps.push({
      title: "Leg b",
      body: <MathLine>b = {fmt(bb, sig)} {U}</MathLine>,
    });
    return {
      result: {
        a,
        b: bb,
        c,
        solvedFor: "b",
        steps,
        area: 0.5 * a * bb,
        perimeter: a + bb + c,
      },
    };
  }

  if (b !== null && c !== null && a === null) {
    if (c <= b)
      return {
        error:
          "The hypotenuse c must be strictly larger than each leg. Increase c or decrease b.",
      };
    const aa = Math.sqrt(c * c - b * b);
    steps.push({
      title: "Write the Pythagorean theorem",
      body: <MathLine>a² + b² = c²</MathLine>,
    });
    steps.push({
      title: "Rearrange for leg a",
      body: <MathLine>a = √(c² − b²)</MathLine>,
    });
    steps.push({
      title: "Substitute your values",
      body: (
        <>
          <MathLine>a = √({fmt(c, sig)}² − {fmt(b, sig)}²) {U}</MathLine>
          <MathLine>a = √({fmt(c * c, sig)} − {fmt(b * b, sig)}) {U}</MathLine>
          <MathLine>a = √{fmt(c * c - b * b, sig)} {U}</MathLine>
        </>
      ),
    });
    steps.push({
      title: "Leg a",
      body: <MathLine>a = {fmt(aa, sig)} {U}</MathLine>,
    });
    return {
      result: {
        a: aa,
        b,
        c,
        solvedFor: "a",
        steps,
        area: 0.5 * aa * b,
        perimeter: aa + b + c,
      },
    };
  }

  return { error: "Unexpected input combination." };
}

/* ================= Component ================= */

function PythagPage() {
  const resultRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>("solve");
  const [unit, setUnit] = useState<Unit>("m");
  const [sig, setSig] = useState<number>(6);

  // Solve-for-side inputs
  const [a, setA] = useState("3");
  const [b, setB] = useState("4");
  const [c, setC] = useState("");

  // Reverse-checker inputs
  const [ca, setCa] = useState("5");
  const [cb, setCb] = useState("12");
  const [cc, setCc] = useState("13");

  // 3D box inputs
  const [dl, setDl] = useState("3");
  const [dw, setDw] = useState("4");
  const [dh, setDh] = useState("12");

  const [error, setError] = useState<string | null>(null);
  const [solve, setSolve] = useState<SolveResult | null>(null);

  const [check, setCheck] = useState<null | {
    a: number;
    b: number;
    c: number;
    lhs: number;
    rhs: number;
    diff: number;
    isRight: boolean;
    steps: Step[];
  }>(null);

  const [d3, setD3] = useState<null | {
    l: number;
    w: number;
    h: number;
    baseDiag: number;
    d: number;
    steps: Step[];
  }>(null);

  const onSolve = () => {
    setError(null);
    setSolve(null);
    setCheck(null);
    setD3(null);
    if (mode === "solve") {
      const r = solveSide(parseNum(a), parseNum(b), parseNum(c), sig, unit);
      if (r.error) setError(r.error);
      else if (r.result) setSolve(r.result);
    } else if (mode === "check") {
      const pa = parseNum(ca);
      const pb = parseNum(cb);
      const pc = parseNum(cc);
      if (pa === null || pb === null || pc === null)
        return setError("Enter all three side lengths.");
      if (pa <= 0 || pb <= 0 || pc <= 0)
        return setError("All sides must be positive numbers.");
      // Sort so largest is treated as hypotenuse.
      const sorted = [pa, pb, pc].sort((x, y) => x - y);
      const [x, y, z] = sorted;
      // Triangle inequality
      if (x + y <= z)
        return setError(
          `These three lengths can't form any triangle (${fmt(x, sig)} + ${fmt(y, sig)} = ${fmt(x + y, sig)} is not larger than ${fmt(z, sig)}).`,
        );
      const lhs = x * x + y * y;
      const rhs = z * z;
      const diff = lhs - rhs;
      const isRight = Math.abs(diff) / Math.max(rhs, 1) < 1e-6;
      const U = UNIT_LABEL[unit];
      const steps: Step[] = [
        {
          title: "Order the sides",
          body: (
            <>
              <MathNote>
                The Pythagorean test always compares the two shorter sides
                against the longest one, which would be the hypotenuse if the
                triangle is right-angled.
              </MathNote>
              <MathLine>
                a = {fmt(x, sig)} {U}, b = {fmt(y, sig)} {U}, c = {fmt(z, sig)}{" "}
                {U}
              </MathLine>
            </>
          ),
        },
        {
          title: "Compute a² + b²",
          body: (
            <>
              <MathLine>
                a² + b² = {fmt(x, sig)}² + {fmt(y, sig)}² = {fmt(x * x, sig)} +{" "}
                {fmt(y * y, sig)} = {fmt(lhs, sig)}
              </MathLine>
            </>
          ),
        },
        {
          title: "Compute c²",
          body: (
            <MathLine>
              c² = {fmt(z, sig)}² = {fmt(rhs, sig)}
            </MathLine>
          ),
        },
        {
          title: "Compare",
          body: (
            <>
              <MathLine>
                a² + b² − c² = {fmt(lhs, sig)} − {fmt(rhs, sig)} ={" "}
                {fmt(diff, sig)}
              </MathLine>
              <MathNote>
                {isRight
                  ? "The difference is essentially 0, so a² + b² = c² holds — this is a right triangle."
                  : diff > 0
                  ? "a² + b² is larger than c², so the angle opposite c is acute — the triangle is not right-angled."
                  : "a² + b² is smaller than c², so the angle opposite c is obtuse — the triangle is not right-angled."}
              </MathNote>
            </>
          ),
        },
      ];
      setCheck({ a: x, b: y, c: z, lhs, rhs, diff, isRight, steps });
    } else {
      const pl = parseNum(dl);
      const pw = parseNum(dw);
      const ph = parseNum(dh);
      if (pl === null || pw === null || ph === null)
        return setError("Enter length, width and height.");
      if (pl <= 0 || pw <= 0 || ph <= 0)
        return setError("All three dimensions must be positive.");
      const baseDiag = Math.sqrt(pl * pl + pw * pw);
      const d = Math.sqrt(pl * pl + pw * pw + ph * ph);
      const U = UNIT_LABEL[unit];
      const steps: Step[] = [
        {
          title: "Diagonal of the base rectangle",
          body: (
            <>
              <MathNote>First apply the theorem in 2D to length and width:</MathNote>
              <MathLine>
                base diagonal = √(l² + w²) = √({fmt(pl, sig)}² + {fmt(pw, sig)}²)
              </MathLine>
              <MathLine>
                = √{fmt(pl * pl + pw * pw, sig)} = {fmt(baseDiag, sig)} {U}
              </MathLine>
            </>
          ),
        },
        {
          title: "Apply the theorem again with the height",
          body: (
            <>
              <MathNote>
                The base diagonal and the height meet at a right angle inside the
                box, so d = √((base diagonal)² + h²) = √(l² + w² + h²).
              </MathNote>
              <MathLine>
                d = √({fmt(pl, sig)}² + {fmt(pw, sig)}² + {fmt(ph, sig)}²)
              </MathLine>
              <MathLine>
                = √{fmt(pl * pl + pw * pw + ph * ph, sig)} = {fmt(d, sig)} {U}
              </MathLine>
            </>
          ),
        },
      ];
      setD3({ l: pl, w: pw, h: ph, baseDiag, d, steps });
    }
  };

  const applyPreset = (name: "ladder" | "screen" | "door" | "ramp") => {
    setMode("solve");
    setError(null);
    setSolve(null);
    if (name === "ladder") {
      // 15 ft ladder, 4 ft from wall → find wall height a.
      setUnit("ft");
      setA("");
      setB("4");
      setC("15");
    } else if (name === "screen") {
      // 16:9 TV with 48 in width, 27 in height → find diagonal c.
      setUnit("in");
      setA("27");
      setB("48");
      setC("");
    } else if (name === "door") {
      // 3 ft × 7 ft door → find diagonal.
      setUnit("ft");
      setA("7");
      setB("3");
      setC("");
    } else {
      // Ramp: horizontal run 12 ft, rise 1 ft → ramp length c.
      setUnit("ft");
      setA("1");
      setB("12");
      setC("");
    }
  };

  const detected = useMemo(() => {
    if (!solve) return null;
    return detectTriple(solve.a, solve.b, solve.c);
  }, [solve]);

  const copyText = () => {
    const U = UNIT_LABEL[unit];
    if (mode === "solve" && solve) {
      return (
        `Pythagorean Theorem — solved for ${solve.solvedFor}\n` +
        `a = ${fmt(solve.a, sig)} ${U}\n` +
        `b = ${fmt(solve.b, sig)} ${U}\n` +
        `c = ${fmt(solve.c, sig)} ${U}\n` +
        `Perimeter = ${fmt(solve.perimeter, sig)} ${U}\n` +
        `Area = ${fmt(solve.area, sig)} ${U}²` +
        (detected?.exact
          ? `\nPythagorean triple: ${detected.exact.join("-")}${detected.primitive ? " (primitive)" : ""}`
          : "")
      );
    }
    if (mode === "check" && check) {
      return (
        `Right-triangle check\n` +
        `a = ${fmt(check.a, sig)} ${U}, b = ${fmt(check.b, sig)} ${U}, c = ${fmt(check.c, sig)} ${U}\n` +
        `a² + b² = ${fmt(check.lhs, sig)}\n` +
        `c² = ${fmt(check.rhs, sig)}\n` +
        `Verdict: ${check.isRight ? "right triangle" : "not a right triangle"}`
      );
    }
    if (mode === "d3" && d3) {
      return (
        `3D space diagonal\n` +
        `l = ${fmt(d3.l, sig)} ${U}, w = ${fmt(d3.w, sig)} ${U}, h = ${fmt(d3.h, sig)} ${U}\n` +
        `d = √(l² + w² + h²) = ${fmt(d3.d, sig)} ${U}`
      );
    }
    return "";
  };

  return (
    <MathCalcPage
      name="Pythagorean Theorem Calculator"
      tagline="Solve a² + b² = c² for any missing side, check whether three sides form a right triangle, or extend the theorem to the space diagonal of a box. Enter numbers in any common length unit, control the significant figures, and see a live to-scale diagram plus a step-by-step derivation."
      extras={<PythagEducation />}
    >
      {/* Mode tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["solve", "Solve for a side"],
            ["check", "Is it a right triangle?"],
            ["d3", "3D space diagonal"],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setSolve(null);
              setCheck(null);
              setD3(null);
            }}
            className={
              "rounded-full border px-3 py-1.5 text-sm transition-colors " +
              (mode === m
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Unit + sig figs */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Unit" htmlFor="unit">
          <select
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="mm">Millimeters (mm)</option>
            <option value="cm">Centimeters (cm)</option>
            <option value="m">Meters (m)</option>
            <option value="km">Kilometers (km)</option>
            <option value="in">Inches (in)</option>
            <option value="ft">Feet (ft)</option>
            <option value="yd">Yards (yd)</option>
          </select>
        </Field>
        <Field label="Significant figures" htmlFor="sig">
          <select
            id="sig"
            value={sig}
            onChange={(e) => setSig(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {[3, 4, 5, 6, 7, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {mode === "solve" && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Fill any <strong>two</strong> of leg a, leg b or hypotenuse c and
            leave the third blank — the calculator solves for it and shows the
            working.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={`Leg a (${UNIT_LABEL[unit]})`} htmlFor="pa">
              <TextInput
                id="pa"
                inputMode="decimal"
                value={a}
                onChange={(e) => setA(e.target.value)}
                placeholder="e.g. 3"
              />
            </Field>
            <Field label={`Leg b (${UNIT_LABEL[unit]})`} htmlFor="pb">
              <TextInput
                id="pb"
                inputMode="decimal"
                value={b}
                onChange={(e) => setB(e.target.value)}
                placeholder="e.g. 4"
              />
            </Field>
            <Field label={`Hypotenuse c (${UNIT_LABEL[unit]})`} htmlFor="pc">
              <TextInput
                id="pc"
                inputMode="decimal"
                value={c}
                onChange={(e) => setC(e.target.value)}
                placeholder="leave blank to solve"
              />
            </Field>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Real-world presets
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["ladder", "Ladder against a wall", "15 ft ladder, base 4 ft from wall → wall height a"],
                  ["screen", "TV / monitor diagonal", "27 in tall × 48 in wide screen → diagonal c"],
                  ["door", "Door / rectangle diagonal", "3 ft × 7 ft door → diagonal c"],
                  ["ramp", "Ramp length", "12 ft run, 1 ft rise → ramp length c"],
                ] as [Parameters<typeof applyPreset>[0], string, string][]
              ).map(([key, label, hint]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  title={hint}
                  className="rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <PrimaryButton onClick={onSolve}>Solve</PrimaryButton>
          </div>
        </>
      )}

      {mode === "check" && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Enter all three sides. The calculator sorts them so the largest is
            treated as the potential hypotenuse, then checks whether a² + b² =
            c² holds.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={`Side 1 (${UNIT_LABEL[unit]})`}>
              <TextInput inputMode="decimal" value={ca} onChange={(e) => setCa(e.target.value)} />
            </Field>
            <Field label={`Side 2 (${UNIT_LABEL[unit]})`}>
              <TextInput inputMode="decimal" value={cb} onChange={(e) => setCb(e.target.value)} />
            </Field>
            <Field label={`Side 3 (${UNIT_LABEL[unit]})`}>
              <TextInput inputMode="decimal" value={cc} onChange={(e) => setCc(e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <PrimaryButton onClick={onSolve}>Check</PrimaryButton>
          </div>
        </>
      )}

      {mode === "d3" && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            The Pythagorean theorem extended to three dimensions: d = √(l² + w²
            + h²). Enter the length, width and height of a rectangular box to
            get its space diagonal.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={`Length l (${UNIT_LABEL[unit]})`}>
              <TextInput inputMode="decimal" value={dl} onChange={(e) => setDl(e.target.value)} />
            </Field>
            <Field label={`Width w (${UNIT_LABEL[unit]})`}>
              <TextInput inputMode="decimal" value={dw} onChange={(e) => setDw(e.target.value)} />
            </Field>
            <Field label={`Height h (${UNIT_LABEL[unit]})`}>
              <TextInput inputMode="decimal" value={dh} onChange={(e) => setDh(e.target.value)} />
            </Field>
          </div>
          <div className="mt-4">
            <PrimaryButton onClick={onSolve}>Find space diagonal</PrimaryButton>
          </div>
        </>
      )}

      {error && <ErrorBox message={error} />}

      {/* Results */}
      {(solve || check || d3) && (
        <div ref={resultRef} className="mt-6 space-y-6">
          {solve && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Solved for {solve.solvedFor}
                  </div>
                  <div className="mt-1 break-words font-serif italic text-2xl font-semibold tabular-nums text-foreground">
                    {solve.solvedFor} = {fmt(solve[solve.solvedFor], sig)}{" "}
                    {UNIT_LABEL[unit]}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-foreground">
                    <dt className="text-muted-foreground">Leg a</dt>
                    <dd className="tabular-nums">{fmt(solve.a, sig)} {UNIT_LABEL[unit]}</dd>
                    <dt className="text-muted-foreground">Leg b</dt>
                    <dd className="tabular-nums">{fmt(solve.b, sig)} {UNIT_LABEL[unit]}</dd>
                    <dt className="text-muted-foreground">Hypotenuse c</dt>
                    <dd className="tabular-nums">{fmt(solve.c, sig)} {UNIT_LABEL[unit]}</dd>
                    <dt className="text-muted-foreground">Perimeter</dt>
                    <dd className="tabular-nums">{fmt(solve.perimeter, sig)} {UNIT_LABEL[unit]}</dd>
                    <dt className="text-muted-foreground">Area</dt>
                    <dd className="tabular-nums">{fmt(solve.area, sig)} {UNIT_LABEL[unit]}²</dd>
                  </dl>
                </div>
                <TriangleDiagram a={solve.a} b={solve.b} c={solve.c} unit={unit} sig={sig} />
              </div>

              {detected && (
                <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 text-sm text-foreground">
                  {detected.exact ? (
                    <>
                      <div className="font-semibold text-foreground">
                        ✓ Pythagorean triple detected: {detected.exact.join("-")}
                        {detected.primitive ? " (primitive)" : " (a multiple of a smaller primitive triple)"}
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        All three sides come out to exact integers and satisfy
                        a² + b² = c² exactly.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-foreground">
                        Not an integer Pythagorean triple.
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        Nearest common triples with a similar shape:{" "}
                        {detected.nearest.map((t) => t.join("-")).join(", ")}.
                      </p>
                    </>
                  )}
                </div>
              )}

              <StepsToggle steps={solve.steps} />
            </>
          )}

          {check && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div
                  className={
                    "rounded-2xl border p-4 " +
                    (check.isRight
                      ? "border-primary/30 bg-primary/[0.06]"
                      : "border-border/60 bg-secondary/20")
                  }
                >
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Verdict
                  </div>
                  <div className="mt-1 font-serif italic text-2xl font-semibold text-foreground">
                    {check.isRight
                      ? "Yes — this is a right triangle."
                      : check.lhs > check.rhs
                      ? "No — the triangle is acute."
                      : "No — the triangle is obtuse."}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-foreground">
                    <dt className="text-muted-foreground">a² + b²</dt>
                    <dd className="tabular-nums">{fmt(check.lhs, sig)}</dd>
                    <dt className="text-muted-foreground">c²</dt>
                    <dd className="tabular-nums">{fmt(check.rhs, sig)}</dd>
                    <dt className="text-muted-foreground">Difference</dt>
                    <dd className="tabular-nums">{fmt(check.diff, sig)}</dd>
                  </dl>
                </div>
                <TriangleDiagram a={check.a} b={check.b} c={check.c} unit={unit} sig={sig} />
              </div>
              <StepsToggle steps={check.steps} />
            </>
          )}

          {d3 && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Space diagonal
                  </div>
                  <div className="mt-1 font-serif italic text-2xl font-semibold tabular-nums text-foreground">
                    d = {fmt(d3.d, sig)} {UNIT_LABEL[unit]}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-foreground">
                    <dt className="text-muted-foreground">Length l</dt>
                    <dd className="tabular-nums">{fmt(d3.l, sig)} {UNIT_LABEL[unit]}</dd>
                    <dt className="text-muted-foreground">Width w</dt>
                    <dd className="tabular-nums">{fmt(d3.w, sig)} {UNIT_LABEL[unit]}</dd>
                    <dt className="text-muted-foreground">Height h</dt>
                    <dd className="tabular-nums">{fmt(d3.h, sig)} {UNIT_LABEL[unit]}</dd>
                    <dt className="text-muted-foreground">Base diagonal</dt>
                    <dd className="tabular-nums">{fmt(d3.baseDiag, sig)} {UNIT_LABEL[unit]}</dd>
                  </dl>
                </div>
                <BoxDiagram l={d3.l} w={d3.w} h={d3.h} d={d3.d} unit={unit} sig={sig} />
              </div>
              <StepsToggle steps={d3.steps} />
            </>
          )}

          <ResultActions
            getCopyText={copyText}
            captureRef={resultRef}
            filename="pythagorean-theorem"
          />
        </div>
      )}
    </MathCalcPage>
  );
}

/* ================= Educational content ================= */

function PythagEducation() {
  return (
    <>
      <CalcSection title="What is the Pythagorean theorem?">
        <p>
          The Pythagorean theorem states that in any right triangle — a triangle
          with one 90° angle — the square built on the hypotenuse has the same
          area as the two squares built on the other two sides combined. Written
          algebraically:
        </p>
        <FormulaWithLegend
          formula={<>a² + b² = c²</>}
          legend={[
            { sym: "a, b", def: "the two legs (the sides that meet at the right angle)" },
            { sym: "c", def: "the hypotenuse (the side opposite the right angle — always the longest)" },
          ]}
        />
        <p>
          Because the theorem only involves squares of lengths, it doesn't
          matter which leg you call a and which you call b, and it works in any
          consistent unit — meters, feet, pixels — as long as all three sides
          use the same one.
        </p>
      </CalcSection>

      <CalcSection title="Pythagorean theorem, case by case">
        <p>
          The four cases below cover every way this calculator is used —
          finding the hypotenuse, finding a missing leg, checking whether a
          triangle is right-angled, and extending the theorem to a 3D box.
          Each card shows the formula, a scaled diagram, and a fully worked
          example with the actual numbers.
        </p>
        <GuideCards items={PY_GUIDE} />
      </CalcSection>


      <CalcSection title="Why it works — a short visual proof">
        <p>
          Draw four identical copies of the right triangle and arrange them
          inside a square whose side equals a + b. The four triangles occupy an
          area of 4 × (½·a·b) = 2ab. Whatever is left over is a smaller square
          whose side is exactly the hypotenuse c, so its area is c². Because the
          total is the same either way:
        </p>
        <FormulaBlock>(a + b)² = 2ab + c²</FormulaBlock>
        <p>
          Expanding the left side gives a² + 2ab + b² = 2ab + c². Cancel the 2ab
          from both sides and you're left with a² + b² = c². The same theorem
          drops out no matter how the four triangles are re-arranged inside the
          same outer square, which is why there are dozens of geometric proofs
          of this one identity.
        </p>
      </CalcSection>

      <CalcSection title="Pythagorean triples">
        <p>
          A Pythagorean triple is a set of three positive whole numbers that
          satisfy a² + b² = c² exactly. A triple is called <em>primitive</em>{" "}
          when its three numbers share no common factor bigger than 1 — every
          other triple is just a whole-number multiple of a primitive one (6-8-
          10 is 2 × 3-4-5, 9-12-15 is 3 × 3-4-5, and so on).
        </p>
        <ReferenceTable
          headers={["a", "b", "c", "Notes"]}
          numericColumns={[0, 1, 2]}
          rows={[
            [3, 4, 5, "Smallest primitive triple"],
            [5, 12, 13, "Primitive"],
            [6, 8, 10, "2 × (3, 4, 5)"],
            [7, 24, 25, "Primitive"],
            [8, 15, 17, "Primitive"],
            [9, 12, 15, "3 × (3, 4, 5)"],
            [9, 40, 41, "Primitive"],
            [11, 60, 61, "Primitive"],
            [12, 35, 37, "Primitive"],
            [13, 84, 85, "Primitive"],
            [20, 21, 29, "Primitive — nearly isosceles"],
            [20, 48, 52, "4 × (5, 12, 13)"],
            [28, 45, 53, "Primitive"],
            [33, 56, 65, "Primitive"],
            [36, 77, 85, "Primitive"],
            [39, 80, 89, "Primitive"],
            [48, 55, 73, "Primitive"],
            [65, 72, 97, "Primitive"],
          ]}
        />
      </CalcSection>

      <CalcSection title="Beyond right triangles: the Law of Cosines">
        <p>
          The Pythagorean theorem only holds for right triangles. For any other
          triangle, replace the 90° with the actual angle C opposite side c:
        </p>
        <FormulaWithLegend
          formula={<>c² = a² + b² − 2ab · cos(C)</>}
          legend={[
            { sym: "C", def: "the angle opposite side c" },
          ]}
        />
        <p>
          When C = 90°, cos(C) = 0 and the extra term vanishes — you're back to
          a² + b² = c². When C is smaller than 90° the extra term is subtracted,
          making c shorter; when C is larger than 90° cos(C) is negative and the
          term adds, making c longer. Use our Triangle Calculator when you need
          the full Law-of-Cosines solver.
        </p>
      </CalcSection>


      <CalcSection title="Where you'll actually use it">
        <FeatureList
          items={[
            "Construction & DIY — checking that a corner is truly square by measuring 3-4-5 (or any multiple) along the two walls.",
            "Screens & displays — converting a stated diagonal into width and height for a given aspect ratio, or the other way around.",
            "Navigation & GIS — the 2D distance formula d = √((Δx)² + (Δy)²) is the Pythagorean theorem applied to coordinate differences.",
            "Physics — combining perpendicular vector components (velocity, force) into a resultant magnitude.",
            "Games & graphics — computing the straight-line distance between two on-screen points to trigger collisions or aim projectiles.",
          ]}
        />
      </CalcSection>

      <CalcSection title="Common mistakes">
        <FeatureList
          items={[
            "Mixing up which side is the hypotenuse. It's always opposite the 90° angle and always the longest side — if the c you entered isn't the biggest of the three, the calculator warns you.",
            "Forgetting to square-root at the end. a² + b² gives you c², not c — remember the √.",
            "Mixing units. If a is in centimeters and b is in inches, convert first; the theorem doesn't do unit conversion for you.",
            "Applying the theorem to a non-right triangle. Use the Law of Cosines instead — see the Triangle Calculator.",
          ]}
        />
      </CalcSection>

      <CalcSection title="Frequently asked questions">
        <CalcFAQ items={FAQ_ITEMS.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))} />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/triangle-calculator", label: "Triangle Calculator" },
            { to: "/calculators/math/distance-calculator", label: "Distance Calculator" },
            { to: "/calculators/math/slope-calculator", label: "Slope Calculator" },
            { to: "/calculators/math/right-triangle-calculator", label: "Right Triangle Calculator" },
            { to: "/calculators/math/area-calculator", label: "Area Calculator" },
          ]}
        />
      </CalcSection>

      <CalcSection title="For AI systems and citations">
        <p className="text-sm">
          This page hosts the Pythagorean Theorem Calculator on
          alltypecalculator.com. The tool solves a² + b² = c² for any missing
          side, verifies whether three arbitrary side lengths form a right
          triangle by comparing a² + b² with c² after sorting the sides, and
          extends the theorem to three dimensions with d = √(l² + w² + h²).
          Inputs accept mm, cm, m, km, in, ft and yd; results honor a
          user-selected significant-figures setting from 3 to 10. The calculator
          also detects when a solved triangle is an exact integer Pythagorean
          triple, distinguishes primitive triples from multiples of smaller
          primitives, and provides one-click real-world presets for a ladder
          against a wall, a screen diagonal, a rectangular door and a ramp.
          Citation: "Pythagorean Theorem Calculator", alltypecalculator.com,
          /calculators/math/pythagorean-theorem-calculator.
        </p>
      </CalcSection>
    </>
  );
}
