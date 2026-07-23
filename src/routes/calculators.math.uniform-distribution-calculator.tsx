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
import { SolutionSteps, type Step } from "@/components/SolutionSteps";

export const Route = createFileRoute("/calculators/math/uniform-distribution-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Uniform Distribution Calculator",
      title: "Uniform Distribution Calculator",
      metaDescription:
        "Compute continuous and discrete uniform PDF, CDF, and interval probabilities with mean, variance, and plot.",
      canonicalUrl: "/calculators/math/uniform-distribution-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Uniform Distribution Calculator", path: "/calculators/math/uniform-distribution-calculator" },
      ],
      faqs: [
        {
          q: "What is a uniform distribution?",
          a: "A distribution in which every outcome in a range is equally likely. Discrete uniform gives each integer in {a, a+1, …, b} the same probability 1/n. Continuous uniform gives every point in the interval [a, b] the same density 1/(b − a), so the probability of landing in a sub-interval is just its length over (b − a).",
        },
        {
          q: "What's the difference between discrete and continuous uniform?",
          a: "Discrete uniform is over a finite set of equally likely outcomes — a fair die, a raffle, a random integer from 1 to 100. Continuous uniform is over an interval of real numbers — a random arrival time within an hour, or a random point on a stick. For continuous, P(X = any single value) = 0 — only intervals have positive probability.",
        },
        {
          q: "What is the mean of a uniform distribution?",
          a: "For both discrete and continuous uniform on [a, b], the mean is (a + b) / 2 — the midpoint of the range. A fair die (1..6) has mean (1+6)/2 = 3.5; a continuous uniform on [0, 60] has mean 30.",
        },
        {
          q: "What is the variance of a uniform distribution?",
          a: "Continuous uniform on [a, b]: variance = (b − a)² / 12. Discrete uniform on {a, …, b} with n = b − a + 1 integers: variance = (n² − 1) / 12. A fair die: (6² − 1)/12 = 35/12 ≈ 2.917.",
        },
        {
          q: "How do I find P(c ≤ X ≤ d) for a continuous uniform?",
          a: "It's just the length of the sub-interval divided by the length of the whole interval: (d − c) / (b − a). If [c, d] pokes outside [a, b], clip it first — only the overlap counts.",
        },
        {
          q: "Is a fair die a uniform distribution?",
          a: "Yes — a discrete uniform on the integers {1, 2, 3, 4, 5, 6}. Each face has probability 1/6, the mean is 3.5, and the variance is 35/12.",
        },
      ],
    }),
  component: UniformDistributionPage,
});

/* ---------------- Helpers ---------------- */

function fmt(x: number, dp = 6): string {
  if (!Number.isFinite(x)) return "—";
  return Number(x.toFixed(dp)).toString();
}

function fmtPct(x: number, dp = 4): string {
  if (!Number.isFinite(x)) return "—";
  const v = x * 100;
  if (v === 0) return "0%";
  if (v === 100) return "100%";
  return `${Number(v.toFixed(dp))}%`;
}

/* ---------------- Educational guide cards ---------------- */

function DiscreteBarsMini() {
  const bars = 6;
  const bw = 240 / bars;
  return (
    <svg viewBox="0 0 260 100" className="w-full" role="img" aria-label="Six equal-height bars showing a discrete uniform distribution">
      {Array.from({ length: bars }, (_, i) => (
        <g key={i}>
          <rect x={10 + i * bw} y={30} width={bw - 6} height={50} rx={3} fill="var(--color-primary)" opacity={0.75} />
          <text x={10 + i * bw + (bw - 6) / 2} y={94} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">{i + 1}</text>
        </g>
      ))}
      <text x={130} y={22} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">P(X = k) = 1/6 for each k</text>
    </svg>
  );
}

function ContinuousRectMini() {
  return (
    <svg viewBox="0 0 260 100" className="w-full" role="img" aria-label="A flat density rectangle from a to b with the sub-interval c to d shaded">
      <rect x={20} y={30} width={220} height={40} fill="var(--color-primary)" opacity={0.18} />
      <rect x={90} y={30} width={80} height={40} fill="var(--color-primary)" opacity={0.75} />
      <line x1={20} y1={70} x2={240} y2={70} stroke="var(--color-border)" />
      <text x={20} y={90} fontSize={10} fill="var(--color-muted-foreground)">a</text>
      <text x={240} y={90} textAnchor="end" fontSize={10} fill="var(--color-muted-foreground)">b</text>
      <text x={90} y={90} fontSize={10} fill="var(--color-primary)">c</text>
      <text x={170} y={90} textAnchor="end" fontSize={10} fill="var(--color-primary)">d</text>
      <text x={130} y={22} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">f(x) = 1/(b − a)</text>
    </svg>
  );
}

