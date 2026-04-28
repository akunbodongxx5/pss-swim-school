import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const TAG = "scrypt1";
const KEYLEN = 32;

function safeCompareUtf8(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Simpan di kolom SchoolBranding.adminPinHash — bukan plaintext. */
export function hashAdminPin(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN);
  return `${TAG}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/**
 * stored null/empty → bandingkan dengan envFallback (ADMIN_PIN / default).
 * stored berisi hash → verifikasi scrypt.
 */
export function verifyAdminPin(plain: string, stored: string | null | undefined, envFallback: string): boolean {
  const env = envFallback;
  if (!stored || stored.trim() === "") {
    return safeCompareUtf8(plain, env);
  }
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== TAG) return false;
  const [, saltHex, expectedHex] = parts;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(expectedHex, "hex");
  } catch {
    return false;
  }
  if (expected.length !== KEYLEN) return false;
  const hash = scryptSync(plain, salt, KEYLEN);
  return timingSafeEqual(hash, expected);
}

export function validateNewAdminPin(plain: string): "ok" | "too_short" | "too_long" {
  const t = plain.trim();
  if (t.length < 4) return "too_short";
  if (t.length > 128) return "too_long";
  return "ok";
}
