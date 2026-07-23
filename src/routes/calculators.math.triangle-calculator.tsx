import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
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
  WorkedExample,
  FormulaWithLegend,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  StackedMath,
} from "@/components/MathCalcPage";
import type { Step } from "@/components/SolutionSteps";
import type { ReactNode } from "react";
import {
  solveCosineLawSide,
  solveCosineLawAngle,
  isValidTriangleSides,
} from "@/lib/math/geometry-shared";


/** Centered display-math line used inside solution steps. */
function MathLine({ children }: { children: ReactNode }) {
  return (
    <div className="my-1 flex items-center justify-center text-center font-serif text-[15px] italic text-foreground">
      <span className="inline-flex flex-col items-center gap-1"><StackedMath>{children}</StackedMath></span>
    </div>
  );
}

/** Small left-aligned note between math lines. */
function MathNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 mb-1 text-sm not-italic text-muted-foreground">
      {children}
    </div>
  );
}

const FAQ_ITEMS = [
  {
    q: "What information do I need to solve a triangle?",
    a: "Any three values, with at least one side. That covers SSS (three sides), SAS (two sides and the included angle), ASA (two angles and the included side), AAS (two angles and a non-included side) and SSA (two sides and a non-included angle). Three angles alone don't define a unique triangle — only its shape.",
  },
  {
    q: "What is the ambiguous SSA case?",
    a: "When you know two sides and an angle that is NOT between them, there can be 0, 1 or 2 triangles that fit. The calculator detects this automatically and shows both solutions when they exist.",
  },
  {
    q: "How is the area computed?",
    a: "Once all three sides are known, Heron's formula A = √[s(s−a)(s−b)(s−c)] gives the area from the semi-perimeter s. As a cross-check the calculator also shows A = ½·a·b·sin(C) using the two-sides-and-included-angle form.",
  },
  {
    q: "What are the median, inradius and circumradius?",
    a: "A median joins a vertex to the midpoint of the opposite side; each has length mₐ = ½√(2b²+2c²−a²). The inradius r = Area/s is the radius of the inscribed circle. The circumradius R = a / (2 sin A) is the radius of the circle passing through all three vertices.",
  },
  {
    q: "Can I enter angles in radians?",
    a: "Yes — use the Degrees / Radians toggle above the input grid. Results are reported in the same unit.",
  },
  {
    q: "Do you support coordinate geometry and right triangles?",
    a: "Yes. Switch to Coordinates mode to enter three (x, y) vertices — the calculator derives every side, angle, area (via the cross-product / shoelace method), perimeter and centroid. Right triangle mode lets you enter any 2 of legs a, b or hypotenuse c and applies the Pythagorean theorem directly.",
  },
  {
    q: "What is the nine-point circle?",
    a: "It's the circle that passes through nine significant points of a triangle — the midpoint of each side, the foot of each altitude, and the midpoint of each segment from a vertex to the orthocenter. Its center N is the midpoint of the orthocenter H and circumcenter O (it lies on the Euler line), and its radius is exactly half the circumradius, R/2. Toggle it on in the diagram overlays.",
  },
  {
    q: "How can I check if two triangles are similar or congruent?",
    a: "Use the Similarity / Congruence Checker tool below the solver. Enter each triangle as either its three sides or its three angles, and it tests AA, SAS and SSS for similarity, and SSS, SAS, ASA, AAS and HL for congruence, reporting which criterion matches (and the scale factor if the triangles are similar but not congruent).",
  },
] as const;

export const Route = createFileRoute("/calculators/math/triangle-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Triangle Calculator",
      title: "Triangle Calculator — SSS, SAS, ASA, AAS, SSA & Right",
      metaDescription:
        "Triangle solver: enter any 3 values, 3 vertices, or 2 right-triangle sides. Get sides, angles, area, perimeter, medians, altitudes and a labeled diagram.",
      canonicalUrl: "/calculators/math/triangle-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Triangle Calculator", path: "/calculators/math/triangle-calculator" },
      ],
      faqs: FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a })),
    }),
  component: TrianglePage,
});

/* ================= Math ================= */

type AngleUnit = "deg" | "rad";
type Mode = "general" | "coords" | "right";

interface Solution {
  a: number; b: number; c: number;
  A: number; B: number; C: number;
  caseName: string;
  steps: Step[];
  /** Optional vertex coordinates (present in coordinates mode). */
  vertices?: { A: [number, number]; B: [number, number]; C: [number, number] };
}

const toRad = (v: number, u: AngleUnit) => (u === "deg" ? (v * Math.PI) / 180 : v);
const fromRad = (v: number, u: AngleUnit) => (u === "deg" ? (v * 180) / Math.PI : v);
const fmt = (n: number, d = 4) =>
  Number.isFinite(n) ? Number(n.toFixed(d)).toString() : "—";

