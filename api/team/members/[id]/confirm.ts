import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, requireCsrf } from "../../../../shared/auth/serverlessHelpers";
import { requireAuth, requireOwnerOrCoOwner } from "../../../../shared/auth/middleware";
import { confirmMember } from "../../../../shared/team/members";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, "POST")) return;
  if (!requireCsrf(req, res)) return;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const id = req.query.id as string;
  const body = (req.body ?? {}) as { ownerId?: string; role?: string; pin?: string };
  const { ownerId, role, pin } = body;

  if (!ownerId || !role) {
    res.status(400).json({ error: "ownerId et role requis" });
    return;
  }
  if (!await requireOwnerOrCoOwner(auth.user.id, ownerId, res)) return;

  const result = await confirmMember(id, ownerId, role, pin ?? null);
  res.status(result.status).json(result.body);
}
