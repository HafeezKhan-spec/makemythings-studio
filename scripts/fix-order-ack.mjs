import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME ?? "MakeMyThing" });
const Order =
  mongoose.models.Order ||
  mongoose.model("Order", new mongoose.Schema({}, { strict: false }));

// Unpaid orders should not be acknowledged — reset so NEW badge shows
await Order.updateMany(
  { paymentStatus: { $ne: "paid" } },
  { $set: { adminAcknowledged: false } },
);

// Delivered orders are done — mark acknowledged so they don't show NEW
await Order.updateMany(
  { status: "delivered" },
  { $set: { adminAcknowledged: true } },
);

const orders = await Order.find()
  .sort({ createdAt: -1 })
  .limit(5)
  .lean();

console.log("Updated. Recent orders:");
for (const o of orders) {
  console.log({
    orderNumber: o.orderNumber,
    paymentStatus: o.paymentStatus,
    status: o.status,
    adminAcknowledged: o.adminAcknowledged,
  });
}

await mongoose.disconnect();
