import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB_NAME!;

await mongoose.connect(uri, { dbName });
const db = mongoose.connection.db!;

const ins = await db.collection("_pipeline_test").insertOne({ ok: true, at: new Date() });
const found = await db.collection("_pipeline_test").findOne({ _id: ins.insertedId });
console.log("write_ok:", Boolean(found));
await db.collection("_pipeline_test").drop().catch(() => {});

const cols = await db.listCollections().toArray();
console.log("collections:", cols.map((c) => c.name).join(", ") || "(empty)");
console.log("products:", await db.collection("products").countDocuments().catch(() => 0));

await mongoose.disconnect();
