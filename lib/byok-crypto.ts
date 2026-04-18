import "server-only";

import crypto from "crypto";
import type { ByokProvider } from "@/lib/byok";

const ALGORITHM = "aes-256-gcm";

function getMasterSecret() {
  const secret =
    process.env.BYOK_ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      "BYOK_ENCRYPTION_SECRET (or NEXTAUTH_SECRET fallback) is required for BYOK storage"
    );
  }

  return secret;
}

function getDerivedKey() {
  return crypto.createHash("sha256").update(getMasterSecret()).digest();
}

export function encryptApiKey(rawKey: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getDerivedKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(rawKey, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptApiKey(payload: string) {
  const [ivB64, tagB64, dataB64] = String(payload || "").split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Stored API key payload is invalid");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getDerivedKey(),
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function formatKeyHint(provider: ByokProvider, rawKey: string) {
  const trimmed = rawKey.trim();
  const last4 = trimmed.slice(-4) || "key";

  if (provider === "openai") {
    return `OpenAI ••••${last4}`;
  }

  return `Anthropic ••••${last4}`;
}
