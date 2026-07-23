import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type ReactNode } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  PrimaryButton,
  ResultBox,
  ErrorBox,
  CalcSection,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  Field,
  TextInput,
  GuideCards,
  type GuideCardItem,
  FormulaBlock,
  FormulaWithLegend,
} from "@/components/MathCalcPage";
import { ReferenceTable } from "@/components/ReferenceTable";
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

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

export const Route = createFileRoute("/calculators/math/sample-size-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Sample Size Calculator",
      title: "Sample Size Calculator — Mean & Proportion",
      metaDescription:
        "Find the required sample size for a mean or proportion at any margin of error and confidence level with steps.",
      canonicalUrl: "/calculators/math/sample-size-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Sample Size Calculator", path: "/calculators/math/sample-size-calculator" },
      ],
      faqs: [
        {
          q: "Why is 50% the safest default for the population proportion?",
          a: "The term p̂(1 − p̂) is largest exactly when p̂ = 0.5, where it equals 0.25. Any other value shrinks it. Because the sample-size formula multiplies by that term, plugging in 50% gives the biggest — and therefore safest — required sample size. If your survey's true proportion turns out to be 0.5 you're covered; if it's more extreme, you'll have oversampled slightly, which only helps precision.",
        },
        {
          q: "What happens to sample size as I raise the confidence level?",
          a: "The required sample size grows fast, because the z-score in the numerator is squared. Going from 90% (z ≈ 1.645) to 95% (z ≈ 1.96) increases n by a factor of (1.96/1.645)² ≈ 1.42. Going from 95% to 99% (z ≈ 2.576) multiplies n by (2.576/1.96)² ≈ 1.73. Doubling your certainty is not free — it costs disproportionately more data.",
        },
        {
          q: "When does the finite population correction actually matter?",
          a: "Only when your sample size is a meaningful fraction of the whole population — roughly 5% or more. If you're polling 1,000 people out of the U.S. adult population (~250 million), the correction is negligible. If you're polling 400 employees out of a 500-person company, it cuts the required sample dramatically because you're getting close to a full census.",
        },
      ],
    }),
  component: SampleSizePage,
});

// -------------- Diagrams --------------

/**
 * Sample-size-vs-margin-of-error curve.
 * Plots n = z²·p(1−p)/ε² across a range of ε at fixed z, p,
 * marking the user's chosen point so they can see how expensive
 * a tighter margin gets (the curve steepens sharply near 0).
 */
function SampleSizeCurve({
  z,
  p,
  eps,
  n,
}: {
  z: number;
  p: number;
  eps: number;
  n: number;
}) {
  const W = 560;
  const H = 220;
  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const epsPct = eps * 100;
  // Show ε from 1% up to max(10%, current + 3%) for context.
  const xMin = 1;
  const xMax = Math.max(10, epsPct + 3);
  const nAt = (ePct: number) => (z * z * p * (1 - p)) / ((ePct / 100) ** 2);
  const yMax = Math.max(nAt(xMin), n) * 1.05;

  const xToPx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * plotW;
  const yToPx = (y: number) => padT + plotH - (y / yMax) * plotH;

  const steps = 80;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    pts.push(`${xToPx(x).toFixed(1)},${yToPx(nAt(x)).toFixed(1)}`);
  }

  const xTicks = [1, 2, 3, 5, 7, 10].filter((t) => t >= xMin && t <= xMax);
  if (!xTicks.includes(Math.round(epsPct))) xTicks.push(Math.round(epsPct));

  const yTicks = 4;
  const yTickVals: number[] = [];
  for (let i = 1; i <= yTicks; i++) yTickVals.push((yMax * i) / yTicks);

  const cx = xToPx(epsPct);
  const cy = yToPx(n);

  return (
    <div className="mt-4 rounded-lg border border-border bg-card/50 p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        Sample size vs. margin of error (at {(z >= 0 ? "z = " : "") + fmt(z, 3)}, p̂ = {p.toFixed(2)})
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Sample size grows sharply as margin of error shrinks"
      >
        {/* y grid */}
        {yTickVals.map((v, i) => (
          <g key={`y${i}`}>
            <line
              x1={padL}
              x2={W - padR}
              y1={yToPx(v)}
              y2={yToPx(v)}
              stroke="currentColor"
              strokeOpacity={0.1}
            />
            <text
              x={padL - 6}
              y={yToPx(v) + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize="10"
            >
              {Math.round(v).toLocaleString()}
            </text>
          </g>
        ))}
        {/* axes */}
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="currentColor" strokeOpacity={0.5} />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="currentColor" strokeOpacity={0.5} />
        {/* x ticks */}
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line
              x1={xToPx(t)}
              x2={xToPx(t)}
              y1={H - padB}
              y2={H - padB + 4}
              stroke="currentColor"
              strokeOpacity={0.5}
            />
            <text
              x={xToPx(t)}
              y={H - padB + 16}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="10"
            >
              {t}%
            </text>
          </g>
        ))}
        {/* curve */}
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={2}
        />
        {/* current point */}
        <line
          x1={cx}
          x2={cx}
          y1={cy}
          y2={H - padB}
          stroke="var(--color-primary)"
          strokeDasharray="3 3"
          strokeOpacity={0.6}
        />
        <line
          x1={padL}
          x2={cx}
          y1={cy}
          y2={cy}
          stroke="var(--color-primary)"
          strokeDasharray="3 3"
          strokeOpacity={0.6}
        />
        <circle cx={cx} cy={cy} r={5} fill="var(--color-primary)" />
        <text
          x={cx + 8}
          y={cy - 6}
          className="fill-foreground"
          fontSize="11"
          fontWeight="600"
        >
          ε = {epsPct.toFixed(1)}%, n = {n.toLocaleString()}
        </text>
        {/* axis labels */}
        <text
          x={padL + plotW / 2}
          y={H - 4}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
        >
          Margin of error (%)
        </text>
        <text
          x={12}
          y={padT + plotH / 2}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
          transform={`rotate(-90 12 ${padT + plotH / 2})`}
        >
          Required n
        </text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">
        Notice how the curve steepens as the margin approaches zero — halving
        your margin of error roughly <strong>quadruples</strong> the sample size
        you need.
      </p>
    </div>
  );
}

