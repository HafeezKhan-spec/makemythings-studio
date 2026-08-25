import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PackageSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listMyOrders } from "@/lib/orders.functions";
import { useAuth } from "@/hooks/useAuth";
import { ORDER_STATUS_FLOW, formatDate, inr, orderStatusLabel, paymentStatusLabel } from "@/lib/format";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — MakeMyThing.in" },
      { name: "description", content: "Track your 3D printing orders and delivery status." },
      { property: "og:title", content: "My Orders — MakeMyThing.in" },
      { property: "og:description", content: "Order history and live production status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Orders,
});

function Orders() {
  const { user, loading } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: Boolean(user),
    queryFn: () => listMyOrders(),
  });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <PackageSearch className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-extrabold">Sign in to see your orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order history, production status and delivery updates live here.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">My orders</h1>

      {isLoading ? (
        <div className="mt-10 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : orders?.length ? (
        <div className="mt-8 space-y-5">
          {orders.map((order) => {
            const currentIndex = ORDER_STATUS_FLOW.indexOf(
              order.status as (typeof ORDER_STATUS_FLOW)[number],
            );
            const items = (order.items ?? []) as {
              id: string;
              product_name: string;
              quantity: number;
            }[];
            return (
              <article key={order.id} className="rounded-2xl border border-border bg-surface p-5">
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold">{order.order_number}</h2>
                    <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-border px-3 py-1">
                      Payment: {paymentStatusLabel(order.payment_status)}
                    </span>
                    <span className="rounded-full bg-primary/15 px-3 py-1 font-medium text-primary">
                      {orderStatusLabel(order.status)}
                    </span>
                    <span className="font-display font-bold">{inr(order.total)}</span>
                  </div>
                </header>

                <p className="mt-3 text-xs text-muted-foreground">
                  {items.map((item) => `${item.product_name} × ${item.quantity}`).join(" · ")}
                </p>

                {(order as { awb_number?: string; courier_partner?: string }).awb_number ? (
                  <p className="mt-2 rounded-xl border border-border bg-background px-3 py-2 text-xs">
                    <span className="font-semibold">Tracking:</span>{" "}
                    {(order as { courier_partner?: string }).courier_partner
                      ? `${(order as { courier_partner?: string }).courier_partner} · `
                      : ""}
                    {(order as { awb_number?: string }).awb_number}
                  </p>
                ) : null}

                <ol className="mt-5 flex gap-1.5">
                  {ORDER_STATUS_FLOW.map((status, index) => (
                    <li key={status} className="flex-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          currentIndex >= index && currentIndex >= 0
                            ? "bg-gradient-ember"
                            : "bg-surface-2"
                        }`}
                      />
                      <span className="mt-1.5 hidden text-[10px] text-muted-foreground sm:block">
                        {orderStatusLabel(status)}
                      </span>
                    </li>
                  ))}
                </ol>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary" className="rounded-full">
                    <Link to="/order/$id" params={{ id: order.id }}>
                      View details
                    </Link>
                  </Button>
                  {order.payment_status !== "paid" ? (
                    <Button asChild size="sm" className="rounded-full">
                      <Link to="/order/$id" params={{ id: order.id }}>
                        Complete payment
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="text-sm font-medium">You haven't placed an order yet.</p>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/shop">Start shopping</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
