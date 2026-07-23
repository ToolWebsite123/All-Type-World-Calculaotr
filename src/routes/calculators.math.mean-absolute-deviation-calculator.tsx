import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
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
import type { Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
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

export const Route = createFileRoute("/calculators/math/mean-absolute-deviation-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Mean Absolute Deviation Calculator",
      title: "Mean Absolute Deviation (MAD) Calculator",
      metaDescription:
        "Compute MAD with a per-value deviation table and a number-line visual showing every point's distance from the mean.",
      canonicalUrl: "/calculators/math/mean-absolute-deviation-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Mean Absolute Deviation Calculator", path: "/calculators/math/mean-absolute-deviation-calculator" },
      ],
      faqs: [
        {
          q: "What is mean absolute deviation?",
          a: "It's the average distance between each data value and the mean of the dataset. It measures how spread out the numbers are, using absolute values so positive and negative deviations don't cancel.",
        },
        {
          q: "Is MAD the same as standard deviation?",
          a: "No. Both measure spread, but standard deviation squares each deviation and then takes a square root, which makes it more sensitive to outliers. MAD just averages the absolute deviations, so it's more robust and easier to interpret in the original units.",
        },
        {
          q: "Does this calculator use the mean or the median?",
          a: "By default it computes MAD around the mean, which is the most common textbook definition. The 'MAD around the median' variant is described in the notes below.",
        },
        {
          q: "Why take the absolute value?",
          a: "Deviations from the mean always sum to zero. Taking absolute values turns every deviation into a positive distance so the average is meaningful.",
        },
        {
          q: "What units does MAD have?",
          a: "The same units as the original data — if the data is in kilograms, the MAD is in kilograms. That's one reason it's easier to explain than variance.",
        },
      ],
    }),
  component: MADPage,
});

/* ---------------- Guide diagrams ---------------- */

function MeanDotDiagram() {
  const data = [2, 4, 4, 4, 5, 5, 7, 9];
  const mean = 5;
  const w = 320, h = 130, padL = 20, padR = 20, padB = 30, padT = 20;
  const min = 0, max = 10;
  const xToPx = (v: number) => padL + ((v - min) / (max - min)) * (w - padL - padR);
  const y = h - padB;
  const counts = new Map<number, number>();
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Mean as balance point">
      <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--color-border)" strokeWidth={1.5} />
      {Array.from({ length: 11 }, (_, i) => (
        <g key={i}>
          <line x1={xToPx(i)} y1={y - 3} x2={xToPx(i)} y2={y + 3} stroke="var(--color-border)" />
          <text x={xToPx(i)} y={y + 16} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">{i}</text>
        </g>
      ))}
      {data.map((v, i) => {
        const c = counts.get(v) ?? 0;
        counts.set(v, c + 1);
        return <circle key={i} cx={xToPx(v)} cy={y - 10 - c * 10} r={5} fill="var(--color-primary)" opacity={0.85} />;
      })}
      <line x1={xToPx(mean)} y1={padT} x2={xToPx(mean)} y2={y} stroke="var(--color-foreground)" strokeDasharray="4 3" />
      <text x={xToPx(mean)} y={padT - 4} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>x̄ = 5</text>
    </svg>
  );
}

function AbsDevDiagram() {
  const data = [2, 4, 5, 7, 9];
  const mean = 5;
  const w = 320, h = 130, padL = 20, padR = 20, padB = 30, padT = 20;
  const min = 0, max = 10;
  const xToPx = (v: number) => padL + ((v - min) / (max - min)) * (w - padL - padR);
  const y = h - padB;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Absolute deviation from mean">
      <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--color-border)" strokeWidth={1.5} />
      <line x1={xToPx(mean)} y1={padT} x2={xToPx(mean)} y2={y} stroke="var(--color-foreground)" strokeDasharray="4 3" />
      {data.map((v, i) => (
        <g key={i}>
          <line x1={xToPx(v)} y1={y - 12 - i * 8} x2={xToPx(mean)} y2={y - 12 - i * 8}
            stroke="var(--color-primary)" strokeWidth={2} opacity={0.7} />
          <circle cx={xToPx(v)} cy={y - 12 - i * 8} r={4} fill="var(--color-primary)" />
          <text x={(xToPx(v) + xToPx(mean)) / 2} y={y - 16 - i * 8} textAnchor="middle" fontSize={9}
            fill="var(--color-foreground)">{Math.abs(v - mean)}</text>
        </g>
      ))}
      <text x={xToPx(mean)} y={padT - 4} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>x̄ = 5</text>
    </svg>
  );
}

