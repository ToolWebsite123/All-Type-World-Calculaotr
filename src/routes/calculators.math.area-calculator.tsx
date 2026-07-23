import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { ReferenceTable } from "@/components/ReferenceTable";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  ErrorBox,
  CalcSection,
  FormulaWithLegend,
  StructuredExample,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  ResultBox,
  StackedMath,
} from "@/components/MathCalcPage";
import { type Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";

/** Centered display-math line used inside solution steps (slope/triangle style). */
function MathLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-1 text-center font-serif text-[15px] italic leading-relaxed text-foreground">
      <StackedMath>{children}</StackedMath>
    </div>
  );
}

/** Small left-aligned note between math lines. */
function MathNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 mb-1 text-sm not-italic text-muted-foreground">
      {children}
    </div>
  );
}


/* Shared variable legends — reused wherever a formula is shown so every
 * formula on this page comes with its symbol meanings. */
const LEG = {
  common: [
    { sym: "A", def: "area" },
    { sym: "P", def: "perimeter" },
  ],
  square: [
    { sym: "A", def: "area" },
    { sym: "s", def: "side length" },
  ],
  rectangle: [
    { sym: "A", def: "area" },
    { sym: "l", def: "length" },
    { sym: "w", def: "width" },
  ],
  triBH: [
    { sym: "A", def: "area" },
    { sym: "b", def: "base" },
    { sym: "h", def: "height (perpendicular to base)" },
  ],
  heron: [
    { sym: "A", def: "area" },
    { sym: "a, b, c", def: "the three side lengths" },
    { sym: "s", def: "semi-perimeter, (a + b + c) / 2" },
  ],
  trapezoid: [
    { sym: "A", def: "area" },
    { sym: "b₁, b₂", def: "the two parallel bases" },
    { sym: "h", def: "perpendicular distance between the bases" },
  ],
  parallelogram: [
    { sym: "A", def: "area" },
    { sym: "b", def: "base" },
    { sym: "h", def: "perpendicular height" },
  ],
  rhombusKite: [
    { sym: "A", def: "area" },
    { sym: "d₁, d₂", def: "the two diagonals" },
  ],
  circle: [
    { sym: "A", def: "area" },
    { sym: "r", def: "radius" },
    { sym: "π", def: "≈ 3.14159…" },
  ],
  semicircle: [
    { sym: "A", def: "area" },
    { sym: "r", def: "radius" },
  ],
  sector: [
    { sym: "A", def: "area" },
    { sym: "r", def: "radius" },
    { sym: "θ", def: "central angle in radians" },
  ],
  segment: [
    { sym: "A", def: "area" },
    { sym: "r", def: "radius" },
    { sym: "θ", def: "central angle in radians" },
    { sym: "sin θ", def: "sine of that angle" },
  ],
  ellipse: [
    { sym: "A", def: "area" },
    { sym: "a", def: "semi-major axis" },
    { sym: "b", def: "semi-minor axis" },
  ],
  polygon: [
    { sym: "A", def: "area" },
    { sym: "P", def: "perimeter" },
    { sym: "a", def: "apothem (centre-to-edge distance)" },
    { sym: "n", def: "number of sides" },
    { sym: "s", def: "side length" },
  ],
  shoelace: [
    { sym: "A", def: "area" },
    { sym: "(xᵢ, yᵢ)", def: "the i-th vertex, taken in order around the polygon" },
    { sym: "|…|", def: "absolute value (ignore sign)" },
  ],
  annulus: [
    { sym: "A", def: "area" },
    { sym: "R", def: "outer radius" },
    { sym: "r", def: "inner radius" },
  ],
  starPolygon: [
    { sym: "A", def: "area" },
    { sym: "n", def: "number of points (n ≥ 3)" },
    { sym: "R", def: "outer radius (centre to a point tip)" },
    { sym: "r", def: "inner radius (centre to an inner notch)" },
    { sym: "π", def: "≈ 3.14159…" },
  ],
};

type ShapeGuide = {
  shape: Shape;
  title: string;
  inputs: Record<string, string>;
  triMode?: "bh" | "sss";
  sectorUnit?: "deg" | "rad";
  segMode?: "chord" | "angle";
  coordText?: string;
  explain: React.ReactNode;
  formula: React.ReactNode;
  legend: { sym: React.ReactNode; def: React.ReactNode }[];
  example: { given: React.ReactNode; substitute: React.ReactNode; answer: React.ReactNode };
};

const SHAPE_GUIDE: ShapeGuide[] = [
  {
    shape: "square",
    title: "Square",
    inputs: { s: "5" },
    explain: "A square has four equal sides meeting at right angles. A = s² just multiplies the side by itself — the square is s wide and s tall, so it covers s × s unit tiles. Use it for square tiles, chessboards, or a square patio slab.",
    formula: "A = s²",
    legend: LEG.square,
    example: { given: "s = 5", substitute: "A = 5²", answer: "A = 25" },
  },
  {
    shape: "rectangle",
    title: "Rectangle",
    inputs: { l: "8", w: "5" },
    explain: "A rectangle has two pairs of equal, parallel sides and four right angles. A = l × w counts how many 1×1 tiles fit inside: length rows of width tiles. Handy for room floors, TV screens, garden beds, or a sheet of plywood.",
    formula: "A = l × w",
    legend: LEG.rectangle,
    example: { given: "l = 8, w = 5", substitute: "A = 8 × 5", answer: "A = 40" },
  },
  {
    shape: "triangle",
    title: "Triangle (base–height)",
    inputs: { b: "10", h: "6" },
    triMode: "bh",
    explain: "The base–height form A = ½ b h works because a triangle is exactly half the rectangle drawn around its base and perpendicular height. Use it for sail panels, roof gables, or any triangle where you can measure a base and its height.",
    formula: "A = ½ × b × h",
    legend: LEG.triBH,
    example: { given: "b = 10, h = 6", substitute: "A = ½ × 10 × 6", answer: "A = 30" },
  },
  {
    shape: "triangle",
    title: "Triangle (Heron's formula, three sides)",
    inputs: { a: "7", b: "8", c: "9" },
    triMode: "sss",
    explain: "When you only know the three side lengths, Heron's formula finds the area without needing any angle. First compute the semi-perimeter s, then plug in. Great for land plots surveyed by side lengths.",
    formula: "s = (a + b + c) / 2;   A = √[s(s − a)(s − b)(s − c)]",
    legend: LEG.heron,
    example: { given: "a = 7, b = 8, c = 9", substitute: "s = 12; A = √(12 × 5 × 4 × 3) = √720", answer: "A ≈ 26.8328" },
  },
  {
    shape: "trapezoid",
    title: "Trapezoid",
    inputs: { b1: "6", b2: "10", h: "4" },
    explain: "A trapezoid has one pair of parallel sides (the bases). A = ½ (b₁ + b₂) h averages the two bases and multiplies by the perpendicular distance — geometrically it's the rectangle you'd get if both bases had the same length. Useful for drainage channels, retaining walls, and irregular fields.",
    formula: "A = ½ × (b₁ + b₂) × h",
    legend: LEG.trapezoid,
    example: { given: "b₁ = 6, b₂ = 10, h = 4", substitute: "A = ½ × (6 + 10) × 4 = ½ × 64", answer: "A = 32" },
  },
  {
    shape: "parallelogram",
    title: "Parallelogram",
    inputs: { b: "10", h: "5" },
    explain: "A parallelogram has two pairs of parallel sides but not necessarily right angles. A = b × h uses the base and the perpendicular height (not the slanted side): slice a triangle off one end, slide it to the other, and you get a rectangle of the same area.",
    formula: "A = b × h",
    legend: LEG.parallelogram,
    example: { given: "b = 10, h = 5", substitute: "A = 10 × 5", answer: "A = 50" },
  },
  {
    shape: "rhombus",
    title: "Rhombus",
    inputs: { d1: "8", d2: "6" },
    explain: "A rhombus is a parallelogram with all four sides equal — a \"pushed-over square.\" Its diagonals meet at right angles and split it into four congruent right triangles, so A = ½ d₁ d₂. Comes up in diamond-pattern tiling and kite-shaped windows.",
    formula: "A = ½ × d₁ × d₂",
    legend: LEG.rhombusKite,
    example: { given: "d₁ = 8, d₂ = 6", substitute: "A = ½ × 8 × 6", answer: "A = 24" },
  },
  {
    shape: "kite",
    title: "Kite",
    inputs: { d1: "6", d2: "10" },
    explain: "A kite has two pairs of adjacent equal sides — the classic flying-kite outline. Its diagonals are perpendicular, so the same ½ d₁ d₂ formula works. Use it when designing an actual kite or cutting a diamond-shaped patch.",
    formula: "A = ½ × d₁ × d₂",
    legend: LEG.rhombusKite,
    example: { given: "d₁ = 6, d₂ = 10", substitute: "A = ½ × 6 × 10", answer: "A = 30" },
  },
  {
    shape: "circle",
    title: "Circle",
    inputs: { r: "7" },
    explain: "A circle is the set of all points a fixed distance r from a centre. A = π r² can be pictured by slicing the circle into thin wedges and rearranging them into a near-rectangle of width π r and height r. Everywhere: round tables, pizzas, pipes, wheels, sprinkler coverage.",
    formula: "A = π × r²",
    legend: LEG.circle,
    example: { given: "r = 7", substitute: "A = π × 7² = π × 49", answer: "A ≈ 153.9380" },
  },
  {
    shape: "semicircle",
    title: "Semicircle",
    inputs: { r: "5" },
    explain: "A semicircle is exactly half a circle, cut along a diameter — so its area is half the circle's. Useful for arched doorways, half-round windows, garden arches, and the ends of a running track.",
    formula: "A = ½ × π × r²",
    legend: LEG.semicircle,
    example: { given: "r = 5", substitute: "A = ½ × π × 25", answer: "A ≈ 39.2699" },
  },
  {
    shape: "sector",
    title: "Sector (pie slice)",
    inputs: { r: "10", theta: "60" },
    sectorUnit: "deg",
    explain: "A sector is a pie slice of a circle — two radii and the arc between them. A = ½ r² θ (with θ in radians) is just the circle's area scaled by the fraction of the full turn the sector covers.",
    formula: "A = ½ × r² × θ    (θ in radians)",
    legend: LEG.sector,
    example: { given: "r = 10, θ = 60°", substitute: "θ = π/3 ≈ 1.0472; A = ½ × 100 × 1.0472", answer: "A ≈ 52.3599" },
  },
  {
    shape: "segment",
    title: "Circular segment",
    inputs: { r: "10", theta: "60" },
    segMode: "angle",
    sectorUnit: "deg",
    explain: "A segment is the thin region between a chord and the arc it cuts off — the sector minus the triangle formed by the two radii. That's exactly what ½ r² (θ − sin θ) computes. Comes up in tank-fill problems and bridge arches.",
    formula: "A = ½ × r² × (θ − sin θ)    (θ in radians)",
    legend: LEG.segment,
    example: { given: "r = 10, θ = 60°", substitute: "A = ½ × 100 × (1.0472 − 0.8660)", answer: "A ≈ 9.0586" },
  },
  {
    shape: "ellipse",
    title: "Ellipse",
    inputs: { a: "8", b: "5" },
    explain: "An ellipse is a stretched circle with two axes: the semi-major a (longer) and semi-minor b (shorter). A = π a b generalizes π r² — when a = b it collapses back to a circle. Use for oval running tracks, planetary orbits, and oval tabletops.",
    formula: "A = π × a × b",
    legend: LEG.ellipse,
    example: { given: "a = 8, b = 5", substitute: "A = π × 8 × 5", answer: "A ≈ 125.6637" },
  },
  {
    shape: "polygon",
    title: "Regular polygon",
    inputs: { n: "6", s: "4" },
    explain: "A regular polygon has n equal sides and equal angles — think hexagons, octagons, pentagons. The formula comes from splitting it into n identical isosceles triangles from the centre and adding them up. Useful for hex tiles, stop-sign panels, and gazebo floors.",
    formula: "A = ¼ × n × s² × cot(π / n)",
    legend: LEG.polygon,
    example: { given: "n = 6, s = 4", substitute: "A = ¼ × 6 × 16 × cot(π/6) = 24 × √3", answer: "A ≈ 41.5692" },
  },
  {
    shape: "coords",
    title: "Irregular polygon (by coordinates)",
    inputs: {},
    coordText: "0,0\n4,0\n4,3\n0,3",
    explain: "An irregular polygon has no requirement of equal sides or angles — just a list of vertices in order. The Shoelace formula sums signed cross-products of consecutive vertices, which geometrically adds and subtracts triangle slices until only the enclosed area remains. Perfect for land surveys, GIS parcels, and floor plans.",
    formula: "A = ½ × |Σ (xᵢ · yᵢ₊₁ − xᵢ₊₁ · yᵢ)|",
    legend: LEG.shoelace,
    example: { given: "Vertices (0,0), (4,0), (4,3), (0,3)", substitute: "Sum of cross-terms = 24; A = ½ × |24|", answer: "A = 12" },
  },
  {
    shape: "annulus",
    title: "Annulus (ring)",
    inputs: { R: "10", r: "6" },
    explain: "An annulus is a flat ring — the region between two concentric circles of radius R (outer) and r (inner). Its area is the big circle minus the hole. Use for washers, pipe cross-sections, and running-track lanes.",
    formula: "A = π × (R² − r²)",
    legend: LEG.annulus,
    example: { given: "R = 10, r = 6", substitute: "A = π × (100 − 36) = π × 64", answer: "A ≈ 201.0619" },
  },
  {
    shape: "starPolygon",
    title: "Regular star polygon",
    inputs: { n: "5", R: "10", r: "4" },
    explain: "A regular star polygon has n identical points arranged around a centre. Slice it into 2n congruent triangles — each with two sides R and r meeting at an angle of π/n — and add them up to get A = n × R × r × sin(π/n). Use for star cutouts, logos, badges and decorative tiling.",
    formula: "A = n × R × r × sin(π / n)",
    legend: LEG.starPolygon,
    example: { given: "n = 5, R = 10, r = 4", substitute: "A = 5 × 10 × 4 × sin(π/5) = 200 × 0.5878", answer: "A ≈ 117.5571" },
  },
];




