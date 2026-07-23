import { createFileRoute } from "@tanstack/react-router";
import { CategoryListing } from "@/components/CategoryListing";
import { buildSeo } from "@/components/SEO";

export const Route = createFileRoute("/calculators/education")({
  head: () =>
    buildSeo({
      title: "GPA Calculator & Education Tools — Grades, Scores, GPA",
      metaDescription:
        "Education calculators — coming soon. In the meantime, explore our full range of free, ad-free math calculators available now.",
      canonicalUrl: "/calculators/education",
    }),
  component: () => <CategoryListing categorySlug="education" />,
});
