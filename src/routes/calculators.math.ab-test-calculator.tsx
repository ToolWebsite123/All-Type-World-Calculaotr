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
  type GuideCardItem,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import { normalCDF, normalInv } from "@/lib/math/p-value";
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

export const Route = createFileRoute("/calculators/math/ab-test-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "A/B Test Significance Calculator",
      title: "A/B Test Calculator — Conversion Rate Significance",
      metaDescription:
        "Run an A/B test on conversion rates with lift, z-statistic, p-value, confidence interval, and full working.",
      canonicalUrl: "/calculators/math/ab-test-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "A/B Test Significance Calculator", path: "/calculators/math/ab-test-calculator" },
      ],
      faqs: [
        {
          q: "What does 'statistically significant' actually mean?",
          a: "It means the difference between your two conversion rates is unlikely to be pure chance. At 95% confidence a significant result has a p-value below 0.05 — meaning there's less than a 5% probability of seeing a difference this large if the variant were really no better than the control.",
        },
        {
          q: "Is statistical significance the same as 'the variant is better'?",
          a: "No. Statistical significance says the difference is real. Practical significance asks whether the difference is big enough to matter. A 0.1% uplift on a huge sample can be highly significant statistically and completely worthless in dollars — always check both.",
        },
        {
          q: "One-tailed or two-tailed?",
          a: "Use two-tailed by default. It answers 'is the variant different from the control?' — which is what you actually want to know, because a variant that hurts is just as important to detect as one that helps. Use one-tailed only if you genuinely do not care about a negative outcome.",
        },
        {
          q: "How long should I run the test?",
          a: "Long enough to reach the sample size your minimum detectable effect requires — usually at least a full business cycle (7–14 days) to smooth out day-of-week and time-of-day effects. Stopping the moment p < 0.05 (peeking) inflates the false-positive rate; commit to a sample size before you start.",
        },
        {
          q: "Why report the p-value AND confidence intervals?",
          a: "The p-value gives a single yes/no verdict on the null hypothesis. The confidence intervals show the plausible range for each rate — if the two intervals barely overlap, the effect is likely real and roughly the size you're seeing. If they overlap heavily, the observed uplift is well within noise.",
        },
      ],
    }),
  component: ABTestPage,
});

/* ---------------- Math ---------------- */

type Tail = "two" | "one";
type Conf = 0.9 | 0.95 | 0.99;

interface ABResult {
  nA: number; xA: number; pA: number;
  nB: number; xB: number; pB: number;
  pPool: number;
  diff: number;         // pB - pA
  seDiff: number;       // standard error of the difference (pooled)
  z: number;            // z-statistic
  pValue: number;       // two- or one-tailed
  tail: Tail;
  conf: Conf;
  alpha: number;
  zCrit: number;
  significant: boolean;
  relativeUplift: number; // (pB - pA) / pA
  // Per-arm 1-α confidence intervals (Wald):
  ciA: [number, number];
  ciB: [number, number];
  seA: number;
  seB: number;
  // CI for the difference:
  ciDiff: [number, number];
}

function computeAB(
  nA: number, xA: number,
  nB: number, xB: number,
  tail: Tail, conf: Conf,
): ABResult | { error: string } {
  if (![nA, xA, nB, xB].every((v) => Number.isFinite(v))) return { error: "All four inputs must be numbers." };
  if (nA <= 0 || nB <= 0) return { error: "Visitor counts must be positive integers." };
  if (xA < 0 || xB < 0) return { error: "Conversion counts cannot be negative." };
  if (xA > nA) return { error: "Control conversions cannot exceed control visitors." };
  if (xB > nB) return { error: "Variant conversions cannot exceed variant visitors." };
  const pA = xA / nA;
  const pB = xB / nB;
  const pPool = (xA + xB) / (nA + nB);
  const seDiffSq = pPool * (1 - pPool) * (1 / nA + 1 / nB);
  const seDiff = Math.sqrt(seDiffSq);
  if (seDiff === 0) return { error: "Standard error is zero — one of the rates is 0% or 100% and matches the other exactly, so there is nothing to test." };
  const diff = pB - pA;
  const z = diff / seDiff;
  const alpha = 1 - conf;
  const pValue =
    tail === "two"
      ? 2 * (1 - normalCDF(Math.abs(z)))
      : z >= 0
        ? 1 - normalCDF(z)
        : normalCDF(z);
  const zCrit = tail === "two" ? normalInv(1 - alpha / 2) : normalInv(1 - alpha);
  const significant = pValue < alpha;

  // Per-arm Wald CIs (uses each arm's own SE, not the pooled one)
  const seA = Math.sqrt((pA * (1 - pA)) / nA);
  const seB = Math.sqrt((pB * (1 - pB)) / nB);
  const zCi = normalInv(1 - alpha / 2);
  const ciA: [number, number] = [
    Math.max(0, pA - zCi * seA),
    Math.min(1, pA + zCi * seA),
  ];
  const ciB: [number, number] = [
    Math.max(0, pB - zCi * seB),
    Math.min(1, pB + zCi * seB),
  ];

  // Unpooled SE for CI of the difference
  const seDiffUnp = Math.sqrt(seA * seA + seB * seB);
  const ciDiff: [number, number] = [diff - zCi * seDiffUnp, diff + zCi * seDiffUnp];

  const relativeUplift = pA === 0 ? NaN : diff / pA;

  return {
    nA, xA, pA, nB, xB, pB, pPool, diff, seDiff, z, pValue, tail, conf, alpha,
    zCrit, significant, relativeUplift, ciA, ciB, seA, seB, ciDiff,
  };
}

