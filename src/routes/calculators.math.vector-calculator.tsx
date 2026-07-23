import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
  ResultBox,
  ErrorBox,
  CalcSection,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
  FormulaBlock,
  FormulaWithLegend,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

export const Route = createFileRoute("/calculators/math/vector-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Vector Calculator",
      title: "Vector Calculator — Add, Subtract, Dot & Cross",
      metaDescription:
        "Add, subtract, dot and cross product for 2D and 3D vectors. See the result, its magnitude, and every step of the working.",
      canonicalUrl: "/calculators/math/vector-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Vector Calculator", path: "/calculators/math/vector-calculator" },
      ],
      faqs: [
        {
          q: "What's the difference between the dot product and the cross product?",
          a: "The dot product returns a single number (a scalar) and measures how much two vectors point in the same direction — it's zero when they are perpendicular. The cross product exists only in 3D and returns a new vector that is perpendicular to both inputs, with magnitude equal to the area of the parallelogram they span.",
        },
        {
          q: "What is the zero vector?",
          a: "The zero vector 0 has every component equal to 0 and magnitude 0. It has no direction, is the identity for vector addition (v + 0 = v), and its dot product with any vector is 0.",
        },
        {
          q: "Can I take the cross product of two 2D vectors?",
          a: "Not as a true vector — the cross product is defined for 3D. You can embed 2D vectors into 3D by giving them a z-component of 0; the result is then a purely vertical vector whose z-value equals the scalar 2D cross a·d − b·c.",
        },
        {
          q: "What does it mean if the dot product is negative?",
          a: "The angle between the two vectors is obtuse (greater than 90°). A positive dot product means an acute angle, and zero means the vectors are perpendicular.",
        },
      ],
    }),
  component: VectorPage,
});

// ---------------- Engine ----------------

type Dim = 2 | 3;
type Op = "add" | "sub" | "dot" | "cross";

function fmtNum(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const r = Math.round(n * 1e10) / 1e10;
  return r.toString();
}

function fmtVec(v: number[]): string {
  return `⟨${v.map(fmtNum).join(", ")}⟩`;
}

