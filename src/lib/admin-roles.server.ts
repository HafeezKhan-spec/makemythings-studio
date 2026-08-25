import { connectMongo } from "@/integrations/mongodb/connect.server";
import { User } from "@/integrations/mongodb/models";
import { ADMIN_EMAILS } from "@/integrations/mongodb/seed.server";

export function getAdminEmailList(): string[] {
  const fromEnv = process.env["ADMIN_EMAILS"];
  if (fromEnv?.trim()) {
    return fromEnv
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }
  return ADMIN_EMAILS.map((email) => email.toLowerCase());
}

export function isConfiguredAdminEmail(email: string): boolean {
  return getAdminEmailList().includes(email.toLowerCase().trim());
}

export function rolesForNewUser(email: string): string[] {
  return isConfiguredAdminEmail(email) ? ["customer", "admin"] : ["customer"];
}

/** Ensure configured admin emails always have the admin role in MongoDB. */
export async function ensureAdminRoles(
  email: string,
  currentRoles: string[] = ["customer"],
): Promise<string[]> {
  if (!isConfiguredAdminEmail(email)) return currentRoles;

  const roles = [...new Set([...currentRoles, "customer", "admin"])];
  if (roles.length === currentRoles.length && currentRoles.includes("admin")) {
    return currentRoles;
  }

  await connectMongo();
  await User.updateOne({ email: email.toLowerCase() }, { $set: { roles } });
  return roles;
}

/** Promote existing accounts that match ADMIN_EMAILS (runs on server connect). */
export async function promoteConfiguredAdminUsers(): Promise<void> {
  await connectMongo();
  for (const email of getAdminEmailList()) {
    const user = await User.findOne({ email }).lean();
    if (user) {
      await ensureAdminRoles(email, user.roles ?? ["customer"]);
    }
  }
}
