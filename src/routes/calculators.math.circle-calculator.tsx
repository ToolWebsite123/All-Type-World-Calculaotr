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
  
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  ResultBox,
  GuideCards,
  StackedMath,
  type GuideCardItem,
} from "@/components/MathCalcPage";

import { type Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";

/* --- Small display primitives, matching area/triangle/slope calculators --- */
function MathLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-1 text-center font-serif text-[15px] italic leading-relaxed text-foreground">
      <StackedMath>{children}</StackedMath>
    </div>
  );
}
function MathNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 mb-1 text-sm not-italic text-muted-foreground">
      {children}
    </div>
  );
}

/* ================= Types & helpers ================= */

type Mode = "one" | "3points" | "cp" | "general";

const MODE_LABEL: Record<Mode, string> = {
  one: "Solve from one value",
  "3points": "Circle from 3 points",
  cp: "Center + point on circle",
  general: "General equation",
};



import { num, fmt as fmtShared, TO_M, TO_M2 } from "@/lib/math/geometry-shared";
// Circle pages historically default to 6 decimals; wrap the shared formatter
// so every existing call site keeps its precision without churn.
const fmt = (x: number, dp = 6): string => fmtShared(x, dp);
export { num, TO_M, TO_M2 };

/* ================= FAQ + SEO ================= */

const FAQ_ITEMS = [
  {
    q: "What is a circle?",
    a: "A circle is the set of all points in a plane that are the same distance (the radius) from a fixed center point.",
  },
  {
    q: "How do I find the area of a circle from its circumference?",
    a: "First find the radius from r = C / (2π), then compute area A = π r². You can also combine them directly: A = C² / (4π).",
  },
  {
    q: "What is π (pi)?",
    a: "π is the ratio of a circle's circumference to its diameter, roughly 3.14159. It is irrational, meaning its decimal expansion never ends or repeats, and it is the same value for every circle.",
  },
  {
    q: "How do I find a circle from three points?",
    a: "The three points are equidistant from the center. Set up two equations by equating squared distances from the unknown center to each pair of points, solve the resulting linear system for the center (h, k), then take r as the distance from (h, k) to any of the three points.",
  },
  {
    q: "What is the general equation of a circle?",
    a: "x² + y² + Dx + Ey + F = 0 describes a circle with center (−D/2, −E/2) and radius √((D/2)² + (E/2)² − F). If that expression under the square root is 0 you get a single point; if it is negative there is no real circle.",
  },
  {
    q: "How long is the arc for a given central angle?",
    a: "Arc length s = r · θ when θ is in radians. In degrees, s = π r θ / 180. For a full circle (θ = 2π) this reduces to the circumference 2π r.",
  },
  {
    q: "How is a chord length related to the central angle?",
    a: "For a chord subtending a central angle θ, the chord length is 2 r sin(θ/2). Going the other way, θ = 2 · arcsin(chord / (2 r)).",
  },
  {
    q: "What is a circular segment?",
    a: "The region between a chord and its arc. Its area equals the sector area minus the triangle formed by the two radii and the chord: A = ½ r² (θ − sin θ) with θ in radians.",
  },
  {
    q: "How do I compute a tangent from an external point?",
    a: "If P is at distance d from the center of a circle of radius r (with d > r), the length of the tangent segment from P to the point of tangency is √(d² − r²).",
  },
  {
    q: "Can I express a circle's area as an equivalent square?",
    a: "Yes — a square with side s = √A has the same area as a circle of area A. Constructing such a square with only compass and straightedge is impossible (the classical 'squaring the circle' problem), but the numeric equivalence is useful for comparing areas.",
  },
  {
    q: "How do I tell if a line and a circle intersect?",
    a: "Substitute the line equation into (x − h)² + (y − k)² = r² to get a quadratic in x. Its discriminant Δ decides the outcome: Δ > 0 gives two intersection points (a secant), Δ = 0 gives one (a tangent), and Δ < 0 means the line misses the circle. The Line–Circle Intersection tool below runs this substitution and shows every step.",
  },
  {
    q: "How do I know if two circles intersect?",
    a: "Compare the distance d between their centers to the sum and difference of their radii. If d > r₁ + r₂ the circles are separate; d = r₁ + r₂ is externally tangent; |r₁ − r₂| < d < r₁ + r₂ gives two intersection points; d = |r₁ − r₂| is internally tangent; and d < |r₁ − r₂| means one lies fully inside the other. The Two Circles tool computes the intersection coordinates and the radical line automatically.",
  },
] as const;

export const Route = createFileRoute("/calculators/math/circle-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Circle Calculator",
      title: "Circle Calculator — Radius, Diameter, Area, Circumference & More",
      metaDescription:
        "Free circle calculator: solve radius, diameter, area and circumference from any one value; find a circle from 3 points, center + point or the general equation; arc, chord, sector, segment, annulus and tangent tools with a live diagram and step-by-step working.",
      canonicalUrl: "/calculators/math/circle-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Circle Calculator", path: "/calculators/math/circle-calculator" },
      ],
      faqs: FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a })),
    }),
  component: CirclePage,
});

/* ================= Page shell ================= */

