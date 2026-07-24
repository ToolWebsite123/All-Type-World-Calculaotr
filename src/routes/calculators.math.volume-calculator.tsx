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
  StructuredExample,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  ResultBox,
  GuideCards,
  StackedMath,
  type GuideCardItem,
  AllFormulasSection,
  ModeFormula,
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


/* ============================================================
 * Volume Calculator
 * 13 shapes with live SVG diagrams, unit conversions, cost estimator,
 * and step-by-step working. Formulas hand-verified.
 * ============================================================ */

/* ---------- Types ---------- */
const shapes = [
  "sphere",
  "cone",
  "cube",
  "cylinder",
  "box",
  "capsule",
  "cap",
  "frustum",
  "ellipsoid",
  "pyramid",
  "tube",
  "prism",
  "torus",
  "tetrahedron",
  "octahedron",
] as const;
type Shape = (typeof shapes)[number];

const SHAPE_LABEL: Record<Shape, string> = {
  sphere: "Sphere",
  cone: "Cone",
  cube: "Cube",
  cylinder: "Cylinder",
  box: "Rectangular Tank",
  capsule: "Capsule",
  cap: "Spherical Cap",
  frustum: "Conical Frustum",
  ellipsoid: "Ellipsoid",
  pyramid: "Pyramid",
  tube: "Tube (Hollow Cylinder)",
  prism: "Triangular Prism",
  torus: "Torus",
  tetrahedron: "Tetrahedron",
  octahedron: "Octahedron",
};

/* ---------- Shared legends ---------- */
const LEG = {
  sphere: [
    { sym: "V", def: "volume" },
    { sym: "r", def: "radius" },
    { sym: "π", def: "≈ 3.14159…" },
  ],
  cone: [
    { sym: "V", def: "volume" },
    { sym: "r", def: "base radius" },
    { sym: "h", def: "height (perpendicular to base)" },
  ],
  cube: [
    { sym: "V", def: "volume" },
    { sym: "s", def: "edge length" },
  ],
  cylinder: [
    { sym: "V", def: "volume" },
    { sym: "r", def: "base radius" },
    { sym: "h", def: "height" },
  ],
  box: [
    { sym: "V", def: "volume" },
    { sym: "l, w, h", def: "length, width, height" },
  ],
  capsule: [
    { sym: "V", def: "volume" },
    { sym: "r", def: "radius (of end hemispheres and body)" },
    { sym: "h", def: "cylindrical body height (excludes caps)" },
  ],
  cap: [
    { sym: "V", def: "volume" },
    { sym: "R", def: "ball (sphere) radius" },
    { sym: "a", def: "cap base radius" },
    { sym: "h", def: "cap height" },
  ],
  frustum: [
    { sym: "V", def: "volume" },
    { sym: "r₁", def: "top radius" },
    { sym: "r₂", def: "bottom radius" },
    { sym: "h", def: "height" },
  ],
  ellipsoid: [
    { sym: "V", def: "volume" },
    { sym: "a, b, c", def: "three semi-axes" },
  ],
  pyramid: [
    { sym: "V", def: "volume" },
    { sym: "l, w", def: "base length and width" },
    { sym: "h", def: "perpendicular height (apex to base)" },
  ],
  tube: [
    { sym: "V", def: "volume" },
    { sym: "D", def: "outer diameter" },
    { sym: "d", def: "inner diameter" },
    { sym: "L", def: "length" },
  ],
  prism: [
    { sym: "V", def: "volume" },
    { sym: "A", def: "triangle cross-section area" },
    { sym: "L", def: "prism length" },
  ],
  torus: [
    { sym: "V", def: "volume" },
    { sym: "R", def: "distance from torus centre to tube centre" },
    { sym: "r", def: "tube radius" },
  ],
  tetrahedron: [
    { sym: "V", def: "volume" },
    { sym: "s", def: "edge length" },
  ],
  octahedron: [
    { sym: "V", def: "volume" },
    { sym: "s", def: "edge length" },
  ],
};

import { fmt, num, TO_M3 } from "@/lib/math/geometry-shared";
export { fmt, num, TO_M3 };

const KG_PER_LB = 1 / 2.2046226;
const MATERIAL_DENSITIES: { key: string; label: string; density: number }[] = [
  { key: "water", label: "Water (1000 kg/m³)", density: 1000 },
  { key: "concrete", label: "Concrete (2400 kg/m³)", density: 2400 },
  { key: "steel", label: "Steel (7850 kg/m³)", density: 7850 },
  { key: "sand", label: "Sand (1600 kg/m³)", density: 1600 },
  { key: "gravel", label: "Gravel (1680 kg/m³)", density: 1680 },
  { key: "aluminum", label: "Aluminum (2700 kg/m³)", density: 2700 },
  { key: "wood-pine", label: "Pine wood (500 kg/m³)", density: 500 },
  { key: "custom", label: "Custom density…", density: 0 },
];

/* ---------- Route ---------- */
export const Route = createFileRoute("/calculators/math/volume-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Volume Calculator",
      title:
        "Volume Calculator — 15 Solids with Diagrams & Steps",
      metaDescription:
        "Volume calculator for 15 solids: sphere, cone, cube, cylinder, tank, capsule, frustum, ellipsoid, pyramid, tube, prism, torus, tetrahedron and octahedron. Diagrams, steps, cost/weight estimators and tank fill level.",
      canonicalUrl: "/calculators/math/volume-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Volume Calculator", path: "/calculators/math/volume-calculator" },
      ],
      faqs: FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a })),
    }),
  component: VolumePage,
});

/* ---------- Component ---------- */
function VolumePage() {
  const [shape, setShape] = useState<Shape>("cylinder");
  const captureRef = useRef<HTMLDivElement>(null);

  return (
    <MathCalcPage
      name="Volume Calculator"
      tagline="Compute the volume of 15 common solids. Pick a shape, enter dimensions, and get an instant result with a live labeled diagram, cubic-unit conversions (m³, ft³, yd³, liters, US & imperial gallons), cost and material weight estimators, and full step-by-step working."
      extras={<VolumeEducation />}
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

      <ToolCard
        title="Partial fill level"
        subtitle="Find the volume and percent full of a horizontal cylindrical or spherical tank given the liquid height from the bottom."
      >
        <PartialFillTool />
      </ToolCard>
    </MathCalcPage>
  );
}

