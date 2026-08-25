import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { connectMongo } from "@/integrations/mongodb/connect.server";
import { AuthOtp, User } from "@/integrations/mongodb/models";
import { ensureAdminRoles, rolesForNewUser } from "./admin-roles.server";
import { otpEmailHtml, sendEmail } from "./email.server";
import {
  generateOtpCode,
  hashOtp,
  MAX_SENDS_PER_WINDOW,
  otpExpiresAt,
  sendWindowStart,
} from "./otp.server";
import { hashPassword, signAccessToken } from "./auth.server";

const emailSchema = z.string().trim().email().max(160);

async function userExists(email: string): Promise<boolean> {
  await connectMongo();
  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  return Boolean(user);
}

async function assertRateLimit(email: string, purpose: string) {
  await connectMongo();
  const since = new Date(sendWindowStart());
  const count = await AuthOtp.countDocuments({
    email: email.toLowerCase(),
    purpose,
    createdAt: { $gte: since },
  });
  if (count >= MAX_SENDS_PER_WINDOW) {
    throw new Error("Too many OTP requests. Please wait a few minutes and try again.");
  }
}

async function storeAndSendOtp(
  email: string,
  purpose: "login" | "signup",
  metadata: Record<string, unknown> = {},
) {
  await connectMongo();
  const code = generateOtpCode();
  const otp_hash = hashOtp(email, code);

  await AuthOtp.updateMany(
    { email: email.toLowerCase(), purpose, usedAt: null },
    { $set: { usedAt: new Date() } },
  );

  await AuthOtp.create({
    email: email.toLowerCase(),
    otpHash: otp_hash,
    purpose,
    metadata,
    expiresAt: new Date(otpExpiresAt()),
  });

  await sendEmail({
    to: email,
    subject:
      purpose === "login"
        ? "Your MakeMyThing sign-in code"
        : "Verify your MakeMyThing account",
    html: otpEmailHtml(code, purpose),
  });

  return { expiresInSeconds: 300, devOtp: process.env["RESEND_API_KEY"] ? undefined : code };
}

async function verifyStoredOtp(email: string, otp: string, purpose: "login" | "signup") {
  await connectMongo();
  const otp_hash = hashOtp(email, otp);

  const row = await AuthOtp.findOne({
    email: email.toLowerCase(),
    purpose,
    otpHash: otp_hash,
    usedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!row) throw new Error("Invalid or expired verification code");
  if (row.expiresAt < new Date()) {
    throw new Error("This code has expired. Please request a new one.");
  }

  await AuthOtp.updateOne({ _id: row._id }, { $set: { usedAt: new Date() } });
}

async function createSessionForUser(user: { _id: unknown; email: string; roles: string[] }) {
  const access_token = await signAccessToken({
    sub: String(user._id),
    email: user.email,
    roles: user.roles,
  });
  return { access_token, refresh_token: access_token };
}

export const sendLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: emailSchema }).parse(input))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    if (!(await userExists(email))) {
      throw new Error("No account found with this email. Please create an account first.");
    }
    await assertRateLimit(email, "login");
    return storeAndSendOtp(email, "login");
  });

export const verifyLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: emailSchema, otp: z.string().trim().length(6) }).parse(input),
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    await verifyStoredOtp(email, data.otp, "login");
    await connectMongo();
    const user = await User.findOne({ email }).lean();
    if (!user) throw new Error("Account not found");
    if (!user.isActive) throw new Error("This account has been deactivated");
    const roles = await ensureAdminRoles(user.email, user.roles ?? ["customer"]);
    return createSessionForUser({
      _id: user._id,
      email: user.email,
      roles,
    });
  });

export const sendSignupOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: emailSchema, name: z.string().trim().min(2).max(100) }).parse(input),
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    if (await userExists(email)) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }
    await assertRateLimit(email, "signup");
    return storeAndSendOtp(email, "signup", { full_name: data.name });
  });

export const verifySignupOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        email: emailSchema,
        otp: z.string().trim().length(6),
        name: z.string().trim().min(2).max(100),
        password: z.string().min(6).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    await verifyStoredOtp(email, data.otp, "signup");
    await connectMongo();

    const roles = rolesForNewUser(email);
    const passwordHash = await hashPassword(data.password);

    const user = await User.create({
      email,
      passwordHash,
      fullName: data.name,
      roles,
    });

    return createSessionForUser({
      _id: user._id,
      email: user.email,
      roles: user.roles,
    });
  });

export const getMe = createServerFn({ method: "GET" }).handler(async () => {
  const { currentUserPayload } = await import("./orders.server");
  const payload = await currentUserPayload();
  if (!payload) return null;

  await connectMongo();
  const user = await User.findById(payload.sub).lean();
  if (!user || !user.isActive) return null;

  const roles = await ensureAdminRoles(user.email, user.roles ?? ["customer"]);

  return {
    id: String(user._id),
    email: user.email,
    full_name: user.fullName,
    phone: user.phone,
    roles,
    is_admin: roles.includes("admin"),
  };
});
