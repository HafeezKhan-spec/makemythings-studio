import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { formatINR, formatDate } from "@/lib/format";
import {
  adminDeleteProduct,
  adminListCoupons,
  adminListOrders,
  adminListProducts,
  adminListRequests,
  adminUpdateOrder,
  adminUpdateRequest,
  getAdminDashboard,
  getMyAccess,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — MakeMyThings.in" },
      { name: "description", content: "Manage products, orders, custom requests and coupons." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin Dashboard — MakeMyThings.in" },
      { property: "og:description", content: "Store administration." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { user, loading } = useAuth();
  const access = useQuery({
    queryKey: ["admin-access", user?.id],
    enabled: Boolean(user),
    queryFn: () => getMyAccess(),
  });

  if (loading || (user && access.isLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !access.data?.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-extrabold">Admin access only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user
            ? "Your account doesn't have the admin role yet."
            : "Sign in with an admin account to continue."}
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to={user ? "/" : "/auth"}>{user ? "Back to store" : "Sign in"}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Admin dashboard</h1>
      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="requests">Custom requests</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Overview />
        </TabsContent>
        <TabsContent value="products">
          <Products />
        </TabsContent>
        <TabsContent value="orders">
          <Orders />
        </TabsContent>
        <TabsContent value="requests">
          <Requests />
        </TabsContent>
        <TabsContent value="coupons">
          <Coupons />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 rounded-2xl border border-border bg-surface p-5">{children}</div>;
}

function Overview() {
  const { data } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => getAdminDashboard() });
  const stats = [
    ["Revenue (paid)", formatINR(data?.revenue ?? 0)],
    ["Orders", String(data?.orderCount ?? 0)],
    ["Pending orders", String(data?.pendingOrders ?? 0)],
    ["Products", String(data?.productCount ?? 0)],
    ["Low stock", String(data?.lowStock ?? 0)],
    ["Open requests", String(data?.openRequests ?? 0)],
    ["Customers", String(data?.customerCount ?? 0)],
  ] as const;

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-gradient-surface p-5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>
      <Panel>
        <h2 className="text-sm font-semibold">Recent orders</h2>
        <div className="mt-4 space-y-2">
          {(data?.recentOrders ?? []).map((order) => (
            <div
              key={order.id as string}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
            >
              <span className="font-medium">{String(order.order_number)}</span>
              <span className="text-xs text-muted-foreground">{String(order.customer_name)}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(String(order.created_at))}
              </span>
              <span className="font-semibold">{formatINR(Number(order.total))}</span>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function Products() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-products"], queryFn: () => adminListProducts() });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteProduct({ data: { id } }),
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Panel>
      <div className="space-y-2">
        {(data ?? []).map((product) => (
          <div
            key={product.id as string}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
          >
            <span className="font-medium">{String(product.name)}</span>
            <span className="text-xs text-muted-foreground">Stock {Number(product.stock)}</span>
            <span className="font-semibold">{formatINR(Number(product.price))}</span>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => remove.mutate(product.id as string)}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "printing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

function Orders() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-orders"], queryFn: () => adminListOrders() });
  const update = useMutation({
    mutationFn: (input: { id: string; status: (typeof ORDER_STATUSES)[number] }) =>
      adminUpdateOrder({ data: input }),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Panel>
      <div className="space-y-2">
        {(data ?? []).map((order) => (
          <div
            key={order.id as string}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
          >
            <span className="font-medium">{String(order.order_number)}</span>
            <span className="text-xs text-muted-foreground">{String(order.customer_email)}</span>
            <span className="font-semibold">{formatINR(Number(order.total))}</span>
            <Select
              value={String(order.status)}
              onValueChange={(value) =>
                update.mutate({
                  id: order.id as string,
                  status: value as (typeof ORDER_STATUSES)[number],
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const REQUEST_STATUSES = ["pending", "quoted", "approved", "rejected", "completed"] as const;

function Requests() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-requests"], queryFn: () => adminListRequests() });
  const update = useMutation({
    mutationFn: (input: {
      id: string;
      status?: (typeof REQUEST_STATUSES)[number];
      quoted_price?: number;
    }) => adminUpdateRequest({ data: input }),
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["admin-requests"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Panel>
      <div className="space-y-3">
        {(data ?? []).map((request) => (
          <div key={request.id as string} className="rounded-xl border border-border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="font-medium">{String(request.name)}</span>
              <span className="text-xs text-muted-foreground">{String(request.email)}</span>
              <Select
                value={String(request.status)}
                onValueChange={(value) =>
                  update.mutate({
                    id: request.id as string,
                    status: value as (typeof REQUEST_STATUSES)[number],
                  })
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                className="w-32"
                placeholder="Quote ₹"
                defaultValue={request.quoted_price ? Number(request.quoted_price) : ""}
                onBlur={(event) => {
                  const value = Number(event.target.value);
                  if (value > 0)
                    update.mutate({ id: request.id as string, quoted_price: value });
                }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{String(request.description)}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Coupons() {
  const { data } = useQuery({ queryKey: ["admin-coupons"], queryFn: () => adminListCoupons() });
  return (
    <Panel>
      <div className="space-y-2">
        {(data ?? []).map((coupon) => (
          <div
            key={coupon.id as string}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm"
          >
            <span className="font-display font-bold">{String(coupon.code)}</span>
            <span className="text-xs text-muted-foreground">
              {String(coupon.discount_type)} · {Number(coupon.discount_value)}
            </span>
            <span className="text-xs text-muted-foreground">
              Used {Number(coupon.used_count ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
