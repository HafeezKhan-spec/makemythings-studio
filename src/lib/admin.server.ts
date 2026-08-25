export function assertAdmin(roles: string[]) {
  if (!roles.includes("admin")) throw new Error("Forbidden: admin access required");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Unacknowledged orders that need admin attention. */
export function isNewAdminOrder(order: {
  paymentStatus?: string;
  status?: string;
  adminAcknowledged?: boolean;
}) {
  if (order.adminAcknowledged) return false;

  const status = String(order.status ?? "");
  const paymentStatus = String(order.paymentStatus ?? "");

  // Completed — no longer needs a NEW badge
  if (status === "delivered" || status === "cancelled") return false;
  if (paymentStatus === "refunded") return false;

  if (paymentStatus === "paid") return true;
  if (status === "payment_pending") return true;
  if (
    paymentStatus === "pending" ||
    paymentStatus === "processing" ||
    paymentStatus === "failed" ||
    paymentStatus === "cancelled"
  ) {
    return true;
  }
  return false;
}

/** Unacknowledged custom print requests that need admin review. */
export function isNewCustomRequest(request: {
  status?: string;
  adminAcknowledged?: boolean;
}) {
  if (request.adminAcknowledged) return false;
  const status = String(request.status ?? "");
  return !["completed", "rejected"].includes(status);
}

export async function loadDashboard() {
  const { connectMongo } = await import("@/integrations/mongodb/connect.server");
  const {
    CustomRequest,
    Order,
    Product,
    User,
  } = await import("@/integrations/mongodb/models");

  await connectMongo();

  const today = new Date().toISOString().slice(0, 10);
  const orders = await Order.find().sort({ createdAt: -1 }).limit(500).lean();
  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const todayPaid = paid.filter((o) =>
    String((o as { createdAt?: Date }).createdAt).startsWith(today),
  );

  const processingStatuses = new Set(["paid", "processing", "printing", "quality_check", "packed", "confirmed"]);
  const products = await Product.find().lean();
  const requests = await CustomRequest.find().lean();
  const customers = await User.find().lean();

  const salesByDay = new Map<string, number>();
  const ordersByDay = new Map<string, number>();
  for (const order of orders) {
    const day = String((order as { createdAt?: Date }).createdAt).slice(0, 10);
    ordersByDay.set(day, (ordersByDay.get(day) ?? 0) + 1);
    if (order.paymentStatus === "paid") {
      salesByDay.set(day, (salesByDay.get(day) ?? 0) + Number(order.total ?? 0));
    }
  }

  const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const order of paid) {
    for (const item of order.items ?? []) {
      const name = String(item.productName);
      const existing = productSales.get(name) ?? { name, qty: 0, revenue: 0 };
      existing.qty += Number(item.quantity);
      existing.revenue += Number(item.lineTotal);
      productSales.set(name, existing);
    }
  }

  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });

  return {
    revenue: paid.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
    todayRevenue: todayPaid.reduce((sum, o) => sum + Number(o.total ?? 0), 0),
    orderCount: orders.length,
    pendingOrders: orders.filter(
      (o) =>
        o.paymentStatus !== "paid" ||
        o.status === "pending" ||
        o.status === "payment_pending",
    ).length,
    processingOrders: orders.filter((o) => processingStatuses.has(String(o.status))).length,
    completedOrders: orders.filter((o) => o.status === "delivered").length,
    productCount: products.length,
    lowStock: products.filter((p) => Number(p.stock ?? 0) <= 3).length,
    openRequests: requests.filter((r) =>
      ["new", "reviewing", "quote_sent"].includes(String(r.status)),
    ).length,
    newCustomRequests: requests.filter((r) => isNewCustomRequest(r)).length,
    customerCount: customers.length,
    recentOrders: orders.slice(0, 8).map((o) => ({
      id: String(o._id),
      order_number: o.orderNumber,
      customer_name: o.customerName,
      created_at: (o as { createdAt?: Date }).createdAt?.toISOString(),
      total: o.total,
      status: o.status,
      payment_status: o.paymentStatus,
      is_new: isNewAdminOrder(o),
    })),
    newPaidOrders: orders.filter((o) => isNewAdminOrder(o)).length,
    salesChart: last14Days.map((day) => ({
      day,
      revenue: salesByDay.get(day) ?? 0,
      orders: ordersByDay.get(day) ?? 0,
    })),
    bestSellers: [...productSales.values()].sort((a, b) => b.qty - a.qty).slice(0, 8),
    revenueByCategory: [],
  };
}

export function clean<T extends object>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as never;
}
