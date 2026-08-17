import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard, ProductCardSkeleton } from "@/components/site/ProductCard";
import { listCategories, listProducts } from "@/lib/catalog.functions";
import { inr } from "@/lib/format";
import type { Product } from "@/lib/types";

type ShopSearch = {
  search?: string | undefined;
  category?: string | undefined;
  sort?: string | undefined;
  flag?: string | undefined;
  max?: number | undefined;
};

const FLAGS = [
  { value: "", label: "All products" },
  { value: "featured", label: "Featured" },
  { value: "new-arrival", label: "New arrivals" },
  { value: "best-seller", label: "Best sellers" },
  { value: "trending", label: "Trending" },
  { value: "discounted", label: "On offer" },
];

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    search: typeof search["search"] === "string" ? search["search"] : undefined,
    category: typeof search["category"] === "string" ? search["category"] : undefined,
    sort: typeof search["sort"] === "string" ? search["sort"] : undefined,
    flag: typeof search["flag"] === "string" ? search["flag"] : undefined,
    max: search["max"] ? Number(search["max"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop 3D Printed Products — MakeMyThings.in" },
      {
        name: "description",
        content:
          "Browse 3D printed figures, décor, keychains, desk accessories and tech gear. Filter by category, price and offers.",
      },
      { property: "og:title", content: "Shop 3D Printed Products — MakeMyThings.in" },
      {
        property: "og:description",
        content: "Studio-grade 3D printed products, shipped across India.",
      },
    ],
  }),
  component: Shop,
});

function Shop() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const [term, setTerm] = useState(search.search ?? "");
  const [maxPrice, setMaxPrice] = useState(search.max ?? 2500);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: () =>
      listProducts({
        data: {
          ...(search.search ? { search: search.search } : {}),
          ...(search.category ? { category: search.category } : {}),
          ...(search.flag ? { flag: search.flag } : {}),
          ...(search.sort ? { sort: search.sort } : {}),
          ...(search.max ? { maxPrice: search.max } : {}),
        },
      }),
  });

  const update = (patch: Partial<ShopSearch>) =>
    navigate({
      search: (prev) => {
        const next = { ...prev, ...patch } as Record<string, unknown>;
        Object.keys(next).forEach((key) => {
          if (next[key] === "" || next[key] === undefined) delete next[key];
        });
        return next as ShopSearch;
      },
    });

  const list = (products ?? []) as unknown as Product[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Shop all products</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every piece is printed to order in our studio and quality-checked by hand.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {FLAGS.map((flag) => (
          <button
            key={flag.value || "all"}
            onClick={() => update({ flag: flag.value || undefined })}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              (search.flag ?? "") === flag.value
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {flag.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className={`${filtersOpen ? "block" : "hidden"} space-y-6 lg:block`}>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold">Search</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                update({ search: term.trim() || undefined });
              }}
            >
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Name, tag or keyword"
                className="bg-background"
              />
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold">Categories</h2>
            <div className="space-y-1">
              <button
                onClick={() => update({ category: undefined })}
                className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-xs ${!search.category ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                All categories
              </button>
              {(categories ?? []).map((category) => (
                <button
                  key={category.id}
                  onClick={() => update({ category: category.slug })}
                  className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-xs ${search.category === category.slug ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold">Max price</h2>
            <Slider
              value={[maxPrice]}
              min={299}
              max={2500}
              step={100}
              onValueChange={([value]) => setMaxPrice(value ?? 2500)}
              onValueCommit={([value]) => update({ max: value })}
            />
            <p className="mt-3 text-xs text-muted-foreground">Up to {inr(maxPrice)}</p>
          </div>
        </aside>

        <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="lg:hidden"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Filters
              </Button>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading…" : `${list.length} products`}
              </p>
            </div>
            <Select value={search.sort ?? "recommended"} onValueChange={(v) => update({ sort: v })}>
              <SelectTrigger className="w-44 bg-surface">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="price-asc">Price: low to high</SelectItem>
                <SelectItem value="price-desc">Price: high to low</SelectItem>
                <SelectItem value="rating">Top rated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : list.length ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {list.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-10 text-center">
              <p className="text-sm font-medium">No products matched those filters.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try clearing filters, or{" "}
                <Link to="/custom-printing" className="text-primary">
                  request a custom print
                </Link>
                .
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
