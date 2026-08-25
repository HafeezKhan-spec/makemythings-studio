import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAuth } from "@/integrations/mongodb/auth-middleware";
import { connectMongo } from "@/integrations/mongodb/connect.server";
import { mapProduct, Product, Review } from "@/integrations/mongodb/models";
import {
  getProductBySlug,
  getStoreSettings,
  listBanners,
  listCategories,
  queryProducts,
} from "./store.server";
import { userPurchasedProduct } from "./reviews.server";

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().optional(),
        category: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        sort: z.string().optional(),
        flag: z.string().optional(),
        limit: z.number().max(100).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => queryProducts(data));

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    await connectMongo();
    const row = await Product.findOne({ slug: data.slug, isActive: true }).lean();
    if (!row) return null;

    const reviews = await Review.find({ productId: row._id, isApproved: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const relatedRows = await Product.find({
      categoryId: row.categoryId,
      isActive: true,
      _id: { $ne: row._id },
    })
      .limit(4)
      .lean();

    const product = await getProductBySlug(data.slug);

    return {
      product,
      reviews: reviews.map((r) => ({
        id: String(r._id),
        author_name: r.authorName,
        rating: r.rating,
        body: r.body,
        created_at: (r as { createdAt?: Date }).createdAt?.toISOString(),
      })),
      related: relatedRows.map((p) => mapProduct(p as never)),
    };
  });

export const listCategoriesFn = createServerFn({ method: "GET" }).handler(async () =>
  listCategories(),
);

export const listBannersFn = createServerFn({ method: "GET" }).handler(async () => listBanners());

export const getStoreSettingsFn = createServerFn({ method: "GET" }).handler(async () =>
  getStoreSettings(),
);

export const submitProductReview = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        productId: z.string(),
        rating: z.number().int().min(1).max(5),
        body: z.string().trim().min(10).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await connectMongo();
    const product = await Product.findOne({ _id: data.productId, isActive: true }).lean();
    if (!product) throw new Error("Product not found");

    const purchased = await userPurchasedProduct(context.userId, data.productId);
    if (!purchased) {
      throw new Error("You can only review products you have purchased and received.");
    }

    const existing = await Review.findOne({
      productId: data.productId,
      userId: context.userId,
    }).lean();
    if (existing) {
      throw new Error("You have already reviewed this product.");
    }

    const user = await import("@/integrations/mongodb/models").then((m) =>
      m.User.findById(context.userId).lean(),
    );

    await Review.create({
      productId: data.productId,
      userId: context.userId,
      authorName: user?.fullName || user?.email || "Customer",
      rating: data.rating,
      body: data.body,
      isApproved: false,
    });

    return { ok: true };
  });

// Keep names used by routes
export { listCategoriesFn as listCategories, listBannersFn as listBanners, getStoreSettingsFn as getStoreSettings };