function MeanMidpointMini() {
  return (
    <svg viewBox="0 0 260 90" className="w-full" role="img" aria-label="Number line with mean marked at the midpoint between a and b">
      <line x1={20} y1={55} x2={240} y2={55} stroke="var(--color-border)" strokeWidth={2} />
      <circle cx={20} cy={55} r={5} fill="var(--color-primary)" />
      <circle cx={240} cy={55} r={5} fill="var(--color-primary)" />
      <line x1={130} y1={25} x2={130} y2={62} stroke="var(--color-primary)" strokeWidth={2} strokeDasharray="4 3" />
      <text x={20} y={78} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">a</text>
      <text x={240} y={78} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">b</text>
      <text x={130} y={20} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-primary)">μ = (a + b) / 2</text>
    </svg>
  );
}

function SpreadMini() {
  return (
    <svg viewBox="0 0 260 100" className="w-full" role="img" aria-label="Wider range means larger variance for a uniform distribution">
      <rect x={80} y={22} width={100} height={22} fill="var(--color-primary)" opacity={0.45} />
      <text x={130} y={38} textAnchor="middle" fontSize={10} fill="var(--color-foreground)">narrow → small σ²</text>
      <rect x={20} y={58} width={220} height={22} fill="var(--color-primary)" opacity={0.75} />
      <text x={130} y={74} textAnchor="middle" fontSize={10} fill="var(--color-foreground)">wide → larger σ²</text>
    </svg>
  );
}

const UNIF_GUIDE: GuideCardItem[] = [
  {
    key: "discrete-pmf",
    title: "Discrete uniform — every outcome equally likely",
    explain:
      "When the sample space is a finite list of integers {a, a+1, …, b}, every value has the same probability. Divide 1 by the count of outcomes n = b − a + 1 and you have P(X = k) for every k in the range.",
    formula: <>P(X = k) = 1 / n &nbsp;with&nbsp; n = b − a + 1</>,
    legend: [
      { sym: "n", def: "number of integer outcomes" },
      { sym: "a, b", def: "inclusive endpoints of the range" },
    ],
    diagram: <DiscreteBarsMini />,
    example: {
      given: "Fair die: a = 1, b = 6",
      substitute: "n = 6 − 1 + 1 = 6, so P(X = 4) = 1/6",
      answer: "≈ 0.1667 (16.67%)",
    },
  },
  {
    key: "continuous-pdf",
    title: "Continuous uniform — flat density on [a, b]",
    explain:
      "For a continuous range the probability of any single point is 0. Instead, probability is the fraction of the length [a, b] that your sub-interval [c, d] covers. The density f(x) = 1/(b − a) is constant across the whole support.",
    formula: <>P(c ≤ X ≤ d) = (d − c) / (b − a)</>,
    legend: [
      { sym: "b − a", def: "length of the full support" },
      { sym: "d − c", def: "length of the sub-interval you're asking about" },
    ],
    diagram: <ContinuousRectMini />,
    example: {
      given: "Arrival in 0–60 min, window 10–25 min",
      substitute: "(25 − 10) / (60 − 0) = 15/60",
      answer: "= 0.25 (25%)",
    },
  },
  {
    key: "mean",
    title: "Mean — the midpoint",
    explain:
      "Because every outcome carries equal weight, the mean is simply the middle of the range. The same formula works for the discrete and continuous case.",
    formula: <>μ = (a + b) / 2</>,
    legend: [{ sym: "a, b", def: "endpoints of the range" }],
    diagram: <MeanMidpointMini />,
    example: {
      given: "Uniform on [0, 60] minutes",
      substitute: "(0 + 60) / 2",
      answer: "μ = 30 minutes",
    },
  },
  {
    key: "variance",
    title: "Variance — how wide is the range?",
    explain:
      "A wider support means a larger variance. The two formulas are different: discrete uses the integer count n, continuous uses the length b − a directly.",
    formula: (
      <>
        Discrete: σ² = (n² − 1) / 12
        <br />
        Continuous: σ² = (b − a)² / 12
      </>
    ),
    legend: [
      { sym: "n", def: "integer count b − a + 1 (discrete)" },
      { sym: "b − a", def: "range length (continuous)" },
    ],
    diagram: <SpreadMini />,
    example: {
      given: "Fair die (n = 6)",
      substitute: "(6² − 1) / 12 = 35/12",
      answer: "σ² ≈ 2.9167, σ ≈ 1.708",
    },
  },
];

