import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { buildCalculatorSeo } from "@/components/SEO";
import {
  MathCalcPage,
  Field,
  TextInput,
  PrimaryButton,
  ErrorBox,
  CalcSection,
  FormulaBlock,
  FormulaWithLegend,
  WorkedExample,
  CalcFAQ,
  RelatedLinks,
  FeatureList,
  GuideCards,
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

export const Route = createFileRoute("/calculators/math/permutation-combination-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Permutation and Combination Calculator",
      title: "Permutation & Combination Calculator — nPr, nCr",
      metaDescription:
        "Compute nPr and nCr with or without repetition. Enter n and r; see the formula, substitution, and full step-by-step working.",
      canonicalUrl: "/calculators/math/permutation-combination-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Permutation and Combination Calculator", path: "/calculators/math/permutation-combination-calculator" },
      ],
      faqs: [
        {
          q: "What is the difference between a permutation and a combination?",
          a: "Permutations care about the order of the selection — ABC and CAB count as different. Combinations only care about which items were chosen — {A, B, C} is one group no matter what order you name it in.",
        },
        {
          q: "Why is nCr always smaller than or equal to nPr?",
          a: "Every combination of r items can be arranged in r! different orders. nPr counts all of those orderings separately, while nCr counts them once. So nCr = nPr / r!, which is never larger than nPr.",
        },
        {
          q: "Why does the calculator require r ≤ n without repetition?",
          a: "If items can't be reused, you cannot pick more items than exist. Choosing 6 unique cards from a deck of 5 is impossible, so nPr and nCr are only defined for r ≤ n in that mode. Turning on 'Allow repetition' removes the restriction.",
        },
        {
          q: "Is a combination lock really a combination?",
          a: "No — mathematically it's a permutation. The order of the digits matters (1-2-9 will not open a lock set to 2-9-1), and repetition is allowed. A true combination would open regardless of the order you entered the numbers in.",
        },
        {
          q: "When should I use repetition (with replacement)?",
          a: "Use repetition when each item can be picked more than once — PIN codes, dice rolls, license plates, ice-cream scoops from n flavors. Use no-repetition for lottery draws, seating arrangements, or any pick where each item is used at most once.",
        },
      ],
    }),
  component: PermutationCombinationPage,
});

// ---------- Math (BigInt) ----------

function permBig(n: number, r: number): bigint {
  let out = 1n;
  for (let i = 0; i < r; i++) out *= BigInt(n - i);
  return out;
}

