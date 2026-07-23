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
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  ResultBox,
  GuideCards,
  FormulaBlock,
  FormulaWithLegend,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
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

export const Route = createFileRoute("/calculators/math/sensitivity-specificity-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Sensitivity & Specificity Calculator",
      title: "Sensitivity & Specificity — PPV, NPV, LR± | Free",
      metaDescription:
        "Diagnostic test 2×2: sensitivity, specificity, PPV, NPV, accuracy and likelihood ratios (LR+, LR−) with Bayes prevalence adjustment and step-by-step working.",
      canonicalUrl: "/calculators/math/sensitivity-specificity-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Sensitivity & Specificity Calculator", path: "/calculators/math/sensitivity-specificity-calculator" },
      ],
      faqs: [
        {
          q: "What's the difference between sensitivity and PPV?",
          a: "Sensitivity is 'if the person truly has the disease, how often does the test flag them?' PPV is 'if the test flags a person, how often do they truly have the disease?' Sensitivity is a property of the test; PPV also depends on how common the disease is in the population being tested.",
        },
        {
          q: "Why does PPV change with prevalence but sensitivity does not?",
          a: "Sensitivity and specificity are conditional on true disease status, so they describe the test itself. PPV and NPV are conditional on the test result, so they depend on how many diseased vs healthy people are in the pool being tested — that mix is the prevalence.",
        },
        {
          q: "What is a good LR+?",
          a: "As a rough clinical rule of thumb: LR+ above 10 provides strong evidence to rule the disease in, 5–10 is moderate, 2–5 is weak, and near 1 barely shifts the odds. LR− below 0.1 rules the disease out strongly, 0.1–0.2 moderately, 0.2–0.5 weakly.",
        },
        {
          q: "Can I use this for any 2×2 diagnostic table?",
          a: "Yes — enter TP, FP, FN and TN from any study that compares a test result against a reference/gold standard. All seven metrics are computed automatically.",
        },
        {
          q: "What if one of my cells is zero?",
          a: "The calculator handles it: any ratio whose denominator hits zero is displayed as '—' rather than a crash, and the working explains which cells drive which metric so you can see exactly what is undefined.",
        },
      ],
    }),
  component: SensSpecPage,
});

/* ---------------- Math ---------------- */

interface Result {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  total: number;
  diseasePos: number; // TP + FN
  diseaseNeg: number; // FP + TN
  testPos: number; // TP + FP
  testNeg: number; // FN + TN
  sensitivity: number;
  specificity: number;
  ppv: number;
  npv: number;
  accuracy: number;
  lrPos: number;
  lrNeg: number;
  samplePrevalence: number;
}

function safeDiv(num: number, den: number): number {
  return den === 0 ? NaN : num / den;
}

function computeMetrics(tp: number, fp: number, fn: number, tn: number): Result {
  const total = tp + fp + fn + tn;
  const diseasePos = tp + fn;
  const diseaseNeg = fp + tn;
  const testPos = tp + fp;
  const testNeg = fn + tn;
  const sensitivity = safeDiv(tp, diseasePos);
  const specificity = safeDiv(tn, diseaseNeg);
  const ppv = safeDiv(tp, testPos);
  const npv = safeDiv(tn, testNeg);
  const accuracy = safeDiv(tp + tn, total);
  const lrPos = safeDiv(sensitivity, 1 - specificity);
  const lrNeg = safeDiv(1 - sensitivity, specificity);
  const samplePrevalence = safeDiv(diseasePos, total);
  return {
    tp, fp, fn, tn, total, diseasePos, diseaseNeg, testPos, testNeg,
    sensitivity, specificity, ppv, npv, accuracy, lrPos, lrNeg, samplePrevalence,
  };
}

