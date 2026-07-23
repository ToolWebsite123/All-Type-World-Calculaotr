import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
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
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";

export const Route = createFileRoute("/calculators/math/sequence-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Sequence & Series Calculator",
      title: "Sequence & Series Calculator — Arithmetic and Geometric",
      metaDescription:
        "Compute the nth term and sum of an arithmetic or geometric sequence. Enter a₁, the common difference or ratio, and n — with steps.",
      canonicalUrl: "/calculators/math/sequence-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Sequence & Series Calculator", path: "/calculators/math/sequence-calculator" },
      ],
      faqs: [
        {
          q: "What is the difference between a sequence and a series?",
          a: "A sequence is an ordered list of numbers, like 2, 5, 8, 11, 14, …. A series is what you get when you add those terms together: 2 + 5 + 8 + 11 + 14 + …. Sequences describe the pattern; series describe the running total.",
        },
        {
          q: "When does a geometric series converge?",
          a: "A geometric series with common ratio r converges to a finite sum only when |r| < 1 — that is, when each term is smaller (in absolute value) than the previous one. The infinite sum is then a₁ / (1 − r). For |r| ≥ 1 the series grows without bound and has no finite sum.",
        },
        {
          q: "How do I tell if a sequence is arithmetic or geometric?",
          a: "Check the gap between consecutive terms. If each term is the previous term plus the same fixed number, it is arithmetic (the common difference d). If each term is the previous term multiplied by the same fixed number, it is geometric (the common ratio r).",
        },
        {
          q: "Can the common ratio be negative?",
          a: "Yes. A negative ratio produces an alternating sign pattern, like 3, −6, 12, −24, …. The infinite sum still converges as long as |r| < 1 — for example r = −0.5 works, but r = −2 does not.",
        },
      ],
    }),
  component: SequencePage,
});

// ---------------- Math ----------------

function fmtNum(n: number): string {
  if (Object.is(n, -0)) n = 0;
  if (!Number.isFinite(n)) return n > 0 ? "∞" : "−∞";
  const r = Math.round(n * 1e10) / 1e10;
  return r.toString();
}

type Kind = "arithmetic" | "geometric";

interface Result {
  terms: number[];
  nth: number;
  sum: number;
  infSum: number | null; // null when it does not converge
  steps: Step[];
}

