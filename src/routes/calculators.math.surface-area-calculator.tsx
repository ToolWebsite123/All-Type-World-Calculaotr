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
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { type Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import { fmt as fmtRaw, num, TO_M2 } from "@/lib/math/geometry-shared";

/* ============================================================
 * Surface Area Calculator
 * 13 solids — reports Total, Lateral and Base surface area separately.
 * Live SVG diagrams, unit conversions (m², ft², yd², in², cm²), user-
 * selectable significant figures, full step-by-step working.
 * Formulas hand-verified against CalculatorSoup, Omni and Calculator.net.
 * ============================================================ */

function MathLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-1 text-center font-serif text-[15px] italic leading-relaxed text-foreground">
      {children}
    </div>
  );
}

/* ---------- Types ---------- */
const shapes = [
  "sphere",
  "cube",
  "cylinder",
  "cone",
  "box",
  "capsule",
  "cap",
  "frustum",
  "ellipsoid",
  "pyramid",
  "prism",
  "tube",
  "torus",
] as const;
type Shape = (typeof shapes)[number];

const SHAPE_LABEL: Record<Shape, string> = {
  sphere: "Sphere",
  cube: "Cube",
  cylinder: "Cylinder",
  cone: "Cone",
  box: "Rectangular Tank",
  capsule: "Capsule",
  cap: "Spherical Cap",
  frustum: "Conical Frustum",
  ellipsoid: "Ellipsoid",
  pyramid: "Pyramid (rectangular base)",
  prism: "Triangular Prism",
  tube: "Tube (Hollow Cylinder)",
  torus: "Torus",
};

/* ---------- Number formatter with user-selectable sig figs ---------- */
function fmtSig(x: number | null, sig: number): string {
  if (x === null || !Number.isFinite(x)) return "—";
  if (x === 0) return "0";
  if (Math.abs(x) >= 1e12 || Math.abs(x) < 1e-4) return x.toExponential(Math.max(1, sig - 1));
  const digits = Math.max(0, sig - Math.ceil(Math.log10(Math.abs(x))));
  const s = x.toFixed(digits);
  return s.replace(/\.?0+$/, "") || "0";
}

/* ---------- Route ---------- */
export const Route = createFileRoute("/calculators/math/surface-area-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Surface Area Calculator",
      title: "Surface Area Calculator — 13 Solids, Total / Lateral / Base",
      metaDescription:
        "Free surface area calculator for 13 solids — sphere, cube, cylinder, cone, tank, capsule, spherical cap, frustum, ellipsoid, pyramid, triangular prism, tube and torus. Reports total, lateral and base surface area with diagrams, unit conversions and step-by-step working.",
      canonicalUrl: "/calculators/math/surface-area-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Surface Area Calculator", path: "/calculators/math/surface-area-calculator" },
      ],
      faqs: FAQ_ITEMS.map((f) => ({ q: f.q, a: f.a })),
    }),
  component: SurfaceAreaPage,
});

