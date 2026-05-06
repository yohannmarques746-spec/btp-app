// ============================================================================
// server/routes/auth.ts
//
// Route Express POST /api/auth/resolve-session — utilisée en `npm run dev`.
// Délègue toute la logique à shared/auth/resolveSession.ts (même code que la
// Vercel serverless function api/auth/resolve-session.ts).
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { Router, type Request, type Response } from "express";
import { supabaseServer } from "../supabaseServer";
import { parseOwnerIds, resolveSession } from "@shared/auth/resolveSession";

const router = Router();

/** Client Supabase dont les requêtes PostgREST emportent le JWT (RLS / auth.uid()). */
function supabaseForRequestJwt(token: string) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

router.post(
  "/resolve-session",
  async (req: Request, res: Response): Promise<void> => {
    const auth = req.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

    const body = (req.body ?? {}) as { pin?: string };

    const ownerIds = parseOwnerIds(process.env.VITE_OWNER_IDS);

    const supabase =
      token !== null && token.length > 0
        ? supabaseForRequestJwt(token)
        : supabaseServer;

    const { status, body: responseBody } = await resolveSession({
      supabase,
      token,
      body,
      ownerIds,
    });

    res.status(status).json(responseBody);
  },
);

export const authRouter = router;
