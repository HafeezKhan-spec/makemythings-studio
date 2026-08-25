import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Package, Plus, Trash2, UserCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteMyAddress,
  getProfile,
  listMyAddresses,
  saveMyAddress,
  updateProfile,
} from "@/lib/profile.functions";
import { formatDate, inr, orderStatusLabel } from "@/lib/format";
import { listMyCustomRequests } from "@/lib/custom-request.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Account — MakeMyThing.in" },
      { name: "description", content: "Manage your profile, saved addresses and account settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type AddressRow = {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  house: string;
  street: string | null;
  area: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  is_default: boolean;
};

const emptyAddress = {
  label: "",
  full_name: "",
  phone: "",
  house: "",
  street: "",
  area: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
};

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const qc = useQueryClient();

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: () => getProfile(),
  });

  const addresses = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: Boolean(user),
    queryFn: () => listMyAddresses(),
  });

  const customRequests = useQuery({
    queryKey: ["my-custom-requests", user?.id],
    enabled: Boolean(user),
    queryFn: () => listMyCustomRequests(),
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [editingAddress, setEditingAddress] = useState<typeof emptyAddress & { id?: string } | null>(
    null,
  );

  const saveProfile = useMutation({
    mutationFn: () => updateProfile({ data: { full_name: name, phone } }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAddress = useMutation({
    mutationFn: (payload: typeof emptyAddress & { id?: string }) =>
      saveMyAddress({ data: payload }),
    onSuccess: () => {
      toast.success("Address saved");
      setEditingAddress(null);
      qc.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAddress = useMutation({
    mutationFn: (id: string) => deleteMyAddress({ data: { id } }),
    onSuccess: () => {
      toast.success("Address removed");
      qc.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <UserCircle className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-extrabold">Sign in to your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your profile, saved addresses and order history.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  const profileData = profile.data;
  const displayName = name || profileData?.full_name || user.email?.split("@")[0] || "Customer";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">My account</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="secondary" className="rounded-full" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>

      <Tabs defaultValue="profile" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="custom">Custom prints</TabsTrigger>
          <TabsTrigger value="orders" asChild>
            <Link to="/orders">Orders</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold">Personal information</h2>
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveProfile.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Full name</Label>
                <Input
                  defaultValue={profileData?.full_name ?? ""}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={displayName}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={user.email ?? ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  defaultValue={profileData?.phone ?? ""}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 …"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Member since {formatDate(profileData?.created_at)}
              </p>
              <Button type="submit" className="rounded-full" disabled={saveProfile.isPending}>
                Save changes
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="custom">
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-display text-lg font-bold">Custom printing requests</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Quotes from our team for your custom print requests.
              </p>
              {(customRequests.data ?? []).length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No requests yet.{" "}
                  <Link to="/custom-printing" className="text-primary hover:underline">
                    Start a custom request
                  </Link>
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {(customRequests.data ?? []).map((req) => (
                    <article
                      key={req.id}
                      className="rounded-xl border border-border bg-background/40 p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{orderStatusLabel(req.status)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(req.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 text-muted-foreground">{req.description}</p>
                      {req.quoted_price != null && req.quote_message ? (
                        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
                          <p className="font-display text-lg font-extrabold text-primary">
                            {inr(req.quoted_price)}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm">{req.quote_message}</p>
                          {req.quote_sent_at ? (
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              Quoted on {formatDate(req.quote_sent_at)}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">Awaiting quote from our team.</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="addresses">
          <div className="mt-6 space-y-4">
            {!editingAddress ? (
              <Button
                className="rounded-full"
                onClick={() =>
                  setEditingAddress({
                    ...emptyAddress,
                    full_name: profileData?.full_name ?? "",
                    phone: profileData?.phone ?? "",
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add new address
              </Button>
            ) : null}

            {editingAddress ? (
              <AddressForm
                value={editingAddress}
                onChange={setEditingAddress}
                onCancel={() => setEditingAddress(null)}
                onSave={() => saveAddress.mutate(editingAddress)}
                saving={saveAddress.isPending}
              />
            ) : null}

            {(addresses.data as AddressRow[] | undefined)?.map((addr) => (
              <article
                key={addr.id}
                className={`rounded-2xl border p-5 ${
                  addr.is_default ? "border-primary bg-primary/5" : "border-border bg-surface"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">
                        {addr.label || "Saved address"}
                        {addr.is_default ? (
                          <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                            Default
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm">{addr.full_name} · {addr.phone}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[addr.house, addr.street, addr.area].filter(Boolean).join(", ")}
                        <br />
                        {addr.city}, {addr.state} {addr.pincode}
                        <br />
                        {addr.country}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => setEditingAddress({ ...addr, label: addr.label ?? "" })}
                    >
                      Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete address"
                      onClick={() => removeAddress.mutate(addr.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}

            {!addresses.isLoading && !addresses.data?.length && !editingAddress ? (
              <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="mt-6 rounded-2xl border border-border bg-surface p-8 text-center">
            <Package className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 text-sm">View your full order history and tracking.</p>
            <Button asChild className="mt-4 rounded-full">
              <Link to="/orders">Go to My Orders</Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AddressForm({
  value,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  value: typeof emptyAddress & { id?: string };
  onChange: (v: typeof emptyAddress & { id?: string }) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold">{value.id ? "Edit address" : "New address"}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(
          [
            ["label", "Label (Home, Office…)", false],
            ["full_name", "Full name", true],
            ["phone", "Phone", true],
            ["house", "House / Flat", true],
            ["street", "Street", false],
            ["area", "Area", false],
            ["city", "City", true],
            ["state", "State", true],
            ["country", "Country", true],
            ["pincode", "Pincode", true],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Input
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" className="rounded-full" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="rounded-full" disabled={saving} onClick={onSave}>
          Save address
        </Button>
      </div>
    </div>
  );
}
