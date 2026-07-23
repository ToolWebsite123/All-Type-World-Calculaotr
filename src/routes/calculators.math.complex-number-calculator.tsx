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

export const Route = createFileRoute("/calculators/math/complex-number-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Complex Number Calculator",
      title: "Complex Number Calculator — Add, Subtract, Multiply, Divide",
      metaDescription:
        "Add, subtract, multiply and divide complex numbers in a + bi form with the conjugate method, and see the modulus, argument and every step.",
      canonicalUrl: "/calculators/math/complex-number-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Complex Number Calculator", path: "/calculators/math/complex-number-calculator" },
      ],
      faqs: [
        {
          q: "What does i² = −1 mean?",
          a: "The imaginary unit i is defined so that i·i = −1. This single rule is what lets you multiply complex numbers algebraically — whenever an i² appears, replace it with −1 and combine like terms.",
        },
        {
          q: "How do you divide complex numbers?",
          a: "Multiply the numerator and denominator by the conjugate of the denominator. The conjugate of c + di is c − di, and (c + di)(c − di) = c² + d² is a real number, so the denominator becomes real and you can split the result into real and imaginary parts.",
        },
        {
          q: "What is the modulus of a complex number?",
          a: "For z = a + bi the modulus |z| is √(a² + b²) — the distance from the origin to the point (a, b) in the complex plane.",
        },
        {
          q: "What is the argument of a complex number?",
          a: "The argument arg(z) is the angle the line from the origin to (a, b) makes with the positive real axis, computed with atan2(b, a). It's usually given in radians between −π and π (or in degrees between −180° and 180°).",
        },
      ],
    }),
  component: ComplexPage,
});

// ---------------- Engine ----------------

type Op = "+" | "−" | "×" | "÷";

interface C {
  a: number;
  b: number;
}

function fmtNum(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const r = Math.round(n * 1e10) / 1e10;
  return r.toString();
}

function fmtC(z: C): string {
  const a = fmtNum(z.a);
  if (z.b === 0) return a;
  const absb = Math.abs(z.b);
  const bStr = absb === 1 ? "i" : `${fmtNum(absb)}i`;
  if (z.a === 0) return z.b < 0 ? `−${bStr}` : bStr;
  return z.b < 0 ? `${a} − ${bStr}` : `${a} + ${bStr}`;
}

function add(z1: C, z2: C): C {
  return { a: z1.a + z2.a, b: z1.b + z2.b };
}
function sub(z1: C, z2: C): C {
  return { a: z1.a - z2.a, b: z1.b - z2.b };
}
function mul(z1: C, z2: C): C {
  return { a: z1.a * z2.a - z1.b * z2.b, b: z1.a * z2.b + z1.b * z2.a };
}
function div(z1: C, z2: C): C {
  const denom = z2.a * z2.a + z2.b * z2.b;
  if (denom === 0) throw new Error("Cannot divide by 0 + 0i.");
  const conj: C = { a: z2.a, b: -z2.b };
  const num = mul(z1, conj);
  return { a: num.a / denom, b: num.b / denom };
}

function modulus(z: C): number {
  return Math.hypot(z.a, z.b);
}
function argument(z: C): number {
  return Math.atan2(z.b, z.a);
}

