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
} from "@/components/MathCalcPage";
import type { Step } from "@/components/SolutionSteps";
import { StepsToggle } from "@/components/StepsToggle";
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

export const Route = createFileRoute("/calculators/math/z-score-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Z-score Calculator",
      title: "Z-score Calculator — Probability & Area Between Z-scores",
      metaDescription:
        "Compute Z-scores from raw scores, convert between Z and probability without a Z-table, and find the area between two Z-scores. Bell-curve visuals and steps.",
      canonicalUrl: "/calculators/math/z-score-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Z-score Calculator", path: "/calculators/math/z-score-calculator" },
      ],
      faqs: [
        {
          q: "What does a Z-score of 1 mean?",
          a: "A Z-score of 1 means the value is exactly one standard deviation above the mean. In a normal distribution, roughly 84% of values fall below this point and about 16% fall above it.",
        },
        {
          q: "Can a Z-score be negative?",
          a: "Yes. A negative Z-score means the value is below the mean. Z = −2 is two standard deviations below the mean, corresponding to about the 2.3rd percentile.",
        },
        {
          q: "Do I need a Z-table with this calculator?",
          a: "No. All three tools compute the standard-normal CDF live using the error function, so you can enter any Z-score or probability and get an exact answer without table lookup.",
        },
        {
          q: "Should I use population or sample statistics in the formula?",
          a: "The classic formula Z = (x − μ) / σ uses the population mean and population standard deviation. If you only have a sample, use the sample mean and sample standard deviation as estimates — the interpretation is the same but with slightly more uncertainty.",
        },
        {
          q: "Is a Z-score the same as a percentile?",
          a: "No, but they are directly related. The Z-score tells you how many standard deviations from the mean, while the percentile tells you what fraction of the distribution lies below the value. The CDF converts one to the other.",
        },
        {
          q: "What Z-score is considered an outlier?",
          a: "A common rule of thumb is |Z| > 2 for mild outliers and |Z| > 3 for extreme outliers, but the right threshold depends on your sample size and context.",
        },
      ],
    }),
  component: ZScorePage,
});

/* ================= Math ================= */

// Abramowitz & Stegun 7.1.26 — max error ~1.5e-7
function erf(x: number): number {
  const sign = Math.sign(x) || 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}
function Phi(z: number): number {
  // P(Z <= z) for standard normal
  return 0.5 * (1 + erf(z / Math.SQRT2));
}
// Acklam's inverse normal CDF — returns z such that Phi(z) = p, 0<p<1
function invPhi(p: number): number {
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
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

function fmt(n: number, d = 5): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(d);
}
function fmtZ(n: number): string {
  if (!Number.isFinite(n)) return "—";
  // trim trailing zeros
  return Number(n.toFixed(6)).toString();
}
function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/* ================= Mini bell icon ================= */

type Shade = "left" | "right" | "between";

