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
import { type Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import type { ReactNode } from "react";
import { chiSquareCDF, chiSquareInv, chiSquarePDF, fmt, fmtP } from "@/lib/math/p-value";

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
   χ² distribution diagram — shaded p-value area + critical line
   ============================================================ */
function ChiSquareDiagram({
  chi2,
  df,
  crit,
}: {
  chi2: number;
  df: number;
  crit: number;
}) {
  const W = 560;
  const H = 200;
  const pad = 30;
  const xMin = 0;
  const modeGuess = df + 5;
  const xMax = Math.max(chi2 * 1.3 + 1, crit * 1.3 + 1, modeGuess * 2);

  const N = 240;
  const pts: [number, number][] = [];
  let maxY = 0;
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = chiSquarePDF(x, df);
    if (Number.isFinite(y) && y > maxY) maxY = y;
    pts.push([x, Number.isFinite(y) ? y : 0]);
  }
  if (maxY <= 0) maxY = 1;
  const px = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
  const py = (y: number) => H - pad - (y / maxY) * (H - 2 * pad);
  const curve = "M " + pts.map(([x, y]) => `${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" L ");

  const shadeFrom = chi2;
  const filt = pts.filter(([x]) => x >= shadeFrom);
  const shade =
    filt.length >= 2
      ? `M ${px(filt[0][0]).toFixed(1)},${py(0).toFixed(1)} ` +
        filt.map(([x, y]) => `L ${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" ") +
        ` L ${px(filt[filt.length - 1][0]).toFixed(1)},${py(0).toFixed(1)} Z`
      : "";

  const statClamped = Math.max(xMin, Math.min(xMax, chi2));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Chi-square distribution with shaded p-value area and critical value marked"
    >
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className="stroke-muted-foreground/40" strokeWidth={1} />
      {shade && <path d={shade} className="fill-destructive/30" />}
      <path d={curve} className="fill-none stroke-primary" strokeWidth={2} />
      {crit >= xMin && crit <= xMax && (
        <g>
          <line x1={px(crit)} y1={pad} x2={px(crit)} y2={H - pad} className="stroke-muted-foreground/60" strokeDasharray="4 3" />
          <text x={px(crit)} y={H - pad + 14} textAnchor="middle" className="fill-muted-foreground text-[11px]">
            crit {fmt(crit, 3)}
          </text>
        </g>
      )}
      <line x1={px(statClamped)} y1={pad - 6} x2={px(statClamped)} y2={H - pad} className="stroke-foreground" strokeWidth={1.5} />
      <circle cx={px(statClamped)} cy={py(chiSquarePDF(statClamped, df))} r={4} className="fill-foreground" />
      <text x={px(statClamped)} y={pad - 10} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
        χ² = {fmt(chi2, 3)}
      </text>
      <text x={W - pad} y={H - 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
        shaded area = p-value · df = {df}
      </text>
    </svg>
  );
}

export const Route = createFileRoute("/calculators/math/chi-square-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Chi-Square Calculator",
      title: "Chi-Square Calculator — Goodness of Fit & Independence",
      metaDescription:
        "Run chi-square goodness-of-fit or test of independence with observed vs expected, df, and p-value.",
      canonicalUrl: "/calculators/math/chi-square-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Chi-Square Calculator", path: "/calculators/math/chi-square-calculator" },
      ],
      faqs: [
        {
          q: "When should I use a chi-square test?",
          a: "Use it for categorical (count) data. Goodness of fit checks whether one categorical variable matches an expected distribution (e.g. is a die fair?). Test of independence checks whether two categorical variables are related (e.g. does gender relate to product preference?).",
        },
        {
          q: "What is the difference between goodness of fit and independence?",
          a: "Goodness of fit uses ONE variable and asks whether observed frequencies match a claimed theoretical distribution. Independence uses TWO variables laid out in a contingency table and asks whether the row variable and column variable are related.",
        },
        {
          q: "What are the degrees of freedom?",
          a: "For goodness of fit df = k − 1, where k is the number of categories. For a test of independence on an r × c table df = (r − 1) × (c − 1).",
        },
        {
          q: "What is the expected-count rule?",
          a: "The chi-square approximation to the sampling distribution requires each expected count to be reasonably large. A common rule of thumb is that all expected counts should be ≥ 5. If several cells fall below that, consider combining categories or switching to Fisher's exact test.",
        },
        {
          q: "Can chi-square tests prove causation?",
          a: "No. A significant chi-square result on a test of independence only tells you the two variables are associated in your sample beyond what you'd expect from chance. It does not tell you which variable causes which, or that a third variable isn't driving both.",
        },
        {
          q: "What does a small p-value mean here?",
          a: "It means the observed frequencies are far from what the null hypothesis predicts — far enough that a difference this large would be unlikely under the null. It does not tell you the size or practical importance of the effect; report Cramér's V or a similar effect size alongside χ².",
        },
      ],
    }),
  component: ChiSquarePage,
});

