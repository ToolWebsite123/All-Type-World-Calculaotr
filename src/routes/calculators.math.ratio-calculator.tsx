import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { simplifyRatio, solveProportion } from "@/lib/math/ratio";

export const Route = createFileRoute("/calculators/math/ratio-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Ratio Calculator",
      title: "Ratio Calculator — Solve A:B = C:D, Simplify & Scale Ratios",
      metaDescription:
        "Solve any missing term in a ratio A:B = C:D, simplify to lowest terms, view as decimal or percentage, visualize as a pie chart, and scale ratios up or down.",
      canonicalUrl: "/calculators/math/ratio-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Ratio Calculator", path: "/calculators/math/ratio-calculator" },
      ],
      faqs: [
        {
          q: "How do I simplify a ratio?",
          a: "Divide both terms by their greatest common factor (GCF). For example, 18 : 24 has GCF 6, so it simplifies to 3 : 4. When the terms are decimals, first multiply both sides by a power of ten to clear the decimals, then reduce.",
        },
        {
          q: "What's the difference between a ratio and a fraction?",
          a: "A fraction represents a part of a whole (3/4 means three out of four equal parts). A ratio compares any two quantities to each other — the two things being compared don't have to add up to a whole. Every fraction can be read as a ratio (3/4 = 3 : 4), but not every ratio describes a part-to-whole relationship.",
        },
        {
          q: "How do I scale a ratio up or down?",
          a: "Multiply both terms by the same factor to scale up, or divide both by the same factor to scale down. Scaling 3 : 4 up by 5 gives 15 : 20; scaling 250 : 280 down by 2.5 gives 100 : 112. The relationship between the two quantities stays the same.",
        },
      ],
    }),
  component: RatioPage,
});