function computeArithmetic(a1: number, d: number, n: number): Result {
  const terms: number[] = [];
  for (let i = 1; i <= Math.min(n, 12); i++) terms.push(a1 + (i - 1) * d);
  const nth = a1 + (n - 1) * d;
  const sum = (n / 2) * (2 * a1 + (n - 1) * d);
  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <FormulaBlock>
          a₁ = {fmtNum(a1)}, d = {fmtNum(d)}, n = {n}
        </FormulaBlock>
      ),
    },
    {
      title: "Formula — arithmetic sequence",
      body: (
        <FormulaWithLegend
          formula={<>aₙ = a₁ + (n − 1)·d; &nbsp; Sₙ = n/2 · (2a₁ + (n − 1)·d)</>}
          legend={[
            { sym: "a₁", def: "first term" },
            { sym: "d", def: "common difference between consecutive terms" },
            { sym: "n", def: "term index" },
            { sym: "aₙ", def: "nth term" },
            { sym: "Sₙ", def: "sum of the first n terms" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — nth term",
      body: (
        <FormulaBlock>
          aₙ = {fmtNum(a1)} + ({n} − 1)·{fmtNum(d)} = {fmtNum(a1)} + {fmtNum((n - 1) * d)} = {fmtNum(nth)}
        </FormulaBlock>
      ),
    },
    {
      title: "Substitute — sum of the first n terms",
      body: (
        <FormulaBlock>
          Sₙ = {n}/2 · (2·{fmtNum(a1)} + ({n} − 1)·{fmtNum(d)}) = {n}/2 · {fmtNum(2 * a1 + (n - 1) * d)} = {fmtNum(sum)}
        </FormulaBlock>
      ),
    },
    {
      title: "Answer",
      body: <FormulaBlock>aₙ = {fmtNum(nth)}, &nbsp; Sₙ = {fmtNum(sum)}</FormulaBlock>,
    },
  ];
  return { terms, nth, sum, infSum: null, steps };
}

function computeGeometric(
  a1: number,
  r: number,
  n: number,
  wantInfinite: boolean,
): Result {
  const terms: number[] = [];
  for (let i = 1; i <= Math.min(n, 12); i++) terms.push(a1 * Math.pow(r, i - 1));
  const nth = a1 * Math.pow(r, n - 1);
  const sum =
    r === 1 ? a1 * n : (a1 * (1 - Math.pow(r, n))) / (1 - r);
  const converges = Math.abs(r) < 1;
  const infSum = wantInfinite ? (converges ? a1 / (1 - r) : Infinity) : null;

  const steps: Step[] = [
    {
      title: "Given",
      body: (
        <FormulaBlock>
          a₁ = {fmtNum(a1)}, r = {fmtNum(r)}, n = {n}
        </FormulaBlock>
      ),
    },
    {
      title: "Formula — geometric sequence",
      body: (
        <FormulaWithLegend
          formula={<>aₙ = a₁ · rⁿ⁻¹; &nbsp; Sₙ = a₁·(1 − rⁿ) / (1 − r); &nbsp; S∞ = a₁ / (1 − r), if |r| &lt; 1</>}
          legend={[
            { sym: "a₁", def: "first term" },
            { sym: "r", def: "common ratio between consecutive terms" },
            { sym: "n", def: "term index" },
            { sym: "Sₙ", def: "sum of the first n terms" },
            { sym: "S∞", def: "infinite sum (converges only if |r| < 1)" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — nth term",
      body: (
        <FormulaBlock>
          aₙ = {fmtNum(a1)} · ({fmtNum(r)})^({n} − 1) = {fmtNum(a1)} · {fmtNum(Math.pow(r, n - 1))} = {fmtNum(nth)}
        </FormulaBlock>
      ),
    },
    {
      title: "Substitute — sum of the first n terms",
      body:
        r === 1 ? (
          <FormulaBlock>
            r = 1 → Sₙ = n·a₁ = {n} · {fmtNum(a1)} = {fmtNum(sum)}
          </FormulaBlock>
        ) : (
          <FormulaBlock>
            Sₙ = {fmtNum(a1)} · (1 − {fmtNum(Math.pow(r, n))}) / {fmtNum(1 - r)} = {fmtNum(sum)}
          </FormulaBlock>
        ),
    },
    {
      title: "Answer",
      body: <FormulaBlock>aₙ = {fmtNum(nth)}, &nbsp; Sₙ = {fmtNum(sum)}</FormulaBlock>,
    },
  ];

  if (wantInfinite) {
    if (converges) {
      steps.push({
        title: "Sum to infinity (|r| < 1, converges)",
        body: (
          <p className="font-mono">
            S∞ = {fmtNum(a1)} / (1 − {fmtNum(r)}) = {fmtNum(a1)} /{" "}
            {fmtNum(1 - r)} = {fmtNum(a1 / (1 - r))}
          </p>
        ),
      });
    } else {
      steps.push({
        title: "Sum to infinity — does not converge",
        body: (
          <p>
            |r| = {fmtNum(Math.abs(r))} ≥ 1, so the terms do not shrink
            towards 0 and the infinite series has no finite sum.
          </p>
        ),
      });
    }
  }

  return { terms, nth, sum, infSum, steps };
}

// ---------------- Visual ----------------

function TermsVisual({
  terms,
  kind,
}: {
  terms: number[];
  kind: Kind;
}) {
  if (terms.length === 0) return null;
  const maxAbs = Math.max(...terms.map((t) => Math.abs(t)), 1);
  const width = 480;
  const height = 140;
  const pad = 24;
  const barW = (width - pad * 2) / terms.length - 8;
  const zeroY = height / 2 + 10;
  const scale = (v: number) => (v / maxAbs) * (height / 2 - 20);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-lg"
      role="img"
      aria-label={`First ${terms.length} terms of the ${kind} sequence`}
    >
      <line
        x1={pad}
        x2={width - pad}
        y1={zeroY}
        y2={zeroY}
        className="stroke-border"
        strokeWidth={1}
      />
      {terms.map((t, i) => {
        const x = pad + i * ((width - pad * 2) / terms.length) + 4;
        const h = scale(t);
        const y = h >= 0 ? zeroY - h : zeroY;
        const height = Math.max(1, Math.abs(h));
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={height}
              rx={2}
              className="fill-primary/70"
            />
            <text
              x={x + barW / 2}
              y={h >= 0 ? y - 4 : y + height + 12}
              textAnchor="middle"
              className="fill-foreground"
              fontSize={10}
            >
              {fmtNum(t)}
            </text>
            <text
              x={x + barW / 2}
              y={height + Math.max(y, zeroY) > zeroY ? zeroY + 22 : zeroY - height - 16}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={9}
            >
              a{i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------- Page ----------------

function SequencePage() {
  const [kind, setKind] = useState<Kind>("arithmetic");
  const [a1, setA1] = useState("2");
  const [dOrR, setDOrR] = useState("3");
  const [n, setN] = useState("10");
  const [wantInf, setWantInf] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [display, setDisplay] = useState<{ value: ReactNode; note: ReactNode } | null>(
    null,
  );
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setResult(null);
    setDisplay(null);
    try {
      const A1 = Number(a1);
      const P = Number(dOrR);
      const N = Number(n);
      if (!Number.isFinite(A1) || !Number.isFinite(P))
        throw new Error("First term and common difference/ratio must be numbers.");
      if (!Number.isInteger(N) || N < 1 || N > 10000)
        throw new Error("n must be a positive integer up to 10000.");

      const res =
        kind === "arithmetic"
          ? computeArithmetic(A1, P, N)
          : computeGeometric(A1, P, N, wantInf);
      setResult(res);
      setDisplay({
        value: (
          <span className="font-mono">
            aₙ = {fmtNum(res.nth)} &nbsp;·&nbsp; Sₙ = {fmtNum(res.sum)}
            {res.infSum !== null && Number.isFinite(res.infSum) && (
              <>
                {" "}
                &nbsp;·&nbsp; S∞ = {fmtNum(res.infSum)}
              </>
            )}
          </span>
        ),
        note:
          res.infSum !== null && !Number.isFinite(res.infSum)
            ? "The infinite series does not converge — |r| ≥ 1."
            : `First ${Math.min(N, 12)} terms shown below.`,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input.");
    }
  };

  return (
    <MathCalcPage
      name="Sequence & Series Calculator"
      tagline="Compute the nth term and the sum of an arithmetic or geometric sequence. Toggle the type, fill in the first term, the common difference (arithmetic) or ratio (geometric), and how many terms — see every step and the sum to infinity when it converges."
      extras={
        <>
          <CalcSection title="Sequence vs series — what's the difference?">
            <p>
              A <strong>sequence</strong> is an ordered list of numbers
              generated by a rule, like 2, 5, 8, 11, 14, …. Each number
              is called a term, and you index them a₁, a₂, a₃, …
            </p>
            <p>
              A <strong>series</strong> is the running total of a
              sequence: a₁ + a₂ + a₃ + …. The sum of the first n terms
              is written Sₙ. So the sequence describes the pattern; the
              series describes the accumulation.
            </p>
          </CalcSection>

<CalcSection title="The sequences this tool handles, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one kind of sequence the tool builds —
              how each term is generated, the closed form for the n-th
              term and the partial sum, and (for geometric) the special
              case when the sum converges.
            </p>
            <GuideCards items={SEQ_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Arithmetic and geometric modes with the correct formula applied automatically",
                "Reports the nth term aₙ and the sum of the first n terms Sₙ side by side",
                "Optional sum to infinity for geometric series — with an explicit check that |r| < 1",
                "Renders the first few terms as a small bar chart so patterns and sign changes are visible",
                "Handles negative and fractional inputs — negative ratios produce alternating signs",
                "Full step-by-step working showing the substitution into the standard formulas",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is a₀ vs a₁ — do sequences start at 0 or 1?",
                  a: (
                    <p>
                      Both conventions exist. This calculator uses{" "}
                      <span className="font-mono">a₁</span> as the first
                      term (so n = 1 gives you a₁ itself). If a textbook
                      starts at a₀, just shift the index: their a₀ is our
                      a₁, and their formula (n·d instead of (n−1)·d) is
                      an equivalent restatement.
                    </p>
                  ),
                },
                {
                  q: "Why does the geometric sum blow up when r = 1?",
                  a: (
                    <p>
                      The formula Sₙ = a₁·(1 − rⁿ)/(1 − r) has a zero in
                      the denominator when r = 1. But r = 1 means every
                      term equals a₁, so the sum is simply n·a₁ — the
                      calculator applies that special case directly.
                    </p>
                  ),
                },
                {
                  q: "Can I recover the common difference from two terms?",
                  a: (
                    <p>
                      Yes. For an arithmetic sequence, d = (aₙ − aₘ) /
                      (n − m). For a geometric one, r = (aₙ / aₘ)^(1 /
                      (n − m)). Plug the recovered d or r back into this
                      calculator to explore the rest.
                    </p>
                  ),
                },
                {
                  q: "Is 0.999… really equal to 1?",
                  a: (
                    <p>
                      Yes — and geometric series prove it. 0.999… = 9/10
                      + 9/100 + 9/1000 + … is geometric with a₁ = 9/10
                      and r = 1/10, so S∞ = (9/10) / (1 − 1/10) = (9/10)
                      / (9/10) = 1.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/exponent-calculator", label: "Exponent Calculator" },
                { to: "/calculators/math/percentage-calculator", label: "Percentage Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="inline-flex rounded-full border border-border/60 bg-secondary/40 p-1 text-sm">
          {(["arithmetic", "geometric"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full px-4 py-1.5 capitalize transition ${
                kind === k
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="First term (a₁)" htmlFor="a1">
            <TextInput
              id="a1"
              value={a1}
              onChange={(e) => setA1(e.target.value)}
              inputMode="decimal"
            />
          </Field>
          <Field
            label={
              kind === "arithmetic" ? "Common difference (d)" : "Common ratio (r)"
            }
            htmlFor="dr"
          >
            <TextInput
              id="dr"
              value={dOrR}
              onChange={(e) => setDOrR(e.target.value)}
              inputMode="decimal"
            />
          </Field>
          <Field label="Number of terms (n)" htmlFor="n">
            <TextInput
              id="n"
              value={n}
              onChange={(e) => setN(e.target.value)}
              inputMode="numeric"
            />
          </Field>
        </div>
        {kind === "geometric" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={wantInf}
              onChange={(e) => setWantInf(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Also compute the sum to infinity (converges only when |r| &lt; 1)
          </label>
        )}
        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}
      {result && display && (
        <>
          <ResultBox label="Result" value={display.value} note={display.note} />
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <div className="mb-2 text-sm font-medium text-foreground">
              First {result.terms.length} terms
            </div>
            <TermsVisual terms={result.terms} kind={kind} />
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {result.terms.map((t) => fmtNum(t)).join(", ")}
              {result.terms.length < Number(n) ? ", …" : ""}
            </p>
          </div>
          <StepsToggle steps={result.steps} />
        </>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function ArithMini() {
  return (
    <svg viewBox="0 0 220 90" className="w-full">
      <rect x="1" y="1" width="218" height="88" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      {[2, 5, 8, 11, 14].map((v, i) => (
        <g key={i}>
          <circle cx={25 + i * 40} cy="45" r="12" fill="color-mix(in srgb, var(--color-primary) 18%, transparent)" stroke="var(--color-primary)" />
          <text x={25 + i * 40} y="49" textAnchor="middle" fontSize="10" fill="var(--color-foreground)">{v}</text>
          {i < 4 && <text x={45 + i * 40} y="30" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">+3</text>}
        </g>
      ))}
      <text x="110" y="82" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">add the common difference d each step</text>
    </svg>
  );
}

function GeoMini() {
  const vals = [3, 6, 12, 24];
  return (
    <svg viewBox="0 0 220 90" className="w-full">
      <rect x="1" y="1" width="218" height="88" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      {vals.map((v, i) => {
        const h = 8 + i * 15;
        return (
          <g key={i}>
            <rect x={30 + i * 50} y={65 - h} width="30" height={h} fill="color-mix(in srgb, var(--color-primary) 40%, transparent)" stroke="var(--color-primary)" />
            <text x={45 + i * 50} y="78" textAnchor="middle" fontSize="9" fill="var(--color-foreground)">{v}</text>
          </g>
        );
      })}
      <text x="110" y="88" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">multiply by ratio r each step</text>
    </svg>
  );
}

function InfMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <line x1="20" y1="70" x2="200" y2="70" stroke="var(--color-border)" />
      <line x1="20" y1="30" x2="200" y2="30" stroke="var(--color-primary)" strokeDasharray="4 3" />
      <text x="205" y="33" fontSize="10" fill="var(--color-primary)">S∞</text>
      <path d="M20 70 L 100 40 L 140 33 L 165 31 L 190 30" fill="none" stroke="var(--color-foreground)" strokeWidth="1.5" />
      {[20, 100, 140, 165, 190].map((x, i) => <circle key={i} cx={x} cy={[70,40,33,31,30][i]} r="2.5" fill="var(--color-foreground)" />)}
      <text x="110" y="92" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">partial sums close in on a finite limit when |r| &lt; 1</text>
    </svg>
  );
}

const SEQ_GUIDE: GuideCardItem[] = [
  {
    key: "arith",
    title: "Arithmetic — add the same amount each step",
    explain: <>Each term is the previous term plus a fixed common difference <span className="font-mono">d</span>. The n-th term and the sum of the first n terms both have clean closed formulas.</>,
    formula: <>aₙ = a₁ + (n−1)d · Sₙ = n(a₁ + aₙ)/2</>,
    diagram: <ArithMini />,
    example: {
      given: <span className="font-mono">a₁=2, d=3, n=5</span>,
      substitute: <>a₅ = 2 + 4·3, S₅ = 5·(2+14)/2</>,
      answer: <span className="font-mono">a₅=14, S₅=40</span>,
    },
  },
  {
    key: "geo",
    title: "Geometric — multiply by the same ratio each step",
    explain: <>Each term is the previous term times a fixed common ratio <span className="font-mono">r</span>. Terms grow (|r|&gt;1), shrink (|r|&lt;1) or alternate (r&lt;0).</>,
    formula: <>aₙ = a₁·r^(n−1) · Sₙ = a₁(1−rⁿ)/(1−r)</>,
    diagram: <GeoMini />,
    example: {
      given: <span className="font-mono">a₁=3, r=2, n=4</span>,
      substitute: <>a₄ = 3·2³, S₄ = 3·(1−16)/(1−2)</>,
      answer: <span className="font-mono">a₄=24, S₄=45</span>,
    },
  },
  {
    key: "inf",
    title: "Sum to infinity — only for shrinking geometrics",
    explain: <>When <span className="font-mono">|r| &lt; 1</span> the terms shrink to zero fast enough that the partial sums converge to a finite limit. Otherwise the series diverges.</>,
    formula: <>S∞ = a₁ / (1 − r), only when |r| &lt; 1</>,
    diagram: <InfMini />,
    example: {
      given: <span className="font-mono">a₁=1, r=1/2</span>,
      substitute: <>1 / (1 − 1/2)</>,
      answer: <span className="font-mono">S∞ = 2</span>,
    },
  },
];