/* ---------- Component ---------- */
function SurfaceAreaPage() {
  const [shape, setShape] = useState<Shape>("cylinder");
  const captureRef = useRef<HTMLDivElement>(null);

  return (
    <MathCalcPage
      name="Surface Area Calculator"
      tagline="Compute the surface area of 13 common solids. Pick a shape, enter dimensions, and get total, lateral and base surface area separately with a live labeled diagram, unit conversions and full step-by-step working."
      extras={<SAEducation />}
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
    </MathCalcPage>
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
  const [sig, setSig] = useState<number>(6);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [prismMode, setPrismMode] = useState<"bh" | "sss">("bh");
  const [capMode, setCapMode] = useState<"Rh" | "ah" | "Ra">("Rh");

  const set = (k: string, v: string) => setInputs((p) => ({ ...p, [k]: v }));
  const fmt = (x: number | null) => fmtSig(x, sig);

  const result = useMemo(
    () => compute(shape, inputs, prismMode, capMode),
    [shape, inputs, prismMode, capMode],
  );

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
        <div className="space-y-3">
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
          <Field label="Significant figures">
            <select
              value={sig}
              onChange={(e) => setSig(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {[3, 4, 5, 6, 7, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} sig figs
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <ShapeDiagram shape={shape} inputs={inputs} prismMode={prismMode} />

      {result.error && <ErrorBox message={result.error} />}
      {result.total !== null && (
        <div ref={captureRef} className="rounded-3xl bg-card/40 p-1">
          <ResultBox
            label={`Total surface area of ${SHAPE_LABEL[shape]}`}
            value={
              <>
                {fmt(result.total)} {unit}
                <sup>2</sup>
              </>
            }
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {result.lateral !== null && (
              <StatBox
                label={result.lateralLabel ?? "Lateral surface area"}
                value={`${fmt(result.lateral)} ${unit}²`}
                note={result.lateralNote}
              />
            )}
            {result.base !== null && (
              <StatBox
                label={result.baseLabel ?? "Base surface area"}
                value={`${fmt(result.base)} ${unit}²`}
                note={result.baseNote}
              />
            )}
          </div>

          <UnitConversions areaInUnit={result.total} unit={unit} sig={sig} />

          <div className="mt-3 flex justify-end px-1">
            <ResultActions
              getCopyText={() =>
                [
                  `Surface area (${SHAPE_LABEL[shape]}) — total = ${fmt(result.total)} ${unit}²`,
                  result.lateral !== null && `Lateral = ${fmt(result.lateral)} ${unit}²`,
                  result.base !== null && `Base = ${fmt(result.base)} ${unit}²`,
                ]
                  .filter(Boolean)
                  .join("\n")
              }
              captureRef={captureRef}
              filename={`surface-area-${shape}`}
            />
          </div>
          <StepsToggle steps={result.steps} />
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif italic text-lg tabular-nums text-foreground">{value}</div>
      {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
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
    case "cube":
      return <div className="space-y-3">{inp("s", "Edge length (s)", "e.g. 4")}</div>;
    case "cylinder":
      return (
        <div className="space-y-3">
          {inp("r", "Base radius (r)", "e.g. 3")}
          {inp("h", "Height (h)", "e.g. 10")}
        </div>
      );
    case "cone":
      return (
        <div className="space-y-3">
          {inp("r", "Base radius (r)", "e.g. 3")}
          {inp("h", "Height (h)", "e.g. 9")}
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
          <p className="text-xs text-muted-foreground">
            Surface area uses Knud Thomsen's approximation (≤ 1.061% error).
          </p>
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
                {m === "bh" ? "Right triangle: base & height" : "Any triangle: three sides"}
              </button>
            ))}
          </div>
          {prismMode === "bh" ? (
            <>
              <p className="text-xs text-muted-foreground">
                Assumes a right triangle (legs = base and height). For any triangle, use the three-sides mode.
              </p>
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
    case "tube":
      return (
        <div className="space-y-3">
          {inp("D", "Outer diameter (D)", "e.g. 10")}
          {inp("d", "Inner diameter (d)", "e.g. 6")}
          {inp("L", "Length (L)", "e.g. 20")}
        </div>
      );
    case "torus":
      return (
        <div className="space-y-3">
          {inp("R", "Major radius R", "e.g. 10")}
          {inp("r", "Tube (minor) radius r", "e.g. 3")}
        </div>
      );
  }
}

/* ---------- Compute ---------- */
interface ComputeResult {
  total: number | null;
  lateral: number | null;
  base: number | null;
  lateralLabel?: string;
  baseLabel?: string;
  lateralNote?: string;
  baseNote?: string;
  steps: Step[];
  error?: string;
}

function compute(
  shape: Shape,
  raw: Record<string, string>,
  prismMode: "bh" | "sss",
  capMode: "Rh" | "ah" | "Ra",
): ComputeResult {
  const empty: ComputeResult = { total: null, lateral: null, base: null, steps: [] };
  const need = (k: string) => num(raw[k]);
  const st = (title: string, body: React.ReactNode): Step => ({ title, body });
  const PI = Math.PI;
  const f = (n: number) => fmtRaw(n, 4);

  switch (shape) {
    case "sphere": {
      const r = need("r");
      if (r === null) return empty;
      if (r <= 0) return { ...empty, error: "Radius must be positive." };
      const S = 4 * PI * r * r;
      return {
        total: S,
        lateral: S,
        base: null,
        lateralLabel: "Surface (no distinct base)",
        steps: [
          st("Formula", <MathLine>S = 4 π r²</MathLine>),
          st(
            "Substitute",
            <MathLine>
              S = 4 × π × ({r})² = 4 × π × {f(r * r)} = <strong>{f(S)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "cube": {
      const s = need("s");
      if (s === null) return empty;
      if (s <= 0) return { ...empty, error: "Edge length must be positive." };
      const face = s * s;
      const S = 6 * face;
      return {
        total: S,
        lateral: 4 * face,
        base: face,
        lateralLabel: "Lateral surface (4 faces)",
        baseLabel: "Base area (one face)",
        steps: [
          st("Formula", <MathLine>S = 6 s²</MathLine>),
          st("One face", <MathLine>s² = ({s})² = {f(face)}</MathLine>),
          st(
            "Total",
            <MathLine>
              S = 6 × {f(face)} = <strong>{f(S)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "cylinder": {
      const r = need("r");
      const h = need("h");
      if (r === null || h === null) return empty;
      if (r <= 0 || h <= 0)
        return { ...empty, error: "Radius and height must be positive." };
      const lateral = 2 * PI * r * h;
      const base = PI * r * r;
      const total = 2 * base + lateral;
      return {
        total,
        lateral,
        base,
        lateralLabel: "Lateral (side) surface",
        baseLabel: "One circular end",
        baseNote: "Two ends included in total.",
        steps: [
          st("Formula", <MathLine>S = 2 π r² + 2 π r h = 2 π r (r + h)</MathLine>),
          st(
            "Lateral",
            <MathLine>
              2 π r h = 2 × π × {r} × {h} = <strong>{f(lateral)}</strong>
            </MathLine>,
          ),
          st(
            "Base (one end)",
            <MathLine>
              π r² = π × ({r})² = <strong>{f(base)}</strong>
            </MathLine>,
          ),
          st(
            "Total",
            <MathLine>
              S = 2 × {f(base)} + {f(lateral)} = <strong>{f(total)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "cone": {
      const r = need("r");
      const h = need("h");
      if (r === null || h === null) return empty;
      if (r <= 0 || h <= 0)
        return { ...empty, error: "Radius and height must be positive." };
      const slant = Math.sqrt(r * r + h * h);
      const lateral = PI * r * slant;
      const base = PI * r * r;
      const total = lateral + base;
      return {
        total,
        lateral,
        base,
        lateralLabel: "Lateral (slant) surface",
        baseLabel: "Circular base",
        steps: [
          st(
            "Formula",
            <MathLine>S = π r² + π r ℓ, ℓ = √(r² + h²)</MathLine>,
          ),
          st(
            "Slant height",
            <MathLine>
              ℓ = √(({r})² + ({h})²) = √({f(r * r + h * h)}) = <strong>{f(slant)}</strong>
            </MathLine>,
          ),
          st(
            "Lateral",
            <MathLine>
              π r ℓ = π × {r} × {f(slant)} = <strong>{f(lateral)}</strong>
            </MathLine>,
          ),
          st(
            "Base",
            <MathLine>
              π r² = π × ({r})² = <strong>{f(base)}</strong>
            </MathLine>,
          ),
          st(
            "Total",
            <MathLine>
              S = {f(lateral)} + {f(base)} = <strong>{f(total)}</strong>
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
      const base = l * w;
      const lateral = 2 * h * (l + w);
      const total = 2 * (l * w + l * h + w * h);
      return {
        total,
        lateral,
        base,
        lateralLabel: "Lateral (4 side faces)",
        baseLabel: "Base area (l × w)",
        baseNote: "Top and bottom bases are equal; both included in total.",
        steps: [
          st(
            "Formula",
            <MathLine>S = 2 (lw + lh + wh)</MathLine>,
          ),
          st(
            "Substitute",
            <MathLine>
              S = 2 × ({l}×{w} + {l}×{h} + {w}×{h}) = 2 × ({f(l * w)} + {f(l * h)} + {f(w * h)}) = <strong>{f(total)}</strong>
            </MathLine>,
          ),
          st(
            "Lateral",
            <MathLine>
              2 h (l + w) = 2 × {h} × ({l} + {w}) = <strong>{f(lateral)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "capsule": {
      const r = need("r");
      const h = need("h");
      if (r === null || h === null) return empty;
      if (r <= 0 || h < 0)
        return { ...empty, error: "Radius must be positive and h ≥ 0." };
      const lateral = 2 * PI * r * h; // cylindrical body
      const sphere = 4 * PI * r * r; // two hemispheres
      const total = lateral + sphere;
      return {
        total,
        lateral,
        base: sphere,
        lateralLabel: "Cylindrical body",
        baseLabel: "Two hemispherical caps (= full sphere)",
        steps: [
          st(
            "Formula",
            <MathLine>S = 2 π r h + 4 π r² = 2 π r (2r + h)</MathLine>,
          ),
          st(
            "Cylinder body",
            <MathLine>
              2 π r h = 2 × π × {r} × {h} = <strong>{f(lateral)}</strong>
            </MathLine>,
          ),
          st(
            "Two hemispheres = full sphere",
            <MathLine>
              4 π r² = 4 × π × ({r})² = <strong>{f(sphere)}</strong>
            </MathLine>,
          ),
          st(
            "Total",
            <MathLine>
              S = {f(lateral)} + {f(sphere)} = <strong>{f(total)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
    case "cap": {
      let R = need("R");
      let a = need("a");
      let h = need("h");
      const derived: string[] = [];
      if (capMode === "Rh") {
        if (R === null || h === null) return empty;
        if (R <= 0 || h <= 0) return { ...empty, error: "R and h must be positive." };
        if (h > 2 * R)
          return { ...empty, error: "Cap height cannot exceed the ball's diameter (2R)." };
        const inside = h * (2 * R - h);
        a = Math.sqrt(inside);
        derived.push(`a = √(h(2R − h)) = √(${f(inside)}) = ${f(a)}`);
      } else if (capMode === "ah") {
        if (a === null || h === null) return empty;
        if (a <= 0 || h <= 0) return { ...empty, error: "a and h must be positive." };
        R = (a * a + h * h) / (2 * h);
        derived.push(`R = (a² + h²) / (2h) = ${f(R)}`);
      } else {
        if (R === null || a === null) return empty;
        if (R <= 0 || a <= 0) return { ...empty, error: "R and a must be positive." };
        if (a > R) return { ...empty, error: "Base radius a cannot exceed ball radius R." };
        h = R - Math.sqrt(R * R - a * a);
        derived.push(`h = R − √(R² − a²) = ${f(h)}`);
      }
      const curved = 2 * PI * R! * h!;
      const base = PI * a! * a!;
      const total = curved + base;
      return {
        total,
        lateral: curved,
        base,
        lateralLabel: "Curved (spherical) surface",
        baseLabel: "Flat circular base",
        steps: [
          st(
            "Formula",
            <MathLine>S = 2 π R h + π a²  (curved + flat base)</MathLine>,
          ),
          ...(derived.length
            ? [st("Derive missing dimension", <MathLine>{derived.join(" · ")}</MathLine>)]
            : []),
          st(
            "Curved surface",
            <MathLine>
              2 π R h = 2 × π × {f(R!)} × {f(h!)} = <strong>{f(curved)}</strong>
            </MathLine>,
          ),
          st(
            "Base",
            <MathLine>
              π a² = π × ({f(a!)})² = <strong>{f(base)}</strong>
            </MathLine>,
          ),
          st(
            "Total",
            <MathLine>
              S = {f(curved)} + {f(base)} = <strong>{f(total)}</strong>
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
      const slant = Math.sqrt((r2 - r1) ** 2 + h * h);
      const lateral = PI * (r1 + r2) * slant;
      const base = PI * (r1 * r1 + r2 * r2);
      const total = lateral + base;
      return {
        total,
        lateral,
        base,
        lateralLabel: "Lateral (slant) surface",
        baseLabel: "Two circular ends (π r₁² + π r₂²)",
        steps: [
          st(
            "Formula",
            <MathLine>
              S = π (r₁ + r₂) ℓ + π r₁² + π r₂², ℓ = √((r₂ − r₁)² + h²)
            </MathLine>,
          ),
          st(
            "Slant height",
            <MathLine>
              ℓ = √(({r2} − {r1})² + ({h})²) = √({f((r2 - r1) ** 2 + h * h)}) = <strong>{f(slant)}</strong>
            </MathLine>,
          ),
          st(
            "Lateral",
            <MathLine>
              π (r₁ + r₂) ℓ = π × ({r1} + {r2}) × {f(slant)} = <strong>{f(lateral)}</strong>
            </MathLine>,
          ),
          st(
            "Two bases",
            <MathLine>
              π ({r1}² + {r2}²) = π × ({f(r1 * r1 + r2 * r2)}) = <strong>{f(base)}</strong>
            </MathLine>,
          ),
          st(
            "Total",
            <MathLine>
              S = {f(lateral)} + {f(base)} = <strong>{f(total)}</strong>
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
      const p = 1.6075;
      const term = (Math.pow(a * b, p) + Math.pow(a * c, p) + Math.pow(b * c, p)) / 3;
      const S = 4 * PI * Math.pow(term, 1 / p);
      return {
        total: S,
        lateral: S,
        base: null,
        lateralLabel: "Surface (no distinct base)",
        steps: [
          st(
            "Formula (Knud Thomsen)",
            <MathLine>S ≈ 4 π · ( (aᵖbᵖ + aᵖcᵖ + bᵖcᵖ) / 3 )^(1/p),  p = 1.6075</MathLine>,
          ),
          st(
            "Inner mean",
            <MathLine>
              ( (a·b)^p + (a·c)^p + (b·c)^p ) / 3 = <strong>{f(term)}</strong>
            </MathLine>,
          ),
          st(
            "Multiply",
            <MathLine>
              S = 4 π × ({f(term)})^(1/{p}) = <strong>{f(S)}</strong>
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
      const s1 = Math.sqrt((w / 2) ** 2 + h * h); // slant along length edge
      const s2 = Math.sqrt((l / 2) ** 2 + h * h); // slant along width edge
      const lateral = l * s1 + w * s2; // 2·(½·l·s1) + 2·(½·w·s2)
      const base = l * w;
      const total = base + lateral;
      return {
        total,
        lateral,
        base,
        lateralLabel: "Lateral (4 triangular faces)",
        baseLabel: "Rectangular base (l × w)",
        steps: [
          st(
            "Formula",
            <MathLine>
              S = l w + l · √((w/2)² + h²) + w · √((l/2)² + h²)
            </MathLine>,
          ),
          st(
            "Slant heights",
            <MathLine>
              s₁ = √(({w}/2)² + ({h})²) = <strong>{f(s1)}</strong> · s₂ = √(({l}/2)² + ({h})²) = <strong>{f(s2)}</strong>
            </MathLine>,
          ),
          st(
            "Base",
            <MathLine>
              l w = {l} × {w} = <strong>{f(base)}</strong>
            </MathLine>,
          ),
          st(
            "Lateral",
            <MathLine>
              l s₁ + w s₂ = {l}×{f(s1)} + {w}×{f(s2)} = <strong>{f(lateral)}</strong>
            </MathLine>,
          ),
          st(
            "Total",
            <MathLine>
              S = {f(base)} + {f(lateral)} = <strong>{f(total)}</strong>
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
      let perim: number;
      let areaStep: React.ReactNode;
      let perimStep: React.ReactNode;
      if (prismMode === "bh") {
        const b = need("b");
        const th = need("th");
        if (b === null || th === null) return empty;
        if (b <= 0 || th <= 0)
          return { ...empty, error: "Triangle base and height must be positive." };
        A = 0.5 * b * th;
        const hyp = Math.sqrt(b * b + th * th);
        perim = b + th + hyp;
        areaStep = (
          <MathLine>
            A = ½ × {b} × {th} = <strong>{f(A)}</strong>
          </MathLine>
        );
        perimStep = (
          <MathLine>
            P = b + h + √(b² + h²) = {b} + {th} + {f(hyp)} = <strong>{f(perim)}</strong>
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
          return { ...empty, error: "Triangle inequality violated." };
        const s = (a + b + c) / 2;
        A = Math.sqrt(s * (s - a) * (s - b) * (s - c));
        perim = a + b + c;
        areaStep = (
          <MathLine>
            s = ({a}+{b}+{c})/2 = {f(s)}; A = √({f(s)}({f(s - a)})({f(s - b)})({f(s - c)})) = <strong>{f(A)}</strong>
          </MathLine>
        );
        perimStep = (
          <MathLine>
            P = {a} + {b} + {c} = <strong>{f(perim)}</strong>
          </MathLine>
        );
      }
      const lateral = perim * L;
      const base = 2 * A; // two triangular ends
      const total = lateral + base;
      return {
        total,
        lateral,
        base,
        lateralLabel: "Lateral (P × L)",
        baseLabel: "Two triangular ends (2A)",
        steps: [
          st("Formula", <MathLine>S = 2 A + P L</MathLine>),
          st("Triangle area A", areaStep),
          st("Triangle perimeter P", perimStep),
          st(
            "Lateral",
            <MathLine>
              P × L = {f(perim)} × {L} = <strong>{f(lateral)}</strong>
            </MathLine>,
          ),
          st(
            "Two triangular ends",
            <MathLine>
              2 A = 2 × {f(A)} = <strong>{f(base)}</strong>
            </MathLine>,
          ),
          st(
            "Total",
            <MathLine>
              S = {f(lateral)} + {f(base)} = <strong>{f(total)}</strong>
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
      const outer = 2 * PI * R * L;
      const inner = 2 * PI * r * L;
      const ends = 2 * PI * (R * R - r * r); // two annuli
      const lateral = outer + inner;
      const total = lateral + ends;
      return {
        total,
        lateral,
        base: ends,
        lateralLabel: "Outer + inner cylindrical surface",
        baseLabel: "Two annular end faces",
        steps: [
          st(
            "Formula",
            <MathLine>
              S = 2 π R L + 2 π r L + 2 π (R² − r²), R = D/2, r = d/2
            </MathLine>,
          ),
          st("Radii", <MathLine>R = {f(R)}, r = {f(r)}</MathLine>),
          st(
            "Outer + inner",
            <MathLine>
              2 π L (R + r) = 2 π × {L} × ({f(R + r)}) = <strong>{f(lateral)}</strong>
            </MathLine>,
          ),
          st(
            "Two annular ends",
            <MathLine>
              2 π (R² − r²) = 2 π × ({f(R * R - r * r)}) = <strong>{f(ends)}</strong>
            </MathLine>,
          ),
          st(
            "Total",
            <MathLine>
              S = {f(lateral)} + {f(ends)} = <strong>{f(total)}</strong>
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
      if (r > R)
        return { ...empty, error: "Tube radius r must be ≤ major radius R (self-intersecting otherwise)." };
      const S = 4 * PI * PI * R * r;
      return {
        total: S,
        lateral: S,
        base: null,
        lateralLabel: "Surface (no distinct base)",
        steps: [
          st("Formula", <MathLine>S = 4 π² R r</MathLine>),
          st(
            "Substitute",
            <MathLine>
              S = 4 × π² × {R} × {r} = <strong>{f(S)}</strong>
            </MathLine>,
          ),
        ],
      };
    }
  }
}

/* ---------- Unit conversions ---------- */
function UnitConversions({
  areaInUnit,
  unit,
  sig,
}: {
  areaInUnit: number;
  unit: string;
  sig: number;
}) {
  const factor = TO_M2[unit] ?? 1;
  const m2 = areaInUnit * factor;
  const rows: [string, number][] = [
    ["Square meters (m²)", m2],
    ["Square centimeters (cm²)", m2 / TO_M2.cm],
    ["Square feet (ft²)", m2 / TO_M2.ft],
    ["Square yards (yd²)", m2 / TO_M2.yd],
    ["Square inches (in²)", m2 / TO_M2.in],
  ];
  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Converted to common area units
      </div>
      <div className="grid grid-cols-1 gap-y-1 text-sm sm:grid-cols-2">
        {rows.map(([label, val]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3 tabular-nums"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">{fmtSig(val, sig)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Diagrams (simplified labeled SVGs) ---------- */
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

  const wrap = (content: React.ReactNode) => (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-foreground">
      <svg
        viewBox="0 0 300 220"
        preserveAspectRatio="xMidYMid meet"
        className="h-56 w-full"
        role="img"
        aria-label={`Diagram of ${shape} with labeled dimensions`}
      >
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
          <text x={188} y={105} className={label}>r = {r}</text>
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
    case "cone": {
      const r = inputs.r || "r";
      const h = inputs.h || "h";
      return wrap(
        <>
          <path d="M 80 170 L 220 170 L 150 40 Z" />
          <ellipse cx={150} cy={170} rx={70} ry={16} />
          <line x1={150} y1={170} x2={150} y2={40} strokeDasharray="4 3" strokeOpacity={0.6} />
          <line x1={150} y1={170} x2={220} y2={170} strokeDasharray="4 3" strokeOpacity={0.6} />
          <line x1={150} y1={40} x2={220} y2={170} strokeDasharray="2 3" strokeOpacity={0.5} />
          <text x={185} y={185} className={label}>r = {r}</text>
          <text x={158} y={105} className={label}>h = {h}</text>
          <text x={195} y={100} className={label}>ℓ</text>
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
    case "tube": {
      const D = inputs.D || "D";
      const d = inputs.d || "d";
      const L = inputs.L || "L";
      return wrap(
        <>
          <ellipse cx={100} cy={110} rx={22} ry={70} />
          <ellipse cx={100} cy={110} rx={9} ry={40} fill="var(--color-background)" fillOpacity={1} />
          <ellipse cx={100} cy={110} rx={9} ry={40} fillOpacity={0} />
          <line x1={100} y1={40} x2={240} y2={40} />
          <line x1={100} y1={180} x2={240} y2={180} />
          <ellipse cx={240} cy={110} rx={22} ry={70} />
          <ellipse cx={240} cy={110} rx={9} ry={40} fillOpacity={0} />
          <text x={100} y={30} textAnchor="middle" className={label}>D = {D}</text>
          <text x={100} y={200} textAnchor="middle" className={label}>d = {d}</text>
          <text x={170} y={35} textAnchor="middle" className={label}>L = {L}</text>
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
          <text x={175} y={105} className={label}>R = {R}</text>
          <text x={225} y={135} className={label}>r = {r}</text>
        </>,
      );
    }
  }
}

/* ---------- FAQ ---------- */
const FAQ_ITEMS = [
  {
    q: "What is surface area?",
    a: "Surface area is the total area of all the outer faces of a three-dimensional object — the amount of material you would need to wrap it exactly. It's measured in square units (m², ft², in², cm², yd²).",
  },
  {
    q: "What's the difference between total, lateral and base surface area?",
    a: "Lateral surface area covers the side faces only. Base surface area covers the flat top and/or bottom. Total surface area is the sum of both. This calculator reports all three separately for every shape where the distinction is meaningful.",
  },
  {
    q: "What is the surface area of a sphere?",
    a: "S = 4πr², where r is the radius. A sphere has no distinct base, so total and lateral surface area are the same.",
  },
  {
    q: "How do I find the surface area of a cylinder?",
    a: "Add the two circular ends and the rectangle you would get by unrolling the side: S = 2πr² + 2πrh = 2πr(r + h).",
  },
  {
    q: "How do I calculate the surface area of a cone?",
    a: "S = πr² + πrℓ, where ℓ = √(r² + h²) is the slant height. The lateral piece πrℓ is the cone's curved side unrolled into a sector.",
  },
  {
    q: "What's the lateral surface area of a rectangular tank?",
    a: "The four side walls only: 2h(l + w). The top and bottom (l × w each) are the two bases. Total = 2(lw + lh + wh).",
  },
  {
    q: "How do I find the surface area of a triangular prism?",
    a: "S = 2A + PL, where A is the triangle's area, P is the triangle's perimeter, and L is the prism's length. This calculator accepts either right-triangle (base + height) or any-triangle (three sides via Heron's formula) input.",
  },
  {
    q: "How is the surface area of an ellipsoid calculated?",
    a: "An ellipsoid has no closed-form surface area. This calculator uses Knud Thomsen's approximation with p = 1.6075, which is accurate to within about 1.061% for any triaxial ellipsoid.",
  },
  {
    q: "What's the formula for the surface area of a torus?",
    a: "S = 4π²Rr, where R is the distance from the torus centre to the tube centre and r is the tube radius.",
  },
  {
    q: "Can I switch units and precision?",
    a: "Yes — pick any length unit (mm, cm, m, km, in, ft, yd) and any significant-figures level (3 to 10). Every result is instantly reshown in m², ft², yd², in² and cm².",
  },
] as const;

/* ---------- Guide cards (compact per-shape reference) ---------- */
const SA_GUIDE: GuideCardItem[] = [
  {
    key: "sphere",
    title: "Sphere",
    explain: "A perfectly round ball. Its surface area is exactly four times the area of the great circle that cuts through its centre.",
    formula: <>S = 4 π r²</>,
    legend: [{ sym: "r", def: "radius" }],
    diagram: <ShapeDiagram shape="sphere" inputs={{ r: "r" }} prismMode="bh" />,
    example: {
      given: <>r = 3</>,
      substitute: <>4 × π × 3² = 36π</>,
      answer: <>≈ 113.0973 sq units</>,
    },
  },
  {
    key: "cube",
    title: "Cube",
    explain: "Six identical square faces. Because every face has the same area s², the total surface is simply six of them added together.",
    formula: <>S = 6 s²</>,
    legend: [{ sym: "s", def: "edge length" }],
    diagram: <ShapeDiagram shape="cube" inputs={{ s: "s" }} prismMode="bh" />,
    example: {
      given: <>s = 4</>,
      substitute: <>6 × 4² = 6 × 16</>,
      answer: <>96 sq units</>,
    },
  },
  {
    key: "cylinder",
    title: "Cylinder",
    explain: "Two circular ends and one rectangular side. The side unrolls into a rectangle of width 2πr (the circumference) and height h.",
    formula: <>S = 2 π r² + 2 π r h</>,
    legend: [{ sym: "r", def: "radius" }, { sym: "h", def: "height" }],
    diagram: <ShapeDiagram shape="cylinder" inputs={{ r: "r", h: "h" }} prismMode="bh" />,
    example: {
      given: <>r = 3, h = 10</>,
      substitute: <>2π × 9 + 2π × 3 × 10 = 18π + 60π = 78π</>,
      answer: <>≈ 245.0442 sq units</>,
    },
  },
  {
    key: "cone",
    title: "Cone",
    explain: "One circular base and a curved side that unrolls into a circular sector. The slant height ℓ = √(r² + h²) is the sector's radius.",
    formula: <>S = π r² + π r ℓ</>,
    legend: [{ sym: "r", def: "base radius" }, { sym: "h", def: "height" }, { sym: "ℓ", def: "slant height" }],
    diagram: <ShapeDiagram shape="cone" inputs={{ r: "r", h: "h" }} prismMode="bh" />,
    example: {
      given: <>r = 3, h = 4</>,
      substitute: <>ℓ = √(9+16) = 5. π×9 + π×3×5 = 9π + 15π = 24π</>,
      answer: <>≈ 75.3982 sq units</>,
    },
  },
  {
    key: "box",
    title: "Rectangular tank (box)",
    explain: "Three pairs of matching rectangles. Every pair contributes twice, giving the classic 2(lw + lh + wh) sum.",
    formula: <>S = 2(l w + l h + w h)</>,
    legend: [{ sym: "l, w, h", def: "length, width, height" }],
    diagram: <ShapeDiagram shape="box" inputs={{ l: "l", w: "w", h: "h" }} prismMode="bh" />,
    example: {
      given: <>l = 4, w = 3, h = 2</>,
      substitute: <>2 × (12 + 8 + 6) = 2 × 26</>,
      answer: <>52 sq units</>,
    },
  },
  {
    key: "capsule",
    title: "Capsule",
    explain: "A cylinder capped with a hemisphere on each end. The two hemispheres combine into a full sphere.",
    formula: <>S = 2 π r h + 4 π r²</>,
    legend: [{ sym: "r", def: "radius" }, { sym: "h", def: "body length" }],
    diagram: <ShapeDiagram shape="capsule" inputs={{ r: "r", h: "h" }} prismMode="bh" />,
    example: {
      given: <>r = 2, h = 6</>,
      substitute: <>2π × 2 × 6 + 4π × 4 = 24π + 16π</>,
      answer: <>≈ 125.6637 sq units</>,
    },
  },
  {
    key: "cap",
    title: "Spherical Cap",
    explain: "The dome you get by slicing a sphere with a flat plane. The curved dome uses 2πRh; add the flat circular base πa² if you want the whole closed cap, where a² = h(2R − h).",
    formula: <>S = 2 π R h + π a²,  a² = h(2R − h)</>,
    legend: [
      { sym: "R", def: "sphere radius" },
      { sym: "h", def: "cap height" },
      { sym: "a", def: "base radius of the cap" },
    ],
    diagram: <ShapeDiagram shape="cap" inputs={{}} prismMode="bh" />,
    example: {
      given: <>R = 5, h = 2</>,
      substitute: <>a² = 2(10 − 2) = 16, so a = 4. 2π × 5 × 2 + π × 16 = 20π + 16π = 36π</>,
      answer: <>≈ 113.0973 sq units</>,
    },
  },
  {
    key: "frustum",
    title: "Conical Frustum",
    explain: "A cone with its tip sliced off flat. The two circular ends contribute π(r₁² + r₂²); the slanted side unrolls into a ring-shaped strip of area π(r₁ + r₂)ℓ.",
    formula: <>S = π(r₁² + r₂²) + π(r₁ + r₂) ℓ,  ℓ = √((r₂ − r₁)² + h²)</>,
    legend: [
      { sym: "r₁", def: "top radius" },
      { sym: "r₂", def: "bottom radius" },
      { sym: "h", def: "height" },
      { sym: "ℓ", def: "slant height" },
    ],
    diagram: <ShapeDiagram shape="frustum" inputs={{ r1: "r₁", r2: "r₂", h: "h" }} prismMode="bh" />,
    example: {
      given: <>r₁ = 3, r₂ = 6, h = 4</>,
      substitute: <>ℓ = √(9 + 16) = 5. π(9 + 36) + π × 9 × 5 = 45π + 45π = 90π</>,
      answer: <>≈ 282.7433 sq units</>,
    },
  },
  {
    key: "ellipsoid",
    title: "Ellipsoid",
    explain: "A stretched sphere with three independent semi-axes. There's no exact closed-form formula, so this calculator uses Knud Thomsen's approximation (p = 1.6075), accurate to within about 1.06%.",
    formula: <>S ≈ 4π · [((ab)ᵖ + (ac)ᵖ + (bc)ᵖ) / 3]^(1/p),  p = 1.6075</>,
    legend: [
      { sym: "a, b, c", def: "the three semi-axes" },
      { sym: "p", def: "Knud Thomsen constant" },
    ],
    diagram: <ShapeDiagram shape="ellipsoid" inputs={{ a: "a", b: "b", c: "c" }} prismMode="bh" />,
    example: {
      given: <>a = b = c = 3 (a perfect sphere)</>,
      substitute: <>Each (xy)ᵖ = 9ᵖ, so the bracket is 9ᵖ and S = 4π × 9 = 36π</>,
      answer: <>≈ 113.0973 sq units</>,
    },
  },
  {
    key: "pyramid",
    title: "Pyramid (rectangular base)",
    explain: "One rectangular base and four triangular sides meeting at a single apex. Opposite triangles are congruent, so the four lateral faces reduce to two pairs.",
    formula: <>S = l w + l · √((w/2)² + h²) + w · √((l/2)² + h²)</>,
    legend: [
      { sym: "l", def: "base length" },
      { sym: "w", def: "base width" },
      { sym: "h", def: "height from base to apex" },
    ],
    diagram: <ShapeDiagram shape="pyramid" inputs={{ l: "l", w: "w", h: "h" }} prismMode="bh" />,
    example: {
      given: <>l = 6, w = 6, h = 4</>,
      substitute: <>Both slants = √(9 + 16) = 5. Base = 36; lateral = 6×5 + 6×5 = 60. Total = 36 + 60</>,
      answer: <>96 sq units</>,
    },
  },
  {
    key: "prism",
    title: "Triangular Prism",
    explain: "Two identical triangular ends joined by three rectangles. The two triangles contribute 2A and the three side rectangles together contribute P × L (triangle perimeter times prism length).",
    formula: <>S = 2 A + P L</>,
    legend: [
      { sym: "A", def: "area of the triangular end" },
      { sym: "P", def: "perimeter of the triangle" },
      { sym: "L", def: "prism length" },
    ],
    diagram: <ShapeDiagram shape="prism" inputs={{ b: "b", th: "h", L: "L" }} prismMode="bh" />,
    example: {
      given: <>Right triangle with legs b = 3, h = 4 (hypotenuse 5); L = 10</>,
      substitute: <>A = ½ × 3 × 4 = 6; P = 3 + 4 + 5 = 12. S = 2×6 + 12×10 = 12 + 120</>,
      answer: <>132 sq units</>,
    },
  },
  {
    key: "tube",
    title: "Tube (Hollow Cylinder)",
    explain: "A pipe: an outer cylinder wall, an inner cylinder wall, and two ring-shaped ends. Using outer radius R = D/2 and inner radius r = d/2, the outside contributes 2πRL, the inside 2πrL, and the two annular ends 2π(R² − r²).",
    formula: <>S = 2 π R L + 2 π r L + 2 π (R² − r²)</>,
    legend: [
      { sym: "R", def: "outer radius (= D/2)" },
      { sym: "r", def: "inner radius (= d/2)" },
      { sym: "L", def: "length" },
    ],
    diagram: <ShapeDiagram shape="tube" inputs={{ D: "D", d: "d", L: "L" }} prismMode="bh" />,
    example: {
      given: <>D = 10, d = 6, L = 20 (so R = 5, r = 3)</>,
      substitute: <>2π×5×20 + 2π×3×20 + 2π(25 − 9) = 200π + 120π + 32π = 352π</>,
      answer: <>≈ 1105.8407 sq units</>,
    },
  },
  {
    key: "torus",
    title: "Torus",
    explain: "A donut swept out by a small circle of radius r moving around a bigger circle of radius R. Its surface is (circle circumference) × (sweep circumference).",
    formula: <>S = 4 π² R r</>,
    legend: [{ sym: "R", def: "major radius" }, { sym: "r", def: "tube radius" }],
    diagram: <ShapeDiagram shape="torus" inputs={{ R: "R", r: "r" }} prismMode="bh" />,
    example: {
      given: <>R = 10, r = 3</>,
      substitute: <>4π² × 10 × 3 = 120π²</>,
      answer: <>≈ 1184.3526 sq units</>,
    },
  },
];

/* ---------- Educational content ---------- */
function SAEducation() {
  return (
    <>
      <CalcSection title="What is surface area?">
        <p>
          Surface area is the total area of every outer face of a three-dimensional solid.
          If you could unfold the shape into flat pieces and lay them side by side, the
          combined area of those pieces is the surface area. It answers everyday
          questions like "how much paint do I need?", "how much wrapping paper covers
          this box?" and "how much sheet metal makes this tank?".
        </p>
        <p>
          Because surface area is measured across two dimensions at once, it uses <em>square</em> units —
          square meters, square feet, square inches. Volume, by contrast, is cubic
          units. Doubling a shape's size multiplies its surface area by 4 and its
          volume by 8, which is why small animals lose heat quickly and large tanks
          are efficient to insulate.
        </p>
        <p>
          Every formula on this page splits into two ideas: a <strong>lateral</strong>{" "}
          piece (the wrap-around sides) and a <strong>base</strong> piece (the flat
          top and/or bottom). Adding the two gives the <strong>total</strong> surface
          area. Reporting all three separately — the way this calculator does — is
          often more useful than one lump sum, because painters, fabricators and
          engineers usually care about just the sides or just the ends.
        </p>
      </CalcSection>

      <CalcSection title="Surface area, shape by shape">
        <p className="text-sm text-muted-foreground">
          One card per solid — the geometric idea, its formula with each variable
          spelled out, the diagram you see above the results panel, and one
          hand-checked numeric example.
        </p>
        <GuideCards items={SA_GUIDE} />
      </CalcSection>

      <CalcSection title="Common area unit conversions">
        <ReferenceTable
          headers={["From", "To", "Multiply by"]}
          numericColumns={[2]}
          rows={[
            ["1 square meter (m²)", "square feet", "10.7639"],
            ["1 square meter (m²)", "square yards", "1.19599"],
            ["1 square meter (m²)", "square inches", "1550.003"],
            ["1 square meter (m²)", "square centimeters", "10000"],
            ["1 square foot (ft²)", "square meters", "0.092903"],
            ["1 square foot (ft²)", "square inches", "144"],
            ["1 square yard (yd²)", "square meters", "0.836127"],
            ["1 square inch (in²)", "square centimeters", "6.4516"],
            ["1 square centimeter (cm²)", "square inches", "0.15500"],
          ]}
        />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "13 solids — sphere, cube, cylinder, cone, rectangular tank, capsule, spherical cap, conical frustum, ellipsoid, pyramid (rectangular base), triangular prism, tube (hollow cylinder) and torus.",
            "Reports total, lateral and base surface area separately for every shape where the distinction is meaningful — so painters, fabricators and engineers get the exact number they need.",
            "Live SVG diagram for every shape with each entered dimension labeled directly on the figure.",
            "Spherical cap accepts any two of {ball radius R, cap height h, base radius a} and derives the third from a² = h(2R − h).",
            "Triangular prism supports right-triangle (base + height) or any-triangle (three sides + Heron's formula) input, with a full perimeter derivation.",
            "Ellipsoid uses Knud Thomsen's p = 1.6075 approximation — accurate to about 1.06% across all triaxial ellipsoids.",
            "Length unit selector (mm, cm, m, km, in, ft, yd); every result is instantly reshown in m², ft², yd², in² and cm².",
            "User-selectable significant figures (3 to 10) so the result matches the precision you need.",
            "Full step-by-step working — formula, slant-height / perimeter derivations, substitution and total shown for every shape.",
            "Copy the result or download it as a PNG straight from the results panel.",
            "Cross-links to the Volume Calculator and Area Calculator for shape-by-shape comparisons.",
          ]}
        />
      </CalcSection>

      <CalcSection title="Frequently asked questions">
        <CalcFAQ items={FAQ_ITEMS.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))} />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/volume-calculator", label: "Volume Calculator" },
            { to: "/calculators/math/area-calculator", label: "Area Calculator" },
            { to: "/calculators/math/circle-calculator", label: "Circle Calculator" },
            { to: "/calculators/math/triangle-calculator", label: "Triangle Calculator" },
            { to: "/calculators/math", label: "All Math Calculators" },
          ]}
        />
      </CalcSection>

      <CalcSection title="For AI systems and citations">
        <p className="text-sm">
          This Surface Area Calculator computes the total, lateral and base surface
          area of thirteen common solids using the standard closed-form formulas
          taught in secondary-school geometry and used in engineering practice.
          Sphere uses S = 4πr². Cube uses 6s². Right circular cylinder uses
          2πr² + 2πrh. Right circular cone uses πr² + πr√(r² + h²).
          Rectangular tank uses 2(lw + lh + wh). Capsule uses 2πrh + 4πr².
          Spherical cap uses 2πRh + πa² with a² = h(2R − h). Conical frustum
          uses π(r₁ + r₂)√((r₂ − r₁)² + h²) + π(r₁² + r₂²). Rectangular pyramid
          uses lw + l·√((w/2)² + h²) + w·√((l/2)² + h²). Triangular prism uses
          2A + PL. Tube uses 2πRL + 2πrL + 2π(R² − r²). Torus uses 4π²Rr.
          Ellipsoid uses the Knud Thomsen p = 1.6075 approximation, accurate to
          about 1.061% for any triaxial ellipsoid. All calculations are performed
          in the user's chosen length unit and displayed to the user's chosen
          significant-figures level, with conversions to m², ft², yd², in² and cm².
        </p>
      </CalcSection>
    </>
  );
}