/** Solve given raw field values (numbers in radians for angles, sides as-is). */
function solveTriangle(input: {
  a?: number; b?: number; c?: number;
  A?: number; B?: number; C?: number;
}): { solutions: Solution[]; note?: string } {
  // A field counts as "given" only if it is a finite positive number.
  // 0 is treated as an *entered* value and rejected here; empty fields are undefined.
  const provided = (v: number | undefined) => typeof v === "number" && Number.isFinite(v);
  const has = (v: number | undefined) => provided(v) && (v as number) > 0;
  const sideKeys = ["a", "b", "c"] as const;
  const angleKeys = ["A", "B", "C"] as const;

  // Reject any explicitly-entered zero (or negative) up front.
  for (const k of [...sideKeys, ...angleKeys]) {
    const v = input[k];
    if (provided(v) && (v as number) <= 0) {
      throw new Error("Side and angle values must be greater than 0.");
    }
  }

  const sides = sideKeys.filter((k) => has(input[k]));
  const angles = angleKeys.filter((k) => has(input[k]));

  if (sides.length + angles.length < 3) throw new Error("Enter at least 3 values (with at least one side).");
  if (sides.length === 0) throw new Error("At least one side is required — three angles alone don't determine a triangle.");

  const angleSum = angles.reduce((s, k) => s + (input[k] as number), 0);
  if (angles.length >= 2 && angleSum >= Math.PI - 1e-9) {
    throw new Error("The given angles already sum to 180° or more.");
  }
  // Single angle must be strictly less than 180°.
  if (angles.length === 1 && (input[angles[0]] as number) >= Math.PI - 1e-9) {
    throw new Error("A single angle must be less than 180°.");
  }

  let a = input.a, b = input.b, c = input.c;
  let A = input.A, B = input.B, C = input.C;

  const stepList: Step[] = [];

  // ===== ASA / AAS: 2 angles + 1 side =====
  if (angles.length === 2 && sides.length === 1) {
    if (!A) A = Math.PI - (B as number) - (C as number);
    else if (!B) B = Math.PI - (A as number) - (C as number);
    else C = Math.PI - (A as number) - (B as number);
    if (A! <= 0 || B! <= 0 || C! <= 0) throw new Error("Angles must sum to less than 180°.");

    const knownSide = sides[0];
    const kv = input[knownSide] as number;
    const kAngle = knownSide === "a" ? A! : knownSide === "b" ? B! : C!;
    const isIncluded =
      (knownSide === "a" && has(input.B) && has(input.C)) ||
      (knownSide === "b" && has(input.A) && has(input.C)) ||
      (knownSide === "c" && has(input.A) && has(input.B));
    const caseName = isIncluded ? "ASA — two angles and the included side" : "AAS — two angles and a non-included side";

    stepList.push({
      title: `Detected ${caseName}`,
      body: (
        <>
          <MathNote>Use angle-sum, then Law of Sines.</MathNote>
          <MathLine>A + B + C = 180°</MathLine>
        </>
      ),
    });
    stepList.push({
      title: "Third angle by angle-sum",
      body: (
        <>
          <MathNote>Missing angle</MathNote>
          <MathLine>angle = 180° − (given₁ + given₂)</MathLine>
        </>
      ),
    });

    const ratio = kv / Math.sin(kAngle);
    a = a ?? ratio * Math.sin(A!);
    b = b ?? ratio * Math.sin(B!);
    c = c ?? ratio * Math.sin(C!);

    stepList.push({
      title: "Remaining sides by Law of Sines",
      body: (
        <>
          <MathNote>Law of Sines ratio</MathNote>
          <MathLine>{knownSide} / sin({knownSide.toUpperCase()}) = {fmt(kv)} / sin({fmt(kAngle, 6)}) = {fmt(ratio)}</MathLine>
          <MathNote>Then side = ratio × sin(opposite angle)</MathNote>
          <MathLine>a = {fmt(a!)}</MathLine>
          <MathLine>b = {fmt(b!)}</MathLine>
          <MathLine>c = {fmt(c!)}</MathLine>
        </>
      ),
    });

    return { solutions: [{ a: a!, b: b!, c: c!, A: A!, B: B!, C: C!, caseName, steps: stepList }] };
  }

  // ===== SSS: 3 sides =====
  if (sides.length === 3) {
    const sa = a!, sb = b!, sc = c!;
    if (!isValidTriangleSides(sa, sb, sc))
      throw new Error("Triangle inequality violated — the two shorter sides must sum to more than the longest side.");

    const A2 = solveCosineLawAngle(sa, sb, sc);
    const B2 = solveCosineLawAngle(sb, sa, sc);
    const C2 = Math.PI - A2 - B2;


    stepList.push({
      title: "Detected SSS — three sides given",
      body: (
        <>
          <MathNote>Use the Law of Cosines to recover the angles.</MathNote>
          <MathLine>cos(angle) = (opposite² sides sum − opposite side²) / (2·product)</MathLine>
        </>
      ),
    });
    stepList.push({
      title: "Angle A by Law of Cosines",
      body: (
        <>
          <MathNote>Law of Cosines rearranged</MathNote>
          <MathLine>cos(A) = (b² + c² − a²) / (2bc)</MathLine>
          <MathLine>= ({fmt(sb * sb)} + {fmt(sc * sc)} − {fmt(sa * sa)}) / (2 × {fmt(sb)} × {fmt(sc)})</MathLine>
          <MathLine>= {fmt((sb * sb + sc * sc - sa * sa) / (2 * sb * sc), 6)}</MathLine>
          <MathLine>A = arccos(...) = {fmt(A2, 6)} rad ≈ {fmt((A2 * 180) / Math.PI, 4)}°</MathLine>
        </>
      ),
    });
    stepList.push({
      title: "Angles B and C",
      body: (
        <>
          <MathNote>Repeat Law of Cosines for B</MathNote>
          <MathLine>B = {fmt(B2, 6)} rad ≈ {fmt((B2 * 180) / Math.PI, 4)}°</MathLine>
          <MathNote>Then close with the angle-sum rule</MathNote>
          <MathLine>C = 180° − A − B = {fmt((C2 * 180) / Math.PI, 4)}°</MathLine>
        </>
      ),
    });

    return { solutions: [{ a: sa, b: sb, c: sc, A: A2, B: B2, C: C2, caseName: "SSS — three sides", steps: stepList }] };
  }

  // ===== SAS: 2 sides + included angle =====
  if (sides.length === 2 && angles.length === 1) {
    const isSAS =
      (has(A) && has(b) && has(c)) ||
      (has(B) && has(a) && has(c)) ||
      (has(C) && has(a) && has(b));

    if (isSAS) {
      let missingSide: "a" | "b" | "c";
      if (has(A)) missingSide = "a";
      else if (has(B)) missingSide = "b";
      else missingSide = "c";

      const angleV = missingSide === "a" ? A! : missingSide === "b" ? B! : C!;
      const s1 = missingSide === "a" ? b! : missingSide === "b" ? a! : a!;
      const s2 = missingSide === "a" ? c! : missingSide === "b" ? c! : b!;
      const m = solveCosineLawSide(s1, s2, angleV);
      const sq = m * m;
      if (missingSide === "a") a = m;
      else if (missingSide === "b") b = m;
      else c = m;


      stepList.push({
        title: "Detected SAS — two sides and the included angle",
        body: (
          <>
            <MathNote>Law of Cosines gives the third side, then Law of Sines closes the angles.</MathNote>
            <MathLine>c² = a² + b² − 2ab·cos(C)</MathLine>
          </>
        ),
      });
      stepList.push({
        title: `Third side ${missingSide}`,
        body: (
          <>
            <MathNote>Law of Cosines</MathNote>
            <MathLine>{missingSide}² = {fmt(s1)}² + {fmt(s2)}² − 2 × {fmt(s1)} × {fmt(s2)} × cos({fmt(angleV, 6)})</MathLine>
            <MathLine>{missingSide}² = {fmt(sq)}</MathLine>
            <MathLine>{missingSide} = √{fmt(sq)} = {fmt(m)}</MathLine>
          </>
        ),
      });

      const [ra, rb, rc] = [a!, b!, c!];
      const A2 = has(A) ? A! : solveCosineLawAngle(ra, rb, rc);
      const B2 = has(B) ? B! : solveCosineLawAngle(rb, ra, rc);

      const C2 = has(C) ? C! : Math.PI - A2 - B2;

      stepList.push({
        title: "Remaining angles",
        body: (
          <>
            <MathNote>Law of Cosines with all three known sides</MathNote>
            <MathLine>A = {fmt(A2, 6)} rad ≈ {fmt((A2 * 180) / Math.PI, 4)}°</MathLine>
            <MathLine>B = {fmt(B2, 6)} rad ≈ {fmt((B2 * 180) / Math.PI, 4)}°</MathLine>
            <MathLine>C = 180° − A − B = {fmt((C2 * 180) / Math.PI, 4)}°</MathLine>
          </>
        ),
      });

      return { solutions: [{ a: ra, b: rb, c: rc, A: A2, B: B2, C: C2, caseName: "SAS — two sides and the included angle", steps: stepList }] };
    }

    // ===== SSA: 2 sides + non-included angle (ambiguous) =====
    let knownAngle: "A" | "B" | "C";
    if (has(A)) knownAngle = "A";
    else if (has(B)) knownAngle = "B";
    else knownAngle = "C";
    const oppositeSide: "a" | "b" | "c" = knownAngle.toLowerCase() as "a" | "b" | "c";
    const sideOpp = (oppositeSide === "a" ? a : oppositeSide === "b" ? b : c) as number | undefined;
    if (!has(sideOpp)) {
      throw new Error("Ambiguous input: give the side opposite the known angle, or two angles.");
    }
    const otherSideKey = sides.find((k) => k !== oppositeSide)!;
    const otherSide = input[otherSideKey] as number;
    const otherAngleKey = (otherSideKey.toUpperCase() as "A" | "B" | "C");
    const angV = input[knownAngle] as number;
    const sOpp = sideOpp as number;

    const sinOther = (otherSide * Math.sin(angV)) / sOpp;

    stepList.push({
      title: "Detected SSA — ambiguous case",
      body: (
        <>
          <MathNote>SSA can give 0, 1 or 2 triangles. Test with the Law of Sines.</MathNote>
          <MathLine>sin({otherAngleKey}) = {otherSideKey} · sin({knownAngle}) / {oppositeSide}</MathLine>
          <MathLine>= {fmt(otherSide)} × sin({fmt(angV, 6)}) / {fmt(sOpp)}</MathLine>
          <MathLine>= {fmt(sinOther, 6)}</MathLine>
        </>
      ),
    });

    if (sinOther > 1 + 1e-9) throw new Error("SSA has no solution — sin of the required angle exceeds 1 (no triangle fits these values).");
    const clamped = Math.min(1, Math.max(-1, sinOther));
    const angle1 = Math.asin(clamped);
    const angle2 = Math.PI - angle1;
    const solutions: Solution[] = [];

    const buildFrom = (otherAng: number, label: string): Solution | null => {
      const third = Math.PI - angV - otherAng;
      if (third <= 1e-9) return null;
      const knownAngleVal = angV;
      const knownSideVal = sOpp;
      const ratio = knownSideVal / Math.sin(knownAngleVal);
      const map: Record<string, number> = { [knownAngle]: knownAngleVal, [otherAngleKey]: otherAng };
      const thirdKey = (["A", "B", "C"] as const).find((k) => !(k in map))!;
      map[thirdKey] = third;
      const sMap: Record<string, number> = {
        [oppositeSide]: knownSideVal,
        [otherSideKey]: otherSide,
      };
      const thirdSideKey = (["a", "b", "c"] as const).find((k) => !(k in sMap))!;
      sMap[thirdSideKey] = ratio * Math.sin(third);
      return {
        a: sMap.a, b: sMap.b, c: sMap.c,
        A: map.A, B: map.B, C: map.C,
        caseName: `SSA (${label})`,
        steps: [
          ...stepList,
          {
            title: `${label}: solve with ${otherAngleKey} = arcsin(...)`,
            body: (
              <>
                <MathNote>Take the arcsine branch for {label.toLowerCase()}</MathNote>
                <MathLine>{otherAngleKey} = {fmt(otherAng, 6)} rad ≈ {fmt((otherAng * 180) / Math.PI, 4)}°</MathLine>
                <MathNote>Third angle by angle-sum</MathNote>
                <MathLine>{thirdKey} = 180° − {knownAngle} − {otherAngleKey} = {fmt((third * 180) / Math.PI, 4)}°</MathLine>
                <MathNote>Third side by Law of Sines</MathNote>
                <MathLine>{thirdSideKey} = ({fmt(knownSideVal)} / sin({fmt(knownAngleVal, 6)})) × sin({fmt(third, 6)})</MathLine>
                <MathLine>= {fmt(sMap[thirdSideKey])}</MathLine>
              </>
            ),
          },
        ],
      };
    };

    const s1 = buildFrom(angle1, "Solution 1");
    if (s1) solutions.push(s1);
    if (Math.abs(angle2 - angle1) > 1e-6) {
      const s2 = buildFrom(angle2, "Solution 2");
      if (s2) solutions.push(s2);
    }

    if (solutions.length === 0) throw new Error("SSA has no valid triangle for these values.");
    const note =
      solutions.length === 2
        ? "Ambiguous SSA case — two distinct triangles fit these values."
        : undefined;
    return { solutions, note };
  }

  throw new Error("Enter exactly 3 values (with at least one side).");
}

/* ================= Component ================= */

