import { createMiddleware } from "@tanstack/react-start";

import { TOKEN_KEY } from "@/lib/auth.constants";

export const attachAuthToken = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});
