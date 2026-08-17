import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Anon-role client for public catalog reads during SSR. RLS still applies.
 */
export function publicClient(): SupabaseClient {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"]!;
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!;

  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input as string, { ...init, headers });
      },
    },
  });
}

export const PRODUCT_COLUMNS =
  "id,name,slug,short_description,description,price,original_price,category_id,images,stock,material,colors,size,production_time,tags,rating,review_count,is_featured,is_trending,is_best_seller,is_new_arrival,created_at,category:categories(name,slug)";

export type ProductFilters = {
  search?: string | undefined;
  category?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  sort?: string | undefined;
  flag?: string | undefined;
  limit?: number | undefined;
};

export async function queryProducts(filters: ProductFilters) {
  const supabase = publicClient();
  let query = supabase.from("products").select(PRODUCT_COLUMNS).eq("is_active", true);

  if (filters.category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.category)
      .maybeSingle();
    query = query.eq("category_id", cat?.id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `name.ilike.${term},short_description.ilike.${term},description.ilike.${term}`,
    );
  }
  if (typeof filters.minPrice === "number") query = query.gte("price", filters.minPrice);
  if (typeof filters.maxPrice === "number") query = query.lte("price", filters.maxPrice);

  if (filters.flag === "featured") query = query.eq("is_featured", true);
  if (filters.flag === "trending") query = query.eq("is_trending", true);
  if (filters.flag === "best-seller") query = query.eq("is_best_seller", true);
  if (filters.flag === "new-arrival") query = query.eq("is_new_arrival", true);
  if (filters.flag === "discounted") query = query.not("original_price", "is", null);

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "rating":
      query = query.order("rating", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query
        .order("is_featured", { ascending: false })
        .order("rating", { ascending: false });
  }

  const { data, error } = await query.limit(filters.limit ?? 60);
  if (error) throw new Error(error.message);
  return data ?? [];
}
