import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuth } from "@/integrations/mongodb/auth-middleware";
import { connectMongo } from "@/integrations/mongodb/connect.server";
import {
  Banner,
  Category,
  Coupon,
  CustomRequest,
  Order,
  Product,
  Review,
  StoreSettings,
  User,
} from "@/integrations/mongodb/models";
import { assertAdmin, clean, isNewAdminOrder, isNewCustomRequest, loadDashboard, slugify } from "./admin.server";
import { isConfiguredAdminEmail } from "./admin-roles.server";
import { recalculateProductRatings } from "./reviews.server";
import type { AdminOrderDetail } from "./order-fulfillment";

function mapOrderItemsForClient(
  items: Array<{
    _id?: unknown;
    productId?: unknown;
    productName?: string;
    productImage?: string;
    unitPrice?: number;
    quantity?: number;
    lineTotal?: number;
  }> | undefined,
) {
  return (items ?? []).map((item) => ({
    id: String(item._id),
    product_id: item.productId ? String(item.productId) : null,
    product_name: String(item.productName ?? ""),
    product_image: item.productImage ?? null,
    unit_price: Number(item.unitPrice ?? 0),
    quantity: Number(item.quantity ?? 0),
    line_total: Number(item.lineTotal ?? 0),
  }));
}

function mapProductAdmin(p: Record<string, unknown>) {
  return {
    id: String(p._id),
    name: p.name,
    slug: p.slug,
    short_description: p.shortDescription,
    description: p.description,
    price: p.price,
    original_price: p.originalPrice,
    category_id: p.categoryId ? String(p.categoryId) : null,
    images: p.images,
    videos: p.videos ?? [],
    stock: p.stock,
    material: p.material,
    colors: p.colors,
    size: p.size,
    production_time: p.productionTime,
    tags: p.tags,
    is_featured: p.isFeatured,
    is_trending: p.isTrending,
    is_best_seller: p.isBestSeller,
    is_new_arrival: p.isNewArrival,
    is_active: p.isActive,
  };
}

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => ({
    isAdmin: context.roles.includes("admin"),
  }));

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.roles);
    return loadDashboard();
  });

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const rows = await Product.find().sort({ createdAt: -1 }).lean();
    return rows.map(mapProductAdmin);
  });

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().optional(),
        name: z.string().trim().min(2).max(160),
        short_description: z.string().trim().max(300).optional(),
        description: z.string().trim().max(4000).optional(),
        price: z.number().min(0).max(1000000),
        original_price: z.number().min(0).max(1000000).nullable().optional(),
        category_id: z.string().nullable().optional(),
        images: z.array(z.string().max(600)).max(10).optional(),
        videos: z.array(z.string().max(600)).max(3).optional(),
        stock: z.number().int().min(0).max(100000),
        material: z.string().trim().max(80).optional(),
        colors: z.array(z.string().max(40)).max(20).optional(),
        size: z.string().trim().max(80).optional(),
        production_time: z.string().trim().max(80).optional(),
        tags: z.array(z.string().max(40)).max(20).optional(),
        is_featured: z.boolean().optional(),
        is_trending: z.boolean().optional(),
        is_best_seller: z.boolean().optional(),
        is_new_arrival: z.boolean().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();

    const payload = {
      name: data.name,
      slug: slugify(data.name),
      shortDescription: data.short_description ?? "",
      description: data.description ?? "",
      price: data.price,
      originalPrice: data.original_price ?? null,
      categoryId: data.category_id || null,
      images: data.images ?? [],
      videos: data.videos ?? [],
      stock: data.stock,
      material: data.material ?? "",
      colors: data.colors ?? [],
      size: data.size ?? "",
      productionTime: data.production_time ?? "",
      tags: data.tags ?? [],
      isFeatured: data.is_featured ?? false,
      isTrending: data.is_trending ?? false,
      isBestSeller: data.is_best_seller ?? false,
      isNewArrival: data.is_new_arrival ?? false,
      isActive: data.is_active ?? true,
    };

    if (data.id) {
      await Product.updateOne({ _id: data.id }, payload);
      return { id: data.id };
    }
    const created = await Product.create(payload);
    return { id: String(created._id) };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    await Product.deleteOne({ _id: data.id });
    return { ok: true };
  });

