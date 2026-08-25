import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const TOKEN_KEY = "mmt-auth-token";

export function getTokenSecret() {
  const secret = process.env["JWT_SECRET"] ?? "mmt-dev-jwt-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export type TokenPayload = {
  sub: string;
  email: string;
  roles: string[];
};

export async function signAccessToken(payload: TokenPayload) {
  return new SignJWT({ email: payload.email, roles: payload.roles })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getTokenSecret());
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getTokenSecret());
  if (!payload.sub || typeof payload.email !== "string") {
    throw new Error("Invalid token");
  }
  return {
    sub: payload.sub,
    email: payload.email,
    roles: Array.isArray(payload.roles) ? (payload.roles as string[]) : ["customer"],
  };
}
