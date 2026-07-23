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

export const Route = createFileRoute("/calculators/math/lottery-odds-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Lottery Odds Calculator",
      title: "Lottery Odds Calculator — Jackpot & Match Probabilities",
      metaDescription:
        "Odds of any lottery — pick-N, Powerball, Mega Millions, EuroMillions — as 1-in-N, probability and percentage, with steps and a perspective chart.",
      canonicalUrl: "/calculators/math/lottery-odds-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Lottery Odds Calculator", path: "/calculators/math/lottery-odds-calculator" },
      ],
      faqs: [
        {
          q: "How are lottery odds calculated?",
          a: "Order doesn't matter, so you use the combinations formula C(n, r) = n! / (r! · (n − r)!). The odds of matching all r drawn numbers out of a pool of n are 1 in C(n, r). For a bonus-ball game (like Powerball), multiply that by the bonus pool size.",
        },
        {
          q: "What are the odds of winning the Powerball jackpot?",
          a: "Powerball draws 5 white balls from 69 and 1 red ball from 26. Odds = C(69, 5) × 26 = 11,238,513 × 26 = 292,201,338. About 1 in 292 million.",
        },
        {
          q: "What are the odds of winning a 6-from-49 lottery?",
          a: "C(49, 6) = 13,983,816. So the jackpot odds are 1 in 13,983,816 — about 1 in 14 million.",
        },
        {
          q: "Do birthday numbers have worse odds than random numbers?",
          a: "No. Every combination is equally likely — the machine has no preference for spread-out numbers or non-birthdays. Picking numbers above 31 only matters for the SHARE of the prize (fewer people pick them, so if you win you're less likely to split with others). The odds of winning are identical.",
        },
        {
          q: "Do lottery odds change based on past draws?",
          a: "No. Each draw is independent. A number that hasn't come up in months is not 'due' — that's the gambler's fallacy. On every draw, every ball has the same chance of being selected.",
        },
        {
          q: "How much do the odds improve if I buy 10 tickets instead of 1?",
          a: "They scale linearly. If jackpot odds are 1 in 14 million, 10 different tickets give you a 10 in 14 million chance ≈ 1 in 1.4 million. Still overwhelmingly unlikely.",
        },
      ],
    }),
  component: LotteryOddsPage,
});

/* ---------------- Math (reuses nCr as in combinations-counter) ---------------- */

/** Exact C(n, r) as bigint. */
function nCrBig(n: number, r: number): bigint {
  if (r < 0 || r > n) return 0n;
  if (r > n - r) r = n - r;
  let num = 1n;
  let den = 1n;
  for (let i = 1; i <= r; i++) {
    num *= BigInt(n - r + i);
    den *= BigInt(i);
  }
  return num / den;
}

