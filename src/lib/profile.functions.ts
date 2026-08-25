import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuth } from "@/integrations/mongodb/auth-middleware";
import { connectMongo } from "@/integrations/mongodb/connect.server";
import { Address, User } from "@/integrations/mongodb/models";

const addressInput = z.object({
  id: z.string().optional(),
  label: z.string().trim().max(60).optional(),
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(20),
  house: z.string().trim().min(1).max(120),
  street: z.string().trim().max(160).optional(),
  area: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  country: z.string().trim().min(1).max(60).default("India"),
  pincode: z.string().trim().min(4).max(12),
  is_default: z.boolean().optional(),
});

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await connectMongo();
    const user = await User.findById(context.userId).lean();
    if (!user) throw new Error("Profile not found");
    return {
      id: String(user._id),
      full_name: user.fullName,
      email: user.email,
      phone: user.phone,
      created_at: (user as { createdAt?: Date }).createdAt?.toISOString(),
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(100).optional(),
        phone: z.string().trim().min(6).max(20).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await connectMongo();
    await User.updateOne(
      { _id: context.userId },
      {
        ...(data.full_name !== undefined ? { fullName: data.full_name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      },
    );
    return { ok: true };
  });

export const listMyAddresses = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await connectMongo();
    const rows = await Address.find({ userId: context.userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return rows.map((a) => ({
      id: String(a._id),
      label: a.label,
      full_name: a.fullName,
      phone: a.phone,
      house: a.house,
      street: a.street,
      area: a.area,
      city: a.city,
      state: a.state,
      country: a.country,
      pincode: a.pincode,
      is_default: a.isDefault,
    }));
  });

export const saveMyAddress = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => addressInput.parse(input))
  .handler(async ({ data, context }) => {
    await connectMongo();
    const { id, is_default, ...fields } = data;

    if (is_default) {
      await Address.updateMany({ userId: context.userId }, { isDefault: false });
    }

    const payload = {
      userId: context.userId,
      label: fields.label ?? "",
      fullName: fields.full_name,
      phone: fields.phone,
      house: fields.house,
      street: fields.street ?? "",
      area: fields.area ?? "",
      city: fields.city,
      state: fields.state,
      country: fields.country,
      pincode: fields.pincode,
      isDefault: is_default ?? false,
    };

    if (id) {
      await Address.updateOne({ _id: id, userId: context.userId }, payload);
      return { id };
    }

    const created = await Address.create(payload);
    return { id: String(created._id) };
  });

export const deleteMyAddress = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await connectMongo();
    await Address.deleteOne({ _id: data.id, userId: context.userId });
    return { ok: true };
  });
