import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, requireCsrf } from "../../../shared/auth/serverlessHelpers";
import { requireAuth, requireOwnerOrCoOwner } from "../../../shared/auth/middleware";
import { removeCoOwner } from "../../../shared/team/coOwners";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, "DELETE")) return;
  if (!requireCsrf(req, res)) return;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const userId = req.query.userId as string;
  const body = (req.body ?? {}) as { ownerId?: string };
  const { ownerId } = body;

  if (!ownerId) {
    res.status(400).json({ error: "ownerId requis" });
    return;
  }

  if (!await requireOwnerOrCoOwner(auth.user.id, ownerId, res)) return;

  const result = await removeCoOwner(ownerId, userId);
  res.status(result.status).json(result.body);
}