function TrianglePage() {
  const [mode, setMode] = useState<Mode>("general");
  const [unit, setUnit] = useState<AngleUnit>("deg");

  // General mode inputs
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [A, setAAng] = useState("");
  const [B, setBAng] = useState("");
  const [C, setCAng] = useState("");

  // Coordinate mode inputs
  const [x1, setX1] = useState("0");
  const [y1, setY1] = useState("0");
  const [x2, setX2] = useState("6");
  const [y2, setY2] = useState("0");
  const [x3, setX3] = useState("2");
  const [y3, setY3] = useState("4");

  // Right-triangle mode inputs (a, b legs; c hypotenuse)
  const [ra, setRa] = useState("");
  const [rb, setRb] = useState("");
  const [rc, setRc] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ solutions: Solution[]; note?: string } | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const parseNum = (v: string) => {
    if (v.trim() === "") return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`"${v}" is not a number.`);
    return n;
  };

  const onSolve = () => {
    setError(null);
    setResult(null);
    try {
      if (mode === "general") {
        const input = {
          a: parseNum(a), b: parseNum(b), c: parseNum(c),
          A: (() => { const n = parseNum(A); return n === undefined ? undefined : toRad(n, unit); })(),
          B: (() => { const n = parseNum(B); return n === undefined ? undefined : toRad(n, unit); })(),
          C: (() => { const n = parseNum(C); return n === undefined ? undefined : toRad(n, unit); })(),
        };
        setResult(solveTriangle(input));
      } else if (mode === "coords") {
        const nums = [x1, y1, x2, y2, x3, y3].map((v) => {
          const n = parseNum(v);
          if (n === undefined) throw new Error("All six coordinate fields are required.");
          return n;
        });
        const [X1, Y1, X2, Y2, X3, Y3] = nums;
        // Sides: a opposite vertex A (which is P1); so a = |P2P3|, b = |P1P3|, c = |P1P2|
        const sa = Math.hypot(X2 - X3, Y2 - Y3);
        const sb = Math.hypot(X1 - X3, Y1 - Y3);
        const sc = Math.hypot(X1 - X2, Y1 - Y2);
        if (sa < 1e-9 || sb < 1e-9 || sc < 1e-9)
          throw new Error("The three points are coincident or collinear — they don't form a triangle.");
        const r = solveTriangle({ a: sa, b: sb, c: sc });
        // Overwrite step 0 with coordinate-derivation step and attach vertices.
        const areaShoelace = 0.5 * Math.abs(X1 * (Y2 - Y3) + X2 * (Y3 - Y1) + X3 * (Y1 - Y2));
        const cent: [number, number] = [(X1 + X2 + X3) / 3, (Y1 + Y2 + Y3) / 3];
        const coordSteps: Step[] = [
          {
            title: "Side lengths from coordinates",
            body: (
              <>
                <MathNote>Distance formula for each side</MathNote>
                <MathLine>a = |P₂P₃| = √(({X2}−{X3})² + ({Y2}−{Y3})²) = {fmt(sa)}</MathLine>
                <MathLine>b = |P₁P₃| = {fmt(sb)}</MathLine>
                <MathLine>c = |P₁P₂| = {fmt(sc)}</MathLine>
              </>
            ),
          },
          {
            title: "Area via shoelace / cross-product",
            body: (
              <>
                <MathNote>Shoelace formula</MathNote>
                <MathLine>A = ½ |x₁(y₂−y₃) + x₂(y₃−y₁) + x₃(y₁−y₂)|</MathLine>
                <MathLine>= ½ |{X1}({Y2}−{Y3}) + {X2}({Y3}−{Y1}) + {X3}({Y1}−{Y2})|</MathLine>
                <MathLine>= {fmt(areaShoelace)}</MathLine>
              </>
            ),
          },
          {
            title: "Centroid",
            body: (
              <>
                <MathNote>Average of the three vertices</MathNote>
                <MathLine>G = ((x₁+x₂+x₃)/3, (y₁+y₂+y₃)/3)</MathLine>
                <MathLine>= ({fmt(cent[0])}, {fmt(cent[1])})</MathLine>
              </>
            ),
          },
        ];
        r.solutions = r.solutions.map((s) => ({
          ...s,
          caseName: "Coordinate geometry",
          steps: [...coordSteps, ...s.steps],
          vertices: { A: [X1, Y1], B: [X2, Y2], C: [X3, Y3] },
        }));
        setResult(r);
      } else {
        // Right triangle mode: enter any 2 of ra, rb, rc
        const na = parseNum(ra), nb = parseNum(rb), nc = parseNum(rc);
        const provided = [na, nb, nc].filter((v) => v !== undefined) as number[];
        if (provided.length !== 2) throw new Error("Enter exactly two of (leg a, leg b, hypotenuse c).");
        for (const v of provided) if (v <= 0) throw new Error("Right-triangle sides must be greater than 0.");
        let A2 = na, B2 = nb, C2 = nc;
        const stepsRT: Step[] = [{
          title: "Detected right triangle",
          body: (
            <>
              <MathNote>Angle C = 90°. Use the Pythagorean theorem.</MathNote>
              <MathLine>a² + b² = c²</MathLine>
            </>
          ),
        }];
        if (A2 !== undefined && B2 !== undefined) {
          C2 = Math.hypot(A2, B2);
          stepsRT.push({
            title: "Hypotenuse",
            body: (
              <>
                <MathNote>Solve for c</MathNote>
                <MathLine>c = √(a² + b²) = √({A2}² + {B2}²)</MathLine>
                <MathLine>= {fmt(C2)}</MathLine>
              </>
            ),
          });
        } else if (A2 !== undefined && C2 !== undefined) {
          if (C2 <= A2) throw new Error("Hypotenuse must be longer than the given leg.");
          B2 = Math.sqrt(C2 * C2 - A2 * A2);
          stepsRT.push({
            title: "Missing leg",
            body: (
              <>
                <MathNote>Solve for b</MathNote>
                <MathLine>b = √(c² − a²) = √({C2}² − {A2}²)</MathLine>
                <MathLine>= {fmt(B2)}</MathLine>
              </>
            ),
          });
        } else if (B2 !== undefined && C2 !== undefined) {
          if (C2 <= B2) throw new Error("Hypotenuse must be longer than the given leg.");
          A2 = Math.sqrt(C2 * C2 - B2 * B2);
          stepsRT.push({
            title: "Missing leg",
            body: (
              <>
                <MathNote>Solve for a</MathNote>
                <MathLine>a = √(c² − b²) = √({C2}² − {B2}²)</MathLine>
                <MathLine>= {fmt(A2)}</MathLine>
              </>
            ),
          });
        }
        const angA = Math.atan2(A2!, B2!);
        const angB = Math.atan2(B2!, A2!);
        stepsRT.push({
          title: "Angles",
          body: (
            <>
              <MathNote>Right-triangle angles from the legs</MathNote>
              <MathLine>A = arctan(a / b) = {fmt(angA, 6)} rad ≈ {fmt((angA * 180) / Math.PI, 4)}°</MathLine>
              <MathLine>B = 90° − A = {fmt((angB * 180) / Math.PI, 4)}°</MathLine>
            </>
          ),
        });
        setResult({
          solutions: [{
            a: A2!, b: B2!, c: C2!,
            A: angA, B: angB, C: Math.PI / 2,
            caseName: "Right triangle (Pythagorean)",
            steps: stepsRT,
          }],
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not solve.");
    }
  };

  const onExample = () => {
    setUnit("deg");
    setA("7"); setB("9"); setC(""); setAAng("35"); setBAng(""); setCAng("");
  };

  const preset30_60_90 = () => {
    setUnit("deg");
    setAAng("30"); setBAng("60"); setCAng("");
    setA(""); setB(""); setC("1");
  };
  const preset45_45_90 = () => {
    setUnit("deg");
    setAAng("45"); setBAng("45"); setCAng("");
    setA(""); setB(""); setC("1");
  };

  return (
    <MathCalcPage
      name="Triangle Calculator"
      tagline="Solve any triangle from three inputs, three vertex coordinates, or two right-triangle sides. Get every side, angle, area, perimeter, median, altitude, angle bisector, inradius, circumradius and centroid — drawn to scale."
      extras={<TriangleEducation />}
    >
      {/* Mode tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {([
          ["general", "General solver"],
          ["coords", "Coordinates"],
          ["right", "Right triangle"],
        ] as [Mode, string][]).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setResult(null);
              setError(null);
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

      {mode === "general" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">Angle unit:</span>
            <div className="inline-flex overflow-hidden rounded-full border border-border">
              {(["deg", "rad"] as AngleUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={
                    "px-3 py-1.5 text-sm " +
                    (unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {u === "deg" ? "Degrees" : "Radians"}
                </button>
              ))}
            </div>
            <button type="button" onClick={onExample} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Load ambiguous SSA example
            </button>
            <button type="button" onClick={preset30_60_90} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
              30-60-90 preset
            </button>
            <button type="button" onClick={preset45_45_90} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
              45-45-90 preset
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Side a" htmlFor="ta"><TextInput id="ta" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} placeholder="e.g. 7" /></Field>
            <Field label="Side b" htmlFor="tb"><TextInput id="tb" inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} placeholder="e.g. 9" /></Field>
            <Field label="Side c" htmlFor="tc"><TextInput id="tc" inputMode="decimal" value={c} onChange={(e) => setC(e.target.value)} /></Field>
            <Field label={`Angle A (opposite a, ${unit})`} htmlFor="tA"><TextInput id="tA" inputMode="decimal" value={A} onChange={(e) => setAAng(e.target.value)} placeholder="e.g. 35" /></Field>
            <Field label={`Angle B (opposite b, ${unit})`} htmlFor="tB"><TextInput id="tB" inputMode="decimal" value={B} onChange={(e) => setBAng(e.target.value)} /></Field>
            <Field label={`Angle C (opposite c, ${unit})`} htmlFor="tC"><TextInput id="tC" inputMode="decimal" value={C} onChange={(e) => setCAng(e.target.value)} /></Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PrimaryButton onClick={onSolve}>Solve triangle</PrimaryButton>
            <span className="text-xs text-muted-foreground">Fill any 3 fields, including at least one side.</span>
          </div>
        </>
      )}

      {mode === "coords" && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Enter three vertices A, B, C as (x, y). The calculator computes sides, angles, area (shoelace), perimeter and centroid.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="A: x₁"><TextInput inputMode="decimal" value={x1} onChange={(e) => setX1(e.target.value)} /></Field>
            <Field label="A: y₁"><TextInput inputMode="decimal" value={y1} onChange={(e) => setY1(e.target.value)} /></Field>
            <div className="hidden sm:block" />
            <Field label="B: x₂"><TextInput inputMode="decimal" value={x2} onChange={(e) => setX2(e.target.value)} /></Field>
            <Field label="B: y₂"><TextInput inputMode="decimal" value={y2} onChange={(e) => setY2(e.target.value)} /></Field>
            <div className="hidden sm:block" />
            <Field label="C: x₃"><TextInput inputMode="decimal" value={x3} onChange={(e) => setX3(e.target.value)} /></Field>
            <Field label="C: y₃"><TextInput inputMode="decimal" value={y3} onChange={(e) => setY3(e.target.value)} /></Field>
          </div>
          <div className="mt-4"><PrimaryButton onClick={onSolve}>Solve from coordinates</PrimaryButton></div>
        </>
      )}

      {mode === "right" && (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Enter <strong>any two</strong> of legs a, b or hypotenuse c. Angle C is fixed at 90°.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Leg a"><TextInput inputMode="decimal" value={ra} onChange={(e) => setRa(e.target.value)} placeholder="e.g. 3" /></Field>
            <Field label="Leg b"><TextInput inputMode="decimal" value={rb} onChange={(e) => setRb(e.target.value)} placeholder="e.g. 4" /></Field>
            <Field label="Hypotenuse c"><TextInput inputMode="decimal" value={rc} onChange={(e) => setRc(e.target.value)} /></Field>
          </div>
          <div className="mt-4"><PrimaryButton onClick={onSolve}>Solve right triangle</PrimaryButton></div>
        </>
      )}

      {error && <ErrorBox message={error} />}

      {result && (
        <div ref={resultRef} className="mt-6 space-y-6">
          {result.note && (
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-3 text-sm text-foreground">
              {result.note}
            </div>
          )}
          {result.solutions.map((s, i) => (
            <SolvedTriangle key={i} sol={s} unit={unit} index={result.solutions.length > 1 ? i + 1 : undefined} />
          ))}
          <ResultActions
            getCopyText={() => copyText(result.solutions, unit)}
            captureRef={resultRef}
            filename="triangle-solution"
          />
        </div>
      )}
    </MathCalcPage>
  );
}

function copyText(sols: Solution[], u: AngleUnit) {
  return sols
    .map((s, i) => {
      const tag = sols.length > 1 ? `Solution ${i + 1} (${s.caseName})\n` : `${s.caseName}\n`;
      const angU = u === "deg" ? "°" : " rad";
      const A = fromRad(s.A, u), B = fromRad(s.B, u), C = fromRad(s.C, u);
      const area = triangleArea(s.a, s.b, s.c);
      const P = s.a + s.b + s.c;
      return (
        tag +
        `a = ${fmt(s.a)}, b = ${fmt(s.b)}, c = ${fmt(s.c)}\n` +
        `A = ${fmt(A)}${angU}, B = ${fmt(B)}${angU}, C = ${fmt(C)}${angU}\n` +
        `Perimeter = ${fmt(P)}, Area = ${fmt(area)}\n` +
        `Inradius = ${fmt(area / (P / 2))}, Circumradius = ${fmt(s.a / (2 * Math.sin(s.A)))}`
      );
    })
    .join("\n\n");
}

function triangleArea(a: number, b: number, c: number) {
  const s = (a + b + c) / 2;
  return Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
}

/* ================= Solved-triangle panel ================= */

function SolvedTriangle({ sol, unit, index }: { sol: Solution; unit: AngleUnit; index?: number }) {
  const { a, b, c, A, B, C } = sol;
  const area = triangleArea(a, b, c);
  const areaSAS = 0.5 * a * b * Math.sin(C);
  const P = a + b + c;
  const s = P / 2;
  const inradius = area / s;
  const circumradius = a / (2 * Math.sin(A));

  const mA = 0.5 * Math.sqrt(Math.max(0, 2 * b * b + 2 * c * c - a * a));
  const mB = 0.5 * Math.sqrt(Math.max(0, 2 * a * a + 2 * c * c - b * b));
  const mC = 0.5 * Math.sqrt(Math.max(0, 2 * a * a + 2 * b * b - c * c));

  // Altitudes: h_x = 2·Area / x
  const hA = (2 * area) / a;
  const hB = (2 * area) / b;
  const hC = (2 * area) / c;

  // Angle bisector lengths: t_a = (2 √(bc·s·(s−a))) / (b+c)
  const tA = (2 * Math.sqrt(Math.max(0, b * c * s * (s - a)))) / (b + c);
  const tB = (2 * Math.sqrt(Math.max(0, a * c * s * (s - b)))) / (a + c);
  const tC = (2 * Math.sqrt(Math.max(0, a * b * s * (s - c)))) / (a + b);

  // Vertex coordinates: use provided (coord mode) or place A=(0,0), B=(c,0), C=(b cosA, b sinA).
  const vAx = sol.vertices ? sol.vertices.A[0] : 0;
  const vAy = sol.vertices ? sol.vertices.A[1] : 0;
  const vBx = sol.vertices ? sol.vertices.B[0] : c;
  const vBy = sol.vertices ? sol.vertices.B[1] : 0;
  const vCx = sol.vertices ? sol.vertices.C[0] : b * Math.cos(A);
  const vCy = sol.vertices ? sol.vertices.C[1] : b * Math.sin(A);

  const centroid: [number, number] = [
    (vAx + vBx + vCx) / 3,
    (vAy + vBy + vCy) / 3,
  ];

  // Incenter = (a·A + b·B + c·C) / (a + b + c), with side lengths as weights.
  const wSum = a + b + c;
  const incenter: [number, number] = [
    (a * vAx + b * vBx + c * vCx) / wSum,
    (a * vAy + b * vBy + c * vCy) / wSum,
  ];

  // Circumcenter O — perpendicular bisector intersection (from vertex coords).
  const dCC =
    2 *
    (vAx * (vBy - vCy) + vBx * (vCy - vAy) + vCx * (vAy - vBy));
  const circumcenter: [number, number] =
    Math.abs(dCC) < 1e-12
      ? [centroid[0], centroid[1]]
      : [
          ((vAx * vAx + vAy * vAy) * (vBy - vCy) +
            (vBx * vBx + vBy * vBy) * (vCy - vAy) +
            (vCx * vCx + vCy * vCy) * (vAy - vBy)) /
            dCC,
          ((vAx * vAx + vAy * vAy) * (vCx - vBx) +
            (vBx * vBx + vBy * vBy) * (vAx - vCx) +
            (vCx * vCx + vCy * vCy) * (vBx - vAx)) /
            dCC,
        ];

  // Orthocenter via Euler line: H = 3G − 2O.
  const orthocenter: [number, number] = [
    3 * centroid[0] - 2 * circumcenter[0],
    3 * centroid[1] - 2 * circumcenter[1],
  ];

  // Nine-point circle: center is the midpoint of the orthocenter and circumcenter (Euler line),
  // radius is half the circumradius.
  const ninePointCenter: [number, number] = [
    (orthocenter[0] + circumcenter[0]) / 2,
    (orthocenter[1] + circumcenter[1]) / 2,
  ];
  const ninePointRadius = circumradius / 2;

  const sidesKind =
    Math.abs(a - b) < 1e-6 && Math.abs(b - c) < 1e-6
      ? "equilateral"
      : Math.abs(a - b) < 1e-6 || Math.abs(b - c) < 1e-6 || Math.abs(a - c) < 1e-6
      ? "isosceles"
      : "scalene";
  const maxAng = Math.max(A, B, C);
  const anglesKind =
    Math.abs(maxAng - Math.PI / 2) < 1e-4 ? "right" : maxAng > Math.PI / 2 ? "obtuse" : "acute";

  const angleFmt = (r: number) =>
    unit === "deg" ? `${fmt((r * 180) / Math.PI)}°` : `${fmt(r, 6)} rad`;

  const extraSteps: Step[] = [
    ...sol.steps,
    {
      title: "Area — Heron's formula",
      body: (
        <>
          <MathNote>Semi-perimeter</MathNote>
          <MathLine>s = (a + b + c) / 2 = {fmt(s)}</MathLine>
          <MathNote>Heron's formula</MathNote>
          <MathLine>Area = √[s(s − a)(s − b)(s − c)]</MathLine>
          <MathLine>= √[{fmt(s)} × {fmt(s - a)} × {fmt(s - b)} × {fmt(s - c)}]</MathLine>
          <MathLine>= {fmt(area)}</MathLine>
        </>
      ),
    },
    {
      title: "Cross-check via two-sides-and-included-angle",
      body: (
        <>
          <MathNote>Using sides a, b and included angle C</MathNote>
          <MathLine>Area = ½ · a · b · sin(C)</MathLine>
          <MathLine>= ½ × {fmt(a)} × {fmt(b)} × sin({fmt(C, 6)})</MathLine>
          <MathLine>= {fmt(areaSAS)}</MathLine>
        </>
      ),
    },
    {
      title: "Medians",
      body: (
        <>
          <MathNote>Median from vertex A</MathNote>
          <MathLine>mₐ = ½·√(2b² + 2c² − a²)</MathLine>
          <MathLine>= ½·√({fmt(2 * b * b + 2 * c * c - a * a)}) = {fmt(mA)}</MathLine>
          <MathNote>Same formula for the others</MathNote>
          <MathLine>m_b = {fmt(mB)}</MathLine>
          <MathLine>m_c = {fmt(mC)}</MathLine>
        </>
      ),
    },
    {
      title: "Altitudes",
      body: (
        <>
          <MathNote>Altitude from vertex A</MathNote>
          <MathLine>hₐ = 2·Area / a = 2 × {fmt(area)} / {fmt(a)} = {fmt(hA)}</MathLine>
          <MathNote>Same formula for the others</MathNote>
          <MathLine>h_b = {fmt(hB)}</MathLine>
          <MathLine>h_c = {fmt(hC)}</MathLine>
        </>
      ),
    },
    {
      title: "Angle bisector lengths",
      body: (
        <>
          <MathNote>Bisector from vertex A</MathNote>
          <MathLine>tₐ = 2·√(bc·s·(s − a)) / (b + c)</MathLine>
          <MathLine>= 2·√({fmt(b * c * s * (s - a))}) / ({fmt(b + c)}) = {fmt(tA)}</MathLine>
          <MathNote>Same formula for the others</MathNote>
          <MathLine>t_b = {fmt(tB)}</MathLine>
          <MathLine>t_c = {fmt(tC)}</MathLine>
        </>
      ),
    },
    {
      title: "Inradius and circumradius",
      body: (
        <>
          <MathNote>Inradius</MathNote>
          <MathLine>r = Area / s = {fmt(area)} / {fmt(s)} = {fmt(inradius)}</MathLine>
          <MathNote>Circumradius</MathNote>
          <MathLine>R = (a · b · c) / (4 · Area)</MathLine>
          <MathLine>= ({fmt(a)} × {fmt(b)} × {fmt(c)}) / (4 × {fmt(area)})</MathLine>
          <MathLine>= {fmt(a * b * c)} / {fmt(4 * area)} = {fmt(circumradius)}</MathLine>
        </>
      ),
    },
    {
      title: "Incenter (I)",
      body: (
        <>
          <MathNote>Weight each vertex by its opposite side length</MathNote>
          <MathLine>I = (a·A + b·B + c·C) / (a + b + c)</MathLine>
          <MathNote>x-coordinate</MathNote>
          <MathLine>Iₓ = ({fmt(a)}·{fmt(vAx)} + {fmt(b)}·{fmt(vBx)} + {fmt(c)}·{fmt(vCx)}) / {fmt(a + b + c)} = {fmt(incenter[0])}</MathLine>
          <MathNote>y-coordinate</MathNote>
          <MathLine>I_y = ({fmt(a)}·{fmt(vAy)} + {fmt(b)}·{fmt(vBy)} + {fmt(c)}·{fmt(vCy)}) / {fmt(a + b + c)} = {fmt(incenter[1])}</MathLine>
        </>
      ),
    },
    {
      title: "Orthocenter (H)",
      body: (
        <>
          <MathNote>Euler line property: H = 3G − 2O</MathNote>
          <MathNote>Where G is centroid and O is circumcenter</MathNote>
          <MathLine>H = 3·({fmt(centroid[0])}, {fmt(centroid[1])}) − 2·({fmt(circumcenter[0])}, {fmt(circumcenter[1])})</MathLine>
          <MathLine>H = ({fmt(orthocenter[0])}, {fmt(orthocenter[1])})</MathLine>
        </>
      ),
    },
    {
      title: "Nine-point circle",
      body: (
        <>
          <MathNote>Center (N) is the midpoint of the orthocenter (H) and circumcenter (O)</MathNote>
          <MathLine>N = (H + O) / 2</MathLine>
          <MathLine>N = (({fmt(orthocenter[0])} + {fmt(circumcenter[0])})/2, ({fmt(orthocenter[1])} + {fmt(circumcenter[1])})/2)</MathLine>
          <MathLine>N = ({fmt(ninePointCenter[0])}, {fmt(ninePointCenter[1])})</MathLine>
          <MathNote>Radius is exactly half the circumradius (R)</MathNote>
          <MathLine>rₙ = R / 2 = {fmt(circumradius)} / 2 = {fmt(ninePointRadius)}</MathLine>
        </>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-foreground">
          {index ? `Solution ${index}` : "Solution"} <span className="text-sm font-normal text-muted-foreground">— {sol.caseName}</span>
        </h3>
        <div className="text-xs text-muted-foreground">
          {sidesKind} · {anglesKind}
        </div>
      </div>

      <TriangleDiagram
        a={a} b={b} c={c} A={A} B={B} C={C} unit={unit}
        centroid={centroid}
        incenter={incenter}
        circumcenter={circumcenter}
        inradius={inradius}
        circumradius={circumradius}
        ninePointCenter={ninePointCenter}
        ninePointRadius={ninePointRadius}
        vertices={sol.vertices ?? null}
      />

      <CalcSection title="Answer">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat label="a" value={fmt(a)} />
          <Stat label="b" value={fmt(b)} />
          <Stat label="c" value={fmt(c)} />
          <Stat label="A" value={angleFmt(A)} />
          <Stat label="B" value={angleFmt(B)} />
          <Stat label="C" value={angleFmt(C)} />
          <Stat label="Perimeter" value={fmt(P)} />
          <Stat label="Semi-perimeter" value={fmt(s)} />
          <Stat label="Area (Heron)" value={fmt(area)} />
          <Stat label="Area (½·ab·sinC)" value={fmt(areaSAS)} />
          <Stat label="Inradius r" value={fmt(inradius)} />
          <Stat label="Circumradius R" value={fmt(circumradius)} />
          <Stat label="Median mₐ" value={fmt(mA)} />
          <Stat label="Median m_b" value={fmt(mB)} />
          <Stat label="Median m_c" value={fmt(mC)} />
          <Stat label="Altitude hₐ" value={fmt(hA)} />
          <Stat label="Altitude h_b" value={fmt(hB)} />
          <Stat label="Altitude h_c" value={fmt(hC)} />
          <Stat label="Bisector tₐ" value={fmt(tA)} />
          <Stat label="Bisector t_b" value={fmt(tB)} />
          <Stat label="Bisector t_c" value={fmt(tC)} />
          <Stat label="Centroid (G)" value={`(${fmt(centroid[0])}, ${fmt(centroid[1])})`} />
          <Stat label="Incenter (I)" value={`(${fmt(incenter[0])}, ${fmt(incenter[1])})`} />
          <Stat label="Orthocenter (H)" value={`(${fmt(orthocenter[0])}, ${fmt(orthocenter[1])})`} />
          <Stat label="Nine-point circle" value={`center (${fmt(ninePointCenter[0])}, ${fmt(ninePointCenter[1])}), r = ${fmt(ninePointRadius)}`} />
        </div>
      </CalcSection>

      <StepsToggle>
        {extraSteps.map((st, i) => (
          <CalcSection key={i} title={st.title}>
            <FormulaBlock>
              <div className="font-sans text-[15px] leading-relaxed text-foreground">
                {st.body}
              </div>
            </FormulaBlock>
          </CalcSection>
        ))}
      </StepsToggle>

      <ScaleFactor a={a} b={b} c={c} area={area} P={P} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-secondary/20 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-serif italic text-sm tabular-nums text-foreground">{value}</div>
    </div>
  );
}

/* ================= Similarity / congruence checker ================= */

type TriMode = "sides" | "angles";

interface SimResult {
  relation: "similar" | "congruent" | "none";
  criteria: string[];
  scale?: number;
}

function checkSimilarityCongruence(
  t1: { mode: TriMode; v: [number, number, number] },
  t2: { mode: TriMode; v: [number, number, number] }
): SimResult {
  const TOL = 1e-3;
  const criteria: string[] = [];
  let isSimilar = false;
  let isCongruent = false;
  let scale: number | undefined;

  // Angle sets, sorted ascending, if available (derived or given).
  const anglesOf = (t: { mode: TriMode; v: [number, number, number] }) =>
    t.mode === "angles" ? [...t.v].sort((a, b) => a - b) : null;
  const sidesOf = (t: { mode: TriMode; v: [number, number, number] }) =>
    t.mode === "sides" ? [...t.v].sort((a, b) => a - b) : null;

  const a1 = anglesOf(t1), a2 = anglesOf(t2);
  const s1 = sidesOf(t1), s2 = sidesOf(t2);

  // AA (equivalently AAA since angles sum to 180): compare sorted angle triples.
  if (a1 && a2) {
    const match = a1.every((v, i) => Math.abs(v - a2[i]) < TOL);
    if (match) {
      isSimilar = true;
      criteria.push("AA (equal angles)");
    }
  }

  // SSS similarity: sorted side ratios all equal.
  if (s1 && s2) {
    const ratios = s1.map((v, i) => v / s2[i]);
    const sssRatioMatch = ratios.every((r) => Math.abs(r - ratios[0]) < TOL);
    if (sssRatioMatch) {
      isSimilar = true;
      criteria.push("SSS (proportional sides)");
      scale = ratios[0];
      const congruentMatch = Math.abs(ratios[0] - 1) < TOL;
      if (congruentMatch) {
        isCongruent = true;
        criteria.push("SSS (equal sides)");
      }
    }
  }

  // For SAS / ASA / AAS / HL we need one triangle with sides and one with sides,
  // or a mixed comparison isn't well defined from raw sides/angles alone without
  // correspondence — so these criteria only apply when both triangles are given
  // as sides (SAS/SSS/HL numerically reduce to SSS check above already covers SAS
  // implicitly via full side match). We additionally test HL for right triangles
  // when both are given as sides.
  if (s1 && s2) {
    const isRight = (sides: number[]) => {
      const [x, y, z] = sides; // ascending, z is largest = hypotenuse candidate
      return Math.abs(x * x + y * y - z * z) < TOL * Math.max(1, z * z) * 10;
    };
    if (isRight(s1) && isRight(s2)) {
      const hyp1 = s1[2], hyp2 = s2[2];
      const leg1 = s1[1], leg2 = s2[1];
      const hlRatio = hyp1 / hyp2;
      const legRatio = leg1 / leg2;
      if (Math.abs(hlRatio - legRatio) < TOL) {
        isSimilar = true;
        if (!criteria.includes("HL")) criteria.push("HL (right triangles, hypotenuse & leg proportional)");
        if (Math.abs(hlRatio - 1) < TOL) {
          isCongruent = true;
        }
      }
    }
  }

  // If both given as angles only (no sides), congruence cannot be established —
  // angles alone never fix size, only shape.
  if (a1 && a2 && !s1 && !s2) {
    // AA already handled above for similarity; congruence impossible from angles alone.
  }

  // ASA / AAS require one angle triangle and one side triangle isn't comparable here
  // since inputs must correspond directly; when both are "angles" mode we can only
  // assess similarity (AA). When both are "sides" we assess SSS/HL above.
  // Note: true ASA/AAS/SAS congruence checks require matched side+angle correspondence,
  // which this simplified two-triangle-by-sides-or-angles input doesn't fully capture
  // beyond the SSS/HL/AA cases already covered.

  let relation: SimResult["relation"] = "none";
  if (isCongruent) relation = "congruent";
  else if (isSimilar) relation = "similar";

  return { relation, criteria: Array.from(new Set(criteria)), scale };
}

function SimilarityChecker() {
  const [mode1, setMode1] = useState<TriMode>("sides");
  const [mode2, setMode2] = useState<TriMode>("sides");
  const [t1a, setT1a] = useState("3");
  const [t1b, setT1b] = useState("4");
  const [t1c, setT1c] = useState("5");
  const [t2a, setT2a] = useState("6");
  const [t2b, setT2b] = useState("8");
  const [t2c, setT2c] = useState("10");

  const parse = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : NaN;
  };

  const result = useMemo(() => {
    const v1: [number, number, number] = [parse(t1a), parse(t1b), parse(t1c)];
    const v2: [number, number, number] = [parse(t2a), parse(t2b), parse(t2c)];
    if (v1.some((v) => !Number.isFinite(v)) || v2.some((v) => !Number.isFinite(v))) return null;
    if (mode1 === "angles" && v1[0] + v1[1] + v1[2] - 180 > 0.5) return null;
    if (mode2 === "angles" && v2[0] + v2[1] + v2[2] - 180 > 0.5) return null;
    try {
      return checkSimilarityCongruence({ mode: mode1, v: v1 }, { mode: mode2, v: v2 });
    } catch {
      return null;
    }
  }, [mode1, mode2, t1a, t1b, t1c, t2a, t2b, t2c]);

  const ModeToggle = ({ value, onChange }: { value: TriMode; onChange: (m: TriMode) => void }) => (
    <div className="inline-flex overflow-hidden rounded-full border border-border">
      {(["sides", "angles"] as TriMode[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={
            "px-3 py-1 text-xs " +
            (value === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")
          }
        >
          {m === "sides" ? "3 sides" : "3 angles (°)"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="font-display text-sm font-semibold text-foreground">Triangle 1</h4>
          <ModeToggle value={mode1} onChange={setMode1} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label={mode1 === "sides" ? "Side 1" : "Angle 1"}><TextInput inputMode="decimal" value={t1a} onChange={(e) => setT1a(e.target.value)} /></Field>
          <Field label={mode1 === "sides" ? "Side 2" : "Angle 2"}><TextInput inputMode="decimal" value={t1b} onChange={(e) => setT1b(e.target.value)} /></Field>
          <Field label={mode1 === "sides" ? "Side 3" : "Angle 3"}><TextInput inputMode="decimal" value={t1c} onChange={(e) => setT1c(e.target.value)} /></Field>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="font-display text-sm font-semibold text-foreground">Triangle 2</h4>
          <ModeToggle value={mode2} onChange={setMode2} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label={mode2 === "sides" ? "Side 1" : "Angle 1"}><TextInput inputMode="decimal" value={t2a} onChange={(e) => setT2a(e.target.value)} /></Field>
          <Field label={mode2 === "sides" ? "Side 2" : "Angle 2"}><TextInput inputMode="decimal" value={t2b} onChange={(e) => setT2b(e.target.value)} /></Field>
          <Field label={mode2 === "sides" ? "Side 3" : "Angle 3"}><TextInput inputMode="decimal" value={t2c} onChange={(e) => setT2c(e.target.value)} /></Field>
        </div>
      </div>

      <div className="sm:col-span-2">
        {result === null ? (
          <div className="rounded-xl border border-border/50 bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
            Enter valid positive values (and angles summing to 180° if using angle mode) for both triangles.
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-secondary/20 px-3 py-2 text-sm">
            {result.relation === "congruent" && (
              <div className="text-foreground">
                <strong>Congruent</strong> — same shape and size.{" "}
                {result.criteria.length > 0 && <>Criterion: {result.criteria.join(", ")}.</>}
              </div>
            )}
            {result.relation === "similar" && (
              <div className="text-foreground">
                <strong>Similar</strong> (not congruent) — same shape, different size.{" "}
                {result.criteria.length > 0 && <>Criterion: {result.criteria.join(", ")}.</>}{" "}
                {result.scale !== undefined && (
                  <>Scale factor (triangle 1 → triangle 2): {fmt(1 / result.scale)}. (Triangle 2 → triangle 1: {fmt(result.scale)}.)</>
                )}
              </div>
            )}
            {result.relation === "none" && (
              <div className="text-muted-foreground">
                No similarity or congruence criterion is satisfied with the given values.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Scale factor tool ================= */

function ScaleFactor({ a, b, c, area, P }: { a: number; b: number; c: number; area: number; P: number }) {
  const [k, setK] = useState("2");
  const kNum = Number(k);
  const valid = Number.isFinite(kNum) && kNum > 0;
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Similar triangle by scale factor
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Scale factor k">
          <TextInput
            inputMode="decimal"
            value={k}
            onChange={(e) => setK(e.target.value)}
            placeholder="e.g. 2 (double), 0.5 (half)"
          />
        </Field>
      </div>
      {valid && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <Stat label={`a × k`} value={fmt(a * kNum)} />
          <Stat label={`b × k`} value={fmt(b * kNum)} />
          <Stat label={`c × k`} value={fmt(c * kNum)} />
          <Stat label="Perimeter × k" value={fmt(P * kNum)} />
          <Stat label="Area × k²" value={fmt(area * kNum * kNum)} />
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Similar triangles preserve angles; sides scale by k and area scales by k².
      </p>
    </div>
  );
}

/* ================= SVG diagram ================= */

function TriangleDiagram({
  a, b, c, A, B, C, unit, centroid, incenter, circumcenter, inradius, circumradius, ninePointCenter, ninePointRadius, vertices,
}: {
  a: number; b: number; c: number;
  A: number; B: number; C: number;
  unit: AngleUnit;
  centroid: [number, number];
  incenter: [number, number];
  circumcenter: [number, number];
  inradius: number;
  circumradius: number;
  ninePointCenter: [number, number];
  ninePointRadius: number;
  vertices: { A: [number, number]; B: [number, number]; C: [number, number] } | null;
}) {
  const [showIncircle, setShowIncircle] = useState(false);
  const [showCircumcircle, setShowCircumcircle] = useState(false);
  const [showNinePoint, setShowNinePoint] = useState(false);

  // If we have real vertices (coord mode), use them; else place A=(0,0), B=(c,0), C=(b cosA, b sinA).
  const Ax = vertices ? vertices.A[0] : 0;
  const Ay = vertices ? vertices.A[1] : 0;
  const Bx = vertices ? vertices.B[0] : c;
  const By = vertices ? vertices.B[1] : 0;
  const Cx = vertices ? vertices.C[0] : b * Math.cos(A);
  const Cy = vertices ? vertices.C[1] : b * Math.sin(A);

  // Include circumcircle in bounds when it's toggled on so it stays inside the frame.
  const xs = [Ax, Bx, Cx];
  const ys = [Ay, By, Cy];
  if (showCircumcircle) {
    xs.push(circumcenter[0] - circumradius, circumcenter[0] + circumradius);
    ys.push(circumcenter[1] - circumradius, circumcenter[1] + circumradius);
  }
  if (showNinePoint) {
    xs.push(ninePointCenter[0] - ninePointRadius, ninePointCenter[0] + ninePointRadius);
    ys.push(ninePointCenter[1] - ninePointRadius, ninePointCenter[1] + ninePointRadius);
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(1e-6, maxX - minX);
  const h = Math.max(1e-6, maxY - minY);

  const W = 460, H = 300, pad = 42;
  const scale = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
  const ox = pad - minX * scale;
  const oy = H - pad + minY * scale;

  const tx = (x: number) => ox + x * scale;
  const ty = (y: number) => oy - y * scale;

  const pAx = tx(Ax), pAy = ty(Ay);
  const pBx = tx(Bx), pBy = ty(By);
  const pCx = tx(Cx), pCy = ty(Cy);

  const gx = (pAx + pBx + pCx) / 3, gy = (pAy + pBy + pCy) / 3;

  const midAndOffset = (p1: [number, number], p2: [number, number], opp: [number, number]) => {
    const mx = (p1[0] + p2[0]) / 2;
    const my = (p1[1] + p2[1]) / 2;
    const dx = mx - opp[0], dy = my - opp[1];
    const len = Math.hypot(dx, dy) || 1;
    return [mx + (dx / len) * 16, my + (dy / len) * 16];
  };

  const [labAx, labAy] = midAndOffset([pBx, pBy], [pCx, pCy], [pAx, pAy]);
  const [labBx, labBy] = midAndOffset([pAx, pAy], [pCx, pCy], [pBx, pBy]);
  const [labCx, labCy] = midAndOffset([pAx, pAy], [pBx, pBy], [pCx, pCy]);

  const nudge = (px: number, py: number, out: number) => {
    const dx = px - gx, dy = py - gy;
    const len = Math.hypot(dx, dy) || 1;
    return [px + (dx / len) * out, py + (dy / len) * out];
  };
  const [nAx, nAy] = nudge(pAx, pAy, 18);
  const [nBx, nBy] = nudge(pBx, pBy, 18);
  const [nCx, nCy] = nudge(pCx, pCy, 18);

  const angDisplay = (r: number) =>
    unit === "deg" ? `${fmt((r * 180) / Math.PI)}°` : `${fmt(r, 4)} rad`;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="uppercase tracking-[0.14em]">Overlays:</span>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showIncircle}
            onChange={(e) => setShowIncircle(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          <span className="inline-block h-2 w-4 rounded-full border border-primary/70 bg-primary/10" />
          Incircle (r = {fmt(inradius)})
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showCircumcircle}
            onChange={(e) => setShowCircumcircle(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          <span className="inline-block h-2 w-4 rounded-full border border-foreground/60" />
          Circumcircle (R = {fmt(circumradius)})
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showNinePoint}
            onChange={(e) => setShowNinePoint(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          <span className="inline-block h-2 w-4 rounded-full border border-dashed border-muted-foreground/70" />
          Nine-point circle (r = {fmt(ninePointRadius)})
        </label>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-lg" role="img" aria-label="Triangle diagram with labeled vertices, sides, angles, and optional incircle and circumcircle overlays">
          {showCircumcircle && (
            <>
              <circle
                cx={tx(circumcenter[0])}
                cy={ty(circumcenter[1])}
                r={circumradius * scale}
                fill="none"
                className="stroke-foreground/70"
                strokeWidth={1.25}
                strokeDasharray="4 3"
              />
              <circle cx={tx(circumcenter[0])} cy={ty(circumcenter[1])} r={3} className="fill-foreground/70" />
              <text
                x={tx(circumcenter[0]) + 8}
                y={ty(circumcenter[1]) - 6}
                className="fill-muted-foreground text-[11px]"
              >
                O
              </text>
            </>
          )}
          <polygon
            points={`${pAx},${pAy} ${pBx},${pBy} ${pCx},${pCy}`}
            className="fill-primary/15 stroke-primary"
            strokeWidth={2}
          />
          {showNinePoint && (
            <>
              <circle
                cx={tx(ninePointCenter[0])}
                cy={ty(ninePointCenter[1])}
                r={ninePointRadius * scale}
                fill="none"
                className="stroke-muted-foreground/70"
                strokeWidth={1.25}
                strokeDasharray="2 4"
              />
              <circle cx={tx(ninePointCenter[0])} cy={ty(ninePointCenter[1])} r={3} className="fill-muted-foreground/70" />
              <text
                x={tx(ninePointCenter[0]) + 8}
                y={ty(ninePointCenter[1]) - 6}
                className="fill-muted-foreground text-[11px]"
              >
                N
              </text>
            </>
          )}
          {showIncircle && (
            <>
              <circle
                cx={tx(incenter[0])}
                cy={ty(incenter[1])}
                r={inradius * scale}
                fill="none"
                className="stroke-primary/80"
                strokeWidth={1.25}
                strokeDasharray="3 3"
              />
              <circle cx={tx(incenter[0])} cy={ty(incenter[1])} r={3} className="fill-primary" />
              <text
                x={tx(incenter[0]) + 8}
                y={ty(incenter[1]) - 6}
                className="fill-muted-foreground text-[11px]"
              >
                I
              </text>
            </>
          )}
          {[[pAx, pAy], [pBx, pBy], [pCx, pCy]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3} className="fill-foreground" />
          ))}
          <text x={nAx} y={nAy} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">A</text>
          <text x={nAx} y={nAy + 13} textAnchor="middle" className="fill-muted-foreground text-[11px]">{angDisplay(A)}</text>
          <text x={nBx} y={nBy} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">B</text>
          <text x={nBx} y={nBy + 13} textAnchor="middle" className="fill-muted-foreground text-[11px]">{angDisplay(B)}</text>
          <text x={nCx} y={nCy} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">C</text>
          <text x={nCx} y={nCy + 13} textAnchor="middle" className="fill-muted-foreground text-[11px]">{angDisplay(C)}</text>
          <text x={labAx} y={labAy} textAnchor="middle" className="fill-foreground text-[12px]">a = {fmt(a)}</text>
          <text x={labBx} y={labBy} textAnchor="middle" className="fill-foreground text-[12px]">b = {fmt(b)}</text>
          <text x={labCx} y={labCy} textAnchor="middle" className="fill-foreground text-[12px]">c = {fmt(c)}</text>
          <circle cx={tx(centroid[0])} cy={ty(centroid[1])} r={4} className="fill-primary" />
          <text
            x={tx(centroid[0]) + 8}
            y={ty(centroid[1]) - 6}
            className="fill-muted-foreground text-[11px]"
          >
            G ({fmt(centroid[0])}, {fmt(centroid[1])})
          </text>
        </svg>
      </div>
    </div>
  );
}


/* ================= Educational content ================= */

function TriangleEducation() {
  return (
    <>
      <CalcSection title="What is a triangle solver?">
        <p>
          A triangle solver takes any three known facts about a triangle — sides, angles, or a mix
          — and finds the missing three. That is the classic geometry problem: once you know just
          enough, every other measurement in the triangle is locked in. This calculator handles
          all five solvable cases (SSS, SAS, ASA, AAS, SSA), the tricky ambiguous SSA case where
          two different triangles can fit the same numbers, plus coordinate geometry and a fast
          Pythagorean path for right triangles.
        </p>
        <p>
          Triangles matter far beyond the classroom. Roof pitches, ramps, staircases, bridges,
          antenna towers, camera tripods, sail plans and even game engines all rely on the same
          three rules underneath — the Law of Sines, the Law of Cosines, and the sum of angles
          being 180°. Get comfortable with those three and you can rebuild every triangle formula
          from scratch.
        </p>
        <p>
          To use the solver, pick the mode that matches what you know, type the values, and read
          the results. Angles can be entered in degrees or radians. The step-by-step panel shows
          exactly which rule was applied, so you can use it as a study tool as well as an answer
          key.
        </p>
      </CalcSection>

      <CalcSection title="Triangle solving methods explained, case by case">
        <p className="text-sm text-muted-foreground">
          For every solving case below you'll see a plain-English explanation, the formula (with what
          each letter means), a diagram showing which parts are known, and a worked example — all in
          one place.
        </p>
        <div className="mt-4 space-y-5">
          {TRIANGLE_GUIDE.map((g) => (
            <div
              key={g.title}
              className="rounded-2xl border border-border/60 bg-background/40 p-4 sm:p-5"
            >
              <h3 className="mb-3 font-display text-lg font-semibold text-foreground">
                {g.title}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 text-foreground md:col-start-1 md:row-start-1">
                  <p className="text-[15px] leading-relaxed">{g.explain}</p>
                  <FormulaWithLegend formula={g.formula} legend={g.legend} />
                </div>
                <div className="md:col-start-2 md:row-start-1">
                  {g.diagram}
                </div>
                <div className="md:col-span-2 md:row-start-2">
                  <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Example
                    </div>
                    <div className="space-y-2 text-foreground">
                      <div>
                        <div className="text-[12px] text-muted-foreground">Given</div>
                        <FormulaBlock>{g.example.given}</FormulaBlock>
                      </div>
                      <div>
                        <div className="text-[12px] text-muted-foreground">Substitute</div>
                        <FormulaBlock>{g.example.substitute}</FormulaBlock>
                      </div>
                      <div>
                        <div className="text-[12px] text-muted-foreground">Answer</div>
                        <FormulaBlock>{g.example.answer}</FormulaBlock>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CalcSection>




      <CalcSection title="Types of triangles">
        <p><strong>By sides:</strong></p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Equilateral</strong> — all three sides equal (all angles 60°).</li>
          <li><strong>Isosceles</strong> — exactly two sides equal (base angles equal).</li>
          <li><strong>Scalene</strong> — no sides equal.</li>
        </ul>
        <p className="mt-2"><strong>By angles:</strong></p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Right</strong> — one angle equals 90°.</li>
          <li><strong>Obtuse</strong> — one angle greater than 90°.</li>
          <li><strong>Acute</strong> — all three angles less than 90°.</li>
        </ul>
      </CalcSection>

      <CalcSection title="Special right triangles">
        <ReferenceTable
          headers={["Triangle", "Angles", "Side ratio", "Notes"]}
          rows={[
            ["30-60-90", "30°, 60°, 90°", "1 : √3 : 2", "Half of an equilateral triangle."],
            ["45-45-90", "45°, 45°, 90°", "1 : 1 : √2", "Isosceles right triangle — the diagonal of a square."],
          ]}
        />
        <p>Use the "30-60-90 preset" or "45-45-90 preset" buttons above the input grid to auto-fill these.</p>
      </CalcSection>

      <CalcSection title="Cevians and radii — quick reference">
        <FormulaBlock>Median from A: mₐ = ½·√(2b² + 2c² − a²)</FormulaBlock>
        <FormulaBlock>Altitude from A: hₐ = 2·Area / a</FormulaBlock>
        <FormulaBlock>Angle bisector from A: tₐ = 2·√(bc·s·(s−a)) / (b+c)</FormulaBlock>
        <FormulaBlock>Inradius: r = Area / s</FormulaBlock>
        <FormulaBlock>Circumradius: R = a / (2·sin A) = abc / (4·Area)</FormulaBlock>
      </CalcSection>

      <CalcSection title="Triangle centers">
        <p>
          Every triangle has several distinguished points that stay meaningful
          no matter how you rotate, translate or scale it. This calculator
          reports four of them: the centroid, incenter, circumcenter and
          orthocenter.
        </p>
        <p>
          <strong>Centroid (G)</strong> — the average of the three vertices,
          G = (A + B + C) / 3. It's where the three medians meet and is the
          triangle's balance point: cut the triangle from card and it will
          balance on a pin placed at G.
        </p>
        <p>
          <strong>Incenter (I)</strong> — the intersection of the three
          angle bisectors, and the center of the inscribed circle (the
          incircle) that just touches all three sides. In coordinates it is
          the weighted average I = (a·A + b·B + c·C) / (a + b + c), where the
          weights are the lengths of the sides opposite each vertex. The
          incircle has radius r = Area / s.
        </p>
        <p>
          <strong>Circumcenter (O)</strong> — the intersection of the three
          perpendicular bisectors of the sides, and the center of the
          circumscribed circle (the circumcircle) that passes through all
          three vertices. Its radius is R = a / (2·sin A). For an acute
          triangle O lies inside; for a right triangle it sits exactly on the
          midpoint of the hypotenuse; for an obtuse triangle it lies outside.
        </p>
        <p>
          <strong>Orthocenter (H)</strong> — the intersection of the three
          altitudes (the perpendiculars dropped from each vertex to the
          opposite side). It's inside acute triangles, at the right-angle
          vertex of a right triangle, and outside obtuse triangles.
        </p>
        <p>
          G, O and H are always collinear on a single line called the{" "}
          <em>Euler line</em>, and G divides the segment OH in the ratio
          1 : 2 — equivalently, H = 3G − 2O, which is exactly how the
          orthocenter is derived here from the centroid and circumcenter.
        </p>
        <p>
          <strong>Nine-point circle (N)</strong> — a fifth remarkable circle that
          passes through the midpoint of each side, the foot of each altitude, and
          the midpoint of each segment from a vertex to the orthocenter (nine points
          in total). Its center N is the midpoint of O and H (also on the Euler
          line), and its radius is always half the circumradius, R/2. Toggle it on
          in the diagram above.
        </p>
      </CalcSection>



      <CalcSection title="Similarity / congruence checker">
        <p className="text-sm text-muted-foreground">
          Compare two triangles to see if they're similar (same shape) or congruent
          (same shape and size). Enter each triangle as either its three sides or its
          three angles.
        </p>
        <div className="mt-4">
          <SimilarityChecker />
        </div>
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Three modes — General solver (SSS/SAS/ASA/AAS/SSA), Coordinates (three (x,y) vertices), and Right triangle (any 2 of legs a, b or hypotenuse c).",
            "Detects the ambiguous SSA case and returns both triangles when they exist.",
            "Live labeled SVG diagram drawn roughly to scale for a fast sanity check.",
            "Area computed two ways — Heron's formula and ½·a·b·sinC — as an automatic cross-check.",
            "Every classical cevian: three medians, three altitudes (hₐ = 2·Area/a), and three angle bisector lengths.",
            "Inradius (Area / s), circumradius (a / 2·sinA) and — in Coordinates mode — the centroid ((x₁+x₂+x₃)/3, (y₁+y₂+y₃)/3).",
            "Quick-fill presets for the classic 30-60-90 and 45-45-90 right triangles.",
            "Similar-triangle scale-factor tool: enter k and get the scaled sides, perimeter (×k) and area (×k²).",
            "Optional nine-point circle overlay — center N = midpoint(H, O), radius R/2.",
            "Similarity / congruence checker — tests AA, SAS, SSS (similarity) and SSS, SAS, ASA, AAS, HL (congruence) between two triangles you enter by sides or angles.",
            "Angle inputs and outputs in degrees or radians via a toggle.",
            "Show/hide step-by-step working with the specific law used, substitutions and running totals.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ items={FAQ_ITEMS.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))} />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/area-calculator", label: "Area Calculator" },
            { to: "/calculators/math", label: "All Math Calculators" },
            { to: "/calculators/math/root-calculator", label: "Square Root Calculator" },
          ]}
        />
      </CalcSection>
    </>
  );
}

/* ================= Method-guide diagrams & data ================= */

function TriCard({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

/** Draw a labelled triangle. `known` marks which parts are the given inputs. */
function MiniTriangle({
  knownSides = [],
  knownAngles = [],
  rightAt,
  vertexLabels = ["A", "B", "C"],
}: {
  knownSides?: ("a" | "b" | "c")[];
  knownAngles?: ("A" | "B" | "C")[];
  rightAt?: "A" | "B" | "C";
  vertexLabels?: [string, string, string];
}) {
  // Fixed vertex positions: A(30,140), B(190,140), C(115,25) — scalene-ish
  const A = { x: 30, y: 140 };
  const B = { x: 190, y: 140 };
  const C = { x: 115, y: 25 };
  const sideCls = (id: "a" | "b" | "c") =>
    knownSides.includes(id) ? "stroke-primary" : "stroke-border";
  const sideW = (id: "a" | "b" | "c") =>
    knownSides.includes(id) ? 2.5 : 1.5;
  const angArc = (id: "A" | "B" | "C") =>
    knownAngles.includes(id) ? "stroke-primary" : "stroke-muted-foreground";

  return (
    <TriCard label="Known parts highlighted">
      <svg viewBox="0 0 220 170" className="h-auto w-full" role="img" aria-label="Triangle with known sides and angles highlighted">
        {/* sides: a=BC, b=CA, c=AB */}
        <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} className={sideCls("a")} strokeWidth={sideW("a")} />
        <line x1={C.x} y1={C.y} x2={A.x} y2={A.y} className={sideCls("b")} strokeWidth={sideW("b")} />
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} className={sideCls("c")} strokeWidth={sideW("c")} />
        {/* small angle arcs */}
        <path d={`M ${A.x + 14} ${A.y} A 14 14 0 0 0 ${A.x + 13} ${A.y - 6}`} className={`fill-transparent ${angArc("A")}`} />
        <path d={`M ${B.x - 14} ${B.y} A 14 14 0 0 1 ${B.x - 13} ${B.y - 6}`} className={`fill-transparent ${angArc("B")}`} />
        <path d={`M ${C.x - 6} ${C.y + 14} A 14 14 0 0 0 ${C.x + 6} ${C.y + 14}`} className={`fill-transparent ${angArc("C")}`} />
        {/* right-angle square */}
        {rightAt && (() => {
          const V = rightAt === "A" ? A : rightAt === "B" ? B : C;
          const dx = rightAt === "A" ? 10 : rightAt === "B" ? -10 : 0;
          const dy = rightAt === "C" ? 10 : -10;
          return (
            <rect
              x={V.x + (dx < 0 ? dx : 0)}
              y={V.y + (dy < 0 ? dy : 0)}
              width="10"
              height="10"
              className="fill-transparent stroke-primary"
            />
          );
        })()}
        {/* side labels */}
        <text x="155" y="90" className={`text-[11px] ${knownSides.includes("a") ? "fill-primary font-semibold" : "fill-muted-foreground"}`}>a</text>
        <text x="60" y="90" className={`text-[11px] ${knownSides.includes("b") ? "fill-primary font-semibold" : "fill-muted-foreground"}`}>b</text>
        <text x="105" y="155" className={`text-[11px] ${knownSides.includes("c") ? "fill-primary font-semibold" : "fill-muted-foreground"}`}>c</text>
        {/* vertex labels */}
        <text x={A.x - 12} y={A.y + 12} className="fill-foreground text-[11px] font-semibold">{vertexLabels[0]}</text>
        <text x={B.x + 4} y={B.y + 12} className="fill-foreground text-[11px] font-semibold">{vertexLabels[1]}</text>
        <text x={C.x - 4} y={C.y - 6} className="fill-foreground text-[11px] font-semibold">{vertexLabels[2]}</text>
      </svg>
    </TriCard>
  );
}

function DiagCoords() {
  return (
    <TriCard label="Triangle from three (x, y) vertices">
      <svg viewBox="0 0 220 170" className="h-auto w-full" role="img" aria-label="Triangle plotted from three (x, y) vertex coordinates">
        <line x1="15" y1="150" x2="210" y2="150" className="stroke-border" />
        <line x1="15" y1="10" x2="15" y2="150" className="stroke-border" />
        {/* A(0,0)=15,150; B(6,0)=135,150; C(2,4)=55,70 (scale 20 px/unit) */}
        <polygon points="15,150 135,150 55,70" className="fill-primary/10 stroke-primary" strokeWidth="2" />
        <circle cx="15" cy="150" r="3.5" className="fill-primary" />
        <circle cx="135" cy="150" r="3.5" className="fill-primary" />
        <circle cx="55" cy="70" r="3.5" className="fill-primary" />
        <text x="0" y="165" className="fill-foreground text-[11px]">A(0,0)</text>
        <text x="120" y="165" className="fill-foreground text-[11px]">B(6,0)</text>
        <text x="55" y="62" className="fill-foreground text-[11px]">C(2,4)</text>
        {/* centroid */}
        <circle cx="68" cy="123" r="3" className="fill-foreground" />
        <text x="73" y="128" className="fill-muted-foreground text-[10px]">G</text>
      </svg>
    </TriCard>
  );
}

const LEG_SSS = [
  { sym: "a, b, c", def: "the three side lengths" },
  { sym: "A", def: "angle opposite side a" },
];
const LEG_SAS = [
  { sym: "a, b", def: "the two given sides" },
  { sym: "C", def: "included angle (between a and b)" },
  { sym: "c", def: "side opposite C" },
];
const LEG_ASA = [
  { sym: "A, B", def: "the two given angles" },
  { sym: "c", def: "included side (between A and B)" },
  { sym: "a, b", def: "the missing sides" },
];
const LEG_AAS = [
  { sym: "A, B", def: "two given angles" },
  { sym: "a", def: "side opposite one of them" },
  { sym: "C", def: "third angle = 180° − A − B" },
];
const LEG_SSA = [
  { sym: "a, b", def: "two given sides" },
  { sym: "A", def: "angle opposite a (not between the sides)" },
];
const LEG_RT = [
  { sym: "a, b", def: "the two legs" },
  { sym: "c", def: "hypotenuse (opposite the right angle)" },
];
const LEG_COORD = [
  { sym: "(xᵢ, yᵢ)", def: "the three vertex coordinates" },
  { sym: "Area", def: "signed Shoelace area, taken absolute" },
  { sym: "G", def: "centroid — average of the three vertices" },
];

type TriGuide = {
  title: string;
  explain: ReactNode;
  formula: ReactNode;
  legend: { sym: ReactNode; def: ReactNode }[];
  diagram: ReactNode;
  example: { given: ReactNode; substitute: ReactNode; answer: ReactNode };
};

const TRIANGLE_GUIDE: TriGuide[] = [
  {
    title: "SSS — three sides",
    explain:
      "When you know all three sides, the triangle is fully fixed (as long as the triangle inequality holds: any two sides sum to more than the third). Use the Law of Cosines rearranged to solve for each angle in turn.",
    formula: "cos A = (b² + c² − a²) / (2·b·c)",
    legend: LEG_SSS,
    diagram: <MiniTriangle knownSides={["a", "b", "c"]} />,
    example: {
      given: "a = 7, b = 8, c = 9",
      substitute: "cos A = (64 + 81 − 49) / (2·8·9) = 96/144",
      answer: "A ≈ 48.19°, B ≈ 58.41°, C ≈ 73.40°",
    },
  },
  {
    title: "SAS — two sides and the included angle",
    explain:
      "Given two sides and the angle between them, the Law of Cosines gives the third side directly. From there the Law of Sines finds the remaining angles.",
    formula: "c² = a² + b² − 2·a·b·cos C",
    legend: LEG_SAS,
    diagram: <MiniTriangle knownSides={["a", "b"]} knownAngles={["C"]} />,
    example: {
      given: "a = 5, b = 7, C = 45°",
      substitute: "c² = 25 + 49 − 70·cos 45° = 74 − 49.497",
      answer: "c ≈ 4.9497, A ≈ 45.60°, B ≈ 89.40°",
    },
  },
  {
    title: "ASA — two angles and the included side",
    explain:
      "Two angles determine the third (they sum to 180°), and the given side is between them. The Law of Sines then scales the two missing sides.",
    formula: "a / sin A = b / sin B = c / sin C",
    legend: LEG_ASA,
    diagram: <MiniTriangle knownSides={["c"]} knownAngles={["A", "B"]} />,
    example: {
      given: "A = 40°, B = 60°, c = 10",
      substitute: "C = 80°; a = 10·sin 40° / sin 80°",
      answer: "a ≈ 6.527, b ≈ 8.794, C = 80°",
    },
  },
  {
    title: "AAS — two angles and a non-included side",
    explain:
      "Same tool as ASA — the third angle is 180° − A − B, then apply the Law of Sines. The difference is only that the given side is opposite one of the given angles, not between them.",
    formula: "a / sin A = b / sin B = c / sin C",
    legend: LEG_AAS,
    diagram: <MiniTriangle knownSides={["a"]} knownAngles={["A", "B"]} />,
    example: {
      given: "A = 30°, B = 45°, a = 6",
      substitute: "C = 105°; b = 6·sin 45° / sin 30°",
      answer: "b ≈ 8.485, c ≈ 11.591, C = 105°",
    },
  },
  {
    title: "SSA — the ambiguous case",
    explain:
      "Two sides and an angle not between them can leave 0, 1 or 2 valid triangles. The Law of Sines gives sin B = b·sin A / a; if that value exceeds 1, no triangle fits; if it equals 1, one right triangle fits; otherwise two candidate B values (B and 180° − B) must both be checked.",
    formula: "sin B = b · sin A / a",
    legend: LEG_SSA,
    diagram: <MiniTriangle knownSides={["a", "b"]} knownAngles={["A"]} />,
    example: {
      given: "a = 7, b = 9, A = 35°",
      substitute: "sin B = 9·sin 35° / 7 ≈ 0.7375 → B₁ ≈ 47.54° or B₂ ≈ 132.46°",
      answer: "Two triangles: c ≈ 12.10 or c ≈ 2.65",
    },
  },
  {
    title: "Right triangle (Pythagorean fast path)",
    explain:
      "If one angle is 90°, Pythagoras alone finds any missing side from the other two. The two acute angles come straight from the ratio of legs to the hypotenuse.",
    formula: "c² = a² + b²;   A = arctan(a / b)",
    legend: LEG_RT,
    diagram: <MiniTriangle knownSides={["a", "b"]} rightAt="C" />,
    example: {
      given: "legs a = 3, b = 4",
      substitute: "c = √(9 + 16) = √25;  A = arctan(3/4)",
      answer: "c = 5, A ≈ 36.87°, B ≈ 53.13°, C = 90°",
    },
  },
  {
    title: "Coordinates — triangle from three vertices",
    explain:
      "With three (x, y) points, side lengths come from the distance formula, area from the Shoelace formula, and the centroid is just the average of the vertices. Angles then follow via the Law of Cosines.",
    formula: "Area = ½ |x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)|",
    legend: LEG_COORD,
    diagram: <DiagCoords />,
    example: {
      given: "A(0, 0), B(6, 0), C(2, 4)",
      substitute: "Area = ½·|0(0−4) + 6(4−0) + 2(0−0)| = ½·24",
      answer: "Area = 12, centroid G ≈ (2.667, 1.333)",
    },
  },
];

/** Single master Show/Hide toggle that wraps all derivation sub-sections. */
function StepsToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        {open ? "Hide calculation steps" : "Show calculation steps"}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2 4l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && <div className="space-y-6">{children}</div>}
    </div>
  );
}


