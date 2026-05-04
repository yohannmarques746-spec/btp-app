import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withCors, withMethod, requireCsrf } from "../../shared/auth/serverlessHelpers";
import { requireAuth, requireOwnerOrCoOwner } from "../../shared/auth/middleware";
import { listCoOwners, addCoOwner } from "../../shared/team/coOwners";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (withCors(req, res)) return;
  if (!withMethod(req, res, ["GET", "POST"])) return;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const ownerId = req.query.ownerId as string | undefined;
    if (!ownerId) {
      res.status(400).json({ error: "ownerId requis" });
      return;
    }
    if (!await requireOwnerOrCoOwner(auth.user.id, ownerId, res)) return;

    const result = await listCoOwners(ownerId);
    res.status(result.status).json(result.body);
    return;
  }

  if (!requireCsrf(req, res)) return;

  const body = (req.body ?? {}) as { email?: string; ownerId?: string };
  const { email, ownerId } = body;

  if (!email?.trim() || !ownerId) {
    res.status(400).json({ error: "Email et ownerId requis" });
    return;
  }

  if (!await requireOwnerOrCoOwner(auth.user.id, ownerId, res)) return;

  const result = await addCoOwner(ownerId, email, auth.user.email ?? "");
  res.status(result.status).json(result.body);
}
