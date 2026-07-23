import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { create, all } from "mathjs";
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
  type GuideCardItem,
  FormulaBlock,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import { ReferenceTable } from "@/components/ReferenceTable";

const math = create(all, {});
const LN2 = Math.log(2);

const FAQS = [
  {
    q: "What is half-life used for?",
    a: "Half-life measures how quickly a quantity that decays exponentially shrinks. It is most famous in nuclear physics for radioactive isotopes, but the same idea models drug elimination from the body, capacitor discharge in an RC circuit, the cooling of a hot object toward room temperature, and the removal of pollutants from an ecosystem.",
  },
  {
    q: "How is carbon dating calculated?",
    a: "Living organisms take in carbon-14 at a roughly steady rate; once they die, the C-14 decays with a half-life of about 5,730 years. Measuring the remaining fraction of C-14 in a sample and solving N(t) = N₀·(1/2)^(t/5730) for t gives the sample's age. The method is reliable up to roughly 50,000 years, after which too little C-14 remains to measure precisely.",
  },
  {
    q: "What is the difference between half-life and mean lifetime?",
    a: "Half-life (t½) is the time for a quantity to fall to half its starting value. Mean lifetime (τ) is the average time an individual particle survives before decaying. They are related by t½ = τ · ln(2), so τ is always about 1.44× longer than the half-life for the same process.",
  },
  {
    q: "How do I get the decay constant from a half-life?",
    a: "The decay constant λ is ln(2) divided by the half-life: λ = ln(2) / t½. It represents the fraction of the remaining quantity that decays per unit time — for example, λ = 0.1/year means about 10% of what's left decays each year.",
  },
  {
    q: "Does half-life depend on how much material you start with?",
    a: "No. For a truly exponential process, the half-life is a constant of the substance itself — it doesn't matter whether you start with a gram or a kilogram, half of it will be gone after one t½.",
  },
  {
    q: "Can half-life be used for non-radioactive processes?",
    a: "Yes. Any process where the rate of change is proportional to the current amount is exponential and has a half-life. Common examples include first-order chemical reactions, drug clearance in the bloodstream, and the intensity of light passing through an absorbing medium.",
  },
];

const ISOTOPES: [string, string, string][] = [
  ["Carbon-14 (¹⁴C)", "5,730 years", "Archaeological dating of organic material"],
  ["Uranium-238 (²³⁸U)", "4.468 billion years", "Dating rocks and the age of the Earth"],
  ["Potassium-40 (⁴⁰K)", "1.25 billion years", "Dating volcanic rock and early hominid fossils"],
  ["Iodine-131 (¹³¹I)", "8.02 days", "Medical imaging and thyroid cancer treatment"],
  ["Technetium-99m (⁹⁹ᵐTc)", "6.01 hours", "Most common medical diagnostic tracer"],
  ["Cesium-137 (¹³⁷Cs)", "30.17 years", "Radiation therapy, fallout tracing"],
  ["Radon-222 (²²²Rn)", "3.82 days", "Indoor air-quality risk assessment"],
  ["Plutonium-239 (²³⁹Pu)", "24,110 years", "Reactor fuel and nuclear weapons"],
];

export const Route = createFileRoute("/calculators/math/half-life-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Half-Life Calculator",
      title: "Half-Life Calculator — Decay, τ & λ",
      metaDescription:
        "Solve exponential decay: enter any three of N₀, N, t, t½ to find the fourth, or convert between half-life, mean lifetime and λ.",
      canonicalUrl: "/calculators/math/half-life-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Half-Life Calculator", path: "/calculators/math/half-life-calculator" },
      ],
      faqs: FAQS.map((f) => ({ q: f.q, a: f.a })),
    }),
  component: HalfLifePage,
});

/** Parse a coefficient — allows fractions like "1/2" and decimals. Uses mathjs
 *  for safety (never eval). Empty string returns null so the caller can detect
 *  the "solve for this field" slot. */
