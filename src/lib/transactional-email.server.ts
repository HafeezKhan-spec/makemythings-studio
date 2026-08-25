import { sendEmail } from "./email.server";

type OrderLike = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  paymentStatus: string;
};

export async function sendTransactionalEmail(input: { to: string; subject: string; html: string }) {
  try {
    await sendEmail(input);
  } catch (error) {
    console.error("[email] transactional send failed:", error);
  }
}

export function orderConfirmationEmailHtml(order: OrderLike): string {
  return `
    <div style="font-family:Manrope,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">Order confirmed</h1>
      <p style="color:#555;margin:0 0 16px">Hi ${order.customerName}, thanks for shopping at MakeMyThing.in.</p>
      <p style="margin:0 0 8px"><strong>Order:</strong> ${order.orderNumber}</p>
      <p style="margin:0 0 8px"><strong>Total:</strong> ₹${order.total.toFixed(2)}</p>
      <p style="margin:0 0 16px"><strong>Status:</strong> ${order.status}</p>
      <p style="color:#888;font-size:13px;margin:0">We'll email you when your order moves to processing and shipping.</p>
    </div>
  `;
}

export function paymentConfirmationEmailHtml(order: OrderLike, paymentId: string): string {
  return `
    <div style="font-family:Manrope,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">Payment received</h1>
      <p style="color:#555;margin:0 0 16px">Your payment for order ${order.orderNumber} was successful.</p>
      <p style="margin:0 0 8px"><strong>Amount paid:</strong> ₹${order.total.toFixed(2)}</p>
      <p style="margin:0 0 16px"><strong>Payment ID:</strong> ${paymentId}</p>
      <p style="color:#888;font-size:13px;margin:0">Thank you for your purchase!</p>
    </div>
  `;
}

export function orderStatusEmailHtml(order: OrderLike, message: string): string {
  return `
    <div style="font-family:Manrope,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">Order update</h1>
      <p style="color:#555;margin:0 0 16px">Hi ${order.customerName},</p>
      <p style="margin:0 0 8px"><strong>Order:</strong> ${order.orderNumber}</p>
      <p style="margin:0 0 16px">${message}</p>
      <p style="color:#888;font-size:13px;margin:0">Track your order anytime from My Orders on MakeMyThing.in.</p>
    </div>
  `;
}

export function customQuoteEmailHtml(input: {
  customerName: string;
  description: string;
  quotedPrice: number;
  quoteMessage: string;
}): string {
  return `
    <div style="font-family:Manrope,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">Your custom print quote is ready</h1>
      <p style="color:#555;margin:0 0 16px">Hi ${input.customerName},</p>
      <p style="margin:0 0 8px"><strong>Your request:</strong> ${input.description.slice(0, 120)}${input.description.length > 120 ? "…" : ""}</p>
      <p style="margin:0 0 8px"><strong>Quoted price:</strong> ₹${input.quotedPrice.toFixed(2)}</p>
      <div style="margin:16px 0;padding:12px 16px;background:#f5f5f5;border-radius:8px">
        <p style="margin:0;color:#333">${input.quoteMessage}</p>
      </div>
      <p style="color:#888;font-size:13px;margin:0">Sign in at MakeMyThing.in to view your quote and reply to our team.</p>
    </div>
  `;
}
