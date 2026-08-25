import { createServerFn } from "@tanstack/react-start";

import { requireAuth } from "@/integrations/mongodb/auth-middleware";
import { connectMongo } from "@/integrations/mongodb/connect.server";
import { mapProduct, Product, Wishlist } from "@/integrations/mongodb/models";

export const listMyWishlist = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await connectMongo();
    const rows = await Wishlist.find({ userId: context.userId }).lean();
    const productIds = rows.map((r) => r.productId);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
    return products.map((p) => mapProduct(p as never));
  });