function fmtBig(b: bigint): string {
  // Add thousands separators
  const s = b.toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtPct(x: number): string {
  if (!Number.isFinite(x) || x === 0) return "0%";
  if (x < 1e-4) return `${(x * 100).toExponential(3)}%`;
  return `${(x * 100).toPrecision(4)}%`;
}

function fmtProb(x: number): string {
  if (!Number.isFinite(x) || x === 0) return "0";
  if (x < 1e-4) return x.toExponential(4);
  return x.toPrecision(4);
}

/* ---------------- Perspective chart ---------------- */

type Benchmark = { label: string; oneIn: number; you?: boolean };

function PerspectiveChart({ jackpotOneIn }: { jackpotOneIn: bigint }) {
  // Convert the (possibly huge) bigint to a Number for chart scaling.
  const jackpot = Number(jackpotOneIn);
  const rows: Benchmark[] = [
    { label: "Flipping 6 heads in a row", oneIn: 64 },
    { label: "Hole-in-one (amateur, single swing)", oneIn: 12_500 },
    { label: "Struck by lightning in a year (US)", oneIn: 1_222_000 },
    { label: "Fatal commercial plane crash (single flight)", oneIn: 11_000_000 },
    { label: "Winning this lottery", oneIn: jackpot, you: true },
  ];
  const maxLog = Math.max(...rows.map((r) => Math.log10(r.oneIn)));
  const W = 720;
  const rowH = 34;
  const padL = 220;
  const padR = 90;
  const padT = 14;
  const padB = 22;
  const H = padT + rows.length * rowH + padB;
  const iw = W - padL - padR;

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Comparison of lottery odds against other rare-event benchmarks (logarithmic scale)"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[560px]"
      >
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={H - padB}
          stroke="currentColor"
          className="text-border"
        />
        {rows.map((r, i) => {
          const y = padT + i * rowH + 4;
          const logV = Math.log10(r.oneIn);
          const w = Math.max(2, (logV / maxLog) * iw);
          return (
            <g key={r.label}>
              <text
                x={padL - 8}
                y={y + rowH / 2}
                textAnchor="end"
                fontSize="11"
                className="fill-foreground"
              >
                {r.label}
              </text>
              <rect
                x={padL}
                y={y + 6}
                width={w}
                height={rowH - 14}
                rx={4}
                className={r.you ? "fill-primary" : "fill-primary/30"}
              />
              <text
                x={padL + w + 6}
                y={y + rowH / 2 + 3}
                fontSize="11"
                className="fill-muted-foreground tabular-nums"
              >
                1 in {r.oneIn >= 1e6 ? `${(r.oneIn / 1e6).toPrecision(3)}M` : r.oneIn.toLocaleString()}
              </text>
            </g>
          );
        })}
        <text
          x={padL + iw / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize="10"
          className="fill-muted-foreground"
        >
          Bar length is proportional to log₁₀(1-in-N) — each step = 10× rarer
        </text>
      </svg>
    </div>
  );
}

/* ---------------- Presets ---------------- */

type Preset = {
  key: string;
  label: string;
  pool: number;
  draw: number;
  match: number;
  bonus: boolean;
  bonusPool: number;
};

const PRESETS: Preset[] = [
  { key: "custom", label: "Custom", pool: 49, draw: 6, match: 6, bonus: false, bonusPool: 0 },
  { key: "649", label: "6 from 49 (e.g. UK Lotto style)", pool: 49, draw: 6, match: 6, bonus: false, bonusPool: 0 },
  { key: "powerball", label: "Powerball style — 5 from 69 + 1 from 26", pool: 69, draw: 5, match: 5, bonus: true, bonusPool: 26 },
  { key: "megamillions", label: "Mega Millions style — 5 from 70 + 1 from 25", pool: 70, draw: 5, match: 5, bonus: true, bonusPool: 25 },
  { key: "euromillions", label: "EuroMillions style — 5 from 50 + 2 from 12", pool: 50, draw: 5, match: 5, bonus: true, bonusPool: 12 },
];

/* ---------------- Page ---------------- */

/* ---------------- Educational guide cards ---------------- */

function TicketDiagram() {
  const nums = [7, 13, 24, 31, 42, 49];
  return (
    <svg viewBox="0 0 260 100" className="w-full" role="img" aria-label="Lottery ticket showing 6 numbers picked from a pool">
      <rect x={10} y={20} width={240} height={60} rx={8} fill="var(--color-primary)" opacity={0.1} stroke="var(--color-primary)" strokeWidth={1.5} />
      {nums.map((v, i) => (
        <g key={i}>
          <circle cx={30 + i * 40} cy={50} r={14} fill="var(--color-primary)" opacity={0.85} />
          <text x={30 + i * 40} y={54} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-primary-foreground)">{v}</text>
        </g>
      ))}
      <text x={130} y={94} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">pick r numbers from a pool of n</text>
    </svg>
  );
}

function PartialMatchDiagram() {
  return (
    <svg viewBox="0 0 260 100" className="w-full" role="img" aria-label="Partial match — some of your numbers hit, the rest come from unpicked balls">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const hit = i < 3;
        return (
          <g key={i}>
            <circle cx={25 + i * 40} cy={40} r={13} fill={hit ? "var(--color-primary)" : "var(--color-primary)"} opacity={hit ? 0.9 : 0.2} stroke="var(--color-primary)" />
            <text x={25 + i * 40} y={44} textAnchor="middle" fontSize={11} fontWeight={700} fill={hit ? "var(--color-primary-foreground)" : "var(--color-foreground)"}>{hit ? "✓" : "·"}</text>
          </g>
        );
      })}
      <text x={130} y={78} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">m = 3 of r = 6 matched</text>
      <text x={130} y={92} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">others must come from n − r unpicked balls</text>
    </svg>
  );
}

