import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
import { StepsToggle } from "@/components/StepsToggle";
import type { Step } from "@/components/SolutionSteps";
import {
  zCritical,
  tCritical,
  fmt,
} from "@/lib/math/confidence-interval";
import { normalPDF } from "@/lib/math/p-value";

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

export const Route = createFileRoute("/calculators/math/margin-of-error-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Margin of Error Calculator",
      title:
        "Margin of Error Calculator — Mean & Proportion",
      metaDescription:
        "Compute the margin of error for a mean or proportion at any confidence level with critical value, SE, and steps.",
      canonicalUrl: "/calculators/math/margin-of-error-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Margin of Error Calculator",
          path: "/calculators/math/margin-of-error-calculator",
        },
      ],
      faqs: [
        {
          q: "What does margin of error actually mean?",
          a: "It is the ± range added to a sample estimate to express uncertainty at a chosen confidence level. A poll reporting 60% ± 3% at 95% confidence means the procedure that produced this interval covers the true proportion about 95% of the time in repeated sampling.",
        },
        {
          q: "Should I use the proportion tool or the mean tool?",
          a: "Use the proportion tool for yes/no or percentage survey questions (e.g. approval, market share). Use the mean tool for continuous measurements (e.g. average income, average time, average score) where you have a sample standard deviation.",
        },
        {
          q: "Why is p = 0.5 the default?",
          a: "The variance term p(1 − p) reaches its maximum at p = 0.5, so plugging in 0.5 gives the largest — most conservative — margin of error for a given n and confidence level. This is standard practice when the true proportion is unknown in advance (sample size planning).",
        },
        {
          q: "When do I need the finite-population correction?",
          a: "When your sample is a large fraction of a small population (rule of thumb: n / N > 5%). It multiplies the margin of error by √((N − n) / (N − 1)) and shrinks it, because sampling most of a small population removes real uncertainty.",
        },
        {
          q: "Why does the mean tool switch between Z and t?",
          a: "Because when the standard deviation is estimated from the sample (which is almost always the case), small samples require the Student t-distribution to account for the extra uncertainty in that estimate. Once n ≥ 30, Z and t effectively agree, so the tool uses Z there for simplicity — the same convention the Confidence Interval Calculator on this site uses.",
        },
        {
          q: "How can I halve the margin of error?",
          a: "Because margin of error scales with 1/√n, you need to quadruple the sample size to cut the margin of error in half — going from n = 400 to n = 1 600, for example. Doubling n only shrinks it by about 29%.",
        },
      ],
    }),
  component: MarginOfErrorPage,
});

const PRESET_LEVELS = [80, 85, 90, 95, 98, 99, 99.5, 99.9] as const;

function MarginOfErrorPage() {
  return (
    <MathCalcPage
      name="Margin of Error Calculator"
      tagline="Margin of error for a survey proportion or a sample mean — with confidence level, optional finite-population correction, auto Z/t switch and a shaded normal-curve diagram."
      extras={<Extras />}
    >
      <div className="space-y-8">
        <ProportionTool />
        <div className="h-px bg-border/60" />
        <MeanTool />
      </div>
    </MathCalcPage>
  );
}

/* ================================================================
   Shared visual — shaded standard-normal curve with ± critical zone
   ================================================================ */
