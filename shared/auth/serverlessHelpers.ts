import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyCsrfToken } from "./csrf.js";
import { checkAndIncrementLimit } from "./rateLimit.js";

export function withCors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  // Reflète exactement les headers demandés par le navigateur dans le preflight,
  // pour éviter d'oublier un header (ex: x-debug-session-id injecté par Cursor).
  // À défaut, fallback sur la liste connue + wildcard.
  const requestedHeaders = req.headers["access-control-request-headers"];
  const allowedHeaders =
    typeof requestedHeaders === "string" && requestedHeaders.length > 0
      ? requestedHeaders
      : "Content-Type, Authorization, X-CSRF-Token, X-Debug-Session-Id";
  res.setHeader("Access-Control-Allow-Headers", allowedHeaders);
  res.setHeader("Access-Control-Max-Age", "600");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function withMethod(
  req: VercelRequest,
  res: VercelResponse,
  allowed: string | string[],
): boolean {
  const methods = Array.isArray(allowed) ? allowed : [allowed];
  if (!req.method || !methods.includes(req.method)) {
    res.status(405).json({ error: "Method Not Allowed" });
    return false;
  }
  return true;
}

export function extractBearer(req: VercelRequest): string | null {
  const auth = req.headers.authorization;
  if (typeof auth !== "string") return null;
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

export function unwrapRpc<T>(data: T | T[] | null): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return data.length > 0 ? data[0] : null;
  return data;
}

export function requireCsrf(req: VercelRequest, res: VercelResponse): boolean {
  const header = req.headers["x-csrf-token"];
  const token = Array.isArray(header) ? header[0] : header;
  if (!token || !verifyCsrfToken(token)) {
    res.status(403).json({
      error: "CSRF_INVALID",
      message: "Token CSRF invalide ou expiré. Rechargez la page et réessayez.",
    });
    return false;
  }
  return true;
}

export function requireRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  suffix: string,
): boolean {
  const ip = getClientIp(req);
  const key = `${ip}:${suffix}`;
  const result = checkAndIncrementLimit(key);

  if (!result.allowed) {
    const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
    res.setHeader("Retry-After", String(retryAfterSec));
    res.status(429).json({
      error: "RATE_LIMITED",
      message: "Trop de tentatives. Réessayez dans 10 minutes.",
      retryAfter: retryAfterSec,
    });
    return false;
  }
  return true;
}