function BonusBallDiagram() {
  return (
    <svg viewBox="0 0 260 100" className="w-full" role="img" aria-label="Bonus ball drawn from a separate pool">
      <rect x={10} y={25} width={140} height={50} rx={8} fill="var(--color-primary)" opacity={0.15} stroke="var(--color-primary)" />
      <text x={80} y={20} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">main pool</text>
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={30 + i * 30} cy={50} r={11} fill="var(--color-primary)" opacity={0.7} />
      ))}
      <text x={170} y={20} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">bonus pool</text>
      <rect x={160} y={25} width={90} height={50} rx={8} fill="var(--color-primary)" opacity={0.25} stroke="var(--color-primary)" />
      <circle cx={205} cy={50} r={14} fill="var(--color-primary)" />
      <text x={205} y={54} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-primary-foreground)">★</text>
      <text x={130} y={94} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">multiply odds: main × bonus</text>
    </svg>
  );
}

function ProbBarDiagram() {
  return (
    <svg viewBox="0 0 260 90" className="w-full" role="img" aria-label="Probability, percent, and one-in-N are three views of the same number">
      <rect x={20} y={40} width={220} height={16} rx={4} fill="var(--color-primary)" opacity={0.2} />
      <rect x={20} y={40} width={1.2} height={16} rx={2} fill="var(--color-primary)" />
      <text x={20} y={72} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">1 in N</text>
      <text x={130} y={72} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">probability = 1/N</text>
      <text x={240} y={72} textAnchor="middle" fontSize={10} fill="var(--color-muted-foreground)">% = 100/N</text>
      <text x={130} y={30} textAnchor="middle" fontSize={11} fill="var(--color-foreground)">three views of the same value</text>
    </svg>
  );
}

const LOTTO_GUIDE: GuideCardItem[] = [
  {
    key: "jackpot",
    title: "Jackpot odds — pick r from n",
    explain:
      "A lottery draws r balls from a pool of n without replacement, and order doesn't matter — that is the exact definition of a combination. Every one of C(n, r) possible draws is equally likely, and only one matches your ticket, so your odds are 1 in C(n, r).",
    formula: <>Odds = 1 in C(n, r) &nbsp;where&nbsp; C(n, r) = n! / (r! · (n − r)!)</>,
    legend: [
      { sym: "n", def: "size of the number pool" },
      { sym: "r", def: "how many balls are drawn" },
      { sym: "C(n, r)", def: "combinations — ways to pick r from n" },
    ],
    diagram: <TicketDiagram />,
    example: {
      given: "n = 49, r = 6",
      substitute: "C(49, 6) = 13,983,816",
      answer: "1 in 13,983,816",
    },
  },
  {
    key: "partial",
    title: "Partial match — m of r",
    explain:
      "For smaller prize tiers you want the probability of matching exactly m of the r drawn balls. Choose which m of your r numbers get matched, then the remaining r − m drawn balls must come from the n − r numbers you did not pick.",
    formula: <>P(m of r) = C(r, m) · C(n − r, r − m) / C(n, r)</>,
    legend: [
      { sym: "m", def: "number of matches you want (m ≤ r)" },
      { sym: "C(r, m)", def: "ways to pick which of your numbers hit" },
      { sym: "C(n−r, r−m)", def: "ways the remaining draws avoid your picks" },
    ],
    diagram: <PartialMatchDiagram />,
    example: {
      given: "6 from 49, match m = 3",
      substitute: "C(6,3)·C(43,3)/C(49,6) = 20·12,341 / 13,983,816",
      answer: "≈ 1 in 56.66",
    },
  },
  {
    key: "bonus",
    title: "Bonus ball multiplier",
    explain:
      "Powerball, Mega Millions and EuroMillions draw an extra ball from a separate pool. Because the bonus draw is independent of the main draw, you simply multiply the two counts together — which is why jackpot odds jump from tens of millions into the hundreds of millions.",
    formula: <>Odds = C(n, r) × C(bonus pool, bonus drawn)</>,
    legend: [
      { sym: "bonus pool", def: "size of the separate bonus pool" },
      { sym: "bonus drawn", def: "number of bonus balls drawn" },
    ],
    diagram: <BonusBallDiagram />,
    example: {
      given: "Powerball: 5 from 69 + 1 from 26",
      substitute: "C(69, 5) × 26 = 11,238,513 × 26",
      answer: "1 in 292,201,338",
    },
  },
  {
    key: "prob",
    title: "Odds, probability, and percent",
    explain:
      "Three ways of writing the same number: 1-in-N is the ratio, probability is 1/N as a decimal, and percent is that same number scaled by 100. Which form is 'best' depends on the audience — big-N odds are easiest to grasp as 1-in-N; small-p probabilities read better in scientific notation.",
    formula: <>P = 1 / N &nbsp;·&nbsp; percent = 100 / N</>,
    legend: [
      { sym: "N", def: "the '1 in N' odds figure" },
      { sym: "P", def: "probability as a decimal" },
    ],
    diagram: <ProbBarDiagram />,
    example: {
      given: "1 in 292,201,338",
      substitute: "P = 1 / 292,201,338",
      answer: "≈ 3.42 × 10⁻⁹ (≈ 0.00000034%)",
    },
  },
];

