import { Children, Fragment, isValidElement, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { pushRecentCalculator } from "@/hooks/useRecentCalculators";

interface Props {
  name: string;
  tagline: string;
  children: ReactNode;
  /** Content shown below the calculator widget. Pages own their own section
   * headings — no generic wrappers are injected. */
  extras?: ReactNode;
}

export function MathCalcPage({ name, tagline, children, extras }: Props) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      pushRecentCalculator(window.location.pathname);
    }
  }, []);
  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-6 pt-6 pb-24">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Math", to: "/calculators/math" },
            { label: name },
          ]}
        />
        <header className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {name}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {tagline}
          </p>
        </header>

        <div className="rounded-3xl border border-border bg-card/60 p-5 shadow-[0_20px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:p-6">
          {children}
        </div>

        {extras && (
          <div className="mt-12 space-y-10 text-[15px] leading-relaxed text-muted-foreground">
            {extras}
          </div>
        )}
      </section>
    </Layout>
  );
}

/* ================= Shared page-content primitives =================
 * These give every calculator a consistent look for its educational
 * content without hardcoding the section headings. Each page picks
 * its own specific titles (e.g. "What is an Exponent?" rather than
 * a generic "About this calculator"). */

export function CalcSection({
  title,
  children,
  defaultOpen = true,
  collapsible = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!collapsible) {
    return (
      <section>
        <h2 className="mb-3 font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </h2>
        <div className="space-y-3">{children}</div>
      </section>
    );
  }
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-3 flex w-full items-center justify-between gap-3 text-left group"
      >
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </h2>
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {open ? "Hide" : "Show"}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            aria-hidden="true"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M2 4l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </section>
  );
}

function textFromMathNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromMathNode).join("");
  if (isValidElement(node)) {
    return textFromMathNode((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function flattenMathNodes(node: ReactNode): ReactNode[] {
  const nodes: ReactNode[] = [];
  Children.forEach(node, (child) => {
    if (isValidElement(child) && child.type === Fragment) {
      nodes.push(...flattenMathNodes((child.props as { children?: ReactNode }).children));
      return;
    }
    if (child !== null && child !== undefined && typeof child !== "boolean") {
      nodes.push(child);
    }
  });
  return nodes;
}

export function StackedMath({
  children,
  splitEqualityChains = "auto",
}: {
  children: ReactNode;
  splitEqualityChains?: boolean | "auto";
}) {
  const lines: ReactNode[][] = [[]];
  let equalsSeenInLine = 0;

  const newLine = () => {
    if (lines[lines.length - 1].length > 0) lines.push([]);
    equalsSeenInLine = 0;
  };

  const addText = (value: string) => {
    // Split on strong step separators: ; , (before letter/greek) . (before capital) "and" "so" "with"
    const chunks = value.split(/(\s*;\s*|\s*,\s+(?=[A-Za-zΑ-Ωαβγπℓ√(])|\s+and\s+|\s+so\s+|\s+with\s+|\.\s+(?=[A-ZΑ-ΩπℓA-Za-z]))/g);
    for (const chunk of chunks) {
      if (!chunk) continue;
      const trimmed = chunk.trim();
      if (/^(;|,|and|so|with|\.)$/i.test(trimmed) || /^\.\s+/.test(chunk) || /^,\s+/.test(chunk)) {
        newLine();
        continue;
      }
      const chunkEqCount = (chunk.match(/=/g)?.length ?? 0);
      const shouldSplitEquality =
        splitEqualityChains === true ||
        (splitEqualityChains === "auto" && chunkEqCount > 1);
      if (!shouldSplitEquality) {
        lines[lines.length - 1].push(chunk);
        continue;
      }
      const parts = chunk.split("=");
      parts.forEach((part, index) => {
        if (index === 0) {
          lines[lines.length - 1].push(part);
          return;
        }
        if (equalsSeenInLine > 0) newLine();
        lines[lines.length - 1].push("=", part);
        equalsSeenInLine += 1;
      });
    }
  };

  flattenMathNodes(children).forEach((node) => {
    if (typeof node === "string" || typeof node === "number") {
      addText(String(node));
      return;
    }
    if (isValidElement(node) && node.type === "br") {
      newLine();
      return;
    }
    lines[lines.length - 1].push(node);
  });

  const visibleLines = lines.filter((line) => line.some((part) => String(part).trim() !== ""));
  if (visibleLines.length <= 1) return <>{children}</>;

  return (
    <>
      {visibleLines.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </>
  );
}

export function FormulaBlock({ children }: { children: ReactNode }) {
  return (
    <div className="my-1 flex flex-col items-center justify-center gap-1 break-words text-center font-serif text-[15px] italic text-foreground">
      <StackedMath>{children}</StackedMath>
    </div>
  );
}



/** Legend of variable meanings, rendered above a formula as a small note. */
export function VariableLegend({
  items,
}: {
  items: { sym: ReactNode; def: ReactNode }[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-1 text-xs text-muted-foreground">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5 text-muted-foreground/50">·</span>}
          <span className="font-serif italic text-foreground">{it.sym}</span>
          <span className="mx-1" aria-hidden>=</span>
          <span>{it.def}</span>
        </span>
      ))}
    </div>
  );
}

/** A formula shown with its variable legend. Formula renders as a centered
 * italic serif line (MathLine style); legend renders as a small note. */
export function FormulaWithLegend({
  formula,
  legend,
}: {
  formula: ReactNode;
  legend: { sym: ReactNode; def: ReactNode }[];
}) {
  return (
    <div className="py-1">
      <FormulaBlock>{formula}</FormulaBlock>
      <VariableLegend items={legend} />
    </div>
  );
}


export function WorkedExample({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <h3 className="mb-2 font-display text-base font-semibold text-foreground">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/** Structured worked example with clearly labelled Given / Formula /
 * Substitute / Answer rows. Preferred over free-form <WorkedExample> for new
 * pages — makes each step visually distinct and easier to scan. */
export function StructuredExample({
  title,
  given,
  formula,
  legend,
  substitute,
  answer,
  note,
}: {
  title: string;
  given: ReactNode;
  formula: ReactNode;
  legend?: { sym: ReactNode; def: ReactNode }[];
  substitute: ReactNode;
  answer: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <h3 className="mb-3 font-display text-base font-semibold text-foreground">
        {title}
      </h3>
      <div className="space-y-3 text-sm text-foreground">
        <ExRow label="Given">{given}</ExRow>
        <div>
          <ExLabel>Formula</ExLabel>
          <FormulaBlock>{formula}</FormulaBlock>
          {legend && <VariableLegend items={legend} />}
        </div>
        <div>
          <ExLabel>Substitute</ExLabel>
          <FormulaBlock>{substitute}</FormulaBlock>
        </div>
        <div>
          <ExLabel>Answer</ExLabel>
          <FormulaBlock>{answer}</FormulaBlock>
        </div>
        {note && <div className="text-muted-foreground">{note}</div>}
      </div>
    </div>
  );
}

/** Guide card: definition + formula on the left, diagram on the right (desktop),
 * example box below the diagram. Matches the pattern used on Area / Mean-Median-Mode. */
export interface GuideCardItem {
  key: string;
  title: string;
  explain: ReactNode;
  formula: ReactNode;
  legend?: { sym: ReactNode; def: ReactNode }[];
  diagram: ReactNode;
  example: { given: ReactNode; substitute: ReactNode; answer: ReactNode };
}

export function GuideCards({ items }: { items: GuideCardItem[] }) {
  return (
    <div className="mt-4 space-y-5">
      {items.map((g) => (
        <div
          key={g.key}
          className="rounded-2xl border border-border/60 bg-background/40 p-4 sm:p-5"
        >
          <h3 className="mb-3 font-display text-lg font-semibold text-foreground">
            {g.title}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 text-foreground md:col-start-1 md:row-start-1">
              <p className="text-[15px] leading-relaxed">{g.explain}</p>
              <FormulaWithLegend formula={g.formula} legend={g.legend ?? []} />
            </div>
            <div className="md:col-start-2 md:row-start-1">{g.diagram}</div>
            <div className="md:col-span-2 md:row-start-2">
              <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Example
                </div>
                <div className="space-y-2 text-foreground">
                  <div>
                    <div className="text-[12px] text-muted-foreground">Given</div>
                    <FormulaBlock>{g.example.given}</FormulaBlock>
                  </div>
                  <div>
                    <div className="text-[12px] text-muted-foreground">Substitute</div>
                    <FormulaBlock>{g.example.substitute}</FormulaBlock>
                  </div>
                  <div>
                    <div className="text-[12px] text-muted-foreground">Answer</div>
                    <FormulaBlock>{g.example.answer}</FormulaBlock>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </div>
  );
}

function ExRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <ExLabel>{label}</ExLabel>
      <div className="text-foreground">{children}</div>
    </div>
  );
}


export function CalcFAQ({
  items,
}: {
  items: { q: string; a: ReactNode }[];
}) {
  return (
    <div className="divide-y divide-border/60 rounded-2xl border border-border/60">
      {items.map((it, i) => (
        <details key={i} className="group p-4 open:bg-secondary/20">
          <summary className="cursor-pointer list-none font-display text-base font-semibold text-foreground marker:hidden">
            <span className="mr-2 text-primary group-open:hidden">+</span>
            <span className="mr-2 hidden text-primary group-open:inline">−</span>
            {it.q}
          </summary>
          <div className="mt-3 space-y-2">{it.a}</div>
        </details>
      ))}
    </div>
  );
}

export function FeatureList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span className="text-foreground/90">{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function RelatedLinks({
  links,
}: {
  links: { to: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="inline-flex items-center rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-sm text-foreground hover:border-primary/40"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}

/* --- Small shared form primitives (no design tokens hardcoded) --- */

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-base text-foreground tabular-nums placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 " +
        (props.className ?? "")
      }
    />
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={
        "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_8px_30px_-8px_var(--color-primary)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 " +
        (props.className ?? "")
      }
    />
  );
}

export function ResultBox({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-serif italic text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {note && <div className="mt-2 text-sm text-muted-foreground">{note}</div>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}
