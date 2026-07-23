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
import { type Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
import type { ReactNode } from "react";
import { parseDataset } from "@/lib/math/parse-numbers";

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

export const Route = createFileRoute("/calculators/math/coefficient-of-variation-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Coefficient of Variation Calculator",
      title: "Coefficient of Variation Calculator (CV)",
      metaDescription:
        "Compute CV = SD/mean × 100% for sample or population data with mean, SD, and full step-by-step working.",
      canonicalUrl: "/calculators/math/coefficient-of-variation-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Coefficient of Variation Calculator",
          path: "/calculators/math/coefficient-of-variation-calculator",
        },
      ],
      faqs: [
        {
          q: "What counts as a 'high' coefficient of variation?",
          a: "There is no universal cutoff — it depends on the field. A rough working guide in many applied settings: CV < 10% is low variability, 10–30% is moderate, and above 30% is high. Lab measurements often demand CV under a few percent, while financial returns or biological counts can sit well above 30% and still be normal.",
        },
        {
          q: "When is CV NOT meaningful?",
          a: "Whenever the mean is near zero, sits on both sides of zero, or the data isn't on a true ratio scale. Dividing by a mean close to zero makes CV explode, and dividing a Celsius temperature by its mean is meaningless because 0 °C isn't a true zero. Use CV only for strictly positive quantities measured on a ratio scale (mass, income, length, counts).",
        },
        {
          q: "Why compare datasets with CV instead of standard deviation?",
          a: "Standard deviation carries the units of the data. Comparing an SD of $500 on stock prices to an SD of 2 kg on newborn weights is meaningless — the numbers live on different scales. CV is unit-free (a percentage), so it lets you say which dataset is relatively more spread out even when the means and units differ.",
        },
        {
          q: "Should I use population or sample standard deviation?",
          a: "If your data is the entire population, use population (divide by N). If it's a sample from a larger population, use sample (divide by N − 1). Sample is the safer default for most real-world datasets. The toggle at the top of the calculator switches between the two.",
        },
      ],
    }),
  component: CVPage,
});

/* ---------------- Math ---------------- */

interface OneResult {
  n: number;
  values: number[];
  mean: number;
  deviations: number[];
  squared: number[];
  sumSquared: number;
  variance: number;
  sd: number;
  cv: number; // as a fraction (e.g. 0.15)
  isSample: boolean;
}

function computeCV(values: number[], isSample: boolean): OneResult | { error: string } {
  const n = values.length;
  if (n < 2) return { error: "Enter at least 2 values." };
  if (isSample && n < 2) return { error: "Sample standard deviation needs at least 2 values." };
  const mean = values.reduce((s, v) => s + v, 0) / n;
  if (mean === 0)
    return {
      error: "Mean is 0 — the coefficient of variation is undefined (division by zero).",
    };
  const deviations = values.map((v) => v - mean);
  const squared = deviations.map((d) => d * d);
  const sumSquared = squared.reduce((s, v) => s + v, 0);
  const denom = isSample ? n - 1 : n;
  const variance = sumSquared / denom;
  const sd = Math.sqrt(variance);
  const cv = sd / Math.abs(mean);
  return { n, values, mean, deviations, squared, sumSquared, variance, sd, cv, isSample };
}

function fmt(n: number, dp = 4): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) return n.toExponential(3);
  return parseFloat(n.toFixed(dp)).toString();
}

function pct(cv: number, dp = 2): string {
  return `${(cv * 100).toFixed(dp)}%`;
}

function classifyCV(cv: number): string {
  const p = cv * 100;
  if (p < 10) return "Low variability";
  if (p < 30) return "Moderate variability";
  return "High variability";
}

/* ---------------- CV comparison chart ---------------- */

