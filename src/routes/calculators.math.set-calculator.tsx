import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
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
  type GuideCardItem,
} from "@/components/MathCalcPage";
import { SolutionSteps, type Step } from "@/components/SolutionSteps";

export const Route = createFileRoute("/calculators/math/set-calculator")({
  head: () =>
    buildCalculatorSeo({
      name: "Set Calculator",
      title: "Set Calculator — Union, Intersection & Venn Diagram",
      metaDescription:
        "Compute union, intersection, difference or symmetric difference of two sets. See the result as a set, shaded on a Venn diagram, plus a subset checker.",
      canonicalUrl: "/calculators/math/set-calculator",
      breadcrumbs: [
        { name: "Home", path: "/" },
        { name: "Math", path: "/calculators/math" },
        { name: "Set Calculator", path: "/calculators/math/set-calculator" },
      ],
      faqs: [
        {
          q: "What is the empty set?",
          a: "The empty set, written ∅ or { }, is the set with no elements. It is a subset of every set (including itself). Its intersection with any set is empty, and its union with any set S is just S.",
        },
        {
          q: "What are disjoint sets?",
          a: "Two sets are disjoint when they share no elements — their intersection is the empty set. On a Venn diagram, disjoint sets are drawn as circles that don't overlap.",
        },
        {
          q: "Does the order of elements matter?",
          a: "No. A set is an unordered collection, and {1, 2, 3} is exactly the same set as {3, 1, 2}. Duplicates are also ignored — {1, 1, 2} equals {1, 2}.",
        },
        {
          q: "What's the difference between A − B and B − A?",
          a: "A − B contains the elements that are in A but not in B, while B − A contains the elements in B but not in A. In general they are different sets — set difference is not commutative.",
        },
      ],
    }),
  component: SetPage,
});

// ---------------- Engine ----------------

type Op = "union" | "intersect" | "diffAB" | "diffBA" | "symdiff";

const OP_LABEL: Record<Op, string> = {
  union: "A ∪ B (union)",
  intersect: "A ∩ B (intersection)",
  diffAB: "A − B (difference)",
  diffBA: "B − A (difference)",
  symdiff: "A △ B (symmetric difference)",
};