const FAQ_ITEMS = [
  {
    q: "What is area?",
    a: "Area is the amount of two-dimensional space a flat shape covers. It's measured in square units — square meters, square feet, acres, hectares and so on.",
  },
  {
    q: "How do I find the area of a triangle when I only know its three sides?",
    a: "Use Heron's formula. Compute the semi-perimeter s = (a + b + c) / 2, then the area is √[s(s − a)(s − b)(s − c)]. This calculator does both this and the standard ½ × base × height version.",
  },
  {
    q: "What's the formula for a regular polygon's area?",
    a: "For a regular polygon with n sides of length s, the apothem is a = s / (2 tan(π/n)) and the area is A = ½ × perimeter × apothem = ¼ × n × s² × cot(π/n). This calculator works for any n ≥ 3.",
  },
  {
    q: "How do I calculate the area of a ring (annulus)?",
    a: "Subtract the inner circle from the outer circle: A = π(R² − r²), where R is the outer radius and r is the inner radius.",
  },
  {
    q: "How is the area of a regular star polygon calculated?",
    a: "For a regular star with n points, outer radius R (centre-to-tip) and inner radius r (centre-to-notch), the area is A = n × R × r × sin(π/n). The star splits into 2n congruent triangles, each with two sides R and r meeting at an angle of π/n, and this formula adds them up.",
  },
  {
    q: "What units does the calculator use?",
    a: "Any consistent unit — enter all dimensions in the same unit and the answer is in the square of that unit. Every result is also shown converted to square feet, square meters, square yards, acres and hectares for quick reference.",
  },
  {
    q: "Can I enter the angle of a sector in radians?",
    a: "Yes — the sector shape has a degrees/radians toggle. Full circle = 360° = 2π rad.",
  },
  {
    q: "How is the area of an irregular polygon computed?",
    a: "From its vertices (x, y) using the Shoelace formula: A = ½ |Σ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)|. The Polygon (Coordinates) tool applies this to any number of vertices, in any order, closed or open.",
  },
  {
    q: "How is a circular segment different from a sector?",
    a: "A sector is the pie-slice bounded by two radii and an arc. A segment is bounded by a chord and its arc — it's the sector with the central triangle removed. Area = ½ r² (θ − sin θ).",
  },
  {
    q: "Can I estimate cost from the area?",
    a: "Yes — enter a price per square unit in the Cost estimator that appears with every result. It multiplies the computed area by that price so you can quickly estimate flooring, paint, land or carpet totals.",
  },
  {
    q: "How do I find a trapezoid's area if I only know all four side lengths?",
    a: "Switch the trapezoid tool to \"All 4 sides\" mode and enter both bases (b₁, b₂) and the two non-parallel sides (c, d). The calculator finds x = [(b₂ − b₁)² + c² − d²] / [2(b₂ − b₁)], then the height h = √(c² − x²), and finally A = ½(b₁ + b₂)h. If b₁ equals b₂ the shape is a parallelogram and h = c.",
  },
  {
    q: "How does the composite shape builder work?",
    a: "Add as many components as you need, each using any of the 16 supported shapes, and the calculator sums their individual areas into one combined total. It also shows a breakdown table with each component's area and percentage share — useful for L-shaped rooms, irregular lots, and multi-part floor plans.",
  },
] as const;

export const Route = createFileRoute("/calculators/math/area-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Area Calculator",
      title: "Area Calculator — 16 Shapes with Diagrams & Steps",
      metaDescription:
        "Free area calculator for 16 shapes: square, rectangle, triangle, trapezoid, circle, sector, ellipse, polygons, star and more. Live diagrams and step-by-step working.",
      canonicalUrl: "/calculators/math/area-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Area Calculator", path: "/calculators/math/area-calculator" },
      ],
      faqs: FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a })),
    }),
  component: AreaPage,
});

/* ================= Types ================= */

const shapes = [
  "square",
  "rectangle",
  "triangle",
  "trapezoid",
  "parallelogram",
  "rhombus",
  "kite",
  "circle",
  "semicircle",
  "sector",
  "segment",
  "ellipse",
  "polygon",
  "coords",
  "annulus",
  "starPolygon",
] as const;
type Shape = (typeof shapes)[number];

const SHAPE_LABEL: Record<Shape, string> = {
  square: "Square",
  rectangle: "Rectangle",
  triangle: "Triangle",
  trapezoid: "Trapezoid",
  parallelogram: "Parallelogram",
  rhombus: "Rhombus",
  kite: "Kite",
  circle: "Circle",
  semicircle: "Semicircle",
  sector: "Sector",
  segment: "Circular Segment",
  ellipse: "Ellipse",
  polygon: "Regular Polygon",
  coords: "Polygon (Coordinates)",
  annulus: "Annulus (Ring)",
  starPolygon: "Regular Star Polygon",
};

import { fmt, num, TO_M2 } from "@/lib/math/geometry-shared";
export { fmt, num, TO_M2 };

/* Parse "x,y" per line (or space-separated) into vertex pairs. */
function parseVertices(text: string): { pts: [number, number][]; error?: string } {
  const pts: [number, number][] = [];
  const lines = text
    .split(/[\n;]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    const parts = line
      .replace(/[()]/g, "")
      .split(/[\s,]+/)
      .filter(Boolean);
    if (parts.length < 2) return { pts: [], error: `Line "${line}" needs two values (x and y).` };
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y))
      return { pts: [], error: `"${line}" is not a numeric (x, y) pair.` };
    pts.push([x, y]);
  }
  return { pts };
}