function LotteryOddsPage() {
  const [presetKey, setPresetKey] = useState("649");
  const [pool, setPool] = useState("49");
  const [draw, setDraw] = useState("6");
  const [match, setMatch] = useState("6");
  const [bonus, setBonus] = useState(false);
  const [bonusPool, setBonusPool] = useState("26");
  // For EuroMillions style: number of bonus balls drawn = number to match.
  const [bonusDraw, setBonusDraw] = useState("1");

  const [result, setResult] = useState<{
    pool: number;
    draw: number;
    match: number;
    mainCombos: bigint;
    matchCombos: bigint; // usually 1 for match-all; kept for extension
    bonus: boolean;
    bonusPool: number;
    bonusDraw: number;
    bonusCombos: bigint;
    totalCombos: bigint;
    prob: number;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  function applyPreset(k: string) {
    setPresetKey(k);
    const p = PRESETS.find((x) => x.key === k);
    if (!p || k === "custom") return;
    setPool(String(p.pool));
    setDraw(String(p.draw));
    setMatch(String(p.match));
    setBonus(p.bonus);
    if (p.bonus) {
      setBonusPool(String(p.bonusPool));
      setBonusDraw(String(k === "euromillions" ? 2 : 1));
    }
  }

  const compute = () => {
    setErr(null);
    setResult(null);
    const n = Number(pool);
    const r = Number(draw);
    const m = Number(match);
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      setErr("Pool size must be a whole number between 1 and 200.");
      return;
    }
    if (!Number.isInteger(r) || r < 1 || r > n) {
      setErr(`Numbers drawn must be a whole number between 1 and ${n}.`);
      return;
    }
    if (!Number.isInteger(m) || m < 1 || m > r) {
      setErr(`Numbers to match must be a whole number between 1 and ${r}.`);
      return;
    }
    let bp = 0;
    let bd = 0;
    let bonusCombos = 1n;
    if (bonus) {
      bp = Number(bonusPool);
      bd = Number(bonusDraw);
      if (!Number.isInteger(bp) || bp < 1 || bp > 200) {
        setErr("Bonus pool size must be a whole number between 1 and 200.");
        return;
      }
      if (!Number.isInteger(bd) || bd < 1 || bd > bp) {
        setErr(`Bonus balls drawn must be a whole number between 1 and ${bp}.`);
        return;
      }
      bonusCombos = nCrBig(bp, bd);
    }
    const mainCombos = nCrBig(n, r);
    // "Match all m of r" ways = C(r, m) · C(n − r, r − m).
    // For match = r (full jackpot), this is just 1 · C(n−r, 0) = 1.
    const matchWays = nCrBig(r, m) * nCrBig(n - r, r - m);
    // total combos / matchWays = "1 in N" to match m of r main numbers,
    // then multiply by bonusCombos for the bonus-ball match.
    const oneIn = (mainCombos / matchWays) * bonusCombos;
    // probability = 1 / Number(oneIn) — Number cast is fine for chart-scale odds
    // but for extreme accuracy we compute as Number division of two BigInts.
    const probNum = Number(matchWays) / Number(mainCombos) / Number(bonusCombos || 1n);
    setResult({
      pool: n,
      draw: r,
      match: m,
      mainCombos,
      matchCombos: matchWays,
      bonus,
      bonusPool: bp,
      bonusDraw: bd,
      bonusCombos,
      totalCombos: oneIn,
      prob: probNum,
    });
  };

  const steps: Step[] = useMemo(() => {
    if (!result) return [];
    const {
      pool: n,
      draw: r,
      match: m,
      mainCombos,
      matchCombos,
      bonus: b,
      bonusPool: bp,
      bonusDraw: bd,
      bonusCombos,
      totalCombos,
      prob,
    } = result;
    const out: Step[] = [
      {
        title: "Given",
        body: (
          <>
            <MathNote>
              {b
                ? `pool n = ${n}, draw r = ${r}, match m = ${m}, bonus draw ${bd} from ${bp}`
                : `pool n = ${n}, draw r = ${r}, match m = ${m}`}
            </MathNote>
          </>
        ),
      },
      {
        title: "Formula — lottery match probability",
        body: (
          <>
            <MathNote>Order doesn't matter, so use combinations for the sample space and for favourable outcomes</MathNote>
            <MathLine>P(match m of r) = [C(r, m) · C(n − r, r − m)] / C(n, r)</MathLine>
          </>
        ),
      },
      {
        title: "Substitute — count the sample space",
        body: (
          <>
            <MathNote>Total combinations of the main draw</MathNote>
            <MathLine>C(n, r) = C({n}, {r}) = {n}! / ({r}! · {n - r}!)</MathLine>
            <MathLine>C({n}, {r}) = {fmtBig(mainCombos)}</MathLine>
          </>
        ),
      },
      {
        title: `Substitute — count draws that match ${m} of ${r}`,
        body: (
          <>
            <MathNote>Choose which of your picks hit, then fill the rest from the unpicked numbers</MathNote>
            <MathLine>C(r, m) · C(n − r, r − m) = C({r}, {m}) · C({n - r}, {r - m})</MathLine>
            <MathLine>= {fmtBig(nCrBig(r, m))} · {fmtBig(nCrBig(n - r, r - m))} = {fmtBig(matchCombos)}</MathLine>
            {m === r && <MathNote>(full jackpot match collapses to exactly 1 favourable draw)</MathNote>}
          </>
        ),
      },
      {
        title: "Substitute — main-pool odds",
        body: (
          <>
            <MathNote>Divide total combinations by favourable combinations</MathNote>
            <MathLine>odds = C(n, r) / matches = {fmtBig(mainCombos)} / {fmtBig(matchCombos)}</MathLine>
            <MathLine>odds = 1 in {fmtBig(mainCombos / matchCombos)}</MathLine>
          </>
        ),
      },
    ];
    if (b) {
      out.push({
        title: "Substitute — multiply by the independent bonus",
        body: (
          <>
            <MathNote>The bonus draw is independent, so multiply the two combination counts</MathNote>
            <MathLine>C(bonus pool, bonus drawn) = C({bp}, {bd}) = {fmtBig(bonusCombos)}</MathLine>
            <MathLine>combined odds = 1 in {fmtBig(mainCombos / matchCombos)} × {fmtBig(bonusCombos)}</MathLine>
            <MathLine>combined odds = 1 in {fmtBig(totalCombos)}</MathLine>
          </>
        ),
      });
    }
    out.push({
      title: "Answer",
      body: (
        <>
          <MathLine>probability = 1 / {fmtBig(totalCombos)} = {fmtProb(prob)} ({fmtPct(prob)})</MathLine>
          <MathLine>odds = 1 in {fmtBig(totalCombos)}</MathLine>
        </>
      ),
    });
    return out;
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return "";
    const line1 = `Lottery odds — pool ${result.pool}, draw ${result.draw}, match ${result.match}` +
      (result.bonus ? `, bonus ${result.bonusDraw} from ${result.bonusPool}` : "");
    return [
      line1,
      `Odds: 1 in ${fmtBig(result.totalCombos)}`,
      `Probability: ${fmtProb(result.prob)}`,
      `Percentage: ${fmtPct(result.prob)}`,
    ].join("\n");
  }, [result]);

  return (
    <MathCalcPage
      name="Lottery Odds Calculator"
      tagline="Odds of winning any lottery — pick-N games, Powerball, Mega Millions, EuroMillions and custom formats. Shown as 1-in-N, probability and percent, with a perspective chart against real-world rare events."
      extras={
        <>
          <CalcSection title="What are lottery odds?">
            <p>
              A lottery draws a small set of balls from a larger pool without repetition and without
              order mattering. That is the exact definition of a{" "}
              <strong>combination</strong>, counted by <code>C(n, r) = n! / (r! · (n − r)!)</code>.
              The odds of any single ticket winning the jackpot are simply <strong>1 in C(n, r)</strong> —
              because every possible combination is equally likely and only one of them is the winning
              set.
            </p>
            <p>
              For lotteries with a bonus ball (Powerball, Mega Millions, EuroMillions), the bonus draw
              is independent of the main draw, so you multiply the two counts together. That is why
              jackpot odds jump from tens of millions to hundreds of millions the moment a bonus ball
              is added.
            </p>
          </CalcSection>

<CalcSection title="Lottery odds, piece by piece">
            <GuideCards items={LOTTO_GUIDE} />
          </CalcSection>


          <CalcSection title="Why picking birthdays doesn't hurt your odds (a common myth)">
            <p>
              Every combination the machine can draw is equally likely — the balls have no idea
              whether they are &quot;spread out&quot; or all under 32. The odds of a{" "}
              <em>specific</em> ticket winning are 1 in C(n, r) regardless of how you chose those{" "}
              numbers: quick-pick, birthdays, sequences like 1-2-3-4-5-6, patterns down the ticket —
              all identical.
            </p>
            <p>
              What number choice <strong>does</strong> affect is <em>share size if you win</em>. Many
              players use birthdays (so numbers 1–31 are over-picked), lucky numbers like 7, and
              &quot;random-looking&quot; spreads. If the winning numbers happen to fit those patterns,
              you split the jackpot with more people. Picking numbers above 31, or letting the
              terminal quick-pick for you, doesn't improve <em>whether</em> you win — only how much
              you'd take home if you do.
            </p>
          </CalcSection>

          <CalcSection title="Why past draws don't help — the gambler's fallacy">
            <p>
              Every draw is independent. A ball that hasn't appeared for six months is not &quot;due&quot;,
              and a hot number that's come up three weeks in a row isn't &quot;on a roll&quot;. The
              probability that any specific ball is drawn is r / n on every single draw, with no
              memory of what came before. Systems that promise better odds by tracking overdue
              numbers are selling pattern-hunting where no pattern exists — the math is exactly the
              same as if you'd never looked at history at all.
            </p>
          </CalcSection>

          <CalcSection title="Common mistakes">
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <strong>Ignoring the bonus ball.</strong> C(69, 5) is only about 11 million — but the
                Powerball jackpot is 1 in 292 million because the bonus ball multiplies the odds by
                26.
              </li>
              <li>
                <strong>Confusing &quot;match r of r&quot; with &quot;match some of r&quot;.</strong>{" "}
                Partial-match odds use C(r, m) · C(n − r, r − m) — not 1. Skipping that gives odds
                that look far too long for smaller prize tiers.
              </li>
              <li>
                <strong>Treating multiple tickets as multiplicative.</strong> Buying two different
                tickets doubles your odds; it doesn't square the probability. Two in 14 million is
                still one in 7 million.
              </li>
              <li>
                <strong>Believing &quot;random-looking&quot; tickets are more likely to win.</strong>{" "}
                1-2-3-4-5-6 has the exact same probability as any other 6-number combination.
              </li>
            </ul>
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Works for any pick-N-from-M lottery, not just the famous ones.",
                "One-click presets for 6/49, Powerball (5/69 + 1/26), Mega Millions (5/70 + 1/25) and EuroMillions (5/50 + 2/12) — illustrative of published formats.",
                "Bonus-ball toggle with its own pool size and number-of-balls-drawn, for games like Powerball, Mega Millions and EuroMillions.",
                "Odds shown three ways: '1 in N', probability, and percentage — so the scale is unambiguous.",
                "Partial-match support: compute the odds of matching 3-of-5, 4-of-6, etc., not just the full jackpot.",
                "Perspective bar chart plotting your lottery's odds against real-world rare-event benchmarks on a log scale.",
                "Full show/hide step-by-step working using the C(r, m) · C(n − r, r − m) hypergeometric argument.",
                "Copy the summary as text or download the result card as a PNG.",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What's the difference between odds and probability?",
                  a: (
                    <p>
                      Probability is the fraction of favourable outcomes: 1/292,201,338 for Powerball.
                      Odds &quot;1 in N&quot; is that same fraction inverted. This tool shows both so
                      there's no ambiguity.
                    </p>
                  ),
                },
                {
                  q: "Are lottery odds really the same every draw?",
                  a: (
                    <p>
                      Yes. Balls are drawn independently each time, so every draw resets the
                      probability. Whether last week's winning ticket had &quot;lucky&quot; numbers is
                      irrelevant to this week's draw.
                    </p>
                  ),
                },
                {
                  q: "Can I improve my odds with a system?",
                  a: (
                    <p>
                      No. The only mathematically valid way to improve your odds of winning is to buy
                      more distinct tickets — which scales linearly and gets uneconomical fast. Number
                      patterns and hot/cold analyses don't change the underlying combinatorics.
                    </p>
                  ),
                },
                {
                  q: "How is this different from a jackpot analyzer?",
                  a: (
                    <p>
                      This calculator gives the mathematical odds of your ticket matching. A jackpot
                      analyzer factors in the jackpot size, ticket price and expected number of
                      winners to estimate expected value — that's a separate, harder calculation.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/combinations-counter-calculator", label: "Combinations Counter" },
                { to: "/calculators/math/probability-calculator", label: "Probability Calculator" },
                { to: "/calculators/math/dice-probability-calculator", label: "Dice Probability Calculator" },
                { to: "/calculators/math/permutation-combination-calculator", label: "Permutation & Combination Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <Field label="Preset format" hint="Illustrative of published lottery formats — verify against your local operator's rules.">
        <select
          value={presetKey}
          onChange={(e) => applyPreset(e.target.value)}
          className="w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Numbers in pool (n)">
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            value={pool}
            onChange={(e) => {
              setPool(e.target.value);
              setPresetKey("custom");
            }}
          />
        </Field>
        <Field label="Numbers drawn (r)">
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            value={draw}
            onChange={(e) => {
              setDraw(e.target.value);
              setPresetKey("custom");
            }}
          />
        </Field>
        <Field label="Numbers you must match (m)" hint="Set equal to r for jackpot odds; lower m for smaller prize tiers.">
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            value={match}
            onChange={(e) => {
              setMatch(e.target.value);
              setPresetKey("custom");
            }}
          />
        </Field>
      </div>

      <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/10 p-4">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={bonus}
            onChange={(e) => {
              setBonus(e.target.checked);
              setPresetKey("custom");
            }}
          />
          Separate bonus ball (Powerball, Mega Ball, EuroMillions Stars…)
        </label>
        {bonus && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Bonus pool size">
              <TextInput
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                value={bonusPool}
                onChange={(e) => {
                  setBonusPool(e.target.value);
                  setPresetKey("custom");
                }}
              />
            </Field>
            <Field label="Bonus balls drawn">
              <TextInput
                type="number"
                inputMode="numeric"
                min={1}
                value={bonusDraw}
                onChange={(e) => {
                  setBonusDraw(e.target.value);
                  setPresetKey("custom");
                }}
              />
            </Field>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <PrimaryButton onClick={compute}>Compute odds</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}

      {result && (
        <div ref={resultRef} className="mt-5 space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Odds of matching {result.match} of {result.draw} from {result.pool}
              {result.bonus && <> + {result.bonusDraw} from {result.bonusPool} bonus</>}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Odds
                </div>
                <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                  1 in {fmtBig(result.totalCombos)}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Probability
                </div>
                <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                  {fmtProb(result.prob)}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Percentage
                </div>
                <div className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                  {fmtPct(result.prob)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Perspective — your lottery vs. other rare events (log scale)
            </div>
            <PerspectiveChart jackpotOneIn={result.totalCombos} />
            <p className="mt-2 text-xs text-muted-foreground">
              Benchmarks are approximate reference figures for scale — actual probabilities vary by
              source and year.
            </p>
          </div>

          <StepsToggle steps={steps} />

          <ResultActions
            getCopyText={() => summary}
            captureRef={resultRef}
            filename={`lottery-odds-${result.pool}-${result.draw}-${result.match}`}
          />
        </div>
      )}
    </MathCalcPage>
  );
}
