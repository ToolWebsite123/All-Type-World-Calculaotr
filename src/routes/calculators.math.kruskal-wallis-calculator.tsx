import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  FormulaBlock,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import type { ReactNode } from "react";
import { parseDataset } from "@/lib/math/parse-numbers";
import { chiSquareCDF, fmt, fmtP } from "@/lib/math/p-value";

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

const FAQS = [
  {
    q: "What is the Kruskal-Wallis test?",
    a: "A non-parametric alternative to one-way ANOVA. It compares 3 or more independent groups by pooling all values, assigning ranks 1..N (average ranks for ties) and asking whether the average ranks differ more than chance would predict.",
  },
  {
    q: "When should I use Kruskal-Wallis instead of ANOVA?",
    a: "Use it when the data are ordinal, clearly non-normal, or have strong outliers; or when at least one group is small so normality can't be checked. Because it only uses ranks it is robust to skew and outliers. If normality plus equal variances hold, ANOVA is more powerful.",
  },
  {
    q: "How is the H statistic computed?",
    a: "H = 12/(N(N+1)) · Σ Rᵢ²/nᵢ − 3(N+1), where Rᵢ is the sum of ranks in group i, nᵢ is that group's size and N = Σnᵢ. With ties, H is divided by 1 − Σ(t³ − t)/(N³ − N) so the test isn't too conservative.",
  },
  {
    q: "What distribution gives the p-value?",
    a: "Under H₀, H is approximately chi-square with k − 1 degrees of freedom, where k is the number of groups. This calculator reports the exact chi-square p-value from that approximation; for very small samples an exact permutation test is a little more accurate.",
  },
  {
    q: "What does a significant result mean?",
    a: "It says the k groups do not all come from the same distribution — but it doesn't tell you which pairs differ. Follow up with Dunn's test or pairwise Mann-Whitney tests with a Bonferroni or Holm correction.",
  },
];

export const Route = createFileRoute("/calculators/math/kruskal-wallis-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Kruskal-Wallis Test Calculator",
      title: "Kruskal-Wallis Test Calculator",
      metaDescription:
        "Non-parametric one-way ANOVA on 3+ independent groups — ranks, H statistic with tie correction, df and exact chi-square p-value.",
      canonicalUrl: "/calculators/math/kruskal-wallis-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Kruskal-Wallis Test Calculator", path: "/calculators/math/kruskal-wallis-calculator" },
      ],
      faqs: FAQS,
    }),
  component: KruskalWallisPage,
});

interface Ranked {
  value: number;
  group: number;
  rank: number;
}

interface KWResult {
  k: number;
  N: number;
  ns: number[];
  Rs: number[];
  H: number;
  Hcorrected: number;
  tieCorrection: number;
  tieGroups: number[];
  df: number;
  p: number;
  ranked: Ranked[];
}

function rankPool(groups: number[][]): { ranked: Ranked[]; tieGroups: number[] } {
  const combined: { value: number; group: number }[] = [];
  groups.forEach((g, i) =>
    g.forEach((v) => combined.push({ value: v, group: i })),
  );
  combined.sort((a, b) => a.value - b.value);
  const ranked: Ranked[] = combined.map((c) => ({ value: c.value, group: c.group, rank: 0 }));
  const tieGroups: number[] = [];
  let i = 0;
  while (i < ranked.length) {
    let j = i;
    while (j + 1 < ranked.length && ranked[j + 1].value === ranked[i].value) j++;
    const size = j - i + 1;
    const avg = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) ranked[k].rank = avg;
    if (size >= 2) tieGroups.push(size);
    i = j + 1;
  }
  return { ranked, tieGroups };
}

function kruskalWallis(groups: number[][]): KWResult {
  const k = groups.length;
  const ns = groups.map((g) => g.length);
  const N = ns.reduce((s, n) => s + n, 0);
  const { ranked, tieGroups } = rankPool(groups);
  const Rs = new Array(k).fill(0);
  for (const r of ranked) Rs[r.group] += r.rank;
  const sumRR = Rs.reduce((s, R, i) => s + (R * R) / ns[i], 0);
  const H = (12 / (N * (N + 1))) * sumRR - 3 * (N + 1);
  const tieSum = tieGroups.reduce((s, t) => s + (t ** 3 - t), 0);
  const denom = N ** 3 - N;
  const tieCorrection = denom > 0 ? 1 - tieSum / denom : 1;
  const Hcorrected = tieCorrection > 0 ? H / tieCorrection : H;
  const df = k - 1;
  const p = df > 0 ? 1 - chiSquareCDF(Hcorrected, df) : 1;
  return { k, N, ns, Rs, H, Hcorrected, tieCorrection, tieGroups, df, p, ranked };
}

