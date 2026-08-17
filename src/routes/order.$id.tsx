import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getOrder } from "@/lib/orders.functions";
import { formatDate, inr, orderStatusLabel } from "@/lib/format";
import type { ShippingAddress } from "@/lib/types";

export const Route = createFileRoute("/order/$id")({
  head: () => ({
    meta: [
      { title: "Order Confirmed — MakeMyThings.in" },
      { name: "description", content: "Your MakeMyThings.in order details and delivery estimate." },
      { property: "og:title", content: "Order Confirmed — MakeMyThings.in" },
      { property: "og:description", content: "Track your 3D printing order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder({ data: { id } }),
  });

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="mt-4 font-display text-3xl font-extrabold">Order Confirmed 🎉</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Order <span className="font-semibold text-foreground">{order.order_number}</span> placed on{" "}
          {formatDate(order.created_at)}
        </p>
      </div>

      <div className="mt-9 rounded-2xl border border-border bg-gradient-surface p-6">
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="rounded-full border border-border px-3 py-1.5">
            Payment: <span className="text-primary">{orderStatusLabel(order.payment_status)}</span>
          </span>
          <span className="rounded-full border border-border px-3 py-1.5">
            Status: <span className="text-primary">{orderStatusLabel(order.status)}</span>
          </span>
          <span className="rounded-full border border-border px-3 py-1.5">
            Estimated delivery: {formatDate(order.estimated_delivery)}
          </span>
        </div>

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