function CriticalCurve({
  critical,
  label,
}: {
  critical: number;
  label: string;
}) {
  const W = 560;
  const H = 200;
  const pad = 30;
  const xMin = -4;
  const xMax = 4;
  const N = 320;
  const pts: [number, number][] = [];
  let maxY = 0;
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    const y = normalPDF(x);
    if (y > maxY) maxY = y;
    pts.push([x, y]);
  }
  const px = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
  const py = (y: number) => H - pad - (y / maxY) * (H - 2 * pad);
  const curve =
    "M " +
    pts.map(([x, y]) => `${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(" L ");

  // shaded body between −critical and +critical (confidence area)
  const body = pts.filter(([x]) => x >= -critical && x <= critical);
  const bodyPath =
    body.length > 1
      ? `M ${px(body[0][0]).toFixed(1)},${py(0).toFixed(1)} ` +
        body
          .map(([x, y]) => `L ${px(x).toFixed(1)},${py(y).toFixed(1)}`)
          .join(" ") +
        ` L ${px(body[body.length - 1][0]).toFixed(1)},${py(0).toFixed(1)} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      <line
        x1={pad}
        y1={H - pad}
        x2={W - pad}
        y2={H - pad}
        className="stroke-muted-foreground/40"
        strokeWidth={1}
      />
      {bodyPath && <path d={bodyPath} className="fill-primary/25" />}
      <path d={curve} className="fill-none stroke-primary" strokeWidth={2} />
      {[-critical, critical].map((cx, i) => (
        <g key={i}>
          <line
            x1={px(cx)}
            y1={pad}
            x2={px(cx)}
            y2={H - pad}
            className="stroke-foreground"
            strokeDasharray="4 3"
          />
          <text
            x={px(cx)}
            y={pad - 6}
            textAnchor="middle"
            className="fill-foreground text-[11px] font-medium"
          >
            {cx > 0 ? "+" : "−"}
            {fmt(Math.abs(cx), 3)}
          </text>
        </g>
      ))}
      <text
        x={px(0)}
        y={H - pad + 14}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px]"
      >
        confidence area shaded • ±critical marked
      </text>
    </svg>
  );
}

function ErrorBar({
  lower,
  upper,
  center,
  unit = "",
}: {
  lower: number;
  upper: number;
  center: number;
  unit?: string;
}) {
  const span = upper - lower;
  const pad = span * 0.25 || 1;
  const vMin = lower - pad;
  const vMax = upper + pad;
  const scale = (v: number) => ((v - vMin) / (vMax - vMin)) * 100;
  const xL = scale(lower);
  const xU = scale(upper);
  const xM = scale(center);
  return (
    <div className="mt-4">
      <div className="mb-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Confidence interval
      </div>
      <svg
        viewBox="0 0 100 22"
        role="img"
        aria-label="Confidence interval error bar"
        className="w-full"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          x2="100"
          y1="12"
          y2="12"
          stroke="var(--color-border)"
          strokeWidth="0.4"
        />
        <line
          x1={xL}
          x2={xU}
          y1="12"
          y2="12"
          stroke="var(--color-primary)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <line
          x1={xL}
          x2={xL}
          y1="8"
          y2="16"
          stroke="var(--color-primary)"
          strokeWidth="0.9"
        />
        <line
          x1={xU}
          x2={xU}
          y1="8"
          y2="16"
          stroke="var(--color-primary)"
          strokeWidth="0.9"
        />
        <circle cx={xM} cy="12" r="1.4" fill="var(--color-primary)" />
      </svg>
      <div className="relative mt-1 h-4 text-[10px] text-muted-foreground">
        <span
          className="absolute -translate-x-1/2 tabular-nums"
          style={{ left: `${xL}%` }}
        >
          {fmt(lower, 4)}
          {unit}
        </span>
        <span
          className="absolute -translate-x-1/2 tabular-nums text-foreground"
          style={{ left: `${xM}%` }}
        >
          {fmt(center, 4)}
          {unit}
        </span>
        <span
          className="absolute -translate-x-1/2 tabular-nums"
          style={{ left: `${xU}%` }}
        >
          {fmt(upper, 4)}
          {unit}
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={
          (big ? "text-2xl " : "text-lg ") + "font-semibold text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}

function LevelField({
  level,
  setLevel,
}: {
  level: string;
  setLevel: (v: string) => void;
}) {
  return (
    <Field label="Confidence level (%)">
      <TextInput
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        inputMode="decimal"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESET_LEVELS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setLevel(String(v))}
            className="rounded-full border border-border/60 bg-secondary/40 px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {v}%
          </button>
        ))}
      </div>
    </Field>
  );
}

