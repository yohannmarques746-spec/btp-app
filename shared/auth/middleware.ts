import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { User } from "@supabase/supabase-js";
import { getSupabaseServer } from "./supabaseFactory.js";
import { extractBearer } from "./serverlessHelpers.js";

export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<{ user: User } | null> {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "Non autorisé" });
    return null;
  }
  const supabase = getSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: "Non autorisé" });
    return null;
  }
  return { user };
}

export async function requireOwnerOrCoOwner(
  userId: string,
  ownerId: string,
  res: VercelResponse,
): Promise<boolean> {
  if (userId === ownerId) return true;
  const supabase = getSupabaseServer();
  const { data } = await supabase.rpc("is_co_owner", {
    p_owner_id: ownerId,
    p_user_id: userId,
  });
  if (!data) {
    res.status(403).json({ error: "Accès refusé" });
    return false;
  }
  return true;
}
