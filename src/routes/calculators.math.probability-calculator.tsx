import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ResultActions } from "@/components/ResultActions";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
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
import { CopyButton } from "@/components/CopyButton";
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

export const Route = createFileRoute("/calculators/math/probability-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Probability Calculator",
      title: "Probability Calculator — Two Events, Solver & Normal",
      metaDescription:
        "Combine two independent events, solve unknowns from any two knowns, chain a series, and get the probability of a normal range with a shaded bell curve.",
      canonicalUrl: "/calculators/math/probability-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Probability Calculator", path: "/calculators/math/probability-calculator" },
      ],
      faqs: [
        {
          q: "What's the difference between independent and mutually exclusive events?",
          a: "Independent events do not affect each other — knowing that A happened does not change the probability of B. Mutually exclusive events cannot both happen — if A happens, B cannot. Independent events almost always have some overlap (P(A∩B) = P(A)·P(B) > 0), while mutually exclusive events have P(A∩B) = 0 by definition. Two events cannot be both independent and mutually exclusive unless one has probability zero.",
        },
        {
          q: "How do I calculate the probability of an event NOT happening?",
          a: "Subtract the probability from 1. If P(A) = 0.3, then P(A') = 1 − 0.3 = 0.7. This is called the complement rule and is one of the most useful shortcuts in probability.",
        },
        {
          q: "Does the two-event tool assume independence?",
          a: "Yes. Tool 1 assumes A and B are independent, so P(A∩B) = P(A)·P(B). If your events are not independent, use Tool 2 (the solver) and enter the actual P(A∩B) or P(A∪B) directly instead of letting the tool infer it.",
        },
        {
          q: "What is a Z-score?",
          a: "A Z-score is how many standard deviations a value is above (positive) or below (negative) the mean. Z = (x − μ) / σ. It lets you compare values from different normal distributions on a common scale. The normal-distribution tool converts your bounds into Z-scores automatically and computes the exact probability, so no manual Z-table lookup is needed.",
        },
        {
          q: "Can bounds be negative or unbounded?",
          a: "Yes. Type -inf for a lower bound of −∞ and inf for an upper bound of +∞. Bounds can also be negative numbers — the tool handles any real range.",
        },
        {
          q: "What is XOR probability?",
          a: "Exclusive OR — exactly one of A or B happens, but not both. P(A XOR B) = P(A) + P(B) − 2·P(A∩B). It's the union minus twice the intersection because you remove the both-happen case entirely.",
        },
      ],
    }),
  component: ProbabilityPage,
});

