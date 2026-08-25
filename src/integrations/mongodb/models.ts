import mongoose, { Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, default: "" },
    phone: { type: String, default: "" },
    roles: { type: [String], default: ["customer"] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    shortDescription: { type: String, default: "" },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    originalPrice: { type: Number, default: null },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    stock: { type: Number, default: 0 },
    material: { type: String, default: "" },
    colors: { type: [String], default: [] },
    size: { type: String, default: "" },
    productionTime: { type: String, default: "" },
    tags: { type: [String], default: [] },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const OrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, required: true },
    productImage: { type: String, default: "" },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: true },
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    shippingAddress: { type: Schema.Types.Mixed, required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    deliveryCharge: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentStatus: { type: String, default: "pending" },
    paymentProvider: { type: String, default: null },
    paymentReference: { type: String, default: null },
    razorpayOrderId: { type: String, default: null },
    accessToken: { type: String, default: null },
    status: { type: String, default: "payment_pending" },
    paymentType: { type: String, enum: ["prepaid", "cod"], default: "prepaid" },
    adminAcknowledged: { type: Boolean, default: false },
    courierPartner: { type: String, default: "" },
    awbNumber: { type: String, default: "" },
    packageWeight: { type: String, default: "" },
    packageCount: { type: Number, default: 1 },
    shippingMethod: { type: String, default: "Standard" },
    shippingNotes: { type: String, default: "" },
    estimatedDelivery: { type: Date, default: null },
    notes: { type: String, default: "" },
    items: { type: [OrderItemSchema], default: [] },
  },
  { timestamps: true },
);

const AddressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    label: { type: String, default: "" },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    house: { type: String, required: true },
    street: { type: String, default: "" },
    area: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: "India" },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const CartItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, default: 1, min: 1, max: 20 },
  },
  { timestamps: true },
);
CartItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, default: "" },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true },
    minOrderValue: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const BannerSchema = new Schema(
  {
    heading: { type: String, required: true },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    ctaLabel: { type: String, default: "" },
    ctaLink: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const CustomRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    description: { type: String, required: true },
    modelFileUrl: { type: String, default: "" },
    referenceImageUrl: { type: String, default: "" },
    size: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    material: { type: String, default: "" },
    notes: { type: String, default: "" },
    quotedPrice: { type: Number, default: null },
    quoteMessage: { type: String, default: "" },
    quoteSentAt: { type: Date, default: null },
    quoteSeenByUser: { type: Boolean, default: false },
    status: { type: String, default: "new" },
    adminAcknowledged: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const ReviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const WishlistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
WishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

const StoreSettingsSchema = new Schema(
  {
    key: { type: String, default: "default", unique: true },
    businessName: { type: String, default: "MakeMyThing.in" },
    businessEmail: { type: String, default: "hello@MakeMyThing.in" },
    businessPhone: { type: String, default: "" },
    businessAddress: { type: String, default: "" },
    instagramUrl: { type: String, default: "" },
    facebookUrl: { type: String, default: "" },
    whatsappNumber: { type: String, default: "" },
    currency: { type: String, default: "INR" },
    indiaDeliveryCharge: { type: Number, default: 80 },
    freeDeliveryThreshold: { type: Number, default: 1499 },
    expressDeliveryCharge: { type: Number, default: 199 },
    internationalShippingEnabled: { type: Boolean, default: false },
    gstPercent: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const AuthOtpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true },
    otpHash: { type: String, required: true },
    purpose: { type: String, enum: ["login", "signup"], required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
AuthOtpSchema.index({ email: 1, purpose: 1 });

export type UserDoc = InferSchemaType<typeof UserSchema>;
export type ProductDoc = InferSchemaType<typeof ProductSchema>;

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
export const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
export const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
export const Address = mongoose.models.Address || mongoose.model("Address", AddressSchema);
export const CartItem = mongoose.models.CartItem || mongoose.model("CartItem", CartItemSchema);
export const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);
export const Banner = mongoose.models.Banner || mongoose.model("Banner", BannerSchema);
export const CustomRequest =
  mongoose.models.CustomRequest || mongoose.model("CustomRequest", CustomRequestSchema);
export const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);
export const Wishlist = mongoose.models.Wishlist || mongoose.model("Wishlist", WishlistSchema);
export const StoreSettings =
  mongoose.models.StoreSettings || mongoose.model("StoreSettings", StoreSettingsSchema);
export const AuthOtp = mongoose.models.AuthOtp || mongoose.model("AuthOtp", AuthOtpSchema);

/** Map MongoDB documents to API shape (snake_case for existing frontend types). */
export function toId(doc: { _id: unknown }) {
  return String(doc._id);
}

export function mapProduct(p: ProductDoc & { _id: unknown; category?: { name: string; slug: string } }) {
  return {
    id: toId(p),
    name: p.name,
    slug: p.slug,
    short_description: p.shortDescription ?? "",
    description: p.description ?? "",
    price: p.price,
    original_price: p.originalPrice,
    category_id: p.categoryId ? String(p.categoryId) : null,
    images: p.images ?? [],
    videos: p.videos ?? [],
    stock: p.stock,
    material: p.material,
    colors: p.colors ?? [],
    size: p.size,
    production_time: p.productionTime,
    tags: p.tags ?? [],
    rating: p.rating,
    review_count: p.reviewCount,
    is_featured: p.isFeatured,
    is_trending: p.isTrending,
    is_best_seller: p.isBestSeller,
    is_new_arrival: p.isNewArrival,
    is_active: p.isActive,
    created_at: (p as { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
    category: p.category ?? null,
  };
}

export function mapCategory(c: { _id: unknown; name: string; slug: string; description?: string; imageUrl?: string; sortOrder?: number }) {
  return {
    id: toId(c),
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    image_url: c.imageUrl ?? "",
    sort_order: c.sortOrder ?? 0,
  };
}

export function mapStoreSettings(s: Record<string, unknown>) {
  return {
    business_name: s.businessName,
    business_email: s.businessEmail,
    business_phone: s.businessPhone,
    business_address: s.businessAddress,
    instagram_url: s.instagramUrl,
    facebook_url: s.facebookUrl,
    whatsapp_number: s.whatsappNumber,
    currency: s.currency,
    india_delivery_charge: s.indiaDeliveryCharge,
    free_delivery_threshold: s.freeDeliveryThreshold,
    express_delivery_charge: s.expressDeliveryCharge,
    international_shipping_enabled: s.internationalShippingEnabled,
    gst_percent: s.gstPercent,
  };
}
