import { createFileRoute, Link } from "@tanstack/react-router";
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
  GuideCards,
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { SolutionSteps, type Step } from "@/components/SolutionSteps";
import {
  GroupedTable,
  type GroupedRow,
} from "@/components/GroupedDataInput";
import { parseDataset } from "@/lib/math/parse-numbers";

export const Route = createFileRoute("/calculators/math/relative-frequency-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Relative Frequency Calculator",
      title:
        "Relative Frequency Calculator — Table, Bar Chart & Ogive",
      metaDescription:
        "Build a frequency distribution table from raw or tallied data: frequency, relative frequency (% and decimal), cumulative frequency, bar chart and ogive.",
      canonicalUrl: "/calculators/math/relative-frequency-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        {
          name: "Relative Frequency Calculator",
          path: "/calculators/math/relative-frequency-calculator",
        },
      ],
      faqs: [
        {
          q: "What is relative frequency?",
          a: "Relative frequency is the proportion of total observations that fall into a given category or interval: frequency divided by the total number of observations. It's often expressed as a decimal between 0 and 1 or as a percentage.",
        },
        {
          q: "What is cumulative relative frequency?",
          a: "Cumulative relative frequency is the running total of relative frequencies up to and including the current category. The last row must equal 1 (or 100%). It's the y-value of an ogive chart.",
        },
        {
          q: "What's the difference between a bar chart and a histogram?",
          a: "A bar chart is used for categorical or discrete data, with gaps between bars. A histogram is used for grouped continuous data (class intervals), with bars touching to show the values form a continuous scale.",
        },
        {
          q: "Is relative frequency the same as probability?",
          a: "Not exactly — but relative frequency from observed data is the empirical (frequentist) estimate of probability. As the sample size grows, the relative frequency of an event converges to its true probability (the law of large numbers).",
        },
        {
          q: "Should my relative frequencies always sum to 1?",
          a: "Yes. If the sum isn't exactly 1 (or 100%), you either have a rounding artefact or a data-entry mistake. Small differences of ±0.001 are normal after rounding; larger gaps mean a category is missing or double-counted.",
        },
        {
          q: "How do I pick class intervals for continuous data?",
          a: "A common rule of thumb is Sturges' rule: number of classes ≈ 1 + log₂(n). Round to a convenient bin width. This calculator lets you either set the bin width directly or use Sturges' rule automatically.",
        },
      ],
    }),
  component: RelativeFrequencyPage,
});

/* ---------------- Types & math ---------------- */

type Mode = "raw-discrete" | "raw-grouped" | "table";

interface DistRow {
  label: string;
  freq: number;
  rel: number;
  cumFreq: number;
  cumRel: number;
  /** For grouped mode, the numeric interval bounds — used by the histogram. */
  lo?: number;
  hi?: number;
}

interface DistResult {
  mode: Mode;
  rows: DistRow[];
  total: number;
  /** True when rows represent numeric class intervals (histogram, not bar chart). */
  grouped: boolean;
  /** Optional info line, e.g. class width & rule used. */
  note?: string;
}

function fmt(n: number, dp = 4): string {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-4 || abs >= 1e12)) return n.toExponential(3);
  const s = n.toFixed(dp);
  return s.replace(/\.?0+$/, "");
}

function pct(x: number): string {
  return (x * 100).toFixed(2).replace(/\.?0+$/, "") + "%";
}

/** Build a distribution from a list of raw categorical / discrete tokens. */
function distFromDiscrete(tokens: string[]): DistResult {
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  // Sort numerically when possible, otherwise alphabetically.
  const entries = Array.from(counts.entries());
  const numeric = entries.every(([k]) => Number.isFinite(Number(k)));
  entries.sort((a, b) =>
    numeric ? Number(a[0]) - Number(b[0]) : a[0].localeCompare(b[0]),
  );
  return buildRows(entries.map(([label, freq]) => ({ label, freq })), false);
}

