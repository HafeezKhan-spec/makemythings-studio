import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/context/cart";
import { useAuth } from "@/hooks/useAuth";
import { placeOrder, quoteCart } from "@/lib/orders.functions";
import { inr } from "@/lib/format";

type CheckoutSearch = { coupon?: string | undefined };

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    coupon: typeof search["coupon"] === "string" ? search["coupon"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Secure Checkout — MakeMyThings.in" },
      { name: "description", content: "Complete your order with delivery details and secure payment." },
      { property: "og:title", content: "Secure Checkout — MakeMyThings.in" },
      { property: "og:description", content: "Fast, secure checkout with delivery across India." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { coupon } = Route.useSearch();
  const { lines, hydrated, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [address, setAddress] = useState({
    house: "",
    street: "",
    area: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    phone: "",
  });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (user?.email) setCustomer((c) => (c.email ? c : { ...c, email: user.email ?? "" }));
  }, [user]);

  const items = lines.map((line) => ({ productId: line.productId, quantity: line.quantity }));

  const { data: quote } = useQuery({
    queryKey: ["quote", items, coupon, address.country],
    queryFn: () =>
      quoteCart({
        data: { items, ...(coupon ? { couponCode: coupon } : {}), country: address.country },
      }),
    enabled: hydrated && items.length > 0,
  });

  const submit = useMutation({
    mutationFn: () =>
      placeOrder({
        data: {
          items,
          ...(coupon ? { couponCode: coupon } : {}),
          customer,
          address: {
            full_name: customer.name,
            phone: address.phone || customer.phone,
            house: address.house,
            street: address.street,
            area: address.area,
            city: address.city,
            state: address.state,
            country: address.country,
            pincode: address.pincode,
          },
          ...(notes ? { notes } : {}),
        },
      }),
    onSuccess: (order) => {
      clear();
      toast.success("Order placed successfully");
      navigate({ to: "/order/$id", params: { id: order.orderId } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (hydrated && !lines.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold">Nothing to check out</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add a product to your cart first.</p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/shop">Browse products</Link>
        </Button>
      </div>
    );
  }

  const step1Valid =
    customer.name.trim().length > 1 &&
    /.+@.+\..+/.test(customer.email) &&
    customer.phone.trim().length >= 6;
  const step2Valid =
    address.house.trim() &&
    address.city.trim() &&
    address.state.trim() &&
    /^\d{4,8}$/.test(address.pincode.trim());

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Checkout</h1>

      <ol className="mt-6 flex flex-wrap gap-3 text-xs">
        {["Customer details", "Delivery address", "Payment"].map((label, index) => (
          <li
            key={label}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 ${
              step === index + 1
                ? "border-primary bg-primary/15 text-primary"
                : step > index + 1
                  ? "border-success/40 text-success"
                  : "border-border text-muted-foreground"
            }`}
          >
            {step > index + 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
            {label}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold">Customer details</h2>
              <Field label="Full name">
                <Input
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  maxLength={100}
                  placeholder="Your name"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  maxLength={160}
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="Phone number">
                <Input
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  maxLength={20}
                  placeholder="+91 …"
                />
              </Field>
              {!user ? (
                <p className="text-xs text-muted-foreground">
                  Checking out as a guest.{" "}
                  <Link to="/auth" className="text-primary">
                    Sign in
                  </Link>{" "}
                  to save addresses and track orders.
                </p>
              ) : null}
              <Button
                className="rounded-full"
                disabled={!step1Valid}
                onClick={() => setStep(2)}
              >
                Continue to address
              </Button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold">Delivery address</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="House / Flat number">
                  <Input
                    value={address.house}
                    onChange={(e) => setAddress({ ...address, house: e.target.value })}
                    maxLength={120}
                  />
                </Field>
                <Field label="Street">
                  <Input
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    maxLength={160}
                  />
                </Field>
                <Field label="Area / Locality">
                  <Input
                    value={address.area}
                    onChange={(e) => setAddress({ ...address, area: e.target.value })}
                    maxLength={160}
                  />
                </Field>
                <Field label="City">
                  <Input
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    maxLength={80}
                  />
                </Field>
                <Field label="State">
                  <Input
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    maxLength={80}
                  />
                </Field>
                <Field label="Country">
                  <Input
                    value={address.country}
                    onChange={(e) => setAddress({ ...address, country: e.target.value })}
                    maxLength={60}
                  />
                </Field>
                <Field label="Pincode">
                  <Input
                    value={address.pincode}
                    onChange={(e) =>
                      setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 8) })
                    }
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Phone number">
                  <Input
                    value={address.phone || customer.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    maxLength={20}
                  />
                </Field>
              </div>
              <Field label="Order notes (optional)">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  placeholder="Colour preference, gift note, deadline…"
                />
              </Field>
              <div className="flex gap-2">
                <Button variant="secondary" className="rounded-full" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="rounded-full" disabled={!step2Valid} onClick={() => setStep(3)}>
                  Continue to payment
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold">Payment</h2>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4 text-primary" /> UPI · Cards · Net banking
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Online payment goes live as soon as your Razorpay keys are connected. Place the
                  order now and we'll send a secure payment link to {customer.email}; the order stays
                  in <span className="text-primary">Payment pending</span> until payment is verified
                  on our server.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="rounded-full" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  size="lg"
                  className="rounded-full"
                  disabled={submit.isPending}
                  onClick={() => submit.mutate()}
                >
                  {submit.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing order…
                    </>
                  ) : (
                    `Place order · ${inr(quote?.total ?? 0)}`
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-gradient-surface p-5">
            <h2 className="font-display text-lg font-bold">Order summary</h2>
            <ul className="mt-4 space-y-3">
              {lines.map((line) => (
                <li key={line.productId} className="flex items-center gap-3">
                  <img
                    src={line.image ?? "/images/hero-3d.jpg"}
                    alt=""
                    loading="lazy"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{line.name}</p>
                    <p className="text-[11px] text-muted-foreground">Qty {line.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold">{inr(line.price * line.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <SummaryRow label="Product subtotal" value={inr(quote?.subtotal ?? 0)} />
              {quote?.discount ? (
                <SummaryRow label="Discount" value={`− ${inr(quote.discount)}`} />
              ) : null}
              <SummaryRow
                label={
                  address.country.trim().toLowerCase() === "india"
                    ? "India standard delivery"
                    : "International delivery"
                }
                value={quote?.deliveryCharge ? inr(quote.deliveryCharge) : "Free"}
              />
              <div className="flex items-center justify-between border-t border-border pt-3">
                <dt className="font-semibold">Final amount</dt>
                <dd className="font-display text-lg font-extrabold">{inr(quote?.total ?? 0)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