export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const rows = await Category.find().sort({ sortOrder: 1 }).lean();
    return rows.map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      description: c.description,
      image_url: c.imageUrl,
      sort_order: c.sortOrder,
      is_active: c.isActive,
    }));
  });

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().optional(),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).optional(),
        image_url: z.string().trim().max(600).optional(),
        sort_order: z.number().int().min(0).max(999).optional(),
        is_active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const payload = {
      name: data.name,
      slug: slugify(data.name),
      description: data.description ?? "",
      imageUrl: data.image_url ?? "",
      sortOrder: data.sort_order ?? 0,
      isActive: data.is_active ?? true,
    };
    if (data.id) {
      await Category.updateOne({ _id: data.id }, payload);
      return { id: data.id };
    }
    const created = await Category.create(payload);
    return { id: String(created._id) };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    await Category.deleteOne({ _id: data.id });
    return { ok: true };
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const rows = await Order.find().sort({ createdAt: -1 }).limit(200).lean();
    return rows.map((o) => ({
      id: String(o._id),
      order_number: o.orderNumber,
      customer_email: o.customerEmail,
      customer_name: o.customerName,
      customer_phone: o.customerPhone,
      total: Number(o.total ?? 0),
      status: String(o.status ?? ""),
      payment_status: String(o.paymentStatus ?? ""),
      payment_type: o.paymentType ?? "prepaid",
      admin_acknowledged: Boolean(o.adminAcknowledged),
      is_new: isNewAdminOrder(o),
      awb_number: o.awbNumber ?? "",
      courier_partner: o.courierPartner ?? "",
      created_at: (o as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      items: mapOrderItemsForClient(o.items),
    }));
  });

