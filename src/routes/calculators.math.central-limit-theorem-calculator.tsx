import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  PrimaryButton,
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

/* ---------------- Small diagrams for the CLT guide cards ---------------- */

function BellDiagram({ narrow = false, label }: { narrow?: boolean; label: string }) {
  const W = 260, H = 100;
  const cx = W / 2;
  const sd = narrow ? 20 : 45;
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 3) {
    const z = (x - cx) / sd;
    const y = H - 10 - 70 * Math.exp(-0.5 * z * z);
    pts.push(`${x},${y}`);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      <polyline points={pts.join(" ")} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      <line x1={cx} y1={20} x2={cx} y2={H - 10} stroke="var(--color-primary)" strokeDasharray="3 3" opacity={0.6} />
      <text x={cx} y={14} textAnchor="middle" fontSize={10} fill="var(--color-foreground)">μ</text>
      <text x={W / 2} y={H - 1} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">{label}</text>
    </svg>
  );
}

function SkewedThenBellDiagram() {
  const W = 260, H = 110;
  // left: skewed population; right: bell of sample means
  const skew: string[] = [];
  for (let x = 0; x <= 110; x += 3) {
    const y = H - 12 - 70 * Math.exp(-x / 25);
    skew.push(`${x + 5},${y}`);
  }
  const bell: string[] = [];
  const cx = 200;
  for (let x = 150; x <= 250; x += 3) {
    const z = (x - cx) / 15;
    const y = H - 12 - 70 * Math.exp(-0.5 * z * z);
    bell.push(`${x},${y}`);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Skewed population becomes bell-shaped sampling distribution">
      <polyline points={skew.join(" ")} fill="none" stroke="var(--color-muted-foreground)" strokeWidth={2} />
      <polyline points={bell.join(" ")} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      <text x={60} y={12} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">population</text>
      <text x={200} y={12} textAnchor="middle" fontSize={10} fill="var(--color-primary)">sample means</text>
      <path d="M 120 55 L 145 55" stroke="var(--color-foreground)" strokeWidth={1} markerEnd="url(#arr-clt)" />
      <defs>
        <marker id="arr-clt" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--color-foreground)" />
        </marker>
      </defs>
      <text x={W / 2} y={H - 1} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">any shape → Normal(μ, σ/√n)</text>
    </svg>
  );
}

function ShrinkingSEDiagram() {
  const W = 260, H = 110;
  const cx = W / 2;
  const sds = [55, 30, 16];
  const colors = ["var(--color-muted-foreground)", "var(--color-primary)", "var(--color-primary)"];
  const labels = ["n=4", "n=16", "n=64"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sampling distribution narrows as n grows">
      {sds.map((sd, i) => {
        const pts: string[] = [];
        for (let x = 0; x <= W; x += 3) {
          const z = (x - cx) / sd;
          const y = H - 15 - 70 * Math.exp(-0.5 * z * z);
          pts.push(`${x},${y}`);
        }
        return (
          <g key={i}>
            <polyline points={pts.join(" ")} fill="none" stroke={colors[i]} strokeWidth={i === 2 ? 2.5 : 1.5} opacity={0.5 + i * 0.25} />
            <text x={cx + sd + 6} y={30 + i * 14} fontSize={10} fill={colors[i]}>{labels[i]}</text>
          </g>
        );
      })}
      <text x={W / 2} y={H - 1} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">SE = σ/√n — bigger n, tighter spread</text>
    </svg>
  );
}

