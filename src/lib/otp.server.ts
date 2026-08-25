import { createHash, randomInt } from "node:crypto";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const SEND_WINDOW_MS = 15 * 60 * 1000;

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(email: string, otp: string): string {
  const secret = process.env["OTP_SECRET"] ?? "mmt-dev-otp-secret";
  return createHash("sha256").update(`${email.toLowerCase()}:${otp}:${secret}`).digest("hex");
}

export function otpExpiresAt(): string {
  return new Date(Date.now() + OTP_TTL_MS).toISOString();
}

export function sendWindowStart(): string {
  return new Date(Date.now() - SEND_WINDOW_MS).toISOString();
}

export { OTP_TTL_MS, MAX_SENDS_PER_WINDOW };