/* ================= Utilities ================= */
function fmt(n: number, digits = 6): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const s = n.toFixed(digits);
  // trim trailing zeros
  return s.replace(/\.?0+$/, "");
}
function isProb(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && n <= 1;
}
function parseProb(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/* erf approx (Abramowitz & Stegun 7.1.26) — max error ~1.5e-7 */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 -
    (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}
function normalCdf(x: number, mu: number, sigma: number): number {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

/* ================= Page ================= */
function ProbabilityPage() {
  return (
    <MathCalcPage
      name="Probability Calculator"
      tagline="Work with probabilities four ways — combine two independent events, solve for unknowns from any two knowns, chain a series of independent events, or find the probability a normal-distribution value lands in a range, with a shaded bell curve."
      extras={<Extras />}
    >
      <div className="space-y-8">
        <TwoEventsTool />
        <SolverTool />
        <SeriesTool />
        <NormalTool />
      </div>
    </MathCalcPage>
  );
}

/* ================= Tool 1 — Two Events (independent) ================= */
function TwoEventsTool() {
  const [pa, setPa] = useState("0.6");
  const [pb, setPb] = useState("0.4");
  const [result, setResult] = useState<null | {
    a: number; b: number; na: number; nb: number;
    inter: number; union: number; nUnion: number; nInter: number;
    aOnly: number; bOnly: number; xor: number;
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  function calc() {
    setError(null);
    const a = Number(pa);
    const b = Number(pb);
    if (!isProb(a) || !isProb(b)) {
      setError("Both P(A) and P(B) must be numbers between 0 and 1.");
      setResult(null);
      return;
    }
    const inter = a * b; // independence assumption
    const union = a + b - inter;
    setResult({
      a, b,
      na: 1 - a, nb: 1 - b,
      inter, union,
      nUnion: 1 - union,
      nInter: 1 - inter,
      aOnly: a - inter,
      bOnly: b - inter,
      xor: a + b - 2 * inter,
    });
  }

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const { a, b, inter, union } = result;
    return [
      {
        title: "Given",
        body: (
          <>
            <MathNote>Two events A and B, assumed independent</MathNote>
            <MathLine>P(A) = {fmt(a)}</MathLine>
            <MathLine>P(B) = {fmt(b)}</MathLine>
          </>
        ),
      },
      {
        title: "Complements",
        body: (
          <>
            <MathNote>The complement of an event is 1 minus its probability</MathNote>
            <MathLine>P(A') = 1 − {fmt(a)} = {fmt(1 - a)}</MathLine>
            <MathLine>P(B') = 1 − {fmt(b)} = {fmt(1 - b)}</MathLine>
          </>
        ),
      },
      {
        title: "Intersection",
        body: (
          <>
            <MathNote>For independent events, P(A ∩ B) = P(A)·P(B)</MathNote>
            <MathLine>P(A ∩ B) = P(A) × P(B)</MathLine>
            <MathLine>P(A ∩ B) = {fmt(a)} × {fmt(b)}</MathLine>
            <MathLine>P(A ∩ B) = {fmt(inter)}</MathLine>
          </>
        ),
      },
      {
        title: "Union",
        body: (
          <>
            <MathNote>Inclusion–exclusion: add both probabilities, then remove the double-counted overlap</MathNote>
            <MathLine>P(A ∪ B) = P(A) + P(B) − P(A ∩ B)</MathLine>
            <MathLine>P(A ∪ B) = {fmt(a)} + {fmt(b)} − {fmt(inter)}</MathLine>
            <MathLine>P(A ∪ B) = {fmt(union)}</MathLine>
          </>
        ),
      },
      {
        title: "Neither and exactly one (XOR)",
        body: (
          <>
            <MathNote>Neither happening is the complement of the union; XOR is the union minus twice the overlap</MathNote>
            <MathLine>P((A ∪ B)') = 1 − {fmt(union)} = {fmt(1 - union)}</MathLine>
            <MathLine>P(A XOR B) = P(A) + P(B) − 2·P(A ∩ B)</MathLine>
            <MathLine>P(A XOR B) = {fmt(a)} + {fmt(b)} − 2 × {fmt(inter)} = {fmt(a + b - 2 * inter)}</MathLine>
          </>
        ),
      },
    ];
  }, [result]);

  return (
    <section className="rounded-2xl border border-border bg-background/40 p-5">
      <h2 className="mb-1 font-display text-xl font-semibold text-foreground">1. Probability of Two Events</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Assumes A and B are <b>independent</b>, so P(A ∩ B) = P(A) · P(B). For dependent events, use the solver below and enter P(A ∩ B) directly.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Probability of A — P(A)" htmlFor="pa">
          <TextInput id="pa" value={pa} onChange={(e) => setPa(e.target.value)} inputMode="decimal" />
        </Field>
        <Field label="Probability of B — P(B)" htmlFor="pb">
          <TextInput id="pb" value={pb} onChange={(e) => setPb(e.target.value)} inputMode="decimal" />
        </Field>
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryButton onClick={calc}>Calculate</PrimaryButton>
        <button
          type="button"
          onClick={() => { setPa(""); setPb(""); setResult(null); setError(null); }}
          className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >Clear</button>
      </div>
      {error && <ErrorBox message={error} />}
      {result && (
        <>
          <ResultActions
            className="mt-5"
            filename="probability-two-events-result"
            captureRef={resultRef}
            getCopyText={() =>
              [
                `Probability of Two Events (independent)`,
                `P(A)=${fmt(result.a)} | P(B)=${fmt(result.b)}`,
                `P(A ∩ B) = ${fmt(result.inter)}`,
                `P(A ∪ B) = ${fmt(result.union)}`,
                `P((A ∪ B)') = ${fmt(result.nUnion)}`,
                `P(A only) = ${fmt(result.aOnly)} | P(B only) = ${fmt(result.bOnly)}`,
                `P(A XOR B) = ${fmt(result.xor)}`,
              ].join("\n")
            }
          />
          <div ref={resultRef} className="rounded-3xl bg-background/60 p-1">
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <ResultRow label="P(A')" value={result.na} />
            <ResultRow label="P(B')" value={result.nb} />
            <ResultRow label="P(A ∩ B)" value={result.inter} highlight />
            <ResultRow label="P(A ∪ B)" value={result.union} highlight />
            <ResultRow label="P((A ∪ B)')" value={result.nUnion} />
            <ResultRow label="P(A' ∩ B') = neither" value={(1 - result.a) * (1 - result.b)} />
            <ResultRow label="P(A but not B)" value={result.aOnly} />
            <ResultRow label="P(B but not A)" value={result.bOnly} />
            <ResultRow label="P(A XOR B) = exactly one" value={result.xor} />
          </div>
          <div className="mt-5">
            <VennGallery pA={result.a} pB={result.b} pInter={result.inter} />
          </div>
          <StepsToggle steps={steps} />
          </div>
        </>
      )}

    </section>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={
        "flex items-center justify-between rounded-xl border px-3 py-2 " +
        (highlight
          ? "border-primary/40 bg-primary/[0.06]"
          : "border-border/60 bg-secondary/20")
      }
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-serif italic tabular-nums text-foreground">{fmt(value)}</span>
        <CopyButton text={fmt(value)} label="" />
      </span>
    </div>
  );
}

/* Venn diagram gallery: renders one small labeled diagram per set-theory
 * identity, with the corresponding region shaded — mirrors the reference
 * layout on calculator.net so each formula has its own visual. */
type Region =
  | "A" | "B" | "notA" | "notB"
  | "inter" | "union" | "neither" | "notInter"
  | "aOnly" | "bOnly" | "xor";

/** Single small Venn with a specific region shaded via SVG masks. */
function VennRegion({
  region,
  label,
  value,
}: {
  region: Region;
  label: string;
  value?: number;
}) {
  // universe box + two circles
  const W = 180, H = 110;
  const AX = 70, BX = 110, CY = 55, R = 42;
  const uid = `${region}-${Math.random().toString(36).slice(2, 8)}`;

  // Masks: white = shown, black = hidden
  // We define per-shape masks and combine as needed.
  return (
    <figure className="rounded-xl border border-border/60 bg-background/40 p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
        <defs>
          {/* Mask: inside A only (A minus B) */}
          <mask id={`m-aOnly-${uid}`}>
            <rect width={W} height={H} fill="black" />
            <circle cx={AX} cy={CY} r={R} fill="white" />
            <circle cx={BX} cy={CY} r={R} fill="black" />
          </mask>
          {/* Mask: inside B only (B minus A) */}
          <mask id={`m-bOnly-${uid}`}>
            <rect width={W} height={H} fill="black" />
            <circle cx={BX} cy={CY} r={R} fill="white" />
            <circle cx={AX} cy={CY} r={R} fill="black" />
          </mask>
          {/* Mask: intersection */}
          <mask id={`m-inter-${uid}`}>
            <rect width={W} height={H} fill="black" />
            <circle cx={AX} cy={CY} r={R} fill="white" />
            <circle cx={BX} cy={CY} r={R} fill="white" style={{ mixBlendMode: "multiply" }} />
          </mask>
          {/* Mask: outside both (neither) */}
          <mask id={`m-neither-${uid}`}>
            <rect width={W} height={H} fill="white" />
            <circle cx={AX} cy={CY} r={R} fill="black" />
            <circle cx={BX} cy={CY} r={R} fill="black" />
          </mask>
          {/* Mask: outside A */}
          <mask id={`m-notA-${uid}`}>
            <rect width={W} height={H} fill="white" />
            <circle cx={AX} cy={CY} r={R} fill="black" />
          </mask>
          {/* Mask: outside B */}
          <mask id={`m-notB-${uid}`}>
            <rect width={W} height={H} fill="white" />
            <circle cx={BX} cy={CY} r={R} fill="black" />
          </mask>
          {/* Mask: outside intersection (everything except A∩B) */}
          <mask id={`m-notInter-${uid}`}>
            <rect width={W} height={H} fill="white" />
            <g mask={`url(#m-inter-${uid})`}>
              <rect width={W} height={H} fill="black" />
            </g>
          </mask>
        </defs>

        {/* Universe rectangle outline */}
        <rect x="1" y="1" width={W - 2} height={H - 2} fill="none" className="stroke-border" strokeWidth="1" />

        {/* Shaded region */}
        <ShadedRegion region={region} uid={uid} W={W} H={H} AX={AX} BX={BX} CY={CY} R={R} />

        {/* Circle outlines on top */}
        <circle cx={AX} cy={CY} r={R} className="stroke-foreground/60" fill="none" strokeWidth="1.2" />
        <circle cx={BX} cy={CY} r={R} className="stroke-foreground/60" fill="none" strokeWidth="1.2" />

        {/* Set labels */}
        <text x={AX - R + 4} y={CY - R - 2} className="fill-foreground" fontSize="10" fontWeight="700">A</text>
        <text x={BX + R - 10} y={CY - R - 2} className="fill-foreground" fontSize="10" fontWeight="700">B</text>
        <text x={W - 6} y={H - 4} textAnchor="end" className="fill-muted-foreground" fontSize="8">U</text>
      </svg>
      <figcaption className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {value !== undefined && (
          <span className="font-serif italic text-xs tabular-nums text-primary">{fmt(value, 4)}</span>
        )}
      </figcaption>
    </figure>
  );
}

function ShadedRegion({
  region, uid, W, H, AX, BX, CY, R,
}: {
  region: Region; uid: string;
  W: number; H: number; AX: number; BX: number; CY: number; R: number;
}) {
  const fill = "fill-primary";
  const op = 0.42;
  const rect = <rect width={W} height={H} className={fill} fillOpacity={op} />;
  switch (region) {
    case "A":
      return <circle cx={AX} cy={CY} r={R} className={fill} fillOpacity={op} />;
    case "B":
      return <circle cx={BX} cy={CY} r={R} className={fill} fillOpacity={op} />;
    case "aOnly":
      return <g mask={`url(#m-aOnly-${uid})`}>{rect}</g>;
    case "bOnly":
      return <g mask={`url(#m-bOnly-${uid})`}>{rect}</g>;
    case "inter":
      return (
        <g>
          {/* Draw B then clip to A by re-drawing B masked to A */}
          <g mask={`url(#m-notA-${uid})`}>
            <circle cx={BX} cy={CY} r={R} fill="transparent" />
          </g>
          <g clipPath={`url(#cp-A-${uid})`}>
            <circle cx={BX} cy={CY} r={R} className={fill} fillOpacity={op} />
          </g>
          <defs>
            <clipPath id={`cp-A-${uid}`}>
              <circle cx={AX} cy={CY} r={R} />
            </clipPath>
          </defs>
        </g>
      );
    case "union":
      return (
        <g className={fill} fillOpacity={op}>
          <circle cx={AX} cy={CY} r={R} fill="currentColor" />
          <circle cx={BX} cy={CY} r={R} fill="currentColor" />
        </g>
      );
    case "neither":
      return <g mask={`url(#m-neither-${uid})`}>{rect}</g>;
    case "notA":
      return <g mask={`url(#m-notA-${uid})`}>{rect}</g>;
    case "notB":
      return <g mask={`url(#m-notB-${uid})`}>{rect}</g>;
    case "notInter":
      return (
        <g>
          {/* Whole universe shaded, minus the intersection */}
          <g mask={`url(#m-notInter-${uid})`}>{rect}</g>
        </g>
      );
    case "xor":
      return (
        <g>
          <g mask={`url(#m-aOnly-${uid})`}>{rect}</g>
          <g mask={`url(#m-bOnly-${uid})`}>{rect}</g>
        </g>
      );
  }
}

function VennGallery({
  pA, pB, pInter,
}: { pA: number; pB: number; pInter: number }) {
  const items: { region: Region; label: string; value: number }[] = [
    { region: "notA", label: "P(A')", value: 1 - pA },
    { region: "notB", label: "P(B')", value: 1 - pB },
    { region: "inter", label: "P(A ∩ B)", value: pInter },
    { region: "union", label: "P(A ∪ B)", value: pA + pB - pInter },
    { region: "neither", label: "P((A ∪ B)') = neither", value: 1 - (pA + pB - pInter) },
    { region: "notInter", label: "P((A ∩ B)') = not both", value: 1 - pInter },
    { region: "aOnly", label: "P(A but not B)", value: pA - pInter },
    { region: "bOnly", label: "P(B but not A)", value: pB - pInter },
    { region: "xor", label: "P(A XOR B) = exactly one", value: pA + pB - 2 * pInter },
  ];
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <div className="mb-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Venn diagrams — shaded region = probability
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((it) => (
          <VennRegion key={it.region} region={it.region} label={it.label} value={it.value} />
        ))}
      </div>
    </div>
  );
}

/* ================= Tool 2 — Solver ================= */
type Key = "a" | "b" | "na" | "nb" | "i" | "u" | "nu" | "ni";
const KEYS: { k: Key; label: string }[] = [
  { k: "a", label: "P(A)" },
  { k: "b", label: "P(B)" },
  { k: "na", label: "P(A')" },
  { k: "nb", label: "P(B')" },
  { k: "i", label: "P(A ∩ B)" },
  { k: "u", label: "P(A ∪ B)" },
  { k: "nu", label: "P((A ∪ B)')" },
  { k: "ni", label: "P((A ∩ B)')" },
];

const KEY_LABEL: Record<Key, string> = {
  a: "P(A)", b: "P(B)", na: "P(A')", nb: "P(B')",
  i: "P(A ∩ B)", u: "P(A ∪ B)", nu: "P((A ∪ B)')", ni: "P((A ∩ B)')",
};

function solve(known: Partial<Record<Key, number>>): { values: Record<Key, number>; trail: Step[]; error?: string } {
  const v: Partial<Record<Key, number>> = { ...known };
  const trail: Step[] = [];
  const EPS = 1e-9;

  const givens = KEYS.filter(({ k }) => v[k] !== undefined)
    .map(({ k }) => `${KEY_LABEL[k]} = ${fmt(v[k]!)}`);
  trail.push({
    title: "Start with the known values",
    body: (
      <>
        <MathNote>Values entered directly</MathNote>
        {givens.map((g, i) => <MathLine key={i}>{g}</MathLine>)}
      </>
    ),
  });

  const set = (k: Key, val: number, reason: React.ReactNode): boolean => {
    if (!Number.isFinite(val)) return false;
    if (val < -EPS || val > 1 + EPS) throw new Error(`Derived ${KEY_LABEL[k]} = ${fmt(val)} is outside [0, 1] — inputs are contradictory.`);
    const clamped = Math.min(1, Math.max(0, val));
    if (v[k] !== undefined) {
      if (Math.abs(v[k]! - clamped) > 1e-6) {
        throw new Error(`Contradictory values for ${KEY_LABEL[k]}: given ${fmt(v[k]!)}, derived ${fmt(clamped)}.`);
      }
      return false;
    }
    v[k] = clamped;
    trail.push({
      title: `Derive ${KEY_LABEL[k]} = ${fmt(clamped)}`,
      body: (
        <>
          <MathNote>{reason}</MathNote>
          <MathLine>{KEY_LABEL[k]} = {fmt(clamped)}</MathLine>
        </>
      ),
    });
    return true;
  };

  try {
    for (let iter = 0; iter < 20; iter++) {
      let changed = false;
      if (v.a !== undefined && v.na === undefined) changed = set("na", 1 - v.a!, <>Complement: P(A') = 1 − P(A) = 1 − {fmt(v.a!)}</>) || changed;
      if (v.na !== undefined && v.a === undefined) changed = set("a", 1 - v.na!, <>Complement: P(A) = 1 − P(A') = 1 − {fmt(v.na!)}</>) || changed;
      if (v.b !== undefined && v.nb === undefined) changed = set("nb", 1 - v.b!, <>Complement: P(B') = 1 − P(B) = 1 − {fmt(v.b!)}</>) || changed;
      if (v.nb !== undefined && v.b === undefined) changed = set("b", 1 - v.nb!, <>Complement: P(B) = 1 − P(B') = 1 − {fmt(v.nb!)}</>) || changed;
      if (v.u !== undefined && v.nu === undefined) changed = set("nu", 1 - v.u!, <>Complement: P((A ∪ B)') = 1 − P(A ∪ B) = 1 − {fmt(v.u!)}</>) || changed;
      if (v.nu !== undefined && v.u === undefined) changed = set("u", 1 - v.nu!, <>Complement: P(A ∪ B) = 1 − P((A ∪ B)') = 1 − {fmt(v.nu!)}</>) || changed;
      if (v.i !== undefined && v.ni === undefined) changed = set("ni", 1 - v.i!, <>Complement: P((A ∩ B)') = 1 − P(A ∩ B) = 1 − {fmt(v.i!)}</>) || changed;
      if (v.ni !== undefined && v.i === undefined) changed = set("i", 1 - v.ni!, <>Complement: P(A ∩ B) = 1 − P((A ∩ B)') = 1 − {fmt(v.ni!)}</>) || changed;
      if (v.a !== undefined && v.b !== undefined && v.i !== undefined && v.u === undefined)
        changed = set("u", v.a! + v.b! - v.i!, <>Inclusion–exclusion: P(A ∪ B) = P(A) + P(B) − P(A ∩ B) = {fmt(v.a!)} + {fmt(v.b!)} − {fmt(v.i!)}</>) || changed;
      if (v.a !== undefined && v.b !== undefined && v.u !== undefined && v.i === undefined)
        changed = set("i", v.a! + v.b! - v.u!, <>Rearranged: P(A ∩ B) = P(A) + P(B) − P(A ∪ B) = {fmt(v.a!)} + {fmt(v.b!)} − {fmt(v.u!)}</>) || changed;
      if (v.a !== undefined && v.i !== undefined && v.u !== undefined && v.b === undefined)
        changed = set("b", v.u! + v.i! - v.a!, <>Rearranged: P(B) = P(A ∪ B) + P(A ∩ B) − P(A) = {fmt(v.u!)} + {fmt(v.i!)} − {fmt(v.a!)}</>) || changed;
      if (v.b !== undefined && v.i !== undefined && v.u !== undefined && v.a === undefined)
        changed = set("a", v.u! + v.i! - v.b!, <>Rearranged: P(A) = P(A ∪ B) + P(A ∩ B) − P(B) = {fmt(v.u!)} + {fmt(v.i!)} − {fmt(v.b!)}</>) || changed;
      if (!changed) break;
    }
  } catch (e) {
    return { values: {} as Record<Key, number>, trail, error: (e as Error).message };
  }

  if (v.a !== undefined && v.i !== undefined && v.i > v.a + 1e-6)
    return { values: {} as Record<Key, number>, trail, error: `P(A ∩ B) cannot exceed P(A).` };
  if (v.b !== undefined && v.i !== undefined && v.i > v.b + 1e-6)
    return { values: {} as Record<Key, number>, trail, error: `P(A ∩ B) cannot exceed P(B).` };

  const filled = KEYS.every(({ k }) => v[k] !== undefined);
  if (!filled) return { values: {} as Record<Key, number>, trail, error: "Not enough information — enter at least two independent values (e.g. P(A) and P(A ∩ B), or P(A) and P(A ∪ B))." };
  return { values: v as Record<Key, number>, trail };
}

function SolverTool() {
  const [vals, setVals] = useState<Record<Key, string>>({
    a: "", b: "", na: "", nb: "", i: "", u: "", nu: "", ni: "",
  });
  const [result, setResult] = useState<Record<Key, number> | null>(null);
  const [trail, setTrail] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  function calc() {
    setError(null);
    const known: Partial<Record<Key, number>> = {};
    let count = 0;
    for (const { k, label } of KEYS) {
      const raw = vals[k].trim();
      if (!raw) continue;
      const n = Number(raw);
      if (!isProb(n)) {
        setError(`${label} must be a number between 0 and 1.`);
        setResult(null); setTrail([]);
        return;
      }
      known[k] = n;
      count++;
    }
    if (count < 2) {
      setError("Enter at least two known values.");
      setResult(null); setTrail([]);
      return;
    }
    const { values, trail: t, error: err } = solve(known);
    if (err) { setError(err); setResult(null); setTrail(t); return; }
    setResult(values); setTrail(t);
  }

  return (
    <section className="rounded-2xl border border-border bg-background/40 p-5">
      <h2 className="mb-1 font-display text-xl font-semibold text-foreground">2. Probability Solver for Two Events</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Fill in <b>any two</b> known values and the solver fills in the rest using the complement, union, and intersection identities.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {KEYS.map(({ k, label }) => (
          <Field key={k} label={label} htmlFor={`solve-${k}`}>
            <TextInput
              id={`solve-${k}`}
              value={vals[k]}
              onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))}
              inputMode="decimal"
              placeholder="—"
            />
          </Field>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryButton onClick={calc}>Solve</PrimaryButton>
        <button
          type="button"
          onClick={() => {
            setVals({ a: "", b: "", na: "", nb: "", i: "", u: "", nu: "", ni: "" });
            setResult(null); setTrail([]); setError(null);
          }}
          className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >Clear</button>
      </div>
      {error && <ErrorBox message={error} />}
      {result && (
        <>
          <ResultActions
            className="mt-5"
            filename="probability-solver-result"
            captureRef={resultRef}
            getCopyText={() =>
              [
                `Probability Solver`,
                ...KEYS.map(({ k, label }) => `${label} = ${fmt(result[k])}${vals[k].trim() ? "" : " (derived)"}`),
              ].join("\n")
            }
          />
          <div ref={resultRef} className="rounded-3xl bg-background/60 p-1">
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {KEYS.map(({ k, label }) => (
              <ResultRow key={k} label={label} value={result[k]} highlight={!vals[k].trim()} />
            ))}
          </div>
          <div className="mt-5">
            <VennGallery pA={result.a} pB={result.b} pInter={result.i} />
          </div>
          {trail.length > 0 && <StepsToggle steps={trail} />}
          </div>
        </>
      )}

    </section>
  );
}

/* ================= Tool 3 — Series ================= */
interface SeriesRow { p: string; r: string }
function SeriesTool() {
  const [rows, setRows] = useState<SeriesRow[]>([
    { p: "0.5", r: "1" },
    { p: "0.5", r: "1" },
  ]);
  const [result, setResult] = useState<{ combined: number; parts: { p: number; r: number; contrib: number }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  function calc() {
    setError(null);
    const parts: { p: number; r: number; contrib: number }[] = [];
    let combined = 1;
    for (let idx = 0; idx < rows.length; idx++) {
      const p = Number(rows[idx].p);
      const r = Number(rows[idx].r);
      if (!isProb(p)) { setError(`Event ${idx + 1}: probability must be between 0 and 1.`); setResult(null); return; }
      if (!Number.isInteger(r) || r < 0) { setError(`Event ${idx + 1}: repeat count must be a non-negative integer.`); setResult(null); return; }
      const contrib = Math.pow(p, r);
      parts.push({ p, r, contrib });
      combined *= contrib;
    }
    setResult({ combined, parts });
  }

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    return [
      {
        title: "Given",
        body: (
          <>
            <MathNote>Probability and repeat count for each independent event</MathNote>
            {result.parts.map((p, i) => (
              <MathLine key={i}>p{i + 1} = {fmt(p.p)}, &nbsp; r{i + 1} = {p.r}</MathLine>
            ))}
          </>
        ),
      },
      {
        title: "Formula",
        body: (
          <>
            <MathNote>For independent events, multiply each probability raised to its repeat count</MathNote>
            <MathLine>P = Π pᵢ^rᵢ</MathLine>
          </>
        ),
      },
      {
        title: "Substitute each event",
        body: (
          <>
            <MathNote>Raise each probability to its repeat count</MathNote>
            {result.parts.map((p, i) => (
              <MathLine key={i}>Event {i + 1}: {fmt(p.p)}^{p.r} = {fmt(p.contrib)}</MathLine>
            ))}
          </>
        ),
      },
      {
        title: "Answer",
        body: (
          <>
            <MathNote>Multiply all the contributions together</MathNote>
            <MathLine>
              P = {result.parts.map((p, i) => (
                <span key={i}>{i > 0 ? " × " : ""}{fmt(p.contrib)}</span>
              ))}
            </MathLine>
            <MathLine>P = {fmt(result.combined)}</MathLine>
          </>
        ),
      },
    ];
  }, [result]);

  return (
    <section className="rounded-2xl border border-border bg-background/40 p-5">
      <h2 className="mb-1 font-display text-xl font-semibold text-foreground">3. Probability of a Series of Independent Events</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Enter one row per event with its probability (0–1) and how many times it repeats. The combined probability is the product of each pᵢ raised to its repeat count.
      </p>
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <span>Probability</span><span>Repeat times</span><span />
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <TextInput
              value={row.p}
              onChange={(e) => setRows((rs) => rs.map((r, j) => j === i ? { ...r, p: e.target.value } : r))}
              inputMode="decimal"
              placeholder="0.5"
            />
            <TextInput
              value={row.r}
              onChange={(e) => setRows((rs) => rs.map((r, j) => j === i ? { ...r, r: e.target.value } : r))}
              inputMode="numeric"
              placeholder="1"
            />
            <button
              type="button"
              onClick={() => setRows((rs) => rs.length > 1 ? rs.filter((_, j) => j !== i) : rs)}
              className="rounded-full border border-border px-3 text-sm text-muted-foreground hover:text-destructive"
              aria-label={`Remove event ${i + 1}`}
            >×</button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton onClick={calc}>Calculate</PrimaryButton>
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, { p: "0.5", r: "1" }])}
          className="rounded-full border border-border px-4 py-2 text-sm text-foreground hover:border-primary/40"
        >Add event</button>
        <button
          type="button"
          onClick={() => { setRows([{ p: "0.5", r: "1" }, { p: "0.5", r: "1" }]); setResult(null); setError(null); }}
          className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >Clear</button>
      </div>
      {error && <ErrorBox message={error} />}
      {result && (
        <>
          <ResultActions
            className="mt-5"
            filename="probability-series-result"
            captureRef={resultRef}
            getCopyText={() =>
              [
                `Probability Series (independent events)`,
                ...result.parts.map((pt, i) => `Event ${i + 1}: P=${fmt(pt.p)}, repeats=${pt.r}, contribution=${fmt(pt.contrib)}`),
                `Combined probability = ${fmt(result.combined)}`,
              ].join("\n")
            }
          />
          <div ref={resultRef} className="rounded-3xl bg-background/60 p-1">
          <ResultBox label="Combined probability" value={fmt(result.combined)} />
          <div className="mt-5">
            <SeriesDiagram parts={result.parts} combined={result.combined} />
          </div>
          <StepsToggle steps={steps} />
          </div>
        </>
      )}

    </section>
  );
}

/* ================= Tool 4 — Normal Distribution ================= */
function parseBound(s: string, side: "left" | "right"): number | null {
  const t = s.trim().toLowerCase();
  if (!t) return side === "left" ? -Infinity : Infinity;
  if (t === "-inf" || t === "-infinity" || t === "-∞") return -Infinity;
  if (t === "inf" || t === "infinity" || t === "+inf" || t === "∞") return Infinity;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function NormalTool() {
  const [mu, setMu] = useState("0");
  const [sigma, setSigma] = useState("1");
  const [left, setLeft] = useState("-1");
  const [right, setRight] = useState("1");
  const [result, setResult] = useState<null | {
    mu: number; sigma: number; L: number; R: number;
    zL: number; zR: number; p: number;
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  function calc() {
    setError(null);
    const m = Number(mu);
    const s = Number(sigma);
    const L = parseBound(left, "left");
    const R = parseBound(right, "right");
    if (!Number.isFinite(m)) { setError("Mean must be a number."); setResult(null); return; }
    if (!Number.isFinite(s) || s <= 0) { setError("Standard deviation must be a positive number."); setResult(null); return; }
    if (L === null || R === null) { setError("Bounds must be numbers, or -inf / inf."); setResult(null); return; }
    if (L >= R) { setError("Left bound must be less than right bound."); setResult(null); return; }
    const cdfL = L === -Infinity ? 0 : normalCdf(L, m, s);
    const cdfR = R === Infinity ? 1 : normalCdf(R, m, s);
    setResult({
      mu: m, sigma: s, L, R,
      zL: L === -Infinity ? -Infinity : (L - m) / s,
      zR: R === Infinity ? Infinity : (R - m) / s,
      p: cdfR - cdfL,
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-background/40 p-5">
      <h2 className="mb-1 font-display text-xl font-semibold text-foreground">4. Probability of a Normal Distribution</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Enter the mean μ, standard deviation σ, and the range [left, right]. Use <code>-inf</code> or <code>inf</code> for an unbounded side. The tool computes P(left ≤ X ≤ right) exactly and shows the corresponding Z-scores — no manual Z-table needed.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mean (μ)" htmlFor="mu"><TextInput id="mu" value={mu} onChange={(e) => setMu(e.target.value)} inputMode="decimal" /></Field>
        <Field label="Standard deviation (σ)" htmlFor="sigma"><TextInput id="sigma" value={sigma} onChange={(e) => setSigma(e.target.value)} inputMode="decimal" /></Field>
        <Field label="Left bound" htmlFor="lb" hint="Number, or -inf"><TextInput id="lb" value={left} onChange={(e) => setLeft(e.target.value)} /></Field>
        <Field label="Right bound" htmlFor="rb" hint="Number, or inf"><TextInput id="rb" value={right} onChange={(e) => setRight(e.target.value)} /></Field>
      </div>
      <div className="mt-4 flex gap-2">
        <PrimaryButton onClick={calc}>Calculate</PrimaryButton>
        <button
          type="button"
          onClick={() => { setMu("0"); setSigma("1"); setLeft("-1"); setRight("1"); setResult(null); setError(null); }}
          className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >Reset</button>
      </div>
      {error && <ErrorBox message={error} />}
      {result && (
        <>
          <ResultActions
            className="mt-5"
            filename="probability-normal-result"
            captureRef={resultRef}
            getCopyText={() =>
              [
                `Normal Distribution Probability`,
                `μ=${fmt(result.mu)} | σ=${fmt(result.sigma)}`,
                `Range: [${fmt(result.L)}, ${fmt(result.R)}]`,
                `z_L=${Number.isFinite(result.zL) ? fmt(result.zL) : "-inf"} | z_R=${Number.isFinite(result.zR) ? fmt(result.zR) : "+inf"}`,
                `P(${fmt(result.L)} ≤ X ≤ ${fmt(result.R)}) = ${fmt(result.p, 8)}`,
              ].join("\n")
            }
          />
          <div ref={resultRef} className="rounded-3xl bg-background/60 p-1">
          <ResultBox
            label={`P(${fmt(result.L)} ≤ X ≤ ${fmt(result.R)})`}
            value={fmt(result.p, 8)}
            note={
              <>
                Z-scores: z<sub>L</sub> = {Number.isFinite(result.zL) ? fmt(result.zL) : "−∞"}, z<sub>R</sub> = {Number.isFinite(result.zR) ? fmt(result.zR) : "+∞"}
              </>
            }
          />
          <div className="mt-5">
            <NormalCurve mu={result.mu} sigma={result.sigma} L={result.L} R={result.R} />
          </div>
          <NormalSteps {...result} />
          </div>
        </>
      )}

    </section>
  );
}

/* Steps for normal distribution: Z-score derivation → Φ lookup → subtraction */
function NormalSteps({ mu, sigma, L, R, zL, zR, p }: {
  mu: number; sigma: number; L: number; R: number; zL: number; zR: number; p: number;
}) {
  const cdfL = L === -Infinity ? 0 : normalCdf(L, mu, sigma);
  const cdfR = R === Infinity ? 1 : normalCdf(R, mu, sigma);
  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <>
          <MathNote>Mean, standard deviation, and the interval [L, R]</MathNote>
          <MathLine>μ = {fmt(mu)}</MathLine>
          <MathLine>σ = {fmt(sigma)}</MathLine>
          <MathLine>L = {Number.isFinite(L) ? fmt(L) : "−∞"}, &nbsp; R = {Number.isFinite(R) ? fmt(R) : "+∞"}</MathLine>
        </>
      ),
    },
    {
      title: "Standardize to Z-scores",
      body: (
        <>
          <MathNote>Z = (x − μ) / σ converts a bound to standard-normal units</MathNote>
          <MathLine>z_L = ({Number.isFinite(L) ? fmt(L) : "−∞"} − {fmt(mu)}) / {fmt(sigma)}</MathLine>
          <MathLine>z_L = {Number.isFinite(zL) ? fmt(zL) : "−∞"}</MathLine>
          <MathLine>z_R = ({Number.isFinite(R) ? fmt(R) : "+∞"} − {fmt(mu)}) / {fmt(sigma)}</MathLine>
          <MathLine>z_R = {Number.isFinite(zR) ? fmt(zR) : "+∞"}</MathLine>
        </>
      ),
    },
    {
      title: "Look up Φ(z)",
      body: (
        <>
          <MathNote>Φ(z) is the cumulative probability P(Z ≤ z) from the standard normal distribution</MathNote>
          <MathLine>Φ(z_L) = {fmt(cdfL, 8)}</MathLine>
          <MathLine>Φ(z_R) = {fmt(cdfR, 8)}</MathLine>
        </>
      ),
    },
    {
      title: "Answer",
      body: (
        <>
          <MathNote>The probability of landing between L and R is the difference of the two cumulative values</MathNote>
          <MathLine>P(L ≤ X ≤ R) = Φ(z_R) − Φ(z_L)</MathLine>
          <MathLine>P(L ≤ X ≤ R) = {fmt(cdfR, 8)} − {fmt(cdfL, 8)}</MathLine>
          <MathLine>P(L ≤ X ≤ R) = {fmt(p, 8)}</MathLine>
        </>
      ),
    },
  ];
  return <StepsToggle steps={steps} />;
}

/* Series diagram: horizontal bar per event showing p^r, plus a cumulative
 * running-product bar so the "multiplying probabilities shrinks fast" story
 * is visible at a glance. */
function SeriesDiagram({ parts, combined }: {
  parts: { p: number; r: number; contrib: number }[]; combined: number;
}) {
  const running: number[] = [];
  let acc = 1;
  for (const part of parts) { acc *= part.contrib; running.push(acc); }
  const rowH = 22;
  const gap = 8;
  const labelW = 92;
  const barW = 260;
  const W = labelW + barW + 90;
  const H = (parts.length * 2 + 1) * (rowH + gap) + 20;
  let y = 10;
  const bar = (label: string, value: number, cls: string) => {
    const w = Math.max(1, value * barW);
    const row = (
      <g key={`${label}-${y}`} transform={`translate(0 ${y})`}>
        <text x={labelW - 6} y={rowH * 0.7} textAnchor="end" className="fill-muted-foreground" fontSize="11">{label}</text>
        <rect x={labelW} y={2} width={barW} height={rowH - 4} className="fill-secondary/40" rx="3" />
        <rect x={labelW} y={2} width={w} height={rowH - 4} className={cls} rx="3" />
        <text x={labelW + barW + 8} y={rowH * 0.7} className="fill-foreground font-serif italic" fontSize="11">{fmt(value, 6)}</text>
      </g>
    );
    y += rowH + gap;
    return row;
  };
  const rows: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    rows.push(bar(`Event ${i + 1}: ${fmt(part.p)}^${part.r}`, part.contrib, "fill-primary/70"));
    rows.push(bar(`Running product`, running[i], "fill-primary"));
  });
  rows.push(bar("Combined", combined, "fill-primary"));
  return (
    <figure className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <figcaption className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Series diagram — each event's contribution and the running product
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
        {rows}
      </svg>
    </figure>
  );
}

function NormalCurve({ mu, sigma, L, R }: { mu: number; sigma: number; L: number; R: number }) {
  const W = 480, H = 200, PAD = 30;
  const xMin = mu - 4 * sigma;
  const xMax = mu + 4 * sigma;
  const xToPx = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD);
  const N = 240;
  const pts: { x: number; y: number }[] = [];
  let yMax = 0;
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
    pts.push({ x, y });
    if (y > yMax) yMax = y;
  }
  const yToPx = (y: number) => H - PAD - (y / yMax) * (H - 2 * PAD);
  const curvePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xToPx(p.x).toFixed(2)} ${yToPx(p.y).toFixed(2)}`).join(" ");

  const Lc = Math.max(L, xMin);
  const Rc = Math.min(R, xMax);
  const shadePts = pts.filter((p) => p.x >= Lc && p.x <= Rc);
  const shadePath =
    shadePts.length > 1
      ? `M ${xToPx(shadePts[0].x)} ${yToPx(0)} ` +
        shadePts.map((p) => `L ${xToPx(p.x).toFixed(2)} ${yToPx(p.y).toFixed(2)}`).join(" ") +
        ` L ${xToPx(shadePts[shadePts.length - 1].x)} ${yToPx(0)} Z`
      : "";

  return (
    <figure className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <figcaption className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Normal distribution — shaded region = probability
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
        {/* baseline */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} className="stroke-border" strokeWidth="1" />
        {/* shaded region */}
        {shadePath && <path d={shadePath} className="fill-primary" fillOpacity="0.3" />}
        {/* curve */}
        <path d={curvePath} className="stroke-primary" strokeWidth="2" fill="none" />
        {/* mean line */}
        <line x1={xToPx(mu)} y1={yToPx(0)} x2={xToPx(mu)} y2={yToPx(yMax)} className="stroke-foreground" strokeOpacity="0.4" strokeDasharray="3 3" />
        <text x={xToPx(mu)} y={H - PAD + 14} textAnchor="middle" className="fill-muted-foreground" fontSize="10">μ = {fmt(mu)}</text>
        {/* bounds */}
        {Number.isFinite(L) && L >= xMin && (
          <>
            <line x1={xToPx(L)} y1={yToPx(0)} x2={xToPx(L)} y2={PAD} className="stroke-primary" strokeWidth="1.2" />
            <text x={xToPx(L)} y={PAD - 6} textAnchor="middle" className="fill-foreground" fontSize="10">L = {fmt(L)}</text>
          </>
        )}
        {Number.isFinite(R) && R <= xMax && (
          <>
            <line x1={xToPx(R)} y1={yToPx(0)} x2={xToPx(R)} y2={PAD} className="stroke-primary" strokeWidth="1.2" />
            <text x={xToPx(R)} y={PAD - 6} textAnchor="middle" className="fill-foreground" fontSize="10">R = {fmt(R)}</text>
          </>
        )}
        {/* σ ticks */}
        {[-3, -2, -1, 1, 2, 3].map((k) => (
          <g key={k}>
            <line x1={xToPx(mu + k * sigma)} y1={H - PAD} x2={xToPx(mu + k * sigma)} y2={H - PAD + 4} className="stroke-muted-foreground" />
            <text x={xToPx(mu + k * sigma)} y={H - PAD + 14} textAnchor="middle" className="fill-muted-foreground" fontSize="9">{k > 0 ? `+${k}σ` : `${k}σ`}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

/* ================= Extras (educational content) ================= */
function Extras() {
  return (
    <>
      <CalcSection title="What is probability?">
        <p>
          Probability measures how likely an event is, on a scale from <b>0</b>
          {" "}("this will not happen") to <b>1</b> ("this is certain"). A fair
          coin landing heads has probability 0.5. Probabilities can also be
          written as percentages (0.5 = 50%) or as fractions (1/2).
        </p>
      </CalcSection>

      <CalcSection title="Probability rules explained, rule by rule">
        <p className="text-sm text-muted-foreground">
          Each card below covers one core probability rule — the complement,
          intersection, union, XOR and normal-distribution area — with a plain
          definition, its formula, a diagram, and a worked example.
        </p>
        <GuideCards items={PROB_GUIDE} />
      </CalcSection>

      <CalcSection title="Common mistakes">
        <FeatureList
          items={[
            <><b>Confusing independent with mutually exclusive.</b> Independent events usually have overlap (P(A ∩ B) &gt; 0). Mutually exclusive events cannot overlap (P(A ∩ B) = 0).</>,
            <><b>Assuming independence when events are actually linked.</b> Drawing a card <i>without replacement</i> is not independent.</>,
            <><b>Forgetting to subtract the intersection in the union formula.</b> P(A ∪ B) = P(A) + P(B) only if A and B cannot both happen.</>,
            <><b>Adding probabilities greater than 1.</b> If your total exceeds 1, you have almost certainly double-counted an overlap.</>,
            <><b>Reading a Z-table for the wrong tail.</b> This calculator sidesteps the ambiguity by always computing P(L ≤ X ≤ R) directly.</>,
          ]}
        />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            <>Four tools on one page: independent-events combiner, unknown-value solver, series-of-events chain, and normal-distribution probability with a shaded bell curve.</>,
            <>Solver derives every missing value from as few as two knowns using the complement, union, and intersection identities — flags contradictions instead of silently rounding.</>,
            <>Normal-distribution tool accepts <code>-inf</code> and <code>inf</code> bounds and computes exact probabilities via the erf function.</>,
            <>Venn diagram gallery and bell curve rendered with semantic design tokens — follow your light/dark theme automatically.</>,
            <>Independence assumption stated explicitly on the two-event tool.</>,
          ]}
        />
      </CalcSection>

      
<CalcSection title="Frequently asked questions">
        <CalcFAQ
          items={[
            { q: "What's the difference between independent and mutually exclusive events?", a: <p>Independent events don't influence each other — P(A ∩ B) = P(A)·P(B). Mutually exclusive events cannot both happen — P(A ∩ B) = 0.</p> },
            { q: "How do I calculate the probability of an event NOT happening?", a: <p>Subtract from 1. P(A') = 1 − P(A). If P(rain) = 0.3, then P(no rain) = 0.7.</p> },
            { q: "Do I need to enter probabilities as decimals?", a: <p>Yes — use values between 0 and 1 (e.g. 0.25, not 25%).</p> },
            { q: "How does the solver decide which values to derive?", a: <p>It repeatedly applies the complement and inclusion–exclusion identities until nothing new can be derived. Contradictions are reported rather than silently rounded.</p> },
            { q: "Can the normal-distribution tool handle one-sided ranges?", a: <p>Yes. Use <code>-inf</code> for the left bound to get P(X ≤ R), or <code>inf</code> for the right bound to get P(X ≥ L).</p> },
          ]}
        />
      </CalcSection>

      <CalcSection title="Related calculators">
        <RelatedLinks
          links={[
            { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
            { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
            { to: "/calculators/math/mean-median-mode-calculator", label: "Mean, Median, Mode, Range" },
            { to: "/calculators/math/sample-size-calculator", label: "Sample Size Calculator" },
          ]}
        />
      </CalcSection>
    </>
  );
}

/* ---------------- Guide diagrams ---------------- */

function VennShaded({ region }: { region: "comp" | "inter" | "union" | "xor" | "mutex" }) {
  const AX = 65, BX = 105, CY = 55, R = 40;
  return (
    <svg viewBox="0 0 170 110" className="w-full">
      <defs>
        <mask id={`m-inter-${region}`}>
          <rect width="170" height="110" fill="black" />
          <circle cx={AX} cy={CY} r={R} fill="white" />
          <circle cx={BX} cy={CY} r={R} fill="white" style={{ mixBlendMode: "multiply" }} />
        </mask>
        <mask id={`m-aOnly-${region}`}>
          <rect width="170" height="110" fill="black" />
          <circle cx={AX} cy={CY} r={R} fill="white" />
          <circle cx={BX} cy={CY} r={R} fill="black" />
        </mask>
        <mask id={`m-bOnly-${region}`}>
          <rect width="170" height="110" fill="black" />
          <circle cx={BX} cy={CY} r={R} fill="white" />
          <circle cx={AX} cy={CY} r={R} fill="black" />
        </mask>
      </defs>
      <rect x="1" y="1" width="168" height="108" fill="none" className="stroke-border" />
      {region === "comp" && (
        <>
          <rect width="170" height="110" className="fill-primary/40" />
          <circle cx={AX} cy={CY} r={R} className="fill-background" />
        </>
      )}
      {region === "inter" && (
        <g clipPath={`url(#cp-A-${region})`}>
          <circle cx={BX} cy={CY} r={R} className="fill-primary/50" />
          <defs>
            <clipPath id={`cp-A-${region}`}>
              <circle cx={AX} cy={CY} r={R} />
            </clipPath>
          </defs>
        </g>
      )}
      {region === "union" && (
        <g className="fill-primary/40">
          <circle cx={AX} cy={CY} r={R} />
          <circle cx={BX} cy={CY} r={R} />
        </g>
      )}
      {region === "xor" && (
        <>
          <g mask={`url(#m-aOnly-${region})`}>
            <rect width="170" height="110" className="fill-primary/40" />
          </g>
          <g mask={`url(#m-bOnly-${region})`}>
            <rect width="170" height="110" className="fill-primary/40" />
          </g>
        </>
      )}
      {region === "mutex" && (
        <>
          <circle cx={35} cy={CY} r={28} className="fill-primary/40" />
          <circle cx={135} cy={CY} r={28} className="fill-primary/40" />
        </>
      )}
      <circle cx={region === "mutex" ? 35 : AX} cy={CY} r={region === "mutex" ? 28 : R} className="stroke-foreground/60" fill="none" strokeWidth="1.2" />
      <circle cx={region === "mutex" ? 135 : BX} cy={CY} r={region === "mutex" ? 28 : R} className="stroke-foreground/60" fill="none" strokeWidth="1.2" />
      <text x={region === "mutex" ? 35 : AX - R + 4} y={CY - (region === "mutex" ? 32 : R) - 2} textAnchor={region === "mutex" ? "middle" : "start"} className="fill-foreground" fontSize="10" fontWeight="700">A</text>
      <text x={region === "mutex" ? 135 : BX + R - 10} y={CY - (region === "mutex" ? 32 : R) - 2} textAnchor={region === "mutex" ? "middle" : "start"} className="fill-foreground" fontSize="10" fontWeight="700">B</text>
    </svg>
  );
}

function BellDiagram() {
  const W = 240, H = 120, PAD = 20;
  const pts: string[] = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const z = -4 + (8 * i) / N;
    const y = Math.exp(-0.5 * z * z);
    const x = PAD + ((z + 4) / 8) * (W - 2 * PAD);
    const yy = H - PAD - y * (H - 2 * PAD);
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${yy.toFixed(1)}`);
  }
  const shade: string[] = [];
  for (let i = 0; i <= N; i++) {
    const z = -4 + (8 * i) / N;
    if (z < -1 || z > 1) continue;
    const y = Math.exp(-0.5 * z * z);
    const x = PAD + ((z + 4) / 8) * (W - 2 * PAD);
    const yy = H - PAD - y * (H - 2 * PAD);
    shade.push(`${shade.length === 0 ? "M" : "L"} ${x.toFixed(1)} ${yy.toFixed(1)}`);
  }
  const xL = PAD + ((-1 + 4) / 8) * (W - 2 * PAD);
  const xR = PAD + ((1 + 4) / 8) * (W - 2 * PAD);
  const shadeD = `M ${xL} ${H - PAD} ${shade.join(" ").replace(/^M/, "L")} L ${xR} ${H - PAD} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <path d={shadeD} className="fill-primary/40" />
      <path d={pts.join(" ")} className="stroke-primary" strokeWidth="1.5" fill="none" />
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} className="stroke-border" />
      <text x={xL} y={H - 4} textAnchor="middle" fontSize="9" className="fill-muted-foreground">L</text>
      <text x={xR} y={H - 4} textAnchor="middle" fontSize="9" className="fill-muted-foreground">R</text>
      <text x={W / 2} y={14} textAnchor="middle" fontSize="10" className="fill-foreground">P(L ≤ X ≤ R) = Φ(z_R) − Φ(z_L)</text>
    </svg>
  );
}

const PROB_GUIDE: GuideCardItem[] = [
  {
    key: "complement",
    title: "Complement — probability of NOT",
    explain: "The complement of A is 'A does not happen'. Its probability is one minus P(A). This one-line rule is the fastest way to compute 'at least one' problems: P(at least one) = 1 − P(none).",
    formula: <>P(A') = 1 − P(A)</>,
    legend: [
      { sym: "A", def: "an event" },
      { sym: "A'", def: "the complement — A does not happen" },
    ],
    diagram: <VennShaded region="comp" />,
    example: {
      given: "P(rain) = 0.30",
      substitute: "1 − 0.30",
      answer: "P(no rain) = 0.70",
    },
  },
  {
    key: "intersection",
    title: "Intersection — both A and B (independent)",
    explain: "When two events are independent (knowing one doesn't change the other), the probability that both happen is the product of the two probabilities. Independence is a stronger condition than most people assume — check before you multiply.",
    formula: <>P(A ∩ B) = P(A) · P(B)</>,
    legend: [
      { sym: "A ∩ B", def: "A and B both occur" },
    ],
    diagram: <VennShaded region="inter" />,
    example: {
      given: "P(red) = 0.4 on each draw with replacement",
      substitute: "0.4 × 0.4",
      answer: "P(red twice) = 0.16",
    },
  },
  {
    key: "mutex",
    title: "Mutually exclusive events",
    explain: "Mutually exclusive means A and B cannot both happen on the same trial — for example, rolling a 2 or a 5 on a single die. The intersection is zero, and P(A or B) simplifies to P(A) + P(B). Mutually exclusive is not the same as independent.",
    formula: <>P(A ∩ B) = 0 &nbsp;·&nbsp; P(A ∪ B) = P(A) + P(B)</>,
    legend: [
      { sym: "A ∩ B = 0", def: "they cannot co-occur" },
    ],
    diagram: <VennShaded region="mutex" />,
    example: {
      given: "roll a die, A = 'roll 2', B = 'roll 5'",
      substitute: "1/6 + 1/6",
      answer: "P(2 or 5) = 1/3",
    },
  },
  {
    key: "union",
    title: "Union — A or B (or both)",
    explain: "The union counts the ways A happens, B happens, or both. Inclusion–exclusion subtracts the overlap so it's not double-counted. When the events are mutually exclusive the overlap is zero and the formula collapses to P(A) + P(B).",
    formula: <>P(A ∪ B) = P(A) + P(B) − P(A ∩ B)</>,
    legend: [
      { sym: "A ∪ B", def: "at least one of A or B occurs" },
    ],
    diagram: <VennShaded region="union" />,
    example: {
      given: "P(A) = 0.5, P(B) = 0.4, independent so P(A∩B) = 0.20",
      substitute: "0.5 + 0.4 − 0.20",
      answer: "P(A ∪ B) = 0.70",
    },
  },
  {
    key: "xor",
    title: "Exclusive OR — exactly one of A or B",
    explain: "XOR is 'A or B, but not both'. You take the union and subtract twice the intersection, because the both-happen case is counted once in each of P(A) and P(B) and must be removed entirely.",
    formula: <>P(A XOR B) = P(A) + P(B) − 2·P(A ∩ B)</>,
    legend: [
      { sym: "A XOR B", def: "exactly one occurs" },
    ],
    diagram: <VennShaded region="xor" />,
    example: {
      given: "P(A) = 0.5, P(B) = 0.4, P(A∩B) = 0.20",
      substitute: "0.5 + 0.4 − 2·0.20",
      answer: "P(A XOR B) = 0.50",
    },
  },
  {
    key: "normal",
    title: "Normal distribution — area under the bell curve",
    explain: "For a normally-distributed variable, the probability of landing in a range [L, R] is the shaded area under the bell curve between those bounds. Convert L and R into Z-scores and subtract the two CDF values.",
    formula: <>P(L ≤ X ≤ R) = Φ((R−μ)/σ) − Φ((L−μ)/σ)</>,
    legend: [
      { sym: "μ", def: "mean" },
      { sym: "σ", def: "standard deviation" },
      { sym: "Φ(z)", def: "standard normal CDF" },
    ],
    diagram: <BellDiagram />,
    example: {
      given: "μ = 0, σ = 1, range [−1, 1]",
      substitute: "Φ(1) − Φ(−1) ≈ 0.8413 − 0.1587",
      answer: "≈ 0.6827 (the 68% rule)",
    },
  },
];