function MADAverageDiagram() {
  const bars = [3, 1, 1, 1, 0, 0, 2, 4];
  const w = 320, h = 140, padL = 20, padR = 20, padT = 30, padB = 30;
  const iw = w - padL - padR, ih = h - padT - padB;
  const maxB = Math.max(...bars);
  const gap = 4;
  const bw = (iw - gap * (bars.length - 1)) / bars.length;
  const mad = bars.reduce((a, b) => a + b, 0) / bars.length;
  const madY = padT + ih - (mad / maxB) * ih;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="MAD as average of absolute deviations">
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="var(--color-border)" />
      {bars.map((b, i) => {
        const x = padL + i * (bw + gap);
        const barH = maxB ? (b / maxB) * ih : 0;
        return (
          <rect key={i} x={x} y={h - padB - barH} width={bw} height={barH} rx={2}
            fill="var(--color-primary)" opacity={0.6} />
        );
      })}
      <line x1={padL} y1={madY} x2={w - padR} y2={madY} stroke="var(--color-foreground)" strokeDasharray="4 3" strokeWidth={1.5} />
      <text x={w - padR} y={madY - 4} textAnchor="end" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>MAD = 1.5</text>
    </svg>
  );
}

function MADvsSDDiagram() {
  const w = 320, h = 140, padL = 20, padR = 20, padT = 30, padB = 30;
  const iw = w - padL - padR;
  const dists = [1, 2, 3, 4, 5];
  const mads = dists;
  const sds = dists.map((d) => d * d / 3);
  const maxV = Math.max(...sds);
  const gap = 6;
  const bw = (iw - gap * (dists.length - 1)) / dists.length / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="MAD grows linearly, SD grows more sharply">
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="var(--color-border)" />
      {dists.map((d, i) => {
        const x = padL + i * (bw * 2 + gap);
        const madH = (mads[i] / maxV) * (h - padT - padB);
        const sdH = (sds[i] / maxV) * (h - padT - padB);
        return (
          <g key={i}>
            <rect x={x} y={h - padB - madH} width={bw} height={madH} fill="var(--color-primary)" opacity={0.7} />
            <rect x={x + bw} y={h - padB - sdH} width={bw} height={sdH} fill="var(--color-foreground)" opacity={0.5} />
            <text x={x + bw} y={h - padB + 12} textAnchor="middle" fontSize={9} fill="var(--color-muted-foreground)">d={d}</text>
          </g>
        );
      })}
      <text x={padL} y={padT - 12} fontSize={10} fill="var(--color-primary)" fontWeight={600}>■ MAD contribution</text>
      <text x={padL + 130} y={padT - 12} fontSize={10} fill="var(--color-foreground)" fontWeight={600}>■ SD contribution (∝ d²)</text>
    </svg>
  );
}

/* ---------------- Guide ---------------- */

interface MADGuideItem extends GuideCardItem {}

