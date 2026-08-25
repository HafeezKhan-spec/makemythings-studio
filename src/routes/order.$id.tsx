import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useRazorpay, openRazorpayCheckout } from "@/hooks/useRazorpay";
import {
  getOrder,
  retryOrderPayment,
  verifyPayment,
} from "@/lib/orders.functions";
import { formatDate, inr, orderStatusLabel, paymentStatusLabel } from "@/lib/format";
import type { ShippingAddress } from "@/lib/types";

export const Route = createFileRoute("/order/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    accessToken: typeof search["accessToken"] === "string" ? search["accessToken"] : undefined,
    paid: typeof search["paid"] === "string" ? search["paid"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Order — MakeMyThing.in" },
      { name: "description", content: "Your MakeMyThing order details and payment status." },
      { property: "og:title", content: "Order — MakeMyThing.in" },
      { property: "og:description", content: "Track your 3D printing order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { accessToken, paid } = Route.useSearch();
  const { ready: razorpayReady } = useRazorpay();
  const [paying, setPaying] = useState(false);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["order", id, accessToken],
    queryFn: () => getOrder({ data: { id, ...(accessToken ? { accessToken } : {}) } }),
  });

  const retry = useMutation({
    mutationFn: () =>
      retryOrderPayment({
        data: { orderId: id, ...(accessToken ? { accessToken } : {}) },
      }),
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleRetryPayment() {
    setPaying(true);
    try {
      const result = await retry.mutateAsync();
      const checkout = await openRazorpayCheckout({
        key: result.payment.keyId,
        amount: result.payment.amount,
        currency: result.payment.currency,
        name: result.payment.name,
        description: result.payment.description,
        order_id: result.payment.razorpayOrderId,
        prefill: result.payment.prefill,
        theme: { color: "#f97316" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyPayment({
              data: {
                orderId: result.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                ...(result.accessToken ? { accessToken: result.accessToken } : {}),
              },
            });
            toast.success("Payment successful — your order is confirmed!");
            await refetch();
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Payment verification failed",
            );
            await refetch();
          }
        },
        modal: {
          ondismiss: () => {
            toast.error("Payment was not completed", {
              description: "Your order has not been placed.",
            });
            void refetch();
          },
        },
      });
      checkout.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start payment");
    } finally {
      setPaying(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This order doesn't exist or belongs to another account.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/shop">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const address = order.shipping_address as ShippingAddress;
  const items = (order.items ?? []) as {
    id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    line_total: number;
  }[];

  const isPaid = order.payment_status === "paid";
  const isFailed =
    order.payment_status === "failed" ||
    order.payment_status === "cancelled" ||
    order.payment_status === "expired";
  const canRetry =
    !isPaid &&
    ["pending", "processing", "failed", "cancelled"].includes(order.payment_status);

  const StatusIcon = isPaid ? CheckCircle2 : isFailed ? XCircle : Clock;
  const iconClass = isPaid ? "text-success" : isFailed ? "text-destructive" : "text-primary";

  const title = isPaid
    ? "Order Confirmed 🎉"
    : isFailed
      ? "Payment not completed"
      : "Payment pending";

  const subtitle = isPaid
    ? `Thank you! Order ${order.order_number} is confirmed.`
    : isFailed
      ? "Payment was not completed. Your order has not been placed."
      : "Complete payment to confirm your order.";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <StatusIcon className={`mx-auto h-12 w-12 ${iconClass}`} />
        <h1 className="mt-4 font-display text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Reference <span className="font-semibold text-foreground">{order.order_number}</span> ·{" "}
          {formatDate(order.created_at)}
        </p>
        {paid === "1" && !isPaid ? (
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4" />
            Payment verification is still pending. If you paid, refresh in a moment.
          </p>
        ) : null}
      </div>

      {canRetry ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            className="rounded-full"
            disabled={!razorpayReady || paying || retry.isPending}
            onClick={() => void handleRetryPayment()}
          >
            {paying || retry.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting payment…
              </>
            ) : (
              `Retry payment · ${inr(order.total)}`
            )}
          </Button>
          <Button asChild variant="secondary" className="rounded-full">
            <Link to="/checkout">Return to checkout</Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-9 rounded-2xl border border-border bg-gradient-surface p-6">
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="rounded-full border border-border px-3 py-1.5">
            Payment: <span className="text-primary">{paymentStatusLabel(order.payment_status)}</span>
          </span>
          <span className="rounded-full border border-border px-3 py-1.5">
            Status: <span className="text-primary">{orderStatusLabel(order.status)}</span>
          </span>
          {isPaid ? (
            <span className="rounded-full border border-border px-3 py-1.5">
              Estimated delivery: {formatDate(order.estimated_delivery)}
            </span>
          ) : null}
        </div>

        {(order as { awb_number?: string }).awb_number && isPaid ? (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <p className="font-semibold">Shipment tracking</p>
            <p className="mt-1 text-muted-foreground">
              {(order as { courier_partner?: string }).courier_partner
                ? `${(order as { courier_partner?: string }).courier_partner} · `
                : ""}
              AWB: {(order as { awb_number?: string }).awb_number}
            </p>
          </div>
        ) : null}

        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <img
                src={item.product_image ?? "/images/hero-3d.jpg"}
                alt=""
                loading="lazy"
                width={56}
                height={56}
                className="h-14 w-14 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
              </div>
              <span className="text-sm font-semibold">{inr(item.line_total)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
          <Row label="Subtotal" value={inr(order.subtotal)} />
          {Number(order.discount) > 0 ? (
            <Row
              label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`}
              value={`− ${inr(order.discount)}`}
            />
          ) : null}
          <Row label="Delivery charge" value={inr(order.delivery_charge)} />
          <div className="flex items-center justify-between border-t border-border pt-3">
            <dt className="font-semibold">Final amount</dt>
            <dd className="font-display text-lg font-extrabold">{inr(order.total)}</dd>
          </div>
        </dl>

        {isPaid ? (
          <div className="mt-6 rounded-xl border border-border bg-background p-4 text-sm">
            <h2 className="text-xs tracking-wide text-muted-foreground uppercase">
              Delivery address
            </h2>
            <p className="mt-2 leading-relaxed">
              {address.full_name}
              <br />
              {[address.house, address.street, address.area].filter(Boolean).join(", ")}
              <br />
              {address.city}, {address.state} {address.pincode}
              <br />
              {address.country} · {address.phone}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild className="rounded-full">
          <Link to="/orders">View My Orders</Link>
        </Button>
        <Button asChild variant="secondary" className="rounded-full">
          <Link to="/shop">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