/**
 * Confidence interval visual for the margin-of-error tool.
 * Draws a 0–100% axis with p̂ centered and a ±MOE band around it,
 * so the user sees exactly where the true proportion is estimated
 * to lie.
 */
function ConfidenceIntervalBar({
  pHat,
  moe,
  confPct,
}: {
  pHat: number; // 0-100
  moe: number; // fractional, e.g. 0.031
  confPct: number; // e.g. 95
}) {
  const W = 560;
  const H = 110;
  const padL = 30;
  const padR = 30;
  const padT = 30;
  const padB = 34;
  const plotW = W - padL - padR;
  const axisY = padT + 24;

  const xToPx = (pct: number) => padL + (pct / 100) * plotW;
  const moePct = moe * 100;
  const lo = Math.max(0, pHat - moePct);
  const hi = Math.min(100, pHat + moePct);

  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <div className="mt-4 rounded-lg border border-border bg-card/50 p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        {confPct}% confidence interval for the true proportion
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        {/* interval band */}
        <rect
          x={xToPx(lo)}
          y={axisY - 12}
          width={xToPx(hi) - xToPx(lo)}
          height={24}
          fill="var(--color-primary)"
          fillOpacity={0.22}
          rx={4}
        />
        {/* whiskers */}
        <line
          x1={xToPx(lo)}
          x2={xToPx(hi)}
          y1={axisY}
          y2={axisY}
          stroke="var(--color-primary)"
          strokeWidth={2}
        />
        <line x1={xToPx(lo)} x2={xToPx(lo)} y1={axisY - 10} y2={axisY + 10} stroke="var(--color-primary)" strokeWidth={2} />
        <line x1={xToPx(hi)} x2={xToPx(hi)} y1={axisY - 10} y2={axisY + 10} stroke="var(--color-primary)" strokeWidth={2} />
        {/* center point p̂ */}
        <circle cx={xToPx(pHat)} cy={axisY} r={5} fill="var(--color-primary)" />
        <text
          x={xToPx(pHat)}
          y={axisY - 16}
          textAnchor="middle"
          className="fill-foreground"
          fontSize="11"
          fontWeight="600"
        >
          p̂ = {pHat.toFixed(1)}%
        </text>
        {/* endpoint labels */}
        <text
          x={xToPx(lo)}
          y={axisY + 26}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
        >
          {lo.toFixed(2)}%
        </text>
        <text
          x={xToPx(hi)}
          y={axisY + 26}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="10"
        >
          {hi.toFixed(2)}%
        </text>
        {/* axis */}
        <line
          x1={padL}
          x2={W - padR}
          y1={H - padB + 6}
          y2={H - padB + 6}
          stroke="currentColor"
          strokeOpacity={0.4}
        />
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={xToPx(t)}
              x2={xToPx(t)}
              y1={H - padB + 6}
              y2={H - padB + 10}
              stroke="currentColor"
              strokeOpacity={0.4}
            />
            <text
              x={xToPx(t)}
              y={H - padB + 22}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="9"
            >
              {t}%
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">
        The shaded band is where the true proportion is estimated to lie —
        we're {confPct}% confident the real value sits inside it (given the
        method's long-run reliability).
      </p>
    </div>
  );
}



// -------------- Stats helpers --------------

/**
 * Acklam's inverse standard-normal CDF approximation.
 * Returns z such that P(Z ≤ z) = p, for 0 < p < 1.
 * Used so users can enter any custom confidence level (not just the
 * dropdown presets) and still get an accurate z-multiplier.
 */
function normInv(p: number): number {
  if (!(p > 0 && p < 1)) return NaN;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number, r: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= phigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

/** Two-sided critical z for a given confidence level in (0,1). */
function zForConfidence(conf: number): number {
  return normInv(1 - (1 - conf) / 2);
}

function fmt(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e10)) return n.toExponential(4);
  return Number(n.toPrecision(digits)).toString();
}

const CONFIDENCE_PRESETS = [
  { label: "90%", value: 0.9 },
  { label: "95%", value: 0.95 },
  { label: "99%", value: 0.99 },
  { label: "Custom…", value: -1 },
];

// -------------- Sub-tool 1: sample size --------------

interface SizeResult {
  z: number;
  p: number;
  eps: number;
  N: number | null;
  nUnlimited: number;
  nFinite: number | null;
  nFinal: number;
  steps: Step[];
}

