import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getStoreSettings } from "@/lib/catalog.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact MakeMyThings.in — 3D Printing Support" },
      {
        name: "description",
        content: "Questions about an order or a custom print? Reach the MakeMyThings.in studio team.",
      },
      { property: "og:title", content: "Contact MakeMyThings.in" },
      { property: "og:description", content: "Talk to our 3D printing studio team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => getStoreSettings(),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Contact us</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Our studio replies to every message within one working day.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${settings?.business_email ?? "hello@makemythings.in"}`}
          className="card-hover rounded-2xl border border-border bg-gradient-surface p-5"
        >
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="mt-3 text-sm font-semibold">Email</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {settings?.business_email ?? "hello@makemythings.in"}
          </p>
        </a>
        <a
          href={`tel:${settings?.business_phone ?? "+919876543210"}`}
          className="card-hover rounded-2xl border border-border bg-gradient-surface p-5"
        >
          <Phone className="h-5 w-5 text-primary" />
          <h2 className="mt-3 text-sm font-semibold">Phone</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {settings?.business_phone ?? "+91 98765 43210"}
          </p>
        </a>
        {settings?.whatsapp_number ? (
          <a
            href={`https://wa.me/${settings.whatsapp_number}`}
            target="_blank"
            rel="noreferrer"
            className="card-hover rounded-2xl border border-border bg-gradient-surface p-5"
          >
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-sm font-semibold">WhatsApp</h2>
            <p className="mt-1 text-xs text-muted-foreground">Fastest for custom print questions</p>
          </a>
        ) : null}
        <div className="rounded-2xl border border-border bg-gradient-surface p-5">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="mt-3 text-sm font-semibold">Studio</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {settings?.business_address ?? "Bengaluru, Karnataka, India"}
          </p>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-bold">Want something custom made?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the custom print form so we get your files, size and quantity in one go.
        </p>
        <Button asChild className="mt-5 rounded-full">
          <Link to="/custom-printing">Start a custom request</Link>
        </Button>
      </div>
    </div>
  );
}