/* ---------- Shared UI ---------- */
function ToolCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-3xl border border-border bg-card/60 p-5 shadow-[0_20px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:p-6">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* ---------- Partial fill level tool ---------- */
function PartialFillTool() {
  const [tankShape, setTankShape] = useState<"cylinder" | "sphere">("cylinder");
  const [unit, setUnit] = useState<string>("m");
  const [r, setR] = useState<string>("");
  const [L, setL] = useState<string>("");
  const [h, setH] = useState<string>("");
  const captureRef = useRef<HTMLDivElement>(null);

  const rNum = num(r);
  const LNum = num(L);
  const hNum = num(h);

  const result = useMemo(() => {
    if (rNum === null || hNum === null || (tankShape === "cylinder" && LNum === null)) {
      return null;
    }
    if (rNum <= 0) return { error: "Radius must be positive." };
    if (hNum < 0 || hNum > 2 * rNum)
      return { error: "Fill height h must be between 0 and the tank diameter (2r)." };

    if (tankShape === "cylinder") {
      if (LNum === null || LNum <= 0) return { error: "Length must be positive." };
      const theta = 2 * Math.acos((rNum - hNum) / rNum);
      const V = (LNum * rNum * rNum * (theta - Math.sin(theta))) / 2;
      const Vtotal = Math.PI * rNum * rNum * LNum;
      const steps: Step[] = [
        { title: "Formula", body: <MathLine>V = L r² (θ − sin θ) / 2, θ = 2 arccos((r − h) / r)</MathLine> },
        {
          title: "Find θ",
          body: (
            <MathLine>
              θ = 2 × arccos(({fmt(rNum)} − {fmt(hNum)}) / {fmt(rNum)}) = 2 × arccos({fmt((rNum - hNum) / rNum)}) = <strong>{fmt(theta)}</strong> rad
            </MathLine>
          ),
        },
        {
          title: "Substitute",
          body: (
            <MathLine>
              V = {fmt(LNum)} × {fmt(rNum)}² × ({fmt(theta)} − {fmt(Math.sin(theta))}) / 2 = <strong>{fmt(V)}</strong>
            </MathLine>
          ),
        },
      ];
      return { V, Vtotal, unit, steps };
    } else {
      const V = (Math.PI * hNum * hNum * (3 * rNum - hNum)) / 3;
      const Vtotal = (4 / 3) * Math.PI * rNum ** 3;
      const steps: Step[] = [
        { title: "Formula", body: <MathLine>V = π h² (3r − h) / 3</MathLine> },
        {
          title: "Substitute",
          body: (
            <MathLine>
              V = π × ({fmt(hNum)})² × (3 × {fmt(rNum)} − {fmt(hNum)}) / 3 = <strong>{fmt(V)}</strong>
            </MathLine>
          ),
        },
      ];
      return { V, Vtotal, unit, steps };
    }
  }, [tankShape, rNum, LNum, hNum, unit]);

  const pct =
    result && !("error" in result) && result.Vtotal > 0
      ? (result.V / result.Vtotal) * 100
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(["cylinder", "sphere"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTankShape(t)}
            className={
              "rounded-full border px-3 py-1.5 text-sm transition-colors " +
              (tankShape === t
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground")
            }
          >
            {t === "cylinder" ? "Horizontal cylinder tank" : "Spherical tank"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <Field label="Tank radius (r)">
            <TextInput inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} placeholder="e.g. 2" />
          </Field>
          {tankShape === "cylinder" && (
            <Field label="Tank length (L)">
              <TextInput inputMode="decimal" value={L} onChange={(e) => setL(e.target.value)} placeholder="e.g. 6" />
            </Field>
          )}
          <Field label="Fill height from bottom (h)">
            <TextInput inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} placeholder="e.g. 1.5" />
          </Field>
        </div>
        <Field label="Unit (all inputs use this)">
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="mm">millimeters (mm)</option>
            <option value="cm">centimeters (cm)</option>
            <option value="m">meters (m)</option>
            <option value="ft">feet (ft)</option>
            <option value="in">inches (in)</option>
          </select>
        </Field>
      </div>

      {result && "error" in result && <ErrorBox message={result.error as string} />}
      {result && !("error" in result) && (
        <div ref={captureRef} className="rounded-3xl bg-card/40 p-1">
          <ResultBox
            label="Fill volume"
            value={
              <>
                {fmt(result.V, 6)} {unit}
                <sup>3</sup>
              </>
            }
            note={
              pct !== null ? (
                <>
                  Tank total volume ≈ {fmt(result.Vtotal, 6)} {unit}
                  <sup>3</sup> · Fill level ≈ <strong>{fmt(pct, 2)}%</strong> full
                </>
              ) : undefined
            }
          />
          <UnitConversions volumeInUnit={result.V} unit={unit} />
          <div className="mt-3 flex justify-end px-1">
            <ResultActions
              getCopyText={() =>
                `Fill volume (${tankShape}) = ${fmt(result.V, 6)} ${unit}³` +
                (pct !== null ? ` (${fmt(pct, 2)}% full)` : "")
              }
              captureRef={captureRef}
              filename={`fill-level-${tankShape}`}
            />
          </div>
          <StepsToggle steps={result.steps} />
        </div>
      )}
    </div>
  );
}

/* ---------- Form ---------- */
function ShapeForm({
  shape,
  captureRef,
}: {
  shape: Shape;
  captureRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [unit, setUnit] = useState<string>("m");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [prismMode, setPrismMode] = useState<"bh" | "sss">("bh");
  const [capMode, setCapMode] = useState<"Rh" | "ah" | "Ra">("Rh");
  const [price, setPrice] = useState<string>("");
  const [material, setMaterial] = useState<string>("water");
  const [customDensity, setCustomDensity] = useState<string>("");

  const set = (k: string, v: string) => setInputs((p) => ({ ...p, [k]: v }));

  const result = useMemo(
    () => compute(shape, inputs, prismMode, capMode),
    [shape, inputs, prismMode, capMode],
  );

  const priceNum = num(price);
  const cost =
    priceNum !== null && result.volume !== null ? priceNum * result.volume : null;

  const density =
    material === "custom"
      ? num(customDensity)
      : MATERIAL_DENSITIES.find((m) => m.key === material)?.density ?? null;
  const volumeM3 =
    result.volume !== null ? result.volume * (TO_M3[unit] ?? 1) : null;
  const massKg =
    density !== null && density > 0 && volumeM3 !== null ? density * volumeM3 : null;
  const massLb = massKg !== null ? massKg / KG_PER_LB : null;


  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <ShapeInputs
          shape={shape}
          inputs={inputs}
          set={set}
          prismMode={prismMode}
          setPrismMode={setPrismMode}
          capMode={capMode}
          setCapMode={setCapMode}
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
            </select>
          </Field>
        </div>
      </div>

      <ShapeDiagram shape={shape} inputs={inputs} prismMode={prismMode} />

      {result.error && <ErrorBox message={result.error} />}
      {result.volume !== null && (
        <div ref={captureRef} className="rounded-3xl bg-card/40 p-1">
          <ResultBox
            label={`Volume of ${SHAPE_LABEL[shape]}`}
            value={
              <>
                {fmt(result.volume, 6)} {unit}
                <sup>3</sup>
              </>
            }
            note={
              result.surface !== null ? (
                <>
                  Surface area ≈ {fmt(result.surface, 4)} {unit}
                  <sup>2</sup>
                  {result.volume > 0 && (
                    <>
                      {" · "}Surface : Volume ratio ≈ {fmt(result.surface / result.volume, 4)} / {unit}
                    </>
                  )}
                </>
              ) : undefined
            }
          />
          <UnitConversions volumeInUnit={result.volume} unit={unit} />

          <div className="mt-3 rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Cost / material estimator
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Field label={`Price per ${unit}³`}>
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
              Total = volume × unit price. Useful for concrete, soil, water,
              gravel, mulch, resin and fill estimates.
            </p>
          </div>

          <div className="mt-3 rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Material weight estimator
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Material">
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {MATERIAL_DENSITIES.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              {material === "custom" && (
                <Field label="Custom density (kg/m³)">
                  <TextInput
                    inputMode="decimal"
                    value={customDensity}
                    onChange={(e) => setCustomDensity(e.target.value)}
                    placeholder="e.g. 1200"
                  />
                </Field>
              )}
              <div className="ml-auto text-right text-sm">
                <div className="text-muted-foreground">Estimated mass</div>
                <div className="font-serif italic text-base tabular-nums text-foreground">
                  {massKg === null
                    ? "—"
                    : `${fmt(massKg, 3)} kg ≈ ${fmt(massLb!, 3)} lb`}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Mass = volume (converted to m³) × density. 1 kg ≈ 2.2046226 lb.
            </p>
          </div>

          <div className="mt-3 flex justify-end px-1">
            <ResultActions
              getCopyText={() =>
                `Volume (${SHAPE_LABEL[shape]}) = ${fmt(result.volume!, 6)} ${unit}³` +
                (cost !== null
                  ? `\nCost @ ${priceNum} / ${unit}³ = ${cost.toFixed(2)}`
                  : "")
              }
              captureRef={captureRef}
              filename={`volume-${shape}`}
            />
          </div>
          <StepsToggle steps={result.steps} />
        </div>
      )}
    </div>
  );
}

/* ---------- Per-shape inputs ---------- */
function ShapeInputs({
  shape,
  inputs,
  set,
  prismMode,
  setPrismMode,
  capMode,
  setCapMode,
}: {
  shape: Shape;
  inputs: Record<string, string>;
  set: (k: string, v: string) => void;
  prismMode: "bh" | "sss";
  setPrismMode: (m: "bh" | "sss") => void;
  capMode: "Rh" | "ah" | "Ra";
  setCapMode: (m: "Rh" | "ah" | "Ra") => void;
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
    case "sphere":
      return <div className="space-y-3">{inp("r", "Radius (r)", "e.g. 6")}</div>;
    case "cone":
      return (
        <div className="space-y-3">
          {inp("r", "Base radius (r)", "e.g. 3")}
          {inp("h", "Height (h)", "e.g. 9")}
        </div>
      );
    case "cube":
      return (
        <div className="space-y-3">{inp("s", "Edge length (s)", "e.g. 4")}</div>
      );
    case "cylinder":
      return (
        <div className="space-y-3">
          {inp("r", "Base radius (r)", "e.g. 3")}
          {inp("h", "Height (h)", "e.g. 10")}
        </div>
      );
    case "box":
      return (
        <div className="space-y-3">
          {inp("l", "Length (l)", "e.g. 4")}
          {inp("w", "Width (w)", "e.g. 3")}
          {inp("h", "Height (h)", "e.g. 2")}
        </div>
      );
    case "capsule":
      return (
        <div className="space-y-3">
          {inp("r", "Radius (r)", "e.g. 3")}
          {inp("h", "Cylindrical body height (h)", "e.g. 8")}
        </div>
      );
    case "cap":
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["Rh", "Ball radius + height"],
                ["ah", "Base radius + height"],
                ["Ra", "Ball radius + base radius"],
              ] as const
            ).map(([m, lbl]) => (
              <button
                key={m}
                type="button"
                onClick={() => setCapMode(m)}
                className={
                  "rounded-full border px-3 py-1 text-xs " +
                  (capMode === m
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border/60 bg-secondary/30 text-muted-foreground")
                }
              >
                {lbl}
              </button>
            ))}
          </div>
          {capMode === "Rh" && (
            <>
              {inp("R", "Ball radius (R)", "e.g. 5")}
              {inp("h", "Cap height (h)", "e.g. 2")}
            </>
          )}
          {capMode === "ah" && (
            <>
              {inp("a", "Base radius (a)", "e.g. 4")}
              {inp("h", "Cap height (h)", "e.g. 2")}
            </>
          )}
          {capMode === "Ra" && (
            <>
              {inp("R", "Ball radius (R)", "e.g. 5")}
              {inp("a", "Base radius (a)", "e.g. 4")}
            </>
          )}
        </div>
      );
    case "frustum":
      return (
        <div className="space-y-3">
          {inp("r1", "Top radius (r₁)", "e.g. 3")}
          {inp("r2", "Bottom radius (r₂)", "e.g. 5")}
          {inp("h", "Height (h)", "e.g. 6")}
        </div>
      );
    case "ellipsoid":
      return (
        <div className="space-y-3">
          {inp("a", "Semi-axis a", "e.g. 3")}
          {inp("b", "Semi-axis b", "e.g. 4")}
          {inp("c", "Semi-axis c", "e.g. 5")}
        </div>
      );
    case "pyramid":
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            For a square pyramid, enter the same value for length and width.
          </p>
          {inp("l", "Base length (l)", "e.g. 6")}
          {inp("w", "Base width (w)", "e.g. 6")}
          {inp("h", "Height (h)", "e.g. 9")}
        </div>
      );
    case "tube":
      return (
        <div className="space-y-3">
          {inp("D", "Outer diameter (D)", "e.g. 10")}
          {inp("d", "Inner diameter (d)", "e.g. 6")}
          {inp("L", "Length (L)", "e.g. 20")}
        </div>
      );
    case "prism":
      return (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["bh", "sss"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPrismMode(m)}
                className={
                  "rounded-full border px-3 py-1 text-xs " +
                  (prismMode === m
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border/60 bg-secondary/30 text-muted-foreground")
                }
              >
                {m === "bh" ? "Triangle: base & height" : "Triangle: three sides"}
              </button>
            ))}
          </div>
          {prismMode === "bh" ? (
            <>
              {inp("b", "Triangle base (b)", "e.g. 6")}
              {inp("th", "Triangle height (h)", "e.g. 4")}
            </>
          ) : (
            <>
              {inp("a", "Side a", "e.g. 3")}
              {inp("b", "Side b", "e.g. 4")}
              {inp("c", "Side c", "e.g. 5")}
            </>
          )}
          {inp("L", "Prism length (L)", "e.g. 10")}
        </div>
      );
    case "torus":
      return (
        <div className="space-y-3">
          {inp("R", "Major radius R (centre → tube centre)", "e.g. 10")}
          {inp("r", "Tube (minor) radius r", "e.g. 3")}
        </div>
      );
    case "tetrahedron":
      return (
        <div className="space-y-3">{inp("s", "Edge length (s)", "e.g. 4")}</div>
      );
    case "octahedron":
      return (
        <div className="space-y-3">{inp("s", "Edge length (s)", "e.g. 4")}</div>
      );
  }
}