function shoelace(pts: [number, number][]): number {
  const n = pts.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/* ================= Component ================= */

function AreaPage() {
  const [shape, setShape] = useState<Shape>("rectangle");
  const captureRef = useRef<HTMLDivElement>(null);

  return (
    <MathCalcPage
      name="Area Calculator"
      tagline="Compute the area of 16 shapes and tools. Pick a shape, enter dimensions, and get an instant result with a live labeled diagram, unit conversions, a cost estimator, and optional step-by-step working."
      extras={<AreaEducation />}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {shapes.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setShape(s)}
            className={
              "rounded-full border px-3 py-1.5 text-sm transition-colors " +
              (shape === s
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground")
            }
          >
            {SHAPE_LABEL[s]}
          </button>
        ))}
      </div>

      <ShapeForm shape={shape} captureRef={captureRef} />

      <CompositeBuilder />
    </MathCalcPage>
  );
}

/* ================= Per-shape form ================= */

function ShapeForm({
  shape,
  captureRef,
}: {
  shape: Shape;
  captureRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [unit, setUnit] = useState<string>("m");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [triMode, setTriMode] = useState<"bh" | "sss">("bh");
  const [trapMode, setTrapMode] = useState<"bh" | "sides">("bh");
  const [sectorUnit, setSectorUnit] = useState<"deg" | "rad">("deg");
  const [segMode, setSegMode] = useState<"chord" | "angle">("angle");
  const [coordText, setCoordText] = useState<string>("0,0\n4,0\n4,3\n0,3");
  const [price, setPrice] = useState<string>("");

  const set = (k: string, v: string) => setInputs((p) => ({ ...p, [k]: v }));

  const result = useMemo(
    () => compute(shape, inputs, triMode, sectorUnit, segMode, coordText, trapMode, unit),
    [shape, inputs, triMode, sectorUnit, segMode, coordText, trapMode],
  );

  const priceNum = num(price);
  const cost = priceNum !== null && result.area !== null ? priceNum * result.area : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <ShapeInputs
          shape={shape}
          inputs={inputs}
          set={set}
          triMode={triMode}
          setTriMode={setTriMode}
          trapMode={trapMode}
          setTrapMode={setTrapMode}
          sectorUnit={sectorUnit}
          setSectorUnit={setSectorUnit}
          segMode={segMode}
          setSegMode={setSegMode}
          coordText={coordText}
          setCoordText={setCoordText}
        />
        <div>
          <Field label="Unit (all inputs use this)">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="mm">millimeters (mm)</option>
              <option value="cm">centimeters (cm)</option>
              <option value="m">meters (m)</option>
              <option value="km">kilometers (km)</option>
              <option value="in">inches (in)</option>
              <option value="ft">feet (ft)</option>
              <option value="yd">yards (yd)</option>
              <option value="mi">miles (mi)</option>
            </select>
          </Field>
        </div>
      </div>

      <ShapeDiagram
        shape={shape}
        inputs={inputs}
        triMode={triMode}
        sectorUnit={sectorUnit}
        segMode={segMode}
        coordText={coordText}
      />

      {result.error && <ErrorBox message={result.error} />}
      {result.area !== null && (
        <div ref={captureRef} className="rounded-3xl bg-card/40 p-1">
          <ResultBox
            label={`Area of ${SHAPE_LABEL[shape]}`}
            value={
              <>
                {fmt(result.area, 6)} {unit}
                <sup>2</sup>
              </>
            }
            note={
              result.perimeter !== null ? (
                <>
                  Perimeter ≈ {fmt(result.perimeter, 4)} {unit}
                </>
              ) : undefined
            }
          />
          <UnitConversions areaInUnit={result.area} unit={unit} />

          <div className="mt-3 rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Cost / material estimator
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Field label={`Price per ${unit}²`}>
                <TextInput
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 12.50"
                />
              </Field>
              <div className="ml-auto text-right text-sm">
                <div className="text-muted-foreground">Estimated total</div>
                <div className="font-serif italic text-base tabular-nums text-foreground">
                  {cost === null ? "—" : cost.toFixed(2)}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Total = area × price. Useful for flooring, paint, carpet, tiling and land estimates.
            </p>
          </div>

          <div className="mt-3 flex justify-end px-1">
            <ResultActions
              getCopyText={() =>
                `Area (${SHAPE_LABEL[shape]}) = ${fmt(result.area!, 6)} ${unit}²` +
                (cost !== null ? `\nCost @ ${priceNum} / ${unit}² = ${cost.toFixed(2)}` : "")
              }
              captureRef={captureRef}
              filename={`area-${shape}`}
            />
          </div>
          <StepsToggle steps={result.steps} />
        </div>
      )}
    </div>
  );
}

function ShapeInputs({
  shape,
  inputs,
  set,
  triMode,
  setTriMode,
  trapMode,
  setTrapMode,
  sectorUnit,
  setSectorUnit,
  segMode,
  setSegMode,
  coordText,
  setCoordText,
}: {
  shape: Shape;
  inputs: Record<string, string>;
  set: (k: string, v: string) => void;
  triMode: "bh" | "sss";
  setTriMode: (m: "bh" | "sss") => void;
  trapMode?: "bh" | "sides";
  setTrapMode?: (m: "bh" | "sides") => void;
  sectorUnit: "deg" | "rad";
  setSectorUnit: (u: "deg" | "rad") => void;
  segMode: "chord" | "angle";
  setSegMode: (m: "chord" | "angle") => void;
  coordText: string;
  setCoordText: (v: string) => void;
}) {
  const inp = (k: string, label: string, placeholder = "") => (
    <Field label={label}>
      <TextInput
        inputMode="decimal"
        value={inputs[k] ?? ""}
        onChange={(e) => set(k, e.target.value)}
        placeholder={placeholder}
      />
    </Field>
  );

  switch (shape) {
    case "square":
      return <div className="space-y-3">{inp("s", "Side length (s)", "e.g. 5")}</div>;
    case "rectangle":
      return (
        <div className="space-y-3">
          {inp("l", "Length (l)", "e.g. 8")}
          {inp("w", "Width (w)", "e.g. 5")}
        </div>
      );
    case "triangle":
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["bh", "sss"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTriMode(m)}
                className={
                  "rounded-full border px-3 py-1 text-xs " +
                  (triMode === m
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border/60 bg-secondary/30 text-muted-foreground")
                }
              >
                {m === "bh" ? "Base & height" : "Three sides (Heron)"}
              </button>
            ))}
          </div>
          {triMode === "bh" ? (
            <>
              {inp("b", "Base (b)", "e.g. 6")}
              {inp("h", "Height (h)", "e.g. 4")}
            </>
          ) : (
            <>
              {inp("a", "Side a", "e.g. 7")}
              {inp("b", "Side b", "e.g. 8")}
              {inp("c", "Side c", "e.g. 9")}
            </>
          )}
        </div>
      );
    case "trapezoid": {
      const tMode = trapMode ?? "bh";
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["bh", "sides"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTrapMode?.(m)}
                className={
                  "rounded-full border px-3 py-1 text-xs " +
                  (tMode === m
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border/60 bg-secondary/30 text-muted-foreground")
                }
              >
                {m === "bh" ? "Base + height" : "All 4 sides"}
              </button>
            ))}
          </div>
          {inp("b1", "Base 1 (b₁)", "e.g. 6")}
          {inp("b2", "Base 2 (b₂)", "e.g. 10")}
          {tMode === "bh" ? (
            inp("h", "Height (h)", "e.g. 4")
          ) : (
            <>
              {inp("c", "Side c (between b₁ end and b₂ end)", "e.g. 5")}
              {inp("d", "Side d (the other non-parallel side)", "e.g. 6")}
            </>
          )}
        </div>
      );
    }
    case "parallelogram":
      return (
        <div className="space-y-3">
          {inp("b", "Base (b)", "e.g. 8")}
          {inp("h", "Height (h)", "e.g. 5")}
        </div>
      );
    case "rhombus":
      return (
        <div className="space-y-3">
          {inp("d1", "Diagonal 1 (d₁)", "e.g. 6")}
          {inp("d2", "Diagonal 2 (d₂)", "e.g. 8")}
        </div>
      );
    case "kite":
      return (
        <div className="space-y-3">
          {inp("d1", "Diagonal 1 (d₁)", "e.g. 6")}
          {inp("d2", "Diagonal 2 (d₂)", "e.g. 10")}
        </div>
      );
    case "circle":
      return <div className="space-y-3">{inp("r", "Radius (r)", "e.g. 7")}</div>;
    case "semicircle":
      return <div className="space-y-3">{inp("r", "Radius (r)", "e.g. 5")}</div>;
    case "sector":
      return (
        <div className="space-y-3">
          {inp("r", "Radius (r)", "e.g. 10")}
          {inp("theta", "Central angle (θ)", sectorUnit === "deg" ? "e.g. 60" : "e.g. 1.047")}
          <div className="flex gap-2">
            {(["deg", "rad"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setSectorUnit(u)}
                className={
                  "rounded-full border px-3 py-1 text-xs " +
                  (sectorUnit === u
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border/60 bg-secondary/30 text-muted-foreground")
                }
              >
                {u === "deg" ? "Degrees" : "Radians"}
              </button>
            ))}
          </div>
        </div>
      );
    case "segment":
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["angle", "chord"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSegMode(m)}
                className={
                  "rounded-full border px-3 py-1 text-xs " +
                  (segMode === m
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border/60 bg-secondary/30 text-muted-foreground")
                }
              >
                {m === "angle" ? "By central angle" : "By chord length"}
              </button>
            ))}
          </div>
          {inp("r", "Radius (r)", "e.g. 10")}
          {segMode === "angle" ? (
            <>
              {inp("theta", "Central angle (θ)", sectorUnit === "deg" ? "e.g. 60" : "e.g. 1.047")}
              <div className="flex gap-2">
                {(["deg", "rad"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setSectorUnit(u)}
                    className={
                      "rounded-full border px-3 py-1 text-xs " +
                      (sectorUnit === u
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-border/60 bg-secondary/30 text-muted-foreground")
                    }
                  >
                    {u === "deg" ? "Degrees" : "Radians"}
                  </button>
                ))}
              </div>
            </>
          ) : (
            inp("chord", "Chord length (c)", "e.g. 12")
          )}
        </div>
      );
    case "ellipse":
      return (
        <div className="space-y-3">
          {inp("a", "Semi-major axis (a)", "e.g. 5")}
          {inp("b", "Semi-minor axis (b)", "e.g. 3")}
        </div>
      );
    case "polygon":
      return (
        <div className="space-y-3">
          {inp("n", "Number of sides (n ≥ 3)", "e.g. 6")}
          {inp("s", "Side length (s)", "e.g. 4")}
        </div>
      );
    case "coords":
      return (
        <div className="space-y-3">
          <Field
            label="Vertices (one x, y pair per line)"
            hint="Any order (clockwise or counter-clockwise). Do not repeat the first point."
          >
            <textarea
              value={coordText}
              onChange={(e) => setCoordText(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 font-mono text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={"0, 0\n4, 0\n4, 3\n0, 3"}
            />
          </Field>
        </div>
      );
    case "annulus":
      return (
        <div className="space-y-3">
          {inp("R", "Outer radius (R)", "e.g. 5")}
          {inp("r", "Inner radius (r)", "e.g. 3")}
        </div>
      );
    case "starPolygon":
      return (
        <div className="space-y-3">
          {inp("n", "Number of points (n ≥ 3)", "e.g. 5")}
          {inp("R", "Outer radius (R)", "e.g. 10")}
          {inp("r", "Inner radius (r)", "e.g. 4")}
        </div>
      );
  }
}

