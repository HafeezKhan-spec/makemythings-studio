import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { connectMongo } from "@/integrations/mongodb/connect.server";
import { User } from "@/integrations/mongodb/models";
import { verifyAccessToken } from "@/lib/auth.server";
import { ensureAdminRoles } from "@/lib/admin-roles.server";

export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized: No authorization header provided");
  }

  const token = authHeader.replace("Bearer ", "");
  const payload = await verifyAccessToken(token);

  await connectMongo();
  const user = await User.findById(payload.sub).lean();
  if (!user || !user.isActive) {
    throw new Error("Unauthorized: Invalid token");
  }

  const roles = await ensureAdminRoles(user.email, user.roles ?? ["customer"]);

  return next({
    context: {
      userId: String(user._id),
      email: user.email,
      roles,
      claims: payload,
    },
  });
});
