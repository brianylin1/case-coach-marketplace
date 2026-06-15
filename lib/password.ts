// Password hashing for email+password auth. Uses Node's built-in scrypt — a
// memory-hard KDF (no native/WASM dependency to break the serverless build).
// Server-only: importing node:crypto keeps this out of any client bundle.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

// scrypt cost. N must be a power of 2; 2^15 is a sane interactive default
// (~80ms / ~32MB) that stays well under the serverless time/memory budget.
// maxmem is set generously so the chosen N never trips Node's default 32MB cap.
const N = 1 << 15;
const R = 8;
const P = 1;
const MAXMEM = 256 * 1024 * 1024;
const KEYLEN = 64;
const SALT_BYTES = 16;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

// Length-only policy (NIST-style): long beats complex, and it keeps the UX
// simple. Returns an error message, or null when the password is acceptable.
// Passwords are never trimmed — leading/trailing spaces are part of the secret.
export function passwordError(password: unknown): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

function scrypt(password: string, salt: Buffer, keylen: number, n: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, { N: n, r: R, p: P, maxmem: MAXMEM }, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
}

// Stored format: scrypt$<N>$<saltHex>$<hashHex>. Self-describing, so the cost
// can be raised later without invalidating existing hashes.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password, salt, KEYLEN, N);
  return `scrypt$${N}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false; // no password set — fail closed
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  // Guard against malformed/abusive params (these come from our own column,
  // but verify defensively so a bad row can't crash or DoS login).
  if (!Number.isInteger(n) || n < 2 || n > 1 << 20) return false;
  if (salt.length === 0 || expected.length === 0) return false;
  let key: Buffer;
  try {
    key = await scrypt(password, salt, expected.length, n);
  } catch {
    return false;
  }
  return key.length === expected.length && timingSafeEqual(key, expected);
}