/* ================================================================
   TOOL 1 — Margin of error for a proportion
   ================================================================ */

interface PropResult {
  n: number;
  p: number;
  cl: number;
  N: number | null;
  z: number;
  se: number;
  fpc: number; // finite population correction factor (1 if none)
  moe: number; // as fraction (0..1)
  lower: number;
  upper: number;
}

function ProportionTool() {
  const [n, setN] = useState("1000");
  const [p, setP] = useState("0.5");
  const [level, setLevel] = useState("95");
  const [popN, setPopN] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<PropResult | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function run() {
    setErr(null);
    setRes(null);
    const nn = Number(n);
    const pp = Number(p);
    const clPct = Number(level);
    const NN = popN.trim() === "" ? null : Number(popN);

    if (!Number.isFinite(nn) || nn < 1 || !Number.isInteger(nn))
      return setErr("Sample size n must be a positive integer.");
    if (!Number.isFinite(pp) || pp < 0 || pp > 1)
      return setErr("Sample proportion p must be between 0 and 1.");
    if (!Number.isFinite(clPct) || clPct <= 0 || clPct >= 100)
      return setErr("Confidence level must be strictly between 0 and 100.");
    if (NN !== null) {
      if (!Number.isFinite(NN) || NN < nn || !Number.isInteger(NN))
        return setErr(
          "Population size N must be an integer ≥ n. Leave blank to skip the finite-population correction.",
        );
    }

    const cl = clPct / 100;
    const z = zCritical(cl);
    const rawSe = Math.sqrt((pp * (1 - pp)) / nn);
    const fpc =
      NN !== null && NN > 1 ? Math.sqrt((NN - nn) / (NN - 1)) : 1;
    const se = rawSe * fpc;
    const moe = z * se;
    setRes({
      n: nn,
      p: pp,
      cl,
      N: NN,
      z,
      se,
      fpc,
      moe,
      lower: Math.max(0, pp - moe),
      upper: Math.min(1, pp + moe),
    });
  }

  const steps: Step[] = useMemo(() => {
    if (!res) return [];
    const rawSe = Math.sqrt((res.p * (1 - res.p)) / res.n);
    return [
      {
        title: "Given values",
        body: (
          <>
            <MathNote>Sample data and chosen confidence level</MathNote>
            <MathLine>
              n = {res.n}, p̂ = {fmt(res.p, 4)}
              {res.N !== null ? `, N = ${res.N}` : ""}, confidence = {fmt(res.cl * 100, 2)}%
            </MathLine>
          </>
        ),
      },
      {
        title: "Find the critical value",
        body: (
          <>
            <MathNote>
              For a proportion, use the standard normal z critical value at the chosen confidence level
            </MathNote>
            <MathLine>z_(α/2) = {fmt(res.z, 4)}</MathLine>
          </>
        ),
      },
      {
        title: "Compute the standard error",
        body: (
          <>
            <MathNote>SE = √(p(1 − p) / n){res.N !== null ? ", then apply the finite-population correction" : ""}</MathNote>
            <MathLine>SE = √({fmt(res.p, 4)} × {fmt(1 - res.p, 4)} / {res.n})</MathLine>
            <MathLine>SE = {fmt(rawSe, 6)}</MathLine>
            {res.N !== null && (
              <>
                <MathLine>FPC = √(({res.N} − {res.n}) / ({res.N} − 1)) = {fmt(res.fpc, 5)}</MathLine>
                <MathLine>adjusted SE = {fmt(rawSe, 6)} × {fmt(res.fpc, 5)} = {fmt(res.se, 6)}</MathLine>
              </>
            )}
          </>
        ),
      },
      {
        title: "Compute the margin of error",
        body: (
          <>
            <MathNote>MoE = critical × SE</MathNote>
            <MathLine>MoE = {fmt(res.z, 4)} × {fmt(res.se, 6)}</MathLine>
            <MathLine>MoE = ±{fmt(res.moe * 100, 3)}%</MathLine>
          </>
        ),
      },
      {
        title: "Build the confidence interval",
        body: (
          <>
            <MathNote>CI = p̂ ± MoE</MathNote>
            <MathLine>
              CI = [{fmt(res.lower * 100, 3)}%, {fmt(res.upper * 100, 3)}%]
            </MathLine>
          </>
        ),
      },
    ];
  }, [res]);

  const summary = useMemo(() => {
    if (!res) return "";
    return [
      `Margin of Error (proportion)`,
      `n = ${res.n}, p = ${fmt(res.p, 4)}, confidence = ${fmt(res.cl * 100, 2)}%`,
      res.N !== null ? `Population N = ${res.N} (FPC = ${fmt(res.fpc, 5)})` : `No finite-population correction`,
      `Z = ${fmt(res.z, 4)}`,
      `Margin of error = ±${fmt(res.moe * 100, 3)}%`,
      `Confidence interval = [${fmt(res.lower * 100, 3)}%, ${fmt(res.upper * 100, 3)}%]`,
    ].join("\n");
  }, [res]);

  return (
    <section>
      <header className="mb-3">
        <h2 className="text-lg font-semibold text-foreground">
          Margin of Error — Proportion (survey / poll)
        </h2>
        <p className="text-sm text-muted-foreground">
          MoE = z × √(p(1 − p) / n), optionally multiplied by the finite-population
          correction √((N − n) / (N − 1)).
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Sample size (n)">
          <TextInput
            value={n}
            onChange={(e) => setN(e.target.value)}
            inputMode="numeric"
          />
        </Field>
        <Field label="Sample proportion (p, 0 to 1)">
          <TextInput
            value={p}
            onChange={(e) => setP(e.target.value)}
            inputMode="decimal"
          />
          <div className="mt-1 text-[11px] text-muted-foreground">
            Use <strong>0.5</strong> for the most conservative margin of error when
            the true proportion is unknown.
          </div>
        </Field>
        <LevelField level={level} setLevel={setLevel} />
        <Field label="Population size (N) — optional">
          <TextInput
            value={popN}
            onChange={(e) => setPopN(e.target.value)}
            inputMode="numeric"
            placeholder="Leave blank for infinite population"
          />
          <div className="mt-1 text-[11px] text-muted-foreground">
            Applies the finite-population correction — matters most when n is a
            large fraction of N.
          </div>
        </Field>
      </div>

      <div className="mt-4">
        <PrimaryButton onClick={run}>Compute margin of error</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}

      {res && (
        <div
          ref={ref}
          className="mt-4 rounded-2xl border border-border/60 bg-secondary/30 p-5"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Margin of error" value={`±${fmt(res.moe * 100, 3)}%`} big />
            <Stat
              label="Confidence interval"
              value={`${fmt(res.lower * 100, 3)}% – ${fmt(res.upper * 100, 3)}%`}
            />
            <Stat
              label="z (critical)"
              value={`${fmt(res.z, 4)} @ ${fmt(res.cl * 100, 2)}%`}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
              <div className="text-muted-foreground">Standard error</div>
              <div className="font-serif italic">{fmt(res.se, 6)}</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
              <div className="text-muted-foreground">FPC factor</div>
              <div className="font-serif italic">
                {res.N !== null ? fmt(res.fpc, 5) : "1 (not applied)"}
              </div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
              <div className="text-muted-foreground">p̂</div>
              <div className="font-serif italic">{fmt(res.p, 5)}</div>
            </div>
          </div>

          <div className="mt-5">
            <CriticalCurve
              critical={res.z}
              label={`Standard normal with ±${fmt(res.z, 3)} confidence region shaded at ${fmt(res.cl * 100, 2)}% confidence`}
            />
          </div>

          <ErrorBar
            lower={res.lower * 100}
            upper={res.upper * 100}
            center={res.p * 100}
            unit="%"
          />

          <StepsToggle steps={steps} />


          <div className="mt-4">
            <ResultActions
              captureRef={ref}
              filename="margin-of-error-proportion"
              getCopyText={() => summary}
            />
          </div>
        </div>
      )}
    </section>
  );
}