function CirclePage() {
  const [mode, setMode] = useState<Mode>("one");
  return (
    <MathCalcPage
      name="Circle Calculator"
      tagline="Solve any circle four ways — from a single value (radius, diameter, area or circumference), from three points, from a center and a point on the circle, or from the general equation x² + y² + Dx + Ey + F = 0. Then unlock arc length, chord, sector, circular segment, annulus, tangent and equivalent-square tools."
      extras={<CircleEducation />}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={
              "rounded-full border px-3 py-1.5 text-sm transition-colors " +
              (mode === m
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground")
            }
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      {mode === "one" && <SolveFromOne key="one" />}
      {mode === "3points" && <SolveFromThreePoints key="3p" />}
      {mode === "cp" && <SolveFromCenterPoint key="cp" />}
      {mode === "general" && <SolveFromGeneral key="gen" />}

      <div className="mt-10 space-y-6">
        <ArcSectorTool />
        <ChordTool />
        <SegmentTool />
        <AnnulusTool />
        <TangentTool />
        <LineCircleTool />
        <TwoCirclesTool />
        <EquivalentSquareTool />
      </div>
    </MathCalcPage>
  );
}



/* ================= Mode 1: Solve from any one value ================= */

type OneField = "r" | "d" | "C" | "A";

function SolveFromOne() {
  const [unit, setUnit] = useState<string>("m");
  const [r, setR] = useState("");
  const [d, setD] = useState("");
  const [C, setC] = useState("");
  const [A, setA] = useState("");
  const captureRef = useRef<HTMLDivElement>(null);

  const filled: [OneField, string][] = (
    [
      ["r", r],
      ["d", d],
      ["C", C],
      ["A", A],
    ] as [OneField, string][]
  ).filter(([, v]) => v.trim() !== "");

  const compute = useMemo<{
    error?: string;
    from?: OneField;
    r?: number; d?: number; C?: number; A?: number;
    steps: Step[];
  }>(() => {
    if (filled.length === 0) return { steps: [] };
    if (filled.length > 1)
      return { steps: [], error: "Enter just one value — the other three are computed for you." };
    const [key, raw] = filled[0];
    const v = num(raw);
    if (v === null || v <= 0)
      return { steps: [], error: `${key} must be a positive number.` };

    let R = 0;
    if (key === "r") R = v;
    else if (key === "d") R = v / 2;
    else if (key === "C") R = v / (2 * Math.PI);
    else if (key === "A") R = Math.sqrt(v / Math.PI);

    const D = 2 * R;
    const Cv = 2 * Math.PI * R;
    const Av = Math.PI * R * R;

    const steps: Step[] = [];
    if (key === "r") {
      steps.push({
        title: "Diameter, circumference, area from r",
        body: (
          <>
            <MathNote>Given radius r = {fmt(v)}. Apply each formula.</MathNote>
            <MathLine>d = 2r = 2 × {fmt(v)} = {fmt(D)}</MathLine>
            <MathLine>C = 2πr = 2π × {fmt(v)} = {fmt(Cv)}</MathLine>
            <MathLine>A = πr² = π × {fmt(v)}² = {fmt(Av)}</MathLine>
          </>
        ),
      });
    } else if (key === "d") {
      steps.push({
        title: "Radius from diameter",
        body: (
          <>
            <MathNote>r is half the diameter.</MathNote>
            <MathLine>r = d / 2 = {fmt(v)} / 2 = {fmt(R)}</MathLine>
          </>
        ),
      });
      steps.push({
        title: "Circumference and area from r",
        body: (
          <>
            <MathLine>C = πd = π × {fmt(v)} = {fmt(Cv)}</MathLine>
            <MathLine>A = π r² = π × {fmt(R)}² = {fmt(Av)}</MathLine>
          </>
        ),
      });
    } else if (key === "C") {
      steps.push({
        title: "Radius from circumference",
        body: (
          <>
            <MathNote>Solve C = 2πr for r.</MathNote>
            <MathLine>r = C / (2π) = {fmt(v)} / (2π) = {fmt(R)}</MathLine>
          </>
        ),
      });
      steps.push({
        title: "Diameter and area",
        body: (
          <>
            <MathLine>d = 2r = {fmt(D)}</MathLine>
            <MathLine>A = C² / (4π) = {fmt(v)}² / (4π) = {fmt(Av)}</MathLine>
          </>
        ),
      });
    } else {
      steps.push({
        title: "Radius from area",
        body: (
          <>
            <MathNote>Solve A = π r² for r.</MathNote>
            <MathLine>r = √(A / π) = √({fmt(v)} / π) = {fmt(R)}</MathLine>
          </>
        ),
      });
      steps.push({
        title: "Diameter and circumference",
        body: (
          <>
            <MathLine>d = 2r = {fmt(D)}</MathLine>
            <MathLine>C = 2πr = {fmt(Cv)}</MathLine>
          </>
        ),
      });
    }

    return { from: key, r: R, d: D, C: Cv, A: Av, steps };
  }, [filled]);

  const setOnly = (field: OneField, value: string) => {
    // Free-form: allow user to type in any single field. Clear others.
    if (field !== "r") setR("");
    if (field !== "d") setD("");
    if (field !== "C") setC("");
    if (field !== "A") setA("");
    if (field === "r") setR(value);
    if (field === "d") setD(value);
    if (field === "C") setC(value);
    if (field === "A") setA(value);
  };

  const clearAll = () => { setR(""); setD(""); setC(""); setA(""); };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <Field label={`Radius r (${unit})`}>
            <TextInput inputMode="decimal" value={r} onChange={(e) => setOnly("r", e.target.value)} placeholder="e.g. 5" />
          </Field>
          <Field label={`Diameter d (${unit})`}>
            <TextInput inputMode="decimal" value={d} onChange={(e) => setOnly("d", e.target.value)} placeholder="e.g. 10" />
          </Field>
          <Field label={`Circumference C (${unit})`}>
            <TextInput inputMode="decimal" value={C} onChange={(e) => setOnly("C", e.target.value)} placeholder="e.g. 31.4159" />
          </Field>
          <Field label={`Area A (${unit}²)`}>
            <TextInput inputMode="decimal" value={A} onChange={(e) => setOnly("A", e.target.value)} placeholder="e.g. 78.5398" />
          </Field>
          <div className="flex gap-2">
            <button type="button" onClick={clearAll} className="rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Clear</button>
            <span className="self-center text-xs text-muted-foreground">Fill any one field — the others are calculated.</span>
          </div>
        </div>
        <div className="space-y-3">
          <Field label="Length unit">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {Object.keys(TO_M).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>
          <CircleDiagram radius={compute.r ?? undefined} showRadius />
        </div>
      </div>

      {compute.error && <ErrorBox message={compute.error} />}
      {compute.r !== undefined && (
        <div ref={captureRef} className="mt-5 overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card/60 to-card/40 shadow-[0_20px_60px_-30px_var(--color-primary)]">
          <div className="flex flex-col gap-3 border-b border-border/50 bg-primary/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">Result</div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                From <span className="font-medium text-foreground">{compute.from}</span> — all four values below.
              </div>
            </div>
            <div className="flex-shrink-0">
              <ResultActions
                getCopyText={() =>
                  `Circle — r=${fmt(compute.r!)} ${unit}, d=${fmt(compute.d!)} ${unit}, C=${fmt(compute.C!)} ${unit}, A=${fmt(compute.A!)} ${unit}²`
                }
                captureRef={captureRef}
                filename={`circle-from-${compute.from}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4">
            <ResultCard
              name="Radius"
              formula="r"
              value={fmt(compute.r!, 4)}
              unit={unit}
              highlight={compute.from === "r"}
            />
            <ResultCard
              name="Diameter"
              formula="d = 2r"
              value={fmt(compute.d!, 4)}
              unit={unit}
              highlight={compute.from === "d"}
            />
            <ResultCard
              name="Circumference"
              formula="C = 2πr"
              value={fmt(compute.C!, 4)}
              unit={unit}
              highlight={compute.from === "C"}
            />
            <ResultCard
              name="Area"
              formula="A = πr²"
              value={fmt(compute.A!, 4)}
              unit={`${unit}²`}
              highlight={compute.from === "A"}
            />
          </div>

          <div className="mx-3 mb-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2 sm:mx-4 sm:mb-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Equation</div>
            <div className="mt-0.5 break-words font-serif text-[15px] italic text-foreground">
              x² + y² = {fmt(compute.r! * compute.r!, 4)}
            </div>
          </div>

          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <AreaUnitConversions areaInUnit={compute.A!} unit={unit} />
          </div>

          <div className="border-t border-border/50 bg-background/30 px-3 py-3 sm:px-4">
            <StepsToggle steps={compute.steps} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-xl border border-border/60 bg-secondary/20 px-3 py-2 tabular-nums">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function ResultCard({
  name,
  formula,
  value,
  unit,
  highlight,
}: {
  name: string;
  formula: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl border p-3 transition-colors sm:p-3.5 " +
        (highlight
          ? "border-primary/50 bg-primary/[0.12]"
          : "border-border/60 bg-background/40")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:text-[11px]">{name}</div>
          <div className="mt-0.5 truncate font-serif text-[11px] italic text-muted-foreground/80">{formula}</div>
        </div>
        {highlight && (
          <span className="flex-shrink-0 rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
            given
          </span>
        )}
      </div>
      <div className="mt-2 font-display text-lg font-semibold tabular-nums text-foreground sm:text-xl">
        <span className="break-all">{value}</span>
        <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function AreaUnitConversions({ areaInUnit, unit }: { areaInUnit: number; unit: string }) {
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
        Area converted to common units
      </div>
      <div className="grid grid-cols-1 gap-y-1 text-sm sm:grid-cols-2">
        {rows.map(([label, val]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 tabular-nums">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">{fmt(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= Mode 2: Circle from 3 points ================= */

function SolveFromThreePoints() {
  const [x1, setX1] = useState("0");
  const [y1, setY1] = useState("0");
  const [x2, setX2] = useState("4");
  const [y2, setY2] = useState("0");
  const [x3, setX3] = useState("0");
  const [y3, setY3] = useState("4");
  const captureRef = useRef<HTMLDivElement>(null);

  const result = useMemo(() => {
    const p = [num(x1), num(y1), num(x2), num(y2), num(x3), num(y3)];
    if (p.some((v) => v === null))
      return { error: "Enter numeric coordinates for all three points." };
    const [X1, Y1, X2, Y2, X3, Y3] = p as number[];
    // Determinant method
    const a = X1 * (Y2 - Y3) - Y1 * (X2 - X3) + X2 * Y3 - X3 * Y2;
    if (Math.abs(a) < 1e-12)
      return { error: "The three points are collinear — no unique circle passes through them." };
    const s1 = X1 * X1 + Y1 * Y1;
    const s2 = X2 * X2 + Y2 * Y2;
    const s3 = X3 * X3 + Y3 * Y3;
    const bx = -(s1 * (Y2 - Y3) - Y1 * (s2 - s3) + (s2 * Y3 - s3 * Y2));
    const by = s1 * (X2 - X3) - X1 * (s2 - s3) + (s2 * X3 - s3 * X2);
    const h = -bx / (2 * a);
    const k = -by / (2 * a);
    const r = Math.hypot(X1 - h, Y1 - k);
    const steps: Step[] = [
      {
        title: "Set up the determinant",
        body: (
          <>
            <MathNote>
              The unique circle through three non-collinear points has center (h, k) and radius r
              satisfying (x − h)² + (y − k)² = r² for each point. Expanding gives a linear system in
              (h, k).
            </MathNote>
            <MathLine>a = x₁(y₂ − y₃) − y₁(x₂ − x₃) + x₂y₃ − x₃y₂</MathLine>
            <MathLine>a = {fmt(a)}</MathLine>
          </>
        ),
      },
      {
        title: "Solve for the center",
        body: (
          <>
            <MathLine>h = −b_x / (2a) = {fmt(h)}</MathLine>
            <MathLine>k = −b_y / (2a) = {fmt(k)}</MathLine>
          </>
        ),
      },
      {
        title: "Radius from any point",
        body: (
          <>
            <MathLine>r = √((x₁ − h)² + (y₁ − k)²)</MathLine>
            <MathLine>r = √(({fmt(X1)} − {fmt(h)})² + ({fmt(Y1)} − {fmt(k)})²) = {fmt(r)}</MathLine>
          </>
        ),
      },
    ];
    return { h, k, r, steps, points: [[X1, Y1], [X2, Y2], [X3, Y3]] as [number, number][] };
  }, [x1, y1, x2, y2, x3, y3]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          {[
            ["P₁", x1, y1, setX1, setY1],
            ["P₂", x2, y2, setX2, setY2],
            ["P₃", x3, y3, setX3, setY3],
          ].map(([label, xv, yv, sx, sy]) => (
            <div key={label as string} className="grid grid-cols-[auto_1fr_1fr] items-end gap-2">
              <span className="pb-3 text-sm font-medium text-foreground">{label as string}</span>
              <Field label="x">
                <TextInput inputMode="decimal" value={xv as string} onChange={(e) => (sx as (v: string) => void)(e.target.value)} />
              </Field>
              <Field label="y">
                <TextInput inputMode="decimal" value={yv as string} onChange={(e) => (sy as (v: string) => void)(e.target.value)} />
              </Field>
            </div>
          ))}
        </div>
        <CircleDiagram
          radius={result.r}
          center={result.h !== undefined ? [result.h, result.k!] : undefined}
          points={result.points}
        />
      </div>

      {result.error && <ErrorBox message={result.error} />}
      {result.r !== undefined && (
        <div ref={captureRef} className="rounded-3xl bg-card/40 p-1">
          <ResultBox
            label="Circle"
            value={<>Center ({fmt(result.h!)}, {fmt(result.k!)}), r = {fmt(result.r)}</>}
            note={<>Equation: (x − {fmt(result.h!)})² + (y − {fmt(result.k!)})² = {fmt(result.r * result.r)}</>}
          />
          <div className="mt-3 flex justify-end px-1">
            <ResultActions
              getCopyText={() =>
                `Circle through 3 points — center (${fmt(result.h!)}, ${fmt(result.k!)}), r = ${fmt(result.r)}`
              }
              captureRef={captureRef}
              filename="circle-3-points"
            />
          </div>
          <StepsToggle steps={result.steps!} />
        </div>
      )}
    </div>
  );
}

/* ================= Mode 3: Center + point ================= */

function SolveFromCenterPoint() {
  const [h, setH] = useState("0");
  const [k, setK] = useState("0");
  const [px, setPx] = useState("3");
  const [py, setPy] = useState("4");
  const captureRef = useRef<HTMLDivElement>(null);

  const result = useMemo(() => {
    const v = [num(h), num(k), num(px), num(py)];
    if (v.some((x) => x === null))
      return { error: "Enter numeric values for the center and the point." };
    const [H, K, X, Y] = v as number[];
    const dx = X - H;
    const dy = Y - K;
    const r = Math.hypot(dx, dy);
    if (r === 0) return { error: "The point coincides with the center — radius would be 0." };
    const steps: Step[] = [
      {
        title: "Distance from center to point",
        body: (
          <>
            <MathNote>The radius equals the distance from the center to any point on the circle.</MathNote>
            <MathLine>r = √((x − h)² + (y − k)²)</MathLine>
            <MathLine>r = √(({fmt(X)} − {fmt(H)})² + ({fmt(Y)} − {fmt(K)})²)</MathLine>
            <MathLine>r = √({fmt(dx * dx + dy * dy)}) = {fmt(r)}</MathLine>
          </>
        ),
      },
      {
        title: "Write the equation",
        body: (
          <>
            <MathLine>(x − {fmt(H)})² + (y − {fmt(K)})² = {fmt(r * r)}</MathLine>
          </>
        ),
      },
    ];
    return { h: H, k: K, r, steps, points: [[X, Y]] as [number, number][] };
  }, [h, k, px, py]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Center h"><TextInput inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} /></Field>
            <Field label="Center k"><TextInput inputMode="decimal" value={k} onChange={(e) => setK(e.target.value)} /></Field>
            <Field label="Point x"><TextInput inputMode="decimal" value={px} onChange={(e) => setPx(e.target.value)} /></Field>
            <Field label="Point y"><TextInput inputMode="decimal" value={py} onChange={(e) => setPy(e.target.value)} /></Field>
          </div>
        </div>
        <CircleDiagram
          radius={result.r}
          center={result.h !== undefined ? [result.h, result.k!] : undefined}
          points={result.points}
        />
      </div>
      {result.error && <ErrorBox message={result.error} />}
      {result.r !== undefined && (
        <div ref={captureRef} className="rounded-3xl bg-card/40 p-1">
          <ResultBox
            label="Radius"
            value={<>{fmt(result.r)}</>}
            note={<>Equation: (x − {fmt(result.h!)})² + (y − {fmt(result.k!)})² = {fmt(result.r * result.r)}</>}
          />
          <div className="mt-3 flex justify-end px-1">
            <ResultActions
              getCopyText={() => `Circle — center (${fmt(result.h!)}, ${fmt(result.k!)}), r = ${fmt(result.r)}`}
              captureRef={captureRef}
              filename="circle-center-point"
            />
          </div>
          <StepsToggle steps={result.steps!} />
        </div>
      )}
    </div>
  );
}

/* ================= Mode 4: General equation ================= */

function SolveFromGeneral() {
  const [D, setD] = useState("-4");
  const [E, setE] = useState("-6");
  const [F, setF] = useState("9");
  const captureRef = useRef<HTMLDivElement>(null);

  const result = useMemo(() => {
    const v = [num(D), num(E), num(F)];
    if (v.some((x) => x === null))
      return { error: "Enter numeric coefficients D, E and F." };
    const [Dv, Ev, Fv] = v as number[];
    const h = -Dv / 2;
    const k = -Ev / 2;
    const r2 = (Dv / 2) * (Dv / 2) + (Ev / 2) * (Ev / 2) - Fv;
    if (r2 < 0)
      return { error: "This equation has no real circle — the computed r² is negative." };
    if (r2 === 0)
      return { error: "This equation describes a single point, not a real circle (r² = 0)." };
    const r = Math.sqrt(r2);
    const steps: Step[] = [
      {
        title: "Complete the square",
        body: (
          <>
            <MathNote>
              Group x and y terms and complete the square: x² + Dx = (x + D/2)² − (D/2)², and
              similarly for y.
            </MathNote>
            <MathLine>x² + y² + ({fmt(Dv)})x + ({fmt(Ev)})y + {fmt(Fv)} = 0</MathLine>
            <MathLine>(x + {fmt(Dv / 2)})² + (y + {fmt(Ev / 2)})² = (D/2)² + (E/2)² − F</MathLine>
          </>
        ),
      },
      {
        title: "Read off center and radius",
        body: (
          <>
            <MathLine>h = −D/2 = {fmt(h)}, k = −E/2 = {fmt(k)}</MathLine>
            <MathLine>r² = ({fmt(Dv / 2)})² + ({fmt(Ev / 2)})² − {fmt(Fv)} = {fmt(r2)}</MathLine>
            <MathLine>r = √{fmt(r2)} = {fmt(r)}</MathLine>
          </>
        ),
      },
    ];
    return { h, k, r, steps };
  }, [D, E, F]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Equation form: <span className="font-serif italic text-foreground">x² + y² + D·x + E·y + F = 0</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="D"><TextInput inputMode="decimal" value={D} onChange={(e) => setD(e.target.value)} /></Field>
            <Field label="E"><TextInput inputMode="decimal" value={E} onChange={(e) => setE(e.target.value)} /></Field>
            <Field label="F"><TextInput inputMode="decimal" value={F} onChange={(e) => setF(e.target.value)} /></Field>
          </div>
        </div>
        <CircleDiagram
          radius={result.r}
          center={result.h !== undefined ? [result.h, result.k!] : undefined}
        />
      </div>
      {result.error && <ErrorBox message={result.error} />}
      {result.r !== undefined && (
        <div ref={captureRef} className="rounded-3xl bg-card/40 p-1">
          <ResultBox
            label="Circle"
            value={<>Center ({fmt(result.h!)}, {fmt(result.k!)}), r = {fmt(result.r)}</>}
            note={<>(x − {fmt(result.h!)})² + (y − {fmt(result.k!)})² = {fmt(result.r * result.r)}</>}
          />
          <div className="mt-3 flex justify-end px-1">
            <ResultActions
              getCopyText={() =>
                `x² + y² + (${D})x + (${E})y + (${F}) = 0 → center (${fmt(result.h!)}, ${fmt(result.k!)}), r = ${fmt(result.r)}`
              }
              captureRef={captureRef}
              filename="circle-general-equation"
            />
          </div>
          <StepsToggle steps={result.steps!} />
        </div>
      )}
    </div>
  );
}

/* ================= Advanced tools ================= */

function ToolCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="font-display text-base font-semibold text-foreground">{title}</span>
          {subtitle && <span className="ml-2 text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open && <div className="border-t border-border/60 p-4">{children}</div>}
    </div>
  );
}

function ArcSectorTool() {
  const [r, setR] = useState("10");
  const [theta, setTheta] = useState("60");
  const [unit, setUnit] = useState<"deg" | "rad">("deg");
  const [arc, setArc] = useState("");
  const [mode, setMode] = useState<"angle" | "arc">("angle");

  const result = useMemo(() => {
    const R = num(r);
    if (R === null || R <= 0) return { error: "Enter a positive radius." };
    if (mode === "angle") {
      const t = num(theta);
      if (t === null) return { error: "Enter a central angle." };
      const rad = unit === "deg" ? (t * Math.PI) / 180 : t;
      const s = R * rad;
      const A = 0.5 * R * R * rad;
      return { arc: s, sector: A, thetaRad: rad };
    } else {
      const s = num(arc);
      if (s === null || s <= 0) return { error: "Enter a positive arc length." };
      const rad = s / R;
      const A = 0.5 * R * R * rad;
      const deg = (rad * 180) / Math.PI;
      return { arc: s, sector: A, thetaRad: rad, thetaDeg: deg };
    }
  }, [r, theta, arc, unit, mode]);

  return (
    <ToolCard title="Arc length & sector area" subtitle="s = r · θ,  A = ½ r² θ (θ in radians)">
      <div className="mb-3 flex gap-2">
        {(["angle", "arc"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={"rounded-full border px-3 py-1 text-xs " + (mode === m ? "border-primary/60 bg-primary/10 text-foreground" : "border-border/60 bg-secondary/30 text-muted-foreground")}>
            {m === "angle" ? "Given angle" : "Given arc length"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Radius r"><TextInput inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} /></Field>
        {mode === "angle" ? (
          <>
            <Field label={`Angle θ (${unit})`}><TextInput inputMode="decimal" value={theta} onChange={(e) => setTheta(e.target.value)} /></Field>
            <Field label="Angle unit">
              <select value={unit} onChange={(e) => setUnit(e.target.value as "deg" | "rad")}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="deg">Degrees</option>
                <option value="rad">Radians</option>
              </select>
            </Field>
          </>
        ) : (
          <Field label="Arc length s"><TextInput inputMode="decimal" value={arc} onChange={(e) => setArc(e.target.value)} /></Field>
        )}
      </div>
      {result.error ? (
        <ErrorBox message={result.error} />
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
          <StatRow label="Arc length s" value={fmt(result.arc!)} />
          <StatRow label="Sector area A" value={fmt(result.sector!)} />
          <StatRow
            label="Central angle θ"
            value={
              mode === "angle"
                ? `${fmt(result.thetaRad!)} rad`
                : `${fmt(result.thetaRad!)} rad (${fmt(result.thetaDeg!)}°)`
            }
          />
        </div>
      )}
    </ToolCard>
  );
}

function ChordTool() {
  const [r, setR] = useState("10");
  const [theta, setTheta] = useState("60");
  const [chord, setChord] = useState("");
  const [dist, setDist] = useState("");
  const [mode, setMode] = useState<"angle" | "chord" | "dist">("angle");

  const result = useMemo(() => {
    const R = num(r);
    if (R === null || R <= 0) return { error: "Enter a positive radius." };
    if (mode === "angle") {
      const t = num(theta);
      if (t === null) return { error: "Enter a central angle in degrees." };
      const rad = (t * Math.PI) / 180;
      const c = 2 * R * Math.sin(rad / 2);
      const d = R * Math.cos(rad / 2);
      return { chord: c, angleDeg: t, angleRad: rad, distance: d };
    }
    if (mode === "chord") {
      const c = num(chord);
      if (c === null || c <= 0) return { error: "Enter a positive chord length." };
      if (c > 2 * R) return { error: "Chord cannot exceed the diameter (2r)." };
      const rad = 2 * Math.asin(c / (2 * R));
      const deg = (rad * 180) / Math.PI;
      const d = R * Math.cos(rad / 2);
      return { chord: c, angleDeg: deg, angleRad: rad, distance: d };
    }
    // dist
    const d = num(dist);
    if (d === null || d < 0) return { error: "Enter a non-negative distance." };
    if (d > R) return { error: "Distance from center to chord cannot exceed the radius." };
    const c = 2 * Math.sqrt(R * R - d * d);
    const rad = 2 * Math.asin(c / (2 * R));
    const deg = (rad * 180) / Math.PI;
    return { chord: c, angleDeg: deg, angleRad: rad, distance: d };
  }, [r, theta, chord, dist, mode]);

  return (
    <ToolCard title="Chord length" subtitle="chord = 2r · sin(θ/2)">
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["angle", "Given angle"],
            ["chord", "Given chord"],
            ["dist", "Given center-to-chord distance"],
          ] as const
        ).map(([m, l]) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={"rounded-full border px-3 py-1 text-xs " + (mode === m ? "border-primary/60 bg-primary/10 text-foreground" : "border-border/60 bg-secondary/30 text-muted-foreground")}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Radius r"><TextInput inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} /></Field>
        {mode === "angle" && (
          <Field label="Angle θ (°)"><TextInput inputMode="decimal" value={theta} onChange={(e) => setTheta(e.target.value)} /></Field>
        )}
        {mode === "chord" && (
          <Field label="Chord length"><TextInput inputMode="decimal" value={chord} onChange={(e) => setChord(e.target.value)} /></Field>
        )}
        {mode === "dist" && (
          <Field label="Distance from center"><TextInput inputMode="decimal" value={dist} onChange={(e) => setDist(e.target.value)} /></Field>
        )}
      </div>
      {result.error ? (
        <ErrorBox message={result.error} />
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
          <StatRow label="Chord length" value={fmt(result.chord!)} />
          <StatRow label="Central angle" value={`${fmt(result.angleDeg!)}° (${fmt(result.angleRad!)} rad)`} />
          <StatRow label="Center-to-chord distance" value={fmt(result.distance!)} />
        </div>
      )}
    </ToolCard>
  );
}

function SegmentTool() {
  const [r, setR] = useState("10");
  const [theta, setTheta] = useState("60");
  const result = useMemo(() => {
    const R = num(r); const T = num(theta);
    if (R === null || R <= 0) return { error: "Enter a positive radius." };
    if (T === null || T <= 0 || T >= 360) return { error: "Enter an angle strictly between 0 and 360°." };
    const rad = (T * Math.PI) / 180;
    const sector = 0.5 * R * R * rad;
    const triangle = 0.5 * R * R * Math.sin(rad);
    const segment = sector - triangle;
    const chord = 2 * R * Math.sin(rad / 2);
    return { sector, triangle, segment, chord };
  }, [r, theta]);

  return (
    <ToolCard title="Circular segment area" subtitle="A = ½ r² (θ − sin θ)">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Radius r"><TextInput inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} /></Field>
        <Field label="Central angle θ (°)"><TextInput inputMode="decimal" value={theta} onChange={(e) => setTheta(e.target.value)} /></Field>
      </div>
      {result.error ? <ErrorBox message={result.error} /> : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
          <StatRow label="Sector area" value={fmt(result.sector!)} />
          <StatRow label="Triangle area" value={fmt(result.triangle!)} />
          <StatRow label="Segment area" value={fmt(result.segment!)} />
          <StatRow label="Chord length" value={fmt(result.chord!)} />
        </div>
      )}
    </ToolCard>
  );
}

function AnnulusTool() {
  const [R, setR] = useState("10");
  const [r, setr] = useState("6");
  const result = useMemo(() => {
    const Rv = num(R); const rv = num(r);
    if (Rv === null || rv === null) return { error: "Enter both radii." };
    if (Rv <= 0 || rv < 0) return { error: "Radii must be non-negative and R > 0." };
    if (rv >= Rv) return { error: "Inner radius r must be less than outer radius R." };
    const area = Math.PI * (Rv * Rv - rv * rv);
    const width = Rv - rv;
    const meanCirc = Math.PI * (Rv + rv);
    return { area, width, meanCirc };
  }, [R, r]);
  return (
    <ToolCard title="Annulus (ring)" subtitle="A = π(R² − r²)">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Outer radius R"><TextInput inputMode="decimal" value={R} onChange={(e) => setR(e.target.value)} /></Field>
        <Field label="Inner radius r"><TextInput inputMode="decimal" value={r} onChange={(e) => setr(e.target.value)} /></Field>
      </div>
      <div className="mt-3">
        <CircleDiagram radius={num(R) ?? undefined} innerRadius={num(r) ?? undefined} />
      </div>
      {result.error ? <ErrorBox message={result.error} /> : (
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
          <StatRow label="Area" value={fmt(result.area!)} />
          <StatRow label="Ring width" value={fmt(result.width!)} />
          <StatRow label="Mean circumference" value={fmt(result.meanCirc!)} />
        </div>
      )}
    </ToolCard>
  );
}

function TangentTool() {
  const [h, setH] = useState("0");
  const [k, setK] = useState("0");
  const [r, setR] = useState("3");
  const [px, setPx] = useState("6");
  const [py, setPy] = useState("0");
  const result = useMemo(() => {
    const v = [num(h), num(k), num(r), num(px), num(py)];
    if (v.some((x) => x === null)) return { error: "Enter numeric values." };
    const [H, K, R, X, Y] = v as number[];
    if (R <= 0) return { error: "Radius must be positive." };
    const dx = X - H, dy = Y - K;
    const d = Math.hypot(dx, dy);
    if (d < R) return { error: "The point lies inside the circle — no tangent from an interior point." };
    if (d === R) return { error: "The point lies on the circle — the tangent has length 0 there." };
    const t = Math.sqrt(d * d - R * R);
    // Tangent point coordinates using the classic construction:
    // Let a = R² / d²; the tangent points are on the line PC at parametric positions.
    // T = (h,k) + R * ((R/d²) * (P - C) ± (t/d²) * perp(P - C))
    const a = R / (d * d);
    const b = t / (d * d);
    const px1 = H + a * (R * dx) + b * (R * -dy);
    const py1 = K + a * (R * dy) + b * (R * dx);
    const px2 = H + a * (R * dx) - b * (R * -dy);
    const py2 = K + a * (R * dy) - b * (R * dx);
    return { d, tangent: t, t1: [px1, py1] as [number, number], t2: [px2, py2] as [number, number] };
  }, [h, k, r, px, py]);
  return (
    <ToolCard title="Tangent from an external point" subtitle="t = √(d² − r²)">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Center h"><TextInput inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} /></Field>
        <Field label="Center k"><TextInput inputMode="decimal" value={k} onChange={(e) => setK(e.target.value)} /></Field>
        <Field label="Radius r"><TextInput inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} /></Field>
        <Field label="Point x"><TextInput inputMode="decimal" value={px} onChange={(e) => setPx(e.target.value)} /></Field>
        <Field label="Point y"><TextInput inputMode="decimal" value={py} onChange={(e) => setPy(e.target.value)} /></Field>
      </div>
      {result.error ? <ErrorBox message={result.error} /> : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
          <StatRow label="Distance P → center" value={fmt(result.d!)} />
          <StatRow label="Tangent length" value={fmt(result.tangent!)} />
          <StatRow label="Tangent point T₁" value={`(${fmt(result.t1![0])}, ${fmt(result.t1![1])})`} />
          <StatRow label="Tangent point T₂" value={`(${fmt(result.t2![0])}, ${fmt(result.t2![1])})`} />
        </div>
      )}
    </ToolCard>
  );
}

function EquivalentSquareTool() {
  const [a, setA] = useState("100");
  const result = useMemo(() => {
    const A = num(a);
    if (A === null || A <= 0) return { error: "Enter a positive area." };
    const s = Math.sqrt(A);
    const r = Math.sqrt(A / Math.PI);
    return { s, r };
  }, [a]);
  return (
    <ToolCard title="Equivalent square (squaring the circle)" subtitle="s = √A">
      <p className="mb-3 text-sm text-muted-foreground">
        A square with side s = √A has the same area as a circle of area A. The classical “square the
        circle” construction with only compass and straightedge is provably impossible, but the
        numerical equivalence is still useful for comparing surface sizes.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Circle area A"><TextInput inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} /></Field>
      </div>
      {result.error ? <ErrorBox message={result.error} /> : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
          <StatRow label="Equivalent square side s" value={fmt(result.s!)} />
          <StatRow label="Implied circle radius" value={fmt(result.r!)} />
        </div>
      )}
    </ToolCard>
  );
}


/* ================= Line-Circle Intersection ================= */

function LineCircleTool() {
  const [h, setH] = useState("0");
  const [k, setK] = useState("0");
  const [r, setR] = useState("5");
  const [mode, setMode] = useState<"slope" | "points">("slope");
  const [m, setM] = useState("1");
  const [b, setB] = useState("0");
  const [x1, setX1] = useState("-6");
  const [y1, setY1] = useState("-2");
  const [x2, setX2] = useState("6");
  const [y2, setY2] = useState("4");

  const result = useMemo(() => {
    const H = num(h), K = num(k), R = num(r);
    if (H === null || K === null || R === null) return { error: "Enter numeric center and radius." };
    if (R <= 0) return { error: "Radius must be positive." };

    // Normalize line to y = M x + B, or handle vertical x = C.
    let vertical = false;
    let C = 0;
    let M = 0, B = 0;
    const steps: string[] = [];

    if (mode === "slope") {
      const mv = num(m), bv = num(b);
      if (mv === null || bv === null) return { error: "Enter numeric slope and intercept." };
      M = mv; B = bv;
      steps.push(`Line: y = ${fmt(M)}x + ${fmt(B)}`);
    } else {
      const xs = [num(x1), num(y1), num(x2), num(y2)];
      if (xs.some((v) => v === null)) return { error: "Enter numeric coordinates for both points." };
      const [X1, Y1, X2, Y2] = xs as number[];
      if (X1 === X2 && Y1 === Y2) return { error: "The two points must differ." };
      if (X1 === X2) {
        vertical = true;
        C = X1;
        steps.push(`Line is vertical: x = ${fmt(C)}`);
      } else {
        M = (Y2 - Y1) / (X2 - X1);
        B = Y1 - M * X1;
        steps.push(`Slope m = (y₂ − y₁)/(x₂ − x₁) = ${fmt(M)}`);
        steps.push(`Intercept b = y₁ − m·x₁ = ${fmt(B)}`);
        steps.push(`Line: y = ${fmt(M)}x + ${fmt(B)}`);
      }
    }

    // Circle: (x − H)² + (y − K)² = R²
    // Substitute:
    // Vertical x = C:  (C − H)² + (y − K)² = R²  → y = K ± √(R² − (C−H)²)
    // Slope form:  (x − H)² + (Mx + B − K)² = R²  → quadratic in x
    let A: number, Bc: number, Cc: number;
    let disc: number;
    const pts: { x: number; y: number }[] = [];

    if (vertical) {
      const dx = C - H;
      const inside = R * R - dx * dx;
      steps.push(`Substitute x = ${fmt(C)} into (x − h)² + (y − k)² = r²`);
      steps.push(`(${fmt(C)} − ${fmt(H)})² + (y − ${fmt(K)})² = ${fmt(R * R)}`);
      steps.push(`(y − ${fmt(K)})² = r² − (x − h)² = ${fmt(inside)}`);
      disc = inside;
      if (inside > 0) {
        const s = Math.sqrt(inside);
        pts.push({ x: C, y: K + s });
        pts.push({ x: C, y: K - s });
      } else if (inside === 0) {
        pts.push({ x: C, y: K });
      }
    } else {
      // (x−H)² + (Mx + B − K)² = R²
      // Expand: x² − 2Hx + H² + M²x² + 2M(B−K)x + (B−K)² = R²
      // (1 + M²)x² + (−2H + 2M(B−K))x + (H² + (B−K)² − R²) = 0
      const BK = B - K;
      A = 1 + M * M;
      Bc = -2 * H + 2 * M * BK;
      Cc = H * H + BK * BK - R * R;
      disc = Bc * Bc - 4 * A * Cc;
      steps.push(`Substitute y = ${fmt(M)}x + ${fmt(B)} into (x − h)² + (y − k)² = r²`);
      steps.push(`(x − ${fmt(H)})² + (${fmt(M)}x + ${fmt(BK)})² = ${fmt(R * R)}`);
      steps.push(`Expand → (1 + m²)x² + (−2h + 2m(b − k))x + (h² + (b − k)² − r²) = 0`);
      steps.push(`${fmt(A)}·x² + ${fmt(Bc)}·x + ${fmt(Cc)} = 0`);
      steps.push(`Discriminant Δ = b² − 4ac = ${fmt(disc)}`);
      if (disc > 0) {
        const sq = Math.sqrt(disc);
        const xa = (-Bc + sq) / (2 * A);
        const xb = (-Bc - sq) / (2 * A);
        pts.push({ x: xa, y: M * xa + B });
        pts.push({ x: xb, y: M * xb + B });
      } else if (disc === 0) {
        const xa = -Bc / (2 * A);
        pts.push({ x: xa, y: M * xa + B });
      }
    }

    const kind: "none" | "tangent" | "secant" =
      pts.length === 0 ? "none" : pts.length === 1 ? "tangent" : "secant";
    return { kind, disc, points: pts, steps, vertical, C, M, B, H, K, R };
  }, [h, k, r, mode, m, b, x1, y1, x2, y2]);

  const stepBlocks: Step[] | undefined = result.steps
    ? [{ title: "Substitute and solve", body: (
        <div className="space-y-1">
          {result.steps.map((s, i) => <MathLine key={i}>{s}</MathLine>)}
        </div>
      ) }]
    : undefined;

  return (
    <ToolCard title="Line–circle intersection" subtitle="Substitute the line into (x − h)² + (y − k)² = r² and solve">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Center h"><TextInput inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} /></Field>
        <Field label="Center k"><TextInput inputMode="decimal" value={k} onChange={(e) => setK(e.target.value)} /></Field>
        <Field label="Radius r"><TextInput inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} /></Field>
      </div>
      <div className="mt-3 mb-3 flex flex-wrap gap-2">
        {(
          [
            ["slope", "Line y = mx + b"],
            ["points", "Line through two points"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setMode(id)}
            className={"rounded-full border px-3 py-1 text-xs " + (mode === id ? "border-primary/60 bg-primary/10 text-foreground" : "border-border/60 bg-secondary/30 text-muted-foreground")}>
            {label}
          </button>
        ))}
      </div>
      {mode === "slope" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Slope m"><TextInput inputMode="decimal" value={m} onChange={(e) => setM(e.target.value)} /></Field>
          <Field label="Intercept b"><TextInput inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} /></Field>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="x₁"><TextInput inputMode="decimal" value={x1} onChange={(e) => setX1(e.target.value)} /></Field>
          <Field label="y₁"><TextInput inputMode="decimal" value={y1} onChange={(e) => setY1(e.target.value)} /></Field>
          <Field label="x₂"><TextInput inputMode="decimal" value={x2} onChange={(e) => setX2(e.target.value)} /></Field>
          <Field label="y₂"><TextInput inputMode="decimal" value={y2} onChange={(e) => setY2(e.target.value)} /></Field>
        </div>
      )}
      {result.error ? (
        <ErrorBox message={result.error} />
      ) : (
        <>
          <CircleDiagram
            radius={result.R ?? undefined}
            center={[result.H!, result.K!]}
            points={result.points!.map((p) => [p.x, p.y] as [number, number])}
            line={
              result.vertical
                ? { p1: [result.C!, result.K! - result.R! - 1], p2: [result.C!, result.K! + result.R! + 1] }
                : { m: result.M!, b: result.B! }
            }
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
            <StatRow
              label="Relationship"
              value={
                result.kind === "none"
                  ? "No intersection (line misses the circle)"
                  : result.kind === "tangent"
                  ? "Tangent — 1 point"
                  : "Secant — 2 points"
              }
            />
            <StatRow label="Discriminant Δ" value={fmt(result.disc!)} />
            {result.points!.map((p, i) => (
              <StatRow key={i} label={`Intersection P${i + 1}`} value={`(${fmt(p.x)}, ${fmt(p.y)})`} />
            ))}
          </div>
          {stepBlocks && <StepsToggle steps={stepBlocks} />}
        </>
      )}
    </ToolCard>
  );
}

/* ================= Two-Circle Relationship ================= */

function TwoCirclesTool() {
  const [h1, setH1] = useState("0");
  const [k1, setK1] = useState("0");
  const [r1, setR1] = useState("5");
  const [h2, setH2] = useState("6");
  const [k2, setK2] = useState("0");
  const [r2, setR2] = useState("3");

  const result = useMemo(() => {
    const H1 = num(h1), K1 = num(k1), R1 = num(r1);
    const H2 = num(h2), K2 = num(k2), R2 = num(r2);
    if ([H1, K1, R1, H2, K2, R2].some((v) => v === null)) return { error: "Enter numeric values for both circles." };
    if ((R1 as number) <= 0 || (R2 as number) <= 0) return { error: "Both radii must be positive." };
    const dx = (H2 as number) - (H1 as number);
    const dy = (K2 as number) - (K1 as number);
    const d = Math.hypot(dx, dy);
    const sum = (R1 as number) + (R2 as number);
    const diff = Math.abs((R1 as number) - (R2 as number));

    let relationship = "";
    const pts: { x: number; y: number }[] = [];
    const steps: string[] = [];

    steps.push(`Distance between centers d = √((h₂ − h₁)² + (k₂ − k₁)²) = ${fmt(d)}`);
    steps.push(`Sum of radii r₁ + r₂ = ${fmt(sum)}`);
    steps.push(`|r₁ − r₂| = ${fmt(diff)}`);

    if (d === 0 && (R1 as number) === (R2 as number)) {
      relationship = "Coincident (identical circles)";
    } else if (d === 0) {
      relationship = "Concentric — no intersection";
    } else if (d > sum) {
      relationship = "Separate — no intersection";
    } else if (d === sum) {
      relationship = "Externally tangent — 1 point";
    } else if (d < diff) {
      relationship = "One circle lies inside the other — no intersection";
    } else if (d === diff) {
      relationship = "Internally tangent — 1 point";
    } else {
      relationship = "Intersecting — 2 points";
    }

    // Compute intersection points when they exist
    if (d > 0 && d <= sum && d >= diff) {
      const R1n = R1 as number, R2n = R2 as number;
      const a = (R1n * R1n - R2n * R2n + d * d) / (2 * d);
      const hsq = R1n * R1n - a * a;
      const hh = Math.sqrt(Math.max(0, hsq));
      const xm = (H1 as number) + (a * dx) / d;
      const ym = (K1 as number) + (a * dy) / d;
      if (hh === 0) {
        pts.push({ x: xm, y: ym });
      } else {
        pts.push({ x: xm + (hh * dy) / d, y: ym - (hh * dx) / d });
        pts.push({ x: xm - (hh * dy) / d, y: ym + (hh * dx) / d });
      }
      steps.push(`a = (r₁² − r₂² + d²)/(2d) = ${fmt(a)}`);
      steps.push(`h = √(r₁² − a²) = ${fmt(hh)}`);
      steps.push(`Midpoint on line of centers: (${fmt(xm)}, ${fmt(ym)})`);
    }

    // Radical line: 2(H2−H1)x + 2(K2−K1)y = (H2² − H1²) + (K2² − K1²) − (R2² − R1²)
    const H1n = H1 as number, K1n = K1 as number, R1n = R1 as number;
    const H2n = H2 as number, K2n = K2 as number, R2n = R2 as number;
    const RA = 2 * (H2n - H1n);
    const RB = 2 * (K2n - K1n);
    const RC = (H2n * H2n - H1n * H1n) + (K2n * K2n - K1n * K1n) - (R2n * R2n - R1n * R1n);
    const radical = d === 0 && R1n === R2n
      ? "undefined (identical circles)"
      : `${fmt(RA)}·x + ${fmt(RB)}·y = ${fmt(RC)}`;

    return { d, relationship, points: pts, steps, radical, H1: H1n, K1: K1n, R1: R1n, H2: H2n, K2: K2n, R2: R2n };
  }, [h1, k1, r1, h2, k2, r2]);

  const stepBlocks: Step[] | undefined = result.steps
    ? [{ title: "How the relationship was determined", body: (
        <div className="space-y-1">
          {result.steps.map((s, i) => <MathLine key={i}>{s}</MathLine>)}
        </div>
      ) }]
    : undefined;

  return (
    <ToolCard title="Two circles" subtitle="Classify the relationship and find intersection points">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Circle 1 — h₁"><TextInput inputMode="decimal" value={h1} onChange={(e) => setH1(e.target.value)} /></Field>
        <Field label="Circle 1 — k₁"><TextInput inputMode="decimal" value={k1} onChange={(e) => setK1(e.target.value)} /></Field>
        <Field label="Circle 1 — r₁"><TextInput inputMode="decimal" value={r1} onChange={(e) => setR1(e.target.value)} /></Field>
        <Field label="Circle 2 — h₂"><TextInput inputMode="decimal" value={h2} onChange={(e) => setH2(e.target.value)} /></Field>
        <Field label="Circle 2 — k₂"><TextInput inputMode="decimal" value={k2} onChange={(e) => setK2(e.target.value)} /></Field>
        <Field label="Circle 2 — r₂"><TextInput inputMode="decimal" value={r2} onChange={(e) => setR2(e.target.value)} /></Field>
      </div>
      {result.error ? (
        <ErrorBox message={result.error} />
      ) : (
        <>
          <CircleDiagram
            radius={Math.max(result.R1!, result.d! + result.R2!)}
            center={[result.H1!, result.K1!]}
            points={result.points!.map((p) => [p.x, p.y] as [number, number])}
            secondCircle={{ center: [result.H2!, result.K2!], radius: result.R2! }}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
            <StatRow label="Relationship" value={result.relationship!} />
            <StatRow label="Distance between centers d" value={fmt(result.d!)} />
            <StatRow label="Radical line" value={result.radical!} />
            {result.points!.map((p, i) => (
              <StatRow key={i} label={`Intersection P${i + 1}`} value={`(${fmt(p.x)}, ${fmt(p.y)})`} />
            ))}
          </div>
          {stepBlocks && <StepsToggle steps={stepBlocks} />}
        </>
      )}
    </ToolCard>
  );
}

/* ================= Diagram ================= */

function CircleDiagram({
  radius,
  innerRadius,
  center,
  points,
  showRadius,
  line,
  secondCircle,
}: {
  radius?: number;
  innerRadius?: number;
  center?: [number, number];
  points?: [number, number][];
  showRadius?: boolean;
  line?: { m: number; b: number } | { p1: [number, number]; p2: [number, number] };
  secondCircle?: { center: [number, number]; radius: number };
}) {
  const stroke = "currentColor";
  const fill = "var(--color-primary)";
  const label = "text-[10px] fill-current text-muted-foreground";

  const cx = 150, cy = 105;
  const R = radius && radius > 0 ? radius : 1;
  const scale = 75 / R;
  const rPx = R * scale;
  const irPx = innerRadius && innerRadius > 0 ? innerRadius * scale : 0;
  const origin: [number, number] = center ?? [0, 0];

  const toPx = (x: number, y: number): [number, number] => [
    cx + (x - origin[0]) * scale,
    cy - (y - origin[1]) * scale,
  ];

  const ptEls = (points ?? []).map(([x, y], i) => {
    if (!center) return null;
    const [px, py] = toPx(x, y);
    return (
      <g key={i}>
        <circle cx={px} cy={py} r={3} fill={stroke} fillOpacity={1} stroke="none" />
        <text x={px + 5} y={py - 5} className={label}>P{i + 1}</text>
      </g>
    );
  });

  // Clip a segment to the 0..300 x 0..210 viewBox using Liang-Barsky.
  const clipToBox = (x1: number, y1: number, x2: number, y2: number) => {
    const xmin = 0, xmax = 300, ymin = 0, ymax = 210;
    let t0 = 0, t1 = 1;
    const dx = x2 - x1, dy = y2 - y1;
    const checks: [number, number][] = [
      [-dx, x1 - xmin],
      [dx, xmax - x1],
      [-dy, y1 - ymin],
      [dy, ymax - y1],
    ];
    for (const [p, q] of checks) {
      if (p === 0) {
        if (q < 0) return null;
      } else {
        const r = q / p;
        if (p < 0) {
          if (r > t1) return null;
          if (r > t0) t0 = r;
        } else {
          if (r < t0) return null;
          if (r < t1) t1 = r;
        }
      }
    }
    return {
      x1: x1 + t0 * dx,
      y1: y1 + t0 * dy,
      x2: x1 + t1 * dx,
      y2: y1 + t1 * dy,
    };
  };

  let lineEl: React.ReactNode = null;
  if (line) {
    let px1: [number, number];
    let px2: [number, number];
    if ("m" in line) {
      const far = 1e4;
      px1 = toPx(-far, line.m * -far + line.b);
      px2 = toPx(far, line.m * far + line.b);
    } else {
      const [x1, y1] = line.p1;
      const [x2, y2] = line.p2;
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const far = 1e4 / len;
      px1 = toPx(x1 - dx * far, y1 - dy * far);
      px2 = toPx(x2 + dx * far, y2 + dy * far);
    }
    const clipped = clipToBox(px1[0], px1[1], px2[0], px2[1]);
    if (clipped) {
      lineEl = (
        <line
          x1={clipped.x1}
          y1={clipped.y1}
          x2={clipped.x2}
          y2={clipped.y2}
          stroke={stroke}
          strokeWidth={1.5}
          fill="none"
        />
      );
    }
  }

  let secondCircleEl: React.ReactNode = null;
  if (secondCircle) {
    const [scx, scy] = toPx(secondCircle.center[0], secondCircle.center[1]);
    secondCircleEl = (
      <g>
        <circle cx={scx} cy={scy} r={secondCircle.radius * scale} fillOpacity={0.12} fill={fill} stroke={stroke} strokeWidth={1.5} />
        <circle cx={scx} cy={scy} r={2} fill={stroke} fillOpacity={1} stroke="none" />
        <text x={scx + 4} y={scy - 4} className={label}>
          ({fmt(secondCircle.center[0], 2)}, {fmt(secondCircle.center[1], 2)})
        </text>
      </g>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-foreground">
      <svg
        viewBox="0 0 300 210"
        preserveAspectRatio="xMidYMid meet"
        className="h-56 w-full"
        role="img"
        aria-label="Circle diagram with labeled radius and center"
      >
        <g fillOpacity={0.12} fill={fill} stroke={stroke} strokeWidth={1.5}>
          <circle cx={cx} cy={cy} r={rPx} />
          {irPx > 0 && <circle cx={cx} cy={cy} r={irPx} fill="var(--color-background)" fillOpacity={1} />}
          {showRadius && (
            <>
              <line x1={cx} y1={cy} x2={cx + rPx} y2={cy} strokeDasharray="4 3" />
              <text x={cx + rPx / 2} y={cy - 4} textAnchor="middle" className={label}>r</text>
            </>
          )}
          <circle cx={cx} cy={cy} r={2} fill={stroke} fillOpacity={1} stroke="none" />
          {center && (
            <text x={cx + 4} y={cy - 4} className={label}>
              ({fmt(center[0], 2)}, {fmt(center[1], 2)})
            </text>
          )}
          {secondCircleEl}
          {lineEl}
          {ptEls}
        </g>
      </svg>
    </div>
  );
}

/* ================= Educational content ================= */

function CircleEducation() {
  return (
    <>
      <CalcSection title="What is a circle?">
        <p>
          A circle is the set of all points in a plane that lie the same distance — the radius —
          from a fixed point called the center. Because every point on the boundary is exactly one
          step away from the middle, a circle is the most symmetric shape possible: rotate it by any
          angle and it looks unchanged.
        </p>
        <p>
          Circles show up everywhere in the physical world — wheels, coins, plates, pipe
          cross-sections, orbits, sound waves. Almost anything that spins, rolls or radiates
          outward is modelled with a circle first.
        </p>
      </CalcSection>

      <CalcSection title="Circle, part by part">
        <p>
          Every circle is fully described by its radius. From that one length you can
          find the diameter, the distance around it (circumference), the space it
          covers (area), and every slice or arc you can cut out of it. The cards
          below show each idea with a small diagram, the formula, and a worked
          example.
        </p>
        <GuideCards items={CIRCLE_GUIDE} />
      </CalcSection>


      <CalcSection title="Parts of a circle">
        <ul className="space-y-2">
          <li><strong>Center:</strong> the fixed middle point every boundary point is equidistant from.</li>
          <li><strong>Radius (r):</strong> the distance from the center to the edge.</li>
          <li><strong>Diameter (d):</strong> a straight line through the center, edge to edge — always d = 2r.</li>
          <li><strong>Circumference (C):</strong> the distance once around the edge; C = 2πr = πd.</li>
          <li><strong>Arc:</strong> a piece of the circumference between two points on the circle.</li>
          <li><strong>Chord:</strong> a straight line joining two points on the circle. A chord through the center is a diameter.</li>
          <li><strong>Secant:</strong> a line that crosses the circle at two points (an extended chord).</li>
          <li><strong>Tangent:</strong> a line that touches the circle at exactly one point and is perpendicular to the radius at that point.</li>
          <li><strong>Sector:</strong> the pie-slice region bounded by two radii and the arc between them.</li>
          <li><strong>Segment:</strong> the region between a chord and the arc it cuts off.</li>
        </ul>
      </CalcSection>

      <CalcSection title="Circle formulas">
        <MathNote>Diameter from radius</MathNote>
        <MathLine>d = 2r</MathLine>
        <MathNote>Circumference from radius or diameter</MathNote>
        <MathLine>C = 2πr = πd</MathLine>
        <MathNote>Area from radius, diameter or circumference</MathNote>
        <MathLine>A = πr² = πd² / 4 = C² / (4π)</MathLine>
        <p className="mt-3 text-sm text-muted-foreground">
          Here <em>r</em> is the radius, <em>d</em> the diameter, <em>C</em> the circumference and
          <em> A</em> the area, with π ≈ 3.14159…. Every value derives from any other — if you know
          one of r, d, C or A, the other three are fixed.
        </p>
      </CalcSection>

      <CalcSection title="How to find each value">
        <MathNote>Circumference from radius — multiply r by 2π</MathNote>
        <MathLine>C = 2πr = 2π × 5 ≈ 31.4159</MathLine>

        <MathNote>Radius from circumference — divide C by 2π</MathNote>
        <MathLine>r = C / (2π) = 20 / (2π) ≈ 3.1831</MathLine>

        <MathNote>Area from radius — square r, then multiply by π</MathNote>
        <MathLine>A = πr² = π × 5² ≈ 78.5398</MathLine>

        <MathNote>Radius from area — divide A by π, then take the square root</MathNote>
        <MathLine>r = √(A / π) = √(50 / π) ≈ 3.9894</MathLine>

        <MathNote>Diameter from area — find r from A, then double it</MathNote>
        <MathLine>d = 2 √(A / π) = 2 √(100 / π) ≈ 11.2838</MathLine>
      </CalcSection>

      <CalcSection title="About π (pi)">
        <p>
          π is the ratio of a circle's circumference to its diameter — the same value for every
          circle, big or small. Numerically π ≈ 3.14159265…, and its decimal expansion never ends
          and never repeats: π is <em>irrational</em>, and even stronger, <em>transcendental</em>,
          meaning it is not the root of any polynomial with rational coefficients. That is why the
          classical problem of “squaring the circle” with only a compass and straightedge is
          impossible.
        </p>
      </CalcSection>

      <CalcSection title="Where circles show up in real life">
        <ul className="space-y-2">
          <li><strong>Engineering:</strong> gears, bearings, pipes, pistons, flywheels — anything that rotates or seals against a round surface.</li>
          <li><strong>Architecture &amp; construction:</strong> arches, domes, columns, round windows, silo cross-sections.</li>
          <li><strong>Design &amp; art:</strong> logos, badges, radial layouts, dials and typography counters.</li>
          <li><strong>Science:</strong> planetary orbits (approximated as circles), lens optics, sound and water waves radiating from a source.</li>
          <li><strong>Everyday life:</strong> wheels and tires, pizzas and pies, clocks, coins, plates.</li>
        </ul>
      </CalcSection>

      <CalcSection title="Common conversions">
        <ReferenceTable
          headers={["Quantity", "Convert", "Value"]}
          numericColumns={[2]}
          rows={[
            ["Full turn", "in radians", "2π ≈ 6.283185"],
            ["Half turn", "in radians", "π ≈ 3.141593"],
            ["Right angle", "in radians", "π/2 ≈ 1.570796"],
            ["1 radian", "in degrees", "57.29578"],
            ["1 degree", "in radians", "0.017453"],
          ]}
        />
      </CalcSection>

      <CalcSection title="How to use this calculator">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Pick a mode at the top — start with <em>Solve from one value</em> if you already know r, d, C or A.</li>
          <li>Type the value into the matching field. Leave the other three blank; the calculator fills them in.</li>
          <li>Choose a length unit (mm, cm, m, km, in, ft, yd, mi). Area is shown in the matching squared unit plus common alternates.</li>
          <li>For coordinate modes, enter the points exactly as (x, y) pairs — the diagram updates live.</li>
          <li>Click <em>Show calculation steps</em> on any result to see the formula, the substitution, and the final answer.</li>
          <li>Use the arc, chord, sector, segment, annulus and tangent tools below to explore parts of the circle you just solved.</li>
        </ol>
      </CalcSection>

      <CalcSection title="Common mistakes to avoid">
        <ul className="space-y-2">
          <li><strong>Mixing radius and diameter.</strong> Half of the diameter is the radius. Using d in a formula that expects r doubles or halves the answer.</li>
          <li><strong>Forgetting the square in area.</strong> A = πr² — square the radius first, then multiply by π. πr on its own is not an area.</li>
          <li><strong>Using degrees where radians are needed.</strong> Sector area A = ½ r²θ and arc length s = rθ both need θ in radians. Convert with θ<sub>rad</sub> = θ<sub>deg</sub> × π/180.</li>
          <li><strong>Chord longer than diameter.</strong> A chord can never be longer than 2r. If the input is bigger, the geometry has no real solution.</li>
          <li><strong>Three collinear points.</strong> Three points on the same straight line do not define a circle — the circumcircle has infinite radius.</li>
          <li><strong>Tangent from inside.</strong> A tangent segment only exists when the external point is outside the circle (d {'>'} r).</li>
        </ul>
      </CalcSection>

      <CalcSection title="Features of this calculator">

        <FeatureList
          items={[
            "Four solving modes — from any one value (r, d, C or A), from three points, from a center and a point, and from the general equation x² + y² + Dx + Ey + F = 0.",
            "Automatic derivation of all four quantities (radius, diameter, circumference, area) whenever any one is known, with the substituted formula shown.",
            "Advanced tools: arc length & sector area, chord length (from angle, chord or center-to-chord distance), circular segment area, annulus, tangent from an external point, line–circle intersection, two-circle relationship + radical line, and equivalent-square comparison.",
            "Live labeled SVG diagram that adapts to the current mode — showing radius, three-point circumcircle, or annulus.",
            "Length-unit selector (mm, cm, m, km, in, ft, yd, mi) and automatic area conversion to m², ft², yd², acres, hectares, km², mi².",
            "Show/hide step-by-step working for every result — formula, substitution, and final answer.",
            "Copy result, download as PNG or PDF, and print — all from the result toolbar.",
            "Input validation: collinear-point detection, chord-longer-than-diameter, non-real circles (r² ≤ 0), interior-point tangent, and more.",
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
            { to: "/calculators/math/volume-calculator", label: "Volume Calculator (Sphere)" },
            { to: "/calculators/math/triangle-calculator", label: "Triangle Calculator" },
            { to: "/calculators/math/slope-calculator", label: "Slope Calculator" },
            { to: "/calculators/math", label: "All Math Calculators" },
          ]}
        />
      </CalcSection>
    </>
  );
}

/* ================= Circle guide (mini diagrams + formulas) ================= */

function GuideCircle({
  children,
  size = 140,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 140 140"
      width={size}
      height={size}
      role="img"
      aria-label="Circle diagram"
      className="mx-auto text-primary"
    >
      {children}
    </svg>
  );
}

function RadiusMini() {
  return (
    <GuideCircle>
      <circle cx="70" cy="70" r="52" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="70" y1="70" x2="122" y2="70" stroke="currentColor" strokeWidth="2" />
      <line x1="18" y1="70" x2="122" y2="70" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      <circle cx="70" cy="70" r="2.5" fill="currentColor" />
      <text x="94" y="64" fontSize="11" fill="currentColor" fontStyle="italic">r</text>
      <text x="60" y="88" fontSize="10" fill="currentColor" opacity="0.7">d = 2r</text>
    </GuideCircle>
  );
}

function CircumferenceMini() {
  return (
    <GuideCircle>
      <circle cx="70" cy="70" r="52" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M 70 18 A 52 52 0 0 1 122 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        markerEnd="url(#arrow)"
      />
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
        </marker>
      </defs>
      <text x="52" y="76" fontSize="12" fill="currentColor" fontStyle="italic">C = 2πr</text>
    </GuideCircle>
  );
}

function AreaMini() {
  return (
    <GuideCircle>
      <circle cx="70" cy="70" r="52" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="2" />
      <text x="52" y="76" fontSize="12" fill="currentColor" fontStyle="italic">A = πr²</text>
    </GuideCircle>
  );
}

function SectorMini() {
  return (
    <GuideCircle>
      <circle cx="70" cy="70" r="52" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <path d="M 70 70 L 122 70 A 52 52 0 0 0 96 24 Z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="2" />
      <text x="78" y="60" fontSize="11" fill="currentColor" fontStyle="italic">θ</text>
      <text x="86" y="86" fontSize="10" fill="currentColor" opacity="0.75">arc s = rθ</text>
    </GuideCircle>
  );
}

const CIRCLE_GUIDE: GuideCardItem[] = [
  {
    key: "radius-diameter",
    title: "Radius and diameter",
    explain: (
      <>
        The radius is the straight distance from the center of the circle to any
        point on the edge. The diameter is the full width — one edge, through the
        center, to the other edge — so it is always twice the radius.
      </>
    ),
    formula: <>d = 2r · r = d/2</>,
    legend: [
      { sym: "r", def: "radius" },
      { sym: "d", def: "diameter" },
    ],
    diagram: <RadiusMini />,
    example: {
      given: <span className="font-serif italic">r = 5 cm</span>,
      substitute: <>d = 2 × 5</>,
      answer: <span className="font-serif italic">d = 10 cm</span>,
    },
  },
  {
    key: "circumference",
    title: "Circumference — distance around",
    explain: (
      <>
        The circumference is the length of the boundary — how far it is to walk
        once around the circle. It equals 2π times the radius, which is the same
        as π times the diameter.
      </>
    ),
    formula: <>C = 2πr = πd</>,
    legend: [
      { sym: "C", def: "circumference" },
      { sym: "π", def: "≈ 3.14159…" },
    ],
    diagram: <CircumferenceMini />,
    example: {
      given: <span className="font-serif italic">r = 5</span>,
      substitute: <>C = 2π × 5</>,
      answer: <span className="font-serif italic">C ≈ 31.4159</span>,
    },
  },
  {
    key: "area",
    title: "Area — space inside",
    explain: (
      <>
        The area is the flat space the circle covers. It grows with the square of
        the radius, so doubling the radius makes the area four times as big.
      </>
    ),
    formula: <>A = πr² = πd²/4</>,
    legend: [
      { sym: "A", def: "area" },
      { sym: "r", def: "radius" },
    ],
    diagram: <AreaMini />,
    example: {
      given: <span className="font-serif italic">r = 5</span>,
      substitute: <>A = π × 5²</>,
      answer: <span className="font-serif italic">A ≈ 78.5398</span>,
    },
  },
  {
    key: "arc-sector",
    title: "Arc and sector — slicing the circle",
    explain: (
      <>
        A sector is a pie-slice bounded by two radii and the arc between them. The
        arc is the curved edge of that slice. Both depend on the angle θ measured
        in radians — convert degrees with θ<sub>rad</sub> = θ<sub>deg</sub> × π/180.
      </>
    ),
    formula: <>s = rθ · A<sub>sector</sub> = ½ r²θ</>,
    legend: [
      { sym: "θ", def: "central angle in radians" },
      { sym: "s", def: "arc length" },
    ],
    diagram: <SectorMini />,
    example: {
      given: <span className="font-serif italic">r = 10, θ = 60° = π/3</span>,
      substitute: <>s = 10 × π/3 · A = ½ × 100 × π/3</>,
      answer: <span className="font-serif italic">s ≈ 10.472 · A ≈ 52.36</span>,
    },
  },
];
