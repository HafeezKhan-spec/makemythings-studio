import { connectMongo } from "@/integrations/mongodb/connect.server";
import { Order } from "@/integrations/mongodb/models";
import { fulfillPaidOrder, markPaymentFailed } from "./payments.server";
import { verifyRazorpayWebhookSignature } from "./razorpay.server";

type RazorpayWebhookPayload = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
        currency?: string;
        notes?: Record<string, string>;
      };
    };
    order?: {
      entity?: {
        id?: string;
        notes?: Record<string, string>;
      };
    };
  };
};

export async function handleRazorpayWebhook(request: Request): Promise<Response> {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
  }

  const rawBody = await request.text();
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const payment = payload.payload?.payment?.entity;
  const orderId =
    payment?.notes?.orderId ?? payload.payload?.order?.entity?.notes?.orderId ?? null;
  const razorpayOrderId = payment?.order_id ?? payload.payload?.order?.entity?.id ?? null;
  const razorpayPaymentId = payment?.id ?? null;
  const amountPaise = payment?.amount;

  if (payload.event === "payment.captured" || payload.event === "order.paid") {
    if (orderId && razorpayOrderId && razorpayPaymentId) {
      await connectMongo();
      const order = await Order.findById(orderId);
      if (order && order.paymentStatus !== "paid") {
        try {
          await fulfillPaidOrder({
            orderId,
            razorpayOrderId,
            razorpayPaymentId,
            amountPaise,
          });
        } catch (error) {
          console.error("[razorpay webhook] fulfill failed:", error);
        }
      }
    }
  }

  if (payload.event === "payment.failed" && orderId) {
    await connectMongo();
    try {
      await markPaymentFailed(orderId);
    } catch (error) {
      console.error("[razorpay webhook] mark failed:", error);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
