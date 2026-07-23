import { createFileRoute } from "@tanstack/react-router";
import { CategoryListing } from "@/components/CategoryListing";
import { buildSeo } from "@/components/SEO";

export const Route = createFileRoute("/calculators/unit-converters")({
  head: () =>
    buildSeo({
      title: "Unit Converter — Length, Weight, Temperature & More",
      metaDescription:
        "Unit converters — coming soon. In the meantime, explore our full range of free, ad-free math calculators available now.",
      canonicalUrl: "/calculators/unit-converters",
    }),
  component: () => <CategoryListing categorySlug="unit-converters" />,
});
