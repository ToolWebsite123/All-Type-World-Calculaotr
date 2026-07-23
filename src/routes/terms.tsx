import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildSeo } from "@/components/SEO";

export const Route = createFileRoute("/terms")({
  head: () =>
    buildSeo({
      title: "Terms of Use — All Type Calculator",
      metaDescription:
        "Terms of use for All Type Calculator. Our calculators are for informational purposes only and are not a substitute for professional advice.",
      canonicalUrl: "/terms",
    }),
  component: TermsPage,
});

function TermsPage() {
  const updated = "January 2026";
  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-6 pt-6 pb-24">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Terms" }]} />
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Acceptance
            </h2>
            <p>
              By accessing All Type Calculator you agree to these terms. If
              you don't agree, please don't use the site.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Informational use only
            </h2>
            <p>
              The calculators, formulas, and explanations on this site are
              provided for general informational and educational purposes.
              They are not a substitute for professional advice — financial,
              medical, legal, engineering, tax, or otherwise. Do not make an
              important decision (a loan, a diet, a dosage, a construction
              spec, a tax filing) based solely on a result you got here.
              Consult a qualified professional for advice specific to your
              situation.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              No warranty
            </h2>
            <p>
              We work hard to keep every calculator accurate, but we cannot
              guarantee results are free of error. The site is provided
              "as is" and "as available," without warranties of any kind,
              express or implied, including fitness for a particular
              purpose. To the maximum extent permitted by law, we are not
              liable for any loss, damage, or consequence arising from your
              use of, or reliance on, anything on this site.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Acceptable use
            </h2>
            <p>
              You agree not to abuse the site — no automated scraping at a
              rate that degrades service for other users, no attempts to
              probe or breach security, no republishing large portions of
              the site's original written content as your own.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Intellectual property
            </h2>
            <p>
              The written explanations, worked examples, layout, and
              branding on this site are the property of All Type Calculator.
              You are free to quote a short passage with attribution and a
              link back. Wholesale copying is not permitted.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Changes
            </h2>
            <p>
              We may update these terms as the site evolves. The "Last
              updated" date will always reflect the current version.
            </p>
          </section>
        </div>
      </section>
    </Layout>
  );
}