async function loadAdminRequestNotifications() {
  const rows = await CustomRequest.find({
    adminAcknowledged: { $ne: true },
    status: { $nin: ["completed", "rejected"] },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  return {
    count: rows.length,
    requests: rows.map((r) => ({
      id: String(r._id),
      name: r.name,
      email: r.email,
      description: String(r.description ?? "").slice(0, 120),
      created_at: (r as { createdAt?: Date }).createdAt?.toISOString(),
    })),
  };
}

export const getAdminNotifications = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.roles);
    await connectMongo();

    const orderNotifications = await (async () => {
      const count = await Order.countDocuments({
        adminAcknowledged: { $ne: true },
        status: { $nin: ["delivered", "cancelled"] },
        paymentStatus: { $ne: "refunded" },
        $or: [
          { paymentStatus: "paid" },
          { status: "payment_pending" },
          { paymentStatus: "pending" },
          { paymentStatus: "processing" },
          { paymentStatus: "failed" },
          { paymentStatus: "cancelled" },
        ],
      });
      const recent = await Order.find({
        adminAcknowledged: { $ne: true },
        status: { $nin: ["delivered", "cancelled"] },
        paymentStatus: { $ne: "refunded" },
        $or: [
          { paymentStatus: "paid" },
          { status: "payment_pending" },
          { paymentStatus: "pending" },
          { paymentStatus: "processing" },
          { paymentStatus: "failed" },
          { paymentStatus: "cancelled" },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      return {
        count,
        orders: recent.map((o) => ({
          id: String(o._id),
          order_number: o.orderNumber,
          customer_name: o.customerName,
          total: o.total,
          created_at: (o as { createdAt?: Date }).createdAt?.toISOString(),
        })),
      };
    })();

    const requestNotifications = await loadAdminRequestNotifications();

    return {
      count: orderNotifications.count + requestNotifications.count,
      orderCount: orderNotifications.count,
      requestCount: requestNotifications.count,
      orders: orderNotifications.orders,
      requests: requestNotifications.requests,
    };
  });

async function mapAdminOrderDetail(order: Record<string, unknown>): Promise<AdminOrderDetail> {
  await connectMongo();
  const settings = await StoreSettings.findOne({ key: "default" }).lean();
  const gstPercent = Number(settings?.gstPercent ?? 0);
  const subtotal = Number(order.subtotal ?? 0);
  const discount = Number(order.discount ?? 0);
  const taxable = Math.max(0, subtotal - discount);
  const gstAmount = Number(((taxable * gstPercent) / 100).toFixed(2));

  const productIds = (order.items as Array<{ productId?: unknown }> ?? [])
    .map((i) => i.productId)
    .filter(Boolean);
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).select("slug").lean()
    : [];
  const slugById = new Map(products.map((p) => [String(p._id), p.slug]));

  const addr = (order.shippingAddress ?? {}) as Record<string, string>;

  return {
    id: String(order._id),
    order_number: String(order.orderNumber),
    invoice_number: `INV-${String(order.orderNumber)}`,
    customer_name: String(order.customerName),
    customer_email: String(order.customerEmail),
    customer_phone: String(order.customerPhone),
    shipping_address: {
      full_name: addr.full_name ?? String(order.customerName),
      phone: addr.phone ?? String(order.customerPhone),
      house: addr.house ?? "",
      street: addr.street,
      area: addr.area,
      landmark: addr.landmark,
      city: addr.city ?? "",
      state: addr.state ?? "",
      country: addr.country ?? "India",
      pincode: addr.pincode ?? "",
    },
    items: ((order.items as Array<Record<string, unknown>>) ?? []).map((item) => ({
      id: String(item._id),
      product_id: item.productId ? String(item.productId) : null,
      product_name: String(item.productName),
      product_image: (item.productImage as string) ?? null,
      sku: item.productId ? (slugById.get(String(item.productId)) ?? null) : null,
      unit_price: Number(item.unitPrice),
      quantity: Number(item.quantity),
      line_total: Number(item.lineTotal),
    })),
    subtotal,
    discount,
    coupon_code: (order.couponCode as string) ?? null,
    delivery_charge: Number(order.deliveryCharge ?? 0),
    gst_percent: gstPercent,
    gst_amount: gstAmount,
    total: Number(order.total),
    payment_status: String(order.paymentStatus),
    payment_type: String(order.paymentType ?? "prepaid"),
    payment_provider: (order.paymentProvider as string) ?? null,
    payment_reference: (order.paymentReference as string) ?? null,
    razorpay_order_id: (order.razorpayOrderId as string) ?? null,
    status: String(order.status),
    courier_partner: String(order.courierPartner ?? ""),
    awb_number: String(order.awbNumber ?? ""),
    package_weight: String(order.packageWeight ?? ""),
    package_count: Number(order.packageCount ?? 1),
    shipping_method: String(order.shippingMethod ?? "Standard"),
    shipping_notes: String(order.shippingNotes ?? ""),
    admin_acknowledged: Boolean(order.adminAcknowledged),
    is_new: isNewAdminOrder(order as { paymentStatus?: string; status?: string; adminAcknowledged?: boolean }),
    created_at: (order as { createdAt?: Date }).createdAt?.toISOString() ?? null,
    notes: String(order.notes ?? ""),
    store: {
      business_name: String(settings?.businessName ?? "MakeMyThing.in"),
      business_email: String(settings?.businessEmail ?? "hello@MakeMyThing.in"),
      business_phone: String(settings?.businessPhone ?? ""),
      business_address: String(settings?.businessAddress ?? "Bengaluru, India"),
    },
  };
}

export const adminGetOrder = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const order = await Order.findById(data.id).lean();
    if (!order) throw new Error("Order not found");
    return mapAdminOrderDetail(order as never);
  });

