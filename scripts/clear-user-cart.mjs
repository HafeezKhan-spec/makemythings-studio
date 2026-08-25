import "dotenv/config";
import mongoose from "mongoose";

const email = (process.argv[2] ?? "hk386579@gmail.com").toLowerCase();
const uri = process.env.MONGODB_URI;
await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME ?? "MakeMyThing" });

const User =
  mongoose.models.User ||
  mongoose.model("User", new mongoose.Schema({}, { strict: false }));
const CartItem =
  mongoose.models.CartItem ||
  mongoose.model("CartItem", new mongoose.Schema({}, { strict: false }));

const user = await User.findOne({ email }).lean();
if (!user) {
  console.error("User not found");
  process.exit(1);
}

const result = await CartItem.deleteMany({ userId: user._id });
console.log("Cleared", result.deletedCount, "cart item(s) for", email);

await mongoose.disconnect();
