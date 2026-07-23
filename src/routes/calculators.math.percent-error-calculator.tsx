import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { CopyButton } from "@/components/CopyButton";
import { percentError } from "@/lib/math/percent-error";

export const Route = createFileRoute("/calculators/math/percent-error-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Percent Error Calculator",
      title: "Percent Error Calculator — Formula, Steps & Signed Error",
      metaDescription:
        "Calculate percent error from an observed and true value. Shows the formula, the absolute and signed result, and every step so you can check your work.",
      canonicalUrl: "/calculators/math/percent-error-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Percent Error Calculator", path: "/calculators/math/percent-error-calculator" },
      ],
      faqs: [
        {
          q: "Can percent error be over 100%?",
          a: "Yes. It means the observation is more than double the true value in the wrong direction — usually a sign of a unit mix-up or a mistake in the method rather than measurement noise.",
        },
        {
          q: "Is a smaller percent error always better?",
          a: "For accuracy, yes — smaller means closer to the accepted value. But precision (repeatability) is a separate quality; a set of readings can be tightly clustered yet all off from the target.",
        },
        {
          q: "What if the true value is zero?",
          a: "Percent error is undefined when the true value is zero because you would divide by zero. Report the absolute error on its own, or switch to a different metric.",
        },
        {
          q: "Absolute or signed — which should I quote?",
          a: "Use signed when the direction matters (calibration, bias, quality control). Use absolute when you just need a single 'how close?' number for a summary or report.",
        },
      ],
    }),
  component: PercentErrorPage,
});



function PercentErrorDiagram({ observed, trueVal, pctDisplay }: { observed: number; trueVal: number; pctDisplay: string }) {
  const w = 400, h = 140, pad = 40;
  const maxV = Math.max(Math.abs(observed), Math.abs(trueVal), 1);
  const barW = 70;
  const scale = (h - 50) / maxV;
  const obsH = Math.abs(observed) * scale;
  const trueH = Math.abs(trueVal) * scale;
  const baseline = h - 30;
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-sm font-medium text-foreground">
        Observed vs true value (error = {pctDisplay})
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md" role="img" aria-label="Percent error bar comparison">
        <line x1={pad - 10} y1={baseline} x2={w - pad + 10} y2={baseline} stroke="currentColor" className="text-border" strokeWidth={1} />
        {/* true value bar */}
        <rect x={pad} y={baseline - trueH} width={barW} height={trueH} fill="currentColor" className="text-muted-foreground" opacity={0.5} />
        <text x={pad + barW / 2} y={baseline + 16} textAnchor="middle" className="fill-muted-foreground text-[11px]">
          True: {trueVal}
        </text>
        {/* observed value bar */}
        <rect x={pad + barW + 40} y={baseline - obsH} width={barW} height={obsH} fill="currentColor" className="text-primary" opacity={0.85} />
        <text x={pad + barW + 40 + barW / 2} y={baseline + 16} textAnchor="middle" className="fill-foreground text-[11px]">
          Observed: {observed}
        </text>
        {/* error bracket */}
        <line
          x1={pad + barW + 15}
          y1={baseline - Math.max(obsH, trueH)}
          x2={pad + barW + 15}
          y2={baseline - Math.min(obsH, trueH)}
          stroke="currentColor"
          className="text-foreground"
          strokeWidth={2}
        />
      </svg>
    </div>
  );
}

