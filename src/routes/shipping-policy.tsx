import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/shipping-policy")({
  head: () => ({
    meta: [
      { title: "Shipping Policy — MakeMyThing.in" },
      { name: "description", content: "Delivery timelines, shipping charges and coverage across India." },
    ],
  }),
  component: () => (
    <LegalPage title="Shipping Policy" updated="August 2026">
      <p>
        We ship across India using tracked courier partners. Standard delivery charges are configured
        in our store settings and calculated at checkout — never on the client alone. Free delivery
        may apply above the published order threshold.
      </p>
      <p>
        Production time varies by product (typically 2–7 business days) before dispatch. Estimated
        delivery is shown on your order confirmation after payment.
      </p>
      <p>
        International shipping may be available on request. Express delivery options will be added as
        we expand service areas.
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
        for shipping questions.
      </p>
    </div>
  );
}