function buildSteps(z1: C, z2: C, op: Op, result: C): Step[] {
  const steps: Step[] = [];
  const Z1 = fmtC(z1);
  const Z2 = fmtC(z2);
  const R = fmtC(result);

  steps.push({
    title: "Given",
    body: (
      <FormulaBlock>
        z₁ = {Z1}
        {"\n"}z₂ = {Z2}
      </FormulaBlock>
    ),
  });

  if (op === "+" || op === "−") {
    const sign = op === "+" ? "+" : "−";
    const ra = op === "+" ? z1.a + z2.a : z1.a - z2.a;
    const rb = op === "+" ? z1.b + z2.b : z1.b - z2.b;
    steps.push({
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>(a + bi) {sign} (c + di) = (a {sign} c) + (b {sign} d)i</>}
          legend={[
            { sym: "a, c", def: "real parts of z₁ and z₂" },
            { sym: "b, d", def: "imaginary parts of z₁ and z₂" },
          ]}
        />
      ),
    });
    steps.push({
      title: "Substitute — combine real and imaginary parts separately",
      body: (
        <FormulaBlock>
          Real: {fmtNum(z1.a)} {sign} {fmtNum(z2.a)} = {fmtNum(ra)}
          {"\n"}Imag: {fmtNum(z1.b)} {sign} {fmtNum(z2.b)} = {fmtNum(rb)}
        </FormulaBlock>
      ),
    });
    steps.push({
      title: "Answer",
      body: (
        <FormulaBlock>
          z₁ {sign} z₂ = <strong>{R}</strong>
        </FormulaBlock>
      ),
    });
  } else if (op === "×") {
    const ac = z1.a * z2.a;
    const ad = z1.a * z2.b;
    const bc = z1.b * z2.a;
    const bd = z1.b * z2.b;
    steps.push({
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>(a + bi)(c + di) = (ac − bd) + (ad + bc)i,&nbsp; using i² = −1</>}
          legend={[
            { sym: "a, c", def: "real parts of z₁ and z₂" },
            { sym: "b, d", def: "imaginary parts of z₁ and z₂" },
            { sym: "i²", def: "the imaginary unit squared, replaced by −1" },
          ]}
        />
      ),
    });
    steps.push({
      title: "Substitute — expand with FOIL, then apply i² = −1",
      body: (
        <FormulaBlock>
          ({fmtNum(z1.a)} + {fmtNum(z1.b)}i)({fmtNum(z2.a)} + {fmtNum(z2.b)}i)
          {"\n"}= {fmtNum(ac)} + {fmtNum(ad)}i + {fmtNum(bc)}i + {fmtNum(bd)}i²
          {"\n"}= ({fmtNum(ac)} − {fmtNum(bd)}) + ({fmtNum(ad)} + {fmtNum(bc)})i
        </FormulaBlock>
      ),
    });
    steps.push({
      title: "Answer",
      body: (
        <FormulaBlock>
          z₁ × z₂ = <strong>{R}</strong>
        </FormulaBlock>
      ),
    });
  } else {
    // division
    const conj: C = { a: z2.a, b: -z2.b };
    const num = mul(z1, conj);
    const denom = z2.a * z2.a + z2.b * z2.b;
    steps.push({
      title: "Write the formula",
      body: (
        <FormulaWithLegend
          formula={<>(a + bi) ÷ (c + di) = [(a + bi)(c − di)] ÷ (c² + d²)</>}
          legend={[
            { sym: "c − di", def: "conjugate of the denominator z₂" },
            { sym: "c² + d²", def: "|z₂|² — always a real, non-negative number" },
          ]}
        />
      ),
    });
    steps.push({
      title: "Substitute — multiply top and bottom by the conjugate",
      body: (
        <FormulaBlock>
          conjugate of {fmtC(z2)} = {fmtC(conj)}
          {"\n"}denominator: {fmtNum(z2.a)}² + {fmtNum(z2.b)}² = {fmtNum(denom)}
          {"\n"}numerator: ({Z1})({fmtC(conj)}) = {fmtC(num)}
          {"\n"}= ({fmtNum(num.a)} + {fmtNum(num.b)}i) ÷ {fmtNum(denom)}
        </FormulaBlock>
      ),
    });
    steps.push({
      title: "Answer",
      body: (
        <FormulaBlock>
          z₁ ÷ z₂ = <strong>{R}</strong>
        </FormulaBlock>
      ),
    });
  }

  // Modulus and argument of the result
  const r = modulus(result);
  const theta = argument(result);
  steps.push({
    title: "Modulus and argument of the result",
    body: (
      <FormulaBlock>
        |z| = √({fmtNum(result.a)}² + {fmtNum(result.b)}²) = {fmtNum(r)}
        {"\n"}arg(z) = atan2({fmtNum(result.b)}, {fmtNum(result.a)}) = {fmtNum(theta)} rad ({fmtNum((theta * 180) / Math.PI)}°)
      </FormulaBlock>
    ),
  });

  return steps;
}


