import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME ?? "MakeMyThing" });
const Order =
  mongoose.models.Order ||
  mongoose.model("Order", new mongoose.Schema({}, { strict: false }));

const orders = await Order.find()
  .sort({ createdAt: -1 })
  .limit(5)
  .lean();

for (const o of orders) {
  console.log({
    orderNumber: o.orderNumber,
    paymentStatus: o.paymentStatus,
    status: o.status,
    adminAcknowledged: o.adminAcknowledged,
    createdAt: o.createdAt,
  });
}

await mongoose.disconnect();
