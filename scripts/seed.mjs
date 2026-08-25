import "dotenv/config";
import mongoose from "mongoose";
import {
  Banner,
  Category,
  Coupon,
  Product,
  StoreSettings,
} from "../src/integrations/mongodb/models.ts";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? "MakeMyThing";

await mongoose.connect(uri, { dbName });

const productCount = await Product.countDocuments();
if (productCount > 0) {
  console.log("Already seeded:", productCount, "products");
  process.exit(0);
}

await StoreSettings.findOneAndUpdate(
  { key: "default" },
  {
    key: "default",
    businessEmail: "hello@makemythings.in",
    businessPhone: "+91 98765 43210",
    businessAddress: "Bengaluru, Karnataka, India",
    whatsappNumber: "919876543210",
    indiaDeliveryCharge: 80,
    freeDeliveryThreshold: 1499,
  },
  { upsert: true },
);

const categories = await Category.insertMany([
  { name: "Anime & Collectibles", slug: "anime-collectibles", sortOrder: 1, isActive: true },
  { name: "Home Décor", slug: "home-decor", sortOrder: 2, isActive: true },
  { name: "Desk Accessories", slug: "desk-accessories", sortOrder: 3, isActive: true },
  { name: "Keychains", slug: "keychains", sortOrder: 4, isActive: true },
  { name: "Miniatures", slug: "miniatures", sortOrder: 5, isActive: true },
  { name: "Customized Products", slug: "customized", sortOrder: 6, isActive: true },
  { name: "Tech Accessories", slug: "tech-accessories", sortOrder: 7, isActive: true },
  { name: "Gifts", slug: "gifts", sortOrder: 8, isActive: true },
]);

const cat = (slug) => categories.find((c) => c.slug === slug)._id;

await Product.insertMany([
  { name: "Anime Character Statue", slug: "anime-character-statue", shortDescription: "Hand-finished 20cm collector statue", price: 1999, originalPrice: 2499, categoryId: cat("anime-collectibles"), images: ["/images/p-anime-statue.jpg"], stock: 12, isFeatured: true, isTrending: true, isBestSeller: true },
  { name: "Mini Dragon Figurine", slug: "mini-dragon-figurine", shortDescription: "Articulated dragon", price: 799, originalPrice: 999, categoryId: cat("miniatures"), images: ["/images/p-dragon.jpg"], stock: 40, isFeatured: true, isTrending: true, isBestSeller: true },
  { name: "Custom Name Keychain", slug: "custom-name-keychain", shortDescription: "Personalised keychain", price: 299, originalPrice: 499, categoryId: cat("keychains"), images: ["/images/p-keychain.jpg"], stock: 200, isFeatured: true, isBestSeller: true },
]);

await Coupon.insertMany([
  { code: "MAKE10", discountType: "percentage", discountValue: 10, minOrderValue: 499, maxDiscount: 500, isActive: true },
]);

await Banner.insertMany([
  { heading: "Flat 20% off collectibles", description: "Anime statues", imageUrl: "/images/p-anime-statue.jpg", ctaLabel: "Shop", ctaLink: "/shop", sortOrder: 1, isActive: true },
]);

console.log("Seed complete:", await Product.countDocuments(), "products");
await mongoose.disconnect();
