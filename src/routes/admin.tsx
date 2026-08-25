import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminPanel, AdminShell, StatCard, type AdminSection } from "@/components/admin/AdminShell";
import { CustomRequestCard, type AdminCustomRequestRow } from "@/components/admin/CustomRequestCard";
import { OrderDetailPanel } from "@/components/admin/OrderDetailPanel";
import { ProductMediaUploader } from "@/components/admin/ProductMediaUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  adminAcknowledgeRequest,
  adminDeleteBanner,
  adminDeleteCategory,
  adminDeleteCoupon,
  adminDeleteProduct,
  adminDeleteReview,
  adminGetSettings,
  adminListBanners,
  adminListCategories,
  adminListCoupons,
  adminListCustomers,
  adminListOrders,
  adminListProducts,
  adminListRequests,
  adminListReviews,
  adminSaveBanner,
  adminSaveCategory,
  adminSaveCoupon,
  adminSaveProduct,
  adminSaveSettings,
  adminSendRequestQuote,
  adminUpdateCustomer,
  adminUpdateOrder,
  adminUpdateRequest,
  adminUpdateReview,
  getAdminDashboard,
  getAdminNotifications,
  getMyAccess,
} from "@/lib/admin.functions";
import { ADMIN_ORDER_STATUSES, paymentStatusLabel } from "@/lib/format";
import { inr, formatDate, orderStatusLabel } from "@/lib/format";

const FULFILLMENT_STATUSES = [
  "paid",
  "processing",
  "printing",
  "quality_check",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

type AdminOrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  total: number;
  status: string;
  payment_status: string;
  created_at?: string;
  is_new?: boolean;
  awb_number?: string;
};

function matchesOrderFilter(order: AdminOrderRow, filter: string) {
  if (filter === "all") return true;
  if (filter === "new") return Boolean(order.is_new);
  if (filter === "unpaid") return order.payment_status !== "paid";
  if (filter === "paid_ready") return order.payment_status === "paid";
  return order.status === filter;
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — MakeMyThing.in" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { user, loading, refresh } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isFulfillmentDoc = /\/admin\/orders\/[^/]+\/(label|invoice)$/.test(pathname);
  const [section, setSection] = useState<AdminSection>("overview");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const access = useQuery({
    queryKey: ["admin-access", user?.id],
    enabled: Boolean(user),
    queryFn: () => getMyAccess(),
  });

  useEffect(() => {
    if (user && !user.is_admin) void refresh();
  }, [user, refresh]);

  const isAdmin = Boolean(user?.is_admin || access.data?.isAdmin);

  const notifications = useQuery({
    queryKey: ["admin-notifications"],
    enabled: isAdmin,
    queryFn: () => getAdminNotifications(),
    refetchInterval: 30_000,
  });

  if (loading || (user && !user.is_admin && access.isLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-extrabold">Admin access only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user
            ? access.isError
              ? "Could not verify admin access. Sign out and sign in again with hk386579@gmail.com."
              : "Your account doesn't have the admin role yet. Sign in as hk386579@gmail.com after registering."
            : "Sign in with an admin account to continue."}
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to={user ? "/" : "/auth"}>{user ? "Back to store" : "Sign in"}</Link>
        </Button>
      </div>
    );
  }

  if (isFulfillmentDoc) {
    return <Outlet />;
  }

  return (
    <AdminShell
      section={section}
      onSection={(s) => {
        setSection(s);
        if (s !== "orders") setSelectedOrderId(null);
      }}
      newOrderCount={notifications.data?.orderCount ?? 0}
      newRequestCount={notifications.data?.requestCount ?? 0}
    >
      {section === "overview" ? (
        <Overview
          onOpenOrder={(id) => {
            setSelectedOrderId(id);
            setSection("orders");
          }}
          onOpenRequests={() => setSection("requests")}
        />
      ) : null}
      {section === "products" ? <Products /> : null}
      {section === "categories" ? <Categories /> : null}
      {section === "orders" ? (
        selectedOrderId ? (
          <OrderDetailPanel orderId={selectedOrderId} onBack={() => setSelectedOrderId(null)} />
        ) : (
          <Orders onSelect={setSelectedOrderId} />
        )
      ) : null}
      {section === "customers" ? <Customers /> : null}
      {section === "coupons" ? <Coupons /> : null}
      {section === "banners" ? <Banners /> : null}
      {section === "requests" ? <Requests /> : null}
      {section === "reviews" ? <Reviews /> : null}
      {section === "analytics" ? <Analytics /> : null}
      {section === "settings" ? <SettingsPanel /> : null}
    </AdminShell>
  );
}