function parseNum(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const v = math.evaluate(s);
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number: ${raw}`);
  return n;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n) < 1e-10) return "0";
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e10)) return n.toExponential(4);
  return parseFloat(n.toPrecision(8)).toString();
}

function HalfLifePage() {
  return (
    <MathCalcPage
      name="Half-Life Calculator"
      tagline="Model exponential decay. Solve for whichever of N₀, Nₜ, t, or t½ you don't know — then convert freely between half-life, mean lifetime, and decay constant."
      extras={
        <>
          <CalcSection title="Definition and intuition">
            <p>
              <strong>Half-life</strong> is the amount of time required for a
              quantity that decays exponentially to fall to exactly half of its
              initial value. The term is most commonly associated with radioactive
              atoms — nuclei that spontaneously emit particles and transform into
              other elements — but the same idea describes any decay process in
              which the rate of change is proportional to the amount currently
              present. That includes drug elimination from the bloodstream, the
              discharge of a capacitor through a resistor, the cooling of a hot
              object toward its surroundings, and the intensity of light passing
              through an absorbing medium.
            </p>
            <p>
              The key intuition is that half-life is <em>constant</em> for a given
              substance or process: it does not depend on how much material you
              start with. Begin with 1,000 atoms of an isotope whose half-life is
              one hour and you expect about 500 to remain after one hour, 250
              after two, 125 after three, and so on. Start with a kilogram of the
              same isotope and after one hour you still have half a kilogram —
              the fraction is what stays fixed, not the absolute amount lost.
            </p>
            <p>
              The most famous application is <strong>radiocarbon dating</strong>.
              Living organisms continually exchange carbon with the atmosphere,
              so their ratio of carbon-14 to carbon-12 stays close to the
              atmospheric value. Once an organism dies that exchange stops, and
              the carbon-14 already inside it begins to decay with a half-life of
              about 5,730 years. Measuring the remaining C-14 fraction in a
              sample and inverting the decay formula gives its age. The technique
              is reliable to roughly 50,000 years — after about ten half-lives
              there is too little C-14 left to measure precisely.
            </p>
          </CalcSection>

          <CalcSection title="Half-life calculator, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing the tool does with your input —
              the three interchangeable decay formulas it uses, how it
              relates half-life to mean lifetime and decay constant, and how
              it solves for whichever quantity you left blank.
            </p>
            <GuideCards items={HL_GUIDE} />
          </CalcSection>


          <CalcSection title="Common half-lives you'll meet">
            <ReferenceTable
              caption="Selected isotopes and their applications"
              headers={["Isotope", "Half-life", "Typical use"]}
              rows={ISOTOPES.map((r) => [r[0], r[1], r[2]])}
            />
            <p className="mt-3 text-sm">
              Half-lives span an enormous range — from fractions of a second for
              some artificial nuclei to billions of years for the isotopes used
              to date the Earth. The mathematics is identical; only the timescale
              changes.
            </p>
          </CalcSection>

          <CalcSection title="Real-world applications">
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong>Radiocarbon dating</strong> of bones, wood, and cloth up
                to ~50,000 years old (C-14, t½ ≈ 5,730 years).
              </li>
              <li>
                <strong>Geochronology:</strong> potassium-argon and
                uranium-lead dating of rocks over millions to billions of years.
              </li>
              <li>
                <strong>Nuclear medicine:</strong> choosing a tracer with a
                half-life long enough to image but short enough to clear from
                the body quickly (Tc-99m at ~6 hours is the classic example).
              </li>
              <li>
                <strong>Pharmacokinetics:</strong> the plasma half-life of a
                drug determines dosing intervals — after roughly five half-lives
                only about 3% of a dose remains.
              </li>
              <li>
                <strong>RC circuits:</strong> a capacitor discharging through a
                resistor loses charge exponentially with τ = R · C, giving
                t½ = R · C · ln(2).
              </li>
              <li>
                <strong>Environmental science:</strong> modeling how long
                pollutants such as PCBs or persistent pesticides remain in soil
                and water.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Common mistakes to avoid">
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong>Mixing time units.</strong> If t½ is in years, t must
                also be in years. The calculator uses whatever unit you supply —
                convert first if your inputs disagree.
              </li>
              <li>
                <strong>Confusing τ with t½.</strong> Mean lifetime is longer
                than half-life by a factor of 1/ln(2) ≈ 1.443. Plugging τ into a
                half-life formula (or vice versa) will be off by ~44%.
              </li>
              <li>
                <strong>Using base-10 log instead of natural log.</strong> The
                mean-lifetime and decay-constant forms use e, so the inverse is
                ln (natural log), not log₁₀.
              </li>
              <li>
                <strong>Expecting exact halving with small samples.</strong>
                Radioactive decay is statistical. With billions of atoms the
                formula is essentially exact; with only a few dozen, random
                fluctuations dominate.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
            "Solve for the initial amount, remaining amount, elapsed time, or half-life given any three",
            "Built-in half-life \u2194 mean lifetime \u2194 decay constant converter",
            "Shows the substituted formula and the algebraic rearrangement for every result",
            "Includes a reference table of common isotopes and their half-lives",
            "Works for radioactive decay, drug dosing, and any first-order decay process",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ items={FAQS.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))} />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
                { to: "/calculators/math/root-calculator", label: "Root Calculator" },
                { to: "/calculators/math/scientific-calculator", label: "Scientific Calculator" },
                { to: "/calculators/math/scientific-notation-calculator", label: "Scientific Notation" },
                { to: "/calculators/math/percentage-calculator", label: "Percentage Calculator" },
                { to: "/calculators/math/percent-error-calculator", label: "Percent Error Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <MainSolver />
      <div className="mt-6">
        <ConstantConverter />
      </div>
    </MathCalcPage>
  );
}

/* ============ Sub-tool 1: main half-life solver ============ */


function DecayCurve({ N0, Th, t, Nt }: { N0: number; Th: number; t: number; Nt: number }) {
  if (!Number.isFinite(N0) || !Number.isFinite(Th) || Th <= 0 || !Number.isFinite(t) || !Number.isFinite(Nt)) return null;
  const W = 560, H = 220, pad = 40;
  const tMax = Math.max(t, Th) * 2.2 + Th * 0.2;
  const N = 200;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const tt = (tMax * i) / N;
    pts.push([tt, N0 * Math.pow(0.5, tt / Th)]);
  }
  const px = (tt: number) => pad + (tt / tMax) * (W - 2 * pad);
  const py = (n: number) => H - pad - (n / N0) * (H - 2 * pad);
  const path = "M " + pts.map(([tt, n]) => `${px(tt).toFixed(1)},${py(n).toFixed(1)}`).join(" L ");
  return (
    <figure className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-background/40 p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Exponential decay curve from N0 = ${N0} to the marked point at t = ${t}, N = ${Nt}`}
        className="mx-auto block w-full max-w-[560px] text-primary"
      >
        <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="currentColor" strokeWidth={1} className="text-muted-foreground/40" />
        <line x1={pad} x2={pad} y1={pad} y2={H - pad} stroke="currentColor" strokeWidth={1} className="text-muted-foreground/40" />
        <path d={path} fill="none" stroke="currentColor" strokeWidth={1.8} />
        <line x1={px(t)} x2={px(t)} y1={py(Nt)} y2={H - pad} stroke="currentColor" strokeWidth={1} strokeDasharray="4 3" className="text-muted-foreground/60" />
        <line x1={pad} x2={px(t)} y1={py(Nt)} y2={py(Nt)} stroke="currentColor" strokeWidth={1} strokeDasharray="4 3" className="text-muted-foreground/60" />
        <circle cx={px(t)} cy={py(Nt)} r={5} className="fill-primary" />
        <text x={px(t)} y={py(Nt) - 10} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
          t = {fmt(t)}, N = {fmt(Nt)}
        </text>
        <text x={pad} y={pad - 10} className="fill-muted-foreground text-[10px]">N₀ = {fmt(N0)}</text>
        <text x={W - pad} y={H - pad + 16} textAnchor="end" className="fill-muted-foreground text-[10px]">t</text>
      </svg>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">
        N(t) = N₀ · (1/2)^(t / t½), marked at the solved point.
      </figcaption>
    </figure>
  );
}

