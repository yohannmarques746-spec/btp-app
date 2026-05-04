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