/**
 * Bayes-adjusted PPV/NPV at a new prevalence.
 * PPV = (Sn · P) / (Sn · P + (1−Sp) · (1−P))
 * NPV = (Sp · (1−P)) / (Sp · (1−P) + (1−Sn) · P)
 * (Standard clinical epidemiology formulas — see Sackett et al.,
 * "Evidence-Based Medicine", and BMJ diagnostic-test primers.)
 */
function bayesPpvNpv(sn: number, sp: number, prevalence: number) {
  const p = prevalence;
  const ppv = safeDiv(sn * p, sn * p + (1 - sp) * (1 - p));
  const npv = safeDiv(sp * (1 - p), sp * (1 - p) + (1 - sn) * p);
  return { ppv, npv };
}

function pct(x: number, dp = 2): string {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(dp) + "%";
}
function fmt(x: number, dp = 3): string {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(dp);
}

/* ---------------- 2×2 Diagnostic diagram ---------------- */

function DiagnosticTable({ res }: { res: Result }) {
  const cellCls = "px-3 py-3 text-center font-serif italic text-base tabular-nums border border-border/60";
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="px-2 py-2"></th>
            <th className="border border-border/60 bg-secondary/50 px-3 py-2 font-semibold" colSpan={2}>
              True condition
            </th>
            <th className="border border-border/60 bg-secondary/30 px-3 py-2 font-semibold">Row total</th>
          </tr>
          <tr>
            <th className="px-2 py-2"></th>
            <th className="border border-border/60 bg-secondary/40 px-3 py-2 font-semibold">Disease Present</th>
            <th className="border border-border/60 bg-secondary/40 px-3 py-2 font-semibold">Disease Absent</th>
            <th className="border border-border/60 bg-secondary/30 px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th className="border border-border/60 bg-secondary/50 px-3 py-2 text-left font-semibold">Test Positive</th>
            <td className={cellCls + " bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}>
              <div className="text-[10px] uppercase tracking-wider opacity-70">TP · correct</div>
              {res.tp}
            </td>
            <td className={cellCls + " bg-amber-500/15 text-amber-700 dark:text-amber-300"}>
              <div className="text-[10px] uppercase tracking-wider opacity-70">FP · type I</div>
              {res.fp}
            </td>
            <td className={cellCls + " bg-secondary/30"}>{res.testPos}</td>
          </tr>
          <tr>
            <th className="border border-border/60 bg-secondary/50 px-3 py-2 text-left font-semibold">Test Negative</th>
            <td className={cellCls + " bg-rose-500/15 text-rose-700 dark:text-rose-300"}>
              <div className="text-[10px] uppercase tracking-wider opacity-70">FN · type II</div>
              {res.fn}
            </td>
            <td className={cellCls + " bg-sky-500/15 text-sky-700 dark:text-sky-300"}>
              <div className="text-[10px] uppercase tracking-wider opacity-70">TN · correct</div>
              {res.tn}
            </td>
            <td className={cellCls + " bg-secondary/30"}>{res.testNeg}</td>
          </tr>
          <tr>
            <th className="border border-border/60 bg-secondary/30 px-3 py-2 text-left font-semibold">Column total</th>
            <td className={cellCls + " bg-secondary/30"}>{res.diseasePos}</td>
            <td className={cellCls + " bg-secondary/30"}>{res.diseaseNeg}</td>
            <td className={cellCls + " bg-secondary/50 font-semibold"}>N = {res.total}</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <span className="inline-block h-3 w-3 rounded bg-emerald-500/40 align-middle" />{" "}
          <strong className="text-foreground">TP</strong> — has disease, test positive (correct)
        </div>
        <div>
          <span className="inline-block h-3 w-3 rounded bg-amber-500/40 align-middle" />{" "}
          <strong className="text-foreground">FP</strong> — no disease, test positive (false alarm)
        </div>
        <div>
          <span className="inline-block h-3 w-3 rounded bg-rose-500/40 align-middle" />{" "}
          <strong className="text-foreground">FN</strong> — has disease, test negative (missed case)
        </div>
        <div>
          <span className="inline-block h-3 w-3 rounded bg-sky-500/40 align-middle" />{" "}
          <strong className="text-foreground">TN</strong> — no disease, test negative (correct)
        </div>
      </div>
    </div>
  );
}

