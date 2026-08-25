import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuth } from "@/integrations/mongodb/auth-middleware";
import { connectMongo } from "@/integrations/mongodb/connect.server";
import { Address, Order, User } from "@/integrations/mongodb/models";
import {
  fulfillPaidOrder,
  generateOrderAccessToken,
  markPaymentCancelled,
  RETRYABLE_PAYMENT_STATUSES,
  validateCartStock,
} from "./payments.server";
import {
  createRazorpayOrder,
  getRazorpayCredentials,
  isRazorpayConfigured,
  verifyRazorpayPaymentSignature,
} from "./razorpay.server";
import {
  currentUserId,
  generateOrderNumber,
  priceCart,
} from "./orders.server";

const cartSchema = z.object({
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(20) }))
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

const placeOrderInput = cartSchema.extend({
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(160),
    phone: z.string().trim().min(6).max(20),
  }),
  address: addressSchema,
  notes: z.string().trim().max(500).optional(),
  saveAddress: z.boolean().optional(),
  addressId: z.string().optional(),
});

function mapOrderResponse(order: {
  _id: unknown;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: unknown;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  deliveryCharge: number;
  total: number;
  paymentStatus: string;
  paymentReference: string | null;
  razorpayOrderId: string | null;
  status: string;
  estimatedDelivery?: Date | null;
  createdAt?: Date;
  items?: Array<{
    _id: unknown;
    productName: string;
    productImage: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
}) {
  return {
    id: String(order._id),
    order_number: order.orderNumber,
    customer_name: order.customerName,
    customer_email: order.customerEmail,
    customer_phone: order.customerPhone,
    shipping_address: order.shippingAddress,
    subtotal: order.subtotal,
    discount: order.discount,
    coupon_code: order.couponCode,
    delivery_charge: order.deliveryCharge,
    total: order.total,
    payment_status: order.paymentStatus,
    payment_reference: order.paymentReference,
    razorpay_order_id: order.razorpayOrderId,
    status: order.status,
    courier_partner: (order as { courierPartner?: string }).courierPartner ?? "",
    awb_number: (order as { awbNumber?: string }).awbNumber ?? "",
    shipping_method: (order as { shippingMethod?: string }).shippingMethod ?? "",
    estimated_delivery: order.estimatedDelivery?.toISOString().slice(0, 10) ?? null,
    created_at: order.createdAt?.toISOString(),
    items: (order.items ?? []).map((item) => ({
      id: String(item._id),
      product_name: item.productName,
      product_image: item.productImage,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      line_total: item.lineTotal,
    })),
  };
}

function cartFingerprint(items: { productId: string; quantity: number }[]) {
  return items
    .map((i) => `${i.productId}:${i.quantity}`)
    .sort()
    .join("|");
}

function orderItemsFingerprint(
  items: Array<{ productId?: unknown; quantity?: number }> | undefined,
) {
  return (items ?? [])
    .map((i) => `${String(i.productId)}:${i.quantity ?? 0}`)
    .sort()
    .join("|");
}

async function assertOrderAccess(
  order: { userId?: unknown; accessToken?: string | null },
  accessToken?: string,
) {
  const userId = await currentUserId();
  if (order.userId) {
    if (!userId || String(order.userId) !== userId) {
      throw new Error("You do not have access to this order");
    }
    return;
  }
  if (!order.accessToken || !accessToken || order.accessToken !== accessToken) {
    throw new Error("Invalid or missing order access token");
  }
}

async function findReusablePendingOrder(
  userId: string | null,
  customerEmail: string,
  fingerprint: string,
  total: number,
) {
  const since = new Date(Date.now() - 30 * 60 * 1000);
  const query = {
    paymentStatus: { $in: RETRYABLE_PAYMENT_STATUSES },
    status: "payment_pending",
    total,
    createdAt: { $gte: since },
    ...(userId
      ? { userId }
      : { userId: null, customerEmail: customerEmail.toLowerCase().trim() }),
  };
  const candidates = await Order.find(query).sort({ createdAt: -1 }).limit(8).lean();
  return candidates.find((row) => orderItemsFingerprint(row.items) === fingerprint) ?? null;
}

export const quoteCart = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cartSchema.parse(input))
  .handler(async ({ data }) => priceCart(data.items, data.couponCode, data.country ?? "India"));