const CLT_GUIDE: GuideCardItem[] = [
  {
    key: "statement",
    title: "Central Limit Theorem Calculator (CLT)",
    explain:
      "Draw independent samples of size n from any population with a finite mean μ and finite standard deviation σ. As n grows, the distribution of the sample mean X̄ becomes approximately Normal — no matter what shape the original population has. That is the whole content of the CLT.",
    formula: <>X̄ ≈ Normal(μ, σ / √n) for large n</>,
    legend: [
      { sym: "X̄", def: "sample mean of one sample of size n" },
      { sym: "μ", def: "population mean" },
      { sym: "σ", def: "population standard deviation" },
      { sym: "n", def: "sample size (per sample)" },
    ],
    diagram: <SkewedThenBellDiagram />,
    example: {
      given: "Exponential population, μ = 3, σ = 3, samples of n = 30",
      substitute: "sampling distribution ≈ Normal(3, 3/√30)",
      answer: "≈ Normal(3, 0.548)",
    },
  },
  {
    key: "se",
    title: "Standard error of the mean",
    explain:
      "The standard deviation of the sampling distribution has its own name: the standard error. It shrinks by a factor of √n as sample size grows, so to halve the standard error you need four times as much data — not twice as much.",
    formula: <>SE = σ / √n</>,
    legend: [
      { sym: "SE", def: "standard deviation of the sample mean X̄" },
      { sym: "σ", def: "population standard deviation" },
      { sym: "n", def: "sample size" },
    ],
    diagram: <ShrinkingSEDiagram />,
    example: {
      given: "σ = 3, n = 30",
      substitute: "SE = 3 / √30 = 3 / 5.477",
      answer: "SE ≈ 0.548",
    },
  },
  {
    key: "n",
    title: "How sample size affects the bell shape",
    explain:
      "Two things happen at once as n increases: the sampling distribution narrows (because SE = σ/√n shrinks) and it becomes visibly more bell-shaped, losing the fingerprints of the population's original skew or bimodality.",
    formula: <>bigger n → narrower spread AND more Normal shape</>,
    legend: [
      { sym: "n small", def: "sampling distribution still carries the population's shape" },
      { sym: "n large", def: "sampling distribution ≈ Normal, regardless of source" },
    ],
    diagram: <BellDiagram narrow label="n large → tight bell around μ" />,
    example: {
      given: "σ = 3; compare n = 4 vs n = 64",
      substitute: "SE(4) = 3/2 = 1.50; SE(64) = 3/8 = 0.375",
      answer: "four times the n → half the SE",
    },
  },
  {
    key: "n30",
    title: "The n ≥ 30 rule of thumb",
    explain:
      "Textbooks quote n ≥ 30 as a rough guideline for when the CLT is 'good enough' to treat X̄ as Normal. Symmetric populations need much less (n = 10 often works). Heavily skewed populations may need n = 50 or more before the sampling distribution looks convincingly bell-shaped.",
    formula: <>n ≥ 30 is a guideline, not a hard cutoff</>,
    legend: [
      { sym: "symmetric", def: "small n is usually enough" },
      { sym: "skewed / bimodal", def: "needs a larger n before X̄ looks Normal" },
    ],
    diagram: <BellDiagram label="approach to Normal depends on skew" />,
    example: {
      given: "Uniform population, n = 12",
      substitute: "already looks approximately Normal",
      answer: "rule-of-thumb met",
    },
  },
];

export const Route = createFileRoute("/calculators/math/central-limit-theorem-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Central Limit Theorem Calculator & Simulator",
      title: "Central Limit Theorem Calculator & Simulator — See the CLT in Action",
      metaDescription:
        "Apply the CLT to any population: compute sampling mean, SE, and probabilities for sample means using the normal approximation.",
      canonicalUrl: "/calculators/math/central-limit-theorem-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Central Limit Theorem Calculator & Simulator", path: "/calculators/math/central-limit-theorem-calculator" },
      ],
      faqs: [
        {
          q: "What does the Central Limit Theorem actually say?",
          a: "If you take repeated random samples of size n from any population with a finite mean μ and standard deviation σ, the distribution of the sample means approaches a normal distribution as n grows, with mean μ and standard deviation σ/√n — regardless of the population's original shape.",
        },
        {
          q: "Does the CLT mean my data is normally distributed?",
          a: "No. The CLT is about the distribution of sample MEANS, not about the raw data. A heavily skewed population stays heavily skewed no matter how much data you collect — what becomes normal is the distribution you'd see if you kept drawing samples of size n and plotted each sample's mean.",
        },
        {
          q: "Is n ≥ 30 a hard rule?",
          a: "No — it's a rough guideline. For roughly symmetric populations even n = 10 works well. For heavily skewed populations (like the Exponential option here) you may need n = 50 or more before the sampling distribution looks convincingly normal. Move the slider and see for yourself.",
        },
        {
          q: "What is the standard error?",
          a: "The standard error (SE) is the standard deviation of the sampling distribution of the mean: SE = σ/√n. It shrinks as n grows, which is why bigger samples give more precise estimates of μ.",
        },
        {
          q: "Why do I need this if I already know the formula?",
          a: "Most people can quote the CLT but few have actually watched it happen. Seeing a bimodal or exponential population produce a bell-shaped distribution of sample means is what turns the theorem from a memorised fact into intuition.",
        },
        {
          q: "How many samples should I draw?",
          a: "The number of SAMPLES (each of size n) only sharpens the histogram of sample means — it does not itself invoke the CLT. Use 1,000–5,000 to get a smooth histogram. The variable that actually controls how normal the sampling distribution looks is n, the size of each sample.",
        },
      ],
    }),
  component: CLTPage,
});

