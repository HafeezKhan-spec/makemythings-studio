import "dotenv/config";
import mongoose from "mongoose";

const checks = [];

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
}
function fail(name, detail) {
  checks.push({ name, ok: false, detail });
}

// Env presence
const required = ["MONGODB_URI", "MONGODB_DB_NAME", "JWT_SECRET", "OTP_SECRET", "RESEND_API_KEY", "RESEND_FROM_EMAIL"];
for (const key of required) {
  if (process.env[key]?.trim()) pass(`env:${key}`, "set");
  else fail(`env:${key}`, "missing or empty");
}

if (process.env.JWT_SECRET === "change-me-in-production") {
  checks.push({ name: "jwt:strength", ok: false, detail: "still using default — change JWT_SECRET for production" });
} else {
  pass("jwt:strength", "custom secret");
}

// MongoDB
try {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME ?? "MakeMyThing";
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name).sort();
  pass("mongodb:connect", `connected to db "${db.databaseName}"`);
  pass("mongodb:collections", names.length ? names.join(", ") : "(none yet — will be created on seed)");

  const productCount = await db.collection("products").countDocuments().catch(() => 0);
  const userCount = await db.collection("users").countDocuments().catch(() => 0);
  pass("mongodb:data", `users=${userCount}, products=${productCount}`);

  if (productCount === 0) {
    fail("mongodb:seed", "no products — run: npx tsx scripts/run-seed.ts");
  } else {
    pass("mongodb:seed", `products=${productCount}`);
  }

  await mongoose.disconnect();
} catch (e) {
  fail("mongodb:connect", e instanceof Error ? e.message : String(e));
}

// Resend API
if (process.env.RESEND_API_KEY) {
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (res.ok) pass("resend:api", "API key valid");
    else fail("resend:api", `HTTP ${res.status} — check API key or from-address domain`);
  } catch (e) {
    fail("resend:api", e instanceof Error ? e.message : String(e));
  }
}

// JWT sign/verify
try {
  const { SignJWT, jwtVerify } = await import("jose");
  const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "test");
  const token = await new SignJWT({ email: "test@test.com", roles: ["customer"] })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("test-id")
    .setExpirationTime("1h")
    .sign(secret);
  await jwtVerify(token, secret);
  pass("jwt:sign-verify", "works");
} catch (e) {
  fail("jwt:sign-verify", e instanceof Error ? e.message : String(e));
}

console.log(JSON.stringify(checks, null, 2));
const failed = checks.filter((c) => !c.ok);
process.exit(failed.length ? 1 : 0);
