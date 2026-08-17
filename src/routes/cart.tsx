import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/context/cart";
import { quoteCart } from "@/lib/orders.functions";
import { inr } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — MakeMyThings.in" },
      { name: "description", content: "Review your 3D printed products, apply a coupon and checkout." },
      { property: "og:title", content: "Your Cart — MakeMyThings.in" },
      { property: "og:description", content: "Review your cart and checkout securely." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, setQuantity, remove, hydrated } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | undefined>(undefined);

  const items = lines.map((line) => ({ productId: line.productId, quantity: line.quantity }));

  const { data: quote, isFetching } = useQuery({
    queryKey: ["quote", items, coupon],
    queryFn: () => quoteCart({ data: { items, ...(coupon ? { couponCode: coupon } : {}) } }),
    enabled: hydrated && items.length > 0,
  });

  const applyCoupon = useMutation({
    mutationFn: async () => {
      const code = couponInput.trim();
      const result = await quoteCart({ data: { items, couponCode: code } });
      return { result, code };
    },
    onSuccess: ({ result, code }) => {
      if (result.couponCode) {
        setCoupon(code);
        toast.success(`Coupon ${result.couponCode} applied`);
      } else {
        toast.error(result.couponMessage ?? "Coupon could not be applied");
      }
    },
  });

  if (hydrated && !lines.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-5 font-display text-2xl font-extrabold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Browse our printed collectibles, décor and desk pieces — or design something new.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-full">
            <Link to="/shop">Explore products</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-full">
            <Link to="/custom-printing">Create your own</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Your cart</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {lines.map((line) => (
            <article
              key={line.productId}
              className="flex gap-4 rounded-2xl border border-border bg-surface p-3 sm:p-4"
            >
              <Link to="/product/$slug" params={{ slug: line.slug }} className="shrink-0">
                <img
                  src={line.image ?? "/images/hero-3d.jpg"}
                  alt={line.name}
                  loading="lazy"
                  width={96}
                  height={96}
                  className="h-20 w-20 rounded-xl object-cover sm:h-24 sm:w-24"
                />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to="/product/$slug"
                    params={{ slug: line.slug }}
                    className="text-sm font-semibold hover:text-primary"
                  >
                    {line.name}
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remove item"
                    onClick={() => remove(line.productId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {inr(line.price)}
                  {line.originalPrice ? (
                    <span className="ml-2 line-through">{inr(line.originalPrice)}</span>
                  ) : null}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  <div className="flex items-center rounded-full border border-border">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full"
                      aria-label="Decrease quantity"
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold">{line.quantity}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full"
                      aria-label="Increase quantity"
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <span className="text-sm font-bold">{inr(line.price * line.quantity)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-gradient-surface p-5">
            <h2 className="font-display text-lg font-bold">Order summary</h2>

            <form
              className="mt-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                applyCoupon.mutate();
              }}
            >
              <Input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="bg-background"
                aria-label="Coupon code"
              />
              <Button type="submit" variant="secondary" disabled={applyCoupon.isPending}>
                Apply
              </Button>
            </form>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Try <span className="text-primary">MAKE10</span> for 10% off orders above ₹499.
            </p>

            <dl className="mt-5 space-y-2.5 text-sm">
              <Row label="Subtotal" value={inr(quote?.subtotal ?? 0)} />
              {quote?.discount ? (
                <Row
                  label={`Coupon discount${quote.couponCode ? ` (${quote.couponCode})` : ""}`}
                  value={`− ${inr(quote.discount)}`}
                  accent
                />
              ) : null}
              <Row
                label="India standard delivery"
                value={quote?.deliveryCharge ? inr(quote.deliveryCharge) : "Free"}
              />
              {quote?.freeDeliveryThreshold && quote.deliveryCharge ? (
                <p className="text-[11px] text-muted-foreground">
                  Free delivery on orders above {inr(quote.freeDeliveryThreshold)}.
                </p>
              ) : null}
              <div className="border-t border-border pt-3">
                <Row
                  label="Final amount"
                  value={isFetching ? "…" : inr(quote?.total ?? 0)}
                  strong
                />
              </div>
            </dl>

            <Button asChild size="lg" className="mt-5 w-full rounded-full">
              <Link to="/checkout" search={coupon ? { coupon } : {}}>
                Proceed to checkout
              </Link>
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Totals are calculated securely on our servers.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</dt>
      <dd
        className={
          strong
            ? "font-display text-lg font-extrabold"
            : accent
              ? "font-medium text-success"
              : "font-medium"
        }
      >
        {value}
      </dd>
    </div>
  );
}
