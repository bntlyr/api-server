import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

let cachedPrivateKey: string | null = null;
let cachedPublicKey: string | null = null;

export function getPublicKey(): string {
  if (cachedPublicKey) return cachedPublicKey;
  const keyPath = path.resolve(process.cwd(), "keys/public.pem");
  if (fs.existsSync(keyPath)) {
    cachedPublicKey = fs.readFileSync(keyPath, "utf8");
    return cachedPublicKey;
  }
  return "";
}

export function getPrivateKey(): string {
  if (cachedPrivateKey) return cachedPrivateKey;
  const keyPath = path.resolve(process.cwd(), "keys/private.pem");
  if (fs.existsSync(keyPath)) {
    cachedPrivateKey = fs.readFileSync(keyPath, "utf8");
    return cachedPrivateKey;
  }
  return "";
}

/**
 * Decrypt an RSA-OAEP SHA-256 encrypted base64 payload.
 * If the input is not encrypted or decryption fails, returns the original input.
 */
export function pemDecrypt(encryptedBase64: string): string {
  if (!encryptedBase64 || typeof encryptedBase64 !== "string") {
    return "";
  }

  const privateKey = getPrivateKey();
  if (!privateKey) {
    return encryptedBase64;
  }

  try {
    const buffer = Buffer.from(encryptedBase64, "base64");
    // Standard RSA-OAEP base64 payload length for 2048-bit key is typically 256 bytes raw (approx 344 base64 chars)
    if (buffer.length !== 256) {
      return encryptedBase64;
    }

    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      buffer,
    );

    const result = decrypted.toString("utf8");
    return result || encryptedBase64;
  } catch {
    // If decryption fails, gracefully fall back to the original string
    return encryptedBase64;
  }
}
