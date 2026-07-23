import { createFileRoute } from "@tanstack/react-router";
import { buildCalculatorSeo } from "@/components/SEO";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ScientificCalculator } from "@/components/calculator/ScientificCalculator";
import {
  CalcSection,
  GuideCards,
  FeatureList,
  CalcFAQ,
  RelatedLinks,
  StructuredExample,
  type GuideCardItem,
} from "@/components/MathCalcPage";

const SCIENTIFIC_FAQS = [
  {
    q: "What's the difference between degrees and radians?",
    a: "Degrees and radians are two units for measuring angles. A full circle is 360° or 2π radians, so 180° = π radians and 90° = π/2 radians. Degrees are common in geometry and everyday problems; radians are the natural unit for calculus, physics and anything using the unit circle. Use the Deg / Rad toggle at the top of the calculator to switch — if a trig result looks wrong, the mode is almost always why.",
  },
  {
    q: "How do the memory keys (M+, M−, MR) work?",
    a: "The calculator has one memory slot that starts at 0. M+ evaluates the current expression and adds the result to memory; M− subtracts it. MR (memory recall) inserts the stored value into your expression so you can reuse it. A small \u201cM\u201d badge appears at the top of the calculator whenever memory is non-zero. Press AC to clear the current entry — memory is preserved until you overwrite it with M+ / M−.",
  },
  {
    q: "Does this calculator follow the standard order of operations?",
    a: "Yes. Expressions follow standard precedence (PEMDAS / BODMAS): parentheses first, then exponents, then multiplication and division left-to-right, then addition and subtraction left-to-right. So 2 + 3 × 4 evaluates to 14, and (2 + 3) × 4 evaluates to 20. Use parentheses whenever you want to override the default order.",
  },
  {
    q: "Can I use my keyboard instead of clicking buttons?",
    a: "Yes. Digits 0–9, the operators + − * / ^ %, parentheses ( ), and the decimal point . all type directly into the expression. Enter or = evaluates, Backspace deletes the last character, and Escape clears everything. Press H to toggle the history panel and D to switch between degrees and radians.",
  },
  {
    q: "What does the Ans key do?",
    a: "Ans inserts the result of your most recent calculation into the current expression, so you can chain calculations without retyping. For example, compute 25 × 4, then press +, Ans, = to add the previous answer (100) to itself. The history panel (top-right clock icon) also lets you tap any past result to load it back into the display.",
  },
];

export const Route = createFileRoute("/calculators/math/scientific-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Scientific Calculator",
      title: "Scientific Calculator — Free Online Sin, Cos, Log & More",
      metaDescription:
        "Free online scientific calculator with trigonometry, logarithms, exponents, roots, memory and history. Works in degrees or radians, fully keyboard-friendly.",
      canonicalUrl: "/calculators/math/scientific-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Scientific Calculator", path: "/calculators/math/scientific-calculator" },
      ],
      faqs: SCIENTIFIC_FAQS,
    }),
  component: ScientificPage,
});

