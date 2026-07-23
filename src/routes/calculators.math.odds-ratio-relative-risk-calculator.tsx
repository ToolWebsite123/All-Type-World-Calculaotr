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
import { SolutionSteps, type Step } from "@/components/SolutionSteps";

const ORR_GUIDE: GuideCardItem[] = [
  {
    key: "table",
    title: "1. The 2×2 table — where every letter comes from",
    explain:
      "All formulas below reference the four cells a, b, c, d of the 2×2 contingency table. a is exposed with outcome, b is exposed without, c is unexposed with outcome, d is unexposed without. Get these four numbers right and every ratio follows.",
    formula: (
      <>
        a = exposed·outcome &nbsp; b = exposed·no-outcome
        <br />
        c = unexposed·outcome &nbsp; d = unexposed·no-outcome
      </>
    ),
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 110" className="w-full max-w-[220px]" aria-hidden>
          <rect x="60" y="20" width="60" height="35" className="fill-primary/25 stroke-primary" />
          <rect x="120" y="20" width="60" height="35" className="fill-primary/10 stroke-primary" />
          <rect x="60" y="55" width="60" height="35" className="fill-primary/10 stroke-primary" />
          <rect x="120" y="55" width="60" height="35" className="fill-primary/25 stroke-primary" />
          <text x="90" y="42" fontSize="13" textAnchor="middle" className="fill-primary">a</text>
          <text x="150" y="42" fontSize="13" textAnchor="middle" className="fill-primary">b</text>
          <text x="90" y="77" fontSize="13" textAnchor="middle" className="fill-primary">c</text>
          <text x="150" y="77" fontSize="13" textAnchor="middle" className="fill-primary">d</text>
          <text x="30" y="42" fontSize="9" className="fill-muted-foreground">Exp</text>
          <text x="30" y="77" fontSize="9" className="fill-muted-foreground">Unexp</text>
        </svg>
      </div>
    ),
    example: {
      given: "a=40, b=60, c=20, d=80",
      substitute: "row totals 100 / 100",
      answer: "table filled",
    },
  },
  {
    key: "or",
    title: "2. Odds Ratio — the case-control / logistic-regression measure",
    explain:
      "The odds of the outcome in the exposed group are a/b; in the unexposed group they are c/d. Their ratio is OR = ad/bc. OR is the natural output of case-control studies (where risks can't be computed) and of logistic regression.",
    formula: <>OR = (a · d) / (b · c)</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 90" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="70" x2="220" y2="70" className="stroke-border" />
          <line x1="120" y1="15" x2="120" y2="75" className="stroke-border" strokeDasharray="2 3" />
          <text x="120" y="12" fontSize="9" textAnchor="middle" className="fill-muted-foreground">OR = 1 (no effect)</text>
          <circle cx="170" cy="45" r="6" className="fill-primary" />
          <line x1="130" y1="45" x2="210" y2="45" className="stroke-primary" strokeWidth="2" />
          <text x="170" y="85" fontSize="9" textAnchor="middle" className="fill-primary">OR &gt; 1 with 95% CI</text>
        </svg>
      </div>
    ),
    example: {
      given: "a=40 b=60 c=20 d=80",
      substitute: "(40·80)/(60·20)",
      answer: "OR ≈ 2.67",
    },
  },
  {
    key: "rr",
    title: "3. Relative Risk — the cohort / RCT measure",
    explain:
      "Risk in the exposed group is a/(a+b); in the unexposed group it is c/(c+d). Their ratio is RR — a direct multiplier on the outcome's probability. RR requires knowing the full exposed and unexposed populations, so it belongs to cohort studies and randomised trials.",
    formula: <>RR = [ a / (a + b) ] / [ c / (c + d) ]</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 90" className="w-full max-w-[240px]" aria-hidden>
          <rect x="30" y="30" width="80" height="30" className="fill-primary/40" />
          <rect x="30" y="30" width="32" height="30" className="fill-primary" />
          <rect x="130" y="30" width="80" height="30" className="fill-primary/40" />
          <rect x="130" y="30" width="16" height="30" className="fill-primary" />
          <text x="70" y="75" fontSize="9" textAnchor="middle" className="fill-muted-foreground">exposed 40%</text>
          <text x="170" y="75" fontSize="9" textAnchor="middle" className="fill-muted-foreground">unexposed 20%</text>
        </svg>
      </div>
    ),
    example: {
      given: "40/100 vs 20/100",
      substitute: "0.40 / 0.20",
      answer: "RR = 2.00",
    },
  },
  {
    key: "ci",
    title: "4. Confidence intervals — the log-transform (Woolf) method",
    explain:
      "Both ratios are skewed, so the CI is built on the log scale then exponentiated back. SE(ln OR) and SE(ln RR) have the closed forms below; multiply by z* (1.96 for 95%) and exponentiate to get the interval. If it excludes 1, the effect is significant at that level.",
    formula: (
      <>
        SE(ln OR) = √(1/a + 1/b + 1/c + 1/d)
        <br />
        CI = exp( ln(ratio) ± z* · SE )
      </>
    ),
    legend: [
      { sym: "z*", def: "1.645 / 1.96 / 2.576 for 90 / 95 / 99%" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded bg-primary/10 py-1 text-primary">CI excludes 1 → significant</div>
          <div className="rounded bg-primary/10 py-1 text-primary">CI includes 1 → not significant</div>
          <div className="rounded bg-primary/10 py-1 text-primary">rare outcome → OR ≈ RR</div>
        </div>
      </div>
    ),
    example: {
      given: "ln OR = 0.981, SE = 0.323",
      substitute: "exp(0.981 ± 1.96·0.323)",
      answer: "[1.42, 5.02]",
    },
  },
];