export const getRazorpayKey = createServerFn({ method: "GET" }).handler(async () => {
  if (!isRazorpayConfigured()) {
    return { configured: false as const, keyId: null };
  }
  const { keyId } = getRazorpayCredentials();
  return { configured: true as const, keyId };
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => placeOrderInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!isRazorpayConfigured()) {
      throw new Error(
        "Payment gateway is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env (use rzp_test_* keys for testing).",
      );
    }

    const userId = context.userId;
    await validateCartStock(data.items);
    const priced = await priceCart(data.items, data.couponCode, data.address.country);
    if (!priced.lines.length) throw new Error("Your cart is empty or contains unavailable items.");

    await connectMongo();

    let customerEmail = data.customer.email.toLowerCase().trim();
    let customerName = data.customer.name;
    let customerPhone = data.customer.phone;
    const user = await User.findById(userId).lean();
    if (!user?.isActive) throw new Error("Your account is deactivated.");
    customerEmail = user.email;
    if (user.fullName) customerName = user.fullName;

    const fingerprint = cartFingerprint(data.items);

    const reusable = await findReusablePendingOrder(
      userId,
      customerEmail,
      fingerprint,
      priced.total,
    );

    if (reusable) {
      const razorpayOrder = await createRazorpayOrder(priced.total, reusable.orderNumber, {
        orderId: String(reusable._id),
        orderNumber: reusable.orderNumber,
      });
      await Order.updateOne(
        { _id: reusable._id },
        {
          $set: {
            razorpayOrderId: razorpayOrder.id,
            paymentStatus: "pending",
            adminAcknowledged: false,
            subtotal: priced.subtotal,
            discount: priced.discount,
            couponCode: priced.couponCode,
            deliveryCharge: priced.deliveryCharge,
            total: priced.total,
            customerName,
            customerEmail,
            customerPhone,
            shippingAddress: data.address,
            items: priced.lines.map((line) => ({
              productId: line.product_id,
              productName: line.product_name,
              productImage: line.product_image,
              unitPrice: line.unit_price,
              quantity: line.quantity,
              lineTotal: line.line_total,
            })),
          },
        },
      );
      const { keyId } = getRazorpayCredentials();
      return {
        orderId: String(reusable._id),
        orderNumber: reusable.orderNumber,
        accessToken: reusable.accessToken ?? undefined,
        payment: {
          keyId,
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "MakeMyThing.in",
          description: `Order ${reusable.orderNumber}`,
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone,
          },
        },
      };
    }

    if (data.saveAddress && !data.addressId) {
      await Address.create({
        userId,
        fullName: data.address.full_name,
        phone: data.address.phone,
        house: data.address.house,
        street: data.address.street ?? "",
        area: data.address.area ?? "",
        city: data.address.city,
        state: data.address.state,
        country: data.address.country,
        pincode: data.address.pincode,
      });
    }

    const estimated = new Date();
    estimated.setDate(estimated.getDate() + 7);
    const orderNumber = generateOrderNumber();
    const accessToken = generateOrderAccessToken();

    const order = await Order.create({
      orderNumber,
      userId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: data.address,
      subtotal: priced.subtotal,
      discount: priced.discount,
      couponCode: priced.couponCode,
      deliveryCharge: priced.deliveryCharge,
      total: priced.total,
      paymentStatus: "pending",
      paymentProvider: "razorpay",
      status: "payment_pending",
      estimatedDelivery: estimated,
      notes: data.notes ?? "",
      accessToken,
      items: priced.lines.map((line) => ({
        productId: line.product_id,
        productName: line.product_name,
        productImage: line.product_image,
        unitPrice: line.unit_price,
        quantity: line.quantity,
        lineTotal: line.line_total,
      })),
    });

    const razorpayOrder = await createRazorpayOrder(priced.total, orderNumber, {
      orderId: String(order._id),
      orderNumber,
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    const { keyId } = getRazorpayCredentials();

    return {
      orderId: String(order._id),
      orderNumber,
      accessToken,
      payment: {
        keyId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "MakeMyThing.in",
        description: `Order ${orderNumber}`,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
      },
    };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string(),
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
        accessToken: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await connectMongo();
    const order = await Order.findById(data.orderId);
    if (!order) throw new Error("Order not found");

    if (order.userId && String(order.userId) !== context.userId) {
      throw new Error("You do not have access to this order");
    }
    if (!order.userId && order.accessToken && order.accessToken !== data.accessToken) {
      throw new Error("Invalid order access token");
    }

    if (!verifyRazorpayPaymentSignature(data.razorpayOrderId, data.razorpayPaymentId, data.razorpaySignature)) {
      throw new Error("Payment verification failed. Your order was not marked as paid.");
    }

    await fulfillPaidOrder({
      orderId: data.orderId,
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
    });

    return { ok: true, orderId: data.orderId };
  });