/** Build a distribution from raw numeric data grouped into equal-width classes. */
function distFromGrouped(
  values: number[],
  binWidth: number | "auto",
): DistResult {
  const min = Math.min(...values);
  const max = Math.max(...values);
  let k: number;
  let w: number;
  if (binWidth === "auto") {
    k = Math.max(1, Math.ceil(1 + Math.log2(values.length))); // Sturges
    const range = max - min || 1;
    w = niceWidth(range / k);
    k = Math.max(1, Math.ceil((max - min) / w) || 1);
  } else {
    w = binWidth;
    k = Math.max(1, Math.ceil((max - min) / w) || 1);
  }
  // Bins are [lo, hi) except the last, which is [lo, hi].
  const start = Math.floor(min / w) * w;
  const bins: { lo: number; hi: number; freq: number }[] = [];
  for (let i = 0; i < k; i++) {
    bins.push({ lo: start + i * w, hi: start + (i + 1) * w, freq: 0 });
  }
  // Ensure max lands in the last bin.
  if (bins[bins.length - 1].hi <= max)
    bins.push({
      lo: bins[bins.length - 1].hi,
      hi: bins[bins.length - 1].hi + w,
      freq: 0,
    });
  for (const v of values) {
    let idx = Math.floor((v - start) / w);
    if (idx < 0) idx = 0;
    if (idx >= bins.length) idx = bins.length - 1;
    bins[idx].freq++;
  }
  // Trim trailing empty bins (keep a leading empty bin only if user data has a gap;
  // for simplicity keep everything so the ogive stays monotone).
  const built = buildRows(
    bins.map((b) => ({
      label: `[${fmt(b.lo)}, ${fmt(b.hi)}${bins[bins.length - 1] === b ? "]" : ")"}`,
      freq: b.freq,
      lo: b.lo,
      hi: b.hi,
    })),
    true,
  );
  built.note = `${bins.length} classes of width ${fmt(w)}${binWidth === "auto" ? " (Sturges' rule)" : ""}.`;
  return built;
}

/** Choose a "nice" bin width close to the raw value (1, 2, 5 × 10^k). */
function niceWidth(w: number): number {
  if (!Number.isFinite(w) || w <= 0) return 1;
  const exp = Math.floor(Math.log10(w));
  const base = w / Math.pow(10, exp);
  const nice = base < 1.5 ? 1 : base < 3.5 ? 2 : base < 7.5 ? 5 : 10;
  return nice * Math.pow(10, exp);
}

function buildRows(
  raw: { label: string; freq: number; lo?: number; hi?: number }[],
  grouped: boolean,
): DistResult {
  const total = raw.reduce((s, r) => s + r.freq, 0);
  let cumFreq = 0;
  const rows: DistRow[] = raw.map((r) => {
    cumFreq += r.freq;
    const rel = total > 0 ? r.freq / total : 0;
    return {
      label: r.label,
      freq: r.freq,
      rel,
      cumFreq,
      cumRel: total > 0 ? cumFreq / total : 0,
      lo: r.lo,
      hi: r.hi,
    };
  });
  return { mode: "raw-discrete", rows, total, grouped };
}

/* ---------------- SVG charts ---------------- */

