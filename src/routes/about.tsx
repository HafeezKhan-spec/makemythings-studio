import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Our 3D Printing Studio — MakeMyThings.in" },
      {
        name: "description",
        content:
          "MakeMyThings.in is an Indian 3D printing studio making collectibles, décor and custom products to order.",
      },
      { property: "og:title", content: "About MakeMyThings.in" },
      {
        property: "og:description",
        content: "An Indian 3D printing studio for collectibles, décor and custom products.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
        We print the things you can't buy anywhere else
      </h1>
      <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
        <p>
          MakeMyThings.in started with one printer, a spool of grey PLA and a lot of requests from
          friends. Today we run a small studio in India producing collectibles, home décor, desk
          accessories and completely custom pieces for customers across the country.
        </p>
        <p>
          Every order is printed to order — nothing sits in a warehouse. We tune each model for
          strength and surface finish, print at 0.1mm layers where detail matters, then hand-finish,
          inspect and pack it.
        </p>
        <p>
          If you can describe it, we can usually make it. Send a photo, a sketch or an STL file and
          our design team will come back with a plan, a material recommendation and a price.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ["0.1mm", "Layer precision"],
          ["7", "Material options"],
          ["Pan-India", "Tracked delivery"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-border bg-gradient-surface p-5">
            <p className="font-display text-xl font-extrabold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
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
