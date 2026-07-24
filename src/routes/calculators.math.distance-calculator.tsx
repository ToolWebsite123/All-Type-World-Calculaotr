import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
  ResultBox,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  FormulaWithLegend,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  StackedMath,
  ModeFormula,
  AllFormulasSection,
} from "@/components/MathCalcPage";
import { type Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/CopyButton";

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


export const Route = createFileRoute("/calculators/math/distance-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Distance Calculator",
      title: "Distance Calculator — 2D, 3D & Lat/Long Between Points",
      metaDescription:
        "Distance between two points in 2D, 3D or on Earth (Haversine & Lambert). Km and miles, DMS input, click-to-place world map and step-by-step working.",
      canonicalUrl: "/calculators/math/distance-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Distance Calculator",
          path: "/calculators/math/distance-calculator",
        },
      ],
      faqs: [
        {
          q: "What is the distance formula?",
          a: "In a 2D plane the distance between (x₁,y₁) and (x₂,y₂) is d = √((x₂−x₁)² + (y₂−y₁)²). It comes straight from the Pythagorean theorem — the horizontal and vertical gaps are the two legs of a right triangle and the distance is the hypotenuse.",
        },
        {
          q: "Does the order of the two points matter?",
          a: "No. Because each difference is squared, (x₂−x₁)² equals (x₁−x₂)², so you get the same answer whichever point you label 1 and which one you label 2. The same is true in 3D and for the Haversine formula.",
        },
        {
          q: "How do I calculate distance between two GPS coordinates?",
          a: "Use the Haversine formula, which gives the shortest distance across the surface of a sphere. Convert both latitudes and longitudes to radians, plug into a = sin²(Δφ/2) + cos φ₁·cos φ₂·sin²(Δλ/2), then d = 2R·asin(√a) with R ≈ 6371 km (3959 mi) for the Earth.",
        },
        {
          q: "Why do Haversine and Lambert's formula give slightly different answers?",
          a: "Haversine assumes the Earth is a perfect sphere; the real Earth is an oblate spheroid — slightly wider at the equator than pole-to-pole. That difference can put Haversine off by up to about 0.5%. Lambert's formula corrects for the flattening and is usually accurate to within about 10 metres over thousands of kilometres.",
        },
        {
          q: "What's the difference between great-circle distance and driving distance?",
          a: "Great-circle distance is the shortest possible path between two points along the Earth's surface, as the crow flies. Driving distance follows actual roads, which are longer and depend on the route. This calculator gives great-circle distance only.",
        },
        {
          q: "Can I enter coordinates in degrees, minutes, seconds?",
          a: "Yes — switch the lat/long tab to DMS. Enter each coordinate as three numbers (degrees, minutes, seconds) plus a hemisphere. The calculator converts to decimal degrees using ± (degrees + minutes/60 + seconds/3600), with South and West being negative.",
        },
      ],
    }),
  component: DistancePage,
});

// ============================================================
// Formatting helpers
// ============================================================

function fmt(v: number, digits = 6): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e6 || abs < 1e-4) return v.toExponential(4);
  return Number(v.toPrecision(digits)).toString();
}

