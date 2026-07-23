import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  PrimaryButton,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  FormulaWithLegend,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  ResultBox,
  GuideCards,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import type { Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import type { ReactNode } from "react";

/** Centered display-math line used inside solution steps. */
function MathLine({ children }: { children: ReactNode }) {
  return (
    <div className="my-1 flex items-center justify-center text-center font-serif text-[15px] italic text-foreground">
      <span className="inline-flex items-center gap-1">{children}</span>
    </div>
  );
}

/** Small left-aligned note between math lines. */
function MathNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 mb-1 text-sm not-italic text-muted-foreground">
      {children}
    </div>
  );
}

export const Route = createFileRoute("/calculators/math/bayes-theorem-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Bayes' Theorem Calculator",
      title: "Bayes' Theorem Calculator — Posterior P(A|B)",
      metaDescription:
        "Compute posterior P(A|B) from a prior, likelihood and false-positive rate. Medical-test preset, natural-frequency grid and full step-by-step working.",
      canonicalUrl: "/calculators/math/bayes-theorem-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Bayes' Theorem Calculator", path: "/calculators/math/bayes-theorem-calculator" },
      ],
      faqs: [
        {
          q: "What does Bayes' theorem actually calculate?",
          a: "It updates a probability in light of new evidence. You start with the prior P(A) — your belief before seeing evidence — and combine it with how likely the evidence is under A vs. not-A, to get the posterior P(A|B) — your belief after seeing the evidence.",
        },
        {
          q: "Why can a positive result on a rare-disease test still likely be wrong?",
          a: "Because there are far more healthy people than sick people, even a small false-positive rate produces more false positives than true positives. If a disease affects 1 in 1000 and the test has a 5% false-positive rate, most positive results come from healthy people — the posterior P(disease | positive) is around 2%, not 95%.",
        },
        {
          q: "What's the difference between P(B|A) and P(A|B)?",
          a: "They are NOT the same. P(B|A) is the probability of evidence given the cause (e.g. test positive given disease). P(A|B) is the probability of the cause given the evidence (e.g. disease given a positive test). Confusing the two is called the base-rate fallacy — Bayes' theorem is exactly the tool that converts one into the other.",
        },
        {
          q: "What is P(B|¬A) and why do I need it?",
          a: "It's the false-positive rate — the probability of the evidence when A is false (e.g. test comes back positive even though the person is healthy). Without it you can't compute P(B), the total probability of the evidence, and without P(B) you can't apply Bayes' theorem.",
        },
        {
          q: "Are prior, likelihood and posterior the right words?",
          a: "Yes. Prior = P(A) (belief before evidence). Likelihood = P(B|A) (how well A explains the evidence). Posterior = P(A|B) (updated belief after evidence). Bayes' theorem is the machine that turns the first two, plus the false-positive rate, into the third.",
        },
      ],
    }),
  component: BayesPage,
});

/* ---------------- Presets ---------------- */

type PresetId = "medical" | "spam" | "custom";

interface Preset {
  id: PresetId;
  label: string;
  pA: string;
  pBgivenA: string;
  pBgivenNotA: string;
  labelA: string;
  labelB: string;
  note: string;
}

const PRESETS: Preset[] = [
  {
    id: "medical",
    label: "Medical test (rare disease)",
    pA: "0.001",
    pBgivenA: "0.99",
    pBgivenNotA: "0.05",
    labelA: "has the disease",
    labelB: "tests positive",
    note: "Disease prevalence 0.1%, test sensitivity 99%, false-positive rate 5%.",
  },
  {
    id: "spam",
    label: "Email spam filter",
    pA: "0.2",
    pBgivenA: "0.9",
    pBgivenNotA: "0.02",
    labelA: "is spam",
    labelB: "contains the flagged word",
    note: "20% of emails are spam; 90% of spam contains the word; 2% of ham does.",
  },
  {
    id: "custom",
    label: "Custom",
    pA: "0.1",
    pBgivenA: "0.8",
    pBgivenNotA: "0.1",
    labelA: "A",
    labelB: "B",
    note: "Enter your own probabilities.",
  },
];

/* ---------------- Math ---------------- */

