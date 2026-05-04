// ============================================================================
// server/routes/auth.ts
//
// Route Express POST /api/auth/resolve-session — utilisée en `npm run dev`.
// Délègue toute la logique à shared/auth/resolveSession.ts (même code que la
// Vercel serverless function api/auth/resolve-session.ts).
// ============================================================================

import { Router, type Request, type Response } from "express";
import { supabaseServer } from "../supabaseServer";
import { parseOwnerIds, resolveSession } from "@shared/auth/resolveSession";

const router = Router();

const OWNER_IDS = parseOwnerIds(process.env.VITE_OWNER_IDS);

router.post(
  "/resolve-session",
  async (req: Request, res: Response): Promise<void> => {
    const auth = req.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

    const body = (req.body ?? {}) as { pin?: string };

    const { status, body: responseBody } = await resolveSession({
      supabase: supabaseServer,
      token,
      body,
      ownerIds: OWNER_IDS,
    });

    res.status(status).json(responseBody);
  },
);

export const authRouter = router;
