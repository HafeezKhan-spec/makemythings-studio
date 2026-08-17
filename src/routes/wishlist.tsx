import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardSkeleton } from "@/components/site/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "My Wishlist — MakeMyThings.in" },
      { name: "description", content: "Products you've saved for later at MakeMyThings.in." },
      { property: "og:title", content: "My Wishlist — MakeMyThings.in" },
      { property: "og:description", content: "Saved 3D printed products." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Wishlist,
});

function Wishlist() {
  const { user } = useAuth();

  const { data: products, isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("product:products(*, category:categories(name,slug))");
      if (error) throw new Error(error.message);
      return (data ?? []).flatMap((row) => (row.product ? [row.product] : []));
    },
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <Heart className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-extrabold">Sign in to use your wishlist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Save products you love and come back to them any time.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">My wishlist</h1>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : ((products ?? []) as unknown as Product[]).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
      </div>
      {!isLoading && !products?.length ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="text-sm font-medium">Nothing saved yet.</p>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/shop">Browse products</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
