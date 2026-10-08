import { Router } from "express";
import type { AppConfig } from "../config";

/**
 * robots.txt + sitemap.xml. The static routes (home, about, services, etc.) are always
 * listed; CMS-driven routes (projects/properties/insights/services) are fetched live from
 * Strapi and merged in. If the CMS is unreachable, the sitemap still returns 200 with the
 * static routes rather than a 500 or an empty file — a slow/down CMS should degrade the
 * sitemap, not take the whole thing offline.
 */

const STATIC_ROUTES = ["/", "/about", "/services", "/projects", "/properties", "/invest", "/insights", "/contact", "/faq", "/privacy", "/terms"];

async function fetchSlugs(cmsUrl: string, collection: string, path: string): Promise<string[]> {
  try {
    const res = await fetch(`${cmsUrl}/api/${collection}?fields[0]=slug&pagination[pageSize]=200`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: unknown };
    const entries = Array.isArray(body.data) ? body.data : [];
    return entries
      // Guard each entry independently — one malformed row (or a bare null, which Strapi can
      // legitimately return for a draft entry with restricted permissions) should be skipped,
      // not take the rest of the collection down with it.
      .filter((entry): entry is { slug?: string; attributes?: { slug?: string } } => typeof entry === "object" && entry !== null)
      .map((entry) => entry.slug ?? entry.attributes?.slug)
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => `${path}/${slug}`);
  } catch (err) {
    console.warn(`[sitemap] could not reach CMS for ${collection}: ${String(err)}`);
    return [];
  }
}

export function createSeoRouter(config: AppConfig): Router {
  const router = Router();

  router.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "Disallow: /contact?", // enquiry links carry query-string context; nothing there is worth indexing separately
        `Sitemap: ${config.siteUrl}/sitemap.xml`,
      ].join("\n")
    );
  });

  router.get("/sitemap.xml", async (_req, res) => {
    const [projects, properties, insights, services] = await Promise.all([
      fetchSlugs(config.cmsUrl, "projects", "/projects"),
      fetchSlugs(config.cmsUrl, "properties", "/properties"),
      fetchSlugs(config.cmsUrl, "insights", "/insights"),
      fetchSlugs(config.cmsUrl, "services", "/services"),
    ]);

    const routes = [...STATIC_ROUTES, ...projects, ...properties, ...insights, ...services];
    const urlset = routes
      .map((route) => `  <url><loc>${config.siteUrl}${route}</loc></url>`)
      .join("\n");

    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlset}\n</urlset>\n`);
  });

  return router;
}