/* ---------------- Guide cards ---------------- */

const SS_GUIDE: GuideCardItem[] = [
  {
    key: "sn",
    title: "1. Sensitivity — the true-positive rate",
    explain: "Sensitivity is how well the test finds people who really have the disease. Sn = 95% means the test flags 95 of every 100 truly diseased people and misses 5. Screening tests are tuned for high sensitivity so that few real cases slip through.",
    formula: <>Sn = TP / (TP + FN)</>,
    legend: [
      { sym: "TP", def: "true positives — sick, correctly flagged" },
      { sym: "FN", def: "false negatives — sick, missed" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 130" className="w-full max-w-[220px]" aria-hidden>
          <rect x="20" y="20" width="80" height="90" className="fill-emerald-500/25 stroke-emerald-500" />
          <rect x="100" y="20" width="80" height="90" className="fill-rose-500/25 stroke-rose-500" />
          <text x="60" y="70" fontSize="14" textAnchor="middle" className="fill-emerald-600 font-semibold">TP</text>
          <text x="140" y="70" fontSize="14" textAnchor="middle" className="fill-rose-600 font-semibold">FN</text>
          <text x="100" y="14" fontSize="10" textAnchor="middle" className="fill-muted-foreground">Truly diseased</text>
          <text x="100" y="125" fontSize="10" textAnchor="middle" className="fill-emerald-600">Sn = TP / (TP + FN)</text>
        </svg>
      </div>
    ),
    example: { given: "TP = 90, FN = 10", substitute: "90 / (90 + 10)", answer: "Sn = 90%" },
  },
  {
    key: "sp",
    title: "2. Specificity — the true-negative rate",
    explain: "Specificity is how well the test clears people who truly don't have the disease. Sp = 90% means 90 of every 100 healthy people are correctly cleared and 10 get a false alarm. Confirmatory tests are tuned for high specificity so that few healthy people are wrongly labelled.",
    formula: <>Sp = TN / (TN + FP)</>,
    legend: [
      { sym: "TN", def: "true negatives — healthy, correctly cleared" },
      { sym: "FP", def: "false positives — healthy, wrongly flagged" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 130" className="w-full max-w-[220px]" aria-hidden>
          <rect x="20" y="20" width="80" height="90" className="fill-amber-500/25 stroke-amber-500" />
          <rect x="100" y="20" width="80" height="90" className="fill-sky-500/25 stroke-sky-500" />
          <text x="60" y="70" fontSize="14" textAnchor="middle" className="fill-amber-600 font-semibold">FP</text>
          <text x="140" y="70" fontSize="14" textAnchor="middle" className="fill-sky-600 font-semibold">TN</text>
          <text x="100" y="14" fontSize="10" textAnchor="middle" className="fill-muted-foreground">Truly healthy</text>
          <text x="100" y="125" fontSize="10" textAnchor="middle" className="fill-sky-600">Sp = TN / (TN + FP)</text>
        </svg>
      </div>
    ),
    example: { given: "TN = 850, FP = 50", substitute: "850 / (850 + 50)", answer: "Sp ≈ 94.44%" },
  },
  {
    key: "ppv",
    title: "3. PPV & NPV — the answer the patient wants",
    explain: "Positive predictive value asks: given a positive test, what's the probability of really having the disease? Negative predictive value asks the mirror question for a negative test. Both depend on how common the disease is in the population — same test, different prevalence, different PPV.",
    formula: <>PPV = TP / (TP + FP) &nbsp;·&nbsp; NPV = TN / (TN + FN)</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 130" className="w-full max-w-[220px]" aria-hidden>
          <rect x="20" y="20" width="80" height="45" className="fill-emerald-500/25 stroke-emerald-500" />
          <rect x="100" y="20" width="80" height="45" className="fill-amber-500/25 stroke-amber-500" />
          <rect x="20" y="65" width="80" height="45" className="fill-rose-500/25 stroke-rose-500" />
          <rect x="100" y="65" width="80" height="45" className="fill-sky-500/25 stroke-sky-500" />
          <text x="60" y="47" fontSize="12" textAnchor="middle" className="fill-emerald-600 font-semibold">TP</text>
          <text x="140" y="47" fontSize="12" textAnchor="middle" className="fill-amber-600 font-semibold">FP</text>
          <text x="60" y="92" fontSize="12" textAnchor="middle" className="fill-rose-600 font-semibold">FN</text>
          <text x="140" y="92" fontSize="12" textAnchor="middle" className="fill-sky-600 font-semibold">TN</text>
          <text x="10" y="45" fontSize="9" textAnchor="end" className="fill-muted-foreground">T+</text>
          <text x="10" y="90" fontSize="9" textAnchor="end" className="fill-muted-foreground">T−</text>
        </svg>
      </div>
    ),
    example: { given: "TP = 90, FP = 50 (prev = 10%)", substitute: "90 / (90 + 50)", answer: "PPV ≈ 64.29%" },
  },
  {
    key: "prev",
    title: "4. Why prevalence changes PPV (Bayes)",
    explain: "Sensitivity and specificity are properties of the test — they don't change when you move to a new population. PPV and NPV do. Apply the same 99% sensitive, 95% specific test in a 10%-prevalence clinic and PPV is 68%; apply it in a 0.1%-prevalence screening pool and PPV drops to under 2%. Bayes' theorem quantifies this.",
    formula: <>PPV(P) = Sn·P / [ Sn·P + (1−Sp)·(1−P) ]</>,
    legend: [{ sym: "P", def: "prevalence — fraction with the disease" }],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 130" className="w-full max-w-[220px]" aria-hidden>
          <line x1="20" y1="110" x2="200" y2="110" className="stroke-border" />
          <line x1="20" y1="20" x2="20" y2="110" className="stroke-border" />
          <path d="M 20 108 Q 60 105 100 60 T 200 25" className="fill-none stroke-primary" strokeWidth={2} />
          <text x="110" y="14" fontSize="10" textAnchor="middle" className="fill-primary">PPV rises with prevalence</text>
          <text x="110" y="125" fontSize="9" textAnchor="middle" className="fill-muted-foreground">prevalence →</text>
        </svg>
      </div>
    ),
    example: { given: "Sn = 90%, Sp = 94.44%, P = 1%", substitute: "0.9·0.01 / (0.9·0.01 + 0.0556·0.99)", answer: "PPV ≈ 14.06%" },
  },
  {
    key: "lr",
    title: "5. Likelihood ratios — bedside shifts of odds",
    explain: "A likelihood ratio tells you how much a result shifts your belief. Multiply pre-test odds by LR+ after a positive result or LR− after a negative one. Unlike PPV/NPV, LRs don't depend on prevalence — they travel cleanly across populations.",
    formula: <>LR+ = Sn / (1 − Sp) &nbsp;·&nbsp; LR− = (1 − Sn) / Sp</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-[11px] font-serif italic">
        <div className="w-full space-y-1">
          <div><span className="text-primary">LR+ &gt; 10</span> — large ↑ probability</div>
          <div><span className="text-primary">LR+ 5–10</span> — moderate ↑</div>
          <div><span className="text-primary">LR+ 2–5</span>  — small ↑</div>
          <div><span className="text-muted-foreground">LR ≈ 1</span>   — barely changes belief</div>
          <div><span className="text-primary">LR− 0.2–0.5</span> — small ↓</div>
          <div><span className="text-primary">LR− &lt; 0.1</span> — large ↓ probability</div>
        </div>
      </div>
    ),
    example: { given: "Sn = 90%, Sp = 94.44%", substitute: "0.90 / (1 − 0.9444)", answer: "LR+ ≈ 16.2" },
  },
];

