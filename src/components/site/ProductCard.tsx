import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Stars } from "@/components/site/Stars";
import { useCart } from "@/context/cart";
import { showAddedToCartToast } from "@/lib/cart-toast";
import { discountPercent, inr } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { add, getQuantity } = useCart();
  const navigate = useNavigate();
  const inCart = getQuantity(product.id);
  const off = discountPercent(product.price, product.original_price);
  const image = product.images?.[0] ?? "/images/hero-3d.jpg";

  const badge = product.is_best_seller
    ? "Best seller"
    : product.is_new_arrival
      ? "New"
      : product.is_trending
        ? "Trending"
        : null;

  return (
    <article className="card-hover group flex flex-col overflow-hidden rounded-2xl border border-border bg-gradient-surface">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square overflow-hidden bg-surface-2"
      >
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          width={600}
          height={600}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 flex flex-col gap-1.5">
          {off ? (
            <span className="rounded-full bg-gradient-ember px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
              {off}% OFF
            </span>
          ) : null}
          {badge ? (
            <span className="rounded-full border border-border bg-background/80 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
              {badge}
            </span>
          ) : null}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm leading-snug font-semibold">
            <Link to="/product/$slug" params={{ slug: product.slug }} className="hover:text-primary">
              {product.name}
            </Link>
          </h3>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{product.short_description}</p>
        <Stars rating={product.rating} count={product.review_count} />

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <span className="text-base font-bold">{inr(product.price)}</span>
            {product.original_price ? (
              <span className="ml-2 text-xs text-muted-foreground line-through">
                {inr(product.original_price)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1"
            variant={inCart ? "secondary" : "default"}
            onClick={() => {
              add({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                image,
                price: Number(product.price),
                originalPrice: product.original_price ? Number(product.original_price) : null,
              });
              showAddedToCartToast(product.name, () => navigate({ to: "/cart" }));
            }}
          >
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            {inCart ? `In cart (${inCart})` : "Add to cart"}
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/product/$slug" params={{ slug: product.slug }}>
              View
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="aspect-square bg-surface-2" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-3/4 rounded bg-surface-2" />
        <div className="h-3 w-1/2 rounded bg-surface-2" />
        <div className="h-8 rounded bg-surface-2" />
      </div>
    </div>
  );
}
