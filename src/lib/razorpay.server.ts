import crypto from "node:crypto";

import Razorpay from "razorpay";

export function getRazorpayCredentials() {
  const keyId = process.env["RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file (use rzp_test_* keys for testing).",
    );
  }
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env["RAZORPAY_KEY_ID"] && process.env["RAZORPAY_KEY_SECRET"]);
}

export function getRazorpayClient() {
  const { keyId, keySecret } = getRazorpayCredentials();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function createRazorpayOrder(amountInr: number, receipt: string, notes: Record<string, string>) {
  const client = getRazorpayClient();
  const amountPaise = Math.round(amountInr * 100);
  if (amountPaise < 100) {
    throw new Error("Order total must be at least ₹1");
  }

  const order = await client.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
    notes,
  });

  return {
    id: order.id,
    amount: order.amount,
    currency: order.currency,
  };
}

export async function fetchRazorpayPayment(paymentId: string) {
  const client = getRazorpayClient();
  const payment = await client.payments.fetch(paymentId);
  return {
    id: payment.id,
    status: payment.status,
    amount: Number(payment.amount),
    currency: payment.currency,
    order_id: payment.order_id ?? null,
  };
}

export function verifyRazorpayPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): boolean {
  const { keySecret } = getRazorpayCredentials();
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
  return expected === razorpaySignature;
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}
