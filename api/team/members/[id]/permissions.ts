import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, requireCsrf } from "../../../../shared/auth/serverlessHelpers";
import { requireAuth, requireOwnerOrCoOwner } from "../../../../shared/auth/middleware";
import { updatePermissions } from "../../../../shared/team/members";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, "PATCH")) return;
  if (!requireCsrf(req, res)) return;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const id = req.query.id as string;
  const body = (req.body ?? {}) as { ownerId?: string; permissions?: object };
  const { ownerId, permissions } = body;

  if (!ownerId || !permissions) {
    res.status(400).json({ error: "ownerId et permissions requis" });
    return;
  }
  const isOwner = auth.user.id === ownerId;
  if (!await requireOwnerOrCoOwner(auth.user.id, ownerId, res)) return;

  const result = await updatePermissions(id, ownerId, permissions, isOwner);
  res.status(result.status).json(result.body);
}
