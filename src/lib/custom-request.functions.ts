import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuth } from "@/integrations/mongodb/auth-middleware";
import { connectMongo } from "@/integrations/mongodb/connect.server";
import { CustomRequest, User } from "@/integrations/mongodb/models";
import { currentUserId } from "./orders.server";

function mapQuoteRow(r: {
  _id: unknown;
  description?: string;
  quotedPrice?: number | null;
  quoteMessage?: string;
  status?: string;
  size?: string;
  quantity?: number;
  material?: string;
  quoteSentAt?: Date | null;
  createdAt?: Date;
}) {
  return {
    id: String(r._id),
    description: String(r.description ?? ""),
    quoted_price: Number(r.quotedPrice ?? 0),
    quote_message: String(r.quoteMessage ?? ""),
    status: String(r.status ?? ""),
    size: String(r.size ?? ""),
    quantity: Number(r.quantity ?? 1),
    material: String(r.material ?? ""),
    quote_sent_at: r.quoteSentAt?.toISOString() ?? null,
    created_at: r.createdAt?.toISOString() ?? null,
  };
}

async function findUnseenQuotesForEmail(email: string) {
  await connectMongo();
  const normalized = email.toLowerCase().trim();
  const rows = await CustomRequest.find({
    email: normalized,
    status: "quote_sent",
    quoteSeenByUser: { $ne: true },
    quotedPrice: { $gt: 0 },
  })
    .sort({ quoteSentAt: -1 })
    .limit(20)
    .lean();
  return rows.map(mapQuoteRow);
}

export const listMyCustomRequestQuotes = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await connectMongo();
    const user = await User.findById(context.userId).lean();
    if (!user) return [];

    const rows = await CustomRequest.find({
      $or: [{ userId: context.userId }, { email: user.email.toLowerCase().trim() }],
      status: "quote_sent",
      quoteSeenByUser: { $ne: true },
      quotedPrice: { $gt: 0 },
    })
      .sort({ quoteSentAt: -1 })
      .limit(20)
      .lean();

    return rows.map(mapQuoteRow);
  });

export const listGuestCustomRequestQuotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().trim().email().max(160) }).parse(input),
  )
  .handler(async ({ data }) => findUnseenQuotesForEmail(data.email));

export const acknowledgeCustomRequestQuote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string(),
      email: z.string().trim().email().max(160).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    await connectMongo();
    const request = await CustomRequest.findById(data.id);
    if (!request) throw new Error("Quote not found");

    const userId = await currentUserId();

    if (userId) {
      const user = await User.findById(userId).lean();
      if (!user) throw new Error("You do not have access to this quote");
      const emailMatch =
        request.email.toLowerCase().trim() === user.email.toLowerCase().trim();
      const userMatch = request.userId && String(request.userId) === userId;
      if (!emailMatch && !userMatch) {
        throw new Error("You do not have access to this quote");
      }
    } else {
      const email = data.email?.toLowerCase().trim();
      if (!email || request.email.toLowerCase().trim() !== email) {
        throw new Error("You do not have access to this quote");
      }
    }

    await CustomRequest.updateOne({ _id: data.id }, { $set: { quoteSeenByUser: true } });
    return { ok: true };
  });

export const listMyCustomRequests = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await connectMongo();
    const user = await User.findById(context.userId).lean();
    if (!user) return [];

    const rows = await CustomRequest.find({
      $or: [{ userId: context.userId }, { email: user.email.toLowerCase().trim() }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return rows.map((r) => ({
      id: String(r._id),
      description: String(r.description ?? ""),
      status: String(r.status ?? ""),
      quoted_price: r.quotedPrice != null ? Number(r.quotedPrice) : null,
      quote_message: String(r.quoteMessage ?? ""),
      quote_sent_at: r.quoteSentAt?.toISOString() ?? null,
      quote_seen_by_user: Boolean(r.quoteSeenByUser),
      size: String(r.size ?? ""),
      quantity: Number(r.quantity ?? 1),
      material: String(r.material ?? ""),
      created_at: (r as { createdAt?: Date }).createdAt?.toISOString() ?? null,
    }));
  });
