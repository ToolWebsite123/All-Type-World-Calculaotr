import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
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
import type { Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import type { ReactNode } from "react";
import { fCDF, fPDF, fInv, fmt, fmtP } from "@/lib/math/p-value";
import { parseDataset, cleanedNote } from "@/lib/math/parse-numbers";

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

/* ============================================================
   F-distribution diagram — shaded p-value tail + critical line
   ============================================================ */
function FDistDiagram({
  F,
  df1,
  df2,
  crit,
}: {
  F: number;
  df1: number;
  df2: number;
  crit: number;
}) {
  const W = 560;
  const H = 200;
  const pad = 30;
  const xMin = 0;
  // Sensible right-edge: cover the observed F, the critical value, and a
  // stretch beyond the distribution's bulk.
  const xMax = Math.max(F * 1.25 + 1, crit * 1.3 + 1, 5);

  const N = 260;
  const pts: [number, number][] = [];
  let maxY = 0;
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = fPDF(x, df1, df2);
    if (Number.isFinite(y) && y > maxY) maxY = y;
    pts.push([x, Number.isFinite(y) ? y : 0]);
  }
  if (maxY <= 0) maxY = 1;
  const px = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
  const py = (y: number) => H - pad - (y / maxY) * (H - 2 * pad);
  const curve =
    "M " + pts.map(([x, y]) => `${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" L ");

  const shadeFrom = F;
  const filt = pts.filter(([x]) => x >= shadeFrom);
  const shade =
    filt.length >= 2
      ? `M ${px(filt[0][0]).toFixed(1)},${py(0).toFixed(1)} ` +
        filt.map(([x, y]) => `L ${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" ") +
        ` L ${px(filt[filt.length - 1][0]).toFixed(1)},${py(0).toFixed(1)} Z`
      : "";

  const Fclamp = Math.max(xMin, Math.min(xMax, F));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="F distribution with shaded p-value area and critical value marked"
    >
      <line
        x1={pad}
        y1={H - pad}
        x2={W - pad}
        y2={H - pad}
        className="stroke-muted-foreground/40"
        strokeWidth={1}
      />
      {shade && <path d={shade} className="fill-destructive/30" />}
      <path d={curve} className="fill-none stroke-primary" strokeWidth={2} />
      {crit >= xMin && crit <= xMax && (
        <g>
          <line
            x1={px(crit)}
            y1={pad}
            x2={px(crit)}
            y2={H - pad}
            className="stroke-muted-foreground/60"
            strokeDasharray="4 3"
          />
          <text
            x={px(crit)}
            y={H - pad + 14}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            crit {fmt(crit, 3)}
          </text>
        </g>
      )}
      <line
        x1={px(Fclamp)}
        y1={pad - 6}
        x2={px(Fclamp)}
        y2={H - pad}
        className="stroke-foreground"
        strokeWidth={1.5}
      />
      <circle
        cx={px(Fclamp)}
        cy={py(fPDF(Fclamp, df1, df2))}
        r={4}
        className="fill-foreground"
      />
      <text
        x={px(Fclamp)}
        y={pad - 10}
        textAnchor="middle"
        className="fill-foreground text-[11px] font-medium"
      >
        F = {fmt(F, 3)}
      </text>
      <text
        x={W - pad}
        y={H - 4}
        textAnchor="end"
        className="fill-muted-foreground text-[10px]"
      >
        shaded area = p-value · F({df1}, {df2})
      </text>
    </svg>
  );
}

