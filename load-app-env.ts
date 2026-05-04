/**
 * Charge `.env` à la racine du dépôt, puis complète les `VITE_*` vides depuis `client/.env`.
 * Utilisé au démarrage du serveur Node et au chargement de `vite.config.ts` (build inclus).
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

/** UUID v4 (user Supabase) — refuse les placeholders du type `<ton-user-id-supabase>`. */
function isUsableOwnerId(v: string | undefined): boolean {
  if (v === undefined) return false;
  const t = String(v).trim();
  if (t === "") return false;
  const lower = t.toLowerCase();
  if (lower.includes("ton-user-id") || lower.includes("your-user")) return false;
  if (t.startsWith("<") && t.endsWith(">")) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
}

export function loadAppEnv(repoRoot: string): void {
  dotenv.config({ path: path.join(repoRoot, ".env") });

  const clientEnvPath = path.join(repoRoot, "client", ".env");
  if (fs.existsSync(clientEnvPath)) {
    const parsed = dotenv.parse(fs.readFileSync(clientEnvPath, "utf8"));
    /** Clés lues côté Express (CRM email, auth serveur) si absentes du `.env` racine. */
    const clientFallbackKeys = new Set([
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
      "VITE_APP_ENV",
      "RESEND_API_KEY",
      "RESEND_FROM",
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "VITE_OWNER_ID",
      "VITE_OWNER_IDS",
    ]);
    for (const [key, value] of Object.entries(parsed)) {
      if (!clientFallbackKeys.has(key)) continue;
      const cur = process.env[key];
      const next = typeof value === "string" ? value.trim() : "";
      if (next === "") continue;
      if (cur === undefined || String(cur).trim() === "") {
        process.env[key] = value;
      }
    }

    // Gérer les deux formats : ancien VITE_OWNER_ID et nouveau VITE_OWNER_IDS
    const clientOwners =
      typeof parsed.VITE_OWNER_IDS === "string" ? parsed.VITE_OWNER_IDS.trim() : "";
    if (clientOwners && !process.env.VITE_OWNER_IDS?.trim()) {
      process.env.VITE_OWNER_IDS = clientOwners;
    }

    // Fallback : si VITE_OWNER_IDS n'existe pas mais VITE_OWNER_ID existe
    if (!process.env.VITE_OWNER_IDS?.trim()) {
      const clientOwner =
        typeof parsed.VITE_OWNER_ID === "string" ? parsed.VITE_OWNER_ID.trim() : "";
      if (clientOwner && isUsableOwnerId(clientOwner)) {
        process.env.VITE_OWNER_IDS = clientOwner;
      }
    }
  }

  /** Express (`crmEmail`, etc.) utilise `SUPABASE_*` sans préfixe VITE — aligner sur le même projet. */
  const vUrl = process.env.VITE_SUPABASE_URL?.trim();
  const vAnon = process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!process.env.SUPABASE_URL?.trim() && vUrl) {
    process.env.SUPABASE_URL = vUrl;
  }
  if (!process.env.SUPABASE_ANON_KEY?.trim() && vAnon) {
    process.env.SUPABASE_ANON_KEY = vAnon;
  }
}

/**
 * Pousse les `VITE_*` présents dans `process.env` vers le remplacement statique
 * `import.meta.env.*` (nécessaire en dev middleware où la résolution seule peut rester vide).
 */
export function viteImportMetaEnvDefine(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(process.env)) {
    if (!k.startsWith("VITE_")) continue;
    out[`import.meta.env.${k}`] = JSON.stringify(process.env[k] ?? "");
  }
  return out;
}