function Overview({
  onOpenOrder,
  onOpenRequests,
}: {
  onOpenOrder: (id: string) => void;
  onOpenRequests: () => void;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => getAdminDashboard() });
  const notifications = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => getAdminNotifications(),
    refetchInterval: 30_000,
  });
  const statusUpdate = useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      adminUpdateOrder({ data: input as never }),
    onSuccess: () => {
      toast.success("Order status updated");
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const stats = [
    ["Total revenue", inr(data?.revenue ?? 0)],
    ["Today's revenue", inr(data?.todayRevenue ?? 0)],
    ["Total orders", String(data?.orderCount ?? 0)],
    ["Pending orders", String(data?.pendingOrders ?? 0)],
    ["Processing", String(data?.processingOrders ?? 0)],
    ["Completed", String(data?.completedOrders ?? 0)],
    ["Customers", String(data?.customerCount ?? 0)],
    ["Products", String(data?.productCount ?? 0)],
    ["Low stock", String(data?.lowStock ?? 0)],
  ] as const;

  return (
    <div className="space-y-6">
      {(notifications.data?.orderCount ?? 0) > 0 ? (
        <AdminPanel title={`Orders needing attention (${notifications.data?.orderCount})`}>
          <div className="space-y-2">
            {(notifications.data?.orders ?? []).map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onOpenOrder(order.id)}
                className="flex w-full items-center justify-between rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-left text-sm transition-colors hover:bg-orange-500/20"
              >
                <span>
                  <span className="mr-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                    NEW
                  </span>
                  <span className="font-bold">{order.order_number}</span> · {order.customer_name}
                </span>
                <span className="font-semibold">{inr(Number(order.total))}</span>
              </button>
            ))}
          </div>
        </AdminPanel>
      ) : null}
      {(notifications.data?.requestCount ?? 0) > 0 ? (
        <AdminPanel title={`Custom requests needing review (${notifications.data?.requestCount})`}>
          <div className="space-y-2">
            {(notifications.data?.requests ?? []).map((req) => (
              <button
                key={req.id}
                type="button"
                onClick={onOpenRequests}
                className="flex w-full flex-col rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-left text-sm transition-colors hover:bg-orange-500/20"
              >
                <span>
                  <span className="mr-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                    NEW
                  </span>
                  <span className="font-bold">{req.name}</span>
                  <span className="text-muted-foreground"> · {req.email}</span>
                </span>
                <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{req.description}</span>
              </button>
            ))}
          </div>
        </AdminPanel>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <StatCard key={label} label={label} value={value} />
        ))}
      </div>
      <AdminPanel title="Recent orders — update fulfillment status">
        <div className="space-y-2">
          {(data?.recentOrders ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : null}
          {(data?.recentOrders ?? []).map((order) => {
            const row = order as AdminOrderRow;
            const isPaid = row.payment_status === "paid";
            return (
              <div
                key={row.id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  row.is_new ? "border-orange-500/50 bg-orange-500/5" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenOrder(row.id)}
                    className="font-bold hover:text-primary"
                  >
                    {row.is_new ? (
                      <span className="mr-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                        NEW
                      </span>
                    ) : null}
                    {row.order_number}
                  </button>
                  <span className="text-xs text-muted-foreground">{row.customer_name}</span>
                  <span className="text-xs">{formatDate(String(row.created_at))}</span>
                  <span className="font-semibold">{inr(Number(row.total))}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px]">
                    Payment: {paymentStatusLabel(row.payment_status)}
                  </span>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] text-primary">
                    Status: {orderStatusLabel(row.status)}
                  </span>
                  {isPaid ? (
                    <Select
                      value={row.status}
                      onValueChange={(v) => statusUpdate.mutate({ id: row.id, status: v })}
                    >
                      <SelectTrigger className="h-8 w-44 text-xs">
                        <SelectValue placeholder="Update status" />
                      </SelectTrigger>
                      <SelectContent>
                        {FULFILLMENT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            → {orderStatusLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      Awaiting payment — cannot ship until paid
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 rounded-full text-xs"
                    onClick={() => onOpenOrder(row.id)}
                  >
                    Manage order
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </AdminPanel>
    </div>
  );
}

function Analytics() {
  const { data } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => getAdminDashboard() });
  return (
    <div className="space-y-6">
      <AdminPanel title="Sales over time">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.salesChart ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </AdminPanel>
      <AdminPanel title="Best-selling products">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.bestSellers ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="qty" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AdminPanel>
    </div>
  );
}

function Products() {
  const qc = useQueryClient();
  const { data: products } = useQuery({ queryKey: ["admin-products"], queryFn: () => adminListProducts() });
  const { data: categories } = useQuery({ queryKey: ["admin-categories"], queryFn: () => adminListCategories() });
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      (products ?? []).filter((p) =>
        String(p.name).toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => adminSaveProduct({ data: payload as never }),
    onSuccess: () => {
      toast.success("Product saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteProduct({ data: { id } }),
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          className="rounded-full"
          onClick={() =>
            setEditing({
              name: "",
              price: 0,
              stock: 10,
              images: [],
              videos: [],
              colors: [],
              tags: [],
              is_active: true,
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Add product
        </Button>
      </div>

      {editing ? (
        <ProductForm
          value={editing}
          categories={categories ?? []}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={() => save.mutate(editing)}
          saving={save.isPending}
        />
      ) : null}

      <AdminPanel title={`Products (${filtered.length})`}>
        <div className="space-y-2">
          {filtered.map((product) => (
            <div
              key={product.id as string}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
            >
              <span className="font-medium">{String(product.name)}</span>
              <span className="text-xs text-muted-foreground">Stock {Number(product.stock)}</span>
              <span className="font-semibold">{inr(Number(product.price))}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(product as Record<string, unknown>)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(product.id as string)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}

function ProductForm({
  value,
  categories,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  value: Record<string, unknown>;
  categories: { id: string; name: string }[];
  onChange: (v: Record<string, unknown>) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const set = (key: string, val: unknown) => onChange({ ...value, [key]: val });
  return (
    <AdminPanel title={value.id ? "Edit product" : "New product"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input value={String(value.name ?? "")} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Price (₹)">
          <Input type="number" value={Number(value.price ?? 0)} onChange={(e) => set("price", Number(e.target.value))} />
        </Field>
        <Field label="Original price">
          <Input
            type="number"
            value={value.original_price ? Number(value.original_price) : ""}
            onChange={(e) => set("original_price", e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Stock">
          <Input type="number" value={Number(value.stock ?? 0)} onChange={(e) => set("stock", Number(e.target.value))} />
        </Field>
        <Field label="Category">
          <Select
            value={String(value.category_id ?? "")}
            onValueChange={(v) => set("category_id", v || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Material">
          <Input value={String(value.material ?? "")} onChange={(e) => set("material", e.target.value)} />
        </Field>
        <Field label="Size">
          <Input value={String(value.size ?? "")} onChange={(e) => set("size", e.target.value)} />
        </Field>
        <Field label="Production time">
          <Input value={String(value.production_time ?? "")} onChange={(e) => set("production_time", e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <ProductMediaUploader
            images={Array.isArray(value.images) ? (value.images as string[]) : []}
            videos={Array.isArray(value.videos) ? (value.videos as string[]) : []}
            onChange={({ images, videos }) => onChange({ ...value, images, videos })}
          />
        </div>
        <Field label="Colors (comma-separated)">
          <Input
            value={Array.isArray(value.colors) ? (value.colors as string[]).join(", ") : ""}
            onChange={(e) =>
              set("colors", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
            }
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Short description">
            <Input
              value={String(value.short_description ?? "")}
              onChange={(e) => set("short_description", e.target.value)}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description">
            <Textarea
              value={String(value.description ?? "")}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
        </div>
        {(["is_featured", "is_trending", "is_best_seller", "is_new_arrival", "is_active"] as const).map(
          (flag) => (
            <label key={flag} className="flex items-center gap-2 text-sm">
              <Switch
                checked={Boolean(value[flag])}
                onCheckedChange={(v) => set(flag, v)}
              />
              {flag.replace(/_/g, " ")}
            </label>
          ),
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={saving} onClick={onSave}>
          Save product
        </Button>
      </div>
    </AdminPanel>
  );
}

function Categories() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-categories"], queryFn: () => adminListCategories() });
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  const save = useMutation({
    mutationFn: (p: Record<string, unknown>) => adminSaveCategory({ data: p as never }),
    onSuccess: () => {
      toast.success("Category saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteCategory({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  return (
    <div className="space-y-4">
      <Button className="rounded-full" onClick={() => setEditing({ name: "", is_active: true, sort_order: 0 })}>
        <Plus className="mr-2 h-4 w-4" /> Add category
      </Button>
      {editing ? (
        <AdminPanel title={editing.id ? "Edit category" : "New category"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={String(editing.name ?? "")} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Image URL">
              <Input value={String(editing.image_url ?? "")} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea value={String(editing.description ?? "")} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => save.mutate(editing)}>Save</Button>
          </div>
        </AdminPanel>
      ) : null}
      <AdminPanel title="Categories">
        {(data ?? []).map((cat) => (
          <div key={cat.id as string} className="mb-2 flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
            <span>{String(cat.name)}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(cat as Record<string, unknown>)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(cat.id as string)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </AdminPanel>
    </div>
  );
}

function Orders({ onSelect }: { onSelect: (id: string) => void }) {
  const qc = useQueryClient();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => adminListOrders(),
    refetchOnMount: "always",
  });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const allOrders = (data ?? []) as AdminOrderRow[];
  const filtered = allOrders.filter((o) => {
    if (!matchesOrderFilter(o, filter)) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      String(o.order_number).toLowerCase().includes(q) ||
      String(o.customer_email ?? "").toLowerCase().includes(q) ||
      String(o.customer_name).toLowerCase().includes(q)
    );
  });

  const update = useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      adminUpdateOrder({ data: input as never }),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin-order-notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search orders…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter orders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All orders ({allOrders.length})</SelectItem>
            <SelectItem value="new">New / needs attention</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="paid_ready">Paid — ready to fulfill</SelectItem>
            {ADMIN_ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                Status: {orderStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <AdminPanel title={`Orders (${filtered.length} shown)`}>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : null}
        {isError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="font-medium text-destructive">Could not load orders</p>
            <p className="mt-1 text-muted-foreground">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
            <Button size="sm" variant="secondary" className="mt-3 rounded-full" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : null}
        {!isLoading && !isError && filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {allOrders.length === 0
              ? "No orders yet."
              : `No orders match this filter. You have ${allOrders.length} order(s) — try “All orders”.`}
          </p>
        ) : null}
        {filtered.map((order) => {
          const isPaid = order.payment_status === "paid";
          return (
          <div
            key={order.id}
            className={`mb-3 rounded-xl border p-4 text-sm ${
              order.is_new ? "border-orange-500/50 bg-orange-500/5" : "border-border"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelect(order.id)}
                className="text-left font-bold hover:text-primary"
              >
                {order.is_new ? (
                  <span className="mr-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black text-white">
                    NEW
                  </span>
                ) : null}
                {String(order.order_number)}
              </button>
              <span className="text-xs text-muted-foreground">{String(order.customer_name)}</span>
              <span className="font-semibold">{inr(Number(order.total))}</span>
              {isPaid ? (
                <Select
                  value={String(order.status)}
                  onValueChange={(v) => update.mutate({ id: order.id, status: v })}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FULFILLMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {orderStatusLabel(s)}
                      </SelectItem>
                    ))}
                    <SelectItem value="cancelled">{orderStatusLabel("cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="rounded-full border border-border px-3 py-1 text-xs">
                  {paymentStatusLabel(String(order.payment_status))}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Payment: {paymentStatusLabel(String(order.payment_status))} · Fulfillment:{" "}
              {orderStatusLabel(String(order.status))} · {formatDate(String(order.created_at))}
              {order.awb_number ? ` · AWB: ${order.awb_number}` : ""}
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 rounded-full"
              onClick={() => onSelect(order.id)}
            >
              Open order details
            </Button>
          </div>
          );
        })}
      </AdminPanel>
    </div>
  );
}

function Customers() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-customers"], queryFn: () => adminListCustomers() });
  const update = useMutation({
    mutationFn: (input: { id: string; is_active: boolean }) => adminUpdateCustomer({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-customers"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AdminPanel title="Customers">
      {(data ?? []).map((c) => (
        <div key={c.id as string} className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3 text-sm">
          <div>
            <p className="font-medium">{String(c.full_name ?? c.email)}</p>
            <p className="text-xs text-muted-foreground">
              {String(c.email)} · {c.order_count} orders · {inr(Number(c.total_spent))} spent
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={Boolean(c.is_active)}
              disabled={Boolean(c.is_protected)}
              onCheckedChange={(v) => update.mutate({ id: c.id as string, is_active: v })}
            />
            {c.is_protected ? "Admin (protected)" : "Active"}
          </label>
        </div>
      ))}
    </AdminPanel>
  );
}

function Coupons() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-coupons"], queryFn: () => adminListCoupons() });
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  const save = useMutation({
    mutationFn: (p: Record<string, unknown>) => adminSaveCoupon({ data: p as never }),
    onSuccess: () => {
      toast.success("Coupon saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteCoupon({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  return (
    <div className="space-y-4">
      <Button className="rounded-full" onClick={() => setEditing({ code: "", discount_type: "percentage", discount_value: 10, is_active: true })}>
        <Plus className="mr-2 h-4 w-4" /> Add coupon
      </Button>
      {editing ? (
        <AdminPanel title="Coupon">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code">
              <Input value={String(editing.code ?? "")} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Type">
              <Select value={String(editing.discount_type ?? "percentage")} onValueChange={(v) => setEditing({ ...editing, discount_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Value">
              <Input type="number" value={Number(editing.discount_value ?? 0)} onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} />
            </Field>
            <Field label="Min order">
              <Input type="number" value={Number(editing.min_order_value ?? 0)} onChange={(e) => setEditing({ ...editing, min_order_value: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => save.mutate(editing)}>Save</Button>
          </div>
        </AdminPanel>
      ) : null}
      <AdminPanel title="Coupons">
        {(data ?? []).map((coupon) => (
          <div key={coupon.id as string} className="mb-2 flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
            <span className="font-bold">{String(coupon.code)}</span>
            <span className="text-xs">{String(coupon.discount_type)} · {Number(coupon.discount_value)}</span>
            <Button size="sm" variant="ghost" onClick={() => remove.mutate(coupon.id as string)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </AdminPanel>
    </div>
  );
}

function Banners() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-banners"], queryFn: () => adminListBanners() });
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  const save = useMutation({
    mutationFn: (p: Record<string, unknown>) => adminSaveBanner({ data: p as never }),
    onSuccess: () => {
      toast.success("Banner saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteBanner({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-banners"] }),
  });

  return (
    <div className="space-y-4">
      <Button className="rounded-full" onClick={() => setEditing({ heading: "", is_active: true, sort_order: 0 })}>
        <Plus className="mr-2 h-4 w-4" /> Add banner
      </Button>
      {editing ? (
        <AdminPanel title="Banner">
          <div className="grid gap-3">
            <Field label="Heading"><Input value={String(editing.heading ?? "")} onChange={(e) => setEditing({ ...editing, heading: e.target.value })} /></Field>
            <Field label="Description"><Textarea value={String(editing.description ?? "")} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
            <Field label="Image URL"><Input value={String(editing.image_url ?? "")} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></Field>
            <Field label="CTA label"><Input value={String(editing.cta_label ?? "")} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} /></Field>
            <Field label="CTA link"><Input value={String(editing.cta_link ?? "")} onChange={(e) => setEditing({ ...editing, cta_link: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => save.mutate(editing)}>Save</Button>
          </div>
        </AdminPanel>
      ) : null}
      <AdminPanel title="Homepage banners">
        {(data ?? []).map((b) => (
          <div key={b.id as string} className="mb-2 flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
            <span>{String(b.heading)}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(b as Record<string, unknown>)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(b.id as string)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </AdminPanel>
    </div>
  );
}

function Requests() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: () => adminListRequests(),
  });
  const update = useMutation({
    mutationFn: (input: { id: string; status?: string; quoted_price?: number }) =>
      adminUpdateRequest({ data: input as never }),
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
  const sendQuote = useMutation({
    mutationFn: (input: { id: string; quoted_price: number; quote_message: string }) =>
      adminSendRequestQuote({ data: input }),
    onSuccess: () => {
      toast.success("Quote sent — customer will be notified");
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const acknowledge = useMutation({
    mutationFn: (id: string) => adminAcknowledgeRequest({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });

  const rows = (data ?? []) as AdminCustomRequestRow[];
  const newCount = rows.filter((r) => r.is_new).length;

  return (
    <AdminPanel title={`Custom printing requests${newCount ? ` · ${newCount} new` : ""}`}>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No custom printing requests yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((req) => (
            <CustomRequestCard
              key={req.id}
              request={req}
              busy={update.isPending || acknowledge.isPending || sendQuote.isPending}
              onStatusChange={(status) => update.mutate({ id: req.id, status })}
              onSendQuote={(quoted_price, quote_message) =>
                sendQuote.mutate({ id: req.id, quoted_price, quote_message })
              }
              onAcknowledge={() => acknowledge.mutate(req.id)}
            />
          ))}
        </div>
      )}
    </AdminPanel>
  );
}

function Reviews() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-reviews"], queryFn: () => adminListReviews() });
  const update = useMutation({
    mutationFn: (input: { id: string; is_approved: boolean }) => adminUpdateReview({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteReview({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  return (
    <AdminPanel title="Product reviews">
      {(data ?? []).map((r) => (
        <div key={r.id as string} className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3 text-sm">
          <div>
            <p className="font-medium">{(r.product as { name?: string })?.name} · {r.rating}★</p>
            <p className="text-xs text-muted-foreground">{String(r.body)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={Boolean(r.is_approved)} onCheckedChange={(v) => update.mutate({ id: r.id as string, is_approved: v })} />
            <Button size="sm" variant="ghost" onClick={() => remove.mutate(r.id as string)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ))}
    </AdminPanel>
  );
}

function SettingsPanel() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: () => adminGetSettings() });
  const [form, setForm] = useState<Record<string, unknown>>({});

  const settings = { ...(data ?? {}), ...form };

  const save = useMutation({
    mutationFn: () =>
      adminSaveSettings({
        data: {
          business_name: String(settings.business_name ?? ""),
          business_email: String(settings.business_email ?? ""),
          business_phone: String(settings.business_phone ?? ""),
          business_address: String(settings.business_address ?? ""),
          whatsapp_number: String(settings.whatsapp_number ?? ""),
          instagram_url: String(settings.instagram_url ?? ""),
          facebook_url: String(settings.facebook_url ?? ""),
          currency: String(settings.currency ?? "INR"),
          india_delivery_charge: Number(settings.india_delivery_charge ?? 80),
          free_delivery_threshold: settings.free_delivery_threshold
            ? Number(settings.free_delivery_threshold)
            : null,
          express_delivery_charge: Number(settings.express_delivery_charge ?? 199),
          international_shipping_enabled: Boolean(settings.international_shipping_enabled),
          gst_percent: Number(settings.gst_percent ?? 0),
        },
      }),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data) return <Loader2 className="mx-auto h-6 w-6 animate-spin" />;

  return (
    <AdminPanel title="Store settings">
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["business_name", "Business name"],
            ["business_email", "Email"],
            ["business_phone", "Phone"],
            ["whatsapp_number", "WhatsApp"],
            ["business_address", "Address"],
            ["instagram_url", "Instagram"],
            ["facebook_url", "Facebook"],
            ["currency", "Currency"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <Input
              value={String(settings[key] ?? "")}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </Field>
        ))}
        <Field label="India delivery charge (₹)">
          <Input
            type="number"
            value={Number(settings.india_delivery_charge ?? 80)}
            onChange={(e) => setForm({ ...form, india_delivery_charge: Number(e.target.value) })}
          />
        </Field>
        <Field label="Free delivery threshold (₹)">
          <Input
            type="number"
            value={settings.free_delivery_threshold ? Number(settings.free_delivery_threshold) : ""}
            onChange={(e) =>
              setForm({
                ...form,
                free_delivery_threshold: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </Field>
        <Field label="Express delivery (₹)">
          <Input
            type="number"
            value={Number(settings.express_delivery_charge ?? 199)}
            onChange={(e) => setForm({ ...form, express_delivery_charge: Number(e.target.value) })}
          />
        </Field>
        <Field label="GST %">
          <Input
            type="number"
            value={Number(settings.gst_percent ?? 0)}
            onChange={(e) => setForm({ ...form, gst_percent: Number(e.target.value) })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={Boolean(settings.international_shipping_enabled)}
            onCheckedChange={(v) => setForm({ ...form, international_shipping_enabled: v })}
          />
          International shipping enabled
        </label>
      </div>
      <Button className="mt-4 rounded-full" onClick={() => save.mutate()} disabled={save.isPending}>
        Save settings
      </Button>
    </AdminPanel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
