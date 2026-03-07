import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 16;
const SALT_LEN = 32;
const TAG_LEN = 16;

function getSecret(): Buffer {
  const secret = process.env.DOC_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("DOC_ENCRYPTION_SECRET must be at least 32 characters");
  }
  return scryptSync(secret, "blockchain-inheritance-salt", KEY_LEN);
}

export function encryptBuffer(data: Buffer): { encrypted: Buffer; iv: string } {
  const key = getSecret();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);
  return { encrypted, iv: iv.toString("base64") };
}

export function decryptBuffer(encrypted: Buffer, ivBase64: string): Buffer {
  const key = getSecret();
  const iv = Buffer.from(ivBase64, "base64");
  if (iv.length !== IV_LEN) throw new Error("Invalid IV");
  const tag = encrypted.subarray(-TAG_LEN);
  const body = encrypted.subarray(0, -TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}