const MAD_GUIDE: MADGuideItem[] = [
  {
    key: "mean",
    title: "1. Start with the mean (x̄)",
    explain:
      "MAD measures how far values sit from a chosen center. That center is the arithmetic mean — add every value, divide by how many there are. The mean is the balance point of the data.",
    formula: <>x̄ = (1/n) · Σ xᵢ</>,
    legend: [
      { sym: "x̄", def: "arithmetic mean" },
      { sym: "n", def: "number of values" },
      { sym: "xᵢ", def: "each value in the data set" },
    ],
    diagram: <MeanDotDiagram />,
    example: {
      given: "2, 4, 4, 4, 5, 5, 7, 9",
      substitute: "(2 + 4 + 4 + 4 + 5 + 5 + 7 + 9) / 8 = 40 / 8",
      answer: "x̄ = 5",
    },
  },
  {
    key: "absdev",
    title: "2. Absolute deviation of each value",
    explain:
      "For every value, measure its distance from the mean and drop the sign. Signed deviations always sum to zero (that's a property of the mean), so absolute values are what let you meaningfully average them.",
    formula: <>|xᵢ − x̄|</>,
    legend: [
      { sym: "|·|", def: "absolute value — drop the sign" },
      { sym: "xᵢ − x̄", def: "deviation from the mean" },
    ],
    diagram: <AbsDevDiagram />,
    example: {
      given: "x̄ = 5; values 2, 4, 5, 7, 9",
      substitute: "|2−5|, |4−5|, |5−5|, |7−5|, |9−5|",
      answer: "3, 1, 0, 2, 4",
    },
  },
  {
    key: "mad",
    title: "3. Average the absolute deviations",
    explain:
      "MAD itself is just the mean of those absolute deviations — total distance divided by the count. The result is in the same units as the original data, which makes it easy to interpret.",
    formula: <>MAD = (1/n) · Σ |xᵢ − x̄|</>,
    legend: [
      { sym: "MAD", def: "mean absolute deviation" },
      { sym: "Σ", def: "sum over all values" },
    ],
    diagram: <MADAverageDiagram />,
    example: {
      given: "|deviations| = 3, 1, 1, 1, 0, 0, 2, 4",
      substitute: "(3 + 1 + 1 + 1 + 0 + 0 + 2 + 4) / 8 = 12 / 8",
      answer: "MAD = 1.5",
    },
  },
  {
    key: "vs-sd",
    title: "4. Why MAD ≠ standard deviation",
    explain:
      "Standard deviation squares each deviation before averaging, then takes a square root. Squaring makes far-away points count much more, so SD is more sensitive to outliers. MAD grows linearly with distance — a point 4 units away contributes 4 to MAD but 16 to the SD sum-of-squares.",
    formula: <>MAD grows ∝ d · SD grows ∝ d²  (before the √)</>,
    legend: [
      { sym: "d", def: "distance from the mean" },
    ],
    diagram: <MADvsSDDiagram />,
    example: {
      given: "one point 4 units from the mean",
      substitute: "MAD contribution = 4;  SD sum-of-squares contribution = 16",
      answer: "SD reacts more strongly to outliers",
    },
  },
];

