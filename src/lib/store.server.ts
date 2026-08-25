import { connectMongo } from "@/integrations/mongodb/connect.server";
import { Category, mapCategory, mapProduct, Product } from "@/integrations/mongodb/models";
import type { Types } from "mongoose";

export type ProductFilters = {
  search?: string | undefined;
  category?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  sort?: string | undefined;
  flag?: string | undefined;
  limit?: number | undefined;
};

export async function queryProducts(filters: ProductFilters) {
  await connectMongo();

  const query: Record<string, unknown> = { isActive: true };

  if (filters.category) {
    const cat = await Category.findOne({ slug: filters.category, isActive: true }).lean();
    query.categoryId = cat?._id ?? null;
  }

  if (filters.search) {
    const term = filters.search.trim();
    query.$or = [
      { name: { $regex: term, $options: "i" } },
      { shortDescription: { $regex: term, $options: "i" } },
      { description: { $regex: term, $options: "i" } },
    ];
  }

  if (typeof filters.minPrice === "number" || typeof filters.maxPrice === "number") {
    const priceFilter: Record<string, number> = {};
    if (typeof filters.minPrice === "number") priceFilter.$gte = filters.minPrice;
    if (typeof filters.maxPrice === "number") priceFilter.$lte = filters.maxPrice;
    query.price = priceFilter;
  }

  if (filters.flag === "featured") query.isFeatured = true;
  if (filters.flag === "trending") query.isTrending = true;
  if (filters.flag === "best-seller") query.isBestSeller = true;
  if (filters.flag === "new-arrival") query.isNewArrival = true;
  if (filters.flag === "discounted") query.originalPrice = { $ne: null };

  let sort: Record<string, 1 | -1> = { isFeatured: -1, rating: -1 };
  switch (filters.sort) {
    case "price-asc":
      sort = { price: 1 };
      break;
    case "price-desc":
      sort = { price: -1 };
      break;
    case "rating":
      sort = { rating: -1 };
      break;
    case "newest":
      sort = { createdAt: -1 };
      break;
  }

  const products = await Product.find(query)
    .sort(sort)
    .limit(filters.limit ?? 60)
    .lean();

  const categoryIds = [
    ...new Set(products.map((p) => String(p.categoryId)).filter(Boolean)),
  ];
  const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
  const catMap = new Map(categories.map((c) => [String(c._id), { name: c.name, slug: c.slug }]));

  return products.map((p) =>
    mapProduct({
      ...p,
      category: p.categoryId ? catMap.get(String(p.categoryId)) ?? null : null,
    } as never),
  );
}

export async function getProductBySlug(slug: string) {
  await connectMongo();
  const product = await Product.findOne({ slug, isActive: true }).lean();
  if (!product) return null;

  let category = null;
  if (product.categoryId) {
    const cat = await Category.findById(product.categoryId).lean();
    if (cat) category = { name: cat.name, slug: cat.slug };
  }

  return mapProduct({ ...product, category } as never);
}

export async function getRelatedProducts(categoryId: Types.ObjectId | null, excludeId: Types.ObjectId) {
  if (!categoryId) return [];
  const products = await Product.find({
    categoryId,
    isActive: true,
    _id: { $ne: excludeId },
  })
    .limit(4)
    .lean();
  return products.map((p) => mapProduct(p as never));
}

export async function listCategories() {
  await connectMongo();
  const rows = await Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  return rows.map(mapCategory);
}

export async function listBanners() {
  await connectMongo();
  const { Banner } = await import("@/integrations/mongodb/models");
  const rows = await Banner.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  return rows.map((b) => ({
    id: String(b._id),
    heading: b.heading,
    description: b.description,
    image_url: b.imageUrl,
    cta_label: b.ctaLabel,
    cta_link: b.ctaLink,
  }));
}

export async function getStoreSettings() {
  await connectMongo();
  const { StoreSettings, mapStoreSettings } = await import("@/integrations/mongodb/models");
  const row = await StoreSettings.findOne({ key: "default" }).lean();
  return row ? mapStoreSettings(row as Record<string, unknown>) : null;
}

// Legacy export name used by sitemap
export const publicClient = null;