function computeSize(
  conf: number,
  errPct: number,
  propPct: number,
  N: number | null,
): SizeResult {
  const z = zForConfidence(conf);
  const p = propPct / 100;
  const eps = errPct / 100;
  const nUnlimited = (z * z * p * (1 - p)) / (eps * eps);
  let nFinite: number | null = null;
  let nFinal = nUnlimited;
  if (N !== null) {
    nFinite = nUnlimited / (1 + (nUnlimited - 1) / N);
    nFinal = nFinite;
  }
  const nFinalCeil = Math.ceil(nFinal);

  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <>
          <MathNote>Confidence level, expected proportion, margin of error{N !== null ? ", and population size" : ""}</MathNote>
          <MathLine>confidence = {(conf * 100).toFixed(2)}%, p̂ = {fmt(p)}, ε = {fmt(eps)}{N !== null ? `, N = ${N}` : ""}</MathLine>
        </>
      ),
    },
    {
      title: "Formula",
      body: (
        <>
          <MathNote>z = z₁₋α/₂ from the standard normal; p̂ = expected proportion; ε = required half-width (margin of error)</MathNote>
          <MathLine>n = z² · p̂(1 − p̂) / ε²</MathLine>
          {N !== null && <MathLine>n' = n / (1 + (n − 1) / N)</MathLine>}
        </>
      ),
    },
    {
      title: "Substitute",
      body: (
        <>
          <MathNote>Plug in the z-score and given values</MathNote>
          <MathLine>z = {fmt(z, 6)}</MathLine>
          <MathLine>
            n = ({fmt(z, 6)})² · {fmt(p)} · (1 − {fmt(p)}) / ({fmt(eps)})² = {fmt(nUnlimited, 6)}
          </MathLine>
          {N !== null && nFinite !== null && (
            <MathLine>
              n' = {fmt(nUnlimited, 6)} / (1 + ({fmt(nUnlimited, 6)} − 1) / {N}) = {fmt(nFinite, 6)}
            </MathLine>
          )}
        </>
      ),
    },
    {
      title: "Answer",
      body: (
        <>
          <MathNote>Always round the required sample size up</MathNote>
          <MathLine>n = ⌈{fmt(nFinal, 6)}⌉ = {nFinalCeil}</MathLine>
        </>
      ),
    },
  ];

  return { z, p, eps, N, nUnlimited, nFinite, nFinal: nFinalCeil, steps };
}

// -------------- Sub-tool 2: margin of error --------------

interface MoeResult {
  z: number;
  p: number;
  n: number;
  N: number | null;
  conf: number;
  moeUnlimited: number;
  moeFinite: number | null;
  moeFinal: number;
  steps: Step[];
}

function computeMoe(
  conf: number,
  n: number,
  propPct: number,
  N: number | null,
): MoeResult {
  const z = zForConfidence(conf);
  const p = propPct / 100;
  const seUnlimited = Math.sqrt((p * (1 - p)) / n);
  const moeUnlimited = z * seUnlimited;
  let moeFinite: number | null = null;
  let moeFinal = moeUnlimited;
  if (N !== null && N > n) {
    const fpc = Math.sqrt((N - n) / (N - 1));
    moeFinite = z * seUnlimited * fpc;
    moeFinal = moeFinite;
  }

  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <>
          <MathNote>Confidence level, sample size, expected proportion{N !== null ? ", and population size" : ""}</MathNote>
          <MathLine>confidence = {(conf * 100).toFixed(2)}%, n = {n}, p̂ = {fmt(p)}{N !== null ? `, N = ${N}` : ""}</MathLine>
        </>
      ),
    },
    {
      title: "Formula",
      body: (
        <>
          <MathNote>z = z₁₋α/₂ from the standard normal; the trailing factor is the finite-population correction (FPC)</MathNote>
          <MathLine>SE = √(p̂(1 − p̂) / n)</MathLine>
          <MathLine>ε = z · SE{N !== null ? " · √((N − n)/(N − 1))" : ""}</MathLine>
        </>
      ),
    },
    {
      title: "Substitute",
      body: (
        <>
          <MathNote>Plug in the z-score and given values</MathNote>
          <MathLine>z = {fmt(z, 6)}</MathLine>
          <MathLine>SE = √({fmt(p)} · {fmt(1 - p)} / {n}) = {fmt(seUnlimited, 6)}</MathLine>
          {N !== null && moeFinite !== null && (
            <MathLine>FPC = √(({N} − {n}) / ({N} − 1)) = {fmt(Math.sqrt((N - n) / (N - 1)), 6)}</MathLine>
          )}
        </>
      ),
    },
    {
      title: "Answer",
      body: (
        <>
          <MathNote>Multiply through to get the margin of error</MathNote>
          {N !== null && moeFinite !== null ? (
            <MathLine>ε = {fmt(z, 6)} · {fmt(seUnlimited, 6)} · FPC = {fmt(moeFinite, 6)} ({(moeFinite * 100).toFixed(3)}%)</MathLine>
          ) : (
            <MathLine>ε = {fmt(z, 6)} · {fmt(seUnlimited, 6)} = {fmt(moeUnlimited, 6)} ({(moeUnlimited * 100).toFixed(3)}%)</MathLine>
          )}
        </>
      ),
    },
  ];

  return {
    z,
    p,
    n,
    N,
    conf,
    moeUnlimited,
    moeFinite,
    moeFinal,
    steps,
  };
}

// -------------- Sub-tool 3: sample size for a mean --------------

interface MeanSizeResult {
  z: number;
  sigma: number;
  E: number;
  N: number | null;
  nUnlimited: number;
  nFinite: number | null;
  nFinal: number;
  steps: Step[];
}

