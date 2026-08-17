import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { publicClient, queryProducts, PRODUCT_COLUMNS } from "./store.server";

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().optional(),
        category: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        sort: z.string().optional(),
        flag: z.string().optional(),
        limit: z.number().max(100).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => queryProducts(data));

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: product } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!product) return null;

    const { data: reviews } = await supabase
      .from("reviews")
      .select("id,author_name,rating,body,created_at")
      .eq("product_id", product.id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: related } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("is_active", true)
      .eq("category_id", product.category_id ?? "")
      .neq("id", product.id)
      .limit(4);

    return { product, reviews: reviews ?? [], related: related ?? [] };
  });

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient()
    .from("categories")
    .select("id,name,slug,description,image_url,sort_order")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
});

export const listBanners = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient()
    .from("banners")
    .select("id,heading,description,image_url,cta_label,cta_link")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
});

export const getStoreSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient()
    .from("store_settings")
    .select(
      "business_name,business_email,business_phone,business_address,instagram_url,facebook_url,whatsapp_number,currency,india_delivery_charge,free_delivery_threshold,express_delivery_charge,international_shipping_enabled,gst_percent",
    )
    .eq("id", 1)
    .maybeSingle();
  return data;
});
