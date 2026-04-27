let _cachedToken: string | null = null;
let _fetchedAt = 0;
const TOKEN_TTL = 50 * 60 * 1000; // 50 min (server expire après 60 min)

export async function getCsrfToken(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && now - _fetchedAt < TOKEN_TTL) {
    return _cachedToken;
  }
  const res = await fetch("/api/team/csrf-token");
  if (!res.ok) throw new Error("Impossible de récupérer le token CSRF");
  const data = (await res.json()) as { token: string };
  _cachedToken = data.token;
  _fetchedAt = now;
  return _cachedToken;
}

export function clearCsrfCache(): void {
  _cachedToken = null;
  _fetchedAt = 0;
}
