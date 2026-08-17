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

export const ORDER_STATUS_FLOW = [
  "pending",
  "paid",
  "processing",
  "printing",
  "quality_check",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
