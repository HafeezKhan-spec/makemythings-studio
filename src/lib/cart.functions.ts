import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuth } from "@/integrations/mongodb/auth-middleware";
import { connectMongo } from "@/integrations/mongodb/connect.server";
import { CartItem, mapProduct, Product } from "@/integrations/mongodb/models";
import type { CartLine } from "@/lib/types";

const lineSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(20),
});

export const loadPersistedCart = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await connectMongo();
    const rows = await CartItem.find({ userId: context.userId }).lean();
    const productIds = rows.map((r) => r.productId);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const lines: CartLine[] = rows.flatMap((row) => {
      const product = productMap.get(String(row.productId));
      if (!product) return [];
      return [
        {
          productId: String(product._id),
          slug: product.slug,
          name: product.name,
          image: product.images?.[0] ?? null,
          price: Number(product.price),
          originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
          quantity: row.quantity,
        },
      ];
    });

    return lines;
  });

export const syncPersistedCart = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ lines: z.array(lineSchema).max(50) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await connectMongo();
    const userId = context.userId;
    const incomingIds = data.lines.map((l) => l.productId);

    const validProducts = await Product.find({
      _id: { $in: incomingIds },
      isActive: true,
    }).lean();
    const validIds = new Set(validProducts.map((p) => String(p._id)));
    const validLines = data.lines.filter((l) => validIds.has(l.productId));

    await CartItem.deleteMany({
      userId,
      productId: { $nin: validLines.map((l) => l.productId) },
    });

    for (const line of validLines) {
      await CartItem.findOneAndUpdate(
        { userId, productId: line.productId },
        { quantity: line.quantity },
        { upsert: true, new: true },
      );
    }

    return { ok: true };
  });

export const clearPersistedCart = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await connectMongo();
    await CartItem.deleteMany({ userId: context.userId });
    return { ok: true };
  });