interface BayesResult {
  pA: number;
  pNotA: number;
  pBgivenA: number;
  pBgivenNotA: number;
  pB: number;
  posterior: number;
  posteriorNotA: number;
  labelA: string;
  labelB: string;
  // Natural-frequency counts (per 1000)
  N: number;
  countA: number; // has A
  countNotA: number; // does not have A
  truePos: number; // has A AND test positive
  falseNeg: number; // has A AND test negative
  falsePos: number; // does not have A AND test positive
  trueNeg: number; // does not have A AND test negative
}

function computeBayes(
  pA: number,
  pBgivenA: number,
  pBgivenNotA: number,
  labelA: string,
  labelB: string,
): BayesResult | { error: string } {
  if ([pA, pBgivenA, pBgivenNotA].some((v) => !Number.isFinite(v)))
    return { error: "All three probabilities must be numbers." };
  if (pA < 0 || pA > 1) return { error: "P(A) must be between 0 and 1." };
  if (pBgivenA < 0 || pBgivenA > 1)
    return { error: "P(B|A) must be between 0 and 1." };
  if (pBgivenNotA < 0 || pBgivenNotA > 1)
    return { error: "P(B|¬A) must be between 0 and 1." };

  const pNotA = 1 - pA;
  const pB = pBgivenA * pA + pBgivenNotA * pNotA;
  if (pB === 0)
    return { error: "P(B) = 0 — the evidence is impossible under both A and ¬A, so P(A|B) is undefined." };
  const posterior = (pBgivenA * pA) / pB;
  const posteriorNotA = 1 - posterior;

  // Natural-frequency scaling (out of 1000)
  const N = 1000;
  const countA = Math.round(N * pA);
  const countNotA = N - countA;
  const truePos = Math.round(countA * pBgivenA);
  const falseNeg = countA - truePos;
  const falsePos = Math.round(countNotA * pBgivenNotA);
  const trueNeg = countNotA - falsePos;

  return {
    pA, pNotA, pBgivenA, pBgivenNotA, pB, posterior, posteriorNotA,
    labelA, labelB,
    N, countA, countNotA, truePos, falseNeg, falsePos, trueNeg,
  };
}

function pct(p: number, dp = 4): string {
  if (!Number.isFinite(p)) return String(p);
  const v = p * 100;
  return `${parseFloat(v.toFixed(dp)).toString()}%`;
}

function fmt(n: number, dp = 6): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) return n.toExponential(3);
  return parseFloat(n.toFixed(dp)).toString();
}

/* ---------------- Natural-frequency grid diagram ---------------- */

function FrequencyGrid({ res }: { res: BayesResult }) {
  const cols = 40;
  const rows = 25; // 25 * 40 = 1000
  const cell = 14;
  const gap = 2;
  const width = cols * (cell + gap);
  const height = rows * (cell + gap);

  // Build 1000-cell array ordered:
  // [truePos, falseNeg, falsePos, trueNeg]
  const cells: Array<"tp" | "fn" | "fp" | "tn"> = [];
  for (let i = 0; i < res.truePos; i++) cells.push("tp");
  for (let i = 0; i < res.falseNeg; i++) cells.push("fn");
  for (let i = 0; i < res.falsePos; i++) cells.push("fp");
  for (let i = 0; i < res.trueNeg; i++) cells.push("tn");
  while (cells.length < res.N) cells.push("tn");

  const fill = (t: string) => {
    if (t === "tp") return "rgb(22,163,74)"; // green — true positive
    if (t === "fn") return "rgb(202,138,4)"; // amber — false negative
    if (t === "fp") return "rgb(220,38,38)"; // red — false positive
    return "rgb(148,163,184)"; // slate — true negative
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label={`Grid of ${res.N} people showing true positives, false positives, false negatives and true negatives`}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[520px]"
        >
          {cells.map((t, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            return (
              <rect
                key={i}
                x={col * (cell + gap)}
                y={row * (cell + gap)}
                width={cell}
                height={cell}
                fill={fill(t)}
                rx={2}
                ry={2}
              />
            );
          })}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <LegendSwatch color="rgb(22,163,74)" label={`True positive · ${res.truePos}`} sub={`${res.labelA} & ${res.labelB}`} />
        <LegendSwatch color="rgb(220,38,38)" label={`False positive · ${res.falsePos}`} sub={`not ${res.labelA} but ${res.labelB}`} />
        <LegendSwatch color="rgb(202,138,4)" label={`False negative · ${res.falseNeg}`} sub={`${res.labelA} but not ${res.labelB}`} />
        <LegendSwatch color="rgb(148,163,184)" label={`True negative · ${res.trueNeg}`} sub={`neither`} />
      </div>
      <div className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
        Out of {res.N} people, <strong className="text-foreground">{res.truePos + res.falsePos}</strong> would show the evidence "{res.labelB}", but only <strong className="text-foreground">{res.truePos}</strong> of them actually {res.labelA}. So P({res.labelA} | {res.labelB}) = {res.truePos} / {res.truePos + res.falsePos} ≈ <strong className="text-foreground">{pct(res.posterior, 2)}</strong>.
      </div>
    </div>
  );
}

