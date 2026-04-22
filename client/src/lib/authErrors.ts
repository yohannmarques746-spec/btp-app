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
    return (
      "Trop d'emails d'authentification ont été envoyés récemment (limite Supabase). " +
      'Réessayez dans quelques minutes. Pour le développement, vous pouvez relever les plafonds dans le tableau Supabase (Authentication > Rate limits).'
    )
  }
  return error.message || fallback
}