export const adminAcknowledgeOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const order = await Order.findById(data.id).lean();
    if (!order) throw new Error("Order not found");
    if (order.paymentStatus !== "paid") {
      throw new Error("Only paid orders can be acknowledged. Unpaid orders stay in the queue until payment completes.");
    }
    await Order.updateOne({ _id: data.id }, { $set: { adminAcknowledged: true } });
    return { ok: true };
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        status: z
          .enum([
            "pending",
            "payment_pending",
            "paid",
            "processing",
            "printing",
            "quality_check",
            "packed",
            "shipped",
            "out_for_delivery",
            "delivered",
            "cancelled",
          ])
          .optional(),
        payment_status: z.enum(["pending", "failed", "cancelled", "expired", "refunded"]).optional(),
        courier_partner: z.string().trim().max(80).optional(),
        awb_number: z.string().trim().max(80).optional(),
        package_weight: z.string().trim().max(40).optional(),
        package_count: z.number().int().min(1).max(99).optional(),
        shipping_method: z.string().trim().max(80).optional(),
        shipping_notes: z.string().trim().max(500).optional(),
        admin_acknowledged: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();

    const existing = await Order.findById(data.id).lean();
    if (!existing) throw new Error("Order not found");

    const FULFILLMENT_STATUSES = [
      "paid",
      "processing",
      "printing",
      "quality_check",
      "packed",
      "shipped",
      "out_for_delivery",
      "delivered",
    ] as const;

    if (data.payment_status === "paid" && existing.paymentStatus !== "paid") {
      throw new Error(
        "Cannot mark unpaid orders as paid manually. Payment must be verified through Razorpay.",
      );
    }

    if (
      data.status &&
      FULFILLMENT_STATUSES.includes(data.status as typeof FULFILLMENT_STATUSES[number]) &&
      existing.paymentStatus !== "paid"
    ) {
      throw new Error("Fulfillment status cannot advance until payment is completed.");
    }

    const update: Record<string, unknown> = {};
    if (data.status) update.status = data.status;
    if (data.payment_status && data.payment_status !== "paid") {
      update.paymentStatus = data.payment_status;
    }
    if (data.courier_partner !== undefined) update.courierPartner = data.courier_partner;
    if (data.awb_number !== undefined) update.awbNumber = data.awb_number;
    if (data.package_weight !== undefined) update.packageWeight = data.package_weight;
    if (data.package_count !== undefined) update.packageCount = data.package_count;
    if (data.shipping_method !== undefined) update.shippingMethod = data.shipping_method;
    if (data.shipping_notes !== undefined) update.shippingNotes = data.shipping_notes;
    if (data.admin_acknowledged !== undefined) update.adminAcknowledged = data.admin_acknowledged;

    if (data.status === "cancelled" && existing.paymentStatus === "paid" && existing.status !== "cancelled") {
      const { restoreOrderStock } = await import("./payments.server");
      await restoreOrderStock(data.id);
      if (existing.couponCode) {
        await Coupon.updateOne({ code: existing.couponCode }, { $inc: { usedCount: -1 } });
      }
    }

    await Order.updateOne({ _id: data.id }, update);

    if (data.status && data.status !== existing.status) {
      const { orderStatusEmailHtml, sendTransactionalEmail } = await import("./transactional-email.server");
      await sendTransactionalEmail({
        to: existing.customerEmail,
        subject: `Order ${existing.orderNumber} — status update`,
        html: orderStatusEmailHtml(existing as never, `Your order status is now: ${data.status.replace(/_/g, " ")}.`),
      });
    }

    return { ok: true };
  });

export const adminListRequests = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const rows = await CustomRequest.find().sort({ createdAt: -1 }).limit(200).lean();
    return rows.map((r) => ({
      id: String(r._id),
      name: r.name,
      email: r.email,
      phone: r.phone ?? "",
      description: r.description,
      status: r.status,
      quoted_price: r.quotedPrice,
      quote_message: r.quoteMessage ?? "",
      quote_sent_at: (r as { quoteSentAt?: Date }).quoteSentAt?.toISOString() ?? null,
      quote_seen_by_user: Boolean(r.quoteSeenByUser),
      model_file_url: r.modelFileUrl ?? "",
      reference_image_url: r.referenceImageUrl ?? "",
      size: r.size ?? "",
      quantity: Number(r.quantity ?? 1),
      material: r.material ?? "",
      notes: r.notes ?? "",
      created_at: (r as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      admin_acknowledged: Boolean(r.adminAcknowledged),
      is_new: isNewCustomRequest(r),
    }));
  });

export const adminAcknowledgeRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    await CustomRequest.updateOne({ _id: data.id }, { $set: { adminAcknowledged: true } });
    return { ok: true };
  });

export const adminSendRequestQuote = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        quoted_price: z.number().min(1).max(1000000),
        quote_message: z.string().trim().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const request = await CustomRequest.findById(data.id);
    if (!request) throw new Error("Request not found");

    await CustomRequest.updateOne(
      { _id: data.id },
      {
        $set: {
          quotedPrice: data.quoted_price,
          quoteMessage: data.quote_message,
          quoteSentAt: new Date(),
          quoteSeenByUser: false,
          status: "quote_sent",
          adminAcknowledged: true,
        },
      },
    );

    const { customQuoteEmailHtml, sendTransactionalEmail } = await import(
      "./transactional-email.server"
    );
    await sendTransactionalEmail({
      to: request.email,
      subject: "Your MakeMyThing custom print quote is ready",
      html: customQuoteEmailHtml({
        customerName: request.name,
        description: request.description,
        quotedPrice: data.quoted_price,
        quoteMessage: data.quote_message,
      }),
    });

    return { ok: true };
  });