/* ================= Compute ================= */

interface ComputeResult {
  area: number | null;
  perimeter: number | null;
  steps: Step[];
  error?: string;
}

function compute(
  shape: Shape,
  raw: Record<string, string>,
  triMode: "bh" | "sss",
  sectorUnit: "deg" | "rad",
  segMode: "chord" | "angle",
  coordText: string,
  trapMode: "bh" | "sides" = "bh",
  unit: string = "",
): ComputeResult {
  const empty: ComputeResult = { area: null, perimeter: null, steps: [] };
  const need = (k: string): number | null => num(raw[k] ?? "");
  const step = (title: string, body: React.ReactNode): Step => ({ title, body });

  switch (shape) {
    case "square": {
      const s = need("s");
      if (s === null) return empty;
      if (s <= 0) return { ...empty, error: "Side must be positive." };
      const A = s * s;
      return {
        area: A,
        perimeter: 4 * s,
        steps: [
          step("Formula", <MathLine>A = s²</MathLine>),
          step("Substitute", <MathLine>A = ({s})² = <strong>{fmt(A)}</strong></MathLine>),
        ],
      };
    }
    case "rectangle": {
      const l = need("l");
      const w = need("w");
      if (l === null || w === null) return empty;
      if (l <= 0 || w <= 0) return { ...empty, error: "Length and width must be positive." };
      const A = l * w;
      return {
        area: A,
        perimeter: 2 * (l + w),
        steps: [
          step("Formula", <MathLine>A = l × w</MathLine>),
          step("Substitute", <MathLine>A = {l} × {w} = <strong>{fmt(A)}</strong></MathLine>),
        ],
      };
    }
    case "triangle": {
      if (triMode === "bh") {
        const b = need("b");
        const h = need("h");
        if (b === null || h === null) return empty;
        if (b <= 0 || h <= 0) return { ...empty, error: "Base and height must be positive." };
        const A = 0.5 * b * h;
        return {
          area: A,
          perimeter: null,
          steps: [
            step("Formula", <MathLine>A = ½ × b × h</MathLine>),
            step("Substitute", <MathLine>A = ½ × {b} × {h} = <strong>{fmt(A)}</strong></MathLine>),
          ],
        };
      } else {
        const a = need("a");
        const b = need("b");
        const c = need("c");
        if (a === null || b === null || c === null) return empty;
        if (a <= 0 || b <= 0 || c <= 0) return { ...empty, error: "All sides must be positive." };
        if (a + b <= c || a + c <= b || b + c <= a)
          return { ...empty, error: "Triangle inequality violated — those sides can't form a triangle." };
        const s = (a + b + c) / 2;
        const A = Math.sqrt(s * (s - a) * (s - b) * (s - c));
        return {
          area: A,
          perimeter: a + b + c,
          steps: [
            step("Heron's formula", <MathLine>s = (a + b + c) / 2, A = √[s(s − a)(s − b)(s − c)]</MathLine>),
            step(
              "Semi-perimeter",
              <MathLine>
                s = ({a} + {b} + {c}) / 2 = <strong>{fmt(s)}</strong>
              </MathLine>,
            ),
            step(
              "Substitute into Heron's",
              <MathLine>
                A = √[{fmt(s)} × {fmt(s - a)} × {fmt(s - b)} × {fmt(s - c)}] = √{fmt(s * (s - a) * (s - b) * (s - c))} ={" "}
                <strong>{fmt(A)}</strong>
              </MathLine>,
            ),
          ],
        };
      }
    }
    case "trapezoid": {
      const b1 = need("b1");
      const b2 = need("b2");
      if (trapMode === "bh") {
        const h = need("h");
        if (b1 === null || b2 === null || h === null) return empty;
        if (b1 <= 0 || b2 <= 0 || h <= 0) return { ...empty, error: "All values must be positive." };
        const A = ((b1 + b2) / 2) * h;
        return {
          area: A,
          perimeter: null,
          steps: [
            step("Formula", <MathLine>A = ½ × (b₁ + b₂) × h</MathLine>),
            step(
              "Substitute",
              <MathLine>
                A = ½ × ({b1} + {b2}) × {h} = <strong>{fmt(A)}</strong>
              </MathLine>,
            ),
          ],
        };
      } else {
        const c = need("c");
        const d = need("d");
        if (b1 === null || b2 === null || c === null || d === null) return empty;
        if (b1 <= 0 || b2 <= 0 || c <= 0 || d <= 0)
          return { ...empty, error: "All side lengths must be positive." };
        let h: number;
        const stepsExtra: Step[] = [];
        if (b1 === b2) {
          h = Math.sqrt(c * c);
          stepsExtra.push(
            step(
              "Parallelogram case",
              <MathNote>
                Since b₁ = b₂, this is a parallelogram — x = 0, so h = √(c² − 0²) = c
                (this assumes side c is measured perpendicular to the bases; for a
                true parallelogram, enter its perpendicular height directly instead).
              </MathNote>,
            ),
          );
        } else {
          const x = ((b2 - b1) ** 2 + c * c - d * d) / (2 * (b2 - b1));
          const under = c * c - x * x;
          if (under < 0)
            return {
              ...empty,
              error: "These side lengths can't form a valid trapezoid — check the values.",
            };
          h = Math.sqrt(under);
          stepsExtra.push(
            step(
              "Solve for x",
              <MathLine>
                x = [(b₂ − b₁)² + c² − d²] / [2(b₂ − b₁)] = <strong>{fmt(x)}</strong>
              </MathLine>,
            ),
          );
        }
        const A = ((b1 + b2) / 2) * h;
        return {
          area: A,
          perimeter: b1 + b2 + c + d,
          steps: [
            step(
              "Formula (all 4 sides known)",
              <MathLine>x = [(b₂ − b₁)² + c² − d²] / [2(b₂ − b₁)],  h = √(c² − x²)</MathLine>,
            ),
            ...stepsExtra,
            step("Height", <MathLine>h = <strong>{fmt(h)}</strong></MathLine>),
            step(
              "Area",
              <MathLine>
                A = ½ × ({b1} + {b2}) × {fmt(h)} = <strong>{fmt(A)}</strong>
              </MathLine>,
            ),
          ],
        };
      }
    }
    case "parallelogram": {
      const b = need("b");
      const h = need("h");
      if (b === null || h === null) return empty;
      if (b <= 0 || h <= 0) return { ...empty, error: "Values must be positive." };
      const A = b * h;
      return {
        area: A,
        perimeter: null,
        steps: [
          step("Formula", <MathLine>A = b × h</MathLine>),
          step("Substitute", <MathLine>A = {b} × {h} = <strong>{fmt(A)}</strong></MathLine>),
        ],
      };
    }
    case "rhombus":
    case "kite": {
      const d1 = need("d1");
      const d2 = need("d2");
      if (d1 === null || d2 === null) return empty;
      if (d1 <= 0 || d2 <= 0) return { ...empty, error: "Diagonals must be positive." };
      const A = (d1 * d2) / 2;
      const label = shape === "kite" ? "kite" : "rhombus";
      return {
        area: A,
        perimeter: null,
        steps: [
          step(
            "Formula",
            <MathLine>A = ½ × d₁ × d₂ &nbsp;(applies to any {label} — diagonals are perpendicular)</MathLine>,
          ),
          step(
            "Substitute",
            <MathLine>A = ½ × {d1} × {d2} = <strong>{fmt(A)}</strong></MathLine>,
          ),
        ],
      };
    }
    case "circle": {
      const r = need("r");
      if (r === null) return empty;
      if (r <= 0) return { ...empty, error: "Radius must be positive." };
      const A = Math.PI * r * r;
      return {
        area: A,
        perimeter: 2 * Math.PI * r,
        steps: [
          step("Formula", <MathLine>A = π r²</MathLine>),
          step(
            "Substitute",
            <MathLine>
              A = π × ({r})² = π × {fmt(r * r)} = <strong>{fmt(A)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "semicircle": {
      const r = need("r");
      if (r === null) return empty;
      if (r <= 0) return { ...empty, error: "Radius must be positive." };
      const A = 0.5 * Math.PI * r * r;
      return {
        area: A,
        perimeter: Math.PI * r + 2 * r,
        steps: [
          step("Formula", <MathLine>A = ½ π r²</MathLine>),
          step(
            "Substitute",
            <MathLine>
              A = ½ × π × ({r})² = <strong>{fmt(A)}</strong>
            </MathLine>,
          ),
          step(
            "Perimeter",
            <MathLine>P = π r + 2 r = {fmt(Math.PI * r + 2 * r)}</MathLine>,
          ),
        ],
      };
    }
    case "sector": {
      const r = need("r");
      const theta = need("theta");
      if (r === null || theta === null) return empty;
      if (r <= 0 || theta <= 0) return { ...empty, error: "Radius and angle must be positive." };
      const thetaRad = sectorUnit === "deg" ? (theta * Math.PI) / 180 : theta;
      const A = 0.5 * r * r * thetaRad;
      return {
        area: A,
        perimeter: 2 * r + r * thetaRad,
        steps: [
          step("Formula", <MathLine>A = ½ × r² × θ  (θ in radians)</MathLine>),
          ...(sectorUnit === "deg"
            ? [
                step(
                  "Convert θ to radians",
                  <MathLine>
                    θ = {theta}° × π / 180 = <strong>{fmt(thetaRad)}</strong> rad
                  </MathLine>,
                ),
              ]
            : []),
          step(
            "Substitute",
            <MathLine>
              A = ½ × ({r})² × {fmt(thetaRad)} = <strong>{fmt(A)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "segment": {
      const r = need("r");
      if (r === null) return empty;
      if (r <= 0) return { ...empty, error: "Radius must be positive." };
      let thetaRad: number;
      const extra: Step[] = [];
      if (segMode === "angle") {
        const theta = need("theta");
        if (theta === null) return empty;
        if (theta <= 0) return { ...empty, error: "Angle must be positive." };
        thetaRad = sectorUnit === "deg" ? (theta * Math.PI) / 180 : theta;
        if (thetaRad >= 2 * Math.PI)
          return { ...empty, error: "Central angle must be less than 2π (360°)." };
        if (sectorUnit === "deg")
          extra.push(
            step(
              "Convert θ to radians",
              <MathLine>
                θ = {theta}° × π / 180 = <strong>{fmt(thetaRad)}</strong> rad
              </MathLine>,
            ),
          );
      } else {
        const chord = need("chord");
        if (chord === null) return empty;
        if (chord <= 0) return { ...empty, error: "Chord length must be positive." };
        if (chord > 2 * r) return { ...empty, error: "Chord length can't exceed 2r." };
        thetaRad = 2 * Math.asin(chord / (2 * r));
        extra.push(
          step(
            "Central angle from chord",
            <MathLine>
              θ = 2 · arcsin(c / (2r)) = 2 · arcsin({chord} / {fmt(2 * r)}) ={" "}
              <strong>{fmt(thetaRad)}</strong> rad ≈ {fmt((thetaRad * 180) / Math.PI, 2)}°
            </MathLine>,
          ),
        );
      }
      const A = 0.5 * r * r * (thetaRad - Math.sin(thetaRad));
      const chordLen = 2 * r * Math.sin(thetaRad / 2);
      const arc = r * thetaRad;
      return {
        area: A,
        perimeter: chordLen + arc,
        steps: [
          step("Formula", <MathLine>A = ½ r² (θ − sin θ)  (θ in radians)</MathLine>),
          ...extra,
          step(
            "Substitute",
            <MathLine>
              A = ½ × ({r})² × ({fmt(thetaRad)} − sin {fmt(thetaRad)}) = ½ × {fmt(r * r)} × {fmt(thetaRad - Math.sin(thetaRad))} ={" "}
              <strong>{fmt(A)}</strong>
            </MathLine>,
          ),
          step(
            "Chord & arc",
            <MathLine>
              chord = 2r sin(θ/2) = {fmt(chordLen)}; arc = r θ = {fmt(arc)}
            </MathLine>,
          ),
        ],
      };
    }
    case "ellipse": {
      const a = need("a");
      const b = need("b");
      if (a === null || b === null) return empty;
      if (a <= 0 || b <= 0) return { ...empty, error: "Both axes must be positive." };
      const A = Math.PI * a * b;
      // Ramanujan's second approximation for ellipse perimeter:
      // P ≈ π[3(a+b) − √((3a+b)(a+3b))]
      const P2 = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
      return {
        area: A,
        perimeter: P2,
        steps: [
          step("Formula", <MathLine>A = π × a × b</MathLine>),
          step(
            "Substitute",
            <MathLine>
              A = π × {a} × {b} = <strong>{fmt(A)}</strong>
            </MathLine>,
          ),
          step(
            "Perimeter (Ramanujan approx.)",
            <MathLine>
              P ≈ π[3(a+b) − √((3a+b)(a+3b))] = <strong>{fmt(P2, 4)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "polygon": {
      const nRaw = need("n");
      const s = need("s");
      if (nRaw === null || s === null) return empty;
      const n = Math.floor(nRaw);
      if (n < 3) return { ...empty, error: "A polygon needs at least 3 sides." };
      if (s <= 0) return { ...empty, error: "Side length must be positive." };
      const apothem = s / (2 * Math.tan(Math.PI / n));
      const perimeter = n * s;
      const A = 0.5 * perimeter * apothem;
      return {
        area: A,
        perimeter,
        steps: [
          step(
            "Formulas",
            <MathLine>a = s / (2 tan(π/n));  P = n × s;  A = ½ × P × a</MathLine>,
          ),
          step(
            "Apothem",
            <MathLine>
              a = s / (2 tan(π/n)) = {s} / (2 tan(π/{n})) = <strong>{fmt(apothem)}</strong>
            </MathLine>,
          ),
          step(
            "Perimeter",
            <MathLine>
              P = n × s = {n} × {s} = <strong>{perimeter}</strong>
            </MathLine>,
          ),
          step(
            "Area",
            <MathLine>
              A = ½ × P × a = ½ × {perimeter} × {fmt(apothem)} = <strong>{fmt(A)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "coords": {
      const { pts, error } = parseVertices(coordText);
      if (error) return { ...empty, error };
      if (pts.length < 3) return empty;
      const A = shoelace(pts);
      // Perimeter (closed polygon)
      let P = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[(i + 1) % pts.length];
        P += Math.hypot(x2 - x1, y2 - y1);
      }
      const rows = pts.map(([x, y], i) => {
        const [x2, y2] = pts[(i + 1) % pts.length];
        return { i: i + 1, x, y, term: x * y2 - x2 * y };
      });
      const sumTerm = rows.reduce((a, r) => a + r.term, 0);
      return {
        area: A,
        perimeter: P,
        steps: [
          step(
            "Formula (Shoelace)",
            <MathLine>A = ½ |Σᵢ (xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)|</MathLine>,
          ),
          step(
            "Cross-terms per edge",
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1">i</th>
                    <th className="px-2 py-1">xᵢ</th>
                    <th className="px-2 py-1">yᵢ</th>
                    <th className="px-2 py-1">xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ</th>
                  </tr>
                </thead>
                <tbody className="font-serif italic">
                  {rows.map((r) => (
                    <tr key={r.i}>
                      <td className="px-2 py-1">{r.i}</td>
                      <td className="px-2 py-1">{r.x}</td>
                      <td className="px-2 py-1">{r.y}</td>
                      <td className="px-2 py-1 tabular-nums">{fmt(r.term)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
          ),
          step(
            "Sum and halve",
            <MathLine>
              A = ½ × |{fmt(sumTerm)}| = <strong>{fmt(A)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "annulus": {
      const R = need("R");
      const r = need("r");
      if (R === null || r === null) return empty;
      if (R <= 0 || r < 0) return { ...empty, error: "Radii must be non-negative and R > 0." };
      if (r >= R) return { ...empty, error: "Inner radius must be smaller than outer radius." };
      const A = Math.PI * (R * R - r * r);
      return {
        area: A,
        perimeter: 2 * Math.PI * (R + r),
        steps: [
          step("Formula", <MathLine>A = π (R² − r²)</MathLine>),
          step(
            "Substitute",
            <MathLine>
              A = π × ({R}² − {r}²) = π × ({fmt(R * R)} − {fmt(r * r)}) = π × {fmt(R * R - r * r)} ={" "}
              <strong>{fmt(A)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "starPolygon": {
      const nRaw = need("n");
      const R = need("R");
      const rIn = need("r");
      if (nRaw === null || R === null || rIn === null) return empty;
      const n = Math.floor(nRaw);
      if (n < 3) return { ...empty, error: "A star needs at least 3 points." };
      if (R <= 0 || rIn <= 0) return { ...empty, error: "Both radii must be positive." };
      if (rIn >= R) return { ...empty, error: "Inner radius must be smaller than outer radius." };
      const angle = Math.PI / n;
      const sinPiN = Math.sin(angle);
      const A = n * R * rIn * sinPiN;

      const edge = Math.sqrt(R * R + rIn * rIn - 2 * R * rIn * Math.cos(angle));
      const perimeter = 2 * n * edge;
      return {
        area: A,
        perimeter,
        steps: [
          step("Formula", <MathLine>A = n · R · r · sin(π / n)</MathLine>),
          step("Substitute", <MathLine>A = {n} · {R} · {rIn} · sin(π / {n})</MathLine>),
          step("Compute π / n", <MathLine>π / {n} ≈ {fmt(angle, 4)} rad</MathLine>),
          step(
            "Compute sin(π / n)",
            <MathLine>
              sin({fmt(angle, 4)}) ≈ {fmt(sinPiN, 4)}
            </MathLine>,
          ),
          step(
            "Multiply",
            <MathLine>
              A = {fmt(n * R * rIn)} · {fmt(sinPiN, 4)} = <strong>{fmt(A)}</strong>
            </MathLine>,
          ),
          step(
            "Final Area",
            <MathLine>
              A = <strong>{fmt(A)} {unit}²</strong>
            </MathLine>,
          ),
        ],
      };
    }
  }
}

/* ================= Unit conversions ================= */

// TO_M2 lives in @/lib/math/geometry-shared and is re-exported near the top of this file.

function UnitConversions({ areaInUnit, unit }: { areaInUnit: number; unit: string }) {
  const factor = TO_M2[unit] ?? 1;
  const m2 = areaInUnit * factor;
  const rows: [string, number][] = [
    ["Square meters (m²)", m2],
    ["Square feet (ft²)", m2 / 0.09290304],
    ["Square yards (yd²)", m2 / 0.83612736],
    ["Acres", m2 / 4046.8564224],
    ["Hectares", m2 / 10000],
    ["Square kilometers (km²)", m2 / 1e6],
    ["Square miles (mi²)", m2 / 2589988.110336],
  ];
  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Converted to common units
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {rows.map(([label, val]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 tabular-nums">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-serif italic font-medium text-foreground">{fmt(val, 6)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= Diagrams (SVG) ================= */

function ShapeDiagram({
  shape,
  inputs,
  triMode,
  sectorUnit,
  segMode,
  coordText,
}: {
  shape: Shape;
  inputs: Record<string, string>;
  triMode: "bh" | "sss";
  sectorUnit: "deg" | "rad";
  segMode: "chord" | "angle";
  coordText: string;
}) {
  const stroke = "currentColor";
  const fill = "var(--color-primary)";
  const label = "text-[10px] fill-current text-muted-foreground";

  const wrap = (content: React.ReactNode, viewBox = "0 0 300 200") => (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-foreground">
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="h-56 w-full" role="img" aria-label={`Diagram of ${shape} with labeled dimensions`}>
        <g fillOpacity={0.12} fill={fill} stroke={stroke} strokeWidth={1.5}>
          {content}
        </g>
      </svg>
    </div>
  );

  switch (shape) {
    case "square": {
      const s = inputs.s || "s";
      return wrap(
        <>
          <rect x={100} y={50} width={100} height={100} rx={2} />
          <text x={150} y={170} textAnchor="middle" className={label}>{s}</text>
          <text x={215} y={105} className={label}>{s}</text>
        </>,
      );
    }
    case "rectangle": {
      const l = inputs.l || "l";
      const w = inputs.w || "w";
      return wrap(
        <>
          <rect x={60} y={60} width={180} height={90} />
          <text x={150} y={170} textAnchor="middle" className={label}>{l}</text>
          <text x={250} y={110} className={label}>{w}</text>
        </>,
      );
    }
    case "triangle": {
      if (triMode === "bh") {
        const b = inputs.b || "b";
        const h = inputs.h || "h";
        return wrap(
          <>
            <polygon points="60,160 240,160 150,50" />
            <line x1={150} y1={50} x2={150} y2={160} strokeDasharray="4 3" strokeOpacity={0.5} />
            <text x={150} y={175} textAnchor="middle" className={label}>{b}</text>
            <text x={158} y={110} className={label}>{h}</text>
          </>,
        );
      } else {
        // Draw to scale using actual side lengths a, b, c
        const a = num(inputs.a ?? "") ?? 7;
        const b = num(inputs.b ?? "") ?? 8;
        const c = num(inputs.c ?? "") ?? 9;
        const labA = inputs.a || "a";
        const labB = inputs.b || "b";
        const labC = inputs.c || "c";
        // Validate triangle; fall back to defaults if invalid
        const valid = a > 0 && b > 0 && c > 0 && a + b > c && a + c > b && b + c > a;
        const A = valid ? a : 7,
          B = valid ? b : 8,
          C = valid ? c : 9;
        // Place vertex P1 (opposite side a) at origin? Convention: place side c along x-axis.
        // vertex X at (0,0), vertex Y at (c,0), vertex Z at position s.t. side a is opposite X, b opposite Y.
        // Distance X→Z = b, Y→Z = a
        // angle at X = acos((b²+c²-a²)/(2bc))
        const angX = Math.acos((B * B + C * C - A * A) / (2 * B * C));
        const P1 = { x: 0, y: 0 };
        const P2 = { x: C, y: 0 };
        const P3 = { x: B * Math.cos(angX), y: B * Math.sin(angX) };
        const xs = [P1.x, P2.x, P3.x];
        const ys = [P1.y, P2.y, P3.y];
        const minX = Math.min(...xs),
          maxX = Math.max(...xs);
        const minY = Math.min(...ys),
          maxY = Math.max(...ys);
        const W = 300,
          H = 200,
          pad = 30;
        const scale = Math.min((W - 2 * pad) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
        const ox = pad - minX * scale;
        const oy = H - pad + minY * scale;
        const tx = (x: number) => ox + x * scale;
        const ty = (y: number) => oy - y * scale;
        const p1 = [tx(P1.x), ty(P1.y)];
        const p2 = [tx(P2.x), ty(P2.y)];
        const p3 = [tx(P3.x), ty(P3.y)];
        const midSideLabel = (
          pa: number[],
          pb: number[],
          opp: number[],
          text: string,
        ) => {
          const mx = (pa[0] + pb[0]) / 2;
          const my = (pa[1] + pb[1]) / 2;
          const dx = mx - opp[0],
            dy = my - opp[1];
          const len = Math.hypot(dx, dy) || 1;
          return (
            <text
              x={mx + (dx / len) * 14}
              y={my + (dy / len) * 14}
              textAnchor="middle"
              className={label}
            >
              {text}
            </text>
          );
        };
        return wrap(
          <>
            <polygon points={`${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`} />
            {midSideLabel(p2, p3, p1, labA)}
            {midSideLabel(p1, p3, p2, labB)}
            {midSideLabel(p1, p2, p3, labC)}
          </>,
        );
      }
    }
    case "trapezoid": {
      const b1 = inputs.b1 || "b₁";
      const b2 = inputs.b2 || "b₂";
      const h = inputs.h || "h";
      const c = inputs.c;
      const d = inputs.d;
      return wrap(
        <>
          <polygon points="100,60 200,60 240,150 60,150" />
          <line x1={150} y1={60} x2={150} y2={150} strokeDasharray="4 3" strokeOpacity={0.5} />
          <text x={150} y={52} textAnchor="middle" className={label}>{b1}</text>
          <text x={150} y={168} textAnchor="middle" className={label}>{b2}</text>
          {!(c && d) && <text x={158} y={110} className={label}>{h}</text>}
          {c && <text x={155} y={100} textAnchor="middle" className={label}>c = {c}</text>}
          {d && <text x={80} y={110} textAnchor="middle" className={label}>d = {d}</text>}
        </>,
      );
    }
    case "parallelogram": {
      const b = inputs.b || "b";
      const h = inputs.h || "h";
      return wrap(
        <>
          <polygon points="80,60 240,60 220,150 60,150" />
          <line x1={80} y1={60} x2={80} y2={150} strokeDasharray="4 3" strokeOpacity={0.5} />
          <text x={140} y={170} textAnchor="middle" className={label}>{b}</text>
          <text x={55} y={110} textAnchor="end" className={label}>{h}</text>
        </>,
      );
    }
    case "rhombus": {
      const d1 = inputs.d1 || "d₁";
      const d2 = inputs.d2 || "d₂";
      return wrap(
        <>
          <polygon points="150,40 240,105 150,170 60,105" />
          <line x1={60} y1={105} x2={240} y2={105} strokeDasharray="4 3" strokeOpacity={0.5} />
          <line x1={150} y1={40} x2={150} y2={170} strokeDasharray="4 3" strokeOpacity={0.5} />
          <text x={250} y={108} className={label}>{d1}</text>
          <text x={155} y={35} className={label}>{d2}</text>
        </>,
      );
    }
    case "kite": {
      const d1 = inputs.d1 || "d₁";
      const d2 = inputs.d2 || "d₂";
      return wrap(
        <>
          {/* Symmetric kite: top short vertex, wider midline, longer bottom vertex */}
          <polygon points="150,40 235,95 150,180 65,95" />
          <line x1={65} y1={95} x2={235} y2={95} strokeDasharray="4 3" strokeOpacity={0.5} />
          <line x1={150} y1={40} x2={150} y2={180} strokeDasharray="4 3" strokeOpacity={0.5} />
          <text x={245} y={99} className={label}>{d1}</text>
          <text x={155} y={35} className={label}>{d2}</text>
        </>,
      );
    }
    case "circle": {
      const r = inputs.r || "r";
      return wrap(
        <>
          <circle cx={150} cy={105} r={70} />
          <line x1={150} y1={105} x2={220} y2={105} strokeDasharray="4 3" />
          <circle cx={150} cy={105} r={2} fill={stroke} fillOpacity={1} />
          <text x={185} y={100} className={label}>{r}</text>
        </>,
      );
    }
    case "semicircle": {
      const r = inputs.r || "r";
      return wrap(
        <>
          <path d="M 70 140 A 80 80 0 0 1 230 140 L 70 140 Z" />
          <line x1={150} y1={140} x2={230} y2={140} strokeDasharray="4 3" />
          <circle cx={150} cy={140} r={2} fill={stroke} fillOpacity={1} />
          <text x={190} y={135} className={label}>{r}</text>
        </>,
      );
    }
    case "sector": {
      const r = inputs.r || "r";
      const th = inputs.theta;
      let thetaDeg = 60;
      const parsed = num(th ?? "");
      if (parsed !== null) thetaDeg = sectorUnit === "deg" ? parsed : (parsed * 180) / Math.PI;
      thetaDeg = Math.max(1, Math.min(359, thetaDeg));
      const R = 80;
      const cx = 150;
      const cy = 110;
      const a1 = (-thetaDeg / 2) * (Math.PI / 180);
      const a2 = (thetaDeg / 2) * (Math.PI / 180);
      const x1 = cx + R * Math.cos(a1);
      const y1 = cy + R * Math.sin(a1);
      const x2 = cx + R * Math.cos(a2);
      const y2 = cy + R * Math.sin(a2);
      const large = thetaDeg > 180 ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
      return wrap(
        <>
          <path d={d} />
          <text x={cx + R / 2} y={cy - 6} textAnchor="middle" className={label}>{r}</text>
          <text x={cx + 20} y={cy + 5} className={label}>θ</text>
        </>,
      );
    }
    case "segment": {
      const r = inputs.r || "r";
      let thetaDeg = 90;
      if (segMode === "angle") {
        const p = num(inputs.theta ?? "");
        if (p !== null) thetaDeg = sectorUnit === "deg" ? p : (p * 180) / Math.PI;
      } else {
        const rNum = num(inputs.r ?? "") ?? 10;
        const chord = num(inputs.chord ?? "");
        if (chord !== null && chord > 0 && chord <= 2 * rNum) {
          thetaDeg = (2 * Math.asin(chord / (2 * rNum)) * 180) / Math.PI;
        }
      }
      thetaDeg = Math.max(1, Math.min(359, thetaDeg));
      const R = 80;
      const cx = 150;
      const cy = 115;
      const a1 = (-thetaDeg / 2 - 90) * (Math.PI / 180);
      const a2 = (thetaDeg / 2 - 90) * (Math.PI / 180);
      const x1 = cx + R * Math.cos(a1);
      const y1 = cy + R * Math.sin(a1);
      const x2 = cx + R * Math.cos(a2);
      const y2 = cy + R * Math.sin(a2);
      const large = thetaDeg > 180 ? 1 : 0;
      // full circle outline for context, then segment fill
      return wrap(
        <>
          <circle cx={cx} cy={cy} r={R} fillOpacity={0.04} />
          <path
            d={`M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`}
          />
          <line x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray="4 3" />
          <text x={cx} y={cy + R + 14} textAnchor="middle" className={label}>chord</text>
          <text x={cx + R + 5} y={cy} className={label}>{r}</text>
        </>,
      );
    }
    case "ellipse": {
      const a = inputs.a || "a";
      const b = inputs.b || "b";
      return wrap(
        <>
          <ellipse cx={150} cy={105} rx={100} ry={55} />
          <line x1={150} y1={105} x2={250} y2={105} strokeDasharray="4 3" />
          <line x1={150} y1={105} x2={150} y2={50} strokeDasharray="4 3" />
          <text x={205} y={100} className={label}>{a}</text>
          <text x={155} y={80} className={label}>{b}</text>
        </>,
      );
    }
    case "polygon": {
      const nRaw = num(inputs.n ?? "");
      const s = inputs.s || "s";
      const n = nRaw && nRaw >= 3 ? Math.floor(nRaw) : 6;
      const cx = 150;
      const cy = 105;
      const R = 75;
      const pts: string[] = [];
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        pts.push(`${cx + R * Math.cos(ang)},${cy + R * Math.sin(ang)}`);
      }
      return wrap(
        <>
          <polygon points={pts.join(" ")} />
          <circle cx={cx} cy={cy} r={2} fill={stroke} fillOpacity={1} />
          <text x={cx} y={cy + 12} textAnchor="middle" className={label}>n = {n}</text>
          <text x={cx + R + 5} y={cy} className={label}>s = {s}</text>
        </>,
      );
    }
    case "coords": {
      const { pts } = parseVertices(coordText);
      if (pts.length < 2) return wrap(<text x={150} y={100} textAnchor="middle" className={label}>Enter at least 3 vertices</text>);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const minX = Math.min(...xs),
        maxX = Math.max(...xs);
      const minY = Math.min(...ys),
        maxY = Math.max(...ys);
      const W = 300,
        H = 200,
        pad = 20;
      const scale = Math.min(
        (W - 2 * pad) / (maxX - minX || 1),
        (H - 2 * pad) / (maxY - minY || 1),
      );
      const ox = pad - minX * scale;
      const oy = H - pad + minY * scale;
      const svgPts = pts.map(([x, y]) => `${ox + x * scale},${oy - y * scale}`).join(" ");
      return wrap(
        <>
          <polygon points={svgPts} />
          {pts.map(([x, y], i) => (
            <circle
              key={i}
              cx={ox + x * scale}
              cy={oy - y * scale}
              r={2.5}
              fill={stroke}
              fillOpacity={1}
            />
          ))}
        </>,
      );
    }
    case "annulus": {
      const R = num(inputs.R ?? "") ?? 5;
      const r = num(inputs.r ?? "") ?? 3;
      const Rs = 80;
      const rs = R > 0 ? (Math.min(r, R * 0.95) / R) * Rs : Rs * 0.5;
      return wrap(
        <>
          <path
            d={`M ${150 - Rs} 105 A ${Rs} ${Rs} 0 1 0 ${150 + Rs} 105 A ${Rs} ${Rs} 0 1 0 ${150 - Rs} 105 Z M ${150 - rs} 105 A ${rs} ${rs} 0 1 1 ${150 + rs} 105 A ${rs} ${rs} 0 1 1 ${150 - rs} 105 Z`}
            fillRule="evenodd"
          />
          <text x={150 + Rs + 5} y={102} className={label}>R</text>
          <text x={150 + rs + 3} y={102} className={label}>r</text>
        </>,
      );
    }
    case "starPolygon": {
      const nRaw = num(inputs.n ?? "");
      const Rraw = num(inputs.R ?? "");
      const rRaw = num(inputs.r ?? "");
      const n = nRaw && nRaw >= 3 ? Math.floor(nRaw) : 5;
      const Rv = Rraw && Rraw > 0 ? Rraw : 10;
      const rV = rRaw && rRaw > 0 && rRaw < Rv ? rRaw : Rv * 0.4;
      const cx = 150;
      const cy = 105;
      const scale = 75 / Rv;
      const Rs = Rv * scale;
      const rs = rV * scale;
      const pts: string[] = [];
      for (let i = 0; i < 2 * n; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / n;
        const R2 = i % 2 === 0 ? Rs : rs;
        pts.push(`${cx + R2 * Math.cos(ang)},${cy + R2 * Math.sin(ang)}`);
      }
      const tipAng = -Math.PI / 2;
      const notchAng = -Math.PI / 2 + Math.PI / n;
      return wrap(
        <>
          <polygon points={pts.join(" ")} />
          <line
            x1={cx}
            y1={cy}
            x2={cx + Rs * Math.cos(tipAng)}
            y2={cy + Rs * Math.sin(tipAng)}
            strokeDasharray="4 3"
            strokeOpacity={0.6}
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx + rs * Math.cos(notchAng)}
            y2={cy + rs * Math.sin(notchAng)}
            strokeDasharray="4 3"
            strokeOpacity={0.6}
          />
          <circle cx={cx} cy={cy} r={2} fill={stroke} fillOpacity={1} />
          <text x={cx + 4} y={cy + Rs / 2} className={label}>R</text>
          <text x={cx + rs * Math.cos(notchAng) + 4} y={cy + rs * Math.sin(notchAng) + 10} className={label}>r</text>
          <text x={cx} y={cy + Rs + 14} textAnchor="middle" className={label}>n = {n}</text>
        </>,
      );
    }
  }
}

/* ================= Composite Shape Builder ================= */

interface CompositeItem {
  id: string;
  shape: Shape;
  inputs: Record<string, string>;
  triMode: "bh" | "sss";
  trapMode: "bh" | "sides";
  sectorUnit: "deg" | "rad";
  segMode: "chord" | "angle";
  coordText: string;
}

function newCompositeItem(shape: Shape = "rectangle"): CompositeItem {
  return {
    id: Math.random().toString(36).slice(2, 10),
    shape,
    inputs: {},
    triMode: "bh",
    trapMode: "bh",
    sectorUnit: "deg",
    segMode: "angle",
    coordText: "0,0\n4,0\n4,3\n0,3",
  };
}

function CompositeBuilder() {
  const [unit, setUnit] = useState<string>("m");
  const [items, setItems] = useState<CompositeItem[]>([
    newCompositeItem("rectangle"),
  ]);

  const update = (id: string, patch: Partial<CompositeItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));
  const add = () => setItems((prev) => [...prev, newCompositeItem("rectangle")]);

  const results = useMemo(
    () =>
      items.map((it) => ({
        item: it,
        result: compute(
          it.shape,
          it.inputs,
          it.triMode,
          it.sectorUnit,
          it.segMode,
          it.coordText,
          it.trapMode,
          unit,
        ),
      })),
    [items, unit],
  );

  const total = results.reduce(
    (sum, { result }) => (result.area !== null ? sum + result.area : sum),
    0,
  );
  const anyValid = results.some(({ result }) => result.area !== null);

  const compositeSteps = useMemo(() => {
    if (!anyValid) return [];
    const steps: Step[] = [];

    results.forEach(({ item, result }, i) => {
      if (result.area === null) return;
      
      const formulaStep = result.steps.find(s => s.title.toLowerCase().includes("formula"));
      const subStep = result.steps.find(s => s.title.toLowerCase().includes("substitute") || s.title.toLowerCase().includes("halve"));

      steps.push({
        title: `Component ${i + 1}: ${SHAPE_LABEL[item.shape]}`,
        body: (
          <div className="space-y-1">
            {formulaStep && (
              <>
                <MathNote>Formula:</MathNote>
                {formulaStep.body}
              </>
            )}
            {subStep && (
              <>
                <MathNote>Substitution:</MathNote>
                {subStep.body}
              </>
            )}
            <MathNote>Partial area:</MathNote>
            <MathLine>A_{i + 1} = <strong>{fmt(result.area)} {unit}²</strong></MathLine>
          </div>
        )
      });
    });

    const sumExpr = results
      .filter(r => r.result.area !== null)
      .map((_, i) => `A_{${i + 1}}`)
      .join(" + ");
    const sumVal = results
      .filter(r => r.result.area !== null)
      .map(r => fmt(r.result.area!))
      .join(" + ");

    steps.push({
      title: "Total Area",
      body: (
        <div className="space-y-1">
          <MathNote>Summing all components:</MathNote>
          <MathLine>A_{"total"} = {sumExpr}</MathLine>
          <MathLine>A_{"total"} = {sumVal} = <strong>{fmt(total)} {unit}²</strong></MathLine>
        </div>
      )
    });

    return steps;
  }, [results, anyValid, total, unit]);

  return (
    <CalcSection title="Composite shape builder">
      <p className="text-sm text-muted-foreground">
        Stack any number of the 16 shapes above into one composite figure and
        get the combined total area, with a per-component breakdown. Ideal
        for L-shaped rooms, irregular lots, and floor plans that are really
        several simple shapes glued together.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Unit (shared across all components)">
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="mm">millimeters (mm)</option>
            <option value="cm">centimeters (cm)</option>
            <option value="m">meters (m)</option>
            <option value="km">kilometers (km)</option>
            <option value="in">inches (in)</option>
            <option value="ft">feet (ft)</option>
            <option value="yd">yards (yd)</option>
            <option value="mi">miles (mi)</option>
          </select>
        </Field>
      </div>

      <div className="space-y-4">
        {items.map((it, idx) => {
          const r = results[idx].result;
          return (
            <div
              key={it.id}
              className="rounded-2xl border border-border/60 bg-secondary/20 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Component {idx + 1}
                </span>
                <select
                  value={it.shape}
                  onChange={(e) =>
                    update(it.id, {
                      shape: e.target.value as Shape,
                      inputs: {},
                    })
                  }
                  className="rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-sm text-foreground focus:border-primary/60 focus:outline-none"
                >
                  {shapes.map((s) => (
                    <option key={s} value={s}>
                      {SHAPE_LABEL[s]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  disabled={items.length === 1}
                  className="ml-auto rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Remove
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ShapeInputs
                  shape={it.shape}
                  inputs={it.inputs}
                  set={(k, v) =>
                    update(it.id, { inputs: { ...it.inputs, [k]: v } })
                  }
                  triMode={it.triMode}
                  setTriMode={(m) => update(it.id, { triMode: m })}
                  trapMode={it.trapMode}
                  setTrapMode={(m) => update(it.id, { trapMode: m })}
                  sectorUnit={it.sectorUnit}
                  setSectorUnit={(u) => update(it.id, { sectorUnit: u })}
                  segMode={it.segMode}
                  setSegMode={(m) => update(it.id, { segMode: m })}
                  coordText={it.coordText}
                  setCoordText={(v) => update(it.id, { coordText: v })}
                />
                <div className="flex flex-col justify-center rounded-xl border border-border/40 bg-background/40 p-3 text-sm">
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Area
                  </div>
                  {r.error ? (
                    <div className="mt-1 text-destructive">{r.error}</div>
                  ) : r.area === null ? (
                    <div className="mt-1 text-muted-foreground">
                      Enter dimensions…
                    </div>
                  ) : (
                    <div className="mt-1 font-serif italic text-lg tabular-nums text-foreground">
                      {fmt(r.area, 6)} {unit}
                      <sup>2</sup>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={add}
          className="rounded-full border border-primary/60 bg-primary/10 px-4 py-1.5 text-sm text-foreground hover:bg-primary/20"
        >
          + Add component
        </button>
      </div>

      {anyValid && (
        <div className="mt-5 rounded-2xl border border-border/60 bg-card/40 p-4">
          <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Combined total area
          </div>
          <div className="mb-4 font-serif italic text-2xl tabular-nums text-foreground">
            {fmt(total, 6)} {unit}
            <sup>2</sup>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Shape</th>
                  <th className="py-2 pr-3 text-right">
                    Area ({unit}
                    <sup>2</sup>)
                  </th>
                  <th className="py-2 pr-3 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {results.map(({ item, result }, i) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/30 last:border-0"
                  >
                    <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 pr-3 text-foreground">
                      {SHAPE_LABEL[item.shape]}
                    </td>
                    <td className="py-2 pr-3 text-right font-serif italic tabular-nums text-foreground">
                      {result.area === null ? "—" : fmt(result.area, 6)}
                    </td>
                    <td className="py-2 pr-3 text-right font-serif italic tabular-nums text-muted-foreground">
                      {result.area === null || total === 0
                        ? "—"
                        : ((result.area / total) * 100).toFixed(2) + "%"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/60">
                  <td colSpan={2} className="py-2 pr-3 font-medium text-foreground">
                    Total
                  </td>
                  <td className="py-2 pr-3 text-right font-serif italic tabular-nums text-foreground">
                    {fmt(total, 6)}
                  </td>
                  <td className="py-2 pr-3 text-right font-serif italic tabular-nums text-muted-foreground">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-border/60">
            <StepsToggle steps={compositeSteps} />
          </div>
        </div>
      )}
    </CalcSection>
  );
}

/* ================= Educational content ================= */

function AreaEducation() {
  return (
    <>
      <CalcSection title="What is area?">
        <p>
          Area is the amount of flat, two-dimensional space a shape covers. Think of it as the size
          of a surface — the floor of a room, a garden bed, a piece of land, a sheet of glass, or a
          screen. If you were painting that surface, the area tells you exactly how much paint you
          would need to cover every part of it.
        </p>
        <p>
          Because area measures space in two directions at the same time (length and width), the
          answer is always in <em>square</em> units — square centimeters, square meters, square
          feet, acres, hectares and so on. A number without a unit is not an area; “12” only becomes
          meaningful when you say 12 m² or 12 ft².
        </p>
        <p>
          Every formula on this page is really the same idea in different clothing: find how far the
          shape stretches sideways, multiply by how far it stretches up and down, then adjust for
          curves, slopes or missing corners. Rectangles use plain length × width. Triangles use half
          of that because a triangle is exactly one half of a matching rectangle. Circles use π
          because the width and height blend smoothly around the curve.
        </p>
      </CalcSection>

      <CalcSection title="Area formulas explained, shape by shape">
        <p className="text-sm text-muted-foreground">
          For every shape below you'll see a plain-English explanation, the
          formula (with what each letter means), a diagram, and a worked
          example — all in one place.
        </p>
        <div className="mt-4 space-y-5">
          {SHAPE_GUIDE.map((g) => (
            <div
              key={g.shape}
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
                  <ShapeDiagram
                    shape={g.shape}
                    inputs={g.inputs}
                    triMode={g.triMode ?? "bh"}
                    sectorUnit={g.sectorUnit ?? "deg"}
                    segMode={g.segMode ?? "angle"}
                    coordText={g.coordText ?? ""}
                  />
                </div>
                <div className="md:col-span-2 md:row-start-2">
                  <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Example
                    </div>
                    <div className="space-y-1 text-foreground">
                      <div><span className="text-muted-foreground">Given: </span><span className="font-serif italic">{g.example.given}</span></div>
                      <div><span className="text-muted-foreground">Substitute: </span><span className="font-serif italic">{g.example.substitute}</span></div>
                      <div>
                        <span className="text-muted-foreground">Answer: </span>
                        <span className="font-serif italic font-semibold tabular-nums">{g.example.answer}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CalcSection>




      <CalcSection title="Common area unit conversions">
        <ReferenceTable
          headers={["From", "To", "Multiply by"]}
          numericColumns={[2]}
          rows={[
            ["1 square meter", "square feet", "10.7639"],
            ["1 square meter", "square yards", "1.19599"],
            ["1 square foot", "square meters", "0.09290"],
            ["1 acre", "square meters", "4046.856"],
            ["1 acre", "hectares", "0.40469"],
            ["1 hectare", "square meters", "10 000"],
            ["1 hectare", "acres", "2.47105"],
            ["1 square mile", "square kilometers", "2.58999"],
            ["1 square kilometer", "square miles", "0.38610"],
          ]}
        />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "16 shapes and tools — square, rectangle, triangle (base–height and Heron), trapezoid, parallelogram, rhombus, kite, circle, semicircle, sector, circular segment, ellipse, regular polygon (any n ≥ 3), irregular polygon by coordinates (Shoelace), annulus, and regular star polygon (A = n × R × r × sin(π/n)).",
            "Dropdown shape picker with a distinct input form for each shape — only the fields that shape actually needs.",
            "Live SVG diagram that updates as you type, with your dimensions labeled — the SSS triangle draws to scale from the actual side lengths, and the coordinate polygon plots your vertices.",
            "Triangle mode toggle: base–height, or three-sides (Heron's formula). The circular-segment tool also toggles between central-angle and chord-length input.",
            "Sector and circular-segment angles accept both degrees and radians via a unit toggle.",
            "Length unit selector (mm, cm, m, km, in, ft, yd, mi) that feeds the automatic unit-conversion output.",
            "Every result also shown converted to square meters, square feet, square yards, acres, hectares, square kilometers and square miles.",
            "Perimeter/circumference reported alongside the area wherever it's well-defined for the chosen shape.",
            "Cost / material estimator on every shape — enter a price per square unit and get an instant total for flooring, paint, land or carpet.",
            "Polygon by coordinates: paste any set of (x, y) vertices and the Shoelace formula does the rest — with a per-edge cross-term breakdown.",
            "Show/hide step-by-step working — formula, substitution, and final answer for every shape, with a variable legend under every formula.",
            "Copy the result, download it as a PNG or PDF, or print the result panel — all from the results toolbar.",
            "Input validation with clear error messages — negative sides, triangle-inequality violations, chord longer than the diameter, etc.",
            "Trapezoid alternate input mode: enter all 4 side lengths (both bases plus the two non-parallel sides) and the calculator derives the height for you, with a fallback for the parallelogram edge case.",
            "Composite shape builder: stack any number of the 16 shapes into one figure and get the combined total area, a per-component breakdown table, and each component's percentage share — great for L-shaped rooms, irregular lots, and floor plans.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={FAQ_ITEMS.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))}
        />
      </CalcSection>


      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/triangle-calculator", label: "Triangle Calculator" },
            { to: "/calculators/math", label: "All Math Calculators" },
            { to: "/calculators/math/root-calculator", label: "Square Root Calculator" },
            { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
          ]}
        />
      </CalcSection>
    </>
  );
}