function ScientificPage() {
  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-6 pt-6 pb-24">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Math", to: "/calculators/math" },
            { label: "Scientific Calculator" },
          ]}
        />
        <header className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Scientific Calculator
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            A full-featured scientific calculator with trigonometry, logarithms,
            exponents, roots, memory and a running history — right in your
            browser, no install required.
          </p>
        </header>

        <ScientificCalculator />

        <div className="mt-12 space-y-10 text-[15px] leading-relaxed text-muted-foreground">
          <CalcSection title="What is a scientific calculator?">
            <p>
              A <strong>scientific calculator</strong> handles the operations
              you meet in algebra, trigonometry, statistics and the sciences —
              things a basic four-function calculator can't do. Beyond the
              usual arithmetic it evaluates trig functions (sine, cosine,
              tangent and inverses), logarithms in base <code>e</code> and 10,
              powers and roots of any degree, factorials, and constants such as
              π and <code>e</code>.
            </p>
            <p>
              It also respects <strong>operator precedence</strong>, so{" "}
              <code>2 + 3 × 4</code> evaluates to 14 (not 20), and lets you
              store intermediate answers in memory so long calculations don't
              have to be retyped. The next section walks through each capability
              key by key.

            </p>
          </CalcSection>

          <CalcSection title="Scientific calculator explained, key by key">
            <p className="text-sm text-muted-foreground">
              Every card pairs a plain-English explanation with the rule or
              formula, a small keypad diagram, and a worked example — so you can
              see the button and the arithmetic side by side.
            </p>
            <GuideCards items={SCI_GUIDE} />
          </CalcSection>

          <CalcSection title="Worked examples — full Given / Formula / Substitute / Answer">
            <StructuredExample
              title="Evaluate 2 + 3 × 4² using PEMDAS"
              given={<>The expression 2 + 3 × 4², with standard operator precedence.</>}
              formula={<>result = a + b × cⁿ, evaluated as parentheses → exponent → × ÷ → + −</>}
              legend={[
                { sym: "a, b, c", def: "operands (here 2, 3, 4)" },
                { sym: "n", def: "exponent (here 2)" },
              ]}
              substitute={<>2 + 3 × 4² = 2 + 3 × 16 = 2 + 48</>}
              answer={<>50</>}
              note={<>Exponent runs before multiplication, and multiplication before addition — no parentheses needed.</>}
            />
            <StructuredExample
              title="Solve sin 30° in Deg mode"
              given={<>Angle θ = 30°, calculator toggle set to <strong>Deg</strong>.</>}
              formula={<>sin(θ) — reads θ in degrees when the Deg toggle is on</>}
              legend={[{ sym: "θ", def: "angle in degrees" }]}
              substitute={<>sin(30°) = 1 / 2</>}
              answer={<>0.5</>}
              note={<>Switching to Rad instead would treat 30 as radians and return sin(30 rad) ≈ −0.988.</>}
            />
            <StructuredExample
              title="Chain a result with Ans and memory"
              given={<>Compute 25 × 4, store it with M+, add 50 using Ans, then recall memory.</>}
              formula={<>Ans = last_result, &nbsp; M ← M + current_result</>}
              legend={[
                { sym: "Ans", def: "most recent evaluated result" },
                { sym: "M", def: "single memory slot, starts at 0" },
              ]}
              substitute={<>25 × 4 = 100 → M = 0 + 100 = 100; &nbsp; Ans + 50 = 100 + 50 = 150; &nbsp; MR → 100</>}
              answer={<>Ans chain = 150, &nbsp; memory recall = 100</>}
            />
          </CalcSection>


          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Full keypad with trigonometric, logarithmic, and exponential functions.",
                "Degrees / radians toggle — the same keypad works for geometry and calculus.",
                "Memory keys (M+, M−, MR, MC) and a running expression history you can tap to reuse.",
                "Follows standard operator precedence (PEMDAS) with full parenthesis support.",
                "Keyboard input for digits, operators, parentheses, Enter to evaluate and Esc to clear.",
                "Ans key inserts the last result so you can chain calculations without retyping.",
              ]}
            />
          </CalcSection>

          <CalcSection title="Frequently asked questions">
            <CalcFAQ items={SCIENTIFIC_FAQS} />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/", label: "Basic Calculator" },
                { to: "/calculators/math/fraction-calculator", label: "Fraction Calculator" },
                { to: "/calculators/math/percentage-calculator", label: "Percentage Calculator" },
                { to: "/calculators/math/log-calculator", label: "Logarithm Calculator" },
              ]}
            />
          </CalcSection>
        </div>
      </section>
    </Layout>
  );
}

/* ---------------- Guide diagrams ---------------- */

function KeyBadge({ x, y, label, hi }: { x: number; y: number; label: string; hi?: boolean }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={38}
        height={26}
        rx={6}
        fill={hi ? "var(--color-primary) / 0.22" : "var(--color-secondary)"}
        stroke={hi ? "var(--color-primary)" : "var(--color-border)"}
        strokeWidth={hi ? 1.5 : 1}
      />
      <text
        x={x + 19}
        y={y + 17}
        textAnchor="middle"
        className={hi ? "fill-primary" : "fill-foreground"}
        fontSize="12"
        fontFamily="ui-monospace, monospace"
      >
        {label}
      </text>
    </g>
  );
}