function BarChart({
  rows,
  grouped,
}: {
  rows: DistRow[];
  grouped: boolean;
}) {
  const W = 640;
  const H = 260;
  const padL = 44;
  const padR = 16;
  const padT = 14;
  const padB = 56;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxF = Math.max(1, ...rows.map((r) => r.freq));
  const n = rows.length;
  const gap = grouped ? 0 : 4;
  const barW = n > 0 ? (plotW - gap * (n - 1)) / n : plotW;
  const y = (f: number) => padT + plotH - (f / maxF) * plotH;
  // y-axis ticks
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((maxF * i) / ticks),
  );
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={grouped ? "Histogram of frequencies" : "Bar chart of frequencies"}
    >
      {/* grid + y ticks */}
      {tickVals.map((t, i) => {
        const yy = y(t);
        return (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={yy}
              y2={yy}
              stroke="var(--color-border)"
              strokeDasharray="2 3"
              opacity={0.6}
            />
            <text
              x={padL - 6}
              y={yy + 3}
              textAnchor="end"
              fontSize={10}
              fill="var(--color-muted-foreground)"
            >
              {t}
            </text>
          </g>
        );
      })}
      {/* bars */}
      {rows.map((r, i) => {
        const x = padL + i * (barW + gap);
        const h = plotH - (y(r.freq) - padT);
        return (
          <g key={i}>
            <rect
              x={x}
              y={y(r.freq)}
              width={Math.max(1, barW)}
              height={Math.max(0, h)}
              fill="var(--color-primary)"
              fillOpacity={0.7}
              stroke="var(--color-primary)"
              strokeWidth={grouped ? 1 : 0}
            />
            {r.freq > 0 && (
              <text
                x={x + barW / 2}
                y={y(r.freq) - 4}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-foreground)"
              >
                {r.freq}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={H - padB + 14}
              textAnchor="middle"
              fontSize={9}
              fill="var(--color-muted-foreground)"
              transform={
                r.label.length > 8
                  ? `rotate(-30 ${x + barW / 2} ${H - padB + 14})`
                  : undefined
              }
            >
              {r.label}
            </text>
          </g>
        );
      })}
      {/* axes */}
      <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="var(--color-border)" />
      <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} stroke="var(--color-border)" />
      <text
        x={padL + plotW / 2}
        y={H - 6}
        textAnchor="middle"
        fontSize={11}
        fill="var(--color-muted-foreground)"
      >
        {grouped ? "Class interval" : "Category"}
      </text>
    </svg>
  );
}

function OgiveChart({ rows }: { rows: DistRow[] }) {
  const W = 640;
  const H = 220;
  const padL = 44;
  const padR = 16;
  const padT = 14;
  const padB = 44;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = rows.length;
  if (n === 0) return null;
  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH - v * plotH;
  const pts = rows.map((r, i) => ({ x: x(i), y: y(r.cumRel), r }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Ogive: cumulative relative frequency"
    >
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--color-border)"
            strokeDasharray="2 3"
            opacity={0.6}
          />
          <text
            x={padL - 6}
            y={y(t) + 3}
            textAnchor="end"
            fontSize={10}
            fill="var(--color-muted-foreground)"
          >
            {(t * 100).toFixed(0)}%
          </text>
        </g>
      ))}
      <path
        d={path}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={2}
      />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3.5} fill="var(--color-primary)" />
          <text
            x={p.x}
            y={H - padB + 14}
            textAnchor="middle"
            fontSize={9}
            fill="var(--color-muted-foreground)"
            transform={
              p.r.label.length > 8
                ? `rotate(-30 ${p.x} ${H - padB + 14})`
                : undefined
            }
          >
            {p.r.label}
          </text>
        </g>
      ))}
      <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="var(--color-border)" />
      <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} stroke="var(--color-border)" />
      <text
        x={padL + plotW / 2}
        y={H - 6}
        textAnchor="middle"
        fontSize={11}
        fill="var(--color-muted-foreground)"
      >
        Cumulative relative frequency (ogive)
      </text>
    </svg>
  );
}

/* ---------------- Page ---------------- */

/* ---------------- Educational guide cards ---------------- */

