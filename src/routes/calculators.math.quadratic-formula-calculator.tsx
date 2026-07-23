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
import { ParabolaGraph } from "@/components/ParabolaGraph";
import { solveQuadratic } from "@/lib/math/quadratic";

const FAQS = [
  {
    q: "What is the quadratic formula?",
    a: "The quadratic formula, x = (−b ± √(b² − 4ac)) / (2a), gives the exact solutions to any equation of the form ax² + bx + c = 0 as long as a is not zero.",
  },
  {
    q: "What does the discriminant mean?",
    a: "The discriminant is b² − 4ac. If it is positive, the equation has two distinct real roots; if it is zero, one repeated real root; if it is negative, two complex conjugate roots and no real solution.",
  },
  {
    q: "Can the quadratic formula solve any equation?",
    a: "It solves every quadratic — any equation that fits ax² + bx + c = 0 with a ≠ 0. It does not solve higher-degree polynomials (cubic, quartic, and beyond) directly.",
  },
  {
    q: "Can a, b, or c be fractions or decimals?",
    a: "Yes. This calculator accepts fractions such as 1/4 or -3/2 and decimals such as 0.5 for each coefficient.",
  },
];

export const Route = createFileRoute("/calculators/math/quadratic-formula-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Quadratic Formula Calculator",
      title: "Quadratic Formula Calculator — Real & Complex Roots",
      metaDescription:
        "Solve ax² + bx + c = 0 with a live parabola, discriminant analysis, step-by-step working, and support for fractions and decimals.",
      canonicalUrl: "/calculators/math/quadratic-formula-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Quadratic Formula Calculator", path: "/calculators/math/quadratic-formula-calculator" },
      ],
      faqs: FAQS.map((f) => ({ q: f.q, a: f.a })),
    }),
  component: QuadraticPage,
});

/** Accepts integers, decimals, and fractions like "-1/4". */
function parseCoef(raw: string): number {
  const s = raw.trim();
  if (!s) throw new Error("Empty coefficient");
  if (s.includes("/")) {
    const [n, d] = s.split("/");
    const num = Number(n);
    const den = Number(d);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
      throw new Error(`Invalid fraction: ${raw}`);
    }
    return num / den;
  }
  const v = Number(s);
  if (!Number.isFinite(v)) throw new Error(`Invalid number: ${raw}`);
  return v;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  return parseFloat(n.toPrecision(10)).toString();
}