function PemdasMini() {
  const items = ["( )", "xⁿ", "× ÷", "+ −"];
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      {items.map((t, i) => (
        <KeyBadge key={i} x={20 + i * 46} y={20} label={t} hi={i === 0} />
      ))}
      <text x="110" y="72" textAnchor="middle" className="fill-muted-foreground" fontSize="11">
        evaluated left → right
      </text>
      <text x="110" y="102" textAnchor="middle" className="fill-foreground font-mono" fontSize="13">
        2 + 3 × 4 = 14
      </text>
    </svg>
  );
}

function TrigMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <circle cx="60" cy="65" r="42" fill="none" stroke="var(--color-border)" />
      <line x1="60" y1="65" x2="102" y2="65" stroke="var(--color-muted-foreground)" />
      <line x1="60" y1="65" x2="60" y2="23" stroke="var(--color-primary)" strokeWidth="2" />
      <path d="M 90 65 A 30 30 0 0 0 60 35" fill="none" stroke="var(--color-primary)" />
      <text x="72" y="55" className="fill-primary" fontSize="10">90°</text>
      <KeyBadge x={130} y={30} label="Deg" hi />
      <KeyBadge x={130} y={64} label="Rad" />
      <text x="175" y="47" className="fill-foreground font-mono" fontSize="12">sin 90 = 1</text>
      <text x="175" y="82" className="fill-muted-foreground font-mono" fontSize="11">sin π/2 = 1</text>
    </svg>
  );
}

function LogMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <KeyBadge x={20} y={20} label="log" hi />
      <KeyBadge x={20} y={54} label="ln" />
      <KeyBadge x={20} y={88} label="10ˣ" />
      <text x="80" y="38" className="fill-foreground font-mono" fontSize="12">log 1000 = 3</text>
      <text x="80" y="72" className="fill-foreground font-mono" fontSize="12">ln e = 1</text>
      <text x="80" y="106" className="fill-foreground font-mono" fontSize="12">10² = 100</text>
    </svg>
  );
}

function PowRootMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <KeyBadge x={20} y={20} label="xⁿ" hi />
      <KeyBadge x={20} y={54} label="√" />
      <KeyBadge x={20} y={88} label="ⁿ√" />
      <text x="80" y="38" className="fill-foreground font-mono" fontSize="12">2 ^ 10 = 1024</text>
      <text x="80" y="72" className="fill-foreground font-mono" fontSize="12">√49 = 7</text>
      <text x="80" y="106" className="fill-foreground font-mono" fontSize="12">³√27 = 3</text>
    </svg>
  );
}

function MemoryMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <KeyBadge x={16} y={20} label="MC" />
      <KeyBadge x={62} y={20} label="MR" hi />
      <KeyBadge x={108} y={20} label="M+" />
      <KeyBadge x={154} y={20} label="M−" />
      <rect x="20" y={64} width="180" height={44} rx={8} fill="var(--color-secondary)" stroke="var(--color-border)" />
      <text x="30" y="83" className="fill-muted-foreground" fontSize="10">memory</text>
      <text x="30" y="100" className="fill-primary font-mono" fontSize="14">M = 42</text>
    </svg>
  );
}

function AnsMini() {
  return (
    <svg viewBox="0 0 220 130" className="mx-auto h-32 w-full max-w-[240px]">
      <KeyBadge x={20} y={20} label="π" />
      <KeyBadge x={66} y={20} label="e" />
      <KeyBadge x={112} y={20} label="Ans" hi />
      <text x="20" y="72" className="fill-foreground font-mono" fontSize="12">25 × 4 = 100</text>
      <text x="20" y="92" className="fill-foreground font-mono" fontSize="12">Ans + 50 = 150</text>
      <text x="20" y="115" className="fill-muted-foreground" fontSize="10">tap history to reuse any past result</text>
    </svg>
  );
}

/* ---------------- Guide data ---------------- */