function RfSlicesDiagram() {
  const parts = [
    { v: 0.4, l: "A 40%" },
    { v: 0.35, l: "B 35%" },
    { v: 0.25, l: "C 25%" },
  ];
  const W = 260, H = 100;
  let x = 10;
  const iw = W - 20;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Relative frequency shown as a share of the whole">
      {parts.map((p, i) => {
        const w = iw * p.v;
        const rect = (
          <g key={i}>
            <rect x={x} y={30} width={w} height={28} fill={i === 0 ? "var(--color-primary)" : i === 1 ? "var(--color-primary)" : "var(--color-primary)"} opacity={0.35 + i * 0.2} />
            <text x={x + w / 2} y={48} textAnchor="middle" fontSize={11} fill="var(--color-foreground)">{p.l}</text>
          </g>
        );
        x += w;
        return rect;
      })}
      <text x={W / 2} y={20} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">whole = 20 responses</text>
      <text x={W / 2} y={H - 5} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">shares must sum to 1 (100%)</text>
    </svg>
  );
}

function OgiveMiniDiagram() {
  const W = 260, H = 110;
  const pts = [
    [20, H - 15],
    [80, H - 45],
    [140, H - 75],
    [200, H - 92],
    [240, H - 95],
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative relative frequency ogive rising from 0 to 1">
      <line x1={20} y1={H - 15} x2={W - 10} y2={H - 15} stroke="var(--color-border)" />
      <line x1={20} y1={10} x2={20} y2={H - 15} stroke="var(--color-border)" />
      <text x={12} y={14} textAnchor="end" fontSize={9} fill="var(--color-muted-foreground)">1.0</text>
      <text x={12} y={H - 12} textAnchor="end" fontSize={9} fill="var(--color-muted-foreground)">0</text>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--color-primary)" strokeWidth={2} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="var(--color-primary)" />
      ))}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">upper class boundary →</text>
    </svg>
  );
}

const RELFREQ_GUIDE: GuideCardItem[] = [
  {
    key: "rf",
    title: "Relative frequency",
    explain:
      "The frequency of a category divided by the total number of observations. It converts a raw count into a share of the whole, so categories become directly comparable regardless of sample size.",
    formula: <>rf = f / N</>,
    legend: [
      { sym: "f", def: "frequency (count) in the category" },
      { sym: "N", def: "total number of observations" },
      { sym: "rf", def: "relative frequency, in [0, 1]" },
    ],
    diagram: <RfSlicesDiagram />,
    example: {
      given: "N = 20, category A has f = 8",
      substitute: "rf = 8 / 20",
      answer: "0.40 (40%)",
    },
  },
  {
    key: "pct",
    title: "Percentage form",
    explain:
      "Multiply a relative frequency by 100 to get a percentage. Percentages are easier to read and are what you'd typically put on a chart or in a headline number, but the underlying arithmetic is identical.",
    formula: <>rf% = (f / N) × 100</>,
    legend: [
      { sym: "rf%", def: "relative frequency expressed as a percent" },
      { sym: "f", def: "category count" },
      { sym: "N", def: "total observations" },
    ],
    diagram: <RfSlicesDiagram />,
    example: {
      given: "N = 50, grade B has f = 14",
      substitute: "rf% = (14 / 50) × 100",
      answer: "28%",
    },
  },
  {
    key: "cf",
    title: "Cumulative frequency",
    explain:
      "A running total of the frequencies as you read the table top-to-bottom. Row i's cumulative frequency answers 'how many observations fall at or below this category?' — the last row always equals N.",
    formula: <>CF<sub>i</sub> = f<sub>1</sub> + f<sub>2</sub> + … + f<sub>i</sub></>,
    legend: [
      { sym: "CFᵢ", def: "cumulative frequency at row i" },
      { sym: "fⱼ", def: "frequency at row j" },
    ],
    diagram: <OgiveMiniDiagram />,
    example: {
      given: "Frequencies 6, 14, 20, 8, 2 (N = 50)",
      substitute: "CF = 6, 20, 40, 48, 50",
      answer: "final CF = N ✓",
    },
  },
  {
    key: "crf",
    title: "Cumulative relative frequency (ogive)",
    explain:
      "The running total of relative frequencies — always rising from 0 to 1. Plotted against the upper class boundary it produces the ogive curve, which reads off percentiles at a glance.",
    formula: <>CRF<sub>i</sub> = CF<sub>i</sub> / N</>,
    legend: [
      { sym: "CRFᵢ", def: "cumulative relative frequency at row i" },
      { sym: "CFᵢ", def: "cumulative frequency at row i" },
      { sym: "N", def: "total observations" },
    ],
    diagram: <OgiveMiniDiagram />,
    example: {
      given: "CF = 6, 20, 40, 48, 50; N = 50",
      substitute: "CRF = 0.12, 0.40, 0.80, 0.96, 1.00",
      answer: "final CRF = 1 ✓",
    },
  },
];

