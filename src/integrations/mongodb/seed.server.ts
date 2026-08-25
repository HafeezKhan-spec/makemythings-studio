import { connectMongo } from "./connect.server";
import {
  Banner,
  Category,
  Coupon,
  Product,
  StoreSettings,
} from "./models";

const ADMIN_EMAILS = ["hk386579@gmail.com"];

export async function seedDatabase() {
  await connectMongo();

  const productCount = await Product.countDocuments();
  if (productCount > 0) return;

  const settings = await StoreSettings.findOne({ key: "default" });
  if (!settings) {
    await StoreSettings.create({
      key: "default",
      businessEmail: "hello@MakeMyThing.in",
      businessPhone: "+91 98765 43210",
      businessAddress: "Bengaluru, Karnataka, India",
      whatsappNumber: "919876543210",
      indiaDeliveryCharge: 80,
      freeDeliveryThreshold: 1499,
    });
  }

  const categories = await Category.insertMany([
    { name: "Anime & Collectibles", slug: "anime-collectibles", description: "Detailed figures of your favourite characters", imageUrl: "/images/cat-anime.jpg", sortOrder: 1 },
    { name: "Home Décor", slug: "home-decor", description: "Sculptural pieces that lift any room", imageUrl: "/images/cat-decor.jpg", sortOrder: 2 },
    { name: "Desk Accessories", slug: "desk-accessories", description: "Organise your workspace in style", imageUrl: "/images/cat-desk.jpg", sortOrder: 3 },
    { name: "Keychains", slug: "keychains", description: "Personalised everyday carry", imageUrl: "/images/cat-keychain.jpg", sortOrder: 4 },
    { name: "Miniatures", slug: "miniatures", description: "Tabletop and display miniatures", imageUrl: "/images/cat-mini.jpg", sortOrder: 5 },
    { name: "Customized Products", slug: "customized", description: "Made exactly to your idea", imageUrl: "/images/cat-custom.jpg", sortOrder: 6 },
    { name: "Tech Accessories", slug: "tech-accessories", description: "Stands, mounts and cable tidies", imageUrl: "/images/cat-tech.jpg", sortOrder: 7 },
    { name: "Gifts", slug: "gifts", description: "Thoughtful printed gifting", imageUrl: "/images/cat-gifts.jpg", sortOrder: 8 },
  ]);

  const cat = (slug: string) => categories.find((c) => c.slug === slug)!._id;

  await Product.insertMany([
    { name: "Anime Character Statue", slug: "anime-character-statue", shortDescription: "Hand-finished 20cm collector statue", description: "A highly detailed 20cm anime character statue.", price: 1999, originalPrice: 2499, categoryId: cat("anime-collectibles"), images: ["/images/p-anime-statue.jpg"], stock: 12, material: "PLA+", colors: ["Matte White"], size: "20 cm", productionTime: "4-6 days", tags: ["anime"], rating: 4.8, reviewCount: 42, isFeatured: true, isTrending: true, isBestSeller: true },
    { name: "Mini Dragon Figurine", slug: "mini-dragon-figurine", shortDescription: "Articulated dragon that actually moves", description: "Print-in-place articulated dragon.", price: 799, originalPrice: 999, categoryId: cat("miniatures"), images: ["/images/p-dragon.jpg"], stock: 40, material: "PLA", colors: ["Emerald"], size: "18 cm", productionTime: "2-3 days", tags: ["dragon"], rating: 4.9, reviewCount: 88, isFeatured: true, isTrending: true, isBestSeller: true },
    { name: "Custom Name Keychain", slug: "custom-name-keychain", shortDescription: "Your name, your colours", description: "Personalised keychain.", price: 299, originalPrice: 499, categoryId: cat("keychains"), images: ["/images/p-keychain.jpg"], stock: 200, material: "PETG", colors: ["Black/Gold"], size: "6 cm", productionTime: "1-2 days", tags: ["keychain"], rating: 4.7, reviewCount: 131, isFeatured: true, isBestSeller: true },
    { name: "Modular Desk Organizer", slug: "desk-organizer", shortDescription: "Stackable trays for a tidy desk", description: "Modular desk organiser.", price: 1299, originalPrice: 1599, categoryId: cat("desk-accessories"), images: ["/images/p-organizer.jpg"], stock: 25, material: "PLA Matte", colors: ["Graphite"], size: "22x12x9 cm", productionTime: "3-4 days", rating: 4.6, reviewCount: 37, isFeatured: true, isNewArrival: true },
    { name: "Adjustable Phone Stand", slug: "phone-stand", shortDescription: "Folds flat, holds firm", description: "Foldable phone stand.", price: 499, categoryId: cat("tech-accessories"), images: ["/images/p-phone-stand.jpg"], stock: 80, material: "PETG", colors: ["Black"], size: "10x8 cm", productionTime: "1-2 days", rating: 4.5, reviewCount: 64, isTrending: true, isBestSeller: true },
    { name: "Custom Lithophane Lamp", slug: "custom-lithophane", shortDescription: "Your photo, glowing in 3D", description: "Custom lithophane lamp.", price: 1499, originalPrice: 1999, categoryId: cat("customized"), images: ["/images/p-lithophane.jpg"], stock: 18, material: "Translucent PLA", colors: ["Natural"], size: "14x10 cm", productionTime: "4-5 days", rating: 5, reviewCount: 29, isFeatured: true, isTrending: true, isNewArrival: true },
    { name: "Geometric Planter", slug: "geometric-planter", shortDescription: "Faceted planter with drip tray", description: "Low-poly faceted planter.", price: 699, originalPrice: 899, categoryId: cat("home-decor"), images: ["/images/p-planter.jpg"], stock: 55, material: "PLA", colors: ["Terracotta"], size: "12 cm", productionTime: "2-3 days", rating: 4.6, reviewCount: 51, isBestSeller: true },
    { name: "Gaming Controller Stand", slug: "controller-stand", shortDescription: "Dual-controller display stand", description: "Weighted dual-controller stand.", price: 899, originalPrice: 1199, categoryId: cat("tech-accessories"), images: ["/images/p-controller-stand.jpg"], stock: 30, material: "PLA+", colors: ["Matte Black"], size: "24x12 cm", productionTime: "2-3 days", rating: 4.7, reviewCount: 45, isTrending: true, isNewArrival: true },
    { name: "Personalized Photo Frame", slug: "photo-frame", shortDescription: "Names, dates and a printed pattern", description: "Custom photo frame.", price: 599, originalPrice: 799, categoryId: cat("gifts"), images: ["/images/p-photo-frame.jpg"], stock: 45, material: "PLA Silk", colors: ["Gold Silk"], size: "4x6 in", productionTime: "2-3 days", rating: 4.4, reviewCount: 22, isNewArrival: true },
    { name: "Miniature Car Model", slug: "miniature-car-model", shortDescription: "1:24 scale detailed classic", description: "Classic car model.", price: 1299, categoryId: cat("miniatures"), images: ["/images/p-car.jpg"], stock: 20, material: "Resin PLA+", colors: ["Racing Red"], size: "19 cm", productionTime: "3-5 days", rating: 4.8, reviewCount: 33, isFeatured: true, isBestSeller: true },
  ]);

  await Banner.insertMany([
    { heading: "Flat 20% off collectibles", description: "Anime statues and articulated figures.", imageUrl: "/images/p-anime-statue.jpg", ctaLabel: "Shop collectibles", ctaLink: "/shop?category=anime-collectibles", sortOrder: 1 },
    { heading: "Turn your photo into light", description: "Custom lithophane lamps.", imageUrl: "/images/p-lithophane.jpg", ctaLabel: "Create yours", ctaLink: "/custom-printing", sortOrder: 2 },
  ]);

  await Coupon.insertMany([
    { code: "MAKE10", description: "10% off your order", discountType: "percentage", discountValue: 10, minOrderValue: 499, maxDiscount: 500, expiresAt: new Date(Date.now() + 90 * 86400000), usageLimit: 500 },
    { code: "FLAT200", description: "₹200 off orders above ₹1499", discountType: "fixed", discountValue: 200, minOrderValue: 1499, expiresAt: new Date(Date.now() + 60 * 86400000), usageLimit: 200 },
  ]);

  console.info("[mongodb] Demo catalog seeded");
}

export { ADMIN_EMAILS };
