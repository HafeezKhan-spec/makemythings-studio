import { randomBytes } from "node:crypto";

import { connectMongo } from "@/integrations/mongodb/connect.server";
import { Coupon, Order, Product } from "@/integrations/mongodb/models";
import { fetchRazorpayPayment } from "./razorpay.server";
import {
  orderConfirmationEmailHtml,
  paymentConfirmationEmailHtml,
  sendTransactionalEmail,
} from "./transactional-email.server";

export const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const UNPAID_PAYMENT_STATUSES: PaymentStatus[] = ["pending", "processing", "failed"];
export const RETRYABLE_PAYMENT_STATUSES: PaymentStatus[] = ["pending", "processing", "failed", "cancelled"];

export function generateOrderAccessToken(): string {
  return randomBytes(24).toString("hex");
}

export async function validateCartStock(items: { productId: string; quantity: number }[]): Promise<void> {
  await connectMongo();
  const products = await Product.find({
    _id: { $in: items.map((item) => item.productId) },
    isActive: true,
  }).lean();

  for (const item of items) {
    const product = products.find((row) => String(row._id) === item.productId);
    if (!product) {
      throw new Error("One or more products in your cart are no longer available.");
    }
    if (product.stock > 0 && item.quantity > product.stock) {
      throw new Error(`Only ${product.stock} unit(s) of "${product.name}" are available.`);
    }
  }
}

type FulfillInput = {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  /** Paise from webhook when Razorpay API fetch is skipped */
  amountPaise?: number;
};

/** Idempotent: marks order paid, decrements stock, increments coupon usage, sends emails. */
export async function fulfillPaidOrder({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  amountPaise,
}: FulfillInput) {
  await connectMongo();
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  if (order.paymentStatus === "paid") {
    return order;
  }

  if (order.razorpayOrderId && order.razorpayOrderId !== razorpayOrderId) {
    throw new Error("Payment order mismatch");
  }

  const payment = await fetchRazorpayPayment(razorpayPaymentId);
  if (payment.status !== "captured") {
    throw new Error(`Payment not completed (status: ${payment.status})`);
  }

  const paidPaise = Number(payment.amount);
  const expectedPaise = Math.round(Number(order.total) * 100);
  if (paidPaise !== expectedPaise) {
    throw new Error("Payment amount does not match order total");
  }
  if (payment.currency !== "INR") {
    throw new Error("Invalid payment currency");
  }
  if (payment.order_id && payment.order_id !== razorpayOrderId) {
    throw new Error("Razorpay order reference mismatch");
  }
  if (amountPaise != null && amountPaise !== paidPaise) {
    throw new Error("Webhook amount mismatch");
  }

  const locked = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $ne: "paid" } },
    { $set: { paymentStatus: "processing" } },
    { new: true },
  );
  if (!locked) {
    return (await Order.findById(orderId))!;
  }

  try {
    for (const item of locked.items ?? []) {
      if (!item.productId) continue;
      const product = await Product.findById(item.productId).lean();
      if (!product) continue;
      if (product.stock > 0) {
        const updated = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true },
        );
        if (!updated) {
          throw new Error(`"${item.productName}" is no longer available in the requested quantity.`);
        }
      }
    }

    if (locked.couponCode) {
      await Coupon.updateOne({ code: locked.couponCode }, { $inc: { usedCount: 1 } });
    }

    locked.paymentStatus = "paid";
    locked.status = "paid";
    locked.paymentProvider = "razorpay";
    locked.paymentReference = razorpayPaymentId;
    locked.razorpayOrderId = razorpayOrderId;
    locked.adminAcknowledged = false;
    await locked.save();

    await sendTransactionalEmail({
      to: locked.customerEmail,
      subject: `Order confirmed — ${locked.orderNumber}`,
      html: orderConfirmationEmailHtml(locked),
    });
    await sendTransactionalEmail({
      to: locked.customerEmail,
      subject: `Payment received — ${locked.orderNumber}`,
      html: paymentConfirmationEmailHtml(locked, razorpayPaymentId),
    });

    return locked;
  } catch (error) {
    await Order.updateOne(
      { _id: orderId, paymentStatus: "processing" },
      { $set: { paymentStatus: "failed" } },
    );
    throw error;
  }
}

export async function markPaymentFailed(orderId: string) {
  await connectMongo();
  await Order.updateOne(
    { _id: orderId, paymentStatus: { $in: ["pending", "processing"] } },
    { $set: { paymentStatus: "failed" } },
  );
}

export async function markPaymentCancelled(orderId: string) {
  await connectMongo();
  await Order.updateOne(
    { _id: orderId, paymentStatus: { $in: ["pending", "processing", "failed"] } },
    { $set: { paymentStatus: "cancelled" } },
  );
}

/** Restore inventory when a paid order is cancelled. */
export async function restoreOrderStock(orderId: string) {
  await connectMongo();
  const order = await Order.findById(orderId).lean();
  if (!order || order.paymentStatus !== "paid") return;

  for (const item of order.items ?? []) {
    if (!item.productId) continue;
    await Product.updateOne({ _id: item.productId, stock: { $gte: 0 } }, { $inc: { stock: item.quantity } });
  }
}
