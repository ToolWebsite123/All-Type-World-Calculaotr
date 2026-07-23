import { createFileRoute } from "@tanstack/react-router";
import { CategoryListing } from "@/components/CategoryListing";
import { buildSeo } from "@/components/SEO";

export const Route = createFileRoute("/calculators/finance")({
  head: () =>
    buildSeo({
      title: "Finance Calculators — Compound Interest, Mortgage & Loans",
      metaDescription:
        "Finance calculators — coming soon. In the meantime, explore our full range of free, ad-free math calculators available now.",
      canonicalUrl: "/calculators/finance",
    }),
  component: () => <CategoryListing categorySlug="finance" />,
});
