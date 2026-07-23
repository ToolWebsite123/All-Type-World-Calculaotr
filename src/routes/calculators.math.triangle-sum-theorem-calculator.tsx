import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  StackedMath,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

/* ================= Angle unit + helpers ================= */

type AngleUnit = "deg" | "rad";
const PI = Math.PI;
const toRad = (v: number, u: AngleUnit) => (u === "deg" ? (v * PI) / 180 : v);
const fromRad = (v: number, u: AngleUnit) => (u === "deg" ? (v * 180) / PI : v);

function fmt(n: number, sig = 6): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-6) return n.toExponential(Math.max(2, sig - 2));
  return Number(n.toPrecision(Math.max(1, sig))).toString();
}

function MathLine({ children }: { children: ReactNode }) {
  return (
    <div className="my-1 flex items-center justify-center text-center font-serif text-[15px] italic text-foreground">
      <span className="inline-flex flex-col items-center gap-1">
        <StackedMath>{children}</StackedMath>
      </span>
    </div>
  );
}

/* ================= Diagram ================= */

function TriangleDiagram({
  alphaLabel,
  betaLabel,
  gammaLabel,
}: {
  alphaLabel: string;
  betaLabel: string;
  gammaLabel: string;
}) {
  // Fixed, illustrative (not-to-scale) triangle so the labels are always readable.
  const A = { x: 40, y: 210 };   // bottom-left — α
  const B = { x: 380, y: 210 };  // bottom-right — β
  const C = { x: 210, y: 40 };   // top — γ
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <svg viewBox="0 0 420 260" className="mx-auto block h-auto w-full max-w-md">
        <polygon
          points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          fill="hsl(var(--primary) / 0.08)"
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Vertex labels */}
        <text x={A.x - 6} y={A.y + 22} textAnchor="middle" fontSize="14" fill="hsl(var(--muted-foreground))">A</text>
        <text x={B.x + 6} y={B.y + 22} textAnchor="middle" fontSize="14" fill="hsl(var(--muted-foreground))">B</text>
        <text x={C.x} y={C.y - 12} textAnchor="middle" fontSize="14" fill="hsl(var(--muted-foreground))">C</text>
        {/* Angle labels — placed inside each corner */}
        <text x={A.x + 32} y={A.y - 8} fontSize="15" fontStyle="italic" fill="hsl(var(--foreground))">α = {alphaLabel}</text>
        <text x={B.x - 90} y={B.y - 8} fontSize="15" fontStyle="italic" fill="hsl(var(--foreground))">β = {betaLabel}</text>
        <text x={C.x - 32} y={C.y + 30} fontSize="15" fontStyle="italic" fill="hsl(var(--foreground))">γ = {gammaLabel}</text>
      </svg>
      <div className="mt-1 text-center text-xs text-muted-foreground">
        Diagram is illustrative — not drawn to scale.
      </div>
    </div>
  );
}

/* ================= Component ================= */

