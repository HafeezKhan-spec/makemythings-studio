import { getRequestHeader } from "@tanstack/react-start/server";

import { publicClient } from "./store.server";

export type ShippingAddressInput = {
  full_name: string;
  phone: string;
  house: string;
  street?: string | undefined;
  area?: string | undefined;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export type CartInput = { productId: string; quantity: number }[];

/** Resolves the signed-in user from the bearer token, or null for guests. */
export async function currentUserId(): Promise<string | null> {
  const header = getRequestHeader("authorization");
  const token = header?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await publicClient().auth.getUser(token);
  return data.user?.id ?? null;
}

export type PricedCart = {
  lines: {
    product_id: string;
    product_name: string;
    product_image: string | null;
    unit_price: number;
    quantity: number;
    line_total: number;
  }[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  couponMessage: string | null;
  deliveryCharge: number;
  total: number;
  freeDeliveryThreshold: number | null;
};

/**
 * Server-side pricing. Never trusts prices, discounts or delivery charges
 * coming from the browser — everything is recomputed from the database.
 */
export async function priceCart(
  items: CartInput,
  couponCode?: string | undefined,
  country = "India",
): Promise<PricedCart> {
  const supabase = publicClient();
  const ids = items.map((i) => i.productId);

  const { data: products } = await supabase
    .from("products")
    .select("id,name,price,images,stock")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
    .eq("is_active", true);

  const lines = (products ?? []).flatMap((product) => {
    const item = items.find((i) => i.productId === product.id);
    if (!item) return [];
    const quantity = Math.max(1, Math.min(20, Math.floor(item.quantity)));
    const unitPrice = Number(product.price);
    return [
      {
        product_id: product.id as string,
        product_name: product.name as string,
        product_image: (product.images?.[0] ?? null) as string | null,
        unit_price: unitPrice,
        quantity,
        line_total: Number((unitPrice * quantity).toFixed(2)),
      },
    ];
  });

  const subtotal = Number(lines.reduce((sum, line) => sum + line.line_total, 0).toFixed(2));

  let discount = 0;
  let appliedCode: string | null = null;
  let couponMessage: string | null = null;
  if (couponCode && subtotal > 0) {
    const { data: result } = await supabase.rpc("validate_coupon", {
      _code: couponCode,
      _subtotal: subtotal,
    });
    const coupon = result as { valid: boolean; discount?: number; code?: string; message?: string };
    if (coupon?.valid) {
      discount = Number(coupon.discount ?? 0);
      appliedCode = coupon.code ?? couponCode.toUpperCase();
    } else {
      couponMessage = coupon?.message ?? "Invalid coupon code";
    }
  }

  const { data: settings } = await supabase
    .from("store_settings")
    .select(
      "india_delivery_charge,free_delivery_threshold,express_delivery_charge,international_shipping_enabled",
    )
    .eq("id", 1)
    .maybeSingle();

  const threshold = settings?.free_delivery_threshold
    ? Number(settings.free_delivery_threshold)
    : null;
  const indiaCharge = Number(settings?.india_delivery_charge ?? 0);
  const isIndia = country.trim().toLowerCase() === "india";

  let deliveryCharge = 0;
  if (subtotal > 0) {
    deliveryCharge = isIndia ? indiaCharge : indiaCharge * 4;
    if (threshold && subtotal - discount >= threshold) deliveryCharge = 0;
  }

  const total = Number(Math.max(0, subtotal - discount + deliveryCharge).toFixed(2));

  return {
    lines,
    subtotal,
    discount,
    couponCode: appliedCode,
    couponMessage,
    deliveryCharge,
    total,
    freeDeliveryThreshold: threshold,
  };
}
