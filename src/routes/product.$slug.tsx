import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Heart, Minus, Package, Plus, ShieldCheck, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stars } from "@/components/site/Stars";
import { ProductCard } from "@/components/site/ProductCard";
import { useCart } from "@/context/cart";
import { useAuth } from "@/hooks/useAuth";
import { checkoutRedirectPath } from "@/lib/auth-redirect";
import { getProduct } from "@/lib/catalog.functions";
import { showAddedToCartToast } from "@/lib/cart-toast";
import { discountPercent, inr } from "@/lib/format";
import type { Product } from "@/lib/types";

const productQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProduct({ data: { slug } }),
  });

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const result = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Product not found — MakeMyThing.in" }, { name: "robots", content: "noindex" }] };
    }
    const product = loaderData.product as unknown as Product;
    const title = `${product.name} — MakeMyThing.in`;
    const description =
      product.short_description ?? `Buy the ${product.name}, 3D printed to order in India.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description,
            image: product.images,
            brand: { "@type": "Brand", name: "MakeMyThing.in" },
            offers: {
              "@type": "Offer",
              price: Number(product.price),
              priceCurrency: "INR",
              availability:
                product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
            aggregateRating:
              product.review_count > 0
                ? {
                    "@type": "AggregateRating",
                    ratingValue: Number(product.rating),
                    reviewCount: product.review_count,
                  }
                : undefined,
          }),
        },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(slug));
  const { add, getQuantity } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [pincode, setPincode] = useState("");
  const [delivery, setDelivery] = useState<string | null>(null);

  const product = data!.product as unknown as Product;
  const inCartQty = getQuantity(product.id);
  const related = (data!.related ?? []) as unknown as Product[];
  const reviews = data!.reviews as { id: string; author_name: string | null; rating: number; body: string | null; created_at: string }[];
  const off = discountPercent(product.price, product.original_price);
  const images = product.images?.length ? product.images : ["/images/hero-3d.jpg"];
  const videos = product.videos ?? [];
  type GalleryItem = { type: "image"; url: string } | { type: "video"; url: string };
  const gallery: GalleryItem[] = [
    ...images.map((url) => ({ type: "image" as const, url })),
    ...videos.map((url) => ({ type: "video" as const, url })),
  ];

  function addToCart(quiet = false) {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: images[0] ?? null,
        price: Number(product.price),
        originalPrice: product.original_price ? Number(product.original_price) : null,
      },
      quantity,
    );
    if (!quiet) showAddedToCartToast(product.name, () => navigate({ to: "/cart" }));
  }

  function buyNow() {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: images[0] ?? null,
        price: Number(product.price),
        originalPrice: product.original_price ? Number(product.original_price) : null,
      },
      quantity,
    );
    if (!user) {
      navigate({ to: "/auth", search: { redirect: checkoutRedirectPath() } });
      return;
    }
    navigate({ to: "/checkout" });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>{" "}
        / <Link to="/shop" className="hover:text-primary">Shop</Link>
        {product.category ? (
          <>
            {" "}
            /{" "}
            <Link to="/shop" search={{ category: product.category.slug }} className="hover:text-primary">
              {product.category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-3xl border border-border bg-surface">
            {gallery[activeImage]?.type === "video" ? (
              <video
                key={gallery[activeImage].url}
                src={gallery[activeImage].url}
                controls
                playsInline
                className="aspect-square w-full object-cover"
              />
            ) : (
              <img
                src={gallery[activeImage]?.url ?? images[0]}
                alt={product.name}
                width={1024}
                height={1024}
                className="aspect-square w-full object-cover"
              />
            )}
          </div>
          {gallery.length > 1 ? (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {gallery.map((item, index) => (
                <button
                  key={`${item.type}-${item.url}`}
                  onClick={() => setActiveImage(index)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border ${index === activeImage ? "border-primary" : "border-border"}`}
                >
                  {item.type === "video" ? (
                    <>
                      <video src={item.url} muted playsInline className="h-full w-full object-cover" />
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 text-[10px] font-semibold text-white">
                        Video
                      </span>
                    </>
                  ) : (
                    <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <Stars rating={product.rating} count={product.review_count} />
            {product.stock > 0 ? (
              <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
                In stock
              </span>
            ) : (
              <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                Made to order
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <span className="font-display text-3xl font-extrabold">{inr(product.price)}</span>
            {product.original_price ? (
              <span className="text-sm text-muted-foreground line-through">
                {inr(product.original_price)}
              </span>
            ) : null}
            {off ? (
              <span className="rounded-full bg-gradient-ember px-2.5 py-1 text-xs font-bold text-primary-foreground">
                {off}% OFF
              </span>
            ) : null}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Material", product.material],
              ["Size", product.size],
              ["Colours", product.colors?.join(", ")],
              ["Production time", product.production_time],
            ].map(([label, value]) =>
              value ? (
                <div key={label} className="rounded-xl border border-border bg-surface p-3">
                  <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium">{value}</dd>
                </div>
              ) : null,
            )}
          </dl>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-border bg-surface">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button size="lg" className="rounded-full" variant={inCartQty ? "secondary" : "default"} onClick={() => addToCart()}>
              {inCartQty ? `In cart (${inCartQty}) · Add more` : "Add to cart"}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full"
              onClick={() => buyNow()}
            >
              Buy now
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Add to wishlist"
              onClick={() => toast.success("Saved to your wishlist")}
            >
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-7 rounded-2xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="h-4 w-4 text-primary" /> Delivery estimate
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Delivery available across India.</p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!/^\d{6}$/.test(pincode)) {
                  setDelivery("Enter a valid 6-digit pincode.");
                  return;
                }
                const base = Number(pincode.slice(0, 1));
                const min = 3 + (base % 3);
                setDelivery(`Arrives in ${min}–${min + 3} days to ${pincode}.`);
              }}
            >
              <Input
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter pincode"
                inputMode="numeric"
                className="max-w-40 bg-background"
                aria-label="Delivery pincode"
              />
              <Button type="submit" variant="secondary">
                Check
              </Button>
            </form>
            {delivery ? <p className="mt-2 text-xs text-primary">{delivery}</p> : null}
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Secure checkout · Delivery charge
              calculated at checkout
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="h-4 w-4 text-primary" /> Printed to order and quality checked by
              hand
            </p>
          </div>
        </div>
      </div>

      {reviews.length ? (
        <section className="mt-16">
          <h2 className="font-display text-xl font-bold">Customer reviews</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-border bg-surface p-5">
                <Stars rating={review.rating} />
                <p className="mt-2 text-sm">{review.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {review.author_name ?? "Verified buyer"}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="mt-16">
          <h2 className="font-display text-xl font-bold">You may also like</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