function QuadraticPage() {
  const [a, setA] = useState("1");
  const [b, setB] = useState("-3");
  const [c, setC] = useState("2");

  const [result, setResult] = useState<React.ReactNode | null>(null);
  const [note, setNote] = useState<React.ReactNode | null>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Live-parse for the graph so it updates as user types.
  const parsed = useMemo(() => {
    try {
      return { a: parseCoef(a), b: parseCoef(b), c: parseCoef(c), ok: true as const };
    } catch {
      return { a: 0, b: 0, c: 0, ok: false as const };
    }
  }, [a, b, c]);

  const compute = () => {
    setErr(null);
    setResult(null);
    setNote(null);
    setSteps(null);
    let an: number, bn: number, cn: number;
    try {
      an = parseCoef(a);
      bn = parseCoef(b);
      cn = parseCoef(c);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input");
      return;
    }
    try {
      const r = solveQuadratic(an, bn, cn);
      const disc = r.discriminant;

      const buildSteps = (): Step[] => {
        const s: Step[] = [
          {
            title: "Given",
            body: (
              <FormulaBlock>
                a = {fmt(an)}, b = {fmt(bn)}, c = {fmt(cn)} → {fmt(an)}x² + {fmt(bn)}x + {fmt(cn)} = 0
              </FormulaBlock>
            ),
          },
          {
            title: "Write the quadratic formula",
            body: (
              <FormulaWithLegend
                formula={<>x = (−b ± √(b² − 4ac)) / (2a)</>}
                legend={[
                  { sym: "a, b, c", def: "coefficients of x², x, and the constant" },
                  { sym: "b² − 4ac", def: "the discriminant D" },
                  { sym: "±", def: "produces both roots" },
                ]}
              />
            ),
          },
          {
            title: "Substitute a, b, c",
            body: (
              <FormulaBlock>
                x = (−({fmt(bn)}) ± √(({fmt(bn)})² − 4·({fmt(an)})·({fmt(cn)}))) / (2·({fmt(an)}))
              </FormulaBlock>
            ),
          },
          {
            title: "Compute the discriminant b² − 4ac",
            body: (
              <FormulaBlock>
                D = ({fmt(bn)})² − 4·({fmt(an)})·({fmt(cn)}) = {fmt(bn * bn)} − {fmt(4 * an * cn)} = {fmt(disc)}
              </FormulaBlock>
            ),
          },
        ];
        if (disc > 0) {
          const sq = Math.sqrt(disc);
          s.push({
            title: "Simplify √D",
            body: <FormulaBlock>√{fmt(disc)} = {fmt(sq)}</FormulaBlock>,
          });
          s.push({
            title: "Answer — two real roots",
            body: (
              <FormulaBlock>
                x = (−({fmt(bn)}) ± {fmt(sq)}) / (2·({fmt(an)})) → x₁ = {fmt(r.roots[0])}, x₂ = {fmt(r.roots[1])}
              </FormulaBlock>
            ),
          });
        } else if (disc === 0) {
          s.push({
            title: "Simplify √D",
            body: <FormulaBlock>√0 = 0</FormulaBlock>,
          });
          s.push({
            title: "Answer — one repeated root",
            body: (
              <FormulaBlock>
                x = −({fmt(bn)}) / (2·({fmt(an)})) = {fmt(r.roots[0])}
              </FormulaBlock>
            ),
          });
        } else if (r.complex) {
          const abs = Math.abs(disc);
          s.push({
            title: "√D is imaginary",
            body: (
              <FormulaBlock>
                √({fmt(disc)}) = √({fmt(abs)})·i = {fmt(Math.sqrt(abs))}i
              </FormulaBlock>
            ),
          });
          s.push({
            title: "Answer — complex conjugate roots",
            body: (
              <FormulaBlock>
                x = (−({fmt(bn)}) ± {fmt(Math.sqrt(abs))}i) / (2·({fmt(an)})) = {fmt(r.complex.real)} ± {fmt(r.complex.imag)}i
              </FormulaBlock>
            ),
          });
        }
        return s;
      };

      if (r.kind === "two-real") {
        setResult(
          <span>
            x₁ = {fmt(r.roots[0])} &nbsp;·&nbsp; x₂ = {fmt(r.roots[1])}
          </span>,
        );
        setNote(<>Discriminant = {fmt(disc)} (positive → two distinct real roots).</>);
      } else if (r.kind === "repeated") {
        setResult(<span>x = {fmt(r.roots[0])} (repeated root)</span>);
        setNote(<>Discriminant = 0 → one repeated real root.</>);
      } else if (r.complex) {
        setResult(
          <span>
            x = {fmt(r.complex.real)} ± {fmt(r.complex.imag)}i
          </span>,
        );
        setNote(<>Discriminant = {fmt(disc)} (negative → complex conjugate roots, no real solution).</>);
      }
      setSteps(buildSteps());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input");
    }
  };

  return (
    <MathCalcPage
      name="Quadratic Formula Calculator"
      tagline="Solve any equation of the form ax² + bx + c = 0. See the parabola, the roots, the vertex, and every step of the working — with support for fractions and decimals."
      extras={
        <>
          <CalcSection title="What is a quadratic equation?">
            <p>
              A quadratic equation is any polynomial equation of degree two — the highest
              power of the unknown is 2. In standard form it looks like{" "}
              <span className="font-mono">ax² + bx + c = 0</span>, where{" "}
              <span className="font-mono">a ≠ 0</span>. Graphed, <span className="font-mono">y = ax² + bx + c</span>{" "}
              is a parabola: it opens upward when <span className="font-mono">a &gt; 0</span> and
              downward when <span className="font-mono">a &lt; 0</span>. This calculator uses the
              quadratic formula because it works for every case — integer, irrational, or complex roots.
            </p>
          </CalcSection>

          <CalcSection title="Quadratic formula, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one part of what happens when you press Solve — from the formula
              itself and its derivation, through the discriminant, to the three shapes the answer
              can take.
            </p>
            <GuideCards items={QUAD_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Solves ax\u00b2 + bx + c = 0 with real or complex roots",
                "Accepts fractional and decimal coefficients (e.g. 1/4, \u22120.75)",
                "Live SVG parabola with labeled roots, vertex, and axis of symmetry",
                "Full step-by-step working \u2014 substitution, discriminant, simplification",
                "Explains what the discriminant tells you about the roots",
              ]}
            />
          </CalcSection>


          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ items={FAQS.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))} />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/root-calculator", label: "Root Calculator" },
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
                { to: "/calculators/math/scientific-calculator", label: "Scientific Calculator" },
                { to: "/calculators/math/percentage-calculator", label: "Percentage Calculator" },
                { to: "/calculators/math/number-base-calculator", label: "Number Base Converter" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Field label="a" htmlFor="qa" hint="Coefficient of x²">
          <TextInput id="qa" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} />
        </Field>
        <Field label="b" htmlFor="qb" hint="Coefficient of x">
          <TextInput id="qb" inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} />
        </Field>
        <Field label="c" htmlFor="qc" hint="Constant (e.g. 1/4)">
          <TextInput id="qc" inputMode="decimal" value={c} onChange={(e) => setC(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">Solve</PrimaryButton>
        </div>
      </div>

      {err && <ErrorBox message={err} />}
      {result && <ResultBox label="Roots" value={result} note={note ?? undefined} />}

      {parsed.ok && <ParabolaGraph a={parsed.a} b={parsed.b} c={parsed.c} />}

      {steps && <StepsToggle steps={steps} />}
    </MathCalcPage>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function ParabolaMini({ a = 1, roots = [1, 2] as [number, number] | null }) {
  const w = 220, h = 130, cx = w / 2, cy = 90;
  const s = 25;
  const pts: string[] = [];
  for (let px = -4; px <= 4; px += 0.1) {
    const py = a * (px - 1.5) * (px - 1.5) - 0.5;
    pts.push(`${cx + px * s},${cy - py * s}`);
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto h-32 w-full max-w-[240px]">
      <line x1="10" y1={cy} x2={w - 10} y2={cy} stroke="var(--color-border)" />
      <polyline fill="none" stroke="var(--color-primary)" strokeWidth="2" points={pts.join(" ")} />
      {roots && roots.map((r, i) => (
        <circle key={i} cx={cx + r * s} cy={cy} r="4" className="fill-primary" />
      ))}
      <text x={cx + 1.5 * s} y={cy + 22} textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="11">vertex</text>
    </svg>
  );
}

function DiscMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="30" className="fill-foreground font-mono" fontSize="12">D = b² − 4ac</text>
      <line x1="20" y1="42" x2="200" y2="42" stroke="var(--color-border)" />
      <text x="20" y="62" className="fill-primary font-mono" fontSize="12">D &gt; 0</text>
      <text x="80" y="62" className="fill-foreground" fontSize="11">2 distinct real roots</text>
      <text x="20" y="86" className="fill-primary font-mono" fontSize="12">D = 0</text>
      <text x="80" y="86" className="fill-foreground" fontSize="11">1 repeated real root</text>
      <text x="20" y="110" className="fill-primary font-mono" fontSize="12">D &lt; 0</text>
      <text x="80" y="110" className="fill-foreground" fontSize="11">2 complex conjugates</text>
    </svg>
  );
}

function DerivMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <text x="20" y="24" className="fill-foreground font-mono" fontSize="11">ax² + bx + c = 0</text>
      <text x="20" y="44" className="fill-muted-foreground font-mono" fontSize="11">÷a</text>
      <text x="20" y="64" className="fill-foreground font-mono" fontSize="11">x² + (b/a)x = −c/a</text>
      <text x="20" y="84" className="fill-muted-foreground font-mono" fontSize="11">complete square</text>
      <text x="20" y="104" className="fill-foreground font-mono" fontSize="11">(x + b/2a)² = D/4a²</text>
      <text x="20" y="122" className="fill-primary font-mono" fontSize="11">x = (−b ± √D)/2a</text>
    </svg>
  );
}

function ComplexMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <line x1="20" y1="70" x2="200" y2="70" stroke="var(--color-border)" />
      <line x1="110" y1="15" x2="110" y2="120" stroke="var(--color-border)" />
      <text x="200" y="82" className="fill-muted-foreground" fontSize="10">Re</text>
      <text x="115" y="20" className="fill-muted-foreground" fontSize="10">Im</text>
      <circle cx="140" cy="40" r="4" className="fill-primary" />
      <circle cx="140" cy="100" r="4" className="fill-primary" />
      <text x="148" y="40" className="fill-foreground font-mono" fontSize="11">a+bi</text>
      <text x="148" y="112" className="fill-foreground font-mono" fontSize="11">a−bi</text>
    </svg>
  );
}