/* ---------------- Diagrams ---------------- */

function DiscreteChart({ a, b, x }: { a: number; b: number; x: number }) {
  const n = b - a + 1;
  const W = 720;
  const H = 240;
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 34;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const p = 1 / n;
  const bw = iw / n;
  const step = Math.max(1, Math.ceil(n / 18));
  const values = Array.from({ length: n }, (_, i) => a + i);

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label={`Discrete uniform on integers ${a} to ${b}, bar at ${x} highlighted`}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[520px]"
      >
        <line x1={padL} y1={padT} x2={padL} y2={padT + ih} stroke="currentColor" className="text-border" />
        <line x1={padL} y1={padT + ih} x2={padL + iw} y2={padT + ih} stroke="currentColor" className="text-border" />
        {[0, 0.5, 1].map((t) => {
          const v = t * p;
          const y = padT + ih - t * ih * 0.9;
          return (
            <g key={t}>
              <line x1={padL - 3} y1={y} x2={padL} y2={y} stroke="currentColor" className="text-muted-foreground/60" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" className="fill-muted-foreground">
                {v.toFixed(3)}
              </text>
            </g>
          );
        })}
        {values.map((k, i) => {
          const h = ih * 0.9;
          const bx = padL + i * bw;
          const y = padT + ih - h;
          const hi = k === x;
          return (
            <rect
              key={k}
              x={bx + Math.min(1, bw * 0.1)}
              y={y}
              width={Math.max(1, bw - Math.min(2, bw * 0.2))}
              height={h}
              className={hi ? "fill-primary" : "fill-primary/25"}
            >
              <title>
                X = {k}: P = {p.toFixed(6)}
              </title>
            </rect>
          );
        })}
        {values
          .filter((k, i) => i % step === 0 || i === n - 1 || i === 0 || k === x)
          .map((k) => {
            const i = k - a;
            const bx = padL + i * bw + bw / 2;
            return (
              <text
                key={k}
                x={bx}
                y={padT + ih + 14}
                textAnchor="middle"
                fontSize="10"
                className="fill-muted-foreground"
              >
                {k}
              </text>
            );
          })}
        <text x={(padL + W - padR) / 2} y={H - 4} textAnchor="middle" fontSize="10" className="fill-muted-foreground">
          Outcome (x) — every bar has the same height 1/n = {p.toFixed(4)}
        </text>
      </svg>
    </div>
  );
}