function KruskalWallisPage() {
  const [rawLines, setRawLines] = useState<string[]>([
    "23, 41, 30, 27, 32",
    "37, 45, 39, 42, 38",
    "29, 33, 25, 31, 28",
  ]);
  const [alpha, setAlpha] = useState(0.05);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KWResult | null>(null);

  const updateLine = (i: number, v: string) => {
    setRawLines((prev) => prev.map((row, idx) => (idx === i ? v : row)));
  };
  const addGroup = () => setRawLines((prev) => [...prev, ""]);
  const removeGroup = (i: number) =>
    setRawLines((prev) => (prev.length > 3 ? prev.filter((_, idx) => idx !== i) : prev));

  const onCompute = () => {
    setError(null);
    setResult(null);
    if (rawLines.length < 3) {
      setError("Kruskal-Wallis requires at least 3 groups. Add another group.");
      return;
    }
    const groups: number[][] = [];
    for (let i = 0; i < rawLines.length; i++) {
      const parsed = parseDataset(rawLines[i]);
      if (!parsed.values || parsed.values.length < 2) {
        setError(`Group ${i + 1} needs at least 2 numeric values.`);
        return;
      }
      groups.push(parsed.values);
    }
    setResult(kruskalWallis(groups));
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const sumRR = result.Rs.reduce((s, R, i) => s + (R * R) / result.ns[i], 0);
    return [
      {
        title: "Pool and rank all observations",
        body: (
          <>
            <MathNote>
              Combine all N = {result.N} observations across {result.k} groups into one list, sort
              them, and assign ranks 1..{result.N}. Tied values share their average rank.
            </MathNote>
            <MathLine>N = Σ nⱼ = {result.ns.join(" + ")} = {result.N}</MathLine>
          </>
        ),
      },
      {
        title: "Rank sums and sample sizes by group",
        body: (
          <>
            <MathNote>Sum the ranks within each group to get Rⱼ, with sample size nⱼ</MathNote>
            {result.Rs.map((R, i) => (
              <MathLine key={i}>
                R{i + 1} = {fmt(R)}, n{i + 1} = {result.ns[i]}
              </MathLine>
            ))}
          </>
        ),
      },
      {
        title: "Compute the H statistic",
        body: (
          <>
            <MathNote>Formula for the Kruskal-Wallis H statistic</MathNote>
            <MathLine>H = 12 / (N(N+1)) · Σ (Rⱼ² / nⱼ) − 3(N + 1)</MathLine>
            <MathLine>Σ (Rⱼ² / nⱼ) = {fmt(sumRR)}</MathLine>
            <MathLine>
              H = 12 / ({result.N}·{result.N + 1}) · {fmt(sumRR)} − 3·{result.N + 1}
            </MathLine>
            <MathLine>H = {fmt(result.H)}</MathLine>
          </>
        ),
      },
      {
        title: "Apply the tie correction",
        body:
          result.tieGroups.length === 0 ? (
            <>
              <MathNote>No tied values were found, so the correction factor is 1</MathNote>
              <MathLine>H_corrected = H = {fmt(result.Hcorrected)}</MathLine>
            </>
          ) : (
            <>
              <MathNote>Tie group sizes: {result.tieGroups.join(", ")}</MathNote>
              <MathLine>C = 1 − Σ(t³ − t) / (N³ − N) = {fmt(result.tieCorrection)}</MathLine>
              <MathLine>
                H_corrected = H / C = {fmt(result.H)} / {fmt(result.tieCorrection)} = {fmt(result.Hcorrected)}
              </MathLine>
            </>
          ),
      },
      {
        title: "Degrees of freedom, p-value and decision",
        body: (
          <>
            <MathNote>
              Under H₀, H is approximately chi-square distributed with df = k − 1
            </MathNote>
            <MathLine>df = k − 1 = {result.k} − 1 = {result.df}</MathLine>
            <MathLine>p = 1 − F(H_corrected; df) = {fmtP(result.p)}</MathLine>
            <MathNote>
              At α = {alpha}:{" "}
              {result.p < alpha
                ? "reject H₀ — at least one group differs."
                : "fail to reject H₀ — no significant difference detected."}
            </MathNote>
          </>
        ),
      },
    ];
  }, [result, alpha]);

  return (
    <MathCalcPage
      name="Kruskal-Wallis Test Calculator"
      tagline="Non-parametric one-way ANOVA on 3+ independent groups. Reports ranks, H (with tie correction), df and an exact chi-square p-value."
      extras={
        <>
          <CalcSection title="What is the Kruskal-Wallis test?">
            <p>
              The Kruskal-Wallis H test is the rank-based counterpart of one-way ANOVA. It asks whether
              three or more independent samples come from the same distribution. Because it works on
              ranks rather than raw values it doesn't require normality and stays reliable when your
              data are ordinal, skewed or contain outliers.
            </p>
            <FormulaBlock>
              H = 12 / (N(N + 1)) · Σ Rᵢ² / nᵢ − 3(N + 1),{" "}
              df = k − 1
            </FormulaBlock>
            <p>
              Under the null hypothesis H is approximately chi-square with k − 1 degrees of freedom.
              When ties are present, H is divided by 1 − Σ(t³ − t)/(N³ − N) so the p-value stays
              accurate.
            </p>
          </CalcSection>

          <CalcSection title="Features of this calculator"><FeatureList items={[
              "Handles any number of groups (k ≥ 3) with unequal group sizes",
              "Average-rank method for ties, plus explicit tie correction to H",
              "Exact chi-square p-value from the k − 1 df approximation",
              "Editable α with automatic reject / fail-to-reject verdict",
              "Full step-by-step working (Given → Formula → Substitute → Answer)",
              "Per-group rank sums and full pooled ranking table on demand",
            ]} /></CalcSection>

          <CalcFAQ items={FAQS} />
          <CalcSection title="Related statistics calculators"><RelatedLinks links={[
              { label: "ANOVA Calculator", to: "/calculators/math/anova-calculator" },
              { label: "Mann-Whitney U Test", to: "/calculators/math/mann-whitney-calculator" },
              { label: "Wilcoxon Signed-Rank", to: "/calculators/math/wilcoxon-calculator" },
              { label: "Chi-Square Calculator", to: "/calculators/math/chi-square-calculator" },
              { label: "Cohen's d / Effect Size", to: "/calculators/math/effect-size-calculator" },
            ]} /></CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        {rawLines.map((line, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <Field label={`Group ${i + 1}`}>
                <input
                  type="text"
                  value={line}
                  onChange={(e) => updateLine(i, e.target.value)}
                  placeholder="e.g. 23, 41, 30, 27, 32"
                  className="h-10 w-full rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
            </div>
            {rawLines.length > 3 && (
              <button
                type="button"
                onClick={() => removeGroup(i)}
                className="mt-6 rounded-full border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Remove group ${i + 1}`}
              >
                Remove
              </button>
            )}
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addGroup}
            className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            + Add group
          </button>
          <Field label="α (significance)">
            <select
              value={alpha}
              onChange={(e) => setAlpha(Number(e.target.value))}
              className="h-10 rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value={0.1}>0.10</option>
              <option value={0.05}>0.05</option>
              <option value={0.01}>0.01</option>
            </select>
          </Field>
        </div>

        <PrimaryButton onClick={onCompute}>Run Kruskal-Wallis test</PrimaryButton>
        {error && <ErrorBox message={error} />}

        {result && (
          <div className="mt-4 space-y-4 rounded-2xl border border-border bg-secondary/20 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="H" value={fmt(result.H)} />
              <Stat label="H (tie-corrected)" value={fmt(result.Hcorrected)} />
              <Stat label="df" value={String(result.df)} />
              <Stat label="p-value" value={fmtP(result.p)} />
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-3 text-sm">
              <div className="mb-2 font-medium text-foreground">Rank sums by group</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-3">Group</th>
                      <th className="py-1 pr-3">n</th>
                      <th className="py-1 pr-3">Rank sum</th>
                      <th className="py-1 pr-3">Mean rank</th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground">
                    {result.Rs.map((R, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="py-1 pr-3">Group {i + 1}</td>
                        <td className="py-1 pr-3 tabular-nums">{result.ns[i]}</td>
                        <td className="py-1 pr-3 tabular-nums">{fmt(R)}</td>
                        <td className="py-1 pr-3 tabular-nums">{fmt(R / result.ns[i])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div
              className={`rounded-xl border p-3 text-sm ${
                result.p < alpha
                  ? "border-primary/40 bg-primary/[0.08] text-primary"
                  : "border-border bg-background/40 text-muted-foreground"
              }`}
            >
              {result.p < alpha
                ? `At α = ${alpha}, reject H₀. At least one group's distribution differs from the others (p = ${fmtP(result.p)}).`
                : `At α = ${alpha}, fail to reject H₀. No significant difference between groups (p = ${fmtP(result.p)}).`}
            </div>
            <StepsToggle steps={steps} />
          </div>
        )}
      </div>
    </MathCalcPage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif italic text-lg tabular-nums text-foreground">{value}</div>
    </div>
  );
}
