import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { listCategories } from "@/lib/catalog.functions";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Product Categories — MakeMyThing.in" },
      {
        name: "description",
        content:
          "Explore 3D printing categories: anime collectibles, home décor, desk accessories, keychains, miniatures, tech gear and gifts.",
      },
      { property: "og:title", content: "Product Categories — MakeMyThing.in" },
      {
        property: "og:description",
        content: "Browse every 3D printing category at MakeMyThing.in.",
      },
    ],
  }),
  component: Categories,
});

function Categories() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Categories</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        From articulated dragons to lithophane lamps — pick a lane and start browsing.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
            ))
          : (categories ?? []).map((category) => (
              <Link
                key={category.id}
                to="/shop"
                search={{ category: category.slug }}
                className="card-hover group flex flex-col justify-between rounded-2xl border border-border bg-gradient-surface p-6"
              >
                <div>
                  <h2 className="font-display text-lg font-bold">{category.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  Browse <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
      </div>
    </div>
  );
}
