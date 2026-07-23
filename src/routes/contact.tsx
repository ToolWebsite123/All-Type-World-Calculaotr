import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildSeo } from "@/components/SEO";

const CONTACT_EMAIL = "hello@alltypecalculator.com";

export const Route = createFileRoute("/contact")({
  head: () =>
    buildSeo({
      title: "Contact — All Type Calculator",
      metaDescription:
        "Get in touch with All Type Calculator — report an error, request a new calculator, or share feedback. We read every message.",
      canonicalUrl: "/contact",
    }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <Layout>
      <section className="mx-auto max-w-3xl px-6 pt-6 pb-24">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Contact" }]} />
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Contact
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Found a bug in a calculator? Spotted a math or wording error? Want
          a new calculator added? Send us a note — we read everything.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card/60 p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Email us at</div>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=All%20Type%20Calculator%20feedback`}
                className="mt-1 inline-block font-display text-lg font-semibold text-foreground underline underline-offset-4 hover:text-primary"
              >
                {CONTACT_EMAIL}
              </a>
              <p className="mt-2 text-sm text-muted-foreground">
                Please include the URL of the calculator you're writing
                about and, if it's a bug, the inputs you used so we can
                reproduce it.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-muted-foreground">
          Typical response time is 2–3 business days. We don't run a phone
          line or a live-chat widget — email is the fastest way to reach us.
        </div>
      </section>
    </Layout>
  );
}