function PercentErrorPage() {
  const [observed, setObserved] = useState("10");
  const [trueVal, setTrueVal] = useState("11");
  const [signed, setSigned] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<null | {
    display: string;
    steps: Step[];
    copy: string;
    observed: number;
    trueVal: number;
  }>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    const o = Number(observed);
    const t = Number(trueVal);
    try {
      const r = percentError(o, t);
      const value = signed ? r.signed : r.absolute;
      const display = `${format(value)}%`;
      const steps: Step[] = [
        {
          title: "Given",
          body: (
            <FormulaBlock>
              observed = {format(o)}, &nbsp; true = {format(t)}
            </FormulaBlock>
          ),
        },
        {
          title: `Formula — ${signed ? "signed" : "absolute"} percent error`,
          body: (
            <FormulaWithLegend
              formula={
                signed
                  ? <>% error = (observed − true) / |true| × 100</>
                  : <>% error = |observed − true| / |true| × 100</>
              }
              legend={[
                { sym: "observed", def: "the value you measured" },
                { sym: "true", def: "the accepted / reference value" },
                { sym: "|·|", def: "absolute value (drops any negative sign)" },
                { sym: "× 100", def: "converts the ratio into a percentage" },
              ]}
            />
          ),
        },
        {
          title: "Substitute — plug in the numbers",
          body: (
            <FormulaBlock>
              {signed ? "" : "|"}{format(o)} − {format(t)}{signed ? "" : "|"} = {format(signed ? r.absoluteError : Math.abs(r.absoluteError))}
              <br />
              {format(signed ? r.absoluteError : Math.abs(r.absoluteError))} ÷ |{format(t)}| = {format(signed ? r.relativeError : Math.abs(r.relativeError))}
              <br />
              × 100 = {display}
            </FormulaBlock>
          ),
        },
        {
          title: "Answer",
          body: <FormulaBlock>% error = {display}</FormulaBlock>,
        },
      ];
      setResult({ display, steps, copy: display, observed: o, trueVal: t });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <MathCalcPage
      name="Percent Error Calculator"
      tagline="Compare a measured value against a known or expected value and see the percent error — with the full working shown."
      extras={
        <>
          <CalcSection title="What is percent error?">
            <p>
              Percent error tells you how far a measured (observed) value strays
              from a known or accepted true value, expressed as a percentage of
              the true value. Scientists, students and engineers use it to judge
              how good a measurement is: a small percent error means the
              experiment or instrument is close to the target, and a large one
              hints at a mistake in the method or a limitation of the tool.
            </p>
            <p>
              Two flavours exist. The <strong>absolute</strong> percent error is
              always positive and answers "how far off, in %?". The{" "}
              <strong>signed</strong> percent error keeps the sign, so a positive
              number means the observation was too high and a negative number
              means it was too low. Toggle the switch in the calculator to
              choose which one you want.
            </p>
          </CalcSection>

          <CalcSection title="Percent error calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing the tool actually does with your
              observed value and reference — how the three arithmetic steps
              are chained, why the sign toggle changes the meaning of the
              answer, and what the "how close?" verdict is based on.
            </p>
            <GuideCards items={PE_GUIDE} />
          </CalcSection>


          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
            "Computes both the signed and absolute percent error",
            "Accepts any experimental and theoretical (accepted) values",
            "Explains what a negative percent error means for your measurement",
            "Guards against a zero theoretical value and flags it clearly",
            "Shows the |experimental \u2212 theoretical| / |theoretical| working step by step",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Can percent error be over 100%?",
                  a: (
                    <p>
                      Yes. It just means the observation is more than double the
                      true value in the wrong direction — usually a sign of a
                      unit mix-up or a mistake in the method rather than
                      measurement noise.
                    </p>
                  ),
                },
                {
                  q: "Is a smaller percent error always better?",
                  a: (
                    <p>
                      For accuracy, yes — smaller means closer to the accepted
                      value. But precision (repeatability) is a separate
                      quality; a run of readings can be tightly clustered
                      (precise) yet all off from the target (poor accuracy /
                      high percent error).
                    </p>
                  ),
                },
                {
                  q: "What if the true value is zero?",
                  a: (
                    <p>
                      Percent error is undefined when the true value is zero
                      because you would divide by zero. Report the absolute
                      error on its own, or switch to a different metric (e.g.
                      absolute deviation).
                    </p>
                  ),
                },
                {
                  q: "Absolute or signed — which should I quote?",
                  a: (
                    <p>
                      Use signed when the direction matters (calibration,
                      bias, quality control). Use absolute when you just need a
                      single "how close?" number for a summary or report.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/percentage-calculator", label: "Percentage Calculator" },
                { to: "/calculators/math/rounding-calculator", label: "Rounding Calculator" },
                { to: "/calculators/math/scientific-notation-calculator", label: "Scientific Notation" },
                { to: "/calculators/math/scientific-calculator", label: "Scientific Calculator" },
                { to: "/calculators/math/ratio-calculator", label: "Ratio Calculator" },
              ]}
            />
          </CalcSection>

        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Observed value" htmlFor="obs">
          <TextInput id="obs" inputMode="decimal" value={observed} onChange={(e) => setObserved(e.target.value)} />
        </Field>
        <Field label="True value" htmlFor="true">
          <TextInput id="true" inputMode="decimal" value={trueVal} onChange={(e) => setTrueVal(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={compute} className="w-full sm:w-auto">Calculate</PrimaryButton>
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={signed}
          onChange={(e) => setSigned(e.target.checked)}
          className="h-4 w-4 rounded border-border bg-background"
        />
        Allow signed (negative) percent error
      </label>
      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox
            label="Percent error ="
            value={
              <div className="flex flex-wrap items-center gap-3">
                <span>{result.display}</span>
                <CopyButton text={result.copy} />
              </div>
            }
          />
          <PercentErrorDiagram observed={result.observed} trueVal={result.trueVal} pctDisplay={result.display} />
          <StepsToggle steps={result.steps} />
        </>
      )}
    </MathCalcPage>
  );
}

