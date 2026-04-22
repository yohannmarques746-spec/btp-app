function isAuthRateLimited(error: { message?: string; status?: number }): boolean {
  const { message = '', status } = error
  const lower = message.toLowerCase()
  return (
    status === 429 ||
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('email rate limit')
  )
}

/** Texte d'erreur Supabase Auth (ex. 429 / email rate limit) en français pour l'UI. */
export function formatSupabaseAuthError(
  error: { message?: string; status?: number } | null | undefined,
  fallback: string
): string {
  if (!error) return fallback
  if (isAuthRateLimited(error)) {
    // #region agent log
    fetch('http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b01c17' },
      body: JSON.stringify({
        sessionId: 'b01c17',
        runId: 'post-fix',
        hypothesisId: 'verify',
        location: 'authErrors.ts:formatSupabaseAuthError',
        message: 'rate limit branch used',
        data: { status: error.status ?? null },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    return (
      "Trop d'emails d'authentification ont été envoyés récemment (limite Supabase). " +
      'Réessayez dans quelques minutes. Pour le développement, vous pouvez relever les plafonds dans le tableau Supabase (Authentication > Rate limits).'
    )
  }
  return error.message || fallback
}