const QUAD_GUIDE: GuideCardItem[] = [
  {
    key: "formula",
    title: "The quadratic formula",
    explain: (
      <>The formula returns both roots at once. The <span className="font-mono">±</span> gives
      the two solutions; the expression under the square root — the <em>discriminant</em> —
      controls what kind of roots you get.</>
    ),
    formula: <>x = (−b ± √(b² − 4ac)) / (2a)</>,
    legend: [
      { sym: "a, b, c", def: "coefficients from ax² + bx + c = 0" },
      { sym: "±", def: "produces two roots" },
      { sym: "b² − 4ac", def: "the discriminant D" },
    ],
    diagram: <ParabolaMini />,
    example: { given: "x² − 3x + 2 = 0", substitute: "(3 ± √(9−8))/2 = (3 ± 1)/2", answer: "x = 2 or 1" },
  },
  {
    key: "disc",
    title: "The discriminant tells you the shape of the answer",
    explain: (
      <>Before you even solve, <span className="font-mono">D = b² − 4ac</span> tells you
      whether the parabola crosses the x-axis twice, touches it once, or misses it entirely.</>
    ),
    formula: <>D = b² − 4ac</>,
    legend: [{ sym: "D", def: "the discriminant" }],
    diagram: <DiscMini />,
    example: { given: "x² − 4x + 4 = 0", substitute: "16 − 16 = 0", answer: "one repeated root x = 2" },
  },
  {
    key: "derive",
    title: "Where the formula comes from",
    explain: (
      <>The formula is what you get by <em>completing the square</em> on the general
      quadratic. Each line below is one algebraic step from{" "}
      <span className="font-mono">ax² + bx + c = 0</span> to{" "}
      <span className="font-mono">x = (−b ± √D)/2a</span>.</>
    ),
    formula: <>(x + b/2a)² = (b² − 4ac) / 4a²</>,
    legend: [{ sym: "complete the square", def: "the technique the formula is derived from" }],
    diagram: <DerivMini />,
    example: { given: "any a, b, c", substitute: "divide by a, complete square, √", answer: "x = (−b ± √D)/2a" },
  },
  {
    key: "complex",
    title: "Complex roots when D &lt; 0",
    explain: (
      <>When the discriminant is negative the square root is imaginary and the two roots
      form a <em>complex conjugate pair</em> <span className="font-mono">a ± bi</span>.
      The parabola never touches the x-axis, but the algebra still returns two valid roots.</>
    ),
    formula: <>x = −b/(2a) ± i·√|D|/(2a)</>,
    legend: [{ sym: "i", def: "the imaginary unit, i² = −1" }],
    diagram: <ComplexMini />,
    example: { given: "x² + 1 = 0", substitute: "D = −4, √−4 = 2i", answer: "x = ±i" },
  },
];
