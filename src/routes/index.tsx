import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeIndianRupee,
  Boxes,
  Layers,
  Palette,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardSkeleton } from "@/components/site/ProductCard";
import { listBanners, listCategories, listProducts } from "@/lib/catalog.functions";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MakeMyThings.in — You Imagine It. We Make It." },
      {
        name: "description",
        content:
          "Premium 3D printed anime figures, collectibles, home décor, desk accessories and fully custom prints. Delivered across India.",
      },
      { property: "og:title", content: "MakeMyThings.in — You Imagine It. We Make It." },
      {
        property: "og:description",
        content: "Custom 3D printing studio for collectibles, décor and personalised gifts in India.",
      },
    ],
  }),
  component: Home,
});

const BENEFITS = [
  { icon: Layers, title: "High-quality printing", text: "0.1mm layer precision, hand-finished." },
  { icon: Palette, title: "Custom designs", text: "Send an idea, photo or STL — we build it." },
  { icon: Boxes, title: "Materials & colours", text: "PLA+, PETG, resin finish and silk colours." },
  { icon: BadgeIndianRupee, title: "Affordable pricing", text: "Studio quality from just ₹299." },
  { icon: ShieldCheck, title: "Secure payments", text: "UPI, cards and net banking supported." },
  { icon: Truck, title: "Delivery across India", text: "Tracked shipping to every pincode." },
];

function Home() {
  const { data: featured, isLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => listProducts({ data: { flag: "featured", limit: 8 } }),
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });
  const { data: banners } = useQuery({ queryKey: ["banners"], queryFn: () => listBanners() });

  return (
    <>
      {/* Hero */}
      <section className="grid-glow relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Studio-grade 3D printing in India
            </span>
            <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold sm:text-5xl lg:text-6xl">
              You Imagine It.
              <br />
              <span className="text-gradient-ember">We Make It.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Anime figures, collectibles, décor and desk pieces — printed to order. Or send us a
              sketch, a photo or an STL file and we'll turn it into something you can hold.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/shop">
                  Explore Products <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="rounded-full">
                <Link to="/custom-printing">Create Your Own</Link>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
              {[
                ["1,800+", "Prints shipped"],
                ["4.8★", "Average rating"],
                ["48h", "Fastest dispatch"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-border bg-surface/60 p-3">
                  <dt className="font-display text-lg font-bold">{value}</dt>
                  <dd className="text-[11px] text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-ember opacity-20 blur-3xl" />
            <img
              src="/images/hero-3d.jpg"
              alt="A collection of premium 3D printed figures, planters and statues"
              width={1600}
              height={1200}
              className="relative rounded-[1.75rem] border border-border object-cover shadow-lift"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHead
          eyebrow="Browse"
          title="Shop by category"
          action={{ to: "/categories", label: "All categories" }}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(categories ?? []).map((category) => (
            <Link
              key={category.id}
              to="/shop"
              search={{ category: category.slug }}
              className="card-hover group relative overflow-hidden rounded-2xl border border-border bg-gradient-surface p-5"
            >
              <span className="font-display text-sm font-bold sm:text-base">{category.name}</span>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {category.description}
              </p>
              <ArrowRight className="mt-4 h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <SectionHead
          eyebrow="Popular right now"
          title="Featured products"
          action={{ to: "/shop", label: "Shop all" }}
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : ((featured ?? []) as unknown as Product[]).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>
      </section>

      {/* Banners */}
      {banners?.length ? (
        <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-16 sm:px-6 md:grid-cols-2">
          {banners.map((banner) => (
            <article
              key={banner.id}
              className="relative overflow-hidden rounded-3xl border border-border bg-surface"
            >
              {banner.image_url ? (
                <img
                  src={banner.image_url}
                  alt=""
                  loading="lazy"
                  width={800}
                  height={500}
                  className="h-56 w-full object-cover opacity-45"
                />
              ) : (
                <div className="h-56 bg-gradient-surface" />
              )}
              <div className="absolute inset-0 flex flex-col justify-center gap-2 bg-background/40 p-7">
                <h3 className="max-w-xs font-display text-xl font-bold sm:text-2xl">
                  {banner.heading}
                </h3>
                <p className="max-w-sm text-sm text-muted-foreground">{banner.description}</p>
                {banner.cta_link ? (
                  <Button asChild size="sm" className="mt-3 w-fit rounded-full">
                    <a href={banner.cta_link}>{banner.cta_label ?? "Shop now"}</a>
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {/* Why us */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHead eyebrow="Why MakeMyThings?" title="Built by makers, for makers" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-2xl border border-border bg-background/60 p-5"
              >
                <benefit.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{benefit.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-surface p-8 text-center sm:p-14">
          <div className="absolute -top-24 left-1/2 h-48 w-[28rem] -translate-x-1/2 bg-gradient-ember opacity-20 blur-3xl" />
          <h2 className="relative font-display text-2xl font-extrabold sm:text-4xl">
            Custom 3D printing, start to finish
          </h2>
          <p className="relative mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Don't have a 3D model? We can help turn your idea into reality — send a reference photo
            or a description and our designers will model it for you.
          </p>
          <Button asChild size="lg" className="relative mt-8 rounded-full">
            <Link to="/custom-printing">
              Request a custom print <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: { to: "/shop" | "/categories"; label: string };
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        <span className="text-xs font-semibold tracking-widest text-primary uppercase">
          {eyebrow}
        </span>
        <h2 className="mt-1.5 font-display text-2xl font-extrabold sm:text-3xl">{title}</h2>
      </div>
      {action ? (
        <Link
          to={action.to}
          className="hidden shrink-0 text-sm font-medium text-muted-foreground hover:text-primary sm:block"
        >
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}