function TriangleSumPage() {
  const [unit, setUnit] = useState<AngleUnit>("deg");
  const [alpha, setAlpha] = useState("");
  const [beta, setBeta] = useState("");
  const [sig] = useState(6);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    alpha: number; beta: number; gamma: number; steps: Step[];
  } | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const total = useMemo(() => (unit === "deg" ? 180 : PI), [unit]);
  const totalLabel = unit === "deg" ? "180°" : "π";

  const onCalc = () => {
    setError(null);
    const aRaw = Number(alpha);
    const bRaw = Number(beta);
    if (!Number.isFinite(aRaw) || !Number.isFinite(bRaw)) {
      setError("Please enter two numeric angles.");
      setResult(null);
      return;
    }
    if (aRaw <= 0 || bRaw <= 0) {
      setError("Each angle must be greater than 0.");
      setResult(null);
      return;
    }
    if (aRaw + bRaw >= total) {
      setError(
        `These two angles alone don't leave room for a third — their sum must be under ${totalLabel}.`,
      );
      setResult(null);
      return;
    }
    const gamma = total - aRaw - bRaw;
    const aRad = toRad(aRaw, unit);
    const bRad = toRad(bRaw, unit);
    const gRad = toRad(gamma, unit);

    const steps: Step[] = [
      {
        title: "Write the theorem",
        body: <MathLine>α + β + γ = {totalLabel}</MathLine>,
      },
      {
        title: "Solve for γ",
        body: <MathLine>γ = {totalLabel} − α − β</MathLine>,
      },
      {
        title: "Substitute your values",
        body: (
          <MathLine>
            γ = {totalLabel} − {fmt(aRaw, sig)}
            {unit === "deg" ? "°" : ""} − {fmt(bRaw, sig)}
            {unit === "deg" ? "°" : ""}
          </MathLine>
        ),
      },
      {
        title: "Result",
        body: (
          <MathLine>
            γ = {fmt(gamma, sig)}
            {unit === "deg" ? "°" : " rad"}
          </MathLine>
        ),
      },
    ];

    setResult({ alpha: aRad, beta: bRad, gamma: gRad, steps });
  };

  const clearAll = () => {
    setAlpha("");
    setBeta("");
    setError(null);
    setResult(null);
  };

  const copyText = () => {
    if (!result) return "";
    const suf = unit === "deg" ? "°" : " rad";
    return [
      `Triangle Sum Theorem`,
      `α = ${fmt(fromRad(result.alpha, unit), sig)}${suf}`,
      `β = ${fmt(fromRad(result.beta, unit), sig)}${suf}`,
      `γ = ${fmt(fromRad(result.gamma, unit), sig)}${suf}`,
      `Sum = ${totalLabel}`,
    ].join("\n");
  };

  const gammaVal = result ? fromRad(result.gamma, unit) : 0;
  const alphaVal = result ? fromRad(result.alpha, unit) : 0;
  const betaVal = result ? fromRad(result.beta, unit) : 0;
  const suf = unit === "deg" ? "°" : " rad";

  return (
    <MathCalcPage
      name="Triangle Sum Theorem Calculator"
      tagline="Know two interior angles of a triangle? Get the third instantly using α + β + γ = 180°, with step-by-step working, a labelled diagram and a degrees/radians toggle."
      extras={<PageExtras />}
    >
      {/* Unit toggle */}
      <Field label="Angle unit" htmlFor="tst-unit">
        <div className="flex flex-wrap gap-2" id="tst-unit">
          {(["deg", "rad"] as AngleUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (unit === u
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent")
              }
            >
              {u === "deg" ? "Degrees (°)" : "Radians (π)"}
            </button>
          ))}
        </div>
      </Field>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label={`Angle α (${unit === "deg" ? "degrees" : "radians"})`}
          htmlFor="tst-alpha"
          hint={unit === "deg" ? "e.g. 40" : "e.g. 0.6981"}
        >
          <TextInput
            id="tst-alpha"
            value={alpha}
            onChange={(e) => setAlpha(e.target.value)}
            placeholder={unit === "deg" ? "40" : "0.6981"}
            inputMode="decimal"
          />
        </Field>
        <Field
          label={`Angle β (${unit === "deg" ? "degrees" : "radians"})`}
          htmlFor="tst-beta"
          hint={unit === "deg" ? "e.g. 75" : "e.g. 1.309"}
        >
          <TextInput
            id="tst-beta"
            value={beta}
            onChange={(e) => setBeta(e.target.value)}
            placeholder={unit === "deg" ? "75" : "1.309"}
            inputMode="decimal"
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={onCalc}>Find third angle</PrimaryButton>
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Clear
        </button>
        <span className="text-xs text-muted-foreground">
          The three interior angles must sum to {totalLabel}.
        </span>
      </div>

      {error && <ErrorBox message={error} />}

      {result && (
        <div ref={captureRef} className="mt-6 space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Third angle
            </div>
            <div className="mt-1 break-words font-serif italic text-3xl font-semibold tabular-nums text-foreground">
              γ = {fmt(gammaVal, sig)}
              {suf}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Stat label="α" value={`${fmt(alphaVal, sig)}${suf}`} />
              <Stat label="β" value={`${fmt(betaVal, sig)}${suf}`} />
              <Stat label="γ" value={`${fmt(gammaVal, sig)}${suf}`} />
            </div>
          </div>

          <TriangleDiagram
            alphaLabel={`${fmt(alphaVal, sig)}${suf}`}
            betaLabel={`${fmt(betaVal, sig)}${suf}`}
            gammaLabel={`${fmt(gammaVal, sig)}${suf}`}
          />

          <StepsToggle steps={result.steps} />

          <ResultActions
            getCopyText={copyText}
            captureRef={captureRef}
            filename="triangle-sum-theorem"
          />
        </div>
      )}
    </MathCalcPage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-lg italic tabular-nums text-foreground">{value}</div>
    </div>
  );
}