function RatioPage() {
  return (
    <MathCalcPage
      name="Ratio Calculator"
      tagline="Provide any three values in A : B = C : D to solve for the fourth. See the simplified form, decimal and percentage equivalents, and a visual breakdown of the ratio."
      extras={
        <>
          <CalcSection title="What is a ratio?">
            <p>
              A ratio compares two quantities of the same kind. A class with 12
              boys and 18 girls has a ratio of 12 : 18, which simplifies to
              2 : 3 — for every 2 boys there are 3 girls. A proportion sets
              two ratios equal, like <span className="font-mono">3 : 4 = ? : 20</span>;
              whenever three of the four terms are known, the fourth is fixed.
              That single idea powers everything on this page: solving for a
              missing term, simplifying, converting to a decimal or percentage
              split, and scaling the pair up or down by any factor.
            </p>
          </CalcSection>

          <CalcSection title="Ratio calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card matches a feature above — the proportion solver, the
              simplified form, the decimal/percentage readout, the pie chart,
              and the separate scaling tool.
            </p>
            <GuideCards items={RATIO_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Solve A : B = C : D for any missing term",
                "Automatically simplify the ratio to lowest whole-number terms",
                "Display the ratio as a decimal (x : 1) and as a percentage split",
                "Two-slice pie chart and horizontal bar visualization",
                "Separate scaling tool to grow or shrink a ratio by any factor",
                "Full step-by-step working using cross-multiplication",
              ]}
            />
          </CalcSection>

          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "How do I simplify a ratio?", a: <p>Divide both terms by their greatest common factor. For decimals, first multiply both sides by a power of ten so the terms become whole numbers, then reduce.</p> },
                { q: "What's the difference between a ratio and a fraction?", a: <p>A fraction is always part-to-whole (3/4 = three out of four equal parts). A ratio compares any two quantities, so 3 : 4 could mean three cats for every four dogs — the total isn't fixed.</p> },
                { q: "How do I scale a ratio up or down?", a: <p>Multiply both terms by the same factor to grow, or divide both by the same factor to shrink. The relationship between the two quantities is preserved.</p> },
                { q: "Can a ratio have more than two terms?", a: <p>Yes. Recipes often use ratios like 1 : 2 : 3 (butter : sugar : flour). The same rules apply — divide every term by the shared GCF to simplify.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/fraction-calculator", label: "Fraction Calculator" },
                { to: "/calculators/math/percentage-calculator", label: "Percentage Calculator" },
                { to: "/calculators/math/gcf-calculator", label: "GCF Calculator" },
                { to: "/calculators/math/scientific-calculator", label: "Scientific Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <ProportionSolver />
      <div className="mt-8">
        <ScalingTool />
      </div>
    </MathCalcPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main solver A : B = C : D
// ─────────────────────────────────────────────────────────────────────────────

function ProportionSolver() {
  const [a, setA] = useState("3");
  const [b, setB] = useState("4");
  const [c, setC] = useState("600");
  const [d, setD] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{
    a: number;
    b: number;
    c: number;
    d: number;
    solvedFor: "a" | "b" | "c" | "d";
    steps: Step[];
  } | null>(null);

  const parse = (v: string) => (v.trim() === "" ? undefined : Number(v));

  const solve = () => {
    setErr(null);
    setResult(null);
    try {
      const vals = [parse(a), parse(b), parse(c), parse(d)] as (number | undefined)[];
      if (vals.some((v) => v !== undefined && !Number.isFinite(v))) {
        setErr("All entered values must be numbers.");
        return;
      }
      const missing = vals.filter((v) => v === undefined).length;
      if (missing !== 1) {
        setErr("Leave exactly one field blank so it can be solved for.");
        return;
      }
      const r = solveProportion(vals[0], vals[1], vals[2], vals[3]);
      setResult({ ...r, steps: buildSolveSteps(vals, r) });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input");
    }
  };

  const clearAll = () => {
    setA(""); setB(""); setC(""); setD("");
    setErr(null); setResult(null);
  };

  const derived = useMemo(() => {
    if (!result) return null;
    const { a: A, b: B } = result;
    if (!Number.isFinite(A) || !Number.isFinite(B) || B === 0 || A + B === 0) return null;
    let simplified: string | null = null;
    try {
      const s = simplifyRatio(A, B);
      simplified = `${s.a} : ${s.b}`;
    } catch { /* ignore */ }
    const decimal = `${format(A / B)} : 1`;
    const pctA = (A / (A + B)) * 100;
    const pctB = (B / (A + B)) * 100;
    return { simplified, decimal, pctA, pctB };
  }, [result]);

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Enter any three values in <span className="font-mono">A : B = C : D</span>. Leave the unknown field blank.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-end">
        <Field label="A" htmlFor="ratio-a">
          <TextInput id="ratio-a" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} placeholder="3" />
        </Field>
        <div className="hidden pb-3 text-center text-lg text-muted-foreground sm:block">:</div>
        <Field label="B" htmlFor="ratio-b">
          <TextInput id="ratio-b" inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} placeholder="4" />
        </Field>
        <div className="hidden pb-3 text-center text-lg text-muted-foreground sm:block">=</div>
        <Field label="C" htmlFor="ratio-c">
          <TextInput id="ratio-c" inputMode="decimal" value={c} onChange={(e) => setC(e.target.value)} placeholder="600" />
        </Field>
        <div className="hidden pb-3 text-center text-lg text-muted-foreground sm:block">:</div>
        <Field label="D" htmlFor="ratio-d">
          <TextInput id="ratio-d" inputMode="decimal" value={d} onChange={(e) => setD(e.target.value)} placeholder="" />
        </Field>
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryButton onClick={solve}>Calculate</PrimaryButton>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-full border border-border bg-secondary/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Clear
        </button>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <>
          <ResultBox
            label="Solved proportion"
            value={`${format(result.a)} : ${format(result.b)} = ${format(result.c)} : ${format(result.d)}`}
          />

          {derived && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Simplified" value={derived.simplified ?? "—"} />
              <MiniStat label="As decimal" value={derived.decimal} />
              <MiniStat
                label="Share of total"
                value={`${format(derived.pctA)}% : ${format(derived.pctB)}%`}
              />
            </div>
          )}

          {derived && (
            <div className="mt-6 grid gap-6 rounded-2xl border border-border/60 bg-secondary/10 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <PiePair pctA={derived.pctA} labelA={format(result.a)} labelB={format(result.b)} />
              <BarPair pctA={derived.pctA} labelA={format(result.a)} labelB={format(result.b)} />
            </div>
          )}

          <StepsToggle steps={result.steps} />
        </>
      )}
    </div>
  );
}

