import { createFileRoute } from "@tanstack/react-router";

import { connectMongo } from "@/integrations/mongodb/connect.server";
import { Product } from "@/integrations/mongodb/models";

const STATIC_PATHS = [
  "/",
  "/shop",
  "/categories",
  "/custom-printing",
  "/offers",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/shipping-policy",
  "/refund-policy",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        await connectMongo();
        const products = await Product.find({ isActive: true })
          .select("slug updatedAt")
          .lean();

        const urls = [
          ...STATIC_PATHS.map((path) => `<url><loc>${origin}${path}</loc></url>`),
          ...products.map(
            (product) =>
              `<url><loc>${origin}/product/${product.slug}</loc><lastmod>${String(
                (product as { updatedAt?: Date }).updatedAt ?? new Date(),
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
