import "dotenv/config";
import mongoose from "mongoose";

const email = (process.argv[2] ?? "hk386579@gmail.com").toLowerCase();
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set in .env");
  process.exit(1);
}

const dbName = process.env.MONGODB_DB_NAME ?? "MakeMyThing";
await mongoose.connect(uri, { dbName });

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    new mongoose.Schema(
      {
        email: String,
        isActive: Boolean,
        roles: [String],
      },
      { strict: false },
    ),
  );

const result = await User.updateOne(
  { email },
  { $set: { isActive: true, roles: ["customer", "admin"] } },
);
const user = await User.findOne({ email }).lean();

console.log("Update matched:", result.matchedCount, "modified:", result.modifiedCount);
console.log(
  "User:",
  JSON.stringify({ email: user?.email, isActive: user?.isActive, roles: user?.roles }, null, 2),
);

await mongoose.disconnect();
