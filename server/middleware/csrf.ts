import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { Request, Response, NextFunction } from "express";

const CSRF_SECRET = (() => {
  const s = process.env.CSRF_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      console.error("[CSRF] ❌ CSRF_SECRET non défini en PRODUCTION. Définissez cette variable d'env.");
    } else {
      console.warn("[CSRF] ⚠️ CSRF_SECRET non défini. Utilisation d'une valeur de dev — NE PAS UTILISER EN PROD.");
    }
    return "dev-csrf-secret-change-in-production-42x9";
  }
  return s;
})();

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

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

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  if (!mutatingMethods.has(req.method)) {
    next();
    return;
  }

  const token = req.headers["x-csrf-token"] as string | undefined;
  if (!token || !verifyCsrfToken(token)) {
    res.status(403).json({
      error: "CSRF_INVALID",
      message: "Token CSRF invalide ou expiré. Rechargez la page et réessayez.",
    });
    return;
  }
  next();
}