function parseNum(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

/* ================= Method-guide diagrams & data ================= */

function DiagCard({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function Diag2D() {
  // (1,5) to (3,2): show right-triangle legs
  return (
    <DiagCard label="2D coordinate plane">
      <svg viewBox="0 0 220 180" className="h-auto w-full">
        {/* axes */}
        <line x1="20" y1="160" x2="210" y2="160" className="stroke-border" strokeWidth="1" />
        <line x1="20" y1="10" x2="20" y2="160" className="stroke-border" strokeWidth="1" />
        {/* grid ticks */}
        {[0,1,2,3,4,5].map(i => (
          <line key={"gx"+i} x1={20+i*30} y1="158" x2={20+i*30} y2="162" className="stroke-border" />
        ))}
        {[0,1,2,3,4,5].map(i => (
          <line key={"gy"+i} x1="18" y1={160-i*25} x2="22" y2={160-i*25} className="stroke-border" />
        ))}
        {/* points P1(1,5) => (50,35); P2(3,2) => (110,110) */}
        <line x1="50" y1="35" x2="110" y2="110" className="stroke-primary" strokeWidth="2" />
        <line x1="50" y1="35" x2="50" y2="110" strokeDasharray="4 3" className="stroke-muted-foreground" />
        <line x1="50" y1="110" x2="110" y2="110" strokeDasharray="4 3" className="stroke-muted-foreground" />
        <circle cx="50" cy="35" r="4" className="fill-primary" />
        <circle cx="110" cy="110" r="4" className="fill-primary" />
        <text x="55" y="30" className="fill-foreground text-[11px]">P₁(1, 5)</text>
        <text x="115" y="125" className="fill-foreground text-[11px]">P₂(3, 2)</text>
        <text x="30" y="80" className="fill-muted-foreground text-[10px]">Δy = 3</text>
        <text x="65" y="125" className="fill-muted-foreground text-[10px]">Δx = 2</text>
        <text x="78" y="65" className="fill-primary text-[11px] font-semibold">d</text>
      </svg>
    </DiagCard>
  );
}

function Diag3D() {
  return (
    <DiagCard label="3D coordinate space (isometric)">
      <svg viewBox="0 0 220 180" className="h-auto w-full">
        {/* axes */}
        <line x1="30" y1="150" x2="200" y2="150" className="stroke-border" />
        <line x1="30" y1="150" x2="30" y2="20" className="stroke-border" />
        <line x1="30" y1="150" x2="90" y2="110" className="stroke-border" />
        <text x="200" y="145" className="fill-muted-foreground text-[10px]">x</text>
        <text x="20" y="20" className="fill-muted-foreground text-[10px]">z</text>
        <text x="90" y="105" className="fill-muted-foreground text-[10px]">y</text>
        {/* two points */}
        <circle cx="70" cy="120" r="4" className="fill-primary" />
        <circle cx="150" cy="60" r="4" className="fill-primary" />
        <line x1="70" y1="120" x2="150" y2="60" className="stroke-primary" strokeWidth="2" />
        <text x="45" y="135" className="fill-foreground text-[11px]">P₁(1, 3, 7)</text>
        <text x="150" y="55" className="fill-foreground text-[11px]">P₂(2, 4, 8)</text>
        <text x="105" y="85" className="fill-primary text-[11px] font-semibold">d</text>
      </svg>
    </DiagCard>
  );
}

function DiagHaversine() {
  return (
    <DiagCard label="Great-circle arc on a sphere">
      <svg viewBox="0 0 220 180" className="h-auto w-full">
        <circle cx="110" cy="90" r="70" className="fill-transparent stroke-border" strokeWidth="1.5" />
        {/* equator ellipse */}
        <ellipse cx="110" cy="90" rx="70" ry="18" className="fill-transparent stroke-border" strokeDasharray="3 3" />
        {/* meridian */}
        <ellipse cx="110" cy="90" rx="18" ry="70" className="fill-transparent stroke-border" strokeDasharray="3 3" />
        {/* two points + arc */}
        <path d="M 70 55 Q 110 30 155 75" className="fill-transparent stroke-primary" strokeWidth="2" />
        <circle cx="70" cy="55" r="4" className="fill-primary" />
        <circle cx="155" cy="75" r="4" className="fill-primary" />
        <text x="35" y="50" className="fill-foreground text-[11px]">London</text>
        <text x="160" y="75" className="fill-foreground text-[11px]">Paris</text>
        <text x="100" y="35" className="fill-primary text-[11px] font-semibold">d</text>
      </svg>
    </DiagCard>
  );
}

function DiagLambert() {
  return (
    <DiagCard label="Oblate spheroid (WGS-84)">
      <svg viewBox="0 0 220 180" className="h-auto w-full">
        <ellipse cx="110" cy="90" rx="80" ry="65" className="fill-transparent stroke-border" strokeWidth="1.5" />
        <ellipse cx="110" cy="90" rx="80" ry="18" className="fill-transparent stroke-border" strokeDasharray="3 3" />
        <line x1="110" y1="20" x2="110" y2="160" className="stroke-border" strokeDasharray="2 3" />
        <text x="115" y="18" className="fill-muted-foreground text-[10px]">polar 6357 km</text>
        <text x="30" y="105" className="fill-muted-foreground text-[10px]">equatorial 6378 km</text>
        <path d="M 60 60 Q 110 45 170 90" className="fill-transparent stroke-primary" strokeWidth="2" />
        <circle cx="60" cy="60" r="4" className="fill-primary" />
        <circle cx="170" cy="90" r="4" className="fill-primary" />
      </svg>
    </DiagCard>
  );
}

function DiagDMS() {
  return (
    <DiagCard label="DMS → decimal degrees">
      <svg viewBox="0 0 220 180" className="h-auto w-full">
        <rect x="15" y="30" width="190" height="45" rx="8" className="fill-transparent stroke-border" />
        <text x="25" y="58" className="fill-foreground text-[13px] font-serif italic">51° 30′ 26.6″ N</text>
        <line x1="110" y1="90" x2="110" y2="115" className="stroke-primary" strokeWidth="2" markerEnd="url(#arr)" />
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" className="fill-primary" />
          </marker>
        </defs>
        <rect x="15" y="120" width="190" height="45" rx="8" className="fill-transparent stroke-primary" />
        <text x="45" y="148" className="fill-foreground text-[13px] font-serif italic">51.507389°</text>
      </svg>
    </DiagCard>
  );
}

const LEG_2D = [
  { sym: "d", def: "distance between the points" },
  { sym: "x₁, y₁", def: "coordinates of the first point" },
  { sym: "x₂, y₂", def: "coordinates of the second point" },
];
const LEG_3D = [
  { sym: "d", def: "3D straight-line distance" },
  { sym: "x, y, z", def: "coordinates on each axis" },
];
const LEG_HAV = [
  { sym: "φ₁, φ₂", def: "latitudes in radians" },
  { sym: "Δφ, Δλ", def: "differences in latitude / longitude (radians)" },
  { sym: "R", def: "Earth's mean radius (≈ 6371 km)" },
  { sym: "d", def: "great-circle distance" },
];
const LEG_LAM = [
  { sym: "a, f", def: "equatorial radius and flattening of WGS-84" },
  { sym: "β₁, β₂", def: "reduced latitudes: tan β = (1 − f) tan φ" },
  { sym: "d", def: "ellipsoidal surface distance" },
];
const LEG_DMS = [
  { sym: "D", def: "whole degrees" },
  { sym: "M", def: "arc-minutes" },
  { sym: "S", def: "arc-seconds" },
];

type DistanceGuide = {
  title: string;
  explain: ReactNode;
  formula: ReactNode;
  legend: { sym: ReactNode; def: ReactNode }[];
  diagram: ReactNode;
  example: { given: ReactNode; substitute: ReactNode; answer: ReactNode };
};

const DISTANCE_GUIDE: DistanceGuide[] = [
  {
    title: "2D distance (Pythagorean)",
    explain:
      "In a flat plane, subtract the x-coordinates and the y-coordinates. Those two differences are the legs of a right triangle whose hypotenuse is the distance you want. Because each difference is squared, the order of the two points doesn't change the answer.",
    formula: "d = √((x₂ − x₁)² + (y₂ − y₁)²)",
    legend: LEG_2D,
    diagram: <Diag2D />,
    example: {
      given: "P₁(1, 5), P₂(3, 2)",
      substitute: "d = √((3 − 1)² + (2 − 5)²) = √(4 + 9) = √13",
      answer: "d ≈ 3.6056",
    },
  },
  {
    title: "3D distance",
    explain:
      "Space adds a third axis, z, so we add a third squared difference. The formula is Pythagoras applied twice — once in the xy-plane, then again with that flat distance and Δz.",
    formula: "d = √((x₂ − x₁)² + (y₂ − y₁)² + (z₂ − z₁)²)",
    legend: LEG_3D,
    diagram: <Diag3D />,
    example: {
      given: "P₁(1, 3, 7), P₂(2, 4, 8)",
      substitute: "d = √(1² + 1² + 1²) = √3",
      answer: "d ≈ 1.7321",
    },
  },
  {
    title: "Haversine (great-circle on a sphere)",
    explain:
      "For two points on Earth, the shortest path curves along the surface — a great-circle arc. Haversine assumes a perfect sphere of radius R and gives that arc length directly from the latitudes and longitudes. Convert every angle to radians first.",
    formula: (
      <>
        a = sin²(Δφ / 2) + cos φ₁ · cos φ₂ · sin²(Δλ / 2)
        <br />
        c = 2 · atan2(√a, √(1 − a))
        <br />
        d = R · c
      </>
    ),
    legend: LEG_HAV,
    diagram: <DiagHaversine />,
    example: {
      given: "London (51.5074° N, 0.1278° W) → Paris (48.8566° N, 2.3522° E)",
      substitute: "a = 0.000727, c ≈ 0.05394 rad, d = 6371 · 0.05394",
      answer: "d ≈ 343.6 km (≈ 213.5 mi)",
    },
  },
  {
    title: "Lambert's formula (oblate spheroid)",
    explain:
      "Earth is slightly wider at the equator than pole-to-pole (equatorial 6378 km, polar 6357 km). Haversine can be off by up to about 0.5%. Lambert's formula uses the WGS-84 ellipsoid via reduced latitudes β, then adds a small flattening correction — accurate to about 10 m over thousands of kilometres.",
    formula: (
      <>
        tan β = (1 − f) · tan φ
        <br />
        d ≈ a · (σ − f · correction(β₁, β₂, σ))
      </>
    ),
    legend: LEG_LAM,
    diagram: <DiagLambert />,
    example: {
      given: "Same London → Paris coordinates",
      substitute: "Apply flattening correction to Haversine central angle σ",
      answer: "d ≈ 343.55 km — within ~50 m of Haversine at this range",
    },
  },
  {
    title: "Degrees–Minutes–Seconds to decimal degrees",
    explain:
      "GPS and old maps often quote latitude/longitude in degrees, minutes and seconds. Convert to decimal degrees before applying any distance formula: divide minutes by 60 and seconds by 3600, then add. South and West become negative.",
    formula: "decimal = ± (D + M / 60 + S / 3600)",
    legend: LEG_DMS,
    diagram: <DiagDMS />,
    example: {
      given: "51° 30′ 26.6″ N",
      substitute: "51 + 30/60 + 26.6/3600 = 51 + 0.5 + 0.007389",
      answer: "≈ 51.507389°",
    },
  },
];



// ============================================================
// 2D distance
// ============================================================

function Calc2D() {
  const [x1, setX1] = useState("1");
  const [y1, setY1] = useState("1");
  const [x2, setX2] = useState("4");
  const [y2, setY2] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | null
    | {
        d: number;
        dx: number;
        dy: number;
        p1: [number, number];
        p2: [number, number];
      }
  >(null);

  const resultRef = useRef<HTMLDivElement>(null);

  const onCalc = () => {
    setError(null);
    const a = parseNum(x1);
    const b = parseNum(y1);
    const c = parseNum(x2);
    const d = parseNum(y2);
    if (a === null || b === null || c === null || d === null) {
      setResult(null);
      setError("Please enter numeric values for all four coordinates.");
      return;
    }
    const dx = c - a;
    const dy = d - b;
    const dist = Math.hypot(dx, dy);
    setResult({ d: dist, dx, dy, p1: [a, b], p2: [c, d] });
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const [a, b] = result.p1;
    const [c, d] = result.p2;
    return [
      {
        title: "Start with the 2D distance formula",
        body: <MathLine>d = √((x₂ − x₁)² + (y₂ − y₁)²)</MathLine>,
      },
      {
        title: "Substitute the coordinates",
        body: (
          <MathLine>
            d = √(({c} − {a})² + ({d} − {b})²)
          </MathLine>
        ),
      },
      {
        title: "Compute each squared difference",
        body: (
          <MathLine>
            d = √({fmt(result.dx)}² + {fmt(result.dy)}²) = √(
            {fmt(result.dx * result.dx)} + {fmt(result.dy * result.dy)}) = √
            {fmt(result.dx * result.dx + result.dy * result.dy)}
          </MathLine>
        ),
      },
      {
        title: "Take the square root",
        body: (
          <MathLine>
            d = <strong>{fmt(result.d)}</strong>
          </MathLine>
        ),
      },
    ];
  }, [result]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="x₁"><TextInput value={x1} onChange={(e) => setX1(e.target.value)} inputMode="decimal" /></Field>
        <Field label="y₁"><TextInput value={y1} onChange={(e) => setY1(e.target.value)} inputMode="decimal" /></Field>
        <Field label="x₂"><TextInput value={x2} onChange={(e) => setX2(e.target.value)} inputMode="decimal" /></Field>
        <Field label="y₂"><TextInput value={y2} onChange={(e) => setY2(e.target.value)} inputMode="decimal" /></Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton onClick={onCalc}>Calculate distance</PrimaryButton>
      </div>

      {error && <ErrorBox message={error} />}

      {result && (
        <div ref={resultRef}>
          <ResultBox
            label="Distance"
            value={
              <span className="flex flex-wrap items-center gap-3">
                <span>d = {fmt(result.d)}</span>
                <CopyButton text={String(result.d)} />
              </span>
            }
            note={
              <>Δx = {fmt(result.dx)}, Δy = {fmt(result.dy)}</>
            }
          />
          <Plane2D p1={result.p1} p2={result.p2} d={result.d} />
          <StepsToggle steps={steps} />
        </div>
      )}
    </div>
  );
}

function Plane2D({
  p1,
  p2,
  d,
}: {
  p1: [number, number];
  p2: [number, number];
  d: number;
}) {
  const W = 520;
  const H = 340;
  const PAD = 34;
  const xs = [p1[0], p2[0], 0];
  const ys = [p1[1], p2[1], 0];
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xSpan = Math.max(xMax - xMin, 1);
  const ySpan = Math.max(yMax - yMin, 1);
  const pad = 0.25;
  const xLo = xMin - xSpan * pad;
  const xHi = xMax + xSpan * pad;
  const yLo = yMin - ySpan * pad;
  const yHi = yMax + ySpan * pad;

  const sx = (x: number) => PAD + ((x - xLo) / (xHi - xLo)) * (W - 2 * PAD);
  const sy = (y: number) => H - PAD - ((y - yLo) / (yHi - yLo)) * (H - 2 * PAD);

  const axisColor = "var(--color-border)";
  const mutedColor = "var(--color-muted-foreground)";
  const primary = "var(--color-primary)";
  const orange = "#f59e0b";
  const text = "var(--color-foreground)";

  // Choose "nice" tick step for a grid
  const niceStep = (span: number) => {
    const raw = span / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
    const n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  };
  const xStep = niceStep(xHi - xLo);
  const yStep = niceStep(yHi - yLo);

  const xTicks: number[] = [];
  for (let t = Math.ceil(xLo / xStep) * xStep; t <= xHi + 1e-9; t += xStep) {
    xTicks.push(Number(t.toPrecision(10)));
  }
  const yTicks: number[] = [];
  for (let t = Math.ceil(yLo / yStep) * yStep; t <= yHi + 1e-9; t += yStep) {
    yTicks.push(Number(t.toPrecision(10)));
  }

  const originInsideX = xLo <= 0 && xHi >= 0;
  const originInsideY = yLo <= 0 && yHi >= 0;
  const axisX = originInsideY ? sy(0) : H - PAD;
  const axisY = originInsideX ? sx(0) : PAD;

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">2D coordinate plane</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Two points on a 2D coordinate plane with the connecting distance line">
        {/* grid */}
        {xTicks.map((t) => (
          <line key={`gx${t}`} x1={sx(t)} y1={PAD} x2={sx(t)} y2={H - PAD} stroke={axisColor} strokeOpacity={0.25} />
        ))}
        {yTicks.map((t) => (
          <line key={`gy${t}`} x1={PAD} y1={sy(t)} x2={W - PAD} y2={sy(t)} stroke={axisColor} strokeOpacity={0.25} />
        ))}

        {/* axes */}
        <line x1={PAD} y1={axisX} x2={W - PAD} y2={axisX} stroke={mutedColor} strokeWidth={1.2} />
        <line x1={axisY} y1={PAD} x2={axisY} y2={H - PAD} stroke={mutedColor} strokeWidth={1.2} />
        <text x={W - PAD + 4} y={axisX + 4} fill={mutedColor} fontSize={11}>x</text>
        <text x={axisY - 4} y={PAD - 4} fill={mutedColor} fontSize={11} textAnchor="end">y</text>

        {/* ticks */}
        {xTicks.map((t) => (
          <text key={`tx${t}`} x={sx(t)} y={axisX + 14} fill={mutedColor} fontSize={10} textAnchor="middle" fontFamily="monospace">{t}</text>
        ))}
        {yTicks.map((t) => (
          <text key={`ty${t}`} x={axisY - 6} y={sy(t) + 3} fill={mutedColor} fontSize={10} textAnchor="end" fontFamily="monospace">{t}</text>
        ))}

        {/* right-triangle legs */}
        <line x1={sx(p1[0])} y1={sy(p1[1])} x2={sx(p2[0])} y2={sy(p1[1])} stroke={mutedColor} strokeDasharray="4 3" />
        <line x1={sx(p2[0])} y1={sy(p1[1])} x2={sx(p2[0])} y2={sy(p2[1])} stroke={mutedColor} strokeDasharray="4 3" />

        {/* distance segment */}
        <line x1={sx(p1[0])} y1={sy(p1[1])} x2={sx(p2[0])} y2={sy(p2[1])} stroke={orange} strokeWidth={2.5} />

        {/* points */}
        <circle cx={sx(p1[0])} cy={sy(p1[1])} r={5} fill={primary} />
        <text x={sx(p1[0]) + 8} y={sy(p1[1]) - 8} fill={text} fontSize={12} fontFamily="monospace">({p1[0]}, {p1[1]})</text>
        <circle cx={sx(p2[0])} cy={sy(p2[1])} r={5} fill={primary} />
        <text x={sx(p2[0]) + 8} y={sy(p2[1]) - 8} fill={text} fontSize={12} fontFamily="monospace">({p2[0]}, {p2[1]})</text>

        {/* distance label */}
        <text x={(sx(p1[0]) + sx(p2[0])) / 2} y={(sy(p1[1]) + sy(p2[1])) / 2 - 8} fill={orange} fontSize={12} fontWeight={600} textAnchor="middle">d = {fmt(d)}</text>
      </svg>
    </div>
  );
}

// ============================================================
// 3D distance
// ============================================================

function Calc3D() {
  const [x1, setX1] = useState("1"); const [y1, setY1] = useState("1"); const [z1, setZ1] = useState("1");
  const [x2, setX2] = useState("2"); const [y2, setY2] = useState("2"); const [z2, setZ2] = useState("2");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | { d: number; dx: number; dy: number; dz: number; p1: [number, number, number]; p2: [number, number, number] }>(null);

  const onCalc = () => {
    setError(null);
    const vals = [x1, y1, z1, x2, y2, z2].map(parseNum);
    if (vals.some((v) => v === null)) {
      setResult(null);
      setError("Please enter numeric values for all six coordinates.");
      return;
    }
    const [a, b, c, e, f, g] = vals as number[];
    const dx = e - a, dy = f - b, dz = g - c;
    setResult({ d: Math.hypot(dx, dy, dz), dx, dy, dz, p1: [a, b, c], p2: [e, f, g] });
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const [a, b, c] = result.p1; const [e, f, g] = result.p2;
    const sumSq = result.dx * result.dx + result.dy * result.dy + result.dz * result.dz;
    return [
      { title: "Start with the 3D distance formula", body: <MathLine>d = √((x₂−x₁)² + (y₂−y₁)² + (z₂−z₁)²)</MathLine> },
      { title: "Substitute the coordinates", body: <MathLine>d = √(({e} − {a})² + ({f} − {b})² + ({g} − {c})²)</MathLine> },
      { title: "Square each difference and sum", body: <MathLine>d = √({fmt(result.dx * result.dx)} + {fmt(result.dy * result.dy)} + {fmt(result.dz * result.dz)}) = √{fmt(sumSq)}</MathLine> },
      { title: "Take the square root", body: <MathLine>d = <strong>{fmt(result.d)}</strong></MathLine> },
    ];
  }, [result]);

  return (
    <div>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="x₁"><TextInput value={x1} onChange={(e) => setX1(e.target.value)} inputMode="decimal" /></Field>
          <Field label="y₁"><TextInput value={y1} onChange={(e) => setY1(e.target.value)} inputMode="decimal" /></Field>
          <Field label="z₁"><TextInput value={z1} onChange={(e) => setZ1(e.target.value)} inputMode="decimal" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="x₂"><TextInput value={x2} onChange={(e) => setX2(e.target.value)} inputMode="decimal" /></Field>
          <Field label="y₂"><TextInput value={y2} onChange={(e) => setY2(e.target.value)} inputMode="decimal" /></Field>
          <Field label="z₂"><TextInput value={z2} onChange={(e) => setZ2(e.target.value)} inputMode="decimal" /></Field>
        </div>
      </div>

      <div className="mt-4"><PrimaryButton onClick={onCalc}>Calculate distance</PrimaryButton></div>

      {error && <ErrorBox message={error} />}

      {result && (
        <div>
          <ResultBox
            label="Distance"
            value={<span className="flex flex-wrap items-center gap-3"><span>d = {fmt(result.d)}</span><CopyButton text={String(result.d)} /></span>}
            note={<>Δx = {fmt(result.dx)}, Δy = {fmt(result.dy)}, Δz = {fmt(result.dz)}</>}
          />
          <Iso3D p1={result.p1} p2={result.p2} d={result.d} />
          <StepsToggle steps={steps} />
        </div>
      )}
    </div>
  );
}

