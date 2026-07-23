import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildSeo } from "@/components/SEO";

export const Route = createFileRoute("/about")({
  head: () =>
    buildSeo({
      title: "About — All Type Calculator",
      metaDescription:
        "All Type Calculator is a free, ad-free hub of accurate, original calculators for math, finance, health, unit conversion, dates, and education.",
      canonicalUrl: "/about",
    }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-6 pt-6 pb-24">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "About" }]} />
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          About All Type Calculator
        </h1>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            All Type Calculator is a modern hub for the everyday calculators
            people actually reach for — a scientific calculator, fractions and
            percentages, mortgage and compound interest, BMI and calorie
            targets, unit conversions, date arithmetic, and academic tools
            like GPA. Every calculator is free, works instantly in your
            browser, and requires no sign-up.
          </p>
          <p>
            The web is already full of calculator sites, and most of them are
            crowded with ads, trackers, and stale content. We built this site
            as a deliberate counter to that: fast pages, a single clear
            layout, no interstitials, no pop-ups, and no third-party ad
            networks stitched into the tool itself. When you land on a
            calculator page, the calculator is the first thing you see and it
            works right away.
          </p>
          <p>
            Every explanation, worked example, and step-by-step solution on
            this site is written from scratch. We don't rehost formulas or
            copy content from other calculator hubs — where two sites agree
            on a formula it's because the math is the same, not because the
            wording is. If you spot an error or want a calculator we don't
            have yet, use the Contact page to let us know.
          </p>
        </div>
      </section>
    </Layout>
  );
}
