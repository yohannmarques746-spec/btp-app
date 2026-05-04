import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, requireCsrf } from "../../../../shared/auth/serverlessHelpers";
import { requireAuth, requireOwnerOrCoOwner } from "../../../../shared/auth/middleware";
import { refuseMember } from "../../../../shared/team/members";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, "POST")) return;
  if (!requireCsrf(req, res)) return;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const id = req.query.id as string;
  const body = (req.body ?? {}) as { ownerId?: string };
  const { ownerId } = body;

  if (!ownerId) {
    res.status(400).json({ error: "ownerId requis" });
    return;
  }
  if (!await requireOwnerOrCoOwner(auth.user.id, ownerId, res)) return;

  const result = await refuseMember(id, ownerId);
  res.status(result.status).json(result.body);
}
