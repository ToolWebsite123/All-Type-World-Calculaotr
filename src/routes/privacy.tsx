import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildSeo } from "@/components/SEO";

export const Route = createFileRoute("/privacy")({
  head: () =>
    buildSeo({
      title: "Privacy Policy — All Type Calculator",
      metaDescription:
        "How All Type Calculator handles your data: no accounts, no tracking pixels, calculations run entirely in your browser, and nothing is ever sold.",
      canonicalUrl: "/privacy",
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const updated = "January 2026";
  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-6 pt-6 pb-24">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Privacy" }]} />
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              What we collect
            </h2>
            <p>
              All Type Calculator does not require an account. We do not ask
              for your name, email address, or any other personal information
              to use any calculator on this site. There are no user
              registrations, comments, or profiles.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Calculations stay on your device
            </h2>
            <p>
              Every calculator on this site runs entirely in your browser as
              JavaScript. The numbers you type into a calculator, the results
              it produces, and the history panel are never sent to our
              servers. If you clear your browser storage, calculator history
              and any UI preferences (such as light/dark mode) are erased.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Cookies and local storage
            </h2>
            <p>
              We use <strong>localStorage</strong> only to remember your
              light/dark theme preference so you don't have to set it on
              every visit. We do not set any tracking cookies, and we do not
              use third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Analytics
            </h2>
            <p>
              Our hosting provider records standard web server logs
              (approximate location, request time, user agent) for
              operational purposes such as protecting the site from abuse
              and diagnosing outages. These logs are not linked to any
              personal identity and are not used for advertising.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              What we never do
            </h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>We do not sell, rent, or share your data with third parties.</li>
              <li>We do not run third-party ad networks on this site.</li>
              <li>We do not embed social-media tracking pixels.</li>
              <li>We do not fingerprint your browser for tracking.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Changes
            </h2>
            <p>
              If this policy changes, the "Last updated" date at the top of
              the page will change too. Material changes will be described
              in a short note on the homepage for a reasonable time.
            </p>
          </section>
        </div>
      </section>
    </Layout>
  );
}
