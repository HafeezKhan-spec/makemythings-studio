import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardSkeleton } from "@/components/site/ProductCard";
import { listProducts } from "@/lib/catalog.functions";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Coupons — MakeMyThings.in" },
      {
        name: "description",
        content: "Live discounts on 3D printed collectibles, décor and custom prints. Use code MAKE10 for 10% off.",
      },
      { property: "og:title", content: "Offers & Coupons — MakeMyThings.in" },
      { property: "og:description", content: "Save on premium 3D printed products." },
    ],
  }),
  component: Offers,
});

const COUPONS = [
  { code: "MAKE10", text: "10% off orders above ₹499 (max ₹500 off)" },
  { code: "FLAT200", text: "₹200 off orders above ₹1,499" },
];

function Offers() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "discounted"],
    queryFn: () => listProducts({ data: { flag: "discounted", limit: 12 } }),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Offers & coupons</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Apply a coupon in your cart — discounts are validated on our servers at checkout.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {COUPONS.map((coupon) => (
          <div
            key={coupon.code}
            className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-gradient-surface p-5"
          >
            <div>
              <span className="flex items-center gap-2 font-display text-lg font-extrabold">
                <Tag className="h-4 w-4 text-primary" /> {coupon.code}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">{coupon.text}</p>
            </div>
            <Button asChild size="sm" variant="secondary" className="rounded-full">
              <Link to="/shop">Shop now</Link>
            </Button>
          </div>
        ))}
      </div>

      <h2 className="mt-14 font-display text-2xl font-bold">Discounted products</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : ((products ?? []) as unknown as Product[]).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
      </div>
    </div>
  );
}