/* ---------------- Populations ---------------- */

type PopKey = "uniform" | "exponential" | "bimodal";

interface PopInfo {
  key: PopKey;
  label: string;
  shortLabel: string;
  mean: number;
  sd: number;
  min: number;
  max: number;
  description: string;
  draw: () => number;
}

// deterministic-ish PRNG seed helper (still fast enough for 1000s of draws)
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller normal
function makeNormal(rng: () => number) {
  return (mu: number, sigma: number) => {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mu + sigma * z;
  };
}

function buildPopulations(seed: number): Record<PopKey, PopInfo> {
  const rng = mulberry32(seed);
  const normal = makeNormal(rng);

  // Uniform on [0, 10]: mean = 5, sd = √(100/12)
  const uniform: PopInfo = {
    key: "uniform",
    label: "Uniform on [0, 10]",
    shortLabel: "Uniform",
    mean: 5,
    sd: Math.sqrt(100 / 12),
    min: 0,
    max: 10,
    description:
      "Every value between 0 and 10 is equally likely. Nothing bell-shaped about it — the histogram is flat.",
    draw: () => rng() * 10,
  };

  // Exponential with rate λ = 1/3 → mean = 3, sd = 3. Cap at 20 for plotting.
  const lambda = 1 / 3;
  const exponential: PopInfo = {
    key: "exponential",
    label: "Exponential (rate λ = 1/3)",
    shortLabel: "Skewed (Exponential)",
    mean: 3,
    sd: 3,
    min: 0,
    max: 20,
    description:
      "Heavily right-skewed. Most values are small; a long thin tail stretches to the right. This is the hardest shape for the CLT.",
    draw: () => {
      const u = Math.max(rng(), 1e-12);
      return -Math.log(u) / lambda;
    },
  };

  // Bimodal: 50/50 mixture of N(2, 0.7) and N(8, 0.7). Two humps, nothing near the middle.
  // Mean = 5, Var = 0.7² + 0.5·0.5·(8-2)² = 0.49 + 9 = 9.49, sd ≈ 3.0806
  const bimodal: PopInfo = {
    key: "bimodal",
    label: "Bimodal (two humps at 2 and 8)",
    shortLabel: "Bimodal",
    mean: 5,
    sd: Math.sqrt(0.49 + 9),
    min: 0,
    max: 10,
    description:
      "Two separate clusters — no single peak in the middle. Something a simple 'mean and sd' summary can't describe.",
    draw: () => {
      const mu = rng() < 0.5 ? 2 : 8;
      const x = normal(mu, 0.7);
      return Math.min(10, Math.max(0, x));
    },
  };

  return { uniform, exponential, bimodal };
}

/* ---------------- Histogram ---------------- */

function binValues(values: number[], min: number, max: number, bins: number): number[] {
  const out = new Array<number>(bins).fill(0);
  const width = (max - min) / bins;
  if (width <= 0) return out;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v < min || v > max) continue;
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    out[idx] += 1;
  }
  return out;
}

interface HistogramProps {
  values: number[];
  min: number;
  max: number;
  bins?: number;
  color: string;
  title: string;
  subtitle?: string;
  overlayMean?: number;
  overlayMeanLabel?: string;
}

