import { getRequestHeader } from "@tanstack/react-start/server";

import { connectMongo } from "@/integrations/mongodb/connect.server";
import { Coupon, Product, StoreSettings } from "@/integrations/mongodb/models";
import { verifyAccessToken } from "./auth.server";

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

export async function currentUserId(): Promise<string | null> {
  const header = getRequestHeader("authorization");
  const token = header?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const payload = await verifyAccessToken(token);
    return payload.sub;
  } catch {
    return null;
  }
}

export async function currentUserPayload() {
  const header = getRequestHeader("authorization");
  const token = header?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
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

export async function validateCoupon(code: string, subtotal: number) {
  await connectMongo();
  const coupon = await Coupon.findOne({
    code: code.toUpperCase().trim(),
    isActive: true,
  }).lean();

  if (!coupon) return { valid: false as const, message: "Invalid coupon code" };
  if (coupon.startsAt && coupon.startsAt > new Date()) {
    return { valid: false as const, message: "This coupon is not active yet" };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { valid: false as const, message: "This coupon has expired" };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false as const, message: "This coupon has reached its usage limit" };
  }
  if (subtotal < coupon.minOrderValue) {
    return {
      valid: false as const,
      message: `Minimum order value of ₹${coupon.minOrderValue} required`,
    };
  }

  let discount =
    coupon.discountType === "percentage"
      ? Math.round((subtotal * coupon.discountValue) / 100)
      : coupon.discountValue;

  if (coupon.maxDiscount != null && discount > coupon.maxDiscount) {
    discount = coupon.maxDiscount;
  }
  if (discount > subtotal) discount = subtotal;

  return {
    valid: true as const,
    code: coupon.code,
    discount: Number(discount.toFixed(2)),
    description: coupon.description,
  };
}

export async function priceCart(
  items: CartInput,
  couponCode?: string | undefined,
  country = "India",
): Promise<PricedCart> {
  await connectMongo();

  const merged = new Map<string, number>();
  for (const item of items) {
    const qty = Math.max(1, Math.min(20, Math.floor(item.quantity)));
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + qty);
  }
  const normalizedItems = [...merged.entries()].map(([productId, quantity]) => ({
    productId,
    quantity: Math.min(20, quantity),
  }));

  const ids = normalizedItems.map((i) => i.productId);
  const products = await Product.find({
    _id: { $in: ids },
    isActive: true,
  }).lean();

  if (products.length !== normalizedItems.length) {
    throw new Error("One or more products in your cart are no longer available.");
  }

  const lines = products.map((product) => {
    const item = normalizedItems.find((i) => i.productId === String(product._id));
    if (!item) throw new Error("Cart item mismatch");
    const quantity = item.quantity;
    if (product.stock > 0 && quantity > product.stock) {
      throw new Error(`Only ${product.stock} unit(s) of "${product.name}" are available.`);
    }
    const unitPrice = Number(product.price);
    return {
      product_id: String(product._id),
      product_name: product.name,
      product_image: product.images?.[0] ?? null,
      unit_price: unitPrice,
      quantity,
      line_total: Number((unitPrice * quantity).toFixed(2)),
    };
  });

  const subtotal = Number(lines.reduce((sum, line) => sum + line.line_total, 0).toFixed(2));

  let discount = 0;
  let appliedCode: string | null = null;
  let couponMessage: string | null = null;

  if (couponCode && subtotal > 0) {
    const result = await validateCoupon(couponCode, subtotal);
    if (result.valid) {
      discount = result.discount;
      appliedCode = result.code;
    } else {
      couponMessage = result.message;
    }
  }

  const settings = await StoreSettings.findOne({ key: "default" }).lean();
  const threshold = settings?.freeDeliveryThreshold ?? null;
  const indiaCharge = Number(settings?.indiaDeliveryCharge ?? 80);
  const isIndia = country.trim().toLowerCase() === "india";

  if (!isIndia && settings?.internationalShippingEnabled === false) {
    throw new Error("International shipping is not available at the moment.");
  }

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

export function generateOrderNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `MMT${yy}${mm}${dd}${rand}`;
}
