import { createClient } from "@supabase/supabase-js";

const url =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "";

const anonKey =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  "";

if (!url || !anonKey) {
  console.warn("[supabaseServer] SUPABASE_URL ou SUPABASE_ANON_KEY manquant dans .env");
}

/**
 * Client Supabase côté serveur (anon key).
 * Les RPCs SECURITY DEFINER sont accessibles depuis ce client.
 */
export const supabaseServer = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
