import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const CSRF_SECRET = (() => {
  const s = process.env.CSRF_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      console.error("[CSRF] CSRF_SECRET non défini en PRODUCTION.");
    } else {
      console.warn("[CSRF] CSRF_SECRET non défini. Valeur de dev utilisée.");
    }
    return "dev-csrf-secret-change-in-production-42x9";
  }
  return s;
})();

const TOKEN_TTL_MS = 60 * 60 * 1000;

export function generateCsrfToken(): string {
  const nonce = randomBytes(16).toString("hex");
  const timestamp = Date.now().toString(10);
  const signature = createHmac("sha256", CSRF_SECRET)
    .update(`${nonce}:${timestamp}`)
    .digest("hex");
  return `${nonce}:${timestamp}:${signature}`;
}

export function verifyCsrfToken(token: string): boolean {
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [nonce, timestamp, signature] = parts;
  if (!nonce || !timestamp || !signature) return false;

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;
  const age = Date.now() - ts;
  if (age < 0 || age > TOKEN_TTL_MS) return false;

  const expected = createHmac("sha256", CSRF_SECRET)
    .update(`${nonce}:${timestamp}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
