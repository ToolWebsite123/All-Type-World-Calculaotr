import { createFileRoute } from "@tanstack/react-router";
import { CategoryListing } from "@/components/CategoryListing";
import { buildSeo } from "@/components/SEO";

export const Route = createFileRoute("/calculators/health")({
  head: () =>
    buildSeo({
      title: "Health & Fitness Calculators — TDEE, BMI, Macros",
      metaDescription:
        "Health and fitness calculators — coming soon. In the meantime, explore our full range of free, ad-free math calculators available now.",
      canonicalUrl: "/calculators/health",
    }),
  component: () => <CategoryListing categorySlug="health" />,
});