function MainSolver() {
  const [n0, setN0] = useState("1000");
  const [nt, setNt] = useState("250");
  const [t, setT] = useState("");
  const [th, setTh] = useState("5");

  const [result, setResult] = useState<React.ReactNode | null>(null);
  const [note, setNote] = useState<React.ReactNode | null>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [plot, setPlot] = useState<{ N0: number; Th: number; t: number; Nt: number } | null>(null);

  const solve = () => {
    setErr(null);
    setResult(null);
    setNote(null);
    setSteps(null);
    setPlot(null);

    let N0: number | null, Nt: number | null, T: number | null, Th: number | null;
    try {
      N0 = parseNum(n0);
      Nt = parseNum(nt);
      T = parseNum(t);
      Th = parseNum(th);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input");
      return;
    }

    const provided = [N0, Nt, T, Th].filter((v) => v !== null).length;
    if (provided !== 3) {
      setErr("Fill in exactly three of the four fields; leave the one you want to solve blank.");
      return;
    }

    try {
      let solvedLabel = "";
      let solvedValue = 0;
      const givenLines: string[] = [];
      if (N0 !== null) givenLines.push(`N₀ = ${fmt(N0)}`);
      if (Nt !== null) givenLines.push(`Nₜ = ${fmt(Nt)}`);
      if (T !== null) givenLines.push(`t = ${fmt(T)}`);
      if (Th !== null) givenLines.push(`t½ = ${fmt(Th)}`);
      const workSteps: Step[] = [
        {
          title: "Given",
          body: <FormulaBlock>{givenLines.join(", ")}</FormulaBlock>,
        },
        {
          title: "Formula — exponential decay",
          body: (
            <FormulaWithLegend
              formula={<>N(t) = N₀ · (1/2)^(t / t½)</>}
              legend={[
                { sym: "N₀", def: "initial quantity at t = 0" },
                { sym: "Nₜ = N(t)", def: "remaining quantity at time t" },
                { sym: "t", def: "elapsed time (same units as t½)" },
                { sym: "t½", def: "half-life — time to fall to half" },
              ]}
            />
          ),
        },
      ];

      if (Nt === null) {
        if (N0 === null || T === null || Th === null || Th <= 0) throw new Error("t½ must be positive");
        solvedValue = N0 * Math.pow(0.5, T / Th);
        solvedLabel = "Nₜ (remaining quantity)";
        workSteps.push({
          title: "Substitute — plug in N₀, t, t½",
          body: (
            <FormulaBlock>
              Nₜ = {fmt(N0)} · (1/2)^({fmt(T)} / {fmt(Th)})
              <br />= {fmt(N0)} · (1/2)^{fmt(T / Th)} = {fmt(N0)} · {fmt(Math.pow(0.5, T / Th))}
            </FormulaBlock>
          ),
        });
        workSteps.push({
          title: "Answer",
          body: <FormulaBlock>Nₜ = {fmt(solvedValue)}</FormulaBlock>,
        });
      } else if (N0 === null) {
        if (Nt === null || T === null || Th === null || Th <= 0) throw new Error("t½ must be positive");
        solvedValue = Nt / Math.pow(0.5, T / Th);
        solvedLabel = "N₀ (initial quantity)";
        workSteps.push({
          title: "Rearrange — solve for N₀",
          body: <FormulaBlock>N₀ = Nₜ / (1/2)^(t / t½)</FormulaBlock>,
        });
        workSteps.push({
          title: "Substitute — plug in Nₜ, t, t½",
          body: (
            <FormulaBlock>
              N₀ = {fmt(Nt)} / (1/2)^({fmt(T)} / {fmt(Th)}) = {fmt(Nt)} / {fmt(Math.pow(0.5, T / Th))}
            </FormulaBlock>
          ),
        });
        workSteps.push({
          title: "Answer",
          body: <FormulaBlock>N₀ = {fmt(solvedValue)}</FormulaBlock>,
        });
      } else if (T === null) {
        if (N0 === null || Nt === null || Th === null || Th <= 0) throw new Error("t½ must be positive");
        if (N0 <= 0 || Nt <= 0) throw new Error("N₀ and Nₜ must be positive to solve for t");
        const ratio = Nt / N0;
        solvedValue = -Th * (Math.log(ratio) / LN2);
        solvedLabel = "t (elapsed time)";
        workSteps.push({
          title: "Rearrange — take log₂ of both sides",
          body: <FormulaBlock>t = −t½ · log₂(Nₜ / N₀)</FormulaBlock>,
        });
        workSteps.push({
          title: "Substitute — plug in t½, Nₜ, N₀",
          body: (
            <FormulaBlock>
              t = −{fmt(Th)} · log₂({fmt(Nt)} / {fmt(N0)}) = −{fmt(Th)} · log₂({fmt(ratio)})
              <br />= −{fmt(Th)} · ({fmt(Math.log(ratio) / LN2)})
            </FormulaBlock>
          ),
        });
        workSteps.push({
          title: "Answer",
          body: <FormulaBlock>t = {fmt(solvedValue)}</FormulaBlock>,
        });
      } else if (Th === null) {
        if (N0 === null || Nt === null || T === null) throw new Error("Missing values");
        if (N0 <= 0 || Nt <= 0) throw new Error("N₀ and Nₜ must be positive to solve for t½");
        const ratio = Nt / N0;
        solvedValue = -T * (LN2 / Math.log(ratio));
        solvedLabel = "t½ (half-life)";
        workSteps.push({
          title: "Rearrange — solve for t½",
          body: <FormulaBlock>t½ = −t · ln(2) / ln(Nₜ / N₀)</FormulaBlock>,
        });
        workSteps.push({
          title: "Substitute — plug in t, Nₜ, N₀",
          body: (
            <FormulaBlock>
              t½ = −{fmt(T)} · ln(2) / ln({fmt(ratio)}) = −{fmt(T)} · {fmt(LN2)} / {fmt(Math.log(ratio))}
            </FormulaBlock>
          ),
        });
        workSteps.push({
          title: "Answer",
          body: <FormulaBlock>t½ = {fmt(solvedValue)}</FormulaBlock>,
        });
      }

      if (!Number.isFinite(solvedValue)) throw new Error("Result is not a finite number — check the inputs");

      // Derived constants (need a half-life to compute; use solved value if that's what we found)
      const halfLife = Th === null ? solvedValue : Th;
      const tau = halfLife / LN2;
      const lambda = LN2 / halfLife;

      setResult(<span>{fmt(solvedValue)}</span>);
      setNote(
        <>
          Solved for {solvedLabel}. Derived from t½ = {fmt(halfLife)}: mean lifetime τ ={" "}
          <span className="tabular-nums">{fmt(tau)}</span>, decay constant λ ={" "}
          <span className="tabular-nums">{fmt(lambda)}</span>.
        </>,
      );
      setSteps(workSteps);

      const finalN0 = N0 === null ? (Nt as number) / Math.pow(0.5, (T as number) / halfLife) : N0;
      const finalNt = Nt === null ? finalN0 * Math.pow(0.5, (T as number) / halfLife) : Nt;
      const finalT = T === null ? solvedValue : T;
      setPlot({ N0: finalN0, Th: halfLife, t: finalT, Nt: finalNt });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input");
    }
  };

  const clear = () => {
    setN0(""); setNt(""); setT(""); setTh("");
    setResult(null); setNote(null); setSteps(null); setErr(null); setPlot(null);
  };

  return (
    <div>
      <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
        Half-Life Solver
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Fill any three fields and leave the fourth blank — the calculator solves for the missing one.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="N₀ — initial quantity" htmlFor="hl-n0">
          <TextInput id="hl-n0" inputMode="decimal" value={n0} onChange={(e) => setN0(e.target.value)} placeholder="e.g. 1000" />
        </Field>
        <Field label="Nₜ — remaining quantity" htmlFor="hl-nt">
          <TextInput id="hl-nt" inputMode="decimal" value={nt} onChange={(e) => setNt(e.target.value)} placeholder="e.g. 250" />
        </Field>
        <Field label="t — elapsed time" htmlFor="hl-t" hint="Use the same time unit as t½">
          <TextInput id="hl-t" inputMode="decimal" value={t} onChange={(e) => setT(e.target.value)} placeholder="leave blank to solve" />
        </Field>
        <Field label="t½ — half-life" htmlFor="hl-th">
          <TextInput id="hl-th" inputMode="decimal" value={th} onChange={(e) => setTh(e.target.value)} placeholder="e.g. 5" />
        </Field>
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryButton onClick={solve}>Solve</PrimaryButton>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center rounded-full border border-border/60 bg-secondary/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/50"
        >
          Clear
        </button>
      </div>
      {err && <ErrorBox message={err} />}
      {result && <ResultBox label="Answer" value={result} note={note ?? undefined} />}
      {plot && <DecayCurve N0={plot.N0} Th={plot.Th} t={plot.t} Nt={plot.Nt} />}
      {steps && <StepsToggle steps={steps} />}
    </div>
  );
}

