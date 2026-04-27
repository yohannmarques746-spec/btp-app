import type { Request, Response, NextFunction } from "express";

if (!process.env.REDIS_URL) {
  console.warn(
    "[RateLimit] ⚠️  REDIS_URL non défini. Rate limiting en mémoire — se réinitialise au redémarrage. NE PAS UTILISER EN PROD sans Redis.",
  );
}

interface AttemptEntry {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, AttemptEntry>();

setInterval(() => {
  const now = Date.now();
  attempts.forEach((entry, key) => {
    if (entry.resetAt < now) attempts.delete(key);
  });
}, 5 * 60 * 1000);

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

export function checkAndIncrementLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt: now + WINDOW_MS };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count, resetAt: entry.resetAt };
}

export function rateLimitLoginMember(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as { ownerId?: string };
  const suffix = body.ownerId ?? "invite";
  const key = `${getClientIp(req)}:${suffix}`;
  const result = checkAndIncrementLimit(key);

  if (!result.allowed) {
    const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
    res.setHeader("Retry-After", String(retryAfterSec));
    res.status(429).json({
      error: "RATE_LIMITED",
      message: "Trop de tentatives. Réessayez dans 10 minutes.",
      retryAfter: retryAfterSec,
    });
    return;
  }

  res.locals["rateLimitRemaining"] = result.remaining;
  next();
}