const SCI_GUIDE: GuideCardItem[] = [
  {
    key: "pemdas",
    title: "Order of operations (PEMDAS)",
    explain: (
      <>Every expression is evaluated with the standard precedence:
      <strong> parentheses → exponents → × ÷ → + −</strong>, left to right within
      each tier. Use parentheses whenever you want to force a different order.</>
    ),
    formula: <>2 + 3 × 4 = 2 + 12 = 14</>,
    legend: [{ sym: "( )", def: "highest precedence — evaluated first" }],
    diagram: <PemdasMini />,
    example: { given: "2 + 3 × 4 vs (2 + 3) × 4", substitute: "14 vs 20", answer: "parentheses win" },
  },
  {
    key: "trig",
    title: "Trigonometry — Deg vs Rad",
    explain: (
      <>Trig keys (sin, cos, tan and their inverses) read your angle using the{" "}
      <strong>Deg / Rad</strong> toggle at the top. Degrees for geometry, radians for
      calculus and the unit circle. Wrong mode is the #1 reason a trig answer looks off.</>
    ),
    formula: <>180° = π rad, &nbsp; 90° = π/2 rad</>,
    legend: [{ sym: "Deg", def: "full circle = 360°" }, { sym: "Rad", def: "full circle = 2π" }],
    diagram: <TrigMini />,
    example: { given: "sin 90 in Deg mode", substitute: "sin 90° = 1", answer: "1" },
  },
  {
    key: "log",
    title: "Logarithms & exponentials",
    explain: (
      <>The calculator has base-10 <code>log</code>, natural <code>ln</code>, and
      their inverses <code>10ˣ</code> and <code>eˣ</code>. Logarithms answer
      "what power gives this number?" — the inverse operation to raising a base
      to a power.</>
    ),
    formula: <>log₁₀(1000) = 3 &nbsp;⇔&nbsp; 10³ = 1000</>,
    legend: [{ sym: "log", def: "base 10" }, { sym: "ln", def: "base e ≈ 2.71828" }],
    diagram: <LogMini />,
    example: { given: "ln(e³)", substitute: "3 × ln(e) = 3 × 1", answer: "3" },
  },
  {
    key: "pow",
    title: "Powers and roots",
    explain: (
      <>Use <code>xⁿ</code> for any power, <code>√</code> for square root, and{" "}
      <code>ⁿ√</code> for the n-th root. Roots are just fractional powers, so a
      cube root equals raising to the power 1/3.</>
    ),
    formula: <>ⁿ√x = x^(1/n)</>,
    legend: [{ sym: "n", def: "root index (2 for square, 3 for cube…)" }],
    diagram: <PowRootMini />,
    example: { given: "³√27", substitute: "27^(1/3)", answer: "3" },
  },
  {
    key: "memory",
    title: "Memory keys — M+, M−, MR, MC",
    explain: (
      <>One memory slot starts at 0. <strong>M+</strong> adds the current
      result to it, <strong>M−</strong> subtracts it, <strong>MR</strong> pastes
      the stored value back into your expression, and <strong>MC</strong> clears
      memory. Perfect for accumulating a running subtotal.</>
    ),
    formula: <>M ← M ± current_result</>,
    legend: [{ sym: "M", def: "stored memory value" }],
    diagram: <MemoryMini />,
    example: {
      given: "20 M+, 30 M+, then MR",
      substitute: "M = 0 + 20 + 30",
      answer: "50",
    },
  },
  {
    key: "ans",
    title: "Constants and the Ans key",
    explain: (
      <>Tap <code>π</code> or <code>e</code> to insert the constant as an exact
      symbol. <strong>Ans</strong> inserts the most recent result so long
      calculations chain naturally without retyping intermediate numbers.</>
    ),
    formula: <>next_expr = f(Ans)</>,
    legend: [
      { sym: "π", def: "3.14159265…" },
      { sym: "e", def: "2.71828182…" },
      { sym: "Ans", def: "previous answer" },
    ],
    diagram: <AnsMini />,
    example: { given: "25 × 4, then + Ans", substitute: "100 + 100", answer: "200" },
  },
];