function computeSizeMean(
  conf: number,
  sigma: number,
  E: number,
  N: number | null,
): MeanSizeResult {
  const z = zForConfidence(conf);
  const nUnlimited = Math.pow((z * sigma) / E, 2);
  let nFinite: number | null = null;
  let nFinal = nUnlimited;
  if (N !== null) {
    nFinite = nUnlimited / (1 + (nUnlimited - 1) / N);
    nFinal = nFinite;
  }
  const nFinalCeil = Math.ceil(nFinal);

  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <>
          <MathNote>Confidence level, standard deviation, and desired margin of error{N !== null ? ", plus population size" : ""}</MathNote>
          <MathLine>confidence = {(conf * 100).toFixed(2)}%, σ = {fmt(sigma)}, E = {fmt(E)}{N !== null ? `, N = ${N}` : ""}</MathLine>
        </>
      ),
    },
    {
      title: "Formula",
      body: (
        <>
          <MathNote>z = z₁₋α/₂ from the standard normal; σ = population (or estimated) standard deviation; E = desired margin of error in the same units as the data</MathNote>
          <MathLine>n = (z · σ / E)²</MathLine>
          {N !== null && <MathLine>n' = n / (1 + (n − 1) / N)</MathLine>}
        </>
      ),
    },
    {
      title: "Substitute",
      body: (
        <>
          <MathNote>Plug in the z-score and given values</MathNote>
          <MathLine>z = {fmt(z, 6)}</MathLine>
          <MathLine>
            n = ({fmt(z, 6)} · {fmt(sigma)} / {fmt(E)})² = {fmt(nUnlimited, 6)}
          </MathLine>
          {N !== null && nFinite !== null && (
            <MathLine>
              n' = {fmt(nUnlimited, 6)} / (1 + ({fmt(nUnlimited, 6)} − 1) / {N}) = {fmt(nFinite, 6)}
            </MathLine>
          )}
        </>
      ),
    },
    {
      title: "Answer",
      body: (
        <>
          <MathNote>Always round the required sample size up</MathNote>
          <MathLine>n = ⌈{fmt(nFinal, 6)}⌉ = {nFinalCeil}</MathLine>
        </>
      ),
    },
  ];

  return { z, sigma, E, N, nUnlimited, nFinite, nFinal: nFinalCeil, steps };
}

// -------------- Page --------------


/* ---------------- Guide diagrams ---------------- */

