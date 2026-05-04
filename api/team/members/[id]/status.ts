import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, requireCsrf } from "../../../../shared/auth/serverlessHelpers";
import { requireAuth, requireOwnerOrCoOwner } from "../../../../shared/auth/middleware";
import { updateStatus } from "../../../../shared/team/members";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, "PATCH")) return;
  if (!requireCsrf(req, res)) return;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const id = req.query.id as string;
  const body = (req.body ?? {}) as { ownerId?: string; status?: string };
  const { ownerId, status } = body;

  if (!ownerId || !status) {
    res.status(400).json({ error: "ownerId et status requis" });
    return;
  }
  const isOwner = auth.user.id === ownerId;
  if (!await requireOwnerOrCoOwner(auth.user.id, ownerId, res)) return;

  const result = await updateStatus(id, ownerId, status, isOwner);
  res.status(result.status).json(result.body);
}