function Histogram({
  values, min, max, bins = 24, color, title, subtitle, overlayMean, overlayMeanLabel,
}: HistogramProps) {
  const width = 320;
  const height = 200;
  const padL = 34, padR = 8, padT = 10, padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const counts = binValues(values, min, max, bins);
  const maxCount = Math.max(1, ...counts);
  const bw = plotW / bins;

  const xToPx = (x: number) => padL + ((x - min) / (max - min)) * plotW;

  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-foreground">{title}</div>
      {subtitle && <div className="mb-2 text-[11px] text-muted-foreground">{subtitle}</div>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={title}>
        {/* axes */}
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="var(--color-border)" strokeWidth={1} />
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="var(--color-border)" strokeWidth={1} />

        {/* bars */}
        {counts.map((c, i) => {
          const h = (c / maxCount) * plotH;
          const x = padL + i * bw;
          const y = padT + plotH - h;
          return (
            <rect
              key={i}
              x={x + 0.5}
              y={y}
              width={Math.max(0, bw - 1)}
              height={h}
              fill={color}
              opacity={0.85}
            />
          );
        })}

        {/* mean overlay */}
        {overlayMean !== undefined && overlayMean >= min && overlayMean <= max && (
          <>
            <line
              x1={xToPx(overlayMean)} x2={xToPx(overlayMean)}
              y1={padT} y2={padT + plotH}
              stroke="var(--color-primary)" strokeWidth={2} strokeDasharray="4 3"
            />
            <text
              x={xToPx(overlayMean)} y={padT + 8}
              fontSize={9} textAnchor="middle" fill="var(--color-primary)"
            >
              {overlayMeanLabel ?? `μ=${overlayMean.toFixed(2)}`}
            </text>
          </>
        )}

        {/* x-axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const v = min + t * (max - min);
          const x = padL + t * plotW;
          return (
            <g key={t}>
              <line x1={x} y1={padT + plotH} x2={x} y2={padT + plotH + 3} stroke="var(--color-border)" />
              <text x={x} y={padT + plotH + 14} fontSize={9} textAnchor="middle" fill="var(--color-muted-foreground)">
                {v.toFixed(1)}
              </text>
            </g>
          );
        })}
        {/* y-axis label */}
        <text x={padL - 4} y={padT + 8} fontSize={9} textAnchor="end" fill="var(--color-muted-foreground)">count</text>
      </svg>
    </div>
  );
}

/* ---------------- Simulation ---------------- */

interface SimResult {
  pop: PopInfo;
  n: number;
  numSamples: number;
  populationDraws: number[];
  sampleMeans: number[];
  empiricalMeanOfMeans: number;
  empiricalSE: number;
  theoreticalMean: number;
  theoreticalSE: number;
}

function runSimulation(pop: PopInfo, n: number, numSamples: number): SimResult {
  // A sample of population draws for the LEFT histogram (independent of the sampling loop)
  const populationDraws: number[] = new Array(Math.min(5000, n * numSamples));
  for (let i = 0; i < populationDraws.length; i++) populationDraws[i] = pop.draw();

  const sampleMeans: number[] = new Array(numSamples);
  let grandSum = 0;
  for (let s = 0; s < numSamples; s++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += pop.draw();
    const m = sum / n;
    sampleMeans[s] = m;
    grandSum += m;
  }
  const empiricalMeanOfMeans = grandSum / numSamples;
  let sqSum = 0;
  for (let s = 0; s < numSamples; s++) {
    const d = sampleMeans[s] - empiricalMeanOfMeans;
    sqSum += d * d;
  }
  const empiricalSE = Math.sqrt(sqSum / numSamples);

  return {
    pop,
    n,
    numSamples,
    populationDraws,
    sampleMeans,
    empiricalMeanOfMeans,
    empiricalSE,
    theoreticalMean: pop.mean,
    theoreticalSE: pop.sd / Math.sqrt(n),
  };
}

const fmt = (x: number, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : "—");

/* ---------------- Page ---------------- */