export const Route = createFileRoute(
  "/calculators/math/odds-ratio-relative-risk-calculator",
)({
  head: () =>
    buildCalculatorSeo({
      name: "Odds Ratio & Relative Risk Calculator",
      title: "Odds Ratio & Relative Risk — 2×2 with 95% CIs",
      metaDescription:
        "Compute odds ratio (OR) and relative risk (RR) from a 2×2 table with 95% confidence intervals via the log-transform method. Color-coded cells and full steps.",
      canonicalUrl: "/calculators/math/odds-ratio-relative-risk-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Odds Ratio & Relative Risk Calculator",
          path: "/calculators/math/odds-ratio-relative-risk-calculator",
        },
      ],
      faqs: [
        {
          q: "Should I report odds ratio or relative risk?",
          a: "Match the ratio to the study design. Cohort and randomised studies where you follow exposed and unexposed groups forward in time give you real risks, so report RR. Case-control studies, where you sample by outcome and look back at exposure, do not let you compute risks directly — report OR (which under a rare outcome approximates RR).",
        },
        {
          q: "Why do OR and RR differ so much sometimes?",
          a: "OR and RR are close only when the outcome is rare (roughly under ~10%). As the outcome becomes common, OR moves further from 1 than RR does — a 3× RR can look like a 5× or 10× OR. Reporting OR as if it were RR in a common-outcome study substantially overstates the effect.",
        },
        {
          q: "What does the 95% confidence interval mean?",
          a: "If you repeated the study many times, about 95% of the intervals you compute this way would contain the true population OR (or RR). If the interval crosses 1, the data are consistent with 'no association' at the 5% level, so the point estimate is not statistically significant.",
        },
        {
          q: "What happens if a cell is zero?",
          a: "The plain OR and RR formulas divide by zero when a cell is 0, and the log-CI formula also breaks. The standard fix is the Haldane–Anscombe correction: add 0.5 to every cell before computing. Turn on the correction toggle to apply it; the numbers will differ slightly from the uncorrected version.",
        },
        {
          q: "Are these the exact confidence intervals?",
          a: "No — they use the standard log-transform (Woolf) method, which is the default in most epidemiology textbooks and software because it is simple and accurate for moderate-to-large samples. For very small samples or zero cells, exact methods (mid-p, Fisher's exact) are more accurate; the Haldane correction here gets you close.",
        },
        {
          q: "Does OR > 1 prove the exposure causes the outcome?",
          a: "No. OR and RR measure association, not causation. Confounding variables, selection bias, reverse causation and chance can all produce a ratio above or below 1 without any causal link. Study design and adjustment for confounders — not the ratio itself — decide the causal claim.",
        },
      ],
    }),
  component: OddsRatioPage,
});

/* ---------------- Math ---------------- */

