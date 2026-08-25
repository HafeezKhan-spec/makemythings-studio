import mongoose from "mongoose";

const globalForMongo = globalThis as typeof globalThis & {
  mongoosePromise?: Promise<typeof mongoose>;
};

/** Database name in Atlas — use your `MakeMyThing` database (collections are created automatically). */
const DEFAULT_DB_NAME = "MakeMyThing";

export async function connectMongo(): Promise<typeof mongoose> {
  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add your MongoDB Atlas connection string to .env",
    );
  }

  const dbName = process.env["MONGODB_DB_NAME"] ?? DEFAULT_DB_NAME;

  if (mongoose.connection.readyState === 1) return mongoose;

  if (!globalForMongo.mongoosePromise) {
    globalForMongo.mongoosePromise = mongoose.connect(uri, {
      bufferCommands: false,
      dbName,
    });
  }

  await globalForMongo.mongoosePromise;

  const { seedDatabase } = await import("./seed.server");
  await seedDatabase();

  const { promoteConfiguredAdminUsers } = await import("@/lib/admin-roles.server");
  await promoteConfiguredAdminUsers();

  return mongoose;
}

export async function getDb() {
  await connectMongo();
  return mongoose.connection.db!;
}