export const adminUpdateRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string(),
        status: z
          .enum([
            "new",
            "reviewing",
            "quote_sent",
            "customer_approved",
            "in_production",
            "completed",
            "rejected",
          ])
          .optional(),
        quoted_price: z.number().min(0).max(1000000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const update: Record<string, unknown> = { adminAcknowledged: true };
    if (data.status) update.status = data.status;
    if (data.quoted_price !== undefined) update.quotedPrice = data.quoted_price;
    await CustomRequest.updateOne({ _id: data.id }, update);
    return { ok: true };
  });

export const adminListCoupons = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const rows = await Coupon.find().sort({ createdAt: -1 }).lean();
    return rows.map((c) => ({
      id: String(c._id),
      code: c.code,
      discount_type: c.discountType,
      discount_value: c.discountValue,
      min_order_value: c.minOrderValue,
      used_count: c.usedCount,
    }));
  });

export const adminSaveCoupon = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().optional(),
        code: z.string().trim().min(3).max(30),
        discount_type: z.enum(["percentage", "fixed"]),
        discount_value: z.number().min(0).max(100000),
        min_order_value: z.number().min(0).max(1000000).optional(),
        max_discount: z.number().min(0).max(1000000).nullable().optional(),
        usage_limit: z.number().int().min(0).max(100000).nullable().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const payload = {
      code: data.code.toUpperCase(),
      discountType: data.discount_type,
      discountValue: data.discount_value,
      minOrderValue: data.min_order_value ?? 0,
      maxDiscount: data.max_discount ?? null,
      usageLimit: data.usage_limit ?? null,
      isActive: data.is_active ?? true,
    };
    if (data.id) {
      await Coupon.updateOne({ _id: data.id }, payload);
      return { id: data.id };
    }
    const created = await Coupon.create(payload);
    return { id: String(created._id) };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    await Coupon.deleteOne({ _id: data.id });
    return { ok: true };
  });

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const row = await StoreSettings.findOne({ key: "default" }).lean();
    if (!row) return null;
    return {
      business_name: row.businessName,
      business_email: row.businessEmail,
      business_phone: row.businessPhone,
      business_address: row.businessAddress,
      whatsapp_number: row.whatsappNumber,
      instagram_url: row.instagramUrl,
      facebook_url: row.facebookUrl,
      currency: row.currency,
      india_delivery_charge: row.indiaDeliveryCharge,
      free_delivery_threshold: row.freeDeliveryThreshold,
      express_delivery_charge: row.expressDeliveryCharge,
      international_shipping_enabled: row.internationalShippingEnabled,
      gst_percent: row.gstPercent,
    };
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        business_name: z.string().trim().max(120).optional(),
        business_email: z.string().trim().email().max(160).optional(),
        business_phone: z.string().trim().max(30).optional(),
        whatsapp_number: z.string().trim().max(30).optional(),
        business_address: z.string().trim().max(400).optional(),
        instagram_url: z.string().trim().max(300).optional(),
        facebook_url: z.string().trim().max(300).optional(),
        currency: z.string().trim().max(10).optional(),
        india_delivery_charge: z.number().min(0).max(100000).optional(),
        free_delivery_threshold: z.number().min(0).max(1000000).nullable().optional(),
        express_delivery_charge: z.number().min(0).max(100000).optional(),
        international_shipping_enabled: z.boolean().optional(),
        gst_percent: z.number().min(0).max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    await StoreSettings.updateOne(
      { key: "default" },
      {
        ...(data.business_name !== undefined ? { businessName: data.business_name } : {}),
        ...(data.business_email !== undefined ? { businessEmail: data.business_email } : {}),
        ...(data.business_phone !== undefined ? { businessPhone: data.business_phone } : {}),
        ...(data.whatsapp_number !== undefined ? { whatsappNumber: data.whatsapp_number } : {}),
        ...(data.business_address !== undefined ? { businessAddress: data.business_address } : {}),
        ...(data.instagram_url !== undefined ? { instagramUrl: data.instagram_url } : {}),
        ...(data.facebook_url !== undefined ? { facebookUrl: data.facebook_url } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.india_delivery_charge !== undefined
          ? { indiaDeliveryCharge: data.india_delivery_charge }
          : {}),
        ...(data.free_delivery_threshold !== undefined
          ? { freeDeliveryThreshold: data.free_delivery_threshold }
          : {}),
        ...(data.express_delivery_charge !== undefined
          ? { expressDeliveryCharge: data.express_delivery_charge }
          : {}),
        ...(data.international_shipping_enabled !== undefined
          ? { internationalShippingEnabled: data.international_shipping_enabled }
          : {}),
        ...(data.gst_percent !== undefined ? { gstPercent: data.gst_percent } : {}),
      },
    );
    return { ok: true };
  });