interface CellsInput {
  a: number; b: number; c: number; d: number;
}

interface Result {
  a: number; b: number; c: number; d: number;
  // effective (possibly Haldane-corrected) values
  aE: number; bE: number; cE: number; dE: number;
  corrected: boolean;
  or: number;
  orLower: number;
  orUpper: number;
  orSE: number;      // SE of ln(OR)
  rr: number;
  rrLower: number;
  rrUpper: number;
  rrSE: number;      // SE of ln(RR)
  riskExposed: number;      // a/(a+b)
  riskUnexposed: number;    // c/(c+d)
  oddsExposed: number;      // a/b
  oddsUnexposed: number;    // c/d
  conf: number;
  zStar: number;
}

const Z_TABLE: Record<string, number> = {
  "0.9": 1.645,
  "0.95": 1.96,
  "0.99": 2.576,
};

function computeOR_RR(
  cells: CellsInput,
  conf: number,
  applyCorrection: boolean,
): Result | { error: string } {
  const { a, b, c, d } = cells;
  if (![a, b, c, d].every((v) => Number.isFinite(v) && v >= 0)) {
    return { error: "All four cell counts must be non-negative numbers." };
  }
  if ([a, b, c, d].every((v) => v === 0)) {
    return { error: "All cells are zero — there is nothing to compute." };
  }
  if (a + b === 0 || c + d === 0) {
    return {
      error:
        "One row total is zero (no exposed or no unexposed subjects). Add data before computing the ratio.",
    };
  }

  const anyZero = a === 0 || b === 0 || c === 0 || d === 0;
  if (anyZero && !applyCorrection) {
    return {
      error:
        "One or more cells contain 0, which makes the standard OR / RR formulas divide by zero or their log-based confidence interval undefined. Turn on the 0.5 (Haldane–Anscombe) correction to compute a stable estimate.",
    };
  }

  const aE = applyCorrection ? a + 0.5 : a;
  const bE = applyCorrection ? b + 0.5 : b;
  const cE = applyCorrection ? c + 0.5 : c;
  const dE = applyCorrection ? d + 0.5 : d;

  const or = (aE * dE) / (bE * cE);
  const orSE = Math.sqrt(1 / aE + 1 / bE + 1 / cE + 1 / dE);
  const zStar = Z_TABLE[String(conf)] ?? 1.96;
  const orLower = Math.exp(Math.log(or) - zStar * orSE);
  const orUpper = Math.exp(Math.log(or) + zStar * orSE);

  const riskExposed = aE / (aE + bE);
  const riskUnexposed = cE / (cE + dE);
  const rr = riskExposed / riskUnexposed;
  // SE of ln(RR) = sqrt(1/a - 1/(a+b) + 1/c - 1/(c+d))
  const rrSE = Math.sqrt(
    1 / aE - 1 / (aE + bE) + 1 / cE - 1 / (cE + dE),
  );
  const rrLower = Math.exp(Math.log(rr) - zStar * rrSE);
  const rrUpper = Math.exp(Math.log(rr) + zStar * rrSE);

  return {
    a, b, c, d,
    aE, bE, cE, dE,
    corrected: applyCorrection,
    or, orLower, orUpper, orSE,
    rr, rrLower, rrUpper, rrSE,
    riskExposed, riskUnexposed,
    oddsExposed: aE / bE,
    oddsUnexposed: cE / dE,
    conf,
    zStar,
  };
}

function fmt(x: number, dp = 3): string {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(dp);
}

function pct(x: number, dp = 2): string {
  if (!Number.isFinite(x)) return "—";
  return (x * 100).toFixed(dp) + "%";
}

/* ---------------- Diagram: 2×2 contingency table ---------------- */

