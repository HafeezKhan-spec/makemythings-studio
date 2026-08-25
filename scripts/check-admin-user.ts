import "dotenv/config";
import mongoose from "mongoose";

import { connectMongo } from "../src/integrations/mongodb/connect.server.ts";
import { User } from "../src/integrations/mongodb/models.ts";
import { getAdminEmailList } from "../src/lib/admin-roles.server.ts";

await connectMongo();

for (const email of getAdminEmailList()) {
  const user = await User.findOne({ email }).lean();
  if (!user) {
    console.log(`${email}: no account yet — sign up at /auth first`);
    continue;
  }
  console.log(`${email}: roles=${JSON.stringify(user.roles)}`);
}

await mongoose.disconnect();