export const adminListBanners = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const rows = await Banner.find().sort({ sortOrder: 1 }).lean();
    return rows.map((b) => ({
      id: String(b._id),
      heading: b.heading,
      description: b.description,
      image_url: b.imageUrl,
      cta_label: b.ctaLabel,
      cta_link: b.ctaLink,
      sort_order: b.sortOrder,
      is_active: b.isActive,
    }));
  });

export const adminSaveBanner = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().optional(),
        heading: z.string().trim().min(2).max(160),
        description: z.string().trim().max(400).optional(),
        image_url: z.string().trim().max(600).optional(),
        cta_label: z.string().trim().max(60).optional(),
        cta_link: z.string().trim().max(300).optional(),
        sort_order: z.number().int().min(0).max(999).optional(),
        is_active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const payload = {
      heading: data.heading,
      description: data.description ?? "",
      imageUrl: data.image_url ?? "",
      ctaLabel: data.cta_label ?? "",
      ctaLink: data.cta_link ?? "",
      sortOrder: data.sort_order ?? 0,
      isActive: data.is_active ?? true,
    };
    if (data.id) {
      await Banner.updateOne({ _id: data.id }, payload);
      return { id: data.id };
    }
    const created = await Banner.create(payload);
    return { id: String(created._id) };
  });

export const adminDeleteBanner = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    await Banner.deleteOne({ _id: data.id });
    return { ok: true };
  });

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const rows = await Review.find().sort({ createdAt: -1 }).limit(200).populate("productId").lean();
    return rows.map((r) => ({
      id: String(r._id),
      rating: r.rating,
      body: r.body,
      is_approved: r.isApproved,
      product: r.productId
        ? { name: (r.productId as { name?: string }).name }
        : null,
    }));
  });

export const adminUpdateReview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string(), is_approved: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const review = await Review.findById(data.id).lean();
    if (!review) throw new Error("Review not found");
    if (data.is_approved !== undefined) {
      await Review.updateOne({ _id: data.id }, { isApproved: data.is_approved });
      await recalculateProductRatings(String(review.productId));
    }
    return { ok: true };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const review = await Review.findById(data.id).lean();
    if (!review) throw new Error("Review not found");
    await Review.deleteOne({ _id: data.id });
    await recalculateProductRatings(String(review.productId));
    return { ok: true };
  });

export const adminListCustomers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const profiles = await User.find().sort({ createdAt: -1 }).limit(200).lean();
    const orders = await Order.find({ userId: { $ne: null } }).lean();

    return profiles.map((profile) => {
      const userOrders = orders.filter((o) => String(o.userId) === String(profile._id));
      const paidOrders = userOrders.filter((o) => o.paymentStatus === "paid");
      const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
      const lastOrder = userOrders.sort(
        (a, b) =>
          new Date((b as { createdAt?: Date }).createdAt ?? 0).getTime() -
          new Date((a as { createdAt?: Date }).createdAt ?? 0).getTime(),
      )[0];
      return {
        id: String(profile._id),
        full_name: profile.fullName,
        email: profile.email,
        is_active: profile.isActive,
        is_protected: isConfiguredAdminEmail(profile.email),
        order_count: userOrders.length,
        total_spent: totalSpent,
        last_order_at: lastOrder
          ? (lastOrder as { createdAt?: Date }).createdAt?.toISOString()
          : null,
      };
    });
  });

export const adminUpdateCustomer = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.roles);
    await connectMongo();
    const user = await User.findById(data.id).lean();
    if (!user) throw new Error("Customer not found");
    if (!data.is_active && isConfiguredAdminEmail(user.email)) {
      throw new Error("Configured admin accounts cannot be deactivated.");
    }
    await User.updateOne({ _id: data.id }, { isActive: data.is_active });
    return { ok: true };
  });