export const retryOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string(), accessToken: z.string().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!isRazorpayConfigured()) {
      throw new Error("Payment gateway is not configured.");
    }
    await connectMongo();
    const order = await Order.findById(data.orderId);
    if (!order) throw new Error("Order not found");
    if (order.userId && String(order.userId) !== context.userId) {
      throw new Error("You do not have access to this order");
    }

    if (!(RETRYABLE_PAYMENT_STATUSES as readonly string[]).includes(order.paymentStatus)) {
      throw new Error("This order cannot be paid again.");
    }

    const items = (order.items ?? []).map((item) => ({
      productId: String(item.productId),
      quantity: item.quantity,
    }));
    await validateCartStock(items);
    const country =
      (order.shippingAddress as { country?: string })?.country ?? "India";
    const priced = await priceCart(items, order.couponCode ?? undefined, country);

    if (priced.total !== Number(order.total)) {
      throw new Error(
        "Order totals have changed. Please start a new checkout from your cart.",
      );
    }

    const razorpayOrder = await createRazorpayOrder(priced.total, order.orderNumber, {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
    });

    order.razorpayOrderId = razorpayOrder.id;
    order.paymentStatus = "pending";
    await order.save();

    const { keyId } = getRazorpayCredentials();
    return {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      accessToken: order.accessToken ?? undefined,
      payment: {
        keyId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "MakeMyThing.in",
        description: `Order ${order.orderNumber}`,
        prefill: {
          name: order.customerName,
          email: order.customerEmail,
          contact: order.customerPhone,
        },
      },
    };
  });

export const cancelPendingOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string(), accessToken: z.string().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await connectMongo();
    const order = await Order.findById(data.orderId);
    if (!order) throw new Error("Order not found");
    if (order.userId && String(order.userId) !== context.userId) {
      throw new Error("You do not have access to this order");
    }
    if (order.paymentStatus === "paid") {
      throw new Error("Paid orders cannot be cancelled from checkout.");
    }
    await markPaymentCancelled(data.orderId);
    return { ok: true };
  });

export const getOrder = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string(), accessToken: z.string().optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    await connectMongo();
    const order = await Order.findById(data.id).lean();
    if (!order) return null;

    try {
      await assertOrderAccess(order, data.accessToken);
    } catch {
      return null;
    }

    return mapOrderResponse(order as never);
  });

export const listMyOrders = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await currentUserId();
  if (!userId) return [];

  await connectMongo();
  const orders = await Order.find({ userId }).sort({ createdAt: -1 }).lean();

  return orders.map((order) => ({
    id: String(order._id),
    order_number: order.orderNumber,
    total: order.total,
    payment_status: order.paymentStatus,
    status: order.status,
    courier_partner: order.courierPartner ?? "",
    awb_number: order.awbNumber ?? "",
    shipping_method: order.shippingMethod ?? "",
    created_at: (order as { createdAt?: Date }).createdAt?.toISOString(),
    items: (order.items ?? []).map((item) => ({
      id: String(item._id),
      product_name: item.productName,
      product_image: item.productImage,
      quantity: item.quantity,
      line_total: item.lineTotal,
    })),
  }));
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
    await connectMongo();
    const { CustomRequest } = await import("@/integrations/mongodb/models");
    await CustomRequest.create({
      userId: userId ?? null,
      name: data.name,
      email: data.email,
      phone: data.phone ?? "",
      description: data.description,
      size: data.size ?? "",
      quantity: data.quantity,
      material: data.material ?? "",
      notes: data.notes ?? "",
      modelFileUrl: data.model_file_url ?? "",
      referenceImageUrl: data.reference_image_url ?? "",
      status: "new",
      adminAcknowledged: false,
    });
    return { ok: true };
  });
