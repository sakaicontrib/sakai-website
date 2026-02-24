import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const fallback = new URL("https://sakaicontrib.github.io");
  const origin = site ?? fallback;
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const sitemapUrl = new URL(`${basePath}/sitemap-index.xml`, origin).toString();

  const body = `User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
};