function ContinuousChart({
  a,
  b,
  c,
  d,
}: {
  a: number;
  b: number;
  c: number;
  d: number;
}) {
  const W = 720;
  const H = 240;
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 34;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const density = 1 / (b - a);
  // padded x-axis
  const pad = (b - a) * 0.08;
  const xMin = a - pad;
  const xMax = b + pad;
  const sx = (v: number) => padL + ((v - xMin) / (xMax - xMin)) * iw;
  const rectH = ih * 0.75;
  const rectY = padT + ih - rectH;
  const cc = Math.max(c, a);
  const dd = Math.min(d, b);
  const hasOverlap = dd > cc;

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label={`Continuous uniform on [${a}, ${b}] with sub-interval [${c}, ${d}] shaded`}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[520px]"
      >
        <line x1={padL} y1={padT} x2={padL} y2={padT + ih} stroke="currentColor" className="text-border" />
        <line x1={padL} y1={padT + ih} x2={padL + iw} y2={padT + ih} stroke="currentColor" className="text-border" />

        {/* density label */}
        <line
          x1={padL - 3}
          y1={rectY}
          x2={padL}
          y2={rectY}
          stroke="currentColor"
          className="text-muted-foreground/60"
        />
        <text x={padL - 6} y={rectY + 3} textAnchor="end" fontSize="10" className="fill-muted-foreground">
          {density.toFixed(4)}
        </text>
        <text x={padL - 6} y={padT + ih + 3} textAnchor="end" fontSize="10" className="fill-muted-foreground">
          0
        </text>

        {/* full pdf rectangle (light) */}
        <rect
          x={sx(a)}
          y={rectY}
          width={sx(b) - sx(a)}
          height={rectH}
          className="fill-primary/20 stroke-primary/50"
          strokeWidth={1}
        />

        {/* shaded sub-interval */}
        {hasOverlap && (
          <rect
            x={sx(cc)}
            y={rectY}
            width={sx(dd) - sx(cc)}
            height={rectH}
            className="fill-primary/70"
          />
        )}

        {/* x-axis ticks: a, b, c, d */}
        {[
          { v: a, label: `a = ${a}` },
          { v: b, label: `b = ${b}` },
          { v: c, label: `c = ${c}` },
          { v: d, label: `d = ${d}` },
        ].map((t, i) => (
          <g key={i}>
            <line
              x1={sx(t.v)}
              y1={padT + ih}
              x2={sx(t.v)}
              y2={padT + ih + 4}
              stroke="currentColor"
              className="text-muted-foreground/60"
            />
            <text
              x={sx(t.v)}
              y={padT + ih + 16}
              textAnchor="middle"
              fontSize="10"
              className="fill-muted-foreground"
            >
              {t.label}
            </text>
          </g>
        ))}

        <text x={(padL + W - padR) / 2} y={H - 4} textAnchor="middle" fontSize="10" className="fill-muted-foreground">
          f(x) = 1/(b − a) on [a, b] — shaded region = P(c ≤ X ≤ d)
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Page ---------------- */

type Mode = "discrete" | "continuous";

interface DiscreteResult {
  kind: "discrete";
  a: number;
  b: number;
  x: number;
  n: number;
  pExact: number;
  inRange: boolean;
  mean: number;
  variance: number;
  sd: number;
}

interface ContinuousResult {
  kind: "continuous";
  a: number;
  b: number;
  c: number;
  d: number;
  cc: number;
  dd: number;
  density: number;
  prob: number;
  mean: number;
  variance: number;
  sd: number;
}

type Result = DiscreteResult | ContinuousResult;

function UniformDistributionPage() {
  const [mode, setMode] = useState<Mode>("discrete");

  // discrete
  const [dA, setDA] = useState("1");
  const [dB, setDB] = useState("6");
  const [dX, setDX] = useState("4");

  // continuous
  const [cA, setCA] = useState("0");
  const [cB, setCB] = useState("60");
  const [cC, setCC] = useState("10");
  const [cD, setCD] = useState("25");

  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setResult(null);

    if (mode === "discrete") {
      const a = Number(dA);
      const b = Number(dB);
      const x = Number(dX);
      if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(x)) {
        setErr("Discrete uniform requires whole-number a, b and x.");
        return;
      }
      if (b < a) {
        setErr("Upper bound b must be at least a.");
        return;
      }
      const n = b - a + 1;
      if (n > 10000) {
        setErr("Please keep the range n = b − a + 1 at 10,000 or fewer values.");
        return;
      }
      const inRange = x >= a && x <= b;
      const pExact = inRange ? 1 / n : 0;
      const mean = (a + b) / 2;
      const variance = (n * n - 1) / 12;
      setResult({
        kind: "discrete",
        a,
        b,
        x,
        n,
        pExact,
        inRange,
        mean,
        variance,
        sd: Math.sqrt(variance),
      });
      return;
    }

    const a = Number(cA);
    const b = Number(cB);
    const c = Number(cC);
    const d = Number(cD);
    if (![a, b, c, d].every(Number.isFinite)) {
      setErr("Please enter numeric values for a, b, c and d.");
      return;
    }
    if (b <= a) {
      setErr("Upper bound b must be strictly greater than a.");
      return;
    }
    if (d < c) {
      setErr("Sub-interval upper bound d must be at least c.");
      return;
    }
    const cc = Math.max(c, a);
    const dd = Math.min(d, b);
    const overlap = Math.max(0, dd - cc);
    const density = 1 / (b - a);
    const prob = overlap * density;
    const mean = (a + b) / 2;
    const variance = Math.pow(b - a, 2) / 12;
    setResult({
      kind: "continuous",
      a,
      b,
      c,
      d,
      cc,
      dd,
      density,
      prob,
      mean,
      variance,
      sd: Math.sqrt(variance),
    });
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    if (result.kind === "discrete") {
      const { a, b, x, n, pExact, mean, variance, sd, inRange } = result;
      return [
        {
          title: "Given — discrete uniform model",
          body: (<FormulaBlock><div>
              With n = b − a + 1 = {b} − {a} + 1 = <strong>{n}</strong> equally likely integer
              outcomes, X ~ DiscreteUniform({a}, {b}) and{" "}
              <code>P(X = x) = 1/n</code> for every x in {"{"}{a}, …, {b}{"}"}.
            </div></FormulaBlock>),
        },
        {
          title: `P(X = ${x})`,
          body: (
            <div>
              {inRange ? (
                <>
                  Since {x} is in the range, <code>P(X = {x}) = 1/{n}</code> ={" "}
                  <strong>{fmt(pExact)}</strong> ({fmtPct(pExact)}).
                </>
              ) : (
                <>
                  {x} is outside the range {a}..{b}, so <strong>P(X = {x}) = 0</strong>.
                </>
              )}
            </div>
          ),
        },
        {
          title: "Substitute — mean",
          body: (<FormulaBlock><div>
              μ = (a + b)/2 = ({a} + {b})/2 = <strong>{fmt(mean)}</strong>.
            </div></FormulaBlock>),
        },
        {
          title: "Answer — variance and SD",
          body: (<FormulaBlock><div>
              σ² = (n² − 1)/12 = ({n}² − 1)/12 = <strong>{fmt(variance)}</strong>. SD ={" "}
              <strong>{fmt(sd)}</strong>.
            </div></FormulaBlock>),
        },
      ];
    }

    const { a, b, c, d, cc, dd, density, prob, mean, variance, sd } = result;
    const overlap = Math.max(0, dd - cc);
    const clipped = cc !== c || dd !== d;
    return [
      {
        title: "Given — continuous uniform model",
        body: (<FormulaBlock><div>
            With X ~ Uniform({a}, {b}), the density is constant on [a, b]:{" "}
            <code>f(x) = 1/(b − a) = 1/({b} − {a}) = {fmt(density)}</code>. Outside [a, b] the
            density is 0.
          </div></FormulaBlock>),
      },
      {
        title: `P(${c} ≤ X ≤ ${d})`,
        body: (
          <div>
            {clipped && (
              <p>
                The sub-interval [{c}, {d}] extends outside [a, b], so we clip to the overlap [
                {fmt(cc)}, {fmt(dd)}] first.
              </p>
            )}
            The probability is the length of the (clipped) sub-interval over the total length:
            <br />
            <code>
              P = ({fmt(dd)} − {fmt(cc)}) / ({b} − {a}) = {fmt(overlap)} / {fmt(b - a)} ={" "}
              {fmt(prob)}
            </code>{" "}
            (<strong>{fmtPct(prob)}</strong>).
          </div>
        ),
      },
      {
        title: "Substitute — mean",
        body: (<FormulaBlock><div>
            μ = (a + b)/2 = ({a} + {b})/2 = <strong>{fmt(mean)}</strong>.
          </div></FormulaBlock>),
      },
      {
        title: "Answer — variance and SD",
        body: (<FormulaBlock><div>
            σ² = (b − a)²/12 = ({b} − {a})²/12 = <strong>{fmt(variance)}</strong>. SD ={" "}
            <strong>{fmt(sd)}</strong>.
          </div></FormulaBlock>),
      },
    ];
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    if (result.kind === "discrete") {
      return [
        `Discrete uniform on [${result.a}, ${result.b}] (n = ${result.n})`,
        `P(X = ${result.x}) = ${fmt(result.pExact)} (${fmtPct(result.pExact)})`,
        `Mean = ${fmt(result.mean)}, Variance = ${fmt(result.variance)}, SD = ${fmt(result.sd)}`,
      ].join("\n");
    }
    return [
      `Continuous uniform on [${result.a}, ${result.b}]`,
      `Density f(x) = ${fmt(result.density)}`,
      `P(${result.c} ≤ X ≤ ${result.d}) = ${fmt(result.prob)} (${fmtPct(result.prob)})`,
      `Mean = ${fmt(result.mean)}, Variance = ${fmt(result.variance)}, SD = ${fmt(result.sd)}`,
    ].join("\n");
  }, [result]);

  return (
    <MathCalcPage
      name="Uniform Distribution Calculator"
      tagline="Discrete or continuous uniform on [a, b] — probabilities, mean and variance, with a shaded PDF/PMF chart and show/hide step-by-step working."
      extras={
        <>
          <CalcSection title="What is a uniform distribution?">
            <p>
              A <strong>uniform distribution</strong> is the simplest kind of probability
              distribution: every outcome in a specified range is equally likely. There are two
              flavours — one for a finite list of values (like a fair die) and one for a continuous
              interval (like a random arrival time within an hour).
            </p>
            <p>
              A fair six-sided die is the classic <em>discrete</em> uniform: each face 1–6 has
              probability 1/6, and the mean of the roll is (1 + 6)/2 = 3.5. A random second within
              a given hour is the classic <em>continuous</em> uniform: every instant in the
              3600-second window is equally likely, and the mean arrival time is exactly halfway
              through.
            </p>
          </CalcSection>

<CalcSection title="The uniform distribution, piece by piece">
            <GuideCards items={UNIF_GUIDE} />
          </CalcSection>



          <CalcSection title="Common mistakes">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Using (b − a)²/12 for a discrete range.</strong> The discrete formula is
                (n² − 1)/12 with n = b − a + 1. For a fair die that's 35/12, not 25/12.
              </li>
              <li>
                <strong>Forgetting the +1 in the count.</strong> There are b − a + 1 integers in{" "}
                {"{a, …, b}"}, not b − a — the interval includes both endpoints.
              </li>
              <li>
                <strong>Treating P(X = x) as non-zero for a continuous uniform.</strong> A single
                point has probability 0; only intervals do. Use P(c ≤ X ≤ d).
              </li>
              <li>
                <strong>Not clipping [c, d] to [a, b].</strong> If your sub-interval pokes outside
                the support, only the overlap contributes — this calculator clips automatically.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Toggle between discrete and continuous uniform in a single tool.",
                "Discrete mode: P(X = x) for any integer, plus n, mean (a+b)/2 and variance (n² − 1)/12.",
                "Continuous mode: P(c ≤ X ≤ d) = (d − c)/(b − a), density f(x) = 1/(b − a), mean and variance (b − a)²/12.",
                "Automatic clipping when [c, d] extends beyond [a, b] — only the overlap counts.",
                "Shaded PDF/PMF diagram — flat bars for discrete, a rectangle with the sub-interval highlighted for continuous.",
                "Show/hide step-by-step working with your own numbers substituted into every formula.",
                "Copy the summary as text or download the result panel as a PNG.",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "Why is the variance of a fair die 35/12, not 25/12?",
                  a: <p>Because n = 6 (six equally likely faces), not 5. The discrete formula is (n² − 1)/12 = (36 − 1)/12 = 35/12 ≈ 2.917.</p>,
                },
                {
                  q: "Can a and b be negative?",
                  a: <p>Yes — the formulas only care about b − a. Uniform(−10, 10) has mean 0 and variance 400/12 ≈ 33.33.</p>,
                },
                {
                  q: "What if a = b?",
                  a: <p>The distribution collapses to a single value. Discrete: n = 1 and P(X = a) = 1. Continuous: it's a degenerate point, not a valid uniform — this calculator requires b &gt; a for continuous mode.</p>,
                },
                {
                  q: "Is Uniform(0, 1) special?",
                  a: <p>It's the standard uniform — the default output of most random-number generators, and the building block for sampling from any other distribution via the inverse-CDF method.</p>,
                },
                {
                  q: "How is this related to the exponential distribution?",
                  a: <p>They're not the same shape at all — exponential is skewed with a heavy right tail. But both are common models for waiting times: uniform when arrivals are equally likely across a window, exponential when they follow a memoryless Poisson process.</p>,
                },
                {
                  q: "Can I use this for a random number generator's output?",
                  a: <p>Yes. If you sample a random integer from a to b inclusive, that's discrete uniform. If you sample a random real in [a, b], that's continuous uniform — use this tool to reason about the probability of landing in any sub-range.</p>,
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/probability-calculator", label: "Probability Calculator" },
                { to: "/calculators/math/random-number-calculator", label: "Random Number Generator" },
                { to: "/calculators/math/binomial-distribution-calculator", label: "Binomial Distribution Calculator" },
                { to: "/calculators/math/geometric-distribution-calculator", label: "Geometric Distribution Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="mb-4 inline-flex rounded-xl border border-border/60 bg-secondary/30 p-1 text-sm">
        {(
          [
            { id: "discrete", label: "Discrete" },
            { id: "continuous", label: "Continuous" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setMode(t.id);
              setResult(null);
              setErr(null);
            }}
            className={
              "rounded-lg px-4 py-1.5 transition " +
              (mode === t.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "discrete" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Lower bound (a)" hint="Whole number. Smallest possible value.">
            <TextInput type="number" inputMode="numeric" value={dA} onChange={(e) => setDA(e.target.value)} />
          </Field>
          <Field label="Upper bound (b)" hint="Whole number ≥ a. Largest possible value.">
            <TextInput type="number" inputMode="numeric" value={dB} onChange={(e) => setDB(e.target.value)} />
          </Field>
          <Field label="Target value (x)" hint="Whole number — the outcome to compute P(X = x) for.">
            <TextInput type="number" inputMode="numeric" value={dX} onChange={(e) => setDX(e.target.value)} />
          </Field>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lower bound (a)" hint="Any real number.">
            <TextInput type="number" inputMode="decimal" value={cA} onChange={(e) => setCA(e.target.value)} />
          </Field>
          <Field label="Upper bound (b)" hint="Must be strictly greater than a.">
            <TextInput type="number" inputMode="decimal" value={cB} onChange={(e) => setCB(e.target.value)} />
          </Field>
          <Field label="Sub-interval start (c)" hint="Lower end of the range you want the probability for.">
            <TextInput type="number" inputMode="decimal" value={cC} onChange={(e) => setCC(e.target.value)} />
          </Field>
          <Field label="Sub-interval end (d)" hint="Upper end. If [c, d] extends outside [a, b] only the overlap counts.">
            <TextInput type="number" inputMode="decimal" value={cD} onChange={(e) => setCD(e.target.value)} />
          </Field>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <PrimaryButton onClick={compute}>Compute probability</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <div ref={resultRef} className="mt-5 space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {result.kind === "discrete"
                ? `Discrete uniform on [${result.a}, ${result.b}] — n = ${result.n}`
                : `Continuous uniform on [${result.a}, ${result.b}]`}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {result.kind === "discrete" ? (
                <>
                  <ResultTile label={`P(X = ${result.x})`} value={fmtPct(result.pExact)} sub={fmt(result.pExact)} />
                  <ResultTile label="Mean μ" value={fmt(result.mean)} sub="(a + b)/2" />
                  <ResultTile label="Variance σ²" value={fmt(result.variance)} sub={`SD ≈ ${fmt(result.sd, 4)}`} />
                </>
              ) : (
                <>
                  <ResultTile
                    label={`P(${result.c} ≤ X ≤ ${result.d})`}
                    value={fmtPct(result.prob)}
                    sub={fmt(result.prob)}
                  />
                  <ResultTile label="Mean μ" value={fmt(result.mean)} sub="(a + b)/2" />
                  <ResultTile label="Variance σ²" value={fmt(result.variance)} sub={`SD ≈ ${fmt(result.sd, 4)}`} />
                </>
              )}
            </div>
            {result.kind === "continuous" && (
              <div className="mt-3 text-sm text-muted-foreground">
                Density f(x) ={" "}
                <span className="tabular-nums text-foreground">{fmt(result.density)}</span> on [
                {result.a}, {result.b}].
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {result.kind === "discrete"
                ? `Discrete uniform PMF — bar at x = ${result.x} highlighted`
                : `Continuous uniform PDF — [${result.c}, ${result.d}] shaded`}
            </div>
            {result.kind === "discrete" ? (
              <DiscreteChart a={result.a} b={result.b} x={result.x} />
            ) : (
              <ContinuousChart a={result.a} b={result.b} c={result.c} d={result.d} />
            )}
          </div>

          <SolutionSteps steps={steps} />

          <ResultActions
            getCopyText={() => summary}
            captureRef={resultRef}
            filename={
              result.kind === "discrete"
                ? `uniform-discrete-a${result.a}-b${result.b}-x${result.x}`
                : `uniform-continuous-a${result.a}-b${result.b}-c${result.c}-d${result.d}`
            }
          />
        </div>
      )}
    </MathCalcPage>
  );
}

function ResultTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground tabular-nums">{sub}</div>}
    </div>
  );
}
