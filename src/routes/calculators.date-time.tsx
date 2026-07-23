import { createFileRoute } from "@tanstack/react-router";
import { CategoryListing } from "@/components/CategoryListing";
import { buildSeo } from "@/components/SEO";

export const Route = createFileRoute("/calculators/date-time")({
  head: () =>
    buildSeo({
      title: "Days Between Dates & Date-Time Calculators",
      metaDescription:
        "Date and time calculators — coming soon. In the meantime, explore our full range of free, ad-free math calculators available now.",
      canonicalUrl: "/calculators/date-time",
    }),
  component: () => <CategoryListing categorySlug="date-time" />,
});