/* ============ Sub-tool 2: t½ ↔ τ ↔ λ converter ============ */

type ConstKind = "half" | "tau" | "lambda";

function ConstantConverter() {
  const [kind, setKind] = useState<ConstKind>("half");
  const [value, setValue] = useState("5");

  const [result, setResult] = useState<React.ReactNode | null>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const convert = () => {
    setErr(null);
    setResult(null);
    setSteps(null);
    let v: number;
    try {
      const parsed = parseNum(value);
      if (parsed === null) throw new Error("Enter a value");
      v = parsed;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input");
      return;
    }
    if (v <= 0) {
      setErr("Value must be positive");
      return;
    }

    let halfLife = 0, tau = 0, lambda = 0;
    const workSteps: Step[] = [];

    if (kind === "half") {
      halfLife = v;
      tau = v / LN2;
      lambda = LN2 / v;
      workSteps.push(
        { title: "Given", body: <FormulaBlock>t½ = {fmt(v)}</FormulaBlock> },
        {
          title: "Formula — τ and λ from t½",
          body: (
            <FormulaWithLegend
              formula={<>τ = t½ / ln(2), &nbsp; λ = ln(2) / t½</>}
              legend={[
                { sym: "t½", def: "half-life" },
                { sym: "τ", def: "mean lifetime" },
                { sym: "λ", def: "decay constant (fraction per unit time)" },
              ]}
            />
          ),
        },
        { title: "Substitute", body: <FormulaBlock>τ = {fmt(v)} / {fmt(LN2)}<br />λ = {fmt(LN2)} / {fmt(v)}</FormulaBlock> },
        { title: "Answer", body: <FormulaBlock>τ = {fmt(tau)}, &nbsp; λ = {fmt(lambda)}</FormulaBlock> },
      );
    } else if (kind === "tau") {
      tau = v;
      halfLife = v * LN2;
      lambda = 1 / v;
      workSteps.push(
        { title: "Given", body: <FormulaBlock>τ = {fmt(v)}</FormulaBlock> },
        {
          title: "Formula — t½ and λ from τ",
          body: (
            <FormulaWithLegend
              formula={<>t½ = τ · ln(2), &nbsp; λ = 1 / τ</>}
              legend={[
                { sym: "τ", def: "mean lifetime" },
                { sym: "t½", def: "half-life" },
                { sym: "λ", def: "decay constant" },
              ]}
            />
          ),
        },
        { title: "Substitute", body: <FormulaBlock>t½ = {fmt(v)} · {fmt(LN2)}<br />λ = 1 / {fmt(v)}</FormulaBlock> },
        { title: "Answer", body: <FormulaBlock>t½ = {fmt(halfLife)}, &nbsp; λ = {fmt(lambda)}</FormulaBlock> },
      );
    } else {
      lambda = v;
      halfLife = LN2 / v;
      tau = 1 / v;
      workSteps.push(
        { title: "Given", body: <FormulaBlock>λ = {fmt(v)}</FormulaBlock> },
        {
          title: "Formula — t½ and τ from λ",
          body: (
            <FormulaWithLegend
              formula={<>t½ = ln(2) / λ, &nbsp; τ = 1 / λ</>}
              legend={[
                { sym: "λ", def: "decay constant" },
                { sym: "t½", def: "half-life" },
                { sym: "τ", def: "mean lifetime" },
              ]}
            />
          ),
        },
        { title: "Substitute", body: <FormulaBlock>t½ = {fmt(LN2)} / {fmt(v)}<br />τ = 1 / {fmt(v)}</FormulaBlock> },
        { title: "Answer", body: <FormulaBlock>t½ = {fmt(halfLife)}, &nbsp; τ = {fmt(tau)}</FormulaBlock> },
      );
    }

    setResult(
      <div className="space-y-1 text-lg">
        <div>t½ = <span className="tabular-nums">{fmt(halfLife)}</span></div>
        <div>τ = <span className="tabular-nums">{fmt(tau)}</span></div>
        <div>λ = <span className="tabular-nums">{fmt(lambda)}</span></div>
      </div>,
    );
    setSteps(workSteps);
  };

  return (
    <div className="rounded-3xl border border-border bg-card/60 p-5 shadow-[0_20px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:p-6">
      <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
        Half-Life ↔ Mean Lifetime ↔ Decay Constant
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Enter one of the three constants and get the other two instantly.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="I know…" htmlFor="hl-kind">
          <select
            id="hl-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as ConstKind)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="half">Half-life (t½)</option>
            <option value="tau">Mean lifetime (τ)</option>
            <option value="lambda">Decay constant (λ)</option>
          </select>
        </Field>
        <Field label="Value" htmlFor="hl-val">
          <TextInput id="hl-val" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <PrimaryButton onClick={convert} className="w-full sm:w-auto">Convert</PrimaryButton>
        </div>
      </div>
      {err && <ErrorBox message={err} />}
      {result && <ResultBox label="Equivalent constants" value={result} />}
      {steps && <StepsToggle steps={steps} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GuideCards data + mini diagrams
// ─────────────────────────────────────────────────────────────────────────────

function DecayCurveMini() {
  const pts = Array.from({ length: 60 }, (_, i) => {
    const t = (i / 59) * 4; // 0..4 half-lives
    const y = Math.pow(0.5, t);
    return `${20 + (i / 59) * 200},${110 - y * 80}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <line x1="20" y1="110" x2="230" y2="110" stroke="var(--color-border)" />
      <line x1="20" y1="20" x2="20" y2="110" stroke="var(--color-border)" />
      <polyline points={pts} fill="none" stroke="var(--color-primary)" strokeWidth="2" />
      {[1, 2, 3, 4].map((k) => {
        const x = 20 + (k / 4) * 200;
        const y = 110 - Math.pow(0.5, k) * 80;
        return (
          <g key={k}>
            <line x1={x} y1="110" x2={x} y2={y} stroke="var(--color-border)" strokeDasharray="2 2" />
            <circle cx={x} cy={y} r="3" className="fill-primary" />
            <text x={x} y="124" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="9">{k}·t½</text>
          </g>
        );
      })}
      <text x="26" y="34" className="fill-muted-foreground font-mono" fontSize="10">N/N₀</text>
    </svg>
  );
}

function ConstantsMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <rect x="10" y="20" width="65" height="34" rx="6" className="fill-primary/15 stroke-primary/60" />
      <text x="42" y="34" textAnchor="middle" className="fill-primary font-mono" fontSize="11">t½</text>
      <text x="42" y="48" textAnchor="middle" className="fill-muted-foreground" fontSize="9">half-life</text>
      <rect x="88" y="20" width="65" height="34" rx="6" className="fill-primary/15 stroke-primary/60" />
      <text x="120" y="34" textAnchor="middle" className="fill-primary font-mono" fontSize="11">τ</text>
      <text x="120" y="48" textAnchor="middle" className="fill-muted-foreground" fontSize="9">mean life</text>
      <rect x="166" y="20" width="65" height="34" rx="6" className="fill-primary/15 stroke-primary/60" />
      <text x="198" y="34" textAnchor="middle" className="fill-primary font-mono" fontSize="11">λ</text>
      <text x="198" y="48" textAnchor="middle" className="fill-muted-foreground" fontSize="9">decay k</text>
      <line x1="10" y1="72" x2="230" y2="72" stroke="var(--color-border)" />
      <text x="120" y="90" textAnchor="middle" className="fill-foreground font-mono" fontSize="10">λ · t½ = ln 2</text>
      <text x="120" y="106" textAnchor="middle" className="fill-foreground font-mono" fontSize="10">τ = 1 / λ = t½ / ln 2</text>
      <text x="120" y="122" textAnchor="middle" className="fill-muted-foreground" fontSize="9">τ ≈ 1.4427 × t½</text>
    </svg>
  );
}

function SolveForMini() {
  return (
    <svg viewBox="0 0 240 130" className="mx-auto h-32 w-full max-w-[260px]">
      <text x="10" y="22" className="fill-muted-foreground font-mono" fontSize="10">leave one field blank →</text>
      <text x="10" y="42" className="fill-foreground font-mono" fontSize="10">N(t) = N₀·(½)^(t / t½)</text>
      <line x1="10" y1="52" x2="230" y2="52" stroke="var(--color-border)" />
      <text x="10" y="70" className="fill-primary font-mono" fontSize="10">solve N(t) → plug in</text>
      <text x="10" y="86" className="fill-primary font-mono" fontSize="10">solve t   → t = t½·log₂(N₀/N)</text>
      <text x="10" y="102" className="fill-primary font-mono" fontSize="10">solve N₀ → N₀ = N·2^(t/t½)</text>
      <text x="10" y="118" className="fill-primary font-mono" fontSize="10">solve t½ → t½ = t·ln2 / ln(N₀/N)</text>
    </svg>
  );
}

const HL_GUIDE: GuideCardItem[] = [
  {
    key: "curve",
    title: "The decay curve — what the calculator plots and reports",
    explain: (
      <>The tool models a quantity that shrinks by the same fractional amount
      in every fixed time step. After one half-life half is left, after two
      half-lives a quarter is left, after three an eighth. The result panel
      shows N(t) at the time you entered; the curve behind the scenes is a
      smooth exponential, not a staircase — the halving pattern only shows
      up if you sample at whole multiples of the half-life.</>
    ),
    formula: <>N(t) = N₀ · (½)<sup>t / t½</sup></>,
    legend: [
      { sym: "N₀", def: "initial quantity you entered" },
      { sym: "t½", def: "half-life (time to lose 50%)" },
      { sym: "N(t)", def: "quantity remaining at time t" },
    ],
    diagram: <DecayCurveMini />,
    example: { given: "N₀ = 200, t½ = 8.02 d, t = 7 d", substitute: "200·(½)^(7/8.02)", answer: "≈ 109.3" },
  },
  {
    key: "constants",
    title: "t½, τ, λ — three names for the same rate",
    explain: (
      <>The calculator accepts (and outputs) three different decay constants
      because different fields use different conventions. The half-life
      <em> t½</em> is popular in nuclear physics and pharmacology, the mean
      lifetime <em>τ</em> shows up in particle physics and RC circuits, and
      the decay constant <em>λ</em> is what appears in the differential
      equation dN/dt = −λN. All three are locked together by ln 2, so
      entering any one fills in the other two.</>
    ),
    formula: <>λ · t½ = ln 2, &nbsp; τ = 1/λ = t½ / ln 2</>,
    diagram: <ConstantsMini />,
    example: { given: "t½ = 5 s", substitute: "λ = ln2/5, τ = 5/ln2", answer: "λ ≈ 0.1386, τ ≈ 7.21" },
  },
  {
    key: "solve",
    title: "Solving for whichever field you left blank",
    explain: (
      <>The same equation N(t) = N₀·(½)^(t/t½) can be rearranged four ways.
      Leave <em>N(t)</em> blank and the tool substitutes directly. Leave
      <em> t</em> blank and it takes logs to get t = t½·log₂(N₀/N). Leave
      <em> N₀</em> blank and it multiplies through by 2^(t/t½). Leave
      <em> t½</em> blank and it solves t½ = t·ln 2 / ln(N₀/N). The solution
      steps under the answer show which branch was taken.</>
    ),
    formula: <>t = t½ · log₂(N₀ / N), &nbsp; t½ = t · ln 2 / ln(N₀/N)</>,
    diagram: <SolveForMini />,
    example: { given: "N₀=1, N=0.25, t½=5730", substitute: "t = 5730·log₂(4)", answer: "11,460 years" },
  },
];