function CVChart({
  bars,
}: {
  bars: { label: string; cv: number; color?: string }[];
}) {
  const width = 640;
  const rowH = 56;
  const padL = 140;
  const padR = 80;
  const padT = 20;
  const padB = 30;
  const height = padT + padB + bars.length * rowH;
  const iw = width - padL - padR;
  const maxCV = Math.max(...bars.map((b) => b.cv), 0.3);
  const xTo = (v: number) => padL + (v / maxCV) * iw;

  const gridPct = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxCV);

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Coefficient of variation comparison bar chart"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
      >
        {/* Grid lines */}
        {gridPct.map((g, i) => (
          <g key={i}>
            <line
              x1={xTo(g)}
              x2={xTo(g)}
              y1={padT}
              y2={height - padB}
              stroke="var(--color-border)"
              strokeWidth={1}
              opacity={0.35}
            />
            <text
              x={xTo(g)}
              y={height - padB + 16}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-muted-foreground)"
            >
              {(g * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        {/* Bars */}
        {bars.map((b, i) => {
          const y = padT + i * rowH + 12;
          const barH = rowH - 24;
          const w = Math.max(2, xTo(b.cv) - padL);
          return (
            <g key={i}>
              <text
                x={padL - 8}
                y={y + barH / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fill="var(--color-foreground)"
              >
                {b.label}
              </text>
              <rect
                x={padL}
                y={y}
                width={w}
                height={barH}
                rx={6}
                fill={b.color ?? "var(--color-primary)"}
                opacity={0.85}
              />
              <text
                x={padL + w + 6}
                y={y + barH / 2}
                dominantBaseline="middle"
                fontSize={12}
                fill="var(--color-foreground)"
                fontWeight={600}
              >
                {pct(b.cv)}
              </text>
            </g>
          );
        })}

        {/* Axis */}
        <line
          x1={padL}
          x2={width - padR}
          y1={height - padB}
          y2={height - padB}
          stroke="var(--color-foreground)"
          strokeWidth={1}
          opacity={0.6}
        />
      </svg>
    </div>
  );
}

/* ---------------- Page ---------------- */

type Mode = "single" | "compare";

function CVPage() {
  const [mode, setMode] = useState<Mode>("single");
  const [isSample, setIsSample] = useState(true);

  const [inputA, setInputA] = useState("46, 69, 32, 60, 52, 41");
  const [inputB, setInputB] = useState("2.1, 2.5, 2.3, 2.7, 2.4, 2.2");
  const [labelA, setLabelA] = useState("Dataset A");
  const [labelB, setLabelB] = useState("Dataset B");

  const [resA, setResA] = useState<OneResult | null>(null);
  const [resB, setResB] = useState<OneResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setResA(null);
    setResB(null);
    setNotice(null);

    const pa = parseDataset(inputA);
    if (pa.invalid.length)
      return setErr(`${labelA} — "${pa.invalid[0]}" is not a valid number.`);
    if (pa.values.length === 0) return setErr(`Enter numbers in ${labelA}.`);
    const rA = computeCV(pa.values, isSample);
    if ("error" in rA) return setErr(`${labelA}: ${rA.error}`);
    setResA(rA);

    let cleaned = pa.cleaned;

    if (mode === "compare") {
      const pb = parseDataset(inputB);
      if (pb.invalid.length)
        return setErr(`${labelB} — "${pb.invalid[0]}" is not a valid number.`);
      if (pb.values.length === 0) return setErr(`Enter numbers in ${labelB}.`);
      const rB = computeCV(pb.values, isSample);
      if ("error" in rB) return setErr(`${labelB}: ${rB.error}`);
      setResB(rB);
      cleaned += pb.cleaned;
    }

    if (cleaned > 0) {
      setNotice(
        `Cleaned ${cleaned} value${cleaned === 1 ? "" : "s"} — stripped currency symbols, thousand separators or stray punctuation.`,
      );
    }
  };

  const clear = () => {
    setInputA("");
    setInputB("");
    setResA(null);
    setResB(null);
    setErr(null);
    setNotice(null);
  };

  const stepsFor = (label: string, r: OneResult): Step[] => {
    const denomLabel = r.isSample ? "n − 1" : "n";
    const denomVal = r.isSample ? r.n - 1 : r.n;
    const sdSymbol = r.isSample ? "s" : "σ";
    return [
      {
        title: `${label} — Compute the mean`,
        body: (
          <>
            <MathNote>Add every value, then divide by the count</MathNote>
            <MathLine>x̄ = Σx / n</MathLine>
            <MathLine>x̄ = ({r.values.slice(0, 10).map(fmt).join(" + ")}{r.n > 10 ? " + …" : ""}) / {r.n}</MathLine>
            <MathLine>x̄ = {fmt(r.mean)}</MathLine>
          </>
        ),
      },
      {
        title: `${label} — Compute the ${r.isSample ? "sample" : "population"} standard deviation`,
        body: (
          <>
            <MathNote>
              Square each deviation from the mean, sum them, divide by {denomLabel}, then take the square root
            </MathNote>
            <MathLine>{sdSymbol} = √( Σ(xᵢ − x̄)² / {denomLabel} )</MathLine>
            <MathLine>Σ(xᵢ − x̄)² = {fmt(r.sumSquared)}</MathLine>
            <MathLine>variance = {fmt(r.sumSquared)} / {denomVal} = {fmt(r.variance)}</MathLine>
            <MathLine>{sdSymbol} = √{fmt(r.variance)} = {fmt(r.sd)}</MathLine>
          </>
        ),
      },
      {
        title: `${label} — Compute the coefficient of variation`,
        body: (
          <>
            <MathNote>Divide the standard deviation by the (absolute) mean, then convert to a percentage</MathNote>
            <MathLine>CV = {sdSymbol} / |x̄| × 100%</MathLine>
            <MathLine>CV = {fmt(r.sd)} / {fmt(Math.abs(r.mean))} × 100%</MathLine>
            <MathLine>CV = {pct(r.cv)}</MathLine>
            <MathNote>{classifyCV(r.cv)}</MathNote>
          </>
        ),
      },
    ];
  };


  const steps: Step[] = useMemo(() => {
    if (!resA) return [];
    const s: Step[] = [...stepsFor(mode === "compare" ? labelA : "Dataset", resA)];
    if (mode === "compare" && resB) s.push(...stepsFor(labelB, resB));
    if (mode === "compare" && resB) {
      const more = resA.cv > resB.cv ? labelA : resB.cv > resA.cv ? labelB : "neither (tied)";
      s.push({
        title: "Compare relative variability",
        body: (
          <>
            <MathLine>
              CV<sub>{labelA}</sub> = {pct(resA.cv)} &nbsp; CV<sub>{labelB}</sub> = {pct(resB.cv)}
            </MathLine>
            <MathNote>
              <strong>{more}</strong> has the higher coefficient of variation, so it is
              relatively more variable — regardless of the raw means or units.
            </MathNote>
          </>
        ),
      });
    }
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resA, resB, mode, labelA, labelB]);

  const summary = useMemo(() => {
    if (!resA) return "";
    const lines: string[] = [];
    const pushOne = (label: string, r: OneResult) => {
      lines.push(`${label}:`);
      lines.push(`  n = ${r.n}`);
      lines.push(`  mean = ${fmt(r.mean)}`);
      lines.push(`  ${r.isSample ? "sample" : "population"} SD = ${fmt(r.sd)}`);
      lines.push(`  CV = ${pct(r.cv)} (${classifyCV(r.cv)})`);
    };
    pushOne(mode === "compare" ? labelA : "Dataset", resA);
    if (mode === "compare" && resB) {
      pushOne(labelB, resB);
      const more = resA.cv > resB.cv ? labelA : resB.cv > resA.cv ? labelB : "neither";
      lines.push(`Relatively more variable: ${more}`);
    }
    return lines.join("\n");
  }, [resA, resB, mode, labelA, labelB]);

  const chartBars = useMemo(() => {
    if (!resA) return [];
    if (mode === "single") return [{ label: "Dataset", cv: resA.cv }];
    if (!resB) return [{ label: labelA, cv: resA.cv }];
    return [
      { label: labelA, cv: resA.cv },
      { label: labelB, cv: resB.cv, color: "var(--color-accent, var(--color-primary))" },
    ];
  }, [resA, resB, mode, labelA, labelB]);
const CV_GUIDE: GuideCardItem[] = [
  {
    key: "what",
    title: "1. What CV measures — spread relative to the mean",
    explain:
      "The coefficient of variation is the standard deviation expressed as a percentage of the mean. Because dividing by the mean cancels the units, CV is a unit-free measure of relative spread — two datasets on completely different scales can be compared directly.",
    formula: <>CV = σ / |x̄| × 100%</>,
    legend: [
      { sym: "σ", def: "standard deviation" },
      { sym: "x̄", def: "arithmetic mean" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 110" className="w-full max-w-[220px]" aria-hidden>
          <line x1="20" y1="80" x2="200" y2="80" className="stroke-border" />
          <line x1="110" y1="30" x2="110" y2="90" strokeDasharray="3 3" className="stroke-primary" />
          <text x="114" y="26" fontSize="9" className="fill-primary">x̄</text>
          <line x1="80" y1="70" x2="140" y2="70" className="stroke-foreground" />
          <line x1="80" y1="66" x2="80" y2="74" className="stroke-foreground" />
          <line x1="140" y1="66" x2="140" y2="74" className="stroke-foreground" />
          <text x="110" y="62" fontSize="9" textAnchor="middle" className="fill-foreground">σ</text>
          <text x="110" y="102" fontSize="10" textAnchor="middle" className="fill-primary font-semibold">CV = σ / x̄</text>
        </svg>
      </div>
    ),
    example: {
      given: "x̄ = 250, σ = 12",
      substitute: "CV = 12 / 250 × 100%",
      answer: "CV = 4.8%",
    },
  },
  {
    key: "compare",
    title: "2. Why CV wins for cross-scale comparison",
    explain:
      "Standard deviation carries the units of the data, so raw SD comparisons across different scales are meaningless. CV strips the units and puts every dataset on a common percentage footing — the one with the higher CV is the more variable relative to its own average.",
    formula: <>higher CV ⇒ relatively more variable (regardless of units)</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 220 130" className="w-full max-w-[220px]" aria-hidden>
          <text x="10" y="30" fontSize="10" className="fill-foreground">Stocks</text>
          <rect x="70" y="20" width="30" height="14" fill="rgba(59,130,246,0.6)" className="stroke-primary" />
          <text x="105" y="32" fontSize="10" className="fill-primary">4.8%</text>
          <text x="10" y="70" fontSize="10" className="fill-foreground">Babies</text>
          <rect x="70" y="60" width="80" height="14" fill="rgba(59,130,246,0.6)" className="stroke-primary" />
          <text x="155" y="72" fontSize="10" className="fill-primary">12.5%</text>
          <line x1="70" y1="90" x2="200" y2="90" className="stroke-border" />
          <text x="135" y="110" fontSize="9" textAnchor="middle" className="fill-muted-foreground">shared % axis — units gone</text>
        </svg>
      </div>
    ),
    example: {
      given: "stock σ=$12/x̄=$250 · baby σ=0.4kg/x̄=3.2kg",
      substitute: "CV: 4.8% vs 12.5%",
      answer: "newborn weights are relatively more variable",
    },
  },
  {
    key: "divisor",
    title: "3. Sample (÷ n − 1) vs population (÷ n) SD",
    explain:
      "The CV toggle switches which standard deviation goes in the numerator. Use sample SD (Bessel's correction, ÷ n − 1) for the usual case where the data is a sample from a larger population; use population SD (÷ n) only when the data really is the entire population.",
    formula: (
      <>
        sample: σ = √(Σ(x − x̄)² / (n − 1)){"\n"}
        population: σ = √(Σ(x − x̄)² / n)
      </>
    ),
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-primary/60 bg-primary/10 p-3">
            <div className="font-semibold text-primary">Sample</div>
            <div className="mt-1 font-serif italic">÷ (n − 1)</div>
            <div className="mt-1 text-[10px] text-muted-foreground">default</div>
          </div>
          <div className="rounded-xl border border-border/60 p-3">
            <div className="font-semibold text-foreground">Population</div>
            <div className="mt-1 font-serif italic">÷ n</div>
            <div className="mt-1 text-[10px] text-muted-foreground">whole group</div>
          </div>
        </div>
      </div>
    ),
    example: {
      given: "same numerator, n = 6",
      substitute: "sample divides by 5, population by 6",
      answer: "sample CV slightly larger",
    },
  },
  {
    key: "invalid",
    title: "4. When CV isn't meaningful",
    explain:
      "CV is only sensible on ratio-scale data that is strictly positive: mass, income, length, time, counts. It breaks down when the mean is near zero, the data crosses zero, or the scale has no true zero (Celsius, IQ, pH, calendar years).",
    formula: <>use CV only on positive, ratio-scale data</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4 text-xs">
        <div className="w-full space-y-1 text-center">
          <div className="rounded-lg bg-primary/10 py-1 text-primary">✓ mass · income · length · time · counts</div>
          <div className="rounded-lg bg-destructive/15 py-1 text-destructive">✗ mean ≈ 0</div>
          <div className="rounded-lg bg-destructive/15 py-1 text-destructive">✗ data crosses zero</div>
          <div className="rounded-lg bg-destructive/15 py-1 text-destructive">✗ °C, °F, IQ, pH, years</div>
        </div>
      </div>
    ),
    example: {
      given: "temperatures 18°C, 22°C, 20°C (x̄ = 20)",
      substitute: "same data in °F: x̄ = 68 → CV changes",
      answer: "not a real measure of variability",
    },
  },
];


  return (
    <MathCalcPage
      name="Coefficient of Variation Calculator"
      tagline="Compute the coefficient of variation (CV = σ / mean × 100%) for a single dataset, or compare two datasets on different scales to see which is relatively more variable."
      extras={
        <>
          <CalcSection title="Coefficient of variation explained, step by step">
            <p>
              CV expresses the standard deviation as a percentage of the mean, so it stays comparable across datasets on completely different scales. Each card below walks through one piece of the workflow this calculator runs.
            </p>
            <GuideCards items={CV_GUIDE} />
          </CalcSection>

<CalcSection title="Rough interpretation bands">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="py-2 pr-4">CV range</th>
                    <th className="py-2 pr-4">Label</th>
                    <th className="py-2">Typical setting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="py-2 pr-4 tabular-nums">&lt; 10%</td>
                    <td className="py-2 pr-4">Low variability</td>
                    <td className="py-2">Lab measurements, calibrated instruments.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 tabular-nums">10% – 30%</td>
                    <td className="py-2 pr-4">Moderate variability</td>
                    <td className="py-2">Business KPIs, most survey data.</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 tabular-nums">&gt; 30%</td>
                    <td className="py-2 pr-4">High variability</td>
                    <td className="py-2">Financial returns, biological counts, network latency.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              These bands are conventions, not laws. Always compare to what is
              normal for your field.
            </p>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Comparing SDs across different units.</strong> Convert
                to CV first, then compare.
              </li>
              <li>
                <strong>Using CV when the mean can be zero or negative.</strong>{" "}
                The formula divides by the mean; that step must make sense.
              </li>
              <li>
                <strong>Mixing sample and population SD.</strong> Pick one
                convention for all datasets you're comparing.
              </li>
              <li>
                <strong>Reading CV as an absolute quality score.</strong> A CV
                of 15% is "high" in a physics lab and "low" for daily stock
                returns.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Single-dataset mode — mean, standard deviation and CV as a percentage",
                "Compare-two-datasets mode — side-by-side CV even when means and units differ",
                "Population (÷ N) or sample (÷ N − 1) standard deviation toggle",
                "Bar chart comparing CV values with a shared percentage axis",
                "Full step-by-step working: mean, squared deviations, SD and the CV formula",
                "Automatic classification — low / moderate / high variability",
                "Copy the summary or download the whole result panel as an image",
              ]}
            />
          </CalcSection>


          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What counts as a 'high' coefficient of variation?",
                  a: (
                    <p>
                      Common rules of thumb: below 10% is low, 10–30% is
                      moderate, above 30% is high. But it is field-dependent —
                      a 5% CV is unacceptable for some lab assays and impressive
                      for equity returns.
                    </p>
                  ),
                },
                {
                  q: "When is CV NOT meaningful?",
                  a: (
                    <p>
                      When the mean is near zero, the data crosses zero, or the
                      variable isn't on a ratio scale (e.g. temperature in
                      Celsius, IQ, pH). In those cases dividing by the mean
                      doesn't give a real measure of relative spread.
                    </p>
                  ),
                },
                {
                  q: "Why is CV shown as a percentage?",
                  a: (
                    <p>
                      Multiplying by 100 turns σ/x̄ into a readable percentage —
                      "CV = 12%" is easier to grasp and easier to communicate
                      than "0.12".
                    </p>
                  ),
                },
                {
                  q: "Which datasets should I use CV to compare?",
                  a: (
                    <p>
                      Any two (or more) datasets measured on positive ratio
                      scales — different units, different magnitudes, doesn't
                      matter. The whole point of CV is that it makes those
                      comparisons fair.
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
                  to: "/calculators/math/standard-deviation-calculator",
                  label: "Standard Deviation Calculator",
                },
                { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
                { to: "/calculators/math/mean-median-mode-calculator", label: "Mean, Median, Mode Calculator" },
                { to: "/calculators/math/correlation-calculator", label: "Correlation Coefficient Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="inline-flex rounded-full border border-border bg-secondary/40 p-1 text-sm">
          {(["single", "compare"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 font-medium transition ${
                mode === m
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "single" ? "Single dataset" : "Compare two datasets"}
            </button>
          ))}
        </div>

        {/* Population / sample toggle */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Standard deviation:</span>
          <div className="inline-flex rounded-full border border-border bg-secondary/40 p-1">
            <button
              type="button"
              onClick={() => setIsSample(false)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                !isSample
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Population (÷ N)
            </button>
            <button
              type="button"
              onClick={() => setIsSample(true)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                isSample
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sample (÷ N − 1)
            </button>
          </div>
        </div>

        {mode === "single" ? (
          <Field
            label="Values (comma, space or new-line separated)"
            htmlFor="dataA"
            hint="e.g. 46, 69, 32, 60, 52, 41"
          >
            <textarea
              id="dataA"
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="46, 69, 32, 60, 52, 41"
            />
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <input
                type="text"
                value={labelA}
                onChange={(e) => setLabelA(e.target.value || "Dataset A")}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Label (e.g. Stock returns)"
              />
              <Field label={`${labelA} values`} htmlFor="dataA" hint="One dataset per side">
                <textarea
                  id="dataA"
                  value={inputA}
                  onChange={(e) => setInputA(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="46, 69, 32, 60, 52, 41"
                />
              </Field>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={labelB}
                onChange={(e) => setLabelB(e.target.value || "Dataset B")}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Label (e.g. Newborn weights)"
              />
              <Field label={`${labelB} values`} htmlFor="dataB" hint="Different scale is fine">
                <textarea
                  id="dataB"
                  value={inputB}
                  onChange={(e) => setInputB(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="2.1, 2.5, 2.3, 2.7, 2.4, 2.2"
                />
              </Field>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={compute}>Calculate</PrimaryButton>
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
      {notice && (
        <div className="mt-2 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
          {notice}
        </div>
      )}

      {resA && (
        <div className="mt-6 space-y-4">
          <ResultActions
            filename="coefficient-of-variation-result"
            captureRef={resultRef}
            getCopyText={() => summary}
          />
          <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
            {mode === "single" ? (
              <ResultBox
                label="Coefficient of variation"
                value={<>CV = {pct(resA.cv)}</>}
                note={
                  <>
                    <div>{classifyCV(resA.cv)}</div>
                    <div className="mt-1 text-xs">
                      mean = {fmt(resA.mean)} · {resA.isSample ? "sample" : "population"} σ ={" "}
                      {fmt(resA.sd)} · n = {resA.n}
                    </div>
                  </>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <ResultBox
                  label={`${labelA} — CV`}
                  value={<>{pct(resA.cv)}</>}
                  note={
                    <>
                      <div>{classifyCV(resA.cv)}</div>
                      <div className="mt-1 text-xs">
                        mean = {fmt(resA.mean)} · σ = {fmt(resA.sd)} · n = {resA.n}
                      </div>
                    </>
                  }
                />
                {resB && (
                  <ResultBox
                    label={`${labelB} — CV`}
                    value={<>{pct(resB.cv)}</>}
                    note={
                      <>
                        <div>{classifyCV(resB.cv)}</div>
                        <div className="mt-1 text-xs">
                          mean = {fmt(resB.mean)} · σ = {fmt(resB.sd)} · n = {resB.n}
                        </div>
                      </>
                    }
                  />
                )}
              </div>
            )}

            {mode === "compare" && resB && (
              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 text-sm">
                <strong>
                  {resA.cv > resB.cv
                    ? labelA
                    : resB.cv > resA.cv
                      ? labelB
                      : "Neither (tied)"}
                </strong>{" "}
                is relatively more variable — its coefficient of variation is
                higher, even though the raw means and units differ.
              </div>
            )}

            {chartBars.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
                <div className="mb-2 text-sm font-semibold text-foreground">
                  CV comparison
                </div>
                <CVChart bars={chartBars} />
                <div className="mt-2 text-xs text-muted-foreground">
                  Bars share a common percentage axis, so longer bar = relatively
                  more variable regardless of units.
                </div>
              </div>
            )}

            <StepsToggle steps={steps} />
          </div>
        </div>
      )}
    </MathCalcPage>
  );
}
