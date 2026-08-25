import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — MakeMyThing.in" },
      { name: "description", content: "Cancellation, returns and refund guidelines for MakeMyThing.in orders." },
    ],
  }),
  component: () => (
    <LegalPage title="Refund & Cancellation Policy" updated="August 2026">
      <p>
        Because items are custom-made to order, cancellations are accepted only before production
        begins. Contact us immediately with your order number if you need to cancel.
      </p>
      <p>
        Defective or damaged items must be reported within 48 hours of delivery with photos. We will
        repair, reprint or refund at our discretion once verified.
      </p>
      <p>
        Approved refunds are processed to the original payment method via Razorpay within 5–10
        business days. Custom printing deposits may be non-refundable once modelling work has
        started.
      </p>
    </LegalPage>
  ),
});

function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="text-xs text-muted-foreground">Last updated: {updated}</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold">{title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
      <p className="mt-8 text-sm">
        <Link to="/contact" className="text-primary hover:underline">
          Contact us
        </Link>{" "}
        to request a cancellation or refund.
      </p>
    </div>
  );
}