function Iso3D({ p1, p2, d }: { p1: [number, number, number]; p2: [number, number, number]; d: number }) {
  const W = 520, H = 360;
  const CX = W / 2, CY = H / 2 + 20;
  // isometric projection with y-axis "up-right" and x-axis "up-left" and z-axis vertical.
  // Actually standard: x right, y depth (up-left), z up.
  const iso = (x: number, y: number, z: number) => {
    const px = CX + (x - y) * 30;
    const py = CY + (x + y) * 15 - z * 30;
    return [px, py] as const;
  };

  const axLen = 4;
  const [ox, oy] = iso(0, 0, 0);
  const [xax, yax] = iso(axLen, 0, 0);
  const [xay, yay] = iso(0, axLen, 0);
  const [xaz, yaz] = iso(0, 0, axLen);

  const [p1x, p1y] = iso(...p1);
  const [p2x, p2y] = iso(...p2);
  // projections to base (z=0)
  const [b1x, b1y] = iso(p1[0], p1[1], 0);
  const [b2x, b2y] = iso(p2[0], p2[1], 0);

  const mutedColor = "var(--color-muted-foreground)";
  const primary = "var(--color-primary)";
  const orange = "#f59e0b";
  const text = "var(--color-foreground)";

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">3D coordinate space (isometric view)</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Two points in a 3D coordinate space shown in isometric view with the connecting distance line">
        {/* axes */}
        <line x1={ox} y1={oy} x2={xax} y2={yax} stroke={mutedColor} />
        <line x1={ox} y1={oy} x2={xay} y2={yay} stroke={mutedColor} />
        <line x1={ox} y1={oy} x2={xaz} y2={yaz} stroke={mutedColor} />
        <text x={xax + 6} y={yax + 4} fill={mutedColor} fontSize={11}>x</text>
        <text x={xay - 6} y={yay + 12} fill={mutedColor} fontSize={11} textAnchor="end">y</text>
        <text x={xaz} y={yaz - 6} fill={mutedColor} fontSize={11} textAnchor="middle">z</text>

        {/* drop lines from points to base */}
        <line x1={p1x} y1={p1y} x2={b1x} y2={b1y} stroke={mutedColor} strokeDasharray="3 3" />
        <line x1={p2x} y1={p2y} x2={b2x} y2={b2y} stroke={mutedColor} strokeDasharray="3 3" />

        {/* distance segment */}
        <line x1={p1x} y1={p1y} x2={p2x} y2={p2y} stroke={orange} strokeWidth={2.5} />

        {/* points */}
        <circle cx={p1x} cy={p1y} r={5} fill={primary} />
        <text x={p1x + 8} y={p1y - 6} fill={text} fontSize={11} fontFamily="monospace">({p1[0]}, {p1[1]}, {p1[2]})</text>
        <circle cx={p2x} cy={p2y} r={5} fill={primary} />
        <text x={p2x + 8} y={p2y - 6} fill={text} fontSize={11} fontFamily="monospace">({p2[0]}, {p2[1]}, {p2[2]})</text>

        <text x={(p1x + p2x) / 2} y={(p1y + p2y) / 2 - 8} fill={orange} fontSize={12} fontWeight={600} textAnchor="middle">d = {fmt(d)}</text>
      </svg>
    </div>
  );
}

// ============================================================
// Lat/Long distance (Haversine + Lambert)
// ============================================================

const EARTH_R_KM = 6371.0088; // mean radius
const KM_PER_MI = 1.609344;

// WGS-84 ellipsoid
const WGS84_A_KM = 6378.137;
const WGS84_F = 1 / 298.257223563;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const dφ = toRad(lat2 - lat1);
  const dλ = toRad(lon2 - lon1);
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_R_KM * c;
}

// Lambert's formula for long-line distance on an ellipsoid.
// Reduces to Haversine when f = 0.
function lambertKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const f = WGS84_F;
  const a = WGS84_A_KM;
  // reduced latitudes
  const β1 = Math.atan((1 - f) * Math.tan(toRad(lat1)));
  const β2 = Math.atan((1 - f) * Math.tan(toRad(lat2)));
  // central angle via haversine on reduced latitudes' great circle
  const dλ = toRad(lon2 - lon1);
  const dβ = β2 - β1;
  const h = Math.sin(dβ / 2) ** 2 + Math.cos(β1) * Math.cos(β2) * Math.sin(dλ / 2) ** 2;
  const σ = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  if (σ === 0) return 0;
  const P = (β1 + β2) / 2;
  const Q = (β2 - β1) / 2;
  const X = (σ - Math.sin(σ)) * (Math.sin(P) ** 2 * Math.cos(Q) ** 2) / (Math.cos(σ / 2) ** 2);
  const Y = (σ + Math.sin(σ)) * (Math.cos(P) ** 2 * Math.sin(Q) ** 2) / (Math.sin(σ / 2) ** 2);
  return a * (σ - (f / 2) * (X + Y));
}

