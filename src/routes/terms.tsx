import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — MakeMyThing.in" },
      { name: "description", content: "Terms of use for shopping and custom 3D printing services at MakeMyThing.in." },
    ],
  }),
  component: () => (
    <LegalPage title="Terms & Conditions" updated="August 2026">
      <p>
        By using MakeMyThing.in you agree to these terms. Products are made to order via 3D printing.
        Colours, finishes and minor surface variations may differ slightly from preview images.
      </p>
      <p>
        Prices, discounts and delivery charges are calculated at checkout. You are responsible for
        providing accurate contact and delivery details. Custom printing quotes are estimates until
        confirmed by our team.
      </p>
      <p>
        We reserve the right to refuse or cancel orders that violate applicable law, contain
        infringing content, or cannot be manufactured safely. Liability is limited to the value of the
        affected order to the extent permitted by law.
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
        for clarifications.
      </p>
    </div>
  );
}