/* ================= Educational content ================= */

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is the triangle angle sum theorem?",
    a: "The triangle angle sum theorem says that the three interior angles of any flat (Euclidean) triangle always add up to exactly 180°, or π radians. It doesn't matter whether the triangle is tiny or huge, acute, right or obtuse — the sum is fixed. That is why knowing any two interior angles instantly pins down the third: γ = 180° − α − β.",
  },
  {
    q: "Do three angles define a unique triangle?",
    a: "No. Three angles tell you the shape of a triangle but not its size — any two triangles with the same three angles are similar, not congruent. Scaling every side by the same factor keeps all three angles unchanged. If you want to actually solve for side lengths, use the full Triangle Calculator, which handles SSS, SAS, ASA, AAS and SSA cases.",
  },
  {
    q: "How does this relate to the exterior angle theorem?",
    a: "The exterior angle at any vertex equals the sum of the two non-adjacent interior angles. That's a direct consequence of the angle-sum theorem: if the interior angle at C is γ, its exterior angle is 180° − γ = α + β. In fact, that identity gives one of the shortest proofs that the interior angles must sum to 180°.",
  },
  {
    q: "What if my two given angles add up to 180° or more?",
    a: "Then no triangle exists with those angles. Two interior angles must leave a positive amount for the third, so α + β has to be strictly less than 180° (or π radians). The calculator flags this instead of returning zero or a negative angle, because the situation is geometrically impossible, not just a rounding issue.",
  },
  {
    q: "Does this work for right triangles?",
    a: "Yes. A right triangle has one 90° angle, so the other two acute angles must add to 90°. Type 90 and either acute angle and the calculator returns the remaining one. For deeper right-triangle work — legs, hypotenuse, altitude, inradius — use the dedicated Right Triangle Calculator.",
  },
  {
    q: "Does the theorem still hold on a curved surface?",
    a: "No — only on a flat plane. On a sphere the angles of a triangle sum to more than 180°, and on a saddle-shaped (hyperbolic) surface they sum to less. This calculator, and the theorem it uses, assume ordinary Euclidean geometry, which is what almost every school and engineering problem needs.",
  },
];