export const Route = createFileRoute("/calculators/math/anova-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "ANOVA Calculator",
      title: "ANOVA Calculator — One-Way Analysis of Variance",
      metaDescription:
        "Run one-way ANOVA on any number of groups: SS between, SS within, MS, F-statistic, df, and p-value.",
      canonicalUrl: "/calculators/math/anova-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "ANOVA Calculator", path: "/calculators/math/anova-calculator" },
      ],
      faqs: [
        {
          q: "When should I use one-way ANOVA?",
          a: "Use one-way ANOVA when you want to compare the means of three or more independent groups on a single numeric outcome — for example, comparing average test scores across three teaching methods. With only two groups, use an independent-samples t-test instead.",
        },
        {
          q: "Why not just run multiple t-tests?",
          a: "Every t-test carries a false-positive risk of α (typically 5%). Running many pairwise tests inflates the overall chance of at least one false positive fast — with 3 groups you already have 3 comparisons, with 5 groups you have 10. ANOVA controls the family-wise error rate by testing all means simultaneously with a single F test.",
        },
        {
          q: "What does a significant F tell me?",
          a: "That at least one group mean differs from at least one other — somewhere. It does not tell you which pair(s) of groups differ. To identify the specific differences you need a post-hoc test such as Tukey's HSD, Bonferroni, or Scheffé.",
        },
        {
          q: "What are the assumptions of one-way ANOVA?",
          a: "Independent observations, approximately normally distributed residuals within each group, and roughly equal variances across groups (homogeneity of variance). With clearly unequal variances, use Welch's ANOVA. With small samples and skewed data, consider the non-parametric Kruskal–Wallis test.",
        },
        {
          q: "How are the degrees of freedom calculated?",
          a: "df between groups = k − 1, where k is the number of groups. df within groups = N − k, where N is the total number of observations. df total = N − 1 = (k − 1) + (N − k).",
        },
        {
          q: "What is the difference between one-way and two-way ANOVA?",
          a: "One-way ANOVA tests the effect of a single categorical factor on a numeric outcome. Two-way ANOVA tests two factors at once and their interaction (e.g. teaching method × school type). This calculator covers the one-way case, which is by far the most common.",
        },
      ],
    }),
  component: AnovaPage,
});

/* ============================================================
   Group state and calculation core
   ============================================================ */

interface Group {
  label: string;
  raw: string;
}

interface GroupStats {
  label: string;
  n: number;
  mean: number;
  sumSq: number; // Σ(x − mean_i)² within this group
  values: number[];
}

interface AnovaResult {
  groups: GroupStats[];
  N: number;
  k: number;
  grandMean: number;
  ssBetween: number;
  ssWithin: number;
  ssTotal: number;
  dfBetween: number;
  dfWithin: number;
  dfTotal: number;
  msBetween: number;
  msWithin: number;
  F: number;
  p: number;
  crit: number;
  alpha: number;
  cleaned: number;
  invalid: string[];
}

function AnovaPage() {
  return (
    <MathCalcPage
      name="ANOVA Calculator"
      tagline="One-way analysis of variance on 3 or more groups — with the full ANOVA summary table, exact F-distribution p-value, critical value, a shaded F-curve diagram and a plain-language significance verdict."
      extras={<Extras />}
    >
      <OneWayAnovaTool />
    </MathCalcPage>
  );
}

/* ============================================================
   Stat card
   ============================================================ */

