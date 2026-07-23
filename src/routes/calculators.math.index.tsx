import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Sigma, Shapes } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CategoryCard } from "@/components/CategoryCard";
import { buildSeo } from "@/components/SEO";
import { CATEGORIES } from "@/lib/calculator-catalog";

export const Route = createFileRoute("/calculators/math/")({
  head: () =>
    buildSeo({
      title: "Math Calculators — Core Math, Statistics & Geometry",
      metaDescription:
        "Browse every free math calculator by group — core math, statistics & probability, and geometry — accurate, ad-free and with step-by-step working.",
      canonicalUrl: "/calculators/math",
    }),
  component: MathOverview,
});

const ICONS: Record<string, typeof Calculator> = {
  "Core Math": Calculator,
  Statistics: Sigma,
  Geometry: Shapes,
};

const DESCRIPTIONS: Record<string, string> = {
  "Core Math":
    "Arithmetic, algebra, fractions, exponents, roots and everyday math.",
  Statistics:
    "Descriptive stats, probability, distributions and hypothesis tests.",
  Geometry: "Area, triangles, distance and shape-based calculators.",
};

const SLUGS: Record<string, string> = {
  "Core Math": "core",
  Statistics: "statistics",
  Geometry: "geometry",
};

function MathOverview() {
  const cat = CATEGORIES.math;
  const groups = cat.sections.map((s) => ({
    name: s.title,
    description: DESCRIPTIONS[s.title] ?? "",
    icon: ICONS[s.title] ?? Calculator,
    count: s.items.filter((i) => i.href).length,
    to: `/calculators/math/group/${SLUGS[s.title] ?? s.title.toLowerCase()}`,
  }));

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-24">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Calculators", to: "/calculators" },
            { label: "Math" },
          ]}
        />
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Math calculators
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Pick a group to explore — core math, statistics or geometry. Every
            tool is free, ad-free and built for speed and clarity.
          </p>
        </header>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <CategoryCard key={g.to} {...g} />
          ))}
        </div>
      </section>
    </Layout>
  );
}