/* ================================================================
   TOOL 2 — Margin of error for a mean
   ================================================================ */

interface MeanResult {
  n: number;
  mean: number;
  s: number;
  cl: number;
  method: "z" | "t";
  critical: number;
  df: number | null;
  se: number;
  moe: number;
  lower: number;
  upper: number;
}

function MeanTool() {
  const [n, setN] = useState("25");
  const [mean, setMean] = useState("100");
  const [s, setS] = useState("15");
  const [level, setLevel] = useState("95");
  const [methodMode, setMethodMode] = useState<"auto" | "z" | "t">("auto");
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<MeanResult | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function run() {
    setErr(null);
    setRes(null);
    const nn = Number(n);
    const mm = Number(mean);
    const ss = Number(s);
    const clPct = Number(level);

    if (!Number.isFinite(nn) || nn < 2 || !Number.isInteger(nn))
      return setErr("Sample size n must be an integer ≥ 2.");
    if (!Number.isFinite(mm)) return setErr("Sample mean must be a number.");
    if (!Number.isFinite(ss) || ss < 0)
      return setErr("Sample standard deviation must be a non-negative number.");
    if (!Number.isFinite(clPct) || clPct <= 0 || clPct >= 100)
      return setErr("Confidence level must be strictly between 0 and 100.");

    const cl = clPct / 100;
    const method: "z" | "t" =
      methodMode === "auto" ? (nn >= 30 ? "z" : "t") : methodMode;
    const critical =
      method === "z" ? zCritical(cl) : tCritical(cl, nn - 1);
    const se = ss / Math.sqrt(nn);
    const moe = critical * se;
    setRes({
      n: nn,
      mean: mm,
      s: ss,
      cl,
      method,
      critical,
      df: method === "t" ? nn - 1 : null,
      se,
      moe,
      lower: mm - moe,
      upper: mm + moe,
    });
  }

  const steps: Step[] = useMemo(() => {
    if (!res) return [];
    return [
      {
        title: "Given values",
        body: (
          <>
            <MathNote>Sample data and chosen confidence level</MathNote>
            <MathLine>
              n = {res.n}, x̄ = {fmt(res.mean, 4)}, s = {fmt(res.s, 4)}, confidence = {fmt(res.cl * 100, 2)}%
            </MathLine>
          </>
        ),
      },
      {
        title: "Choose the critical value",
        body: (
          <>
            <MathNote>
              {res.method === "z"
                ? "n ≥ 30, so use the standard normal z critical value"
                : `n < 30, so use Student's t critical value with df = n − 1 = ${res.df}`}
            </MathNote>
            <MathLine>
              {res.method === "z" ? "z_(α/2)" : `t_(α/2, ${res.df})`} = {fmt(res.critical, 4)}
            </MathLine>
          </>
        ),
      },
      {
        title: "Compute the standard error",
        body: (
          <>
            <MathNote>For a mean, SE = s / √n</MathNote>
            <MathLine>SE = {fmt(res.s, 4)} / √{res.n}</MathLine>
            <MathLine>SE = {fmt(res.se, 6)}</MathLine>
          </>
        ),
      },
      {
        title: "Compute the margin of error",
        body: (
          <>
            <MathNote>MoE = critical × SE</MathNote>
            <MathLine>MoE = {fmt(res.critical, 4)} × {fmt(res.se, 6)}</MathLine>
            <MathLine>MoE = ±{fmt(res.moe, 5)}</MathLine>
          </>
        ),
      },
      {
        title: "Build the confidence interval",
        body: (
          <>
            <MathNote>CI = x̄ ± MoE</MathNote>
            <MathLine>
              CI = [{fmt(res.lower, 4)}, {fmt(res.upper, 4)}]
            </MathLine>
          </>
        ),
      },
    ];
  }, [res]);

  const summary = useMemo(() => {
    if (!res) return "";
    return [
      `Margin of Error (mean)`,
      `n = ${res.n}, mean = ${fmt(res.mean, 5)}, s = ${fmt(res.s, 5)}, confidence = ${fmt(res.cl * 100, 2)}%`,
      `Method: ${res.method.toUpperCase()}${res.df !== null ? ` (df = ${res.df})` : ""}, critical = ${fmt(res.critical, 4)}`,
      `Standard error = ${fmt(res.se, 6)}`,
      `Margin of error = ±${fmt(res.moe, 5)}`,
      `Confidence interval = [${fmt(res.lower, 5)}, ${fmt(res.upper, 5)}]`,
    ].join("\n");
  }, [res]);

  return (
    <section>
      <header className="mb-3">
        <h2 className="text-lg font-semibold text-foreground">
          Margin of Error — Mean
        </h2>
        <p className="text-sm text-muted-foreground">
          MoE = critical × s / √n. Auto-switches to Student's t for small samples
          (n &lt; 30), matching the{" "}
          <a className="underline" href="/calculators/math/confidence-interval-calculator">
            Confidence Interval Calculator
          </a>
          .
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Sample size (n)">
          <TextInput
            value={n}
            onChange={(e) => setN(e.target.value)}
            inputMode="numeric"
          />
        </Field>
        <Field label="Sample mean (x̄)">
          <TextInput
            value={mean}
            onChange={(e) => setMean(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field label="Sample standard deviation (s)">
          <TextInput
            value={s}
            onChange={(e) => setS(e.target.value)}
            inputMode="decimal"
          />
        </Field>
        <LevelField level={level} setLevel={setLevel} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Method:</span>
        {(["auto", "z", "t"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethodMode(m)}
            className={
              "rounded-full border px-3 py-1 transition " +
              (methodMode === m
                ? "border-primary/60 bg-primary/15 text-foreground"
                : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground")
            }
          >
            {m === "auto" ? "Auto (n≥30 → Z)" : m === "z" ? "Force Z" : "Force t"}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <PrimaryButton onClick={run}>Compute margin of error</PrimaryButton>
      </div>
      {err && <ErrorBox message={err} />}

      {res && (
        <div
          ref={ref}
          className="mt-4 rounded-2xl border border-border/60 bg-secondary/30 p-5"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Margin of error" value={`±${fmt(res.moe, 4)}`} big />
            <Stat
              label="Confidence interval"
              value={`${fmt(res.lower, 4)} – ${fmt(res.upper, 4)}`}
            />
            <Stat
              label={res.method === "z" ? "z (critical)" : `t (critical, df = ${res.df})`}
              value={`${fmt(res.critical, 4)} @ ${fmt(res.cl * 100, 2)}%`}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm">
            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
              <div className="text-muted-foreground">Standard error (s / √n)</div>
              <div className="font-serif italic">{fmt(res.se, 6)}</div>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
              <div className="text-muted-foreground">Distribution used</div>
              <div className="font-serif italic">
                {res.method === "z"
                  ? "Standard normal (Z)"
                  : `Student's t (df = ${res.df})`}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <CriticalCurve
              critical={res.critical}
              label={`${res.method === "z" ? "Standard normal" : "t-distribution"} with ±${fmt(res.critical, 3)} confidence region shaded at ${fmt(res.cl * 100, 2)}% confidence`}
            />
          </div>

          <ErrorBar lower={res.lower} upper={res.upper} center={res.mean} />

          <StepsToggle steps={steps} />


          <div className="mt-4">
            <ResultActions
              captureRef={ref}
              filename="margin-of-error-mean"
              getCopyText={() => summary}
            />
          </div>
        </div>
      )}
    </section>
  );
}

/* ================================================================
   Extras — educational content
   ================================================================ */

const MOE_GUIDE: GuideCardItem[] = [
  {
    key: "def",
    title: "1. What margin of error is — critical × standard error",
    explain:
      "Margin of error is the ± half-width added to a sample estimate to express sampling uncertainty at a chosen confidence level. It combines two ingredients: the standard error (how noisy the estimate is) and a critical value (how confident you want to be).",
    formula: <>MoE = critical × SE</>,
    legend: [
      { sym: "critical", def: "z or t for your confidence level" },
      { sym: "SE", def: "standard error of the estimate" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 90" className="w-full max-w-[240px]" aria-hidden>
          <line x1="20" y1="50" x2="220" y2="50" className="stroke-border" />
          <line x1="80" y1="40" x2="80" y2="60" className="stroke-primary" strokeWidth="2" />
          <line x1="160" y1="40" x2="160" y2="60" className="stroke-primary" strokeWidth="2" />
          <circle cx="120" cy="50" r="4" className="fill-primary" />
          <text x="120" y="35" fontSize="10" textAnchor="middle" className="fill-primary">estimate</text>
          <text x="120" y="75" fontSize="9" textAnchor="middle" className="fill-muted-foreground">± margin of error</text>
        </svg>
      </div>
    ),
    example: {
      given: "SE = 0.015, z = 1.96",
      substitute: "MoE = 1.96 × 0.015",
      answer: "MoE ≈ ±0.030",
    },
  },
  {
    key: "prop",
    title: "2. Proportion formula — √(p(1 − p)/n)",
    explain:
      "For yes/no survey questions the standard error is √(p(1 − p)/n). When the true p is unknown, use p = 0.5 to get the widest (most conservative) MoE for planning. Add the finite-population correction if the sample is a large fraction of the population.",
    formula: <>MoE = z<sub>α/2</sub> · √( p(1 − p) / n )</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M30 90 Q120 -10 210 90" fill="none" className="stroke-primary" strokeWidth="2" />
          <line x1="120" y1="30" x2="120" y2="90" className="stroke-primary" strokeDasharray="3 3" />
          <text x="120" y="105" fontSize="10" textAnchor="middle" className="fill-foreground">p = 0.5 → widest MoE</text>
        </svg>
      </div>
    ),
    example: {
      given: "p = 0.60, n = 1000, 95% CI",
      substitute: "1.96·√(0.24/1000)",
      answer: "MoE ≈ ±3.04%",
    },
  },
  {
    key: "mean",
    title: "3. Mean formula — t for small n, Z for large n",
    explain:
      "For continuous measurements the standard error is s/√n. Use the Student t critical value with df = n − 1 when the sample is small; once n ≥ 30 the t and Z critical values almost agree and Z is a fine shortcut.",
    formula: <>MoE = t<sub>α/2, n−1</sub> · ( s / √n )</>,
    legend: [
      { sym: "s", def: "sample standard deviation" },
    ],
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M20 90 Q70 15 120 55 T220 90" fill="none" className="stroke-primary" strokeWidth="2" />
          <path d="M20 90 Q70 40 120 70 T220 90" fill="none" className="stroke-primary/40" strokeWidth="2" strokeDasharray="4 3" />
          <text x="120" y="20" fontSize="9" textAnchor="middle" className="fill-primary">t (small n) → heavier tails</text>
        </svg>
      </div>
    ),
    example: {
      given: "s = 10, n = 25, 95% CI",
      substitute: "t₀.₀₂₅, ₂₄ · 10 / √25",
      answer: "MoE ≈ ±4.13",
    },
  },
  {
    key: "sqrtn",
    title: "4. Sample size effect — shrinks with √n",
    explain:
      "Because n sits under a square root, halving MoE requires quadrupling the sample. Going from n = 400 to n = 1600 only halves the ± width. That's why polls hit a sharp diminishing return around 1,000–2,000 respondents.",
    formula: <>MoE ∝ 1 / √n</>,
    diagram: (
      <div className="flex h-full items-center justify-center rounded-2xl border border-border/60 bg-secondary/20 p-4">
        <svg viewBox="0 0 240 110" className="w-full max-w-[240px]" aria-hidden>
          <path d="M30 20 Q80 60 120 75 T210 95" fill="none" className="stroke-primary" strokeWidth="2" />
          <text x="35" y="35" fontSize="9" className="fill-foreground">n=100</text>
          <text x="150" y="70" fontSize="9" className="fill-foreground">n=1000</text>
          <text x="120" y="105" fontSize="10" textAnchor="middle" className="fill-muted-foreground">n increases →</text>
        </svg>
      </div>
    ),
    example: {
      given: "n = 100 vs 1600, p = 0.5, 95% CI",
      substitute: "±9.8% vs ±2.45%",
      answer: "16× n → 4× tighter",
    },
  },
];

function Extras() {
  return (
    <>
      <CalcSection title="Margin of error explained, step by step">
        <p>
          Margin of error is the ± range a poll or study reports at a given
          confidence level. Each card below covers one piece the calculator
          uses on the proportion and mean tools.
        </p>
        <GuideCards items={MOE_GUIDE} />
      </CalcSection>

      <CalcSection title="Features of this calculator">
        <FeatureList
          items={[
            "Proportion and mean tools on the same page.",
            "Preset confidence levels (80/85/90/95/98/99/99.5/99.9%) plus a custom-level input.",
            "Finite-population correction on the proportion tool for surveys of small populations.",
            "Auto-switches between t (small n) and Z (n ≥ 30) on the mean tool.",
            "Critical-value curve visualising the α/2 tails and a horizontal ± bar for the estimated MoE.",
            "Show / hide step-by-step working covering the SE, critical value and multiplication.",
          ]}
        />
      </CalcSection>

      <CalcFAQ
        items={[
          {
            q: "Is margin of error the same as standard error?",
            a: "No. Standard error is the standard deviation of the sampling distribution (s / √n or √(p(1−p)/n)). Margin of error is the standard error multiplied by a critical value (z or t) chosen for your confidence level — MoE = critical × SE.",
          },
          {
            q: "Can margin of error be larger than the estimate itself?",
            a: "Yes, especially with very small samples or rare events. A poll that finds 3% support with n = 100 has a 95% MoE around ±3.3%, so the interval crosses zero — a signal that the sample is too small to say anything precise.",
          },
          {
            q: "How does confidence level change the number?",
            a: "Higher confidence widens the interval. Going from 95% to 99% confidence (z from 1.960 to 2.576) enlarges the margin of error by about 31% for the same sample size.",
          },
          {
            q: "Do I need to know the population size?",
            a: "Only when the sample is a substantial fraction of a small population (n / N > ~5%). Otherwise the finite-population correction is essentially 1 and can be omitted.",
          },
          {
            q: "How is the mean version different from the proportion version?",
            a: "The proportion version uses √(p(1−p)/n) as the standard error and always uses Z. The mean version uses s / √n and switches to the Student t-distribution when n is small, because s is itself estimated from the data.",
          },
          {
            q: "Does margin of error tell me the poll is 'right'?",
            a: "No — it only bounds sampling variability. It cannot detect bad questionnaire design, non-response bias, or a non-random sample. Those errors need methodology fixes, not a wider interval.",
          },
        ]}
      />

      <RelatedLinks
        links={[
          { to: "/calculators/math/confidence-interval-calculator", label: "Confidence Interval Calculator" },
          { to: "/calculators/math/sample-size-calculator", label: "Sample Size Calculator" },
          { to: "/calculators/math/z-score-calculator", label: "Z-score Calculator" },
          { to: "/calculators/math/critical-value-calculator", label: "Critical Value Calculator" },
        ]}
      />
    </>
  );
}