function buildSolveSteps(
  inputs: (number | undefined)[],
  r: { a: number; b: number; c: number; d: number; solvedFor: "a" | "b" | "c" | "d" },
): Step[] {
  const [ai, bi, ci, di] = inputs;
  const missing = r.solvedFor;
  const rawFor = (k: "a" | "b" | "c" | "d") => (k === missing ? "?" : String([ai, bi, ci, di][keyIndex(k)]));
  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <FormulaBlock>
          {rawFor("a")} : {rawFor("b")} = {rawFor("c")} : {rawFor("d")}
        </FormulaBlock>
      ),
    },
    {
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>A : B = C : D &nbsp;⇒&nbsp; A × D = B × C</>}
          legend={[
            { sym: "A, C", def: "first term of each ratio (antecedents)" },
            { sym: "B, D", def: "second term of each ratio (consequents)" },
          ]}
        />
      ),
    },
  ];

  if (missing === "a") {
    steps.push({
      title: "Substitute — rearrange for A",
      body: (
        <FormulaBlock>
          A = (B × C) ÷ D = ({format(r.b)} × {format(r.c)}) ÷ {format(r.d)}
        </FormulaBlock>
      ),
    });
  } else if (missing === "b") {
    steps.push({
      title: "Substitute — rearrange for B",
      body: (
        <FormulaBlock>
          B = (A × D) ÷ C = ({format(r.a)} × {format(r.d)}) ÷ {format(r.c)}
        </FormulaBlock>
      ),
    });
  } else if (missing === "c") {
    steps.push({
      title: "Substitute — rearrange for C",
      body: (
        <FormulaBlock>
          C = (A × D) ÷ B = ({format(r.a)} × {format(r.d)}) ÷ {format(r.b)}
        </FormulaBlock>
      ),
    });
  } else {
    steps.push({
      title: "Substitute — rearrange for D",
      body: (
        <FormulaBlock>
          D = (B × C) ÷ A = ({format(r.b)} × {format(r.c)}) ÷ {format(r.a)}
        </FormulaBlock>
      ),
    });
  }

  steps.push({
    title: "Answer",
    body: (
      <FormulaBlock>
        <strong>
          {format(r.a)} : {format(r.b)} = {format(r.c)} : {format(r.d)}
        </strong>
      </FormulaBlock>
    ),
  });
  return steps;
}

function keyIndex(k: "a" | "b" | "c" | "d") {
  return { a: 0, b: 1, c: 2, d: 3 }[k];
}

// ─────────────────────────────────────────────────────────────────────────────
// Scaling sub-tool
// ─────────────────────────────────────────────────────────────────────────────

