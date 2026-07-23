import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CalculatorCard } from "@/components/CalculatorCard";
import { CATEGORIES } from "@/lib/calculator-catalog";

interface Props {
  categorySlug: keyof typeof CATEGORIES;
}

export function CategoryListing({ categorySlug }: Props) {
  const cat = CATEGORIES[categorySlug];
  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-24">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Calculators", to: "/calculators" },
            { label: cat.name },
          ]}
        />
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {cat.name} calculators
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Free, ad-free {cat.name.toLowerCase()} tools — accurate results with
            step-by-step working coming to each calculator.
          </p>
        </header>

        {cat.sections.map((section) => (
          <div key={section.title} className="mt-14">
            <h2 className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {section.items.map((item) => (
                <CalculatorCard
                  key={item.slug}
                  name={item.name}
                  description={item.description}
                  icon={item.icon}
                  to={item.href ?? `/calculators/${cat.slug}`}
                  disabled={!item.href}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </Layout>
  );
}