interface Coord { lat: number; lon: number }

function dmsToDecimal(deg: number, min: number, sec: number, hemi: "N" | "S" | "E" | "W") {
  const mag = Math.abs(deg) + Math.abs(min) / 60 + Math.abs(sec) / 3600;
  return (hemi === "S" || hemi === "W") ? -mag : mag;
}

function CalcLatLong({ initial }: { initial?: { a: Coord; b: Coord } }) {
  const [mode, setMode] = useState<"dec" | "dms">("dec");
  // Decimal
  const [lat1, setLat1] = useState(initial ? String(initial.a.lat) : "38.8977");
  const [lon1, setLon1] = useState(initial ? String(initial.a.lon) : "-77.0365");
  const [lat2, setLat2] = useState(initial ? String(initial.b.lat) : "40.7128");
  const [lon2, setLon2] = useState(initial ? String(initial.b.lon) : "-74.0060");
  // DMS: latitude a
  const [lat1D, setLat1D] = useState("38"); const [lat1M, setLat1M] = useState("53"); const [lat1S, setLat1S] = useState("52"); const [lat1H, setLat1H] = useState<"N" | "S">("N");
  const [lon1D, setLon1D] = useState("77"); const [lon1M, setLon1M] = useState("2"); const [lon1S, setLon1S] = useState("11"); const [lon1H, setLon1H] = useState<"E" | "W">("W");
  const [lat2D, setLat2D] = useState("40"); const [lat2M, setLat2M] = useState("42"); const [lat2S, setLat2S] = useState("46"); const [lat2H, setLat2H] = useState<"N" | "S">("N");
  const [lon2D, setLon2D] = useState("74"); const [lon2M, setLon2M] = useState("0"); const [lon2S, setLon2S] = useState("21"); const [lon2H, setLon2H] = useState<"E" | "W">("W");

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | { a: Coord; b: Coord; havKm: number; lamKm: number; bearing: number; finalBearing: number }>(null);

  const readCoords = (): Coord[] | null => {
    if (mode === "dec") {
      const vals = [lat1, lon1, lat2, lon2].map(parseNum);
      if (vals.some((v) => v === null)) return null;
      const [la1, lo1, la2, lo2] = vals as number[];
      if (Math.abs(la1) > 90 || Math.abs(la2) > 90) { setError("Latitude must be between −90 and 90."); return null; }
      if (Math.abs(lo1) > 180 || Math.abs(lo2) > 180) { setError("Longitude must be between −180 and 180."); return null; }
      return [{ lat: la1, lon: lo1 }, { lat: la2, lon: lo2 }];
    }
    const nums = [lat1D, lat1M, lat1S, lon1D, lon1M, lon1S, lat2D, lat2M, lat2S, lon2D, lon2M, lon2S].map(parseNum);
    if (nums.some((v) => v === null)) return null;
    const [a1d, a1m, a1s, o1d, o1m, o1s, a2d, a2m, a2s, o2d, o2m, o2s] = nums as number[];
    return [
      { lat: dmsToDecimal(a1d, a1m, a1s, lat1H), lon: dmsToDecimal(o1d, o1m, o1s, lon1H) },
      { lat: dmsToDecimal(a2d, a2m, a2s, lat2H), lon: dmsToDecimal(o2d, o2m, o2s, lon2H) },
    ];
  };

  const onCalc = () => {
    setError(null);
    const c = readCoords();
    if (!c) { setResult(null); if (!error) setError("Please enter numeric values for every field."); return; }
    const [A, B] = c;
    const havKm = haversineKm(A.lat, A.lon, B.lat, B.lon);
    const lamKm = lambertKm(A.lat, A.lon, B.lat, B.lon);
    const toRad = (d: number) => (d * Math.PI) / 180;
    const φ1 = toRad(A.lat), φ2 = toRad(B.lat), dλ = toRad(B.lon - A.lon);
    const y = Math.sin(dλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);
    const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    const yF = Math.sin(-dλ) * Math.cos(φ1);
    const xF = Math.cos(φ2) * Math.sin(φ1) - Math.sin(φ2) * Math.cos(φ1) * Math.cos(-dλ);
    const bearingBA = ((Math.atan2(yF, xF) * 180) / Math.PI + 360) % 360;
    const finalBearing = (bearingBA + 180) % 360;
    setResult({ a: A, b: B, havKm, lamKm, bearing, finalBearing });
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { a, b, havKm, bearing, finalBearing } = result;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const φ1 = toRad(a.lat), φ2 = toRad(b.lat);
    const dφ = toRad(b.lat - a.lat), dλ = toRad(b.lon - a.lon);
    const term1 = Math.sin(dφ / 2) ** 2;
    const term2 = Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
    const aa = term1 + term2;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));

    const y = Math.sin(dλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);

    return [
      { title: "Convert degrees to radians", body: <MathLine>φ₁ = {fmt(a.lat)}° → {fmt(φ1)} rad · φ₂ = {fmt(b.lat)}° → {fmt(φ2)} rad<br />Δφ = {fmt(dφ)} rad · Δλ = {fmt(dλ)} rad</MathLine> },
      { title: "Apply the Haversine formula", body: <MathLine>a = sin²(Δφ/2) + cos φ₁·cos φ₂·sin²(Δλ/2)<br />a = {fmt(term1)} + {fmt(term2)} = {fmt(aa)}</MathLine> },
      { title: "Central angle c and distance", body: <MathLine>c = 2·atan2(√a, √(1−a)) = {fmt(c)} rad<br />d = R · c = 6371.0088 · {fmt(c)} = <strong>{fmt(havKm)} km</strong></MathLine> },
      {
        title: "Initial Bearing (A → B)",
        body: (
          <>
            <MathNote>θ = atan2(sin Δλ · cos φ₂, cos φ₁ · sin φ₂ − sin φ₁ · cos φ₂ · cos Δλ)</MathNote>
            <MathLine>y = {fmt(y)}, x = {fmt(x)}</MathLine>
            <MathLine>θ = atan2(y, x) = <strong>{fmt(bearing)}°</strong></MathLine>
          </>
        ),
      },
      {
        title: "Final Bearing (at B)",
        body: (
          <>
            <MathNote>Calculated as the initial bearing from B to A plus 180° (mod 360°).</MathNote>
            <MathLine>Final Bearing = <strong>{fmt(finalBearing)}°</strong></MathLine>
          </>
        ),
      },
    ];
  }, [result]);

  return (
    <div>
      <div className="mb-3 inline-flex rounded-full border border-border/60 bg-secondary/40 p-1 text-sm">
        <button type="button" onClick={() => setMode("dec")} className={"rounded-full px-3 py-1 " + (mode === "dec" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Decimal</button>
        <button type="button" onClick={() => setMode("dms")} className={"rounded-full px-3 py-1 " + (mode === "dms" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Deg-Min-Sec</button>
      </div>

      {mode === "dec" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Latitude 1" hint="−90 to 90"><TextInput value={lat1} onChange={(e) => setLat1(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Longitude 1" hint="−180 to 180"><TextInput value={lon1} onChange={(e) => setLon1(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Latitude 2" hint="−90 to 90"><TextInput value={lat2} onChange={(e) => setLat2(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Longitude 2" hint="−180 to 180"><TextInput value={lon2} onChange={(e) => setLon2(e.target.value)} inputMode="decimal" /></Field>
        </div>
      ) : (
        <div className="space-y-4">
          <DmsRow label="Latitude 1" d={lat1D} m={lat1M} s={lat1S} h={lat1H} setD={setLat1D} setM={setLat1M} setS={setLat1S} setH={setLat1H as (v: string) => void} kind="lat" />
          <DmsRow label="Longitude 1" d={lon1D} m={lon1M} s={lon1S} h={lon1H} setD={setLon1D} setM={setLon1M} setS={setLon1S} setH={setLon1H as (v: string) => void} kind="lon" />
          <DmsRow label="Latitude 2" d={lat2D} m={lat2M} s={lat2S} h={lat2H} setD={setLat2D} setM={setLat2M} setS={setLat2S} setH={setLat2H as (v: string) => void} kind="lat" />
          <DmsRow label="Longitude 2" d={lon2D} m={lon2M} s={lon2S} h={lon2H} setD={setLon2D} setM={setLon2M} setS={setLon2S} setH={setLon2H as (v: string) => void} kind="lon" />
        </div>
      )}

      <div className="mt-4"><PrimaryButton onClick={onCalc}>Calculate great-circle distance</PrimaryButton></div>

      {error && <ErrorBox message={error} />}

      {result && (
        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Haversine (spherical Earth)</div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
              {fmt(result.havKm)} km · {fmt(result.havKm / KM_PER_MI)} mi
            </div>
            <div className="mt-2 text-sm text-muted-foreground">Assumes Earth is a sphere of radius 6,371 km. Accurate to within about 0.5%.</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Lambert (WGS-84 ellipsoid) — more accurate</div>
              <CopyButton text={`${result.lamKm.toFixed(3)} km`} />
            </div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
              {fmt(result.lamKm)} km · {fmt(result.lamKm / KM_PER_MI)} mi
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Accounts for Earth's flattening (f = 1/298.257). Difference vs Haversine: {fmt(result.lamKm - result.havKm)} km ({fmt(((result.lamKm - result.havKm) / result.havKm) * 100)}%).
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Initial bearing (A → B)</div>
              <CopyButton text={`${result.bearing.toFixed(2)}°`} />
            </div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
              {result.bearing.toFixed(2)}° · {compassPoint(result.bearing)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              θ = atan2(sin Δλ·cos φ₂, cos φ₁·sin φ₂ − sin φ₁·cos φ₂·cos Δλ), normalized to 0–360°. This is the compass direction to head from A initially — along a great-circle path the bearing changes as you travel.
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Final bearing (arriving at B)</div>
              <CopyButton text={`${result.finalBearing.toFixed(2)}°`} />
            </div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
              {result.finalBearing.toFixed(2)}° · {compassPoint(result.finalBearing)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Computed as the initial bearing from B → A, plus 180° (mod 360°). This is the compass direction you're heading in the instant you arrive at B along the great-circle path.
            </div>
          </div>
          <StepsToggle steps={steps} />
        </div>
      )}
    </div>
  );
}

function compassPoint(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(((deg % 360) / 22.5)) % 16];
}

function DmsRow({ label, d, m, s, h, setD, setM, setS, setH, kind }: {
  label: string; d: string; m: string; s: string; h: string;
  setD: (v: string) => void; setM: (v: string) => void; setS: (v: string) => void; setH: (v: string) => void;
  kind: "lat" | "lon";
}) {
  const opts = kind === "lat" ? ["N", "S"] : ["E", "W"];
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium text-foreground">{label}</div>
      <div className="grid grid-cols-4 gap-2">
        <TextInput value={d} onChange={(e) => setD(e.target.value)} inputMode="decimal" placeholder="deg" />
        <TextInput value={m} onChange={(e) => setM(e.target.value)} inputMode="decimal" placeholder="min" />
        <TextInput value={s} onChange={(e) => setS(e.target.value)} inputMode="decimal" placeholder="sec" />
        <select value={h} onChange={(e) => setH(e.target.value)} className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30">
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );
}

// ============================================================
// Interactive world map (lightweight SVG equirectangular)
// ============================================================

function MapPicker() {
  // Points stored as {lat, lon}. Two-point limit; third click resets.
  const [points, setPoints] = useState<Coord[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 720, H = 360; // 2:1 equirectangular

  const toXY = (lat: number, lon: number) => {
    const x = ((lon + 180) / 360) * W;
    const y = ((90 - lat) / 180) * H;
    return [x, y] as const;
  };
  const fromXY = (x: number, y: number): Coord => {
    const lon = (x / W) * 360 - 180;
    const lat = 90 - (y / H) * 180;
    return { lat: Math.max(-90, Math.min(90, lat)), lon: Math.max(-180, Math.min(180, lon)) };
  };

  const eventCoord = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX; clientY = e.clientY;
    }
    const x = ((clientX - rect.left) / rect.width) * W;
    const y = ((clientY - rect.top) / rect.height) * H;
    return { x, y };
  };

  const onSvgClick = (e: React.MouseEvent) => {
    if (dragging !== null) return;
    const p = eventCoord(e); if (!p) return;
    const c = fromXY(p.x, p.y);
    setPoints((prev) => {
      if (prev.length >= 2) return [c]; // reset to new first point
      return [...prev, c];
    });
  };

  const onPointerDown = (idx: number) => (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setDragging(idx);
  };
  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragging === null) return;
    const p = eventCoord(e); if (!p) return;
    const c = fromXY(p.x, p.y);
    setPoints((prev) => prev.map((pt, i) => (i === dragging ? c : pt)));
  };
  const onPointerUp = () => setDragging(null);

  // Compute great-circle polyline (sample intermediate points along the arc)
  const arcPath = useMemo(() => {
    if (points.length < 2) return "";
    const [A, B] = points;
    const N = 64;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const φ1 = toRad(A.lat), λ1 = toRad(A.lon);
    const φ2 = toRad(B.lat), λ2 = toRad(B.lon);
    const dφ = φ2 - φ1, dλ = λ2 - λ1;
    const aa = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
    const δ = 2 * Math.asin(Math.min(1, Math.sqrt(aa)));
    if (δ === 0) {
      const [x, y] = toXY(A.lat, A.lon);
      return `M ${x} ${y}`;
    }
    const segs: string[] = [];
    let prevX = 0;
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const A_ = Math.sin((1 - f) * δ) / Math.sin(δ);
      const B_ = Math.sin(f * δ) / Math.sin(δ);
      const x_ = A_ * Math.cos(φ1) * Math.cos(λ1) + B_ * Math.cos(φ2) * Math.cos(λ2);
      const y_ = A_ * Math.cos(φ1) * Math.sin(λ1) + B_ * Math.cos(φ2) * Math.sin(λ2);
      const z_ = A_ * Math.sin(φ1) + B_ * Math.sin(φ2);
      const φ = Math.atan2(z_, Math.sqrt(x_ * x_ + y_ * y_));
      const λ = Math.atan2(y_, x_);
      const [sx, sy] = toXY(toDeg(φ), toDeg(λ));
      // if the polyline jumps across the antimeridian, break into a new subpath
      if (i === 0) {
        segs.push(`M ${sx} ${sy}`);
      } else if (Math.abs(sx - prevX) > W / 2) {
        segs.push(`M ${sx} ${sy}`);
      } else {
        segs.push(`L ${sx} ${sy}`);
      }
      prevX = sx;
    }
    return segs.join(" ");
  }, [points]);

  const dist = points.length === 2 ? haversineKm(points[0].lat, points[0].lon, points[1].lat, points[1].lon) : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          {points.length === 0 && "Click anywhere on the map to place your first point."}
          {points.length === 1 && "Click again to place the second point (or drag the first)."}
          {points.length === 2 && "Drag either marker to fine-tune. Click again anywhere to start over."}
        </div>
        {points.length > 0 && (
          <button type="button" onClick={() => setPoints([])} className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs text-muted-foreground hover:text-foreground">Clear</button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-secondary/20">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full cursor-crosshair select-none"
          onClick={onSvgClick}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
          role="application"
          aria-label="Click-to-place world map for measuring great-circle distance"
        >
          {/* ocean */}
          <rect x={0} y={0} width={W} height={H} fill="#1e3a5f" />
          {/* graticule */}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`v${i}`} x1={(i / 12) * W + W / 12} y1={0} x2={(i / 12) * W + W / 12} y2={H} stroke="#ffffff" strokeOpacity={0.06} />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={((i + 1) / 6) * H} x2={W} y2={((i + 1) / 6) * H} stroke="#ffffff" strokeOpacity={0.06} />
          ))}
          {/* equator + prime meridian */}
          <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#ffffff" strokeOpacity={0.18} strokeDasharray="3 3" />
          <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke="#ffffff" strokeOpacity={0.18} strokeDasharray="3 3" />

          {/* simplified land silhouette */}
          <g fill="#3b6b47" fillOpacity={0.9}>
            {/* very rough continents — decorative only */}
            <path d="M 60 90 Q 100 60 160 80 Q 220 70 240 110 Q 260 150 220 180 Q 190 200 150 195 Q 100 210 80 170 Q 40 140 60 90 Z" />
            <path d="M 260 210 Q 280 230 275 270 Q 265 320 245 330 Q 230 315 235 275 Q 240 235 260 210 Z" />
            <path d="M 330 90 Q 360 70 380 95 Q 400 80 410 110 Q 430 140 410 150 Q 385 155 370 140 Q 340 145 330 120 Z" />
            <path d="M 385 155 Q 410 175 415 220 Q 405 280 380 305 Q 360 320 365 280 Q 380 240 385 205 Q 380 180 385 155 Z" />
            <path d="M 430 90 Q 490 70 560 90 Q 640 100 670 140 Q 660 175 610 185 Q 550 195 500 180 Q 460 175 430 150 Q 420 120 430 90 Z" />
            <path d="M 590 210 Q 620 220 625 250 Q 615 275 590 275 Q 570 265 575 235 Q 580 220 590 210 Z" />
            <path d="M 640 260 Q 670 265 680 285 Q 670 300 645 295 Q 630 285 640 260 Z" />
          </g>

          {/* great-circle arc */}
          {arcPath && <path d={arcPath} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4" />}

          {/* markers */}
          {points.map((p, i) => {
            const [x, y] = toXY(p.lat, p.lon);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={7} fill={i === 0 ? "#ef4444" : "#22c55e"} stroke="#fff" strokeWidth={2}
                  onMouseDown={onPointerDown(i)} onTouchStart={onPointerDown(i)} style={{ cursor: "grab" }} />
                <text x={x + 10} y={y - 8} fill="#fff" fontSize={11} fontFamily="monospace" style={{ pointerEvents: "none" }}>
                  {i === 0 ? "A" : "B"} ({p.lat.toFixed(2)}°, {p.lon.toFixed(2)}°)
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {dist !== null && (
        <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Great-circle distance</div>
          <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
            {fmt(dist)} km · {fmt(dist / KM_PER_MI)} mi
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Simplified world map for illustration. Map data © <a href="https://www.openstreetmap.org/copyright" className="underline" target="_blank" rel="noreferrer noopener">OpenStreetMap</a> contributors is used only conceptually here — the silhouette is a schematic, not a projection of OSM tiles.
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Midpoint
// ============================================================

function CalcMidpoint() {
  const [x1, setX1] = useState("1");
  const [y1, setY1] = useState("2");
  const [x2, setX2] = useState("5");
  const [y2, setY2] = useState("8");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | { mx: number; my: number; p1: [number, number]; p2: [number, number] }>(null);

  const onCalc = () => {
    setError(null);
    const vals = [x1, y1, x2, y2].map(parseNum);
    if (vals.some((v) => v === null)) {
      setResult(null);
      setError("Please enter numeric values for all four coordinates.");
      return;
    }
    const [a, b, c, d] = vals as number[];
    setResult({ mx: (a + c) / 2, my: (b + d) / 2, p1: [a, b], p2: [c, d] });
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const [a, b] = result.p1; const [c, d] = result.p2;
    return [
      { title: "Start with the midpoint formula", body: <MathLine>M = ((x₁ + x₂) / 2, (y₁ + y₂) / 2)</MathLine> },
      { title: "Substitute the coordinates", body: <MathLine>M = (({a} + {c}) / 2, ({b} + {d}) / 2)</MathLine> },
      { title: "Compute the sums", body: <MathLine>M = ({fmt(a + c)} / 2, {fmt(b + d)} / 2)</MathLine> },
      { title: "Final midpoint", body: <MathLine>M = (<strong>{fmt(result.mx)}</strong>, <strong>{fmt(result.my)}</strong>)</MathLine> },
    ];
  }, [result]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="x₁"><TextInput value={x1} onChange={(e) => setX1(e.target.value)} inputMode="decimal" /></Field>
        <Field label="y₁"><TextInput value={y1} onChange={(e) => setY1(e.target.value)} inputMode="decimal" /></Field>
        <Field label="x₂"><TextInput value={x2} onChange={(e) => setX2(e.target.value)} inputMode="decimal" /></Field>
        <Field label="y₂"><TextInput value={y2} onChange={(e) => setY2(e.target.value)} inputMode="decimal" /></Field>
      </div>
      <div className="mt-4"><PrimaryButton onClick={onCalc}>Calculate midpoint</PrimaryButton></div>
      {error && <ErrorBox message={error} />}
      {result && (
        <div>
          <ResultBox
            label="Midpoint"
            value={
              <span className="flex flex-wrap items-center gap-3">
                <span>M = ({fmt(result.mx)}, {fmt(result.my)})</span>
                <CopyButton text={`(${result.mx}, ${result.my})`} />
              </span>
            }
          />
          <MidpointPlane p1={result.p1} p2={result.p2} m={[result.mx, result.my]} />
          <StepsToggle steps={steps} />
        </div>
      )}
    </div>
  );
}

function MidpointPlane({ p1, p2, m }: { p1: [number, number]; p2: [number, number]; m: [number, number] }) {
  const W = 520, H = 340, PAD = 34;
  const xs = [p1[0], p2[0], m[0], 0];
  const ys = [p1[1], p2[1], m[1], 0];
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xSpan = Math.max(xMax - xMin, 1), ySpan = Math.max(yMax - yMin, 1);
  const pad = 0.25;
  const xLo = xMin - xSpan * pad, xHi = xMax + xSpan * pad;
  const yLo = yMin - ySpan * pad, yHi = yMax + ySpan * pad;
  const sx = (x: number) => PAD + ((x - xLo) / (xHi - xLo)) * (W - 2 * PAD);
  const sy = (y: number) => H - PAD - ((y - yLo) / (yHi - yLo)) * (H - 2 * PAD);
  const mutedColor = "var(--color-muted-foreground)";
  const primary = "var(--color-primary)";
  const orange = "#f59e0b";
  const text = "var(--color-foreground)";
  const axisColor = "var(--color-border)";
  const originInsideX = xLo <= 0 && xHi >= 0;
  const originInsideY = yLo <= 0 && yHi >= 0;
  const axisX = originInsideY ? sy(0) : H - PAD;
  const axisY = originInsideX ? sx(0) : PAD;

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">Midpoint on the coordinate plane</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Two points on a coordinate plane with the midpoint marked on the connecting segment">
        <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" stroke={axisColor} strokeOpacity={0.3} />
        <line x1={PAD} y1={axisX} x2={W - PAD} y2={axisX} stroke={mutedColor} strokeWidth={1.2} />
        <line x1={axisY} y1={PAD} x2={axisY} y2={H - PAD} stroke={mutedColor} strokeWidth={1.2} />
        <text x={W - PAD + 4} y={axisX + 4} fill={mutedColor} fontSize={11}>x</text>
        <text x={axisY - 4} y={PAD - 4} fill={mutedColor} fontSize={11} textAnchor="end">y</text>

        <line x1={sx(p1[0])} y1={sy(p1[1])} x2={sx(p2[0])} y2={sy(p2[1])} stroke={orange} strokeWidth={2.5} />

        <circle cx={sx(p1[0])} cy={sy(p1[1])} r={5} fill={primary} />
        <text x={sx(p1[0]) + 8} y={sy(p1[1]) - 8} fill={text} fontSize={12} fontFamily="monospace">P₁({p1[0]}, {p1[1]})</text>
        <circle cx={sx(p2[0])} cy={sy(p2[1])} r={5} fill={primary} />
        <text x={sx(p2[0]) + 8} y={sy(p2[1]) - 8} fill={text} fontSize={12} fontFamily="monospace">P₂({p2[0]}, {p2[1]})</text>

        <circle cx={sx(m[0])} cy={sy(m[1])} r={6} fill={orange} stroke="#fff" strokeWidth={2} />
        <text x={sx(m[0]) + 10} y={sy(m[1]) + 4} fill={orange} fontSize={12} fontWeight={600} fontFamily="monospace">M({fmt(m[0])}, {fmt(m[1])})</text>
      </svg>
    </div>
  );
}

// ============================================================
// Point to line
// ============================================================

function CalcPointToLine() {
  const [lineMode, setLineMode] = useState<"twoPoints" | "slope">("twoPoints");
  const [x0, setX0] = useState("3");
  const [y0, setY0] = useState("4");
  // two-point line
  const [lx1, setLx1] = useState("0");
  const [ly1, setLy1] = useState("0");
  const [lx2, setLx2] = useState("4");
  const [ly2, setLy2] = useState("0");
  // slope-intercept line
  const [mVal, setMVal] = useState("1");
  const [bVal, setBVal] = useState("0");

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | {
    A: number; B: number; C: number;
    d: number;
    p: [number, number];
    foot: [number, number];
    lineDesc: string;
  }>(null);

  const onCalc = () => {
    setError(null);
    const px = parseNum(x0), py = parseNum(y0);
    if (px === null || py === null) { setResult(null); setError("Please enter a numeric point (x₀, y₀)."); return; }

    let A: number, B: number, C: number, lineDesc: string;
    if (lineMode === "twoPoints") {
      const vals = [lx1, ly1, lx2, ly2].map(parseNum);
      if (vals.some((v) => v === null)) { setResult(null); setError("Please enter numeric coordinates for both line points."); return; }
      const [a1, b1, a2, b2] = vals as number[];
      if (a1 === a2 && b1 === b2) { setResult(null); setError("The two line points must be distinct."); return; }
      // Ax + By + C = 0 through (a1,b1)-(a2,b2)
      A = b2 - b1;
      B = a1 - a2;
      C = -(A * a1 + B * b1);
      lineDesc = `through (${a1}, ${b1}) and (${a2}, ${b2})`;
    } else {
      const mv = parseNum(mVal), bv = parseNum(bVal);
      if (mv === null || bv === null) { setResult(null); setError("Please enter numeric slope m and intercept b."); return; }
      // y = mx + b  →  m·x − y + b = 0
      A = mv; B = -1; C = bv;
      lineDesc = `y = ${mv}x ${bv >= 0 ? "+" : "−"} ${Math.abs(bv)}`;
    }

    const denom = Math.hypot(A, B);
    if (denom === 0) { setResult(null); setError("Degenerate line — coefficients A and B are both zero."); return; }
    const d = Math.abs(A * px + B * py + C) / denom;
    // Foot of perpendicular
    const t = (A * px + B * py + C) / (A * A + B * B);
    const fx = px - A * t;
    const fy = py - B * t;

    setResult({ A, B, C, d, p: [px, py], foot: [fx, fy], lineDesc });
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { A, B, C, p, d } = result;
    const num = Math.abs(A * p[0] + B * p[1] + C);
    const den = Math.hypot(A, B);

    const s: Step[] = [];
    if (lineMode === "twoPoints") {
      s.push({
        title: "Find the line equation from two points",
        body: (
          <>
            <MathNote>Through points (x₁,y₁) and (x₂,y₂), the standard form Ax + By + C = 0 can be found by:</MathNote>
            <MathLine>A = y₂ − y₁ = {fmt(A)}</MathLine>
            <MathLine>B = x₁ − x₂ = {fmt(B)}</MathLine>
            <MathLine>C = −(A·x₁ + B·y₁) = {fmt(C)}</MathLine>
          </>
        ),
      });
    }

    s.push(
      {
        title: "Line in standard form",
        body: <MathLine>{fmt(A)}·x + {fmt(B)}·y + {fmt(C)} = 0</MathLine>,
      },
      {
        title: "Point to line formula",
        body: (
          <>
            <MathNote>d = |Ax₀ + By₀ + C| / √(A² + B²)</MathNote>
            <MathLine>Numerator = |{fmt(A)}·{p[0]} + {fmt(B)}·{p[1]} + {fmt(C)}| = {fmt(num)}</MathLine>
            <MathLine>Denominator = √({fmt(A)}² + {fmt(B)}²) = √({fmt(A * A)} + {fmt(B * B)}) = {fmt(den)}</MathLine>
          </>
        ),
      },
      {
        title: "Final perpendicular distance",
        body: <MathLine>d = {fmt(num)} / {fmt(den)} = <strong>{fmt(d)}</strong></MathLine>,
      }
    );
    return s;
  }, [result, lineMode]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="x₀"><TextInput value={x0} onChange={(e) => setX0(e.target.value)} inputMode="decimal" /></Field>
        <Field label="y₀"><TextInput value={y0} onChange={(e) => setY0(e.target.value)} inputMode="decimal" /></Field>
      </div>

      <div className="mt-4 mb-3 inline-flex rounded-full border border-border/60 bg-secondary/40 p-1 text-sm">
        <button type="button" onClick={() => setLineMode("twoPoints")} className={"rounded-full px-3 py-1 " + (lineMode === "twoPoints" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>Two points</button>
        <button type="button" onClick={() => setLineMode("slope")} className={"rounded-full px-3 py-1 " + (lineMode === "slope" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>y = mx + b</button>
      </div>

      {lineMode === "twoPoints" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Line x₁"><TextInput value={lx1} onChange={(e) => setLx1(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Line y₁"><TextInput value={ly1} onChange={(e) => setLy1(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Line x₂"><TextInput value={lx2} onChange={(e) => setLx2(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Line y₂"><TextInput value={ly2} onChange={(e) => setLy2(e.target.value)} inputMode="decimal" /></Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Slope m"><TextInput value={mVal} onChange={(e) => setMVal(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Intercept b"><TextInput value={bVal} onChange={(e) => setBVal(e.target.value)} inputMode="decimal" /></Field>
        </div>
      )}

      <div className="mt-4"><PrimaryButton onClick={onCalc}>Calculate distance</PrimaryButton></div>

      {error && <ErrorBox message={error} />}

      {result && (
        <div>
          <ResultBox
            label="Perpendicular distance"
            value={
              <span className="flex flex-wrap items-center gap-3">
                <span>d = {fmt(result.d)}</span>
                <CopyButton text={String(result.d)} />
              </span>
            }
            note={<>Line: {result.lineDesc}. Foot of perpendicular ≈ ({fmt(result.foot[0])}, {fmt(result.foot[1])}).</>}
          />
          <PointLinePlane A={result.A} B={result.B} C={result.C} p={result.p} foot={result.foot} d={result.d} />
          <StepsToggle steps={steps} />
        </div>
      )}
    </div>
  );
}

function PointLinePlane({ A, B, C, p, foot, d }: { A: number; B: number; C: number; p: [number, number]; foot: [number, number]; d: number }) {
  const W = 520, H = 340, PAD = 34;
  const xs = [p[0], foot[0], 0];
  const ys = [p[1], foot[1], 0];
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xSpan = Math.max(xMax - xMin, 2), ySpan = Math.max(yMax - yMin, 2);
  const pad = 0.35;
  const xLo = xMin - xSpan * pad, xHi = xMax + xSpan * pad;
  const yLo = yMin - ySpan * pad, yHi = yMax + ySpan * pad;
  const sx = (x: number) => PAD + ((x - xLo) / (xHi - xLo)) * (W - 2 * PAD);
  const sy = (y: number) => H - PAD - ((y - yLo) / (yHi - yLo)) * (H - 2 * PAD);
  const mutedColor = "var(--color-muted-foreground)";
  const primary = "var(--color-primary)";
  const orange = "#f59e0b";
  const text = "var(--color-foreground)";
  const axisColor = "var(--color-border)";
  const originInsideX = xLo <= 0 && xHi >= 0;
  const originInsideY = yLo <= 0 && yHi >= 0;
  const axisX = originInsideY ? sy(0) : H - PAD;
  const axisY = originInsideX ? sx(0) : PAD;

  // Line endpoints: intersect Ax+By+C=0 with viewport
  // If B != 0, y = -(A x + C)/B; else vertical x = -C/A
  let lineStart: [number, number], lineEnd: [number, number];
  if (Math.abs(B) > 1e-12) {
    const yAt = (x: number) => -(A * x + C) / B;
    lineStart = [xLo, yAt(xLo)];
    lineEnd = [xHi, yAt(xHi)];
  } else {
    const xConst = -C / A;
    lineStart = [xConst, yLo];
    lineEnd = [xConst, yHi];
  }

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">Point-to-line perpendicular</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="A point and a line with the perpendicular segment from the point to the line">
        <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" stroke={axisColor} strokeOpacity={0.3} />
        <line x1={PAD} y1={axisX} x2={W - PAD} y2={axisX} stroke={mutedColor} strokeWidth={1.2} />
        <line x1={axisY} y1={PAD} x2={axisY} y2={H - PAD} stroke={mutedColor} strokeWidth={1.2} />
        <text x={W - PAD + 4} y={axisX + 4} fill={mutedColor} fontSize={11}>x</text>
        <text x={axisY - 4} y={PAD - 4} fill={mutedColor} fontSize={11} textAnchor="end">y</text>

        {/* the line */}
        <line x1={sx(lineStart[0])} y1={sy(lineStart[1])} x2={sx(lineEnd[0])} y2={sy(lineEnd[1])} stroke={primary} strokeWidth={2.2} />

        {/* perpendicular dropped */}
        <line x1={sx(p[0])} y1={sy(p[1])} x2={sx(foot[0])} y2={sy(foot[1])} stroke={orange} strokeWidth={2.5} strokeDasharray="5 4" />

        {/* right-angle tick at foot */}
        {(() => {
          const size = 8;
          // Direction along line (unit vector)
          const lx = lineEnd[0] - lineStart[0], ly = lineEnd[1] - lineStart[1];
          const lLen = Math.hypot(lx, ly) || 1;
          const ux = (lx / lLen), uy = (ly / lLen);
          // Perpendicular unit toward the point
          const dx = p[0] - foot[0], dy = p[1] - foot[1];
          const dLen = Math.hypot(dx, dy) || 1;
          const nx = dx / dLen, ny = dy / dLen;
          // Convert to screen (approx by scaling small steps)
          const step = (xHi - xLo) * 0.03;
          const cx = sx(foot[0]), cy = sy(foot[1]);
          const pu = { x: sx(foot[0] + ux * step) - cx, y: sy(foot[1] + uy * step) - cy };
          const pn = { x: sx(foot[0] + nx * step) - cx, y: sy(foot[1] + ny * step) - cy };
          return (
            <polyline
              points={`${cx + pu.x},${cy + pu.y} ${cx + pu.x + pn.x},${cy + pu.y + pn.y} ${cx + pn.x},${cy + pn.y}`}
              fill="none"
              stroke={mutedColor}
              strokeWidth={1.2}
            />
          );
        })()}

        {/* foot */}
        <circle cx={sx(foot[0])} cy={sy(foot[1])} r={4} fill={primary} />
        <text x={sx(foot[0]) + 8} y={sy(foot[1]) + 14} fill={text} fontSize={11} fontFamily="monospace">foot ({fmt(foot[0])}, {fmt(foot[1])})</text>

        {/* the point */}
        <circle cx={sx(p[0])} cy={sy(p[1])} r={6} fill={orange} stroke="#fff" strokeWidth={2} />
        <text x={sx(p[0]) + 10} y={sy(p[1]) - 8} fill={text} fontSize={12} fontFamily="monospace">P₀({p[0]}, {p[1]})</text>

        {/* distance label */}
        <text x={(sx(p[0]) + sx(foot[0])) / 2 + 8} y={(sy(p[1]) + sy(foot[1])) / 2} fill={orange} fontSize={12} fontWeight={600}>d = {fmt(d)}</text>
      </svg>
    </div>
  );
}


function CalcManhattanChebyshev() {
  const [x1, setX1] = useState("1");
  const [y1, setY1] = useState("2");
  const [x2, setX2] = useState("5");
  const [y2, setY2] = useState("7");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | null
    | { dx: number; dy: number; manhattan: number; chebyshev: number; euclidean: number; p1: [number, number]; p2: [number, number] }
  >(null);

  const onCalc = () => {
    setError(null);
    const a = parseNum(x1);
    const b = parseNum(y1);
    const c = parseNum(x2);
    const d = parseNum(y2);
    if (a === null || b === null || c === null || d === null) {
      setResult(null);
      setError("Please enter numeric values for all four coordinates.");
      return;
    }
    const dx = Math.abs(c - a);
    const dy = Math.abs(d - b);
    setResult({
      dx,
      dy,
      manhattan: dx + dy,
      chebyshev: Math.max(dx, dy),
      euclidean: Math.hypot(dx, dy),
      p1: [a, b],
      p2: [c, d],
    });
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    return [
      {
        title: "Calculate differences",
        body: (
          <MathLine>
            Δx = |x₂ − x₁| = |{result.p2[0]} − {result.p1[0]}| = {fmt(result.dx)}
            <br />
            Δy = |y₂ − y₁| = |{result.p2[1]} − {result.p1[1]}| = {fmt(result.dy)}
          </MathLine>
        ),
      },
      {
        title: "Manhattan distance (L₁ norm)",
        body: (
          <>
            <MathNote>Sum of absolute differences: |Δx| + |Δy|</MathNote>
            <MathLine>
              d = {fmt(result.dx)} + {fmt(result.dy)} = <strong>{fmt(result.manhattan)}</strong>
            </MathLine>
          </>
        ),
      },
      {
        title: "Chebyshev distance (L∞ norm)",
        body: (
          <>
            <MathNote>Maximum of absolute differences: max(|Δx|, |Δy|)</MathNote>
            <MathLine>
              d = max({fmt(result.dx)}, {fmt(result.dy)}) = <strong>{fmt(result.chebyshev)}</strong>
            </MathLine>
          </>
        ),
      },
    ];
  }, [result]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="x₁"><TextInput value={x1} onChange={(e) => setX1(e.target.value)} inputMode="decimal" /></Field>
        <Field label="y₁"><TextInput value={y1} onChange={(e) => setY1(e.target.value)} inputMode="decimal" /></Field>
        <Field label="x₂"><TextInput value={x2} onChange={(e) => setX2(e.target.value)} inputMode="decimal" /></Field>
        <Field label="y₂"><TextInput value={y2} onChange={(e) => setY2(e.target.value)} inputMode="decimal" /></Field>
      </div>

      <div className="mt-4"><PrimaryButton onClick={onCalc}>Calculate distances</PrimaryButton></div>

      {error && <ErrorBox message={error} />}

      {result && (
        <div className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Manhattan</div>
                <CopyButton text={fmt(result.manhattan)} />
              </div>
              <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
                {fmt(result.manhattan)}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">|Δx| + |Δy| = {fmt(result.dx)} + {fmt(result.dy)}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Chebyshev</div>
                <CopyButton text={fmt(result.chebyshev)} />
              </div>
              <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
                {fmt(result.chebyshev)}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">max(|Δx|, |Δy|) = max({fmt(result.dx)}, {fmt(result.dy)})</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Euclidean</div>
                <CopyButton text={fmt(result.euclidean)} />
              </div>
              <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
                {fmt(result.euclidean)}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">√(Δx² + Δy²) = √({fmt(result.dx * result.dx)} + {fmt(result.dy * result.dy)})</div>
            </div>
          </div>
          <StepsToggle steps={steps} />
        </div>
      )}

      <div className="mt-6 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <p>
          These three metrics measure "distance" differently, and each is the natural choice for a
          different kind of movement. <strong>Euclidean</strong> distance is the straight-line
          hypotenuse used in ordinary geometry. <strong>Manhattan distance</strong> (also called
          taxicab or grid distance) sums the horizontal and vertical steps — it's the distance a
          car travels on a city grid, or a rook-like agent moves on a grid in pathfinding
          algorithms that only allow up/down/left/right moves. <strong>Chebyshev distance</strong>
          takes the larger of the two axis differences — it's the number of moves a king needs on
          a chessboard, since a king can move diagonally, covering one unit of each axis per step.
        </p>
      </div>
    </div>
  );
}

function DistancePage() {
  const [tab, setTab] = useState<"2d" | "3d" | "geo" | "map" | "mid" | "ptl" | "mc">("2d");
  const tabBtn = (id: typeof tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={
        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
        (tab === id
          ? "bg-primary text-primary-foreground"
          : "border border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground")
      }
    >
      {label}
    </button>
  );

  return (
    <MathCalcPage
      name="Distance Calculator"
      tagline="Distance between two points in a 2D plane, in 3D space, or on Earth's surface — with a click-to-place world map, decimal or degree-minute-second input, and step-by-step working."
      extras={
        <>
          <CalcSection title="What is the distance formula?">
            <p>
              The <strong>distance formula</strong> gives the straight-line (Euclidean) distance
              between two points. In two dimensions it comes straight from the Pythagorean
              theorem: the horizontal gap and the vertical gap between the two points form the
              two legs of a right triangle, and the distance you want is the hypotenuse. The same
              idea stretches into three dimensions by adding a z-term, and to two places on the
              Earth's surface — where a curved-space formula (Haversine or Lambert) takes over
              from flat-space Pythagoras.
            </p>
            <p>
              Distance is one of the most useful measurements in geometry because so many other
              questions reduce to it: how long is this segment, how far apart are these two
              cities, how close is a point to a line, where is the middle of a road, what bearing
              should a plane fly? Every tab in this calculator is a different flavour of the same
              question — “how far?” — answered with the right formula for the geometry involved.
            </p>
          </CalcSection>

          <CalcSection title="Distance formulas explained, method by method">
            <p className="text-sm text-muted-foreground">
              For every method below you'll see a plain-English explanation, the formula (with
              what each letter means), a diagram, and a worked example — all in one place.
            </p>
            <div className="mt-4 space-y-5">
              {DISTANCE_GUIDE.map((g) => (
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

          <CalcSection title="All formulas — every calculation mode">
            <AllFormulasSection
              intro={
                <>
                  Each mode below returns the straight-line distance{" "}
                  <em>d</em> between two points, plus the auxiliary quantities
                  the calculator reports (differences, midpoint, slope, bearing).
                </>
              }
            >
              <ModeFormula
                label="1. 2D Cartesian — (x₁,y₁), (x₂,y₂)"
                lines={[
                  <>Δx = x₂ − x₁,   Δy = y₂ − y₁</>,
                  <>d = √(Δx² + Δy²)</>,
                  <>Midpoint  M = ((x₁+x₂)/2, (y₁+y₂)/2)</>,
                  <>Slope  m = Δy / Δx</>,
                ]}
              />
              <ModeFormula
                label="2. 3D Cartesian — (x₁,y₁,z₁), (x₂,y₂,z₂)"
                lines={[
                  <>Δx = x₂−x₁,  Δy = y₂−y₁,  Δz = z₂−z₁</>,
                  <>d = √(Δx² + Δy² + Δz²)</>,
                ]}
              />
              <ModeFormula
                label="3. Polar — (r₁, θ₁), (r₂, θ₂)"
                lines={[
                  <>d = √(r₁² + r₂² − 2·r₁·r₂·cos(θ₂ − θ₁))</>,
                  <>Cartesian form: xᵢ = rᵢ·cos θᵢ, yᵢ = rᵢ·sin θᵢ</>,
                ]}
              />
              <ModeFormula
                label="4. Lat/Long — Haversine (spherical Earth)"
                lines={[
                  <>a = sin²(Δφ/2) + cos φ₁·cos φ₂·sin²(Δλ/2)</>,
                  <>c = 2·atan2(√a, √(1−a))</>,
                  <>d = R · c    (R ≈ 6371 km)</>,
                ]}
              />
              <ModeFormula
                label="5. Lat/Long — Lambert (ellipsoidal)"
                lines={[
                  <>reduced latitudes  βᵢ = atan((1−f)·tan φᵢ)</>,
                  <>central angle σ from Haversine on β, Δλ</>,
                  <>d = a·(σ − f/2·(X + Y))   (WGS-84)</>,
                ]}
              />
              <ModeFormula
                label="6. Initial & final bearing"
                lines={[
                  <>θ₁ = atan2(sin Δλ·cos φ₂, cos φ₁·sin φ₂ − sin φ₁·cos φ₂·cos Δλ)</>,
                  <>θ₂ = (θ₁_reverse + 180°) mod 360°</>,
                ]}
              />
              <ModeFormula
                label="7. Taxicab / Chebyshev (grid)"
                lines={[
                  <>Manhattan  d₁ = |Δx| + |Δy|</>,
                  <>Chebyshev  d∞ = max(|Δx|, |Δy|)</>,
                  <>Euclidean  d₂ = √(Δx² + Δy²)</>,
                ]}
              />
              <ModeFormula
                label="8. Line y = mx + b through two points"
                lines={[
                  <>m = (y₂ − y₁) / (x₂ − x₁)</>,
                  <>b = y₁ − m·x₁</>,
                  <>angle with x-axis  α = atan m</>,
                ]}
              />
            </AllFormulasSection>
          </CalcSection>

          <CalcSection title="Features of this calculator">

            <FeatureList
              items={[
                "2D distance with a live coordinate-plane diagram showing the two points, the right-triangle legs (Δx, Δy) and the connecting distance segment.",
                "3D distance with an isometric sketch of the x-, y- and z-axes and both points plotted.",
                "Latitude/longitude great-circle distance using the Haversine formula, plus Lambert's ellipsoidal formula for higher accuracy — results in both kilometres and miles, along with the initial and final compass bearings.",
                "Decimal-degrees or degrees-minutes-seconds input, with per-coordinate N/S and E/W selectors.",
                "Interactive click-to-place world map — set two points, drag either marker, see the great-circle arc and distance update live.",
                "Show/hide step-by-step working for every calculation, with the formula, substitution, and final value.",
                "Copy-to-clipboard buttons on every result.",
                "Manhattan / Chebyshev tab comparing taxicab, chessboard-king and straight-line distance side by side for the same two points.",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is the distance formula?",
                  a: <>In a 2D plane the distance between (x₁, y₁) and (x₂, y₂) is <em>d = √((x₂ − x₁)² + (y₂ − y₁)²)</em>. It comes straight from the Pythagorean theorem — the horizontal and vertical gaps are the two legs of a right triangle and the distance is the hypotenuse.</>,
                },
                {
                  q: "Does the order of the two points matter?",
                  a: "No. Because each difference is squared, (x₂ − x₁)² equals (x₁ − x₂)², so you get the same answer whichever point you label 1 and which one you label 2. The same is true in 3D and for the Haversine formula.",
                },
                {
                  q: "How do I calculate distance between two GPS coordinates?",
                  a: "Use the Haversine formula, which gives the shortest distance across the surface of a sphere. Convert both latitudes and longitudes to radians, plug into a = sin²(Δφ/2) + cos φ₁·cos φ₂·sin²(Δλ/2), then d = 2R·asin(√a) with R ≈ 6371 km (3959 mi) for the Earth.",
                },
                {
                  q: "Why do Haversine and Lambert's formula give slightly different answers?",
                  a: "Haversine assumes the Earth is a perfect sphere; the real Earth is an oblate spheroid — slightly wider at the equator than pole-to-pole. That difference can put Haversine off by up to about 0.5%. Lambert's formula corrects for the flattening and is usually accurate to within about 10 metres over thousands of kilometres.",
                },
                {
                  q: "What's the difference between great-circle distance and driving distance?",
                  a: "Great-circle distance is the shortest possible path between two points along the Earth's surface, as the crow flies. Driving distance follows actual roads, which are longer and depend on the route. This calculator gives great-circle distance only.",
                },
                {
                  q: "Can I enter coordinates in degrees, minutes, seconds?",
                  a: "Yes — switch the lat/long tab to DMS. Enter each coordinate as three numbers (degrees, minutes, seconds) plus a hemisphere. The calculator converts to decimal degrees using ± (degrees + minutes/60 + seconds/3600), with South and West being negative.",
                },
                {
                  q: "What is final bearing versus initial bearing?",
                  a: "Initial bearing is the compass direction you head in when leaving point A along the great-circle path to B. Because the Earth is curved, that direction drifts as you travel, so the direction you're facing when you arrive at B — the final bearing — is usually different. It's calculated by finding the initial bearing from B back to A, then adding 180° (mod 360°).",
                },
                {
                  q: "What are Manhattan and Chebyshev distance used for?",
                  a: "Manhattan (taxicab) distance sums |Δx| + |Δy| and matches movement restricted to horizontal/vertical steps, such as city blocks or grid-based pathfinding (e.g. A* on a 4-directional grid). Chebyshev distance takes max(|Δx|, |Δy|) and matches movement where diagonal steps cost the same as straight ones, such as a king's moves on a chessboard.",
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/slope-intercept-calculator", label: "Slope-Intercept Form Calculator" },
                { to: "/calculators/math/number-line-distance-calculator", label: "Number Line Distance Calculator" },
                { to: "/calculators/math/triangle-calculator", label: "Triangle Calculator" },
                { to: "/calculators/math/area-calculator", label: "Area Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {tabBtn("2d", "2D distance")}
        {tabBtn("3d", "3D distance")}
        {tabBtn("geo", "Latitude / Longitude")}
        {tabBtn("map", "Distance on map")}
        {tabBtn("mid", "Midpoint")}
        {tabBtn("ptl", "Point to line")}
        {tabBtn("mc", "Manhattan / Chebyshev")}
      </div>

      {tab === "2d" && <Calc2D />}
      {tab === "3d" && <Calc3D />}
      {tab === "geo" && <CalcLatLong />}
      {tab === "map" && <MapPicker />}
      {tab === "mid" && <CalcMidpoint />}
      {tab === "ptl" && <CalcPointToLine />}
      {tab === "mc" && <CalcManhattanChebyshev />}
    </MathCalcPage>
  );
}