function ArgandDiagram({ z, r, theta }: { z: C; r: number; theta: number }) {
  const w = 320, h = 320, cx = w / 2, cy = h / 2;
  const maxAbs = Math.max(1, Math.abs(z.a), Math.abs(z.b));
  const scale = (Math.min(w, h) / 2 - 30) / maxAbs;
  const toX = (x: number) => cx + x * scale;
  const toY = (y: number) => cy - y * scale;
  const arcR = 24;
  const arcEnd = { x: cx + arcR * Math.cos(-theta), y: cy + arcR * Math.sin(-theta) };
  const largeArc = Math.abs(theta) > Math.PI ? 1 : 0;
  const sweep = theta < 0 ? 1 : 0;

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-sm font-medium text-foreground">
        Complex plane (Argand diagram) — |z| = {fmtNum(r)}, arg(z) = {fmtNum((theta * 180) / Math.PI)}°
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto block h-72 w-72" role="img" aria-label="Argand diagram">
        <defs>
          <marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
          </marker>
        </defs>
        <line x1={0} y1={cy} x2={w} y2={cy} stroke="currentColor" className="text-border" strokeWidth={1} />
        <line x1={cx} y1={0} x2={cx} y2={h} stroke="currentColor" className="text-border" strokeWidth={1} />
        <text x={w - 12} y={cy - 6} className="fill-muted-foreground text-[10px]">Re</text>
        <text x={cx + 6} y={12} className="fill-muted-foreground text-[10px]">Im</text>

        {/* angle arc */}
        {(z.a !== 0 || z.b !== 0) && (
          <path
            d={`M ${cx + arcR} ${cy} A ${arcR} ${arcR} 0 ${largeArc} ${sweep} ${arcEnd.x} ${arcEnd.y}`}
            fill="none"
            stroke="currentColor"
            className="text-muted-foreground"
            strokeWidth={1.5}
          />
        )}

        {/* vector to z */}
        <line
          x1={cx}
          y1={cy}
          x2={toX(z.a)}
          y2={toY(z.b)}
          stroke="currentColor"
          className="text-primary"
          strokeWidth={2.5}
          markerEnd="url(#ah)"
        />
        <circle cx={toX(z.a)} cy={toY(z.b)} r={4} fill="currentColor" className="text-primary" />
        <text x={toX(z.a) + 8} y={toY(z.b) - 8} className="fill-foreground text-[11px] font-medium">
          z = {fmtC(z)}
        </text>
      </svg>
    </div>
  );
}

// ---------------- Page ----------------