function pct(p: number, dp = 2): string {
  if (!Number.isFinite(p)) return "—";
  return `${parseFloat((p * 100).toFixed(dp)).toString()}%`;
}

function fmt(n: number, dp = 4): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) return n.toExponential(3);
  return parseFloat(n.toFixed(dp)).toString();
}

function fmtP(p: number): string {
  if (!Number.isFinite(p)) return "—";
  if (p < 0.0001) return "< 0.0001";
  return parseFloat(p.toFixed(4)).toString();
}

/* ---------------- Bar chart with CI whiskers ---------------- */

function ABChart({ res }: { res: ABResult }) {
  const width = 640;
  const height = 320;
  const padL = 60;
  const padR = 24;
  const padT = 20;
  const padB = 48;
  const iw = width - padL - padR;
  const ih = height - padT - padB;

  const yMaxData = Math.max(res.ciA[1], res.ciB[1], res.pA, res.pB);
  const yMax = Math.max(0.02, Math.ceil(yMaxData * 110) / 100); // round up to next 1%
  const yTo = (v: number) => padT + ih - (v / yMax) * ih;

  const bandWidth = iw / 2;
  const barW = Math.min(120, bandWidth * 0.5);
  const cxA = padL + bandWidth * 0.5;
  const cxB = padL + bandWidth * 1.5;

  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => (yMax * i) / yTicks);

  const overlapping = res.ciA[1] >= res.ciB[0] && res.ciB[1] >= res.ciA[0];

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Bar chart of control and variant conversion rates with confidence-interval whiskers"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
      >
        {/* Y grid + labels */}
        {tickValues.map((v, i) => {
          const y = yTo(v);
          return (
            <g key={i}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} opacity={0.35} />
              <text x={padL - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--color-muted-foreground)">
                {pct(v, 1)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padL} x2={width - padR} y1={height - padB} y2={height - padB} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />
        <line x1={padL} x2={padL} y1={padT} y2={height - padB} stroke="var(--color-foreground)" strokeWidth={1} opacity={0.6} />

        {/* Bar A (control) */}
        <rect
          x={cxA - barW / 2}
          y={yTo(res.pA)}
          width={barW}
          height={yTo(0) - yTo(res.pA)}
          fill="rgb(100,116,139)"
          opacity={0.85}
          rx={4}
        />
        {/* Bar B (variant) */}
        <rect
          x={cxB - barW / 2}
          y={yTo(res.pB)}
          width={barW}
          height={yTo(0) - yTo(res.pB)}
          fill={res.significant ? "rgb(22,163,74)" : "rgb(59,130,246)"}
          opacity={0.9}
          rx={4}
        />

        {/* CI whiskers */}
        {[
          { cx: cxA, lo: res.ciA[0], hi: res.ciA[1], color: "rgb(30,41,59)" },
          { cx: cxB, lo: res.ciB[0], hi: res.ciB[1], color: "rgb(30,41,59)" },
        ].map((w, i) => (
          <g key={i}>
            <line x1={w.cx} x2={w.cx} y1={yTo(w.lo)} y2={yTo(w.hi)} stroke={w.color} strokeWidth={2} />
            <line x1={w.cx - 12} x2={w.cx + 12} y1={yTo(w.hi)} y2={yTo(w.hi)} stroke={w.color} strokeWidth={2} />
            <line x1={w.cx - 12} x2={w.cx + 12} y1={yTo(w.lo)} y2={yTo(w.lo)} stroke={w.color} strokeWidth={2} />
          </g>
        ))}

        {/* Value labels on bars */}
        <text x={cxA} y={yTo(res.pA) - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--color-foreground)">
          {pct(res.pA, 2)}
        </text>
        <text x={cxB} y={yTo(res.pB) - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--color-foreground)">
          {pct(res.pB, 2)}
        </text>

        {/* CI range labels below whiskers */}
        <text x={cxA} y={yTo(res.ciA[0]) + 14} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">
          [{pct(res.ciA[0], 2)}, {pct(res.ciA[1], 2)}]
        </text>
        <text x={cxB} y={yTo(res.ciB[0]) + 14} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">
          [{pct(res.ciB[0], 2)}, {pct(res.ciB[1], 2)}]
        </text>

        {/* X labels */}
        <text x={cxA} y={height - padB + 18} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--color-foreground)">
          Control (A)
        </text>
        <text x={cxB} y={height - padB + 18} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--color-foreground)">
          Variant (B)
        </text>
        <text x={cxA} y={height - padB + 34} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">
          {res.xA} / {res.nA}
        </text>
        <text x={cxB} y={height - padB + 34} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">
          {res.xB} / {res.nB}
        </text>

        {/* Overlap indicator */}
        <text
          x={width - padR}
          y={padT + 4}
          textAnchor="end"
          dominantBaseline="hanging"
          fontSize={11}
          fill={overlapping ? "rgb(202,138,4)" : "rgb(22,163,74)"}
          fontWeight={600}
        >
          {overlapping ? "CIs overlap" : "CIs do not overlap"}
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Guide diagrams ---------------- */

function TwoBarsDiagram() {
  return (
    <svg viewBox="0 0 240 130" className="w-full">
      <line x1="20" y1="100" x2="220" y2="100" className="stroke-border" />
      <rect x="60" y="55" width="40" height="45" className="fill-primary/50" />
      <text x="80" y="120" textAnchor="middle" fontSize="10" className="fill-foreground">A · 9.0%</text>
      <rect x="150" y="40" width="40" height="60" className="fill-primary" />
      <text x="170" y="120" textAnchor="middle" fontSize="10" className="fill-foreground">B · 10.4%</text>
      <line x1="80" y1="30" x2="80" y2="75" className="stroke-foreground" strokeWidth="1.5" />
      <line x1="70" y1="30" x2="90" y2="30" className="stroke-foreground" strokeWidth="1.5" />
      <line x1="70" y1="75" x2="90" y2="75" className="stroke-foreground" strokeWidth="1.5" />
      <line x1="170" y1="18" x2="170" y2="60" className="stroke-foreground" strokeWidth="1.5" />
      <line x1="160" y1="18" x2="180" y2="18" className="stroke-foreground" strokeWidth="1.5" />
      <line x1="160" y1="60" x2="180" y2="60" className="stroke-foreground" strokeWidth="1.5" />
      <text x="120" y="12" textAnchor="middle" fontSize="9" className="fill-muted-foreground">whiskers = 95% CI</text>
    </svg>
  );
}

function PooledSEDiagram() {
  return (
    <svg viewBox="0 0 240 120" className="w-full">
      <text x="120" y="30" textAnchor="middle" fontSize="12" className="fill-foreground" fontWeight={700}>
        z = (p̂_B − p̂_A) / SE
      </text>
      <line x1="30" y1="70" x2="210" y2="70" className="stroke-border" />
      <line x1="30" y1="70" x2="30" y2="60" className="stroke-foreground" />
      <line x1="210" y1="70" x2="210" y2="60" className="stroke-foreground" />
      <line x1="120" y1="70" x2="120" y2="60" className="stroke-foreground" />
      <text x="30" y="88" textAnchor="middle" fontSize="10" className="fill-muted-foreground">−1.96</text>
      <text x="120" y="88" textAnchor="middle" fontSize="10" className="fill-muted-foreground">0</text>
      <text x="210" y="88" textAnchor="middle" fontSize="10" className="fill-muted-foreground">+1.96</text>
      <circle cx="185" cy="70" r="5" className="fill-primary" />
      <text x="185" y="108" textAnchor="middle" fontSize="10" className="fill-foreground">z ≈ 2.36</text>
    </svg>
  );
}

function CIOverlapDiagram() {
  return (
    <svg viewBox="0 0 240 130" className="w-full">
      <line x1="10" y1="50" x2="230" y2="50" className="stroke-primary" strokeWidth="3" />
      <line x1="50" y1="90" x2="220" y2="90" className="stroke-primary/60" strokeWidth="3" />
      <text x="15" y="42" fontSize="10" className="fill-foreground">B: [8.6%, 12.2%]</text>
      <text x="55" y="82" fontSize="10" className="fill-foreground">A: [7.4%, 10.6%]</text>
      <line x1="50" y1="40" x2="50" y2="100" className="stroke-foreground" strokeDasharray="2 2" />
      <line x1="220" y1="40" x2="220" y2="100" className="stroke-foreground" strokeDasharray="2 2" />
      <text x="120" y="120" textAnchor="middle" fontSize="10" className="fill-muted-foreground">small overlap → likely significant</text>
    </svg>
  );
}

function OneTwoTailDiagram() {
  const W = 240, H = 120;
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const z = -4 + (8 * i) / 60;
    const y = Math.exp(-0.5 * z * z);
    const x = 10 + ((z + 4) / 8) * (W - 20);
    const yy = H - 25 - y * 70;
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${yy.toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <path d={pts.join(" ")} className="stroke-primary" strokeWidth="1.5" fill="none" />
      <rect x="10" y="60" width="30" height="35" className="fill-primary/40" />
      <rect x="200" y="60" width="30" height="35" className="fill-primary/40" />
      <line x1="10" y1="95" x2="230" y2="95" className="stroke-border" />
      <text x="25" y="110" textAnchor="middle" fontSize="9" className="fill-muted-foreground">α/2</text>
      <text x="215" y="110" textAnchor="middle" fontSize="9" className="fill-muted-foreground">α/2</text>
      <text x="120" y="18" textAnchor="middle" fontSize="10" className="fill-foreground">two-tailed rejects either extreme</text>
    </svg>
  );
}

const AB_GUIDE: GuideCardItem[] = [
  {
    key: "z-test",
    title: "Two-proportion z-test",
    explain:
      "The z-test asks: if the two variants really had the same conversion rate, how surprising would it be to see the gap we observed? The z-statistic is 'observed difference in standard-error units', and the p-value is the probability of a gap this extreme (or worse) by chance.",
    formula: <>z = (p̂_B − p̂_A) / SE</>,
    legend: [
      { sym: "p̂_A, p̂_B", def: "observed conversion rates" },
      { sym: "SE", def: "standard error of the difference (pooled)" },
      { sym: "z", def: "standardised distance in SE units" },
    ],
    diagram: <PooledSEDiagram />,
    example: {
      given: "p̂_A = 9.0%, p̂_B = 10.4%, SE ≈ 0.00592",
      substitute: "(0.104 − 0.090) / 0.00592",
      answer: "z ≈ 2.36 → p ≈ 0.018 (significant at 95%)",
    },
  },
  {
    key: "pooled",
    title: "Pooled standard error",
    explain:
      "Under the null hypothesis (both rates equal), the best estimate of the shared rate is the pooled proportion. The pooled SE combines that shared rate with the two sample sizes and gives you the SE the z-statistic needs.",
    formula: <>p̂ = (x_A + x_B) / (n_A + n_B) · SE = √[p̂(1−p̂)·(1/n_A + 1/n_B)]</>,
    legend: [
      { sym: "p̂", def: "pooled proportion" },
      { sym: "x_A, x_B", def: "conversions in each arm" },
      { sym: "n_A, n_B", def: "visitors in each arm" },
    ],
    diagram: <TwoBarsDiagram />,
    example: {
      given: "x_A = 450/5000, x_B = 520/5000",
      substitute: "p̂ = 970/10000 = 0.097 → SE = √(0.097·0.903·(2/5000))",
      answer: "SE ≈ 0.00592",
    },
  },
  {
    key: "ci",
    title: "Confidence intervals for each arm",
    explain:
      "The chart whiskers use each arm's own Wald CI so you can see the plausible range for the true rate. Non-overlapping (or barely overlapping) intervals almost always match p < 0.05; heavy overlap almost always means 'not significant'.",
    formula: <>p̂ ± z* · √[p̂(1−p̂) / n]</>,
    legend: [
      { sym: "z*", def: "1.96 at 95%, 1.645 at 90%, 2.576 at 99%" },
      { sym: "n", def: "sample size for that arm" },
    ],
    diagram: <CIOverlapDiagram />,
    example: {
      given: "p̂_A = 0.090, n = 5000",
      substitute: "0.090 ± 1.96·√(0.09·0.91/5000)",
      answer: "≈ [7.4%, 10.6%]",
    },
  },
  {
    key: "tails",
    title: "One-tailed vs two-tailed",
    explain:
      "Two-tailed asks 'is B different from A?' — either direction. One-tailed asks 'is B better than A?' — one direction only. Use two-tailed unless you truly do not care about the variant being worse; discovering harm is usually as important as discovering benefit.",
    formula: <>two-tailed p = 2·[1 − Φ(|z|)] · one-tailed p = 1 − Φ(z)</>,
    legend: [
      { sym: "Φ", def: "standard normal CDF" },
      { sym: "α", def: "significance threshold (1 − confidence)" },
    ],
    diagram: <OneTwoTailDiagram />,
    example: {
      given: "z = 2.36",
      substitute: "two-tailed: 2·[1 − Φ(2.36)]",
      answer: "p ≈ 0.018",
    },
  },
];

/* ---------------- Page ---------------- */

function ABTestPage() {
  const [nA, setNA] = useState("5000");
  const [xA, setXA] = useState("450");
  const [nB, setNB] = useState("5000");
  const [xB, setXB] = useState("520");
  const [tail, setTail] = useState<Tail>("two");
  const [conf, setConf] = useState<Conf>(0.95);
  const [result, setResult] = useState<ABResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    const res = computeAB(
      parseFloat(nA), parseFloat(xA),
      parseFloat(nB), parseFloat(xB),
      tail, conf,
    );
    if ("error" in res) return setErr(res.error);
    setResult(res);
  };

  const clear = () => {
    setNA(""); setXA(""); setNB(""); setXB("");
    setResult(null); setErr(null);
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const uplift = result.relativeUplift;
    const seDiffUnp = Math.sqrt(result.seA * result.seA + result.seB * result.seB);
    const zCi = normalInv(1 - result.alpha / 2);
    return [
      {
        title: "Conversion rates",
        body: (
          <>
            <MathNote>Each rate is conversions divided by visitors</MathNote>
            <MathLine>p̂_A = x_A / n_A = {result.xA} / {result.nA}</MathLine>
            <MathLine>p̂_A = {fmt(result.pA, 6)} ({pct(result.pA, 3)})</MathLine>
            <MathLine>p̂_B = x_B / n_B = {result.xB} / {result.nB}</MathLine>
            <MathLine>p̂_B = {fmt(result.pB, 6)} ({pct(result.pB, 3)})</MathLine>
          </>
        ),
      },
      {
        title: "Pooled proportion",
        body: (
          <>
            <MathNote>Under H₀ (equal rates), the best estimate of the shared rate combines both arms</MathNote>
            <MathLine>p̂ = (x_A + x_B) / (n_A + n_B)</MathLine>
            <MathLine>p̂ = ({result.xA} + {result.xB}) / ({result.nA} + {result.nB})</MathLine>
            <MathLine>p̂ = {result.xA + result.xB} / {result.nA + result.nB}</MathLine>
            <MathLine>p̂ = {fmt(result.pPool, 6)}</MathLine>
          </>
        ),
      },
      {
        title: "Standard error of the difference",
        body: (
          <>
            <MathNote>The pooled SE feeds the z-statistic</MathNote>
            <MathLine>SE = √[ p̂(1 − p̂) · (1/n_A + 1/n_B) ]</MathLine>
            <MathLine>SE = √[ {fmt(result.pPool)} × {fmt(1 - result.pPool)} × (1/{result.nA} + 1/{result.nB}) ]</MathLine>
            <MathLine>SE = √[ {fmt(result.pPool * (1 - result.pPool))} × {fmt(1 / result.nA + 1 / result.nB, 8)} ]</MathLine>
            <MathLine>SE = {fmt(result.seDiff, 6)}</MathLine>
          </>
        ),
      },
      {
        title: "Z-statistic",
        body: (
          <>
            <MathNote>Observed difference measured in standard-error units</MathNote>
            <MathLine>z = (p̂_B − p̂_A) / SE</MathLine>
            <MathLine>z = ({fmt(result.pB, 6)} − {fmt(result.pA, 6)}) / {fmt(result.seDiff, 6)}</MathLine>
            <MathLine>z = {fmt(result.diff, 6)} / {fmt(result.seDiff, 6)}</MathLine>
            <MathLine>z = {fmt(result.z, 4)}</MathLine>
          </>
        ),
      },
      {
        title: `P-value (${result.tail === "two" ? "two-tailed" : "one-tailed"})`,
        body:
          result.tail === "two" ? (
            <>
              <MathNote>Two-tailed p-value uses the standard normal CDF Φ</MathNote>
              <MathLine>p = 2 × [ 1 − Φ(|z|) ]</MathLine>
              <MathLine>p = 2 × [ 1 − Φ({fmt(Math.abs(result.z), 4)}) ]</MathLine>
              <MathLine>p = 2 × [ 1 − {fmt(normalCDF(Math.abs(result.z)), 6)} ]</MathLine>
              <MathLine>p = {fmtP(result.pValue)}</MathLine>
            </>
          ) : (
            <>
              <MathNote>One-tailed p-value uses the standard normal CDF Φ</MathNote>
              <MathLine>p = 1 − Φ(z)</MathLine>
              <MathLine>p = 1 − Φ({fmt(result.z, 4)})</MathLine>
              <MathLine>p = {fmtP(result.pValue)}</MathLine>
            </>
          ),
      },
      {
        title: "Relative uplift",
        body: (
          <>
            <MathNote>Difference expressed as a percentage of the control rate</MathNote>
            <MathLine>uplift = (p̂_B − p̂_A) / p̂_A</MathLine>
            <MathLine>uplift = {fmt(result.diff, 6)} / {fmt(result.pA, 6)}</MathLine>
            <MathLine>uplift = {Number.isFinite(uplift) ? pct(uplift, 2) : "—"}</MathLine>
          </>
        ),
      },
      {
        title: `Decision at ${Math.round(result.conf * 100)}% confidence`,
        body: (
          <>
            <MathNote>Compare the observed z against the critical value for α = {result.alpha}</MathNote>
            <MathLine>critical |z| = {fmt(result.zCrit, 4)} {result.tail === "two" ? "(two-tailed)" : "(one-tailed)"}</MathLine>
            <MathLine>observed |z| = {fmt(Math.abs(result.z), 4)}, p = {fmtP(result.pValue)}</MathLine>
            <MathNote>
              {result.significant
                ? "Reject H₀ — the difference is statistically significant."
                : "Fail to reject H₀ — not enough evidence to call this significant."}
            </MathNote>
          </>
        ),
      },
      {
        title: `Per-group confidence intervals at ${Math.round(result.conf * 100)}%`,
        body: (
          <>
            <MathNote>Wald interval for each arm: p̂ ± z* · √(p̂(1−p̂)/n)</MathNote>
            <MathLine>SE_A = √(p̂_A(1−p̂_A)/n_A) = {fmt(result.seA, 6)}</MathLine>
            <MathLine>CI_A = {fmt(result.pA, 6)} ± {fmt(zCi, 4)} × {fmt(result.seA, 6)}</MathLine>
            <MathLine>CI_A = [{pct(result.ciA[0], 2)}, {pct(result.ciA[1], 2)}]</MathLine>
            <MathLine>SE_B = √(p̂_B(1−p̂_B)/n_B) = {fmt(result.seB, 6)}</MathLine>
            <MathLine>CI_B = {fmt(result.pB, 6)} ± {fmt(zCi, 4)} × {fmt(result.seB, 6)}</MathLine>
            <MathLine>CI_B = [{pct(result.ciB[0], 2)}, {pct(result.ciB[1], 2)}]</MathLine>
          </>
        ),
      },
      {
        title: `${Math.round(result.conf * 100)}% confidence interval for the difference`,
        body: (
          <>
            <MathNote>Uses the unpooled SE, appropriate once we're estimating (not testing) the gap</MathNote>
            <MathLine>SE* = √(SE_A² + SE_B²) = √({fmt(result.seA * result.seA, 8)} + {fmt(result.seB * result.seB, 8)})</MathLine>
            <MathLine>SE* = {fmt(seDiffUnp, 6)}</MathLine>
            <MathLine>CI = (p̂_B − p̂_A) ± z* · SE*</MathLine>
            <MathLine>CI = {fmt(result.diff, 6)} ± {fmt(zCi, 4)} × {fmt(seDiffUnp, 6)}</MathLine>
            <MathLine>CI = [{pct(result.ciDiff[0], 3)}, {pct(result.ciDiff[1], 3)}] absolute difference</MathLine>
            <MathNote>If this interval crosses 0, the two rates could plausibly be equal — that matches "not significant".</MathNote>
          </>
        ),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    const conclusion = result.significant
      ? `SIGNIFICANT at ${Math.round(result.conf * 100)}% confidence`
      : `NOT significant at ${Math.round(result.conf * 100)}% confidence`;
    return [
      `A/B test result — ${conclusion}`,
      `Control (A): ${result.xA} / ${result.nA} = ${pct(result.pA, 3)} · 95% CI [${pct(result.ciA[0], 2)}, ${pct(result.ciA[1], 2)}]`,
      `Variant (B): ${result.xB} / ${result.nB} = ${pct(result.pB, 3)} · 95% CI [${pct(result.ciB[0], 2)}, ${pct(result.ciB[1], 2)}]`,
      `Absolute difference: ${pct(result.diff, 3)}`,
      `Relative uplift: ${Number.isFinite(result.relativeUplift) ? pct(result.relativeUplift, 2) : "—"}`,
      `Z-statistic: ${fmt(result.z, 4)}`,
      `P-value (${result.tail === "two" ? "two-tailed" : "one-tailed"}): ${fmtP(result.pValue)}`,
      `Confidence: ${Math.round(result.conf * 100)}% · α = ${result.alpha} · critical |z| = ${fmt(result.zCrit, 4)}`,
    ].join("\n");
  }, [result]);

  return (
    <MathCalcPage
      name="A/B Test Significance Calculator"
      tagline="Enter control and variant visitors + conversions to test whether the observed uplift is real. Reports the two-proportion z-test, p-value, relative uplift and a bar chart with confidence intervals so you can see interval overlap at a glance."
      extras={
        <>
          <CalcSection title="What is A/B test significance?">
            <p>
              When you run an A/B test, the variant almost always <em>looks</em> a
              bit better or worse than the control just by chance. Statistical
              significance answers the specific question: "If the two versions
              were really equal, how often would we see a gap this large by pure
              luck?" — the p-value. A small p-value (traditionally &lt; 0.05)
              means chance alone would rarely produce such a gap, so the
              variants really are different.
            </p>
          </CalcSection>

          <CalcSection title="Statistical significance vs. practical significance (the trap)">
            <p>
              They are not the same thing. Statistical significance is a claim
              about noise; practical significance is a claim about business
              impact. With enough data a 0.1% uplift can be highly significant
              and worth nothing. Write down your minimum detectable effect
              (MDE) before the test, and ship only when both the p-value AND
              the observed effect clear their bars.
            </p>
          </CalcSection>

          <CalcSection title="A/B testing math explained, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card below owns one part of the calculation — the z-test,
              the pooled standard error, per-arm confidence intervals, and the
              one-vs-two-tailed choice — with a plain-English explanation,
              the exact formula, a diagram and a worked example.
            </p>
            <GuideCards items={AB_GUIDE} />
          </CalcSection>

          <CalcSection title="Reading the chart">
            <p>
              Bars are the observed rates; whiskers are per-arm 95% Wald
              intervals. Non-overlapping (or barely overlapping) whiskers
              almost always match a significant p-value; heavy overlap almost
              always means "not significant". The p-value is the definitive
              answer — the chart is the intuition.
            </p>
          </CalcSection>

          <CalcSection title="How long should I run the test?">
            <p>
              Long enough to detect the smallest uplift you'd care about, and
              at least one full week (ideally two) to smooth out weekday /
              weekend traffic. Two anti-patterns: <strong>peeking</strong>{" "}
              (checking daily and stopping the moment p &lt; 0.05 inflates
              false positives) and <strong>stopping too early</strong>. Use
              the <a className="text-primary underline" href="/calculators/math/sample-size-calculator">Sample Size Calculator</a> to size the test up front.
            </p>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Peeking and early-stopping.</strong> Pre-commit to sample size.</li>
              <li><strong>Testing many variants without a correction.</strong> Multiple comparisons inflate false positives.</li>
              <li><strong>Chasing "significance" on a trivial effect.</strong> Compare to your MDE.</li>
              <li><strong>Under-powered tests.</strong> "No difference" from an under-sized sample really means "we don't know" — check CI width.</li>
              <li><strong>Deciding before running the numbers.</strong> Let the p-value and CI decide.</li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Two-proportion z-test with pooled standard error — the standard test for comparing two conversion rates",
                "Selectable 90%, 95% or 99% confidence, plus one- or two-tailed testing",
                "Reports absolute difference, relative uplift, z-statistic, p-value and the critical value in one pass",
                "Bar chart with per-arm confidence-interval whiskers, colored green when significant",
                "Confidence interval for the difference — crossing 0 means not significant",
                "Show/hide step-by-step working: pooled proportion, SE, z, p-value and decision rule",
                "Copy the summary or download the whole panel — chart, verdict and steps — as an image",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "Is a p-value of 0.05 a magic threshold?", a: <p>No — it's a convention. Use 99% (α = 0.01) when a bad decision is expensive, 90% (α = 0.10) when it's cheap and reversible.</p> },
                { q: "What's the difference between absolute and relative uplift?", a: <p>Absolute uplift is p_B − p_A in percentage points. Relative uplift is (p_B − p_A) / p_A. Relative is usually more meaningful for business decisions.</p> },
                { q: "Can I trust the result if the CIs barely overlap?", a: <p>Usually yes — barely overlapping 95% CIs almost always match significance at 5%. The p-value is the definitive answer.</p> },
                { q: "One-tailed or two-tailed?", a: <p>Two-tailed unless you truly do not care about the variant being worse.</p> },
                { q: "What if my conversion rate is 0% or 100%?", a: <p>The z-test breaks down at the boundaries. Collect more data or use an exact method (Fisher's exact test).</p> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/sample-size-calculator", label: "Sample Size Calculator" },
                { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
                { to: "/calculators/math/p-value-calculator", label: "P-Value Calculator" },
                { to: "/calculators/math/confidence-interval-calculator", label: "Confidence Interval Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <div className="mb-3 text-sm font-semibold text-foreground">Control (A)</div>
            <div className="grid gap-3">
              <Field label="Visitors" htmlFor="nA" hint="Total people shown the control.">
                <input
                  id="nA"
                  type="number"
                  min="1"
                  step="1"
                  value={nA}
                  onChange={(e) => setNA(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
              <Field label="Conversions" htmlFor="xA" hint="How many of them converted.">
                <input
                  id="xA"
                  type="number"
                  min="0"
                  step="1"
                  value={xA}
                  onChange={(e) => setXA(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <div className="mb-3 text-sm font-semibold text-foreground">Variant (B)</div>
            <div className="grid gap-3">
              <Field label="Visitors" htmlFor="nB" hint="Total people shown the variant.">
                <input
                  id="nB"
                  type="number"
                  min="1"
                  step="1"
                  value={nB}
                  onChange={(e) => setNB(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
              <Field label="Conversions" htmlFor="xB" hint="How many of them converted.">
                <input
                  id="xB"
                  type="number"
                  min="0"
                  step="1"
                  value={xB}
                  onChange={(e) => setXB(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Confidence level" htmlFor="conf" hint="Higher confidence = stricter significance threshold.">
            <select
              id="conf"
              value={conf}
              onChange={(e) => setConf(parseFloat(e.target.value) as Conf)}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value={0.9}>90% (α = 0.10)</option>
              <option value={0.95}>95% (α = 0.05) — standard</option>
              <option value={0.99}>99% (α = 0.01)</option>
            </select>
          </Field>
          <Field label="Test type" htmlFor="tail" hint="Two-tailed answers 'is B different from A?' — the safe default.">
            <select
              id="tail"
              value={tail}
              onChange={(e) => setTail(e.target.value as Tail)}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="two">Two-tailed (recommended)</option>
              <option value="one">One-tailed (B &gt; A only)</option>
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={compute}>Test significance</PrimaryButton>
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
            filename="ab-test-result"
            captureRef={resultRef}
            getCopyText={() => summary}
          />
          <div ref={resultRef} className="space-y-6 rounded-3xl bg-background/60 p-1">
            <ResultBox
              label={result.significant
                ? `Significant at ${Math.round(result.conf * 100)}% confidence`
                : `Not significant at ${Math.round(result.conf * 100)}% confidence`}
              value={
                <>
                  {result.diff >= 0 ? "+" : ""}
                  {pct(result.diff, 2)} absolute
                  {Number.isFinite(result.relativeUplift) && (
                    <> · {result.relativeUplift >= 0 ? "+" : ""}{pct(result.relativeUplift, 2)} relative</>
                  )}
                </>
              }
              note={
                <>
                  <div>
                    Control {pct(result.pA, 2)} → Variant {pct(result.pB, 2)} · z = {fmt(result.z, 3)} · p = {fmtP(result.pValue)} ({result.tail === "two" ? "two-tailed" : "one-tailed"})
                  </div>
                  <div className="mt-1 text-xs">
                    {Math.round(result.conf * 100)}% CI for the difference: [{pct(result.ciDiff[0], 2)}, {pct(result.ciDiff[1], 2)}]
                  </div>
                </>
              }
            />

            <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
              <div className="mb-2 text-sm font-semibold text-foreground">
                Conversion rates with {Math.round(result.conf * 100)}% confidence intervals
              </div>
              <ABChart res={result} />
              <div className="mt-2 text-xs text-muted-foreground">
                Whiskers show each arm's own {Math.round(result.conf * 100)}% confidence interval. Non-overlapping whiskers usually mean a significant result; heavy overlap usually means noise.
              </div>
            </div>

            <StepsToggle steps={steps} />
          </div>
        </div>
      )}
    </MathCalcPage>
  );
}
