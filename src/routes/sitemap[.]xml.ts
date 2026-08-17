import { createFileRoute } from "@tanstack/react-router";

import { publicClient } from "@/lib/store.server";

const STATIC_PATHS = [
  "/",
  "/shop",
  "/categories",
  "/custom-printing",
  "/offers",
  "/about",
  "/contact",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const supabase = publicClient();
        const { data: products } = await supabase
          .from("products")
          .select("slug,updated_at")
          .eq("is_active", true);

        const urls = [
          ...STATIC_PATHS.map((path) => `<url><loc>${origin}${path}</loc></url>`),
          ...(products ?? []).map(
            (product) =>
              `<url><loc>${origin}/product/${product.slug}</loc><lastmod>${String(
                product.updated_at,
              ).slice(0, 10)}</lastmod></url>`,
          ),
        ].join("");

        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
          { headers: { "content-type": "application/xml" } },
        );
      },
    },
  },
});