function parseSet(raw: string, name: string): string[] {
  const parts = raw
    .replace(/^\s*\{\s*/, "")
    .replace(/\s*\}\s*$/, "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length === 0)
    throw new Error(`Set ${name} is empty — enter comma-separated values.`);
  // Deduplicate preserving first occurrence
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

function fmtSet(xs: string[]): string {
  if (xs.length === 0) return "∅";
  // Try numeric sort when all numeric
  const nums = xs.map(Number);
  const allNum = nums.every((n) => Number.isFinite(n));
  const sorted = allNum
    ? [...xs].sort((a, b) => Number(a) - Number(b))
    : [...xs].sort();
  return `{ ${sorted.join(", ")} }`;
}

function compute(A: string[], B: string[], op: Op): string[] {
  const setA = new Set(A);
  const setB = new Set(B);
  switch (op) {
    case "union":
      return [...new Set([...A, ...B])];
    case "intersect":
      return A.filter((x) => setB.has(x));
    case "diffAB":
      return A.filter((x) => !setB.has(x));
    case "diffBA":
      return B.filter((x) => !setA.has(x));
    case "symdiff":
      return [
        ...A.filter((x) => !setB.has(x)),
        ...B.filter((x) => !setA.has(x)),
      ];
  }
}

function buildDerivationSteps(A: string[], B: string[], op: Op, R: string[]): Step[] {
  const setA = new Set(A);
  const setB = new Set(B);
  const lines: string[] = [];
  const push = (x: string, inR: boolean, reason: string) =>
    lines.push(`${x}: ${reason} → ${inR ? "included" : "excluded"}`);

  if (op === "union") {
    for (const x of A) push(x, true, "in A");
    for (const x of B) if (!setA.has(x)) push(x, true, "in B, not already listed from A");
  } else if (op === "intersect") {
    for (const x of A) push(x, setB.has(x), setB.has(x) ? "in both A and B" : "in A but not in B");
  } else if (op === "diffAB") {
    for (const x of A) push(x, !setB.has(x), setB.has(x) ? "also in B, so removed" : "in A and not in B");
  } else if (op === "diffBA") {
    for (const x of B) push(x, !setA.has(x), setA.has(x) ? "also in A, so removed" : "in B and not in A");
  } else {
    for (const x of A) push(x, !setB.has(x), setB.has(x) ? "in both sets, so cancelled out" : "only in A");
    for (const x of B) push(x, !setA.has(x), setA.has(x) ? "in both sets, so cancelled out" : "only in B");
  }

  const shown = lines.slice(0, 10);
  return [
    { title: "Check every element against the definition", body: <p>{OP_LABEL[op]} keeps an element based on whether it appears in A, B, or both — see the rule applied to each element below.</p> },
    {
      title: "Element-by-element derivation",
      body: <div className="font-mono whitespace-pre-wrap text-xs">{shown.join("\n")}{lines.length > shown.length ? "\n…" : ""}</div>,
    },
    { title: "Collect the included elements", body: <p className="font-mono">{OP_LABEL[op]} = {fmtSet(R)}</p> },
  ];
}

// ---------------- Venn diagram ----------------

function VennDiagram({ op }: { op: Op }) {
  const width = 320;
  const height = 180;
  const cx1 = 115;
  const cx2 = 205;
  const cy = 90;
  const r = 60;
  const shaded = "fill-primary/50";
  const outline = "stroke-primary";

  // Build a clipPath id per op so we can render precise regions
  const showA = op === "union" || op === "diffAB" || op === "symdiff";
  const showB = op === "union" || op === "diffBA" || op === "symdiff";
  const showIntersect = op === "union" || op === "intersect";
  const hideIntersect = op === "symdiff"; // shade A and B but not overlap
  const onlyIntersect = op === "intersect";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-sm"
      role="img"
      aria-label={`Venn diagram showing ${OP_LABEL[op]}`}
    >
      <defs>
        <clipPath id="venn-a">
          <circle cx={cx1} cy={cy} r={r} />
        </clipPath>
        <clipPath id="venn-b">
          <circle cx={cx2} cy={cy} r={r} />
        </clipPath>
      </defs>

      {/* Shading A-only region (A minus B) */}
      {(showA && !onlyIntersect) && (
        <g clipPath="url(#venn-a)">
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            className={shaded}
          />
          {/* punch out B */}
          <circle cx={cx2} cy={cy} r={r} className="fill-background" />
        </g>
      )}
      {/* Shading B-only region (B minus A) */}
      {(showB && !onlyIntersect) && (
        <g clipPath="url(#venn-b)">
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            className={shaded}
          />
          {/* punch out A */}
          <circle cx={cx1} cy={cy} r={r} className="fill-background" />
        </g>
      )}
      {/* Intersection */}
      {showIntersect && !hideIntersect && (
        <g clipPath="url(#venn-a)">
          <circle cx={cx2} cy={cy} r={r} className={shaded} />
        </g>
      )}

      {/* Circle outlines */}
      <circle
        cx={cx1}
        cy={cy}
        r={r}
        className={`fill-none ${outline}`}
        strokeWidth={2}
      />
      <circle
        cx={cx2}
        cy={cy}
        r={r}
        className={`fill-none ${outline}`}
        strokeWidth={2}
      />

      <text
        x={cx1 - 30}
        y={cy - r - 6}
        className="fill-foreground"
        fontSize={14}
        fontWeight={600}
      >
        A
      </text>
      <text
        x={cx2 + 22}
        y={cy - r - 6}
        className="fill-foreground"
        fontSize={14}
        fontWeight={600}
      >
        B
      </text>
    </svg>
  );
}

// ---------------- Page ----------------

function SetPage() {
  const [aRaw, setARaw] = useState("1, 2, 3, 4");
  const [bRaw, setBRaw] = useState("3, 4, 5, 6");
  const [op, setOp] = useState<Op>("union");
  const [result, setResult] = useState<{
    A: string[];
    B: string[];
    R: string[];
  } | null>(null);
  const [display, setDisplay] = useState<{
    value: ReactNode;
    note: ReactNode;
  } | null>(null);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onCalc = () => {
    setErr(null);
    setResult(null);
    setDisplay(null);
    setSteps(null);
    try {
      const A = parseSet(aRaw, "A");
      const B = parseSet(bRaw, "B");
      const R = compute(A, B, op);
      setResult({ A, B, R });
      setDisplay({
        value: <span className="font-mono">{fmtSet(R)}</span>,
        note: (
          <>
            {OP_LABEL[op]} · |result| = {R.length} element
            {R.length === 1 ? "" : "s"}
          </>
        ),
      });
      setSteps(buildDerivationSteps(A, B, op, R));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid input.");
    }
  };

  const ops: Op[] = ["union", "intersect", "diffAB", "diffBA", "symdiff"];

  // Subset checker (independent little tool)
  const [subARaw, setSubARaw] = useState("2, 3");
  const [subBRaw, setSubBRaw] = useState("1, 2, 3, 4");
  const subResult = useMemo(() => {
    try {
      const A = parseSet(subARaw, "A");
      const B = parseSet(subBRaw, "B");
      const setB = new Set(B);
      const missing = A.filter((x) => !setB.has(x));
      const isSubset = missing.length === 0;
      const isEqual = isSubset && A.length === B.length;
      const isProper = isSubset && !isEqual;
      return { ok: true as const, A, B, isSubset, isEqual, isProper, missing };
    } catch (e) {
      return {
        ok: false as const,
        message: e instanceof Error ? e.message : "Invalid input.",
      };
    }
  }, [subARaw, subBRaw]);

  return (
    <MathCalcPage
      name="Set Calculator"
      tagline="Compute the union, intersection, difference or symmetric difference of two sets. Enter values as a comma-separated list; the result is shown as a set and shaded on a Venn diagram."
      extras={
        <>
          <CalcSection title="What is a set?">
            <p>
              A set is a collection of distinct objects called{" "}
              <em>elements</em> or <em>members</em>. Sets are unordered and
              contain no duplicates, so <span className="font-mono">{"{1, 2, 3}"}</span>{" "}
              and <span className="font-mono">{"{3, 1, 2, 1}"}</span> describe
              the same set. We write{" "}
              <span className="font-mono">x ∈ A</span> when x is an element
              of A, and <span className="font-mono">x ∉ A</span> when it
              isn't.
            </p>
          </CalcSection>

          <CalcSection title="Set operations, piece by piece">
            <p className="text-sm text-muted-foreground">
              Each card explains one thing this tool computes from your two
              sets A and B — what it keeps, what it drops, and how the Venn
              regions map to the result.
            </p>
            <GuideCards items={SET_GUIDE} />
          </CalcSection>

          <CalcSection title="Features of this calculator">
            <FeatureList
              items={[
                "Accepts numbers, words, or any comma-separated values",
                "Automatically removes duplicates and treats sets as unordered",
                "Supports union, intersection, both directions of difference, and symmetric difference",
                "Renders a Venn diagram with the selected region shaded",
                "Includes a separate subset checker tool",
              ]}
            />
          </CalcSection>

          
          <CalcSection title="Frequently asked questions">
            <CalcFAQ
              items={[
                {
                  q: "What does the empty set look like on a Venn diagram?",
                  a: (
                    <p>
                      The empty set corresponds to any region with nothing
                      shaded and no elements listed inside it. Two disjoint
                      sets have an empty intersection — the overlap region
                      contains no elements.
                    </p>
                  ),
                },
                {
                  q: "When are two sets equal?",
                  a: (
                    <p>
                      When they contain exactly the same elements. Because
                      order and repetition don't matter,{" "}
                      <span className="font-mono">{"{a, b, c}"}</span> and{" "}
                      <span className="font-mono">{"{c, a, b, a}"}</span>{" "}
                      are equal.
                    </p>
                  ),
                },
                {
                  q: "Do the elements have to be numbers?",
                  a: (
                    <p>
                      No. Elements can be anything — numbers, words,
                      symbols, or even other sets. This calculator treats
                      each comma-separated token as an element and compares
                      them exactly.
                    </p>
                  ),
                },
                {
                  q: "How is symmetric difference related to XOR?",
                  a: (
                    <p>
                      They match exactly. An element is in{" "}
                      <span className="font-mono">A △ B</span> when it's in
                      A XOR B — in one set but not both — which is the same
                      truth table as the XOR logical operator.
                    </p>
                  ),
                },
              ]}
            />
          </CalcSection>

          <CalcSection title="Related calculators">
            <RelatedLinks
              links={[
                {
                  to: "/calculators/math/lcm-calculator",
                  label: "LCM Calculator",
                },
                {
                  to: "/calculators/math/gcf-calculator",
                  label: "GCF Calculator",
                },
                {
                  to: "/calculators/math/factor-calculator",
                  label: "Factor Calculator",
                },
              ]}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Probability Calculator and Permutation &amp; Combination
              Calculator are coming soon — they will link here once
              published.
            </p>
          </CalcSection>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3">
          <Field label="Set A (comma-separated)" htmlFor="setA">
            <TextInput
              id="setA"
              value={aRaw}
              onChange={(e) => setARaw(e.target.value)}
              placeholder="1, 2, 3, 4"
            />
          </Field>
          <Field label="Set B (comma-separated)" htmlFor="setB">
            <TextInput
              id="setB"
              value={bRaw}
              onChange={(e) => setBRaw(e.target.value)}
              placeholder="3, 4, 5, 6"
            />
          </Field>
        </div>

        <Field label="Operation" htmlFor="op">
          <div className="flex flex-wrap gap-2">
            {ops.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOp(o)}
                className={`h-10 rounded-lg border px-3 font-mono text-sm transition ${
                  op === o
                    ? "border-primary bg-primary/20 text-foreground"
                    : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={op === o}
              >
                {OP_LABEL[o]}
              </button>
            ))}
          </div>
        </Field>

        <PrimaryButton onClick={onCalc}>Calculate</PrimaryButton>
      </div>

      {err && <ErrorBox message={err} />}
      {result && display && (
        <>
          <ResultBox label="Result" value={display.value} note={display.note} />
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <div className="mb-2 text-sm font-medium text-foreground">
              Venn diagram — shaded region shows {OP_LABEL[op]}
            </div>
            <div className="flex justify-center">
              <VennDiagram op={op} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1 font-mono text-xs text-muted-foreground sm:grid-cols-2">
              <div>A = {fmtSet(result.A)}</div>
              <div>B = {fmtSet(result.B)}</div>
            </div>
          </div>
          {steps && <SolutionSteps steps={steps} />}
        </>
      )}

      {/* Subset checker */}
      <div className="mt-8 rounded-2xl border border-border/60 bg-secondary/10 p-4">
        <div className="mb-3 text-sm font-semibold text-foreground">
          Subset checker
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Check whether every element of Set A is also in Set B.
        </p>
        <div className="space-y-3">
          <Field label="Set A" htmlFor="subA">
            <TextInput
              id="subA"
              value={subARaw}
              onChange={(e) => setSubARaw(e.target.value)}
              placeholder="2, 3"
            />
          </Field>
          <Field label="Set B" htmlFor="subB">
            <TextInput
              id="subB"
              value={subBRaw}
              onChange={(e) => setSubBRaw(e.target.value)}
              placeholder="1, 2, 3, 4"
            />
          </Field>
        </div>
        {subResult.ok ? (
          <div className="mt-3 rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
            {subResult.isSubset ? (
              <div>
                <span className="font-mono">
                  {fmtSet(subResult.A)} {subResult.isProper ? "⊂" : "⊆"}{" "}
                  {fmtSet(subResult.B)}
                </span>{" "}
                — Set A is {subResult.isProper ? "a proper subset" : "equal to"}{" "}
                Set B.
              </div>
            ) : (
              <div>
                <span className="font-mono">
                  {fmtSet(subResult.A)} ⊄ {fmtSet(subResult.B)}
                </span>{" "}
                — Set A is not a subset of Set B. Missing from B:{" "}
                <span className="font-mono">{fmtSet(subResult.missing)}</span>.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 text-sm text-destructive">
            {subResult.message}
          </div>
        )}
      </div>
    </MathCalcPage>
  );
}

/* ---------------- Guide cards ---------------- */

function Venn({ shade }: { shade: "A" | "B" | "AB" | "A-B" | "B-A" | "AuB" | "sym" }) {
  const cx1 = 75, cx2 = 125, cy = 55, r = 40;
  const strokeC = "var(--color-primary)";
  const fillA = "var(--color-primary)";
  const opA = shade === "A" || shade === "A-B" || shade === "AuB" || shade === "sym" ? 0.25 : 0.06;
  const opB = shade === "B" || shade === "B-A" || shade === "AuB" || shade === "sym" ? 0.25 : 0.06;
  const opInt = shade === "AB" || shade === "AuB" ? 0.45 : shade === "sym" || shade === "A-B" || shade === "B-A" ? 0 : 0.1;
  return (
    <svg viewBox="0 0 200 110" className="w-full">
      <rect x="1" y="1" width="198" height="108" rx="10" fill="color-mix(in srgb, var(--color-secondary) 15%, transparent)" stroke="var(--color-border)" />
      <circle cx={cx1} cy={cy} r={r} fill={fillA} fillOpacity={opA} stroke={strokeC} />
      <circle cx={cx2} cy={cy} r={r} fill={fillA} fillOpacity={opB} stroke={strokeC} />
      {opInt > 0 && (
        <clipPath id={"cp"+shade}>
          <circle cx={cx1} cy={cy} r={r} />
        </clipPath>
      )}
      {opInt > 0 && <circle cx={cx2} cy={cy} r={r} fill={fillA} fillOpacity={opInt} clipPath={`url(#cp${shade})`} />}
      <text x={cx1 - 18} y="20" fontSize="11" fill="var(--color-foreground)">A</text>
      <text x={cx2 + 12} y="20" fontSize="11" fill="var(--color-foreground)">B</text>
      <text x="100" y="102" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">
        {shade === "AuB" && "A ∪ B — everything, either circle"}
        {shade === "AB" && "A ∩ B — only the overlap"}
        {shade === "A-B" && "A − B — A minus the overlap"}
        {shade === "sym" && "A △ B — both circles minus overlap"}
      </text>
    </svg>
  );
}

const SET_GUIDE: GuideCardItem[] = [
  {
    key: "union",
    title: "Union — A ∪ B",
    explain: <>Everything in A, in B, or in both. Duplicates collapse to a single element in the output.</>,
    formula: <>A ∪ B = &#123; x : x ∈ A or x ∈ B &#125;</>,
    diagram: <Venn shade="AuB" />,
    example: {
      given: <span className="font-mono">A=&#123;1,2,3,4&#125;, B=&#123;3,4,5,6&#125;</span>,
      substitute: <>combine, drop repeats</>,
      answer: <span className="font-mono">&#123;1,2,3,4,5,6&#125;</span>,
    },
  },
  {
    key: "int",
    title: "Intersection — A ∩ B",
    explain: <>Only the elements that appear in both A and B. Empty when the two sets are disjoint.</>,
    formula: <>A ∩ B = &#123; x : x ∈ A and x ∈ B &#125;</>,
    diagram: <Venn shade="AB" />,
    example: {
      given: <span className="font-mono">A=&#123;1,2,3,4&#125;, B=&#123;3,4,5,6&#125;</span>,
      substitute: <>keep values in both</>,
      answer: <span className="font-mono">&#123;3,4&#125;</span>,
    },
  },
  {
    key: "diff",
    title: "Difference — A − B (and B − A)",
    explain: <>A − B keeps the elements of A that are not in B. Order matters: A − B and B − A are usually different sets.</>,
    formula: <>A − B = &#123; x : x ∈ A and x ∉ B &#125;</>,
    diagram: <Venn shade="A-B" />,
    example: {
      given: <span className="font-mono">A=&#123;1,2,3,4&#125;, B=&#123;3,4,5,6&#125;</span>,
      substitute: <>strip shared 3, 4 from A</>,
      answer: <span className="font-mono">A−B=&#123;1,2&#125;, B−A=&#123;5,6&#125;</span>,
    },
  },
  {
    key: "sym",
    title: "Symmetric difference — A △ B",
    explain: <>Everything that belongs to exactly one of the two sets — the union with the overlap removed.</>,
    formula: <>A △ B = (A ∪ B) − (A ∩ B)</>,
    diagram: <Venn shade="sym" />,
    example: {
      given: <span className="font-mono">A=&#123;1,2,3,4&#125;, B=&#123;3,4,5,6&#125;</span>,
      substitute: <>union minus &#123;3,4&#125;</>,
      answer: <span className="font-mono">&#123;1,2,5,6&#125;</span>,
    },
  },
];