function ScalingTool() {
  const [x, setX] = useState("250");
  const [y, setY] = useState("280");
  const [dir, setDir] = useState<"grow" | "shrink">("shrink");
  const [factor, setFactor] = useState("2.5");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ x: number; y: number; simplified: string | null } | null>(null);

  const calc = () => {
    setErr(null);
    setResult(null);
    const nx = Number(x), ny = Number(y), nf = Number(factor);
    if (![nx, ny, nf].every(Number.isFinite)) {
      setErr("Enter numeric values for both terms and the factor.");
      return;
    }
    if (nf === 0) {
      setErr("Scale factor cannot be zero.");
      return;
    }
    const mult = dir === "grow" ? nf : 1 / nf;
    const rx = nx * mult;
    const ry = ny * mult;
    let simplified: string | null = null;
    try {
      const s = simplifyRatio(rx, ry);
      simplified = `${s.a} : ${s.b}`;
    } catch { /* ignore */ }
    setResult({ x: rx, y: ry, simplified });
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/10 p-4">
      <h3 className="mb-1 text-lg font-semibold text-foreground">Ratio Scaling Calculator</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Grow or shrink a ratio by any factor while keeping the same proportions.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto_1fr_1fr_1fr_auto] sm:items-end">
        <Field label="First term" htmlFor="scale-x">
          <TextInput id="scale-x" inputMode="decimal" value={x} onChange={(e) => setX(e.target.value)} />
        </Field>
        <div className="hidden pb-3 text-center text-lg text-muted-foreground sm:block">:</div>
        <Field label="Second term" htmlFor="scale-y">
          <TextInput id="scale-y" inputMode="decimal" value={y} onChange={(e) => setY(e.target.value)} />
        </Field>
        <Field label="Direction" htmlFor="scale-dir">
          <select
            id="scale-dir"
            value={dir}
            onChange={(e) => setDir(e.target.value as "grow" | "shrink")}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="grow">Grow</option>
            <option value="shrink">Shrink</option>
          </select>
        </Field>
        <Field label="Factor" htmlFor="scale-factor">
          <TextInput id="scale-factor" inputMode="decimal" value={factor} onChange={(e) => setFactor(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={calc} className="w-full sm:w-auto">Calculate</PrimaryButton>
        </div>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <div className="mt-4 space-y-2">
          <ResultBox
            label={dir === "grow" ? "Scaled up" : "Scaled down"}
            value={`${format(result.x)} : ${format(result.y)}`}
          />
          {result.simplified && (
            <p className="text-sm text-muted-foreground">
              Simplifies to <span className="font-mono text-foreground">{result.simplified}</span>.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small visual + display helpers
// ─────────────────────────────────────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-base text-foreground">{value}</div>
    </div>
  );
}

function PiePair({ pctA, labelA, labelB }: { pctA: number; labelA: string; labelB: string }) {
  // Two-slice pie via SVG. pctA in [0, 100].
  const size = 140;
  const r = 60;
  const cx = size / 2;
  const cy = size / 2;
  const p = Math.max(0, Math.min(100, pctA)) / 100;
  const angle = p * Math.PI * 2;
  const x2 = cx + r * Math.sin(angle);
  const y2 = cy - r * Math.cos(angle);
  const large = angle > Math.PI ? 1 : 0;
  const slice =
    p <= 0
      ? ""
      : p >= 1
      ? `M ${cx} ${cy} m 0 -${r} a ${r} ${r} 0 1 1 0 ${2 * r} a ${r} ${r} 0 1 1 0 -${2 * r} Z`
      : `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;

  return (
    <figure className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Pie chart showing ${labelA} to ${labelB}`}>
        <circle cx={cx} cy={cy} r={r} fill="var(--color-secondary)" stroke="var(--color-border)" />
        {slice && <path d={slice} fill="var(--color-primary)" />}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" />
      </svg>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        A ({labelA}) vs B ({labelB})
      </figcaption>
    </figure>
  );
}

function BarPair({ pctA, labelA, labelB }: { pctA: number; labelA: string; labelB: string }) {
  const p = Math.max(0, Math.min(100, pctA));
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>A = {labelA}</span>
        <span>B = {labelB}</span>
      </div>
      <div className="flex h-6 w-full overflow-hidden rounded-full border border-border/60 bg-secondary/40">
        <div className="h-full bg-primary" style={{ width: `${p}%` }} aria-label={`A is ${format(p)}% of the total`} />
        <div className="h-full bg-secondary" style={{ width: `${100 - p}%` }} aria-label={`B is ${format(100 - p)}% of the total`} />
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{format(p)}%</span>
        <span>{format(100 - p)}%</span>
      </div>
    </div>
  );
}

function format(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toPrecision(6)).toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function CrossMultiplyMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="30" y="50" className="fill-foreground font-mono" fontSize="16">3</text>
      <text x="60" y="50" className="fill-muted-foreground" fontSize="16">:</text>
      <text x="80" y="50" className="fill-foreground font-mono" fontSize="16">4</text>
      <text x="115" y="50" className="fill-muted-foreground" fontSize="16">=</text>
      <text x="145" y="50" className="fill-foreground font-mono" fontSize="16">600</text>
      <text x="190" y="50" className="fill-muted-foreground" fontSize="16">:</text>
      <text x="205" y="50" className="fill-primary font-mono" fontSize="16">?</text>
      <line x1="35" y1="55" x2="210" y2="80" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="85" y1="55" x2="150" y2="80" stroke="var(--color-primary)" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="110" y="110" textAnchor="middle" className="fill-foreground font-mono" fontSize="13">
        3 · ? = 4 · 600 → ? = 800
      </text>
    </svg>
  );
}

function SimplifyMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="40" className="fill-foreground font-mono" fontSize="15">45 : 60</text>
      <text x="20" y="65" className="fill-muted-foreground" fontSize="11">÷ GCF(45, 60) = 15</text>
      <line x1="20" y1="75" x2="200" y2="75" stroke="var(--color-border)" />
      <text x="20" y="100" className="fill-primary font-mono" fontSize="16">3 : 4</text>
      <text x="105" y="100" className="fill-muted-foreground" fontSize="11">lowest terms</text>
    </svg>
  );
}

function PieShareMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <circle cx="55" cy="65" r="40" fill="var(--color-secondary)" stroke="var(--color-border)" />
      <path d="M 55 25 A 40 40 0 0 1 89.6 85 L 55 65 Z" fill="var(--color-primary)" />
      <text x="115" y="50" className="fill-foreground font-mono" fontSize="12">A = 3 → 42.9%</text>
      <text x="115" y="72" className="fill-foreground font-mono" fontSize="12">B = 4 → 57.1%</text>
      <text x="115" y="94" className="fill-muted-foreground font-mono" fontSize="11">decimal: 0.75 : 1</text>
    </svg>
  );
}

function ScaleMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="40" className="fill-foreground font-mono" fontSize="14">250 : 280</text>
      <text x="120" y="40" className="fill-muted-foreground" fontSize="12">× 2.5</text>
      <path d="M 105 34 L 118 34" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#ra)" />
      <defs>
        <marker id="ra" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 z" className="fill-primary" />
        </marker>
      </defs>
      <text x="20" y="80" className="fill-primary font-mono" fontSize="14">625 : 700</text>
      <text x="20" y="105" className="fill-muted-foreground" fontSize="11">same shape, bigger size</text>
    </svg>
  );
}

const RATIO_GUIDE: GuideCardItem[] = [
  {
    key: "solve",
    title: "Solve a proportion for the missing term",
    explain: (
      <>Given three of the four terms in <span className="font-mono">A : B = C : D</span>,
      cross-multiply to isolate the fourth. Leave any one input blank — the
      solver picks up which term is missing and rearranges automatically.</>
    ),
    formula: <>a · d = b · c</>,
    legend: [{ sym: "?", def: "the blank field you're solving for" }],
    diagram: <CrossMultiplyMini />,
    example: { given: "3 : 4 = 600 : ?", substitute: "? = 4 · 600 ÷ 3", answer: "800" },
  },
  {
    key: "simplify",
    title: "Simplify to lowest terms",
    explain: (
      <>After solving, both terms are divided by their greatest common factor
      so the ratio appears in the smallest whole-number form — the same
      relationship expressed with the shortest labels.</>
    ),
    formula: <>a : b = (a÷g) : (b÷g), &nbsp; g = gcd(a, b)</>,
    legend: [{ sym: "g", def: "GCF of the two terms" }],
    diagram: <SimplifyMini />,
    example: { given: "45 : 60", substitute: "÷ 15", answer: "3 : 4" },
  },
  {
    key: "share",
    title: "Decimal, percentage split & pie chart",
    explain: (
      <>The mini-stats convert your ratio into two more useful readings —
      the decimal form <span className="font-mono">a÷b : 1</span> and the
      part-of-total percentage <span className="font-mono">a÷(a+b)</span>.
      The pie chart and bar make the split visible at a glance.</>
    ),
    formula: <>share_A = a ÷ (a + b) × 100%</>,
    legend: [{ sym: "a + b", def: "the whole (only meaningful for part-to-whole ratios)" }],
    diagram: <PieShareMini />,
    example: { given: "3 : 4", substitute: "3 ÷ 7", answer: "42.9% : 57.1%" },
  },
  {
    key: "scale",
    title: "Scale a ratio up or down",
    explain: (
      <>The separate scaling tool multiplies (grow) or divides (shrink) both
      terms by the same factor. The relationship stays the same — only the
      raw numbers change, useful for recipes, photo resizing and model
      building.</>
    ),
    formula: <>a′ : b′ = (k · a) : (k · b)</>,
    legend: [{ sym: "k", def: "positive scale factor" }],
    diagram: <ScaleMini />,
    example: { given: "250 : 280, grow ×2.5", substitute: "250·2.5 : 280·2.5", answer: "625 : 700" },
  },
];