function LegendSwatch({ color, label, sub }: { color: string; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/40 px-2 py-1.5">
      <span className="mt-0.5 inline-block h-3 w-3 flex-shrink-0 rounded-sm" style={{ backgroundColor: color }} />
      <div className="min-w-0">
        <div className="text-foreground">{label}</div>
        <div className="text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

/* ---------------- Guide diagrams ---------------- */

function BayesFormulaDiagram() {
  return (
    <svg viewBox="0 0 260 130" className="w-full">
      <text x="130" y="35" textAnchor="middle" fontSize="16" className="fill-foreground" fontWeight={700}>
        P(A|B) = <tspan className="fill-primary">P(B|A)·P(A)</tspan> / P(B)
      </text>
      <line x1="30" y1="65" x2="230" y2="65" className="stroke-border" />
      <text x="130" y="90" textAnchor="middle" fontSize="10" className="fill-muted-foreground">posterior = likelihood × prior ÷ evidence</text>
      <text x="130" y="115" textAnchor="middle" fontSize="10" className="fill-foreground">P(B) = P(B|A)·P(A) + P(B|¬A)·P(¬A)</text>
    </svg>
  );
}

function TotalProbTreeDiagram() {
  return (
    <svg viewBox="0 0 260 150" className="w-full">
      <circle cx="30" cy="75" r="6" className="fill-primary" />
      <line x1="36" y1="75" x2="120" y2="30" className="stroke-primary/60" />
      <line x1="36" y1="75" x2="120" y2="120" className="stroke-primary/60" />
      <text x="70" y="45" fontSize="10" className="fill-foreground">P(A)</text>
      <text x="70" y="115" fontSize="10" className="fill-foreground">P(¬A)</text>
      <circle cx="130" cy="30" r="6" className="fill-primary/70" />
      <circle cx="130" cy="120" r="6" className="fill-muted-foreground/70" />
      <line x1="136" y1="30" x2="220" y2="20" className="stroke-primary/60" />
      <line x1="136" y1="120" x2="220" y2="110" className="stroke-primary/60" />
      <text x="175" y="18" fontSize="9" className="fill-foreground">P(B|A)</text>
      <text x="175" y="108" fontSize="9" className="fill-foreground">P(B|¬A)</text>
      <text x="228" y="24" fontSize="10" className="fill-foreground">TP</text>
      <text x="228" y="114" fontSize="10" className="fill-foreground">FP</text>
      <text x="130" y="145" textAnchor="middle" fontSize="9" className="fill-muted-foreground">P(B) = TP + FP</text>
    </svg>
  );
}

function BaseRateDiagram() {
  const cells: string[] = [];
  for (let i = 0; i < 100; i++) {
    if (i === 0) cells.push("tp");
    else if (i < 6) cells.push("fp");
    else cells.push("tn");
  }
  const color = (t: string) =>
    t === "tp" ? "rgb(22,163,74)" : t === "fp" ? "rgb(220,38,38)" : "rgb(148,163,184)";
  return (
    <svg viewBox="0 0 260 130" className="w-full">
      {cells.map((t, i) => (
        <rect
          key={i}
          x={(i % 20) * 12 + 8}
          y={Math.floor(i / 20) * 22 + 6}
          width={10}
          height={18}
          fill={color(t)}
          rx={1}
        />
      ))}
      <text x="130" y="125" textAnchor="middle" fontSize="9" className="fill-muted-foreground">
        1 true positive (green) vs 5 false positives (red)
      </text>
    </svg>
  );
}

function PriorUpdateDiagram() {
  return (
    <svg viewBox="0 0 260 130" className="w-full">
      <rect x="20" y="60" width="20" height="40" className="fill-primary/40" />
      <text x="30" y="115" textAnchor="middle" fontSize="9" className="fill-muted-foreground">prior</text>
      <text x="30" y="55" textAnchor="middle" fontSize="10" className="fill-foreground">0.1%</text>

      <text x="90" y="85" fontSize="18" className="fill-foreground">→</text>

      <rect x="115" y="30" width="20" height="70" className="fill-primary/70" />
      <text x="125" y="115" textAnchor="middle" fontSize="9" className="fill-muted-foreground">posterior</text>
      <text x="125" y="25" textAnchor="middle" fontSize="10" className="fill-foreground">~2%</text>

      <text x="170" y="85" fontSize="18" className="fill-foreground">→</text>

      <rect x="200" y="10" width="20" height="90" className="fill-primary" />
      <text x="210" y="115" textAnchor="middle" fontSize="9" className="fill-muted-foreground">2nd test</text>
      <text x="210" y="7" textAnchor="middle" fontSize="10" className="fill-foreground">~30%+</text>
    </svg>
  );
}

const BAYES_GUIDE: GuideCardItem[] = [
  {
    key: "formula",
    title: "The formula — posterior, likelihood, prior, evidence",
    explain:
      "Bayes' theorem updates a probability when new evidence arrives. Start with a prior belief P(A), see evidence B, and finish with a posterior P(A|B). The numerator is 'the evidence weighted by the prior'; the denominator normalises by the total probability of the evidence.",
    formula: <>P(A|B) = P(B|A) · P(A) / P(B)</>,
    legend: [
      { sym: "P(A)", def: "prior — belief before evidence" },
      { sym: "P(B|A)", def: "likelihood — chance of evidence when A is true" },
      { sym: "P(B|¬A)", def: "false-positive rate" },
      { sym: "P(A|B)", def: "posterior — updated belief" },
    ],
    diagram: <BayesFormulaDiagram />,
    example: {
      given: "P(A)=0.001, P(B|A)=0.99, P(B|¬A)=0.05",
      substitute: "(0.99·0.001) / (0.99·0.001 + 0.05·0.999)",
      answer: "P(A|B) ≈ 0.0194 (1.94%)",
    },
  },
  {
    key: "total-probability",
    title: "Law of total probability — computing P(B)",
    explain:
      "You never observe P(B) directly. You expand it as 'the two ways B can happen': B with A true (true positives) plus B with A false (false positives). This expansion is what turns the abstract Bayes formula into something you can actually compute.",
    formula: <>P(B) = P(B|A)·P(A) + P(B|¬A)·P(¬A)</>,
    legend: [
      { sym: "P(¬A)", def: "= 1 − P(A)" },
      { sym: "TP", def: "true positives = P(B|A)·P(A)" },
      { sym: "FP", def: "false positives = P(B|¬A)·P(¬A)" },
    ],
    diagram: <TotalProbTreeDiagram />,
    example: {
      given: "P(A)=0.001, P(B|A)=0.99, P(B|¬A)=0.05",
      substitute: "0.99·0.001 + 0.05·0.999 = 0.00099 + 0.04995",
      answer: "P(B) ≈ 0.05094",
    },
  },
  {
    key: "base-rate",
    title: "Base-rate fallacy — why a positive test can still likely be wrong",
    explain:
      "When the condition is rare, the false-positive count almost always dwarfs the true-positive count. The most accurate way to see this is with natural frequencies: draw a picture of the population and count the boxes rather than juggling percentages.",
    formula: <>P(A|B) = TP / (TP + FP)</>,
    legend: [
      { sym: "TP", def: "true positives in the population" },
      { sym: "FP", def: "false positives in the population" },
    ],
    diagram: <BaseRateDiagram />,
    example: {
      given: "100 people: 1 sick (test positive) + 5 healthy (false positive)",
      substitute: "1 / (1 + 5)",
      answer: "≈ 16.7% — nowhere near the 99% sensitivity would suggest",
    },
  },
  {
    key: "sequential",
    title: "Sequential updating — the posterior becomes the next prior",
    explain:
      "Bayes' theorem chains. After one positive test your posterior is (say) 2%. That 2% becomes the prior for the next test. Two independent positive results move you from 0.1% to 2% to well over 30% — this is why confirmatory testing exists.",
    formula: <>P(A|B₁∩B₂) = P(B₂|A) · P(A|B₁) / P(B₂)</>,
    legend: [
      { sym: "B₁", def: "first piece of evidence" },
      { sym: "B₂", def: "second, independent piece" },
      { sym: "P(A|B₁)", def: "posterior after first test = new prior" },
    ],
    diagram: <PriorUpdateDiagram />,
    example: {
      given: "prior 0.1% → after one positive ≈ 2% → after a second independent positive",
      substitute: "(0.99·0.02) / (0.99·0.02 + 0.05·0.98)",
      answer: "≈ 28.8%",
    },
  },
];

/* ---------------- Page ---------------- */

function BayesPage() {
  const [preset, setPreset] = useState<PresetId>("medical");
  const [pA, setPA] = useState(PRESETS[0].pA);
  const [pBgivenA, setPBgivenA] = useState(PRESETS[0].pBgivenA);
  const [pBgivenNotA, setPBgivenNotA] = useState(PRESETS[0].pBgivenNotA);
  const [labelA, setLabelA] = useState(PRESETS[0].labelA);
  const [labelB, setLabelB] = useState(PRESETS[0].labelB);
  const [result, setResult] = useState<BayesResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const applyPreset = (id: PresetId) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setPreset(id);
    setPA(p.pA);
    setPBgivenA(p.pBgivenA);
    setPBgivenNotA(p.pBgivenNotA);
    setLabelA(p.labelA);
    setLabelB(p.labelB);
    setResult(null);
    setErr(null);
  };

  const compute = () => {
    setErr(null);
    setResult(null);
    const a = parseFloat(pA);
    const bA = parseFloat(pBgivenA);
    const bNA = parseFloat(pBgivenNotA);
    const res = computeBayes(a, bA, bNA, labelA.trim() || "A", labelB.trim() || "B");
    if ("error" in res) return setErr(res.error);
    setResult(res);
  };

  const clear = () => {
    setPA("");
    setPBgivenA("");
    setPBgivenNotA("");
    setResult(null);
    setErr(null);
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const term1 = result.pBgivenA * result.pA;
    const term2 = result.pBgivenNotA * result.pNotA;
    return [
      {
        title: "Likelihood P(B|A)",
        body: (
          <>
            <MathNote>The probability of the evidence B occurring, given that A is true</MathNote>
            <MathLine>P(B|A) = {fmt(result.pBgivenA)}</MathLine>
          </>
        ),
      },
      {
        title: "Prior P(A)",
        body: (
          <>
            <MathNote>The probability of A before observing any evidence</MathNote>
            <MathLine>P(A) = {fmt(result.pA)}</MathLine>
          </>
        ),
      },
      {
        title: "Complement P(¬A)",
        body: (
          <>
            <MathNote>The probability that A is false</MathNote>
            <MathLine>P(¬A) = 1 − P(A)</MathLine>
            <MathLine>P(¬A) = 1 − {fmt(result.pA)}</MathLine>
            <MathLine>P(¬A) = {fmt(result.pNotA)}</MathLine>
          </>
        ),
      },
      {
        title: "False-positive rate P(B|¬A)",
        body: (
          <>
            <MathNote>The probability of the evidence B occurring even though A is false</MathNote>
            <MathLine>P(B|¬A) = {fmt(result.pBgivenNotA)}</MathLine>
          </>
        ),
      },
      {
        title: "Total probability P(B)",
        body: (
          <>
            <MathNote>Law of total probability — sum the two ways B can occur</MathNote>
            <MathLine>P(B) = P(B|A)·P(A) + P(B|¬A)·P(¬A)</MathLine>
            <MathLine>P(B) = {fmt(result.pBgivenA)} × {fmt(result.pA)} + {fmt(result.pBgivenNotA)} × {fmt(result.pNotA)}</MathLine>
            <MathLine>P(B) = {fmt(term1)} + {fmt(term2)}</MathLine>
            <MathLine>P(B) = {fmt(result.pB)}</MathLine>
          </>
        ),
      },
      {
        title: "Posterior P(A|B)",
        body: (
          <>
            <MathNote>Bayes' theorem — combine the likelihood, prior and total probability</MathNote>
            <MathLine>P(A|B) = P(B|A)·P(A) / P(B)</MathLine>
            <MathLine>P(A|B) = ({fmt(result.pBgivenA)} × {fmt(result.pA)}) / {fmt(result.pB)}</MathLine>
            <MathLine>P(A|B) = {fmt(term1)} / {fmt(result.pB)}</MathLine>
            <MathLine>P(A|B) = {fmt(result.posterior)} ({pct(result.posterior, 4)})</MathLine>
          </>
        ),
      },
      {
        title: "Sanity-check with natural frequencies (per " + result.N + ")",
        body: (
          <div className="space-y-1">
            <div>Out of {result.N}: <strong>{result.countA}</strong> {result.labelA}, <strong>{result.countNotA}</strong> do not.</div>
            <div>Of the {result.countA} who {result.labelA} → <strong>{result.truePos}</strong> {result.labelB} (true positives), {result.falseNeg} do not.</div>
            <div>Of the {result.countNotA} who do not → <strong>{result.falsePos}</strong> still {result.labelB} (false positives), {result.trueNeg} do not.</div>
            <div className="pt-1">
              Total who {result.labelB} = {result.truePos + result.falsePos}. Of those, {result.truePos} actually {result.labelA} → {result.truePos}/{result.truePos + result.falsePos} ≈ <strong>{pct(result.posterior, 2)}</strong>. Matches the formula.
            </div>
          </div>
        ),
      },
    ];
  }, [result]);


  const summary = useMemo(() => {
    if (!result) return "";
    return [
      `Posterior P(${result.labelA} | ${result.labelB}) = ${fmt(result.posterior)} (${pct(result.posterior, 4)})`,
      `Prior P(${result.labelA}) = ${fmt(result.pA)} (${pct(result.pA, 4)})`,
      `Likelihood P(${result.labelB} | ${result.labelA}) = ${fmt(result.pBgivenA)}`,
      `False-positive rate P(${result.labelB} | ¬${result.labelA}) = ${fmt(result.pBgivenNotA)}`,
      `Total evidence P(${result.labelB}) = ${fmt(result.pB)}`,
      `Per 1000: true positives = ${result.truePos}, false positives = ${result.falsePos}, false negatives = ${result.falseNeg}, true negatives = ${result.trueNeg}`,
    ].join("\n");
  }, [result]);

  const currentPreset = PRESETS.find((p) => p.id === preset)!;

  return (
    <MathCalcPage
      name="Bayes' Theorem Calculator"
      tagline="Enter a prior, likelihood and false-positive rate to compute the posterior probability P(A|B). Includes a medical-test preset and a natural-frequency population grid that makes the counter-intuitive results click."
      extras={
        <>
          <CalcSection title="What is Bayes' theorem?">
            <p>
              Bayes' theorem is a rule for <strong>updating a probability when
              new evidence arrives</strong>. You start with a <em>prior</em> belief
              P(A), see some evidence B, and end with a <em>posterior</em> belief
              P(A|B). The formula, the law of total probability that expands
              the denominator, and the base-rate intuition are all covered in
              the guide cards below.
            </p>
          </CalcSection>

          <CalcSection title="Bayes' theorem explained, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card below owns one part of Bayes' theorem — the formula
              itself, the law of total probability, the base-rate fallacy, and
              sequential updating — with a plain-English explanation, the
              formula (every symbol spelled out), a diagram, and a worked
              example in one place.
            </p>
            <GuideCards items={BAYES_GUIDE} />
          </CalcSection>

          <CalcSection title="P(B|A) and P(A|B) are not the same thing">
            <p>
              The most common Bayes mistake is treating "probability of a
              positive test given disease" and "probability of disease given a
              positive test" as the same number. They are often wildly
              different, and Bayes' theorem is the exact tool for converting
              one into the other.
            </p>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Ignoring the base rate.</strong> A 99%-accurate test on a 0.1% disease is not "99% likely you have it".</li>
              <li><strong>Swapping P(B|A) and P(A|B).</strong> They are different quantities.</li>
              <li><strong>Forgetting the false-positive rate.</strong> Without P(B|¬A) you cannot compute P(B), so you cannot apply Bayes.</li>
              <li><strong>Entering percentages as whole numbers.</strong> This calculator expects decimals in 0–1.</li>
              <li><strong>Assuming the evidence is decisive.</strong> If P(B|A) and P(B|¬A) are close, the test tells you very little.</li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Inputs for the prior P(A), likelihood P(B|A) and false-positive rate P(B|¬A) — computes the posterior P(A|B) in one click",
                "Medical-test and spam-filter presets pre-fill realistic numbers you can tweak",
                "Natural-frequency grid — a 1000-cell population picture with true/false positives and negatives color-coded",
                "Show/hide step-by-step working: complement, law-of-total-probability expansion for P(B), the Bayes substitution, and a natural-frequency check",
                "Custom labels — rename A and B so the output reads like your actual problem",
                "Copy the result summary or download the panel — grid, result and steps — as an image",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What does Bayes' theorem calculate?", a: <p>The posterior probability P(A|B) — your updated belief that A is true after observing evidence B.</p> },
                { q: "Do I enter percentages or decimals?", a: <p>Decimals in the range 0 to 1. 5% is <code>0.05</code>, not <code>5</code>.</p> },
                { q: "What is the law of total probability?", a: <p>The rule P(B) = P(B|A)·P(A) + P(B|¬A)·P(¬A). It adds the two ways B can happen and gives the denominator of Bayes.</p> },
                { q: "Why is the natural-frequency picture more intuitive?", a: <p>Because it converts abstract probabilities into whole-person counts. "50 false positives out of 999 healthy people" is impossible to ignore.</p> },
                { q: "Can I use Bayes' theorem with more than two hypotheses?", a: <p>Yes — the general form sums over every mutually exclusive hypothesis in the denominator. This calculator handles the common two-outcome case.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/probability-calculator", label: "Probability Calculator" },
                { to: "/calculators/math/binomial-distribution-calculator", label: "Binomial Distribution Calculator" },
                { to: "/calculators/math/permutation-combination-calculator", label: "Permutation & Combination Calculator" },
                { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Preset" htmlFor="preset" hint="Pick a common Bayes setup — you can still tweak every input.">
          <select
            id="preset"
            value={preset}
            onChange={(e) => applyPreset(e.target.value as PresetId)}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <div className="mt-1 text-xs text-muted-foreground">{currentPreset.note}</div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Label for A (event / hypothesis)`} htmlFor="labelA" hint='e.g. "has the disease"'>
            <input
              id="labelA"
              value={labelA}
              onChange={(e) => setLabelA(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <Field label={`Label for B (evidence)`} htmlFor="labelB" hint='e.g. "tests positive"'>
            <input
              id="labelB"
              value={labelB}
              onChange={(e) => setLabelB(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="P(A) — prior" htmlFor="pA" hint="Between 0 and 1. Base rate.">
            <input
              id="pA"
              type="number"
              step="any"
              min="0"
              max="1"
              value={pA}
              onChange={(e) => setPA(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <Field label="P(B|A) — likelihood" htmlFor="pBgivenA" hint="Sensitivity: P(evidence | A).">
            <input
              id="pBgivenA"
              type="number"
              step="any"
              min="0"
              max="1"
              value={pBgivenA}
              onChange={(e) => setPBgivenA(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <Field label="P(B|¬A) — false-positive rate" htmlFor="pBgivenNotA" hint="P(evidence | not A).">
            <input
              id="pBgivenNotA"
              type="number"
              step="any"
              min="0"
              max="1"
              value={pBgivenNotA}
              onChange={(e) => setPBgivenNotA(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={compute}>Calculate P(A|B)</PrimaryButton>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center justify-center rounded-full border border-border bg-secondary/40 px-5 py-2.5 text-sm font-semibold text-foreground hover:border-primary/40"
          >
            Clear
          </button>
        </div>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <div className="mt-6 space-y-4">
          <ResultActions
            filename="bayes-theorem-result"
            captureRef={resultRef}
            getCopyText={() => summary}
          />
          <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label={`Posterior probability P(${result.labelA} | ${result.labelB})`}
              value={<>{pct(result.posterior, 4)}</>}
              note={
                <>
                  <div>= {fmt(result.posterior)}</div>
                  <div className="mt-1 text-xs">
                    Prior {pct(result.pA, 2)} · Likelihood {pct(result.pBgivenA, 2)} · False-positive rate {pct(result.pBgivenNotA, 2)} · P({result.labelB}) = {pct(result.pB, 4)}
                  </div>
                </>
              }
            />

            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-2 text-sm font-semibold text-foreground">
                Population picture — {result.N} people
              </div>
              <FrequencyGrid res={result} />
            </div>

            <StepsToggle steps={steps} />
          </div>
        </div>
      )}
    </MathCalcPage>
  );
}
