import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { currentUserId, priceCart } from "./orders.server";

const cartSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(20) }))
    .max(50),
  couponCode: z.string().trim().max(40).optional(),
  country: z.string().trim().max(60).optional(),
});

const addressSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(20),
  house: z.string().trim().min(1).max(120),
  street: z.string().trim().max(160).optional(),
  area: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  country: z.string().trim().min(1).max(60),
  pincode: z.string().trim().min(4).max(12),
});

export const quoteCart = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cartSchema.parse(input))
  .handler(async ({ data }) => priceCart(data.items, data.couponCode, data.country ?? "India"));

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    cartSchema
      .extend({
        customer: z.object({
          name: z.string().trim().min(2).max(100),
          email: z.string().trim().email().max(160),
          phone: z.string().trim().min(6).max(20),
        }),
        address: addressSchema,
        notes: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await currentUserId();
    const priced = await priceCart(data.items, data.couponCode, data.address.country);
    if (!priced.lines.length) throw new Error("Your cart is empty or contains unavailable items.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const estimated = new Date();
    estimated.setDate(estimated.getDate() + 7);

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.customer.name,
        customer_email: data.customer.email,
        customer_phone: data.customer.phone,
        shipping_address: data.address,
        subtotal: priced.subtotal,
        discount: priced.discount,
        coupon_code: priced.couponCode,
        delivery_charge: priced.deliveryCharge,
        total: priced.total,
        payment_status: "pending",
        status: "payment_pending",
        estimated_delivery: estimated.toISOString().slice(0, 10),
        notes: data.notes ?? null,
      })
      .select("id,order_number")
      .single();

    if (error || !order) throw new Error(error?.message ?? "Could not create the order.");

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      priced.lines.map((line) => ({
        order_id: order.id,
        product_id: line.product_id,
        product_name: line.product_name,
        product_image: line.product_image,
        unit_price: line.unit_price,
        quantity: line.quantity,
        line_total: line.line_total,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    return { orderId: order.id as string, orderNumber: order.order_number as string };
  });

export const getOrder = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (!order) return null;

    const userId = await currentUserId();
    // Guests may open the confirmation page for the order they just placed;
    // signed-in users may only read their own orders.
    if (order.user_id && order.user_id !== userId) return null;
    return order;
  });

export const submitCustomRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(100),
        email: z.string().trim().email().max(160),
        phone: z.string().trim().max(20).optional(),
        description: z.string().trim().min(10).max(2000),
        size: z.string().trim().max(80).optional(),
        quantity: z.number().int().min(1).max(500),
        material: z.string().trim().max(80).optional(),
        notes: z.string().trim().max(1000).optional(),
        model_file_url: z.string().trim().max(500).optional(),
        reference_image_url: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await currentUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("custom_requests").insert({
      user_id: userId,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      description: data.description,
      size: data.size ?? null,
      quantity: data.quantity,
      material: data.material ?? null,
      notes: data.notes ?? null,
      model_file_url: data.model_file_url ?? null,
      reference_image_url: data.reference_image_url ?? null,
      status: "new",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
