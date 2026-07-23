import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { CATEGORIES } from "@/lib/calculator-catalog";

const BASE_URL = "https://alltypecalculator.com";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const paths = new Set<string>();
        paths.add("/");
        paths.add("/about");
        paths.add("/contact");
        paths.add("/privacy");
        paths.add("/terms");
        paths.add("/calculators");

        for (const cat of Object.values(CATEGORIES)) {
          paths.add(`/calculators/${cat.slug}`);
          for (const section of cat.sections) {
            for (const item of section.items) {
              if (item.href) paths.add(item.href);
            }
          }
        }

        const lastmod = new Date().toISOString().slice(0, 10);
        const urls = Array.from(paths)
          .map(
            (p) =>
              `  <url>\n    <loc>${BASE_URL}${p}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