function PageExtras() {
  return (
    <>
      <CalcSection title="What is the triangle sum theorem?">
        <p>
          The <strong>triangle sum theorem</strong> — also called the{" "}
          <em>triangle angle sum theorem</em> — states that the three interior
          angles of any triangle in the plane add up to exactly 180°, or π
          radians. It is one of the earliest results in Euclidean geometry and
          the reason a triangle's third angle is never a free choice: give the
          first two and the third is forced.
        </p>
        <p>
          Written as a formula, if the interior angles are α, β and γ, then
        </p>
        <FormulaBlock>α + β + γ = 180°</FormulaBlock>
        <p>
          Rearranging gives the working formula this calculator uses:{" "}
          <span className="font-serif italic">γ = 180° − α − β</span>. In
          radians the same identity reads{" "}
          <span className="font-serif italic">γ = π − α − β</span>.
        </p>
      </CalcSection>

      <CalcSection title="Why it works — the parallel-line proof">
        <p>
          The classical proof is short and visual. Draw any triangle ABC.
          Through vertex C, draw a line parallel to the opposite side AB. That
          line, together with sides CA and CB, creates three angles at C that
          together fill a straight line — so they add to 180°.
        </p>
        <p>
          Now use <em>alternate interior angles</em>: side CA acts as a
          transversal cutting the two parallel lines, so the angle it makes at
          C on one side equals the interior angle α at vertex A. The same
          argument on side CB pairs the other angle at C with β at vertex B.
          The middle angle at C is just the triangle's own angle γ. Adding
          them:
        </p>
        <FormulaBlock>α + γ + β = 180°</FormulaBlock>
        <p>which is exactly the theorem.</p>
      </CalcSection>

      <CalcSection title="A second proof via the exterior angle theorem">
        <p>
          The <em>exterior angle theorem</em> says that at any vertex of a
          triangle, the exterior angle equals the sum of the two non-adjacent
          interior angles. At vertex C the exterior angle is{" "}
          <span className="font-serif italic">180° − γ</span>, so
        </p>
        <FormulaBlock>180° − γ = α + β</FormulaBlock>
        <p>
          Rearranging gives{" "}
          <span className="font-serif italic">α + β + γ = 180°</span> again.
          Either proof works — the exterior-angle version is often quicker in
          a written solution, while the parallel-line construction is easier
          to draw.
        </p>
      </CalcSection>

      <CalcSection title="Shape, not size">
        <p>
          The angle sum fixes a triangle's <strong>shape</strong> but not its{" "}
          <strong>size</strong>. Any two triangles with the same three angles
          are <em>similar</em> — one is a scaled copy of the other — so they
          share every angle and every ratio of sides, but not the sides
          themselves. To pin down actual side lengths you need at least one
          length as input.
        </p>
        <p>
          If that's what you're after, jump to the{" "}
          <a
            href="/calculators/math/triangle-calculator"
            className="underline decoration-primary/60 underline-offset-2 hover:text-primary"
          >
            Triangle Calculator
          </a>
          , which solves SSS, SAS, ASA, AAS and the ambiguous SSA case and
          includes a similarity / congruence checker.
        </p>
      </CalcSection>

      <CalcSection title="Worked examples">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
            <h3 className="mb-2 font-display text-base font-semibold text-foreground">
              Example 1 — two angles in degrees
            </h3>
            <div className="text-sm text-foreground">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Given</div>
              <FormulaBlock>α = 40°, β = 75°</FormulaBlock>
              <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Substitute</div>
              <FormulaBlock>γ = 180° − 40° − 75°</FormulaBlock>
              <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Answer</div>
              <FormulaBlock>γ = 65°</FormulaBlock>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
            <h3 className="mb-2 font-display text-base font-semibold text-foreground">
              Example 2 — a right triangle
            </h3>
            <div className="text-sm text-foreground">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Given</div>
              <FormulaBlock>α = 90°, β = 35°</FormulaBlock>
              <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Substitute</div>
              <FormulaBlock>γ = 180° − 90° − 35°</FormulaBlock>
              <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Answer</div>
              <FormulaBlock>γ = 55°</FormulaBlock>
              <p className="mt-2 text-muted-foreground">
                As expected for a right triangle, the two non-right angles add
                up to 90°.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
            <h3 className="mb-2 font-display text-base font-semibold text-foreground">
              Example 3 — angles in radians
            </h3>
            <div className="text-sm text-foreground">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Given</div>
              <FormulaBlock>α = π/3, β = π/4</FormulaBlock>
              <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Substitute</div>
              <FormulaBlock>γ = π − π/3 − π/4</FormulaBlock>
              <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Answer</div>
              <FormulaBlock>γ = 5π/12 ≈ 1.3090 rad (75°)</FormulaBlock>
            </div>
          </div>
        </div>
      </CalcSection>

      <CalcSection title="What this tool does for you">
        <FeatureList
          items={[
            "Solves the third interior angle of any triangle from the other two, using γ = 180° − α − β (or γ = π − α − β in radians).",
            "Accepts input in degrees or radians with a one-click unit toggle — no manual conversion needed.",
            "Flags impossible inputs — zero, negative, or two angles that already sum to 180° or more — instead of returning a silently wrong answer.",
            "Renders a labelled SVG triangle with α, β and γ at their vertices so the geometry is obvious at a glance.",
            "Prints personalised step-by-step working with your actual numbers substituted in, ready to copy into homework or a report.",
            "Copy-to-clipboard, PNG snapshot, PDF export and print, all matching the shared result-actions used across the site.",
            "Runs entirely in the browser — nothing you type is uploaded, and the page works offline once loaded.",
          ]}
        />
      </CalcSection>

      <CalcSection title="Frequently asked questions">
        <CalcFAQ items={FAQ_ITEMS.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))} />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/triangle-calculator", label: "Triangle Calculator (any triangle: SSS, SAS, ASA, AAS, SSA)" },
            { to: "/calculators/math/right-triangle-calculator", label: "Right Triangle Calculator (one 90° angle)" },
            { to: "/calculators/math/isosceles-triangle-calculator", label: "Isosceles Triangle Calculator (two equal sides)" },
            { to: "/calculators/math/equilateral-triangle-calculator", label: "Equilateral Triangle Calculator (all sides equal)" },
            { to: "/calculators/math/pythagorean-theorem-calculator", label: "Pythagorean Theorem Calculator (a² + b² = c²)" },
          ]}
        />
      </CalcSection>
    </>
  );
}

export const Route = createFileRoute("/calculators/math/triangle-sum-theorem-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Triangle Sum Theorem Calculator",
      title: "Triangle Sum Theorem Calculator — Find the Third Angle",
      metaDescription:
        "Free triangle sum theorem calculator — enter any two interior angles (degrees or radians) and get the third instantly using α + β + γ = 180°, with step-by-step working, a labelled diagram and proofs.",
      canonicalUrl: "/calculators/math/triangle-sum-theorem-calculator",
      ogImage: "/og-image.png",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Triangle Sum Theorem Calculator", path: "/calculators/math/triangle-sum-theorem-calculator" },
      ],
      faqs: FAQ_ITEMS,
    }),
  component: TriangleSumPage,
});