type Tool = "gof" | "indep";

function ChiSquarePage() {
  const [tool, setTool] = useState<Tool>("gof");
  return (
    <MathCalcPage
      name="Chi-Square Calculator"
      tagline="Run a chi-square goodness-of-fit test or a test of independence — with expected frequencies, exact p-values from the χ² distribution, critical values and a plain-language significance verdict."
      extras={<Extras />}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["gof", "Goodness of Fit"],
            ["indep", "Test of Independence"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTool(k)}
            className={
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
              (tool === k
                ? "border-primary/60 bg-primary/15 text-foreground"
                : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>
      {tool === "gof" ? <GoodnessOfFitTool /> : <IndependenceTool />}
    </MathCalcPage>
  );
}

/* ============================================================
   Shared result primitives
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
   TOOL 1 — Goodness of Fit
   ============================================================ */

interface GofRow {
  observed: string;
  expected: string;
}

interface GofResult {
  rows: { o: number; e: number; contrib: number }[];
  chi2: number;
  df: number;
  p: number;
  crit: number;
  alpha: number;
  totalO: number;
  totalE: number;
  minExpected: number;
}

function GoodnessOfFitTool() {
  const [rows, setRows] = useState<GofRow[]>([
    { observed: "8", expected: "10" },
    { observed: "9", expected: "10" },
    { observed: "12", expected: "10" },
    { observed: "11", expected: "10" },
    { observed: "6", expected: "10" },
    { observed: "14", expected: "10" },
  ]);
  const [alpha, setAlpha] = useState("0.05");
  const [expectedMode, setExpectedMode] = useState<"counts" | "proportions">("counts");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<GofResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  function addRow() {
    setRows((r) => [...r, { observed: "", expected: "" }]);
  }
  function removeRow(i: number) {
    setRows((r) => (r.length > 2 ? r.filter((_, idx) => idx !== i) : r));
  }
  function updateRow(i: number, key: keyof GofRow, v: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: v } : row)));
  }

  function run() {
    setErr(null);
    const a = Number(alpha);
    if (!Number.isFinite(a) || a <= 0 || a >= 1)
      return setErr("Significance level α must be between 0 and 1 (e.g. 0.05).");
    const parsed: { o: number; e: number }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const o = Number(rows[i].observed);
      const eRaw = Number(rows[i].expected);
      if (!Number.isFinite(o) || o < 0)
        return setErr(`Row ${i + 1}: observed must be a non-negative number.`);
      if (!Number.isFinite(eRaw) || eRaw <= 0)
        return setErr(`Row ${i + 1}: expected must be a positive number.`);
      parsed.push({ o, e: eRaw });
    }
    const totalO = parsed.reduce((s, r) => s + r.o, 0);
    let expected: number[];
    if (expectedMode === "proportions") {
      const sumP = parsed.reduce((s, r) => s + r.e, 0);
      if (sumP <= 0) return setErr("Expected proportions must sum to a positive value.");
      expected = parsed.map((r) => (r.e / sumP) * totalO);
    } else {
      expected = parsed.map((r) => r.e);
    }
    const totalE = expected.reduce((s, x) => s + x, 0);
    const contribs = parsed.map((r, i) => {
      const e = expected[i];
      return { o: r.o, e, contrib: ((r.o - e) ** 2) / e };
    });
    const chi2 = contribs.reduce((s, r) => s + r.contrib, 0);
    const df = parsed.length - 1;
    if (df < 1) return setErr("Need at least 2 categories.");
    const p = 1 - chiSquareCDF(chi2, df);
    const crit = chiSquareInv(1 - a, df);
    const minExpected = Math.min(...expected);
    setRes({ rows: contribs, chi2, df, p, crit, alpha: a, totalO, totalE, minExpected });
  }

  const steps: Step[] = useMemo(() => buildGofSteps(res), [res]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Significance level α">
          <TextInput value={alpha} onChange={(e) => setAlpha(e.target.value)} inputMode="decimal" />
        </Field>
        <Field label="Expected input as">
          <div className="flex gap-2">
            {(
              [
                ["counts", "Counts"],
                ["proportions", "Proportions"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setExpectedMode(v)}
                className={
                  "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                  (expectedMode === v
                    ? "border-primary/60 bg-primary/15 text-foreground"
                    : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/60">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary/40 text-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Category</th>
              <th className="px-3 py-2 text-right font-semibold">Observed</th>
              <th className="px-3 py-2 text-right font-semibold">
                Expected {expectedMode === "proportions" ? "(proportion)" : "(count)"}
              </th>
              <th className="px-3 py-2 text-right font-semibold"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="odd:bg-background/40">
                <td className="px-3 py-2 text-muted-foreground">#{i + 1}</td>
                <td className="px-2 py-1">
                  <TextInput
                    value={r.observed}
                    onChange={(e) => updateRow(i, "observed", e.target.value)}
                    inputMode="decimal"
                    className="text-right"
                  />
                </td>
                <td className="px-2 py-1">
                  <TextInput
                    value={r.expected}
                    onChange={(e) => updateRow(i, "expected", e.target.value)}
                    inputMode="decimal"
                    className="text-right"
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 2}
                    className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-sm text-foreground hover:border-primary/40"
        >
          + Add category
        </button>
      </div>

      <PrimaryButton onClick={run}>Run goodness-of-fit test</PrimaryButton>
      {err && <ErrorBox message={err} />}

      {res && (
        <div ref={resultRef} className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="χ²" value={fmt(res.chi2, 4)} big />
            <Stat label="df" value={String(res.df)} />
            <Stat label="p-value" value={fmtP(res.p)} />
            <Stat
              label={`α = ${res.alpha}`}
              value={res.p <= res.alpha ? "Reject H₀" : "Fail to reject H₀"}
              tone={res.p <= res.alpha ? "good" : "muted"}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Critical value χ²<sub>{res.alpha}, {res.df}</sub> = <strong>{fmt(res.crit, 4)}</strong>.{" "}
            {res.chi2 >= res.crit
              ? `χ² ≥ critical → reject H₀.`
              : `χ² < critical → fail to reject H₀.`}
          </p>
          {res.minExpected < 5 && (
            <p className="mt-2 text-sm text-amber-500">
              Warning: smallest expected count is {fmt(res.minExpected, 2)} (&lt; 5). The chi-square approximation may be unreliable — consider combining categories.
            </p>
          )}

          <div className="mt-4">
            <ChiSquareDiagram chi2={res.chi2} df={res.df} crit={res.crit} />
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border/50">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/40 text-foreground">
                <tr>

                  <th className="px-3 py-2 text-left font-semibold">Category</th>
                  <th className="px-3 py-2 text-right font-semibold">O</th>
                  <th className="px-3 py-2 text-right font-semibold">E</th>
                  <th className="px-3 py-2 text-right font-semibold">O − E</th>
                  <th className="px-3 py-2 text-right font-semibold">(O − E)² / E</th>
                </tr>
              </thead>
              <tbody>
                {res.rows.map((r, i) => (
                  <tr key={i} className="odd:bg-background/40">
                    <td className="px-3 py-2 text-muted-foreground">#{i + 1}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(r.o, 4)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(r.e, 4)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(r.o - r.e, 4)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(r.contrib, 4)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border/60 font-semibold">
                  <td className="px-3 py-2">Totals</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(res.totalO, 4)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(res.totalE, 4)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">—</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(res.chi2, 4)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <StepsToggle steps={steps} />

          <div className="mt-4">
            <ResultActions
              captureRef={resultRef}
              filename="chi-square-goodness-of-fit"
              getCopyText={() => gofSummary(res)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function gofSummary(res: GofResult): string {
  return [
    "Chi-Square Goodness-of-Fit Test",
    `χ² = ${fmt(res.chi2, 4)}   df = ${res.df}   p = ${fmtP(res.p)}`,
    `Critical χ² at α=${res.alpha}: ${fmt(res.crit, 4)}`,
    `Decision: ${res.p <= res.alpha ? "Reject H₀" : "Fail to reject H₀"}`,
  ].join("\n");
}

function buildGofSteps(res: GofResult | null): Step[] {
  if (!res) return [];
  return [
    {
      title: "Hypotheses",
      body: (
        <>
          <MathNote>
            H₀: the observed frequencies match the expected distribution. H₁: at least one category deviates.
          </MathNote>
        </>
      ),
    },
    {
      title: "Per-category contribution",
      body: (
        <>
          <MathNote>Each category contributes (O − E)² / E</MathNote>
          {res.rows.map((r, i) => (
            <MathLine key={i}>
              ({fmt(r.o, 2)} − {fmt(r.e, 2)})² / {fmt(r.e, 2)} = {fmt(r.contrib, 4)}
            </MathLine>
          ))}
        </>
      ),
    },
    {
      title: "Sum to get χ²",
      body: (
        <>
          <MathLine>χ² = Σ (O − E)² / E</MathLine>
          <MathLine>
            χ² = {res.rows.map((r) => fmt(r.contrib, 4)).join(" + ")}
          </MathLine>
          <MathLine>χ² = {fmt(res.chi2, 4)}</MathLine>
        </>
      ),
    },
    {
      title: "Degrees of freedom",
      body: (
        <>
          <MathLine>df = k − 1</MathLine>
          <MathLine>df = {res.rows.length} − 1</MathLine>
          <MathLine>df = {res.df}</MathLine>
        </>
      ),
    },
    {
      title: "Critical value",
      body: (
        <>
          <MathNote>At α = {res.alpha} with df = {res.df}</MathNote>
          <MathLine>χ²<sub>crit</sub> = {fmt(res.crit, 4)}</MathLine>
        </>
      ),
    },
    {
      title: "p-value",
      body: (
        <>
          <MathLine>p = P(χ²<sub>{res.df}</sub> ≥ {fmt(res.chi2, 4)})</MathLine>
          <MathLine>p = {fmtP(res.p)}</MathLine>
        </>
      ),
    },
    {
      title: "Decision",
      body: (
        <>
          <MathNote>
            {res.p <= res.alpha
              ? `p = ${fmtP(res.p)} ≤ α = ${res.alpha} → reject H₀. Observed frequencies differ significantly from expected.`
              : `p = ${fmtP(res.p)} > α = ${res.alpha} → fail to reject H₀. No significant deviation from expected.`}
          </MathNote>
        </>
      ),
    },
  ];
}

/* ============================================================
   TOOL 2 — Test of Independence (contingency table)
   ============================================================ */

interface IndepResult {
  observed: number[][];
  expected: number[][];
  contrib: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
  chi2: number;
  df: number;
  p: number;
  crit: number;
  alpha: number;
  minExpected: number;
}

function IndependenceTool() {
  const [rows, setRowsN] = useState(2);
  const [cols, setColsN] = useState(3);
  const [alpha, setAlpha] = useState("0.05");
  const [grid, setGrid] = useState<string[][]>(() => [
    ["20", "30", "20"],
    ["30", "40", "10"],
  ]);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<IndepResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Keep grid dimensions in sync with rows/cols.
  useMemo(() => {
    setGrid((old) => {
      const next: string[][] = [];
      for (let r = 0; r < rows; r++) {
        const row: string[] = [];
        for (let c = 0; c < cols; c++) row.push(old[r]?.[c] ?? "");
        next.push(row);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cols]);

  function setCell(r: number, c: number, v: string) {
    setGrid((g) => g.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row)));
  }

  function run() {
    setErr(null);
    const a = Number(alpha);
    if (!Number.isFinite(a) || a <= 0 || a >= 1)
      return setErr("Significance level α must be between 0 and 1.");
    const observed: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        const n = Number(grid[r]?.[c]);
        if (!Number.isFinite(n) || n < 0)
          return setErr(`Cell (row ${r + 1}, col ${c + 1}) must be a non-negative number.`);
        row.push(n);
      }
      observed.push(row);
    }
    const rowTotals = observed.map((row) => row.reduce((s, x) => s + x, 0));
    const colTotals = Array.from({ length: cols }, (_, c) =>
      observed.reduce((s, row) => s + row[c], 0),
    );
    const grandTotal = rowTotals.reduce((s, x) => s + x, 0);
    if (grandTotal <= 0) return setErr("Table total must be positive.");
    if (rowTotals.some((x) => x === 0) || colTotals.some((x) => x === 0))
      return setErr("Each row and column must have a positive total.");

    const expected: number[][] = observed.map((row, r) =>
      row.map((_, c) => (rowTotals[r] * colTotals[c]) / grandTotal),
    );
    const contrib: number[][] = observed.map((row, r) =>
      row.map((o, c) => {
        const e = expected[r][c];
        return ((o - e) ** 2) / e;
      }),
    );
    const chi2 = contrib.reduce((s, row) => s + row.reduce((ss, v) => ss + v, 0), 0);
    const df = (rows - 1) * (cols - 1);
    if (df < 1) return setErr("Need at least a 2 × 2 table.");
    const p = 1 - chiSquareCDF(chi2, df);
    const crit = chiSquareInv(1 - a, df);
    const minExpected = Math.min(...expected.flat());
    setRes({
      observed,
      expected,
      contrib,
      rowTotals,
      colTotals,
      grandTotal,
      chi2,
      df,
      p,
      crit,
      alpha: a,
      minExpected,
    });
  }

  const steps: Step[] = useMemo(() => buildIndepSteps(res), [res]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Rows">
          <select
            value={rows}
            onChange={(e) => setRowsN(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground"
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Columns">
          <select
            value={cols}
            onChange={(e) => setColsN(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground"
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Significance level α">
          <TextInput value={alpha} onChange={(e) => setAlpha(e.target.value)} inputMode="decimal" />
        </Field>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-foreground">Observed frequencies</div>
        <div className="overflow-x-auto rounded-2xl border border-border/60 p-2">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1"></th>
                {Array.from({ length: cols }, (_, c) => (
                  <th key={c} className="px-2 py-1 text-center text-xs text-muted-foreground">
                    Col {c + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, r) => (
                <tr key={r}>
                  <td className="px-2 py-1 text-xs text-muted-foreground">Row {r + 1}</td>
                  {Array.from({ length: cols }, (_, c) => (
                    <td key={c} className="px-1 py-1">
                      <TextInput
                        value={grid[r]?.[c] ?? ""}
                        onChange={(e) => setCell(r, c, e.target.value)}
                        inputMode="decimal"
                        className="text-right"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PrimaryButton onClick={run}>Run test of independence</PrimaryButton>
      {err && <ErrorBox message={err} />}

      {res && (
        <div ref={resultRef} className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="χ²" value={fmt(res.chi2, 4)} big />
            <Stat label="df" value={String(res.df)} />
            <Stat label="p-value" value={fmtP(res.p)} />
            <Stat
              label={`α = ${res.alpha}`}
              value={res.p <= res.alpha ? "Reject H₀" : "Fail to reject H₀"}
              tone={res.p <= res.alpha ? "good" : "muted"}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Critical value χ²<sub>{res.alpha}, {res.df}</sub> = <strong>{fmt(res.crit, 4)}</strong>.{" "}
            {res.p <= res.alpha
              ? `The two variables are significantly associated at α = ${res.alpha}.`
              : `No significant evidence that the two variables are associated at α = ${res.alpha}.`}
          </p>
          {res.minExpected < 5 && (
            <p className="mt-2 text-sm text-amber-500">
              Warning: smallest expected count is {fmt(res.minExpected, 2)} (&lt; 5). The chi-square approximation may be unreliable — consider combining categories or using Fisher's exact test.
            </p>
          )}

          <div className="mt-4">
            <ChiSquareDiagram chi2={res.chi2} df={res.df} crit={res.crit} />
          </div>



          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <TableView title="Observed" cells={res.observed} rowTotals={res.rowTotals} colTotals={res.colTotals} grandTotal={res.grandTotal} />
            <TableView title="Expected" cells={res.expected} rowTotals={res.rowTotals} colTotals={res.colTotals} grandTotal={res.grandTotal} decimals={2} />
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border/50">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/40 text-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Cell (O − E)² / E</th>
                  {Array.from({ length: res.observed[0].length }, (_, c) => (
                    <th key={c} className="px-3 py-2 text-right font-semibold">
                      Col {c + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {res.contrib.map((row, r) => (
                  <tr key={r} className="odd:bg-background/40">
                    <td className="px-3 py-2 text-muted-foreground">Row {r + 1}</td>
                    {row.map((v, c) => (
                      <td key={c} className="px-3 py-2 text-right tabular-nums">
                        {fmt(v, 4)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <StepsToggle steps={steps} />

          <div className="mt-4">
            <ResultActions
              captureRef={resultRef}
              filename="chi-square-independence"
              getCopyText={() => indepSummary(res)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TableView({
  title,
  cells,
  rowTotals,
  colTotals,
  grandTotal,
  decimals = 0,
}: {
  title: string;
  cells: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
  decimals?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <div className="border-b border-border/60 bg-secondary/40 px-3 py-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2"></th>
            {cells[0].map((_, c) => (
              <th key={c} className="px-3 py-2 text-right text-xs text-muted-foreground">
                Col {c + 1}
              </th>
            ))}
            <th className="px-3 py-2 text-right text-xs text-muted-foreground">Total</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((row, r) => (
            <tr key={r} className="odd:bg-background/40">
              <td className="px-3 py-2 text-xs text-muted-foreground">Row {r + 1}</td>
              {row.map((v, c) => (
                <td key={c} className="px-3 py-2 text-right tabular-nums">
                  {fmt(v, decimals)}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                {fmt(rowTotals[r], decimals)}
              </td>
            </tr>
          ))}
          <tr className="border-t border-border/60 font-semibold">
            <td className="px-3 py-2">Total</td>
            {colTotals.map((v, c) => (
              <td key={c} className="px-3 py-2 text-right tabular-nums">
                {fmt(v, decimals)}
              </td>
            ))}
            <td className="px-3 py-2 text-right tabular-nums">{fmt(grandTotal, decimals)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function indepSummary(res: IndepResult): string {
  return [
    "Chi-Square Test of Independence",
    `Table: ${res.observed.length} × ${res.observed[0].length}   N = ${res.grandTotal}`,
    `χ² = ${fmt(res.chi2, 4)}   df = ${res.df}   p = ${fmtP(res.p)}`,
    `Critical χ² at α=${res.alpha}: ${fmt(res.crit, 4)}`,
    `Decision: ${res.p <= res.alpha ? "Reject H₀ (variables associated)" : "Fail to reject H₀ (no significant association)"}`,
  ].join("\n");
}

function buildIndepSteps(res: IndepResult | null): Step[] {
  if (!res) return [];
  const cellSteps: { r: number; c: number }[] = [];
  for (let r = 0; r < res.observed.length; r++) {
    for (let c = 0; c < res.observed[0].length; c++) cellSteps.push({ r, c });
  }
  const contribFlat: number[] = [];
  for (let r = 0; r < res.contrib.length; r++) {
    for (let c = 0; c < res.contrib[0].length; c++) contribFlat.push(res.contrib[r][c]);
  }
  return [
    {
      title: "Hypotheses",
      body: (
        <MathNote>
          H₀: the row variable and column variable are independent. H₁: the two variables are associated.
        </MathNote>
      ),
    },
    {
      title: "Expected count formula",
      body: (
        <>
          <MathNote>Each expected cell uses its row total, column total, and the grand total</MathNote>
          <MathLine>
            E<sub>ij</sub> = (Row total<sub>i</sub> · Column total<sub>j</sub>) / N
          </MathLine>
        </>
      ),
    },
    {
      title: "Substitute each cell",
      body: (
        <>
          {cellSteps.map(({ r, c }) => (
            <MathLine key={`${r}-${c}`}>
              E<sub>{r + 1}{c + 1}</sub> = ({fmt(res.rowTotals[r], 0)} · {fmt(res.colTotals[c], 0)}) / {fmt(res.grandTotal, 0)} = {fmt(res.expected[r][c], 4)}
            </MathLine>
          ))}
        </>
      ),
    },
    {
      title: "Per-cell contribution",
      body: (
        <>
          <MathNote>Each cell contributes (O − E)² / E</MathNote>
          {cellSteps.map(({ r, c }) => (
            <MathLine key={`${r}-${c}`}>
              ({fmt(res.observed[r][c], 2)} − {fmt(res.expected[r][c], 2)})² / {fmt(res.expected[r][c], 2)} = {fmt(res.contrib[r][c], 4)}
            </MathLine>
          ))}
        </>
      ),
    },
    {
      title: "Sum to get χ²",
      body: (
        <>
          <MathLine>χ² = Σ (O − E)² / E</MathLine>
          <MathLine>χ² = {contribFlat.map((v) => fmt(v, 4)).join(" + ")}</MathLine>
          <MathLine>χ² = {fmt(res.chi2, 4)}</MathLine>
        </>
      ),
    },
    {
      title: "Degrees of freedom",
      body: (
        <>
          <MathLine>df = (r − 1)(c − 1)</MathLine>
          <MathLine>
            df = ({res.observed.length} − 1)({res.observed[0].length} − 1)
          </MathLine>
          <MathLine>df = {res.df}</MathLine>
        </>
      ),
    },
    {
      title: "Critical value",
      body: (
        <>
          <MathNote>At α = {res.alpha} with df = {res.df}</MathNote>
          <MathLine>χ²<sub>crit</sub> = {fmt(res.crit, 4)}</MathLine>
        </>
      ),
    },
    {
      title: "p-value",
      body: (
        <>
          <MathLine>p = P(χ²<sub>{res.df}</sub> ≥ {fmt(res.chi2, 4)})</MathLine>
          <MathLine>p = {fmtP(res.p)}</MathLine>
        </>
      ),
    },
    {
      title: "Decision",
      body: (
        <MathNote>
          {res.p <= res.alpha
            ? `p ≤ α → reject H₀. Evidence of an association between the two variables.`
            : `p > α → fail to reject H₀. No significant evidence of association.`}
        </MathNote>
      ),
    },
  ];
}

/* ============================================================
   Extras — educational content
   ============================================================ */

const CHI_GUIDE: GuideCardItem[] = [
  {
    key: "what",
    title: "1. What χ² measures — observed vs expected counts",
    explain:
      "Chi-square compares observed frequencies in categorical data against what H₀ predicts. Each cell contributes (O − E)² / E, so under- and over-counts both count as evidence and gaps are weighted by how big E is — a difference of 5 out of an expected 10 matters more than 5 out of 1000.",
    formula: <>χ² = Σ (Oᵢ − Eᵢ)² / Eᵢ</>,
    legend: [
      { sym: "O", def: "observed count in a cell" },
      { sym: "E", def: "expected count under H₀" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="90" x2="220" y2="90" className="stroke-border" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={30 + i * 45} y={90 - [30, 45, 20, 55][i]} width="18" height={[30, 45, 20, 55][i]} className="fill-primary/70" />
              <rect x={50 + i * 45} y={90 - [40, 40, 40, 40][i]} width="10" height="40" fill="none" strokeDasharray="3 3" className="stroke-muted-foreground" />
            </g>
          ))}
          <text x="120" y="105" fontSize="9" textAnchor="middle" className="fill-muted-foreground">solid = observed · dashed = expected</text>
        </svg>
      </div>
    ),
    example: {
      given: "die rolls 8,9,12,11,6,14 (E = 10 each)",
      substitute: "χ² = 0.4+0.1+0.4+0.1+1.6+1.6",
      answer: "χ² = 4.2",
    },
  },
  {
    key: "gof",
    title: "2. Goodness of fit — one categorical variable",
    explain:
      "Use this when you have counts across k categories and a hypothesised distribution (uniform, Poisson, historical proportions…). Degrees of freedom are k − 1 (subtract one more for every parameter you estimated from the data).",
    formula: <>df = k − 1</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          {[1, 2, 3, 4, 5, 6].map((v, i) => (
            <g key={i}>
              <rect x={20 + i * 32} y="55" width="24" height="30" className="fill-primary/70" />
              <text x={32 + i * 32} y="100" fontSize="10" textAnchor="middle" className="fill-foreground">{v}</text>
            </g>
          ))}
          <text x="120" y="30" fontSize="10" textAnchor="middle" className="fill-primary">is the die fair?</text>
        </svg>
      </div>
    ),
    example: {
      given: "k = 6 die faces, χ² = 4.2",
      substitute: "df = 6 − 1 = 5, α = 0.05",
      answer: "p ≈ 0.521 → fail to reject",
    },
  },
  {
    key: "ind",
    title: "3. Test of independence — r × c contingency table",
    explain:
      "For two categorical variables cross-tabulated, expected counts come from the row and column marginals: Eᵢⱼ = Rᵢ·Cⱼ / N. Degrees of freedom are (r − 1)(c − 1) because once the top-left block is filled the rest is fixed by the totals.",
    formula: <>Eᵢⱼ = (Rᵢ · Cⱼ) / N &nbsp; df = (r − 1)(c − 1)</>,
    legend: [
      { sym: "Rᵢ", def: "row total" },
      { sym: "Cⱼ", def: "column total" },
      { sym: "N", def: "grand total" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="grid grid-cols-4 gap-1 text-center font-serif italic">
          <div />
          <div className="text-muted-foreground">A</div>
          <div className="text-muted-foreground">B</div>
          <div className="text-muted-foreground">C</div>
          <div className="text-muted-foreground">M</div>
          <div className="rounded bg-primary/20 py-1 text-primary">20</div>
          <div className="rounded bg-primary/20 py-1 text-primary">30</div>
          <div className="rounded bg-primary/20 py-1 text-primary">20</div>
          <div className="text-muted-foreground">F</div>
          <div className="rounded bg-primary/20 py-1 text-primary">30</div>
          <div className="rounded bg-primary/20 py-1 text-primary">40</div>
          <div className="rounded bg-primary/20 py-1 text-primary">10</div>
        </div>
      </div>
    ),
    example: {
      given: "2×3 table, χ² = 6.12",
      substitute: "df = (2−1)(3−1) = 2",
      answer: "p ≈ 0.047 → reject H₀",
    },
  },
  {
    key: "pitfalls",
    title: "4. When χ² breaks — small expected counts",
    explain:
      "The χ² approximation is unreliable when any expected count drops below about 5. Merge categories to raise expected counts, or use Fisher's exact test on 2×2 tables. Also use raw counts (not percentages) and remember χ² is an omnibus test — inspect cell contributions to see what's driving a significant result.",
    formula: <>reliable when Eᵢ ≳ 5 in every cell</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded-lg bg-primary/10 py-1 text-primary">E ≥ 5 in every cell → χ² OK</div>
          <div className="rounded-lg bg-destructive/15 py-1 text-destructive">E &lt; 5 → merge cells or Fisher's exact</div>
          <div className="rounded-lg bg-destructive/15 py-1 text-destructive">percentages instead of counts</div>
          <div className="rounded-lg bg-destructive/15 py-1 text-destructive">paired data → use McNemar's test</div>
        </div>
      </div>
    ),
    example: {
      given: "2×2 table with Eᵢⱼ = 3",
      substitute: "χ² approximation unstable",
      answer: "switch to Fisher's exact",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="Chi-square test explained, step by step">
        <p>
          A chi-square test compares observed frequencies against expected
          frequencies under H₀. Each card below covers one variant this
          calculator runs and the piece of the formula behind it.
        </p>
        <GuideCards items={CHI_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Two tools in one page — goodness of fit and test of independence.",
            "Editable contingency table up to 6 × 6 with adjustable dimensions.",
            "Expected inputs accepted as either counts or proportions on the goodness-of-fit tool.",
            "Exact p-values from the χ² CDF (not table lookups).",
            "Critical value at your chosen α with a reject / fail-to-reject verdict in plain language.",
            "Shows the expected-frequency table beside the observed table, plus per-cell (O − E)²/E contributions.",
            "Warns when expected cell counts fall below 5, where the χ² approximation gets unreliable.",
            "Copy a text summary or download the results as a PNG.",
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            {
              q: "Is chi-square one-tailed or two-tailed?",
              a: (
                <>
                  The chi-square test is inherently <strong>one-tailed on the right</strong>. Large
                  χ² values mean big discrepancies between observed and expected, and those are the
                  values that count as evidence against H₀.
                </>
              ),
            },
            {
              q: "What if some expected counts are less than 5?",
              a: (
                <>
                  Combine small categories with neighbouring ones so no expected count falls below
                  ~5, or switch to <strong>Fisher's exact test</strong> for 2 × 2 tables. Ignoring
                  the rule inflates the false-positive rate.
                </>
              ),
            },
            {
              q: "How is this different from a t-test or ANOVA?",
              a: (
                <>
                  T-tests and ANOVA compare <em>means</em> of numeric outcomes. Chi-square compares{" "}
                  <em>frequencies</em> of categorical outcomes.
                </>
              ),
            },
            {
              q: "Can I use chi-square on 2 × 2 tables?",
              a: (
                <>
                  Yes. With df = 1 many textbooks recommend Yates's continuity correction for small
                  samples, though modern practice often prefers Fisher's exact test when any
                  expected count is below 5. This calculator reports the uncorrected χ², which
                  matches most software defaults.
                </>
              ),
            },
            {
              q: "What effect size should I report alongside χ²?",
              a: (
                <>
                  For a 2 × 2 table use the <strong>phi coefficient</strong> (φ = √(χ²/N)). For
                  larger tables use <strong>Cramér's V</strong> (V = √(χ² / (N · min(r−1, c−1)))).
                </>
              ),
            },
            {
              q: "Does a significant chi-square tell me which cells are driving the result?",
              a: (
                <>
                  No — it's an omnibus test. Inspect the per-cell (O − E)² / E contributions (this
                  calculator shows them) or compute standardised residuals to see which cells
                  deviate most from independence.
                </>
              ),
            },
          ]}
        />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/t-test-calculator", label: "T-Test Calculator" },
            { to: "/calculators/math/p-value-calculator", label: "P-Value Calculator" },
            { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
            { to: "/calculators/math/confidence-interval-calculator", label: "Confidence Interval Calculator" },
          ]}
        />
      </CalcSection>
    </>
  );
}