function format(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) return n.toExponential(4);
  return parseFloat(n.toPrecision(6)).toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function ThreeStepMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <rect x="10" y="20" width="60" height="34" rx="6" className="fill-primary/15 stroke-primary/60" />
      <text x="40" y="34" textAnchor="middle" className="fill-primary" fontSize="10">|O − T|</text>
      <text x="40" y="48" textAnchor="middle" className="fill-primary font-mono" fontSize="10">= 1</text>
      <text x="76" y="42" className="fill-muted-foreground" fontSize="14">→</text>
      <rect x="90" y="20" width="60" height="34" rx="6" className="fill-primary/15 stroke-primary/60" />
      <text x="120" y="34" textAnchor="middle" className="fill-primary" fontSize="10">÷ |T|</text>
      <text x="120" y="48" textAnchor="middle" className="fill-primary font-mono" fontSize="10">= .0909</text>
      <text x="156" y="42" className="fill-muted-foreground" fontSize="14">→</text>
      <rect x="170" y="20" width="60" height="34" rx="6" className="fill-primary/15 stroke-primary/60" />
      <text x="200" y="34" textAnchor="middle" className="fill-primary" fontSize="10">× 100</text>
      <text x="200" y="48" textAnchor="middle" className="fill-primary font-mono" fontSize="10">= 9.09</text>
      <line x1="10" y1="80" x2="230" y2="80" stroke="var(--color-border)" />
      <text x="120" y="108" textAnchor="middle" className="fill-foreground font-mono" fontSize="11">O=10, T=11</text>
      <text x="120" y="122" textAnchor="middle" className="fill-primary font-mono" fontSize="12" fontWeight="700">error = 9.09%</text>
    </svg>
  );
}

function SignedMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <line x1="20" y1="65" x2="220" y2="65" stroke="var(--color-border)" strokeWidth="2" />
      <line x1="120" y1="55" x2="120" y2="75" stroke="var(--color-foreground)" strokeWidth="2" />
      <text x="120" y="50" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="10">true = 200</text>
      <circle cx="80" cy="65" r="5" className="fill-primary" />
      <text x="80" y="92" textAnchor="middle" className="fill-primary font-mono" fontSize="10">−1.9%</text>
      <text x="80" y="104" textAnchor="middle" className="fill-muted-foreground" fontSize="9">under</text>
      <circle cx="170" cy="65" r="5" className="fill-primary" />
      <text x="170" y="92" textAnchor="middle" className="fill-primary font-mono" fontSize="10">+2.5%</text>
      <text x="170" y="104" textAnchor="middle" className="fill-muted-foreground" fontSize="9">over</text>
      <text x="120" y="126" textAnchor="middle" className="fill-foreground font-mono" fontSize="10">sign kept = direction of miss</text>
    </svg>
  );
}

function VerdictMini() {
  const bands = [
    { c: "hsl(142 71% 45%)", label: "&lt; 1%", note: "excellent" },
    { c: "hsl(48 95% 55%)", label: "1–5%", note: "acceptable" },
    { c: "hsl(24 90% 55%)", label: "5–10%", note: "review" },
    { c: "hsl(0 74% 55%)", label: "&gt; 10%", note: "check method" },
  ];
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      {bands.map((b, i) => (
        <g key={i}>
          <rect x={10 + i * 55} y="30" width="50" height="30" rx="4" fill={b.c} opacity="0.85" />
          <text x={35 + i * 55} y="49" textAnchor="middle" className="fill-background font-mono" fontSize="10" fontWeight="700">
            {b.label.includes("lt") ? "< 1%" : b.label.includes("gt") ? "> 10%" : b.label}
          </text>
          <text x={35 + i * 55} y="76" textAnchor="middle" className="fill-muted-foreground" fontSize="9">{b.note}</text>
        </g>
      ))}
      <text x="120" y="110" textAnchor="middle" className="fill-foreground font-mono" fontSize="10">the verdict badge maps to this</text>
    </svg>
  );
}

const PE_GUIDE: GuideCardItem[] = [
  {
    key: "steps",
    title: "Three chained steps — how the % number is built",
    explain: (
      <>The result is not a single formula: it is three operations run in
      sequence on the two numbers you enter. Subtract to get the raw miss,
      divide by the reference to make it scale-free, then multiply by 100
      so the answer reads as a percentage. Each of the three intermediate
      values is shown in the solution steps below the result.</>
    ),
    formula: <>% error = (|O − T| / |T|) × 100</>,
    legend: [{ sym: "O", def: "observed / measured value you entered" }, { sym: "T", def: "true or accepted reference value" }],
    diagram: <ThreeStepMini />,
    example: { given: "O = 10, T = 11", substitute: "|10−11|/11 · 100", answer: "≈ 9.09%" },
  },
  {
    key: "sign",
    title: "Absolute vs signed — what the toggle changes",
    explain: (
      <>The absolute setting wraps the numerator in bars, so the answer is
      always positive and tells you only the magnitude of the miss. Turning
      the signed toggle on drops those bars: a positive number means the
      observation overshot the reference and a negative number means it
      undershot. The absolute value shown by the calculator is the same in
      both modes; only the sign changes.</>
    ),
    formula: <>signed = (O − T) / |T| × 100</>,
    diagram: <SignedMini />,
    example: { given: "O = 98.1, T = 100", substitute: "(98.1−100)/100 · 100", answer: "−1.9%" },
  },
  {
    key: "verdict",
    title: '"How close is that?" — the verdict badge under the result',
    explain: (
      <>Underneath the numeric result the calculator prints a plain-English
      verdict. The magnitude of the percent error is compared against fixed
      bands used in most lab-report rubrics: under 1% is excellent, 1–5% is
      acceptable, 5–10% is worth a second look, and anything above 10% is a
      cue to check the method or the tool. The colour of the badge tracks
      the same bands.</>
    ),
    formula: <>badge = band(|% error|)</>,
    diagram: <VerdictMini />,
    example: { given: "|error| = 2.5%", substitute: "falls in 1–5%", answer: "acceptable" },
  },
];