function combBig(n: number, r: number): bigint {
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

function powBig(base: number, exp: number): bigint {
  let r = 1n;
  const b = BigInt(base);
  for (let i = 0; i < exp; i++) r *= b;
  return r;
}

function fmtBig(b: bigint): string {
  return b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ---------- Result computation ----------

interface Results {
  permValue: bigint;
  combValue: bigint;
  permSteps: Step[];
  combSteps: Step[];
  permFormulaLine: string;
  combFormulaLine: string;
  permLabel: string;
  combLabel: string;
}

function computeNoRep(n: number, r: number): Results {
  const permValue = permBig(n, r);
  const combValue = combBig(n, r);

  // Expanded product of P(n,r): n × (n-1) × ... × (n-r+1)
  const permTerms: string[] = [];
  for (let i = 0; i < r; i++) permTerms.push(String(n - i));
  const permExpansion = permTerms.length ? permTerms.join(" × ") : "1";

  const permSteps: Step[] = [
    {
      title: "Given",
      body: <FormulaBlock>n = {n}, &nbsp; r = {r}</FormulaBlock>,
    },
    {
      title: "Formula — permutation (no repetition)",
      body: (
        <FormulaWithLegend
          formula={<>nPr = n! / (n − r)!</>}
          legend={[
            { sym: "n", def: "total items to choose from" },
            { sym: "r", def: "how many are picked (order matters)" },
            { sym: "!", def: "factorial: k! = k · (k−1) · … · 1" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — plug in n and r",
      body: (
        <FormulaBlock>
          {n}P{r} = {n}! / ({n} − {r})! = {n}! / {n - r}!
          <br />= {permExpansion}
        </FormulaBlock>
      ),
    },
    {
      title: "Answer",
      body: <FormulaBlock>{n}P{r} = {fmtBig(permValue)}</FormulaBlock>,
    },
  ];

  const combSteps: Step[] = [
    {
      title: "Given",
      body: <FormulaBlock>n = {n}, &nbsp; r = {r}</FormulaBlock>,
    },
    {
      title: "Formula — combination (no repetition)",
      body: (
        <FormulaWithLegend
          formula={<>nCr = n! / (r! · (n − r)!) = nPr / r!</>}
          legend={[
            { sym: "n", def: "total items" },
            { sym: "r", def: "how many are picked (order ignored)" },
            { sym: "r!", def: "orders in which any r picks can be arranged" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — plug in n and r",
      body: (
        <FormulaBlock>
          {n}C{r} = {n}! / ({r}! · {n - r}!) = {fmtBig(permValue)} / {r}! = {fmtBig(permValue)} / {fmtBig(permBig(r, r))}
        </FormulaBlock>
      ),
    },
    {
      title: "Answer",
      body: <FormulaBlock>{n}C{r} = {fmtBig(combValue)}</FormulaBlock>,
    },
  ];

  return {
    permValue,
    combValue,
    permSteps,
    combSteps,
    permFormulaLine: `${n}! / (${n} - ${r})!`,
    combFormulaLine: `${n}! / (${r}! × (${n} - ${r})!)`,
    permLabel: `${n}P${r}`,
    combLabel: `${n}C${r}`,
  };
}

function computeWithRep(n: number, r: number): Results {
  const permValue = powBig(n, r);
  const top = n + r - 1;
  const combValue = combBig(top, r);

  const permSteps: Step[] = [
    {
      title: "Given",
      body: <FormulaBlock>n = {n}, &nbsp; r = {r}, &nbsp; repetition allowed</FormulaBlock>,
    },
    {
      title: "Formula — permutation with repetition",
      body: (
        <FormulaWithLegend
          formula={<>P_rep(n, r) = nʳ</>}
          legend={[
            { sym: "n", def: "items to choose from (may repeat)" },
            { sym: "r", def: "length of the ordered sequence" },
            { sym: "nʳ", def: "each of the r slots independently picks any of n items" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — plug in n and r",
      body: (
        <FormulaBlock>
          {n}^{r} = {r === 0 ? "1" : Array(Math.min(r, 20)).fill(n).join(" × ")}
          {r > 20 ? " × … " : ""}
        </FormulaBlock>
      ),
    },
    {
      title: "Answer",
      body: <FormulaBlock>P_rep({n}, {r}) = {fmtBig(permValue)}</FormulaBlock>,
    },
  ];

  const combSteps: Step[] = [
    {
      title: "Given",
      body: <FormulaBlock>n = {n}, &nbsp; r = {r}, &nbsp; repetition allowed</FormulaBlock>,
    },
    {
      title: "Formula — multiset combination (stars and bars)",
      body: (
        <FormulaWithLegend
          formula={<>C_rep(n, r) = (n + r − 1)! / (r! · (n − 1)!) = C(n + r − 1, r)</>}
          legend={[
            { sym: "n", def: "distinct item types available" },
            { sym: "r", def: "picks (each type may repeat)" },
            { sym: "n + r − 1", def: "positions in the stars-and-bars diagram" },
          ]}
        />
      ),
    },
    {
      title: "Substitute — plug in n and r",
      body: (
        <FormulaBlock>
          ({r} + {n} − 1)! / ({r}! · ({n} − 1)!) = {top}! / ({r}! · {n - 1}!) = C({top}, {r})
        </FormulaBlock>
      ),
    },
    {
      title: "Answer",
      body: <FormulaBlock>C_rep({n}, {r}) = {fmtBig(combValue)}</FormulaBlock>,
    },
  ];

  return {
    permValue,
    combValue,
    permSteps,
    combSteps,
    permFormulaLine: `${n}^${r}`,
    combFormulaLine: `(${r} + ${n} - 1)! / (${r}! × (${n} - 1)!)`,
    permLabel: `${n}P${r} (with repetition)`,
    combLabel: `${n}C${r} (with repetition)`,
  };
}

// ---------- Diagram ----------

function OrderDiagram({
  n,
  r,
  repetition,
}: {
  n: number;
  r: number;
  repetition: boolean;
}) {
  const shownR = Math.max(1, Math.min(r, 8));
  const truncated = r > shownR;
  const perSlot = (i: number) => (repetition ? n : Math.max(0, n - i));
  const slotW = 64;
  const gap = 36;
  const padX = 16;
  const width = padX * 2 + shownR * slotW + (shownR - 1) * gap + (truncated ? 80 : 0);
  const height = 150;

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">
        Filling {r} slot{r === 1 ? "" : "s"} from {n} item{n === 1 ? "" : "s"}
        {repetition ? " (with repetition)" : " (no repetition)"}
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ maxWidth: width, minWidth: Math.min(width, 320) }}
          role="img"
          aria-label="Slot diagram"
        >
          {Array.from({ length: shownR }, (_, i) => {
            const x = padX + i * (slotW + gap);
            const cy = 60;
            const options = perSlot(i);
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={cy - 28}
                  width={slotW}
                  height={56}
                  rx={10}
                  className="fill-background/60 stroke-border"
                  strokeWidth={1.5}
                />
                <text
                  x={x + slotW / 2}
                  y={cy - 2}
                  textAnchor="middle"
                  className="fill-foreground font-mono"
                  fontSize={22}
                  fontWeight={600}
                >
                  {options}
                </text>
                <text
                  x={x + slotW / 2}
                  y={cy + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize={10}
                >
                  choices
                </text>
                <text
                  x={x + slotW / 2}
                  y={cy + 50}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize={11}
                >
                  slot {i + 1}
                </text>
                {i < shownR - 1 && (
                  <text
                    x={x + slotW + gap / 2}
                    y={cy + 4}
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize={20}
                  >
                    ×
                  </text>
                )}
              </g>
            );
          })}
          {truncated && (
            <text
              x={padX + shownR * (slotW + gap)}
              y={64}
              className="fill-muted-foreground"
              fontSize={13}
            >
              × … ({r} slots)
            </text>
          )}
          <text
            x={width / 2}
            y={height - 12}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={12}
          >
            Product = {repetition ? `n^r = ${n}^${r}` : `n·(n−1)···(n−r+1)`} — permutations. Divide by r! for combinations.
          </text>
        </svg>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {repetition
          ? "Every slot is a free choice from all n items — options stay constant."
          : "Each slot has one fewer option than the last — no repeats allowed."}
      </p>
    </div>
  );
}

function CompareBars({ perm, comb }: { perm: bigint; comb: bigint }) {
  const p = Number(perm);
  const c = Number(comb);
  if (!isFinite(p) || !isFinite(c) || p <= 0) return null;
  const max = Math.max(p, c);
  const w = 420;
  const h = 110;
  const barH = 28;
  const labelW = 90;
  const scale = (v: number) => ((w - labelW - 60) * v) / max;
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
      <div className="mb-2 text-sm font-medium text-foreground">
        nPr vs nCr — order matters vs order doesn't
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: w }} role="img">
        {[
          { label: "nPr", value: p, y: 20, cls: "fill-primary" },
          { label: "nCr", value: c, y: 66, cls: "fill-primary/50" },
        ].map((b) => (
          <g key={b.label}>
            <text x={0} y={b.y + barH / 2 + 4} className="fill-foreground font-mono" fontSize={13}>
              {b.label}
            </text>
            <rect x={labelW} y={b.y} width={Math.max(2, scale(b.value))} height={barH} rx={6} className={b.cls} />
            <text
              x={labelW + scale(b.value) + 8}
              y={b.y + barH / 2 + 4}
              className="fill-foreground font-mono"
              fontSize={12}
            >
              {b.value.toLocaleString()}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-1 text-xs text-muted-foreground">
        Ratio nPr / nCr = r! — each combination corresponds to r! ordered arrangements.
      </p>
    </div>
  );
}


// ---------- Page ----------

const MAX_N = 500;
const MAX_R_REP = 60;

function PermutationCombinationPage() {
  const [nStr, setNStr] = useState("6");
  const [rStr, setRStr] = useState("2");
  const [repetition, setRepetition] = useState(false);
  const [result, setResult] = useState<Results | null>(null);
  const [inputs, setInputs] = useState<{ n: number; r: number; rep: boolean } | null>(
    null,
  );
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setResult(null);
    setInputs(null);
    const n = Number(nStr);
    const r = Number(rStr);
    if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0) {
      setErr("n and r must be non-negative whole numbers.");
      return;
    }
    if (n > MAX_N || r > MAX_N) {
      setErr(`Keep n and r at ${MAX_N} or below for a responsive calculation.`);
      return;
    }
    if (!repetition && r > n) {
      setErr("Without repetition, r cannot exceed n — you can't pick more items than exist.");
      return;
    }
    if (repetition && r > MAX_R_REP) {
      setErr(`With repetition, keep r ≤ ${MAX_R_REP} so n^r stays computable in reasonable time.`);
      return;
    }
    if (!repetition && n === 0 && r === 0) {
      // 0P0 = 1, 0C0 = 1 — allowed
    }
    setResult(repetition ? computeWithRep(n, r) : computeNoRep(n, r));
    setInputs({ n, r, rep: repetition });
  };

  return (
    <MathCalcPage
      name="Permutation and Combination Calculator"
      tagline="Enter the total number of items (n) and how many to choose (r). The calculator shows both permutations (nPr) and combinations (nCr) side by side, with the formula substituted and full step-by-step working. Toggle 'Allow repetition' to switch to the with-replacement formulas."
      extras={
        <>
          <CalcSection title="What are permutations and combinations?">
            <p>
              Permutations and combinations come from{" "}
              <em>combinatorics</em> — the branch of math that counts how
              many ways things can be arranged or chosen. The core
              distinction is simple:
            </p>
            <FeatureList
              items={[
                <><strong>Permutations</strong> count arrangements where <strong>order matters</strong>. Ranking three finishers in a race — gold, silver, bronze — is a permutation because swapping any two changes the outcome.</>,
                <><strong>Combinations</strong> count selections where <strong>order does not matter</strong>. Picking three players for a team is a combination — the team is the same regardless of the order you named them in.</>,
              ]}
            />
            <p>
              A classic naming trap: a{" "}
              <strong>“combination lock” is actually a permutation lock</strong>.
              The digits 1‑2‑9 do not open a lock set to 2‑9‑1, so order
              clearly matters. Real mathematical combinations ignore order.
            </p>
          </CalcSection>

<CalcSection title="Permutations and combinations, piece by piece">
            <p>
              Four archetypes cover almost every counting problem: ordered vs
              unordered, each with or without repetition. Each card names the
              formula the calculator applies and walks through one small
              example.
            </p>
            <GuideCards items={PC_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Computes permutations (nPr) and combinations (nCr) in one pass",
                "Shows each formula with the actual numbers substituted, not just the final answer",
                "Optional 'Allow repetition' toggle switches to n^r and (n+r−1)Cr — a genuine improvement over calculators that only mention these in text",
                "Step-by-step working for both permutations and combinations",
                "Live diagram of the r slots, matching the mode you chose",
                "BigInt arithmetic — exact answers for large n and r without floating-point drift",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What is the difference between a permutation and a combination?",
                  a: (
                    <p>
                      Permutations care about the order of the selection —
                      ABC and CAB count as different. Combinations only care
                      about which items were chosen — {"{A, B, C}"} is one
                      group no matter what order you name it in.
                    </p>
                  ),
                },
                {
                  q: "Why is nCr always smaller than or equal to nPr?",
                  a: (
                    <p>
                      Every combination of r items can be arranged in r!
                      different orders. nPr counts each of those orderings
                      separately, while nCr counts them once. So nCr = nPr /
                      r!, which is never larger than nPr.
                    </p>
                  ),
                },
                {
                  q: "What does 0! equal, and why?",
                  a: (
                    <p>
                      0! = 1. Defining it this way keeps the formulas
                      consistent: nP0 = n!/n! = 1 (one way to choose
                      nothing) and nC0 = 1 (one empty selection). It also
                      makes the recursion n! = n × (n−1)! work down to n = 1.
                    </p>
                  ),
                },
                {
                  q: "How large can n and r be here?",
                  a: (
                    <p>
                      The calculator uses BigInt arithmetic, so answers stay
                      exact up to n = 500. With repetition, r is capped at
                      60 so the n^r expansion remains fast to render.
                    </p>
                  ),
                },
                {
                  q: "Is a combination lock really a combination?",
                  a: (
                    <p>
                      No. Order matters (1‑2‑9 will not open a lock set to
                      2‑9‑1) and digits can repeat, so a combination lock is
                      actually a <strong>permutation with repetition</strong>.
                      A true mathematical combination would open regardless
                      of the order you entered the numbers in.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                { to: "/calculators/math/probability-calculator", label: "Probability Calculator" },
                { to: "/calculators/math/statistics-calculator", label: "Statistics Calculator" },
                { to: "/calculators/math/combinations-counter-calculator", label: "Combinations Counter" },
                { to: "/calculators/math/big-number-calculator", label: "Big Number Calculator" },
              ]}
            />
          </CalcSection>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Total amount in a set (n)" htmlFor="perm-n">
          <TextInput
            id="perm-n"
            inputMode="numeric"
            value={nStr}
            onChange={(e) => setNStr(e.target.value)}
          />
        </Field>
        <Field label="Amount in each sub-set (r)" htmlFor="perm-r">
          <TextInput
            id="perm-r"
            inputMode="numeric"
            value={rStr}
            onChange={(e) => setRStr(e.target.value)}
          />
        </Field>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[var(--color-primary)]"
          checked={repetition}
          onChange={(e) => setRepetition(e.target.checked)}
        />
        Allow repetition (with replacement) — uses n^r and (n + r − 1)Cr
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setErr(null);
            setInputs(null);
          }}
          className="rounded-full border border-border/60 bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40"
        >
          Clear
        </button>
      </div>

      {err && <ErrorBox message={err} />}

      {result && inputs && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Result
            </div>
            <div className="mt-2 space-y-2 font-mono text-base sm:text-lg">
              <div>
                <span className="text-foreground font-semibold">Permutations, </span>
                <span>
                  {result.permLabel} = {result.permFormulaLine} ={" "}
                  <span className="font-semibold text-primary">{fmtBig(result.permValue)}</span>
                </span>
              </div>
              <div>
                <span className="text-foreground font-semibold">Combinations, </span>
                <span>
                  {result.combLabel} = {result.combFormulaLine} ={" "}
                  <span className="font-semibold text-primary">{fmtBig(result.combValue)}</span>
                </span>
              </div>
            </div>
          </div>

          <OrderDiagram n={inputs.n} r={inputs.r} repetition={inputs.rep} />
          <CompareBars perm={result.permValue} comb={result.combValue} />


          <div>
            <div className="mb-2 text-sm font-medium text-foreground">
              Permutation working
            </div>
            <StepsToggle steps={result.permSteps} />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-foreground">
              Combination working
            </div>
            <StepsToggle steps={result.combSteps} />
          </div>
        </div>
      )}
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function PermMini() {
  return (
    <svg viewBox="0 0 220 90" className="w-full">
      <rect x="1" y="1" width="218" height="88" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      {["11", "10"].map((v, i) => (
        <g key={i}>
          <rect x={50 + i * 70} y="30" width="50" height="34" rx="6" fill="color-mix(in srgb, var(--color-primary) 12%, transparent)" stroke="var(--color-primary)" />
          <text x={75 + i * 70} y="52" textAnchor="middle" fontSize="14" fill="var(--color-foreground)">{v}</text>
        </g>
      ))}
      <text x="115" y="52" textAnchor="middle" fontSize="14" fill="var(--color-primary)">×</text>
      <text x="110" y="82" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">order matters · choices shrink</text>
    </svg>
  );
}

function CombMini() {
  return (
    <svg viewBox="0 0 220 100" className="w-full">
      <rect x="1" y="1" width="218" height="98" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <text x="110" y="24" textAnchor="middle" fontSize="12" fill="var(--color-primary)" fontFamily="monospace">nCr = nPr / r!</text>
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={45 + i * 30} cy="60" r="10" fill="color-mix(in srgb, var(--color-primary) 20%, transparent)" stroke="var(--color-primary)" />
      ))}
      <text x="110" y="92" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">throw away the r! reorderings</text>
    </svg>
  );
}

function RepMini() {
  return (
    <svg viewBox="0 0 220 90" className="w-full">
      <rect x="1" y="1" width="218" height="88" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={20 + i * 48} y="28" width="40" height="30" rx="6" fill="color-mix(in srgb, var(--color-primary) 12%, transparent)" stroke="var(--color-primary)" />
          <text x={40 + i * 48} y="48" textAnchor="middle" fontSize="12" fill="var(--color-foreground)">10</text>
        </g>
      ))}
      <text x="110" y="78" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">each slot independent: 10⁴</text>
    </svg>
  );
}

function StarsBarsMini() {
  return (
    <svg viewBox="0 0 220 90" className="w-full">
      <rect x="1" y="1" width="218" height="88" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <g fontSize="18" fontFamily="monospace" fill="var(--color-foreground)">
        <text x="30" y="52">★</text>
        <text x="50" y="52">|</text>
        <text x="70" y="52">★★</text>
        <text x="110" y="52">|</text>
        <text x="130" y="52">|</text>
        <text x="150" y="52">|</text>
        <text x="170" y="52">|</text>
      </g>
      <text x="110" y="80" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">(n+r−1)Cr places r stars in n bins</text>
    </svg>
  );
}

const PC_GUIDE: GuideCardItem[] = [
  {
    key: "perm",
    title: "Permutations — order matters",
    explain: <>Line up r positions from n items. Each pick reduces the pool by one, giving a shrinking chain of choices that the factorial ratio packages up.</>,
    formula: <>nPr = n! / (n − r)!</>,
    diagram: <PermMini />,
    example: {
      given: <span className="font-mono">n = 11, r = 2 (captain, VC)</span>,
      substitute: <>11 · 10</>,
      answer: <span className="font-mono">110</span>,
    },
  },
  {
    key: "comb",
    title: "Combinations — order does not matter",
    explain: <>Every unordered group of r items can be arranged in r! different orders, so combinations equal permutations divided by r!.</>,
    formula: <>nCr = n! / (r! · (n − r)!)</>,
    diagram: <CombMini />,
    example: {
      given: <span className="font-mono">n = 8 toppings, r = 3</span>,
      substitute: <>(8·7·6) / (3·2·1)</>,
      answer: <span className="font-mono">56</span>,
    },
  },
  {
    key: "perm-rep",
    title: "Permutations with repetition — nʳ",
    explain: <>When items can repeat, every slot is an independent choice from all n items. The counts just multiply.</>,
    formula: <>count = nʳ</>,
    diagram: <RepMini />,
    example: {
      given: <span className="font-mono">10 digits, 4-slot PIN</span>,
      substitute: <>10 · 10 · 10 · 10</>,
      answer: <span className="font-mono">10,000</span>,
    },
  },
  {
    key: "comb-rep",
    title: "Combinations with repetition — stars and bars",
    explain: <>Unordered but items can repeat. Represent choices as r stars split across n bins by (n−1) bars — pick r star positions from (n+r−1).</>,
    formula: <>count = (n + r − 1)Cr</>,
    diagram: <StarsBarsMini />,
    example: {
      given: <span className="font-mono">5 flavours, 3 scoops</span>,
      substitute: <>7C3 = 7! / (3!·4!)</>,
      answer: <span className="font-mono">35</span>,
    },
  },
];
