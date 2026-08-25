import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — MakeMyThing.in" },
      { name: "description", content: "How MakeMyThing.in collects, uses and protects your personal information." },
    ],
  }),
  component: () => (
    <LegalPage title="Privacy Policy" updated="August 2026">
      <p>
        MakeMyThing.in respects your privacy. We collect information you provide when creating an
        account, placing an order, or submitting a custom printing request — including name, email,
        phone number and delivery address.
      </p>
      <p>
        Payment processing is handled securely by Razorpay. We do not store card or UPI credentials
        on our servers. Order and payment references are stored to fulfil your purchase and provide
        support.
      </p>
      <p>
        We use your email to send order updates, OTP login codes and service communications. You may
        contact us at hello@MakeMyThing.in to request access, correction or deletion of your data
        where applicable under Indian law.
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
        if you have questions about this policy.
      </p>
    </div>
  );
}
