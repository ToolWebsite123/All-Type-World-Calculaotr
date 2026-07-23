import { createFileRoute, notFound } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CalculatorCard } from "@/components/CalculatorCard";
import { buildSeo } from "@/components/SEO";
import { CATEGORIES } from "@/lib/calculator-catalog";

const GROUP_TO_SECTION: Record<string, string> = {
  core: "Core Math",
  statistics: "Statistics",
  geometry: "Geometry",
};

const GROUP_META: Record<string, { title: string; description: string; tagline: string }> = {
  core: {
    title: "Core Math Calculators — Arithmetic, Algebra & More",
    description:
      "Free core math calculators — fractions, percentages, exponents, roots, quadratic formula, LCM, GCF and more, with step-by-step working.",
    tagline:
      "Arithmetic, algebra, fractions, exponents, roots and everyday math — ad-free and precise.",
  },
  statistics: {
    title: "Statistics & Probability Calculators — Free & Ad-Free",
    description:
      "Free statistics and probability calculators — mean, standard deviation, z-score, t-test, ANOVA, distributions and more, with step-by-step working.",
    tagline:
      "Descriptive stats, probability, distributions and hypothesis tests — with visuals and full working.",
  },
  geometry: {
    title: "Geometry Calculators — Area, Triangle & Distance",
    description:
      "Free geometry calculators — area of any shape, triangle solver (SSS/SAS/ASA/AAS/SSA), 2D/3D and lat-long distance — with diagrams and step-by-step working.",
    tagline: "Area, triangles, distance and shape-based tools — with live diagrams.",
  },
};

export const Route = createFileRoute("/calculators/math/group/$slug")({
  head: ({ params }) => {
    const meta = GROUP_META[params.slug];
    if (!meta) return {};
    return buildSeo({
      title: meta.title,
      metaDescription: meta.description,
      canonicalUrl: `/calculators/math/group/${params.slug}`,
    });
  },
  loader: ({ params }) => {
    if (!GROUP_TO_SECTION[params.slug]) throw notFound();
    return null;
  },
  component: MathGroupPage,
  notFoundComponent: () => (
    <Layout>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <h1 className="font-display text-3xl font-semibold">Group not found</h1>
      </section>
    </Layout>
  ),
  errorComponent: () => (
    <Layout>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
      </section>
    </Layout>
  ),
});

function MathGroupPage() {
  const { slug } = Route.useParams();
  const sectionTitle = GROUP_TO_SECTION[slug];
  const meta = GROUP_META[slug];
  const section = CATEGORIES.math.sections.find((s) => s.title === sectionTitle);
  if (!section || !meta) return null;

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-24">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Calculators", to: "/calculators" },
            { label: "Math", to: "/calculators/math" },
            { label: sectionTitle },
          ]}
        />
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {sectionTitle} calculators
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {meta.tagline}
          </p>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item) => (
            <CalculatorCard
              key={item.slug}
              name={item.name}
              description={item.description}
              icon={item.icon}
              to={item.href ?? "/calculators/math"}
              disabled={!item.href}
            />
          ))}
        </div>
      </section>
    </Layout>
  );
}