function magnitude(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

function addVec(a: number[], b: number[]): number[] {
  return a.map((x, i) => x + b[i]);
}
function subVec(a: number[], b: number[]): number[] {
  return a.map((x, i) => x - b[i]);
}
function dotVec(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}
function crossVec(a: number[], b: number[]): number[] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function buildSteps(
  a: number[],
  b: number[],
  op: Op,
  result: number[] | number,
): Step[] {
  const steps: Step[] = [];
  steps.push({
    title: "Given",
    body: (
      <FormulaBlock>
        a = {fmtVec(a)}, &nbsp; b = {fmtVec(b)}
      </FormulaBlock>
    ),
  });

  if (op === "add" || op === "sub") {
    const sign = op === "add" ? "+" : "−";
    const word = op === "add" ? "addition" : "subtraction";
    steps.push({
      title: `Formula — component-wise ${word}`,
      body: (
        <FormulaWithLegend
          formula={<>(a {sign} b)ᵢ = aᵢ {sign} bᵢ for each component i</>}
          legend={[
            { sym: "aᵢ, bᵢ", def: "matching components of a and b" },
            { sym: "(a ± b)ᵢ", def: "component i of the resulting vector" },
          ]}
        />
      ),
    });
    steps.push({
      title: "Substitute — combine each component",
      body: (
        <FormulaBlock>
          {a.map((_, i) => (
            <div key={i}>
              {"xyz"[i]}: {fmtNum(a[i])} {sign} {fmtNum(b[i])} ={" "}
              {fmtNum(op === "add" ? a[i] + b[i] : a[i] - b[i])}
            </div>
          ))}
        </FormulaBlock>
      ),
    });
    const mag = magnitude(result as number[]);
    steps.push({
      title: "Answer — resulting vector and its magnitude",
      body: (
        <FormulaBlock>
          result = {fmtVec(result as number[])}
          <br />
          ‖result‖ = √({(result as number[]).map((x) => `${fmtNum(x)}²`).join(" + ")}) = {fmtNum(mag)}
        </FormulaBlock>
      ),
    });
  } else if (op === "dot") {
    const terms = a.map((x, i) => `${fmtNum(x)}·${fmtNum(b[i])}`).join(" + ");
    const values = a.map((x, i) => fmtNum(x * b[i])).join(" + ");
    steps.push({
      title: "Formula — dot product",
      body: (
        <FormulaWithLegend
          formula={<>a · b = Σᵢ aᵢ · bᵢ &nbsp; (a scalar)</>}
          legend={[
            { sym: "aᵢ, bᵢ", def: "matching components of a and b" },
            { sym: "Σ", def: "sum across all components" },
            { sym: "a · b", def: "scalar; zero when the vectors are perpendicular" },
          ]}
        />
      ),
    });
    steps.push({
      title: "Substitute — multiply pairwise, then sum",
      body: (
        <FormulaBlock>
          a · b = {terms}
          <br />= {values}
        </FormulaBlock>
      ),
    });
    steps.push({
      title: "Answer",
      body: <FormulaBlock>a · b = {fmtNum(result as number)}</FormulaBlock>,
    });
    const magA = magnitude(a);
    const magB = magnitude(b);
    if (magA > 0 && magB > 0) {
      const cos = (result as number) / (magA * magB);
      const cosClamped = Math.max(-1, Math.min(1, cos));
      const angleRad = Math.acos(cosClamped);
      steps.push({
        title: "Optional — recover the angle between a and b",
        body: (
          <FormulaBlock>
            cos θ = (a·b) / (‖a‖‖b‖) = {fmtNum(result as number)} / ({fmtNum(magA)}·{fmtNum(magB)}) = {fmtNum(cos)}
            <br />
            θ = {fmtNum(angleRad)} rad ({fmtNum((angleRad * 180) / Math.PI)}°)
          </FormulaBlock>
        ),
      });
    }
  } else {
    // cross
    steps.push({
      title: "Formula — cross product (3D)",
      body: (
        <FormulaWithLegend
          formula={<>a × b = ⟨a₂b₃ − a₃b₂, &nbsp; a₃b₁ − a₁b₃, &nbsp; a₁b₂ − a₂b₁⟩</>}
          legend={[
            { sym: "a₁, a₂, a₃", def: "x, y, z components of a" },
            { sym: "b₁, b₂, b₃", def: "x, y, z components of b" },
            { sym: "a × b", def: "vector perpendicular to both a and b" },
          ]}
        />
      ),
    });
    steps.push({
      title: "Substitute — evaluate each component",
      body: (
        <FormulaBlock>
          <div>i: {fmtNum(a[1])}·{fmtNum(b[2])} − {fmtNum(a[2])}·{fmtNum(b[1])} = {fmtNum((result as number[])[0])}</div>
          <div>j: {fmtNum(a[2])}·{fmtNum(b[0])} − {fmtNum(a[0])}·{fmtNum(b[2])} = {fmtNum((result as number[])[1])}</div>
          <div>k: {fmtNum(a[0])}·{fmtNum(b[1])} − {fmtNum(a[1])}·{fmtNum(b[0])} = {fmtNum((result as number[])[2])}</div>
        </FormulaBlock>
      ),
    });
    const mag = magnitude(result as number[]);
    steps.push({
      title: "Answer — resulting vector and its magnitude",
      body: (
        <FormulaBlock>
          a × b = {fmtVec(result as number[])}
          <br />
          ‖a × b‖ = √({(result as number[]).map((x) => `${fmtNum(x)}²`).join(" + ")}) = {fmtNum(mag)}
        </FormulaBlock>
      ),
    });
  }

  return steps;
}


function Vector2DPlot({ a, b, result, op }: { a: number[]; b: number[]; result: number[] | number; op: Op }) {
  const vectors: { label: string; v: number[]; className: string }[] = [
    { label: "a", v: a, className: "text-muted-foreground" },
    { label: "b", v: b, className: "text-primary" },
  ];
  if (op !== "dot") {
    vectors.push({ label: "result", v: result as number[], className: "text-foreground" });
  }
  const allPts = vectors.flatMap((vec) => vec.v);
  const maxAbs = Math.max(1, ...allPts.map((n) => Math.abs(n)));
  const w = 320, h = 320, cx = w / 2, cy = h / 2;
  const scale = (Math.min(w, h) / 2 - 30) / maxAbs;
  const toX = (x: number) => cx + x * scale;
  const toY = (y: number) => cy - y * scale;

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-sm font-medium text-foreground">2D vector plot from the origin</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto block h-72 w-72" role="img" aria-label="2D vector plot">
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
          </marker>
        </defs>
        <line x1={0} y1={cy} x2={w} y2={cy} stroke="currentColor" className="text-border" strokeWidth={1} />
        <line x1={cx} y1={0} x2={cx} y2={h} stroke="currentColor" className="text-border" strokeWidth={1} />
        {vectors.map((vec, i) => (
          <g key={i} className={vec.className}>
            <line
              x1={cx}
              y1={cy}
              x2={toX(vec.v[0])}
              y2={toY(vec.v[1])}
              stroke="currentColor"
              strokeWidth={2.5}
              markerEnd="url(#arrowhead)"
            />
            <text x={toX(vec.v[0]) + 6} y={toY(vec.v[1]) - 6} className="fill-current text-[11px] font-medium">
              {vec.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ---------------- Page ----------------

const OP_LABEL: Record<Op, string> = {
  add: "a + b",
  sub: "a − b",
  dot: "a · b (dot)",
  cross: "a × b (cross)",
};

function VectorPage() {
  const [dim, setDim] = useState<Dim>(3);
  const [a, setA] = useState<string[]>(["1", "2", "3"]);
  const [b, setB] = useState<string[]>(["4", "5", "6"]);
  const [op, setOp] = useState<Op>("add");
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [display, setDisplay] = useState<{
    value: ReactNode;
    note: ReactNode;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const setDimSafe = (d: Dim) => {
    setDim(d);
    if (d === 2 && op === "cross") setOp("add");
    setSteps(null);
    setDisplay(null);
    setErr(null);
  };

  const parseVec = (arr: string[], name: string): number[] => {
    return arr.slice(0, dim).map((s, i) => {
      const n = Number(s.trim().replace(/[,\s_]/g, ""));
      if (!Number.isFinite(n))
        throw new Error(`${name} component ${"xyz"[i]} must be a number.`);
      return n;
    });
  };

  const onCalc = () => {
    setErr(null);
    setSteps(null);
    setDisplay(null);
    try {
      const A = parseVec(a, "a");
      const B = parseVec(b, "b");
      if (op === "cross" && dim !== 3)
        throw new Error("Cross product requires 3D vectors.");
      let result: number[] | number;
      switch (op) {
        case "add":
          result = addVec(A, B);
          break;
        case "sub":
          result = subVec(A, B);
          break;
        case "dot":
          result = dotVec(A, B);
          break;
        case "cross":
          result = crossVec(A, B);
          break;
      }
      setSteps(buildSteps(A, B, op, result));
      if (op === "dot") {
        setDisplay({
          value: <span className="font-mono">{fmtNum(result as number)}</span>,
          note: "The dot product is a scalar (single number).",
        });
      } else {
        const v = result as number[];
        const mag = magnitude(v);
        setDisplay({
          value: <span className="font-mono">{fmtVec(v)}</span>,
          note: (
            <span className="font-mono">
              Magnitude ‖result‖ = {fmtNum(mag)}
            </span>
          ),
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input.");
    }
  };

  const componentField = (
    idx: number,
    which: "a" | "b",
  ): ReactNode => {
    const value = (which === "a" ? a : b)[idx] ?? "0";
    const label = `${which}${"₁₂₃"[idx]}`;
    const id = `${which}${idx}`;
    return (
      <Field key={id} label={label} htmlFor={id}>
        <TextInput
          id={id}
          value={value}
          onChange={(e) => {
            const next = [...(which === "a" ? a : b)];
            next[idx] = e.target.value;
            (which === "a" ? setA : setB)(next);
          }}
          inputMode="decimal"
        />
      </Field>
    );
  };

  const ops: Op[] = ["add", "sub", "dot", "cross"];

  return (
    <MathCalcPage
      name="Vector Calculator"
      tagline="Add, subtract, dot-product and cross-product 2D or 3D vectors. Results come with the magnitude and the full component-wise working."
      extras={
        <>
<CalcSection title="What is a vector?">
            <p>
              A vector is a quantity with both magnitude (size) and
              direction. In coordinate form we write it as a list of
              components — <span className="font-mono">⟨x, y⟩</span> in 2D
              or <span className="font-mono">⟨x, y, z⟩</span> in 3D — that
              describe the displacement along each axis. Its magnitude
              (length) is the distance from the origin to the point with
              those coordinates.
            </p>
          </CalcSection>

          <CalcSection title="Vector operations, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one operation this tool performs on your
              two vectors — what it returns (vector or scalar), what the
              result means geometrically, and how the components combine.
            </p>
            <GuideCards items={VECTOR_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Toggle between 2D and 3D component inputs",
                "Supports addition, subtraction, dot product and cross product (3D)",
                "Reports the resulting vector (or scalar for dot product) plus its magnitude",
                "Recovers the angle between vectors from the dot product when possible",
                "Shows every component-wise step of the working",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "When should I use the dot product vs the cross product?",
                  a: (
                    <p>
                      Use the dot product when you need a scalar — the
                      angle between two vectors, a projection length, or
                      to check perpendicularity. Use the cross product
                      (3D only) when you need a vector perpendicular to
                      two others, such as a surface normal or a torque.
                    </p>
                  ),
                },
                {
                  q: "What if I get the zero vector as a result?",
                  a: (
                    <p>
                      The zero vector ⟨0, 0, 0⟩ has no direction and
                      magnitude 0. A zero cross product means the two
                      vectors are parallel; a zero dot product means they
                      are perpendicular.
                    </p>
                  ),
                },
                {
                  q: "Is the cross product commutative?",
                  a: (
                    <p>
                      No — it's anti-commutative:{" "}
                      <span className="font-mono">a × b = −(b × a)</span>.
                      Swapping the operands reverses the direction of the
                      resulting vector.
                    </p>
                  ),
                },
                {
                  q: "How do I turn a vector into a unit vector?",
                  a: (
                    <p>
                      Divide each component by the vector's magnitude:{" "}
                      <span className="font-mono">v̂ = v / ‖v‖</span>. The
                      result points the same way as v but has length 1.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                {
                  to: "/calculators/math/complex-number-calculator",
                  label: "Complex Number Calculator",
                },
                {
                  to: "/calculators/math/scientific-calculator",
                  label: "Scientific Calculator",
                },
                {
                  to: "/calculators/math/matrix-calculator",
                  label: "Matrix Calculator",
                },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Dimension" htmlFor="dim">
          <div className="flex gap-2">
            {([2, 3] as Dim[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDimSafe(d)}
                className={`h-10 min-w-16 rounded-lg border px-4 font-mono text-sm transition ${
                  dim === d
                    ? "border-primary bg-primary/20 text-foreground"
                    : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={dim === d}
              >
                {d}D
              </button>
            ))}
          </div>
        </Field>

        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <div className="mb-3 text-sm font-medium text-foreground">
            Vector a
          </div>
          <div className={`grid gap-3 ${dim === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {Array.from({ length: dim }, (_, i) => componentField(i, "a"))}
          </div>
        </div>

        <Field label="Operation" htmlFor="op">
          <div className="flex flex-wrap gap-2">
            {ops.map((o) => {
              const disabled = o === "cross" && dim !== 3;
              return (
                <button
                  key={o}
                  type="button"
                  disabled={disabled}
                  onClick={() => setOp(o)}
                  className={`h-10 rounded-lg border px-3 font-mono text-sm transition ${
                    op === o
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
                  } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  aria-pressed={op === o}
                >
                  {OP_LABEL[o]}
                </button>
              );
            })}
          </div>
          {dim === 2 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Cross product is defined in 3D — switch to 3D to enable it.
            </p>
          )}
        </Field>

        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <div className="mb-3 text-sm font-medium text-foreground">
            Vector b
          </div>
          <div className={`grid gap-3 ${dim === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {Array.from({ length: dim }, (_, i) => componentField(i, "b"))}
          </div>
        </div>

        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {display && (
        <>
          <ResultBox label="Result" value={display.value} note={display.note} />
          {dim === 2 && (
            <Vector2DPlot a={a.slice(0, 2).map(Number)} b={b.slice(0, 2).map(Number)} result={
              op === "dot" ? (dotVec(a.slice(0,2).map(Number), b.slice(0,2).map(Number))) :
              op === "sub" ? subVec(a.slice(0,2).map(Number), b.slice(0,2).map(Number)) :
              addVec(a.slice(0,2).map(Number), b.slice(0,2).map(Number))
            } op={op} />
          )}
          {steps && <StepsToggle steps={steps} />}
        </>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function AddSubVecMini() {
  return (
    <svg viewBox="0 0 200 110" className="w-full">
      <rect x="1" y="1" width="198" height="108" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <line x1="30" y1="95" x2="180" y2="95" stroke="var(--color-border)" />
      <line x1="30" y1="15" x2="30" y2="105" stroke="var(--color-border)" />
      <line x1="30" y1="95" x2="80" y2="70" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#vam)" />
      <line x1="80" y1="70" x2="140" y2="30" stroke="var(--color-primary)/0.7" strokeWidth="1.5" strokeDasharray="3 2" markerEnd="url(#vam)" />
      <line x1="30" y1="95" x2="140" y2="30" stroke="var(--color-foreground)" strokeWidth="1.5" markerEnd="url(#vam)" />
      <defs><marker id="vam" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor" /></marker></defs>
      <text x="55" y="65" fontSize="9" fill="var(--color-primary)">a</text>
      <text x="115" y="45" fontSize="9" fill="var(--color-primary)">b</text>
      <text x="95" y="105" fontSize="9" fill="var(--color-foreground)">a + b</text>
    </svg>
  );
}

function DotMini() {
  return (
    <svg viewBox="0 0 200 110" className="w-full">
      <rect x="1" y="1" width="198" height="108" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <line x1="40" y1="80" x2="150" y2="80" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#vdm)" />
      <line x1="40" y1="80" x2="120" y2="30" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#vdm)" />
      <defs><marker id="vdm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--color-primary)" /></marker></defs>
      <path d="M60 80 A 20 20 0 0 0 55 68" fill="none" stroke="var(--color-muted-foreground)" />
      <text x="70" y="72" fontSize="9" fill="var(--color-muted-foreground)">θ</text>
      <text x="100" y="100" textAnchor="middle" fontSize="10" fill="var(--color-foreground)">a · b = ‖a‖‖b‖ cos θ</text>
    </svg>
  );
}

function CrossMini() {
  return (
    <svg viewBox="0 0 200 110" className="w-full">
      <rect x="1" y="1" width="198" height="108" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <polygon points="50,80 130,80 160,50 80,50" fill="var(--color-primary)/0.15" stroke="var(--color-primary)" />
      <line x1="50" y1="80" x2="130" y2="80" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#vcm)" />
      <line x1="50" y1="80" x2="80" y2="50" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#vcm)" />
      <line x1="90" y1="65" x2="90" y2="20" stroke="var(--color-foreground)" strokeWidth="1.5" markerEnd="url(#vcm)" />
      <defs><marker id="vcm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor" /></marker></defs>
      <text x="140" y="78" fontSize="9" fill="var(--color-primary)">a</text>
      <text x="65" y="45" fontSize="9" fill="var(--color-primary)">b</text>
      <text x="97" y="18" fontSize="9" fill="var(--color-foreground)">a × b</text>
      <text x="100" y="102" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">perpendicular, right-hand rule</text>
    </svg>
  );
}

function MagMini() {
  return (
    <svg viewBox="0 0 200 110" className="w-full">
      <rect x="1" y="1" width="198" height="108" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <line x1="30" y1="95" x2="180" y2="95" stroke="var(--color-border)" />
      <line x1="30" y1="15" x2="30" y2="105" stroke="var(--color-border)" />
      <line x1="30" y1="95" x2="140" y2="30" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#vmm)" />
      <line x1="30" y1="95" x2="140" y2="95" stroke="var(--color-muted-foreground)" strokeDasharray="3 2" />
      <line x1="140" y1="95" x2="140" y2="30" stroke="var(--color-muted-foreground)" strokeDasharray="3 2" />
      <defs><marker id="vmm" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--color-primary)" /></marker></defs>
      <text x="85" y="55" fontSize="10" fill="var(--color-primary)">‖v‖</text>
      <text x="85" y="108" fontSize="9" fill="var(--color-muted-foreground)">x</text>
      <text x="146" y="65" fontSize="9" fill="var(--color-muted-foreground)">y</text>
    </svg>
  );
}

const VECTOR_GUIDE: GuideCardItem[] = [
  {
    key: "addsub",
    title: "Add & subtract — componentwise",
    explain: (
      <>Combine matching components separately. The tip-to-tail construction
        in the plane matches the arithmetic exactly.</>
    ),
    formula: <>a ± b = ⟨a₁±b₁, a₂±b₂, a₃±b₃⟩</>,
    diagram: <AddSubVecMini />,
    example: {
      given: <span className="font-mono">⟨1,2,3⟩ + ⟨4,5,6⟩</span>,
      substitute: <>⟨1+4, 2+5, 3+6⟩</>,
      answer: <span className="font-mono">⟨5, 7, 9⟩</span>,
    },
  },
  {
    key: "dot",
    title: "Dot product — alignment as a single number",
    explain: (
      <>Multiply matching components and add them. The result is a scalar
        proportional to how aligned the two vectors are — zero when they
        are perpendicular.</>
    ),
    formula: <>a · b = Σ aᵢbᵢ = ‖a‖‖b‖ cos θ</>,
    diagram: <DotMini />,
    example: {
      given: <span className="font-mono">⟨1,2,3⟩ · ⟨4,5,6⟩</span>,
      substitute: <>1·4 + 2·5 + 3·6</>,
      answer: <span className="font-mono">32</span>,
    },
  },
  {
    key: "cross",
    title: "Cross product — a perpendicular vector (3D only)",
    explain: (
      <>Returns a new vector perpendicular to both inputs, following the
        right-hand rule. Its length equals the area of the parallelogram
        the two vectors span, so it's zero exactly when they are parallel.</>
    ),
    formula: <>a × b = ⟨a₂b₃−a₃b₂, a₃b₁−a₁b₃, a₁b₂−a₂b₁⟩</>,
    diagram: <CrossMini />,
    example: {
      given: <span className="font-mono">⟨1,2,3⟩ × ⟨4,5,6⟩</span>,
      substitute: <>(12−15, 12−6, 5−8)</>,
      answer: <span className="font-mono">⟨−3, 6, −3⟩</span>,
    },
  },
  {
    key: "mag",
    title: "Magnitude — length by Pythagoras",
    explain: (
      <>The magnitude is the distance from the origin to the tip of the
        vector — the Pythagorean theorem extended to any number of
        components.</>
    ),
    formula: <>‖v‖ = √(x² + y² + z² + …)</>,
    diagram: <MagMini />,
    example: {
      given: <span className="font-mono">v = ⟨3, 4⟩</span>,
      substitute: <>√(9 + 16)</>,
      answer: <span className="font-mono">5</span>,
    },
  },
];
