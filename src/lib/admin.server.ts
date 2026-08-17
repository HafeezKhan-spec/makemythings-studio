import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error("Could not verify permissions");
  if (!data) throw new Error("Forbidden: admin access required");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function loadDashboard(supabase: SupabaseClient) {
  const [orders, products, requests, customers] = await Promise.all([
    supabase
      .from("orders")
      .select("id,order_number,total,status,payment_status,created_at,customer_name")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("products").select("id,stock,is_active"),
    supabase.from("custom_requests").select("id,status"),
    supabase.from("profiles").select("id"),
  ]);

  const orderRows = orders.data ?? [];
  const paid = orderRows.filter((o) => o.payment_status === "paid");

  return {
    revenue: paid.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
    orderCount: orderRows.length,
    pendingOrders: orderRows.filter((o) => o.status === "pending").length,
    productCount: (products.data ?? []).length,
    lowStock: (products.data ?? []).filter((p) => Number(p.stock ?? 0) <= 3).length,
    openRequests: (requests.data ?? []).filter((r) => r.status === "pending").length,
    customerCount: (customers.data ?? []).length,
    recentOrders: orderRows.slice(0, 8),
  };
}

/** Drops undefined keys so exactOptionalPropertyTypes-safe payloads reach Supabase. */
export function clean<T extends object>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as never;
}