function MADPage() {
  const [input, setInput] = useState("2, 4, 4, 4, 5, 5, 7, 9");
  const [center, setCenter] = useState<"mean" | "median">("mean");
  const [result, setResult] = useState<null | {
    centerType: "mean" | "median";
    centerValue: number;
    mad: number;
    rows: { x: number; d: number; ad: number }[];
    note?: string;
  }>(null);
  const [madState, setMadState] = useState<null | {
    n: number;
    sum: number;
    mean: number;
    sorted: number[];
    median: number;
    centerType: "mean" | "median";
    centerValue: number;
    sym: string;
    rows: { x: number; d: number; ad: number }[];
    madSum: number;
    mad: number;
  }>(null);
  const [err, setErr] = useState<string | null>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    setMadState(null);
    const parsed = parseDataset(input);
    if (parsed.invalid.length > 0) {
      setErr(`Couldn't parse: ${parsed.invalid.slice(0, 5).join(", ")}`);
      return;
    }
    if (parsed.values.length < 2) {
      setErr("Enter at least 2 numbers.");
      return;
    }
    const n = parsed.values.length;
    const sum = parsed.values.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    // Median
    const sorted = [...parsed.values].sort((a, b) => a - b);
    const median =
      n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

    const centerType = center;
    const centerValue = centerType === "mean" ? mean : median;
    const sym = centerType === "mean" ? "x̄" : "med";

    const rows = parsed.values.map((x) => {
      const d = x - centerValue;
      return { x, d, ad: Math.abs(d) };
    });
    const madSum = rows.reduce((a, r) => a + r.ad, 0);
    const mad = madSum / n;

    setResult({ centerType, centerValue, mad, rows, note: cleanedNote(parsed.cleaned) ?? undefined });

    setMadState({ n, sum, mean, sorted, median, centerType, centerValue, sym, rows, madSum, mad });
  };


  const steps: Step[] = useMemo(() => {
    if (!madState) return [];
    const { n, sum, mean, sorted, median, centerType, centerValue, sym, rows, madSum, mad } = madState;
    return [
      {
        title: "Compute the mean",
        body: (
          <>
            <MathNote>Add every value, then divide by the count</MathNote>
            <MathLine>x̄ = (Σ xᵢ) / n</MathLine>
            <MathLine>Σ xᵢ = {rows.map((r) => fmt(r.x)).join(" + ")}</MathLine>
            <MathLine>Σ xᵢ = {fmt(sum)}</MathLine>
            <MathLine>x̄ = {fmt(sum)} / {n} = {fmt(mean)}</MathLine>
          </>
        ),
      },
      ...(centerType === "median"
        ? [
            {
              title: "Compute the median",
              body: (
                <>
                  <MathNote>Sort the values, then take the middle (or average the two middles)</MathNote>
                  <MathLine>sorted: {sorted.map(fmt).join(", ")}</MathLine>
                  <MathLine>med = {fmt(median)}</MathLine>
                </>
              ),
            },
          ]
        : []),
      {
        title: `Find each absolute deviation |xᵢ − ${sym}|`,
        body: (
          <>
            <MathNote>Subtract the {centerType} from each value, then drop the sign</MathNote>
            {rows.map((r, i) => (
              <MathLine key={i}>
                |{fmt(r.x)} − {fmt(centerValue)}| = {fmt(r.ad)}
              </MathLine>
            ))}
          </>
        ),
      },
      {
        title: "Sum the absolute deviations",
        body: (
          <>
            <MathNote>Add up every |xᵢ − {sym}| value</MathNote>
            <MathLine>Σ |xᵢ − {sym}| = {rows.map((r) => fmt(r.ad)).join(" + ")}</MathLine>
            <MathLine>Σ |xᵢ − {sym}| = {fmt(madSum)}</MathLine>
          </>
        ),
      },
      {
        title: "Divide by n",
        body: (
          <>
            <MathNote>MAD is the average of the absolute deviations</MathNote>
            <MathLine>MAD = (Σ |xᵢ − {sym}|) / n</MathLine>
            <MathLine>MAD = {fmt(madSum)} / {n}</MathLine>
            <MathLine>MAD = {fmt(mad)}</MathLine>
          </>
        ),
      },
    ];
  }, [madState]);

  return (
    <MathCalcPage
      name="Mean Absolute Deviation Calculator"
      tagline="Enter a list of numbers and get the mean absolute deviation, a per-value deviation table, and a number-line diagram showing every point's distance from the mean."
      extras={
        <>
          <CalcSection title="What is Mean Absolute Deviation?">
            <p>
              Mean absolute deviation (MAD) is the average distance between each value in a dataset
              and the mean of that dataset. It answers the question, "on average, how far are my
              values from the middle?" — in the same units as the original data.
            </p>
            <p>
              <strong>MAD vs standard deviation.</strong> Both measure spread, but standard
              deviation squares each deviation before averaging, which makes it more sensitive to
              outliers. MAD averages the raw absolute distances, so it stays in the original units
              and reacts to a far-away point in proportion to its actual distance — not the square
              of it.
            </p>
          </CalcSection>

          <CalcSection title="MAD explained, step by step">
            <p className="text-sm text-muted-foreground">
              Each concept below has a plain-English definition, its formula (with every symbol
              spelled out), a small diagram, and a worked example — all in one card so you never
              have to jump between sections to piece it together.
            </p>
            <GuideCards items={MAD_GUIDE} />
          </CalcSection>

          <CalcSection title="MAD around the median">
            <p>
              A common variant computes the mean absolute deviation around the <em>median</em>{" "}
              instead of the mean. Because the median is itself an outlier-resistant center, MAD
              around the median is even more robust: extreme values change it much less.
            </p>
            <p>
              <strong>Quick example.</strong> Dataset 1, 2, 3, 4, 100. Mean = 22, median = 3.
              MAD around the mean = (21 + 20 + 19 + 18 + 78) / 5 = 31.2. MAD around the median =
              (2 + 1 + 0 + 1 + 97) / 5 = 20.2 — a smaller, more representative spread for the
              typical value. This calculator uses the <strong>mean</strong> by default.
            </p>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Forgetting the absolute value.</strong> Signed deviations always sum to zero — that's a property of the mean, not a spread measurement.</li>
              <li><strong>Confusing MAD with variance or standard deviation.</strong> Variance is in squared units; SD is in the same units as MAD but is a different value.</li>
              <li><strong>Dividing by n − 1.</strong> Unlike sample SD, MAD has no Bessel correction — divide by n whether the data is a sample or the whole population.</li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Transparent per-value table — see the deviation and absolute deviation for every data point, not just the final MAD",
                "Number-line diagram plots each point relative to the mean with dashed lines showing the deviation distance visually",
                "Show/hide step-by-step working: mean, sum of |xᵢ − x̄|, final divide",
                "Cleans messy input — commas, tabs, currency symbols, thousand separators, brackets",
                "Explains MAD vs standard deviation and MAD around the median in plain language",
              ]}
            />
          </CalcSection>


          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "When should I report MAD instead of standard deviation?",
                  a: (
                    <p>
                      When your audience is non-technical, when a few outliers would exaggerate
                      standard deviation, or when you need a spread number in the original units
                      without the "square then square-root" round trip.
                    </p>
                  ),
                },
                {
                  q: "Can MAD ever be zero?",
                  a: (
                    <p>Yes — only when every value in the dataset is identical, so every deviation is 0.</p>
                  ),
                },
                {
                  q: "Is MAD always smaller than standard deviation?",
                  a: (
                    <p>
                      For most real datasets, yes. There's a rough rule of thumb: for a
                      normally-distributed dataset, MAD ≈ 0.7979 × σ.
                    </p>
                  ),
                },
                {
                  q: "Does the order of the numbers matter?",
                  a: <p>No. MAD depends only on the set of values, not their order.</p>,
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation" },
                { to: "/calculators/math/mean-median-mode-calculator", label: "Mean, Median, Mode & Range" },
                { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
                { to: "/calculators/math/outliers-calculator", label: "Outlier Detector" },
                { to: "/calculators/math/percentile-calculator", label: "Percentile & Quartile" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Data (comma, space or newline separated)"
          htmlFor="mad-data"
          hint="Paste from a spreadsheet or type by hand. Currency symbols and thousand separators are cleaned automatically."
        >
          <textarea
            id="mad-data"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
        <fieldset className="flex flex-wrap items-center gap-4">
          <legend className="mb-1 block text-sm font-medium text-foreground">Center</legend>
          {(["mean", "median"] as const).map((opt) => (
            <label key={opt} className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="mad-center"
                value={opt}
                checked={center === opt}
                onChange={() => setCenter(opt)}
                className="h-4 w-4 accent-primary"
              />
              <span className="capitalize">{opt}</span>
            </label>
          ))}
          <span className="text-xs text-muted-foreground">
            {center === "mean"
              ? "Standard MAD: distance from the arithmetic mean."
              : "Robust variant: distance from the median (less sensitive to outliers)."}
          </span>
        </fieldset>
        <div>
          <PrimaryButton onClick={compute}>Calculate MAD</PrimaryButton>
        </div>
      </div>

      {err && <ErrorBox message={err} />}
      {result && (
        <>
          <ResultBox
            label={
              result.centerType === "mean"
                ? "Mean Absolute Deviation (around the mean)"
                : "Mean Absolute Deviation (around the median)"
            }
            value={fmt(result.mad)}
            note={
              <>
                {result.centerType === "mean" ? "Mean" : "Median"} = {fmt(result.centerValue)} · n = {result.rows.length}
                {result.note ? <> · {result.note}</> : null}
              </>
            }
          />
          <MADDiagram rows={result.rows} center={result.centerValue} centerType={result.centerType} />
          <DeviationTable rows={result.rows} center={result.centerValue} centerType={result.centerType} mad={result.mad} />
        </>
      )}

      <StepsToggle steps={steps} />
    </MathCalcPage>
  );
}

function DeviationTable({
  rows,
  center,
  centerType,
  mad,
}: {
  rows: { x: number; d: number; ad: number }[];
  center: number;
  centerType: "mean" | "median";
  mad: number;
}) {
  const n = rows.length;
  const sumAd = rows.reduce((a, r) => a + r.ad, 0);
  const sym = centerType === "mean" ? "x̄" : "med";
  const sumSigned = rows.reduce((a, r) => a + r.d, 0);
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-secondary/40 text-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">Value (xᵢ)</th>
            <th className="px-3 py-2 text-right font-semibold tabular-nums">xᵢ − {sym}</th>
            <th className="px-3 py-2 text-right font-semibold tabular-nums">|xᵢ − {sym}|</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-background/40">
              <td className="px-3 py-2 tabular-nums">{fmt(r.x)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(r.d)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(r.ad)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border/60 bg-secondary/20 text-foreground">
            <td className="px-3 py-2 font-semibold">Sum</td>
            <td className="px-3 py-2 text-right tabular-nums">{fmt(sumSigned)}</td>
            <td className="px-3 py-2 text-right font-semibold tabular-nums">
              Σ = {fmt(sumAd)} · MAD = {fmt(sumAd)} / {n} = {fmt(mad)}
            </td>
          </tr>
          <tr className="bg-secondary/10 text-muted-foreground">
            <td className="px-3 py-2 text-xs">
              {centerType === "mean" ? "Mean" : "Median"} {sym} = {fmt(center)}
            </td>
            <td colSpan={2} className="px-3 py-2 text-right text-xs">
              {centerType === "mean"
                ? "Signed deviations from the mean always sum to 0 — that's why we take absolute values."
                : "Signed deviations from the median need not sum to 0, but absolute values still measure spread."}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function MADDiagram({
  rows,
  center,
  centerType,
}: {
  rows: { x: number; d: number; ad: number }[];
  center: number;
  centerType: "mean" | "median";
}) {
  const mean = center;
  const sym = centerType === "mean" ? "x̄" : "med";
  const xs = rows.map((r) => r.x);
  const lo = Math.min(...xs, mean);
  const hi = Math.max(...xs, mean);
  const pad = (hi - lo) * 0.1 || 1;
  const xMin = lo - pad;
  const xMax = hi + pad;
  const xR = xMax - xMin || 1;
  const W = 600;
  const H = 240;
  const PL = 30,
    PR = 30,
    PT = 30,
    PB = 40;
  const iw = W - PL - PR;
  const axisY = PT + (H - PT - PB) * 0.7;
  const sx = (v: number) => PL + ((v - xMin) / xR) * iw;

  // Stagger identical points vertically for readability.
  const counts = new Map<number, number>();
  const placed = rows.map((r) => {
    const k = Math.round(r.x * 1e6) / 1e6;
    const c = counts.get(k) ?? 0;
    counts.set(k, c + 1);
    return { ...r, offset: c };
  });

  // Ticks
  const tickCount = 6;
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(xMin + (i / tickCount) * xR);
  }

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-sm font-semibold text-muted-foreground">
        Each point's distance from the {centerType} ({sym} = {fmt(mean)})
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Number line showing each data point and its deviation from the ${centerType}`}
      >
        {/* Axis */}
        <line
          x1={PL}
          y1={axisY}
          x2={W - PR}
          y2={axisY}
          className="stroke-border"
          strokeWidth="1.5"
        />
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={sx(t)}
              y1={axisY - 4}
              x2={sx(t)}
              y2={axisY + 4}
              className="stroke-border"
            />
            <text
              x={sx(t)}
              y={axisY + 18}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px] font-serif italic"
            >
              {fmt(round(t, xR))}
            </text>
          </g>
        ))}

        {/* Center line */}
        <line
          x1={sx(mean)}
          y1={PT}
          x2={sx(mean)}
          y2={H - PB + 4}
          className="stroke-primary"
          strokeWidth="2"
        />
        <text
          x={sx(mean)}
          y={PT - 10}
          textAnchor="middle"
          className="fill-primary text-[11px] font-semibold"
        >
          {sym} = {fmt(mean)}
        </text>

        {/* Deviation connectors + points */}
        {placed.map((p, i) => {
          const px = sx(p.x);
          const py = axisY - 18 - (p.offset % 3) * 14;
          return (
            <g key={i}>
              <line
                x1={px}
                y1={py}
                x2={sx(mean)}
                y2={py}
                className="stroke-accent-foreground/50"
                strokeDasharray="3 3"
              />
              <line
                x1={px}
                y1={axisY}
                x2={px}
                y2={py}
                className="stroke-border"
              />
              <circle cx={px} cy={py} r="5" className="fill-primary" />
              <text
                x={px}
                y={py - 8}
                textAnchor="middle"
                className="fill-foreground text-[10px] font-serif italic"
              >
                {fmt(p.x)}
              </text>
              {p.ad > 0 && (
                <text
                  x={(px + sx(mean)) / 2}
                  y={py - 4}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px] font-serif italic"
                >
                  {fmt(p.ad)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">
        Solid vertical line: the {centerType}. Dashed segments: each value's absolute deviation |xᵢ − {sym}|.
        The average of those dashed lengths is the MAD.
      </p>
    </div>
  );
}


function round(v: number, range: number): number {
  if (range >= 100) return Math.round(v);
  if (range >= 10) return Math.round(v * 10) / 10;
  return Math.round(v * 100) / 100;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Object.is(n, -0)) n = 0;
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) return n.toExponential(4);
  return parseFloat(n.toPrecision(6)).toString();
}
