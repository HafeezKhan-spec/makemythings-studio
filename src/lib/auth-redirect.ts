/** Only allow same-origin in-app paths after login. */
export function safeRedirectPath(path?: string | null, fallback = "/orders") {
  if (!path?.trim()) return fallback;
  const normalized = path.trim();
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return fallback;
  if (normalized.startsWith("/auth")) return fallback;
  return normalized;
}

export function checkoutRedirectPath(coupon?: string) {
  return coupon ? `/checkout?coupon=${encodeURIComponent(coupon)}` : "/checkout";
}

/** Split a safe in-app path into pathname + search for TanStack Router navigation. */
export function redirectNavigateTarget(path?: string | null, fallback = "/orders") {
  const safe = safeRedirectPath(path, fallback);
  if (!safe.includes("?")) return { to: safe };

  const url = new URL(safe, "http://local");
  const search: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    search[key] = value;
  });
  return { to: url.pathname, search };
}