function ContingencyDiagram({ res }: { res: Result }) {
  const rowTotalE = res.aE + res.bE;
  const rowTotalU = res.cE + res.dE;
  const colOutcome = res.aE + res.cE;
  const colNoOutcome = res.bE + res.dE;
  const grand = rowTotalE + rowTotalU;

  const cellCls =
    "px-3 py-3 text-center font-serif italic text-base tabular-nums border border-border/60";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="px-2 py-2"></th>
            <th className="border border-border/60 bg-secondary/50 px-3 py-2 font-semibold">Outcome (Yes)</th>
            <th className="border border-border/60 bg-secondary/50 px-3 py-2 font-semibold">Outcome (No)</th>
            <th className="border border-border/60 bg-secondary/30 px-3 py-2 font-semibold">Row total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th className="border border-border/60 bg-secondary/50 px-3 py-2 text-left font-semibold">Exposed</th>
            <td className={cellCls + " bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}>
              <div className="text-[10px] uppercase tracking-wider opacity-70">a</div>
              {fmt(res.aE, res.corrected ? 1 : 0)}
            </td>
            <td className={cellCls + " bg-amber-500/15 text-amber-700 dark:text-amber-300"}>
              <div className="text-[10px] uppercase tracking-wider opacity-70">b</div>
              {fmt(res.bE, res.corrected ? 1 : 0)}
            </td>
            <td className={cellCls + " bg-secondary/30"}>{fmt(rowTotalE, res.corrected ? 1 : 0)}</td>
          </tr>
          <tr>
            <th className="border border-border/60 bg-secondary/50 px-3 py-2 text-left font-semibold">Unexposed</th>
            <td className={cellCls + " bg-rose-500/15 text-rose-700 dark:text-rose-300"}>
              <div className="text-[10px] uppercase tracking-wider opacity-70">c</div>
              {fmt(res.cE, res.corrected ? 1 : 0)}
            </td>
            <td className={cellCls + " bg-sky-500/15 text-sky-700 dark:text-sky-300"}>
              <div className="text-[10px] uppercase tracking-wider opacity-70">d</div>
              {fmt(res.dE, res.corrected ? 1 : 0)}
            </td>
            <td className={cellCls + " bg-secondary/30"}>{fmt(rowTotalU, res.corrected ? 1 : 0)}</td>
          </tr>
          <tr>
            <th className="border border-border/60 bg-secondary/30 px-3 py-2 text-left font-semibold">Column total</th>
            <td className={cellCls + " bg-secondary/30"}>{fmt(colOutcome, res.corrected ? 1 : 0)}</td>
            <td className={cellCls + " bg-secondary/30"}>{fmt(colNoOutcome, res.corrected ? 1 : 0)}</td>
            <td className={cellCls + " bg-secondary/50 font-semibold"}>N = {fmt(grand, res.corrected ? 1 : 0)}</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <span className="inline-block h-3 w-3 rounded bg-emerald-500/40 align-middle" />{" "}
          <strong className="text-foreground">a</strong> — exposed with outcome
        </div>
        <div>
          <span className="inline-block h-3 w-3 rounded bg-amber-500/40 align-middle" />{" "}
          <strong className="text-foreground">b</strong> — exposed without outcome
        </div>
        <div>
          <span className="inline-block h-3 w-3 rounded bg-rose-500/40 align-middle" />{" "}
          <strong className="text-foreground">c</strong> — unexposed with outcome
        </div>
        <div>
          <span className="inline-block h-3 w-3 rounded bg-sky-500/40 align-middle" />{" "}
          <strong className="text-foreground">d</strong> — unexposed without outcome
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

function OddsRatioPage() {
  const [a, setA] = useState("40");
  const [b, setB] = useState("60");
  const [c, setC] = useState("20");
  const [d, setD] = useState("80");
  const [conf, setConf] = useState<number>(0.95);
  const [correction, setCorrection] = useState<boolean>(false);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    const cells = { a: +a, b: +b, c: +c, d: +d };
    const out = computeOR_RR(cells, conf, correction);
    if ("error" in out) {
      setErr(out.error);
      return;
    }
    setResult(out);
  };

  const clear = () => {
    setA(""); setB(""); setC(""); setD("");
    setResult(null);
    setErr(null);
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const r = result;
    const label = r.corrected ? " (with +0.5 correction)" : "";
    const cellLegend = [
      { sym: "a", def: "exposed with outcome" },
      { sym: "b", def: "exposed without outcome" },
      { sym: "c", def: "unexposed with outcome" },
      { sym: "d", def: "unexposed without outcome" },
    ];
    const orLegend = [
      { sym: "OR", def: "odds ratio" },
      { sym: "SE", def: "standard error of ln(OR)" },
      { sym: "z*", def: "critical value for the chosen CI" },
    ];
    const rrLegend = [
      { sym: "RR", def: "relative risk" },
      { sym: "a/(a+b)", def: "risk in the exposed group" },
      { sym: "c/(c+d)", def: "risk in the unexposed group" },
    ];
    return [
      {
        title: "Given" + label,
        body: (
          <FormulaBlock>
            a = {fmt(r.aE, r.corrected ? 1 : 0)}, &nbsp; b = {fmt(r.bE, r.corrected ? 1 : 0)}, &nbsp; c = {fmt(r.cE, r.corrected ? 1 : 0)}, &nbsp; d = {fmt(r.dE, r.corrected ? 1 : 0)}
          </FormulaBlock>
        ),
      },
      {
        title: "Formula — Odds Ratio",
        body: <FormulaWithLegend formula={<>OR = (a · d) / (b · c)</>} legend={cellLegend} />,
      },
      {
        title: "Substitute — OR",
        body: (
          <FormulaBlock>
            OR = ({fmt(r.aE, 2)} × {fmt(r.dE, 2)}) / ({fmt(r.bE, 2)} × {fmt(r.cE, 2)}) = {fmt(r.aE * r.dE, 2)} / {fmt(r.bE * r.cE, 2)}
          </FormulaBlock>
        ),
      },
      { title: "Answer — OR", body: <FormulaBlock>OR = {fmt(r.or, 3)}</FormulaBlock> },
      {
        title: `Formula — ${Math.round(r.conf * 100)}% CI for OR`,
        body: <FormulaWithLegend formula={<>CI = exp( ln(OR) ± z* · SE ), &nbsp; SE = √(1/a + 1/b + 1/c + 1/d)</>} legend={orLegend} />,
      },
      {
        title: "Substitute — CI for OR",
        body: (
          <FormulaBlock>
            SE = √({fmt(1 / r.aE, 4)} + {fmt(1 / r.bE, 4)} + {fmt(1 / r.cE, 4)} + {fmt(1 / r.dE, 4)}) = {fmt(r.orSE, 4)}<br />
            CI = exp({fmt(Math.log(r.or), 3)} ± {fmt(r.zStar * r.orSE, 3)})
          </FormulaBlock>
        ),
      },
      { title: "Answer — CI for OR", body: <FormulaBlock>[{fmt(r.orLower, 3)}, {fmt(r.orUpper, 3)}]</FormulaBlock> },
      {
        title: "Formula — Relative Risk",
        body: <FormulaWithLegend formula={<>RR = [a / (a + b)] / [c / (c + d)]</>} legend={rrLegend} />,
      },
      {
        title: "Substitute — RR",
        body: (
          <FormulaBlock>
            Risk exposed = {fmt(r.aE, 2)} / {fmt(r.aE + r.bE, 2)} = {pct(r.riskExposed, 3)}<br />
            Risk unexposed = {fmt(r.cE, 2)} / {fmt(r.cE + r.dE, 2)} = {pct(r.riskUnexposed, 3)}
          </FormulaBlock>
        ),
      },
      { title: "Answer — RR", body: <FormulaBlock>RR = {fmt(r.rr, 3)}</FormulaBlock> },
      {
        title: `Formula — ${Math.round(r.conf * 100)}% CI for RR`,
        body: <FormulaWithLegend formula={<>CI = exp( ln(RR) ± z* · SE ), &nbsp; SE = √(1/a − 1/(a+b) + 1/c − 1/(c+d))</>} legend={rrLegend} />,
      },
      {
        title: "Substitute — CI for RR",
        body: (
          <FormulaBlock>
            SE = {fmt(r.rrSE, 4)}; &nbsp; ln(RR) = {fmt(Math.log(r.rr), 4)}<br />
            CI = exp({fmt(Math.log(r.rr), 3)} ± {fmt(r.zStar * r.rrSE, 3)})
          </FormulaBlock>
        ),
      },
      { title: "Answer — CI for RR", body: <FormulaBlock>[{fmt(r.rrLower, 3)}, {fmt(r.rrUpper, 3)}]</FormulaBlock> },
      {
        title: "Interpretation",
        body: (
          <p>
            {r.orLower > 1 || r.orUpper < 1
              ? `The ${Math.round(r.conf * 100)}% CI for OR does not cross 1 — the association is statistically significant at this level.`
              : `The ${Math.round(r.conf * 100)}% CI for OR crosses 1 — the association is not statistically significant at this level.`}
            {" "}
            {r.rrLower > 1 || r.rrUpper < 1
              ? `The CI for RR also excludes 1.`
              : `The CI for RR includes 1.`}
          </p>
        ),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    const pctConf = Math.round(result.conf * 100);
    return [
      `2×2 contingency table${result.corrected ? " (+0.5 Haldane–Anscombe correction)" : ""}`,
      `  Exposed:   a=${result.aE}  b=${result.bE}`,
      `  Unexposed: c=${result.cE}  d=${result.dE}`,
      `Odds Ratio (OR) = ${fmt(result.or, 3)}  · ${pctConf}% CI [${fmt(result.orLower, 3)}, ${fmt(result.orUpper, 3)}]`,
      `Relative Risk (RR) = ${fmt(result.rr, 3)}  · ${pctConf}% CI [${fmt(result.rrLower, 3)}, ${fmt(result.rrUpper, 3)}]`,
      `Risk in exposed  = ${pct(result.riskExposed, 3)}`,
      `Risk in unexposed= ${pct(result.riskUnexposed, 3)}`,
    ].join("\n");
  }, [result]);

  const cellInputCls =
    "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <MathCalcPage
      name="Odds Ratio & Relative Risk Calculator"
      tagline="Enter a 2×2 contingency table (Exposed/Unexposed × Outcome/No Outcome). Reports the Odds Ratio and Relative Risk with 95% confidence intervals from the log-transform method, plus a color-coded table and full step-by-step working."
      extras={
        <>
          <CalcSection title="Odds Ratio & Relative Risk explained, step by step">
            <p>
              Both ratios compare an outcome between exposed and unexposed
              groups, both equal 1 when there is no association — but they
              answer different questions and belong to different study designs.
              Each card below covers one piece the calculator uses.
            </p>
            <GuideCards items={ORR_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Standard epidemiological 2×2 layout — Exposed / Unexposed rows, Outcome / No Outcome columns, with row and column totals shown automatically",
                "Both OR and RR reported side by side, so you can compare them and decide which fits your study design",
                "95% confidence intervals for both ratios via the log-transform (Woolf) method — the default in most textbooks and software",
                "Selectable 90%, 95% or 99% confidence level, with the matching z* (1.645 / 1.96 / 2.576)",
                "Color-coded a/b/c/d cells that match every formula in the working — so you can see exactly which cell is being used where",
                "Haldane–Anscombe (+0.5) correction toggle for tables with a zero cell, and a clear message when a zero cell would otherwise blow up the math",
                "Show/hide step-by-step working: cell identification, OR and RR formulas, log-CI derivation, and interval interpretation",
                "Copy the result summary or download the whole panel as an image",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "Which is easier to interpret in plain English?", a: <p>RR is easier — "3× more likely" reads directly as a risk multiplier. OR is a ratio of odds, not risks, and non-statisticians frequently mis-read it as if it were an RR.</p> },
                { q: "Do I need a hypothesis test in addition to the CI?", a: <p>Not usually. A 95% CI that excludes 1 is equivalent to rejecting the null hypothesis of "no association" at the 5% level (two-tailed). The CI carries more information because it also shows the size and precision of the effect.</p> },
                { q: "What about very small samples?", a: <p>The log-CI method assumes moderate-to-large counts. For very small samples or zero cells, prefer exact methods (Fisher's exact test, mid-p intervals). The Haldane–Anscombe correction here is a reasonable pragmatic fix but not a substitute for exact inference.</p> },
                { q: "Can I compute the risk difference too?", a: <p>Yes — Risk Difference = risk_exposed − risk_unexposed. It's a useful absolute measure alongside the ratios, especially for public-health decisions where absolute impact matters more than relative multiplier.</p> },
                { q: "Why 1.96 and not 2?", a: <p>1.96 is the two-tailed z* for 95% confidence under the standard normal distribution (the 97.5th percentile). "2" is a common back-of-envelope rounding that gives you a ~95.4% interval instead of 95.0%.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/chi-square-calculator", label: "Chi-Square Calculator" },
                { to: "/calculators/math/p-value-calculator", label: "P-Value Calculator" },
                { to: "/calculators/math/confidence-interval-calculator", label: "Confidence Interval Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-sm font-semibold text-foreground">
            2×2 contingency table
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-2"></th>
                  <th className="border border-border/60 bg-secondary/50 px-3 py-2 font-semibold">Outcome (Yes)</th>
                  <th className="border border-border/60 bg-secondary/50 px-3 py-2 font-semibold">Outcome (No)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="border border-border/60 bg-secondary/50 px-3 py-2 text-left font-semibold">Exposed</th>
                  <td className="border border-border/60 bg-emerald-500/10 p-2">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">a</div>
                    <input type="number" min="0" step="1" value={a} onChange={(e) => setA(e.target.value)} className={cellInputCls} />
                  </td>
                  <td className="border border-border/60 bg-amber-500/10 p-2">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300">b</div>
                    <input type="number" min="0" step="1" value={b} onChange={(e) => setB(e.target.value)} className={cellInputCls} />
                  </td>
                </tr>
                <tr>
                  <th className="border border-border/60 bg-secondary/50 px-3 py-2 text-left font-semibold">Unexposed</th>
                  <td className="border border-border/60 bg-rose-500/10 p-2">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-rose-700 dark:text-rose-300">c</div>
                    <input type="number" min="0" step="1" value={c} onChange={(e) => setC(e.target.value)} className={cellInputCls} />
                  </td>
                  <td className="border border-border/60 bg-sky-500/10 p-2">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-sky-700 dark:text-sky-300">d</div>
                    <input type="number" min="0" step="1" value={d} onChange={(e) => setD(e.target.value)} className={cellInputCls} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Confidence level" htmlFor="conf" hint="Sets the z* used in the log-CI (1.645 / 1.96 / 2.576).">
            <select
              id="conf"
              value={conf}
              onChange={(e) => setConf(parseFloat(e.target.value))}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value={0.9}>90% (z* = 1.645)</option>
              <option value={0.95}>95% (z* = 1.96) — standard</option>
              <option value={0.99}>99% (z* = 2.576)</option>
            </select>
          </Field>
          <Field label="Zero-cell handling" hint="Adds 0.5 to every cell — required when any cell is 0.">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2.5">
              <input
                type="checkbox"
                checked={correction}
                onChange={(e) => setCorrection(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">Apply +0.5 (Haldane–Anscombe) correction</span>
            </label>
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={compute}>Compute OR and RR</PrimaryButton>
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
            filename="odds-ratio-relative-risk"
            captureRef={resultRef}
            getCopyText={() => summary}
          />
          <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <ResultBox
                label="Odds Ratio (OR)"
                value={fmt(result.or, 3)}
                note={
                  <>
                    {Math.round(result.conf * 100)}% CI: [{fmt(result.orLower, 3)}, {fmt(result.orUpper, 3)}]
                    {result.orLower > 1 || result.orUpper < 1 ? " · significant" : " · not significant"}
                  </>
                }
              />
              <ResultBox
                label="Relative Risk (RR)"
                value={fmt(result.rr, 3)}
                note={
                  <>
                    {Math.round(result.conf * 100)}% CI: [{fmt(result.rrLower, 3)}, {fmt(result.rrUpper, 3)}]
                    {result.rrLower > 1 || result.rrUpper < 1 ? " · significant" : " · not significant"}
                  </>
                }
              />
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-3 text-sm font-semibold text-foreground">
                2×2 table {result.corrected && <span className="text-xs font-normal text-muted-foreground">(with +0.5 correction)</span>}
              </div>
              <ContingencyDiagram res={result} />
              <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div>Risk in exposed = a/(a+b) = <strong className="text-foreground">{pct(result.riskExposed, 3)}</strong></div>
                <div>Risk in unexposed = c/(c+d) = <strong className="text-foreground">{pct(result.riskUnexposed, 3)}</strong></div>
                <div>Odds in exposed = a/b = <strong className="text-foreground">{fmt(result.oddsExposed, 3)}</strong></div>
                <div>Odds in unexposed = c/d = <strong className="text-foreground">{fmt(result.oddsUnexposed, 3)}</strong></div>
              </div>
            </div>

            <SolutionSteps steps={steps} />
          </div>
        </div>
      )}
    </MathCalcPage>
  );
}
