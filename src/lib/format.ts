export function inr(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function discountPercent(
  price: number | string,
  originalPrice: number | string | null | undefined,
): number | null {
  const p = Number(price);
  const o = Number(originalPrice ?? 0);
  if (!o || o <= p) return null;
  return Math.round(((o - p) / o) * 100);
}

export function orderStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function paymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    paid: "Paid",
    failed: "Failed",
    cancelled: "Cancelled",
    expired: "Expired",
    refunded: "Refunded",
  };
  return labels[status] ?? orderStatusLabel(status);
}

export const PAYMENT_STATUS_FLOW = [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
] as const;

export const ORDER_STATUS_FLOW = [
  "pending",
  "payment_pending",
  "paid",
  "processing",
  "printing",
  "quality_check",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

export const ADMIN_ORDER_STATUSES = [
  "pending",
  "payment_pending",
  "paid",
  "processing",
  "printing",
  "quality_check",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export const CUSTOM_REQUEST_STATUSES = [
  "new",
  "reviewing",
  "quote_sent",
  "customer_approved",
  "in_production",
  "completed",
  "rejected",
] as const;

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
