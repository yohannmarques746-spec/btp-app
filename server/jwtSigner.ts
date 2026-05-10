import { SignJWT } from "jose";

const SESSION_DURATION_SECONDS = 24 * 60 * 60; // 24h, aligné sur member_sessions.expires_at

/**
 * Signe un JWT HS256 compatible avec Supabase (PostgREST lit sub → auth.uid()).
 * Nécessite SUPABASE_JWT_SECRET dans les variables d'environnement.
 * Retourne null si le secret est absent (dégradation douce sans crash).
 */
export async function signSupabaseJwt(
  authUserId: string,
  email: string,
): Promise<string | null> {
  const secret = process.env.SUPABASE_JWT_SECRET ?? "";
  if (!secret) {
    console.warn(
      "[jwtSigner] SUPABASE_JWT_SECRET absent — impossible de créer une session Supabase pour l'employé. " +
        "Ajoutez cette variable dans .env (Project Settings → API → JWT Settings).",
    );
    return null;
  }

  const secretBytes = new TextEncoder().encode(secret);
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    sub: authUserId,
    aud: "authenticated",
    role: "authenticated",
    email,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    iat: now,
    exp: now + SESSION_DURATION_SECONDS,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(secretBytes);
}
