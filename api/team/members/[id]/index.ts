import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, requireCsrf } from "../../../../shared/auth/serverlessHelpers";
import { requireAuth, requireOwnerOrCoOwner } from "../../../../shared/auth/middleware";
import { getMember, deleteMember } from "../../../../shared/team/members";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, ["GET", "DELETE"])) return;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const id = req.query.id as string;

  if (req.method === "GET") {
    const ownerId = req.query.ownerId as string | undefined;
    if (!ownerId) {
      res.status(400).json({ error: "ownerId requis" });
      return;
    }
    const isOwner = auth.user.id === ownerId;
    if (!await requireOwnerOrCoOwner(auth.user.id, ownerId, res)) return;

    const result = await getMember(id, ownerId, isOwner);
    res.status(result.status).json(result.body);
    return;
  }

  if (!requireCsrf(req, res)) return;

  const body = (req.body ?? {}) as { ownerId?: string };
  const { ownerId } = body;

  if (!ownerId) {
    res.status(400).json({ error: "ownerId requis" });
    return;
  }

  if (auth.user.id !== ownerId) {
    res.status(403).json({ error: "Seul le patron peut supprimer définitivement" });
    return;
  }

  const result = await deleteMember(id, ownerId);
  res.status(result.status).json(result.body);
}