function Stat({
  label,
  value,
  big,
  tone,
}: {
  label: string;
  value: string;
  big?: boolean;
  tone?: "good" | "muted";
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={
          (big ? "text-2xl " : "text-lg ") +
          "font-semibold " +
          (tone === "good"
            ? "text-primary"
            : tone === "muted"
              ? "text-muted-foreground"
              : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   Main tool — one-way ANOVA
   ============================================================ */

function OneWayAnovaTool() {
  const [groups, setGroups] = useState<Group[]>([
    { label: "Method A", raw: "5, 7, 6, 8, 4" },
    { label: "Method B", raw: "9, 11, 8, 10, 7" },
    { label: "Method C", raw: "12, 10, 13, 11, 14" },
  ]);
  const [alpha, setAlpha] = useState("0.05");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<AnovaResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  function addGroup() {
    setGroups((g) => [
      ...g,
      { label: `Group ${String.fromCharCode(65 + g.length)}`, raw: "" },
    ]);
  }
  function removeGroup(i: number) {
    setGroups((g) => (g.length > 3 ? g.filter((_, idx) => idx !== i) : g));
  }
  function updateGroup(i: number, key: keyof Group, v: string) {
    setGroups((g) => g.map((row, idx) => (idx === i ? { ...row, [key]: v } : row)));
  }

  function run() {
    setErr(null);
    setRes(null);
    const a = Number(alpha);
    if (!Number.isFinite(a) || a <= 0 || a >= 1)
      return setErr("Significance level α must be between 0 and 1 (e.g. 0.05).");
    if (groups.length < 3) return setErr("ANOVA needs at least 3 groups.");

    const parsedGroups: GroupStats[] = [];
    let cleaned = 0;
    const invalid: string[] = [];
    for (let i = 0; i < groups.length; i++) {
      const p = parseDataset(groups[i].raw);
      cleaned += p.cleaned;
      invalid.push(...p.invalid);
      if (p.values.length < 2)
        return setErr(
          `Group "${groups[i].label || `#${i + 1}`}" needs at least 2 numeric values.`,
        );
      const n = p.values.length;
      const mean = p.values.reduce((s, x) => s + x, 0) / n;
      const sumSq = p.values.reduce((s, x) => s + (x - mean) ** 2, 0);
      parsedGroups.push({
        label: groups[i].label || `Group ${i + 1}`,
        n,
        mean,
        sumSq,
        values: p.values,
      });
    }

    const N = parsedGroups.reduce((s, g) => s + g.n, 0);
    const k = parsedGroups.length;
    const grandMean =
      parsedGroups.reduce((s, g) => s + g.mean * g.n, 0) / N;

    const ssBetween = parsedGroups.reduce(
      (s, g) => s + g.n * (g.mean - grandMean) ** 2,
      0,
    );
    const ssWithin = parsedGroups.reduce((s, g) => s + g.sumSq, 0);
    const ssTotal = ssBetween + ssWithin;

    const dfBetween = k - 1;
    const dfWithin = N - k;
    const dfTotal = N - 1;

    if (dfWithin <= 0)
      return setErr("Need more observations than groups (df within must be ≥ 1).");

    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;
    const F = msWithin === 0 ? Infinity : msBetween / msWithin;
    const p = Number.isFinite(F) ? 1 - fCDF(F, dfBetween, dfWithin) : 0;
    const crit = fInv(1 - a, dfBetween, dfWithin);

    setRes({
      groups: parsedGroups,
      N,
      k,
      grandMean,
      ssBetween,
      ssWithin,
      ssTotal,
      dfBetween,
      dfWithin,
      dfTotal,
      msBetween,
      msWithin,
      F,
      p,
      crit,
      alpha: a,
      cleaned,
      invalid,
    });
  }

  const summary = useMemo(() => {
    if (!res) return "";
    const lines = [
      `One-way ANOVA (k=${res.k} groups, N=${res.N})`,
      `Grand mean = ${fmt(res.grandMean, 4)}`,
      `SS Between = ${fmt(res.ssBetween, 4)}, df = ${res.dfBetween}, MS = ${fmt(res.msBetween, 4)}`,
      `SS Within  = ${fmt(res.ssWithin, 4)}, df = ${res.dfWithin}, MS = ${fmt(res.msWithin, 4)}`,
      `SS Total   = ${fmt(res.ssTotal, 4)}, df = ${res.dfTotal}`,
      `F = ${fmt(res.F, 4)}   p = ${fmtP(res.p)}   critical F(α=${res.alpha}) = ${fmt(res.crit, 4)}`,
      res.p <= res.alpha
        ? `Decision: reject H₀ at α = ${res.alpha}.`
        : `Decision: fail to reject H₀ at α = ${res.alpha}.`,
    ];
    return lines.join("\n");
  }, [res]);

  const steps: Step[] = useMemo(() => {
    if (!res) return [];
    const r = res;
    return [
      {
        title: "Group means and grand mean",
        body: (
          <>
            <MathNote>Mean of each group, then the overall (grand) mean weighted by group size</MathNote>
            {r.groups.map((g, i) => (
              <MathLine key={i}>x̄<sub>{i + 1}</sub> ({g.label}) = {fmt(g.mean, 4)}, n = {g.n}</MathLine>
            ))}
            <MathLine>x̄ = (Σ nᵢ x̄ᵢ) / N</MathLine>
            <MathLine>x̄ = {r.groups.map((g) => `${g.n}×${fmt(g.mean, 4)}`).join(" + ")} / {r.N}</MathLine>
            <MathLine>x̄ = {fmt(r.grandMean, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "SS between groups",
        body: (
          <>
            <MathNote>Each group's squared deviation from the grand mean, weighted by its size</MathNote>
            <MathLine>SSB = Σ nᵢ (x̄ᵢ − x̄)²</MathLine>
            {r.groups.map((g, i) => (
              <MathLine key={i}>{g.n} × ({fmt(g.mean, 4)} − {fmt(r.grandMean, 4)})² = {fmt(g.n * (g.mean - r.grandMean) ** 2, 4)}</MathLine>
            ))}
            <MathLine>SSB = {fmt(r.ssBetween, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "SS within groups",
        body: (
          <>
            <MathNote>Sum of each group's own sum of squared deviations from its group mean</MathNote>
            <MathLine>SSW = Σ Σ (xᵢⱼ − x̄ᵢ)²</MathLine>
            {r.groups.map((g, i) => (
              <MathLine key={i}>{g.label}: Σ(x − {fmt(g.mean, 4)})² = {fmt(g.sumSq, 4)}</MathLine>
            ))}
            <MathLine>SSW = {fmt(r.ssWithin, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "SS total",
        body: (
          <>
            <MathNote>Total variability equals between plus within</MathNote>
            <MathLine>SST = SSB + SSW</MathLine>
            <MathLine>SST = {fmt(r.ssBetween, 4)} + {fmt(r.ssWithin, 4)}</MathLine>
            <MathLine>SST = {fmt(r.ssTotal, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "Degrees of freedom",
        body: (
          <>
            <MathNote>Between-groups df uses the number of groups k; within-groups df uses total N</MathNote>
            <MathLine>df_between = k − 1</MathLine>
            <MathLine>df_between = {r.k} − 1 = {r.dfBetween}</MathLine>
            <MathLine>df_within = N − k</MathLine>
            <MathLine>df_within = {r.N} − {r.k} = {r.dfWithin}</MathLine>
          </>
        ),
      },
      {
        title: "Mean squares",
        body: (
          <>
            <MathNote>Divide each sum of squares by its degrees of freedom</MathNote>
            <MathLine>MSB = SSB / df_between</MathLine>
            <MathLine>MSB = {fmt(r.ssBetween, 4)} / {r.dfBetween}</MathLine>
            <MathLine>MSB = {fmt(r.msBetween, 4)}</MathLine>
            <MathLine>MSW = SSW / df_within</MathLine>
            <MathLine>MSW = {fmt(r.ssWithin, 4)} / {r.dfWithin}</MathLine>
            <MathLine>MSW = {fmt(r.msWithin, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "F ratio",
        body: (
          <>
            <MathNote>F is the ratio of between-group variance to within-group variance</MathNote>
            <MathLine>F = MSB / MSW</MathLine>
            <MathLine>F = {fmt(r.msBetween, 4)} / {fmt(r.msWithin, 4)}</MathLine>
            <MathLine>F = {fmt(r.F, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "p-value and critical F",
        body: (
          <>
            <MathNote>p-value is the upper tail of the F distribution at the observed F; critical F marks the α cutoff</MathNote>
            <MathLine>p = P(F(df_between, df_within) ≥ F)</MathLine>
            <MathLine>p = P(F({r.dfBetween}, {r.dfWithin}) ≥ {fmt(r.F, 4)})</MathLine>
            <MathLine>p = {fmtP(r.p)}</MathLine>
            <MathLine>F_crit = F⁻¹(1 − α; df_between, df_within)</MathLine>
            <MathLine>F_crit = F⁻¹(1 − {r.alpha}; {r.dfBetween}, {r.dfWithin})</MathLine>
            <MathLine>F_crit = {fmt(r.crit, 4)}</MathLine>
            <MathNote>
              {r.p <= r.alpha
                ? "p ≤ α → reject H₀. At least one group mean differs significantly."
                : "p > α → fail to reject H₀. No significant evidence the group means differ."}
            </MathNote>
          </>
        ),
      },
    ];
  }, [res]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Significance level α">
          <TextInput
            value={alpha}
            onChange={(e) => setAlpha(e.target.value)}
            inputMode="decimal"
          />
        </Field>
      </div>

      <div className="space-y-3">
        {groups.map((g, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 bg-background/40 p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <TextInput
                value={g.label}
                onChange={(e) => updateGroup(i, "label", e.target.value)}
                className="max-w-xs font-medium"
                aria-label={`Group ${i + 1} label`}
              />
              <button
                type="button"
                onClick={() => removeGroup(i)}
                disabled={groups.length <= 3}
                className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Remove
              </button>
            </div>
            <textarea
              value={g.raw}
              onChange={(e) => updateGroup(i, "raw", e.target.value)}
              rows={2}
              placeholder="Comma- or space-separated numbers, e.g. 12, 15, 14, 18"
              className="w-full rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addGroup}
          className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-sm text-foreground hover:border-primary/40"
        >
          + Add group
        </button>
      </div>

      <PrimaryButton onClick={run}>Run one-way ANOVA</PrimaryButton>
      {err && <ErrorBox message={err} />}

      {res && (
        <div
          ref={resultRef}
          className="rounded-2xl border border-border/60 bg-secondary/30 p-5"
        >
          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="F statistic" value={fmt(res.F, 4)} big />
            <Stat label="df" value={`${res.dfBetween}, ${res.dfWithin}`} />
            <Stat label="p-value" value={fmtP(res.p)} />
            <Stat
              label={`α = ${res.alpha}`}
              value={res.p <= res.alpha ? "Reject H₀" : "Fail to reject H₀"}
              tone={res.p <= res.alpha ? "good" : "muted"}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Critical value F<sub>{res.alpha}</sub>({res.dfBetween}, {res.dfWithin}) ={" "}
            <strong>{fmt(res.crit, 4)}</strong>.{" "}
            {res.F >= res.crit
              ? `F ≥ critical → reject H₀.`
              : `F < critical → fail to reject H₀.`}
          </p>
          {res.p <= res.alpha && (
            <p className="mt-2 text-sm text-primary">
              At least one group mean differs from another. To identify <em>which</em>{" "}
              pairs of groups differ, follow up with a post-hoc test such as{" "}
              <strong>Tukey's HSD</strong>, Bonferroni-corrected pairwise t-tests, or
              Scheffé's test. ANOVA alone cannot tell you where the differences lie.
            </p>
          )}
          {res.cleaned > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">{cleanedNote(res.cleaned)}</p>
          )}
          {res.invalid.length > 0 && (
            <p className="mt-2 text-sm text-amber-500">
              Ignored {res.invalid.length} value{res.invalid.length === 1 ? "" : "s"} that
              could not be parsed: {res.invalid.slice(0, 5).join(", ")}
              {res.invalid.length > 5 ? "…" : ""}
            </p>
          )}

          <div className="mt-4">
            <FDistDiagram
              F={Number.isFinite(res.F) ? res.F : res.crit * 3}
              df1={res.dfBetween}
              df2={res.dfWithin}
              crit={res.crit}
            />
          </div>

          {/* Group summary */}
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/50">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/40 text-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Group</th>
                  <th className="px-3 py-2 text-right font-semibold">n</th>
                  <th className="px-3 py-2 text-right font-semibold">Mean</th>
                  <th className="px-3 py-2 text-right font-semibold">Σ(x − x̄ᵢ)²</th>
                </tr>
              </thead>
              <tbody>
                {res.groups.map((g, i) => (
                  <tr key={i} className="odd:bg-background/40">
                    <td className="px-3 py-2">{g.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{g.n}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(g.mean, 4)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(g.sumSq, 4)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border/60 font-semibold">
                  <td className="px-3 py-2">Grand</td>
                  <td className="px-3 py-2 text-right tabular-nums">{res.N}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(res.grandMean, 4)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(res.ssWithin, 4)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ANOVA summary table */}
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/50">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/40 text-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Source</th>
                  <th className="px-3 py-2 text-right font-semibold">SS</th>
                  <th className="px-3 py-2 text-right font-semibold">df</th>
                  <th className="px-3 py-2 text-right font-semibold">MS</th>
                  <th className="px-3 py-2 text-right font-semibold">F</th>
                  <th className="px-3 py-2 text-right font-semibold">p</th>
                </tr>
              </thead>
              <tbody>
                <tr className="odd:bg-background/40">
                  <td className="px-3 py-2">Between groups</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(res.ssBetween, 4)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{res.dfBetween}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(res.msBetween, 4)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(res.F, 4)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmtP(res.p)}</td>
                </tr>
                <tr className="odd:bg-background/40">
                  <td className="px-3 py-2">Within groups (error)</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(res.ssWithin, 4)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{res.dfWithin}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(res.msWithin, 4)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">—</td>
                  <td className="px-3 py-2 text-right tabular-nums">—</td>
                </tr>
                <tr className="border-t border-border/60 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmt(res.ssTotal, 4)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{res.dfTotal}</td>
                  <td className="px-3 py-2 text-right tabular-nums">—</td>
                  <td className="px-3 py-2 text-right tabular-nums">—</td>
                  <td className="px-3 py-2 text-right tabular-nums">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <StepsToggle steps={steps} />

          <div className="mt-4">
            <ResultActions captureRef={resultRef} filename="anova" getCopyText={() => summary} />
          </div>
        </div>
      )}
    </div>
  );
}


/* ============================================================
   Extras — educational content
   ============================================================ */

const ANOVA_GUIDE: GuideCardItem[] = [
  {
    key: "what",
    title: "1. What ANOVA tests — equality of three or more group means",
    explain:
      "One-way ANOVA asks whether the population means of k independent groups are all equal. It's an omnibus test: a significant F says at least one group differs somewhere, not which pair. With k = 2 groups it reduces exactly to the squared t-statistic.",
    formula: <>H₀: μ₁ = μ₂ = … = μₖ &nbsp;·&nbsp; H₁: at least one μᵢ differs</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="90" x2="220" y2="90" className="stroke-border" />
          {[
            { x: 45, mean: 60 },
            { x: 120, mean: 45 },
            { x: 195, mean: 30 },
          ].map((g, i) => (
            <g key={i}>
              {[-8, 0, 8, 4, -4].map((d, j) => (
                <circle key={j} cx={g.x + d} cy={g.mean + d} r="2.5" className="fill-primary/60" />
              ))}
              <line x1={g.x - 14} y1={g.mean} x2={g.x + 14} y2={g.mean} className="stroke-primary" strokeWidth="2" />
              <text x={g.x} y="105" fontSize="10" textAnchor="middle" className="fill-foreground">A{i + 1}</text>
            </g>
          ))}
        </svg>
      </div>
    ),
    example: {
      given: "3 teaching methods, 5 scores each",
      substitute: "H₀: μA = μB = μC",
      answer: "test with one F, not 3 t-tests",
    },
  },
  {
    key: "why",
    title: "2. Why not run many t-tests — the family-wise error problem",
    explain:
      "Every t-test at α = 0.05 has a 5% false-positive risk. With k = 5 groups you'd run 10 pairwise tests and the chance of at least one false alarm balloons to ~40%. A single ANOVA controls the overall error rate.",
    formula: <>family-wise error ≈ 1 − (1 − α)^m &nbsp; where m = k(k−1)/2</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 font-serif italic">
          <div className="flex justify-between"><span>k = 3</span><span>3 tests · ≈ 14%</span></div>
          <div className="flex justify-between"><span>k = 4</span><span>6 tests · ≈ 26%</span></div>
          <div className="flex justify-between"><span>k = 5</span><span>10 tests · ≈ 40%</span></div>
          <div className="flex justify-between text-destructive"><span>k = 6</span><span>15 tests · ≈ 54%</span></div>
        </div>
      </div>
    ),
    example: {
      given: "k = 5, α = 0.05",
      substitute: "1 − 0.95¹⁰",
      answer: "≈ 40% false-positive risk",
    },
  },
  {
    key: "ss",
    title: "3. Partitioning variance — SS, MS and the F ratio",
    explain:
      "Total variability splits into between-group (differences among group means) and within-group (random scatter around each group's mean). Dividing by degrees of freedom turns each SS into a variance estimate; their ratio is F.",
    formula: (
      <>
        SS<sub>between</sub> = Σ nᵢ (x̄ᵢ − x̄)²
        <br />
        SS<sub>within</sub> = Σ Σ (xᵢⱼ − x̄ᵢ)²
        <br />
        F = MS<sub>between</sub> / MS<sub>within</sub>
      </>
    ),
    legend: [
      { sym: "k", def: "number of groups" },
      { sym: "N", def: "total observations" },
      { sym: "x̄", def: "grand mean" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <rect x="20" y="30" width="200" height="24" className="fill-primary/60" />
          <text x="120" y="47" fontSize="10" textAnchor="middle" className="fill-primary-foreground">SS total</text>
          <rect x="20" y="70" width="80" height="24" className="fill-primary/80" />
          <text x="60" y="87" fontSize="10" textAnchor="middle" className="fill-primary-foreground">between</text>
          <rect x="100" y="70" width="120" height="24" className="fill-primary/40" />
          <text x="160" y="87" fontSize="10" textAnchor="middle" className="fill-foreground">within</text>
        </svg>
      </div>
    ),
    example: {
      given: "SSb = 90, SSw = 30, k = 3, N = 15",
      substitute: "F = (90/2) / (30/12)",
      answer: "F = 18 · p ≈ 0.00025",
    },
  },
  {
    key: "after",
    title: "4. After a significant F — post-hoc tests and effect size",
    explain:
      "A significant F says only that some pair differs. Use Tukey's HSD (equal n), Bonferroni, or Scheffé to identify which pairs. Report an effect size — η² = SS_between / SS_total — so readers see the magnitude, not just the p-value. Check assumptions: independence, roughly normal residuals, similar variances (use Welch's ANOVA if not).",
    formula: <>η² = SS<sub>between</sub> / SS<sub>total</sub></>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded-lg bg-primary/15 py-1 text-primary">significant F → run Tukey / Bonferroni</div>
          <div className="rounded-lg bg-primary/10 py-1">report η² or ω² alongside p</div>
          <div className="rounded-lg bg-destructive/15 py-1 text-destructive">unequal variances → Welch's ANOVA</div>
          <div className="rounded-lg bg-destructive/15 py-1 text-destructive">non-normal, small n → Kruskal–Wallis</div>
        </div>
      </div>
    ),
    example: {
      given: "F(2,12) = 18, SSb = 90, SSt = 120",
      substitute: "η² = 90 / 120",
      answer: "η² = 0.75 (large effect)",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="ANOVA explained, step by step">
        <p>
          Analysis of variance compares three or more group means with a single
          F test that controls the false-positive rate. Each card below covers
          one piece of the calculation this tool runs.
        </p>
        <GuideCards items={ANOVA_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Enter unlimited groups with any (unequal) sample sizes.",
            "Accepts messy paste from spreadsheets — commas, tabs, spaces, newlines all work.",
            "Full ANOVA table: SS, df, MS, F and exact p-value from the F CDF.",
            "Critical F at your α with a plain-language reject / fail-to-reject verdict.",
            "Shaded F-distribution diagram highlighting the observed statistic and rejection region.",
            "Effect size η² = SS_between / SS_total reported alongside the F.",
            "Grand mean and per-group means shown for quick sanity checks.",
            "Copy a text summary or download the results as a PNG.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            {
              q: "When should I use one-way ANOVA?",
              a: "When you're comparing means of three or more independent groups on a single numeric outcome. With just two groups, use an independent-samples t-test — the F test in one-way ANOVA reduces to t² in that case.",
            },
            {
              q: "What is the difference between one-way and two-way ANOVA?",
              a: "One-way ANOVA has one categorical factor. Two-way ANOVA has two factors and can also test their interaction (e.g. does the effect of teaching method depend on school type?). This calculator handles the one-way case.",
            },
            {
              q: "What if my groups have unequal sample sizes?",
              a: "One-way ANOVA still works with unbalanced groups — the formulas already weight each group by its own n. Unequal sizes do, however, make the test more sensitive to violations of the equal-variance assumption.",
            },
            {
              q: "What if the equal-variance assumption fails?",
              a: "Use Welch's ANOVA, which corrects the degrees of freedom for unequal variances. With non-normal data and small samples, consider the Kruskal–Wallis non-parametric test.",
            },
            {
              q: "How do I report ANOVA results?",
              a: "APA style: F(df_between, df_within) = value, p = value, plus an effect size such as η² or ω². Example: F(2, 12) = 18.00, p < .001, η² = .75.",
            },
            {
              q: "Which post-hoc test should I use?",
              a: "Tukey's HSD is the default for pairwise comparisons when sample sizes are equal or roughly so. Bonferroni is more conservative and easy to apply. Scheffé is very conservative but flexible for complex contrasts.",
            },
          ]}
        />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/t-test-calculator", label: "T-Test Calculator" },
            { to: "/calculators/math/p-value-calculator", label: "P-Value Calculator" },
            { to: "/calculators/math/chi-square-calculator", label: "Chi-Square Calculator" },
            { to: "/calculators/math/f-test-calculator", label: "F-Test Calculator" },
          ]}
        />
      </CalcSection>
    </>
  );
}