function ComplexPage() {
  const [a1, setA1] = useState("3");
  const [b1, setB1] = useState("4");
  const [a2, setA2] = useState("1");
  const [b2, setB2] = useState("2");
  const [op, setOp] = useState<Op>("×");
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [display, setDisplay] = useState<{ value: ReactNode; note: ReactNode; result: C; r: number; theta: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const parse = (s: string, name: string) => {
    const n = Number(s.trim().replace(/[,\s_]/g, ""));
    if (!Number.isFinite(n)) throw new Error(`"${name}" must be a number.`);
    return n;
  };

  const onCalc = () => {
    setErr(null);
    setSteps(null);
    setDisplay(null);
    try {
      const z1: C = { a: parse(a1, "a₁"), b: parse(b1, "b₁") };
      const z2: C = { a: parse(a2, "a₂"), b: parse(b2, "b₂") };
      let result: C;
      switch (op) {
        case "+":
          result = add(z1, z2);
          break;
        case "−":
          result = sub(z1, z2);
          break;
        case "×":
          result = mul(z1, z2);
          break;
        case "÷":
          result = div(z1, z2);
          break;
      }
      const r = modulus(result);
      const theta = argument(result);
      setSteps(buildSteps(z1, z2, op, result));
      setDisplay({
        value: <span className="font-mono">{fmtC(result)}</span>,
        note: (
          <span className="font-mono">
            |z| = {fmtNum(r)} · arg(z) = {fmtNum(theta)} rad (
            {fmtNum((theta * 180) / Math.PI)}°)
          </span>
        ),
        result,
        r,
        theta,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input.");
    }
  };

  const ops: Op[] = ["+", "−", "×", "÷"];

  return (
    <MathCalcPage
      name="Complex Number Calculator"
      tagline="Add, subtract, multiply and divide complex numbers in a + bi form. The result is shown in standard form together with its modulus and argument, and every step is worked out below."
      extras={
        <>
<CalcSection title="What is a complex number?">
            <p>
              A complex number has the form <span className="font-mono">a + bi</span>,
              where <span className="font-mono">a</span> is the real part,{" "}
              <span className="font-mono">b</span> is the imaginary part and{" "}
              <span className="font-mono">i</span> is the imaginary unit
              defined by <span className="font-mono">i² = −1</span>. Complex
              numbers extend the real numbers so that every polynomial
              equation — including <span className="font-mono">x² + 1 = 0</span> —
              has a solution. When <span className="font-mono">b = 0</span>{" "}
              the number is purely real; when <span className="font-mono">a = 0</span>{" "}
              and <span className="font-mono">b ≠ 0</span> it is purely
              imaginary.
            </p>
          </CalcSection>

          <CalcSection title="Complex arithmetic, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one operation this tool performs on your two
              inputs — how it combines them, what happens to{" "}
              <span className="font-mono">i²</span>, and how it strips the
              imaginary unit out of the denominator when dividing.
            </p>
            <GuideCards items={COMPLEX_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Accepts complex numbers as separate real and imaginary parts",
                "Supports addition, subtraction, multiplication and division",
                "Divides using the conjugate method — no imaginary numbers left in the denominator",
                "Reports the modulus |z| and the argument arg(z) in radians and degrees",
                "Shows the full step-by-step working for the chosen operation",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Why do we need i at all?",
                  a: (
                    <p>
                      Without i, equations like x² = −1 have no solution. By
                      defining i so that i² = −1, every polynomial equation
                      has as many roots as its degree — a result known as
                      the fundamental theorem of algebra.
                    </p>
                  ),
                },
                {
                  q: "Is the argument in radians or degrees?",
                  a: (
                    <p>
                      This calculator reports both. The primary value is in
                      radians (between −π and π) because atan2 works in
                      radians; the degree version (between −180° and 180°)
                      is shown alongside it.
                    </p>
                  ),
                },
                {
                  q: "What is the conjugate of a real number?",
                  a: (
                    <p>
                      The conjugate of <span className="font-mono">a + 0i</span>{" "}
                      is <span className="font-mono">a − 0i = a</span> — a
                      real number is its own conjugate.
                    </p>
                  ),
                },
                {
                  q: "Can I divide by zero?",
                  a: (
                    <p>
                      No. Dividing by <span className="font-mono">0 + 0i</span>{" "}
                      is undefined, just like dividing by zero in the real
                      numbers. The calculator flags this as an error.
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
                  to: "/calculators/math/quadratic-formula-calculator",
                  label: "Quadratic Formula Calculator (handles complex roots when the discriminant is negative)",
                },
                {
                  to: "/calculators/math/scientific-calculator",
                  label: "Scientific Calculator",
                },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <div className="mb-3 text-sm font-medium text-foreground">
            z₁ = a₁ + b₁ i
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Real part a₁" htmlFor="a1">
              <TextInput id="a1" value={a1} onChange={(e) => setA1(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Imaginary part b₁" htmlFor="b1">
              <TextInput id="b1" value={b1} onChange={(e) => setB1(e.target.value)} inputMode="decimal" />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <Field label="Operation" htmlFor="op">
            <div className="flex flex-wrap gap-2">
              {ops.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOp(o)}
                  className={`h-10 min-w-12 rounded-lg border px-4 font-mono text-base transition ${
                    op === o
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={op === o}
                >
                  {o}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <div className="mb-3 text-sm font-medium text-foreground">
            z₂ = a₂ + b₂ i
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Real part a₂" htmlFor="a2">
              <TextInput id="a2" value={a2} onChange={(e) => setA2(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Imaginary part b₂" htmlFor="b2">
              <TextInput id="b2" value={b2} onChange={(e) => setB2(e.target.value)} inputMode="decimal" />
            </Field>
          </div>
        </div>

        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {display && (
        <>
          <ResultBox label="Result" value={display.value} note={display.note} />
          <ArgandDiagram z={display.result} r={display.r} theta={display.theta} />
          {steps && <StepsToggle steps={steps} />}
        </>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function AddSubMini() {
  return (
    <svg viewBox="0 0 200 110" className="w-full">
      <rect x="1" y="1" width="198" height="108" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <line x1="20" y1="90" x2="180" y2="90" stroke="var(--color-border)" />
      <line x1="100" y1="15" x2="100" y2="105" stroke="var(--color-border)" />
      <line x1="100" y1="90" x2="130" y2="50" stroke="var(--color-primary)" strokeWidth="1.5" markerEnd="url(#carr)" />
      <line x1="130" y1="50" x2="140" y2="30" stroke="var(--color-primary)/0.7" strokeWidth="1.5" strokeDasharray="3 2" markerEnd="url(#carr)" />
      <line x1="100" y1="90" x2="140" y2="30" stroke="var(--color-foreground)" strokeWidth="1.5" markerEnd="url(#carr)" />
      <defs><marker id="carr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="currentColor" /></marker></defs>
      <text x="100" y="105" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">tip-to-tail addition</text>
    </svg>
  );
}

function FoilMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <text x="110" y="25" textAnchor="middle" fontSize="12" fill="var(--color-primary)">(a + bi)(c + di)</text>
      <text x="110" y="50" textAnchor="middle" fontSize="10" fill="var(--color-foreground)">= ac + adi + bci + bd·i²</text>
      <text x="110" y="72" textAnchor="middle" fontSize="10" fill="var(--color-foreground)">i² = −1</text>
      <text x="110" y="92" textAnchor="middle" fontSize="12" fill="var(--color-primary)">= (ac − bd) + (ad + bc)i</text>
    </svg>
  );
}

function ConjugateMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <text x="110" y="25" textAnchor="middle" fontSize="11" fill="var(--color-primary)">(a+bi) / (c+di) · (c−di)/(c−di)</text>
      <text x="110" y="55" textAnchor="middle" fontSize="12" fill="var(--color-foreground)">denominator = c² + d² (real!)</text>
      <text x="110" y="80" textAnchor="middle" fontSize="10" fill="var(--color-muted-foreground)">i cleared → split real & imag</text>
    </svg>
  );
}

function ArgandMini() {
  return (
    <svg viewBox="0 0 200 110" className="w-full">
      <rect x="1" y="1" width="198" height="108" rx="10" fill="var(--color-secondary)/0.15" stroke="var(--color-border)" />
      <line x1="20" y1="80" x2="180" y2="80" stroke="var(--color-border)" />
      <line x1="30" y1="15" x2="30" y2="100" stroke="var(--color-border)" />
      <line x1="30" y1="80" x2="120" y2="35" stroke="var(--color-primary)" strokeWidth="1.5" />
      <circle cx="120" cy="35" r="3" fill="var(--color-primary)" />
      <text x="128" y="32" fontSize="10" fill="var(--color-primary)">a + bi</text>
      <path d="M55 80 A 25 25 0 0 0 50 65" fill="none" stroke="var(--color-muted-foreground)" />
      <text x="60" y="75" fontSize="9" fill="var(--color-muted-foreground)">θ</text>
      <text x="75" y="55" fontSize="9" fill="var(--color-muted-foreground)">|z|</text>
      <text x="100" y="102" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">|z| = √(a²+b²), arg = atan2(b,a)</text>
    </svg>
  );
}

const COMPLEX_GUIDE: GuideCardItem[] = [
  {
    key: "addsub",
    title: "Add & subtract — combine like parts",
    explain: (
      <>Real parts add to real parts, imaginary to imaginary. Geometrically
        this is head-to-tail arrow addition in the complex plane.</>
    ),
    formula: <>(a+bi) ± (c+di) = (a±c) + (b±d)i</>,
    diagram: <AddSubMini />,
    example: {
      given: <span className="font-mono">(3+4i) + (1+2i)</span>,
      substitute: <>(3+1) + (4+2)i</>,
      answer: <span className="font-mono">4 + 6i</span>,
    },
  },
  {
    key: "mul",
    title: "Multiply — FOIL, then replace i²",
    explain: (
      <>Expand the brackets like ordinary binomials, then use{" "}
        <span className="font-mono">i² = −1</span> to convert the imaginary
        square back into a real term and collect like parts.</>
    ),
    formula: <>(a+bi)(c+di) = (ac − bd) + (ad + bc)i</>,
    diagram: <FoilMini />,
    example: {
      given: <span className="font-mono">(3+4i)(1+2i)</span>,
      substitute: <>3 + 6i + 4i + 8i² = 3 + 10i − 8</>,
      answer: <span className="font-mono">−5 + 10i</span>,
    },
  },
  {
    key: "div",
    title: "Divide — multiply by the conjugate",
    explain: (
      <>To clear <span className="font-mono">i</span> from the denominator,
        multiply top and bottom by the denominator's conjugate. The product{" "}
        <span className="font-mono">(c+di)(c−di) = c² + d²</span> is real, so
        the answer splits cleanly into real and imaginary parts.</>
    ),
    formula: <>(a+bi)/(c+di) = ((ac+bd)+(bc−ad)i)/(c²+d²)</>,
    diagram: <ConjugateMini />,
    example: {
      given: <span className="font-mono">(3+4i)/(1+2i)</span>,
      substitute: <>· (1−2i)/(1−2i) → (11 − 2i)/5</>,
      answer: <span className="font-mono">2.2 − 0.4i</span>,
    },
  },
  {
    key: "polar",
    title: "Modulus & argument — the polar view",
    explain: (
      <>Every complex number is a point <span className="font-mono">(a, b)</span>{" "}
        in the plane. Its distance from the origin is the modulus and its
        angle with the positive real axis is the argument.</>
    ),
    formula: <>|z| = √(a²+b²) · arg(z) = atan2(b, a)</>,
    diagram: <ArgandMini />,
    example: {
      given: <span className="font-mono">z = 3 + 4i</span>,
      substitute: <>√(9+16), atan2(4, 3)</>,
      answer: <span className="font-mono">|z|=5, arg≈53.13°</span>,
    },
  },
];