function MiniBell({ shade, z1 = 0, z2 = 0 }: { shade: Shade; z1?: number; z2?: number }) {
  const W = 64, H = 36;
  const pad = 4;
  const xToPx = (x: number) => pad + ((x + 3) / 6) * (W - 2 * pad);
  const pdf = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const maxPdf = pdf(0);
  const yToPx = (y: number) => H - 4 - (y / maxPdf) * (H - 10);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const x = -3 + (6 * i) / 60;
    pts.push([xToPx(x), yToPx(pdf(x))]);
  }
  const curvePath = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  // shaded region
  let lo = -3, hi = 3;
  if (shade === "left") { lo = -3; hi = clamp(z1, -3, 3); }
  else if (shade === "right") { lo = clamp(z1, -3, 3); hi = 3; }
  else { lo = clamp(Math.min(z1, z2), -3, 3); hi = clamp(Math.max(z1, z2), -3, 3); }
  const shadePts: [number, number][] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const x = lo + ((hi - lo) * i) / steps;
    shadePts.push([xToPx(x), yToPx(pdf(x))]);
  }
  const shadePath =
    `M${xToPx(lo)},${H - 4} ` +
    shadePts.map((p) => `L${p[0]},${p[1]}`).join(" ") +
    ` L${xToPx(hi)},${H - 4} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="shrink-0" aria-hidden>
      <path d={shadePath} className="fill-primary/30" />
      <path d={curvePath} className="stroke-primary" strokeWidth={1.4} fill="none" />
      <line x1={pad} y1={H - 4} x2={W - pad} y2={H - 4} className="stroke-border" strokeWidth={0.8} />
    </svg>
  );
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/* ================= Full bell curve ================= */

function BellCurve({
  shadeLo,
  shadeHi,
  labels,
}: {
  shadeLo: number;
  shadeHi: number;
  labels?: { x: number; text: string }[];
}) {
  const W = 520, H = 220;
  const padL = 30, padR = 20, padT = 20, padB = 40;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const XMIN = -4, XMAX = 4;
  const xToPx = (x: number) => padL + ((x - XMIN) / (XMAX - XMIN)) * iw;
  const pdf = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const yMax = pdf(0);
  const yToPx = (y: number) => padT + ih - (y / yMax) * ih;
  const N = 200;
  const curve: string[] = [];
  for (let i = 0; i <= N; i++) {
    const x = XMIN + ((XMAX - XMIN) * i) / N;
    const px = xToPx(x), py = yToPx(pdf(x));
    curve.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`);
  }
  const lo = clamp(shadeLo, XMIN, XMAX);
  const hi = clamp(shadeHi, XMIN, XMAX);
  const shade: string[] = [`M${xToPx(lo).toFixed(2)},${yToPx(0).toFixed(2)}`];
  const M = 200;
  for (let i = 0; i <= M; i++) {
    const x = lo + ((hi - lo) * i) / M;
    shade.push(`L${xToPx(x).toFixed(2)},${yToPx(pdf(x)).toFixed(2)}`);
  }
  shade.push(`L${xToPx(hi).toFixed(2)},${yToPx(0).toFixed(2)} Z`);

  const ticks = [-3, -2, -1, 0, 1, 2, 3];
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label="Standard normal curve">
        <path d={shade.join(" ")} className="fill-primary/25" />
        <path d={curve.join(" ")} className="stroke-primary" strokeWidth={1.8} fill="none" />
        <line x1={padL} y1={yToPx(0)} x2={W - padR} y2={yToPx(0)} className="stroke-border" strokeWidth={1} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={xToPx(t)} y1={yToPx(0)} x2={xToPx(t)} y2={yToPx(0) + 4} className="stroke-border" strokeWidth={1} />
            <text x={xToPx(t)} y={yToPx(0) + 18} textAnchor="middle" fontSize={11} className="fill-muted-foreground">
              {t}
            </text>
          </g>
        ))}
        {labels?.map((l, i) => {
          const cx = clamp(xToPx(l.x), padL, W - padR);
          return (
            <g key={i}>
              <line x1={cx} y1={padT + 4} x2={cx} y2={yToPx(0)} className="stroke-primary" strokeDasharray="3 3" strokeWidth={1} />
              <text x={cx} y={yToPx(0) + 32} textAnchor="middle" fontSize={11} className="fill-primary font-serif italic">
                {l.text}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ================= Tool 1 ================= */

function Tool1() {
  const [xStr, setXStr] = useState("5");
  const [muStr, setMuStr] = useState("3");
  const [sigStr, setSigStr] = useState("2");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{
    x: number; mu: number; sig: number; z: number;
    pLess: number; pMore: number; pBetween: number;
    steps: Step[];
  } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const onCalc = () => {
    setErr(null); setRes(null);
    const x = parseNum(xStr), mu = parseNum(muStr), sig = parseNum(sigStr);
    if (x === null || mu === null || sig === null) { setErr("Enter x, μ and σ."); return; }
    if ([x, mu, sig].some((v) => Number.isNaN(v))) { setErr("Enter valid numbers."); return; }
    if (sig <= 0) { setErr("Standard deviation σ must be positive."); return; }
    const z = (x - mu) / sig;
    const pLess = Phi(z);
    const pMore = 1 - pLess;
    const pBetween = Math.abs(pLess - 0.5);
    const steps: Step[] = [
      {
        title: "Formula",
        body: (
          <>
            <MathNote>The Z-score measures how many standard deviations x is from the mean μ</MathNote>
            <MathLine>z = (x − μ) / σ</MathLine>
          </>
        ),
      },
      {
        title: "Substitute",
        body: (
          <>
            <MathNote>Plug in the raw score, mean and standard deviation</MathNote>
            <MathLine>z = ({x} − {mu}) / {sig}</MathLine>
          </>
        ),
      },
      {
        title: "Simplify",
        body: (
          <>
            <MathLine>z = {fmtZ(x - mu)} / {sig}</MathLine>
            <MathLine>z = {fmtZ(z)}</MathLine>
          </>
        ),
      },
      {
        title: "P(x < given x)",
        body: (
          <>
            <MathNote>Look up the standard-normal CDF at z</MathNote>
            <MathLine>Φ({fmtZ(z)}) = {fmt(pLess)}</MathLine>
          </>
        ),
      },
      {
        title: "P(x > given x)",
        body: (
          <>
            <MathNote>The upper tail is the complement of the CDF</MathNote>
            <MathLine>1 − Φ({fmtZ(z)}) = {fmt(pMore)}</MathLine>
          </>
        ),
      },
      {
        title: "P(μ < x < given x)",
        body: (
          <>
            <MathNote>The area between the mean and x is the distance from Φ(z) to 0.5</MathNote>
            <MathLine>|Φ({fmtZ(z)}) − 0.5| = {fmt(pBetween)}</MathLine>
          </>
        ),
      },
    ];
    setRes({ x, mu, sig, z, pLess, pMore, pBetween, steps });
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
      <h3 className="text-lg font-semibold text-foreground">Tool 1 — Z-score Calculator</h3>
      <p className="mt-1 text-sm text-muted-foreground">Enter a raw score and the distribution's mean and standard deviation.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label="Raw Score, x"><TextInput value={xStr} onChange={(e) => setXStr(e.target.value)} inputMode="decimal" /></Field>
        <Field label="Population Mean, μ"><TextInput value={muStr} onChange={(e) => setMuStr(e.target.value)} inputMode="decimal" /></Field>
        <Field label="Standard Deviation, σ"><TextInput value={sigStr} onChange={(e) => setSigStr(e.target.value)} inputMode="decimal" /></Field>
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
        <button onClick={() => { setRes(null); setErr(null); }} className="rounded-full border border-border/60 bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40">Clear</button>
      </div>
      {err && <div className="mt-4"><ErrorBox message={err} /></div>}
      {res && (
        <div className="mt-5 space-y-4">
          <ResultActions
            filename="z-score-result"
            captureRef={resultRef}
            getCopyText={() =>
              [
                `Z-score Calculator`,
                `x=${res.x} | μ=${res.mu} | σ=${res.sig}`,
                `Z = (x − μ)/σ = ${fmtZ(res.z)}`,
                `P(x<${res.x}) = ${fmt(res.pLess)}`,
                `P(x>${res.x}) = ${fmt(res.pMore)}`,
                `P(${res.mu}<x<${res.x}) = ${fmt(res.pBetween)}`,
              ].join("\n")
            }
          />
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Result</div>
            <div className="mt-2 font-serif italic text-lg">Z-score = <span className="font-semibold text-primary">{fmtZ(res.z)}</span></div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-3"><MiniBell shade="left" z1={res.z} /><span className="font-serif italic">P(x&lt;{res.x}) = {fmt(res.pLess)}</span></li>
              <li className="flex items-center gap-3"><MiniBell shade="right" z1={res.z} /><span className="font-serif italic">P(x&gt;{res.x}) = {fmt(res.pMore)}</span></li>
              <li className="flex items-center gap-3"><MiniBell shade="between" z1={0} z2={res.z} /><span className="font-serif italic">P({res.mu}&lt;x&lt;{res.x}) = {fmt(res.pBetween)}</span></li>
            </ul>
          </div>
          <StepsToggle steps={res.steps} />
          </div>
        </div>
      )}

    </section>
  );
}

/* ================= Tool 2 ================= */

type Tool2Key = "z" | "pLT" | "pGT" | "pZeroTo" | "pSym" | "pTails";

interface Tool2Result {
  z: number; pLT: number; pGT: number; pZeroTo: number; pSym: number; pTails: number;
  fromKey: Tool2Key;
  steps: Step[];
}

function Tool2() {
  const [vals, setVals] = useState<Record<Tool2Key, string>>({
    z: "", pLT: "", pGT: "", pZeroTo: "", pSym: "", pTails: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Tool2Result | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const set = (k: Tool2Key) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setVals((v) => ({ ...v, [k]: e.target.value }));

  const onCalc = () => {
    setErr(null); setRes(null);
    const filled = (Object.keys(vals) as Tool2Key[]).filter((k) => vals[k].trim() !== "");
    if (filled.length === 0) { setErr("Enter exactly one value."); return; }
    if (filled.length > 1) { setErr("Enter only ONE value — the tool derives the rest."); return; }
    const key = filled[0];
    const raw = Number(vals[key]);
    if (!Number.isFinite(raw)) { setErr("Enter a valid number."); return; }

    let z: number;
    try {
      if (key === "z") {
        z = raw;
      } else if (key === "pLT") {
        if (!(raw > 0 && raw < 1)) throw new Error("P(x<Z) must be between 0 and 1.");
        z = invPhi(raw);
      } else if (key === "pGT") {
        if (!(raw > 0 && raw < 1)) throw new Error("P(x>Z) must be between 0 and 1.");
        z = invPhi(1 - raw);
      } else if (key === "pZeroTo") {
        // P(0 to Z or Z to 0) — area between 0 and |Z|; take positive Z
        if (!(raw >= 0 && raw < 0.5)) throw new Error("P(0 to Z or Z to 0) must be in [0, 0.5).");
        z = invPhi(0.5 + raw);
      } else if (key === "pSym") {
        // P(-Z < x < Z) — symmetric interval, take positive Z
        if (!(raw >= 0 && raw < 1)) throw new Error("P(−Z<x<Z) must be in [0, 1).");
        z = invPhi(0.5 + raw / 2);
      } else {
        // pTails: P(x<-Z or x>Z) — two-tail, positive Z
        if (!(raw > 0 && raw <= 1)) throw new Error("P(x<−Z or x>Z) must be in (0, 1].");
        z = invPhi(1 - raw / 2);
      }
    } catch (e) { setErr((e as Error).message); return; }

    const pLT = Phi(z);
    const pGT = 1 - pLT;
    const pZeroTo = Math.abs(pLT - 0.5);
    const az = Math.abs(z);
    const pSym = Phi(az) - Phi(-az);
    const pTails = 1 - pSym;

    const keyLabels: Record<Tool2Key, string> = {
      z: "Z-score",
      pLT: "P(x<Z)",
      pGT: "P(x>Z)",
      pZeroTo: "P(0 to Z or Z to 0)",
      pSym: "P(−Z<x<Z)",
      pTails: "P(x<−Z or x>Z)",
    };

    const solveStep: Step =
      key === "z"
        ? {
            title: "Given Z",
            body: (
              <>
                <MathNote>The Z-score was entered directly</MathNote>
                <MathLine>Z = {fmtZ(z)}</MathLine>
              </>
            ),
          }
        : {
            title: "Solve for Z from the probability",
            body: (
              <>
                <MathNote>
                  Invert the standard-normal CDF: given {keyLabels[key]} = {raw}, find the Z that satisfies Φ(Z) = p
                </MathNote>
                <MathLine>Φ(Z) = {raw}</MathLine>
                <MathLine>Z = Φ⁻¹({raw}) = {fmtZ(z)}</MathLine>
              </>
            ),
          };

    const steps: Step[] = [
      solveStep,
      {
        title: "P(x < Z) — lookup",
        body: (
          <>
            <MathNote>Evaluate the standard-normal CDF at Z</MathNote>
            <MathLine>P(x&lt;Z) = Φ(Z) = Φ({fmtZ(z)}) = {fmt(pLT)}</MathLine>
          </>
        ),
      },
      {
        title: "P(x > Z)",
        body: (
          <>
            <MathNote>The upper tail is the complement of the CDF</MathNote>
            <MathLine>P(x&gt;Z) = 1 − Φ(Z) = 1 − {fmt(pLT)} = {fmt(pGT)}</MathLine>
          </>
        ),
      },
      {
        title: "P(0 to Z or Z to 0)",
        body: (
          <>
            <MathNote>Area between the mean and Z is the distance from Φ(Z) to 0.5</MathNote>
            <MathLine>= |Φ(Z) − 0.5| = |{fmt(pLT)} − 0.5| = {fmt(pZeroTo)}</MathLine>
          </>
        ),
      },
      {
        title: "P(−Z < x < Z)",
        body: (
          <>
            <MathNote>Symmetric interval area = F(|Z|) − F(−|Z|)</MathNote>
            <MathLine>= Φ({fmtZ(az)}) − Φ({fmtZ(-az)})</MathLine>
            <MathLine>= {fmt(pSym)}</MathLine>
          </>
        ),
      },
      {
        title: "P(x < −Z or x > Z)",
        body: (
          <>
            <MathNote>Two-tail area is the complement of the symmetric interval</MathNote>
            <MathLine>= 1 − {fmt(pSym)} = {fmt(pTails)}</MathLine>
          </>
        ),
      },
    ];

    setRes({ z, pLT, pGT, pZeroTo, pSym, pTails, fromKey: key, steps });
  };

  const onClear = () => {
    setVals({ z: "", pLT: "", pGT: "", pZeroTo: "", pSym: "", pTails: "" });
    setRes(null); setErr(null);
  };

  const rows: { k: Tool2Key; label: string; shade: Shade; showZ?: number; showZ2?: number }[] = [
    { k: "z", label: "Z-score, Z", shade: "between", showZ: 0, showZ2: 0 },
    { k: "pLT", label: "Probability, P(x<Z)", shade: "left" },
    { k: "pGT", label: "Probability, P(x>Z)", shade: "right" },
    { k: "pZeroTo", label: "Probability, P(0 to Z or Z to 0)", shade: "between" },
    { k: "pSym", label: "Probability, P(−Z<x<Z)", shade: "between" },
    { k: "pTails", label: "Probability, P(x<−Z or x>Z)", shade: "left" },
  ];

  return (
    <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
      <h3 className="text-lg font-semibold text-foreground">Tool 2 — Z-score and Probability Converter</h3>
      <p className="mt-1 text-sm text-muted-foreground">Provide any ONE value below to convert between Z-score and probability. This replaces the classic Z-table lookup.</p>
      <div className="mt-4 space-y-2">
        {rows.map((r) => {
          const az = res ? Math.abs(res.z) : 0;
          const z1 =
            r.shade === "left" ? (r.k === "pTails" ? -az : (res?.z ?? 0)) :
            r.shade === "right" ? (res?.z ?? 0) :
            r.k === "pSym" ? -az : 0;
          const z2 =
            r.shade === "between"
              ? (r.k === "pSym" ? az : (res?.z ?? 0))
              : 0;
          return (
            <div key={r.k} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-2">
              <MiniBell shade={r.shade} z1={z1} z2={z2} />
              <label className="flex-1 text-sm text-foreground">{r.label}</label>
              <input
                value={vals[r.k]}
                onChange={set(r.k)}
                inputMode="decimal"
                className="w-32 rounded-md border border-border/60 bg-background/60 px-3 py-1.5 font-serif italic text-sm text-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
        <button onClick={onClear} className="rounded-full border border-border/60 bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40">Clear</button>
      </div>
      {err && <div className="mt-4"><ErrorBox message={err} /></div>}
      {res && (
        <div className="mt-5 space-y-4">
          <ResultActions
            filename="z-score-converter-result"
            captureRef={resultRef}
            getCopyText={() =>
              [
                `Z-score / Probability Converter`,
                `Z = ${fmtZ(res.z)}`,
                `P(x<Z) = ${fmt(res.pLT)}`,
                `P(x>Z) = ${fmt(res.pGT)}`,
                `P(0 to |Z|) = ${fmt(res.pZeroTo)}`,
                `P(−|Z|<x<|Z|) = ${fmt(res.pSym)}`,
                `P(x<−|Z| or x>|Z|) = ${fmt(res.pTails)}`,
              ].join("\n")
            }
          />
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Derived values</div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="font-serif italic">
                  <tr><td className="py-1 pr-4 text-muted-foreground">Z</td><td className="text-foreground font-semibold">{fmtZ(res.z)}</td></tr>
                  <tr><td className="py-1 pr-4 text-muted-foreground">P(x&lt;Z)</td><td>{fmt(res.pLT)}</td></tr>
                  <tr><td className="py-1 pr-4 text-muted-foreground">P(x&gt;Z)</td><td>{fmt(res.pGT)}</td></tr>
                  <tr><td className="py-1 pr-4 text-muted-foreground">P(0 to |Z|)</td><td>{fmt(res.pZeroTo)}</td></tr>
                  <tr><td className="py-1 pr-4 text-muted-foreground">P(−|Z|&lt;x&lt;|Z|)</td><td>{fmt(res.pSym)}</td></tr>
                  <tr><td className="py-1 pr-4 text-muted-foreground">P(x&lt;−|Z| or x&gt;|Z|)</td><td>{fmt(res.pTails)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <BellCurve
            shadeLo={-Math.abs(res.z)}
            shadeHi={Math.abs(res.z)}
            labels={[
              { x: -Math.abs(res.z), text: `−|Z| = ${fmtZ(-Math.abs(res.z))}` },
              { x: Math.abs(res.z), text: `|Z| = ${fmtZ(Math.abs(res.z))}` },
            ]}
          />
          <StepsToggle steps={res.steps} />
          </div>
        </div>
      )}

    </section>
  );
}

/* ================= Tool 3 ================= */

function Tool3() {
  const [z1Str, setZ1Str] = useState("-1");
  const [z2Str, setZ2Str] = useState("0");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{ lo: number; hi: number; p: number; steps: Step[] } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  const onCalc = () => {
    setErr(null); setRes(null);
    const a = parseNum(z1Str), b = parseNum(z2Str);
    if (a === null || b === null) { setErr("Enter both Z1 and Z2."); return; }
    if (Number.isNaN(a) || Number.isNaN(b)) { setErr("Enter valid numbers."); return; }
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const pL = Phi(lo), pH = Phi(hi);
    const p = pH - pL;
    const steps: Step[] = [
      {
        title: "Set up",
        body: (
          <>
            <MathNote>The area between two Z-scores is the difference of their CDF values</MathNote>
            <MathLine>P(Z1 &lt; Z &lt; Z2) = Φ(Z2) − Φ(Z1)</MathLine>
          </>
        ),
      },
      {
        title: "Substitute",
        body: (
          <>
            <MathNote>Plug in the two Z bounds</MathNote>
            <MathLine>= Φ({fmtZ(hi)}) − Φ({fmtZ(lo)})</MathLine>
          </>
        ),
      },
      {
        title: "Evaluate",
        body: (
          <>
            <MathLine>= {fmt(pH)} − {fmt(pL)}</MathLine>
            <MathLine>= {fmt(p)}</MathLine>
          </>
        ),
      },
    ];
    setRes({ lo, hi, p, steps });
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
      <h3 className="text-lg font-semibold text-foreground">Tool 3 — Probability Between Two Z-scores</h3>
      <p className="mt-1 text-sm text-muted-foreground">Enter a left and right Z-score; the tool shades the area between them.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Left Bound, Z1"><TextInput value={z1Str} onChange={(e) => setZ1Str(e.target.value)} inputMode="decimal" /></Field>
        <Field label="Right Bound, Z2"><TextInput value={z2Str} onChange={(e) => setZ2Str(e.target.value)} inputMode="decimal" /></Field>
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
        <button onClick={() => { setRes(null); setErr(null); }} className="rounded-full border border-border/60 bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40">Clear</button>
      </div>
      {err && <div className="mt-4"><ErrorBox message={err} /></div>}
      {res && (
        <div className="mt-5 space-y-4">
          <ResultActions
            filename="z-score-interval-result"
            captureRef={resultRef}
            getCopyText={() =>
              [
                `Probability Between Two Z-scores`,
                `Z1 = ${fmtZ(res.lo)} | Z2 = ${fmtZ(res.hi)}`,
                `P(${fmtZ(res.lo)} < Z < ${fmtZ(res.hi)}) = ${fmt(res.p)}`,
              ].join("\n")
            }
          />
          <div ref={resultRef} className="space-y-4 rounded-3xl bg-background/60 p-1">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Result</div>
            <div className="mt-2 font-serif italic text-lg">P({fmtZ(res.lo)} &lt; Z &lt; {fmtZ(res.hi)}) = <span className="font-semibold text-primary">{fmt(res.p)}</span></div>
          </div>
          <BellCurve
            shadeLo={res.lo}
            shadeHi={res.hi}
            labels={[
              { x: res.lo, text: `Z1 = ${fmtZ(res.lo)}` },
              { x: res.hi, text: `Z2 = ${fmtZ(res.hi)}` },
            ]}
          />
          <StepsToggle steps={res.steps} />
          </div>
        </div>
      )}

    </section>
  );
}

/* ================= Page ================= */

/* ================= Guide diagrams ================= */

function ZFormulaDiagram() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 220 120" className="w-full max-w-[220px]" aria-hidden>
        <line x1="10" y1="80" x2="210" y2="80" className="stroke-border" strokeWidth="1" />
        {[-3, -2, -1, 0, 1, 2, 3].map((z) => {
          const x = 110 + z * 30;
          return (
            <g key={z}>
              <line x1={x} y1="76" x2={x} y2="84" className="stroke-border" />
              <text x={x} y="98" fontSize="9" textAnchor="middle" className="fill-muted-foreground">{z}σ</text>
            </g>
          );
        })}
        <circle cx="110" cy="80" r="4" className="fill-muted-foreground" />
        <text x="110" y="70" fontSize="10" textAnchor="middle" className="fill-muted-foreground">μ</text>
        <circle cx="170" cy="80" r="5" className="fill-primary" />
        <text x="170" y="70" fontSize="10" textAnchor="middle" className="fill-primary font-semibold">x</text>
        <text x="110" y="30" fontSize="11" textAnchor="middle" className="fill-foreground font-serif italic">z = (x − μ) / σ</text>
        <text x="110" y="46" fontSize="10" textAnchor="middle" className="fill-primary font-serif italic">= 2</text>
      </svg>
    </div>
  );
}

function ZSignDiagram() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 240 130" className="w-full max-w-[240px]" aria-hidden>
        <BellPathMini cx={120} cy={90} w={220} h={70} />
        <line x1="80" y1="90" x2="80" y2="30" className="stroke-primary" strokeDasharray="3 3" />
        <line x1="160" y1="90" x2="160" y2="30" className="stroke-primary" strokeDasharray="3 3" />
        <text x="80" y="22" fontSize="11" textAnchor="middle" className="fill-primary font-serif italic">z = −1</text>
        <text x="160" y="22" fontSize="11" textAnchor="middle" className="fill-primary font-serif italic">z = +1</text>
        <text x="40" y="110" fontSize="10" textAnchor="middle" className="fill-muted-foreground">below mean</text>
        <text x="200" y="110" fontSize="10" textAnchor="middle" className="fill-muted-foreground">above mean</text>
      </svg>
    </div>
  );
}

function BellPathMini({ cx, cy, w, h }: { cx: number; cy: number; w: number; h: number }) {
  const pts: string[] = [];
  const xmin = cx - w / 2, xmax = cx + w / 2;
  for (let i = 0; i <= 40; i++) {
    const t = -3 + (6 * i) / 40;
    const px = xmin + ((t + 3) / 6) * w;
    const py = cy - Math.exp(-0.5 * t * t) * h;
    pts.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return (
    <>
      <line x1={xmin} y1={cy} x2={xmax} y2={cy} className="stroke-border" />
      <path d={pts.join(" ")} className="stroke-primary" strokeWidth={1.6} fill="none" />
    </>
  );
}

function ZProbDiagram() {
  const cx = 120, cy = 90, w = 220, h = 70;
  const xmin = cx - w / 2;
  const cut = xmin + ((1 + 3) / 6) * w; // shade left of z=1
  const shade: string[] = [`M${xmin},${cy}`];
  for (let i = 0; i <= 40; i++) {
    const t = -3 + (4 * i) / 40; // -3..1
    const px = xmin + ((t + 3) / 6) * w;
    const py = cy - Math.exp(-0.5 * t * t) * h;
    shade.push(`L${px.toFixed(2)},${py.toFixed(2)}`);
  }
  shade.push(`L${cut},${cy} Z`);
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 240 130" className="w-full max-w-[240px]" aria-hidden>
        <path d={shade.join(" ")} className="fill-primary/30" />
        <BellPathMini cx={cx} cy={cy} w={w} h={h} />
        <line x1={cut} y1={cy} x2={cut} y2={30} className="stroke-primary" strokeDasharray="3 3" />
        <text x={cut} y={22} fontSize="11" textAnchor="middle" className="fill-primary font-serif italic">z = 1</text>
        <text x={cx - 30} y={70} fontSize="12" textAnchor="middle" className="fill-foreground font-serif italic">≈ 0.8413</text>
        <text x={cx} y={115} fontSize="10" textAnchor="middle" className="fill-muted-foreground">P(Z &lt; 1) ≈ 84%</text>
      </svg>
    </div>
  );
}

function ZLandmarksDiagram() {
  const cx = 120, cy = 90, w = 220, h = 70;
  const xmin = cx - w / 2;
  const px = (z: number) => xmin + ((z + 3) / 6) * w;
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <svg viewBox="0 0 240 130" className="w-full max-w-[240px]" aria-hidden>
        <BellPathMini cx={cx} cy={cy} w={w} h={h} />
        {[
          { z: -1.96, label: "−1.96" },
          { z: -1, label: "−1" },
          { z: 1, label: "+1" },
          { z: 1.96, label: "+1.96" },
        ].map((m) => (
          <g key={m.z}>
            <line x1={px(m.z)} y1={cy} x2={px(m.z)} y2={30} className="stroke-primary" strokeDasharray="2 3" strokeWidth={0.8} />
            <text x={px(m.z)} y={24} fontSize="9" textAnchor="middle" className="fill-primary font-serif italic">{m.label}</text>
          </g>
        ))}
        <text x={cx} y={115} fontSize="10" textAnchor="middle" className="fill-muted-foreground">68% within ±1σ · 95% within ±1.96σ</text>
      </svg>
    </div>
  );
}

const Z_GUIDE: GuideCardItem[] = [
  {
    key: "def",
    title: "1. What a z-score really measures",
    explain:
      "A z-score converts any raw value into the number of standard deviations it sits from its distribution's mean. That makes scores from different tests or scales directly comparable.",
    formula: <>z = (x − μ) / σ</>,
    legend: [
      { sym: "x", def: "raw score" },
      { sym: "μ", def: "population mean" },
      { sym: "σ", def: "population standard deviation" },
    ],
    diagram: <ZFormulaDiagram />,
    example: {
      given: "x = 5, μ = 3, σ = 2",
      substitute: "(5 − 3) / 2",
      answer: "z = 1",
    },
  },
  {
    key: "sign",
    title: "2. Positive, negative and zero z",
    explain:
      "The sign of z tells you which side of the mean the value falls on. Positive z is above the mean, negative is below, and z = 0 is exactly at the mean. The magnitude tells you how far away in standard-deviation units.",
    formula: <>z &gt; 0 · above ; z &lt; 0 · below ; z = 0 · at mean</>,
    diagram: <ZSignDiagram />,
    example: {
      given: "score 12, μ = 20, σ = 4",
      substitute: "(12 − 20) / 4",
      answer: "z = −2 (two SDs below the mean)",
    },
  },
  {
    key: "prob",
    title: "3. Converting z to a probability",
    explain:
      "The standard-normal CDF Φ(z) gives the fraction of a normal distribution that lies below any z-score. That is what a Z-table looks up — this calculator computes it live from the error function so any z or probability works exactly.",
    formula: <>P(x &lt; value) = Φ(z)</>,
    legend: [{ sym: "Φ", def: "standard-normal cumulative distribution" }],
    diagram: <ZProbDiagram />,
    example: {
      given: "z = 1",
      substitute: "Φ(1)",
      answer: "≈ 0.8413 → about the 84th percentile",
    },
  },
  {
    key: "landmarks",
    title: "4. Landmarks worth memorising",
    explain:
      "A handful of z-values show up everywhere: ±1 covers about 68% of the distribution, ±1.96 covers 95% (the classic 95% confidence cutoff), and ±2.576 covers 99%. Anything in between smoothly interpolates.",
    formula: <>±1 → 68% · ±1.96 → 95% · ±2.576 → 99%</>,
    diagram: <ZLandmarksDiagram />,
    example: {
      given: "95% confidence interval",
      substitute: "critical z = 1.96",
      answer: "x̄ ± 1.96 · SE",
    },
  },
];

/* ================= Page ================= */

function ZScorePage() {
  const landmarks = useMemo(
    () =>
      [-3, -2, -1.96, -1, -0.5, 0, 0.5, 1, 1.645, 1.96, 2, 2.576, 3].map((z) => ({
        z,
        p: Phi(z),
      })),
    [],
  );

  return (
    <MathCalcPage
      name="Z-score Calculator"
      tagline="Convert between raw scores, Z-scores and normal probabilities. Three tools on one page: compute Z from a raw score, convert any single probability back to a Z, and find the area between two Z-scores — all with live standard-normal CDF, no Z-table required."
      extras={
        <>
          <CalcSection title="Z-scores explained, step by step">
            <p className="text-sm text-muted-foreground">
              Each concept below has a plain-English definition, its formula, a small diagram and a worked example — all in one card so you never have to jump between sections to piece it together.
            </p>
            <GuideCards items={Z_GUIDE} />
          </CalcSection>

          <CalcSection title="Common Z-score landmarks">
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Z</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">P(x &lt; Z)</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Percentile</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Note</th>
                  </tr>
                </thead>
                <tbody className="font-serif italic">
                  {landmarks.map((r) => (
                    <tr key={r.z} className="border-t border-border/50">
                      <td className="px-3 py-1.5">{r.z}</td>
                      <td className="px-3 py-1.5">{fmt(r.p)}</td>
                      <td className="px-3 py-1.5">{(r.p * 100).toFixed(2)}%</td>
                      <td className="px-3 py-1.5 text-xs text-muted-foreground font-sans">
                        {r.z === 0 ? "mean" :
                         r.z === 1 ? "≈ 1 SD above" :
                         r.z === -1 ? "≈ 1 SD below" :
                         r.z === 1.645 ? "90% one-tail cutoff" :
                         r.z === 1.96 ? "95% two-tail cutoff" :
                         r.z === -1.96 ? "lower 95% cutoff" :
                         r.z === 2.576 ? "99% two-tail cutoff" :
                         r.z === 2 ? "≈ 97.7th percentile" :
                         r.z === -2 ? "≈ 2.3rd percentile" :
                         r.z === 3 ? "≈ 99.9th percentile" :
                         r.z === -3 ? "≈ 0.1st percentile" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Three tools on one page — raw-score Z, Z↔probability converter, and area between two Z-scores",
                "Standard-normal CDF computed live via the error function (5-decimal precision) — no static Z-table lookup",
                "Small bell-curve icons next to each probability line so the shaded region is always visible",
                "Full-size bell curve with dashed Z1/Z2 markers for the two-bound tool",
                "Step-by-step working with the formula substituted for every result",
                "Inverse normal (Acklam) for the converter — enter any probability, get the exact Z",
              ]}
            />
          </CalcSection>

          
<CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                { q: "What does a Z-score of 1 mean?", a: <>The value is exactly one standard deviation above the mean. In a normal distribution, roughly 84% of values fall below it and about 16% fall above.</> },
                { q: "Can a Z-score be negative?", a: <>Yes. A negative Z means the value lies below the mean. Z = −2 corresponds to about the 2.3rd percentile.</> },
                { q: "Do I need a Z-table with this calculator?", a: <>No. All three tools compute the standard-normal CDF live via the error function, so any Z-score or probability works — no table lookup.</> },
                { q: "Population or sample statistics?", a: <>The classical formula uses population μ and σ. With sample data, substitute the sample mean and sample standard deviation as estimates.</> },
                { q: "Is a Z-score the same as a percentile?", a: <>No, but they map directly via the CDF. The Z is a distance in standard deviations; the percentile is the fraction of the distribution below the value.</> },
                { q: "What Z-score counts as an outlier?", a: <>A common rule is |Z| &gt; 2 for mild outliers and |Z| &gt; 3 for extreme ones — but choose thresholds to match your field and sample size.</> },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
                { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
                { to: "/calculators/math/probability-calculator", label: "Probability Calculator" },
                { to: "/calculators/math/sample-size-calculator", label: "Sample Size Calculator" },
                { to: "/calculators/math/mean-median-mode-calculator", label: "Mean, Median, Mode, Range Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-6">
        <Tool1 />
        <Tool2 />
        <Tool3 />
      </div>
    </MathCalcPage>
  );
}

