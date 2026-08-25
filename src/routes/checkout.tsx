import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Loader2, MapPin, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/context/cart";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpay, openRazorpayCheckout } from "@/hooks/useRazorpay";
import { listMyAddresses, getProfile } from "@/lib/profile.functions";
import {
  cancelPendingOrder,
  placeOrder,
  quoteCart,
  verifyPayment,
} from "@/lib/orders.functions";
import { inr } from "@/lib/format";
import { checkoutRedirectPath } from "@/lib/auth-redirect";

type CheckoutSearch = { coupon?: string | undefined };

type AddressForm = {
  full_name: string;
  phone: string;
  house: string;
  street: string;
  area: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    coupon: typeof search["coupon"] === "string" ? search["coupon"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Secure Checkout — MakeMyThing.in" },
      { name: "description", content: "Complete your order with delivery details and secure payment." },
      { property: "og:title", content: "Secure Checkout — MakeMyThing.in" },
      { property: "og:description", content: "Fast, secure checkout with delivery across India." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

const STEPS = ["Customer details", "Delivery address", "Order review", "Payment"] as const;

function Checkout() {
  const { coupon } = Route.useSearch();
  const { lines, hydrated, clear } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { ready: razorpayReady, error: razorpayError } = useRazorpay();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({
        to: "/auth",
        search: { redirect: checkoutRedirectPath(coupon) },
        replace: true,
      });
    }
  }, [authLoading, user, navigate, coupon]);

  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [address, setAddress] = useState<AddressForm>({
    house: "",
    street: "",
    area: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    full_name: "",
    phone: "",
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [notes, setNotes] = useState("");

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: () => getProfile(),
  });

  const savedAddresses = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: Boolean(user),
    queryFn: () => listMyAddresses(),
  });

  useEffect(() => {
    if (user?.email) {
      setCustomer((c) => ({
        name: c.name || (profile.data?.full_name as string) || "",
        email: c.email || user.email || "",
        phone: c.phone || (profile.data?.phone as string) || "",
      }));
    }
  }, [user, profile.data]);

  useEffect(() => {
    if (savedAddresses.data?.length && !selectedAddressId && !showNewAddress) {
      const defaultAddr = savedAddresses.data.find((a) => a.is_default) ?? savedAddresses.data[0];
      if (defaultAddr) selectAddress(defaultAddr);
    }
  }, [savedAddresses.data]);

  function selectAddress(addr: {
    id: string;
    full_name: string;
    phone: string;
    house: string;
    street: string | null;
    area: string | null;
    city: string;
    state: string;
    country: string;
    pincode: string;
  }) {
    setSelectedAddressId(addr.id);
    setShowNewAddress(false);
    setAddress({
      full_name: addr.full_name,
      phone: addr.phone,
      house: addr.house,
      street: addr.street ?? "",
      area: addr.area ?? "",
      city: addr.city,
      state: addr.state,
      country: addr.country,
      pincode: addr.pincode,
    });
  }

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
            full_name: address.full_name || customer.name,
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
          saveAddress: saveAddress && showNewAddress,
          ...(selectedAddressId ? { addressId: selectedAddressId } : {}),
        },
      }),
    onError: (error: Error) => toast.error(error.message),
  });

  async function openPaymentModal(result: {
    orderId: string;
    orderNumber: string;
    payment: {
      keyId: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      razorpayOrderId: string;
      prefill: { name: string; email: string; contact: string };
    };
  }) {
    const checkout = await openRazorpayCheckout({
      key: result.payment.keyId,
      amount: result.payment.amount,
      currency: result.payment.currency,
      name: result.payment.name,
      description: result.payment.description,
      order_id: result.payment.razorpayOrderId,
      prefill: result.payment.prefill,
      theme: { color: "#f97316" },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
            await verifyPayment({
              data: {
                orderId: result.orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            });
            clear();
            setPaymentError(null);
            toast.success("Payment successful — your order is confirmed!");
            navigate({
              to: "/order/$id",
              params: { id: result.orderId },
              search: { paid: "1" },
            });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Payment verification failed";
          setPaymentError(message);
          toast.error("Payment was not completed", { description: message });
        }
      },
      modal: {
        ondismiss: () => {
          setPaymentError("Payment was not completed. Your order has not been placed.");
          toast.error("Payment was not completed", {
            description: "Your order has not been placed. You can try again below.",
          });
          void cancelPendingOrder({
            data: { orderId: result.orderId },
          }).catch(() => undefined);
        },
      },
    });
    checkout.open();
  }

  async function handlePayNow() {
    if (paymentBusy || submit.isPending) return;
    setPaymentBusy(true);
    setPaymentError(null);
    try {
      const result = await submit.mutateAsync();
      await openPaymentModal(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start payment");
    } finally {
      setPaymentBusy(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

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
    /^\d{4,8}$/.test(address.pincode.trim()) &&
    (address.full_name.trim() || customer.name.trim());

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Checkout</h1>

      <ol className="mt-6 flex flex-wrap gap-3 text-xs">
        {STEPS.map((label, index) => (
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
            {step > index + 1 ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <span>{index + 1}</span>
            )}
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
                  placeholder="Your name"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="you@example.com"
                  disabled
                />
              </Field>
              <Field label="Phone number">
                <Input
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="+91 …"
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                Signed in as {user.email}. Delivery details are saved to your account.
              </p>
              <Button className="rounded-full" disabled={!step1Valid} onClick={() => setStep(2)}>
                Continue to address
              </Button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold">Delivery address</h2>

              {user && savedAddresses.data?.length && !showNewAddress ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Select a saved address</p>
                  {(savedAddresses.data as Array<{
                    id: string;
                    full_name: string;
                    phone: string;
                    house: string;
                    street: string | null;
                    area: string | null;
                    city: string;
                    state: string;
                    country: string;
                    pincode: string;
                    label: string | null;
                  }>).map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => selectAddress(addr)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors ${
                        selectedAddressId === addr.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <MapPin className="h-4 w-4 text-primary" />
                        {addr.label || "Saved address"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {addr.full_name} · {addr.phone}
                        <br />
                        {[addr.house, addr.street, addr.area].filter(Boolean).join(", ")}
                        <br />
                        {addr.city}, {addr.state} {addr.pincode}, {addr.country}
                      </p>
                    </button>
                  ))}
                </div>
              ) : null}

              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() => {
                  setShowNewAddress(true);
                  setSelectedAddressId(null);
                  setAddress((a) => ({
                    ...a,
                    full_name: customer.name,
                    phone: customer.phone,
                  }));
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add new address
              </Button>

              {showNewAddress || !user || !savedAddresses.data?.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <Input
                      value={address.full_name || customer.name}
                      onChange={(e) => setAddress({ ...address, full_name: e.target.value })}
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={address.phone || customer.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    />
                  </Field>
                  <Field label="House / Flat">
                    <Input
                      value={address.house}
                      onChange={(e) => setAddress({ ...address, house: e.target.value })}
                    />
                  </Field>
                  <Field label="Street">
                    <Input
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    />
                  </Field>
                  <Field label="Area">
                    <Input
                      value={address.area}
                      onChange={(e) => setAddress({ ...address, area: e.target.value })}
                    />
                  </Field>
                  <Field label="City">
                    <Input
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    />
                  </Field>
                  <Field label="State">
                    <Input
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    />
                  </Field>
                  <Field label="Pincode">
                    <Input
                      value={address.pincode}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          pincode: e.target.value.replace(/\D/g, "").slice(0, 8),
                        })
                      }
                      inputMode="numeric"
                    />
                  </Field>
                </div>
              ) : null}

              {user && showNewAddress ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={saveAddress} onCheckedChange={(v) => setSaveAddress(Boolean(v))} />
                  Save this address to my account
                </label>
              ) : null}

              <Field label="Order notes (optional)">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Colour preference, gift note…"
                />
              </Field>

              <div className="flex gap-2">
                <Button variant="secondary" className="rounded-full" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="rounded-full" disabled={!step2Valid} onClick={() => setStep(3)}>
                  Review order
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold">Order review</h2>
              <div className="rounded-xl border border-border bg-background p-4 text-sm">
                <p className="font-medium">{customer.name}</p>
                <p className="text-xs text-muted-foreground">{customer.email} · {customer.phone}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4 text-sm">
                <p className="font-medium">Delivery to</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {address.full_name || customer.name}
                  <br />
                  {[address.house, address.street, address.area].filter(Boolean).join(", ")}
                  <br />
                  {address.city}, {address.state} {address.pincode}
                  <br />
                  {address.country}
                </p>
              </div>
              <ul className="space-y-2">
                {lines.map((line) => (
                  <li
                    key={line.productId}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <img
                      src={line.image ?? "/images/hero-3d.jpg"}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <span className="flex-1">{line.name}</span>
                    <span className="text-muted-foreground">×{line.quantity}</span>
                    <span className="font-semibold">{inr(line.price * line.quantity)}</span>
                  </li>
                ))}
              </ul>
              <dl className="space-y-2 text-sm">
                <SummaryRow label="Subtotal" value={inr(quote?.subtotal ?? 0)} />
                {quote?.discount ? (
                  <SummaryRow label="Discount" value={`− ${inr(quote.discount)}`} />
                ) : null}
                <SummaryRow
                  label="Delivery"
                  value={quote?.deliveryCharge ? inr(quote.deliveryCharge) : "Free"}
                />
                <SummaryRow label="Final amount" value={inr(quote?.total ?? 0)} strong />
              </dl>
              <div className="flex gap-2">
                <Button variant="secondary" className="rounded-full" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button className="rounded-full" onClick={() => setStep(4)}>
                  Continue to payment
                </Button>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold">Payment</h2>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4 text-primary" /> Secure payment via Razorpay
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Your order is only confirmed after payment is verified on our servers. If you
                  cancel or close the payment window, no order is placed.
                </p>
                {razorpayError ? (
                  <p className="mt-2 text-xs text-destructive">{razorpayError}</p>
                ) : null}
              </div>
              {paymentError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  {paymentError}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="rounded-full" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button
                  size="lg"
                  className="rounded-full"
                  disabled={paymentBusy || submit.isPending || !razorpayReady}
                  onClick={() => void handlePayNow()}
                >
                  {paymentBusy || submit.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                    </>
                  ) : (
                    `Pay securely · ${inr(quote?.total ?? 0)}`
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

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</dt>
      <dd className={strong ? "font-display text-lg font-extrabold" : "font-medium"}>{value}</dd>
    </div>
  );
}
