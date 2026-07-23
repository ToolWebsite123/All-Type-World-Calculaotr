import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calculator,
  DollarSign,
  HeartPulse,
  Ruler,
  CalendarClock,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { CategoryCard } from "@/components/CategoryCard";
import { ScientificCalculator } from "@/components/calculator/ScientificCalculator";
import { buildSeo } from "@/components/SEO";
import { useRecentCalculators, clearRecentCalculators } from "@/hooks/useRecentCalculators";

export const Route = createFileRoute("/")({
  head: () =>
    buildSeo({
      title: "All Type Calculator — Free & Ad-Free Calculator Hub",
      metaDescription:
        "Free, ad-free hub of calculators for math, finance, health, unit conversion, date & time and education — plus a full scientific calculator built in.",
      canonicalUrl: "/",
    }),

  component: Home,
});

import { CATEGORIES } from "@/lib/calculator-catalog";

const builtCount = (slug: keyof typeof CATEGORIES) =>
  CATEGORIES[slug].sections.reduce(
    (n, s) => n + s.items.filter((i) => i.href).length,
    0,
  );

const categories = [
  { name: "Math", description: "Arithmetic, algebra, geometry and stats.", icon: Calculator, count: builtCount("math"), to: "/calculators/math" },
  { name: "Finance", description: "Loans, mortgages, investments, taxes.", icon: DollarSign, count: builtCount("finance"), to: "/calculators/finance" },
  { name: "Health & Fitness", description: "BMI, calories, body fat and macros.", icon: HeartPulse, count: builtCount("health"), to: "/calculators/health" },
  { name: "Unit Converters", description: "Length, weight, volume, temperature.", icon: Ruler, count: builtCount("unit-converters"), to: "/calculators/unit-converters" },
  { name: "Date & Time", description: "Age, duration, workdays, countdowns.", icon: CalendarClock, count: builtCount("date-time"), to: "/calculators/date-time" },
  { name: "Education", description: "GPA, grades, scores and academic tools.", icon: GraduationCap, count: builtCount("education"), to: "/calculators/education" },
] as const;

function Home() {
  const recents = useRecentCalculators();
  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-3 pt-6 pb-6 sm:px-6 sm:pt-10 sm:pb-10">
        <header className="mb-6 text-center sm:mb-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            All Type Calculator — Every Calculator You Need, Free & Ad-Free
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            A fast, distraction-free scientific calculator plus a full hub of math, finance, health, and everyday calculators — all in your browser.
          </p>
        </header>
        <ScientificCalculator />
      </section>


      <section className="mx-auto max-w-6xl px-6 pb-10">
        <h2 className="mb-6 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Explore calculators
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <CategoryCard key={c.to} {...c} />
          ))}
        </div>
      </section>

      {recents.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-10">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Recently viewed
            </h2>
            <button
              type="button"
              onClick={() => clearRecentCalculators()}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear recently viewed calculators"
            >
              Clear
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {recents.map((r) => (
              <li key={r.href}>
                <Link
                  to={r.href}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                >
                  <span>{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.category}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}


      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Popular calculators
          </h2>
          <Link
            to="/calculators"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Browse all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ul className="flex flex-wrap gap-2">
          {popularCalculators.map((p) => (
            <li key={p.href}>
              <Link
                to={p.href}
                className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  );
}

const popularCalculators = [
  { name: "Percentage", href: "/calculators/math/percentage-calculator" },
  { name: "Scientific", href: "/calculators/math/scientific-calculator" },
  { name: "Fraction", href: "/calculators/math/fraction-calculator" },
  { name: "Quadratic Formula", href: "/calculators/math/quadratic-formula-calculator" },
  { name: "Standard Deviation", href: "/calculators/math/standard-deviation-calculator" },
  { name: "Mean, Median, Mode", href: "/calculators/math/mean-median-mode-calculator" },
  { name: "Z-score", href: "/calculators/math/z-score-calculator" },
  { name: "Probability", href: "/calculators/math/probability-calculator" },
  { name: "Area", href: "/calculators/math/area-calculator" },
  { name: "Triangle", href: "/calculators/math/triangle-calculator" },
  { name: "Volume", href: "/calculators/math/volume-calculator" },
  { name: "Distance", href: "/calculators/math/distance-calculator" },
] as const;
