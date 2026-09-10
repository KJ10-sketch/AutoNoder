import crypto from "node:crypto";

const algorithm = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required for credential encryption.");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptCredential(value: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  const plaintext = JSON.stringify(value);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptCredential<T = unknown>(payload: string): T {
  const [ivEncoded, tagEncoded, dataEncoded] = payload.split(".");
  if (!ivEncoded || !tagEncoded || !dataEncoded) throw new Error("Invalid encrypted credential payload.");
  const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataEncoded, "base64url")), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted) as T;
}