/* ---------------- Page ---------------- */

function SensSpecPage() {
  const [tp, setTp] = useState("90");
  const [fp, setFp] = useState("50");
  const [fn, setFn] = useState("10");
  const [tn, setTn] = useState("850");
  const [newPrevInput, setNewPrevInput] = useState("1");
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const parseCell = (v: string, label: string): number | string => {
    const n = Number(v.trim());
    if (v.trim() === "" || !Number.isFinite(n)) return `${label} must be a number.`;
    if (n < 0) return `${label} cannot be negative.`;
    if (!Number.isInteger(n)) return `${label} must be a whole count.`;
    return n;
  };

  const compute = () => {
    setErr(null);
    setResult(null);
    const cells: [string, string][] = [
      [tp, "TP"], [fp, "FP"], [fn, "FN"], [tn, "TN"],
    ];
    const nums: number[] = [];
    for (const [v, label] of cells) {
      const r = parseCell(v, label);
      if (typeof r === "string") return setErr(r);
      nums.push(r);
    }
    const [tpN, fpN, fnN, tnN] = nums;
    if (tpN + fpN + fnN + tnN === 0) return setErr("All four cells are 0 — enter your 2×2 counts.");
    setResult(computeMetrics(tpN, fpN, fnN, tnN));
  };

  const clear = () => {
    setTp(""); setFp(""); setFn(""); setTn("");
    setResult(null); setErr(null);
  };

  const bayesAdjusted = useMemo(() => {
    if (!result) return null;
    const p = Number(newPrevInput);
    if (!Number.isFinite(p)) return { error: "Enter a prevalence as a percentage (e.g. 1 for 1%)." };
    if (p < 0 || p > 100) return { error: "Prevalence must be between 0% and 100%." };
    if (!Number.isFinite(result.sensitivity) || !Number.isFinite(result.specificity)) {
      return { error: "Sensitivity or specificity is undefined (a required cell is zero), so PPV/NPV cannot be re-computed." };
    }
    const prev = p / 100;
    const { ppv, npv } = bayesPpvNpv(result.sensitivity, result.specificity, prev);
    return { prev, ppv, npv };
  }, [result, newPrevInput]);

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const r = result;
    const base: Step[] = [
      {
        title: "Given",
        body: (
          <>
            <MathNote>The 2×2 diagnostic table counts</MathNote>
            <MathLine>TP = {r.tp}, FP = {r.fp}, FN = {r.fn}, TN = {r.tn} (N = {r.total})</MathLine>
          </>
        ),
      },
      {
        title: "Sensitivity",
        body: (
          <>
            <MathNote>True-positive rate — of everyone truly diseased, the fraction the test catches</MathNote>
            <MathLine>Sn = TP / (TP + FN)</MathLine>
            <MathLine>Sn = {r.tp} / ({r.tp} + {r.fn}) = {r.tp} / {r.diseasePos}</MathLine>
            <MathLine>Sn = {pct(r.sensitivity)}</MathLine>
          </>
        ),
      },
      {
        title: "Specificity",
        body: (
          <>
            <MathNote>True-negative rate — of everyone truly healthy, the fraction the test clears</MathNote>
            <MathLine>Sp = TN / (TN + FP)</MathLine>
            <MathLine>Sp = {r.tn} / ({r.tn} + {r.fp}) = {r.tn} / {r.diseaseNeg}</MathLine>
            <MathLine>Sp = {pct(r.specificity)}</MathLine>
          </>
        ),
      },
      {
        title: "Positive Predictive Value (PPV)",
        body: (
          <>
            <MathNote>Of everyone who tested positive, the fraction truly diseased (at sample prevalence)</MathNote>
            <MathLine>PPV = TP / (TP + FP)</MathLine>
            <MathLine>PPV = {r.tp} / ({r.tp} + {r.fp}) = {r.tp} / {r.testPos}</MathLine>
            <MathLine>PPV = {pct(r.ppv)} (at sample prevalence {pct(r.samplePrevalence)})</MathLine>
          </>
        ),
      },
      {
        title: "Negative Predictive Value (NPV)",
        body: (
          <>
            <MathNote>Of everyone who tested negative, the fraction truly healthy</MathNote>
            <MathLine>NPV = TN / (TN + FN)</MathLine>
            <MathLine>NPV = {r.tn} / ({r.tn} + {r.fn}) = {r.tn} / {r.testNeg}</MathLine>
            <MathLine>NPV = {pct(r.npv)}</MathLine>
          </>
        ),
      },
      {
        title: "Accuracy",
        body: (
          <>
            <MathNote>Overall fraction of all cases correctly classified</MathNote>
            <MathLine>Accuracy = (TP + TN) / N</MathLine>
            <MathLine>Accuracy = ({r.tp} + {r.tn}) / {r.total}</MathLine>
            <MathLine>Accuracy = {pct(r.accuracy)}</MathLine>
          </>
        ),
      },
      {
        title: "Likelihood ratios",
        body: (
          <>
            <MathNote>How much a result shifts pre-test odds — prevalence-independent</MathNote>
            <MathLine>LR+ = Sn / (1 − Sp)</MathLine>
            <MathLine>LR+ = {fmt(r.sensitivity)} / {fmt(1 - r.specificity)} = {fmt(r.lrPos)}</MathLine>
            <MathLine>LR− = (1 − Sn) / Sp</MathLine>
            <MathLine>LR− = {fmt(1 - r.sensitivity)} / {fmt(r.specificity)} = {fmt(r.lrNeg)}</MathLine>
          </>
        ),
      },
    ];
    if (bayesAdjusted && !("error" in bayesAdjusted)) {
      base.push({
        title: `Bayes-adjusted PPV/NPV (prevalence = ${pct(bayesAdjusted.prev)})`,
        body: (
          <>
            <MathNote>Sensitivity and specificity stay fixed; PPV/NPV are recomputed at a new prevalence via Bayes' theorem</MathNote>
            <MathLine>PPV = (Sn·P) / [Sn·P + (1 − Sp)·(1 − P)]</MathLine>
            <MathLine>
              PPV = ({fmt(r.sensitivity)}·{fmt(bayesAdjusted.prev)}) / [{fmt(r.sensitivity)}·{fmt(bayesAdjusted.prev)} + {fmt(1 - r.specificity)}·{fmt(1 - bayesAdjusted.prev)}]
            </MathLine>
            <MathLine>PPV = {pct(bayesAdjusted.ppv)}</MathLine>
            <MathLine>NPV = (Sp·(1 − P)) / [Sp·(1 − P) + (1 − Sn)·P]</MathLine>
            <MathLine>
              NPV = ({fmt(r.specificity)}·{fmt(1 - bayesAdjusted.prev)}) / [{fmt(r.specificity)}·{fmt(1 - bayesAdjusted.prev)} + {fmt(1 - r.sensitivity)}·{fmt(bayesAdjusted.prev)}]
            </MathLine>
            <MathLine>NPV = {pct(bayesAdjusted.npv)}</MathLine>
          </>
        ),
      });
    }
    return base;
  }, [result, bayesAdjusted]);

  const summary = useMemo(() => {
    if (!result) return "";
    const lines = [
      `Sensitivity = ${pct(result.sensitivity)}`,
      `Specificity = ${pct(result.specificity)}`,
      `PPV = ${pct(result.ppv)}   (at sample prevalence ${pct(result.samplePrevalence)})`,
      `NPV = ${pct(result.npv)}`,
      `Accuracy = ${pct(result.accuracy)}`,
      `LR+ = ${fmt(result.lrPos)}`,
      `LR− = ${fmt(result.lrNeg)}`,
      `TP=${result.tp}, FP=${result.fp}, FN=${result.fn}, TN=${result.tn}, N=${result.total}`,
    ];
    if (bayesAdjusted && !("error" in bayesAdjusted)) {
      lines.push(`PPV @ prevalence ${pct(bayesAdjusted.prev)} = ${pct(bayesAdjusted.ppv)}`);
      lines.push(`NPV @ prevalence ${pct(bayesAdjusted.prev)} = ${pct(bayesAdjusted.npv)}`);
    }
    return lines.join("\n");
  }, [result, bayesAdjusted]);

  return (
    <MathCalcPage
      name="Sensitivity & Specificity Calculator"
      tagline="Full diagnostic-test 2×2 calculator — sensitivity, specificity, PPV, NPV, accuracy and likelihood ratios, plus Bayes-based PPV/NPV recomputation at any disease prevalence."
      extras={
        <>
          <CalcSection title="Sensitivity, specificity & predictive values, step by step">
            <p className="text-sm text-muted-foreground">
              Each metric gets a plain-English definition, the formula this calculator uses, a small diagram of the 2×2 cell it lives in, and a worked example — all in one card so the maths lines up with the visual.
            </p>
            <GuideCards items={SS_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Full diagnostic-test 2×2 input with TP / FP / FN / TN labelling",
                "All seven metrics side by side: sensitivity, specificity, PPV, NPV, accuracy, LR+ and LR−",
                "Color-coded contingency table so correct vs incorrect classifications are visually distinct",
                "PPV / NPV recomputed at ANY hypothetical disease prevalence via Bayes' theorem",
                "Sample prevalence shown alongside PPV so you always know which population the value applies to",
                "Show / hide step-by-step working with every formula substituted, including the Bayes-adjusted PPV/NPV",
                "Zero-cell safe — undefined metrics show '—' rather than crashing",
                "Copy the full result summary or download the whole panel as an image",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What's the difference between sensitivity and PPV?", a: <p>Sensitivity conditions on disease status ("given disease, probability of positive test"). PPV conditions on the test result ("given positive test, probability of disease"). Sensitivity is a property of the test; PPV also depends on the population's prevalence.</p> },
                { q: "Why does PPV change with prevalence but sensitivity does not?", a: <p>Sensitivity and specificity are conditional on true disease status, so they describe the test itself. PPV and NPV are conditional on the test result, so they depend on how many diseased vs healthy people were in the pool being tested.</p> },
                { q: "How do I get a PPV for my own patient population?", a: <p>Enter the study's TP/FP/FN/TN to get sensitivity and specificity, then use the "Recalculate PPV/NPV at a different prevalence" input. The calculator applies Bayes' theorem for you.</p> },
                { q: "What is a good sensitivity or specificity?", a: <p>Screening tests aim for very high sensitivity; confirmatory tests aim for very high specificity. There's no universal threshold.</p> },
                { q: "What if one of my cells is zero?", a: <p>The affected metric shows '—'. Most commonly TP = 0 makes sensitivity and PPV undefined; TN = 0 makes specificity and NPV undefined.</p> },
                { q: "Can this handle problems other than disease vs no disease?", a: <p>Yes — any binary classifier fits: spam vs not, defect vs not, fraud vs legitimate. Just relabel TP/FP/FN/TN.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/odds-ratio-relative-risk-calculator", label: "Odds Ratio & Relative Risk Calculator" },
                { to: "/calculators/math/bayes-theorem-calculator", label: "Bayes' Theorem Calculator" },
                { to: "/calculators/math/chi-square-calculator", label: "Chi-Square Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <div className="mb-3 text-sm font-semibold text-foreground">2×2 Diagnostic table — enter counts</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="TP — has disease, test positive" htmlFor="tp">
              <input id="tp" inputMode="numeric" value={tp} onChange={(e) => setTp(e.target.value)}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </Field>
            <Field label="FP — no disease, test positive" htmlFor="fp">
              <input id="fp" inputMode="numeric" value={fp} onChange={(e) => setFp(e.target.value)}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </Field>
            <Field label="FN — has disease, test negative" htmlFor="fn">
              <input id="fn" inputMode="numeric" value={fn} onChange={(e) => setFn(e.target.value)}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </Field>
            <Field label="TN — no disease, test negative" htmlFor="tn">
              <input id="tn" inputMode="numeric" value={tn} onChange={(e) => setTn(e.target.value)}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </Field>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={compute}>Calculate metrics</PrimaryButton>
          <button type="button" onClick={clear}
            className="inline-flex items-center justify-center rounded-full border border-border bg-secondary/40 px-5 py-2.5 text-sm font-semibold text-foreground hover:border-primary/40">
            Clear
          </button>
        </div>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <div className="mt-6 space-y-4">
          <ResultActions filename="sensitivity-specificity-result" captureRef={resultRef} getCopyText={() => summary} />
          <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <ResultBox label="Sensitivity (TPR)" value={pct(result.sensitivity)} note={<span className="text-xs">TP / (TP + FN) = {result.tp} / {result.diseasePos}</span>} />
              <ResultBox label="Specificity (TNR)" value={pct(result.specificity)} note={<span className="text-xs">TN / (TN + FP) = {result.tn} / {result.diseaseNeg}</span>} />
              <ResultBox label="Positive Predictive Value" value={pct(result.ppv)} note={<span className="text-xs">TP / (TP + FP) at sample prevalence {pct(result.samplePrevalence)}</span>} />
              <ResultBox label="Negative Predictive Value" value={pct(result.npv)} note={<span className="text-xs">TN / (TN + FN)</span>} />
              <ResultBox label="Accuracy" value={pct(result.accuracy)} note={<span className="text-xs">(TP + TN) / N = {result.tp + result.tn} / {result.total}</span>} />
              <ResultBox label="Likelihood ratios" value={<>LR+ = {fmt(result.lrPos)} · LR− = {fmt(result.lrNeg)}</>} note={<span className="text-xs">Prevalence-independent — travel across populations cleanly.</span>} />
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-2 text-sm font-semibold text-foreground">2×2 diagnostic table diagram</div>
              <DiagnosticTable res={result} />
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div className="mb-1 text-sm font-semibold text-foreground">Recalculate PPV / NPV at a different prevalence</div>
              <p className="mb-3 text-xs text-muted-foreground">
                Your sample's prevalence is <strong>{pct(result.samplePrevalence)}</strong>. Enter any other
                prevalence to see how PPV and NPV change via Bayes' theorem (sensitivity and specificity
                stay the same — they're properties of the test).
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Hypothetical disease prevalence (%)" htmlFor="prev" hint="e.g. 1 for 1%, 0.1 for 1 in 1000">
                  <input id="prev" inputMode="decimal" value={newPrevInput} onChange={(e) => setNewPrevInput(e.target.value)}
                    className="w-40 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </Field>
              </div>
              {bayesAdjusted && "error" in bayesAdjusted ? (
                <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {bayesAdjusted.error}
                </div>
              ) : bayesAdjusted ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ResultBox label={`PPV at ${pct(bayesAdjusted.prev)} prevalence`} value={pct(bayesAdjusted.ppv)}
                    note={<span className="text-xs">Sample PPV was {pct(result.ppv)} at {pct(result.samplePrevalence)} prevalence</span>} />
                  <ResultBox label={`NPV at ${pct(bayesAdjusted.prev)} prevalence`} value={pct(bayesAdjusted.npv)}
                    note={<span className="text-xs">Sample NPV was {pct(result.npv)}</span>} />
                </div>
              ) : null}
            </div>

            <StepsToggle steps={steps} />
          </div>
        </div>
      )}
    </MathCalcPage>
  );
}
