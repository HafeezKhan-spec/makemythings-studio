import "dotenv/config";
import mongoose from "mongoose";
import { connectMongo } from "../src/integrations/mongodb/connect.server.ts";

await connectMongo();
const count = await mongoose.connection.db!.collection("products").countDocuments();
const cols = await mongoose.connection.db!.listCollections().toArray();
console.log("products:", count);
console.log("collections:", cols.map((c) => c.name).sort().join(", "));
await mongoose.disconnect();