function VarianceCurveDiagram() {
  const w = 320, h = 140, padL = 30, padR = 20, padT = 15, padB = 30;
  const ptCount = 61;
  const pts: [number, number][] = [];
  for (let i = 0; i < ptCount; i++) {
    const p = i / (ptCount - 1);
    const v = p * (1 - p);
    pts.push([p, v]);
  }
  const xToPx = (p: number) => padL + p * (w - padL - padR);
  const yToPx = (v: number) => h - padB - (v / 0.25) * (h - padT - padB);
  const path = pts.map(([p, v], i) => `${i === 0 ? "M" : "L"} ${xToPx(p).toFixed(1)} ${yToPx(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="p(1-p) maximised at 0.5">
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="var(--color-border)" />
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="var(--color-border)" />
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      <line x1={xToPx(0.5)} y1={padT} x2={xToPx(0.5)} y2={h - padB} stroke="var(--color-foreground)" strokeDasharray="3 3" />
      <circle cx={xToPx(0.5)} cy={yToPx(0.25)} r={4} fill="var(--color-primary)" />
      <text x={xToPx(0.5)} y={yToPx(0.25) - 6} textAnchor="middle" fontSize={10} fill="var(--color-foreground)">max = 0.25</text>
      <text x={padL} y={h - 6} fontSize={10} fill="var(--color-muted-foreground)">0</text>
      <text x={xToPx(0.5)} y={h - 6} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">0.5</text>
      <text x={xToPx(1)} y={h - 6} textAnchor="end" fontSize={10} fill="var(--color-muted-foreground)">p = 1</text>
    </svg>
  );
}

function MOEShrinkDiagram() {
  const w = 320, h = 140, padT = 20;
  const rows = [
    { moe: 0.10, n: 96 },
    { moe: 0.05, n: 385 },
    { moe: 0.025, n: 1537 },
    { moe: 0.01, n: 9604 },
  ];
  const maxN = 9604;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Halving margin of error quadruples sample size">
      {rows.map((r, i) => {
        const y = padT + i * 26;
        const barW = Math.sqrt(r.n / maxN) * 200;
        return (
          <g key={i}>
            <text x={60} y={y + 12} textAnchor="end" fontSize={10} fill="var(--color-foreground)">
              ε = {(r.moe * 100).toFixed(1)}%
            </text>
            <rect x={70} y={y + 4} width={barW} height={14} fill="var(--color-primary)" opacity={0.6} rx={2} />
            <text x={70 + barW + 6} y={y + 14} fontSize={10} fill="var(--color-muted-foreground)">n ≈ {r.n}</text>
          </g>
        );
      })}
      <text x={w / 2} y={h - 6} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>
        n ∝ 1 / ε² — halve ε, quadruple n
      </text>
    </svg>
  );
}

function FPCDiagram() {
  const w = 320, h = 140, padT = 24;
  const items = [
    { N: "∞", n: 385, w: 200 },
    { N: "5,000", n: 358, w: 200 * (358 / 385) },
    { N: "500", n: 218, w: 200 * (218 / 385) },
  ];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Finite population correction shrinks required sample">
      {items.map((it, i) => {
        const y = padT + i * 32;
        return (
          <g key={i}>
            <text x={70} y={y + 14} textAnchor="end" fontSize={10} fill="var(--color-foreground)">N = {it.N}</text>
            <rect x={80} y={y + 4} width={it.w} height={14} fill="var(--color-primary)" opacity={0.55} rx={2} />
            <text x={80 + it.w + 6} y={y + 14} fontSize={10} fill="var(--color-muted-foreground)">n' ≈ {it.n}</text>
          </g>
        );
      })}
      <text x={w / 2} y={h - 6} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>
        smaller closed populations need fewer respondents
      </text>
    </svg>
  );
}

function ConfidenceZDiagram() {
  const w = 320, h = 140, padT = 20;
  const rows = [
    { c: "90%", z: 1.645 },
    { c: "95%", z: 1.96 },
    { c: "99%", z: 2.576 },
  ];
  const maxZ = 2.6;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Higher confidence needs a bigger z">
      {rows.map((r, i) => {
        const y = padT + i * 32;
        const barW = (r.z / maxZ) * 220;
        return (
          <g key={i}>
            <text x={40} y={y + 14} textAnchor="end" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>{r.c}</text>
            <rect x={50} y={y + 4} width={barW} height={14} fill="var(--color-primary)" opacity={0.6} rx={2} />
            <text x={50 + barW + 6} y={y + 14} fontSize={10} fill="var(--color-muted-foreground)">z = {r.z}</text>
          </g>
        );
      })}
      <text x={w / 2} y={h - 6} textAnchor="middle" fontSize={11} fill="var(--color-foreground)" fontWeight={600}>
        z grows with confidence
      </text>
    </svg>
  );
}

/* ---------------- Guide ---------------- */

const SS_GUIDE: GuideCardItem[] = [
  {
    key: "confidence",
    title: "1. Pick a confidence level → get z",
    explain:
      "The confidence level says how often the method should succeed if you repeated the whole survey many times. That level maps to a two-sided z-multiplier from the standard normal. Higher confidence needs a bigger z, and a bigger z pushes n up proportionally to z².",
    formula: <>z = Φ⁻¹(1 − (1 − C) / 2)</>,
    legend: [
      { sym: "C", def: "confidence level (e.g. 0.95)" },
      { sym: "z", def: "two-sided critical value" },
    ],
    diagram: <ConfidenceZDiagram />,
    example: {
      given: "C = 95%",
      substitute: "z = Φ⁻¹(0.975)",
      answer: "z ≈ 1.96",
    },
  },
  {
    key: "proportion",
    title: "2. Choose the population proportion p̂",
    explain:
      "The formula depends on the variance term p̂(1 − p̂). It is largest at p̂ = 0.5, so if you have no prior information the safe default is 50% — you'll never under-sample. If a previous study or pilot suggests p̂ is far from 0.5, using that value gives a smaller (and still valid) sample size.",
    formula: <>p̂(1 − p̂), &nbsp; max at p̂ = 0.5</>,
    legend: [{ sym: "p̂", def: "assumed population proportion" }],
    diagram: <VarianceCurveDiagram />,
    example: {
      given: "no prior info",
      substitute: "p̂ = 0.5 ⇒ 0.5 · 0.5",
      answer: "p̂(1 − p̂) = 0.25 (max)",
    },
  },
  {
    key: "moe",
    title: "3. Solve for sample size at margin ε",
    explain:
      "The unlimited-population formula puts ε in the denominator squared. That's why halving your target margin of error quadruples the required sample. Tighter certainty is disproportionately expensive.",
    formula: <>n = z² · p̂(1 − p̂) / ε²</>,
    legend: [
      { sym: "ε", def: "target margin of error (in proportion units)" },
      { sym: "n", def: "required sample size" },
    ],
    diagram: <MOEShrinkDiagram />,
    example: {
      given: "z = 1.96, p̂ = 0.5, ε = 0.05",
      substitute: "(1.96)² · 0.25 / (0.05)²",
      answer: "n ≈ 385",
    },
  },
  {
    key: "fpc",
    title: "4. Finite population correction (small groups)",
    explain:
      "The base formula assumes an effectively infinite population. Once your sample is more than about 5% of N, the FPC noticeably cuts the required sample — every person you survey is a larger share of the whole, so uncertainty shrinks faster.",
    formula: <>n' = n / (1 + (n − 1) / N)</>,
    legend: [
      { sym: "n", def: "unlimited-population sample size" },
      { sym: "N", def: "true population size" },
      { sym: "n'", def: "corrected sample size" },
    ],
    diagram: <FPCDiagram />,
    example: {
      given: "n = 385, N = 500",
      substitute: "385 / (1 + 384/500)",
      answer: "n' ≈ 218",
    },
  },
];

function SampleSizePage() {
  return (
    <MathCalcPage
      name="Sample Size Calculator"
      tagline="Two tools in one: figure out the minimum sample size you need for a survey at a given confidence level and margin of error, or take an existing sample and compute the margin of error it can support. Includes the finite-population correction so small, closed populations aren't over-sampled."
      extras={
        <>
          <CalcSection title="Why can't you just survey everyone?">
            <p>
              In statistics, you almost never have access to every member of the
              group you care about — the "population" might be every U.S. adult,
              every user of an app, every widget rolling off a production line.
              Instead you take a <em>sample</em>: a smaller, hopefully
              representative subset, and use it to estimate the true proportion{" "}
              <span className="font-serif italic">p</span> of some trait in the full
              population.
            </p>
            <p>
              Any single sample produces an estimate, written{" "}
              <span className="font-serif italic">p̂</span> ("p-hat"). It's close to the
              true <span className="font-serif italic">p</span> but almost never exactly
              equal — draw two different samples of the same size and you'll get
              two slightly different p̂ values. Sample size calculations are
              about deciding <em>how close is close enough</em>, and how
              confident you want to be in that closeness.
            </p>
          </CalcSection>

          <CalcSection title="What confidence level actually means">
            <p>
              A 95% confidence level does <strong>not</strong> mean "there's a
              95% chance the true proportion is inside this specific interval."
              Once you've drawn a sample and computed an interval, the true
              proportion either <em>is</em> inside it or it isn't. What 95%
              confidence really describes is the <em>reliability of the method</em>:
              if you repeated the whole survey many times, about 95% of the
              intervals you built would cover the true proportion. The
              probability sits with the procedure, not with any one interval.
            </p>
          </CalcSection>

          <CalcSection title="Sample size, step by step">
            <p className="text-sm text-muted-foreground">
              Each card below is one link in the chain: pick a confidence level
              (which sets z), pick the proportion assumption, plug in the target
              margin of error, and — if the population is small — apply the
              finite population correction. Definitions and formulas on the
              left, a small diagram on the right, and a worked example beneath.
            </p>
            <GuideCards items={SS_GUIDE} />
          </CalcSection>

          <CalcSection title="z-score reference table">
            <p>
              The z-score is the two-sided critical value from the standard
              normal distribution corresponding to your confidence level. These
              are the multipliers the calculator plugs into the formulas. Custom
              levels are computed with the inverse-normal function, so any value
              in between works too.
            </p>
            <ReferenceTable
              headers={["Confidence level", "z-score (±)"]}
              numericColumns={[1]}
              rows={[
                ["70%", "1.04"],
                ["80%", "1.28"],
                ["90%", "1.645"],
                ["95%", "1.96"],
                ["98%", "2.33"],
                ["99%", "2.576"],
                ["99.9%", "3.29"],
              ]}
            />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Two directions in one page — solve for sample size, or solve for margin of error",
                "Confidence-level dropdown for 90 / 95 / 99% plus a custom field that accepts any level (e.g. 92.5%)",
                "Automatic finite population correction when a population size is entered",
                "Step-by-step working shows the z-score, the substitution, and (when relevant) the correction term",
                "z-score reference table so you can see exactly where the multiplier comes from",
                "Sensible default of p̂ = 50%, the mathematically most conservative choice",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Why is 50% the conservative default for population proportion?",
                  a: (
                    <p>
                      The variance term p̂(1 − p̂) is maximised at p̂ = 0.5,
                      where it equals 0.25. Using 50% when you don't know the
                      true proportion guarantees you don't under-sample.
                    </p>
                  ),
                },
                {
                  q: "What happens to sample size if I raise the confidence level?",
                  a: (
                    <p>
                      Sample size grows with the square of the z-score. Moving
                      from 90% to 95% roughly multiplies n by 1.42; from 95% to
                      99.9% nearly triples it. High certainty is expensive.
                    </p>
                  ),
                },
                {
                  q: "Do I need the finite population correction?",
                  a: (
                    <p>
                      Only if your sample is a meaningful fraction of the whole
                      population — as a rule of thumb, once n is more than about
                      5% of N. For national surveys the correction is
                      negligible; for a small company or school it can cut the
                      required sample substantially.
                    </p>
                  ),
                },
                {
                  q: "Is this the same math pollsters use?",
                  a: (
                    <p>
                      This is the standard textbook proportion-based sample size
                      formula, which is what most media polls quote (the
                      "margin of error ±3 points" you see on election coverage).
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
                { to: "/calculators/math/margin-of-error-calculator", label: "Margin of Error Calculator" },
                { to: "/calculators/math/confidence-interval-calculator", label: "Confidence Interval Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-10">
        <FindSampleSize />
        <div className="h-px bg-border/60" />
        <FindMarginOfError />
        <div className="h-px bg-border/60" />
        <FindSampleSizeMean />
      </div>

    </MathCalcPage>
  );
}

// -------------- Sub-tool components --------------

function ConfidencePicker({
  presetIdx,
  setPresetIdx,
  custom,
  setCustom,
}: {
  presetIdx: number;
  setPresetIdx: (n: number) => void;
  custom: string;
  setCustom: (v: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
      <Field label="Confidence level">
        <select
          value={presetIdx}
          onChange={(e) => setPresetIdx(Number(e.target.value))}
          className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {CONFIDENCE_PRESETS.map((p, i) => (
            <option key={i} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      {CONFIDENCE_PRESETS[presetIdx]?.value === -1 && (
        <Field label="Custom level (%)" hint="e.g. 92.5 for 92.5% confidence">
          <TextInput
            value={custom}
            inputMode="decimal"
            onChange={(e) => setCustom(e.target.value)}
            placeholder="92.5"
          />
        </Field>
      )}
    </div>
  );
}

function resolveConfidence(
  presetIdx: number,
  custom: string,
): { conf: number | null; err: string | null } {
  const preset = CONFIDENCE_PRESETS[presetIdx];
  if (!preset) return { conf: null, err: "Invalid confidence level." };
  if (preset.value !== -1) return { conf: preset.value, err: null };
  const c = Number(custom);
  if (!Number.isFinite(c) || c <= 0 || c >= 100)
    return {
      conf: null,
      err: "Custom confidence level must be a percentage strictly between 0 and 100.",
    };
  return { conf: c / 100, err: null };
}

function parseOptionalPopulation(
  N: string,
): { N: number | null; err: string | null } {
  const t = N.trim();
  if (t === "") return { N: null, err: null };
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0)
    return {
      N: null,
      err: "Population size must be a positive whole number (or blank).",
    };
  return { N: n, err: null };
}

function FindSampleSize() {
  const [presetIdx, setPresetIdx] = useState(1); // 95%
  const [customConf, setCustomConf] = useState("");
  const [moe, setMoe] = useState("5");
  const [prop, setProp] = useState("50");
  const [pop, setPop] = useState("");
  const [result, setResult] = useState<SizeResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const onCalc = () => {
    setErr(null);
    setResult(null);
    const { conf, err: cErr } = resolveConfidence(presetIdx, customConf);
    if (cErr || conf === null) return setErr(cErr ?? "Invalid confidence.");
    const e = Number(moe);
    if (!Number.isFinite(e) || e <= 0 || e >= 100)
      return setErr("Margin of error must be a percentage between 0 and 100.");
    const p = Number(prop);
    if (!Number.isFinite(p) || p < 0 || p > 100)
      return setErr("Population proportion must be between 0 and 100%.");
    const { N, err: nErr } = parseOptionalPopulation(pop);
    if (nErr) return setErr(nErr);
    setResult(computeSize(conf, e, p, N));
  };

  const value: ReactNode = result ? (
    <span>
      <span className="font-serif italic">{result.nFinal.toLocaleString()}</span>
      <span className="ml-2 text-base font-normal text-muted-foreground">
        respondents
      </span>
    </span>
  ) : null;

  return (
    <section>
      <h2 className="mb-1 font-display text-xl font-semibold text-foreground">
        1. Find the sample size
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Enter your target confidence and margin of error to get the minimum
        number of responses your survey needs.
      </p>
      <div className="space-y-4">
        <ConfidencePicker
          presetIdx={presetIdx}
          setPresetIdx={setPresetIdx}
          custom={customConf}
          setCustom={setCustomConf}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Margin of error (%)" hint="e.g. 5 for ±5 percentage points">
            <TextInput
              value={moe}
              inputMode="decimal"
              onChange={(e) => setMoe(e.target.value)}
            />
          </Field>
          <Field
            label="Population proportion (%)"
            hint="Use 50% if unsure — it gives the most conservative (largest) sample size"
          >
            <TextInput
              value={prop}
              inputMode="decimal"
              onChange={(e) => setProp(e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Population size (optional)"
          hint="Leave blank for unlimited or very large populations"
        >
          <TextInput
            value={pop}
            inputMode="numeric"
            onChange={(e) => setPop(e.target.value)}
            placeholder="e.g. 5000"
          />
        </Field>
        <PrimaryButton onClick={onCalc}>Calculate sample size</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <>
          <ResultActions
            className="mt-4"
            filename="sample-size-result"
            captureRef={resultRef}
            getCopyText={() =>
              [
                `Sample Size Calculator`,
                `Confidence z-value: z=${fmt(result.z, 4)}`,
                `Margin of error: ±${(result.eps * 100).toFixed(3)}%`,
                `Proportion p: ${(result.p * 100).toFixed(2)}%`,
                result.N ? `Population: ${result.N.toLocaleString()}` : `Population: unlimited`,
                `Required sample size n = ${result.nFinal.toLocaleString()}`,
                result.nFinite !== null
                  ? `(Unlimited-population n = ${Math.ceil(result.nUnlimited).toLocaleString()}; FPC applied)`
                  : ``,
              ].filter(Boolean).join("\n")
            }
          />
          <div ref={resultRef} className="rounded-3xl bg-background/60 p-1">
          <ResultBox
            label="Required sample size"
            value={value}
            note={
              result.nFinite !== null
                ? `Without the finite population correction you would need about ${Math.ceil(result.nUnlimited).toLocaleString()}. The correction cut it because your sample is a meaningful fraction of the ${result.N?.toLocaleString()} people in the population.`
                : `Assumes an unlimited (or very large) population and a two-sided ${(result.eps * 100).toFixed(2)}% margin of error at z = ${fmt(result.z, 4)}.`
            }
          />
          <SampleSizeCurve
            z={result.z}
            p={result.p}
            eps={result.eps}
            n={result.nFinal}
          />
          <StepsToggle steps={result.steps} />
          </div>
        </>
      )}

    </section>
  );
}

function FindMarginOfError() {
  const [presetIdx, setPresetIdx] = useState(1); // 95%
  const [customConf, setCustomConf] = useState("");
  const [nStr, setNStr] = useState("100");
  const [prop, setProp] = useState("50");
  const [pop, setPop] = useState("");
  const [result, setResult] = useState<MoeResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const onCalc = () => {
    setErr(null);
    setResult(null);
    const { conf, err: cErr } = resolveConfidence(presetIdx, customConf);
    if (cErr || conf === null) return setErr(cErr ?? "Invalid confidence.");
    const n = Number(nStr);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 1)
      return setErr("Sample size must be a whole number greater than 1.");
    const p = Number(prop);
    if (!Number.isFinite(p) || p < 0 || p > 100)
      return setErr("Population proportion must be between 0 and 100%.");
    const { N, err: nErr } = parseOptionalPopulation(pop);
    if (nErr) return setErr(nErr);
    if (N !== null && n > N)
      return setErr("Sample size can't exceed the population size.");
    setResult(computeMoe(conf, n, p, N));
  };

  const value: ReactNode = result ? (
    <span>
      ±<span className="font-serif italic">{(result.moeFinal * 100).toFixed(3)}</span>
      <span className="ml-1">%</span>
    </span>
  ) : null;

  return (
    <section>
      <h2 className="mb-1 font-display text-xl font-semibold text-foreground">
        2. Find the margin of error
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Enter your existing sample size to see the margin of error / confidence
        interval width it supports.
      </p>
      <div className="space-y-4">
        <ConfidencePicker
          presetIdx={presetIdx}
          setPresetIdx={setPresetIdx}
          custom={customConf}
          setCustom={setCustomConf}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sample size (n)">
            <TextInput
              value={nStr}
              inputMode="numeric"
              onChange={(e) => setNStr(e.target.value)}
            />
          </Field>
          <Field
            label="Population proportion (%)"
            hint="Use 50% if unsure — this maximises the interval width"
          >
            <TextInput
              value={prop}
              inputMode="decimal"
              onChange={(e) => setProp(e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Population size (optional)"
          hint="Leave blank for unlimited or very large populations"
        >
          <TextInput
            value={pop}
            inputMode="numeric"
            onChange={(e) => setPop(e.target.value)}
            placeholder="e.g. 5000"
          />
        </Field>
        <PrimaryButton onClick={onCalc}>Calculate margin of error</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <>
          <ResultActions
            className="mt-4"
            filename="margin-of-error-result"
            captureRef={resultRef}
            getCopyText={() =>
              [
                `Margin of Error Calculator`,
                `Confidence: ${(result.conf * 100).toFixed(2)}% | z=${fmt(result.z, 4)}`,
                `Sample size n: ${nStr}`,
                `Proportion p: ${prop}%`,
                result.N ? `Population: ${result.N.toLocaleString()}` : `Population: unlimited`,
                `Margin of error = ±${(result.moeFinal * 100).toFixed(3)}%`,
              ].join("\n")
            }
          />
          <div ref={resultRef} className="rounded-3xl bg-background/60 p-1">
          <ResultBox
            label="Margin of error"
            value={value}
            note={
              result.moeFinite !== null
                ? `Without the finite population correction the margin would be ±${(result.moeUnlimited * 100).toFixed(3)}%; the correction shrank it because your sample is a meaningful fraction of the ${result.N?.toLocaleString()} people in the population.`
                : `Two-sided at z = ${fmt(result.z, 4)}, assuming an unlimited or very large population.`
            }
          />
          <ConfidenceIntervalBar
            pHat={Number(prop)}
            moe={result.moeFinal}
            confPct={Math.round(result.conf * 1000) / 10}
          />
          <StepsToggle steps={result.steps} />
          </div>
        </>
      )}

    </section>
  );
}

function FindSampleSizeMean() {
  const [presetIdx, setPresetIdx] = useState(1); // 95%
  const [customConf, setCustomConf] = useState("");
  const [sigmaStr, setSigmaStr] = useState("10");
  const [errStr, setErrStr] = useState("1");
  const [pop, setPop] = useState("");
  const [result, setResult] = useState<MeanSizeResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const onCalc = () => {
    setErr(null);
    setResult(null);
    const { conf, err: cErr } = resolveConfidence(presetIdx, customConf);
    if (cErr || conf === null) return setErr(cErr ?? "Invalid confidence.");
    const sigma = Number(sigmaStr);
    if (!Number.isFinite(sigma) || sigma <= 0)
      return setErr("Standard deviation σ must be a positive number.");
    const E = Number(errStr);
    if (!Number.isFinite(E) || E <= 0)
      return setErr("Margin of error E must be a positive number in the same units as the data.");
    const { N, err: nErr } = parseOptionalPopulation(pop);
    if (nErr) return setErr(nErr);
    setResult(computeSizeMean(conf, sigma, E, N));
  };

  const value: ReactNode = result ? (
    <span>
      <span className="font-serif italic">{result.nFinal.toLocaleString()}</span>
      <span className="ml-2 text-base font-normal text-muted-foreground">
        observations
      </span>
    </span>
  ) : null;

  return (
    <section>
      <h2 className="mb-1 font-display text-xl font-semibold text-foreground">
        3. Find the sample size for a mean
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Enter your target confidence, the population (or estimated) standard
        deviation σ, and the desired margin of error E to get the minimum
        number of observations needed to estimate the population mean.
      </p>
      <div className="space-y-4">
        <ConfidencePicker
          presetIdx={presetIdx}
          setPresetIdx={setPresetIdx}
          custom={customConf}
          setCustom={setCustomConf}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Standard deviation (σ)"
            hint="Population σ, or an estimate from a pilot / prior study"
          >
            <TextInput
              value={sigmaStr}
              inputMode="decimal"
              onChange={(e) => setSigmaStr(e.target.value)}
            />
          </Field>
          <Field
            label="Margin of error (E)"
            hint="In the same units as the data (e.g. dollars, cm, minutes)"
          >
            <TextInput
              value={errStr}
              inputMode="decimal"
              onChange={(e) => setErrStr(e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Population size (optional)"
          hint="Leave blank for unlimited or very large populations"
        >
          <TextInput
            value={pop}
            inputMode="numeric"
            onChange={(e) => setPop(e.target.value)}
            placeholder="e.g. 5000"
          />
        </Field>
        <PrimaryButton onClick={onCalc}>Calculate sample size</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <>
          <ResultActions
            className="mt-4"
            filename="sample-size-mean-result"
            captureRef={resultRef}
            getCopyText={() =>
              [
                `Sample Size Calculator (Mean)`,
                `Confidence z-value: z=${fmt(result.z, 4)}`,
                `Standard deviation σ: ${fmt(result.sigma)}`,
                `Margin of error E: ${fmt(result.E)}`,
                result.N ? `Population: ${result.N.toLocaleString()}` : `Population: unlimited`,
                `Required sample size n = ${result.nFinal.toLocaleString()}`,
                result.nFinite !== null
                  ? `(Unlimited-population n = ${Math.ceil(result.nUnlimited).toLocaleString()}; FPC applied)`
                  : ``,
              ].filter(Boolean).join("\n")
            }
          />
          <div ref={resultRef} className="rounded-3xl bg-background/60 p-1">
            <ResultBox
              label="Required sample size"
              value={value}
              note={
                result.nFinite !== null
                  ? `Without the finite population correction you would need about ${Math.ceil(result.nUnlimited).toLocaleString()}. The correction cut it because your sample is a meaningful fraction of the ${result.N?.toLocaleString()} in the population.`
                  : `Assumes an unlimited (or very large) population and a two-sided margin of error E = ${fmt(result.E)} at z = ${fmt(result.z, 4)}.`
              }
            />
            <StepsToggle steps={result.steps} />
          </div>
        </>
      )}
    </section>
  );
}
