/**
 * SEO metadata helper.
 *
 * TanStack Start manages <head> per route via the `head()` option on
 * createFileRoute. This helper returns a consistent head object with
 * meta, links, and optional JSON-LD scripts.
 *
 * Every page MUST call this from its route's head(). For individual
 * calculator pages, prefer buildCalculatorSeo() which additionally emits
 * SoftwareApplication + BreadcrumbList structured data.
 */

/** The canonical absolute site origin — used for og:url, canonical resolution,
 *  and structured-data URLs. Update this in one place if the domain changes. */
export const SITE_URL = "https://alltypecalculator.com";

function toAbsolute(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}

type JsonLd = Record<string, unknown> | Array<Record<string, unknown>>;

export interface SEOProps {
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage?: string;
  jsonLd?: JsonLd;
}

export function buildSeo({ title, metaDescription, canonicalUrl, ogImage, jsonLd }: SEOProps) {
  const absoluteUrl = toAbsolute(canonicalUrl);
  const absoluteImage = ogImage ? toAbsolute(ogImage) : undefined;

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: metaDescription },
    { property: "og:title", content: title },
    { property: "og:description", content: metaDescription },
    { property: "og:type", content: "website" },
    { property: "og:url", content: absoluteUrl },
    { name: "twitter:card", content: absoluteImage ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: metaDescription },
  ];
  if (absoluteImage) {
    meta.push({ property: "og:image", content: absoluteImage });
    meta.push({ name: "twitter:image", content: absoluteImage });
  }

  const scripts: Array<Record<string, string>> = [];
  if (jsonLd) {
    scripts.push({
      type: "application/ld+json",
      children: JSON.stringify(jsonLd),
    });
  }

  return {
    meta,
    links: [{ rel: "canonical", href: absoluteUrl }],
    scripts,
  };
}

/**
 * Combined SEO helper for individual calculator pages — emits both
 * SoftwareApplication and BreadcrumbList structured data (as a JSON-LD
 * @graph), and reuses buildSeo() for the rest of the head.
 *
 * `breadcrumbs` should match what's visible in the page's Breadcrumbs UI,
 * ordered root → leaf. The final crumb is treated as this page.
 */
export interface Breadcrumb {
  name: string;
  path: string;
}

export interface CalculatorSeoProps {
  name: string;
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage?: string;
  breadcrumbs: Breadcrumb[];
  /** Optional FAQ Q&A pairs — emitted as FAQPage structured data. */
  faqs?: { q: string; a: string }[];
  /** Optional HowTo guide — emitted as HowTo structured data. */
  howTo?: {
    name: string;
    description?: string;
    steps: { name: string; text: string }[];
  };
}

export function buildCalculatorSeo({
  name,
  title,
  metaDescription,
  canonicalUrl,
  ogImage,
  breadcrumbs,
  faqs,
  howTo,
}: CalculatorSeoProps) {
  const absoluteUrl = toAbsolute(canonicalUrl);

  const softwareApp: Record<string, unknown> = {
    "@type": "SoftwareApplication",
    name,
    description: metaDescription,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    url: absoluteUrl,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const breadcrumbList: Record<string, unknown> = {
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: toAbsolute(b.path),
    })),
  };

  const graph: Array<Record<string, unknown>> = [softwareApp, breadcrumbList];

  if (faqs && faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.a,
        },
      })),
    });
  }

  if (howTo && howTo.steps.length > 0) {
    graph.push({
      "@type": "HowTo",
      name: howTo.name,
      ...(howTo.description ? { description: howTo.description } : {}),
      step: howTo.steps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.name,
        text: s.text,
      })),
    });
  }

  const jsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return buildSeo({
    title,
    metaDescription,
    canonicalUrl,
    ogImage,
    jsonLd,
  });
}


/** Component form — a no-op renderer kept for ergonomic imports. */
export function SEO(_props: SEOProps) {
  return null;
}