function CLTPage() {
  const [popKey, setPopKey] = useState<PopKey>("exponential");
  const [n, setN] = useState(30);
  const [numSamples, setNumSamples] = useState(2000);
  const [seed, setSeed] = useState(1);
  const resultRef = useRef<HTMLDivElement>(null);

  const populations = useMemo(() => buildPopulations(seed), [seed]);
  const pop = populations[popKey];

  const sim = useMemo(
    () => runSimulation(pop, n, numSamples),
    [pop, n, numSamples],
  );

  // narrow window for the sample-means histogram so bell shape shows clearly
  const meansSpan = Math.max(4 * sim.theoreticalSE, 0.5);
  const meansMin = sim.theoreticalMean - meansSpan;
  const meansMax = sim.theoreticalMean + meansSpan;

  const steps: Step[] = useMemo(() => {
    const z = sim.theoreticalSE > 0 ? (sim.empiricalMeanOfMeans - pop.mean) / sim.theoreticalSE : 0;
    return [
      {
        title: "Sampling distribution mean: μₓ̄ = μ",
        body: (
          <>
            <MathNote>
              The Central Limit Theorem says the mean of the sampling distribution of X̄ equals the
              population mean, no matter the population's shape or the sample size n.
            </MathNote>
            <MathLine>μₓ̄ = μ</MathLine>
            <MathLine>μₓ̄ = {fmt(pop.mean)}</MathLine>
          </>
        ),
      },
      {
        title: "Standard error: σₓ̄ = σ / √n",
        body: (
          <>
            <MathNote>
              The spread of the sampling distribution — the standard error — shrinks as the sample
              size n grows, by a factor of √n.
            </MathNote>
            <MathLine>σₓ̄ = σ / √n</MathLine>
            <MathLine>σₓ̄ = {fmt(pop.sd)} / √{n}</MathLine>
            <MathLine>σₓ̄ = {fmt(pop.sd)} / {fmt(Math.sqrt(n))}</MathLine>
            <MathLine>σₓ̄ = {fmt(sim.theoreticalSE)}</MathLine>
          </>
        ),
      },
      {
        title: "Z-score of a sample mean: z = (x̄ − μ) / σₓ̄",
        body: (
          <>
            <MathNote>
              Once X̄ ≈ Normal(μ, σₓ̄), any particular sample mean x̄ can be converted to a
              z-score to see how far it sits from μ in standard-error units. Using this run's
              empirical mean of sample means as x̄:
            </MathNote>
            <MathLine>z = (x̄ − μ) / σₓ̄</MathLine>
            <MathLine>z = ({fmt(sim.empiricalMeanOfMeans)} − {fmt(pop.mean)}) / {fmt(sim.theoreticalSE)}</MathLine>
            <MathLine>z = {fmt(z)}</MathLine>
          </>
        ),
      },
      {
        title: "Probability: P(a ≤ X̄ ≤ b) = Φ(zᵦ) − Φ(zₐ)",
        body: (
          <>
            <MathNote>
              Because X̄ is approximately normal, probabilities for the sample mean falling in an
              interval [a, b] come from the standard normal CDF Φ, evaluated at the z-scores of the
              interval endpoints.
            </MathNote>
            <MathLine>zₐ = (a − μ) / σₓ̄, &nbsp; z_b = (b − μ) / σₓ̄</MathLine>
            <MathLine>P(a ≤ X̄ ≤ b) = Φ(z_b) − Φ(zₐ)</MathLine>
            <MathNote>
              With μ = {fmt(pop.mean)} and σₓ̄ = {fmt(sim.theoreticalSE)}, plug in any a and b and
              look up Φ in a standard normal table (or use the Z-score Calculator) to get the
              probability.
            </MathNote>
          </>
        ),
      },
      {
        title: "Compare theory to simulation",
        body: (
          <>
            <MathNote>
              This simulator's histogram of {numSamples.toLocaleString()} sample means (each of size
              n = {n}) should match the theoretical Normal(μ, σₓ̄) curve above:
            </MathNote>
            <MathLine>empirical mean of X̄ = {fmt(sim.empiricalMeanOfMeans)} vs. theoretical μ = {fmt(pop.mean)}</MathLine>
            <MathLine>empirical SD of X̄ = {fmt(sim.empiricalSE)} vs. theoretical σₓ̄ = {fmt(sim.theoreticalSE)}</MathLine>
          </>
        ),
      },
    ];
  }, [pop, n, numSamples, sim]);


  const summary = useMemo(() => {
    return [
      `Central Limit Theorem simulation`,
      `Population: ${pop.label}`,
      `μ = ${fmt(pop.mean)}, σ = ${fmt(pop.sd)}`,
      `Sample size n = ${n}, samples drawn = ${numSamples}`,
      `Theoretical SE = σ/√n = ${fmt(sim.theoreticalSE)}`,
      `Empirical mean of sample means = ${fmt(sim.empiricalMeanOfMeans)}`,
      `Empirical SD of sample means = ${fmt(sim.empiricalSE)}`,
    ].join("\n");
  }, [pop, n, numSamples, sim]);

  const rerun = () => setSeed((s) => s + 1);

  return (
    <MathCalcPage
      name="Central Limit Theorem Calculator & Simulator"
      tagline="Interactive CLT simulator — pick a Uniform, Skewed or Bimodal population, draw thousands of samples of any size n, and watch the sampling distribution of the mean turn into a bell curve regardless of the population's shape."
      extras={
        <>
          <CalcSection title="What is the Central Limit Theorem?">
            <p>
              The <strong>Central Limit Theorem (CLT)</strong> says that if you take repeated random
              samples of size <em>n</em> from any population with a finite mean <em>μ</em> and standard
              deviation <em>σ</em>, the distribution of the <em>sample means</em> approaches a normal
              distribution as <em>n</em> grows — with mean <em>μ</em> and standard deviation{" "}
              <em>σ / √n</em> (called the <strong>standard error</strong>). The astonishing part is the
              phrase "any population." The original data can be uniform, heavily skewed, bimodal, or
              anything else with a finite mean and variance — the distribution of sample means still
              becomes bell-shaped.
            </p>
            <p>
              That is exactly what the simulator above shows. The <strong>left histogram</strong> is a
              big sample of raw population values — clearly not normal for the Skewed or Bimodal
              choices. The <strong>right histogram</strong> is the distribution of{" "}
              <em>{numSamples.toLocaleString()}</em> sample means (each averaging <em>{n}</em> draws).
              Notice how it centres on μ and takes on a bell shape even though the raw population
              histogram on the left doesn't. That is the CLT.
            </p>
          </CalcSection>

          <CalcSection title="The CLT explained, piece by piece">
            <GuideCards items={CLT_GUIDE} />
          </CalcSection>

<CalcSection title="Why does the Central Limit Theorem matter?">
            <p>
              Almost every classical inference procedure you learn in a first stats course —
              confidence intervals for the mean, one-sample z-tests, t-tests, ANOVA, regression — leans
              on the assumption that the sample mean (or something like it) is approximately normally
              distributed. In real data the underlying population rarely is. The CLT is what lets those
              methods work anyway: as long as <em>n</em> is reasonably large, the SAMPLE MEAN behaves
              like it came from a normal distribution even when the raw data does not.
            </p>
            <p>
              This is why textbooks recite the rule of thumb <strong>n ≥ 30</strong>. Treat it as a
              rough guideline, not a strict cutoff. For a roughly symmetric population, n = 10 or n =
              15 is often more than enough. For a heavily skewed population like the Exponential option
              in the simulator, n = 30 is only a mediocre approximation and you may want n = 50 or n =
              100 to be comfortable. The simulator lets you check for yourself instead of trusting the
              rule of thumb.
            </p>
          </CalcSection>

          <CalcSection title="How sample size affects the sampling distribution">
            <p>
              Move the <strong>sample size (n)</strong> slider and watch two things happen at once in
              the right-hand histogram:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>It gets narrower.</strong> The standard error is σ/√n, so doubling n only
                shrinks the spread by a factor of √2 ≈ 1.41 — that is why halving the standard error
                requires four times as much data, not twice as much.
              </li>
              <li>
                <strong>It looks more normal.</strong> At n = 2 or n = 3 the sampling distribution
                still carries fingerprints of the population's shape — a right skew for the
                Exponential, a soft double peak for the Bimodal. By n ≈ 30 the shape is close to
                bell-shaped; by n ≈ 100 it is visually indistinguishable from a normal curve.
              </li>
            </ul>
            <p>
              The <strong>number of samples</strong> slider does something different — it does NOT
              invoke the CLT, it only sharpens the picture of the sampling distribution. Even a
              million samples of size n = 2 won't make the sampling distribution of the mean look
              normal for a skewed population. The variable that matters for the CLT is n.
            </p>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>"The CLT says my data becomes normal."</strong> No. The population's shape
                does not change no matter how much data you collect. The CLT is a statement about the
                distribution of sample MEANS, not raw data.
              </li>
              <li>
                <strong>Treating n ≥ 30 as a hard rule.</strong> It is a rough guideline. Heavily
                skewed populations may need much larger n; roughly symmetric ones need much less.
              </li>
              <li>
                <strong>Confusing "number of samples" with "sample size".</strong> Drawing more
                samples of a tiny size does not invoke the CLT — it only gives you a sharper picture
                of a sampling distribution that hasn't yet converged.
              </li>
              <li>
                <strong>Assuming the CLT applies to any statistic.</strong> The classical CLT is about
                the sample <em>mean</em>. Sample maxima, minima, ranges, and other statistics have
                their own (often non-normal) limit distributions.
              </li>
              <li>
                <strong>Ignoring finite variance.</strong> The CLT needs a finite population variance
                σ². Heavy-tailed distributions like a Cauchy distribution have infinite variance and
                the CLT does not apply — no matter how large n is, the sample mean does not converge
                to a normal.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
          <FeatureList
            items={[
              "Three population shapes (Uniform, Skewed / Exponential, Bimodal) chosen specifically to be visibly non-normal.",
              "Side-by-side histograms — raw population on the left, sample means on the right — so the CLT effect is obvious at a glance.",
              "Sample-size slider from n = 2 up to n = 200 with instant re-simulation so you can watch the sampling distribution narrow and become bell-shaped as n grows.",
              "Draw up to 5,000 samples in a single click — enough to give a smooth histogram of sample means without freezing the page.",
              "Empirical mean and SD of the sample means displayed alongside the theoretical values (μ and σ/√n) so you can verify the CLT numerically as well as visually.",
              "Re-run button reseeds the RNG so you can see how much the sample-means histogram wobbles from run to run — another intuition many stats textbooks skip.",
              "Show/hide step-by-step working that walks through the theorem, plugs in your population's μ and σ, computes σ/√n and compares it to the empirical SD from your simulation.",
              "Fast enough for 1,000+ draws without freezing the page — the entire loop is pure numeric JavaScript, no charting library overhead.",
            ]}
          />
          </CalcSection>




          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What does the Central Limit Theorem actually say?", a: <p>Draw repeated independent samples of size n from any population with finite mean μ and standard deviation σ. As n grows, the distribution of the sample means approaches Normal(μ, σ/√n), regardless of the population's shape.</p> },
                { q: "Does the CLT mean my raw data is normally distributed?", a: <p>No. The population's shape does not change. What becomes normal is the distribution of the sample MEAN if you repeated the study many times.</p> },
                { q: "Is n ≥ 30 a hard rule?", a: <p>No. It's a rough guideline. Symmetric populations need much smaller n; heavily skewed populations need larger n. The simulator lets you find a value of n that "looks bell enough" for your case.</p> },
                { q: "What is the standard error?", a: <p>The standard deviation of the sampling distribution of the mean: SE = σ/√n. It shrinks as n grows and is what confidence intervals for the mean are built from.</p> },
                { q: "How is this different from a plain calculator?", a: <p>Most CLT pages give you a number. This one is a simulator: it actually draws the samples and shows you the sampling distribution taking shape, which is the point of the theorem.</p> },
                { q: "How does 'Re-run' change anything?", a: <p>It reseeds the random-number generator so you can see how much a fresh set of samples wobbles around the theoretical curve. It's a quick way to see that the empirical picture is a noisy estimate of the theoretical one.</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/standard-error-calculator", label: "Standard Error Calculator" },
                { to: "/calculators/math/confidence-interval-calculator", label: "Confidence Interval Calculator" },
                { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
                { to: "/calculators/math/empirical-rule-calculator", label: "Empirical Rule (68-95-99.7) Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-4">
          <div>
            <div className="mb-2 text-sm font-semibold text-foreground">Population shape</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(populations) as PopKey[]).map((k) => {
                const p = populations[k];
                const active = k === popKey;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPopKey(k)}
                    className={
                      "rounded-xl border px-3 py-2 text-left text-sm transition " +
                      (active
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-border bg-background/40 text-muted-foreground hover:border-primary/40")
                    }
                  >
                    <div className="font-semibold text-foreground">{p.shortLabel}</div>
                    <div className="text-[11px] text-muted-foreground">μ={fmt(p.mean, 2)} · σ={fmt(p.sd, 2)}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{pop.description}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Sample size n = ${n}`} htmlFor="n" hint="Each drawn sample averages this many values.">
              <input
                id="n" type="range" min={2} max={200} step={1}
                value={n} onChange={(e) => setN(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </Field>
            <Field label={`Number of samples = ${numSamples.toLocaleString()}`} htmlFor="ns" hint="How many sample means to plot on the right.">
              <input
                id="ns" type="range" min={100} max={5000} step={100}
                value={numSamples} onChange={(e) => setNumSamples(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={rerun}>Re-run simulation</PrimaryButton>
          <button
            type="button"
            onClick={() => { setPopKey("exponential"); setN(30); setNumSamples(2000); setSeed((s) => s + 1); }}
            className="inline-flex items-center justify-center rounded-full border border-border bg-secondary/40 px-5 py-2.5 text-sm font-semibold text-foreground hover:border-primary/40"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <ResultActions filename="central-limit-theorem-simulation" captureRef={resultRef} getCopyText={() => summary} />
        <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <ResultBox
              label="Mean of sample means (empirical)"
              value={fmt(sim.empiricalMeanOfMeans)}
              note={<span className="text-xs">Theory: μ = {fmt(pop.mean)}</span>}
            />
            <ResultBox
              label="SD of sample means (empirical)"
              value={fmt(sim.empiricalSE)}
              note={<span className="text-xs">Theory: σ/√n = {fmt(pop.sd)} / √{n} = {fmt(sim.theoreticalSE)}</span>}
            />
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <div className="mb-3 text-sm font-semibold text-foreground">
              Population vs. sampling distribution
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Histogram
                values={sim.populationDraws}
                min={pop.min}
                max={pop.max}
                bins={30}
                color="var(--color-muted-foreground)"
                title={`Raw population — ${pop.shortLabel}`}
                subtitle={`${sim.populationDraws.length.toLocaleString()} draws, ${pop.label}`}
                overlayMean={pop.mean}
                overlayMeanLabel={`μ=${fmt(pop.mean, 2)}`}
              />
              <Histogram
                values={sim.sampleMeans}
                min={meansMin}
                max={meansMax}
                bins={30}
                color="var(--color-primary)"
                title={`Sample means — n = ${n}, ${numSamples.toLocaleString()} samples`}
                subtitle={`Should approach Normal(μ = ${fmt(pop.mean, 2)}, SE = ${fmt(sim.theoreticalSE, 3)})`}
                overlayMean={sim.empiricalMeanOfMeans}
                overlayMeanLabel={`X̄̄=${fmt(sim.empiricalMeanOfMeans, 2)}`}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              The left histogram shows the population you're sampling from — for the Skewed and
              Bimodal choices it is visibly non-normal. The right histogram shows the distribution of{" "}
              <strong>sample means</strong>. Even for those non-normal populations, the right
              histogram is centred at μ and takes on a bell shape — that is the Central Limit
              Theorem. Move the n slider up to make it narrower and more normal; slide it down to
              n = 2 or n = 3 to watch it break.
            </p>
          </div>

          <StepsToggle steps={steps} />
        </div>
      </div>
    </MathCalcPage>
  );
}