/* ---------- Compute ---------- */
interface ComputeResult {
  volume: number | null;
  surface: number | null;
  steps: Step[];
  error?: string;
}

function compute(
  shape: Shape,
  raw: Record<string, string>,
  prismMode: "bh" | "sss",
  capMode: "Rh" | "ah" | "Ra",
): ComputeResult {
  const empty: ComputeResult = { volume: null, surface: null, steps: [] };
  const need = (k: string) => num(raw[k]);
  const step = (title: string, body: React.ReactNode): Step => ({ title, body });
  const PI = Math.PI;

  switch (shape) {
    case "sphere": {
      const r = need("r");
      if (r === null) return empty;
      if (r <= 0) return { ...empty, error: "Radius must be positive." };
      const V = (4 / 3) * PI * r ** 3;
      return {
        volume: V,
        surface: 4 * PI * r * r,
        steps: [
          step("Formula", <MathLine>V = (4/3) π r³</MathLine>),
          step(
            "Substitute",
            <MathLine>
              V = (4/3) × π × ({r})³ = (4/3) × π × {fmt(r ** 3)} = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "cone": {
      const r = need("r");
      const h = need("h");
      if (r === null || h === null) return empty;
      if (r <= 0 || h <= 0) return { ...empty, error: "Radius and height must be positive." };
      const V = (1 / 3) * PI * r * r * h;
      const slant = Math.sqrt(r * r + h * h);
      const S = PI * r * (r + slant);
      return {
        volume: V,
        surface: S,
        steps: [
          step("Formula", <MathLine>V = (1/3) π r² h</MathLine>),
          step(
            "Substitute",
            <MathLine>
              V = (1/3) × π × ({r})² × {h} = (1/3) × π × {fmt(r * r)} × {h} = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "cube": {
      const s = need("s");
      if (s === null) return empty;
      if (s <= 0) return { ...empty, error: "Edge length must be positive." };
      const V = s ** 3;
      return {
        volume: V,
        surface: 6 * s * s,
        steps: [
          step("Formula", <MathLine>V = s³</MathLine>),
          step("Substitute", <MathLine>V = ({s})³ = <strong>{fmt(V)}</strong></MathLine>),
        ],
      };
    }
    case "cylinder": {
      const r = need("r");
      const h = need("h");
      if (r === null || h === null) return empty;
      if (r <= 0 || h <= 0) return { ...empty, error: "Radius and height must be positive." };
      const V = PI * r * r * h;
      return {
        volume: V,
        surface: 2 * PI * r * (r + h),
        steps: [
          step("Formula", <MathLine>V = π r² h</MathLine>),
          step(
            "Substitute",
            <MathLine>
              V = π × ({r})² × {h} = π × {fmt(r * r)} × {h} = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "box": {
      const l = need("l");
      const w = need("w");
      const h = need("h");
      if (l === null || w === null || h === null) return empty;
      if (l <= 0 || w <= 0 || h <= 0)
        return { ...empty, error: "Length, width and height must all be positive." };
      const V = l * w * h;
      return {
        volume: V,
        surface: 2 * (l * w + l * h + w * h),
        steps: [
          step("Formula", <MathLine>V = l × w × h</MathLine>),
          step(
            "Substitute",
            <MathLine>
              V = {l} × {w} × {h} = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "capsule": {
      const r = need("r");
      const h = need("h");
      if (r === null || h === null) return empty;
      if (r <= 0 || h < 0) return { ...empty, error: "Radius must be positive and h ≥ 0." };
      const Vcyl = PI * r * r * h;
      const Vsphere = (4 / 3) * PI * r ** 3;
      const V = Vcyl + Vsphere;
      return {
        volume: V,
        surface: 2 * PI * r * (2 * r + h),
        steps: [
          step(
            "Formula",
            <MathLine>V = π r² h + (4/3) π r³</MathLine>,
          ),
          step(
            "Cylinder body",
            <MathLine>
              π × ({r})² × {h} = <strong>{fmt(Vcyl)}</strong>
            </MathLine>,
          ),
          step(
            "Two hemispheres = full sphere",
            <MathLine>
              (4/3) × π × ({r})³ = <strong>{fmt(Vsphere)}</strong>
            </MathLine>,
          ),
          step(
            "Add",
            <MathLine>
              V = {fmt(Vcyl)} + {fmt(Vsphere)} = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "cap": {
      // Solve for the missing one of (R, a, h). Relation: a² = h(2R − h)
      let R = need("R");
      let a = need("a");
      let h = need("h");
      const derived: string[] = [];
      if (capMode === "Rh") {
        if (R === null || h === null) return empty;
        if (R <= 0 || h <= 0) return { ...empty, error: "R and h must be positive." };
        if (h > 2 * R) return { ...empty, error: "Cap height cannot exceed the ball's diameter (2R)." };
        const inside = h * (2 * R - h);
        a = Math.sqrt(inside);
        derived.push(`a = √(h(2R − h)) = √(${fmt(inside)}) = ${fmt(a)}`);
      } else if (capMode === "ah") {
        if (a === null || h === null) return empty;
        if (a <= 0 || h <= 0) return { ...empty, error: "a and h must be positive." };
        R = (a * a + h * h) / (2 * h);
        derived.push(`R = (a² + h²) / (2h) = (${fmt(a * a)} + ${fmt(h * h)}) / ${fmt(2 * h)} = ${fmt(R)}`);
      } else {
        if (R === null || a === null) return empty;
        if (R <= 0 || a <= 0) return { ...empty, error: "R and a must be positive." };
        if (a > R) return { ...empty, error: "Base radius a cannot exceed ball radius R." };
        // h = R ± √(R² − a²). Take the smaller cap (h ≤ R).
        h = R - Math.sqrt(R * R - a * a);
        derived.push(`h = R − √(R² − a²) = ${fmt(R)} − √(${fmt(R * R - a * a)}) = ${fmt(h)}`);
      }
      const V = (PI * h * h * (3 * R! - h!)) / 3;
      const S = 2 * PI * R! * h!; // spherical surface area of cap (excludes base)
      return {
        volume: V,
        surface: S,
        steps: [
          step(
            "Formula",
            <MathLine>V = (π h² / 3) × (3R − h),  with a² = h(2R − h)</MathLine>,
          ),
          ...(derived.length
            ? [step("Derive missing dimension", <MathLine>{derived.join("\n")}</MathLine>)]
            : []),
          step(
            "Substitute",
            <MathLine>
              V = (π × ({fmt(h!)})² / 3) × (3 × {fmt(R!)} − {fmt(h!)}) = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "frustum": {
      const r1 = need("r1");
      const r2 = need("r2");
      const h = need("h");
      if (r1 === null || r2 === null || h === null) return empty;
      if (r1 < 0 || r2 < 0 || h <= 0)
        return { ...empty, error: "Radii must be ≥ 0 and height must be positive." };
      if (r1 === 0 && r2 === 0)
        return { ...empty, error: "At least one radius must be non-zero." };
      const term = r1 * r1 + r1 * r2 + r2 * r2;
      const V = (PI * h * term) / 3;
      const slant = Math.sqrt((r2 - r1) ** 2 + h * h);
      const S = PI * (r1 * r1 + r2 * r2 + (r1 + r2) * slant);
      return {
        volume: V,
        surface: S,
        steps: [
          step(
            "Formula",
            <MathLine>V = (π h / 3) × (r₁² + r₁ r₂ + r₂²)</MathLine>,
          ),
          step(
            "Inner sum",
            <MathLine>
              r₁² + r₁ r₂ + r₂² = {fmt(r1 * r1)} + {fmt(r1 * r2)} + {fmt(r2 * r2)} = <strong>{fmt(term)}</strong>
            </MathLine>,
          ),
          step(
            "Multiply",
            <MathLine>
              V = (π × {h} / 3) × {fmt(term)} = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "ellipsoid": {
      const a = need("a");
      const b = need("b");
      const c = need("c");
      if (a === null || b === null || c === null) return empty;
      if (a <= 0 || b <= 0 || c <= 0)
        return { ...empty, error: "All three semi-axes must be positive." };
      const V = (4 / 3) * PI * a * b * c;
      return {
        volume: V,
        surface: null,
        steps: [
          step("Formula", <MathLine>V = (4/3) π a b c</MathLine>),
          step(
            "Substitute",
            <MathLine>
              V = (4/3) × π × {a} × {b} × {c} = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "pyramid": {
      const l = need("l");
      const w = need("w");
      const h = need("h");
      if (l === null || w === null || h === null) return empty;
      if (l <= 0 || w <= 0 || h <= 0)
        return { ...empty, error: "Base dimensions and height must be positive." };
      const V = (l * w * h) / 3;
      return {
        volume: V,
        surface: null,
        steps: [
          step("Formula", <MathLine>V = (1/3) × l × w × h</MathLine>),
          step(
            "Substitute",
            <MathLine>
              V = (1/3) × {l} × {w} × {h} = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "tube": {
      const D = need("D");
      const d = need("d");
      const L = need("L");
      if (D === null || d === null || L === null) return empty;
      if (D <= 0 || d < 0 || L <= 0)
        return { ...empty, error: "Diameters and length must be positive (inner may be 0)." };
      if (d >= D) return { ...empty, error: "Inner diameter must be less than outer diameter." };
      const R = D / 2;
      const r = d / 2;
      const V = PI * (R * R - r * r) * L;
      return {
        volume: V,
        surface: null,
        steps: [
          step("Formula", <MathLine>V = π × ((D/2)² − (d/2)²) × L</MathLine>),
          step(
            "Radii",
            <MathLine>
              R = D/2 = {fmt(R)}; r = d/2 = {fmt(r)}
            </MathLine>,
          ),
          step(
            "Substitute",
            <MathLine>
              V = π × ({fmt(R * R)} − {fmt(r * r)}) × {L} = π × {fmt(R * R - r * r)} × {L} ={" "}
              <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "prism": {
      const L = need("L");
      if (L === null) return empty;
      if (L <= 0) return { ...empty, error: "Prism length must be positive." };
      let A: number;
      let areaStep: React.ReactNode;
      if (prismMode === "bh") {
        const b = need("b");
        const th = need("th");
        if (b === null || th === null) return empty;
        if (b <= 0 || th <= 0)
          return { ...empty, error: "Triangle base and height must be positive." };
        A = 0.5 * b * th;
        areaStep = (
          <MathLine>
            A = ½ × {b} × {th} = <strong>{fmt(A)}</strong>
          </MathLine>
        );
      } else {
        const a = need("a");
        const b = need("b");
        const c = need("c");
        if (a === null || b === null || c === null) return empty;
        if (a <= 0 || b <= 0 || c <= 0)
          return { ...empty, error: "All three sides must be positive." };
        if (a + b <= c || a + c <= b || b + c <= a)
          return { ...empty, error: "Triangle inequality violated — those sides can't form a triangle." };
        const s = (a + b + c) / 2;
        A = Math.sqrt(s * (s - a) * (s - b) * (s - c));
        areaStep = (
          <MathLine>
            s = ({a} + {b} + {c})/2 = {fmt(s)}; A = √({fmt(s)}({fmt(s - a)})({fmt(s - b)})({fmt(s - c)})) ={" "}
            <strong>{fmt(A)}</strong>
          </MathLine>
        );
      }
      const V = A * L;
      return {
        volume: V,
        surface: null,
        steps: [
          step("Formula", <MathLine>V = A × L</MathLine>),
          step("Triangle area A", areaStep),
          step(
            "Multiply by length",
            <MathLine>
              V = {fmt(A)} × {L} = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "torus": {
      const R = need("R");
      const r = need("r");
      if (R === null || r === null) return empty;
      if (R <= 0 || r <= 0) return { ...empty, error: "R and r must be positive." };
      if (r > R) return { ...empty, error: "Tube radius r must be less than or equal to major radius R (self-intersecting torus otherwise)." };
      const V = 2 * PI * PI * R * r * r;
      const S = 4 * PI * PI * R * r;
      return {
        volume: V,
        surface: S,
        steps: [
          step("Formula", <MathLine>V = 2 π² R r²</MathLine>),
          step(
            "Substitute",
            <MathLine>
              V = 2 × π² × {R} × ({r})² = 2 × π² × {R} × {fmt(r * r)} = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "tetrahedron": {
      const s = need("s");
      if (s === null) return empty;
      if (s <= 0) return { ...empty, error: "Edge length must be positive." };
      const V = s ** 3 / (6 * Math.SQRT2);
      const S = Math.sqrt(3) * s * s;
      return {
        volume: V,
        surface: S,
        steps: [
          step("Formula", <MathLine>V = s³ / (6√2)</MathLine>),
          step(
            "Substitute",
            <MathLine>
              V = ({s})³ / (6√2) = {fmt(s ** 3)} / {fmt(6 * Math.SQRT2)} = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "octahedron": {
      const s = need("s");
      if (s === null) return empty;
      if (s <= 0) return { ...empty, error: "Edge length must be positive." };
      const V = (Math.SQRT2 / 3) * s ** 3;
      const S = 2 * Math.sqrt(3) * s * s;
      return {
        volume: V,
        surface: S,
        steps: [
          step("Formula", <MathLine>V = (√2 / 3) s³</MathLine>),
          step(
            "Substitute",
            <MathLine>
              V = (√2 / 3) × ({s})³ = {fmt(Math.SQRT2 / 3)} × {fmt(s ** 3)} = <strong>{fmt(V)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
  }
}

// TO_M3 lives in @/lib/math/geometry-shared and is re-exported at the top of this file.

function UnitConversions({ volumeInUnit, unit }: { volumeInUnit: number; unit: string }) {
  const factor = TO_M3[unit] ?? 1;
  const m3 = volumeInUnit * factor;
  const rows: [string, number][] = [
    ["Cubic meters (m³)", m3],
    ["Cubic feet (ft³)", m3 / 0.3048 ** 3],
    ["Cubic yards (yd³)", m3 / 0.9144 ** 3],
    ["Cubic inches (in³)", m3 / 0.0254 ** 3],
    ["Liters (L)", m3 * 1000],
    ["US gallons", m3 * 264.1720523581],
    ["Imperial gallons (UK)", m3 * 219.9692482991],
  ];
  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Converted to common volume units
      </div>
      <div className="grid grid-cols-1 gap-y-1 text-sm sm:grid-cols-2">
        {rows.map(([label, val]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 tabular-nums">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">{fmt(val, 6)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Diagrams ---------- */
function ShapeDiagram({
  shape,
  inputs,
  prismMode,
}: {
  shape: Shape;
  inputs: Record<string, string>;
  prismMode: "bh" | "sss";
}) {
  const stroke = "currentColor";
  const fill = "var(--color-primary)";
  const label = "text-[10px] fill-current text-muted-foreground";

  const wrap = (content: React.ReactNode, viewBox = "0 0 300 220") => (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-foreground">
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="h-56 w-full" role="img" aria-label={`Diagram of ${shape} with labeled dimensions`}>
        <g fillOpacity={0.12} fill={fill} stroke={stroke} strokeWidth={1.5}>
          {content}
        </g>
      </svg>
    </div>
  );

  switch (shape) {
    case "sphere": {
      const r = inputs.r || "r";
      return wrap(
        <>
          <circle cx={150} cy={110} r={75} />
          <ellipse cx={150} cy={110} rx={75} ry={22} fillOpacity={0} strokeDasharray="4 3" />
          <line x1={150} y1={110} x2={225} y2={110} strokeDasharray="4 3" />
          <circle cx={150} cy={110} r={2} fill={stroke} fillOpacity={1} />
          <text x={188} y={105} className={label}>r = {r}</text>
        </>,
      );
    }
    case "cone": {
      const r = inputs.r || "r";
      const h = inputs.h || "h";
      return wrap(
        <>
          <path d="M 80 170 L 220 170 L 150 40 Z" />
          <ellipse cx={150} cy={170} rx={70} ry={16} />
          <line x1={150} y1={170} x2={150} y2={40} strokeDasharray="4 3" strokeOpacity={0.6} />
          <line x1={150} y1={170} x2={220} y2={170} strokeDasharray="4 3" strokeOpacity={0.6} />
          <text x={185} y={185} className={label}>r = {r}</text>
          <text x={158} y={105} className={label}>h = {h}</text>
        </>,
      );
    }
    case "cube": {
      const s = inputs.s || "s";
      return wrap(
        <>
          <polygon points="70,80 190,80 190,190 70,190" />
          <polygon points="70,80 110,50 230,50 190,80" fillOpacity={0.06} />
          <polygon points="190,80 230,50 230,160 190,190" fillOpacity={0.06} />
          <text x={130} y={205} textAnchor="middle" className={label}>s = {s}</text>
          <text x={205} y={140} className={label}>s</text>
        </>,
      );
    }
    case "cylinder": {
      const r = inputs.r || "r";
      const h = inputs.h || "h";
      return wrap(
        <>
          <ellipse cx={150} cy={50} rx={70} ry={16} />
          <ellipse cx={150} cy={170} rx={70} ry={16} />
          <line x1={80} y1={50} x2={80} y2={170} />
          <line x1={220} y1={50} x2={220} y2={170} />
          <line x1={150} y1={50} x2={220} y2={50} strokeDasharray="4 3" strokeOpacity={0.6} />
          <text x={185} y={45} className={label}>r = {r}</text>
          <text x={230} y={115} className={label}>h = {h}</text>
        </>,
      );
    }
    case "box": {
      const l = inputs.l || "l";
      const w = inputs.w || "w";
      const h = inputs.h || "h";
      return wrap(
        <>
          <polygon points="60,90 200,90 200,190 60,190" />
          <polygon points="60,90 100,60 240,60 200,90" fillOpacity={0.06} />
          <polygon points="200,90 240,60 240,160 200,190" fillOpacity={0.06} />
          <text x={130} y={205} textAnchor="middle" className={label}>l = {l}</text>
          <text x={215} y={140} className={label}>h = {h}</text>
          <text x={168} y={78} className={label}>w = {w}</text>
        </>,
      );
    }
    case "capsule": {
      const r = inputs.r || "r";
      const h = inputs.h || "h";
      return wrap(
        <>
          <path d="M 90 60 L 210 60 A 40 40 0 0 1 210 140 L 90 140 A 40 40 0 0 1 90 60 Z" />
          <line x1={90} y1={100} x2={210} y2={100} strokeDasharray="3 3" strokeOpacity={0.5} />
          <text x={150} y={155} textAnchor="middle" className={label}>h = {h}</text>
          <text x={220} y={105} className={label}>r = {r}</text>
        </>,
      );
    }
    case "cap": {
      return wrap(
        <>
          <circle cx={150} cy={130} r={70} fillOpacity={0.04} strokeDasharray="4 3" />
          <path d="M 90 90 A 70 70 0 0 1 210 90 L 90 90 Z" />
          <line x1={90} y1={90} x2={210} y2={90} strokeDasharray="4 3" />
          <line x1={150} y1={90} x2={150} y2={60} strokeDasharray="4 3" strokeOpacity={0.5} />
          <line x1={150} y1={130} x2={150} y2={200} strokeDasharray="4 3" strokeOpacity={0.5} />
          <text x={150} y={55} textAnchor="middle" className={label}>h</text>
          <text x={215} y={90} className={label}>a</text>
          <text x={155} y={195} className={label}>R</text>
        </>,
      );
    }
    case "frustum": {
      const r1 = inputs.r1 || "r₁";
      const r2 = inputs.r2 || "r₂";
      const h = inputs.h || "h";
      return wrap(
        <>
          <path d="M 100 60 L 200 60 L 235 170 L 65 170 Z" />
          <ellipse cx={150} cy={60} rx={50} ry={12} />
          <ellipse cx={150} cy={170} rx={85} ry={16} />
          <line x1={150} y1={60} x2={150} y2={170} strokeDasharray="4 3" strokeOpacity={0.5} />
          <text x={165} y={55} className={label}>r₁ = {r1}</text>
          <text x={195} y={195} className={label}>r₂ = {r2}</text>
          <text x={158} y={120} className={label}>h = {h}</text>
        </>,
      );
    }
    case "ellipsoid": {
      const a = inputs.a || "a";
      const b = inputs.b || "b";
      const c = inputs.c || "c";
      return wrap(
        <>
          <ellipse cx={150} cy={110} rx={100} ry={55} />
          <ellipse cx={150} cy={110} rx={100} ry={22} fillOpacity={0} strokeDasharray="4 3" />
          <line x1={150} y1={110} x2={250} y2={110} strokeDasharray="4 3" />
          <line x1={150} y1={110} x2={150} y2={55} strokeDasharray="4 3" />
          <text x={200} y={105} className={label}>a = {a}</text>
          <text x={155} y={80} className={label}>b = {b}</text>
          <text x={155} y={135} className={label}>c = {c}</text>
        </>,
      );
    }
    case "pyramid": {
      const l = inputs.l || "l";
      const w = inputs.w || "w";
      const h = inputs.h || "h";
      return wrap(
        <>
          <polygon points="60,180 200,180 240,150 100,150" fillOpacity={0.06} />
          <line x1={60} y1={180} x2={150} y2={40} />
          <line x1={200} y1={180} x2={150} y2={40} />
          <line x1={240} y1={150} x2={150} y2={40} />
          <line x1={100} y1={150} x2={150} y2={40} strokeDasharray="4 3" strokeOpacity={0.6} />
          <line x1={150} y1={165} x2={150} y2={40} strokeDasharray="4 3" strokeOpacity={0.5} />
          <text x={130} y={200} textAnchor="middle" className={label}>l = {l}</text>
          <text x={220} y={145} className={label}>w = {w}</text>
          <text x={158} y={100} className={label}>h = {h}</text>
        </>,
      );
    }
    case "tube": {
      const D = inputs.D || "D";
      const d = inputs.d || "d";
      const L = inputs.L || "L";
      const Dn = num(inputs.D) ?? 10;
      const dn = num(inputs.d) ?? 6;
      const rOut = 70;
      const rIn = Math.max(4, Math.min(rOut * 0.9, (dn / Math.max(Dn, dn)) * rOut));
      return wrap(
        <>
          <ellipse cx={100} cy={110} rx={22} ry={rOut} />
          <ellipse cx={100} cy={110} rx={9} ry={rIn} fill="var(--color-background)" fillOpacity={1} />
          <ellipse cx={100} cy={110} rx={9} ry={rIn} fillOpacity={0} />
          <line x1={100} y1={40} x2={240} y2={40} />
          <line x1={100} y1={180} x2={240} y2={180} />
          <ellipse cx={240} cy={110} rx={22} ry={rOut} />
          <ellipse cx={240} cy={110} rx={9} ry={rIn} fillOpacity={0} />
          <text x={100} y={30} textAnchor="middle" className={label}>D = {D}</text>
          <text x={100} y={200} textAnchor="middle" className={label}>d = {d}</text>
          <text x={170} y={35} textAnchor="middle" className={label}>L = {L}</text>
        </>,
      );
    }
    case "prism": {
      const L = inputs.L || "L";
      const b = prismMode === "bh" ? inputs.b || "b" : "b";
      const th = prismMode === "bh" ? inputs.th || "h" : "h";
      return wrap(
        <>
          <polygon points="60,180 180,180 120,60" />
          <polygon points="60,180 180,180 250,150 130,150 60,180" fillOpacity={0.06} />
          <polygon points="180,180 120,60 190,30 250,150" fillOpacity={0.06} />
          <line x1={120} y1={60} x2={190} y2={30} />
          <text x={120} y={195} textAnchor="middle" className={label}>b = {b}</text>
          <text x={128} y={120} className={label}>h = {th}</text>
          <text x={215} y={165} className={label}>L = {L}</text>
        </>,
      );
    }
    case "torus": {
      const R = inputs.R || "R";
      const r = inputs.r || "r";
      return wrap(
        <>
          <ellipse cx={150} cy={110} rx={100} ry={45} />
          <ellipse cx={150} cy={110} rx={60} ry={20} fill="var(--color-background)" fillOpacity={1} />
          <ellipse cx={150} cy={110} rx={60} ry={20} fillOpacity={0} />
          <line x1={150} y1={110} x2={250} y2={110} strokeDasharray="4 3" />
          <line x1={210} y1={110} x2={220} y2={130} strokeDasharray="3 3" />
          <circle cx={150} cy={110} r={2} fill={stroke} fillOpacity={1} />
          <text x={175} y={105} className={label}>R = {R}</text>
          <text x={225} y={135} className={label}>r = {r}</text>
        </>,
      );
    }
    case "tetrahedron": {
      const s = inputs.s || "s";
      return wrap(
        <>
          <polygon points="150,40 60,180 240,180" fillOpacity={0.06} />
          <polygon points="150,40 60,180 155,150" />
          <polygon points="150,40 240,180 155,150" fillOpacity={0.1} />
          <line x1={60} y1={180} x2={240} y2={180} strokeDasharray="4 3" strokeOpacity={0.5} />
          <text x={150} y={110} textAnchor="middle" className={label}>s = {s}</text>
        </>,
      );
    }
    case "octahedron": {
      const s = inputs.s || "s";
      return wrap(
        <>
          <polygon points="150,35 220,110 150,120 80,110" fillOpacity={0.1} />
          <polygon points="150,120 220,110 150,190 80,110" fillOpacity={0.06} />
          <line x1={80} y1={110} x2={220} y2={110} strokeDasharray="4 3" strokeOpacity={0.5} />
          <text x={150} y={205} textAnchor="middle" className={label}>s = {s}</text>
        </>,
      );
    }
  }
}

/* ---------- FAQ ---------- */
const FAQ_ITEMS = [
  {
    q: "What is volume?",
    a: "Volume is the amount of three-dimensional space a solid occupies. It's measured in cubic units — cubic meters, cubic feet, liters, gallons and so on — because it's a measurement in three dimensions at once.",
  },
  {
    q: "What's the formula for the volume of a sphere?",
    a: "V = (4/3) π r³, where r is the sphere's radius. Doubling the radius makes the volume 8× larger.",
  },
  {
    q: "How do I find the volume of a cylinder?",
    a: "Multiply the area of the circular base by the height: V = π r² h.",
  },
  {
    q: "How do I calculate the volume of a cone?",
    a: "A cone is exactly one-third of the cylinder that would fit around it, so V = (1/3) π r² h with r the base radius and h the perpendicular height.",
  },
  {
    q: "What is a spherical cap and how do I find its volume?",
    a: "A spherical cap is the portion of a sphere cut off by a flat plane. Given the ball radius R and cap height h, V = (π h² / 3)(3R − h). This calculator also lets you enter any two of {ball radius R, base radius a, cap height h} and derives the third from a² = h(2R − h).",
  },
  {
    q: "How do I find the volume of a conical frustum?",
    a: "A frustum is a cone with the top sliced off flat, leaving two circular ends. V = (π h / 3)(r₁² + r₁ r₂ + r₂²), where r₁ and r₂ are the top and bottom radii and h is the height.",
  },
  {
    q: "What's the formula for the volume of a torus (donut)?",
    a: "V = 2 π² R r², where R is the distance from the centre of the torus to the centre of the tube, and r is the tube's radius.",
  },
  {
    q: "How many liters are in a cubic meter?",
    a: "Exactly 1000 liters. And 1 m³ ≈ 264.172 US gallons ≈ 219.969 imperial gallons.",
  },
  {
    q: "Can I use this calculator for tank capacity and gallons?",
    a: "Yes — every result is shown in cubic meters, cubic feet, cubic yards, cubic inches, liters, US gallons and imperial gallons, so you can size fuel tanks, water tanks, aquariums, or fish ponds in whatever unit is convenient.",
  },
  {
    q: "How do I estimate concrete or fill volume in cubic yards?",
    a: "Enter your dimensions in feet or yards, then read the cubic-yards line in the conversion panel. For concrete slabs and footings, the rectangular tank shape (length × width × depth) is usually what you want.",
  },
  {
    q: "What units should I enter?",
    a: "Any consistent length unit — millimeters, centimeters, meters, kilometers, inches, feet or yards. All dimensions on a single calculation must use the same unit, and the answer is in the cube of that unit.",
  },
  {
    q: "Can I estimate cost from volume?",
    a: "Yes — the cost / material estimator that appears with every result multiplies your volume by a price per cubic unit. Useful for concrete, soil, mulch, gravel, resin, water and fill.",
  },
  {
    q: "Can I estimate the weight of a material from its volume?",
    a: "Yes — the material weight estimator next to the cost estimator lets you pick a common material (water, concrete, steel, sand, gravel, aluminum, pine wood) or enter a custom density, then multiplies volume (converted to cubic meters) by density to show mass in kilograms and pounds.",
  },
  {
    q: "How do I calculate the volume of a tetrahedron or octahedron?",
    a: "For a regular tetrahedron with edge length s, V = s³ / (6√2). For a regular octahedron with edge length s, V = (√2 / 3) s³. Both are built into the shape selector above with diagrams and steps.",
  },
  {
    q: "How full is a horizontal cylindrical or spherical tank at a given liquid height?",
    a: "Use the partial fill level tool below. For a horizontal cylinder of radius r and length L filled to height h, V = L r² (θ − sinθ) / 2 where θ = 2 arccos((r−h)/r). For a sphere of radius r filled to height h, V = π h² (3r − h) / 3. Both are shown as a percentage of the tank's total volume.",
  },
] as const;

/* ---------- Educational content ---------- */
function VolumeEducation() {
  return (
    <>
      <CalcSection title="What is volume?">
        <p>
          Volume is the amount of three-dimensional space a solid object fills. If you could pour
          water into the shape until it was completely full, the amount of water inside would be
          the volume. It answers questions like “how much fits inside?”, “how much material do I
          need to make this?” and “how much space does this take up on a shelf, in a truck or in a
          tank?”.
        </p>
        <p>
          Volume is always measured in <em>cubic</em> units — cubic centimeters, cubic meters,
          cubic feet, cubic inches — or in liquid units such as liters and gallons. That is because
          volume extends in three directions at the same time: length, width and height. A single
          number like “50” means nothing on its own; 50 cm³ and 50 m³ are different by a factor of
          one million.
        </p>
        <p>
          Every volume formula on this page is built from one simple idea: take a cross-section,
          measure how much area it covers, then multiply by how far the shape stretches in the third
          direction. When the shape narrows to a point (a cone or pyramid) you divide by three.
          When it curves (a sphere, cylinder or torus) you add a π. Once you notice that pattern,
          the formulas stop feeling like a list to memorise and start feeling like small variations
          of the same rule.
        </p>
      </CalcSection>

      <CalcSection title="Volume, shape by shape">
        <p className="text-sm text-muted-foreground">
          One card per solid — the geometric idea, its formula with each
          variable spelled out, the same diagram you see above the results
          panel, and one hand-checked numeric example.
        </p>
        <GuideCards items={VOLUME_GUIDE} />
      </CalcSection>




      <CalcSection title="Common volume unit conversions">
        <ReferenceTable
          headers={["From", "To", "Multiply by"]}
          numericColumns={[2]}
          rows={[
            ["1 cubic meter (m³)", "cubic feet", "35.3147"],
            ["1 cubic meter (m³)", "cubic yards", "1.30795"],
            ["1 cubic meter (m³)", "liters", "1000"],
            ["1 cubic meter (m³)", "US gallons", "264.1720"],
            ["1 cubic meter (m³)", "imperial gallons", "219.9692"],
            ["1 cubic foot (ft³)", "cubic meters", "0.028317"],
            ["1 cubic foot (ft³)", "liters", "28.3168"],
            ["1 cubic foot (ft³)", "US gallons", "7.48052"],
            ["1 cubic yard (yd³)", "cubic meters", "0.764555"],
            ["1 liter (L)", "cubic meters", "0.001"],
            ["1 liter (L)", "US gallons", "0.264172"],
            ["1 US gallon", "liters", "3.78541"],
            ["1 imperial gallon", "liters", "4.54609"],
            ["1 imperial gallon", "US gallons", "1.20095"],
          ]}
        />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "15 solids — sphere, cone, cube, cylinder, rectangular tank, capsule, spherical cap, conical frustum, ellipsoid, pyramid (square or rectangular base), tube (hollow cylinder), triangular prism, torus, tetrahedron, and octahedron.",
            "Live SVG diagram for every shape that updates as you type, with each entered dimension labeled directly on the figure.",
            "Spherical cap accepts any two of ball radius R, base radius a, and cap height h — the calculator derives the third from a² = h(2R − h).",
            "Triangular prism supports both base–height and three-sides (Heron's formula) triangle input — a shape most volume calculators skip.",
            "Torus and tube (hollow cylinder) built in — two more gaps that most competitors miss.",
            "Length unit selector (mm, cm, m, km, in, ft, yd); every result is instantly re-shown in cubic meters, cubic feet, cubic yards, cubic inches, liters, US gallons and imperial gallons.",
            "Cost / material estimator on every shape — enter a price per cubic unit and get an instant total for concrete, soil, water, gravel, mulch, resin or fill.",
            "Full step-by-step working — formula, substitution and intermediate derivations shown for every shape, especially the error-prone spherical cap and conical frustum.",
            "Surface area shown alongside volume wherever it's well-defined (sphere, cube, cylinder, cone, box, capsule, cap, frustum, tube, torus).",
            "Copy the result or download it as a PNG straight from the results panel.",
            "Input validation with clear error messages — negative dimensions, inner diameter ≥ outer, cap height > diameter, triangle-inequality violations, and self-intersecting torus are all caught.",
            "Material weight estimator alongside the cost estimator — pick water, concrete, steel, sand, gravel, aluminum, pine wood, or a custom density to convert volume into estimated mass in kilograms and pounds.",
            "Now covers 15 solids, adding the regular tetrahedron and octahedron (Platonic solids) with their own diagrams, formulas and steps.",
            "Dedicated partial fill level tool for horizontal cylindrical and spherical tanks — enter the liquid height and instantly see the filled volume and percent full, with full derivation steps.",
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
            { to: "/calculators/math/triangle-calculator", label: "Triangle Calculator" },
            { to: "/calculators/math/distance-calculator", label: "Distance Calculator" },
            { to: "/calculators/math", label: "All Math Calculators" },
          ]}
        />
      </CalcSection>
    </>
  );
}

/* ---------- Educational guide cards (one per shape) ---------- */

function Dia({ shape, inputs, prismMode = "bh" as "bh" | "sss" }: {
  shape: Shape;
  inputs: Record<string, string>;
  prismMode?: "bh" | "sss";
}) {
  return <ShapeDiagram shape={shape} inputs={inputs} prismMode={prismMode} />;
}

const VOLUME_GUIDE: GuideCardItem[] = [
  {
    key: "sphere",
    title: "Sphere",
    explain:
      "A sphere is every point the same distance r from a centre — a perfect ball. Its volume comes from stacking infinitely many circular cross-sections and simplifies to a clean cubic in r.",
    formula: <>V = (4/3) π r³</>,
    legend: LEG.sphere,
    diagram: <Dia shape="sphere" inputs={{ r: "r" }} />,
    example: {
      given: <>r = 6</>,
      substitute: <>(4/3) × π × 6³ = (4/3) × π × 216 = 288π</>,
      answer: <>≈ 904.7787 cubic units</>,
    },
  },
  {
    key: "cone",
    title: "Cone",
    explain:
      "A cone tapers from a circular base to a single apex. The (1/3) factor is the same one that appears in every pyramid — a tapered solid holds exactly one-third of the prism that surrounds it.",
    formula: <>V = (1/3) π r² h</>,
    legend: LEG.cone,
    diagram: <Dia shape="cone" inputs={{ r: "r", h: "h" }} />,
    example: {
      given: <>r = 3, h = 9</>,
      substitute: <>(1/3) × π × 3² × 9 = (1/3) × π × 81 = 27π</>,
      answer: <>≈ 84.8230 cubic units</>,
    },
  },
  {
    key: "cube",
    title: "Cube",
    explain:
      "A cube is six equal square faces meeting at right angles. Because every edge has the same length s, volume is just that length used three times over.",
    formula: <>V = s³</>,
    legend: LEG.cube,
    diagram: <Dia shape="cube" inputs={{ s: "s" }} />,
    example: {
      given: <>s = 5</>,
      substitute: <>5 × 5 × 5 = 125</>,
      answer: <>125 cubic units</>,
    },
  },
  {
    key: "cylinder",
    title: "Cylinder",
    explain:
      "A cylinder is a circle stretched straight upward. The base area π r² multiplied by the height h gives the volume — the same base × height pattern every prism follows.",
    formula: <>V = π r² h</>,
    legend: LEG.cylinder,
    diagram: <Dia shape="cylinder" inputs={{ r: "r", h: "h" }} />,
    example: {
      given: <>r = 4, h = 10</>,
      substitute: <>π × 4² × 10 = π × 16 × 10 = 160π</>,
      answer: <>≈ 502.6548 cubic units</>,
    },
  },
  {
    key: "box",
    title: "Rectangular tank (box)",
    explain:
      "A rectangular tank — the shape of most rooms, boxes and pools — has three independent edges. Volume is simply the product of the three side lengths.",
    formula: <>V = l × w × h</>,
    legend: LEG.box,
    diagram: <Dia shape="box" inputs={{ l: "l", w: "w", h: "h" }} />,
    example: {
      given: <>l = 4, w = 3, h = 2</>,
      substitute: <>4 × 3 × 2 = 24</>,
      answer: <>24 cubic units</>,
    },
  },
  {
    key: "capsule",
    title: "Capsule",
    explain:
      "A capsule is a cylinder with a hemisphere glued onto each end. Adding the two hemispheres together makes a full sphere, so its volume is just cylinder + sphere.",
    formula: <>V = π r² h + (4/3) π r³</>,
    legend: LEG.capsule,
    diagram: <Dia shape="capsule" inputs={{ r: "r", h: "h" }} />,
    example: {
      given: <>r = 2, h = 6</>,
      substitute: <>π × 4 × 6 + (4/3) × π × 8 = 24π + (32/3)π</>,
      answer: <>≈ 108.9085 cubic units</>,
    },
  },
  {
    key: "cap",
    title: "Spherical cap",
    explain:
      "A spherical cap is the slice you get when a flat plane cuts a ball. You only need any two of ball radius R, cap height h, or base radius a — the third is fixed by a² = h(2R − h).",
    formula: <>V = (π h² / 3)(3R − h)</>,
    legend: LEG.cap,
    diagram: <Dia shape="cap" inputs={{ R: "R", h: "h" }} />,
    example: {
      given: <>R = 5, h = 2</>,
      substitute: <>(π × 4 / 3) × (15 − 2) = (4π/3) × 13 = 52π/3</>,
      answer: <>≈ 54.4543 cubic units</>,
    },
  },
  {
    key: "frustum",
    title: "Conical frustum",
    explain:
      "A frustum is what's left when you slice the tip off a cone with a cut parallel to the base — a bucket shape. The r₁² + r₁r₂ + r₂² term averages the two circular ends together.",
    formula: <>V = (π h / 3)(r₁² + r₁ r₂ + r₂²)</>,
    legend: LEG.frustum,
    diagram: <Dia shape="frustum" inputs={{ r1: "r₁", r2: "r₂", h: "h" }} />,
    example: {
      given: <>r₁ = 3, r₂ = 5, h = 6</>,
      substitute: <>(π × 6 / 3) × (9 + 15 + 25) = 2π × 49 = 98π</>,
      answer: <>≈ 307.8761 cubic units</>,
    },
  },
  {
    key: "ellipsoid",
    title: "Ellipsoid",
    explain:
      "An ellipsoid is a stretched or squashed sphere with three independent semi-axes a, b and c. Setting all three equal recovers the sphere formula (4/3) π r³.",
    formula: <>V = (4/3) π a b c</>,
    legend: LEG.ellipsoid,
    diagram: <Dia shape="ellipsoid" inputs={{ a: "a", b: "b", c: "c" }} />,
    example: {
      given: <>a = 3, b = 4, c = 5</>,
      substitute: <>(4/3) × π × 3 × 4 × 5 = (4/3) × π × 60 = 80π</>,
      answer: <>≈ 251.3274 cubic units</>,
    },
  },
  {
    key: "pyramid",
    title: "Square / rectangular pyramid",
    explain:
      "A pyramid tapers from a rectangular base to a single apex. Like the cone, a tapered solid holds one-third of the prism that would enclose it — hence the 1/3.",
    formula: <>V = (1/3) l × w × h</>,
    legend: LEG.pyramid,
    diagram: <Dia shape="pyramid" inputs={{ l: "l", w: "w", h: "h" }} />,
    example: {
      given: <>l = 6, w = 6, h = 9</>,
      substitute: <>(1/3) × 6 × 6 × 9 = (1/3) × 324 = 108</>,
      answer: <>108 cubic units</>,
    },
  },
  {
    key: "tube",
    title: "Tube (hollow cylinder)",
    explain:
      "A tube is a cylinder with a smaller cylinder removed from its centre — a pipe. Subtract the inner circle's area from the outer circle's, then multiply by the length.",
    formula: <>V = π ((D/2)² − (d/2)²) L</>,
    legend: LEG.tube,
    diagram: <Dia shape="tube" inputs={{ D: "D", d: "d", L: "L" }} />,
    example: {
      given: <>D = 10, d = 6, L = 20</>,
      substitute: <>π × (25 − 9) × 20 = π × 16 × 20 = 320π</>,
      answer: <>≈ 1005.3096 cubic units</>,
    },
  },
  {
    key: "prism",
    title: "Triangular prism",
    explain:
      "A triangular prism is a triangle extruded along a straight length. Volume is the triangle's area A times that length L — enter the triangle by base + height, or by three sides (Heron's formula).",
    formula: <>V = A × L</>,
    legend: LEG.prism,
    diagram: <Dia shape="prism" inputs={{ b: "b", ht: "h", L: "L" }} />,
    example: {
      given: <>base = 4, triangle height = 3, length = 10</>,
      substitute: <>A = (1/2) × 4 × 3 = 6, V = 6 × 10 = 60</>,
      answer: <>60 cubic units</>,
    },
  },
  {
    key: "torus",
    title: "Torus",
    explain:
      "A torus is a donut — a small circle of radius r swept around a larger central circle of radius R. The formula falls out of Pappus's theorem: tube area π r² times the sweep circumference 2π R.",
    formula: <>V = 2 π² R r²</>,
    legend: LEG.torus,
    diagram: <Dia shape="torus" inputs={{ R: "R", r: "r" }} />,
    example: {
      given: <>R = 10, r = 3</>,
      substitute: <>2 × π² × 10 × 9 = 180 π²</>,
      answer: <>≈ 1776.5288 cubic units</>,
    },
  },
  {
    key: "tetrahedron",
    title: "Tetrahedron",
    explain:
      "A regular tetrahedron is the simplest Platonic solid — four equilateral-triangle faces meeting at four vertices. Every edge has the same length s, so both volume and surface area reduce to a single-variable formula.",
    formula: <>V = s³ / (6√2)</>,
    legend: LEG.tetrahedron,
    diagram: <Dia shape="tetrahedron" inputs={{ s: "s" }} />,
    example: {
      given: <>s = 4</>,
      substitute: <>4³ / (6√2) = 64 / 8.4853</>,
      answer: <>≈ 7.5425 cubic units</>,
    },
  },
  {
    key: "octahedron",
    title: "Octahedron",

    explain:
      "A regular octahedron is eight equilateral-triangle faces arranged like two square pyramids glued base to base. Like the tetrahedron, a single edge length s determines the whole solid.",
    formula: <>V = (√2 / 3) s³</>,
    legend: LEG.octahedron,
    diagram: <Dia shape="octahedron" inputs={{ s: "s" }} />,
    example: {
      given: <>s = 4</>,
      substitute: <>(√2 / 3) × 64 = 0.4714 × 64</>,
      answer: <>≈ 30.1704 cubic units</>,
    },
  },
];


/* ---------- Composite Shape Builder ---------- */
interface CompositeItem {
  id: string;
  shape: Shape;
  inputs: Record<string, string>;
  prismMode: "bh" | "sss";
  capMode: "Rh" | "ah" | "Ra";
}

function newCompositeItem(shape: Shape = "cube"): CompositeItem {
  return {
    id: Math.random().toString(36).slice(2, 10),
    shape,
    inputs: {},
    prismMode: "bh",
    capMode: "Rh",
  };
}

function CompositeBuilder() {
  const [unit, setUnit] = useState<string>("m");
  const [items, setItems] = useState<CompositeItem[]>([newCompositeItem("cube")]);

  const update = (id: string, patch: Partial<CompositeItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));
  const add = () => setItems((prev) => [...prev, newCompositeItem("cube")]);

  const results = useMemo(
    () =>
      items.map((it) => ({
        item: it,
        result: compute(it.shape, it.inputs, it.prismMode, it.capMode),
      })),
    [items],
  );

  const total = results.reduce(
    (sum, { result }) => (result.volume !== null ? sum + result.volume : sum),
    0,
  );
  const anyValid = results.some(({ result }) => result.volume !== null);
  const steps = useMemo(() => {
    if (!anyValid) return [];
    const s: Step[] = [];
    results.forEach(({ item, result }, i) => {
      if (result.volume === null) return;
      s.push({
        title: `Component ${i + 1}: ${SHAPE_LABEL[item.shape]}`,
        body: (
          <div className="space-y-4">
            {result.steps.map((st, si) => (
              <div key={si}>
                <div className="mb-1 text-xs font-semibold opacity-70">
                  {st.title}
                </div>
                {st.body}
              </div>
            ))}
            <div className="border-t border-border/40 pt-2">
              <MathNote>
                Partial volume V{i + 1} = <strong>{fmt(result.volume)}</strong>
              </MathNote>
            </div>
          </div>
        ),
      });
    });
    s.push({
      title: "Total Composite Volume",
      body: (
        <>
          <MathNote>The total volume is the sum of all components:</MathNote>
          <MathLine>V_total = Σ V_i</MathLine>
          <MathLine>
            V_total ={" "}
            {results
              .filter((r) => r.result.volume !== null)
              .map((_, i) => `V${i + 1}`)
              .join(" + ")}
          </MathLine>
          <MathLine>
            V_total ={" "}
            {results
              .filter((r) => r.result.volume !== null)
              .map((r) => fmt(r.result.volume!))
              .join(" + ")}
          </MathLine>
          <MathLine>
            V_total = <strong>{fmt(total, 6)}</strong>
          </MathLine>
        </>
      ),
    });
    return s;
  }, [results, anyValid, total]);


  return (
    <CalcSection title="Composite shape builder">
      <p className="text-sm text-muted-foreground">
        Build a composite object out of any number of the 13 solids above and
        get the combined total volume with a per-component breakdown. Useful
        for tanks with domed heads, buildings with roofs, prosthetics, complex
        castings, or any shape you can decompose into simpler solids.
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
                  prismMode={it.prismMode}
                  setPrismMode={(m) => update(it.id, { prismMode: m })}
                  capMode={it.capMode}
                  setCapMode={(m) => update(it.id, { capMode: m })}
                />
                <div className="flex flex-col justify-center rounded-xl border border-border/40 bg-background/40 p-3 text-sm">
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Volume
                  </div>
                  {r.error ? (
                    <div className="mt-1 text-destructive">{r.error}</div>
                  ) : r.volume === null ? (
                    <div className="mt-1 text-muted-foreground">
                      Enter dimensions…
                    </div>
                  ) : (
                    <div className="mt-1 font-serif italic text-lg tabular-nums text-foreground">
                      {fmt(r.volume, 6)} {unit}
                      <sup>3</sup>
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
            Combined total volume
          </div>
          <div className="mb-4 font-serif italic text-2xl tabular-nums text-foreground">
            {fmt(total, 6)} {unit}
            <sup>3</sup>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Shape</th>
                  <th className="py-2 pr-3 text-right">
                    Volume ({unit}
                    <sup>3</sup>)
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
                      {result.volume === null ? "—" : fmt(result.volume, 6)}
                    </td>
                    <td className="py-2 pr-3 text-right font-serif italic tabular-nums text-muted-foreground">
                      {result.volume === null || total === 0
                        ? "—"
                        : ((result.volume / total) * 100).toFixed(2) + "%"}
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
        
          <div className="mt-4 border-t border-border/40 pt-4">
            <StepsToggle steps={steps} />
          </div>
        </div>
      )}
    </CalcSection>
  );
}
