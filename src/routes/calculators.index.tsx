import { createFileRoute } from "@tanstack/react-router";
import {
  Calculator,
  DollarSign,
  HeartPulse,
  Ruler,
  CalendarClock,
  GraduationCap,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryCard } from "@/components/CategoryCard";
import { buildSeo } from "@/components/SEO";
import { CATEGORIES } from "@/lib/calculator-catalog";

export const Route = createFileRoute("/calculators/")({
  head: () =>
    buildSeo({
      title: "Online Calculators — Every Category, Free & Ad-Free",
      metaDescription:
        "Browse free online calculators for math, finance, health, unit conversion, dates and education — a modern, ad-free hub built for speed and clarity.",
      canonicalUrl: "/calculators",
    }),
  component: CalculatorsOverview,
});

const count = (slug: keyof typeof CATEGORIES) =>
  CATEGORIES[slug].sections.reduce(
    (n, s) => n + s.items.filter((i) => i.href).length,
    0,
  );

const categories = [
  { name: "Math", description: "Arithmetic, algebra, geometry and statistics.", icon: Calculator, count: count("math"), to: "/calculators/math" },
  { name: "Finance", description: "Loans, mortgages, investments and taxes.", icon: DollarSign, count: count("finance"), to: "/calculators/finance" },
  { name: "Health & Fitness", description: "BMI, calories, TDEE, macros and fitness.", icon: HeartPulse, count: count("health"), to: "/calculators/health" },
  { name: "Unit Converters", description: "Length, weight, volume, temperature and more.", icon: Ruler, count: count("unit-converters"), to: "/calculators/unit-converters" },
  { name: "Date & Time", description: "Age, duration, workdays and countdowns.", icon: CalendarClock, count: count("date-time"), to: "/calculators/date-time" },
  { name: "Education", description: "GPA, grades, scores and academic planning.", icon: GraduationCap, count: count("education"), to: "/calculators/education" },
];

function CalculatorsOverview() {
  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-24">
        <Breadcrumbs
          items={[{ label: "Home", to: "/" }, { label: "Calculators" }]}
        />
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            All online calculators
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Six categories, every calculator you need — free, ad-free, and
            beautifully simple.
          </p>
        </header>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <CategoryCard key={c.to} {...c} />
          ))}
        </div>
      </section>
    </Layout>
  );
}