function RelativeFrequencyPage() {
  const [mode, setMode] = useState<Mode>("raw-discrete");
  const [rawInput, setRawInput] = useState<string>(
    "A, B, A, C, B, A, B, A, C, B, A, B, A, C, A, B, A, C, B, B",
  );
  const [numericInput, setNumericInput] = useState<string>(
    "56, 62, 65, 67, 68, 70, 71, 72, 73, 74, 75, 76, 77, 78, 80, 82, 84, 88, 92, 95",
  );
  const [binMode, setBinMode] = useState<"auto" | "manual">("auto");
  const [binWidth, setBinWidth] = useState<string>("10");
  const [tableRows, setTableRows] = useState<GroupedRow[]>([
    { value: "A", frequency: "8" },
    { value: "B", frequency: "7" },
    { value: "C", frequency: "5" },
  ]);
  const [result, setResult] = useState<DistResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compute = () => {
    setErr(null);
    setResult(null);
    try {
      if (mode === "raw-discrete") {
        const tokens = rawInput
          .replace(/\r\n?/g, "\n")
          .split(/[\s,;]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (tokens.length === 0) {
          setErr("Enter at least one value.");
          return;
        }
        setResult(distFromDiscrete(tokens));
      } else if (mode === "raw-grouped") {
        const parsed = parseDataset(numericInput);
        if (parsed.invalid.length) {
          setErr(`"${parsed.invalid[0]}" is not a valid number.`);
          return;
        }
        if (parsed.values.length < 2) {
          setErr("Enter at least two numeric values for grouped data.");
          return;
        }
        let w: number | "auto" = "auto";
        if (binMode === "manual") {
          const wn = Number(binWidth);
          if (!Number.isFinite(wn) || wn <= 0) {
            setErr("Class width must be a positive number.");
            return;
          }
          w = wn;
        }
        setResult(distFromGrouped(parsed.values, w));
      } else {
        const rows: { label: string; freq: number }[] = [];
        for (let i = 0; i < tableRows.length; i++) {
          const label = tableRows[i].value.trim();
          const f = Number(tableRows[i].frequency);
          if (label === "" && !tableRows[i].frequency.trim()) continue;
          if (label === "") {
            setErr(`Row ${i + 1}: category label is empty.`);
            return;
          }
          if (!Number.isFinite(f) || !Number.isInteger(f) || f < 0) {
            setErr(`Row ${i + 1}: frequency must be a non-negative integer.`);
            return;
          }
          rows.push({ label, freq: f });
        }
        if (rows.length === 0) {
          setErr("Add at least one category with a frequency.");
          return;
        }
        const total = rows.reduce((s, r) => s + r.freq, 0);
        if (total === 0) {
          setErr("Total frequency is zero — enter at least one non-zero count.");
          return;
        }
        setResult(buildRows(rows, false));
      }
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const clear = () => {
    setResult(null);
    setErr(null);
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const s: Step[] = [
      {
        title: "Count the total number of observations",
        body: (
          <div>
            Sum every row's frequency: N ={" "}
            <span className="font-serif italic">
              {result.rows.map((r) => r.freq).join(" + ")}
            </span>{" "}
            = <strong>{result.total}</strong>
          </div>
        ),
      },
      {
        title: "Relative frequency = frequency ÷ total",
        body: (
          <div className="space-y-1">
            {result.rows.slice(0, 4).map((r, i) => (
              <div key={i} className="font-serif italic text-xs">
                {r.label}: {r.freq} ÷ {result.total} = {fmt(r.rel)} ({pct(r.rel)})
              </div>
            ))}
            {result.rows.length > 4 && (
              <div className="text-xs text-muted-foreground">
                …same calculation for the remaining {result.rows.length - 4} row
                {result.rows.length - 4 === 1 ? "" : "s"}.
              </div>
            )}
          </div>
        ),
      },
      {
        title: "Cumulative frequency = running total of frequencies",
        body: (
          <div className="space-y-1">
            {result.rows.map((r, i) => (
              <div key={i} className="font-serif italic text-xs">
                Up to {r.label}: {result.rows.slice(0, i + 1).map((x) => x.freq).join(" + ")} = {r.cumFreq}
              </div>
            ))}
          </div>
        ),
      },
      {
        title: "Cumulative relative frequency = cumulative frequency ÷ total",
        body: (
          <div>
            The final row must equal 1 (or 100%). Here the last cumulative
            relative frequency is{" "}
            <strong>{fmt(result.rows[result.rows.length - 1].cumRel)}</strong> (
            {pct(result.rows[result.rows.length - 1].cumRel)}) — ✓
          </div>
        ),
      },
    ];
    return s;
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    const header =
      "Category\tFreq\tRel Freq\tRel %\tCum Freq\tCum Rel %";
    const lines = result.rows.map(
      (r) =>
        `${r.label}\t${r.freq}\t${fmt(r.rel)}\t${pct(r.rel)}\t${r.cumFreq}\t${pct(r.cumRel)}`,
    );
    return [
      `Frequency distribution (N = ${result.total})`,
      header,
      ...lines,
    ].join("\n");
  }, [result]);

  return (
    <MathCalcPage
      name="Relative Frequency Calculator"
      tagline="Build a full frequency distribution — frequency, relative frequency, cumulative frequency and cumulative relative frequency — from raw data or a pre-tallied table, with a bar chart / histogram and an ogive."
      extras={
        <>
          <CalcSection title="What is relative frequency?">
            <p>
              <strong>Relative frequency</strong> is the proportion of the total
              observations that fall into a given category or class interval —
              it converts a raw count into a share of the whole. When
              accumulated top-to-bottom, the same idea produces
              cumulative frequency and the classic ogive curve.
            </p>
          </CalcSection>

          <CalcSection title="Frequency distributions, piece by piece">
            <GuideCards items={RELFREQ_GUIDE} />
          </CalcSection>

<CalcSection title="Relative frequency vs probability">
            <p>
              Relative frequency comes from actually observed data (empirical),
              while probability is a theoretical proportion for a random
              experiment. In the <strong>frequentist</strong> interpretation of
              probability, relative frequency <em>is</em> our best estimate of
              probability — and by the law of large numbers, it converges to the
              true probability as the number of observations grows.
            </p>
            <p>
              If you already know or assume a theoretical model (a fair coin, a
              normal distribution, etc.), use the{" "}
              <Link to="/calculators/math/probability-calculator" className="text-primary underline underline-offset-2">
                Probability Calculator
              </Link>{" "}
              to compute probabilities directly instead of estimating them from
              a sample.
            </p>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Reporting frequency when relative frequency is what's asked.</strong>{" "}
                A count of 8 is meaningless without knowing the total; 8/20 =
                40% is the interpretable number.
              </li>
              <li>
                <strong>Forgetting the sum-to-1 sanity check.</strong> Relative
                frequencies across all categories must sum to 1 (or 100%).
                Rounding may leave ±0.01; anything larger indicates a
                missing/duplicated category.
              </li>
              <li>
                <strong>Non-monotonic cumulative values.</strong> Cumulative
                frequency and cumulative relative frequency must never decrease.
                If they do, a frequency was entered as a negative number.
              </li>
              <li>
                <strong>Bar chart vs histogram confusion.</strong> Use gaps
                between bars for categorical/discrete data; use touching bars
                (histogram) for grouped continuous data — the touching bars
                signal that the x-axis is a continuous number line, not a set of
                labels.
              </li>
              <li>
                <strong>Overlapping class intervals.</strong> "10–20, 20–30"
                doesn't say where 20 goes. Use half-open intervals like [10,
                20), [20, 30) — the convention this calculator follows.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Three input modes: raw categorical/discrete tally, raw numeric grouped into class intervals, or a pre-tallied frequency table.",
                "Full distribution table with frequency, relative frequency (decimal + %), cumulative frequency and cumulative relative frequency in one view.",
                "Automatic class width via Sturges' rule for grouped numeric data — or set your own width.",
                "Bar chart for categorical/discrete data, histogram (touching bars) for grouped continuous data.",
                "Ogive (cumulative relative frequency) chart — the second chart most competing calculators skip.",
                "Show/hide step-by-step working with the total, division for each category and the running cumulative check.",
                "Copy the full table as tab-separated text (paste-ready into Excel or Sheets) or download the result panel as a PNG.",
              ]}
            />
          </CalcSection>



          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What's the difference between frequency and relative frequency?",
                  a: <p>Frequency is a raw count of observations in a category. Relative frequency divides that count by the total, giving a proportion (0–1) or percentage (0–100%).</p>,
                },
                {
                  q: "Do the relative frequencies always sum to 1?",
                  a: <p>Yes — that's a definitional property. If they don't, you either miscounted the total, missed a category, or double-counted an observation. Small ±0.01 rounding is normal after formatting.</p>,
                },
                {
                  q: "When should I use a histogram instead of a bar chart?",
                  a: <p>Use a histogram (bars touching) for grouped continuous numeric data — heights, weights, times. Use a bar chart (with gaps) for categorical or discrete data — colours, brands, or integer counts.</p>,
                },
                {
                  q: "What is an ogive?",
                  a: <p>An ogive is a line chart of cumulative relative frequency against the class boundary. It always rises from 0 to 1. You can read off percentiles directly — find 0.5 on the y-axis and drop down to get the median class.</p>,
                },
                {
                  q: "How does the calculator choose class widths automatically?",
                  a: <p>It uses Sturges' rule (k ≈ 1 + log₂ n) as the initial number of classes, then rounds the class width to a "nice" 1/2/5-times-power-of-ten value so the bin edges read cleanly.</p>,
                },
                {
                  q: "Can I paste data straight from Excel or Google Sheets?",
                  a: <p>Yes. Tabs, spaces, commas, semicolons and line breaks all work as separators for both raw-data modes.</p>,
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/mean-median-mode-calculator", label: "Mean, Median, Mode & Range Calculator" },
                { to: "/calculators/math/standard-deviation-calculator", label: "Standard Deviation Calculator" },
                { to: "/calculators/math/probability-calculator", label: "Probability Calculator" },
                { to: "/calculators/math/percentile-calculator", label: "Percentile & Quartile Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      {/* Mode selector */}
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Input mode">
        {(
          [
            { key: "raw-discrete", label: "Raw data (categorical / discrete)" },
            { key: "raw-grouped", label: "Raw numeric → class intervals" },
            { key: "table", label: "Frequency table" },
          ] as { key: Mode; label: string }[]
        ).map((o) => (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={mode === o.key}
            onClick={() => setMode(o.key)}
            className={
              "rounded-full border px-4 py-1.5 text-sm transition-colors " +
              (mode === o.key
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-background/40 text-muted-foreground hover:border-primary/40")
            }
          >
            {o.label}
          </button>
        ))}
      </div>

      {mode === "raw-discrete" && (
        <Field
          label="Data (categories or discrete numbers)"
          htmlFor="rf-raw"
          hint="Comma-, space-, tab- or line-separated. Values are tallied automatically."
        >
          <textarea
            id="rf-raw"
            rows={4}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="e.g. A, B, A, C, B, A, B"
            className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
      )}

      {mode === "raw-grouped" && (
        <div className="space-y-4">
          <Field
            label="Numeric data"
            htmlFor="rf-num"
            hint="Numbers only. Currency symbols and thousand separators are cleaned."
          >
            <textarea
              id="rf-num"
              rows={4}
              value={numericInput}
              onChange={(e) => setNumericInput(e.target.value)}
              placeholder="e.g. 56, 62, 65, 67, 68, 70, 71, 72, 73, 74"
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="mb-1.5 block text-sm font-medium text-foreground">Class width</div>
              <div className="flex gap-2" role="tablist" aria-label="Class width mode">
                {(["auto", "manual"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={binMode === k}
                    onClick={() => setBinMode(k)}
                    className={
                      "rounded-full border px-3 py-1.5 text-xs transition-colors " +
                      (binMode === k
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-background/40 text-muted-foreground hover:border-primary/40")
                    }
                  >
                    {k === "auto" ? "Auto (Sturges)" : "Manual"}
                  </button>
                ))}
              </div>
            </div>
            {binMode === "manual" && (
              <Field label="Width" htmlFor="rf-w">
                <input
                  id="rf-w"
                  type="number"
                  min={0}
                  step="any"
                  value={binWidth}
                  onChange={(e) => setBinWidth(e.target.value)}
                  className="w-32 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base tabular-nums focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
            )}
          </div>
        </div>
      )}

      {mode === "table" && (
        <div>
          <div className="mb-2 text-sm text-muted-foreground">
            Enter each category (or class interval label) and its frequency.
          </div>
          <GroupedTable rows={tableRows} onChange={setTableRows} />
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <PrimaryButton onClick={compute}>Build distribution</PrimaryButton>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
        >
          Clear result
        </button>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <div ref={resultRef} className="mt-6 space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Frequency distribution
              </div>
              <div className="text-sm text-muted-foreground">
                N = <span className="tabular-nums text-foreground">{result.total}</span> ·{" "}
                {result.rows.length} row{result.rows.length === 1 ? "" : "s"}
              </div>
            </div>
            {result.note && (
              <div className="mt-1 text-xs text-muted-foreground">{result.note}</div>
            )}
            <div className="mt-3 overflow-x-auto rounded-xl border border-border/60">
              <table className="min-w-full text-sm">
                <thead className="bg-secondary/40 text-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">
                      {result.grouped ? "Interval" : "Category"}
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">Freq</th>
                    <th className="px-3 py-2 text-right font-semibold">Rel Freq</th>
                    <th className="px-3 py-2 text-right font-semibold">Rel %</th>
                    <th className="px-3 py-2 text-right font-semibold">Cum Freq</th>
                    <th className="px-3 py-2 text-right font-semibold">Cum Rel %</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i} className="border-t border-border/60 odd:bg-background/40">
                      <td className="px-3 py-2 font-serif italic text-xs">{r.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.freq}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(r.rel)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{pct(r.rel)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.cumFreq}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{pct(r.cumRel)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">Total</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{result.total}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {fmt(result.rows.reduce((s, r) => s + r.rel, 0))}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {pct(result.rows.reduce((s, r) => s + r.rel, 0))}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">—</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {result.grouped ? "Histogram" : "Bar chart"} of frequencies
            </div>
            <BarChart rows={result.rows} grouped={result.grouped} />
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Ogive — cumulative relative frequency
            </div>
            <OgiveChart rows={result.rows} />
          </div>

          <SolutionSteps steps={steps} />

          <ResultActions
            getCopyText={() => summary}
            captureRef={resultRef}
            filename="relative-frequency"
          />
        </div>
      )}
    </MathCalcPage>
  );
}
